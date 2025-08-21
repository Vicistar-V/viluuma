-- CRITICAL SECURITY FIX: Secure database views by adding user filtering

-- Drop and recreate goals_with_computed_status view with built-in user filtering
DROP VIEW IF EXISTS public.goals_with_computed_status;

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
        WHEN (g.archive_status <> 'active'::archive_status_enum) THEN 'archived'::text
        WHEN ((g.total_tasks > 0) AND (g.completed_tasks = g.total_tasks)) THEN 'completed'::text
        ELSE 'active'::text
    END AS status
FROM public.goals g
WHERE g.user_id = auth.uid();  -- SECURITY: Only return current user's goals

-- Drop and recreate milestones_with_computed_status view with built-in user filtering
DROP VIEW IF EXISTS public.milestones_with_computed_status;

CREATE VIEW public.milestones_with_computed_status AS
SELECT 
    m.id,
    m.goal_id,
    m.title,
    m.order_index,
    m.total_tasks,
    m.completed_tasks,
    m.created_at,
    m.updated_at,
    CASE
        WHEN (m.total_tasks > 0 AND m.completed_tasks = m.total_tasks) THEN 'completed'::text
        ELSE 'pending'::text
    END AS status
FROM public.milestones m
INNER JOIN public.goals g ON m.goal_id = g.id
WHERE g.user_id = auth.uid();  -- SECURITY: Only return milestones for current user's goals

-- Grant appropriate permissions to the views
GRANT SELECT ON public.goals_with_computed_status TO authenticated;
GRANT SELECT ON public.milestones_with_computed_status TO authenticated;

-- Add security definer function to safely get goal statistics 
CREATE OR REPLACE FUNCTION public.get_secure_goal_stats()
RETURNS TABLE(
    total_goals bigint,
    active_goals bigint,
    completed_goals bigint,
    archived_goals bigint,
    total_tasks bigint,
    completed_tasks bigint,
    completion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Ensure user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'not_authenticated';
    END IF;

    RETURN QUERY
    SELECT 
        COUNT(*) as total_goals,
        COUNT(*) FILTER (WHERE archive_status = 'active') as active_goals,
        COUNT(*) FILTER (WHERE archive_status = 'active' AND total_tasks > 0 AND completed_tasks = total_tasks) as completed_goals,
        COUNT(*) FILTER (WHERE archive_status != 'active') as archived_goals,
        COALESCE(SUM(g.total_tasks), 0) as total_tasks,
        COALESCE(SUM(g.completed_tasks), 0) as completed_tasks,
        CASE 
            WHEN COALESCE(SUM(g.total_tasks), 0) > 0 THEN 
                ROUND((COALESCE(SUM(g.completed_tasks), 0)::numeric / COALESCE(SUM(g.total_tasks), 1)::numeric) * 100, 1)
            ELSE 0 
        END as completion_rate
    FROM public.goals g
    WHERE g.user_id = auth.uid();
END;
$$;