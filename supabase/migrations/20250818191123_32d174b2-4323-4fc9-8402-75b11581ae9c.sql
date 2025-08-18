-- Fix security warnings by setting proper search paths
CREATE OR REPLACE FUNCTION public.detect_and_queue_momentum_boosters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Find users who have completed 3+ tasks in the last 3 days and don't have a pending momentum message
  WITH productive_users AS (
    SELECT user_id, COUNT(*) as completed_count
    FROM public.tasks
    WHERE status = 'completed'
      AND updated_at >= (CURRENT_DATE - INTERVAL '3 days')
    GROUP BY user_id
    HAVING COUNT(*) >= 3
  ),
  users_without_pending_momentum AS (
    SELECT user_id FROM productive_users pu
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_messages
      WHERE user_id = pu.user_id
        AND message_type = 'momentum_booster'
        AND status = 'pending'
    )
  )
  INSERT INTO public.user_messages (user_id, message_type, title, body)
  SELECT
    user_id,
    'momentum_booster',
    'You''re on fire! 🔥',
    'Wow, you''ve been crushing your tasks lately! This kind of momentum is exactly what turns goals into reality. Keep up the amazing work!'
  FROM users_without_pending_momentum;
END;
$$;

CREATE OR REPLACE FUNCTION public.detect_and_queue_deadline_warnings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Find users with tasks due in 2 days who don't have pending warnings
  WITH approaching_deadlines AS (
    SELECT DISTINCT user_id
    FROM public.tasks
    WHERE status = 'pending'
      AND end_date = (CURRENT_DATE + INTERVAL '2 days')
  ),
  users_without_pending_warning AS (
    SELECT user_id FROM approaching_deadlines ad
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_messages
      WHERE user_id = ad.user_id
        AND message_type = 'deadline_warning'
        AND status = 'pending'
        AND created_at >= (CURRENT_DATE - INTERVAL '1 day')
    )
  )
  INSERT INTO public.user_messages (user_id, message_type, title, body)
  SELECT
    user_id,
    'deadline_warning',
    'Heads up! ⏰',
    'You have tasks due in 2 days. Now''s a great time to review your schedule and make sure you''re on track!'
  FROM users_without_pending_warning;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cron_job_status()
RETURNS TABLE(jobname TEXT, schedule TEXT, active BOOLEAN, last_run TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cron.jobname::TEXT,
    cron.schedule::TEXT,
    cron.active,
    cron.last_run
  FROM cron.job AS cron
  WHERE cron.jobname IN ('daily-slump-detection', 'daily-momentum-detection', 'deadline-warning-detection');
END;
$$;