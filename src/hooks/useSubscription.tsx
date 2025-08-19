import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Purchases } from "@revenuecat/purchases-capacitor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface SubscriptionState {
  entitlement: 'free' | 'pro';
  isLoading: boolean;
  canCreateGoals: boolean;
  activeGoalCount: number;
  maxGoals: number;
}

const QUERY_KEY = 'subscription';

export const useSubscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscriptionState, isLoading } = useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async (): Promise<SubscriptionState> => {
      if (!user) {
        return {
          entitlement: 'free',
          isLoading: false,
          canCreateGoals: false,
          activeGoalCount: 0,
          maxGoals: 0
        };
      }

      // Get user's profile with current entitlement
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('current_entitlement')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw profileError;
      }

      // Count active goals
      const { count: activeGoalCount = 0, error: countError } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('archive_status', 'active');

      if (countError) {
        console.error('Error counting goals:', countError);
        throw countError;
      }

      const entitlement = profile?.current_entitlement as 'free' | 'pro' || 'free';
      const maxGoals = entitlement === 'pro' ? 999 : 2;
      const canCreateGoals = entitlement === 'pro' || activeGoalCount < 2;

      return {
        entitlement,
        isLoading: false,
        canCreateGoals,
        activeGoalCount,
        maxGoals
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    ...subscriptionState,
    isLoading: isLoading || subscriptionState?.isLoading
  };
};

export const useRevenueCat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize RevenueCat
  useEffect(() => {
    const initializeRevenueCat = async () => {
      if (!user) return;

      try {
        console.log('Initializing RevenueCat...');
        
        // Configure RevenueCat with public API key
        await Purchases.configure({
          apiKey: "YOUR_REVENUECAT_PUBLIC_API_KEY", // This will be set in production
          appUserID: user.id
        });

        // Set up listener for customer info updates
        Purchases.addCustomerInfoUpdateListener((customerInfo) => {
          console.log('Customer info updated:', customerInfo);
          // Invalidate subscription queries to refresh
          queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        });

        setIsInitialized(true);
        console.log('RevenueCat initialized successfully');
      } catch (error) {
        console.error('Failed to initialize RevenueCat:', error);
      }
    };

    initializeRevenueCat();
  }, [user, queryClient]);

  const syncSubscription = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      console.log('Syncing subscription status...');
      
      const response = await supabase.functions.invoke('sync-revenuecat-subscription', {
        body: {}
      });

      if (response.error) {
        throw response.error;
      }

      return response.data;
    },
    onSuccess: (data) => {
      console.log('Subscription synced successfully:', data);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      
      if (data?.entitlement === 'pro') {
        toast({
          title: "Welcome to Pro! 🎉",
          description: "You now have unlimited goals and premium features"
        });
      }
    },
    onError: (error: any) => {
      console.error('Failed to sync subscription:', error);
      toast({
        title: "Sync Failed",
        description: "We couldn't verify your subscription. Please try again.",
        variant: "destructive"
      });
    }
  });

  const purchasePro = useMutation({
    mutationFn: async () => {
      if (!isInitialized) {
        throw new Error('RevenueCat not initialized');
      }

      console.log('Starting purchase flow...');
      
      // Get available offerings
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;
      
      if (!currentOffering?.availablePackages?.length) {
        throw new Error('No packages available for purchase');
      }

      // Purchase the first available package (typically monthly)
      const proPackage = currentOffering.availablePackages[0];
      const purchaseResult = await Purchases.purchasePackage({
        aPackage: proPackage
      });

      return purchaseResult;
    },
    onSuccess: async (purchaseResult) => {
      console.log('Purchase successful:', purchaseResult);
      
      // Immediately sync subscription status
      await syncSubscription.mutateAsync();
    },
    onError: (error: any) => {
      console.error('Purchase failed:', error);
      
      // Handle different error types
      if (error.code === 'PURCHASE_CANCELLED') {
        // User cancelled - don't show error
        return;
      }
      
      toast({
        title: "Purchase Failed",
        description: error.message || "Unable to complete purchase. Please try again.",
        variant: "destructive"
      });
    }
  });

  const restorePurchases = useMutation({
    mutationFn: async () => {
      if (!isInitialized) {
        throw new Error('RevenueCat not initialized');
      }

      console.log('Restoring purchases...');
      const customerInfo = await Purchases.restorePurchases();
      return customerInfo;
    },
    onSuccess: async () => {
      console.log('Purchases restored successfully');
      await syncSubscription.mutateAsync();
      
      toast({
        title: "Purchases Restored",
        description: "Your subscription has been restored successfully"
      });
    },
    onError: (error: any) => {
      console.error('Failed to restore purchases:', error);
      toast({
        title: "Restore Failed",
        description: "Unable to restore purchases. Please try again.",
        variant: "destructive"
      });
    }
  });

  return {
    isInitialized,
    purchasePro,
    syncSubscription,
    restorePurchases,
    isLoading: purchasePro.isPending || syncSubscription.isPending || restorePurchases.isPending
  };
};