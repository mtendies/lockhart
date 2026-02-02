/**
 * useSupabaseSync - Hook for syncing data between localStorage and Supabase
 *
 * On mount (when authenticated):
 * - Loads all user data from Supabase
 * - Populates localStorage stores as cache
 *
 * Provides sync functions for real-time updates
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as dataService from '../lib/dataService';
import { getItem, setItem } from '../storageHelper';

// Storage keys that map to Supabase tables
const SYNC_KEYS = {
  profile: 'health-advisor-profile',
  activities: 'health-advisor-activities',
  playbook: 'health-advisor-playbook',
  chats: 'health-advisor-chats',
  insights: 'health-advisor-learned-insights',
  checkins: 'health-advisor-checkins',
  nutrition: 'health-advisor-nutrition-calibration',
  notes: 'health-advisor-notes',
  grocery: 'health-advisor-groceries',
};

export function useSupabaseSync() {
  const { user, isAuthenticated } = useAuth();
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | synced | error
  const [lastSynced, setLastSynced] = useState(null);
  const [syncErrors, setSyncErrors] = useState([]);

  // Load all data from Supabase into localStorage
  // IMPORTANT: Only overwrites local data if Supabase has MORE data
  const loadFromSupabase = useCallback(async () => {
    if (!user?.id) return;

    setSyncStatus('syncing');
    setSyncErrors([]);

    try {
      const results = await dataService.loadAllData(user.id);

      // Helper: merge data from Supabase with local data
      // For arrays: merge by ID, keeping all unique items
      // For objects: only set if local is empty
      const safeUpdate = (key, newData, isArray = false) => {
        if (!newData) return false;
        if (isArray && (!Array.isArray(newData) || newData.length === 0)) return false;

        const existing = getItem(key);
        if (!existing) {
          // No local data, safe to set from Supabase
          setItem(key, JSON.stringify(newData));
          return true;
        }

        // Has local data
        if (isArray) {
          try {
            const localData = JSON.parse(existing);
            if (!Array.isArray(localData)) {
              // Local data is corrupt, overwrite
              setItem(key, JSON.stringify(newData));
              return true;
            }

            // Merge arrays by ID - keep all unique items from both sources
            const localIds = new Set(localData.map(item => item.id));
            const merged = [...localData];

            for (const item of newData) {
              if (item.id && !localIds.has(item.id)) {
                merged.push(item);
              }
            }

            // Only update if we added new items
            if (merged.length > localData.length) {
              setItem(key, JSON.stringify(merged));
              return true;
            }
          } catch {
            // Local data is corrupt, safe to overwrite
            setItem(key, JSON.stringify(newData));
            return true;
          }
        }

        // For non-arrays, don't overwrite existing local data
        // User can manually push to sync local → cloud
        return false;
      };

      // Store profile - always update from Supabase for authenticated users
      // This ensures profile data syncs correctly across devices
      if (results.profile) {
        console.log('[Sync] Received profile from Supabase:', results.profile.name);
        // For profiles, always prefer Supabase data when loading
        // Local profile is only used as cache between sessions
        const existing = getItem(SYNC_KEYS.profile);
        if (!existing) {
          console.log('[Sync] No local profile, using Supabase data');
          setItem(SYNC_KEYS.profile, JSON.stringify(results.profile));
        } else {
          // Merge: use Supabase data but preserve any local-only fields
          try {
            const localProfile = JSON.parse(existing);
            const merged = { ...localProfile, ...results.profile };
            console.log('[Sync] Merged profile:', merged.name);
            setItem(SYNC_KEYS.profile, JSON.stringify(merged));
          } catch {
            console.log('[Sync] Local profile corrupt, using Supabase data');
            setItem(SYNC_KEYS.profile, JSON.stringify(results.profile));
          }
        }
      }

      // Store activities (only if Supabase has more)
      if (results.activities?.length > 0) {
        const activities = results.activities.map(a => ({
          ...a,
          date: a.timestamp?.split('T')[0],
          weekOf: getWeekOf(a.timestamp),
        }));
        safeUpdate(SYNC_KEYS.activities, activities, true);
      }

      // Store playbook (only if no local playbook)
      if (results.playbook) {
        safeUpdate(SYNC_KEYS.playbook, results.playbook, false);
      }

      // Store conversations (only if Supabase has more)
      if (results.conversations?.length > 0) {
        safeUpdate(SYNC_KEYS.chats, results.conversations, true);
      }

      // Store insights (only if Supabase has more)
      if (results.insights?.length > 0) {
        safeUpdate(SYNC_KEYS.insights, results.insights, true);
      }

      // Store check-ins (only if Supabase has more)
      if (results.checkins?.length > 0) {
        safeUpdate(SYNC_KEYS.checkins, results.checkins, true);
      }

      // Store nutrition calibration (only if no local)
      if (results.nutritionCalibration) {
        safeUpdate(SYNC_KEYS.nutrition, results.nutritionCalibration, false);
      }

      // Store notes (only if no local notes)
      if (results.notes && Object.keys(results.notes).length > 0) {
        safeUpdate(SYNC_KEYS.notes, results.notes, false);
      }

      // Store grocery data (only if no local grocery data)
      if (results.grocery) {
        safeUpdate(SYNC_KEYS.grocery, results.grocery, false);
      }

      if (results.errors?.length > 0) {
        setSyncErrors(results.errors);
        setSyncStatus('error');
      } else {
        setSyncStatus('synced');
        setLastSynced(new Date());
      }

      return results;
    } catch (err) {
      console.error('Supabase sync error:', err);
      setSyncErrors([{ type: 'general', error: err }]);
      setSyncStatus('error');
      return null;
    }
  }, [user?.id]);

  // Push all localStorage data to Supabase
  const pushToSupabase = useCallback(async () => {
    if (!user?.id) return;

    setSyncStatus('syncing');
    const errors = [];

    try {
      // Sync profile
      const profileData = getItem(SYNC_KEYS.profile);
      if (profileData) {
        const profile = JSON.parse(profileData);
        const { error } = await dataService.upsertProfile(user.id, profile);
        if (error) errors.push({ type: 'profile', error });
      }

      // Sync activities
      const activitiesData = getItem(SYNC_KEYS.activities);
      if (activitiesData) {
        const activities = JSON.parse(activitiesData);
        for (const activity of activities) {
          const { error } = await dataService.addActivity(user.id, activity);
          if (error && error.code !== '23505') { // Ignore duplicate key errors
            errors.push({ type: 'activity', error });
          }
        }
      }

      // Sync playbook
      const playbookData = getItem(SYNC_KEYS.playbook);
      if (playbookData) {
        const playbook = JSON.parse(playbookData);
        const { error } = await dataService.upsertPlaybook(user.id, playbook);
        if (error) errors.push({ type: 'playbook', error });
      }

      // Sync conversations
      const chatsData = getItem(SYNC_KEYS.chats);
      if (chatsData) {
        const chats = JSON.parse(chatsData);
        for (const chat of chats) {
          const { error } = await dataService.upsertConversation(user.id, chat);
          if (error) errors.push({ type: 'conversation', error });
        }
      }

      // Sync insights
      const insightsData = getItem(SYNC_KEYS.insights);
      if (insightsData) {
        const insights = JSON.parse(insightsData);
        for (const insight of insights) {
          const { error } = await dataService.addLearnedInsight(user.id, {
            text: insight.text || insight.insight,
            category: insight.category,
            confidence: insight.confidence,
          });
          if (error && error.code !== '23505') {
            errors.push({ type: 'insight', error });
          }
        }
      }

      // Sync check-ins
      const checkinsData = getItem(SYNC_KEYS.checkins);
      if (checkinsData) {
        const checkins = JSON.parse(checkinsData);
        for (const checkin of checkins) {
          const { error } = await dataService.upsertCheckin(user.id, checkin);
          if (error) errors.push({ type: 'checkin', error });
        }
      }

      // Sync grocery data
      const groceryData = getItem(SYNC_KEYS.grocery);
      if (groceryData) {
        const grocery = JSON.parse(groceryData);
        const { error } = await dataService.upsertGroceryData(user.id, grocery);
        if (error) errors.push({ type: 'grocery', error });
      }

      if (errors.length > 0) {
        setSyncErrors(errors);
        setSyncStatus('error');
      } else {
        setSyncStatus('synced');
        setLastSynced(new Date());
      }

      return { errors };
    } catch (err) {
      console.error('Push to Supabase error:', err);
      setSyncErrors([{ type: 'general', error: err }]);
      setSyncStatus('error');
      return { errors: [{ type: 'general', error: err }] };
    }
  }, [user?.id]);

  // Sync specific data type to Supabase
  const syncToSupabase = useCallback(async (type, data) => {
    if (!user?.id) return { error: 'Not authenticated' };

    try {
      switch (type) {
        case 'profile':
          return await dataService.upsertProfile(user.id, data);
        case 'activity':
          return await dataService.addActivity(user.id, data);
        case 'playbook':
          return await dataService.upsertPlaybook(user.id, data);
        case 'conversation':
          return await dataService.upsertConversation(user.id, data);
        case 'insight':
          return await dataService.addLearnedInsight(user.id, data);
        case 'checkin':
          return await dataService.upsertCheckin(user.id, data);
        case 'nutritionDay':
          return await dataService.upsertNutritionDay(user.id, data.date, data.meals, data.complete);
        case 'grocery':
          return await dataService.upsertGroceryData(user.id, data);
        default:
          return { error: `Unknown sync type: ${type}` };
      }
    } catch (err) {
      console.error(`Sync ${type} error:`, err);
      return { error: err };
    }
  }, [user?.id]);

  // Force load from Supabase (for data recovery)
  // This will OVERWRITE local data with Supabase data
  const forceLoadFromSupabase = useCallback(async () => {
    if (!user?.id) return null;

    console.log('[Sync] FORCE loading from Supabase (will overwrite local data)...');
    setSyncStatus('syncing');
    setSyncErrors([]);

    try {
      const results = await dataService.loadAllData(user.id);

      // Force update - overwrite local data
      if (results.profile) {
        setItem(SYNC_KEYS.profile, JSON.stringify(results.profile));
      }
      if (results.activities?.length > 0) {
        const activities = results.activities.map(a => ({
          ...a,
          date: a.timestamp?.split('T')[0],
          weekOf: getWeekOf(a.timestamp),
        }));
        setItem(SYNC_KEYS.activities, JSON.stringify(activities));
      }
      if (results.playbook) {
        setItem(SYNC_KEYS.playbook, JSON.stringify(results.playbook));
      }
      if (results.conversations?.length > 0) {
        setItem(SYNC_KEYS.chats, JSON.stringify(results.conversations));
      }
      if (results.insights?.length > 0) {
        setItem(SYNC_KEYS.insights, JSON.stringify(results.insights));
      }
      if (results.checkins?.length > 0) {
        setItem(SYNC_KEYS.checkins, JSON.stringify(results.checkins));
      }
      if (results.nutritionCalibration) {
        setItem(SYNC_KEYS.nutrition, JSON.stringify(results.nutritionCalibration));
      }
      if (results.notes && Object.keys(results.notes).length > 0) {
        setItem(SYNC_KEYS.notes, JSON.stringify(results.notes));
      }
      if (results.grocery) {
        setItem(SYNC_KEYS.grocery, JSON.stringify(results.grocery));
      }

      setSyncStatus('synced');
      setLastSynced(new Date());
      console.log('[Sync] Force load complete. Refresh the page to see restored data.');
      return results;
    } catch (err) {
      console.error('Force sync error:', err);
      setSyncErrors([{ type: 'general', error: err }]);
      setSyncStatus('error');
      return null;
    }
  }, [user?.id]);

  // Auto-load from Supabase when authenticated
  // ALWAYS loads missing data from Supabase, then pushes local data
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // Only run auto-sync once per session
      const syncKey = `health-advisor-sync-done-${user.id}`;
      if (sessionStorage.getItem(syncKey)) {
        // Already synced this session - mark as synced so UI doesn't wait
        setSyncStatus('synced');
        return;
      }

      // Always load from Supabase to get any missing data (conversations, nutrition, etc.)
      // The safeUpdate helper prevents overwriting local data that has more items
      console.log('[Sync] Loading data from Supabase...');
      loadFromSupabase().then(() => {
        localStorage.setItem('health-advisor-last-supabase-sync', Date.now().toString());
        sessionStorage.setItem(syncKey, 'true');
        // After loading, push any local data that might be newer/missing from Supabase
        pushToSupabase();
      });
    }
  }, [isAuthenticated, user?.id, loadFromSupabase, pushToSupabase]);

  return {
    syncStatus,
    lastSynced,
    syncErrors,
    loadFromSupabase,
    pushToSupabase,
    syncToSupabase,
    forceLoadFromSupabase, // For data recovery - overwrites local data
    isAuthenticated,
    userId: user?.id,
  };
}

// Helper to calculate week of
function getWeekOf(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

export default useSupabaseSync;
