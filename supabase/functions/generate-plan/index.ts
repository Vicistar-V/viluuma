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
  console.log('🏭 Station 3: Starting sanitize & enrich process...');
  
  // Step 3.1: Parse & Structure Validation
  let plan: any;
  try {
    plan = JSON.parse(rawJSONString);
  } catch (e) {
    console.error("❌ Station 3 ERROR: Failed to parse AI JSON.", e.message);
    throw new Error('AI_INVALID_JSON');
  }

  if (!plan.milestones || !Array.isArray(plan.milestones) || plan.milestones.length === 0) {
    console.error("❌ Station 3 ERROR: AI JSON is missing a valid 'milestones' array.", plan);
    throw new Error('AI_INVALID_STRUCTURE');
  }

  if (!plan.tasks || !Array.isArray(plan.tasks) || plan.tasks.length === 0) {
    console.error("❌ Station 3 ERROR: AI JSON is missing a valid 'tasks' array.", plan);
    throw new Error('AI_INVALID_STRUCTURE');
  }

  // Step 3.2: The Flatten, ID, & Harden Loop
  const allTasks: ViluumaTask[] = [];

  plan.milestones.forEach((milestone: any, milestoneIndex: number) => {
    // Structure Validation for the milestone
    if (!milestone.title || typeof milestone.title !== 'string') {
      console.warn(`⚠️ Station 3 WARN: Skipping malformed milestone at index ${milestoneIndex}`);
      return;
    }
    
    // Find tasks for this milestone
    const milestoneTasks = plan.tasks.filter((task: any) => 
      task.milestone_index === milestone.order_index || 
      task.milestone_index === milestoneIndex + 1
    );
    
    milestoneTasks.forEach((rawTask: any, taskIndex: number) => {
      // --- HARDENING & VALIDATION ---
      const name = rawTask.title?.trim();
      if (!name || typeof name !== 'string') {
        console.warn(`⚠️ Station 3 WARN: Skipping malformed task at M${milestoneIndex}, T${taskIndex}`);
        return;
      }

      const duration = Math.max(1, parseInt(rawTask.duration_hours, 10)) || 1;
      
      let priority = rawTask.priority?.toLowerCase() || 'medium';
      if (!['high', 'medium', 'low'].includes(priority)) {
        priority = 'medium'; // Default to medium if AI gives weird input
      }

      // --- ENRICHMENT ---
      const task: ViluumaTask = {
        id: crypto.randomUUID(), // Assign the unique, permanent ID
        name: name,
        description: rawTask.description?.trim() || '', // Ensure it's a string
        duration_hours: duration,
        priority: priority as 'high' | 'medium' | 'low',
        milestone_name: milestone.title.trim(),
        dependencies: [] // Empty for V1, but the property exists
      };

      allTasks.push(task);
    });
  });

  // Step 3.3: Final Sanity Check
  if (allTasks.length === 0) {
    console.error('❌ Station 3 ERROR: Processing resulted in zero valid tasks.', rawJSONString);
    throw new Error('AI_NO_VALID_TASKS_PROCESSED');
  }

  console.log(`✅ Station 3: Successfully sanitized and enriched ${allTasks.length} tasks.`);
  return allTasks;
}

// Station 4: The Calculator - calculateRelativeSchedule
interface ScheduledViluumaTask extends ViluumaTask {
  start_day_offset: number;
  end_day_offset: number;
}

