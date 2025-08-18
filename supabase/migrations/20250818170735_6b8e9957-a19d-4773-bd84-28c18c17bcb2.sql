-- Create dedicated archive_goal function for cleaner archiving operations
CREATE OR REPLACE FUNCTION public.archive_goal(p_goal_id uuid)
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

  -- Archive the goal
  UPDATE public.goals
  SET is_archived = true, updated_at = now()
  WHERE id = p_goal_id;
END;
$function$;