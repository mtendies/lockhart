/**
 * Storage Helper
 * Provides profile-aware storage access for all stores.
 * Automatically prefixes storage keys with the active profile ID.
 */

import { getActiveProfileId, PROFILE_STORAGE_KEYS } from './profileStore';

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
  } catch (e) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22) {
      console.error(`Storage quota exceeded for ${baseKey}. Data not saved.`);
    }
    throw e;
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
