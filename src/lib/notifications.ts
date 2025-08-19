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

      // Use Capacitor's native scheduling - works when app is closed/backgrounded
      const result = await LocalNotifications.schedule({ notifications });
      console.log('Notifications scheduled successfully:', result);
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