/**
 * useSupabaseSync - Hook for syncing data between localStorage and Supabase
 *
 * On mount (when authenticated):
 * - Loads all user data from Supabase
 * - Populates localStorage stores as cache
 *
 * On data change:
 * - syncHelper.js handles auto-push to Supabase
 *
 * Provides sync functions for real-time updates
 */

import { useEffect, useState, useCallback, useRef } from 'react';
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
  const [supabaseProfile, setSupabaseProfile] = useState(null); // Profile loaded from Supabase
  const [dataVersion, setDataVersion] = useState(0); // Increment to trigger UI refresh
  const isSyncingRef = useRef(false); // Prevent concurrent syncs

  // Load all data from Supabase into localStorage
  // IMPORTANT: Only overwrites local data if Supabase has MORE data
  const loadFromSupabase = useCallback(async (options = {}) => {
    const { silent = false } = options;
    console.log('[Sync] loadFromSupabase called, user:', user?.id, 'silent:', silent);

    if (!user?.id) return null;

    // Prevent concurrent syncs
    if (isSyncingRef.current) {
      console.log('[Sync] Already syncing, skipping...');
      return null;
    }
    isSyncingRef.current = true;

    if (!silent) {
      setSyncStatus('syncing');
    }
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

      // Store profile - Supabase is the SOURCE OF TRUTH for authenticated users
      // Always use Supabase profile if it exists and has onboarding_complete=true
      if (results.profile) {
        console.log('[Sync] Received profile from Supabase:', results.profile.name, 'onboarding_complete:', results.profile.onboardingComplete);
        // ALWAYS save Supabase profile to localStorage - Supabase is source of truth
        setItem(SYNC_KEYS.profile, JSON.stringify(results.profile));
        // Also set state so App.jsx can use it immediately
        setSupabaseProfile(results.profile);
        console.log('[Sync] Profile saved to localStorage from Supabase');
      } else {
        console.log('[Sync] No profile found in Supabase');
        setSupabaseProfile(null);
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

      // Store nutrition calibration - smart merge to avoid overwriting local edits
      // Only update local if Supabase has MORE meal content (prevents race conditions)
      if (results.nutritionCalibration) {
        const existingRaw = getItem(SYNC_KEYS.nutrition);
        if (!existingRaw) {
          // No local data, safe to set from Supabase
          console.log('[Sync] No local nutrition data, using Supabase data');
          setItem(SYNC_KEYS.nutrition, JSON.stringify(results.nutritionCalibration));
        } else {
          try {
            const localData = JSON.parse(existingRaw);
            const remoteData = results.nutritionCalibration;

            // Count meals with content in each version
            const countMealsWithContent = (data) => {
              if (!data?.days) return 0;
              let count = 0;
              for (const day of Object.values(data.days)) {
                if (day?.meals) {
                  count += day.meals.filter(m => m.content?.trim()).length;
                }
              }
              return count;
            };

            const localMealCount = countMealsWithContent(localData);
            const remoteMealCount = countMealsWithContent(remoteData);

            console.log('[Sync] Nutrition comparison - local meals:', localMealCount, ', remote meals:', remoteMealCount);

            if (remoteMealCount > localMealCount) {
              // Supabase has more data - use it (likely a fresh device)
              console.log('[Sync] Supabase has more nutrition data, using remote');
              setItem(SYNC_KEYS.nutrition, JSON.stringify(remoteData));
            } else if (localMealCount > 0) {
              // Local has equal or more data - keep local (user may have unsaved edits)
              console.log('[Sync] Keeping local nutrition data (has', localMealCount, 'meals)');
            } else if (remoteMealCount > 0) {
              // Both empty but remote has structure - use remote
              console.log('[Sync] Using remote nutrition structure');
              setItem(SYNC_KEYS.nutrition, JSON.stringify(remoteData));
            }
            // If both are empty, keep whatever structure exists locally
          } catch (e) {
            // Local data is corrupt, use Supabase
            console.log('[Sync] Local nutrition data corrupt, using Supabase');
            setItem(SYNC_KEYS.nutrition, JSON.stringify(results.nutritionCalibration));
          }
        }
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
        // Bump version to trigger UI refresh
        setDataVersion(v => v + 1);
      }

      isSyncingRef.current = false;
      return results;
    } catch (err) {
      console.error('Supabase sync error:', err);
      setSyncErrors([{ type: 'general', error: err }]);
      setSyncStatus('error');
      isSyncingRef.current = false;
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

  // Force load from Supabase (for data recovery or manual refresh)
  // This will OVERWRITE local data with Supabase data
  const forceLoadFromSupabase = useCallback(async () => {
    if (!user?.id) return null;

    // Prevent concurrent syncs
    if (isSyncingRef.current) {
      console.log('[Sync] Already syncing, skipping force load...');
      return null;
    }
    isSyncingRef.current = true;

    console.log('[Sync] FORCE loading from Supabase (will overwrite local data)...');
    setSyncStatus('syncing');
    setSyncErrors([]);

    try {
      const results = await dataService.loadAllData(user.id);

      // Force update - overwrite local data
      if (results.profile) {
        setItem(SYNC_KEYS.profile, JSON.stringify(results.profile));
        setSupabaseProfile(results.profile);
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
      setDataVersion(v => v + 1); // Bump version to trigger UI refresh
      isSyncingRef.current = false;
      console.log('[Sync] Force load complete.');
      return results;
    } catch (err) {
      console.error('Force sync error:', err);
      setSyncErrors([{ type: 'general', error: err }]);
      setSyncStatus('error');
      isSyncingRef.current = false;
      return null;
    }
  }, [user?.id]);

  // Auto-load from Supabase when authenticated
  // Runs on EVERY mount/refresh - no session check
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // Always load from Supabase to get the latest data
      // This ensures data is fresh on every app load/refresh
      console.log('[Sync] Auto-loading data from Supabase on mount...');
      loadFromSupabase({ silent: false }).then((results) => {
        if (results) {
          localStorage.setItem('health-advisor-last-supabase-sync', Date.now().toString());
          console.log('[Sync] Auto-sync complete');
        }
      });
    }
  }, [isAuthenticated, user?.id, loadFromSupabase]);

  // Manual refresh function - forces a fresh pull from Supabase
  const refreshFromCloud = useCallback(async () => {
    console.log('[Sync] Manual refresh requested...');
    return await forceLoadFromSupabase();
  }, [forceLoadFromSupabase]);

  return {
    syncStatus,
    lastSynced,
    syncErrors,
    loadFromSupabase,
    pushToSupabase,
    syncToSupabase,
    forceLoadFromSupabase,
    refreshFromCloud, // Manual refresh - pulls fresh data from Supabase
    isAuthenticated,
    userId: user?.id,
    supabaseProfile,
    dataVersion, // Increments when data is loaded from Supabase - use to trigger re-renders
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
