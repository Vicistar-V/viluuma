import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Trigger redeployment

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
  console.log("🔍 Attempting to extract JSON from:", trimmed.substring(0, 500));
  
  // Remove code fences if present
  const fence = /```[a-zA-Z]*\n([\s\S]*?)```/m;
  const m = trimmed.match(fence);
  const candidate = m ? m[1] : trimmed;
  
  try {
    const parsed = JSON.parse(candidate);
    console.log("✅ JSON parsed successfully");
    return parsed;
  } catch (parseError) {
    console.log("❌ Initial JSON parse failed:", parseError.message);
    
    // Try to find first { ... } block
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const slice = candidate.slice(start, end + 1);
      console.log("🔄 Trying JSON slice:", slice.substring(0, 200) + "...");
      try { 
        const parsed = JSON.parse(slice);
        console.log("✅ JSON slice parsed successfully");
        return parsed;
      } catch (sliceError) {
        console.log("❌ JSON slice parse failed:", sliceError.message);
      }
    }
    
    // Try to fix common JSON issues
    try {
      let fixed = candidate;
      
      // Fix incomplete descriptions (look for description followed by missing quote and field)
      fixed = fixed.replace(/"description":\s*"([^"]*)"([^"]*)"([^"]*)":\s*/g, '"description": "$1", "$3": ');
      
      // Fix missing quotes around field names
      fixed = fixed.replace(/(\w+):\s*"/g, '"$1": "');
      
      // Fix trailing commas
      fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
      
      console.log("🔧 Attempting to parse fixed JSON");
      const parsed = JSON.parse(fixed);
      console.log("✅ Fixed JSON parsed successfully");
      return parsed;
    } catch (fixError) {
      console.log("❌ Fixed JSON parse failed:", fixError.message);
    }
    
    return null;
  }
}

function daysBetweenUTC(a: Date, b: Date) {
  const ms = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) -
             Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function buildChecklistPrompt(intel: any, opts: { compression?: boolean }) {
  const { title, context } = intel || {};
  const compressionNote = opts.compression
    ? "Keep the scope focused and manageable."
    : "";

  return `You are an elite checklist creator. Given a goal, create a structured checklist with milestones and tasks.
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
      "duration_hours": 2,
      "priority": "low|medium|high"
    }
  ]
}
Rules:
- Focus on actionable tasks that can be completed independently
- Tasks should be atomic and specific (1-4 hours typically)
- Prefer 3-5 milestones; 8-15 total tasks for most goals
- Duration is for estimation only, not scheduling
- milestone_index refers to the milestone order_index
- No timeline or scheduling references needed

GOAL: ${title}
CONTEXT: ${context || ""}
${compressionNote}
Return ONLY JSON.`;
}

