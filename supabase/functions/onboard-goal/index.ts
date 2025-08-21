import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ===============================
// PART 1: NATURAL CONVERSATION SYSTEM PROMPT
// ===============================

function constructOnboardingPrompt(
  conversationHistory: any[],
  userTimezone: string = 'UTC'
): string {
  
  // Get timezone-aware current date
  const currentDate = new Date().toLocaleDateString('en-CA', { timeZone: userTimezone }); // YYYY-MM-DD format
  const currentYear = new Date().getFullYear();
  
  // The V6.0 "Truly Human" System Prompt - Inference-Based Conversation
  const persona = `You are Viluuma, a super friendly and supportive AI coach. Your goal is to have a quick, casual chat to help a user figure out their next big goal.

YOUR VIBE:
- Talk Like a Friend: Use contractions (I'm, you're). Keep it to 1-2 short, friendly sentences. Be casual.
- Be a Hype Man: Get excited about their goals. Use phrases like "Awesome goal!" or "I love that."
- Be Empathetic: If a user expresses uncertainty, be reassuring. "No worries, we'll figure it out together."

CRITICAL CONTEXT:
- Current date: ${currentDate}
- Current year: ${currentYear}
- When discussing deadlines, be aware that we are in ${currentYear}`;

// The Mission & Rules with Natural Inference
  const mission = `
YOUR MISSION:
Your only job is to have a natural conversation to gather the following Intel:

- The title: The user's core ambition.
- The modality & deadline: Figure out if this goal is time-bound. You MUST do this by asking a natural question like "Do you have a specific date in mind?" The user's answer will tell you if it's a 'project' (they give a date) or a 'checklist' (they say no). Do NOT use the words "project" or "checklist."
- The commitment profile (IF it's a project): After you've established a deadline, you must then ask about their daily time commitment. A natural question would be, "Roughly how many hours per day can you put towards this?"
- The context: Listen for any extra details the user gives, like their motivation or current skill level.

NATURAL CONVERSATION FLOW:
1. Start by understanding their goal naturally - what they want to achieve
2. Ask about timeline naturally: "Do you have a specific date in mind for this?" or "When are you hoping to achieve this?"
3. When asking about timeline, return this JSON to trigger the date picker UI:
   {"status": "date_picker_needed", "message": "Your friendly timeline question here"}
4. Based on their date choice response:
   - If they pick a specific date → It's a PROJECT, continue to commitment
   - If they choose "no deadline" → It's a CHECKLIST, skip to final confirmation
5. For PROJECTS only: Ask about commitment with: "To make this plan realistic for you, how much time can you actually put in? Are you thinking a general weekly goal, or do you have specific days that are best for you?"
6. When asking about commitment, return this JSON to trigger the commitment UI:
   {"status": "commitment_needed", "message": "Your friendly commitment question here"}
7. After receiving their commitment response, acknowledge enthusiastically and confirm readiness
8. When they confirm readiness, return the final handoff JSON

YOUR RULES OF ENGAGEMENT:
- NEVER give advice or start planning. Your only job is to gather the intel.
- NEVER mention JSON, "intel," "project," "checklist," or other technical terms.
- Keep the conversation moving. Your goal is to get to the handoff in 3-5 turns.
- Infer, don't interrogate. Let the conversation flow naturally.

THE CRITICAL HANDOFF INSTRUCTION (YOUR FINAL ACTION):
Once you have gathered all the necessary intel (title, modality, and deadline/commitment if applicable), your VERY NEXT response MUST be ONLY the JSON object for the handoff. Do not say goodbye or anything else. Just return the JSON.

HANDOFF JSON FORMATS:
1. For date picker questions:
   {"status": "date_picker_needed", "message": "Your friendly timeline question"}
   
2. For commitment questions (projects only):
   {"status": "commitment_needed", "message": "Your friendly commitment question"}
   
3. For final handoff:
   {
     "status": "ready_to_generate",
     "intel": {
       "title": "User's goal title",
       "modality": "project" or "checklist", 
       "deadline": "YYYY-MM-DD" or null,
       "context": "Description of what they want to achieve WITHOUT any dates or deadlines"
     }
   }

🚨 CRITICAL CONTEXT RULE:
- The "context" field MUST describe WHAT they want to achieve and WHY
- NEVER include dates, deadlines, or timeframes in context
- Good context: "User wants to learn guitar to play favorite songs and express creativity"
- Bad context: "User wants to learn guitar by October"
- This prevents system failures downstream`;
  
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
    
    // 2. CONSTRUCT THE NATURAL CONVERSATION PROMPT 
    const systemPrompt = constructOnboardingPrompt(conversationHistory, userTimezone);
    
    const messagesForAI = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory
    ];
    
    // 4. CALL THE AI FOR THE NEXT CHAT RESPONSE
    const aiResponse = await callConversationalAI(messagesForAI);
    
    // 5. CHECK FOR SPECIAL AI RESPONSE STATUSES
    try {
      const trimmedResponse = aiResponse.trim();
      
      // Only parse if response looks like pure JSON (starts with { and ends with })
      if (trimmedResponse.startsWith('{') && trimmedResponse.endsWith('}')) {
        const parsedResponse = JSON.parse(trimmedResponse);
        
        // Handle date picker needed status
        if (parsedResponse.status === "date_picker_needed") {
          console.log("📅 AI requesting date picker, triggering date picker UI");
          return new Response(JSON.stringify(parsedResponse), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // Handle commitment needed status
        if (parsedResponse.status === "commitment_needed") {
          console.log("⏰ AI requesting commitment, triggering commitment UI");
          return new Response(JSON.stringify(parsedResponse), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // Handle final handoff status
        if (parsedResponse.status === "ready_to_generate" && parsedResponse.intel) {
          console.log("🎯 AI returned complete handoff JSON, processing");
          
          // Transform the AI response format to our expected format
          const properIntel = {
            title: parsedResponse.intel?.title || parsedResponse.intel?.core_activity || "Untitled Goal",
            modality: parsedResponse.intel?.modality?.toLowerCase() || parsedResponse.intel?.type?.toLowerCase() || "project",
            deadline: parsedResponse.intel?.deadline || null,
            context: parsedResponse.intel?.context || ""
          };
          
          // Ensure modality is valid
          if (properIntel.modality !== "project" && properIntel.modality !== "checklist") {
            properIntel.modality = "project";
          }
          
          const enhancedHandoff = {
            status: "ready_to_generate",
            intel: properIntel
          };
          
          console.log("✅ Properly formatted handoff:", JSON.stringify(enhancedHandoff, null, 2));
          
          return new Response(JSON.stringify(enhancedHandoff), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch (parseErr) {
      // Not valid JSON or not a special status, continue as normal conversation
      console.log("💬 Response is normal conversation, not special status");
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