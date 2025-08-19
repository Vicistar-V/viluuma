-- Update remaining detective functions and create new message retrieval function
CREATE OR REPLACE FUNCTION public.detect_and_queue_momentum_boosters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  WITH productive_users AS (
    SELECT user_id, COUNT(*) as completed_count
    FROM public.tasks
    WHERE status = 'completed'
      AND updated_at >= (CURRENT_DATE - INTERVAL '3 days')
    GROUP BY user_id
    HAVING COUNT(*) >= 3
  ),
  users_without_recent_momentum_message AS (
    SELECT user_id FROM productive_users pu
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_messages
      WHERE user_id = pu.user_id
        AND message_type = 'momentum_booster'
        AND created_at > (now() - INTERVAL '7 days')
    )
  )
  INSERT INTO public.user_messages (user_id, message_type, title, body)
  SELECT
    user_id,
    'momentum_booster',
    'You''re on fire! 🔥',
    'Wow, you''ve been crushing your tasks lately! This kind of momentum is exactly what turns goals into reality. Keep up the amazing work!'
  FROM users_without_recent_momentum_message;
END;
$function$;

CREATE OR REPLACE FUNCTION public.detect_and_queue_deadline_warnings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  WITH approaching_deadlines AS (
    SELECT DISTINCT user_id
    FROM public.tasks
    WHERE status = 'pending'
      AND end_date = (CURRENT_DATE + INTERVAL '2 days')
  ),
  users_without_recent_deadline_warning AS (
    SELECT user_id FROM approaching_deadlines ad
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_messages
      WHERE user_id = ad.user_id
        AND message_type = 'deadline_warning'
        AND created_at > (now() - INTERVAL '7 days')
    )
  )
  INSERT INTO public.user_messages (user_id, message_type, title, body)
  SELECT
    user_id,
    'deadline_warning',
    'Heads up! ⏰',
    'You have tasks due in 2 days. Now''s a great time to review your schedule and make sure you''re on track!'
  FROM users_without_recent_deadline_warning;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_unacknowledged_messages()
RETURNS SETOF user_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  RETURN QUERY
  SELECT * FROM public.user_messages
  WHERE user_id = v_user_id 
    AND is_acknowledged = false
  ORDER BY created_at ASC;
END;
$function$;