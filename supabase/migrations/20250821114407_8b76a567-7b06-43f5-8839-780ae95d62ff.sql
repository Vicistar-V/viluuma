-- Update get_today_page_payload to accept user timezone parameter
CREATE OR REPLACE FUNCTION public.get_today_page_payload(p_user_timezone TEXT DEFAULT 'UTC')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tasks_array JSONB[] := ARRAY[]::JSONB[];
  v_overdue_count INT;
  v_task RECORD;
  v_task_limit INT := 10;
  v_user_id UUID;
  v_current_date DATE;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  -- Ensure user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Calculate current date in user's timezone
  v_current_date := (now() AT TIME ZONE p_user_timezone)::date;

  -- 1. Get CORRECT overdue count (tasks whose deadlines have actually passed in user's timezone)
  SELECT COUNT(*)::INT INTO v_overdue_count
  FROM public.tasks
  WHERE user_id = v_user_id 
    AND status = 'pending' 
    AND end_date < v_current_date;

  -- 2. Get tasks that are truly scheduled for today in user's timezone
  FOR v_task IN
    SELECT 
      t.id, t.goal_id, t.title, t.description, t.status, 
      t.start_date, t.end_date, t.priority, t.is_anchored,
      g.title as goal_title,
      CASE 
        WHEN t.end_date = v_current_date THEN 'due_today'
        WHEN t.start_date <= v_current_date AND t.end_date > v_current_date THEN 'in_progress'
        WHEN t.start_date = v_current_date THEN 'starting_today'
        ELSE 'scheduled'
      END::text as task_type,
      CASE 
        WHEN t.end_date = v_current_date THEN 'due_today'
        WHEN t.start_date <= v_current_date AND t.end_date > v_current_date THEN 'in_progress'
        WHEN t.start_date = v_current_date THEN 'starting_today'
        ELSE 'scheduled'
      END::text as display_status
    FROM public.tasks t 
    JOIN public.goals g ON t.goal_id = g.id
    WHERE t.user_id = v_user_id 
      AND t.status = 'pending' 
      AND (
        t.end_date = v_current_date OR  -- Due today
        t.start_date = v_current_date OR  -- Starting today
        (t.start_date <= v_current_date AND t.end_date > v_current_date)  -- In progress
      )
    ORDER BY 
      CASE 
        WHEN t.end_date = v_current_date THEN 1  -- Due today gets highest priority
        WHEN t.start_date = v_current_date THEN 2  -- Starting today is second
        ELSE 3  -- In progress is third
      END,
      priority_order(t.priority) ASC, 
      t.created_at ASC
    LIMIT v_task_limit
  LOOP
    v_tasks_array := array_append(v_tasks_array, row_to_json(v_task)::jsonb);
  END LOOP;

  -- 3. Add one checklist task (if we have room and no overdue tasks)
  IF array_length(v_tasks_array, 1) < v_task_limit AND v_overdue_count = 0 THEN
    FOR v_task IN
      SELECT 
        t.id, t.goal_id, t.title, t.description, t.status,
        t.start_date, t.end_date, t.priority, t.is_anchored,
        g.title as goal_title,
        'checklist'::text as task_type,
        'checklist'::text as display_status
      FROM public.tasks t 
      JOIN public.goals g ON t.goal_id = g.id
      WHERE t.user_id = v_user_id 
        AND g.modality = 'checklist' 
        AND t.status = 'pending'
      ORDER BY priority_order(t.priority) ASC, t.created_at ASC
      LIMIT 1
    LOOP
      v_tasks_array := array_append(v_tasks_array, row_to_json(v_task)::jsonb);
    END LOOP;
  END IF;

  -- 4. Return the timezone-aware payload
  RETURN jsonb_build_object(
    'todayTasks', array_to_json(v_tasks_array)::jsonb,
    'overdueCount', v_overdue_count
  );
END;
$function$;

-- Update get_all_overdue_tasks to accept user timezone parameter
CREATE OR REPLACE FUNCTION public.get_all_overdue_tasks(p_user_timezone TEXT DEFAULT 'UTC')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tasks_array JSONB[] := ARRAY[]::JSONB[];
  v_task RECORD;
  v_user_id UUID;
  v_current_date DATE;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  -- Ensure user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Calculate current date in user's timezone
  v_current_date := (now() AT TIME ZONE p_user_timezone)::date;

  -- Get ACTUALLY overdue tasks (deadline has passed in user's timezone)
  FOR v_task IN
    SELECT 
      t.id, t.goal_id, t.title, t.description, t.status,
      t.start_date, t.end_date, t.priority, t.is_anchored,
      g.title as goal_title,
      'overdue'::text as task_type,
      'overdue'::text as display_status
    FROM public.tasks t 
    JOIN public.goals g ON t.goal_id = g.id
    WHERE t.user_id = v_user_id 
      AND t.status = 'pending' 
      AND t.end_date < v_current_date  -- Deadline has actually passed in user's timezone
    ORDER BY priority_order(t.priority) ASC, t.end_date DESC  -- Most recent deadlines first
  LOOP
    v_tasks_array := array_append(v_tasks_array, row_to_json(v_task)::jsonb);
  END LOOP;

  -- Return the array
  RETURN array_to_json(v_tasks_array)::jsonb;
END;
$function$;