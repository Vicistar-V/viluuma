import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Viluuma, a super friendly, supportive AI coach.
Goal: help the user clarify a goal with just the essentials, then STOP and emit a special JSON.

Conversation rules:
- Keep messages short, positive, and helpful (mobile-first UX).
- Ask only what is necessary to confidently create a plan: title, modality (project or checklist), deadline (YYYY-MM-DD or "none"), hoursPerWeek (integer), and any brief context.
- After you have enough info, DO NOT continue chatting. Respond with ONLY this JSON (no extra text):
{"status":"ready_to_generate","intel":{"title":"...","modality":"project|checklist","deadline":"YYYY-MM-DD|null","hoursPerWeek":8,"context":"optional short context"}}
- Ensure the JSON is the only thing in your response when you are ready.
`;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing OPENROUTER_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid payload: messages[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat-v3-0324:free",
        temperature: 0.4,
        messages: finalMessages,
      }),
    });

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
