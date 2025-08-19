import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TestTube, Bell, Zap, Clock, Calendar, Trash2, RefreshCw } from 'lucide-react';
import { notificationService } from '@/lib/notifications';
import { generateNotificationId, releaseNotificationId, clearAllNotificationIds } from '@/lib/notificationIds';
import { useToast } from '@/hooks/use-toast';

export const AdvancedNotificationTesting = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState<any[]>([]);
  const { toast } = useToast();

  const refreshPendingNotifications = async () => {
    try {
      const pending = await notificationService.getPending();
      setPendingNotifications(pending.notifications || []);
    } catch (error) {
      console.error('Error getting pending notifications:', error);
    }
  };

  useEffect(() => {
    refreshPendingNotifications();
    const interval = setInterval(refreshPendingNotifications, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const scheduleTestNotification = async (delay: number, type: string) => {
    setIsTesting(true);
    try {
      const testTime = new Date();
      testTime.setSeconds(testTime.getSeconds() + delay);
      const id = generateNotificationId('SYSTEM_TEST');

      await notificationService.schedule({
        notifications: [{
          id,
          title: `🧪 ${type} Test (${delay}s)`,
          body: `This ${type.toLowerCase()} notification was scheduled ${delay} seconds ago at ${new Date().toLocaleTimeString()}`,
          schedule: { at: testTime },
        }]
      });

      toast({
        title: `${type} test scheduled`,
        description: `Check your device in ${delay} seconds!`,
      });
      
      console.log(`${type} test notification scheduled for:`, testTime);
      setTimeout(refreshPendingNotifications, 100); // Refresh after scheduling
    } catch (error) {
      console.error('Error scheduling test notification:', error);
      toast({
        title: "Test failed",
        description: `Could not schedule ${type.toLowerCase()} test`,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const scheduleMultipleTests = async () => {
    setIsTesting(true);
    try {
      const tests = [
        { delay: 5, type: 'Daily Digest', category: 'DAILY_DIGEST' as const },
        { delay: 10, type: 'Coaching Nudge', category: 'COACHING_NUDGES' as const },
        { delay: 15, type: 'Task Reminder', category: 'TASK_REMINDERS' as const },
      ];

      for (const test of tests) {
        const testTime = new Date();
        testTime.setSeconds(testTime.getSeconds() + test.delay);
        const id = generateNotificationId(test.category);

        await notificationService.schedule({
          notifications: [{
            id,
            title: `🧪 ${test.type} Test`,
            body: `This is a bulk test of ${test.type.toLowerCase()} notifications`,
            schedule: { at: testTime },
          }]
        });
      }

      toast({
        title: "Bulk test scheduled",
        description: "3 test notifications scheduled with 5s intervals",
      });
      
      setTimeout(refreshPendingNotifications, 100);
    } catch (error) {
      console.error('Error scheduling bulk tests:', error);
      toast({
        title: "Bulk test failed",
        description: "Could not schedule bulk tests",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const cancelNotification = async (id: number) => {
    try {
      await notificationService.cancel({ notifications: [{ id }] });
      releaseNotificationId(id);
      toast({
        title: "Notification cancelled",
        description: `Notification ${id} has been cancelled`,
      });
      refreshPendingNotifications();
    } catch (error) {
      console.error('Error cancelling notification:', error);
      toast({
        title: "Cancel failed",
        description: "Could not cancel notification",
        variant: "destructive",
      });
    }
  };

  const clearAllNotifications = async () => {
    try {
      if (pendingNotifications.length > 0) {
        await notificationService.cancel({ 
          notifications: pendingNotifications.map(n => ({ id: n.id }))
        });
      }
      clearAllNotificationIds();
      toast({
        title: "All notifications cleared",
        description: "All pending notifications have been cancelled",
      });
      refreshPendingNotifications();
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast({
        title: "Clear failed",
        description: "Could not clear all notifications",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Quick Tests
          </CardTitle>
          <CardDescription>
            Schedule test notifications with different delays
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button 
              onClick={() => scheduleTestNotification(5, 'Immediate')}
              disabled={isTesting}
              variant="secondary"
              size="sm"
            >
              <Zap className="w-4 h-4 mr-2" />
              5s
            </Button>
            <Button 
              onClick={() => scheduleTestNotification(10, 'Quick')}
              disabled={isTesting}
              variant="secondary"
              size="sm"
            >
              <Bell className="w-4 h-4 mr-2" />
              10s
            </Button>
            <Button 
              onClick={() => scheduleTestNotification(60, 'Delayed')}
              disabled={isTesting}
              variant="secondary"
              size="sm"
            >
              <Clock className="w-4 h-4 mr-2" />
              1min
            </Button>
            <Button 
              onClick={() => scheduleTestNotification(300, 'Long')}
              disabled={isTesting}
              variant="secondary"
              size="sm"
            >
              <Calendar className="w-4 h-4 mr-2" />
              5min
            </Button>
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-2">
            <Button 
              onClick={scheduleMultipleTests}
              disabled={isTesting}
              variant="outline"
              className="w-full"
            >
              <TestTube className="w-4 h-4 mr-2" />
              {isTesting ? 'Scheduling Bulk Tests...' : 'Bulk Test (3 notifications)'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Notifications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Pending Notifications
            </CardTitle>
            <CardDescription>
              Real-time view of scheduled notifications
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {pendingNotifications.length} pending
            </Badge>
            <Button 
              onClick={refreshPendingNotifications}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingNotifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No pending notifications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingNotifications.map((notification) => (
                <div key={notification.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.body}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        ID: {notification.id}
                      </Badge>
                      {notification.schedule?.at && (
                        <Badge variant="secondary" className="text-xs">
                          {new Date(notification.schedule.at).toLocaleTimeString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => cancelNotification(notification.id)}
                    variant="outline"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Controls */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Emergency Controls
          </CardTitle>
          <CardDescription>
            Clear all notifications and reset system state
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={clearAllNotifications}
            variant="destructive"
            className="w-full"
            disabled={pendingNotifications.length === 0}
          >
            Clear All Notifications ({pendingNotifications.length})
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};