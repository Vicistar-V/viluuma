import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteRequest {
  taskIdToDelete: string;
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
  created_at: string;
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

    const { taskIdToDelete }: DeleteRequest = await req.json();

    console.log(`Processing deletion and refactor for task ${taskIdToDelete}`);

    // Get the task to be deleted
    const { data: taskToDelete, error: taskError } = await supabaseClient
      .from('tasks')
      .select('*')
      .eq('id', taskIdToDelete)
      .maybeSingle();

    if (taskError || !taskToDelete) {
      throw new Error(`Task not found: ${taskError?.message || 'Unknown error'}`);
    }

    // Get all tasks for this goal
    const { data: allTasks, error: allTasksError } = await supabaseClient
      .from('tasks')
      .select('*')
      .eq('goal_id', taskToDelete.goal_id)
      .order('start_date', { ascending: true, nullsFirst: false });

    if (allTasksError) {
      throw new Error(`Failed to fetch goal tasks: ${allTasksError.message}`);
    }

    const tasks = allTasks as Task[];

    // Calculate the time saved by deleting this task
    let timeSavedInDays = 0;
    if (taskToDelete.start_date && taskToDelete.end_date) {
      const startDate = new Date(taskToDelete.start_date);
      const endDate = new Date(taskToDelete.end_date);
      timeSavedInDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    } else if (taskToDelete.duration_hours) {
      timeSavedInDays = Math.ceil(taskToDelete.duration_hours / 8); // Assuming 8 hours per day
    } else {
      timeSavedInDays = 1; // Default to 1 day if no duration info
    }

    console.log(`Task deletion will save ${timeSavedInDays} days`);

    // Find tasks that come after the deleted task (the "Tidal Wave")
    const deletedTaskStart = new Date(taskToDelete.start_date || taskToDelete.created_at);
    const tasksAfterDeleted = tasks.filter(task => {
      if (task.id === taskIdToDelete) return false; // Exclude the task being deleted
      const taskStart = new Date(task.start_date || task.created_at);
      return taskStart > deletedTaskStart;
    });

    console.log(`Found ${tasksAfterDeleted.length} tasks after the deleted task`);

    // Find any anchored tasks that would act as barriers
    const anchoredTasks = tasksAfterDeleted.filter(task => task.is_anchored);
    console.log(`Found ${anchoredTasks.length} anchored tasks that will act as barriers`);

    // Calculate new dates for affected tasks
    const updatedTasks = [];

    for (const task of tasksAfterDeleted) {
      // If this task is anchored, don't move it
      if (task.is_anchored) {
        console.log(`Skipping anchored task: ${task.title}`);
        continue;
      }

      // Check if there's an anchored task before this one that would block the move
      const anchoredBarrier = anchoredTasks.find(anchoredTask => {
        const anchoredStart = new Date(anchoredTask.start_date || anchoredTask.created_at);
        const currentTaskStart = new Date(task.start_date || task.created_at);
        return anchoredStart < currentTaskStart;
      });

      if (anchoredBarrier) {
        // There's an anchored task between the deleted task and this task
        // Calculate if we can move this task up to the anchored barrier
        const barrierEnd = anchoredBarrier.end_date ? 
          new Date(anchoredBarrier.end_date) : 
          new Date(anchoredBarrier.start_date || anchoredBarrier.created_at);
        
        if (anchoredBarrier.duration_hours) {
          barrierEnd.setDate(barrierEnd.getDate() + Math.ceil(anchoredBarrier.duration_hours / 8));
        }

        const currentTaskStart = new Date(task.start_date || task.created_at);
        const availableSpace = Math.floor((currentTaskStart.getTime() - barrierEnd.getTime()) / (1000 * 60 * 60 * 24));
        
        if (availableSpace > 0) {
          // We can move this task closer to the barrier
          const newStartDate = new Date(barrierEnd);
          newStartDate.setDate(newStartDate.getDate() + 1); // Start the day after the barrier ends
          
          let newEndDate = null;
          if (task.end_date) {
            const originalDuration = Math.floor((new Date(task.end_date).getTime() - new Date(task.start_date || task.created_at).getTime()) / (1000 * 60 * 60 * 24));
            newEndDate = new Date(newStartDate);
            newEndDate.setDate(newEndDate.getDate() + originalDuration);
          } else if (task.duration_hours) {
            newEndDate = new Date(newStartDate);
            newEndDate.setDate(newEndDate.getDate() + Math.ceil(task.duration_hours / 8));
          }

          updatedTasks.push({
            taskId: task.id,
            newStartDate: newStartDate.toISOString().split('T')[0],
            newEndDate: newEndDate ? newEndDate.toISOString().split('T')[0] : null
          });
        }
        continue;
      }

      // No anchored barrier, so we can move this task by the full time saved
      const currentStart = new Date(task.start_date || task.created_at);
      const newTaskStart = new Date(currentStart);
      newTaskStart.setDate(newTaskStart.getDate() - timeSavedInDays);

      let newTaskEnd = null;
      if (task.end_date) {
        const currentEnd = new Date(task.end_date);
        const newEnd = new Date(currentEnd);
        newEnd.setDate(newEnd.getDate() - timeSavedInDays);
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

    // Check for any dependency issues
    const dependencyIssues = [];
    
    // Simple check: see if any tasks would be scheduled before today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const update of updatedTasks) {
      const newStart = new Date(update.newStartDate);
      if (newStart < today) {
        dependencyIssues.push(`Task ${update.taskId} would be scheduled in the past`);
      }
    }

    const response = {
      status: dependencyIssues.length > 0 ? 'dependency_conflict' : 'success',
      taskIdToDelete,
      updatedTasks,
      timeSavedInDays,
      dependencyIssues,
      anchoredBarriers: anchoredTasks.map(task => ({
        id: task.id,
        title: task.title,
        startDate: task.start_date
      })),
      message: dependencyIssues.length > 0 ? 
        `Deletion would cause scheduling conflicts: ${dependencyIssues.join(', ')}` :
        `Successfully calculated deletion impact: ${updatedTasks.length} tasks will be rescheduled, saving ${timeSavedInDays} days`
    };

    console.log('Delete and refactor calculation completed:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in delete-and-refactor-plan function:', error);
    return new Response(JSON.stringify({ 
      status: 'error',
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});