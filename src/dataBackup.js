// Comprehensive data backup and recovery system
// Protects against accidental data loss

import { getItem, setItem, removeItem, getStorageKey } from './storageHelper';
import { getActiveProfileId, PROFILE_STORAGE_KEYS } from './profileStore';

const BACKUP_KEY = 'health-advisor-backup';

// Keys that are included in backups (subset of profile storage keys)
const BACKUP_KEYS = [
  'health-advisor-profile',
  'health-advisor-chat',
  'health-advisor-chats',
  'health-advisor-playbook',
  'health-advisor-checkins',
  'health-advisor-groceries',
  'health-advisor-bookmarks',
  'health-advisor-notes',
  'health-advisor-playbook-suggestions',
  'health-advisor-activities',
];

// Create a full backup of the current profile's data
export function createBackup() {
  const profileId = getActiveProfileId();
  const backup = {
    timestamp: new Date().toISOString(),
    version: 2,
    profileId,
    data: {},
  };

  for (const baseKey of BACKUP_KEYS) {
    try {
      const raw = getItem(baseKey);
      if (raw) {
        backup.data[baseKey] = raw; // Store as raw string to preserve exactly
      }
    } catch (e) {
      console.error(`Failed to backup ${baseKey}:`, e);
    }
  }

  // Only save if we have data
  if (Object.keys(backup.data).length > 0) {
    try {
      // Backups are stored globally with profile ID
      const backupKey = `${profileId}:${BACKUP_KEY}`;
      localStorage.setItem(backupKey, JSON.stringify(backup));
      console.log('Backup created at', backup.timestamp, 'for profile', profileId);
      return true;
    } catch (e) {
      console.error('Failed to save backup:', e);
      return false;
    }
  }
  return false;
}

// Get the latest backup for the current profile
export function getBackup() {
  try {
    const profileId = getActiveProfileId();
    const backupKey = `${profileId}:${BACKUP_KEY}`;
    const raw = localStorage.getItem(backupKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Clear the backup for the current profile (use after importing new data)
export function clearBackup() {
  try {
    const profileId = getActiveProfileId();
    const backupKey = `${profileId}:${BACKUP_KEY}`;
    localStorage.removeItem(backupKey);
    console.log('Backup cleared for profile:', profileId);
    return true;
  } catch (e) {
    console.error('Failed to clear backup:', e);
    return false;
  }
}

// Restore all data from backup
export function restoreFromBackup() {
  const backup = getBackup();
  if (!backup || !backup.data) {
    console.error('No backup found to restore');
    return false;
  }

  let restored = 0;
  for (const [baseKey, value] of Object.entries(backup.data)) {
    try {
      setItem(baseKey, value);
      restored++;
    } catch (e) {
      console.error(`Failed to restore ${baseKey}:`, e);
    }
  }

  console.log(`Restored ${restored} items from backup dated ${backup.timestamp}`);
  return restored > 0;
}

// Export all data as downloadable JSON (for manual backup)
export function exportAllData() {
  const profileId = getActiveProfileId();
  const exportData = {
    exportedAt: new Date().toISOString(),
    version: 2,
    profileId,
    data: {},
  };

  for (const baseKey of BACKUP_KEYS) {
    try {
      const raw = getItem(baseKey);
      if (raw) {
        exportData.data[baseKey] = JSON.parse(raw);
      }
    } catch (e) {
      console.error(`Failed to export ${baseKey}:`, e);
    }
  }

  return exportData;
}

// Import data from exported JSON
export function importData(exportData) {
  if (!exportData || !exportData.data) {
    console.error('Invalid import data');
    return false;
  }

  // Create backup before importing
  createBackup();

  let imported = 0;
  for (const [baseKey, value] of Object.entries(exportData.data)) {
    if (BACKUP_KEYS.includes(baseKey)) {
      try {
        setItem(baseKey, JSON.stringify(value));
        imported++;
      } catch (e) {
        console.error(`Failed to import ${baseKey}:`, e);
      }
    }
  }

  console.log(`Imported ${imported} items`);
  return imported > 0;
}

// Check if profile data exists and is valid
export function hasValidProfile() {
  try {
    const raw = getItem('health-advisor-profile');
    if (!raw) return false;
    const profile = JSON.parse(raw);
    // Check for minimum required fields
    return profile && (profile.name || profile.goals?.length > 0);
  } catch {
    return false;
  }
}

// Safe profile loader with backup recovery
export function safeGetProfile() {
  try {
    const raw = getItem('health-advisor-profile');
    if (raw) {
      const profile = JSON.parse(raw);
      if (profile && typeof profile === 'object') {
        return profile;
      }
    }
  } catch (e) {
    console.error('Profile corrupted, attempting recovery from backup:', e);
    // Try to recover from backup
    const backup = getBackup();
    if (backup?.data?.['health-advisor-profile']) {
      try {
        const profileRaw = backup.data['health-advisor-profile'];
        const profile = JSON.parse(profileRaw);
        if (profile && typeof profile === 'object') {
          // Restore the profile from backup
          setItem('health-advisor-profile', profileRaw);
          console.log('Profile recovered from backup');
          return profile;
        }
      } catch {
        console.error('Backup profile also corrupted');
      }
    }
  }
  return null;
}

// Clear stale draft if a valid profile exists
export function clearStaleDraft() {
  const hasProfile = hasValidProfile();
  if (hasProfile) {
    // Check if draft is from a different session (more than 24 hours old or profile exists)
    try {
      const draftRaw = getItem('health-advisor-draft');
      if (draftRaw) {
        const draft = JSON.parse(draftRaw);
        // If we have a completed profile, clear any lingering drafts
        // unless they were created within the last hour (active editing session)
        const draftAge = draft.savedAt ? Date.now() - new Date(draft.savedAt).getTime() : Infinity;
        const oneHour = 60 * 60 * 1000;
        if (draftAge > oneHour) {
          removeItem('health-advisor-draft');
          console.log('Cleared stale onboarding draft');
        }
      }
    } catch {
      // If draft is corrupted, just remove it
      removeItem('health-advisor-draft');
    }
  }
}

// Initialize backup system - call on app start
export function initBackupSystem() {
  // Clear stale drafts
  clearStaleDraft();

  // Create periodic backups (every 5 minutes if data changed)
  let lastDataHash = getDataHash();

  setInterval(() => {
    const currentHash = getDataHash();
    if (currentHash !== lastDataHash) {
      createBackup();
      lastDataHash = currentHash;
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  // Create initial backup if we have data
  if (hasValidProfile()) {
    createBackup();
  }
}

// Simple hash of data to detect changes
function getDataHash() {
  let hash = '';
  for (const baseKey of BACKUP_KEYS) {
    const raw = getItem(baseKey);
    if (raw) {
      hash += raw.length.toString(36);
    }
  }
  return hash;
}

// Get data summary for debugging
export function getDataSummary() {
  const summary = {};
  for (const baseKey of BACKUP_KEYS) {
    try {
      const raw = getItem(baseKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        summary[baseKey] = {
          exists: true,
          size: raw.length,
          type: Array.isArray(parsed) ? `array[${parsed.length}]` : typeof parsed,
        };
      } else {
        summary[baseKey] = { exists: false };
      }
    } catch {
      summary[baseKey] = { exists: true, corrupted: true };
    }
  }
  return summary;
}
