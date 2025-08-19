-- Create RPC function for completing tasks
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

  -- Update task status to completed
  UPDATE public.tasks
  SET status = 'completed', updated_at = now()
  WHERE id = p_task_id;
END;
$function$;

-- Create RPC function for uncompleting tasks
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

  -- Update task status to pending
  UPDATE public.tasks
  SET status = 'pending', updated_at = now()
  WHERE id = p_task_id;
END;
$function$;

-- Create RPC function for toggling task status
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

-- Create RPC function for updating task details
CREATE OR REPLACE FUNCTION public.update_task_details(
  p_task_id uuid,
  p_title text,
  p_description text DEFAULT NULL,
  p_priority text DEFAULT NULL,
  p_duration_hours integer DEFAULT NULL,
  p_is_anchored boolean DEFAULT false,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
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