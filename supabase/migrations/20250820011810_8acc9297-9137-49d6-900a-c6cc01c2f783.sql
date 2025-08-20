-- Add function to update goal description
CREATE OR REPLACE FUNCTION public.update_goal_description(
  p_goal_id uuid, 
  p_description text
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

  -- Ensure the goal belongs to the current user
  IF NOT public.goal_belongs_to_current_user(p_goal_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Check if goal is active
  IF NOT public.goal_is_active(p_goal_id) THEN
    RAISE EXCEPTION 'goal_is_archived';
  END IF;

  -- Update goal description
  UPDATE public.goals
  SET description = p_description, updated_at = now()
  WHERE id = p_goal_id;
END;
$function$