-- Create oauth_credentials table for storing Google OAuth tokens
CREATE TABLE public.oauth_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  expiry_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.oauth_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for secure access (only system can access these credentials)
CREATE POLICY "System access only for oauth_credentials" 
ON public.oauth_credentials 
FOR ALL 
USING (false);

-- Create index on service column for performance
CREATE INDEX idx_oauth_credentials_service ON public.oauth_credentials(service);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_oauth_credentials_updated_at
BEFORE UPDATE ON public.oauth_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();