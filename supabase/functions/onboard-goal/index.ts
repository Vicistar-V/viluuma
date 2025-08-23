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
  
  return `You are Viluuma, a helpful and friendly chat assistant. Your main goal is to talk like a real, casual friend, not a formal AI.

🗣️ Talk Like a Friend: Use a super casual and friendly tone. Contractions are a must (I'm, you're, that's, it's). Use informal language like "gonna," "wanna," "kinda," or "totally." Ditch the formal stuff like "Furthermore," "In addition," or "I can assist you with."

📏 Keep it Short & Sweet: No long paragraphs. Keep your answers to 1-3 sentences whenever possible. Talk like you're texting.

🧠 Be Real & Supportive:
When they're frustrated, relate to it. Say stuff like, "Ugh, I get that," or "That sounds tough."
If they have a good idea, be their hype person! Get excited about it. Say, "Whoa, that's a cool idea!"
If something seems way off or unrealistic, it's cool to be honest about it in a friendly way.

🤔 Think Out Loud: It's cool to show your thought process. Start sentences with things like, "Hmm, okay, so you're thinking..." or "Wait, let me see if I get this right..."

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
    "commitment": {
      "totalHoursPerWeek": 14,
      "dailyBudget": {"mon": 2, "tue": 2, "wed": 2, "thu": 2, "fri": 2, "sat": 2, "sun": 2}
    },
    "context": "Training for a specific marathon race"
  }
}

**CRITICAL COMMITMENT CAPTURE AND FORMAT RULES:**
- ALWAYS capture the EXACT commitment structure the user provided - NEVER make up values
- When user provides daily breakdown (e.g., "mon: 4hrs, tue: 4hrs"), capture the full dailyBudget structure
- When user says "I can commit X hours per week", capture both totalHoursPerWeek and dailyBudget if provided
- The commitment field should be an object with: {"totalHoursPerWeek": number, "dailyBudget": {"mon": number, "tue": number, etc.}}
- If only weekly hours provided, distribute evenly across weekdays for dailyBudget
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

async function callAIStateEngineStreaming(messages: any[]): Promise<ReadableStream> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  // Manage conversation length to prevent context overflow
  const managedMessages = manageConversationLength(messages);
  
  console.log("🤖 Calling AI State Engine with streaming, messages:", managedMessages.length, "messages (original:", messages.length, ")");
  
  const requestPayload = {
    model: "google/gemini-2.5-flash-lite", // Fast Google model for conversation flow
    temperature: 0.3,
    messages: managedMessages,
    stream: true, // Enable streaming
    response_format: { type: "json_object" },
    extra: { thinking: false }
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

  if (!response.body) {
    throw new Error("No response body for streaming");
  }

  return response.body;
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
    
    // 2. GET STREAMING RESPONSE FROM AI
    const streamingResponse = await callAIStateEngineStreaming(messagesForAI);
    
    // 3. CREATE SERVER-SENT EVENTS STREAM
    const encoder = new TextEncoder();
    let accumulatedContent = "";
    
    const sseStream = new ReadableStream({
      async start(controller) {
        const reader = streamingResponse.getReader();
        const decoder = new TextDecoder();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Parse the final accumulated content as JSON
              try {
                const finalResponse = JSON.parse(accumulatedContent);
                
                // Validate final response structure
                if (!finalResponse.say_to_user || !finalResponse.next_action) {
                  throw new Error("Invalid final response structure");
                }
                
                // Send final complete event
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: "complete",
                  data: finalResponse
                })}\n\n`));
                
                console.log("✅ AI State Engine Final Response:", JSON.stringify(finalResponse, null, 2));
                
              } catch (parseError) {
                console.error("❌ Failed to parse final JSON:", parseError);
                // Send error event
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: "error",
                  data: {
                    say_to_user: "Sorry, I had a hiccup there! Can you tell me again about your goal?",
                    next_action: "WAIT_FOR_TEXT_INPUT"
                  }
                })}\n\n`));
              }
              
              controller.close();
              break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6);
                if (dataStr === '[DONE]') continue;
                
                try {
                  const data = JSON.parse(dataStr);
                  const delta = data.choices?.[0]?.delta?.content;
                  
                  if (delta) {
                    accumulatedContent += delta;
                    
                    // Send streaming delta
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      type: "delta",
                      data: { delta, accumulated: accumulatedContent }
                    })}\n\n`));
                  }
                } catch (e) {
                  console.warn("⚠️ Failed to parse streaming chunk:", e);
                }
              }
            }
          }
        } catch (error) {
          console.error("❌ Streaming error:", error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "error",
            data: {
              say_to_user: "Sorry, I had a technical hiccup! Can you tell me about your goal again?",
              next_action: "WAIT_FOR_TEXT_INPUT"
            }
          })}\n\n`));
          controller.close();
        }
      }
    });
    
    return new Response(sseStream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
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