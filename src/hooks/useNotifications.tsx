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
      console.log('Notification permissions:', permissions);
      
      if (permissions.display === 'denied') {
        toast({
          title: "Notifications disabled",
          description: "Enable notifications in settings to get daily updates and reminders.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
    }
  };

  const syncAndSchedule = useCallback(async (): Promise<CoachingNudge | null> => {
    try {
      console.log('Syncing and scheduling notifications...');

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
      await notificationService.cancel({ notifications: [{ id: 1 }] });

      // Schedule daily digest only if user has enabled it
      if (shouldShowNotification(preferences, 'dailyDigest') && intelligencePayload.dailyDigest) {
        const { hour, minute } = getPreferredDigestTime(preferences);
        const tomorrowAtPreferredTime = new Date();
        tomorrowAtPreferredTime.setDate(tomorrowAtPreferredTime.getDate() + 1);
        tomorrowAtPreferredTime.setHours(hour, minute, 0, 0);

        if (intelligencePayload.dailyDigest.taskCount > 0) {
          const personalizedBody = intelligencePayload.dailyDigest.taskCount === 1 
            ? `Your focus task today: "${intelligencePayload.dailyDigest.firstTaskTitle}"`
            : `You have ${intelligencePayload.dailyDigest.taskCount} tasks today, starting with "${intelligencePayload.dailyDigest.firstTaskTitle}"`;

          await notificationService.schedule({
            notifications: [{
              id: 1, // Static ID for daily digest
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
              id: 1,
              title: "Good morning! ✨",
              body: "No tasks scheduled for today. A perfect day to plan your next big move or take a well-deserved break!",
              schedule: { at: tomorrowAtPreferredTime },
            }]
          });
        }
      }

      // Handle unacknowledged messages with intelligent priority system
      let priorityMessage: CoachingNudge | null = null;
      
      if (intelligencePayload.unacknowledgedMessages?.length > 0 && shouldShowNotification(preferences, 'coachingNudges')) {
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
        
        // Schedule backup notifications for ALL unacknowledged messages (spaced apart)
        for (let i = 0; i < intelligencePayload.unacknowledgedMessages.length; i++) {
          const message = intelligencePayload.unacknowledgedMessages[i];
          const backupTime = new Date();
          backupTime.setMinutes(backupTime.getMinutes() + 10 + (i * 120)); // Space them 2 hours apart
          
          if (!isWithinQuietHours(preferences, backupTime)) {
            const backupId = parseInt(message.id.substring(0, 8), 16);
            
            await notificationService.schedule({
              notifications: [{
                id: backupId,
                title: message.title,
                body: message.body + " (Tap to open Viluuma)",
                schedule: { at: backupTime },
              }]
            });
          }
        }
        
        console.log(`Scheduled backup notifications for ${intelligencePayload.unacknowledgedMessages.length} messages`);
      } else if (intelligencePayload.unacknowledgedMessages?.length > 0 && !shouldShowNotification(preferences, 'coachingNudges')) {
        console.log('Skipped coaching messages due to user preferences');
      }

      // Return the priority message for immediate display (only ONE per session)
      return priorityMessage;

    } catch (error) {
      console.error('Error in syncAndSchedule:', error);
      return null;
    }
  }, []);

  const acknowledgeMessage = useCallback(async (messageId: string) => {
    try {
      // Cancel the backup notification when user acknowledges in-app
      const backupId = parseInt(messageId.substring(0, 8), 16);
      await notificationService.cancel({ notifications: [{ id: backupId }] });
      
      const { error } = await supabase.rpc('acknowledge_message', { 
        p_message_id: messageId 
      });
      
      if (error) {
        console.error('Error acknowledging message:', error);
        throw error;
      }
      
      console.log('Message acknowledged and backup notification cancelled:', messageId);
    } catch (error) {
      console.error('Error acknowledging message:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge message.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const scheduleTaskReminder = async (taskId: string, taskTitle: string, reminderTime: Date) => {
    try {
      // Check user preferences before scheduling
      const preferences = loadNotificationPreferences();
      
      if (isWithinQuietHours(preferences, reminderTime)) {
        toast({
          title: "Reminder adjusted",
          description: "Reminder moved outside quiet hours",
          variant: "default",
        });
        
        // Adjust time to end of quiet hours
        const [endHour, endMinute] = preferences.quietHours.end.split(':').map(Number);
        reminderTime.setHours(endHour, endMinute, 0, 0);
        
        // If that's in the past, move to next day
        if (reminderTime < new Date()) {
          reminderTime.setDate(reminderTime.getDate() + 1);
        }
      }

      // Use the task ID as the notification ID (convert to number)
      const notificationId = parseInt(taskId.substring(0, 8), 16); // Convert part of UUID to number
      
      await notificationService.schedule({
        notifications: [{
          id: notificationId,
          title: "Task Reminder 📋",
          body: `Time to work on: ${taskTitle}`,
          schedule: { at: reminderTime },
        }]
      });

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
      const notificationId = parseInt(taskId.substring(0, 8), 16);
      
      await notificationService.cancel({ notifications: [{ id: notificationId }] });
      
      toast({
        title: "Reminder cancelled",
        description: "Task reminder has been removed.",
      });

      console.log('Cancelled task reminder:', taskId);
    } catch (error) {
      console.error('Error cancelling task reminder:', error);
    }
  };

  const checkTaskReminderExists = async (taskId: string): Promise<boolean> => {
    try {
      const notificationId = parseInt(taskId.substring(0, 8), 16);
      const { notifications } = await notificationService.getPending();
      
      return notifications.some(n => n.id === notificationId);
    } catch (error) {
      console.error('Error checking task reminder:', error);
      return false;
    }
  };

  return {
    syncAndSchedule,
    acknowledgeMessage,
    scheduleTaskReminder,
    cancelTaskReminder,
    checkTaskReminderExists,
    requestPermissions,
  };
};