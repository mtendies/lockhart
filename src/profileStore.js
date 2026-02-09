/**
 * Profile Store
 * Manages multiple user profiles for testing different scenarios.
 * Each profile has completely isolated data.
 */

// FIX CA2: Import cache clear function to reset on profile switch
import { clearCalorieCache } from './aiCalorieEstimator';

const PROFILES_KEY = 'health-advisor-profiles';
const ACTIVE_PROFILE_KEY = 'health-advisor-active-profile';

// All storage keys that need to be isolated per profile
export const PROFILE_STORAGE_KEYS = [
  'health-advisor-profile',
  'health-advisor-chat',
  'health-advisor-chats',
  'health-advisor-playbook',
  'health-advisor-checkins',
  'health-advisor-checkin-reminder',
  'health-advisor-groceries',
  'health-advisor-grocery',
  'health-advisor-swaps',
  'health-advisor-bookmarks',
  'health-advisor-notes',
  'health-advisor-playbook-suggestions',
  'health-advisor-activities',
  'health-advisor-nutrition-calibration',
  'health-advisor-nutrition-profile',
  'health-advisor-meal-pattern',
  'health-advisor-calibration-dismissed',
  'health-advisor-tracking',
  'health-advisor-custom-targets',
  'health-advisor-weekly-wins',
  'health-advisor-focus-goals',
  'health-advisor-goal-history',
  'health-advisor-draft',
  'health-advisor-learned-insights',
  'health-advisor-workouts',
  'health-advisor-tracked-metrics',
];

/**
 * Generate a unique profile ID
 */
function generateProfileId() {
  return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all profiles
 */
export function getProfiles() {
  try {
    const data = localStorage.getItem(PROFILES_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading profiles:', e);
  }

  // Initialize with default main profile if none exist
  const defaultProfile = {
    id: 'profile_main',
    name: 'Master Profile',
    isMain: true,
    createdAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
  };

  const profiles = [defaultProfile];
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));

  // Migrate existing data to main profile
  migrateExistingDataToProfile('profile_main');

  return profiles;
}

/**
 * Save profiles to storage
 */
function saveProfiles(profiles) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

/**
 * Get the active profile ID
 */
export function getActiveProfileId() {
  const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY);
  if (activeId) {
    return activeId;
  }

  // Default to main profile
  const profiles = getProfiles();
  const mainProfile = profiles.find(p => p.isMain) || profiles[0];
  if (mainProfile) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, mainProfile.id);
    return mainProfile.id;
  }

  return 'profile_main';
}

/**
 * Get the active profile
 */
export function getActiveProfile() {
  const activeId = getActiveProfileId();
  const profiles = getProfiles();
  return profiles.find(p => p.id === activeId) || profiles[0];
}

/**
 * Get the storage key for the active profile
 * @param {string} baseKey - The base storage key (e.g., 'health-advisor-profile')
 * @returns {string} - Profile-prefixed key (e.g., 'profile_main:health-advisor-profile')
 */
export function getProfileStorageKey(baseKey) {
  const activeId = getActiveProfileId();
  return `${activeId}:${baseKey}`;
}

/**
 * Migrate existing (non-prefixed) data to a profile
 * Used when first setting up profiles to preserve existing data
 */
function migrateExistingDataToProfile(profileId) {
  for (const key of PROFILE_STORAGE_KEYS) {
    const existingData = localStorage.getItem(key);
    if (existingData) {
      // Copy to profile-prefixed key
      const profileKey = `${profileId}:${key}`;
      localStorage.setItem(profileKey, existingData);
      // Don't remove original - keep as backup for now
    }
  }
}

/**
 * Create a new profile
 * @param {string} name - Profile name
 * @param {boolean} copyFromCurrent - Whether to copy data from current profile
 * @returns {object} - The new profile
 */
