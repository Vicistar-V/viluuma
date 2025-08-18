-- Remove subscription-related database functions first
DROP FUNCTION IF EXISTS public.get_current_subscription_status();
DROP FUNCTION IF EXISTS public.queue_trial_coaching_messages();
DROP FUNCTION IF EXISTS public.queue_what_if_nudges();
DROP FUNCTION IF EXISTS public.can_create_new_goal();

-- Remove subscription-related columns from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS subscription_status,
DROP COLUMN IF EXISTS provider_subscription_id,
DROP COLUMN IF EXISTS current_period_ends_at,
DROP COLUMN IF EXISTS revenuecat_user_id,
DROP COLUMN IF EXISTS revenuecat_subscription_id,
DROP COLUMN IF EXISTS revenuecat_original_app_user_id;

-- Drop the subscription status enum type
DROP TYPE IF EXISTS subscription_status_enum;

-- Remove user_messages table entirely as it was only used for subscription messaging
DROP TABLE IF EXISTS public.user_messages;

-- Clean up any subscription-related triggers if they exist
DROP TRIGGER IF EXISTS queue_trial_messages_trigger ON public.profiles;
DROP TRIGGER IF EXISTS queue_what_if_trigger ON public.profiles;