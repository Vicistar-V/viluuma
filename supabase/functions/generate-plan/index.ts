import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const BASE_INSTRUCTIONS = `You are an elite project planner. Given INTEL about a user's goal, create a sequential plan with milestones and tasks.
Return ONLY JSON following exactly this schema (no prose, no backticks):
{
  "milestones": [
    { "title": "", "order_index": 1 },
    ...
  ],
  "tasks": [
    {
      "title": "",
      "description": "",
      "milestone_index": 1,
      "duration_hours": 6,
      "priority": "low|medium|high"
    }
  ]
}
Rules:
- Tasks must be ordered in execution order.
- Keep tasks atomic and actionable (1–8 hours typically).
- Prefer 3–6 milestones; 5–20 total tasks for typical goals.
- Always include duration_hours as an integer.
- milestone_index refers to the milestone order_index.
`;

function buildPrompt(intel: any, opts: { compression?: boolean; extension?: boolean }) {
  const { title, modality, deadline, hoursPerWeek, context } = intel || {};
  const compressionNote = opts.compression
    ? "TIGHTEN the scope by ~20% while keeping quality."
    : opts.extension
    ? "User is willing to extend timeline; be slightly more thorough."
    : "";

  return `${BASE_INSTRUCTIONS}\nINTEL:\n- title: ${title}\n- modality: ${modality}\n- deadline: ${deadline ?? "none"}\n- hoursPerWeek: ${hoursPerWeek ?? 8}\n- context: ${context ?? ""}\n${compressionNote}\nReturn ONLY JSON.`;
}

function tryExtractJson(text: string): any | null {
  const trimmed = text.trim();
  // Remove code fences if present
  const fence = /```[a-zA-Z]*\n([\s\S]*?)```/m;
  const m = trimmed.match(fence);
  const candidate = m ? m[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch (_) {
    // Try to find first { ... } block
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const slice = candidate.slice(start, end + 1);
      try { return JSON.parse(slice); } catch (_) {}
    }
    return null;
  }
}

function daysBetweenUTC(a: Date, b: Date) {
  const ms = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) -
             Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing OPENROUTER_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { intel, compression_requested = false, extension_requested = false } = await req.json();
    if (!intel?.title || !intel?.modality) {
      return new Response(JSON.stringify({ error: "intel.title and intel.modality required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = buildPrompt(intel, { compression: compression_requested, extension: extension_requested });

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat-v3-0324:free",
        temperature: 0.2,
        messages: [
          { role: "system", content: "Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("generate-plan upstream error:", errText);
      return new Response(JSON.stringify({ error: "Upstream error", details: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let content: string = "";
    const choice = data?.choices?.[0]?.message;
    if (typeof choice?.content === "string") content = choice.content;
    else if (Array.isArray(choice?.content)) content = choice.content.map((c: any) => c?.text || "").join("\n");

    const raw = tryExtractJson(content);
    if (!raw || !Array.isArray(raw.milestones) || !Array.isArray(raw.tasks)) {
      return new Response(JSON.stringify({ error: "Model did not return valid JSON" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize & enrich
    const milestones = raw.milestones.map((m: any, idx: number) => ({
      title: String(m?.title || `Milestone ${idx + 1}`),
      order_index: Number(m?.order_index ?? idx + 1),
    }));

    const compressionFactor = compression_requested ? 0.8 : 1.0;
    const tasks = raw.tasks.map((t: any, idx: number) => ({
      id: crypto.randomUUID(),
      title: String(t?.title || `Task ${idx + 1}`),
      description: t?.description ? String(t.description) : null,
      milestone_index: Number(t?.milestone_index ?? 1),
      duration_hours: Math.max(1, Math.round(Number(t?.duration_hours ?? 2) * compressionFactor)),
      priority: ["low","medium","high"].includes(String(t?.priority)) ? String(t.priority) : null,
    }));

    const hoursPerWeek = Math.max(1, Number(intel?.hoursPerWeek ?? 8));
    const daysPerWeek = 5;
    const dailyBudget = Math.max(1, Math.floor(hoursPerWeek / daysPerWeek));

    let currentOffset = 0;
    const scheduledTasks = tasks.map((t: any) => {
      const durationDays = Math.max(1, Math.ceil(t.duration_hours / dailyBudget));
      const start = currentOffset;
      const end = start + durationDays - 1;
      currentOffset = end + 1;
      return { ...t, start_day_offset: start, end_day_offset: end };
    });

    // Final quality checks
    const today = new Date();
    const deadlineDate = intel?.deadline ? new Date(intel.deadline) : null;
    const totalProjectDays = scheduledTasks.length ? scheduledTasks[scheduledTasks.length - 1].end_day_offset + 1 : 0;
    const daysAvailable = deadlineDate ? daysBetweenUTC(today, deadlineDate) : null;

    let status: "success" | "over_scoped" | "under_scoped" | "low_quality" = "success";
    let message = "Looks great! Ready when you are.";

    if (scheduledTasks.length < 3) {
      status = "low_quality";
      message = "This plan seems too light. Try extending the timeline or adding detail.";
    }

    if (daysAvailable != null) {
      if (totalProjectDays > daysAvailable) {
        status = "over_scoped";
        message = "Ambitious timeline. Consider compressing or extending the deadline.";
      } else if (totalProjectDays < Math.floor(daysAvailable * 0.4)) {
        status = "under_scoped";
        message = "This might be too lax for your deadline. Want to expand it?";
      }
    }

    const payload = {
      status,
      message,
      plan: {
        milestones,
        scheduledTasks,
        hoursPerWeek,
        dailyBudget,
      },
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-plan error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
