import React from 'react';
import { NotificationMonitoringDashboard } from '@/components/notifications/NotificationMonitoringDashboard';

const NotificationDashboard = () => {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Notification System</h1>
        <p className="text-muted-foreground">Monitor and manage your notification system health</p>
      </div>
      <NotificationMonitoringDashboard />
    </div>
  );
};

export default NotificationDashboard;