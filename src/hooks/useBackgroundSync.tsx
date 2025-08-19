import { useEffect, useCallback } from 'react';
import { BackgroundTask } from '@capawesome/capacitor-background-task';
import { App } from '@capacitor/app';
import { useNotifications } from './useNotifications';
import { useAuth } from './useAuth';

// Mobile-first background sync for notifications
export const useBackgroundSync = () => {
  const { syncAndSchedule } = useNotifications();
  const { user } = useAuth();

  const performBackgroundSync = useCallback(async () => {
    if (!user) return;

    console.log('Starting background notification sync...');
    
    try {
      // Start background task
      const taskId = await BackgroundTask.beforeExit(async () => {
        console.log('Background task: Syncing notifications before app exit');
        await syncAndSchedule();
      });

      // Perform sync
      await syncAndSchedule();
      
      // Finish background task
      await BackgroundTask.finish({ taskId });
      
      console.log('Background sync completed successfully');
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }, [user, syncAndSchedule]);

  // Setup background sync on app state changes
  useEffect(() => {
    if (!user) return;

    console.log('Setting up background sync listeners');
    
    let appStateListener: any;
    
    const setupListener = async () => {
      appStateListener = await App.addListener('appStateChange', async (state) => {
        console.log('App state changed:', state);
        
        // Sync when app goes to background
        if (!state.isActive) {
          console.log('App going to background - starting sync');
          await performBackgroundSync();
        }
        
        // Sync when app becomes active
        if (state.isActive) {
          console.log('App became active - syncing notifications');
          await syncAndSchedule();
        }
      });
    };
    
    setupListener();
    
    return () => {
      console.log('Cleaning up background sync listeners');
      if (appStateListener) appStateListener.remove();
    };
  }, [user, performBackgroundSync, syncAndSchedule]);

  return { performBackgroundSync };
};