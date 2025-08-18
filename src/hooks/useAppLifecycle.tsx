import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App, AppState } from '@capacitor/app';
import { useNotifications } from './useNotifications';
import { useAuth } from './useAuth';

export const useAppLifecycle = () => {
  const { syncAndSchedule } = useNotifications();
  const { user } = useAuth();

  const handleAppStateChange = useCallback(async (state: AppState) => {
    if (!user) return;
    
    console.log('App state changed:', state);
    
    // Sync notifications when app becomes active
    if (state.isActive) {
      console.log('App became active, syncing notifications...');
      await syncAndSchedule();
    }
  }, [user, syncAndSchedule]);

  const handleAppResumed = useCallback(async () => {
    if (!user) return;
    
    console.log('App resumed, syncing notifications...');
    await syncAndSchedule();
  }, [user, syncAndSchedule]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      // Web platform - use visibility API
      const handleVisibilityChange = () => {
        if (!document.hidden && user) {
          console.log('Web app became visible, syncing notifications...');
          syncAndSchedule();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      // Native platform - use Capacitor App plugin
      let stateListener: any;
      let resumeListener: any;
      
      const setupListeners = async () => {
        stateListener = await App.addListener('appStateChange', handleAppStateChange);
        resumeListener = await App.addListener('resume', handleAppResumed);
      };
      
      setupListeners();
      
      return () => {
        if (stateListener) stateListener.remove();
        if (resumeListener) resumeListener.remove();
      };
    }
  }, [user, handleAppStateChange, handleAppResumed, syncAndSchedule]);

  // Initial sync when hook is first used
  useEffect(() => {
    if (user) {
      console.log('User authenticated, performing initial notification sync...');
      syncAndSchedule();
    }
  }, [user, syncAndSchedule]);
};