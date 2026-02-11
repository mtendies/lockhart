/**
 * Storage Helper
 * Provides profile-aware storage access for all stores.
 * Automatically prefixes storage keys with the active profile ID.
 *
 * FIX #2: Implements BroadcastChannel for multi-tab coordination.
 * When one tab writes, it notifies others to reload from localStorage.
 */

import { getActiveProfileId, PROFILE_STORAGE_KEYS } from './profileStore';

// ============================================
// FIX #2: Multi-tab sync via BroadcastChannel
// ============================================

const CHANNEL_NAME = 'health-advisor-sync';
let broadcastChannel = null;
let storageChangeCallbacks = [];

// Initialize BroadcastChannel if supported
if (typeof window !== 'undefined') {
  try {
    if ('BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      broadcastChannel.onmessage = (event) => {
        const { type, key } = event.data || {};
        if (type === 'storage-update') {
          console.log(`[StorageHelper] Received cross-tab update for: ${key}`);
          // Notify all registered callbacks
          storageChangeCallbacks.forEach(callback => {
            try {
              callback(key);
            } catch (e) {
              console.error('[StorageHelper] Callback error:', e);
            }
          });
        }
      };
    } else {
      // Fallback to storage event listener for older browsers
      window.addEventListener('storage', (event) => {
        if (event.key && event.newValue !== null) {
          console.log(`[StorageHelper] Storage event for: ${event.key}`);
          storageChangeCallbacks.forEach(callback => {
            try {
              callback(event.key);
            } catch (e) {
              console.error('[StorageHelper] Callback error:', e);
            }
          });
        }
      });
    }
  } catch (e) {
    console.warn('[StorageHelper] Failed to initialize cross-tab sync:', e);
  }
}

/**
 * Notify other tabs about a storage update
 */
function notifyOtherTabs(key) {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'storage-update', key });
    } catch (e) {
      console.warn('[StorageHelper] Failed to broadcast update:', e);
    }
  }
  // Storage event fires automatically for other tabs when using localStorage
}

/**
 * Register a callback to be notified when another tab updates storage
 * @param {Function} callback - Function to call with the updated key
 * @returns {Function} - Unsubscribe function
 */
export function onStorageChange(callback) {
  storageChangeCallbacks.push(callback);
  return () => {
    storageChangeCallbacks = storageChangeCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Get the profile-prefixed storage key
 * @param {string} baseKey - The base storage key
 * @returns {string} - Profile-prefixed key
 */
export function getStorageKey(baseKey) {
  // Only prefix keys that should be isolated per profile
  if (PROFILE_STORAGE_KEYS.includes(baseKey)) {
    const profileId = getActiveProfileId();
    return `${profileId}:${baseKey}`;
  }
  // Return unchanged for global keys
  return baseKey;
}

/**
 * Get item from localStorage with profile awareness
 * @param {string} baseKey - The base storage key
 * @returns {string|null} - The stored value
 */
export function getItem(baseKey) {
  const key = getStorageKey(baseKey);
  return localStorage.getItem(key);
}

/**
 * Set item in localStorage with profile awareness
 * @param {string} baseKey - The base storage key
 * @param {string} value - The value to store
 */
export function setItem(baseKey, value) {
  const key = getStorageKey(baseKey);
  try {
    localStorage.setItem(key, value);
    // FIX #2: Notify other tabs about this update
    notifyOtherTabs(baseKey);
  } catch (e) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22) {
      // FIX C2: Attempt to prune old data on quota exceeded
      console.warn(`Storage quota exceeded for ${baseKey}. Attempting to prune...`);
      pruneOldestData();
      try {
        localStorage.setItem(key, value);
        // FIX #2: Notify other tabs about this update
        notifyOtherTabs(baseKey);
        console.log(`Successfully saved ${baseKey} after pruning`);
        return;
      } catch (retryError) {
        console.error(`Still exceeded quota after pruning for ${baseKey}`);
        throw retryError;
      }
    }
    throw e;
  }
}

/**
 * FIX C2: Prune oldest data to free up localStorage space
 * Removes oldest entries from activity logs and check-ins first
 */
function pruneOldestData() {
  // Try to prune activity logs first (usually largest)
  try {
    const activityKey = getStorageKey('health-advisor-activity-log');
    const activityData = localStorage.getItem(activityKey);
    if (activityData) {
      const parsed = JSON.parse(activityData);
      const entries = Array.isArray(parsed) ? parsed : (parsed?.entries || []);
      if (entries.length > 50) {
        // Keep only last 50 activities
        const pruned = entries.slice(-50);
        const newData = Array.isArray(parsed) ? pruned : { ...parsed, entries: pruned };
        localStorage.setItem(activityKey, JSON.stringify(newData));
        console.log(`Pruned activity logs from ${entries.length} to 50 entries`);
      }
    }
  } catch (e) {
    console.warn('Failed to prune activity logs:', e);
  }

  // Try to prune old check-ins
  try {
    const checkInKey = getStorageKey('health-advisor-checkins');
    const checkInData = localStorage.getItem(checkInKey);
    if (checkInData) {
      const parsed = JSON.parse(checkInData);
      const entries = Array.isArray(parsed) ? parsed : (parsed?.entries || []);
      if (entries.length > 30) {
        // Keep only last 30 check-ins
        const pruned = entries.slice(-30);
        const newData = Array.isArray(parsed) ? pruned : { ...parsed, entries: pruned };
        localStorage.setItem(checkInKey, JSON.stringify(newData));
        console.log(`Pruned check-ins from ${entries.length} to 30 entries`);
      }
    }
  } catch (e) {
    console.warn('Failed to prune check-ins:', e);
  }
}

/**
 * Remove item from localStorage with profile awareness
 * @param {string} baseKey - The base storage key
 */
export function removeItem(baseKey) {
  const key = getStorageKey(baseKey);
  localStorage.removeItem(key);
}

/**
 * Get and parse JSON from localStorage with profile awareness
 * @param {string} baseKey - The base storage key
 * @param {*} defaultValue - Default value if not found or invalid
 * @returns {*} - Parsed value or default
 */
export function getJSON(baseKey, defaultValue = null) {
  try {
    const raw = getItem(baseKey);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error(`Error parsing ${baseKey}:`, e);
  }
  return defaultValue;
}

/**
 * Stringify and set JSON in localStorage with profile awareness.
 * AUTOMATICALLY ADDS updatedAt TIMESTAMP for sync conflict resolution.
 *
 * @param {string} baseKey - The base storage key
 * @param {*} value - The value to store
 */
export function setJSON(baseKey, value) {
  // Add updatedAt timestamp to objects for sync conflict resolution
  let valueWithTimestamp = value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    valueWithTimestamp = {
      ...value,
      updatedAt: new Date().toISOString(),
    };
  }
  setItem(baseKey, JSON.stringify(valueWithTimestamp));
}
