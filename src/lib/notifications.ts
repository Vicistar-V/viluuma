import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// Enhanced mobile-first notification service
class MobileNotificationService {
  private pendingNotifications: Map<number, any> = new Map();
  private webNotifications: Map<number, Notification> = new Map();

  async requestPermissions() {
    if (!('Notification' in window)) {
      return { display: 'denied' };
    }

    const permission = await Notification.requestPermission();
    return { display: permission };
  }

  async schedule({ notifications }: { notifications: any[] }) {
    console.log('Mobile notification service: Scheduling notifications:', notifications);
    
    for (const notification of notifications) {
      this.pendingNotifications.set(notification.id, {
        ...notification,
        scheduled: true
      });

      // For web, use Web Notifications API with scheduling simulation
      if ('Notification' in window && Notification.permission === 'granted') {
        if (notification.schedule?.at) {
          const scheduleTime = new Date(notification.schedule.at);
          const delay = scheduleTime.getTime() - Date.now();
          
          if (delay > 0) {
            setTimeout(() => {
              const webNotification = new Notification(notification.title, {
                body: notification.body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: `notification-${notification.id}`,
                requireInteraction: true,
                silent: false
              });

              this.webNotifications.set(notification.id, webNotification);
              
              webNotification.onclick = () => {
                window.focus();
                webNotification.close();
                // Trigger notification click event
                window.dispatchEvent(new CustomEvent('notification-clicked', {
                  detail: { notification }
                }));
              };
            }, delay);
          }
        } else {
          // Immediate notification
          const webNotification = new Notification(notification.title, {
            body: notification.body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `notification-${notification.id}`,
            requireInteraction: true
          });

          this.webNotifications.set(notification.id, webNotification);
        }
      }
    }

    return { notifications };
  }

  async cancel({ notifications }: { notifications: { id: number }[] }) {
    console.log('Mobile notification service: Cancelling notifications:', notifications);
    
    for (const { id } of notifications) {
      this.pendingNotifications.delete(id);
      
      // Cancel web notification if exists
      const webNotification = this.webNotifications.get(id);
      if (webNotification) {
        webNotification.close();
        this.webNotifications.delete(id);
      }
    }
    
    return {};
  }

  async getPending() {
    const notifications = Array.from(this.pendingNotifications.values())
      .filter(n => n.scheduled);
    
    console.log('Mobile notification service: Getting pending notifications:', notifications);
    return { notifications };
  }
}

// Create a unified notification service that works on web and mobile
export const createNotificationService = () => {
  if (Capacitor.isNativePlatform()) {
    return LocalNotifications;
  } else {
    return new MobileNotificationService();
  }
};

export const notificationService = createNotificationService();