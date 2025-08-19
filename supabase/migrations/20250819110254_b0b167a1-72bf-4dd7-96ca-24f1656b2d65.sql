-- Update detective functions with 7-day cool-downs
CREATE OR REPLACE FUNCTION public.detect_and_queue_slumps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  WITH struggling_users AS (
    SELECT DISTINCT user_id
    FROM public.tasks
    WHERE status = 'pending'
      AND end_date <= (CURRENT_DATE - INTERVAL '3 days')
  ),
  users_without_recent_slump_message AS (
    SELECT user_id FROM struggling_users su
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_messages
      WHERE user_id = su.user_id
        AND message_type = 'slump_detector'
        AND created_at > (now() - INTERVAL '7 days')
    )
  )
  INSERT INTO public.user_messages (user_id, message_type, title, body)
  SELECT
    user_id,
    'slump_detector',
    'Just checking in 👋',
    'Hey, it looks like things might have been a bit busy lately. That''s totally okay! If you''re feeling stuck, try focusing on just one small task to get the momentum rolling again.'
  FROM users_without_recent_slump_message;
END;
$function$;