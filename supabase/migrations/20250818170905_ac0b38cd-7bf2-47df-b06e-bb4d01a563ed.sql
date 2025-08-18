-- Create function to permanently delete a goal and all its data
CREATE OR REPLACE FUNCTION public.permanently_delete_goal(p_goal_id uuid)
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

  -- Delete all tasks for this goal
  DELETE FROM public.tasks WHERE goal_id = p_goal_id;

  -- Delete all milestones for this goal
  DELETE FROM public.milestones WHERE goal_id = p_goal_id;

  -- Finally delete the goal
  DELETE FROM public.goals WHERE id = p_goal_id;
END;
$function$;