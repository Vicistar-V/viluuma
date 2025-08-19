import { useEffect, useCallback } from 'react';
import { notificationService } from '@/lib/notifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  loadNotificationPreferences, 
  shouldShowNotification, 
  getPreferredDigestTime,
  isWithinQuietHours,
  type NotificationPreferences 
} from '@/lib/notificationPreferences';
import { generateNotificationId, releaseNotificationId } from '@/lib/notificationIds';

interface DailyDigest {
  taskCount: number;
  firstTaskTitle: string;
  generatedAt: string;
}

interface CoachingNudge {
  id: string;
  message_type: string;
  title: string;
  body: string;
  created_at: string;
}

interface IntelligencePayload {
  dailyDigest: DailyDigest;
  unacknowledgedMessages: CoachingNudge[];
  timestamp: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Request permissions when the hook is first used
  useEffect(() => {
    if (user) {
      requestPermissions();
    }
  }, [user]);

  const requestPermissions = async () => {
    try {
      const permissions = await notificationService.requestPermissions();
      console.log('Mobile notification permissions:', permissions);
      return permissions;
    } catch (error) {
      console.error('Error requesting mobile notification permissions:', error);
      return { display: 'denied' };
    }
  };

  const checkPermissions = async () => {
    try {
      const permission = await notificationService.checkPermissions();
      return permission;
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return { display: 'denied' };
    }
  };

  const syncAndSchedule = useCallback(async (): Promise<CoachingNudge | null> => {
    try {
      console.log('Syncing and scheduling notifications...');

      // Check permissions before proceeding
      const permission = await checkPermissions();
      if (permission.display !== 'granted') {
        console.log('Notifications not permitted, skipping sync');
        return null;
      }

      // Load user preferences
      const preferences = loadNotificationPreferences();

      // Get the intelligence payload from our backend
      const { data: payload, error } = await supabase.functions.invoke('get-intelligence-payload');
      
      if (error) {
        console.error('Error getting intelligence payload:', error);
        return null;
      }

      const intelligencePayload = payload as IntelligencePayload;
      console.log('Received intelligence payload:', intelligencePayload);

      // Clear yesterday's scheduled digest to prevent duplicates
      await notificationService.cancel({ notifications: [{ id: generateNotificationId('DAILY_DIGEST') }] });

      // Schedule daily digest only if user has enabled it
      const tomorrowAtPreferredTime = new Date();
      const { hour, minute } = getPreferredDigestTime(preferences);
      tomorrowAtPreferredTime.setDate(tomorrowAtPreferredTime.getDate() + 1);
      tomorrowAtPreferredTime.setHours(hour, minute, 0, 0);
      
      if (shouldShowNotification(preferences, 'dailyDigest', tomorrowAtPreferredTime) && intelligencePayload.dailyDigest) {
        if (intelligencePayload.dailyDigest.taskCount > 0) {
          const personalizedBody = intelligencePayload.dailyDigest.taskCount === 1 
            ? `Your focus task today: "${intelligencePayload.dailyDigest.firstTaskTitle}"`
            : `You have ${intelligencePayload.dailyDigest.taskCount} tasks today, starting with "${intelligencePayload.dailyDigest.firstTaskTitle}"`;

          await notificationService.schedule({
            notifications: [{
              id: generateNotificationId('DAILY_DIGEST'),
              title: "Your Viluuma Daily Digest ☀️",
              body: personalizedBody,
              schedule: { at: tomorrowAtPreferredTime },
            }]
          });
          console.log(`Scheduled daily digest for tomorrow ${hour}:${minute.toString().padStart(2, '0')}`);
        } else {
          // Schedule a motivational message for days with no tasks
          await notificationService.schedule({
            notifications: [{
              id: generateNotificationId('DAILY_DIGEST'),
              title: "Good morning! ✨",
              body: "No tasks scheduled for today. A perfect day to plan your next big move or take a well-deserved break!",
              schedule: { at: tomorrowAtPreferredTime },
            }]
          });
        }
      }

      // Handle unacknowledged messages with intelligent priority system
      let priorityMessage: CoachingNudge | null = null;
      
      if (intelligencePayload.unacknowledgedMessages?.length > 0) {
        // Priority system: deadline_warning > slump_detector > momentum_booster
        const messageTypesPriority = ['deadline_warning', 'slump_detector', 'momentum_booster'];
        
        for (const messageType of messageTypesPriority) {
          priorityMessage = intelligencePayload.unacknowledgedMessages.find(msg => msg.message_type === messageType) || null;
          if (priorityMessage) break;
        }
        
        // If no priority message found, take the oldest one
        if (!priorityMessage) {
          priorityMessage = intelligencePayload.unacknowledgedMessages[0];
        }
        
            // Schedule backup notifications for ALL unacknowledged messages (spaced apart) - only if coaching nudges enabled
            if (shouldShowNotification(preferences, 'coachingNudges')) {
              for (let i = 0; i < intelligencePayload.unacknowledgedMessages.length; i++) {
                const message = intelligencePayload.unacknowledgedMessages[i];
                const backupTime = new Date();
                backupTime.setMinutes(backupTime.getMinutes() + 10 + (i * 120)); // Space them 2 hours apart
                
                if (shouldShowNotification(preferences, 'coachingNudges', backupTime)) {
                  const backupId = generateNotificationId('COACHING_NUDGES');
                  
                  await notificationService.schedule({
                    notifications: [{
                      id: backupId,
                      title: message.title,
                      body: message.body + " (Tap to open Viluuma)",
                      schedule: { at: backupTime },
                      extra: {
                        messageId: message.id,
                        type: 'coaching_backup'
                      }
                    }]
                  });
                }
              }
            }
        
        console.log(`Scheduled backup notifications for ${intelligencePayload.unacknowledgedMessages.length} messages`);
      }

      // Return the priority message for immediate display (only ONE per session)
      return priorityMessage;

    } catch (error) {
      console.error('Error in syncAndSchedule:', error);
      return null;
    }
  }, []);

