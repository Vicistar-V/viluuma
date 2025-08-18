-- STEP 1: Create the user_messages table (The "Mailbox")
CREATE TABLE public.user_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message_type TEXT NOT NULL, -- e.g., 'slump_detector', 'trial_coach_day_3'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  
  -- The status tracks the message's lifecycle
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' -> 'delivered' -> 'acknowledged'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Security: Users can only see and manage their own messages
ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own messages" ON public.user_messages FOR ALL
  USING (auth.uid() = user_id);

-- Performance: Create an index for quickly finding pending messages for a user
CREATE INDEX idx_user_messages_pending ON public.user_messages (user_id, status);

-- STEP 2: The Backend Detective (Slump Detector Function)
CREATE OR REPLACE FUNCTION public.detect_and_queue_slumps()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- We use a CTE (Common Table Expression) to make the logic clear
  WITH struggling_users AS (
    -- Step 1: Find all users who have at least one project task
    -- that was due to be FINISHED 3 or more days ago
    SELECT DISTINCT user_id
    FROM public.tasks
    WHERE status = 'pending'
      AND end_date <= (CURRENT_DATE - INTERVAL '3 days')
  ),
  users_without_pending_nudge AS (
    -- Step 2: From that list, filter out anyone who ALREADY has a
    -- pending slump detector message in their mailbox. This prevents spam
    SELECT user_id FROM struggling_users su
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_messages
      WHERE user_id = su.user_id
        AND message_type = 'slump_detector'
        AND status = 'pending'
    )
  )
  -- Step 3: For the final list of users, insert a new message into their mailbox
  INSERT INTO public.user_messages (user_id, message_type, title, body)
  SELECT
    user_id,
    'slump_detector', -- The message type
    'Just checking in 👋', -- The message title
    'Hey, it looks like things might have been a bit busy lately. That''s totally okay! If you''re feeling stuck, try focusing on just one small task to get the momentum rolling again.'
  FROM users_without_pending_nudge;
END;
$$;

-- STEP 3: Helper functions for the intelligence payload

-- Helper 1: A fast summary for the morning digest
CREATE OR REPLACE FUNCTION public.get_today_tasks_summary()
RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_task_count INT;
  v_first_task_title TEXT;
  result JSONB;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  -- Ensure user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Get today's task count and first task title
  SELECT 
    COUNT(*)::INT,
    MIN(t.title) -- Get the first task title (by creation order)
  INTO v_task_count, v_first_task_title
  FROM public.tasks t 
  JOIN public.goals g ON t.goal_id = g.id
  WHERE t.user_id = v_user_id 
    AND t.status = 'pending' 
    AND (
      t.end_date = CURRENT_DATE OR  -- Due today
      t.start_date = CURRENT_DATE OR  -- Starting today
      (t.start_date <= CURRENT_DATE AND t.end_date > CURRENT_DATE)  -- In progress
    );

  -- Build result
  result := jsonb_build_object(
    'taskCount', COALESCE(v_task_count, 0),
    'firstTaskTitle', COALESCE(v_first_task_title, 'No tasks scheduled'),
    'generatedAt', now()
  );
  
  RETURN result;
END;
$$;

-- Helper 2: The atomic "get and claim" function for messages
CREATE OR REPLACE FUNCTION public.get_next_pending_message()
RETURNS SETOF public.user_messages 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_message_id UUID;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  -- Ensure user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Atomically find and claim the oldest pending message
  SELECT id INTO v_message_id
  FROM public.user_messages
  WHERE user_id = v_user_id 
    AND status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- If we found a message, update its status and return it
  IF v_message_id IS NOT NULL THEN
    UPDATE public.user_messages
    SET status = 'delivered', updated_at = now()
    WHERE id = v_message_id;

    RETURN QUERY
    SELECT * FROM public.user_messages
    WHERE id = v_message_id;
  END IF;
END;
$$;

-- Function to acknowledge a message
CREATE OR REPLACE FUNCTION public.acknowledge_message(p_message_id UUID)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Update the message status to acknowledged
  UPDATE public.user_messages
  SET status = 'acknowledged', updated_at = now()
  WHERE id = p_message_id 
    AND user_id = auth.uid();
END;
$$;

-- Trigger to update the updated_at column
CREATE TRIGGER update_user_messages_updated_at
  BEFORE UPDATE ON public.user_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();