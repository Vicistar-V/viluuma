-- Fix the get_cron_job_status function to properly query execution history
CREATE OR REPLACE FUNCTION public.get_cron_job_status()
RETURNS TABLE(jobname text, schedule text, active boolean, last_run timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    cron.jobname::TEXT,
    cron.schedule::TEXT,
    cron.active,
    COALESCE(runs.last_execution, NULL) as last_run
  FROM cron.job AS cron
  LEFT JOIN (
    SELECT 
      jobid,
      MAX(start_time) as last_execution
    FROM cron.job_run_details 
    GROUP BY jobid
  ) runs ON cron.jobid = runs.jobid
  WHERE cron.jobname IN ('daily-slump-detection', 'daily-momentum-detection', 'deadline-warning-detection');
END;
$function$