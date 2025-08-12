-- Fix the save_goal_plan function by restructuring the CTE logic
-- The issue is that we're trying to access 'inserted_goal' CTE outside its scope
DROP FUNCTION IF EXISTS public.save_goal_plan(text, text, date, jsonb);

CREATE OR REPLACE FUNCTION public.save_goal_plan(
  p_title text, 
  p_modality text, 
  p_target_date date, 
  p_plan jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_goal_id UUID;
  v_user_id UUID;
  v_milestone_id UUID;
  v_m RECORD;
  v_t RECORD;
BEGIN
  -- Ensure caller is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Validate modality
  IF p_modality NOT IN ('project','checklist') THEN
    RAISE EXCEPTION 'invalid_modality';
  END IF;

  -- Create the goal first and capture its ID
  INSERT INTO public.goals (user_id, title, modality, target_date)
  VALUES (v_user_id, p_title, p_modality, p_target_date)
  RETURNING id INTO v_goal_id;

  -- Create temporary mapping table for milestone order_index -> id
  CREATE TEMP TABLE IF NOT EXISTS tmp_milestone_map (
    order_index integer PRIMARY KEY,
    milestone_id uuid NOT NULL
  ) ON COMMIT DROP;

  -- Insert milestones and build the mapping
  FOR v_m IN
    SELECT 
      (value->>'title')::text as title,
      (value->>'order_index')::integer as order_index
    FROM jsonb_array_elements(p_plan->'milestones')
    ORDER BY (value->>'order_index')::integer
  LOOP
    INSERT INTO public.milestones (goal_id, title, order_index)
    VALUES (v_goal_id, COALESCE(v_m.title, 'Milestone ' || v_m.order_index), v_m.order_index)
    RETURNING id INTO v_milestone_id;

    INSERT INTO tmp_milestone_map (order_index, milestone_id) 
    VALUES (v_m.order_index, v_milestone_id);
  END LOOP;

  -- Insert all tasks
  FOR v_t IN
    SELECT 
      (value->>'title')::text as title,
      (value->>'description')::text as description,
      (value->>'duration_hours')::integer as duration_hours,
      CASE 
        WHEN value->>'start_date' = 'null' OR value->>'start_date' IS NULL 
        THEN NULL 
        ELSE (value->>'start_date')::date 
      END as start_date,
      CASE 
        WHEN value->>'end_date' = 'null' OR value->>'end_date' IS NULL 
        THEN NULL 
        ELSE (value->>'end_date')::date 
      END as end_date,
      (value->>'milestone_index')::integer as milestone_index,
      (value->>'priority')::text as priority,
      COALESCE((value->>'is_anchored')::boolean, false) as is_anchored
    FROM jsonb_array_elements(p_plan->'scheduledTasks')
  LOOP
    -- Get the milestone_id for this task
    SELECT milestone_id INTO v_milestone_id 
    FROM tmp_milestone_map 
    WHERE order_index = v_t.milestone_index;

    IF v_milestone_id IS NULL THEN
      RAISE EXCEPTION 'invalid_milestone_index %', v_t.milestone_index;
    END IF;

    -- Validate priority if provided
    IF v_t.priority IS NOT NULL AND v_t.priority NOT IN ('low','medium','high') THEN
      -- Set to NULL instead of raising exception for invalid priorities
      v_t.priority := NULL;
    END IF;

    INSERT INTO public.tasks (
      goal_id,
      milestone_id,
      user_id,
      title,
      description,
      priority,
      start_date,
      end_date,
      duration_hours,
      is_anchored
    ) VALUES (
      v_goal_id,
      v_milestone_id,
      v_user_id,
      COALESCE(v_t.title, 'Task'),
      v_t.description,
      v_t.priority,
      v_t.start_date,
      v_t.end_date,
      v_t.duration_hours,
      v_t.is_anchored
    );
  END LOOP;

  -- Clean up temp table
  DROP TABLE IF EXISTS tmp_milestone_map;

  -- Return the goal ID
  RETURN v_goal_id;
END;
$function$;