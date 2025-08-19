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