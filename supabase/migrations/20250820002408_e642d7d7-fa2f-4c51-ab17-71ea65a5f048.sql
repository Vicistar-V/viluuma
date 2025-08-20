-- Create blazing fast goal completion function
CREATE OR REPLACE FUNCTION public.complete_all_goal_tasks(p_goal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_updated_count INTEGER;
  v_total_tasks INTEGER;
BEGIN
  -- Ensure user is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Ensure the goal belongs to the current user
  IF NOT public.goal_belongs_to_current_user(p_goal_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Get total task count for this goal
  SELECT COUNT(*) INTO v_total_tasks
  FROM public.tasks
  WHERE goal_id = p_goal_id;

  -- Complete all pending tasks in the goal in a single batch operation
  UPDATE public.tasks
  SET status = 'completed', updated_at = now()
  WHERE goal_id = p_goal_id 
    AND status = 'pending';
  
  -- Get the number of tasks that were actually updated
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Return completion stats
  RETURN jsonb_build_object(
    'goal_id', p_goal_id,
    'tasks_completed', v_updated_count,
    'total_tasks', v_total_tasks,
    'completed_at', now()
  );
END;
$function$;