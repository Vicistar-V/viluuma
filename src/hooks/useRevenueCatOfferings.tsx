import { useState, useEffect } from 'react';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { useRevenueCat } from './useRevenueCat';
import { useToast } from './use-toast';

// Use the types from RevenueCat SDK directly
type Package = any; // This will be PurchasesPackage from RevenueCat SDK
type Offering = any; // This will be PurchasesOffering from RevenueCat SDK

export const useRevenueCatOfferings = () => {
  const { isConfigured } = useRevenueCat();
  const { toast } = useToast();
  const [offerings, setOfferings] = useState<Offering | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOfferings = async () => {
      if (!isConfigured || !Capacitor.isNativePlatform()) {
        setLoading(false);
        return;
      }

      try {
        console.log('RevenueCat: Loading offerings...');
        const offeringsData = await Purchases.getOfferings();
        
        if (offeringsData.current) {
          setOfferings(offeringsData.current);
          console.log('RevenueCat: Offerings loaded', offeringsData.current);
        } else {
          console.log('RevenueCat: No current offering found');
          setOfferings(null);
        }
      } catch (error) {
        console.error('RevenueCat: Failed to load offerings', error);
        toast({
          title: "Error Loading Packages",
          description: "Failed to load subscription packages. Please try again later.",
          variant: "destructive"
        });
        setOfferings(null);
      } finally {
        setLoading(false);
      }
    };

    loadOfferings();
  }, [isConfigured, toast]);

  const getPreferredPackage = (): Package | null => {
    if (!offerings) return null;

    // Prefer monthly, then annual, then weekly, then first available
    return offerings.monthly || 
           offerings.annual || 
           offerings.weekly || 
           (offerings.availablePackages && offerings.availablePackages.length > 0 ? offerings.availablePackages[0] : null);
  };

  const getPackageByType = (type: 'monthly' | 'annual' | 'weekly'): Package | null => {
    if (!offerings) return null;
    return offerings[type] || null;
  };

  return {
    offerings,
    loading,
    packages: offerings?.availablePackages || [],
    preferredPackage: getPreferredPackage(),
    getPackageByType,
    hasOfferings: !!offerings && offerings.availablePackages.length > 0
  };
};