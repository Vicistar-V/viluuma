-- Update create_manual_goal function to accept description
DROP FUNCTION IF EXISTS public.create_manual_goal(text, text, date);

CREATE OR REPLACE FUNCTION public.create_manual_goal(
  p_title text, 
  p_modality text, 
  p_target_date date DEFAULT NULL::date,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE 
  v_goal_id UUID; 
  v_milestone_id UUID; 
BEGIN
  IF auth.uid() IS NULL THEN 
    RAISE EXCEPTION 'not_authenticated'; 
  END IF;
  
  INSERT INTO public.goals (user_id, title, modality, target_date, description) 
  VALUES (auth.uid(), p_title, p_modality, p_target_date, p_description) 
  RETURNING id INTO v_goal_id;
  
  INSERT INTO public.milestones (goal_id, title, order_index) 
  VALUES (v_goal_id, 'Getting started', 1) 
  RETURNING id INTO v_milestone_id;
  
  INSERT INTO public.tasks (goal_id, milestone_id, user_id, title, description) 
  VALUES (v_goal_id, v_milestone_id, auth.uid(), 'First task', 'Tap to edit your first task');
  
  RETURN v_goal_id; 
END;
$function$