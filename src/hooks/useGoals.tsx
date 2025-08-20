import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  modality: 'project' | 'checklist';
  status: 'active' | 'archived' | 'completed';
  target_date: string | null;
  weekly_hours: number | null;
  total_tasks: number;
  completed_tasks: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  user_id: string;
  archive_status: 'active' | 'user_archived' | 'system_archived';
}

export interface GoalCompletionStats {
  goal_id: string;
  tasks_completed: number;
  total_tasks: number;
  completed_at: string;
}

export interface GoalReopenStats {
  goal_id: string;
  tasks_reopened: number;
  total_tasks: number;
  reopened_at: string;
}

const QUERY_KEY = 'goals';

export const useGoals = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('goals_with_computed_status')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!user,
  });
};

export const useArchiveGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase.rpc('archive_goal', { p_goal_id: goalId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Goal archived",
        description: "Goal archived successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to archive goal",
        variant: "destructive"
      });
    }
  });
};

export const useUpdateGoalStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation<GoalCompletionStats | undefined, Error, { goalId: string; status: 'active' | 'archived' | 'completed' }>({
    mutationFn: async ({ goalId, status }: { goalId: string; status: 'active' | 'archived' | 'completed' }) => {
      if (status === 'archived') {
        // Use the dedicated archive function
        const { error } = await supabase.rpc('archive_goal', { p_goal_id: goalId });
        if (error) throw error;
      } else if (status === 'active') {
        // Reactivate by setting archive status to active
        const { error } = await supabase
          .from('goals')
          .update({ archive_status: 'active' })
          .eq('id', goalId);
        if (error) throw error;
      } else if (status === 'completed') {
        // Use blazing fast batch completion function
        const { data, error } = await supabase.rpc('complete_all_goal_tasks', { p_goal_id: goalId });
        if (error) throw error;
        return data as unknown as GoalCompletionStats;
      }
      return undefined;
    },
    onSuccess: (data, { status }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      
      if (status === 'completed' && data) {
        toast({
          title: "Goal completed! 🎉",
          description: `${data.tasks_completed} tasks marked as complete`
        });
      } else {
        toast({
          title: "Goal updated",
          description: `Goal ${status === 'archived' ? 'archived' : status === 'completed' ? 'completed' : 'reactivated'} successfully`
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update goal status",
        variant: "destructive"
      });
    }
  });
};

export const useReopenGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (goalId: string) => {
      const { data, error } = await supabase.rpc('uncomplete_all_goal_tasks', { p_goal_id: goalId });
      if (error) throw error;
      return data as unknown as GoalReopenStats;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Goal reopened! 🔄",
        description: `${data.tasks_reopened} tasks marked as pending`
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reopen goal",
        variant: "destructive"
      });
    }
  });
};

export const usePermanentlyDeleteGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase.rpc('permanently_delete_goal', { p_goal_id: goalId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Goal permanently deleted",
        description: "Goal and all associated data permanently deleted"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to permanently delete goal",
        variant: "destructive"
      });
    }
  });
};

export const useDeleteGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase.rpc('permanently_delete_goal', { p_goal_id: goalId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Goal deleted",
        description: "Goal and all associated data deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete goal",
        variant: "destructive"
      });
    }
  });
};