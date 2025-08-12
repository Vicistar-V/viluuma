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

async function handleChecklistGeneration(intel: any, compression_requested: boolean, apiKey: string, requestId: string, startTime: number) {
  console.log(`📝 [${requestId}] Building checklist prompt...`);
  const prompt = buildChecklistPrompt(intel, { compression: compression_requested });
  console.log(`📝 [${requestId}] Checklist prompt length: ${prompt.length}`);
  console.log(`📝 [${requestId}] Generated checklist prompt:`, prompt);

  console.log(`🌐 [${requestId}] Preparing checklist API call...`);
  const apiPayload = {
    model: "deepseek/deepseek-chat-v3-0324:free",
    temperature: 0.2,
    messages: [
      { role: "system", content: "Return only valid JSON." },
      { role: "user", content: prompt },
    ],
  };

  console.log(`🌐 [${requestId}] Checklist API payload:`, JSON.stringify(apiPayload, null, 2));

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
  console.log(`🌐 [${requestId}] Checklist API call completed in ${apiDuration}ms`);
  console.log(`🌐 [${requestId}] Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errText = await response.text();
    console.error(`❌ [${requestId}] Checklist API error:`, {
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

  console.log(`📥 [${requestId}] Parsing checklist response...`);
  const data = await response.json();
  console.log(`📥 [${requestId}] Raw checklist API response:`, JSON.stringify(data, null, 2));

  let content: string = "";
  const choice = data?.choices?.[0]?.message;
  if (typeof choice?.content === "string") {
    content = choice.content;
    console.log(`📝 [${requestId}] Checklist content extracted as string (length: ${content.length})`);
  } else if (Array.isArray(choice?.content)) {
    content = choice.content.map((c: any) => c?.text || "").join("\n");
    console.log(`📝 [${requestId}] Checklist content extracted from array (length: ${content.length})`);
  } else {
    console.error(`❌ [${requestId}] Unexpected checklist content format:`, typeof choice?.content);
  }

  console.log(`📝 [${requestId}] Final checklist content:`, content);

  console.log(`🔍 [${requestId}] Extracting checklist JSON...`);
  const raw = tryExtractJson(content);
  console.log(`🔍 [${requestId}] Extracted checklist JSON:`, JSON.stringify(raw, null, 2));

  if (!raw || !Array.isArray(raw.milestones) || !Array.isArray(raw.tasks)) {
    console.error(`❌ [${requestId}] Invalid checklist JSON structure:`, {
      hasRaw: !!raw,
      hasMilestones: Array.isArray(raw?.milestones),
      hasTasksArray: Array.isArray(raw?.tasks),
      milestonesCount: raw?.milestones?.length,
      tasksCount: raw?.tasks?.length
    });
    return new Response(JSON.stringify({ 
      error: "Model did not return valid JSON",
      details: { received: raw, expected: "object with milestones[] and tasks[]" },
      requestId,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`✅ [${requestId}] Valid checklist JSON - milestones: ${raw.milestones.length}, tasks: ${raw.tasks.length}`);

  // Sanitize for checklist (no scheduling needed)
  console.log(`🔧 [${requestId}] Sanitizing checklist milestones...`);
  const milestones = raw.milestones.map((m: any, idx: number) => ({
    title: String(m?.title || `Milestone ${idx + 1}`),
    order_index: Number(m?.order_index ?? idx + 1),
  }));
  console.log(`🔧 [${requestId}] Sanitized checklist milestones:`, JSON.stringify(milestones, null, 2));

  console.log(`🔧 [${requestId}] Sanitizing checklist tasks...`);
  const compressionFactor = compression_requested ? 0.8 : 1.0;
  console.log(`🔧 [${requestId}] Checklist compression factor: ${compressionFactor}`);
  
  const tasks = raw.tasks.map((t: any, idx: number) => {
    const sanitized = {
      id: crypto.randomUUID(),
      title: String(t?.title || `Task ${idx + 1}`),
      description: t?.description ? String(t.description) : null,
      milestone_index: Number(t?.milestone_index ?? 1),
      duration_hours: Math.max(1, Math.round(Number(t?.duration_hours ?? 2) * compressionFactor)),
      priority: ["low","medium","high"].includes(String(t?.priority)) ? String(t.priority) : null,
    };
    console.log(`🔧 [${requestId}] Checklist task ${idx}: ${sanitized.title} (${sanitized.duration_hours}h, milestone ${sanitized.milestone_index})`);
    return sanitized;
  });

  console.log(`📈 [${requestId}] Running checklist quality checks...`);
  // Simple quality check for checklists
  let status: "success_checklist" | "low_quality" = "success_checklist";
  let message = "Here's your checklist! Does this look like a good starting point?";

  if (tasks.length < 3) {
    status = "low_quality";
    message = "This checklist seems too light. Let's try again with more detail.";
    console.log(`⚠️ [${requestId}] Checklist quality issue: too few tasks (${tasks.length})`);
  } else {
    console.log(`✅ [${requestId}] Checklist quality looks good (${tasks.length} tasks)`);
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
    debug: {
      requestId,
      processingTime: Date.now() - startTime,
      apiDuration,
      timestamp: new Date().toISOString(),
      metrics: {
        milestonesCount: milestones.length,
        tasksCount: tasks.length,
        type: "checklist"
      }
    }
  };

  console.log(`🎯 [${requestId}] Final checklist payload:`, JSON.stringify(payload, null, 2));
  console.log(`✅ [${requestId}] Checklist generation complete in ${Date.now() - startTime}ms`);

  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const startTime = Date.now();
  
  console.log(`🚀 [${requestId}] generate-plan request started`);
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
    const { intel, compression_requested = false, extension_requested = false } = requestBody;
    
    console.log(`📥 [${requestId}] Request payload:`, JSON.stringify(requestBody, null, 2));
    
    if (!intel?.title || !intel?.modality) {
      console.error(`❌ [${requestId}] Invalid payload - missing intel.title or intel.modality:`, {
        title: intel?.title,
        modality: intel?.modality
      });
      return new Response(JSON.stringify({ 
        error: "intel.title and intel.modality required",
        received: { title: intel?.title, modality: intel?.modality },
        requestId,
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`📋 [${requestId}] Intel received:`, JSON.stringify(intel, null, 2));
    console.log(`⚙️ [${requestId}] Options: compression=${compression_requested}, extension=${extension_requested}`);

    // Handle checklist modality with simplified logic
    if (intel.modality === 'checklist') {
      console.log(`📝 [${requestId}] Handling checklist generation...`);
      return await handleChecklistGeneration(intel, compression_requested, apiKey, requestId, startTime);
    }

    console.log(`🏗️ [${requestId}] Handling project generation...`);
    const prompt = buildPrompt(intel, { compression: compression_requested, extension: extension_requested });
    console.log(`🏗️ [${requestId}] Prompt length: ${prompt.length}`);
    console.log(`🏗️ [${requestId}] Generated prompt:`, prompt);

    console.log(`🌐 [${requestId}] Preparing OpenRouter API call...`);
    const apiPayload = {
      model: "deepseek/deepseek-chat-v3-0324:free",
      temperature: 0.2,
      messages: [
        { role: "system", content: "Return only valid JSON." },
        { role: "user", content: prompt },
      ],
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
      content = choice.content.map((c: any) => c?.text || "").join("\n");
      console.log(`📝 [${requestId}] Content extracted from array (length: ${content.length})`);
    } else {
      console.error(`❌ [${requestId}] Unexpected content format:`, typeof choice?.content);
    }

    console.log(`📝 [${requestId}] Final content:`, content);

    console.log(`🔍 [${requestId}] Attempting to extract JSON...`);
    const raw = tryExtractJson(content);
    console.log(`🔍 [${requestId}] Extracted JSON:`, JSON.stringify(raw, null, 2));

    if (!raw || !Array.isArray(raw.milestones) || !Array.isArray(raw.tasks)) {
      console.error(`❌ [${requestId}] Invalid JSON structure:`, {
        hasRaw: !!raw,
        hasMilestones: Array.isArray(raw?.milestones),
        hasTasksArray: Array.isArray(raw?.tasks),
        milestonesCount: raw?.milestones?.length,
        tasksCount: raw?.tasks?.length
      });
      return new Response(JSON.stringify({ 
        error: "Model did not return valid JSON",
        details: { received: raw, expected: "object with milestones[] and tasks[]" },
        requestId,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`✅ [${requestId}] Valid JSON structure received - milestones: ${raw.milestones.length}, tasks: ${raw.tasks.length}`);

    // Sanitize & enrich
    console.log(`🔧 [${requestId}] Sanitizing milestones...`);
    const milestones = raw.milestones.map((m: any, idx: number) => ({
      title: String(m?.title || `Milestone ${idx + 1}`),
      order_index: Number(m?.order_index ?? idx + 1),
    }));
    console.log(`🔧 [${requestId}] Sanitized milestones:`, JSON.stringify(milestones, null, 2));

    console.log(`🔧 [${requestId}] Sanitizing tasks...`);
    const compressionFactor = compression_requested ? 0.8 : 1.0;
    console.log(`🔧 [${requestId}] Compression factor: ${compressionFactor}`);
    
    const tasks = raw.tasks.map((t: any, idx: number) => {
      const sanitized = {
        id: crypto.randomUUID(),
        title: String(t?.title || `Task ${idx + 1}`),
        description: t?.description ? String(t.description) : null,
        milestone_index: Number(t?.milestone_index ?? 1),
        duration_hours: Math.max(1, Math.round(Number(t?.duration_hours ?? 2) * compressionFactor)),
        priority: ["low","medium","high"].includes(String(t?.priority)) ? String(t.priority) : null,
      };
      console.log(`🔧 [${requestId}] Task ${idx}: ${sanitized.title} (${sanitized.duration_hours}h, milestone ${sanitized.milestone_index})`);
      return sanitized;
    });

    console.log(`📊 [${requestId}] Calculating scheduling...`);
    const hoursPerWeek = Math.max(1, Number(intel?.hoursPerWeek ?? 8));
    const daysPerWeek = 5;
    const dailyBudget = Math.max(1, Math.floor(hoursPerWeek / daysPerWeek));
    
    console.log(`📊 [${requestId}] Scheduling params: ${hoursPerWeek}h/week, ${daysPerWeek} days/week, ${dailyBudget}h/day budget`);

    let currentOffset = 0;
    const scheduledTasks = tasks.map((t: any) => {
      const durationDays = Math.max(1, Math.ceil(t.duration_hours / dailyBudget));
      const start = currentOffset;
      const end = start + durationDays - 1;
      currentOffset = end + 1;
      
      const scheduled = { ...t, start_day_offset: start, end_day_offset: end };
      console.log(`📊 [${requestId}] Scheduled task "${t.title}": days ${start}-${end} (${durationDays} days)`);
      return scheduled;
    });

    console.log(`📈 [${requestId}] Running quality checks...`);
    // Final quality checks
    const today = new Date();
    const deadlineDate = intel?.deadline ? new Date(intel.deadline) : null;
    const totalProjectDays = scheduledTasks.length ? scheduledTasks[scheduledTasks.length - 1].end_day_offset + 1 : 0;
    const daysAvailable = deadlineDate ? daysBetweenUTC(today, deadlineDate) : null;
    
    console.log(`📈 [${requestId}] Quality metrics:`, {
      today: today.toISOString().split('T')[0],
      deadline: intel?.deadline,
      totalProjectDays,
      daysAvailable,
      tasksCount: scheduledTasks.length
    });
    
    // Calculate the projected end date
    const projectedEndDate = new Date(today);
    projectedEndDate.setUTCDate(projectedEndDate.getUTCDate() + totalProjectDays);
    const calculatedEndDate = projectedEndDate.toISOString().split('T')[0];
    console.log(`📈 [${requestId}] Calculated end date: ${calculatedEndDate}`);

    let status: "success" | "over_scoped" | "under_scoped" | "low_quality" = "success";
    let message = "Looks great! Ready when you are.";

    // Quality check: too few tasks
    if (scheduledTasks.length < 3) {
      status = "low_quality";
      message = "This plan seems too light. Try extending the timeline or adding detail.";
      console.log(`⚠️ [${requestId}] Quality issue: too few tasks (${scheduledTasks.length})`);
    }

    // Scope analysis against deadline
    if (daysAvailable != null && status !== "low_quality") {
      const scopeRatio = totalProjectDays / daysAvailable;
      console.log(`📈 [${requestId}] Scope ratio: ${scopeRatio.toFixed(2)} (${totalProjectDays}/${daysAvailable})`);
      
      if (scopeRatio > 1.1) { // More than 10% over deadline
        status = "over_scoped";
        message = "Ambitious timeline. Consider compressing or extending the deadline.";
        console.log(`⚠️ [${requestId}] Scope issue: over-scoped (${scopeRatio.toFixed(2)})`);
      } else if (scopeRatio < 0.6) { // Less than 60% of available time
        status = "under_scoped";
        message = "This might be too lax for your deadline. Want to expand it?";
        console.log(`⚠️ [${requestId}] Scope issue: under-scoped (${scopeRatio.toFixed(2)})`);
      } else {
        console.log(`✅ [${requestId}] Scope looks good (${scopeRatio.toFixed(2)})`);
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
      debug: {
        requestId,
        processingTime: Date.now() - startTime,
        apiDuration,
        timestamp: new Date().toISOString(),
        metrics: {
          milestonesCount: milestones.length,
          tasksCount: tasks.length,
          totalProjectDays,
          daysAvailable,
          scopeRatio: daysAvailable ? totalProjectDays / daysAvailable : null
        }
      }
    };

    console.log(`🎯 [${requestId}] Final payload:`, JSON.stringify(payload, null, 2));
    console.log(`✅ [${requestId}] Project generation complete in ${Date.now() - startTime}ms`);

    return new Response(JSON.stringify(payload), {
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
