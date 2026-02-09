/**
 * Simple Sync Module
 *
 * Clean, zero-transformation sync between localStorage and Supabase.
 * All data is stored as JSONB blobs - exact same format in both places.
 */

import { supabase } from './supabase';
import { getItem, setItem } from '../storageHelper';
import { createBackup } from './backupService';

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
// CONFLICT RESOLUTION HELPERS
// ============================================

/**
 * Extract a timestamp from data for comparison.
 * Looks for common timestamp fields.
 */
function getDataTimestamp(data) {
  if (!data || typeof data !== 'object') return null;

  // Check common timestamp fields in order of preference
  // updatedAt is the primary field we set on every save
  const timestampFields = ['updatedAt', 'updated_at', 'lastModified', 'completedAt', 'createdAt', 'created_at'];
  for (const field of timestampFields) {
    if (data[field]) {
      const ts = new Date(data[field]).getTime();
      if (!isNaN(ts)) return ts;
    }
  }
  return null;
}

/**
 * Count non-empty/meaningful fields in an object
 */
function countMeaningfulFields(data) {
  if (!data || typeof data !== 'object') return 0;
  return Object.entries(data).filter(([key, value]) => {
    // Skip metadata fields
    if (['updatedAt', 'updated_at', 'createdAt', 'created_at'].includes(key)) return false;
    // Count only non-empty values
    return value !== null && value !== undefined && value !== '' &&
           !(Array.isArray(value) && value.length === 0) &&
           !(typeof value === 'object' && Object.keys(value).length === 0);
  }).length;
}

/**
 * Special handling for nutrition calibration data.
 *
 * IRON RULE: A completed calibration (completedAt set) should
 * NEVER, EVER be overwritten with incomplete data. Period.
 */
function shouldPreserveLocalCalibration(localData, remoteData) {
  console.log('[SimpleSync] Calibration check:');
  console.log(`[SimpleSync]   Local completedAt: ${localData?.completedAt || 'NOT SET'}`);
  console.log(`[SimpleSync]   Remote completedAt: ${remoteData?.completedAt || 'NOT SET'}`);

  // IRON RULE: If local has completedAt, NEVER overwrite with data that doesn't
  if (localData?.completedAt && !remoteData?.completedAt) {
    console.log('[SimpleSync]   ⚠️ BLOCKING: Local calibration is COMPLETE, remote is not. KEEPING LOCAL.');
    return true;
  }

  // If local has more completed days, keep local
  const localCompletedDays = countCompletedDays(localData);
  const remoteCompletedDays = countCompletedDays(remoteData);
  console.log(`[SimpleSync]   Local completed days: ${localCompletedDays}`);
  console.log(`[SimpleSync]   Remote completed days: ${remoteCompletedDays}`);

  if (localCompletedDays > remoteCompletedDays) {
    console.log('[SimpleSync]   ⚠️ BLOCKING: Local has more completed days. KEEPING LOCAL.');
    return true;
  }

  // If local has data and remote doesn't have calibration data at all
  if (localData?.startedAt && !remoteData?.startedAt) {
    console.log('[SimpleSync]   ⚠️ BLOCKING: Local has started calibration, remote hasn\'t. KEEPING LOCAL.');
    return true;
  }

  // Compare timestamps if both are incomplete
  const localTs = getDataTimestamp(localData);
  const remoteTs = getDataTimestamp(remoteData);
  if (localTs && remoteTs && localTs > remoteTs) {
    console.log('[SimpleSync]   Local is newer. KEEPING LOCAL.');
    return true;
  }

  console.log('[SimpleSync]   Remote calibration is acceptable.');
  return false;
}

/**
 * Count completed days in calibration data
 */
function countCompletedDays(data) {
  if (!data?.days) return 0;
  return Object.values(data.days).filter(day => day?.completed).length;
}

/**
 * Special handling for profile data.
 * Profile with more fields filled out should be preserved.
 * Also protects critical computed fields like calorieTarget.
 */
