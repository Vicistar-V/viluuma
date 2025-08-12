-- Update get_today_page_payload to implement "Pristine Today" model
-- Today list now only contains tasks truly scheduled for today
CREATE OR REPLACE FUNCTION public.get_today_page_payload()
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
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  -- Ensure user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- 1. Get CORRECT overdue count (tasks whose deadlines have actually passed)
  SELECT COUNT(*)::INT INTO v_overdue_count
  FROM public.tasks
  WHERE user_id = v_user_id 
    AND status = 'pending' 
    AND end_date < CURRENT_DATE;

  -- 2. Get ONLY tasks that are truly scheduled for today (PRISTINE TODAY MODEL)
  -- These are tasks that are due to finish today OR currently in progress OR starting today
  FOR v_task IN
    SELECT 
      t.id, t.goal_id, t.title, t.description, t.status, 
      t.start_date, t.end_date, t.priority, t.is_anchored,
      g.title as goal_title,
      CASE 
        WHEN t.end_date = CURRENT_DATE THEN 'due_today'
        WHEN t.start_date <= CURRENT_DATE AND t.end_date > CURRENT_DATE THEN 'in_progress'
        WHEN t.start_date = CURRENT_DATE THEN 'starting_today'
        ELSE 'scheduled'
      END::text as task_type,
      CASE 
        WHEN t.end_date = CURRENT_DATE THEN 'due_today'
        WHEN t.start_date <= CURRENT_DATE AND t.end_date > CURRENT_DATE THEN 'in_progress'
        WHEN t.start_date = CURRENT_DATE THEN 'starting_today'
        ELSE 'scheduled'
      END::text as display_status
    FROM public.tasks t 
    JOIN public.goals g ON t.goal_id = g.id
    WHERE t.user_id = v_user_id 
      AND t.status = 'pending' 
      AND (
        t.end_date = CURRENT_DATE OR  -- Due today
        t.start_date = CURRENT_DATE OR  -- Starting today
        (t.start_date <= CURRENT_DATE AND t.end_date > CURRENT_DATE)  -- In progress
      )
    ORDER BY 
      CASE 
        WHEN t.end_date = CURRENT_DATE THEN 1  -- Due today gets highest priority
        WHEN t.start_date = CURRENT_DATE THEN 2  -- Starting today is second
        ELSE 3  -- In progress is third
      END,
      priority_order(t.priority) ASC, 
      t.created_at ASC
    LIMIT v_task_limit
  LOOP
    v_tasks_array := array_append(v_tasks_array, row_to_json(v_task)::jsonb);
  END LOOP;

  -- 3. Add one checklist task (if we have room and no overdue tasks)
  -- Only add checklist tasks when the user is caught up
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

  -- 4. Return the pristine payload
  RETURN jsonb_build_object(
    'todayTasks', array_to_json(v_tasks_array)::jsonb,
    'overdueCount', v_overdue_count
  );
END;
$function$;