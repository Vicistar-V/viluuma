-- Fix the overdue logic to be empathetic and supportive
-- A task is ONLY overdue when its end_date has passed, not when work should have started

CREATE OR REPLACE FUNCTION public.get_today_page_payload()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tasks_array JSONB[] := ARRAY[]::JSONB[];
  v_overdue_count INT;
  v_task RECORD;
  v_task_limit INT := 7;
  v_overdue_limit INT := 2;
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
    AND end_date < CURRENT_DATE;  -- FIXED: Use end_date, not start_date

  -- 2. Get scheduled tasks for today (highest priority)
  -- These are tasks that are due to finish today OR currently in progress
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
  LOOP
    EXIT WHEN array_length(v_tasks_array, 1) >= v_task_limit;
    v_tasks_array := array_append(v_tasks_array, row_to_json(v_task)::jsonb);
  END LOOP;

  -- 3. Add ACTUALLY overdue tasks (deadline has passed)
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
      AND t.end_date < CURRENT_DATE  -- FIXED: Deadline has actually passed
    ORDER BY priority_order(t.priority) ASC, t.end_date DESC  -- Most recent deadlines first
    LIMIT v_overdue_limit
  LOOP
    EXIT WHEN array_length(v_tasks_array, 1) >= v_task_limit;
    -- Check for duplicates
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(array_to_json(v_tasks_array)::jsonb) elem 
      WHERE (elem->>'id')::uuid = v_task.id
    ) THEN
      v_tasks_array := array_append(v_tasks_array, row_to_json(v_task)::jsonb);
    END IF;
  END LOOP;

  -- 4. Add one checklist task (if we have room)
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
    EXIT WHEN array_length(v_tasks_array, 1) >= v_task_limit;
    -- Check for duplicates
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(array_to_json(v_tasks_array)::jsonb) elem 
      WHERE (elem->>'id')::uuid = v_task.id
    ) THEN
      v_tasks_array := array_append(v_tasks_array, row_to_json(v_task)::jsonb);
    END IF;
  END LOOP;

  -- 5. Return the complete payload
  RETURN jsonb_build_object(
    'todayTasks', array_to_json(v_tasks_array)::jsonb,
    'overdueCount', v_overdue_count
  );
END;
$$;

-- Also fix the overdue tasks function
CREATE OR REPLACE FUNCTION public.get_all_overdue_tasks()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tasks_array JSONB[] := ARRAY[]::JSONB[];
  v_task RECORD;
  v_user_id UUID;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  -- Ensure user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Get ACTUALLY overdue tasks (deadline has passed)
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
      AND t.end_date < CURRENT_DATE  -- FIXED: Deadline has actually passed
    ORDER BY priority_order(t.priority) ASC, t.end_date DESC  -- Most recent deadlines first
  LOOP
    v_tasks_array := array_append(v_tasks_array, row_to_json(v_task)::jsonb);
  END LOOP;

  -- Return the array
  RETURN array_to_json(v_tasks_array)::jsonb;
END;
$$;