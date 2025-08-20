-- Create helper functions to check goal status
CREATE OR REPLACE FUNCTION public.goal_is_active(p_goal_id UUID)
RETURNS BOOLEAN 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path TO 'public'
AS $$
  SELECT archive_status = 'active' FROM public.goals WHERE id = p_goal_id;
$$;

CREATE OR REPLACE FUNCTION public.task_goal_is_active(p_task_id UUID)
RETURNS BOOLEAN 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path TO 'public'
AS $$
  SELECT g.archive_status = 'active' 
  FROM public.tasks t 
  JOIN public.goals g ON t.goal_id = g.id 
  WHERE t.id = p_task_id;
$$;

CREATE OR REPLACE FUNCTION public.milestone_goal_is_active(p_milestone_id UUID)
RETURNS BOOLEAN 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path TO 'public'
AS $$
  SELECT g.archive_status = 'active' 
  FROM public.milestones m 
  JOIN public.goals g ON m.goal_id = g.id 
  WHERE m.id = p_milestone_id;
$$;

-- Update task RPC functions to check for active goals
CREATE OR REPLACE FUNCTION public.complete_task(p_task_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Ensure the task belongs to the current user
  IF NOT public.task_belongs_to_current_user(p_task_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Check if goal is active
  IF NOT public.task_goal_is_active(p_task_id) THEN
    RAISE EXCEPTION 'goal_is_archived';
  END IF;

  -- Update task status to completed
  UPDATE public.tasks
  SET status = 'completed', updated_at = now()
  WHERE id = p_task_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.uncomplete_task(p_task_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Ensure the task belongs to the current user
  IF NOT public.task_belongs_to_current_user(p_task_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Check if goal is active
  IF NOT public.task_goal_is_active(p_task_id) THEN
    RAISE EXCEPTION 'goal_is_archived';
  END IF;

  -- Update task status to pending
  UPDATE public.tasks
  SET status = 'pending', updated_at = now()
  WHERE id = p_task_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_task_status(p_task_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_status text;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Ensure the task belongs to the current user
  IF NOT public.task_belongs_to_current_user(p_task_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Check if goal is active
  IF NOT public.task_goal_is_active(p_task_id) THEN
    RAISE EXCEPTION 'goal_is_archived';
  END IF;

  -- Get current status
  SELECT status INTO current_status FROM public.tasks WHERE id = p_task_id;
  
  -- Toggle status
  UPDATE public.tasks
  SET 
    status = CASE 
      WHEN current_status = 'pending' THEN 'completed'
      ELSE 'pending'
    END,
    updated_at = now()
  WHERE id = p_task_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_task_details(p_task_id uuid, p_title text, p_description text DEFAULT NULL::text, p_priority text DEFAULT NULL::text, p_duration_hours integer DEFAULT NULL::integer, p_is_anchored boolean DEFAULT false, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Ensure the task belongs to the current user
  IF NOT public.task_belongs_to_current_user(p_task_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Check if goal is active
  IF NOT public.task_goal_is_active(p_task_id) THEN
    RAISE EXCEPTION 'goal_is_archived';
  END IF;

  -- Validate priority if provided
  IF p_priority IS NOT NULL AND p_priority NOT IN ('low', 'medium', 'high') THEN
    RAISE EXCEPTION 'invalid_priority';
  END IF;

  -- Update task details
  UPDATE public.tasks
  SET 
    title = p_title,
    description = p_description,
    priority = p_priority,
    duration_hours = p_duration_hours,
    is_anchored = p_is_anchored,
    start_date = p_start_date,
    end_date = p_end_date,
    updated_at = now()
  WHERE id = p_task_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_task(p_milestone_id uuid, p_title text, p_description text DEFAULT NULL::text, p_priority text DEFAULT NULL::text, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_duration_hours integer DEFAULT NULL::integer, p_is_anchored boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid; v_goal uuid; v_user uuid; BEGIN
  SELECT goal_id INTO v_goal FROM public.milestones WHERE id = p_milestone_id;
  IF v_goal IS NULL OR NOT public.goal_belongs_to_current_user(v_goal) THEN 
    RAISE EXCEPTION 'forbidden'; 
  END IF;

  -- Check if goal is active
  IF NOT public.milestone_goal_is_active(p_milestone_id) THEN
    RAISE EXCEPTION 'goal_is_archived';
  END IF;

  SELECT user_id INTO v_user FROM public.goals WHERE id = v_goal;
  INSERT INTO public.tasks (goal_id, milestone_id, user_id, title, description, priority, start_date, end_date, duration_hours, is_anchored)
  VALUES (v_goal, p_milestone_id, v_user, p_title, p_description, p_priority, p_start_date, p_end_date, p_duration_hours, COALESCE(p_is_anchored,false))
  RETURNING id INTO v_id; 
  RETURN v_id; 
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_task(p_task_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.task_belongs_to_current_user(p_task_id) THEN 
    RAISE EXCEPTION 'forbidden'; 
  END IF;

  -- Check if goal is active
  IF NOT public.task_goal_is_active(p_task_id) THEN
    RAISE EXCEPTION 'goal_is_archived';
  END IF;

  DELETE FROM public.tasks WHERE id = p_task_id; 
END;
$function$;

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

  -- Check if goal is active
  IF NOT public.goal_is_active(p_goal_id) THEN
    RAISE EXCEPTION 'goal_is_archived';
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

-- Update milestone RPC functions to check for active goals
CREATE OR REPLACE FUNCTION public.create_milestone(p_goal_id uuid, p_title text, p_order_index integer DEFAULT NULL::integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid; 
BEGIN
  IF NOT public.goal_belongs_to_current_user(p_goal_id) THEN 
    RAISE EXCEPTION 'forbidden'; 
  END IF;

  -- Check if goal is active
  IF NOT public.goal_is_active(p_goal_id) THEN
    RAISE EXCEPTION 'goal_is_archived';
  END IF;

  INSERT INTO public.milestones(goal_id, title, order_index) 
  VALUES (p_goal_id, p_title, p_order_index) 
  RETURNING id INTO v_id; 
  RETURN v_id; 
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_milestone_title(p_milestone_id uuid, p_title text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.milestone_belongs_to_current_user(p_milestone_id) THEN 
    RAISE EXCEPTION 'forbidden'; 
  END IF;

  -- Check if goal is active
  IF NOT public.milestone_goal_is_active(p_milestone_id) THEN
    RAISE EXCEPTION 'goal_is_archived';
  END IF;

  UPDATE public.milestones SET title = p_title WHERE id = p_milestone_id; 
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_milestone_and_tasks(p_milestone_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_count integer; 
BEGIN
  IF NOT public.milestone_belongs_to_current_user(p_milestone_id) THEN 
    RAISE EXCEPTION 'forbidden'; 
  END IF;

  -- Check if goal is active
  IF NOT public.milestone_goal_is_active(p_milestone_id) THEN
    RAISE EXCEPTION 'goal_is_archived';
  END IF;

  DELETE FROM public.tasks WHERE milestone_id = p_milestone_id;
  DELETE FROM public.milestones WHERE id = p_milestone_id RETURNING 1 INTO v_count; 
  RETURN COALESCE(v_count, 0); 
END;
$function$;