-- Phase 1: Add is_archived column to goals table
ALTER TABLE public.goals ADD COLUMN is_archived BOOLEAN DEFAULT false;

-- Phase 2: Create goals_with_computed_status view
CREATE OR REPLACE VIEW public.goals_with_computed_status AS
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
  g.is_archived,
  g.created_at,
  g.updated_at,
  g.completed_at,
  
  -- Computed status column
  CASE
    WHEN g.total_tasks > 0 AND g.total_tasks = g.completed_tasks THEN 'completed'::text
    WHEN g.is_archived THEN 'archived'::text
    ELSE 'active'::text
  END AS status
FROM
  public.goals g;

-- Phase 3: Create milestones_with_computed_status view
CREATE OR REPLACE VIEW public.milestones_with_computed_status AS
SELECT
  m.id,
  m.goal_id,
  m.title,
  m.order_index,
  m.total_tasks,
  m.completed_tasks,
  m.created_at,
  m.updated_at,
  
  -- Computed status column
  CASE
    WHEN m.total_tasks > 0 AND m.total_tasks = m.completed_tasks
    THEN 'completed'::text
    ELSE 'pending'::text
  END AS status
FROM
  public.milestones m;

-- Phase 4: Apply RLS policies to the new views
ALTER VIEW public.goals_with_computed_status SET (security_invoker = true);
ALTER VIEW public.milestones_with_computed_status SET (security_invoker = true);

-- Phase 5: Remove the handle_goal_completion trigger and function (drop trigger first)
DROP TRIGGER IF EXISTS trigger_handle_goal_completion ON public.goals;
DROP FUNCTION IF EXISTS public.handle_goal_completion();

-- Phase 6: Update the update_parent_progress trigger to be simpler
CREATE OR REPLACE FUNCTION public.update_parent_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_goal_id UUID;
  v_milestone_id UUID;
  v_total_m_tasks INTEGER;
  v_completed_m_tasks INTEGER;
  v_total_g_tasks INTEGER;
  v_completed_g_tasks INTEGER;
BEGIN
  -- Get the goal_id and milestone_id from the affected task
  IF TG_OP = 'DELETE' THEN
    v_goal_id := OLD.goal_id;
    v_milestone_id := OLD.milestone_id;
  ELSE
    v_goal_id := NEW.goal_id;
    v_milestone_id := NEW.milestone_id;
  END IF;

  -- Update milestone progress (counters only)
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_total_m_tasks, v_completed_m_tasks
  FROM public.tasks
  WHERE milestone_id = v_milestone_id;

  UPDATE public.milestones
  SET 
    total_tasks = COALESCE(v_total_m_tasks, 0),
    completed_tasks = COALESCE(v_completed_m_tasks, 0),
    updated_at = now()
  WHERE id = v_milestone_id;

  -- Update goal progress (counters only)
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_total_g_tasks, v_completed_g_tasks
  FROM public.tasks
  WHERE goal_id = v_goal_id;

  UPDATE public.goals
  SET 
    total_tasks = COALESCE(v_total_g_tasks, 0),
    completed_tasks = COALESCE(v_completed_g_tasks, 0),
    completed_at = CASE 
      WHEN COALESCE(v_total_g_tasks, 0) > 0 AND COALESCE(v_total_g_tasks, 0) = COALESCE(v_completed_g_tasks, 0) THEN now()
      ELSE NULL
    END,
    updated_at = now()
  WHERE id = v_goal_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Phase 7: Create archive_excess_goals function
CREATE OR REPLACE FUNCTION public.archive_excess_goals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_goals_to_archive UUID[];
BEGIN
  -- Ensure user is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Find goals that should be archived (keep only the 2 most recent active goals)
  WITH goals_to_keep AS (
    SELECT id FROM public.goals
    WHERE user_id = v_user_id 
      AND is_archived = false
      AND (total_tasks = 0 OR completed_tasks < total_tasks) -- Not completed
    ORDER BY created_at DESC
    LIMIT 2
  ),
  goals_to_archive AS (
    SELECT id FROM public.goals
    WHERE user_id = v_user_id 
      AND is_archived = false
      AND (total_tasks = 0 OR completed_tasks < total_tasks) -- Not completed
      AND id NOT IN (SELECT id FROM goals_to_keep)
  )
  SELECT array_agg(id) INTO v_goals_to_archive FROM goals_to_archive;

  -- Archive the excess goals
  IF v_goals_to_archive IS NOT NULL THEN
    UPDATE public.goals
    SET is_archived = true, updated_at = now()
    WHERE id = ANY(v_goals_to_archive);
  END IF;
END;
$function$;