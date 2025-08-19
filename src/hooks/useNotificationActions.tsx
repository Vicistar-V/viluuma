import { useEffect, useCallback } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';

export const useNotificationActions = () => {
  const navigate = useNavigate();

  const handleNotificationAction = useCallback((notification: any) => {
    console.log('Notification tapped:', notification);

    // Handle different notification types
    if (notification.id === 1) {
      // Daily digest - navigate to Today screen
      navigate('/today');
    } else if (notification.title?.includes('Task Reminder')) {
      // Task reminder - navigate to Today screen
      navigate('/today');
    } else if (notification.title?.includes('checking in')) {
      // Coaching nudge - navigate to Goals screen
      navigate('/goals');
    } else {
      // Default - navigate to home
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return; // Only set up listeners on native platforms
    }

    let actionListener: any;

    const setupListeners = async () => {
      // Listen for notification actions (taps)
      actionListener = await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (notification) => {
          handleNotificationAction(notification.notification);
        }
      );
    };

    setupListeners();

    return () => {
      if (actionListener) {
        actionListener.remove();
      }
    };
  }, [handleNotificationAction]);

  return {
    handleNotificationAction,
  };
};