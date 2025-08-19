-- Phase 1: Database Foundation - Smart Archiving System (Fixed)

-- Create the archive status enum
CREATE TYPE archive_status_enum AS ENUM ('active', 'user_archived', 'system_archived');

-- Add new columns to profiles table for RevenueCat integration
ALTER TABLE public.profiles 
ADD COLUMN revenuecat_id TEXT,
ADD COLUMN current_entitlement TEXT NOT NULL DEFAULT 'free';

-- Drop the view first to avoid dependency issues
DROP VIEW IF EXISTS public.goals_with_computed_status;

-- Drop the old is_archived boolean column from goals
ALTER TABLE public.goals DROP COLUMN IF EXISTS is_archived;

-- Add the new archive_status column
ALTER TABLE public.goals 
ADD COLUMN archive_status archive_status_enum NOT NULL DEFAULT 'active';

-- Add indexes for performance
CREATE INDEX idx_goals_archive_status ON public.goals (user_id, archive_status);
CREATE INDEX idx_profiles_current_entitlement ON public.profiles (current_entitlement);
CREATE INDEX idx_profiles_revenuecat_id ON public.profiles (revenuecat_id);

-- Recreate the goals_with_computed_status view with new archive_status
CREATE VIEW public.goals_with_computed_status AS
SELECT 
  g.*,
  CASE 
    WHEN g.archive_status != 'active' THEN 'archived'
    WHEN g.total_tasks > 0 AND g.completed_tasks = g.total_tasks THEN 'completed'
    ELSE 'active'
  END as status
FROM public.goals g;

-- Create the new gatekeeper function
CREATE OR REPLACE FUNCTION public.can_create_new_goal()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_entitlement TEXT;
  v_active_goal_count INTEGER;
BEGIN
  -- Ensure user is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Check user's current entitlement
  SELECT current_entitlement INTO v_entitlement
  FROM public.profiles
  WHERE id = v_user_id;

  -- If user is pro, they can create unlimited goals
  IF v_entitlement = 'pro' THEN
    RETURN true;
  END IF;

  -- For free users, count active goals
  SELECT COUNT(*) INTO v_active_goal_count
  FROM public.goals
  WHERE user_id = v_user_id 
    AND archive_status = 'active';

  -- Free users can have up to 2 active goals
  RETURN v_active_goal_count < 2;
END;
$$;

-- Update archive_excess_goals to work with user parameter and new archive_status
CREATE OR REPLACE FUNCTION public.archive_excess_goals_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_goals_to_archive UUID[];
BEGIN
  -- Find goals that should be archived (keep only the 2 most recent active goals)
  WITH goals_to_keep AS (
    SELECT id FROM public.goals
    WHERE user_id = p_user_id 
      AND archive_status = 'active'
      AND (total_tasks = 0 OR completed_tasks < total_tasks) -- Not completed
    ORDER BY created_at DESC
    LIMIT 2
  ),
  goals_to_archive AS (
    SELECT id FROM public.goals
    WHERE user_id = p_user_id 
      AND archive_status = 'active'
      AND (total_tasks = 0 OR completed_tasks < total_tasks) -- Not completed
      AND id NOT IN (SELECT id FROM goals_to_keep)
  )
  SELECT array_agg(id) INTO v_goals_to_archive FROM goals_to_archive;

  -- Archive the excess goals with system_archived status
  IF v_goals_to_archive IS NOT NULL THEN
    UPDATE public.goals
    SET archive_status = 'system_archived', updated_at = now()
    WHERE id = ANY(v_goals_to_archive);
  END IF;
END;
$$;

-- Create the unarchive system goals function
CREATE OR REPLACE FUNCTION public.unarchive_system_goals_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only unarchive goals that were archived by the system
  UPDATE public.goals
  SET archive_status = 'active', updated_at = now()
  WHERE user_id = p_user_id 
    AND archive_status = 'system_archived';
END;
$$;

