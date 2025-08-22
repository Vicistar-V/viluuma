-- Fix RLS policy for oauth_credentials to allow edge function access
DROP POLICY IF EXISTS "System access only for oauth_credentials" ON public.oauth_credentials;

-- Create new RLS policy that allows service role access (for edge functions)
CREATE POLICY "Allow service role access to oauth_credentials" 
ON public.oauth_credentials 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Also allow authenticated users to read their own credentials if needed in future
CREATE POLICY "Allow authenticated access to oauth_credentials" 
ON public.oauth_credentials 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Insert initial Google OAuth credentials if they don't exist
INSERT INTO public.oauth_credentials (service, access_token, refresh_token, token_type, expiry_date)
SELECT 
  'gemini',
  'placeholder_access_token',
  'placeholder_refresh_token', 
  'Bearer',
  NOW() - INTERVAL '1 day'  -- Expired so it will refresh on first use
WHERE NOT EXISTS (
  SELECT 1 FROM public.oauth_credentials WHERE service = 'gemini'
);