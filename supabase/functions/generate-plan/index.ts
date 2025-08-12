import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Trigger redeployment

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const BASE_INSTRUCTIONS = `You are an elite subject-matter expert and plan architect. Given a goal and context, create a realistic, sequential plan with milestones and tasks.

Your job is NOT to be a project manager or worry about deadlines. Your job is to be an expert in the subject matter and provide realistic estimates.

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
- Tasks must be ordered in logical execution sequence
- Keep tasks atomic and actionable (1–8 hours typically)
- Prefer 3–6 milestones; 5–20 total tasks for typical goals
- duration_hours should be your honest estimate of effort required
- milestone_index refers to the milestone order_index
- Focus on REALISTIC time estimates, not fitting into any timeline
`;

// Station 1: The Prompter - constructAIPrompt
function constructAIPrompt(intel: {
  title: string;
  modality: 'project' | 'checklist';
  context?: string;
  level_of_detail?: 'standard' | 'condensed' | 'comprehensive';
  compression_requested?: boolean;
  expansion_requested?: boolean;
  // Allow legacy field names for compatibility
  levelOfDetail?: 'standard' | 'condensed' | 'comprehensive';
}) {
  const title = String(intel.title || '').trim();
  const modality = intel.modality;
  const context = intel.context || 'No additional context provided.';
  const level = (intel.level_of_detail ?? intel.levelOfDetail ?? 'standard') as 'standard' | 'condensed' | 'comprehensive';
  const compressionRequested = Boolean(intel.compression_requested);
  const expansionRequested = Boolean(intel.expansion_requested);

  // Persona classifier
  let persona = 'You are Viluuma, a world-class project planner and goal strategist.';
  const titleLower = title.toLowerCase();
  if (titleLower.includes('learn')) {
    persona = 'You are an expert educator and curriculum designer specializing in self-study.';
  } else if (titleLower.includes('run') || titleLower.includes('get fit') || titleLower.includes('gym')) {
    persona = 'You are a certified personal trainer and fitness coach.';
  } else if (titleLower.includes('write') || titleLower.includes('blog') || titleLower.includes('novel')) {
    persona = 'You are a seasoned author and content strategist.';
  } else if (titleLower.includes('launch') || titleLower.includes('build an app') || titleLower.includes('start a business')) {
    persona = 'You are an experienced startup founder and project manager.';
  }

  const coreTask = `
Your mission is to break down the user's ambitious goal into a clear, sequential, and actionable plan.

GOAL DETAILS:
- Title: "${title}"
- User's Context: ${context}
`;

  const constraints: string[] = [
    'The plan must be a logical, step-by-step sequence. The order of tasks matters.',
    'Break down large, vague tasks into smaller, concrete actions.',
    'Task durations should be realistic estimates of focused work, in hours, as integers.',
    'Keep tasks atomic and actionable (typically 1–8 hours each).',
    'Prefer 3–6 milestones; 5–20 total tasks for typical goals.',
    'Do not include dates; return only relative effort (duration_hours).',
    'Tasks must be returned in strict execution order (sequential).'
  ];

  if (modality === 'checklist') {
    constraints.push('This is a flexible checklist; focus on organization rather than a strict timeline.');
  }

  switch (level) {
    case 'condensed':
      constraints.push("Create a highly-condensed, 'quick start' version of this plan.");
      break;
    case 'comprehensive':
      constraints.push("Create a deeply comprehensive, 'masterclass' version of this plan with extra detail.");
      break;
    default:
      constraints.push('Create a standard, well-balanced plan suitable for a dedicated learner.');
  }

  if (compressionRequested) {
    constraints.push('CRITICAL INSTRUCTION: The previous plan was too long. Aggressively reduce scope and shorten or remove non-essential tasks.');
  }
  if (expansionRequested) {
    constraints.push('CRITICAL INSTRUCTION: The previous plan was too short. Add depth, supplementary exercises, and advanced modules to make it more challenging.');
  }

  const constraintsSection = `
CONSTRAINTS & RULES:
- ${constraints.join('\n- ')}
`;

  const outputFormat = `
OUTPUT FORMAT:
You MUST return ONLY a valid JSON object. Do not include any introductory text, markdown, or explanations. The JSON object must conform to this exact structure:

{
  "milestones": [
    { "title": "Phase 1: Foundation", "order_index": 1 }
    // ... more milestones ...
  ],
  "tasks": [
    {
      "title": "Specific Actionable Task",
      "description": "A brief, one-sentence description of the task.",
      "milestone_index": 1,
      "duration_hours": 6,
      "priority": "low|medium|high"
    }
    // ... more tasks ...
  ]
}

Rules:
- "milestone_index" refers to the milestone's "order_index".
- All tasks must be ordered in logical execution sequence.
`;

  const finalPrompt = `
${persona}

${coreTask}

${constraintsSection}

${outputFormat}
Return ONLY JSON.`;

  return finalPrompt;
}