function calculateRelativeSchedule(
  tasks: ViluumaTask[],
  intel: { hoursPerWeek?: number }
): { scheduledTasks: ScheduledViluumaTask[]; totalProjectDays: number } {
  // Step 4.1: The Personalizer - determine daily work budget
  const weeklyBudget = intel.hoursPerWeek ?? 20; // Default to 20 hours/week
  const workdaysPerWeek = 5;
  const dailyBudgetHours = Math.max(1, weeklyBudget / workdaysPerWeek);

  console.log(`🧠 Station 4: Personalizing schedule with a daily budget of ${dailyBudgetHours.toFixed(1)} hours.`);

  // Step 4.2: The Scheduling Loop - sequential, no dependencies
  const scheduledTasks: ScheduledViluumaTask[] = [];
  let currentDayOffset = 0; // Project starts at Day 0

  for (const task of tasks) {
    const startDay = currentDayOffset;
    const durationInDays = Math.max(1, Math.ceil(task.duration_hours / dailyBudgetHours));
    const endDay = startDay + durationInDays - 1;

    scheduledTasks.push({
      ...task,
      start_day_offset: startDay,
      end_day_offset: endDay,
    });

    // +1 day rule: next task starts the day after this one ends
    currentDayOffset = endDay + 1;
  }

  // Step 4.3: Final calculation & output
  const totalProjectDays = scheduledTasks.length > 0
    ? scheduledTasks[scheduledTasks.length - 1].end_day_offset + 1
    : 0;

  console.log(`✅ Station 4: Schedule calculated. Total relative duration: ${totalProjectDays} days.`);

  return { scheduledTasks, totalProjectDays };
}

// Utility functions for workday-aware calculations
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function addWorkdays(start: Date, workdays: number): Date {
  const result = new Date(start);
  result.setHours(0, 0, 0, 0);
  let added = 0;
  while (added < workdays) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) {
      added++;
    }
  }
  return result;
}

function countWorkdaysBetween(start: Date, end: Date): number {
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  if (e <= s) return 0;
  let count = 0;
  const d = new Date(s);
  while (d < e) {
    d.setDate(d.getDate() + 1);
    if (!isWeekend(d)) {
      count++;
    }
  }
  return count;
}

// Station 5: The Analyst - analyzePlanQuality
// Define the possible outcomes for clarity
type PlanStatus = 'success' | 'over_scoped' | 'under_scoped' | 'low_quality' | 'success_checklist';

