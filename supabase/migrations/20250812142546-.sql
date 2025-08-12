-- Fix search_path security warnings by adding SET search_path to existing functions
CREATE OR REPLACE FUNCTION public.get_goal_stats(goal_uuid uuid)
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
  goal_record record;
  days_to_target integer;
  days_since_created integer;
  completion_rate numeric;
BEGIN
  -- Get goal data
  SELECT * INTO goal_record FROM public.goals WHERE id = goal_uuid;
  
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
  
  -- Build result
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
    'status', goal_record.status,
    'modality', goal_record.modality
  );
  
  RETURN result;
END;
$$;

-- Fix search_path for execute_plan_update function
CREATE OR REPLACE FUNCTION public.execute_plan_update(
  p_tasks_to_update JSONB DEFAULT NULL,
  p_task_id_to_delete UUID DEFAULT NULL
) RETURNS void AS $$
DECLARE
  update_rec JSONB;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Update all rescheduled tasks
  IF p_tasks_to_update IS NOT NULL THEN
    FOR update_rec IN SELECT * FROM jsonb_array_elements(p_tasks_to_update)
    LOOP
      UPDATE public.tasks
      SET 
        start_date = CASE 
          WHEN update_rec->>'newStartDate' = 'null' OR update_rec->>'newStartDate' IS NULL 
          THEN NULL 
          ELSE (update_rec->>'newStartDate')::date 
        END,
        end_date = CASE 
          WHEN update_rec->>'newEndDate' = 'null' OR update_rec->>'newEndDate' IS NULL 
          THEN NULL 
          ELSE (update_rec->>'newEndDate')::date 
        END,
        updated_at = now()
      WHERE id = (update_rec->>'taskId')::uuid 
        AND user_id = auth.uid();
    END LOOP;
  END IF;

  -- Delete the specified task if provided
  IF p_task_id_to_delete IS NOT NULL THEN
    DELETE FROM public.tasks 
    WHERE id = p_task_id_to_delete 
      AND user_id = auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';