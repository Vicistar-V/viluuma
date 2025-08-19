import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Settings, CheckCircle } from 'lucide-react';
import { notificationService } from '@/lib/notifications';
import { useToast } from '@/hooks/use-toast';
import { NotificationTestButton } from './NotificationTestButton';

type PermissionStatus = 'granted' | 'denied' | 'default' | 'unknown';

export const NotificationPermissionManager = () => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('unknown');
  const [isRequesting, setIsRequesting] = useState(false);
  const { toast } = useToast();

  const checkPermissionStatus = async () => {
    try {
      const permissions = await notificationService.checkPermissions();
      setPermissionStatus(permissions.display as PermissionStatus);
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissionStatus('denied');
    }
  };

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const requestPermissions = async () => {
    setIsRequesting(true);
    try {
      const permissions = await notificationService.requestPermissions();
      setPermissionStatus(permissions.display as PermissionStatus);
      
      if (permissions.display === 'granted') {
        toast({
          title: "Notifications enabled! 🎉",
          description: "You'll now receive daily digests and helpful reminders.",
        });
      } else {
        toast({
          title: "Notifications disabled",
          description: "You can enable them later in your device settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      toast({
        title: "Error",
        description: "Failed to request notification permissions.",
        variant: "destructive",
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const openSettings = () => {
    toast({
      title: "Enable notifications",
      description: "Go to Settings > Notifications to enable notifications for Viluuma.",
    });
  };

  const getStatusBadge = () => {
    switch (permissionStatus) {
      case 'granted':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Enabled</Badge>;
      case 'denied':
        return <Badge variant="destructive"><BellOff className="w-3 h-3 mr-1" />Disabled</Badge>;
      case 'default':
        return <Badge variant="secondary"><Bell className="w-3 h-3 mr-1" />Not Set</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getContent = () => {
    switch (permissionStatus) {
      case 'granted':
        return {
          title: "Notifications Active",
          description: "You'll receive daily digests and helpful coaching messages to stay on track with your goals.",
          action: <NotificationTestButton />,
        };
      case 'denied':
        return {
          title: "Notifications Disabled",
          description: "Enable notifications to get daily summaries and motivational nudges when you need them most.",
          action: (
            <Button onClick={requestPermissions} disabled={isRequesting} variant="outline" className="w-full">
              <Bell className="w-4 h-4 mr-2" />
              {isRequesting ? 'Requesting...' : 'Enable Notifications'}
            </Button>
          ),
        };
      case 'default':
        return {
          title: "Enable Smart Notifications",
          description: "Get personalized daily digests and gentle nudges to help you stay motivated and on track.",
          action: (
            <Button onClick={requestPermissions} disabled={isRequesting} className="w-full">
              <Bell className="w-4 h-4 mr-2" />
              {isRequesting ? 'Requesting...' : 'Enable Notifications'}
            </Button>
          ),
        };
      default:
        return {
          title: "Checking Permissions...",
          description: "Please wait while we check your notification settings.",
          action: null,
        };
    }
  };

  const content = getContent();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Bell className="w-5 h-5" />
          <CardTitle className="text-lg">{content.title}</CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>{content.description}</CardDescription>
      </CardHeader>
      {content.action && (
        <CardContent>
          {content.action}
        </CardContent>
      )}
    </Card>
  );
};