async function handleChecklistGeneration(intel: any, compression_requested: boolean, apiKey: string) {
  const prompt = buildChecklistPrompt(intel, { compression: compression_requested });

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b:free",
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

  // Parse response with comprehensive logging and fallback handling
  const rawResponseText = await response.text();
  console.log("📦 Raw checklist API Response Body:", rawResponseText);

  let data: any;
  try {
    data = JSON.parse(rawResponseText);
    console.log("🔍 Parsed checklist API Response Data:", JSON.stringify(data, null, 2));
  } catch (parseError) {
    console.error("❌ Failed to parse checklist API response as JSON:", parseError);
    return new Response(JSON.stringify({ error: "Invalid JSON response from OpenRouter" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let content: string = "";
  const choice = data?.choices?.[0]?.message;
  console.log("🎯 Extracted checklist choice object:", JSON.stringify(choice, null, 2));
  
  if (typeof choice?.content === "string" && choice.content.trim()) {
    content = choice.content;
    console.log("✅ Checklist content extracted as string:", content);
  } else if (Array.isArray(choice?.content)) {
    content = choice.content.map((c: any) => c?.text || "").join("\n");
    console.log("✅ Checklist content extracted from array:", content);
  } else if (typeof choice?.reasoning === "string" && choice.reasoning.trim()) {
    content = choice.reasoning;
    console.log("✅ Checklist content extracted from reasoning field:", content);
  } else {
    console.log("❌ No valid checklist content found in choice:", choice);
    return new Response(JSON.stringify({ error: "No valid content in API response" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const raw = tryExtractJson(content);
  if (!raw || !Array.isArray(raw.milestones) || !Array.isArray(raw.tasks)) {
    return new Response(JSON.stringify({ error: "Model did not return valid JSON" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Sanitize for checklist (no scheduling needed)
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

  // Simple quality check for checklists
  let status: "success_checklist" | "low_quality" = "success_checklist";
  let message = "Here's your checklist! Does this look like a good starting point?";

  if (tasks.length < 3) {
    status = "low_quality";
    message = "This checklist seems too light. Let's try again with more detail.";
  }

  const payload = {
    status,
    message,
    plan: {
      milestones,
      scheduledTasks: tasks, // No scheduling offsets for checklists
      hoursPerWeek: 0, // Not relevant for checklists
      dailyBudget: 0, // Not relevant for checklists
    },
  };

  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    console.log("🚀 generate-plan function started");
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
    
    const { intel, compression_requested = false, extension_requested = false } = requestBody;
    
    console.log("🔍 Validating intel data...");
    console.log("📝 Intel title:", intel?.title);
    console.log("🎯 Intel modality:", intel?.modality);
    
    if (!intel?.title || !intel?.modality) {
      console.error("❌ Missing required intel data - title or modality");
      return new Response(JSON.stringify({ error: "intel.title and intel.modality required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("✅ Intel validation passed");

    // Handle checklist modality with simplified logic
    if (intel.modality === 'checklist') {
      console.log("📋 Processing checklist modality");
      return await handleChecklistGeneration(intel, compression_requested, apiKey);
    }

    console.log("🏗️ Processing project modality - building prompt");
    const prompt = buildPrompt(intel, { compression: compression_requested, extension: extension_requested });
    console.log("📄 Generated prompt length:", prompt.length);

    console.log("🌐 Making API call to OpenRouter...");
    const requestPayload = {
      model: "openai/gpt-oss-20b:free",
      temperature: 0.2,
      messages: [
        { role: "system", content: "Return only valid JSON." },
        { role: "user", content: prompt },
      ],
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
      console.error("generate-plan upstream error:", errText);
      return new Response(JSON.stringify({ error: "Upstream error", details: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse response with comprehensive logging and fallback handling
    const rawResponseText = await response.text();
    console.log("📦 Raw project API Response Body:", rawResponseText);

    let data: any;
    try {
      data = JSON.parse(rawResponseText);
      console.log("🔍 Parsed project API Response Data:", JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error("❌ Failed to parse project API response as JSON:", parseError);
      return new Response(JSON.stringify({ error: "Invalid JSON response from OpenRouter" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let content: string = "";
    const choice = data?.choices?.[0]?.message;
    console.log("🎯 Extracted project choice object:", JSON.stringify(choice, null, 2));
    
    if (typeof choice?.content === "string" && choice.content.trim()) {
      content = choice.content;
      console.log("✅ Project content extracted as string:", content);
    } else if (Array.isArray(choice?.content)) {
      content = choice.content.map((c: any) => c?.text || "").join("\n");
      console.log("✅ Project content extracted from array:", content);
    } else if (typeof choice?.reasoning === "string" && choice.reasoning.trim()) {
      content = choice.reasoning;
      console.log("✅ Project content extracted from reasoning field:", content);
    } else {
      console.log("❌ No valid project content found in choice:", choice);
      return new Response(JSON.stringify({ error: "No valid content in API response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const raw = tryExtractJson(content);
    if (!raw || !Array.isArray(raw.milestones) || !Array.isArray(raw.tasks)) {
      console.log("❌ Invalid JSON structure - missing milestones or tasks arrays");
      console.log("🔄 Attempting retry with different model...");
      
      // Retry with a more reliable model
      const retryResponse = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini", // More reliable model
          temperature: 0.1,
          max_tokens: 2000,
          messages: [
            { role: "system", content: "You are a JSON generator. Return ONLY valid JSON. No prose, no backticks, no explanations." },
            { role: "user", content: prompt },
          ],
        }),
      });
      
      if (retryResponse.ok) {
        const retryText = await retryResponse.text();
        console.log("📦 Retry API Response:", retryText);
        const retryData = JSON.parse(retryText);
        const retryChoice = retryData?.choices?.[0]?.message;
        if (retryChoice?.content) {
          const retryRaw = tryExtractJson(retryChoice.content);
          if (retryRaw && Array.isArray(retryRaw.milestones) && Array.isArray(retryRaw.tasks)) {
            console.log("✅ Retry succeeded with valid JSON");
            raw = retryRaw;
          }
        }
      }
      
      if (!raw || !Array.isArray(raw.milestones) || !Array.isArray(raw.tasks)) {
        return new Response(JSON.stringify({ error: "Model did not return valid JSON structure after retry" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    
    // Validate task structure to catch malformed content
    console.log("🔍 Validating task structure...");
    for (let i = 0; i < raw.tasks.length; i++) {
      const task = raw.tasks[i];
      if (!task || typeof task !== 'object') {
        console.log(`❌ Task ${i} is not a valid object:`, task);
        return new Response(JSON.stringify({ error: `Task ${i + 1} is malformed` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Check for incomplete description field (common JSON malformation)
      if (task.description && typeof task.description === 'string') {
        if (task.description.includes('"milestone_index"') || task.description.includes('"duration_hours"')) {
          console.log(`❌ Task ${i} has malformed description containing field names:`, task.description);
          // Try to fix by truncating at the point where it gets malformed
          const cutoff = task.description.search(/"[\w_]+"\s*:/);
          if (cutoff > 0) {
            task.description = task.description.substring(0, cutoff).trim();
            console.log(`🔧 Fixed task ${i} description:`, task.description);
          } else {
            task.description = "Task description unavailable";
          }
        }
      }
    }
    console.log("✅ Task structure validation completed");

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
    
    // Calculate the projected end date
    const projectedEndDate = new Date(today);
    projectedEndDate.setUTCDate(projectedEndDate.getUTCDate() + totalProjectDays);
    const calculatedEndDate = projectedEndDate.toISOString().split('T')[0];

    let status: "success" | "over_scoped" | "under_scoped" | "low_quality" = "success";
    let message = "Looks great! Ready when you are.";

    // Quality check: too few tasks
    if (scheduledTasks.length < 3) {
      status = "low_quality";
      message = "This plan seems too light. Try extending the timeline or adding detail.";
    }

    // Scope analysis against deadline
    if (daysAvailable != null && status !== "low_quality") {
      const scopeRatio = totalProjectDays / daysAvailable;
      
      if (scopeRatio > 1.1) { // More than 10% over deadline
        status = "over_scoped";
        message = "Ambitious timeline. Consider compressing or extending the deadline.";
      } else if (scopeRatio < 0.6) { // Less than 60% of available time
        status = "under_scoped";
        message = "This might be too lax for your deadline. Want to expand it?";
      }
    }

    const payload = {
      status,
      message,
      calculatedEndDate,
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
