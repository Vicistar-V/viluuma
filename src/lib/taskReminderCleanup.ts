import { notificationService } from './notifications';
import { releaseNotificationId } from './notificationIds';

/**
 * Utility function to clean up task reminders when tasks are completed or deleted
 */
export const cleanupTaskReminder = async (taskId: string): Promise<void> => {
  try {
    console.log(`[TaskReminderCleanup] Cleaning up reminders for task: ${taskId}`);
    
    // Check if reminder exists in pending notifications
    const pending = await notificationService.getPending();
    const taskNotifications = pending.notifications?.filter(notification => 
      notification.extra?.taskId === taskId
    ) || [];
    
    // Cancel pending notifications
    if (taskNotifications.length > 0) {
      await notificationService.cancel({ 
        notifications: taskNotifications.map(n => ({ id: n.id }))
      });
      
      // Release notification IDs for reuse
      taskNotifications.forEach(n => releaseNotificationId(n.id));
      
      console.log(`[TaskReminderCleanup] Cancelled ${taskNotifications.length} notifications for task ${taskId}`);
    }
    
    // Clean up localStorage entry
    const storageKey = `task-reminder-${taskId}`;
    localStorage.removeItem(storageKey);
    
    console.log(`[TaskReminderCleanup] Successfully cleaned up reminders for task: ${taskId}`);
    
  } catch (error) {
    console.error(`[TaskReminderCleanup] Failed to cleanup reminders for task ${taskId}:`, error);
    // Don't throw - this is a cleanup operation that shouldn't break the main flow
  }
};

/**
 * Check if a task has an active reminder
 */
export const checkTaskHasReminder = async (taskId: string): Promise<boolean> => {
  try {
    // Check pending notifications
    const pending = await notificationService.getPending();
    const hasPending = pending.notifications?.some(notification => 
      notification.extra?.taskId === taskId
    ) || false;
    
    // Check localStorage as backup
    const storageKey = `task-reminder-${taskId}`;
    const hasStorage = localStorage.getItem(storageKey) !== null;
    
    return hasPending || hasStorage;
  } catch (error) {
    console.error('Error checking task reminder:', error);
    // Fallback to storage check only
    return localStorage.getItem(`task-reminder-${taskId}`) !== null;
  }
};