export function createProfile(name, copyFromCurrent = false) {
  const profiles = getProfiles();
  const newProfile = {
    id: generateProfileId(),
    name,
    isMain: false,
    createdAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
  };

  if (copyFromCurrent) {
    const currentProfileId = getActiveProfileId();
    // Copy all data from current profile
    for (const key of PROFILE_STORAGE_KEYS) {
      const sourceKey = `${currentProfileId}:${key}`;
      const data = localStorage.getItem(sourceKey);
      if (data) {
        const destKey = `${newProfile.id}:${key}`;
        localStorage.setItem(destKey, data);
      }
    }
  }

  profiles.push(newProfile);
  saveProfiles(profiles);

  return newProfile;
}

/**
 * Switch to a different profile
 * @param {string} profileId - The profile ID to switch to
 * @returns {boolean} - Success
 */
export function switchProfile(profileId) {
  const profiles = getProfiles();
  const profile = profiles.find(p => p.id === profileId);

  if (!profile) {
    console.error('Profile not found:', profileId);
    return false;
  }

  // Update last accessed time
  profile.lastAccessedAt = new Date().toISOString();
  saveProfiles(profiles);

  // Set as active
  localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);

  // FIX CA2: Clear calorie cache on profile switch to prevent stale data
  clearCalorieCache();

  return true;
}

/**
 * Rename a profile
 * @param {string} profileId - The profile ID
 * @param {string} newName - The new name
 */
export function renameProfile(profileId, newName) {
  const profiles = getProfiles();
  const profile = profiles.find(p => p.id === profileId);

  if (profile) {
    profile.name = newName;
    saveProfiles(profiles);
    return true;
  }

  return false;
}

/**
 * Delete a profile
 * @param {string} profileId - The profile ID to delete
 * @returns {boolean} - Success
 */
export function deleteProfile(profileId) {
  const profiles = getProfiles();
  const profile = profiles.find(p => p.id === profileId);

  if (!profile) {
    return false;
  }

  // Prevent deleting the Master profile
  if (profile.isMain) {
    console.error('Cannot delete the Master profile');
    return false;
  }

  // Prevent deleting the last profile
  if (profiles.length <= 1) {
    console.error('Cannot delete the last profile');
    return false;
  }

  // Delete all profile data
  for (const key of PROFILE_STORAGE_KEYS) {
    const profileKey = `${profileId}:${key}`;
    localStorage.removeItem(profileKey);
  }

  // Remove from profiles list
  const updatedProfiles = profiles.filter(p => p.id !== profileId);
  saveProfiles(updatedProfiles);

  // If this was the active profile, switch to main or first available
  if (getActiveProfileId() === profileId) {
    const newActive = updatedProfiles.find(p => p.isMain) || updatedProfiles[0];
    if (newActive) {
      switchProfile(newActive.id);
    }
  }

  return true;
}

/**
 * Set a profile as the main profile
 * @param {string} profileId - The profile ID
 */
export function setMainProfile(profileId) {
  const profiles = getProfiles();

  // Remove main flag from all profiles
  profiles.forEach(p => {
    p.isMain = p.id === profileId;
  });

  saveProfiles(profiles);
}

/**
 * Check if initialization/migration is needed
 * Returns true if this is a fresh install or profiles haven't been set up
 */
export function needsProfileMigration() {
  const profilesData = localStorage.getItem(PROFILES_KEY);
  if (profilesData) {
    return false; // Already have profiles
  }

  // Check if there's existing data that needs migration
  for (const key of PROFILE_STORAGE_KEYS) {
    if (localStorage.getItem(key)) {
      return true; // Has old data, needs migration
    }
  }

  return false; // Fresh install, no migration needed
}

/**
 * Initialize profiles system
 * Call this on app startup
 */
