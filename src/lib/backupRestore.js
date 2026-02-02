/**
 * Backup & Restore System
 * Exports all user data to JSON and restores from backup files
 */

import { getActiveProfileId, PROFILE_STORAGE_KEYS } from '../profileStore';
import { supabase } from './supabase';
import * as dataService from './dataService';

// All keys to include in backup
const BACKUP_KEYS = [
  'health-advisor-profile',
  'health-advisor-chats',
  'health-advisor-activities',
  'health-advisor-playbook',
  'health-advisor-nutrition-calibration',
  'health-advisor-learned-insights',
  'health-advisor-groceries',
  'health-advisor-grocery',
  'health-advisor-checkins',
  'health-advisor-notes',
  'health-advisor-bookmarks',
  'health-advisor-swaps',
];

/**
 * Create a backup of all user data
 * @returns {Object} Backup data object
 */
export function createBackup() {
  const profileId = getActiveProfileId();
  const backup = {
    version: '1.0',
    createdAt: new Date().toISOString(),
    profileId,
    data: {},
    summary: {
      profileName: null,
      chatCount: 0,
      activityCount: 0,
      insightCount: 0,
    },
  };

  for (const key of BACKUP_KEYS) {
    const fullKey = `${profileId}:${key}`;
    const data = localStorage.getItem(fullKey);
    if (data) {
      backup.data[key] = data;

      // Build summary
      try {
        const parsed = JSON.parse(data);
        if (key === 'health-advisor-profile') {
          backup.summary.profileName = parsed.name;
        } else if (key === 'health-advisor-chats') {
          backup.summary.chatCount = Array.isArray(parsed) ? parsed.length : 0;
        } else if (key === 'health-advisor-activities') {
          backup.summary.activityCount = Array.isArray(parsed) ? parsed.length : 0;
        } else if (key === 'health-advisor-learned-insights') {
          backup.summary.insightCount = Array.isArray(parsed) ? parsed.length : 0;
        }
      } catch (e) {
        // Ignore parse errors for summary
      }
    }
  }

  return backup;
}

/**
 * Download backup as JSON file
 */
export function downloadBackup() {
  const backup = createBackup();
  const date = new Date().toISOString().split('T')[0];
  const filename = `lockhart-backup-${date}.json`;

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { filename, summary: backup.summary };
}

/**
 * Parse and validate a backup file
 * @param {File} file - The backup file to parse
 * @returns {Promise<Object>} Parsed backup data with validation
 */
