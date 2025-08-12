import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RescheduleRequest {
  taskId: string;
  newStartDate: string;
}

interface Task {
  id: string;
  goal_id: string;
  milestone_id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  duration_hours: number | null;
  is_anchored: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { taskId, newStartDate }: RescheduleRequest = await req.json();

    console.log(`Processing reschedule request for task ${taskId} to ${newStartDate}`);

    // Get the task being moved
    const { data: targetTask, error: taskError } = await supabaseClient
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle();

    if (taskError || !targetTask) {
      throw new Error(`Task not found: ${taskError?.message || 'Unknown error'}`);
    }

    // Get all tasks for this goal
    const { data: allTasks, error: allTasksError } = await supabaseClient
      .from('tasks')
      .select('*')
      .eq('goal_id', targetTask.goal_id)
      .order('start_date', { ascending: true, nullsFirst: false });

    if (allTasksError) {
      throw new Error(`Failed to fetch goal tasks: ${allTasksError.message}`);
    }

    const tasks = allTasks as Task[];
    
    // Calculate the time shift
    const oldStartDate = new Date(targetTask.start_date || targetTask.created_at);
    const newStart = new Date(newStartDate);
    const timeShiftInDays = Math.floor((newStart.getTime() - oldStartDate.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`Time shift: ${timeShiftInDays} days`);

    // Find tasks that need to be moved (the "Tidal Wave")
    const originalStartDate = targetTask.start_date || targetTask.created_at;
    const tasksToMove = tasks.filter(task => {
      const taskStartDate = task.start_date || task.created_at;
      return taskStartDate >= originalStartDate && task.id !== taskId;
    });

    console.log(`Found ${tasksToMove.length} tasks in the tidal wave`);

    // Find the first anchored task that acts as a "wall"
    const anchoredWall = tasksToMove.find(task => task.is_anchored);
    console.log(`Anchored wall found: ${anchoredWall ? anchoredWall.id : 'none'}`);

    // Filter tasks to move only those before the wall
    const safeTasksToMove = anchoredWall ? 
      tasksToMove.filter(task => {
        const taskStart = new Date(task.start_date || task.created_at);
        const wallStart = new Date(anchoredWall.start_date || anchoredWall.created_at);
        return taskStart < wallStart;
      }) : tasksToMove;

    console.log(`Safe tasks to move: ${safeTasksToMove.length}`);

    // Calculate new dates for all affected tasks
    const updatedTasks = [];

    // Update the target task
    const targetTaskDuration = targetTask.duration_hours || 1;
    const targetEndDate = new Date(newStart);
    targetEndDate.setDate(targetEndDate.getDate() + Math.ceil(targetTaskDuration / 8)); // Assuming 8 hours per day

    updatedTasks.push({
      taskId: targetTask.id,
      newStartDate: newStartDate,
      newEndDate: targetEndDate.toISOString().split('T')[0]
    });

    // Update tasks in the tidal wave
    for (const task of safeTasksToMove) {
      const currentStart = new Date(task.start_date || task.created_at);
      const newTaskStart = new Date(currentStart);
      newTaskStart.setDate(newTaskStart.getDate() + timeShiftInDays);

      let newTaskEnd = null;
      if (task.end_date) {
        const currentEnd = new Date(task.end_date);
        const newEnd = new Date(currentEnd);
        newEnd.setDate(newEnd.getDate() + timeShiftInDays);
        newTaskEnd = newEnd.toISOString().split('T')[0];
      } else if (task.duration_hours) {
        const endDate = new Date(newTaskStart);
        endDate.setDate(endDate.getDate() + Math.ceil(task.duration_hours / 8));
        newTaskEnd = endDate.toISOString().split('T')[0];
      }

      updatedTasks.push({
        taskId: task.id,
        newStartDate: newTaskStart.toISOString().split('T')[0],
        newEndDate: newTaskEnd
      });
    }

    // Check for conflicts with anchored tasks
    let conflictDetected = false;
    let compressionNeeded = 0;

    if (anchoredWall && updatedTasks.length > 0) {
      const lastMovedTask = updatedTasks[updatedTasks.length - 1];
      const lastTaskEnd = new Date(lastMovedTask.newEndDate || lastMovedTask.newStartDate);
      const wallStart = new Date(anchoredWall.start_date || anchoredWall.created_at);
      
      if (lastTaskEnd >= wallStart) {
        conflictDetected = true;
        compressionNeeded = Math.ceil((lastTaskEnd.getTime() - wallStart.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`Conflict detected: ${compressionNeeded} days of compression needed`);
      }
    }

    const response = {
      status: conflictDetected ? 'reschedule_conflict' : 'success',
      updatedTasks,
      timeShiftInDays,
      conflictInfo: conflictDetected ? {
        compressionNeeded,
        anchoredTaskId: anchoredWall?.id,
        anchoredTaskTitle: anchoredWall?.title
      } : null,
      message: conflictDetected ? 
        `Rescheduling would cause a ${compressionNeeded}-day overlap with anchored task "${anchoredWall?.title}"` :
        `Successfully calculated reschedule for ${updatedTasks.length} tasks`
    };

    console.log('Reschedule calculation completed:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in reschedule-task function:', error);
    return new Response(JSON.stringify({ 
      status: 'error',
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});