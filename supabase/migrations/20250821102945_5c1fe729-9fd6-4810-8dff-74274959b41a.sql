-- CRITICAL SECURITY FIX: Add RLS policies to database views to prevent data exposure

-- Enable RLS on goals_with_computed_status view
ALTER TABLE public.goals_with_computed_status ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for goals_with_computed_status
CREATE POLICY "Users can only see their own goal status" 
ON public.goals_with_computed_status 
FOR SELECT 
USING (auth.uid() = user_id);

-- Enable RLS on milestones_with_computed_status view  
ALTER TABLE public.milestones_with_computed_status ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for milestones_with_computed_status
CREATE POLICY "Users can only see their own milestone status" 
ON public.milestones_with_computed_status 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.goals g 
    WHERE g.id = goal_id 
    AND g.user_id = auth.uid()
  )
);

-- Add input validation function for user-generated content
CREATE OR REPLACE FUNCTION public.sanitize_user_input(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Basic XSS protection - remove script tags and suspicious content
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove script tags, javascript protocols, and other dangerous content
  input_text := regexp_replace(input_text, '<script[^>]*>.*?</script>', '', 'gi');
  input_text := regexp_replace(input_text, 'javascript:', '', 'gi');
  input_text := regexp_replace(input_text, 'data:text/html', '', 'gi');
  input_text := regexp_replace(input_text, 'vbscript:', '', 'gi');
  input_text := regexp_replace(input_text, 'onload=', '', 'gi');
  input_text := regexp_replace(input_text, 'onerror=', '', 'gi');
  input_text := regexp_replace(input_text, 'onclick=', '', 'gi');
  
  -- Limit length to prevent extremely long inputs
  IF length(input_text) > 5000 THEN
    input_text := left(input_text, 5000);
  END IF;
  
  RETURN input_text;
END;
$$;

-- Update existing functions to use input sanitization
CREATE OR REPLACE FUNCTION public.save_goal_plan(p_title text, p_modality text, p_target_date text, p_milestones jsonb, p_tasks jsonb, p_description text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id       uuid;
  v_goal_id       uuid;
  v_milestone_id  uuid;
  v_m             record;
  v_t             record;
  v_target_date   date;
  v_sanitized_title text;
  v_sanitized_description text;
BEGIN
  -- Ensure caller is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Validate and sanitize inputs
  IF p_title IS NULL OR trim(p_title) = '' THEN
    RAISE EXCEPTION 'title_required';
  END IF;
  
  v_sanitized_title := public.sanitize_user_input(p_title);
  v_sanitized_description := public.sanitize_user_input(p_description);

  -- Validate modality
  IF p_modality NOT IN ('project','checklist') THEN
    RAISE EXCEPTION 'invalid_modality';
  END IF;

  -- Convert target_date from text to date (handle null/empty strings)
  v_target_date := CASE 
    WHEN p_target_date IS NULL OR p_target_date = '' OR p_target_date = 'null' 
    THEN NULL 
    ELSE p_target_date::date 
  END;

  -- Create goal with sanitized inputs
  INSERT INTO public.goals (user_id, title, modality, target_date, description)
  VALUES (v_user_id, v_sanitized_title, p_modality, v_target_date, v_sanitized_description)
  RETURNING id INTO v_goal_id;

  -- Temporary table to map milestone order_index -> id
  CREATE TEMP TABLE tmp_milestone_map (
    order_index integer PRIMARY KEY,
    id uuid NOT NULL
  ) ON COMMIT DROP;

  -- Insert milestones with sanitized titles
  FOR v_m IN
    SELECT * FROM jsonb_to_recordset(p_milestones)
      AS x(title text, order_index integer)
    ORDER BY order_index
  LOOP
    INSERT INTO public.milestones (goal_id, title, order_index)
    VALUES (v_goal_id, public.sanitize_user_input(COALESCE(v_m.title, 'Milestone ' || v_m.order_index)), v_m.order_index)
    RETURNING id INTO v_milestone_id;

    INSERT INTO tmp_milestone_map(order_index, id) VALUES (v_m.order_index, v_milestone_id);
  END LOOP;

  -- Insert tasks with sanitized inputs
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

    -- Validate duration_hours
    IF v_t.duration_hours IS NOT NULL AND (v_t.duration_hours < 0 OR v_t.duration_hours > 168) THEN
      RAISE EXCEPTION 'invalid_duration_hours';
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
      public.sanitize_user_input(COALESCE(v_t.title, 'Task')),
      public.sanitize_user_input(v_t.description),
      v_t.priority,
      v_t.start_date,
      v_t.end_date,
      v_t.duration_hours,
      COALESCE(v_t.is_anchored, false)
    );
  END LOOP;

  RETURN v_goal_id;
END;
$function$;