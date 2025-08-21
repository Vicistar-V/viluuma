import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { addBusinessDays, differenceInBusinessDays } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Configuration
const DEFAULT_MODEL = "mistralai/mistral-7b-instruct:free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// ========================================
// 🎯 STATION 1: THE PROMPTER
// ========================================
function constructAIPrompt(intel: {
  title: string;
  modality: 'project' | 'checklist';
  context?: string;
  level_of_detail?: 'standard' | 'condensed' | 'comprehensive';
  compression_requested?: boolean;
  expansion_requested?: boolean;
}) {
  // Robust input validation
  if (!intel?.title || typeof intel.title !== 'string' || intel.title.trim().length === 0) {
    throw new Error('MISSING_TITLE');
  }
  if (!intel?.modality || !['project', 'checklist'].includes(intel.modality)) {
    throw new Error('INVALID_MODALITY');
  }
  
  const title = intel.title.trim();
  const modality = intel.modality;
  const context = intel.context || 'No additional context provided.';
  const level = intel.level_of_detail ?? 'standard';
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
You MUST return ONLY a valid JSON object with this exact structure:
{
  "milestones": [
    {
      "title": "<Milestone Title>",
      "tasks": [
        {
          "title": "<Task Title>",
          "description": "<Task Description>",
          "duration_hours": <Integer>,
          "priority": "high" | "medium" | "low"
        }
      ]
    }
  ]
}

FINAL INSTRUCTIONS:
- Return ONLY the raw JSON, nothing else.
- Ensure tasks and milestones are in a logical, sequential order.
`;

  const finalPrompt = `
${persona}

${coreTask}

${constraintsSection}

${outputFormat}
Return ONLY JSON.`;

  return finalPrompt;
}

// ========================================
// 🤖 STATION 2: THE CREATIVE AI
// ========================================
async function fetchAIBlueprint(prompt: string): Promise<string> {
  console.log('🤖 Station 2: Calling OpenRouter...');

  const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!openRouterApiKey) {
    throw new Error('SERVER ERROR: OpenRouter API key not configured.');
  }

  const body: Record<string, unknown> = {
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: 'Return only valid JSON.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.5,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  };

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${openRouterApiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': Deno.env.get('SUPABASE_URL') || 'https://supabase.com',
    'X-Title': 'Viluuma Mobile App',
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`❌ Station 2 ERROR: OpenRouter API responded with status ${response.status}`, errorBody);
    throw new Error(`AI_API_ERROR: ${response.statusText}`);
  }

  const aiData = await response.json();

  if (!aiData.choices || aiData.choices.length === 0 || !aiData.choices[0]?.message?.content) {
    console.error('❌ Station 2 ERROR: AI response was malformed (no content)', aiData);
    throw new Error('AI_EMPTY_RESPONSE');
  }

  const rawJSONString = String(aiData.choices[0].message.content).trim();

  if (!rawJSONString || rawJSONString === '{}') {
    console.error('❌ Station 2 ERROR: AI returned an empty plan', rawJSONString);
    throw new Error('AI_EMPTY_RESPONSE');
  }

  console.log(`✅ Station 2: Successfully received raw plan (${rawJSONString.length} characters)`);
  console.log("📋 Raw AI Response Content:", rawJSONString);
  
  return rawJSONString;
}

// JSON cleaning helper
function stripToJSONObject(s: string): string {
  const trimmed = String(s ?? '').trim();
  let cleaned = trimmed.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
  
  // Fix common AI JSON errors
  cleaned = cleaned.replace(/:\s*,/g, ': null,');
  cleaned = cleaned.replace(/:\s*}/g, ': null}');
  cleaned = cleaned.replace(/:\s*]/g, ': null]');
  
  // Fix malformed property names missing opening quotes
  cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*"):/g, '$1"$2:');
  
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

// ========================================
// 🏭 STATION 3: THE SANITIZER & ENRICHER
// ========================================
interface ViluumaTask {
  id: string;
  name: string;
  description: string;
  duration_hours: number;
  priority: 'high' | 'medium' | 'low';
  milestone_id: string;
  milestone_name: string;
  dependencies: string[];
}

interface CleanMilestone {
  id: string;
  title: string;
  order_index: number;
}

function processAIBlueprint(rawJSONString: string): { tasks: ViluumaTask[], milestones: CleanMilestone[] } {
  console.log('🏭 Station 3: Starting sanitize & enrich process...');
  
  // Parse & validate structure
  let plan: any;
  const cleaned = stripToJSONObject(rawJSONString);
  try {
    plan = JSON.parse(cleaned);
  } catch (e) {
    console.error("❌ Station 3 ERROR: Failed to parse AI JSON.", (e as any)?.message || e);
    throw new Error('AI_INVALID_JSON');
  }

  if (!plan.milestones || !Array.isArray(plan.milestones) || plan.milestones.length === 0) {
    console.error("❌ Station 3 ERROR: AI JSON is missing a valid 'milestones' array.", plan);
    throw new Error('AI_INVALID_STRUCTURE');
  }

  // Process milestones and tasks with ID linking
  const allTasks: ViluumaTask[] = [];
  const cleanMilestones: CleanMilestone[] = [];

  plan.milestones.forEach((milestone: any, milestoneIndex: number) => {
    if (!milestone.title || typeof milestone.title !== 'string') {
      console.warn(`⚠️ Station 3 WARN: Skipping malformed milestone at index ${milestoneIndex}`);
      return;
    }
    
    // Create milestone with unique ID
    const milestoneId = crypto.randomUUID();
    const cleanMilestone: CleanMilestone = {
      id: milestoneId,
      title: milestone.title.trim(),
      order_index: milestoneIndex
    };
    cleanMilestones.push(cleanMilestone);
    
    // Process tasks
    if (!milestone.tasks || !Array.isArray(milestone.tasks)) {
      console.warn(`⚠️ Station 3 WARN: Milestone "${milestone.title}" has no valid tasks array. Skipping.`);
      return;
    }
    
    milestone.tasks.forEach((rawTask: any, taskIndex: number) => {
      const name = rawTask.title?.trim();
      if (!name || typeof name !== 'string') {
        console.warn(`⚠️ Station 3 WARN: Skipping malformed task at M${milestoneIndex}, T${taskIndex}`);
        return;
      }

      const rawDur = Number(rawTask.duration_hours);
      const duration = Math.max(1, Math.min(40, Math.round(isFinite(rawDur) ? rawDur : 1)));
      
      let priority = rawTask.priority?.toLowerCase() || 'medium';
      if (priority === 'null' || !priority || !['high', 'medium', 'low'].includes(priority)) {
        priority = 'medium';
      }

      const task: ViluumaTask = {
        id: crypto.randomUUID(),
        name: name,
        description: rawTask.description?.trim() || '',
        duration_hours: duration,
        priority: priority as 'high' | 'medium' | 'low',
        milestone_id: milestoneId,
        milestone_name: milestone.title.trim(),
        dependencies: []
      };

      allTasks.push(task);
    });
  });

  if (allTasks.length === 0) {
    console.error('❌ Station 3 ERROR: Processing resulted in zero valid tasks.', rawJSONString);
    throw new Error('AI_NO_VALID_TASKS_PROCESSED');
  }

  console.log(`✅ Station 3: Successfully sanitized and enriched ${allTasks.length} tasks and ${cleanMilestones.length} milestones.`);
  return { tasks: allTasks, milestones: cleanMilestones };
}

// ========================================
// 🔧 STATION 4: THE NEW HOUR-AWARE BUCKET FILLING CALCULATOR
// ========================================
interface ScheduledViluumaTask extends ViluumaTask {
  start_day_offset: number;
  end_day_offset: number;
}

function calculateRelativeSchedule(
  tasks: ViluumaTask[],
  intel: { hoursPerWeek?: number }
): { scheduledTasks: ScheduledViluumaTask[]; totalProjectDays: number } {
  const weeklyBudget = intel.hoursPerWeek ?? 20;
  const workdaysPerWeek = 5;
  const dailyBudgetHours = Math.max(1, weeklyBudget / workdaysPerWeek);
  const MAX_TASKS_PER_DAY = 5; // Anti-bombardment guardrail

  console.log(`🧠 Station 4: NEW Hour-Aware Calculator with daily budget of ${dailyBudgetHours.toFixed(1)} hours and max ${MAX_TASKS_PER_DAY} tasks per day.`);

  const scheduledTasks: ScheduledViluumaTask[] = [];
  let currentDayOffset = 0;
  let hoursSpentToday = 0;
  let tasksScheduledToday = 0;

  for (const task of tasks) {
    const taskDuration = task.duration_hours;

    // CHECK 1: Can this task fit in today's budget (both hours and task limit)?
    if (
      (hoursSpentToday + taskDuration) <= dailyBudgetHours &&
      tasksScheduledToday < MAX_TASKS_PER_DAY
    ) {
      // YES! It fits and we haven't hit our task limit.
      scheduledTasks.push({
        ...task,
        start_day_offset: currentDayOffset,
        end_day_offset: currentDayOffset, // Same-day task
      });
      
      // Update the budget and task count for today
      hoursSpentToday += taskDuration;
      tasksScheduledToday++;

    } else {
      // NO! Either we're out of hours OR we've hit our task limit for today.
      // Move to the next day.
      currentDayOffset++;
      hoursSpentToday = 0;
      tasksScheduledToday = 0;
      
      // CHECK 2: Can this task be completed in a single (new) day?
      if (taskDuration <= dailyBudgetHours) {
        // YES! Schedule it for this new day.
        scheduledTasks.push({
          ...task,
          start_day_offset: currentDayOffset,
          end_day_offset: currentDayOffset,
        });
        hoursSpentToday = taskDuration;
        tasksScheduledToday = 1;
        
      } else {
        // NO! This is a "mega-task" that takes multiple days itself.
        const daysForMegaTask = Math.ceil(taskDuration / dailyBudgetHours);
        const startDayForMegaTask = currentDayOffset;
        const endDayForMegaTask = currentDayOffset + daysForMegaTask - 1;

        scheduledTasks.push({
          ...task,
          start_day_offset: startDayForMegaTask,
          end_day_offset: endDayForMegaTask,
        });

        // The task ends on a future day, possibly using only a portion of the last day's budget.
        currentDayOffset = endDayForMegaTask;
        const hoursOnLastDay = taskDuration % dailyBudgetHours;
        hoursSpentToday = (hoursOnLastDay === 0) ? dailyBudgetHours : hoursOnLastDay;
        tasksScheduledToday = 1; // The mega-task counts as 1 task on the final day
      }
    }
  }

  const totalProjectDays = scheduledTasks.length > 0
    ? scheduledTasks[scheduledTasks.length - 1].end_day_offset + 1
    : 0;

  console.log(`✅ Station 4: Hour-Aware schedule calculated. Total project days: ${totalProjectDays}.`);
  console.log(`📊 Station 4: Scheduled ${scheduledTasks.length} tasks across ${totalProjectDays} days with intelligent packing.`);

  return { scheduledTasks, totalProjectDays };
}

// ========================================
// 🔍 STATION 5: THE TIMEZONE-AWARE ANALYST
// ========================================
type PlanStatus = 'success' | 'over_scoped' | 'under_scoped' | 'low_quality' | 'success_checklist';

function analyzePlanQuality(
  totalProjectDays: number,
  totalTaskCount: number,
  modality: 'project' | 'checklist',
  deadline?: string,
  userTimezone?: string
): { status: PlanStatus; message?: string; calculatedEndDate?: string } {
  console.log("🔍 Station 5: Starting timezone-aware plan quality analysis");

  // Low quality check for checklists
  if (modality === 'checklist') {
    if (totalTaskCount < 3) {
      console.warn(`⚠️ Station 5: Checklist has only ${totalTaskCount} tasks. Flagging as low_quality.`);
      return { status: 'low_quality', message: 'This checklist seems a bit too simple. Consider adding more detailed steps.' };
    }
    console.log("📋 Checklist detected - passing quality check");
    return { status: 'success_checklist' };
  }

  // Use user's timezone for all date calculations
  const timezone = userTimezone || 'UTC';
  console.log(`🌍 Station 5: Using timezone: ${timezone}`);
  
  // Get today in user's timezone
  const now = new Date();
  const todayInUsersTimezone = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
  
  // Convert relative project days to actual business days for analysis
  const totalWorkdays = totalProjectDays > 0 
    ? differenceInBusinessDays(addBusinessDays(todayInUsersTimezone, totalProjectDays - 1), todayInUsersTimezone) + 1
    : 0;

  // Low quality gatekeeper for projects - but be more lenient now with hour-aware scheduling
  const MIN_WORKDAYS = 1; // Reduced from 3 since we now pack tasks efficiently
  if (totalWorkdays < MIN_WORKDAYS) {
    console.warn(`⚠️ Station 5: Project plan has only ${totalWorkdays} workdays. Flagging as low_quality.`);
    return { status: 'low_quality', message: 'Hmm, that plan seems a bit too simple for a project like this.' };
  }

  // Date-based analysis for projects
  if (!deadline) {
    console.log('✅ Station 5: Project plan has no deadline to check against. Passing as success.');
    return { status: 'success' };
  }

  const deadlineDate = new Date(deadline);
  
  if (!isValidDate(deadlineDate)) {
    console.warn('⚠️ Station 5: Invalid deadline provided. Treating as no deadline.');
    return { status: 'success' };
  }

  // Check for past deadlines first - compare with user's timezone
  if (deadlineDate < todayInUsersTimezone) {
    console.warn('⚠️ Station 5: Deadline is in the past (user timezone).');
    return { 
      status: 'over_scoped', 
      message: "Heads up! The deadline you've chosen is in the past. Let's pick a new one or see what's possible." 
    };
  }

  // Calculate workdays available (including the deadline day)
  const workdaysAvailable = differenceInBusinessDays(deadlineDate, todayInUsersTimezone) + 1;
  const calculatedEndDate = addBusinessDays(todayInUsersTimezone, totalWorkdays - 1);
  const calculatedEndDateString = calculatedEndDate.toISOString().split('T')[0];

  console.log(`📊 Station 5: Workdays available: ${workdaysAvailable}, workdays needed: ${totalWorkdays} (timezone: ${timezone})`);

  // Only mark as over-scoped if plan truly exceeds available time
  if (totalWorkdays > workdaysAvailable) {
    console.log(`⚠️ Station 5: Over-scoped. Plan needs ${totalWorkdays} workdays, but only ${workdaysAvailable} are available.`);
    return {
      status: 'over_scoped',
      message: `Heads up! This plan is ambitious and needs about ${totalWorkdays} workdays, which goes past your deadline.`,
      calculatedEndDate: calculatedEndDateString,
    };
  }

  const UNDER_SCOPED_THRESHOLD_DAYS = 14;
  if (workdaysAvailable - totalWorkdays > UNDER_SCOPED_THRESHOLD_DAYS) {
    console.log(`📈 Station 5: Under-scoped. Plan finishes ${workdaysAvailable - totalWorkdays} workdays early.`);
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

function isValidDate(date: Date): boolean {
  return !isNaN(date.getTime());
}

// ========================================
// 📋 STATION 6: THE REPORTER
// ========================================
function createFinalBlueprint(
  analysis: { status: PlanStatus; message?: string; calculatedEndDate?: string },
  planData: { milestones: CleanMilestone[]; scheduledTasks: ScheduledViluumaTask[]; totalWorkdays: number },
  constraints: { hoursPerWeek: number }
) {
  console.log("📋 Station 6: Assembling final blueprint");

  // Map milestones to the expected format
  const finalMilestones = planData.milestones.map(m => ({
    title: m.title,
    order_index: m.order_index
  }));

  // Map tasks to the expected format with milestone linking
  const finalTasks = planData.scheduledTasks.map((task) => {
    // Find milestone by its unique ID for bulletproof linking
    const milestone = planData.milestones.find(m => m.id === task.milestone_id) || planData.milestones[0];
    
    return {
      id: task.id,
      title: task.name,
      description: task.description,
      milestone_index: milestone?.order_index ?? 0,
      duration_hours: task.duration_hours,
      priority: task.priority,
      start_day_offset: task.start_day_offset,
      end_day_offset: task.end_day_offset
    };
  });

  const dailyBudget = constraints.hoursPerWeek / 5;

  return {
    status: analysis.status,
    message: analysis.message || 'Plan ready!',
    calculatedEndDate: analysis.calculatedEndDate,
    plan: {
      milestones: finalMilestones,
      scheduledTasks: finalTasks,
      hoursPerWeek: constraints.hoursPerWeek,
      dailyBudget: dailyBudget
    }
  };
}

// ========================================
// 🚀 MAIN SERVE FUNCTION
// ========================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Generate Plan Conductor: Starting plan generation");
    
    // ========================================
    // 1. INPUT & VALIDATION
    // ========================================
    const { intel, userConstraints = {}, userTimezone } = await req.json();
    
    // Validate required intel
    if (!intel?.title || typeof intel.title !== "string" || intel.title.trim().length === 0) {
      throw new Error("MISSING_TITLE");
    }
    if (!intel.modality || !["project", "checklist"].includes(intel.modality)) {
      throw new Error("INVALID_MODALITY");
    }

    // Normalize constraints and timezone
    const hoursPerWeek = Math.min(80, Math.max(1, Number(userConstraints.hoursPerWeek ?? 20)));
    const timezone = userTimezone || 'UTC';
    console.log(`📊 Input validated: "${intel.title}" (${intel.modality}), ${hoursPerWeek}h/week, timezone: ${timezone}`);

    // ========================================
    // 2. STATION 1: THE PROMPTER
    // ========================================
    const prompt = constructAIPrompt({
      title: intel.title,
      modality: intel.modality,
      context: intel.context,
      level_of_detail: intel.levelOfDetail,
      compression_requested: intel.compression_requested,
      expansion_requested: intel.expansion_requested
    });
    console.log("✅ Station 1: Prompt constructed");

    // ========================================
    // 3. STATION 2: THE CREATIVE AI
    // ========================================
    const rawAIResponse = await fetchAIBlueprint(prompt);
    console.log("✅ Station 2: AI blueprint received");

    // ========================================
    // 4. STATION 3: THE SANITIZER & ENRICHER
    // ========================================
    const { tasks: enrichedTasks, milestones: cleanMilestones } = processAIBlueprint(rawAIResponse);
    console.log("✅ Station 3: Tasks and milestones sanitized and enriched");

    // ========================================
    // 5. STATION 4: THE CALCULATOR
    // ========================================
    const { scheduledTasks, totalProjectDays } = calculateRelativeSchedule(enrichedTasks, { hoursPerWeek });
    console.log("✅ Station 4: Schedule calculated");

    // ========================================
    // 6. STATION 5: THE ANALYST
    // ========================================
    const analysis = analyzePlanQuality(totalProjectDays, enrichedTasks.length, intel.modality, userConstraints.deadline, timezone);
    console.log("✅ Station 5: Plan quality analyzed");

    // ========================================
    // 7. STATION 6: THE REPORTER
    // ========================================
    const blueprint = createFinalBlueprint(
      analysis,
      { milestones: cleanMilestones, scheduledTasks, totalWorkdays: totalProjectDays },
      { hoursPerWeek }
    );
    console.log(`✅ Station 6: Final blueprint assembled with status '${blueprint.status}'`);

    console.log(`🎉 Generate Plan Conductor: SUCCESS. Shipping blueprint.`);
    return new Response(JSON.stringify(blueprint), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("❌ Generate Plan Conductor: FATAL ERROR", error);
    
    // Map known errors to user-friendly messages
    const errorMap: Record<string, string> = {
      MISSING_TITLE: "Please provide a goal title.",
      INVALID_MODALITY: "Invalid plan type. Choose 'project' or 'checklist'.",
      AI_TIMEOUT: "The AI took too long to respond. Please try again.",
      AI_INVALID_JSON: "The AI response was malformed. Please try again.",
      AI_INVALID_STRUCTURE: "The AI response had an invalid structure. Please try again.",
      AI_NO_VALID_TASKS_PROCESSED: "No valid tasks could be extracted from the AI response. Please try again.",
      AI_EMPTY_RESPONSE: "The AI returned an empty response. Please try again.",
      AI_API_ERROR: "The AI service is currently unavailable. Please try again later.",
      SERVER_ERROR: "A server configuration error occurred. Please contact support."
    };

    const userMessage = errorMap[error.message] || "An unexpected error occurred. Please try again.";
    
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        message: userMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
