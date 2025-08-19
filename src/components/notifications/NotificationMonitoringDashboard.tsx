import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useNotificationMonitoring } from '@/hooks/useNotificationMonitoring';
import { NotificationTestButton } from './NotificationTestButton';

export const NotificationMonitoringDashboard = () => {
  const { cronStatus, metrics, loading, checkCronJobHealth } = useNotificationMonitoring();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Notification System Health
            </CardTitle>
            <CardDescription>
              Monitor cron jobs and notification delivery status
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkCronJobHealth}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Daily Digests</p>
              <p className="text-2xl font-bold">{metrics.dailyDigestsSent}</p>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Coaching Nudges</p>
              <p className="text-2xl font-bold">{metrics.coachingNudgesSent}</p>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Task Reminders</p>
              <p className="text-2xl font-bold">{metrics.taskRemindersSent}</p>
              <p className="text-xs text-muted-foreground">User-set reminders</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Delivery Rate</p>
              <p className="text-2xl font-bold">{metrics.deliveryRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Success rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cron Job Status */}
      <Card>
        <CardHeader>
          <CardTitle>Background Jobs</CardTitle>
          <CardDescription>
            Status of automated notification detection and queueing jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cronStatus.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2" />
                <p>No cron jobs found or monitoring unavailable</p>
              </div>
            ) : (
              cronStatus.map((job) => (
                <div key={job.job_name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <p className="font-medium">{job.job_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Last run: {job.last_run ? new Date(job.last_run).toLocaleString() : 'Never'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                    {job.error_count > 0 && (
                      <Badge variant="outline" className="text-red-500">
                        {job.error_count} errors
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Test Notifications</CardTitle>
          <CardDescription>
            Test your local notification system to ensure it's working properly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationTestButton />
        </CardContent>
      </Card>

      {/* Last Sync Info */}
      {metrics.lastSyncTime && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4" />
              Last notification sync: {new Date(metrics.lastSyncTime).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};