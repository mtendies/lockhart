/**
 * useSimpleSync - React hook for simple Supabase sync
 *
 * Usage in App.jsx:
 *   const { syncStatus, refresh } = useSimpleSync();
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  loadFromSupabase,
  syncAllToSupabase,
  syncToSupabase,
} from '../lib/simpleSync';

// Module-level flag to prevent double loading across component remounts
// This survives React StrictMode double-renders and component remounts
let hasLoadedThisSession = false;

export function useSimpleSync() {
  const { user, isAuthenticated } = useAuth();
  const [syncStatus, setSyncStatus] = useState(hasLoadedThisSession ? 'ready' : 'idle');
  const [lastSynced, setLastSynced] = useState(null);
  const [error, setError] = useState(null);
  // FIX #12: Track online/offline state for graceful degradation
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [supabaseDown, setSupabaseDown] = useState(false);

  // FIX #12: Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('[useSimpleSync] Back online');
      setIsOffline(false);
      setSupabaseDown(false);
    };

    const handleOffline = () => {
      console.log('[useSimpleSync] Went offline');
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load from Supabase on mount (when authenticated)
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setSyncStatus('idle');
      return;
    }

    // Only load once per session (module-level check survives remounts)
    if (hasLoadedThisSession) {
      console.log('[useSimpleSync] Already loaded this session, skipping');
      setSyncStatus('ready');
      return;
    }

    async function doLoad() {
      setSyncStatus('loading');
      setError(null);

      console.log('[useSimpleSync] Loading data from Supabase...');
      const result = await loadFromSupabase();

      if (result.success) {
        setSyncStatus('ready');
        setLastSynced(new Date());
        setSupabaseDown(false);
        hasLoadedThisSession = true;
        console.log('[useSimpleSync] Load complete:', result.loaded);

        // Dispatch custom event to notify components that sync is complete
        // Components can listen for this to re-read data
        window.dispatchEvent(new CustomEvent('supabase-sync-complete', {
          detail: { loaded: result.loaded }
        }));
      } else {
        // FIX #12: Detect Supabase downtime vs other errors
        const errorStr = result.errors.join(', ');
        const isConnectionError = errorStr.includes('fetch') ||
          errorStr.includes('network') ||
          errorStr.includes('Failed to fetch') ||
          errorStr.includes('NetworkError') ||
          errorStr.includes('timeout');

        if (isConnectionError && navigator.onLine) {
          // Online but can't reach Supabase = Supabase is down
          setSupabaseDown(true);
          console.warn('[useSimpleSync] Supabase appears to be down');
        }

        setSyncStatus('error');
        setError(errorStr);
        console.error('[useSimpleSync] Load failed:', result.errors);
      }
    }

    doLoad();
  }, [isAuthenticated, user?.id]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    setSyncStatus('loading');
    setError(null);

    const result = await loadFromSupabase();

    if (result.success) {
      setSyncStatus('ready');
      setLastSynced(new Date());
      // Reload page to show fresh data
      window.location.reload();
    } else {
      setSyncStatus('error');
      setError(result.errors.join(', '));
    }

    return result;
  }, [isAuthenticated, user?.id]);

  // Push all data to Supabase (for migration)
  const pushAll = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    console.log('[useSimpleSync] Pushing all data to Supabase...');
    const result = await syncAllToSupabase();

    if (result.success) {
      setLastSynced(new Date());
      console.log('[useSimpleSync] Push complete:', result.synced);
    } else {
      console.error('[useSimpleSync] Push failed:', result.errors);
    }

    return result;
  }, [isAuthenticated, user?.id]);

  // Sync a single data type
  const sync = useCallback(async (localKey) => {
    return syncToSupabase(localKey);
  }, []);

  return {
    syncStatus,
    lastSynced,
    error,
    refresh,    // Pull fresh data from Supabase
    pushAll,    // Push all localStorage to Supabase (for migration)
    sync,       // Sync a single data type
    isReady: syncStatus === 'ready',
    isLoading: syncStatus === 'loading',
    // FIX #12: Expose offline/connection status for UI feedback
    isOffline,      // Browser is offline
    supabaseDown,   // Online but Supabase unreachable
  };
}

export default useSimpleSync;