function buildPrompt(intel: any, opts: { compression?: boolean; extension?: boolean }) {
  const { title, modality, context, levelOfDetail } = intel || {};
  
  // Build level of detail instruction without mentioning deadlines
  let detailInstruction = "";
  if (levelOfDetail === "condensed") {
    detailInstruction = "Create a condensed, crash-course style plan focusing on the most essential steps.";
  } else if (levelOfDetail === "comprehensive") {
    detailInstruction = "Create a comprehensive, masterclass-level plan with thorough depth and detail.";
  } else {
    detailInstruction = "Create a standard, well-structured plan with good detail and coverage.";
  }
  
  const compressionNote = opts.compression
    ? "TIGHTEN the scope by ~20% while keeping quality."
    : opts.extension
    ? "User wants more thorough coverage; be slightly more comprehensive."
    : "";

  return `${BASE_INSTRUCTIONS}

GOAL: ${title}
MODALITY: ${modality}
CONTEXT: ${context ?? ""}
DETAIL LEVEL: ${detailInstruction}
${compressionNote}

Return ONLY JSON.`;
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

// Station 2: The Creative AI - fetchAIBlueprint
async function fetchAIBlueprint(prompt: string): Promise<string> {
  console.log('🤖 Station 2: Calling OpenRouter...');

  const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!openRouterApiKey) {
    // This is a server configuration error, not a user error.
    throw new Error('SERVER ERROR: OpenRouter API key not configured.');
  }

  const modelToUse = 'openai/gpt-oss-20b:free'; // Production default; can be tuned per org

  const body: Record<string, unknown> = {
    model: modelToUse,
    messages: [
      { role: 'system', content: 'Return only valid JSON.' },
      { role: 'user', content: prompt }
    ],
    // --- PRODUCTION-READY PARAMETERS ---
    temperature: 0.5, // Lower temp for more predictable, structured output
    max_tokens: 4096, // Room to generate a full plan
    response_format: { type: 'json_object' }, // Strongly bias valid JSON output
  };

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${openRouterApiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': Deno.env.get('SUPABASE_URL') || 'https://supabase.com',
    'X-Title': 'Viluuma Mobile App',
  };

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  // 1) Network/server errors
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`❌ Station 2 ERROR: OpenRouter API responded with status ${response.status}`, errorBody);
    throw new Error(`AI_API_ERROR: ${response.statusText}`);
  }

  // 2) Parse response
  const aiData = await response.json();

  // 3) Logical validation
  if (!aiData.choices || aiData.choices.length === 0 || !aiData.choices[0]?.message?.content) {
    console.error('❌ Station 2 ERROR: AI response was malformed (no content)', aiData);
    throw new Error('AI_EMPTY_RESPONSE');
  }

  const rawJSONString = String(aiData.choices[0].message.content).trim();

  // 4) Final sanity
  if (!rawJSONString || rawJSONString === '{}') {
    console.error('❌ Station 2 ERROR: AI returned an empty plan', rawJSONString);
    throw new Error('AI_EMPTY_RESPONSE');
  }

  console.log(`✅ Station 2: Successfully received raw plan (${rawJSONString.length} characters)`);
  return rawJSONString;
}

