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
  currentState: { hasTitle: boolean; hasModality: boolean; hasDeadline?: boolean }
): string {
  
  // 1. Build the list of what's still needed
  const unansweredQuestions = [];
  if (!currentState.hasTitle) {
    unansweredQuestions.push("- The user's core goal (the 'what').");
  }
  if (!currentState.hasModality) {
    unansweredQuestions.push("- The goal's type: is it a 'Project' with a deadline, or an ongoing 'Checklist'?");
  }
  if (currentState.hasModality && currentState.hasDeadline === false) {
    unansweredQuestions.push("- A specific target date or deadline for the project.");
  }
  
  // 2. The Persona (our "Friend" Vibe)
  const persona = "You are Viluuma, a super friendly and supportive AI coach. Your goal is to have a quick, casual chat to help a user figure out their next big goal. Talk like a real friend (1-2 short sentences, like you're texting).";

  // 3. The Mission & Rules
  const mission = `
YOUR MISSION:
Your only job right now is to figure out the following information:
${unansweredQuestions.join('\n')}

RULES:
- Always ask a friendly, clarifying question to get the next piece of information.
- Be a hype man! Get excited about their goals.
- DO NOT create a plan or give advice. Your only job is to gather the info.
- Keep responses to 1-2 sentences max. Be conversational and natural.
- NEVER mention JSON or technical terms to the user.`;
  
  return `${persona}\n\n${mission}`;
}

// ===============================
// PART 2: DETERMINISTIC STATE ANALYSIS
// ===============================

