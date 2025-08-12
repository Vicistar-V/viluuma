-- Fix the get_today_page_payload function to handle authentication properly
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

  -- 1. Get overdue count (fast, indexed query)
  SELECT COUNT(*)::INT INTO v_overdue_count
  FROM public.tasks
  WHERE user_id = v_user_id 
    AND status = 'pending' 
    AND start_date < CURRENT_DATE;

  -- 2. Get scheduled tasks for today (highest priority)
  FOR v_task IN
    SELECT 
      t.id, t.goal_id, t.title, t.description, t.status, 
      t.start_date, t.end_date, t.priority, t.is_anchored,
      g.title as goal_title, 
      'scheduled'::text as task_type
    FROM public.tasks t 
    JOIN public.goals g ON t.goal_id = g.id
    WHERE t.user_id = v_user_id 
      AND t.status = 'pending' 
      AND t.start_date = CURRENT_DATE
    ORDER BY priority_order(t.priority) ASC, t.created_at ASC
  LOOP
    EXIT WHEN array_length(v_tasks_array, 1) >= v_task_limit;
    v_tasks_array := array_append(v_tasks_array, row_to_json(v_task)::jsonb);
  END LOOP;

  -- 3. Add overdue tasks (up to 2, if we have room)
  FOR v_task IN
    SELECT 
      t.id, t.goal_id, t.title, t.description, t.status,
      t.start_date, t.end_date, t.priority, t.is_anchored,
      g.title as goal_title,
      'overdue'::text as task_type
    FROM public.tasks t 
    JOIN public.goals g ON t.goal_id = g.id
    WHERE t.user_id = v_user_id 
      AND t.status = 'pending' 
      AND t.start_date < CURRENT_DATE
    ORDER BY priority_order(t.priority) ASC, t.start_date DESC
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
      'checklist'::text as task_type
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

-- Also fix the get_all_overdue_tasks function
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

  -- Get all overdue tasks
  FOR v_task IN
    SELECT 
      t.id, t.goal_id, t.title, t.description, t.status,
      t.start_date, t.end_date, t.priority, t.is_anchored,
      g.title as goal_title,
      'overdue'::text as task_type
    FROM public.tasks t 
    JOIN public.goals g ON t.goal_id = g.id
    WHERE t.user_id = v_user_id 
      AND t.status = 'pending' 
      AND t.start_date < CURRENT_DATE
    ORDER BY priority_order(t.priority) ASC, t.start_date DESC
  LOOP
    v_tasks_array := array_append(v_tasks_array, row_to_json(v_task)::jsonb);
  END LOOP;

  -- Return the array
  RETURN array_to_json(v_tasks_array)::jsonb;
END;
$$;