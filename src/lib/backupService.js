/**
 * Backup Service
 *
 * Automatic daily backups to Supabase with 14-day retention.
 * Runs on: app close, successful sync, manual trigger.
 */

import { supabase } from './supabase';
import { getItem } from '../storageHelper';

// All localStorage keys to backup
const BACKUP_KEYS = [
  'health-advisor-profile',
  'health-advisor-activities',
  'health-advisor-chats',
  'health-advisor-playbook',
  'health-advisor-learned-insights',
  'health-advisor-checkins',
  'health-advisor-notes',
  'health-advisor-bookmarks',
  'health-advisor-nutrition-calibration',
  'health-advisor-groceries',
  'health-advisor-focus-goals',
  'health-advisor-goal-history',
  'health-advisor-swaps',
];

const RETENTION_DAYS = 14;

/**
 * Get current user ID
 */
async function getCurrentUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Gather all localStorage data into a single backup object
 */
function gatherBackupData() {
  const data = {};

  for (const key of BACKUP_KEYS) {
    try {
      const raw = getItem(key);
      if (raw) {
        data[key] = JSON.parse(raw);
      }
    } catch (e) {
      console.warn(`[Backup] Failed to read ${key}:`, e.message);
    }
  }

  return data;
}

/**
 * Create or update today's backup in Supabase.
 * Uses UPSERT so only one backup per day per user.
 *
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function createBackup() {
  const userId = await getCurrentUserId();
  if (!userId) {
    console.log('[Backup] No user logged in, skipping backup');
    return { success: false, error: 'Not authenticated' };
  }

  const backupData = gatherBackupData();

  if (Object.keys(backupData).length === 0) {
    console.log('[Backup] No data to backup');
    return { success: true };
  }

  const today = getTodayDate();

  console.log(`[Backup] Creating backup for ${today}...`);

  try {
    const { error } = await supabase
      .from('user_backups')
      .upsert({
        user_id: userId,
        backup_date: today,
        backup_data: backupData,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,backup_date'
      });

    if (error) {
      console.error('[Backup] Failed to create backup:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Backup] ✓ Backup saved for ${today}`);

    // Clean up old backups
    await cleanupOldBackups(userId);

    return { success: true };
  } catch (err) {
    console.error('[Backup] Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete backups older than RETENTION_DAYS
 */
async function cleanupOldBackups(userId) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  try {
    const { error } = await supabase
      .from('user_backups')
      .delete()
      .eq('user_id', userId)
      .lt('backup_date', cutoffStr);

    if (error) {
      console.warn('[Backup] Failed to cleanup old backups:', error.message);
    } else {
      console.log(`[Backup] Cleaned up backups older than ${cutoffStr}`);
    }
  } catch (e) {
    console.warn('[Backup] Cleanup error:', e.message);
  }
}

/**
 * List all available backups for current user
 *
 * @returns {Promise<{success: boolean, backups?: Array<{date: string, created_at: string}>, error?: string}>}
 */
export async function listBackups() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'Not authenticated', backups: [] };
  }

  try {
    const { data, error } = await supabase
      .from('user_backups')
      .select('backup_date, created_at')
      .eq('user_id', userId)
      .order('backup_date', { ascending: false });

    if (error) {
      console.error('[Backup] Failed to list backups:', error);
      return { success: false, error: error.message, backups: [] };
    }

    const backups = data.map(row => ({
      date: row.backup_date,
      created_at: row.created_at,
    }));

    console.log(`[Backup] Found ${backups.length} backups`);
    return { success: true, backups };
  } catch (err) {
    console.error('[Backup] Error listing backups:', err);
    return { success: false, error: err.message, backups: [] };
  }
}

/**
 * Restore from a specific backup date
 *
 * @param {string} backupDate - YYYY-MM-DD format
 * @returns {Promise<{success: boolean, restored?: string[], error?: string}>}
 */
export async function restoreFromBackup(backupDate) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  console.log(`[Backup] Restoring from ${backupDate}...`);

  try {
    const { data, error } = await supabase
      .from('user_backups')
      .select('backup_data')
      .eq('user_id', userId)
      .eq('backup_date', backupDate)
      .single();

    if (error) {
      console.error('[Backup] Failed to fetch backup:', error);
      return { success: false, error: error.message };
    }

    if (!data?.backup_data) {
      return { success: false, error: 'Backup is empty' };
    }

    const restored = [];
    const backupData = data.backup_data;

    // Restore each key to localStorage
    for (const [key, value] of Object.entries(backupData)) {
      try {
        // Use localStorage directly with profile prefix
        const profileId = localStorage.getItem('health-advisor-current-profile') || 'profile_main';
        const prefixedKey = `${profileId}:${key}`;
        localStorage.setItem(prefixedKey, JSON.stringify(value));
        restored.push(key);
        console.log(`[Backup] Restored ${key}`);
      } catch (e) {
        console.warn(`[Backup] Failed to restore ${key}:`, e.message);
      }
    }

    console.log(`[Backup] ✓ Restored ${restored.length} items from ${backupDate}`);
    return { success: true, restored };
  } catch (err) {
    console.error('[Backup] Restore error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Initialize backup service - attach event listeners
 */
export function initBackupService() {
  if (typeof window === 'undefined') return;

  // Backup on page unload (best effort - may not complete)
  window.addEventListener('beforeunload', () => {
    // Use sendBeacon for reliability on page close
    const userId = localStorage.getItem('health-advisor-user-id');
    if (userId) {
      // Fire and forget - createBackup is async but we can't await here
      createBackup().catch(() => {});
    }
  });

  // Backup when app goes to background (mobile)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      createBackup().catch(() => {});
    }
  });

  console.log('[Backup] Service initialized');
}

/**
 * Manual backup trigger - call from settings UI
 */
export async function manualBackup() {
  console.log('[Backup] Manual backup triggered');
  return createBackup();
}

export default {
  createBackup,
  listBackups,
  restoreFromBackup,
  initBackupService,
  manualBackup,
};
