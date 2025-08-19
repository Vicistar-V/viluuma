-- Phase 1: Database Foundation - Smart Archiving System (Corrected)

-- Create the archive status enum
DO $$ BEGIN
    CREATE TYPE archive_status_enum AS ENUM ('active', 'user_archived', 'system_archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to profiles table for RevenueCat integration
DO $$ BEGIN
    ALTER TABLE public.profiles 
    ADD COLUMN revenuecat_id TEXT,
    ADD COLUMN current_entitlement TEXT NOT NULL DEFAULT 'free';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Drop the view first to avoid dependency issues
DROP VIEW IF EXISTS public.goals_with_computed_status;

-- Drop the old columns from goals
ALTER TABLE public.goals 
DROP COLUMN IF EXISTS is_archived,
DROP COLUMN IF EXISTS status;

-- Add the new archive_status column
ALTER TABLE public.goals 
ADD COLUMN archive_status archive_status_enum NOT NULL DEFAULT 'active';

-- Add indexes for performance
DROP INDEX IF EXISTS idx_goals_archive_status;
DROP INDEX IF EXISTS idx_profiles_current_entitlement;
DROP INDEX IF EXISTS idx_profiles_revenuecat_id;

CREATE INDEX idx_goals_archive_status ON public.goals (user_id, archive_status);
CREATE INDEX idx_profiles_current_entitlement ON public.profiles (current_entitlement);
CREATE INDEX idx_profiles_revenuecat_id ON public.profiles (revenuecat_id);

-- Recreate the goals_with_computed_status view with new archive_status
CREATE VIEW public.goals_with_computed_status AS
SELECT 
  g.id,
  g.user_id,
  g.title,
  g.description,
  g.modality,
  g.target_date,
  g.weekly_hours,
  g.total_tasks,
  g.completed_tasks,
  g.created_at,
  g.updated_at,
  g.completed_at,
  g.archive_status,
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