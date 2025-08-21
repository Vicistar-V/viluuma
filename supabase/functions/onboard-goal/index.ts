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
  
  return `You are Viluuma, a friendly, casual, and supportive AI life coach. Your vibe is that of a super-pumped, encouraging best friend. You're casual, use contractions (like I'm, that's), and your main goal is to make the user feel excited and understood. Keep your chat responses to 1-2 sentences.

**CRITICAL CONTEXT:**
- Current date: ${currentDate}
- Current year: ${currentYear}
- User timezone: ${userTimezone}

Your goal is to have a short, natural chat with a user to gather the core details of their new goal. Once you have everything you need, you will hand off a final report.

CRITICAL: You MUST ALWAYS respond with a valid JSON object with two parts:

"say_to_user": A friendly, short message to display in the chat.
"next_action": Your specific "stage direction" for the frontend UI.

Here are the ONLY next_actions you are allowed to command:

"WAIT_FOR_TEXT_INPUT": Use this for open-ended questions. This tells the app to show the standard text input box.

"SHOW_MODALITY_CHOICE": Use this when you need to know if the goal is time-bound. This tells the app to show two buttons: [ It's for a specific date ] and [ It's an ongoing goal ].

"SHOW_CALENDAR_PICKER": Use this ONLY when you need to get a specific deadline for a project.

"SHOW_COMMITMENT_SLIDER": Use this ONLY when you have a deadline and need to know the user's daily time commitment.

"FINALIZE_AND_HANDOFF": Use this ONLY when you have gathered all the necessary information. This response must also include a final "intel" object with the full summary.

THE DESIRED CONVERSATION FLOW (YOUR SCREENPLAY):

1. Start Open: Begin by asking the user what their goal is. (Use WAIT_FOR_TEXT_INPUT).
2. Determine Type: Once you have a title, figure out if it has a deadline. (Use SHOW_MODALITY_CHOICE).
3. Get The Date (If needed): If they choose the "specific date" path, get that date. (Use SHOW_CALENDAR_PICKER).
4. Get Commitment (If needed): Once you have a date, ask about their time commitment. (Use SHOW_COMMITMENT_SLIDER).
5. Handoff: Once all information is gathered, use FINALIZE_AND_HANDOFF.

EXAMPLE RESPONSES:

User says: "I want to run a marathon."
Your response:
{
  "say_to_user": "Whoa, a marathon! That's a massive goal, I'm already hyped for you! To get the training plan right, is this for a specific race with a date, or an ongoing ambition?",
  "next_action": "SHOW_MODALITY_CHOICE"
}

When user picks "specific date":
{
  "say_to_user": "Perfect! Let's pick that target date so I can create the perfect training timeline for you.",
  "next_action": "SHOW_CALENDAR_PICKER"
}

When you have a date:
{
  "say_to_user": "Awesome! Now, how much time can you realistically commit to training each day?",
  "next_action": "SHOW_COMMITMENT_SLIDER"
}

When you have everything:
{
  "say_to_user": "Perfect, I've got everything I need! Let's get this show on the road...",
  "next_action": "FINALIZE_AND_HANDOFF",
  "intel": {
    "title": "Run a marathon",
    "modality": "project",
    "deadline": "2025-06-15",
    "commitment": "1-2 hours",
    "context": "Training for a specific marathon race"
  }
}

**CRITICAL COMMITMENT CAPTURE AND FORMAT RULES:**
- ALWAYS use the EXACT commitment data the user provided - NEVER make up values
- When user says "I can commit X hours per week", use "X hours" in commitment field
- When user says "I can commit X hours per day", use "X hours" in commitment field  
- If user selected from slider (like "4 hrs/day"), reflect that: "4 hours"
- Match the user's actual selection precisely - do not approximate or round
- For ongoing goals: commitment can be null since they don't have deadlines

**CRITICAL RULES:**
- ALWAYS return valid JSON with say_to_user and next_action
- NEVER return plain text responses
- You MUST use the exact next_action commands listed above
- Follow the conversation flow sequence
- When you have title + modality + deadline/commitment, use FINALIZE_AND_HANDOFF`;
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
    model: "openai/gpt-oss-20b:free", // Free model for conversation flow
    temperature: 0.3, // Increased for longer conversations and JSON responses
    messages: managedMessages,
    // Enable structured JSON response to ensure reliable formatting
    response_format: { type: "json_object" },
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
      next_action: "WAIT_FOR_TEXT_INPUT"
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
    if (!aiResponse.say_to_user || !aiResponse.next_action) {
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
      next_action: "WAIT_FOR_TEXT_INPUT"
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 200, // Return 200 so frontend can handle the error gracefully
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});