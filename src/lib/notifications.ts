import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// Web fallback for notifications when running in browser
class WebNotifications {
  async requestPermissions() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return { display: permission };
    }
    return { display: 'denied' };
  }

  async schedule({ notifications }: { notifications: any[] }) {
    console.log('Web fallback: Would schedule notifications:', notifications);
    // In a real implementation, you might use the Web Notifications API
    // or store these in localStorage for demo purposes
    return { notifications };
  }

  async cancel({ notifications }: { notifications: { id: number }[] }) {
    console.log('Web fallback: Would cancel notifications:', notifications);
    return {};
  }

  async getPending() {
    console.log('Web fallback: Getting pending notifications');
    return { notifications: [] };
  }
}

// Create a unified notification service that works on web and mobile
export const createNotificationService = () => {
  if (Capacitor.isNativePlatform()) {
    return LocalNotifications;
  } else {
    return new WebNotifications();
  }
};

export const notificationService = createNotificationService();