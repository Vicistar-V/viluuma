-- Fix the validate_goals_row function to use correct column and enum values
CREATE OR REPLACE FUNCTION public.validate_goals_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate modality
  IF NEW.modality NOT IN ('project','checklist') THEN
    RAISE EXCEPTION 'invalid_modality';
  END IF;
  
  -- Validate archive_status (not status)
  IF NEW.archive_status NOT IN ('active','user_archived','system_archived') THEN
    RAISE EXCEPTION 'invalid_archive_status';
  END IF;
  
  -- Validate weekly_hours
  IF NEW.weekly_hours IS NOT NULL AND NEW.weekly_hours < 0 THEN
    RAISE EXCEPTION 'invalid_weekly_hours';
  END IF;
  
  RETURN NEW;
END;
$function$;