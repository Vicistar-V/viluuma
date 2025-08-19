import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from './useNotifications';

export const useMobileNotificationHandlers = () => {
  const navigate = useNavigate();
  const { acknowledgeMessage } = useNotifications();

  useEffect(() => {
    let actionListener: any;
    let receivedListener: any;
    
    const setupNotificationHandlers = async () => {
      console.log('Setting up mobile notification handlers');
      
      // Mobile-first: Always use Capacitor LocalNotifications
      actionListener = await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (notification) => {
          console.log('Mobile notification tapped:', notification);
          handleNotificationTap(notification.notification);
        }
      );

      receivedListener = await LocalNotifications.addListener(
        'localNotificationReceived',
        (notification) => {
          console.log('Mobile notification received while app is open:', notification);
          // Handle notification received while app is open
        }
      );
    };

    setupNotificationHandlers();
    
    return () => {
      console.log('Cleaning up notification listeners');
      if (actionListener) actionListener.remove();
      if (receivedListener) receivedListener.remove();
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

    // Note: Coaching messages are now auto-acknowledged by useUserMessages
    // No need to double-acknowledge here to prevent conflicts
  };

  return {
    handleNotificationTap,
  };
};