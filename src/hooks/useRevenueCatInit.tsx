import { useEffect } from "react";
import { Purchases } from "@revenuecat/purchases-capacitor";
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";

// RevenueCat configuration - In production, replace with actual keys
const REVENUECAT_CONFIG = {
  apiKey: "YOUR_REVENUECAT_PUBLIC_API_KEY", // Replace with actual key
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
        
        // Configure RevenueCat
        await Purchases.configure({
          apiKey: REVENUECAT_CONFIG.apiKey,
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