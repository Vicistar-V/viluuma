-- Fix get_goal_stats function to use computed status view
CREATE OR REPLACE FUNCTION public.get_goal_stats(goal_uuid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  goal_record record;
  days_to_target integer;
  days_since_created integer;
  completion_rate numeric;
BEGIN
  -- Get goal data from the computed status view
  SELECT * INTO goal_record FROM public.goals_with_computed_status WHERE id = goal_uuid;
  
  IF goal_record IS NULL THEN
    RETURN jsonb_build_object('error', 'Goal not found');
  END IF;
  
  -- Calculate statistics with proper casting
  days_since_created := EXTRACT(days FROM (now() - goal_record.created_at))::integer;
  
  IF goal_record.target_date IS NOT NULL THEN
    days_to_target := EXTRACT(days FROM (goal_record.target_date::timestamp - CURRENT_DATE::timestamp))::integer;
  ELSE
    days_to_target := NULL;
  END IF;
  
  completion_rate := CASE 
    WHEN goal_record.total_tasks > 0 THEN 
      ROUND((goal_record.completed_tasks::numeric / goal_record.total_tasks::numeric) * 100, 1)
    ELSE 0 
  END;
  
  -- Build result using the computed status field
  result := jsonb_build_object(
    'goal_id', goal_record.id,
    'completion_rate', completion_rate,
    'days_since_created', days_since_created,
    'days_to_target', days_to_target,
    'is_overdue', CASE 
      WHEN goal_record.target_date IS NOT NULL AND goal_record.target_date < CURRENT_DATE 
      THEN true 
      ELSE false 
    END,
    'total_tasks', goal_record.total_tasks,
    'completed_tasks', goal_record.completed_tasks,
    'remaining_tasks', goal_record.total_tasks - goal_record.completed_tasks,
    'status', goal_record.status,  -- Now uses the computed status from the view
    'modality', goal_record.modality
  );
  
  RETURN result;
END;
$function$