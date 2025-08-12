import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper functions for intelligent conversation management
function detectModalityFromMessage(message: string): "project" | "checklist" | null {
  const projectKeywords = /\b(project|deadline|by|before|due|timeline|schedule|finished|complete by|need by)\b/i;
  const checklistKeywords = /\b(checklist|ongoing|over time|habit|routine|general|someday|eventually|no deadline|no rush)\b/i;
  
  if (projectKeywords.test(message)) return "project";
  if (checklistKeywords.test(message)) return "checklist";
  return null;
}

function extractGoalTitle(messages: any[]): string | null {
  for (const msg of messages) {
    if (msg.role === "user" && msg.content && msg.content.length > 5) {
      // Simple extraction - use first meaningful user message as potential title
      const content = msg.content.trim();
      if (content.length > 5 && content.length < 200) {
        return content;
      }
    }
  }
  return null;
}

function buildDynamicSystemPrompt(missingInfo: string[]): string {
  const basePrompt = `You are Viluuma, a super friendly, supportive AI coach.
Your mission is to have a short chat to help a user define their goal.

**INFORMATION NEEDED:**
${missingInfo.map(info => `- **${info}**`).join('\n')}

**YOUR RULES:**
- Talk like a casual friend (1-2 sentences).
- Always ask a question to figure out one of the NEEDED pieces of info above.
- **CRITICAL:** When you have all the needed info, your VERY NEXT response must ONLY be the JSON object: {"status":"ready_to_generate","intel":{"title":"...","modality":"project|checklist","deadline":"YYYY-MM-DD|null","hoursPerWeek":8,"context":"optional short context"}}`;
  
  return basePrompt;
}

