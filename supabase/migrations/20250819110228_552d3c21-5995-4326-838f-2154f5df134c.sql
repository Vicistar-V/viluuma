-- Create new simplified acknowledge function
CREATE OR REPLACE FUNCTION public.acknowledge_message(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  UPDATE public.user_messages
  SET 
    is_acknowledged = true, 
    acknowledged_at = now(),
    updated_at = now()
  WHERE id = p_message_id 
    AND user_id = auth.uid()
    AND is_acknowledged = false;
END;
$function$;