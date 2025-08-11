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
}

const QUERY_KEY = 'goals';

export const useGoals = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!user,
  });
};

export const useUpdateGoalStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ goalId, status }: { goalId: string; status: 'active' | 'archived' | 'completed' }) => {
      const { error } = await supabase
        .from('goals')
        .update({ 
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', goalId);
      
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Goal updated",
        description: `Goal ${status === 'archived' ? 'archived' : status === 'completed' ? 'completed' : 'reactivated'} successfully`
      });
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

export const useDeleteGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (goalId: string) => {
      // First delete all tasks for this goal
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('goal_id', goalId);
      
      if (tasksError) throw tasksError;
      
      // Then delete all milestones for this goal
      const { error: milestonesError } = await supabase
        .from('milestones')
        .delete()
        .eq('goal_id', goalId);
      
      if (milestonesError) throw milestonesError;
      
      // Finally delete the goal
      const { error: goalError } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);
      
      if (goalError) throw goalError;
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