function analyzeConversationState(messages: any[]): {
  title: string | null;
  modality: "project" | "checklist" | null;
  deadline: string | null;
  hoursPerWeek: number | null;
  context: string | null;
} {
  let title = null;
  let modality = null;
  let deadline = null;
  let hoursPerWeek = null;
  let context = null;

  // Extract goal title from first meaningful user message
  title = extractGoalTitle(messages);

  // Detect modality from user messages
  for (const msg of messages) {
    if (msg.role === "user") {
      const detectedModality = detectModalityFromMessage(msg.content);
      if (detectedModality) {
        modality = detectedModality;
        break;
      }
    }
  }

  // Extract deadline if mentioned (simple regex for dates)
  const deadlineRegex = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}th|\d{1,2}st|\d{1,2}nd|\d{1,2}rd)\b/i;
  for (const msg of messages) {
    if (msg.role === "user" && deadlineRegex.test(msg.content)) {
      // Simple extraction - in a real app, you'd use a proper date parser
      const match = msg.content.match(deadlineRegex);
      if (match) {
        context = `Mentioned deadline context: ${match[0]}`;
        // For now, we'll let the AI handle date parsing in its response
      }
    }
  }

  // Extract hours per week if mentioned
  const hoursRegex = /\b(\d+)\s*(hours?|hrs?)\s*(per\s*week|weekly|each\s*week)\b/i;
  for (const msg of messages) {
    if (msg.role === "user" && hoursRegex.test(msg.content)) {
      const match = msg.content.match(hoursRegex);
      if (match) {
        hoursPerWeek = parseInt(match[1]);
        break;
      }
    }
  }

  return { title, modality, deadline, hoursPerWeek, context };
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const startTime = Date.now();
  
  console.log(`🚀 [${requestId}] onboard-goal request started`);
  console.log(`🚀 [${requestId}] Method: ${req.method}, URL: ${req.url}`);
  console.log(`🚀 [${requestId}] Headers:`, Object.fromEntries(req.headers.entries()));

  if (req.method === "OPTIONS") {
    console.log(`✅ [${requestId}] CORS preflight handled in ${Date.now() - startTime}ms`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`🔑 [${requestId}] Checking API key...`);
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      console.error(`❌ [${requestId}] Missing OPENROUTER_API_KEY environment variable`);
      return new Response(JSON.stringify({ 
        error: "Missing OPENROUTER_API_KEY",
        requestId,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`✅ [${requestId}] API key found (length: ${apiKey.length})`);

    console.log(`📥 [${requestId}] Parsing request body...`);
    const requestBody = await req.json();
    const { messages } = requestBody;
    
    console.log(`📥 [${requestId}] Request payload:`, JSON.stringify(requestBody, null, 2));
    
    if (!Array.isArray(messages)) {
      console.error(`❌ [${requestId}] Invalid payload - messages is not an array:`, typeof messages);
      return new Response(JSON.stringify({ 
        error: "Invalid payload: messages[] required",
        received: typeof messages,
        requestId,
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`🔍 [${requestId}] Messages count: ${messages.length}`);
    messages.forEach((msg, idx) => {
      console.log(`🔍 [${requestId}] Message ${idx}: role=${msg.role}, content_length=${msg.content?.length || 0}`);
    });

    console.log(`🧠 [${requestId}] Analyzing conversation state...`);
    const state = analyzeConversationState(messages);
    console.log(`🧠 [${requestId}] Conversation state:`, JSON.stringify(state, null, 2));
    
    const missingInfo: string[] = [];

    if (!state.title) {
      missingInfo.push("Core Activity: What is the user's main goal?");
      console.log(`❓ [${requestId}] Missing: title`);
    } else {
      console.log(`✅ [${requestId}] Has title: "${state.title}"`);
    }
    
    if (!state.modality) {
      missingInfo.push("Modality: Is this a Project (with deadline) or a Checklist (ongoing)?");
      console.log(`❓ [${requestId}] Missing: modality`);
    } else {
      console.log(`✅ [${requestId}] Has modality: "${state.modality}"`);
    }
    
    // Only ask for deadline if it's a project
    if (state.modality === "project" && !state.deadline) {
      missingInfo.push("Deadline: Get a specific target date");
      console.log(`❓ [${requestId}] Missing: deadline (project mode)`);
    } else if (state.modality === "project") {
      console.log(`✅ [${requestId}] Has deadline: "${state.deadline}"`);
    }
    
    // Only ask for hours per week if it's a project and we don't have it
    if (state.modality === "project" && !state.hoursPerWeek) {
      missingInfo.push("Time Commitment: How many hours per week can they dedicate?");
      console.log(`❓ [${requestId}] Missing: hoursPerWeek (project mode)`);
    } else if (state.modality === "project") {
      console.log(`✅ [${requestId}] Has hoursPerWeek: ${state.hoursPerWeek}`);
    }

    console.log(`📝 [${requestId}] Missing info count: ${missingInfo.length}`);
    console.log(`📝 [${requestId}] Missing info:`, missingInfo);

    // Check if we have everything we need for the handoff
    if (missingInfo.length === 0 && state.title && state.modality) {
      console.log(`🎯 [${requestId}] All info collected! Preparing intel handoff...`);
      
      // We have everything! Return the intel directly
      const intel = {
        title: state.title,
        modality: state.modality,
        deadline: state.modality === "checklist" ? null : (state.deadline || null),
        hoursPerWeek: state.modality === "checklist" ? 0 : (state.hoursPerWeek || 8),
        context: state.context || ""
      };
      
      console.log(`🎯 [${requestId}] Final intel:`, JSON.stringify(intel, null, 2));
      console.log(`✅ [${requestId}] Handoff complete in ${Date.now() - startTime}ms`);
      
      return new Response(JSON.stringify({
        status: "ready_to_generate",
        intel,
        debug: {
          requestId,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`🤖 [${requestId}] Building dynamic system prompt...`);
    // Build dynamic system prompt based on missing information
    const dynamicSystemPrompt = buildDynamicSystemPrompt(missingInfo);
    console.log(`🤖 [${requestId}] System prompt length: ${dynamicSystemPrompt.length}`);

    const finalMessages = [
      { role: "system", content: dynamicSystemPrompt },
      ...messages,
    ];

    console.log(`🌐 [${requestId}] Preparing OpenRouter API call...`);
    console.log(`🌐 [${requestId}] Final messages count: ${finalMessages.length}`);
    console.log(`🌐 [${requestId}] API URL: ${OPENROUTER_URL}`);

    const apiPayload = {
      model: "deepseek/deepseek-chat-v3-0324:free",
      temperature: 0.4,
      messages: finalMessages,
    };

    console.log(`🌐 [${requestId}] API payload:`, JSON.stringify(apiPayload, null, 2));

    const apiStartTime = Date.now();
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.substring(0, 10)}...`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiPayload),
    });

    const apiDuration = Date.now() - apiStartTime;
    console.log(`🌐 [${requestId}] OpenRouter API call completed in ${apiDuration}ms`);
    console.log(`🌐 [${requestId}] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ [${requestId}] OpenRouter API error:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errText
      });
      return new Response(JSON.stringify({ 
        error: "Upstream error", 
        details: errText,
        requestId,
        status: response.status,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`📥 [${requestId}] Parsing OpenRouter response...`);
    const data = await response.json();
    console.log(`📥 [${requestId}] Raw API response:`, JSON.stringify(data, null, 2));

    let content: string = "";
    const choice = data?.choices?.[0]?.message;
    if (typeof choice?.content === "string") {
      content = choice.content;
      console.log(`📝 [${requestId}] Content extracted as string (length: ${content.length})`);
    } else if (Array.isArray(choice?.content)) {
      content = choice.content
        .map((c: any) => (typeof c === "string" ? c : c.text || ""))
        .join("\n");
      console.log(`📝 [${requestId}] Content extracted from array (length: ${content.length})`);
    } else {
      console.error(`❌ [${requestId}] Unexpected content format:`, typeof choice?.content);
    }

    console.log(`📝 [${requestId}] Final content:`, content);

    // Try to detect special JSON handoff
    console.log(`🔍 [${requestId}] Checking for JSON handoff pattern...`);
    let parsed: any = null;
    try {
      parsed = JSON.parse(content.trim());
      console.log(`✅ [${requestId}] Content successfully parsed as JSON:`, parsed);
    } catch (parseError) {
      console.log(`ℹ️ [${requestId}] Content is not JSON, treating as plain message:`, parseError);
    }

    if (parsed && parsed.status === "ready_to_generate" && parsed.intel) {
      console.log(`🎯 [${requestId}] JSON handoff detected! Intel:`, parsed.intel);
      console.log(`✅ [${requestId}] JSON handoff complete in ${Date.now() - startTime}ms`);
      
      return new Response(JSON.stringify({
        ...parsed,
        debug: {
          requestId,
          processingTime: Date.now() - startTime,
          apiDuration,
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`💬 [${requestId}] Returning as assistant message`);
    console.log(`✅ [${requestId}] Request complete in ${Date.now() - startTime}ms`);

    // Fallback as plain assistant message
    return new Response(JSON.stringify({ 
      type: "message", 
      role: "assistant", 
      content,
      debug: {
        requestId,
        processingTime: Date.now() - startTime,
        apiDuration,
        timestamp: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`💥 [${requestId}] Fatal error after ${duration}ms:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return new Response(JSON.stringify({ 
      error: String(error),
      requestId,
      processingTime: duration,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
