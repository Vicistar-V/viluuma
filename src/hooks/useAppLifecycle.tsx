import { useEffect, useCallback } from 'react';
import { App, AppState } from '@capacitor/app';
import { BackgroundTask } from '@capawesome/capacitor-background-task';
import { useNotifications } from './useNotifications';
import { useAuth } from './useAuth';

export const useAppLifecycle = () => {
  const { syncAndSchedule } = useNotifications();
  const { user } = useAuth();

  const performBackgroundSync = useCallback(async () => {
    if (!user) return;

    console.log('Starting background notification sync...');
    
    try {
      const taskId = await BackgroundTask.beforeExit(async () => {
        console.log('Background task: Syncing notifications before app exit');
        await syncAndSchedule();
      });

      await syncAndSchedule();
      
      await BackgroundTask.finish({ taskId });
      
      console.log('Background sync completed successfully');
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }, [user, syncAndSchedule]);

  const handleAppStateChange = useCallback(async (state: AppState) => {
    if (!user) return;
    
    console.log('Mobile app state changed:', state);
    
    // Background sync when app goes to background
    if (!state.isActive) {
      console.log('App going to background - starting background sync');
      await performBackgroundSync();
    }
    
    // Sync notifications when app becomes active
    if (state.isActive) {
      console.log('App became active - syncing notifications');
      await syncAndSchedule();
    }
  }, [user, performBackgroundSync, syncAndSchedule]);

  const handleAppResumed = useCallback(async () => {
    if (!user) return;
    
    console.log('App resumed, syncing notifications...');
    await syncAndSchedule();
  }, [user, syncAndSchedule]);

  useEffect(() => {
    if (!user) return;

    console.log('Setting up mobile app lifecycle listeners');
    
    let stateListener: any;
    let resumeListener: any;
    
    const setupListeners = async () => {
      console.log('Setting up native app state listeners');
      stateListener = await App.addListener('appStateChange', handleAppStateChange);
      resumeListener = await App.addListener('resume', handleAppResumed);
    };
    
    setupListeners();
    
    return () => {
      console.log('Cleaning up app lifecycle listeners');
      if (stateListener) stateListener.remove();
      if (resumeListener) resumeListener.remove();
    };
  }, [user, handleAppStateChange, handleAppResumed]);

  // Initial sync when hook is first used
  useEffect(() => {
    if (user) {
      console.log('User authenticated, performing initial notification sync...');
      syncAndSchedule();
    }
  }, [user, syncAndSchedule]);
};