function daysBetweenUTC(a: Date, b: Date) {
  const ms = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) -
             Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

// NEW: Unbiased analysis function that compares realistic timeline vs user constraints
function performAnalysis(userConstraints: any, totalProjectDays: number, calculatedEndDate: string): {
  status: "success" | "over_scoped" | "under_scoped" | "low_quality";
  message: string;
} {
  if (!userConstraints) {
    return {
      status: "success",
      message: "Plan looks good! No deadline constraints to check."
    };
  }

  const { deadline } = userConstraints;
  if (!deadline) {
    return {
      status: "success", 
      message: "Your plan is ready! Since there's no deadline pressure, you can work at your own pace."
    };
  }

  console.log("📊 UNBIASED ANALYSIS:");
  console.log("  - User deadline:", deadline);
  console.log("  - Realistic end date:", calculatedEndDate);
  console.log("  - Total realistic days needed:", totalProjectDays);

  // Calculate days available from today to user's deadline
  const today = new Date();
  const deadlineDate = new Date(deadline);
  const daysAvailable = Math.max(0, Math.floor((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  
  console.log("  - Days available:", daysAvailable);

  if (daysAvailable === 0) {
    return {
      status: "over_scoped",
      message: "The deadline has already passed or is today. This plan needs more time to be done properly."
    };
  }

  const scopeRatio = totalProjectDays / daysAvailable;
  console.log("  - Scope ratio (realistic days / available days):", scopeRatio);

  if (scopeRatio > 1.1) { // More than 10% over deadline
    return {
      status: "over_scoped",
      message: "This plan is ambitious for your timeline. Based on realistic estimates, it would take longer than your deadline allows."
    };
  } else if (scopeRatio < 0.6) { // Less than 60% of available time
    return {
      status: "under_scoped", 
      message: "Great news! This plan should finish well ahead of your deadline. You might want to make it more comprehensive."
    };
  } else {
    return {
      status: "success",
      message: "Perfect! This plan fits well within your deadline with a realistic pace."
    };
  }
}

function buildChecklistPrompt(intel: any, opts: { compression?: boolean }) {
  const { title, context, levelOfDetail } = intel || {};
  
  // Build level of detail instruction for checklists
  let detailInstruction = "";
  if (levelOfDetail === "condensed") {
    detailInstruction = "Create a focused, essential-only checklist with core tasks.";
  } else if (levelOfDetail === "comprehensive") {
    detailInstruction = "Create a thorough, comprehensive checklist covering all aspects.";
  } else {
    detailInstruction = "Create a well-balanced checklist with good detail and coverage.";
  }

  const compressionNote = opts.compression
    ? "Keep the scope focused and manageable."
    : "";

  return `You are an elite checklist creator and subject-matter expert. Given a goal, create a structured checklist with realistic tasks.

Your job is to provide realistic estimates without worrying about timelines or personal schedules.

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
- Duration is your honest estimate of effort required
- milestone_index refers to the milestone order_index

GOAL: ${title}
CONTEXT: ${context || ""}
DETAIL LEVEL: ${detailInstruction}
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

// Station 3: The Sanitizer & Enricher - processAIBlueprint
interface ViluumaTask {
  id: string;
  name: string;
  description: string;
  duration_hours: number;
  priority: 'high' | 'medium' | 'low';
  milestone_name: string;
  dependencies: string[];
}

function processAIBlueprint(rawJSONString: string): ViluumaTask[] {
  let plan: any;
  try {
    plan = JSON.parse(rawJSONString);
  } catch (e: any) {
    console.error('❌ Station 3 ERROR: Failed to parse AI JSON.', e?.message || e);
    throw new Error('AI_INVALID_JSON');
  }

  // Basic structural integrity: require milestones array
  if (!plan?.milestones || !Array.isArray(plan.milestones) || plan.milestones.length === 0) {
    console.error("❌ Station 3 ERROR: AI JSON is missing a valid 'milestones' array.", plan);
    throw new Error('AI_INVALID_STRUCTURE');
  }

  // Build a lookup of milestone names by index/order for flat tasks
  const milestoneTitleByOrderIndex = new Map<number, string>();
  const milestoneTitleByPosition = new Map<number, string>();
  plan.milestones.forEach((m: any, idx: number) => {
    const name = String(m?.name ?? m?.title ?? `Milestone ${idx + 1}`).trim();
    const orderIndex = Number(m?.order_index ?? idx + 1) || (idx + 1);
    milestoneTitleByOrderIndex.set(orderIndex, name);
    milestoneTitleByPosition.set(idx, name);
  });

  const allTasks: ViluumaTask[] = [];

  // Case A: Flat tasks array referencing milestone_index
  if (Array.isArray(plan?.tasks)) {
    plan.tasks.forEach((rawTask: any, taskIndex: number) => {
      const rawName = (rawTask?.name ?? rawTask?.title);
      const name = typeof rawName === 'string' ? rawName.trim() : '';
      if (!name) {
        console.warn(`⚠️ Station 3 WARN: Skipping malformed task at flat index T${taskIndex}`);
        return;
      }

      const rawDesc = typeof rawTask?.description === 'string' ? rawTask.description.trim() : '';
      const parsedDuration = parseInt(String(rawTask?.duration_hours ?? 1), 10);
      const duration = Math.max(1, Number.isFinite(parsedDuration) ? parsedDuration : 1);

      let priority = String(rawTask?.priority ?? 'medium').toLowerCase();
      if (!['high', 'medium', 'low'].includes(priority)) priority = 'medium';

      const mi = Number(rawTask?.milestone_index ?? 1);
      const milestoneName = milestoneTitleByOrderIndex.get(mi) || `Milestone ${mi || 1}`;

      const task: ViluumaTask = {
        id: crypto.randomUUID(),
        name,
        description: rawDesc,
        duration_hours: duration,
        priority: priority as 'high' | 'medium' | 'low',
        milestone_name: milestoneName,
        dependencies: [],
      };
      allTasks.push(task);
    });
  }

  // Case B: Nested tasks inside milestones
  if (!Array.isArray(plan?.tasks) && Array.isArray(plan?.milestones)) {
    plan.milestones.forEach((milestone: any, milestoneIndex: number) => {
      const mName = String(milestone?.name ?? milestone?.title ?? `Milestone ${milestoneIndex + 1}`).trim();
      const tasks = Array.isArray(milestone?.tasks) ? milestone.tasks : [];
      if (!mName || tasks.length === 0) {
        if (!mName || typeof mName !== 'string') {
          console.warn(`⚠️ Station 3 WARN: Skipping malformed milestone at index ${milestoneIndex}`);
        }
        return;
      }

      tasks.forEach((rawTask: any, taskIndex: number) => {
        const rawName = (rawTask?.name ?? rawTask?.title);
        const name = typeof rawName === 'string' ? rawName.trim() : '';
        if (!name) {
          console.warn(`⚠️ Station 3 WARN: Skipping malformed task at M${milestoneIndex}, T${taskIndex}`);
          return;
        }

        const rawDesc = typeof rawTask?.description === 'string' ? rawTask.description.trim() : '';
        const parsedDuration = parseInt(String(rawTask?.duration_hours ?? 1), 10);
        const duration = Math.max(1, Number.isFinite(parsedDuration) ? parsedDuration : 1);

        let priority = String(rawTask?.priority ?? 'medium').toLowerCase();
        if (!['high', 'medium', 'low'].includes(priority)) priority = 'medium';

        const task: ViluumaTask = {
          id: crypto.randomUUID(),
          name,
          description: rawDesc,
          duration_hours: duration,
          priority: priority as 'high' | 'medium' | 'low',
          milestone_name: mName,
          dependencies: [],
        };
        allTasks.push(task);
      });
    });
  }

  if (allTasks.length === 0) {
    console.error('❌ Station 3 ERROR: Processing resulted in zero valid tasks.', rawJSONString);
    throw new Error('AI_NO_VALID_TASKS_PROCESSED');
  }

  console.log(`✅ Station 3: Successfully sanitized and enriched ${allTasks.length} tasks.`);
  return allTasks;
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
    
    const { intel, userConstraints, compression_requested = false, extension_requested = false } = requestBody;
    
    console.log("🔍 Validating intel data...");
    console.log("📝 Intel title:", intel?.title);
    console.log("🎯 Intel modality:", intel?.modality);
    console.log("📊 User constraints:", JSON.stringify(userConstraints, null, 2));
    
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
const prompt = constructAIPrompt({
  title: intel.title,
  modality: intel.modality,
  context: intel.context,
  level_of_detail: intel.level_of_detail ?? intel.levelOfDetail ?? 'standard',
  compression_requested,
  expansion_requested: extension_requested,
});
    console.log("📄 Generated prompt length:", prompt.length);

    console.log("🌐 Making API call to OpenRouter via Station 2 helper...");
    let content: string = '';
    try {
      content = await fetchAIBlueprint(prompt);
    } catch (err) {
      console.error('❌ Station 2 failed:', err);
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const raw = tryExtractJson(content);
    if (!raw || !Array.isArray(raw.milestones) || !Array.isArray(raw.tasks)) {
      console.log("❌ Invalid JSON structure - missing milestones or tasks arrays");
      console.log("🔄 Attempting retry with different model...");
      
      // Retry with the same model but different temperature
      const retryResponse = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b:free", // Same model
          temperature: 0.05, // Lower temperature for more consistency
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

    // Use a STANDARD daily budget for REALISTIC timeline calculation
    // This is independent of user's personal time commitment
    const STANDARD_DAILY_BUDGET = 2; // 2 hours per day as realistic standard
    const daysPerWeek = 5;

    let currentOffset = 0;
    const scheduledTasks = tasks.map((t: any) => {
      const durationDays = Math.max(1, Math.ceil(t.duration_hours / STANDARD_DAILY_BUDGET));
      const start = currentOffset;
      const end = start + durationDays - 1;
      currentOffset = end + 1;
      return { ...t, start_day_offset: start, end_day_offset: end };
    });

    // Calculate REALISTIC project timeline (independent of user constraints)
    const today = new Date();
    const totalProjectDays = scheduledTasks.length ? scheduledTasks[scheduledTasks.length - 1].end_day_offset + 1 : 0;
    
    // Calculate the REALISTIC projected end date
    const projectedEndDate = new Date(today);
    projectedEndDate.setUTCDate(projectedEndDate.getUTCDate() + totalProjectDays);
    const calculatedEndDate = projectedEndDate.toISOString().split('T')[0];
    
    console.log("📊 REALISTIC TIMELINE CALCULATION:");
    console.log("  - Total tasks:", tasks.length);
    console.log("  - Total project days:", totalProjectDays);
    console.log("  - Calculated end date:", calculatedEndDate);

    // NOW perform UNBIASED analysis using user constraints
    const analysisResult = performAnalysis(userConstraints, totalProjectDays, calculatedEndDate);
    
    const payload = {
      ...analysisResult,
      calculatedEndDate,
      plan: {
        milestones,
        scheduledTasks,
        hoursPerWeek: userConstraints?.hoursPerWeek || 8, // User's personal constraint
        dailyBudget: userConstraints?.hoursPerWeek ? Math.max(1, Math.floor(userConstraints.hoursPerWeek / daysPerWeek)) : STANDARD_DAILY_BUDGET,
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

// Serve function properly closed
