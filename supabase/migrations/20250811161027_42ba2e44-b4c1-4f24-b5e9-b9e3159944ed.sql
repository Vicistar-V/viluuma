-- Create a transactional function to save a full generated plan (goal + milestones + tasks)
-- Assumptions:
-- - Input tasks reference milestones by their order_index via milestone_index
-- - Dates are already anchored to real dates by the client before calling this function
-- - SECURITY DEFINER so it can insert regardless of RLS while still tying data to auth.uid()

CREATE OR REPLACE FUNCTION public.save_goal_plan(
  p_title        text,
  p_modality     text,
  p_target_date  date,
  p_milestones   jsonb,  -- [{ title: text, order_index: int }]
  p_tasks        jsonb   -- [{ title, description, duration_hours, start_date, end_date, milestone_index, priority, is_anchored }]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id       uuid;
  v_goal_id       uuid;
  v_milestone_id  uuid;
  v_m             record;
  v_t             record;
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

  -- Create goal
  INSERT INTO public.goals (user_id, title, modality, target_date)
  VALUES (v_user_id, p_title, p_modality, p_target_date)
  RETURNING id INTO v_goal_id;

  -- Temporary table to map milestone order_index -> id
  CREATE TEMP TABLE tmp_milestone_map (
    order_index integer PRIMARY KEY,
    id uuid NOT NULL
  ) ON COMMIT DROP;

  -- Insert milestones
  FOR v_m IN
    SELECT * FROM jsonb_to_recordset(p_milestones)
      AS x(title text, order_index integer)
    ORDER BY order_index
  LOOP
    INSERT INTO public.milestones (goal_id, title, order_index)
    VALUES (v_goal_id, COALESCE(v_m.title, 'Milestone ' || v_m.order_index), v_m.order_index)
    RETURNING id INTO v_milestone_id;

    INSERT INTO tmp_milestone_map(order_index, id) VALUES (v_m.order_index, v_milestone_id);
  END LOOP;

  -- Insert tasks
  FOR v_t IN
    SELECT * FROM jsonb_to_recordset(p_tasks)
      AS x(
        title text,
        description text,
        duration_hours integer,
        start_date date,
        end_date date,
        milestone_index integer,
        priority text,
        is_anchored boolean
      )
  LOOP
    SELECT id INTO v_milestone_id FROM tmp_milestone_map WHERE order_index = v_t.milestone_index;
    IF v_milestone_id IS NULL THEN
      RAISE EXCEPTION 'invalid_milestone_index %', v_t.milestone_index;
    END IF;

    IF v_t.priority IS NOT NULL AND v_t.priority NOT IN ('low','medium','high') THEN
      RAISE EXCEPTION 'invalid_priority';
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
      COALESCE(v_t.is_anchored, false)
    );
  END LOOP;

  -- Progress rollups are handled by existing triggers
  RETURN v_goal_id;
END;
$$;