export function initializeProfiles() {
  const profilesData = localStorage.getItem(PROFILES_KEY);

  if (!profilesData) {
    // First time setup - check for existing data
    let hasExistingData = false;
    for (const key of PROFILE_STORAGE_KEYS) {
      if (localStorage.getItem(key)) {
        hasExistingData = true;
        break;
      }
    }

    // Create default main profile
    const defaultProfile = {
      id: 'profile_main',
      name: 'Master Profile',
      isMain: true,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };

    localStorage.setItem(PROFILES_KEY, JSON.stringify([defaultProfile]));
    localStorage.setItem(ACTIVE_PROFILE_KEY, 'profile_main');

    // Migrate existing data if any
    if (hasExistingData) {
      migrateExistingDataToProfile('profile_main');
    }
  }

  return getActiveProfile();
}

/**
 * Get profile color based on index (for visual distinction)
 */
export function getProfileColor(profileId) {
  const profiles = getProfiles();
  const profile = profiles.find(p => p.id === profileId);

  // Test profiles get a distinct purple/violet color
  if (profile?.isTest) {
    return { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' };
  }

  const index = profiles.filter(p => !p.isTest).findIndex(p => p.id === profileId);
  const colors = [
    { bg: 'bg-primary-100', text: 'text-primary-700', border: 'border-primary-300' },
    { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
  ];
  return colors[Math.max(0, index) % colors.length];
}

/**
 * Create or update a test profile with test data
 * SAFE: Never overwrites the main/master profile
 * @param {object} testProfileData - The test profile definition
 * @returns {object} - The created/updated profile
 */
export function loadTestProfile(testProfileData) {
  const profiles = getProfiles();

  // Find existing test profile with this ID or create new
  let testProfile = profiles.find(p => p.id === testProfileData.id);

  if (testProfile) {
    // Update existing test profile
    testProfile.name = testProfileData.name;
    testProfile.isTest = true;
    testProfile.lastAccessedAt = new Date().toISOString();
  } else {
    // Create new test profile entry
    testProfile = {
      id: testProfileData.id,
      name: testProfileData.name,
      isTest: true,
      isMain: false,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };
    profiles.push(testProfile);
  }

  saveProfiles(profiles);

  // Clear any existing data for this test profile
  for (const key of PROFILE_STORAGE_KEYS) {
    const profileKey = `${testProfileData.id}:${key}`;
    localStorage.removeItem(profileKey);
  }

  // Load the test data
  if (testProfileData.profile) {
    localStorage.setItem(`${testProfileData.id}:health-advisor-profile`, JSON.stringify(testProfileData.profile));
  }

  if (testProfileData.playbook) {
    localStorage.setItem(`${testProfileData.id}:health-advisor-playbook`, JSON.stringify(testProfileData.playbook));
  }

  if (testProfileData.activities && testProfileData.activities.length > 0) {
    // Process activities to add required date and weekOf fields
    const processedActivities = testProfileData.activities.map(activity => {
      const timestamp = activity.timestamp || new Date().toISOString();
      const activityDate = new Date(timestamp);

      // Calculate weekOf (Monday of the week)
      const day = activityDate.getDay();
      const diff = activityDate.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(activityDate);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      const weekOf = monday.toISOString().split('T')[0];

      return {
        ...activity,
        timestamp,
        date: activityDate.toISOString().split('T')[0],
        weekOf,
      };
    });
    localStorage.setItem(`${testProfileData.id}:health-advisor-activities`, JSON.stringify(processedActivities));
  }

  if (testProfileData.checkIns && testProfileData.checkIns.length > 0) {
    localStorage.setItem(`${testProfileData.id}:health-advisor-checkins`, JSON.stringify(testProfileData.checkIns));
  }

  if (testProfileData.nutritionCalibration) {
    localStorage.setItem(`${testProfileData.id}:health-advisor-nutrition-calibration`, JSON.stringify(testProfileData.nutritionCalibration));
  }

  if (testProfileData.grocerySwaps && testProfileData.grocerySwaps.length > 0) {
    localStorage.setItem(`${testProfileData.id}:health-advisor-swaps`, JSON.stringify(testProfileData.grocerySwaps));
  }

  if (testProfileData.chatHistory && testProfileData.chatHistory.length > 0) {
    // Store as a chat in the chats system
    const chatData = {
      id: 'test_chat_1',
      title: 'Previous Conversation',
      messages: testProfileData.chatHistory,
      createdAt: testProfileData.chatHistory[0]?.timestamp || new Date().toISOString(),
      updatedAt: testProfileData.chatHistory[testProfileData.chatHistory.length - 1]?.timestamp || new Date().toISOString(),
    };
    localStorage.setItem(`${testProfileData.id}:health-advisor-chats`, JSON.stringify([chatData]));
    localStorage.setItem(`${testProfileData.id}:health-advisor-chat`, JSON.stringify(testProfileData.chatHistory));
  }

  return testProfile;
}

/**
 * Get the main/master profile (never a test profile)
 * @returns {object|null} - The main profile
 */
export function getMainProfile() {
  const profiles = getProfiles();
  return profiles.find(p => p.isMain && !p.isTest) || profiles.find(p => !p.isTest) || null;
}

/**
 * Check if currently in a test profile
 * @returns {boolean}
 */
export function isTestProfile() {
  const active = getActiveProfile();
  return active?.isTest === true;
}

/**
 * Get all profile data as JSON (for export)
 * @returns {object} - All data for current profile
 */
export function exportProfileData() {
  const activeId = getActiveProfileId();
  const exportData = {};

  for (const key of PROFILE_STORAGE_KEYS) {
    const profileKey = `${activeId}:${key}`;
    const data = localStorage.getItem(profileKey);
    if (data) {
      try {
        exportData[key] = JSON.parse(data);
      } catch {
        exportData[key] = data;
      }
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    profileId: activeId,
    data: exportData,
  };
}

/**
 * Import profile data from JSON
 * Creates a new profile with the imported data
 * @param {object} importData - The exported data object
 * @param {string} profileName - Name for the imported profile
 * @returns {object} - The new profile
 */
export function importProfileData(importData, profileName) {
  const newProfile = createProfile(profileName, false);

  if (importData.data) {
    for (const [key, value] of Object.entries(importData.data)) {
      const profileKey = `${newProfile.id}:${key}`;
      localStorage.setItem(profileKey, typeof value === 'string' ? value : JSON.stringify(value));
    }
  }

  return newProfile;
}

/**
 * Clear all data for current profile (but keep the profile entry)
 */
export function clearCurrentProfileData() {
  const activeId = getActiveProfileId();
  const profile = getActiveProfile();

  // Safety: Don't allow clearing main profile without extra confirmation
  if (profile?.isMain) {
    throw new Error('Cannot clear main profile data without explicit confirmation');
  }

  for (const key of PROFILE_STORAGE_KEYS) {
    const profileKey = `${activeId}:${key}`;
    localStorage.removeItem(profileKey);
  }
}

/**
 * Delete all test profiles
 */
export function deleteAllTestProfiles() {
  const profiles = getProfiles();
  const testProfiles = profiles.filter(p => p.isTest);

  for (const testProfile of testProfiles) {
    // Delete all data
    for (const key of PROFILE_STORAGE_KEYS) {
      const profileKey = `${testProfile.id}:${key}`;
      localStorage.removeItem(profileKey);
    }
  }

  // Remove test profiles from list
  const remainingProfiles = profiles.filter(p => !p.isTest);
  saveProfiles(remainingProfiles);

  // If active profile was a test profile, switch to main
  const activeId = getActiveProfileId();
  if (testProfiles.some(p => p.id === activeId)) {
    const mainProfile = remainingProfiles.find(p => p.isMain) || remainingProfiles[0];
    if (mainProfile) {
      switchProfile(mainProfile.id);
    }
  }
}
