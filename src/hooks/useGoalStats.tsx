import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface GoalStats {
  goal_id: string;
  completion_rate: number;
  days_since_created: number;
  days_to_target: number | null;
  is_overdue: boolean;
  total_tasks: number;
  completed_tasks: number;
  remaining_tasks: number;
  status: string;
  modality: string;
}

export interface UserGoalSummary {
  active_goals: number;
  completed_goals: number;
  archived_goals: number;
  total_goals: number;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
}

export const useGoalStats = (goalId: string | null) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['goal-stats', goalId],
    queryFn: async (): Promise<GoalStats> => {
      if (!user || !goalId) throw new Error('User not authenticated or no goal ID');
      
      const { data, error } = await supabase.rpc('get_goal_stats', { goal_uuid: goalId });
      if (error) throw error;
      
      if (data && typeof data === 'object' && 'error' in data) {
        throw new Error((data as any).error);
      }
      
      return data as unknown as GoalStats;
    },
    enabled: !!user && !!goalId,
  });
};

export const useUserGoalSummary = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-goal-summary', user?.id],
    queryFn: async (): Promise<UserGoalSummary> => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.rpc('get_user_goal_summary');
      if (error) throw error;
      
      return data as unknown as UserGoalSummary;
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
  });
};