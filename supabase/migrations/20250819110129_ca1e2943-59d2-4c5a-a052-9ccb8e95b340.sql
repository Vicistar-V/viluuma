-- Transform user_messages table to human-centric design
-- Drop the old confusing status system
ALTER TABLE public.user_messages DROP COLUMN IF EXISTS status;

-- Add the new, smarter state columns
ALTER TABLE public.user_messages
ADD COLUMN is_acknowledged BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN acknowledged_at TIMESTAMPTZ,
ADD COLUMN user_snooze_until TIMESTAMPTZ;

-- Create index for performance on the new acknowledgment queries
CREATE INDEX idx_user_messages_acknowledged ON public.user_messages(user_id, is_acknowledged, created_at);

-- Update existing RLS policy to work with new columns
DROP POLICY IF EXISTS "Users can manage their own messages" ON public.user_messages;
CREATE POLICY "Users can manage their own messages" ON public.user_messages
FOR ALL USING (auth.uid() = user_id);

-- Create new acknowledge function that replaces the old complex system
CREATE OR REPLACE FUNCTION public.acknowledge_message(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Mark message as acknowledged (simple and clean)
  UPDATE public.user_messages
  SET 
    is_acknowledged = true, 
    acknowledged_at = now(),
    updated_at = now()
  WHERE id = p_message_id 
    AND user_id = auth.uid()
    AND is_acknowledged = false; -- Only acknowledge once
END;
$function$

-- Update detective functions with hard cool-downs (7-day rule)
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
    -- CRITICAL NEW RULE: No slump message if one sent in last 7 days
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
$function$

-- Update momentum booster function with 7-day cool-down
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
    -- 7-day cool-down rule
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
$function$

-- Update deadline warning function with cool-down
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
    -- 7-day cool-down rule (though deadline warnings are more time-sensitive)
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
$function$

-- Replace the complex get_next_pending_message with simple query function
CREATE OR REPLACE FUNCTION public.get_unacknowledged_messages()
RETURNS SETOF user_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  -- Ensure user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Return all unacknowledged messages (simple and clean)
  RETURN QUERY
  SELECT * FROM public.user_messages
  WHERE user_id = v_user_id 
    AND is_acknowledged = false
  ORDER BY created_at ASC;
END;
$function$