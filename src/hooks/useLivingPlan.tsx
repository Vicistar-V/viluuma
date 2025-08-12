import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface RescheduleResponse {
  status: 'success' | 'reschedule_conflict' | 'error';
  updatedTasks?: Array<{
    taskId: string;
    newStartDate: string;
    newEndDate: string | null;
  }>;
  conflictInfo?: {
    compressionNeeded: number;
    anchoredTaskId: string;
    anchoredTaskTitle: string;
  };
  message?: string;
  error?: string;
}

interface DeleteResponse {
  status: 'success' | 'dependency_conflict' | 'error';
  taskIdToDelete?: string;
  updatedTasks?: Array<{
    taskId: string;
    newStartDate: string;
    newEndDate: string | null;
  }>;
  timeSavedInDays?: number;
  dependencyIssues?: string[];
  message?: string;
  error?: string;
}

export const useLivingPlan = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const rescheduleTask = async (taskId: string, newStartDate: string): Promise<RescheduleResponse> => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('reschedule-task', {
        body: { taskId, newStartDate }
      });

      if (error) throw error;
      return data as RescheduleResponse;
    } catch (error: any) {
      console.error('Failed to calculate reschedule:', error);
      toast({
        title: "Reschedule Failed",
        description: error.message || "Failed to calculate new schedule",
        variant: "destructive"
      });
      return { status: 'error', error: error.message };
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteAndRefactor = async (taskIdToDelete: string): Promise<DeleteResponse> => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-and-refactor-plan', {
        body: { taskIdToDelete }
      });

      if (error) throw error;
      return data as DeleteResponse;
    } catch (error: any) {
      console.error('Failed to calculate deletion impact:', error);
      toast({
        title: "Delete Failed", 
        description: error.message || "Failed to calculate deletion impact",
        variant: "destructive"
      });
      return { status: 'error', error: error.message };
    } finally {
      setIsProcessing(false);
    }
  };

  const commitPlanUpdate = async (
    tasksToUpdate?: Array<{ taskId: string; newStartDate: string; newEndDate: string | null }>,
    taskIdToDelete?: string
  ): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc('execute_plan_update', {
        p_tasks_to_update: tasksToUpdate || null,
        p_task_id_to_delete: taskIdToDelete || null
      });

      if (error) throw error;
      
      toast({
        title: "Plan Updated",
        description: taskIdToDelete ? 
          "Task deleted and schedule adjusted successfully" :
          "Tasks rescheduled successfully"
      });
      
      return true;
    } catch (error: any) {
      console.error('Failed to commit plan update:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update your plan",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    rescheduleTask,
    deleteAndRefactor,
    commitPlanUpdate
  };
};