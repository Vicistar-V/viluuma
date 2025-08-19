import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cleanupTaskReminder } from '@/lib/taskReminderCleanup';

export interface TodayTask {
  id: string;
  goal_id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed';
  start_date: string | null;
  end_date: string | null;
  priority: 'high' | 'medium' | 'low' | null;
  is_anchored: boolean;
  goal_title: string;
  task_type: 'overdue' | 'due_today' | 'in_progress' | 'starting_today' | 'scheduled' | 'checklist';
  display_status?: 'overdue' | 'due_today' | 'in_progress' | 'starting_today' | 'scheduled' | 'checklist';
}

export interface TodayPayload {
  todayTasks: TodayTask[];
  overdueCount: number;
}

export interface OverdueTask {
  id: string;
  goal_id: string;
  milestone_id: string;
  user_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  start_date: string;
  end_date: string;
  duration_hours: number;
  is_anchored: boolean;
  created_at: string;
  updated_at: string;
  goal_title: string;
}

// Hook for the main today page payload (blazing fast single call)
export const useTodayData = () => {
  return useQuery({
    queryKey: ['todayPayload'],
    queryFn: async (): Promise<TodayPayload> => {
      const { data, error } = await supabase.rpc('get_today_page_payload' as any);
      if (error) throw error;
      return data as unknown as TodayPayload;
    },
    staleTime: 60 * 1000, // 1 minute - fresh for quick tab switches
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
  });
};

// Hook for overdue tasks (called only when accordion expands)
export const useOverdueTasks = () => {
  return useQuery({
    queryKey: ['overdueTasks'],
    queryFn: async (): Promise<OverdueTask[]> => {
      const { data, error } = await supabase.rpc('get_all_overdue_tasks' as any);
      if (error) throw error;
      return data as unknown as OverdueTask[];
    },
    enabled: false, // Only fetch when explicitly called
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook for completing tasks
export const useCompleteTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      if (error) throw error;
      return taskId;
    },
    onSuccess: async (taskId) => {
      // Clean up any task reminders first
      await cleanupTaskReminder(taskId);
      
      // Invalidate all related queries to trigger fresh data
      queryClient.invalidateQueries({ queryKey: ['todayPayload'] });
      queryClient.invalidateQueries({ queryKey: ['overdueTasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      
      toast({
        title: "Task completed!",
        description: "Great work! Keep it up.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to complete task. Please try again.",
        variant: "destructive",
      });
      console.error('Error completing task:', error);
    },
  });
};

// Hook for uncompleting tasks (in case of accidental completion)
export const useUncompleteTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['todayPayload'] });
      queryClient.invalidateQueries({ queryKey: ['overdueTasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      
      toast({
        title: "Task marked as pending",
        description: "Task moved back to your active list.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
      console.error('Error uncompleting task:', error);
    },
  });
};