function analyzePlanQuality(
  plan: { scheduledTasks: ScheduledViluumaTask[]; totalProjectDays: number },
  intel: {
    modality: 'project' | 'checklist';
    deadline?: string;
  }
): { status: PlanStatus; message?: string; calculatedEndDate?: string } {
  // Step 5.1: Checklist fast lane
  if (intel.modality === 'checklist') {
    if (plan.scheduledTasks.length < 3) {
      console.warn('⚠️ Station 5: Checklist plan is too short. Flagging as low_quality.');
      return { status: 'low_quality', message: 'This checklist seems a bit too simple.' };
    } else {
      console.log('✅ Station 5: Checklist plan passed quality check.');
      return { status: 'success_checklist' };
    }
  }

  // Step 5.2: Low quality gatekeeper for projects
  const MIN_TASKS = 4;
  if (plan.scheduledTasks.length < MIN_TASKS) {
    console.warn(`⚠️ Station 5: Project plan has only ${plan.scheduledTasks.length} tasks. Flagging as low_quality.`);
    return { status: 'low_quality', message: 'Hmm, that plan seems a bit too simple for a project like this.' };
  }

  // Step 5.3: Date-based analysis for projects
  if (!intel.deadline) {
    console.log('✅ Station 5: Project plan has no deadline to check against. Passing as success.');
    return { status: 'success' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(intel.deadline);

  const workdaysAvailable = countWorkdaysBetween(today, deadlineDate);
  const totalProjectWorkdays = plan.totalProjectDays;

  const calculatedEndDate = addWorkdays(today, totalProjectWorkdays);
  const calculatedEndDateString = calculatedEndDate.toISOString().split('T')[0];

  if (totalProjectWorkdays > workdaysAvailable) {
    console.log(`⚠️ Station 5: Over-scoped. Plan needs ${totalProjectWorkdays} workdays, but only ${workdaysAvailable} are available.`);
    return {
      status: 'over_scoped',
      message: `Heads up! This plan is ambitious and needs about ${totalProjectWorkdays} workdays, which goes past your deadline.`,
      calculatedEndDate: calculatedEndDateString,
    };
  }

  const UNDER_SCOPED_THRESHOLD_DAYS = 14;
  if (workdaysAvailable - totalProjectWorkdays > UNDER_SCOPED_THRESHOLD_DAYS) {
    console.log(`📈 Station 5: Under-scoped. Plan finishes ${workdaysAvailable - totalProjectWorkdays} workdays early.`);
    return {
      status: 'under_scoped',
      message: `Great news! This plan should be done way ahead of schedule, around ${calculatedEndDateString}.`,
      calculatedEndDate: calculatedEndDateString,
    };
  }

  console.log('✅ Station 5: Project plan is a perfect fit for the timeline.');
  return {
    status: 'success',
    message: 'Your personalized plan is ready!',
    calculatedEndDate: calculatedEndDateString,
  };
}

// Standard shipping box for Station 6: The Reporter
// Client-facing scheduled task format
interface ClientScheduledTask {
  id: string;
  title: string;
  description: string;
  milestone_index: number;
  duration_hours: number;
  priority: 'high' | 'medium' | 'low';
  start_day_offset: number;
  end_day_offset: number;
}

interface PlanBlueprint {
  status: 'success' | 'over_scoped' | 'under_scoped' | 'low_quality' | 'success_checklist' | 'error';
  message: string;
  plan?: {
    milestones: any[];
    scheduledTasks: ClientScheduledTask[];
    totalProjectDays: number;
    hoursPerWeek: number;
    dailyBudget: number;
  };
  calculatedEndDate?: string;
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

    console.log("🔍 Processing AI response through Station 3...");
    let viluumaTasks: ViluumaTask[];
    try {
      viluumaTasks = processAIBlueprint(content);
    } catch (err) {
      console.error('❌ Station 3 failed:', err);
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert ViluumaTasks back to the expected format for the response
    const milestones = [...new Set(viluumaTasks.map(t => t.milestone_name))]
      .map((name, idx) => ({
        title: name,
        order_index: idx + 1
      }));

    // Station 4: Calculate personalized relative schedule
    const { scheduledTasks: scheduledViluuma, totalProjectDays } = calculateRelativeSchedule(
      viluumaTasks,
      { hoursPerWeek: userConstraints?.hoursPerWeek }
    );

    const hoursPerWeek = userConstraints?.hoursPerWeek ?? 20;
    const dailyBudget = Math.max(1, hoursPerWeek / 5);

    // Map scheduled tasks to response format with milestone_index
    const scheduledTasks = scheduledViluuma.map((task) => ({
      id: task.id,
      title: task.name,
      description: task.description,
      milestone_index: milestones.findIndex(m => m.title === task.milestone_name) + 1,
      duration_hours: task.duration_hours,
      priority: task.priority,
      start_day_offset: task.start_day_offset,
      end_day_offset: task.end_day_offset,
    }));

    // Calculate project end date in workdays (skip weekends)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const projectedEndDate = addWorkdays(today, totalProjectDays);
    const calculatedEndDate = projectedEndDate.toISOString().split('T')[0];
    
    console.log("📊 REALISTIC TIMELINE CALCULATION:");
    console.log("  - Total tasks:", scheduledTasks.length);
    console.log("  - Total project days:", totalProjectDays);
    console.log("  - Calculated end date:", calculatedEndDate);

    const analysis = analyzePlanQuality(
      { scheduledTasks: scheduledViluuma, totalProjectDays },
      { modality: intel.modality, deadline: userConstraints?.deadline ?? intel?.deadline }
    );

    const finalCalculatedEndDate = analysis.calculatedEndDate ?? calculatedEndDate;

    const blueprint: PlanBlueprint = {
      status: analysis.status,
      message: analysis.message ?? '',
      plan: {
        milestones,
        scheduledTasks,
        totalProjectDays,
        hoursPerWeek,
        dailyBudget,
      },
      calculatedEndDate: finalCalculatedEndDate,
    };

    // Prune based on status for consistency & efficiency
    if (blueprint.status === 'low_quality') {
      delete blueprint.plan;
    } else if (blueprint.status === 'success_checklist') {
      delete blueprint.calculatedEndDate;
    }

    console.log(`✅ Station 6: Reporting final status '${blueprint.status}'. Shipping blueprint to client.`);

    return new Response(JSON.stringify(blueprint), {
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