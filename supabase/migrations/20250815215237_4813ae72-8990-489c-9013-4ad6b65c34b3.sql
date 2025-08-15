-- Fix security warning: Update functions to have proper search_path
CREATE OR REPLACE FUNCTION public.update_parent_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_goal_id UUID;
  v_milestone_id UUID;
  v_total_m_tasks INTEGER;
  v_completed_m_tasks INTEGER;
  v_total_g_tasks INTEGER;
  v_completed_g_tasks INTEGER;
BEGIN
  -- Get the goal_id and milestone_id from the affected task
  IF TG_OP = 'DELETE' THEN
    v_goal_id := OLD.goal_id;
    v_milestone_id := OLD.milestone_id;
  ELSE
    v_goal_id := NEW.goal_id;
    v_milestone_id := NEW.milestone_id;
  END IF;

  -- Update milestone progress (counters only)
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_total_m_tasks, v_completed_m_tasks
  FROM public.tasks
  WHERE milestone_id = v_milestone_id;

  UPDATE public.milestones
  SET 
    total_tasks = COALESCE(v_total_m_tasks, 0),
    completed_tasks = COALESCE(v_completed_m_tasks, 0),
    updated_at = now()
  WHERE id = v_milestone_id;

  -- Update goal progress (counters only)
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_total_g_tasks, v_completed_g_tasks
  FROM public.tasks
  WHERE goal_id = v_goal_id;

  UPDATE public.goals
  SET 
    total_tasks = COALESCE(v_total_g_tasks, 0),
    completed_tasks = COALESCE(v_completed_g_tasks, 0),
    completed_at = CASE 
      WHEN COALESCE(v_total_g_tasks, 0) > 0 AND COALESCE(v_total_g_tasks, 0) = COALESCE(v_completed_g_tasks, 0) THEN now()
      ELSE NULL
    END,
    updated_at = now()
  WHERE id = v_goal_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;