function shouldPreserveLocalProfile(localData, remoteData) {
  console.log('[SimpleSync] Profile check:');

  const localFields = countMeaningfulFields(localData);
  const remoteFields = countMeaningfulFields(remoteData);

  console.log(`[SimpleSync]   Local profile fields: ${localFields}`);
  console.log(`[SimpleSync]   Remote profile fields: ${remoteFields}`);

  // If local has more data, preserve it
  if (localFields > remoteFields) {
    console.log('[SimpleSync]   ⚠️ BLOCKING: Local profile has MORE data. KEEPING LOCAL.');
    return true;
  }

  // Critical fields that should never disappear
  const criticalFields = ['calorieTarget', 'weight', 'height', 'age', 'activityLevel', 'meals', 'goals'];
  for (const field of criticalFields) {
    const localHas = localData?.[field] !== null && localData?.[field] !== undefined && localData?.[field] !== '';
    const remoteHas = remoteData?.[field] !== null && remoteData?.[field] !== undefined && remoteData?.[field] !== '';

    if (localHas && !remoteHas) {
      console.log(`[SimpleSync]   ⚠️ BLOCKING: Local has ${field}, remote doesn't. KEEPING LOCAL.`);
      return true;
    }
  }

  // Compare timestamps
  const localTs = getDataTimestamp(localData);
  const remoteTs = getDataTimestamp(remoteData);

  console.log(`[SimpleSync]   Local updatedAt: ${localTs ? new Date(localTs).toISOString() : 'NONE'}`);
  console.log(`[SimpleSync]   Remote updatedAt: ${remoteTs ? new Date(remoteTs).toISOString() : 'NONE'}`);

  if (localTs && remoteTs && localTs > remoteTs) {
    console.log('[SimpleSync]   Local is newer. KEEPING LOCAL.');
    return true;
  }

  if (localTs && !remoteTs) {
    console.log('[SimpleSync]   Local has timestamp, remote doesn\'t. KEEPING LOCAL.');
    return true;
  }

  console.log('[SimpleSync]   Remote profile is acceptable.');
  return false;
}

/**
 * Determine if local data should be preserved over remote data.
 *
 * CRITICAL RULE: LOCAL WINS BY DEFAULT.
 * Remote only overwrites local if we can PROVE remote is:
 * 1. Newer (via timestamp comparison) AND
 * 2. More complete (via field count comparison)
 *
 * This prevents accidental data loss from stale remote data.
 */
function shouldPreserveLocal(localKey, localData, remoteData) {
  console.log(`[SimpleSync] ═══════════════════════════════════════`);
  console.log(`[SimpleSync] SYNC DECISION for: ${localKey}`);

  // RULE 1: If local has data and remote is empty → KEEP LOCAL
  if (localData && (!remoteData || Object.keys(remoteData).length === 0)) {
    console.log(`[SimpleSync] ✓ KEEP LOCAL: Remote is empty, local has data`);
    console.log(`[SimpleSync] ═══════════════════════════════════════`);
    return true;
  }

  // RULE 2: If no local data → Accept remote
  if (!localData || Object.keys(localData).length === 0) {
    console.log(`[SimpleSync] ✓ USE REMOTE: Local is empty`);
    console.log(`[SimpleSync] ═══════════════════════════════════════`);
    return false;
  }

  // RULE 3: Special handling for nutrition calibration - NEVER reset completed
  if (localKey === 'health-advisor-nutrition-calibration') {
    const result = shouldPreserveLocalCalibration(localData, remoteData);
    console.log(`[SimpleSync] ${result ? '✓ KEEP LOCAL' : '✓ USE REMOTE'}: Calibration-specific logic`);
    console.log(`[SimpleSync] ═══════════════════════════════════════`);
    return result;
  }

  // RULE 4: Special handling for profile data - prefer more complete version
  if (localKey === 'health-advisor-profile') {
    const result = shouldPreserveLocalProfile(localData, remoteData);
    console.log(`[SimpleSync] ${result ? '✓ KEEP LOCAL' : '✓ USE REMOTE'}: Profile-specific logic`);
    console.log(`[SimpleSync] ═══════════════════════════════════════`);
    return result;
  }

  // RULE 5: Compare timestamps
  const localTs = getDataTimestamp(localData);
  const remoteTs = getDataTimestamp(remoteData);

  console.log(`[SimpleSync] Local timestamp: ${localTs ? new Date(localTs).toISOString() : 'NONE'}`);
  console.log(`[SimpleSync] Remote timestamp: ${remoteTs ? new Date(remoteTs).toISOString() : 'NONE'}`);

  // If both have timestamps, newer wins
  if (localTs && remoteTs) {
    if (localTs >= remoteTs) {
      console.log(`[SimpleSync] ✓ KEEP LOCAL: Local is newer or same age`);
      console.log(`[SimpleSync] ═══════════════════════════════════════`);
      return true;
    }
    // Remote is strictly newer - but double-check field counts
    const localFields = countMeaningfulFields(localData);
    const remoteFields = countMeaningfulFields(remoteData);
    console.log(`[SimpleSync] Local fields: ${localFields}, Remote fields: ${remoteFields}`);

    if (localFields > remoteFields) {
      console.log(`[SimpleSync] ✓ KEEP LOCAL: Remote is newer but local has MORE data (${localFields} > ${remoteFields})`);
      console.log(`[SimpleSync] ═══════════════════════════════════════`);
      return true;
    }
    console.log(`[SimpleSync] ✓ USE REMOTE: Remote is newer AND has equal or more data`);
    console.log(`[SimpleSync] ═══════════════════════════════════════`);
    return false;
  }

  // RULE 6: Only local has timestamp → KEEP LOCAL
  if (localTs && !remoteTs) {
    console.log(`[SimpleSync] ✓ KEEP LOCAL: Local has timestamp, remote doesn't`);
    console.log(`[SimpleSync] ═══════════════════════════════════════`);
    return true;
  }

  // RULE 7: NO TIMESTAMPS - DEFAULT TO LOCAL (SAFE CHOICE)
  console.log(`[SimpleSync] ✓ KEEP LOCAL: No timestamps available - defaulting to local (safe choice)`);
  console.log(`[SimpleSync] ═══════════════════════════════════════`);
  return true;
}

