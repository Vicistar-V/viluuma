import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Clock, CheckCircle, Trash2, RefreshCw } from 'lucide-react';
import { notificationService } from '@/lib/notifications';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { getNotificationTypeFromId } from '@/lib/notificationIds';

interface PendingNotification {
  id: number;
  title: string;
  body: string;
  schedule?: {
    at?: Date | string;
    repeats?: boolean;
    every?: string;
  };
}

export const NotificationCenter = () => {
  const [pendingNotifications, setPendingNotifications] = useState<PendingNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadPendingNotifications = async () => {
    try {
      setIsLoading(true);
      const { notifications } = await notificationService.getPending();
      setPendingNotifications(notifications || []);
    } catch (error) {
      console.error('Error loading pending notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cancelNotification = async (id: number) => {
    try {
      await notificationService.cancel({ notifications: [{ id }] });
      setPendingNotifications(prev => prev.filter(n => n.id !== id));
      toast({
        title: "Notification cancelled",
        description: "The notification has been removed.",
      });
    } catch (error) {
      console.error('Error cancelling notification:', error);
      toast({
        title: "Error",
        description: "Failed to cancel notification.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadPendingNotifications();
  }, []);

  // Use the imported function from notificationIds.ts

  const formatScheduledTime = (date: Date | string): string => {
    const scheduledDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    if (scheduledDate < now) return 'Overdue';
    return formatDistanceToNow(scheduledDate, { addSuffix: true });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <CardTitle>Notification Center</CardTitle>
            <Badge variant="secondary">{pendingNotifications.length} pending</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadPendingNotifications}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          Manage your scheduled notifications and reminders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : pendingNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <CheckCircle className="w-8 h-8 mb-2" />
              <p>No pending notifications</p>
              <p className="text-sm">All caught up!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingNotifications.map((notification, index) => (
                <div key={notification.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {getNotificationTypeFromId(notification.id)}
                        </Badge>
                        {notification.schedule?.at && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {formatScheduledTime(notification.schedule.at)}
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {notification.body}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelNotification(notification.id)}
                      className="flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {index < pendingNotifications.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};