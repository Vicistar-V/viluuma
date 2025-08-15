import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CoachingMessage {
  id: string;
  message_type: string;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
  expires_at: string | null;
}

const QUERY_KEY = 'coaching-messages';

export const useCoachingMessages = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('user_messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CoachingMessage[];
    },
    enabled: !!user,
  });
};

export const useMarkMessageRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('user_messages')
        .update({ is_read: true })
        .eq('id', messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    }
  });
};