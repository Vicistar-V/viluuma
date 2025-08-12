-- Fix security linter warnings by setting proper search_path for functions
-- This migration addresses the security warnings from the linter

-- Update handle_goal_completion function with secure search_path
CREATE OR REPLACE FUNCTION public.handle_goal_completion()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  -- If status is being changed to completed and completed_at is null, set it
  IF NEW.status = 'completed' AND (OLD.status != 'completed' OR OLD.completed_at IS NULL) THEN
    NEW.completed_at = now();
  END IF;
  
  -- If status is being changed away from completed, clear completed_at
  IF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  
  -- Auto-complete goals when all tasks are completed
  IF NEW.total_tasks > 0 AND NEW.completed_tasks = NEW.total_tasks AND NEW.status = 'active' THEN
    NEW.status = 'completed';
    NEW.completed_at = now();
  END IF;
  
  -- Reactivate goals if they become incomplete after being completed
  IF NEW.total_tasks > 0 AND NEW.completed_tasks < NEW.total_tasks AND NEW.status = 'completed' THEN
    NEW.status = 'active';
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update get_goal_stats function with secure search_path
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
  
  -- Calculate statistics
  days_since_created := EXTRACT(days FROM (now() - goal_record.created_at));
  
  IF goal_record.target_date IS NOT NULL THEN
    days_to_target := EXTRACT(days FROM (goal_record.target_date - CURRENT_DATE));
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

-- Update get_user_goal_summary function with secure search_path
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