import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Code, Database, Smartphone, Wifi, Trash2, RefreshCw, Activity, Settings } from 'lucide-react';
import { notificationService } from '@/lib/notifications';
import { useToast } from '@/hooks/use-toast';

interface DebugLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export const NotificationDebugger = () => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [permissions, setPermissions] = useState<any>(null);
  const [localStorageData, setLocalStorageData] = useState<any>({});
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const { toast } = useToast();

  const addLog = (level: DebugLog['level'], message: string, data?: any) => {
    const log: DebugLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    setLogs(prev => [log, ...prev].slice(0, 100)); // Keep last 100 logs
  };

  const checkPermissions = async () => {
    try {
      const perms = await notificationService.checkPermissions();
      setPermissions(perms);
      addLog('info', 'Permission check completed', perms);
    } catch (error) {
      addLog('error', 'Permission check failed', error);
    }
  };

  const checkLocalStorage = () => {
    try {
      const notificationData = {
        usedIds: window.localStorage.getItem('notification-used-ids'),
        dailyDigestCount: window.localStorage.getItem('notification_daily_digest_count'),
        coachingNudgeCount: window.localStorage.getItem('notification_coaching_nudge_count'),
        taskReminderCount: window.localStorage.getItem('notification_task_reminder_count'),
        lastSync: window.localStorage.getItem('last_notification_sync'),
        preferences: window.localStorage.getItem('notificationPreferences'),
      };
      setLocalStorageData(notificationData);
      addLog('info', 'Local storage data retrieved', notificationData);
    } catch (error) {
      addLog('error', 'Local storage check failed', error);
    }
  };

  const getDeviceInfo = () => {
    try {
      const info = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        hardwareConcurrency: navigator.hardwareConcurrency,
        maxTouchPoints: navigator.maxTouchPoints,
        screen: {
          width: screen.width,
          height: screen.height,
          availWidth: screen.availWidth,
          availHeight: screen.availHeight,
          pixelDepth: screen.pixelDepth,
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        timestamp: new Date().toISOString(),
      };
      setDeviceInfo(info);
      addLog('info', 'Device info collected', info);
    } catch (error) {
      addLog('error', 'Device info collection failed', error);
    }
  };

  const testPermissionFlow = async () => {
    try {
      addLog('info', 'Starting permission flow test');
      
      // Check current permissions
      const currentPerms = await notificationService.checkPermissions();
      addLog('info', 'Current permissions', currentPerms);
      
      // Request permissions
      const newPerms = await notificationService.requestPermissions();
      addLog('info', 'Permission request result', newPerms);
      
      // Update state
      setPermissions(newPerms);
      
      toast({
        title: "Permission flow test completed",
        description: "Check the logs for details",
      });
    } catch (error) {
      addLog('error', 'Permission flow test failed', error);
      toast({
        title: "Permission flow test failed",
        description: "Check the logs for error details",
        variant: "destructive",
      });
    }
  };

  const clearLocalStorageData = () => {
    try {
      const keysToRemove = [
        'notification-used-ids',
        'notification_daily_digest_count',
        'notification_coaching_nudge_count', 
        'notification_task_reminder_count',
        'last_notification_sync',
        'notificationPreferences'
      ];
      
      keysToRemove.forEach(key => {
        window.localStorage.removeItem(key);
      });
      
      addLog('info', 'Local storage notification data cleared');
      checkLocalStorage(); // Refresh display
      
      toast({
        title: "Local storage cleared",
        description: "All notification data has been removed",
      });
    } catch (error) {
      addLog('error', 'Failed to clear local storage', error);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const refreshAll = () => {
    checkPermissions();
    checkLocalStorage();
    getDeviceInfo();
    addLog('info', 'Manual refresh triggered');
  };

  useEffect(() => {
    checkPermissions();
    checkLocalStorage();
    getDeviceInfo();
    addLog('info', 'Notification debugger initialized');
  }, []);

  const formatData = (data: any) => {
    if (!data) return 'N/A';
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  };

  const getLevelColor = (level: DebugLog['level']) => {
    switch (level) {
      case 'error': return 'text-red-500';
      case 'warn': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Notification Debugger
          </CardTitle>
          <CardDescription>
            Deep debugging tools and system information
          </CardDescription>
        </div>
        <Button onClick={refreshAll} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh All
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
            <TabsTrigger value="device">Device</TabsTrigger>
          </TabsList>
          
          <TabsContent value="logs" className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{logs.length} logs</Badge>
              <Button onClick={clearLogs} variant="outline" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Logs
              </Button>
            </div>
            <ScrollArea className="h-[400px] w-full border rounded-md p-4">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No logs yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div key={index} className="font-mono text-xs border-l-2 border-muted pl-3 py-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <Badge variant="outline" className={getLevelColor(log.level)}>
                          {log.level.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-foreground">{log.message}</p>
                      {log.data && (
                        <pre className="text-muted-foreground mt-1 overflow-x-auto">
                          {formatData(log.data)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="permissions" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button onClick={testPermissionFlow} variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Test Permission Flow
              </Button>
              <Button onClick={checkPermissions} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Current Permissions:</h4>
              <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                {formatData(permissions)}
              </pre>
            </div>
          </TabsContent>
          
          <TabsContent value="storage" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button onClick={clearLocalStorageData} variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Storage Data
              </Button>
              <Button onClick={checkLocalStorage} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              {Object.entries(localStorageData).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <Badge variant="outline">{key}</Badge>
                  <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                    {String(value) || 'null'}
                  </pre>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="device" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-4 h-4" />
              <span className="font-medium">Device Information</span>
              <Button onClick={getDeviceInfo} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Badge variant="secondary" className="mb-2">Network Status</Badge>
                  <div className="flex items-center gap-2">
                    <Wifi className={`w-4 h-4 ${deviceInfo.onLine ? 'text-green-500' : 'text-red-500'}`} />
                    <span className="text-sm">{deviceInfo.onLine ? 'Online' : 'Offline'}</span>
                  </div>
                </div>
                <div>
                  <Badge variant="secondary" className="mb-2">Screen</Badge>
                  <p className="text-sm text-muted-foreground">
                    {deviceInfo.screen?.width}x{deviceInfo.screen?.height}
                  </p>
                </div>
              </div>
              <div>
                <Badge variant="secondary" className="mb-2">Full Device Info</Badge>
                <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                  {formatData(deviceInfo)}
                </pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};