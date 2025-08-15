-- 1. Create our strict status ENUM type for data integrity
CREATE TYPE public.subscription_status_enum AS ENUM ('trial', 'free', 'active', 'canceled', 'expired');

-- 2. Add all necessary columns to the profiles table
ALTER TABLE public.profiles
  ADD COLUMN subscription_status subscription_status_enum NOT NULL DEFAULT 'trial',
  ADD COLUMN signed_up_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN provider_subscription_id TEXT,
  ADD COLUMN current_period_ends_at TIMESTAMPTZ;

-- 3. Create user_messages table for coaching engine
CREATE TABLE public.user_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Enable RLS on user_messages
ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for user_messages
CREATE POLICY "Users can view their own messages" ON public.user_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages" ON public.user_messages
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. The Supreme Court: Calculates the TRUE status in real-time
CREATE OR REPLACE FUNCTION public.get_current_subscription_status()
RETURNS subscription_status_enum
LANGUAGE plpgsql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  user_profile RECORD;
  trial_end_date TIMESTAMPTZ;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Get user profile data
  SELECT subscription_status, signed_up_at, current_period_ends_at
  INTO user_profile
  FROM public.profiles
  WHERE id = auth.uid();

  -- If no profile found, return trial (new user)
  IF user_profile IS NULL THEN
    RETURN 'trial'::subscription_status_enum;
  END IF;

  -- If user has an active subscription that hasn't expired
  IF user_profile.subscription_status = 'active' AND 
     user_profile.current_period_ends_at IS NOT NULL AND 
     user_profile.current_period_ends_at > now() THEN
    RETURN 'active'::subscription_status_enum;
  END IF;

  -- Check if user is still in trial period (7 days from signup)
  trial_end_date := user_profile.signed_up_at + INTERVAL '7 days';
  IF now() <= trial_end_date THEN
    RETURN 'trial'::subscription_status_enum;
  END IF;

  -- Check for expired subscription
  IF user_profile.subscription_status = 'active' AND 
     user_profile.current_period_ends_at IS NOT NULL AND 
     user_profile.current_period_ends_at <= now() THEN
    RETURN 'expired'::subscription_status_enum;
  END IF;

  -- Check for canceled subscription
  IF user_profile.subscription_status = 'canceled' THEN
    RETURN 'canceled'::subscription_status_enum;
  END IF;

  -- Default to free
  RETURN 'free'::subscription_status_enum;
END;
$$;

-- 5. The Gatekeeper: Uses the Supreme Court to grant or deny access
CREATE OR REPLACE FUNCTION public.can_create_new_goal()
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  current_status subscription_status_enum;
  active_goal_count INTEGER;
  free_tier_limit INTEGER := 2;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Get current subscription status
  current_status := public.get_current_subscription_status();

  -- Trial and active users can create unlimited goals
  IF current_status IN ('trial', 'active') THEN
    RETURN true;
  END IF;

  -- For free users, check against the limit
  SELECT COUNT(*)
  INTO active_goal_count
  FROM public.goals
  WHERE user_id = auth.uid() 
    AND is_archived = false;

  RETURN active_goal_count < free_tier_limit;
END;
$$;

-- 6. The Archiver: The one-time downgrade logic (already exists, update it)
CREATE OR REPLACE FUNCTION public.archive_excess_goals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- 7. Function to queue trial coaching messages
CREATE OR REPLACE FUNCTION public.queue_trial_coaching_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
  trial_day INTEGER;
  message_title TEXT;
  message_content TEXT;
BEGIN
  -- Find all users currently in trial
  FOR user_record IN
    SELECT p.id, p.signed_up_at
    FROM public.profiles p
    WHERE public.get_current_subscription_status() = 'trial'
  LOOP
    -- Calculate trial day (1-7)
    trial_day := EXTRACT(days FROM (now() - user_record.signed_up_at))::INTEGER + 1;
    
    -- Set messages based on trial day
    CASE trial_day
      WHEN 1 THEN
        message_title := 'Welcome to Pro! 🚀';
        message_content := 'You''re now experiencing the full power of Viluuma Pro. Create unlimited goals and let our AI plan your success!';
      WHEN 3 THEN
        message_title := 'You''re building momentum! 💪';
        message_content := 'You''ve already started planning your goals. The habits you''re forming now will compound into amazing results.';
      WHEN 5 THEN
        message_title := 'Don''t lose your progress! ⚡';
        message_content := 'You''ve invested time in your goals. Keep this momentum going - your future self will thank you.';
      WHEN 7 THEN
        message_title := 'Your trial ends today! 🔔';
        message_content := 'You''ve experienced what''s possible with Pro. Continue your journey and unlock your full potential.';
      ELSE
        CONTINUE; -- Skip if no message for this day
    END CASE;

    -- Insert the message if it doesn't already exist
    INSERT INTO public.user_messages (user_id, message_type, title, content, expires_at)
    VALUES (
      user_record.id,
      'trial_coaching',
      message_title,
      message_content,
      now() + INTERVAL '3 days'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- 8. Function to queue "what if" nudges for free users
CREATE OR REPLACE FUNCTION public.queue_what_if_nudges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
  archived_goal RECORD;
BEGIN
  -- Find all free users with archived goals
  FOR user_record IN
    SELECT DISTINCT p.id
    FROM public.profiles p
    JOIN public.goals g ON g.user_id = p.id
    WHERE public.get_current_subscription_status() = 'free'
      AND g.is_archived = true
  LOOP
    -- Get their most recent archived goal
    SELECT title
    INTO archived_goal
    FROM public.goals
    WHERE user_id = user_record.id
      AND is_archived = true
    ORDER BY created_at DESC
    LIMIT 1;

    -- Insert the "what if" message
    INSERT INTO public.user_messages (user_id, message_type, title, content, expires_at)
    VALUES (
      user_record.id,
      'what_if_nudge',
      'Remember "' || archived_goal.title || '"? 🎯',
      'You had big plans for this goal. What if you could pick up right where you left off? Your archived goals are waiting.',
      now() + INTERVAL '7 days'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;