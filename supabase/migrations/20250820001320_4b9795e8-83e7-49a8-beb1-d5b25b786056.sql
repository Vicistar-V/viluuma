-- Set the current authenticated user to Pro entitlement
UPDATE public.profiles 
SET current_entitlement = 'pro', updated_at = now() 
WHERE id = '858e59f8-6f32-46ef-b2e1-eb7bd5e7b579';