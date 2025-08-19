import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CronJobStatus {
  job_name: string;
  last_run: string | null;
  next_run: string | null;
  status: 'active' | 'inactive' | 'error';
  error_count: number;
}

interface NotificationMetrics {
  dailyDigestsSent: number;
  coachingNudgesSent: number;
  taskRemindersSent: number;
  deliveryRate: number;
  lastSyncTime: string | null;
}

export const useNotificationMonitoring = () => {
  const [cronStatus, setCronStatus] = useState<CronJobStatus[]>([]);
  const [metrics, setMetrics] = useState<NotificationMetrics>({
    dailyDigestsSent: 0,
    coachingNudgesSent: 0,
    taskRemindersSent: 0,
    deliveryRate: 0,
    lastSyncTime: null,
  });
  const [loading, setLoading] = useState(false);

  const checkCronJobHealth = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_cron_job_status');
      
      if (error) {
        console.error('Error checking cron job health:', error);
        return;
      }

      // Transform data to match expected interface
      const transformedData: CronJobStatus[] = (data || []).map((job: any) => ({
        job_name: job.jobname || 'unknown',
        last_run: job.last_run || null,
        next_run: job.schedule || null,
        status: job.active ? 'active' : 'inactive',
        error_count: 0
      }));

      setCronStatus(transformedData);
    } catch (error) {
      console.error('Error in checkCronJobHealth:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getNotificationMetrics = useCallback(async () => {
    try {
      // Get message counts from last 7 days using new schema
      const { data: messageStats, error } = await supabase
        .from('user_messages')
        .select('message_type, is_acknowledged, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('Error getting notification metrics:', error);
        return;
      }

      const stats = messageStats?.reduce((acc, msg) => {
        if (msg.message_type === 'daily_digest') acc.dailyDigestsSent++;
        else if (msg.message_type.includes('coaching') || msg.message_type === 'slump_detector') acc.coachingNudgesSent++;
        return acc;
      }, {
        dailyDigestsSent: 0,
        coachingNudgesSent: 0,
        taskRemindersSent: 0, // This comes from local storage
        deliveryRate: 0,
        lastSyncTime: new Date().toISOString(),
      });

      if (stats) {
        const totalSent = stats.dailyDigestsSent + stats.coachingNudgesSent;
        const acknowledged = messageStats?.filter(m => m.is_acknowledged).length || 0;
        stats.deliveryRate = totalSent > 0 ? (acknowledged / totalSent) * 100 : 100;
        
        setMetrics(stats);
      }
    } catch (error) {
      console.error('Error in getNotificationMetrics:', error);
    }
  }, []);

  const recordNotificationSent = useCallback((type: 'daily_digest' | 'coaching_nudge' | 'task_reminder') => {
    // Record local notification metrics
    const key = `notification_${type}_count`;
    const current = parseInt(localStorage.getItem(key) || '0');
    localStorage.setItem(key, (current + 1).toString());
    
    // Update last sync time
    localStorage.setItem('last_notification_sync', new Date().toISOString());
  }, []);

  useEffect(() => {
    checkCronJobHealth();
    getNotificationMetrics();
    
    // Set up periodic health checks
    const healthCheckInterval = setInterval(() => {
      checkCronJobHealth();
      getNotificationMetrics();
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(healthCheckInterval);
  }, [checkCronJobHealth, getNotificationMetrics]);

  return {
    cronStatus,
    metrics,
    loading,
    checkCronJobHealth,
    getNotificationMetrics,
    recordNotificationSent,
  };
};