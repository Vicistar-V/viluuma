-- Create the execute_plan_update function for bulk task updates
CREATE OR REPLACE FUNCTION public.execute_plan_update(
  p_tasks_to_update JSONB DEFAULT NULL,  -- Array of { "taskId": ..., "newStartDate": ..., "newEndDate": ... }
  p_task_id_to_delete UUID DEFAULT NULL -- Optional task to delete
) RETURNS void AS $$
DECLARE
  update_rec JSONB;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Update all rescheduled tasks
  IF p_tasks_to_update IS NOT NULL THEN
    FOR update_rec IN SELECT * FROM jsonb_array_elements(p_tasks_to_update)
    LOOP
      UPDATE public.tasks
      SET 
        start_date = CASE 
          WHEN update_rec->>'newStartDate' = 'null' OR update_rec->>'newStartDate' IS NULL 
          THEN NULL 
          ELSE (update_rec->>'newStartDate')::date 
        END,
        end_date = CASE 
          WHEN update_rec->>'newEndDate' = 'null' OR update_rec->>'newEndDate' IS NULL 
          THEN NULL 
          ELSE (update_rec->>'newEndDate')::date 
        END,
        updated_at = now()
      WHERE id = (update_rec->>'taskId')::uuid 
        AND user_id = auth.uid();
    END LOOP;
  END IF;

  -- Delete the specified task if provided
  IF p_task_id_to_delete IS NOT NULL THEN
    DELETE FROM public.tasks 
    WHERE id = p_task_id_to_delete 
      AND user_id = auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;