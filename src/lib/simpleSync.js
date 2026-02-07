/**
 * Simple Sync Module
 *
 * Clean, zero-transformation sync between localStorage and Supabase.
 * All data is stored as JSONB blobs - exact same format in both places.
 */

import { supabase } from './supabase';
import { getItem, setItem } from '../storageHelper';

// ============================================
// MAPPING: localStorage key → Supabase column
// ============================================
const SYNC_MAP = {
  'health-advisor-profile': 'profile_data',
  'health-advisor-activities': 'activities_data',
  'health-advisor-chats': 'chats_data',
  'health-advisor-playbook': 'playbook_data',
  'health-advisor-learned-insights': 'insights_data',
  'health-advisor-checkins': 'checkins_data',
  'health-advisor-notes': 'notes_data',
  'health-advisor-bookmarks': 'bookmarks_data',
  'health-advisor-nutrition-calibration': 'nutrition_data',
  'health-advisor-groceries': 'grocery_data',
  'health-advisor-focus-goals': 'goals_data',
  'health-advisor-goal-history': 'goal_history_data',
  'health-advisor-swaps': 'swaps_data',
};

// Reverse mapping: column → localStorage key
const COLUMN_TO_KEY = Object.fromEntries(
  Object.entries(SYNC_MAP).map(([k, v]) => [v, k])
);

// All columns we sync
const ALL_COLUMNS = Object.values(SYNC_MAP);

// ============================================
// GET CURRENT USER
// ============================================
async function getCurrentUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

// ============================================
// LOAD FROM SUPABASE → localStorage
// ============================================

/**
 * Load ALL user data from Supabase into localStorage.
 * Called once on app load after authentication.
 *
 * @returns {Promise<{success: boolean, loaded: string[], errors: string[]}>}
 */
export async function loadFromSupabase() {
  const userId = await getCurrentUserId();
  if (!userId) {
    console.log('[SimpleSync] No user ID, skipping load');
    return { success: false, loaded: [], errors: ['Not authenticated'] };
  }

  console.log('[SimpleSync] Loading all data from Supabase...');

  try {
    // Fetch all columns in one query
    const { data, error } = await supabase
      .from('users_profile')
      .select(ALL_COLUMNS.join(', '))
      .eq('id', userId)
      .single();

    if (error) {
      // PGRST116 = no rows found (new user)
      if (error.code === 'PGRST116') {
        console.log('[SimpleSync] No profile found (new user)');
        return { success: true, loaded: [], errors: [] };
      }
      console.error('[SimpleSync] Load error:', error);
      return { success: false, loaded: [], errors: [error.message] };
    }

    const loaded = [];
    const errors = [];

    // For each column, save to localStorage if it has data
    for (const column of ALL_COLUMNS) {
      const localKey = COLUMN_TO_KEY[column];
      const value = data[column];

      if (value !== null && value !== undefined) {
        try {
          // Save directly to localStorage - NO transformation
          setItem(localKey, JSON.stringify(value));
          loaded.push(localKey);
          console.log(`[SimpleSync] Loaded ${localKey} from ${column}`);
        } catch (e) {
          errors.push(`Failed to save ${localKey}: ${e.message}`);
        }
      }
    }

    console.log(`[SimpleSync] Load complete. Loaded ${loaded.length} data types.`);
    return { success: true, loaded, errors };

  } catch (err) {
    console.error('[SimpleSync] Load failed:', err);
    return { success: false, loaded: [], errors: [err.message] };
  }
}

// ============================================
// SAVE TO SUPABASE (single data type)
// ============================================

/**
 * Push a single data type from localStorage to Supabase.
 * Called by stores after saving to localStorage.
 *
 * @param {string} localKey - The localStorage key (e.g., 'health-advisor-profile')
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function syncToSupabase(localKey) {
  const column = SYNC_MAP[localKey];
  if (!column) {
    console.warn(`[SimpleSync] Unknown key: ${localKey}`);
    return { success: false, error: `Unknown key: ${localKey}` };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    // Not logged in - that's OK, data stays in localStorage
    return { success: true };
  }

  try {
    // Read from localStorage
    const raw = getItem(localKey);
    if (!raw) {
      console.log(`[SimpleSync] No data in ${localKey}, skipping`);
      return { success: true };
    }

    const data = JSON.parse(raw);

    // Push to Supabase - NO transformation
    const { error } = await supabase
      .from('users_profile')
      .update({
        [column]: data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error(`[SimpleSync] Failed to sync ${localKey}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[SimpleSync] Synced ${localKey} → ${column}`);
    return { success: true };

  } catch (err) {
    console.error(`[SimpleSync] Sync error for ${localKey}:`, err);
    return { success: false, error: err.message };
  }
}

// ============================================
// SYNC ALL (push everything to Supabase)
// ============================================

/**
 * Push ALL localStorage data to Supabase.
 * Useful for initial migration or manual "save all".
 *
 * @returns {Promise<{success: boolean, synced: string[], errors: string[]}>}
 */
