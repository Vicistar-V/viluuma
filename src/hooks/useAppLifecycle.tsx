import { useEffect, useCallback, useRef } from 'react';
import { App, AppState } from '@capacitor/app';
import { BackgroundTask } from '@capawesome/capacitor-background-task';
import { useNotifications } from './useNotifications';
import { useAuth } from './useAuth';

export const useAppLifecycle = () => {
  const { syncAndSchedule } = useNotifications();
  const { user } = useAuth();
  const isSyncingRef = useRef(false);
  const lastSyncRef = useRef<number>(0);

  const performBackgroundSync = useCallback(async () => {
    if (!user || isSyncingRef.current) return;

    // Debounce - prevent rapid successive syncs (min 30 seconds apart)
    const now = Date.now();
    if (now - lastSyncRef.current < 30000) {
      console.log('Background sync skipped - too soon since last sync');
      return;
    }

    isSyncingRef.current = true;
    lastSyncRef.current = now;
    console.log('Starting background notification sync...');
    
    try {
      // Use background task only for ensuring completion when app exits
      const taskId = await BackgroundTask.beforeExit(async () => {
        console.log('Background task: Ensuring sync completion before app exit');
        // Just a safety net - the main sync should already be complete
      });

      // Perform the actual sync (only once)
      await syncAndSchedule();
      
      // Finish background task
      await BackgroundTask.finish({ taskId });
      
      console.log('Background sync completed successfully');
    } catch (error) {
      console.error('Background sync failed:', error);
    } finally {
      isSyncingRef.current = false;
    }
  }, [user, syncAndSchedule]);

  const handleAppStateChange = useCallback(async (state: AppState) => {
    if (!user || isSyncingRef.current) return;
    
    console.log('Mobile app state changed:', state);
    
    // Background sync when app goes to background
    if (!state.isActive) {
      console.log('App going to background - starting background sync');
      await performBackgroundSync();
    }
    
    // Simple sync when app becomes active (no background task needed)
    if (state.isActive) {
      console.log('App became active - syncing notifications');
      const now = Date.now();
      if (now - lastSyncRef.current >= 30000) { // Only if enough time has passed
        await syncAndSchedule();
        lastSyncRef.current = now;
      }
    }
  }, [user, performBackgroundSync, syncAndSchedule]);

  const handleAppResumed = useCallback(async () => {
    if (!user || isSyncingRef.current) return;
    
    console.log('App resumed, syncing notifications...');
    const now = Date.now();
    if (now - lastSyncRef.current >= 30000) { // Only if enough time has passed
      await syncAndSchedule();
      lastSyncRef.current = now;
    }
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
    if (user && !isSyncingRef.current) {
      console.log('User authenticated, performing initial notification sync...');
      syncAndSchedule();
      lastSyncRef.current = Date.now();
    }
  }, [user, syncAndSchedule]);
};