-- Update the existing archive_goal function to use user_archived status
CREATE OR REPLACE FUNCTION public.archive_goal(p_goal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Ensure the goal belongs to the current user
  IF NOT public.goal_belongs_to_current_user(p_goal_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Archive the goal with user_archived status
  UPDATE public.goals
  SET archive_status = 'user_archived', updated_at = now()
  WHERE id = p_goal_id;
END;
$$;

-- Update create_manual_goal to check permissions
CREATE OR REPLACE FUNCTION public.create_manual_goal(p_title text, p_modality text, p_target_date date DEFAULT NULL::date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE 
  v_goal_id UUID; 
  v_milestone_id UUID; 
BEGIN
  IF auth.uid() IS NULL THEN 
    RAISE EXCEPTION 'not_authenticated'; 
  END IF;
  
  -- Check if user can create a new goal
  IF NOT public.can_create_new_goal() THEN
    RAISE EXCEPTION 'goal_limit_reached';
  END IF;
  
  INSERT INTO public.goals (user_id, title, modality, target_date) 
  VALUES (auth.uid(), p_title, p_modality, p_target_date) 
  RETURNING id INTO v_goal_id;
  
  INSERT INTO public.milestones (goal_id, title, order_index) 
  VALUES (v_goal_id, 'Getting started', 1) 
  RETURNING id INTO v_milestone_id;
  
  INSERT INTO public.tasks (goal_id, milestone_id, user_id, title, description) 
  VALUES (v_goal_id, v_milestone_id, auth.uid(), 'First task', 'Tap to edit your first task');
  
  RETURN v_goal_id; 
END;
$$;

-- Update save_goal_plan to check permissions
CREATE OR REPLACE FUNCTION public.save_goal_plan(p_title text, p_modality text, p_target_date text, p_milestones jsonb, p_tasks jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id       uuid;
  v_goal_id       uuid;
  v_milestone_id  uuid;
  v_m             record;
  v_t             record;
  v_target_date   date;
BEGIN
  -- Ensure caller is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Check if user can create a new goal
  IF NOT public.can_create_new_goal() THEN
    RAISE EXCEPTION 'goal_limit_reached';
  END IF;

  -- Validate modality
  IF p_modality NOT IN ('project','checklist') THEN
    RAISE EXCEPTION 'invalid_modality';
  END IF;

  -- Convert target_date from text to date (handle null/empty strings)
  v_target_date := CASE 
    WHEN p_target_date IS NULL OR p_target_date = '' OR p_target_date = 'null' 
    THEN NULL 
    ELSE p_target_date::date 
  END;

  -- Create goal
  INSERT INTO public.goals (user_id, title, modality, target_date)
  VALUES (v_user_id, p_title, p_modality, v_target_date)
  RETURNING id INTO v_goal_id;

  -- Temporary table to map milestone order_index -> id
  CREATE TEMP TABLE tmp_milestone_map (
    order_index integer PRIMARY KEY,
    id uuid NOT NULL
  ) ON COMMIT DROP;

  -- Insert milestones
  FOR v_m IN
    SELECT * FROM jsonb_to_recordset(p_milestones)
      AS x(title text, order_index integer)
    ORDER BY order_index
  LOOP
    INSERT INTO public.milestones (goal_id, title, order_index)
    VALUES (v_goal_id, COALESCE(v_m.title, 'Milestone ' || v_m.order_index), v_m.order_index)
    RETURNING id INTO v_milestone_id;

    INSERT INTO tmp_milestone_map(order_index, id) VALUES (v_m.order_index, v_milestone_id);
  END LOOP;

  -- Insert tasks
  FOR v_t IN
    SELECT * FROM jsonb_to_recordset(p_tasks)
      AS x(
        title text,
        description text,
        duration_hours integer,
        start_date date,
        end_date date,
        milestone_index integer,
        priority text,
        is_anchored boolean
      )
  LOOP
    SELECT id INTO v_milestone_id FROM tmp_milestone_map WHERE order_index = v_t.milestone_index;
    IF v_milestone_id IS NULL THEN
      RAISE EXCEPTION 'invalid_milestone_index %', v_t.milestone_index;
    END IF;

    IF v_t.priority IS NOT NULL AND v_t.priority NOT IN ('low','medium','high') THEN
      RAISE EXCEPTION 'invalid_priority';
    END IF;

    INSERT INTO public.tasks (
      goal_id,
      milestone_id,
      user_id,
      title,
      description,
      priority,
      start_date,
      end_date,
      duration_hours,
      is_anchored
    ) VALUES (
      v_goal_id,
      v_milestone_id,
      v_user_id,
      COALESCE(v_t.title, 'Task'),
      v_t.description,
      v_t.priority,
      v_t.start_date,
      v_t.end_date,
      v_t.duration_hours,
      COALESCE(v_t.is_anchored, false)
    );
  END LOOP;

  RETURN v_goal_id;
END;
$$;