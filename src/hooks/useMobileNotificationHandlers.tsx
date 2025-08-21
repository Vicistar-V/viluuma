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
    console.log('Notification details:', {
      id: notification.id,
      title: notification.title,
      body: notification.body
    });

    // Handle different notification types based on ID or title
    if (notification.id === 1 || notification.title?.includes('Daily Digest') || notification.title?.includes('Your Viluuma Daily Digest')) {
      // Daily digest - navigate to Today screen (which is at root route)
      console.log('Navigating to / for daily digest');
      navigate('/');
    } else if (notification.title?.includes('Task Reminder') || notification.body?.includes('task')) {
      // Task reminder - navigate to Today screen (which is at root route)
      console.log('Navigating to / for task reminder');
      navigate('/');
    } else if (notification.title?.includes('checking in') || notification.body?.includes('back on track')) {
      // Coaching nudge - navigate to Goals screen
      console.log('Navigating to /goals for coaching nudge');
      navigate('/goals');
    } else {
      // Default - navigate to home
      console.log('Navigating to / as default');
      navigate('/');
    }

    // Note: Coaching messages are now auto-acknowledged by useUserMessages
    // No need to double-acknowledge here to prevent conflicts
  };

  return {
    handleNotificationTap,
  };
};