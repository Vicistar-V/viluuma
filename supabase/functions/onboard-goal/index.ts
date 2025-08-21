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
- For projects: a specific deadline date
- The user's time commitment (roughly how many hours per day they can realistically work on this)

CONVERSATION FLOW:
1. First understand their goal and determine if it's a project or checklist
2. For projects, get a specific deadline date  
3. Finally, ask about their daily time commitment with a friendly question like:
   "Perfect! Last question to make this plan super realistic for you: roughly how many hours per day do you think you can put towards this?"
4. When you ask the commitment question, respond ONLY with this JSON to trigger the commitment UI:
   {"status": "commitment_needed", "message": "Your friendly commitment question here"}
5. The frontend will handle gathering the commitment and send it back as a user message
6. Once you receive their commitment response, acknowledge it enthusiastically and ask for final confirmation
7. When they confirm they're ready to proceed, return the final handoff JSON

RULES:
- Ask friendly, natural questions following the conversation flow above
- Be a hype man! Get excited about their goals
- DO NOT create a plan or give advice. Your only job is to gather the info
- Keep responses to 1-2 sentences max. Be conversational and natural
- NEVER mention JSON or technical terms to the user
- When suggesting deadlines, remember we are in ${currentYear}!
- When asking about time commitment, be encouraging and emphasize being realistic

SPECIAL RESPONSE FORMATS:
1. For commitment questions, return ONLY:
   {"status": "commitment_needed", "message": "Your friendly commitment question"}
   
2. For final handoff when user confirms readiness, return ONLY:
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