// ============================================
// LOAD FROM SUPABASE → localStorage
// ============================================

/**
 * Load ALL user data from Supabase into localStorage.
 * Called once on app load after authentication.
 *
 * NOW WITH CONFLICT RESOLUTION:
 * - Compares local and remote data before overwriting
 * - If local is newer or more complete, pushes local TO Supabase instead
 * - Special protection for completed nutrition calibrations
 *
 * @returns {Promise<{success: boolean, loaded: string[], errors: string[], preserved: string[], pushed: string[]}>}
 */
export async function loadFromSupabase() {
  // CHECK FOR SYNC DISABLE FLAG - user can disable sync entirely
  if (typeof window !== 'undefined') {
    const syncDisabled = localStorage.getItem('health-advisor-sync-disabled');
    if (syncDisabled === 'true') {
      console.log('[SimpleSync] ⚠️ SYNC DISABLED BY USER - skipping all remote operations');
      return { success: true, loaded: [], errors: [], preserved: ['ALL - sync disabled'], pushed: [] };
    }
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    console.log('[SimpleSync] No user ID, skipping load');
    return { success: false, loaded: [], errors: ['Not authenticated'], preserved: [], pushed: [] };
  }

  console.log('[SimpleSync] Loading all data from Supabase (with conflict resolution)...');

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
        return { success: true, loaded: [], errors: [], preserved: [], pushed: [] };
      }
      console.error('[SimpleSync] Load error:', error);
      return { success: false, loaded: [], errors: [error.message], preserved: [], pushed: [] };
    }

    const loaded = [];
    const preserved = [];
    const pushed = [];
    const errors = [];

    // For each column, check for conflicts before saving
    for (const column of ALL_COLUMNS) {
      const localKey = COLUMN_TO_KEY[column];
      const remoteValue = data[column];

      if (remoteValue !== null && remoteValue !== undefined) {
        try {
          // Get existing local data
          const localRaw = getItem(localKey);
          const localData = localRaw ? JSON.parse(localRaw) : null;

          // Check if we should preserve local data
          if (localData && shouldPreserveLocal(localKey, localData, remoteValue)) {
            // LOCAL WINS - push local to Supabase instead of overwriting
            preserved.push(localKey);
            console.log(`[SimpleSync] PRESERVED local ${localKey}, pushing to Supabase...`);

            // Push local data to Supabase
            const pushResult = await syncToSupabase(localKey);
            if (pushResult.success) {
              pushed.push(localKey);
              console.log(`[SimpleSync] Pushed ${localKey} to Supabase`);
            } else {
              console.warn(`[SimpleSync] Failed to push ${localKey}: ${pushResult.error}`);
            }
          } else {
            // REMOTE WINS - save to localStorage
            setItem(localKey, JSON.stringify(remoteValue));
            loaded.push(localKey);
            console.log(`[SimpleSync] Loaded ${localKey} from ${column}`);
          }
        } catch (e) {
          errors.push(`Failed to process ${localKey}: ${e.message}`);
        }
      }
    }

    console.log(`[SimpleSync] Sync complete. Loaded: ${loaded.length}, Preserved: ${preserved.length}, Pushed: ${pushed.length}`);
    return { success: true, loaded, errors, preserved, pushed };

  } catch (err) {
    console.error('[SimpleSync] Load failed:', err);
    return { success: false, loaded: [], errors: [err.message], preserved: [], pushed: [] };
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
  // CHECK FOR SYNC DISABLE FLAG
  if (typeof window !== 'undefined') {
    const syncDisabled = localStorage.getItem('health-advisor-sync-disabled');
    if (syncDisabled === 'true') {
      console.log('[SimpleSync] ⚠️ SYNC DISABLED - not pushing to Supabase');
      return { success: true };
    }
  }

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
  // CHECK FOR SYNC DISABLE FLAG
  if (typeof window !== 'undefined') {
    const syncDisabled = localStorage.getItem('health-advisor-sync-disabled');
    if (syncDisabled === 'true') {
      console.log('[SimpleSync] ⚠️ SYNC DISABLED - not pushing to Supabase');
      return { success: true, synced: [], errors: [] };
    }
  }

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
