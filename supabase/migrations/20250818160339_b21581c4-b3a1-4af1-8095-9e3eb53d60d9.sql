-- Create delete_my_account function for complete user data deletion
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_deleted_tasks INTEGER;
  v_deleted_milestones INTEGER;
  v_deleted_goals INTEGER;
BEGIN
  -- Ensure user is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Delete user data in proper order (foreign key constraints)
  -- 1. Delete tasks first
  DELETE FROM public.tasks WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_tasks = ROW_COUNT;

  -- 2. Delete milestones (via goals cascade)
  DELETE FROM public.milestones WHERE goal_id IN (
    SELECT id FROM public.goals WHERE user_id = v_user_id
  );
  GET DIAGNOSTICS v_deleted_milestones = ROW_COUNT;

  -- 3. Delete goals
  DELETE FROM public.goals WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_goals = ROW_COUNT;

  -- 4. Delete profile last
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- Log the deletion for audit purposes
  RAISE NOTICE 'User % deleted: % tasks, % milestones, % goals', 
    v_user_id, v_deleted_tasks, v_deleted_milestones, v_deleted_goals;
END;
$function$