function analyzeConversationState(conversationHistory: any[]): {
  hasTitle: boolean;
  hasModality: boolean;
  hasDeadline: boolean | undefined;
  extractedTitle: string;
  extractedModality: "project" | "checklist" | "";
  extractedDeadline: string;
  context: string;
} {
  let hasTitle = false;
  let hasModality = false;
  let hasDeadline: boolean | undefined = undefined;
  let extractedTitle = "";
  let extractedModality: "project" | "checklist" | "" = "";
  let extractedDeadline = "";
  let context = "";

  console.log("🔍 Analyzing conversation with", conversationHistory.length, "messages");

  conversationHistory.forEach((msg, index) => {
    if (msg.role === 'user') {
      const content = msg.content.toLowerCase();
      
      // Title detection - use the first meaningful user message
      if (!hasTitle && msg.content.trim().length > 5) {
        hasTitle = true;
        extractedTitle = msg.content.trim();
        console.log("📝 Title detected:", extractedTitle);
      }
      
      // Modality detection with specific keywords
      if (!hasModality) {
        const projectKeywords = /\b(project|deadline|by|before|due|timeline|schedule|finished|complete by|need by|target date|specific date)\b/i;
        const checklistKeywords = /\b(checklist|ongoing|over time|habit|routine|general|someday|eventually|no deadline|no rush|continuous|daily|weekly)\b/i;
        
        if (projectKeywords.test(content)) {
          hasModality = true;
          extractedModality = "project";
          hasDeadline = false; // We know it's a project, but haven't extracted the date yet
          console.log("🎯 Project modality detected");
        } else if (checklistKeywords.test(content)) {
          hasModality = true;
          extractedModality = "checklist";
          hasDeadline = undefined; // Checklists don't need deadlines
          console.log("📋 Checklist modality detected");
        }
      }
      
      // Date extraction for projects only
      if (extractedModality === "project" && hasDeadline === false) {
        // Multiple date pattern matching
        const datePatterns = [
          /\b(\d{4}-\d{2}-\d{2})\b/, // YYYY-MM-DD
          /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/, // MM/DD/YYYY
          /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2}(?:st|nd|rd|th)?\b/i, // Month Day
          /\b\d{1,2}(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\b/i, // Day Month
          /\bin\s+(\d+)\s+(days?|weeks?|months?)\b/i, // "in 2 weeks"
        ];
        
        for (const pattern of datePatterns) {
          const match = msg.content.match(pattern);
          if (match) {
            extractedDeadline = match[0];
            hasDeadline = true;
            console.log("📅 Deadline detected:", extractedDeadline);
            break;
          }
        }
      }
      
      // Build context from all user messages
      context += msg.content + "\n";
    }
  });

  console.log("📊 Final state analysis:", {
    hasTitle, hasModality, hasDeadline,
    extractedTitle, extractedModality, extractedDeadline
  });

  return {
    hasTitle,
    hasModality,
    hasDeadline,
    extractedTitle,
    extractedModality,
    extractedDeadline,
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
    model: "mistralai/mistral-7b-instruct:free", // Fast, cheap, conversational model
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

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "";
  
  console.log("✅ AI response received:", content);
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
    const { conversationHistory } = await req.json();
    
    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      console.error("❌ Invalid request: conversationHistory is required");
      return new Response(JSON.stringify({ error: "Invalid request: conversationHistory is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("📨 Processing conversation with", conversationHistory.length, "messages");

    // 1. ANALYZE THE CURRENT STATE (Our deterministic logic)
    const state = analyzeConversationState(conversationHistory);
    
    // 2. CHECK FOR COMPLETION (Our backend decides when we're done)
    const isProjectComplete = state.extractedModality === "project" && state.hasDeadline;
    const isChecklistComplete = state.extractedModality === "checklist" && state.hasModality;
    
    if (isProjectComplete || isChecklistComplete) {
      console.log("✅ Onboarding complete. Preparing intel payload.");
      
      // Parse the deadline to a proper date format if it's a project
      let normalizedDeadline = null;
      if (state.extractedModality === "project" && state.extractedDeadline) {
        try {
          // Handle relative dates like "in 2 weeks"
          if (state.extractedDeadline.includes("in")) {
            const relativeMatch = state.extractedDeadline.match(/in\s+(\d+)\s+(days?|weeks?|months?)/i);
            if (relativeMatch) {
              const amount = parseInt(relativeMatch[1]);
              const unit = relativeMatch[2].toLowerCase();
              const today = new Date();
              
              if (unit.startsWith("day")) {
                today.setDate(today.getDate() + amount);
              } else if (unit.startsWith("week")) {
                today.setDate(today.getDate() + (amount * 7));
              } else if (unit.startsWith("month")) {
                today.setMonth(today.getMonth() + amount);
              }
              
              normalizedDeadline = today.toISOString().split('T')[0];
            }
          } else {
            // Try to parse as a regular date
            const parsedDate = new Date(state.extractedDeadline);
            if (!isNaN(parsedDate.getTime())) {
              normalizedDeadline = parsedDate.toISOString().split('T')[0];
            }
          }
        } catch (e) {
          console.warn("⚠️ Could not parse deadline, using original:", state.extractedDeadline);
          normalizedDeadline = state.extractedDeadline;
        }
      }
      
      const handoffPayload = {
        status: "ready_to_generate",
        intel: {
          title: state.extractedTitle,
          modality: state.extractedModality,
          deadline: normalizedDeadline,
          context: state.context
        },
        userConstraints: {
          deadline: normalizedDeadline,
          hoursPerWeek: 8 // Default assumption
        }
      };
      
      console.log("🎯 Returning handoff payload:", JSON.stringify(handoffPayload, null, 2));
      
      return new Response(JSON.stringify(handoffPayload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // 3. CONSTRUCT THE DYNAMIC PROMPT (If conversation needs to continue)
    const currentState = {
      hasTitle: state.hasTitle,
      hasModality: state.hasModality,
      hasDeadline: state.hasDeadline
    };
    
    const systemPrompt = constructOnboardingPrompt(conversationHistory, currentState);
    
    const messagesForAI = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory
    ];
    
    // 4. CALL THE AI FOR THE NEXT CHAT RESPONSE
    const aiResponse = await callConversationalAI(messagesForAI);
    
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