  const acknowledgeMessage = useCallback(async (messageId: string) => {
    console.log('Acknowledging coaching message (backup cleanup only):', messageId);
    
    try {
      // Only cancel backup notifications - don't acknowledge in backend
      // The useUserMessages hook handles backend acknowledgement to prevent conflicts
      const pending = await notificationService.getPending();
      const messageNotifications = pending.notifications.filter(notification => 
        notification.extra?.messageId === messageId
      );
      
      if (messageNotifications.length > 0) {
        await notificationService.cancel({ 
          notifications: messageNotifications.map(n => ({ id: n.id }))
        });
        
        // Release the notification IDs
        messageNotifications.forEach(n => releaseNotificationId(n.id));
        
        console.log(`Cancelled ${messageNotifications.length} backup notifications for message ${messageId}`);
      }
      
    } catch (error) {
      console.error('Error in acknowledgeMessage backup cleanup:', error);
    }
  }, []);

  const scheduleTaskReminder = async (taskId: string, taskTitle: string, reminderTime: Date) => {
    try {
      // Check permissions first
      const permission = await checkPermissions();
      if (permission.display !== 'granted') {
        toast({
          title: "Permissions required",
          description: "Please enable notifications to set reminders.",
          variant: "destructive",
        });
        return;
      }

      // Check user preferences and quiet hours with proper timezone handling
      const preferences = loadNotificationPreferences();
      if (!shouldShowNotification(preferences, 'deadlineWarnings', reminderTime)) {
        console.log('Task reminder blocked by user preferences or quiet hours');
        toast({
          title: "Reminder not set",
          description: "Reminder time is during your quiet hours. Please choose a different time.",
          variant: "destructive",
        });
        return;
      }

      // Generate proper notification ID for task reminders
      const notificationId = generateNotificationId('TASK_REMINDERS');
      
      const notification = {
        title: 'Task Reminder',
        body: `Time to work on: ${taskTitle}`,
        id: notificationId,
        schedule: { at: reminderTime },
        sound: null,
        attachments: null,
        actionTypeId: "",
        extra: {
          taskId: taskId,
          type: 'task_reminder'
        }
      };
      
      // Store reminder info in localStorage for reliable detection
      const storageKey = `task-reminder-${taskId}`;
      localStorage.setItem(storageKey, JSON.stringify({
        notificationId,
        taskTitle,
        reminderTime: reminderTime.toISOString(),
        createdAt: new Date().toISOString()
      }));

      await notificationService.schedule({ notifications: [notification] });

      toast({
        title: "Reminder set",
        description: `Reminder set for ${reminderTime.toLocaleTimeString()}`,
      });

      console.log('Scheduled task reminder:', { taskId, reminderTime });
    } catch (error) {
      console.error('Error scheduling task reminder:', error);
      toast({
        title: "Error",
        description: "Failed to set reminder.",
        variant: "destructive",
      });
    }
  };

  const cancelTaskReminder = async (taskId: string) => {
    try {
      const pending = await notificationService.getPending();
      const taskNotifications = pending.notifications.filter(notification => 
        notification.extra?.taskId === taskId
      );
      
      if (taskNotifications.length > 0) {
        await notificationService.cancel({ 
          notifications: taskNotifications.map(n => ({ id: n.id }))
        });
        
        // Release the notification IDs
        taskNotifications.forEach(n => releaseNotificationId(n.id));
        
        console.log(`Cancelled ${taskNotifications.length} task reminders for task ${taskId}`);
      }
      
      // Clean up localStorage
      const storageKey = `task-reminder-${taskId}`;
      localStorage.removeItem(storageKey);
      
      toast({
        title: "Reminder cancelled",
        description: "Task reminder has been removed.",
      });
      
    } catch (error) {
      console.error('Error cancelling task reminder:', error);
      toast({
        title: "Error",
        description: "Failed to cancel reminder. Please try again.",
        variant: "destructive",
      });
    }
  };

  const checkTaskReminderExists = async (taskId: string): Promise<boolean> => {
    try {
      // Check both pending notifications and local storage for reliability
      const pending = await notificationService.getPending();
      const hasPending = pending.notifications.some(notification => 
        notification.extra?.taskId === taskId
      );
      
      // Also check local storage as backup
      const storageKey = `task-reminder-${taskId}`;
      const hasStorage = localStorage.getItem(storageKey) !== null;
      
      return hasPending || hasStorage;
    } catch (error) {
      console.error('Error checking task reminder:', error);
      // Fallback to storage check only
      return localStorage.getItem(`task-reminder-${taskId}`) !== null;
    }
  };

  return {
    syncAndSchedule,
    acknowledgeMessage,
    scheduleTaskReminder,
    cancelTaskReminder,
    checkTaskReminderExists,
    requestPermissions,
    checkPermissions,
  };
};