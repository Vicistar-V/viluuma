import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ===============================
// AI STATE ENGINE SYSTEM PROMPT
// ===============================

function constructAIStateEnginePrompt(userTimezone: string = 'UTC'): string {
  // Get timezone-aware current date
  const currentDate = new Date().toLocaleDateString('en-CA', { timeZone: userTimezone }); // YYYY-MM-DD format
  const currentYear = new Date().getFullYear();
  
  return `You are Viluuma, an incredibly friendly, warm, and supportive AI life coach. Your vibe is that of a super-pumped, encouraging best friend. You're casual, use contractions (like I'm, that's), and your main goal is to make the user feel excited and understood. Keep your chat responses to 1-2 sentences.

**CRITICAL CONTEXT:**
- Current date: ${currentDate}
- Current year: ${currentYear}
- User timezone: ${userTimezone}

You are having a short, initial chat with a new user to help them brainstorm their next big goal. You don't need every tiny detail. Your only objective is to gather enough core information to hand off to our expert planning team.

The key pieces of information you're trying to discover are:
1. The user's core goal.
2. Whether it has a deadline.
3. If so, their rough time commitment.

CRITICAL: You MUST ALWAYS respond with a valid JSON object. This object represents your "turn" in the conversation and has two parts: what you say to the user, and what you're thinking internally.

Your JSON response has this structure:
{ "say_to_user": "<Your friendly, chatty response goes here>", "update_state": { ... } }

The update_state object is your "internal notes." This is where you will record the information you've gathered. As you learn more, you will fill in this object.

The fields you can fill in your update_state are:
- "title": (string) The user's primary ambition.
- "modality": (string: "project" or "checklist") Infer this based on whether they give you a deadline.
- "deadline": (string: "YYYY-MM-DD") The target date, if it's a project.
- "commitment": (string) A brief description of their time commitment (e.g., "about 2 hours a day," "mostly weekends").
- "context": (string) A summary of their motivation and other details.

THE FINAL HANDOFF: When your update_state object contains at least a title, modality, and a deadline/commitment (for projects), you have enough information. At that point, your JSON response must change its structure. Instead of update_state, you will use a finalize_and_handoff key:

{ "say_to_user": "Perfect, I've got everything I need! Let's get this show on the road...", "finalize_and_handoff": { "intel": { ... the complete intel object ... } } }

**CRITICAL RULES:**
- ALWAYS return valid JSON in this exact format
- NEVER return plain text responses
- Keep responses friendly and conversational 
- Gather information naturally, don't interrogate
- When you have enough information, use finalize_and_handoff structure`;
}

// ===============================
// CONVERSATION MANAGEMENT FUNCTION
// ===============================

function manageConversationLength(messages: any[]): any[] {
  const MAX_CONVERSATION_MESSAGES = 20; // Keep recent conversation manageable
  
  if (messages.length <= MAX_CONVERSATION_MESSAGES) {
    return messages;
  }
  
  // Always keep the system prompt (first message) and recent conversation
  const systemMessage = messages[0];
  const recentMessages = messages.slice(-MAX_CONVERSATION_MESSAGES + 1);
  
  console.log(`📝 Conversation length management: ${messages.length} → ${recentMessages.length + 1} messages`);
  
  return [systemMessage, ...recentMessages];
}

// ===============================
// AI COMMUNICATION FUNCTION
// ===============================

async function callAIStateEngine(messages: any[]): Promise<any> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  // Manage conversation length to prevent context overflow
  const managedMessages = manageConversationLength(messages);
  
  console.log("🤖 Calling AI State Engine with", managedMessages.length, "messages (original:", messages.length, ")");
  
  const requestPayload = {
    model: "moonshotai/kimi-k2:free", // Free model for conversation flow
    temperature: 0.3, // Lower temperature for more consistent JSON output
    max_tokens: 800, // Increased for longer conversations and JSON responses
    messages: managedMessages,
  };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestPayload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("❌ AI API error:", errText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content in AI response");
  }

  console.log("📦 Raw AI Response:", content);

  // Parse the JSON response from AI
  try {
    const parsedResponse = JSON.parse(content);
    console.log("✅ Parsed AI JSON Response:", JSON.stringify(parsedResponse, null, 2));
    return parsedResponse;
  } catch (parseError) {
    console.error("❌ Failed to parse AI response as JSON:", parseError);
    console.error("Raw content:", content);
    
    // Fallback response in case AI doesn't return proper JSON
    return {
      say_to_user: "Sorry, I had a hiccup there! Can you tell me again about your goal?",
      update_state: {
        title: null,
        modality: null,
        deadline: null,
        commitment: null,
        context: ""
      }
    };
  }
}

// ===============================
// MAIN ORCHESTRATOR - AI AS TRUE BACKEND
// ===============================

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 AI State Engine onboard-goal function started");
    
    // Parse and validate request
    const { conversationHistory, userTimezone = 'UTC' } = await req.json();
    
    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      console.error("❌ Invalid request: conversationHistory is required");
      return new Response(JSON.stringify({ error: "Invalid request: conversationHistory is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("📨 Processing conversation with", conversationHistory.length, "messages");

    // 1. CONSTRUCT THE AI STATE ENGINE PROMPT 
    const systemPrompt = constructAIStateEnginePrompt(userTimezone);
    
    const messagesForAI = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory
    ];
    
    // 2. CALL THE AI STATE ENGINE - ALWAYS RETURNS JSON
    const aiResponse = await callAIStateEngine(messagesForAI);
    
    // 3. VALIDATE RESPONSE STRUCTURE
    if (!aiResponse.say_to_user || (!aiResponse.update_state && !aiResponse.finalize_and_handoff)) {
      console.error("❌ Invalid AI response structure:", aiResponse);
      throw new Error("AI returned invalid response structure");
    }

    console.log("✅ AI State Engine Response:", JSON.stringify(aiResponse, null, 2));
    
    // 4. RETURN THE STRUCTURED RESPONSE DIRECTLY
    // Frontend will handle the state_analysis.status to determine UI
    return new Response(JSON.stringify(aiResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ onboard-goal error:", error);
    
    // Return a structured error response that the frontend can handle
    const errorResponse = {
      say_to_user: "Sorry, I had a technical hiccup! Can you tell me about your goal again?",
      update_state: {
        title: null,
        modality: null,
        deadline: null,
        commitment: null,
        context: ""
      }
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 200, // Return 200 so frontend can handle the error gracefully
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});