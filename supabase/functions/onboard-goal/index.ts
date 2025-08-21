import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ===============================
// PART 1: STATE-AWARE SYSTEM PROMPT
// ===============================

function constructOnboardingPrompt(
  conversationHistory: any[],
  currentState: { hasTitle: boolean; hasModality: boolean; hasDeadline?: boolean },
  userTimezone: string = 'UTC'
): string {
  
  // Get timezone-aware current date
  const currentDate = new Date().toLocaleDateString('en-CA', { timeZone: userTimezone }); // YYYY-MM-DD format
  const currentYear = new Date().getFullYear();
  
  // The Persona with Current Date Context
  const persona = `You are Viluuma, a super friendly and supportive AI coach. Your goal is to have a quick, casual chat to help a user figure out their next big goal. Talk like a real friend (1-2 short sentences, like you're texting).

CRITICAL CONTEXT:
- Current date: ${currentDate}
- Current year: ${currentYear}
- When discussing deadlines, be aware that we are in ${currentYear}`;

  // The Mission & Rules
  const mission = `
YOUR MISSION:
Have a natural conversation to figure out:
- The user's core goal (what they want to achieve)
- The goal type: "Project" (has a deadline) or "Checklist" (ongoing habit/routine)
- For projects: a specific deadline

RULES:
- Ask friendly, natural questions based on the conversation flow
- Be a hype man! Get excited about their goals
- DO NOT create a plan or give advice. Your only job is to gather the info
- Keep responses to 1-2 sentences max. Be conversational and natural
- NEVER mention JSON or technical terms to the user
- When suggesting deadlines, remember we are in ${currentYear}, not 2024!

CRITICAL HANDOFF INSTRUCTION:
- When you believe you have gathered ALL the necessary information (Core Activity, Type, and Deadline for projects), your VERY NEXT response must ONLY be the JSON object: {"status": "ready_to_generate", "intel": {"title": "goal title", "modality": "project" or "checklist", "deadline": "YYYY-MM-DD or null", "context": "actual goal description"}}.
- Do NOT say anything else when returning the JSON. The frontend will handle the transition messaging.

🚨 CRITICAL CONTEXT RULE - EXTREMELY DANGEROUS TO IGNORE:
- The "context" field MUST be an actual description of the user's goal - what they want to achieve and why
- The context should NEVER contain ANY dates, deadlines, timeframes, or temporal references whatsoever
- Context should describe WHAT the user wants to achieve, their motivation, specific details about the goal
- Including dates/times in context will cause catastrophic system failures
- Example GOOD context: "User wants to learn guitar to play their favorite songs and express creativity through music"
- Example BAD context: "User wants to learn guitar by October" or "User has 2 months to learn"
- This rule is NON-NEGOTIABLE and CRITICAL for system stability`;
  
  return `${persona}\n\n${mission}`;
}

// ===============================
// PART 2: DETERMINISTIC STATE ANALYSIS
// ===============================

function analyzeConversationState(conversationHistory: any[]): {
  context: string;
} {
  let context = "";

  console.log("🔍 Building context from", conversationHistory.length, "messages");

  // Simply build context from all user messages
  conversationHistory.forEach((msg) => {
    if (msg.role === 'user') {
      context += msg.content + "\n";
    }
  });

  return {
    context: context.trim()
  };
}

// ===============================
// PART 3: CONVERSATIONAL AI CALLER
// ===============================

