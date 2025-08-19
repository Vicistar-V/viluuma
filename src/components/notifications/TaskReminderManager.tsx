import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Bell, Clock, Calendar, RefreshCw } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface TaskReminder {
  taskId: string;
  taskTitle: string;
  reminderTime: string;
  notificationId: number;
}

export const TaskReminderManager: React.FC = () => {
  const [reminders, setReminders] = useState<TaskReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const { getAllActiveTaskReminders, cancelTaskReminder, cancelAllTaskReminders } = useNotifications();

  const loadReminders = async () => {
    setLoading(true);
    try {
      const activeReminders = await getAllActiveTaskReminders();
      setReminders(activeReminders);
    } catch (error) {
      console.error('Failed to load reminders:', error);
      toast({
        title: "Error loading reminders",
        description: "Could not fetch active task reminders.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  const handleCancelReminder = async (taskId: string, taskTitle: string) => {
    try {
      await cancelTaskReminder(taskId);
      await loadReminders(); // Refresh the list
      toast({
        title: "Reminder cancelled",
        description: `Reminder for "${taskTitle}" has been cancelled.`,
      });
    } catch (error) {
      console.error('Failed to cancel reminder:', error);
      toast({
        title: "Error cancelling reminder",
        description: "Could not cancel the reminder. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelAllReminders = async () => {
    try {
      const cancelledCount = await cancelAllTaskReminders();
      await loadReminders(); // Refresh the list
      toast({
        title: "All reminders cancelled",
        description: `Successfully cancelled ${cancelledCount} task reminder${cancelledCount !== 1 ? 's' : ''}.`,
      });
    } catch (error) {
      console.error('Failed to cancel all reminders:', error);
      toast({
        title: "Error cancelling reminders",
        description: "Could not cancel all reminders. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatReminderTime = (reminderTime: string) => {
    try {
      const date = new Date(reminderTime);
      return format(date, 'MMM dd, yyyy \'at\' h:mm a');
    } catch {
      return reminderTime;
    }
  };

  const getTimeUntilReminder = (reminderTime: string) => {
    try {
      const now = new Date();
      const reminder = new Date(reminderTime);
      const diffMs = reminder.getTime() - now.getTime();
      
      if (diffMs < 0) {
        return 'Overdue';
      }
      
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours < 1) {
        return `In ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
      } else if (diffHours < 24) {
        return `In ${diffHours} hour${diffHours !== 1 ? 's' : ''} ${diffMinutes > 0 ? `${diffMinutes}min` : ''}`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        return `In ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
      }
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Task Reminder Manager</h2>
          <Badge variant="secondary" className="ml-2">
            {reminders.length} active
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadReminders}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {reminders.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cancel All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel All Reminders</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will cancel all {reminders.length} active task reminder{reminders.length !== 1 ? 's' : ''}. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancelAllReminders}>
                    Cancel All Reminders
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Loading reminders...</p>
          </div>
        </div>
      ) : reminders.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-medium text-muted-foreground">No Active Reminders</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                You don't have any active task reminders. Set reminders from your task details to get notified.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <Card key={reminder.taskId} className="transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-base mb-2 line-clamp-2">
                      {reminder.taskTitle}
                    </h4>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatReminderTime(reminder.reminderTime)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span className={getTimeUntilReminder(reminder.reminderTime) === 'Overdue' ? 'text-destructive font-medium' : ''}>
                          {getTimeUntilReminder(reminder.reminderTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive ml-4"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Reminder</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to cancel the reminder for "{reminder.taskTitle}"? 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleCancelReminder(reminder.taskId, reminder.taskTitle)}>
                          Cancel Reminder
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};