import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useRevenueCat } from './useRevenueCat';

export type SubscriptionStatus = 'trial' | 'free' | 'active' | 'canceled' | 'expired';

interface UserStatusContextType {
  subscriptionStatus: SubscriptionStatus | null;
  loading: boolean;
  canCreateGoal: boolean;
  trialDaysLeft: number | null;
  refreshStatus: () => Promise<void>;
  handleDowngrade: () => Promise<void>;
}

const UserStatusContext = createContext<UserStatusContextType | undefined>(undefined);

export const UserStatusProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { customerInfo, isConfigured } = useRevenueCat();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [canCreateGoal, setCanCreateGoal] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [previousStatus, setPreviousStatus] = useState<SubscriptionStatus | null>(null);

  const refreshStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let statusData: SubscriptionStatus;
      
      // Use RevenueCat customer info if configured, otherwise fallback to database
      if (isConfigured && customerInfo) {
        // Map RevenueCat entitlements to subscription status
        const activeEntitlements = customerInfo.entitlements?.active || {};
        const hasActiveSubscription = Object.keys(activeEntitlements).length > 0;
        
        if (hasActiveSubscription) {
          statusData = 'active';
        } else {
          // Check if user is still in trial period
          const { data: profileData } = await supabase
            .from('profiles')
            .select('signed_up_at')
            .eq('id', user.id)
            .single();
            
          if (profileData?.signed_up_at) {
            const signupDate = new Date(profileData.signed_up_at);
            const trialEndDate = new Date(signupDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            const now = new Date();
            
            if (now <= trialEndDate) {
              statusData = 'trial';
            } else {
              statusData = 'free';
            }
          } else {
            statusData = 'trial'; // New user
          }
        }
      } else {
        // Fallback to database status
        const { data, error } = await supabase.rpc('get_current_subscription_status');
        if (error) throw error;
        statusData = data;
      }

      // Get goal creation permission
      const { data: canCreateData, error: canCreateError } = await supabase
        .rpc('can_create_new_goal');

      if (canCreateError) throw canCreateError;

      // Get profile data for trial calculation
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('signed_up_at')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Calculate trial days left
      let daysLeft = null;
      if (statusData === 'trial' && profileData?.signed_up_at) {
        const signupDate = new Date(profileData.signed_up_at);
        const trialEndDate = new Date(signupDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const msLeft = trialEndDate.getTime() - now.getTime();
        daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
      }

      // Check for status change from trial to free (downgrade trigger)
      if (previousStatus === 'trial' && statusData === 'free') {
        handleDowngrade();
      }

      setPreviousStatus(subscriptionStatus);
      setSubscriptionStatus(statusData);
      setCanCreateGoal(canCreateData);
      setTrialDaysLeft(daysLeft);
    } catch (error) {
      console.error('Error fetching user status:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDowngrade = async () => {
    try {
      // Show updating overlay
      toast({
        title: "Updating your account...",
        description: "Please wait while we update your subscription.",
      });

      // Archive excess goals
      const { error } = await supabase.rpc('archive_excess_goals');
      
      if (error) throw error;

      // Refresh status after archiving
      await refreshStatus();

      // Show trial ended notification
      toast({
        title: "Trial Ended",
        description: "Your 7-day Pro trial has ended. Some goals have been archived.",
        variant: "destructive"
      });

    } catch (error) {
      console.error('Error during downgrade:', error);
      toast({
        title: "Error",
        description: "Failed to update account. Please try again.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    refreshStatus();
  }, [user]);

  // Refresh status when RevenueCat customer info changes
  useEffect(() => {
    if (isConfigured && customerInfo) {
      refreshStatus();
    }
  }, [customerInfo, isConfigured]);

  // Refresh status every 5 minutes
  useEffect(() => {
    const interval = setInterval(refreshStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const value = {
    subscriptionStatus,
    loading,
    canCreateGoal,
    trialDaysLeft,
    refreshStatus,
    handleDowngrade
  };

  return (
    <UserStatusContext.Provider value={value}>
      {children}
    </UserStatusContext.Provider>
  );
};

export const useUserStatus = () => {
  const context = useContext(UserStatusContext);
  if (context === undefined) {
    throw new Error('useUserStatus must be used within a UserStatusProvider');
  }
  return context;
};