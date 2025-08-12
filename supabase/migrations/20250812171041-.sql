-- Ensure the save_goal_plan function has the correct signature
-- First, let's verify what functions exist
SELECT proname, pg_get_function_arguments(oid) as args 
FROM pg_proc 
WHERE proname = 'save_goal_plan';

-- Drop any remaining functions with wrong signatures just to be safe
DROP FUNCTION IF EXISTS public.save_goal_plan(text, text, date, jsonb);
DROP FUNCTION IF EXISTS public.save_goal_plan(p_modality text, p_plan jsonb, p_title text);
DROP FUNCTION IF EXISTS public.save_goal_plan(p_modality text, p_plan jsonb, p_title text, p_target_date date);

-- Make sure we only have the correct function signature
-- (The correct one should already exist from previous migrations)