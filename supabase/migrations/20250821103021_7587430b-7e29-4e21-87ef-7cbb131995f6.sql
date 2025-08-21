-- SECURITY IMPROVEMENTS: Input validation and additional security measures

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

-- Enhanced input validation for task updates
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

  -- Validate and sanitize title
  IF p_title IS NULL OR trim(p_title) = '' THEN
    RAISE EXCEPTION 'title_required';
  END IF;

  -- Validate priority if provided
  IF p_priority IS NOT NULL AND p_priority NOT IN ('low', 'medium', 'high') THEN
    RAISE EXCEPTION 'invalid_priority';
  END IF;

  -- Validate duration_hours if provided
  IF p_duration_hours IS NOT NULL AND (p_duration_hours < 0 OR p_duration_hours > 168) THEN
    RAISE EXCEPTION 'invalid_duration_hours';
  END IF;

  -- Update task details with sanitized inputs
  UPDATE public.tasks
  SET 
    title = public.sanitize_user_input(p_title),
    description = public.sanitize_user_input(p_description),
    priority = p_priority,
    duration_hours = p_duration_hours,
    is_anchored = p_is_anchored,
    start_date = p_start_date,
    end_date = p_end_date,
    updated_at = now()
  WHERE id = p_task_id;
END;
$function$;

-- Enhanced input validation for goal creation
CREATE OR REPLACE FUNCTION public.create_manual_goal(p_title text, p_modality text, p_target_date date DEFAULT NULL::date, p_description text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE 
  v_goal_id UUID; 
  v_milestone_id UUID; 
BEGIN
  IF auth.uid() IS NULL THEN 
    RAISE EXCEPTION 'not_authenticated'; 
  END IF;
  
  -- Validate and sanitize inputs
  IF p_title IS NULL OR trim(p_title) = '' THEN
    RAISE EXCEPTION 'title_required';
  END IF;
  
  IF p_modality NOT IN ('project', 'checklist') THEN
    RAISE EXCEPTION 'invalid_modality';
  END IF;
  
  INSERT INTO public.goals (user_id, title, modality, target_date, description) 
  VALUES (auth.uid(), public.sanitize_user_input(p_title), p_modality, p_target_date, public.sanitize_user_input(p_description)) 
  RETURNING id INTO v_goal_id;
  
  INSERT INTO public.milestones (goal_id, title, order_index) 
  VALUES (v_goal_id, 'Getting started', 1) 
  RETURNING id INTO v_milestone_id;
  
  INSERT INTO public.tasks (goal_id, milestone_id, user_id, title, description) 
  VALUES (v_goal_id, v_milestone_id, auth.uid(), 'First task', 'Tap to edit your first task');
  
  RETURN v_goal_id; 
END;
$function$;

-- Add rate limiting function to prevent abuse
CREATE OR REPLACE FUNCTION public.check_rate_limit(action_type TEXT, max_per_hour INTEGER DEFAULT 100)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count INTEGER;
  user_id UUID;
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- This is a basic implementation - in production, you'd want to use a proper rate limiting solution
  -- For now, we'll just log the action for monitoring
  RAISE NOTICE 'Action % by user % at %', action_type, user_id, now();
  
  RETURN TRUE;
END;
$$;