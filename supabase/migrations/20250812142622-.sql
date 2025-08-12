-- Fix remaining function search_path security warnings  
CREATE OR REPLACE FUNCTION public.get_user_goal_summary()
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
  active_count integer;
  completed_count integer;
  archived_count integer;
  total_tasks integer;
  completed_tasks integer;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  
  -- Get goal counts by status
  SELECT 
    COUNT(*) FILTER (WHERE status = 'active'),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'archived'),
    COALESCE(SUM(total_tasks), 0),
    COALESCE(SUM(completed_tasks), 0)
  INTO active_count, completed_count, archived_count, total_tasks, completed_tasks
  FROM public.goals 
  WHERE user_id = auth.uid();
  
  result := jsonb_build_object(
    'active_goals', active_count,
    'completed_goals', completed_count,
    'archived_goals', archived_count,
    'total_goals', active_count + completed_count + archived_count,
    'total_tasks', total_tasks,
    'completed_tasks', completed_tasks,
    'completion_rate', CASE 
      WHEN total_tasks > 0 THEN 
        ROUND((completed_tasks::numeric / total_tasks::numeric) * 100, 1)
      ELSE 0 
    END
  );
  
  RETURN result;
END;
$$;