async function callConversationalAI(messages: any[]): Promise<string> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  console.log("🤖 Calling conversational AI with", messages.length, "messages");

  const requestPayload = {
    model: "moonshotai/kimi-k2:free", // Fast, cheap, conversational model
    temperature: 0.7, // Natural conversation feel
    max_tokens: 150, // Keep responses short and focused
    messages: messages,
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

  // Log the raw response first
  const rawResponseText = await response.text();
  console.log("📦 Raw AI Response Body:", rawResponseText);
  
  // Parse the response
  let data: any;
  try {
    data = JSON.parse(rawResponseText);
    console.log("🔍 Parsed API Response Data:", JSON.stringify(data, null, 2));
  } catch (parseError) {
    console.error("❌ Failed to parse AI response as JSON:", parseError);
    throw new Error(`Invalid JSON response from AI: ${rawResponseText}`);
  }
  
  // Extract content and log each step
  const choice = data?.choices?.[0]?.message;
  console.log("🎯 Extracted choice object:", JSON.stringify(choice, null, 2));
  
  let content = "";
  if (typeof choice?.content === "string" && choice.content.trim()) {
    content = choice.content;
    console.log("✅ Content extracted as string:", content);
  } else if (Array.isArray(choice?.content)) {
    content = choice.content
      .map((c: any) => (typeof c === "string" ? c : c.text || ""))
      .join("\n");
    console.log("✅ Content extracted from array:", content);
  } else {
    console.log("❌ No valid content found in choice:", choice);
    content = "What would you like to work on?"; // Fallback
    console.log("🔄 Using fallback content:", content);
  }
  
  console.log("📝 Final extracted content:", content);
  return content;
}

// ===============================
// PART 4: MAIN ORCHESTRATOR
// ===============================

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 onboard-goal function started");
    
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

    // 1. BUILD CONVERSATION CONTEXT
    const state = analyzeConversationState(conversationHistory);
    
    // 2. CONSTRUCT THE DYNAMIC PROMPT 
    // Let the AI decide what questions to ask based on conversation flow
    const currentState = {
      hasTitle: true, // Let AI determine this from conversation
      hasModality: true, // Let AI determine this from conversation  
      hasDeadline: true // Let AI determine this from conversation
    };
    
    const systemPrompt = constructOnboardingPrompt(conversationHistory, currentState, userTimezone);
    
    const messagesForAI = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory
    ];
    
    // 4. CALL THE AI FOR THE NEXT CHAT RESPONSE
    const aiResponse = await callConversationalAI(messagesForAI);
    
    // 4.5 CHECK IF THIS RESPONSE IS ACTUALLY A HANDOFF JSON
    // If the AI response contains the handoff JSON, parse and return it properly
    if (aiResponse.includes('"status": "ready_to_generate"')) {
      console.log("🎯 AI returned handoff JSON in conversation, parsing and returning");
      try {
        const jsonMatch = aiResponse.match(/\{.*\}/s);
        if (jsonMatch) {
          const parsedHandoff = JSON.parse(jsonMatch[0]);
          
          // Transform the AI response format to our expected format
          const properIntel = {
            title: parsedHandoff.intel?.title || parsedHandoff.intel?.core_activity || "Untitled Goal",
            modality: parsedHandoff.intel?.modality?.toLowerCase() || parsedHandoff.intel?.type?.toLowerCase() || "project",
            deadline: parsedHandoff.intel?.deadline || null,
            context: parsedHandoff.intel?.context || ""
          };
          
          // Ensure modality is valid
          if (properIntel.modality !== "project" && properIntel.modality !== "checklist") {
            properIntel.modality = "project";
          }
          
          const enhancedHandoff = {
            status: "ready_to_generate",
            intel: properIntel,
            userConstraints: {
              deadline: properIntel.deadline,
              hoursPerWeek: 20
            }
          };
          
          console.log("✅ Properly formatted handoff:", JSON.stringify(enhancedHandoff, null, 2));
          
          return new Response(JSON.stringify(enhancedHandoff), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (parseErr) {
        console.warn("⚠️ AI returned malformed JSON, treating as normal conversation", parseErr);
      }
    }
    
    // 5. RETURN THE CHAT MESSAGE
    // The frontend receives this as a simple string to display in a new chat bubble
    console.log("💬 Returning conversation response");
    return new Response(JSON.stringify({ content: aiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ onboard-goal error:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});