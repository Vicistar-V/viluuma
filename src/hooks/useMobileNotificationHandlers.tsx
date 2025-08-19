import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from './useNotifications';

export const useMobileNotificationHandlers = () => {
  const navigate = useNavigate();
  const { acknowledgeMessage } = useNotifications();

  useEffect(() => {
    const setupNotificationHandlers = async () => {
      if (Capacitor.isNativePlatform()) {
        // Mobile platform - use Capacitor LocalNotifications
        const actionListener = await LocalNotifications.addListener(
          'localNotificationActionPerformed',
          (notification) => {
            console.log('Mobile notification tapped:', notification);
            handleNotificationTap(notification.notification);
          }
        );

        const receivedListener = await LocalNotifications.addListener(
          'localNotificationReceived',
          (notification) => {
            console.log('Mobile notification received:', notification);
            // Handle notification received while app is open
          }
        );

        return () => {
          actionListener.remove();
          receivedListener.remove();
        };
      } else {
        // Web platform - use custom event listener
        const handleWebNotificationClick = (event: any) => {
          console.log('Web notification clicked:', event.detail);
          handleNotificationTap(event.detail.notification);
        };

        window.addEventListener('notification-clicked', handleWebNotificationClick);
        
        return () => {
          window.removeEventListener('notification-clicked', handleWebNotificationClick);
        };
      }
    };

    const cleanup = setupNotificationHandlers();
    
    return () => {
      cleanup.then(cleanupFn => cleanupFn && cleanupFn());
    };
  }, [navigate, acknowledgeMessage]);

  const handleNotificationTap = (notification: any) => {
    console.log('Handling notification tap:', notification);

    // Handle different notification types based on ID or title
    if (notification.id === 1) {
      // Daily digest - navigate to Today screen
      navigate('/today');
    } else if (notification.title?.includes('Task Reminder')) {
      // Task reminder - navigate to Today screen
      navigate('/today');
    } else if (notification.title?.includes('checking in') || notification.body?.includes('back on track')) {
      // Coaching nudge - navigate to Goals screen
      navigate('/goals');
    } else {
      // Default - navigate to home
      navigate('/');
    }

    // If this is a coaching message, acknowledge it
    if (notification.id && typeof notification.id === 'string' && notification.id.length > 8) {
      acknowledgeMessage(notification.id);
    }
  };

  return {
    handleNotificationTap,
  };
};