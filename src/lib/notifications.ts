import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';

// Mobile-first notification service using Capacitor LocalNotifications with background task support
class MobileNotificationService {
  async requestPermissions() {
    console.log('Mobile-first notification service: Requesting permissions');
    try {
      // Use Capacitor's LocalNotifications for permission request
      const permission = await LocalNotifications.requestPermissions();
      console.log('Notification permissions:', permission);
      return permission;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return { display: 'denied' };
    }
  }

  async checkPermissions() {
    try {
      const permission = await LocalNotifications.checkPermissions();
      console.log('Current notification permission status:', permission);
      return permission;
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      throw error;
    }
  }

  async schedule({ notifications }: { notifications: any[] }) {
    console.log('Mobile-first notification service: Scheduling notifications:', notifications);
    
    try {
      // Double-check permissions before scheduling
      const permission = await this.checkPermissions();
      if (permission.display !== 'granted') {
        console.warn('Cannot schedule notifications - permission not granted');
        return { notifications: [] };
      }

      // Enhanced notifications with high visibility settings
      const enhancedNotifications = notifications.map(notification => ({
        ...notification,
        // High importance for pop-up visibility
        importance: 5, // Maximum importance on Android
        priority: 2, // High priority on iOS
        // Visual settings
        sound: 'default',
        vibrate: true,
        // Channel settings for Android
        channelId: 'viluuma-notifications',
        // Additional visibility settings
        ongoing: false,
        autoCancel: true,
        largeBody: notification.body,
        summaryText: 'Viluuma App',
        // Make sure it shows as heads-up notification
        category: 'reminder',
        threadIdentifier: 'viluuma-main'
      }));

      // Create notification channel for Android (ensures proper visibility)
      if (Capacitor.getPlatform() === 'android') {
        await LocalNotifications.createChannel({
          id: 'viluuma-notifications',
          name: 'Viluuma Notifications',
          description: 'Important notifications from Viluuma',
          importance: 5, // Maximum importance
          visibility: 1, // Public visibility
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#4F46E5'
        });
      }

      // Use Capacitor's native scheduling with enhanced settings
      const result = await LocalNotifications.schedule({ 
        notifications: enhancedNotifications 
      });
      console.log('Enhanced notifications scheduled successfully:', result);
      return result;
    } catch (error) {
      console.error('Error scheduling notifications:', error);
      return { notifications: [] };
    }
  }

  async cancel({ notifications }: { notifications: { id: number }[] }) {
    console.log('Mobile-first notification service: Cancelling notifications:', notifications);
    
    try {
      const result = await LocalNotifications.cancel({ notifications });
      console.log('Notifications cancelled successfully');
      return result;
    } catch (error) {
      console.error('Error cancelling notifications:', error);
      return {};
    }
  }

  async getPending() {
    try {
      const result = await LocalNotifications.getPending();
      console.log('Mobile-first notification service: Getting pending notifications:', result.notifications);
      return result;
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return { notifications: [] };
    }
  }
}

// Mobile-first notification service - always use LocalNotifications
// This is a mobile app, not a web app, so we always use native capabilities
export const notificationService = new MobileNotificationService();