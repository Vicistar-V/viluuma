import { useEffect, useCallback, useRef } from 'react';
import { App, AppState } from '@capacitor/app';
import { useNotifications } from './useNotifications';
import { useAuth } from './useAuth';

export const useAppLifecycle = () => {
  const { syncAndSchedule } = useNotifications();
  const { user } = useAuth();
  const isSyncingRef = useRef(false);
  const lastSyncRef = useRef<number>(0);

  // Centralized sync function with proper debouncing
  const performSync = useCallback(async (context: string) => {
    if (!user || isSyncingRef.current) {
      console.log(`${context}: Sync skipped - user not available or already syncing`);
      return;
    }

    // Debounce - prevent rapid successive syncs (min 30 seconds apart)
    const now = Date.now();
    if (now - lastSyncRef.current < 30000) {
      console.log(`${context}: Sync skipped - too soon since last sync (${now - lastSyncRef.current}ms ago)`);
      return;
    }

    isSyncingRef.current = true;
    lastSyncRef.current = now;
    console.log(`${context}: Starting notification sync...`);
    
    try {
      await syncAndSchedule();
      console.log(`${context}: Sync completed successfully`);
    } catch (error) {
      console.error(`${context}: Sync failed:`, error);
    } finally {
      isSyncingRef.current = false;
    }
  }, [user, syncAndSchedule]);

  const handleAppStateChange = useCallback(async (state: AppState) => {
    if (!user) return;
    
    console.log('Mobile app state changed:', state);
    
    // Sync when app becomes active (foreground)
    if (state.isActive) {
      await performSync('App resumed');
    }
    // Note: No special handling needed for background - mobile OS handles app suspension
  }, [user, performSync]);

  useEffect(() => {
    if (!user) return;

    console.log('Setting up mobile app lifecycle listeners');
    
    let stateListener: any;
    
    const setupListeners = async () => {
      console.log('Setting up native app state listener');
      stateListener = await App.addListener('appStateChange', handleAppStateChange);
    };
    
    setupListeners();
    
    return () => {
      console.log('Cleaning up app lifecycle listeners');
      if (stateListener) stateListener.remove();
    };
  }, [user, handleAppStateChange]);

  // Initial sync when user becomes available
  useEffect(() => {
    if (user) {
      performSync('Initial user authentication');
    }
  }, [user, performSync]);
};