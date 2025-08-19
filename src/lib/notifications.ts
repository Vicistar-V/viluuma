import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { BackgroundTask } from '@capawesome/capacitor-background-task';
import { App } from '@capacitor/app';

// Mobile-first notification service using Capacitor LocalNotifications with background task support
class MobileNotificationService {
  private backgroundTaskId: string | null = null;
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

  async schedule({ notifications }: { notifications: any[] }) {
    console.log('Mobile-first notification service: Scheduling notifications:', notifications);
    
    try {
      // Start background task to ensure scheduling completes even if app goes to background
      this.backgroundTaskId = await BackgroundTask.beforeExit(async () => {
        console.log('Background task: Completing notification scheduling');
        try {
          const result = await LocalNotifications.schedule({ notifications });
          console.log('Background scheduling completed:', result);
          return result;
        } catch (error) {
          console.error('Background scheduling failed:', error);
          return { notifications: [] };
        }
      });

      // Use Capacitor's native scheduling - works when app is closed/backgrounded
      const result = await LocalNotifications.schedule({ notifications });
      console.log('Notifications scheduled successfully:', result);
      
      // Finish background task
      if (this.backgroundTaskId) {
        await BackgroundTask.finish({ taskId: this.backgroundTaskId });
        this.backgroundTaskId = null;
      }
      
      return result;
    } catch (error) {
      console.error('Error scheduling notifications:', error);
      
      // Cleanup background task on error
      if (this.backgroundTaskId) {
        try {
          await BackgroundTask.finish({ taskId: this.backgroundTaskId });
        } catch (finishError) {
          console.error('Error finishing background task:', finishError);
        }
        this.backgroundTaskId = null;
      }
      
      return { notifications: [] };
    }
  }

  async cancel({ notifications }: { notifications: { id: number }[] }) {
    console.log('Mobile-first notification service: Cancelling notifications:', notifications);
    
    try {
      // Start background task to ensure cancellation completes
      const taskId = await BackgroundTask.beforeExit(async () => {
        const result = await LocalNotifications.cancel({ notifications });
        console.log('Background cancellation completed');
        return result;
      });

      const result = await LocalNotifications.cancel({ notifications });
      console.log('Notifications cancelled successfully');
      
      // Finish background task
      await BackgroundTask.finish({ taskId });
      
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