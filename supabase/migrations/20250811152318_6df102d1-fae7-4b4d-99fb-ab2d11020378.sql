-- Fix the missing trigger for automatic progress updates
-- This trigger ensures that when tasks change status, milestone and goal progress is automatically updated

CREATE OR REPLACE FUNCTION public.update_parent_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_goal_id UUID;
  v_milestone_id UUID;
  v_total_m_tasks INTEGER;
  v_completed_m_tasks INTEGER;
  v_total_g_tasks INTEGER;
  v_completed_g_tasks INTEGER;
  v_goal_status TEXT;
BEGIN
  -- Get the goal_id and milestone_id from the affected task
  IF TG_OP = 'DELETE' THEN
    v_goal_id := OLD.goal_id;
    v_milestone_id := OLD.milestone_id;
  ELSE
    v_goal_id := NEW.goal_id;
    v_milestone_id := NEW.milestone_id;
  END IF;

  -- Update milestone progress
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_total_m_tasks, v_completed_m_tasks
  FROM public.tasks
  WHERE milestone_id = v_milestone_id;

  UPDATE public.milestones
  SET 
    total_tasks = COALESCE(v_total_m_tasks, 0),
    completed_tasks = COALESCE(v_completed_m_tasks, 0),
    status = CASE 
      WHEN COALESCE(v_total_m_tasks, 0) > 0 AND COALESCE(v_total_m_tasks, 0) = COALESCE(v_completed_m_tasks, 0) THEN 'completed'
      ELSE 'pending'
    END,
    updated_at = now()
  WHERE id = v_milestone_id;

  -- Update goal progress
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_total_g_tasks, v_completed_g_tasks
  FROM public.tasks
  WHERE goal_id = v_goal_id;

  -- Get current goal status
  SELECT status INTO v_goal_status FROM public.goals WHERE id = v_goal_id;

  UPDATE public.goals
  SET 
    total_tasks = COALESCE(v_total_g_tasks, 0),
    completed_tasks = COALESCE(v_completed_g_tasks, 0),
    status = CASE 
      WHEN v_goal_status = 'archived' THEN 'archived'
      WHEN COALESCE(v_total_g_tasks, 0) > 0 AND COALESCE(v_total_g_tasks, 0) = COALESCE(v_completed_g_tasks, 0) THEN 'completed'
      ELSE 'active'
    END,
    completed_at = CASE 
      WHEN v_goal_status <> 'archived' AND COALESCE(v_total_g_tasks, 0) > 0 AND COALESCE(v_total_g_tasks, 0) = COALESCE(v_completed_g_tasks, 0) THEN now()
      ELSE NULL
    END,
    updated_at = now()
  WHERE id = v_goal_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger that fires on task changes
DROP TRIGGER IF EXISTS on_task_change ON public.tasks;
CREATE TRIGGER on_task_change
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_parent_progress();