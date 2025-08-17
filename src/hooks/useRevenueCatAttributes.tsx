import { useEffect } from 'react';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './useAuth';
import { useRevenueCat } from './useRevenueCat';

export const useRevenueCatAttributes = () => {
  const { user } = useAuth();
  const { isConfigured } = useRevenueCat();

  useEffect(() => {
    const setUserAttributes = async () => {
      if (!user || !isConfigured || !Capacitor.isNativePlatform()) {
        return;
      }

      try {
        // Set user attributes for analytics and segmentation
        await Purchases.setAttributes({
          '$email': user.email || '',
          '$displayName': user.user_metadata?.display_name || user.email || '',
          '$userId': user.id,
          '$platform': Capacitor.getPlatform(),
          '$appVersion': '1.0.0', // You can get this from your app config
          '$signupDate': user.created_at || new Date().toISOString(),
        });

        console.log('RevenueCat: User attributes set successfully');
      } catch (error) {
        console.error('RevenueCat: Failed to set user attributes', error);
      }
    };

    setUserAttributes();
  }, [user, isConfigured]);

  const setCustomAttribute = async (key: string, value: string) => {
    if (!isConfigured || !Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await Purchases.setAttributes({ [key]: value });
      console.log(`RevenueCat: Custom attribute ${key} set to ${value}`);
    } catch (error) {
      console.error(`RevenueCat: Failed to set custom attribute ${key}`, error);
    }
  };

  return {
    setCustomAttribute
  };
};