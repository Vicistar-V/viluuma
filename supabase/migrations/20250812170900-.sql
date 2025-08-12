-- Drop the older version that uses p_plan parameter
DROP FUNCTION IF EXISTS public.save_goal_plan(p_title text, p_modality text, p_target_date date, p_plan jsonb);

-- Keep only the function with separate p_milestones and p_tasks parameters
-- (This is already the current function, so no need to recreate)