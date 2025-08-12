-- Drop and recreate the get_all_overdue_tasks function with correct return type
DROP FUNCTION IF EXISTS public.get_all_overdue_tasks();

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