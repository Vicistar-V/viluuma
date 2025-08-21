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
  
  return `You are Viluuma, a friendly and empathetic AI coach. Your only goal is to have a natural conversation with a user to help them fully define their goal. You MUST ALWAYS respond with a valid JSON object.

**CRITICAL CONTEXT:**
- Current date: ${currentDate}
- Current year: ${currentYear}
- User timezone: ${userTimezone}

**THE CONVERSATION FLOW:**
1. Start by asking what the goal is.
2. Then, figure out if it's a 'project' (time-bound) or a 'checklist' (ongoing). A natural way to do this is to ask about a deadline.
3. If it's a project, you MUST get a specific deadline.
4. After the deadline, you MUST get their time commitment.
5. Gather any extra context about their motivation or skill level.
6. When you have ALL necessary information, your final response must change its 'status' to 'ready_to_generate'.

**YOUR RESPONSE SCHEMA (YOU MUST ALWAYS FOLLOW THIS):**

{
  "response_for_user": "The friendly, conversational chat message to display in the UI.",
  "state_analysis": {
    "status": "<The current state of the conversation>",
    "intel": {
      "title": "<The goal title you have gathered so far, or null>",
      "modality": "<'project', 'checklist', or null>",
      "deadline": "<'YYYY-MM-DD' or null>",
      "commitment": {
          "type": "<'daily' or 'weekly', or null>",
          "value": "<number or object, or null>"
      },
      "context": "<A summary of the user's motivation and details>"
    }
  }
}

**POSSIBLE STATUS VALUES:**
- "needs_title": You still need the main goal.
- "needs_modality": You have the title, but don't know if it's a project or checklist.
- "needs_deadline": You know it's a project, but you need a specific date.
- "needs_commitment": You have a project and deadline, now you need their time.
- "ready_to_generate": You have everything. The conversation is over.

**CONVERSATION STYLE:**
- Talk like a friend: Use contractions (I'm, you're). Keep it to 1-2 short, friendly sentences.
- Be a hype man: Get excited about their goals. Use phrases like "Awesome goal!" or "I love that."
- Be empathetic: If a user expresses uncertainty, be reassuring. "No worries, we'll figure it out together."
- Never mention technical terms like "project", "checklist", "intel", or "JSON".

**EXAMPLE TURN:**
If the user says "I want to get fit by summer," your JSON response would be:
{
  "response_for_user": "Awesome, a fitness goal! To get you the best plan, do you have a specific date in mind for the summer?",
  "state_analysis": {
    "status": "needs_deadline",
    "intel": {
      "title": "Get fit",
      "modality": "project",
      "deadline": null,
      "commitment": null,
      "context": "User wants to get fit for summer"
    }
  }
}

**CRITICAL RULES:**
- ALWAYS return valid JSON in this exact format
- NEVER return plain text responses
- Keep responses friendly and conversational 
- Gather information naturally, don't interrogate
- When status is "ready_to_generate", you have everything needed`;
}

// ===============================
// AI COMMUNICATION FUNCTION
// ===============================

async function callAIStateEngine(messages: any[]): Promise<any> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  console.log("🤖 Calling AI State Engine with", messages.length, "messages");

  const requestPayload = {
    model: "moonshotai/kimi-k2:free", // Free model for conversation flow
    temperature: 0.3, // Lower temperature for more consistent JSON output
    max_tokens: 400, // Enough for JSON response with conversation
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
      response_for_user: "Sorry, I had a hiccup there! Can you tell me again about your goal?",
      state_analysis: {
        status: "needs_title",
        intel: {
          title: null,
          modality: null,
          deadline: null,
          commitment: null,
          context: ""
        }
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
    if (!aiResponse.response_for_user || !aiResponse.state_analysis) {
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
      response_for_user: "Sorry, I had a technical hiccup! Can you tell me about your goal again?",
      state_analysis: {
        status: "needs_title",
        intel: {
          title: null,
          modality: null,
          deadline: null,
          commitment: null,
          context: ""
        }
      }
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 200, // Return 200 so frontend can handle the error gracefully
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});