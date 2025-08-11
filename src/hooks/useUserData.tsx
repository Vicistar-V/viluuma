import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Query keys for consistent caching
export const QUERY_KEYS = {
  userData: (userId?: string) => ['userData', userId] as const,
  profileSummary: (userId?: string) => ['profileSummary', userId] as const,
} as const;

// Types for our data structures
export interface UserProfile {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  created_at: string;
  updated_at: string;
  account_age_days: number;
}

export interface UserPreferences {
  theme: 'system' | 'light' | 'dark';
  notifications: boolean;
}

export interface UserData {
  profile: UserProfile | null;
  stats: UserStats;
  preferences: UserPreferences;
  metadata: {
    last_fetch: string;
    user_id: string;
    profile_exists?: boolean;
  };
}

// Hook to fetch complete user data with caching
export const useUserData = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: QUERY_KEYS.userData(targetUserId),
    queryFn: async (): Promise<UserData> => {
      if (!targetUserId) {
        throw new Error('No user ID provided');
      }

      const { data, error } = await supabase.rpc('get_user_data', {
        user_uuid: targetUserId
      });

      if (error) {
        throw new Error(`Failed to fetch user data: ${error.message}`);
      }

      return data as unknown as UserData;
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

// Hook for lighter profile summary with caching
export const useProfileSummary = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: QUERY_KEYS.profileSummary(targetUserId),
    queryFn: async () => {
      if (!targetUserId) {
        throw new Error('No user ID provided');
      }

      const { data, error } = await supabase.rpc('get_profile_summary', {
        user_uuid: targetUserId
      });

      if (error) {
        throw new Error(`Failed to fetch profile summary: ${error.message}`);
      }

      return data;
    },
    enabled: !!targetUserId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

// Hook to update profile with cache invalidation
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Pick<UserProfile, 'display_name'>>) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update profile: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch both user data and profile summary
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.userData(user?.id)
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.profileSummary(user?.id)
      });
    },
  });
};

// Hook to prefetch user data
export const usePrefetchUserData = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const prefetchUserData = async (userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return;

    await queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.userData(targetUserId),
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_user_data', {
          user_uuid: targetUserId
        });

        if (error) {
          throw new Error(`Failed to prefetch user data: ${error.message}`);
        }

        return data as unknown as UserData;
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  return { prefetchUserData };
};

// Cache management utilities
export const useDataCache = () => {
  const queryClient = useQueryClient();

  const clearUserCache = (userId?: string) => {
    queryClient.removeQueries({
      queryKey: QUERY_KEYS.userData(userId)
    });
    queryClient.removeQueries({
      queryKey: QUERY_KEYS.profileSummary(userId)
    });
  };

  const refreshUserData = async (userId?: string) => {
    await queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.userData(userId)
    });
    await queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.profileSummary(userId)
    });
  };

  const getCachedUserData = (userId?: string): UserData | undefined => {
    return queryClient.getQueryData(QUERY_KEYS.userData(userId));
  };

  return {
    clearUserCache,
    refreshUserData,
    getCachedUserData,
  };
};