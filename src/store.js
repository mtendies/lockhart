import { createBackup, getBackup } from './dataBackup';
import { getItem, setItem, removeItem } from './storageHelper';
import { syncProfile } from './lib/syncHelper';

const STORAGE_KEY = 'health-advisor-profile';

export function getProfile() {
  try {
    const data = getItem(STORAGE_KEY);
    if (data) {
      const profile = JSON.parse(data);
      if (profile && typeof profile === 'object') {
        return profile;
      }
    }
  } catch (e) {
    console.error('Profile corrupted, attempting recovery:', e);
    // Try to recover from backup
    const backup = getBackup();
    if (backup?.data?.[STORAGE_KEY]) {
      try {
        const profileRaw = backup.data[STORAGE_KEY];
        const profile = JSON.parse(profileRaw);
        if (profile && typeof profile === 'object') {
          setItem(STORAGE_KEY, profileRaw);
          console.log('Profile recovered from backup');
          return profile;
        }
      } catch {
        console.error('Backup also corrupted');
      }
    }
  }
  return null;
}

export function saveProfile(profile) {
  // Create backup before modifying
  createBackup();
  setItem(STORAGE_KEY, JSON.stringify(profile));
  // Sync to Supabase in background
  syncProfile(profile);
}

export function clearProfile() {
  // Create backup before clearing (safety measure)
  createBackup();
  removeItem(STORAGE_KEY);
}
