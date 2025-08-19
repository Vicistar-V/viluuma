import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, TestTube } from 'lucide-react';
import { notificationService } from '@/lib/notifications';
import { useToast } from '@/hooks/use-toast';

export const NotificationTestButton = () => {
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  const scheduleTestNotification = async () => {
    setIsTesting(true);
    try {
      const testTime = new Date();
      testTime.setSeconds(testTime.getSeconds() + 10); // 10 seconds from now

      await notificationService.schedule({
        notifications: [{
          id: 999999, // Test notification ID
          title: "🧪 Test Notification",
          body: "Your notification system is working! This was sent 10 seconds ago.",
          schedule: { at: testTime },
        }]
      });

      toast({
        title: "Test notification scheduled",
        description: "Check your device in 10 seconds!",
      });
      
      console.log('Test notification scheduled for:', testTime);
    } catch (error) {
      console.error('Error scheduling test notification:', error);
      toast({
        title: "Test failed",
        description: "Could not schedule test notification",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Button 
      onClick={scheduleTestNotification} 
      disabled={isTesting}
      variant="secondary"
      className="w-full"
    >
      <TestTube className="w-4 h-4 mr-2" />
      {isTesting ? 'Scheduling Test...' : 'Test Notifications (10s)'}
    </Button>
  );
};