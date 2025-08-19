import { useEffect } from "react";
import { Purchases } from "@revenuecat/purchases-capacitor";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";

// RevenueCat PUBLIC API keys (these are safe to embed in client code)
const REVENUECAT_API_KEYS = {
  ios: 'appl_YOUR_IOS_PUBLIC_KEY_HERE', // Replace with actual iOS public key from RevenueCat
  android: 'goog_YOUR_ANDROID_PUBLIC_KEY_HERE', // Replace with actual Android public key from RevenueCat
};

// Get platform-specific RevenueCat PUBLIC API key
const getRevenueCatApiKey = (): string => {
  const platform = Capacitor.getPlatform();
  
  if (platform === 'ios') {
    return REVENUECAT_API_KEYS.ios;
  } else if (platform === 'android') {
    return REVENUECAT_API_KEYS.android;
  } else {
    // Web fallback - use iOS key for development
    console.log('Using web platform, defaulting to iOS key');
    return REVENUECAT_API_KEYS.ios;
  }
};

const REVENUECAT_CONFIG = {
  entitlementIdentifier: "pro"
};

export const useRevenueCatInit = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const initializeRevenueCat = async () => {
      if (!user) return;

      try {
        console.log('Initializing RevenueCat for user:', user.id);
        console.log('Platform:', Capacitor.getPlatform());
        
        // Get platform-specific API key
        const apiKey = getRevenueCatApiKey();
        
        // Configure RevenueCat
        await Purchases.configure({
          apiKey,
          appUserID: user.id
        });

        // Set up listener for customer info updates
        Purchases.addCustomerInfoUpdateListener((customerInfo) => {
          console.log('RevenueCat customer info updated:', customerInfo);
          
          // Invalidate subscription queries to refresh UI
          queryClient.invalidateQueries({ queryKey: ['subscription'] });
          queryClient.invalidateQueries({ queryKey: ['goals'] });
        });

        console.log('RevenueCat initialized successfully');
      } catch (error) {
        console.error('Failed to initialize RevenueCat:', error);
        // Don't throw - fail gracefully for better UX
      }
    };

    initializeRevenueCat();
  }, [user, queryClient]);
};