export async function syncAllToSupabase() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, synced: [], errors: ['Not authenticated'] };
  }

  console.log('[SimpleSync] Syncing all data to Supabase...');

  const updates = {};
  const synced = [];
  const errors = [];

  // Gather all localStorage data
  for (const [localKey, column] of Object.entries(SYNC_MAP)) {
    try {
      const raw = getItem(localKey);
      if (raw) {
        updates[column] = JSON.parse(raw);
        synced.push(localKey);
      }
    } catch (e) {
      errors.push(`Failed to read ${localKey}: ${e.message}`);
    }
  }

  if (Object.keys(updates).length === 0) {
    console.log('[SimpleSync] No data to sync');
    return { success: true, synced: [], errors };
  }

  // Add timestamp
  updates.updated_at = new Date().toISOString();

  // Push all at once
  const { error } = await supabase
    .from('users_profile')
    .update(updates)
    .eq('id', userId);

  if (error) {
    console.error('[SimpleSync] Sync all failed:', error);
    return { success: false, synced: [], errors: [error.message] };
  }

  console.log(`[SimpleSync] Synced ${synced.length} data types to Supabase`);
  return { success: true, synced, errors };
}

// ============================================
// DEBOUNCED SYNC (for frequent updates)
// ============================================

const syncTimers = {};
const pendingSyncs = new Set(); // Track keys that need syncing
const DEBOUNCE_MS = 1000; // Wait 1 second before syncing

/**
 * Debounced sync - prevents flooding Supabase with rapid updates.
 * Use this for data that changes frequently (e.g., typing in a meal).
 *
 * @param {string} localKey - The localStorage key
 */
export function syncToSupabaseDebounced(localKey) {
  // Track this key as needing sync
  pendingSyncs.add(localKey);

  // Clear existing timer for this key
  if (syncTimers[localKey]) {
    clearTimeout(syncTimers[localKey]);
  }

  // Set new timer
  syncTimers[localKey] = setTimeout(() => {
    syncToSupabase(localKey);
    pendingSyncs.delete(localKey);
    delete syncTimers[localKey];
  }, DEBOUNCE_MS);
}

/**
 * Flush all pending debounced syncs immediately.
 * Called on page unload to prevent data loss.
 */
export function flushPendingSyncs() {
  for (const localKey of pendingSyncs) {
    if (syncTimers[localKey]) {
      clearTimeout(syncTimers[localKey]);
      delete syncTimers[localKey];
    }
    // Fire sync immediately (can't await in beforeunload)
    syncToSupabase(localKey);
  }
  pendingSyncs.clear();
}

// Flush pending syncs when user leaves the page
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPendingSyncs);
  // Also handle visibility change (mobile browsers)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPendingSyncs();
    }
  });
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Sync profile data to Supabase
 */
export function syncProfile() {
  return syncToSupabaseDebounced('health-advisor-profile');
}

/**
 * Sync activities data to Supabase
 */
export function syncActivities() {
  return syncToSupabaseDebounced('health-advisor-activities');
}

/**
 * Sync chats data to Supabase
 */
export function syncChats() {
  return syncToSupabaseDebounced('health-advisor-chats');
}

/**
 * Sync playbook data to Supabase
 */
export function syncPlaybook() {
  return syncToSupabaseDebounced('health-advisor-playbook');
}

/**
 * Sync insights data to Supabase
 */
export function syncInsights() {
  return syncToSupabaseDebounced('health-advisor-learned-insights');
}

/**
 * Sync checkins data to Supabase
 */
export function syncCheckins() {
  return syncToSupabaseDebounced('health-advisor-checkins');
}

/**
 * Sync notes data to Supabase
 */
export function syncNotes() {
  return syncToSupabaseDebounced('health-advisor-notes');
}

/**
 * Sync bookmarks data to Supabase
 */
export function syncBookmarks() {
  return syncToSupabaseDebounced('health-advisor-bookmarks');
}

/**
 * Sync nutrition data to Supabase (debounced, for frequent updates like typing)
 */
export function syncNutrition() {
  return syncToSupabaseDebounced('health-advisor-nutrition-calibration');
}

/**
 * Sync nutrition data to Supabase IMMEDIATELY (no debounce).
 * Use for critical state changes: startCalibration, completeDay, etc.
 */
export function syncNutritionImmediate() {
  return syncToSupabase('health-advisor-nutrition-calibration');
}

/**
 * Sync grocery data to Supabase
 */
export function syncGrocery() {
  return syncToSupabaseDebounced('health-advisor-groceries');
}

/**
 * Sync focus goals to Supabase
 */
export function syncGoals() {
  return syncToSupabaseDebounced('health-advisor-focus-goals');
}

/**
 * Sync goal history to Supabase
 */
export function syncGoalHistory() {
  return syncToSupabaseDebounced('health-advisor-goal-history');
}

/**
 * Sync swaps data to Supabase
 */
export function syncSwaps() {
  return syncToSupabaseDebounced('health-advisor-swaps');
}

// ============================================
// HOOK FOR REACT COMPONENTS
// ============================================

/**
 * Create a React hook for sync status.
 * Import and use in App.jsx
 */
export function createSyncHook() {
  return {
    loadFromSupabase,
    syncToSupabase,
    syncAllToSupabase,
    syncToSupabaseDebounced,
    // Convenience functions
    syncProfile,
    syncActivities,
    syncChats,
    syncPlaybook,
    syncInsights,
    syncCheckins,
    syncNotes,
    syncBookmarks,
    syncNutrition,
    syncNutritionImmediate,
    syncGrocery,
    syncGoals,
    syncGoalHistory,
    syncSwaps,
  };
}

export default {
  loadFromSupabase,
  syncToSupabase,
  syncAllToSupabase,
  syncToSupabaseDebounced,
  flushPendingSyncs,
  syncProfile,
  syncActivities,
  syncChats,
  syncPlaybook,
  syncInsights,
  syncCheckins,
  syncNotes,
  syncBookmarks,
  syncNutrition,
  syncNutritionImmediate,
  syncGrocery,
  syncGoals,
  syncGoalHistory,
  syncSwaps,
  SYNC_MAP,
};
