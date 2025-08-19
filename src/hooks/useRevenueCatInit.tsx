import { useEffect } from "react";
import { Purchases } from "@revenuecat/purchases-capacitor";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Get platform-specific RevenueCat API key
const getRevenueCatApiKey = async (): Promise<string> => {
  const platform = Capacitor.getPlatform();
  
  if (platform === 'ios') {
    const { data, error } = await supabase.functions.invoke('get-secret', {
      body: { name: 'REVENUECAT_IOS_API_KEY' }
    });
    if (error || !data?.value) {
      console.error('Failed to get iOS RevenueCat key:', error);
      throw new Error(`Failed to get iOS RevenueCat API key: ${error?.message || 'No key found'}`);
    }
    return data.value;
  } else if (platform === 'android') {
    const { data, error } = await supabase.functions.invoke('get-secret', {
      body: { name: 'REVENUECAT_ANDROID_API_KEY' }
    });
    if (error || !data?.value) {
      console.error('Failed to get Android RevenueCat key:', error);
      throw new Error(`Failed to get Android RevenueCat API key: ${error?.message || 'No key found'}`);
    }
    return data.value;
  } else {
    // Web fallback - use iOS key for development
    console.log('Using web platform, defaulting to iOS key');
    const { data, error } = await supabase.functions.invoke('get-secret', {
      body: { name: 'REVENUECAT_IOS_API_KEY' }
    });
    if (error || !data?.value) {
      console.error('Failed to get iOS RevenueCat key for web:', error);
      throw new Error(`Failed to get iOS RevenueCat API key for web: ${error?.message || 'No key found'}`);
    }
    return data.value;
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
        const apiKey = await getRevenueCatApiKey();
        
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