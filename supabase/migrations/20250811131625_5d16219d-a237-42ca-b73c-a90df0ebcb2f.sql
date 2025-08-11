-- Create atomic RPC function to fetch user data
CREATE OR REPLACE FUNCTION public.get_user_data(user_uuid UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  target_user_id UUID;
  result JSON;
BEGIN
  -- Use provided UUID or default to current authenticated user
  target_user_id := COALESCE(user_uuid, auth.uid());
  
  -- Check if user is authenticated when no UUID provided
  IF user_uuid IS NULL AND auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Fetch all user data atomically
  SELECT json_build_object(
    'profile', row_to_json(p.*),
    'stats', json_build_object(
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'account_age_days', EXTRACT(days FROM (now() - p.created_at))
    ),
    'preferences', json_build_object(
      'theme', 'system',
      'notifications', true
    ),
    'metadata', json_build_object(
      'last_fetch', now(),
      'user_id', target_user_id
    )
  ) INTO result
  FROM public.profiles p
  WHERE p.id = target_user_id;
  
  -- Return empty structure if profile not found
  IF result IS NULL THEN
    result := json_build_object(
      'profile', NULL,
      'stats', json_build_object(),
      'preferences', json_build_object(
        'theme', 'system',
        'notifications', true
      ),
      'metadata', json_build_object(
        'last_fetch', now(),
        'user_id', target_user_id,
        'profile_exists', false
      )
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Create a faster profile lookup function
CREATE OR REPLACE FUNCTION public.get_profile_summary(user_uuid UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  target_user_id UUID;
  result JSON;
BEGIN
  target_user_id := COALESCE(user_uuid, auth.uid());
  
  IF user_uuid IS NULL AND auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  SELECT json_build_object(
    'id', p.id,
    'display_name', p.display_name,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  ) INTO result
  FROM public.profiles p
  WHERE p.id = target_user_id;
  
  RETURN COALESCE(result, json_build_object('exists', false));
END;
$$;