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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 onboard-goal function started");
    console.log("📋 Request method:", req.method);
    console.log("🔑 Checking API key availability...");
    
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      console.error("❌ Missing OPENROUTER_API_KEY environment variable");
      return new Response(JSON.stringify({ error: "Missing OPENROUTER_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("✅ API key found");

    console.log("📨 Parsing request body...");
    const requestBody = await req.json();
    console.log("📊 Request body:", JSON.stringify(requestBody, null, 2));
    
    const { messages } = requestBody;
    if (!Array.isArray(messages)) {
      console.error("❌ Invalid payload: messages should be an array");
      return new Response(JSON.stringify({ error: "Invalid payload: messages[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("✅ Messages validation passed, count:", messages.length);

    // Analyze conversation state to determine what info is still needed
    console.log("🔍 Analyzing conversation state...");
    const state = analyzeConversationState(messages);
    console.log("📊 Conversation state:", JSON.stringify(state, null, 2));
    
    const missingInfo: string[] = [];

    if (!state.title) {
      missingInfo.push("Core Activity: What is the user's main goal?");
    }
    
    if (!state.modality) {
      missingInfo.push("Modality: Is this a Project (with deadline) or a Checklist (ongoing)?");
    }
    
    // Only ask for deadline if it's a project
    if (state.modality === "project" && !state.deadline) {
      missingInfo.push("Deadline: Get a specific target date");
    }
    
    // Only ask for hours per week if it's a project and we don't have it
    if (state.modality === "project" && !state.hoursPerWeek) {
      missingInfo.push("Time Commitment: How many hours per week can they dedicate?");
    }

    console.log("📝 Missing info:", missingInfo);

    // Check if we have everything we need for the handoff
    if (missingInfo.length === 0 && state.title && state.modality) {
      console.log("✅ All information collected, generating intel object");
      // We have everything! Return the intel directly
      const intel = {
        title: state.title,
        modality: state.modality,
        deadline: state.modality === "checklist" ? null : (state.deadline || null),
        hoursPerWeek: state.modality === "checklist" ? 0 : (state.hoursPerWeek || 8),
        context: state.context || ""
      };
      
      console.log("🎯 Generated intel:", JSON.stringify(intel, null, 2));
      
      return new Response(JSON.stringify({
        status: "ready_to_generate",
        intel
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build dynamic system prompt based on missing information
    console.log("🎯 Building dynamic system prompt for missing info");
    const dynamicSystemPrompt = buildDynamicSystemPrompt(missingInfo);
    console.log("📄 System prompt length:", dynamicSystemPrompt.length);

    const finalMessages = [
      { role: "system", content: dynamicSystemPrompt },
      ...messages,
    ];
    console.log("💬 Final messages count:", finalMessages.length);

    console.log("🌐 Making API call to OpenRouter...");
    const requestPayload = {
      model: "deepseek/deepseek-chat-v3-0324:free",
      temperature: 0.4,
      messages: finalMessages,
    };
    console.log("📤 API Request payload:", JSON.stringify(requestPayload, null, 2));

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    console.log("📥 API Response status:", response.status);
    console.log("📥 API Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errText = await response.text();
      console.error("onboard-goal upstream error:", errText);
      return new Response(JSON.stringify({ error: "Upstream error", details: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let content: string = "";
    const choice = data?.choices?.[0]?.message;
    if (typeof choice?.content === "string") {
      content = choice.content;
    } else if (Array.isArray(choice?.content)) {
      content = choice.content
        .map((c: any) => (typeof c === "string" ? c : c.text || ""))
        .join("\n");
    }

    // Try to detect special JSON handoff
    let parsed: any = null;
    try {
      parsed = JSON.parse(content.trim());
    } catch (_) {}

    if (parsed && parsed.status === "ready_to_generate" && parsed.intel) {
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback as plain assistant message
    return new Response(JSON.stringify({ type: "message", role: "assistant", content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("onboard-goal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
