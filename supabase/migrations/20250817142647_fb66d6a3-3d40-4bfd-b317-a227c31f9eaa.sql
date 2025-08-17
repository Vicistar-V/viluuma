-- Add RevenueCat-specific fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN revenuecat_user_id TEXT,
ADD COLUMN revenuecat_subscription_id TEXT,
ADD COLUMN revenuecat_original_app_user_id TEXT;