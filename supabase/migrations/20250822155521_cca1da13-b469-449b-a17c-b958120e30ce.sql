-- Remove oauth_credentials table and all associated policies
DROP POLICY IF EXISTS "Allow authenticated access to oauth_credentials" ON public.oauth_credentials;
DROP POLICY IF EXISTS "Allow service role access to oauth_credentials" ON public.oauth_credentials;

-- Drop the oauth_credentials table
DROP TABLE IF EXISTS public.oauth_credentials;