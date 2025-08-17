import { useState, useEffect, createContext, useContext } from 'react';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface RevenueCatContextType {
  isConfigured: boolean;
  packages: any[];
  customerInfo: any | null;
  loading: boolean;
  purchasePackage: (packageToPurchase: any) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshCustomerInfo: () => Promise<void>;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

export const RevenueCatProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConfigured, setIsConfigured] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [customerInfo, setCustomerInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // RevenueCat configuration
  useEffect(() => {
    const configureRevenueCat = async () => {
      if (!Capacitor.isNativePlatform()) {
        console.log('RevenueCat: Running in web environment, skipping native configuration');
        setLoading(false);
        return;
      }

      try {
        console.log('RevenueCat: Configuring SDK...');
        
        // Configure RevenueCat
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        
        // Initialize with platform-specific API keys
        const iosApiKey = 'appl_PHzBRgcKvgbCjhXTLNOZUJHLNxO'; // RevenueCat iOS API key
        const androidApiKey = 'goog_yZJDWNmCGGKGqLxCVXkKiMRvLUG'; // RevenueCat Android API key
        
        if (Capacitor.getPlatform() === 'ios') {
          await Purchases.configure({
            apiKey: iosApiKey,
            appUserID: user?.id || undefined,
          });
        } else if (Capacitor.getPlatform() === 'android') {
          await Purchases.configure({
            apiKey: androidApiKey,
            appUserID: user?.id || undefined,
          });
        }

        console.log('RevenueCat: SDK configured successfully');
        setIsConfigured(true);

        // Set up listener for customer info updates
        Purchases.addCustomerInfoUpdateListener((info) => {
          console.log('RevenueCat: Customer info updated', info);
          setCustomerInfo(info);
        });

        // Load initial data
        await refreshCustomerInfo();
        await loadPackages();

      } catch (error) {
        console.error('RevenueCat: Configuration failed', error);
        toast({
          title: "Configuration Error",
          description: "Failed to configure RevenueCat SDK",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    configureRevenueCat();
  }, [user, toast]);

  // Identify user when auth state changes
  useEffect(() => {
    const identifyUser = async () => {
      if (!isConfigured || !user) return;

      try {
        console.log('RevenueCat: Identifying user', user.id);
        await Purchases.logIn({ appUserID: user.id });
        await refreshCustomerInfo();
      } catch (error) {
        console.error('RevenueCat: Failed to identify user', error);
      }
    };

    identifyUser();
  }, [user, isConfigured]);

  const loadPackages = async () => {
    if (!isConfigured) return;

    try {
      console.log('RevenueCat: Loading packages...');
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current) {
        setPackages(offerings.current.availablePackages);
        console.log('RevenueCat: Packages loaded', offerings.current.availablePackages);
      } else {
        console.log('RevenueCat: No current offering found');
        setPackages([]);
      }
    } catch (error) {
      console.error('RevenueCat: Failed to load packages', error);
      setPackages([]);
    }
  };

  const refreshCustomerInfo = async () => {
    if (!isConfigured) return;

    try {
      console.log('RevenueCat: Refreshing customer info...');
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      console.log('RevenueCat: Customer info refreshed', info);
    } catch (error) {
      console.error('RevenueCat: Failed to refresh customer info', error);
    }
  };

  const purchasePackage = async (packageToPurchase: any): Promise<boolean> => {
    if (!isConfigured) {
      toast({
        title: "Error",
        description: "RevenueCat not configured",
        variant: "destructive"
      });
      return false;
    }

    try {
      console.log('RevenueCat: Purchasing package', packageToPurchase);
      
      const purchaseResult = await Purchases.purchasePackage({
        aPackage: packageToPurchase
      });

      console.log('RevenueCat: Purchase successful', purchaseResult);
      
      setCustomerInfo(purchaseResult.customerInfo);
      
      toast({
        title: "Purchase Successful!",
        description: "Your subscription is now active.",
      });

      return true;
    } catch (error: any) {
      console.error('RevenueCat: Purchase failed', error);
      
      if (error.userCancelled) {
        toast({
          title: "Purchase Cancelled",
          description: "The purchase was cancelled.",
        });
      } else {
        toast({
          title: "Purchase Failed",
          description: error.message || "An error occurred during purchase.",
          variant: "destructive"
        });
      }
      
      return false;
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    if (!isConfigured) {
      toast({
        title: "Error",
        description: "RevenueCat not configured",
        variant: "destructive"
      });
      return false;
    }

    try {
      console.log('RevenueCat: Restoring purchases...');
      
      const restoreResult = await Purchases.restorePurchases();
      setCustomerInfo(restoreResult.customerInfo);
      
      console.log('RevenueCat: Purchases restored', restoreResult.customerInfo);
      
      toast({
        title: "Purchases Restored",
        description: "Your purchases have been restored successfully.",
      });

      return true;
    } catch (error: any) {
      console.error('RevenueCat: Failed to restore purchases', error);
      
      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore purchases.",
        variant: "destructive"
      });
      
      return false;
    }
  };

  const value = {
    isConfigured,
    packages,
    customerInfo,
    loading,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo
  };

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
};

export const useRevenueCat = () => {
  const context = useContext(RevenueCatContext);
  if (context === undefined) {
    throw new Error('useRevenueCat must be used within a RevenueCatProvider');
  }
  return context;
};