export async function parseBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target.result);

        // Validate backup structure
        if (!backup.version || !backup.data) {
          reject(new Error('Invalid backup file format'));
          return;
        }

        // Build summary if not present
        if (!backup.summary) {
          backup.summary = {
            profileName: null,
            chatCount: 0,
            activityCount: 0,
            insightCount: 0,
          };

          try {
            if (backup.data['health-advisor-profile']) {
              const profile = JSON.parse(backup.data['health-advisor-profile']);
              backup.summary.profileName = profile.name;
            }
            if (backup.data['health-advisor-chats']) {
              const chats = JSON.parse(backup.data['health-advisor-chats']);
              backup.summary.chatCount = Array.isArray(chats) ? chats.length : 0;
            }
            if (backup.data['health-advisor-activities']) {
              const activities = JSON.parse(backup.data['health-advisor-activities']);
              backup.summary.activityCount = Array.isArray(activities) ? activities.length : 0;
            }
            if (backup.data['health-advisor-learned-insights']) {
              const insights = JSON.parse(backup.data['health-advisor-learned-insights']);
              backup.summary.insightCount = Array.isArray(insights) ? insights.length : 0;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }

        resolve(backup);
      } catch (e) {
        reject(new Error('Failed to parse backup file: ' + e.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Restore data from a backup
 * @param {Object} backup - The parsed backup object
 * @param {boolean} syncToCloud - Whether to sync restored data to Supabase
 * @returns {Promise<Object>} Restore results
 */
export async function restoreFromBackup(backup, syncToCloud = true) {
  const profileId = getActiveProfileId();
  const results = {
    restored: [],
    failed: [],
    syncedToCloud: false,
  };

  // Restore to localStorage
  for (const [key, value] of Object.entries(backup.data)) {
    try {
      const fullKey = `${profileId}:${key}`;
      localStorage.setItem(fullKey, value);
      results.restored.push(key);
    } catch (e) {
      results.failed.push({ key, error: e.message });
    }
  }

  // Sync to Supabase if requested
  if (syncToCloud) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      try {
        // Sync profile
        if (backup.data['health-advisor-profile']) {
          const profile = JSON.parse(backup.data['health-advisor-profile']);
          await dataService.upsertProfile(user.id, profile);
        }

        // Sync playbook
        if (backup.data['health-advisor-playbook']) {
          const playbook = JSON.parse(backup.data['health-advisor-playbook']);
          await dataService.upsertPlaybook(user.id, playbook);
        }

        // Sync conversations
        if (backup.data['health-advisor-chats']) {
          const chats = JSON.parse(backup.data['health-advisor-chats']);
          for (const chat of chats) {
            await dataService.upsertConversation(user.id, chat);
          }
        }

        // Sync activities
        if (backup.data['health-advisor-activities']) {
          const activities = JSON.parse(backup.data['health-advisor-activities']);
          for (const activity of activities) {
            await dataService.addActivity(user.id, activity);
          }
        }

        // Sync insights
        if (backup.data['health-advisor-learned-insights']) {
          const insights = JSON.parse(backup.data['health-advisor-learned-insights']);
          for (const insight of insights) {
            await dataService.addLearnedInsight(user.id, {
              text: insight.text || insight.insight,
              category: insight.category,
              confidence: insight.confidence,
            });
          }
        }

        // Sync grocery
        if (backup.data['health-advisor-groceries'] || backup.data['health-advisor-grocery']) {
          const grocery = JSON.parse(backup.data['health-advisor-groceries'] || backup.data['health-advisor-grocery']);
          await dataService.upsertGroceryData(user.id, grocery);
        }

        results.syncedToCloud = true;
      } catch (e) {
        console.error('Cloud sync error during restore:', e);
        results.cloudSyncError = e.message;
      }
    }
  }

  return results;
}

// Auto-backup system
const AUTO_BACKUP_KEY = 'health-advisor-auto-backups';
const MAX_AUTO_BACKUPS = 3;

/**
 * Create an auto-backup (stored in localStorage)
 */
export function createAutoBackup() {
  const backup = createBackup();
  backup.isAutoBackup = true;

  // Get existing auto-backups
  let autoBackups = [];
  try {
    const stored = localStorage.getItem(AUTO_BACKUP_KEY);
    if (stored) {
      autoBackups = JSON.parse(stored);
    }
  } catch (e) {
    autoBackups = [];
  }

  // Add new backup
  autoBackups.unshift(backup);

  // Keep only last N backups
  if (autoBackups.length > MAX_AUTO_BACKUPS) {
    autoBackups = autoBackups.slice(0, MAX_AUTO_BACKUPS);
  }

  // Save
  localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(autoBackups));
  localStorage.setItem('health-advisor-last-auto-backup', Date.now().toString());

  return backup;
}

/**
 * Get auto-backup history
 */
export function getAutoBackups() {
  try {
    const stored = localStorage.getItem(AUTO_BACKUP_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading auto-backups:', e);
  }
  return [];
}

/**
 * Get last auto-backup timestamp
 */
export function getLastAutoBackupTime() {
  const timestamp = localStorage.getItem('health-advisor-last-auto-backup');
  return timestamp ? new Date(parseInt(timestamp)) : null;
}

/**
 * Check if auto-backup is needed (weekly)
 */
export function shouldAutoBackup() {
  const lastBackup = getLastAutoBackupTime();
  if (!lastBackup) return true;

  const weekInMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - lastBackup.getTime() > weekInMs;
}

/**
 * Run auto-backup if needed
 */
export function runAutoBackupIfNeeded() {
  if (shouldAutoBackup()) {
    console.log('[Backup] Running weekly auto-backup...');
    createAutoBackup();
    return true;
  }
  return false;
}
