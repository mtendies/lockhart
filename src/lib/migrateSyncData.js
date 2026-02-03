/**
 * Migration Script: Push localStorage data to new Supabase JSONB columns
 *
 * This is a ONE-TIME migration to populate the new *_data columns.
 * Run from browser console: window.__migrateToNewSync()
 */

import { supabase } from './supabase';
import { getItem } from '../storageHelper';
import { getActiveProfileId } from '../profileStore';

// Same mapping as simpleSync
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
};

/**
 * Get data from localStorage, checking multiple locations:
 * 1. Profile-prefixed key (via storageHelper)
 * 2. Direct prefixed key (manual check)
 * 3. Non-prefixed key (legacy data)
 */
function getDataFromAnyLocation(localKey) {
  const profileId = getActiveProfileId();
  const prefixedKey = `${profileId}:${localKey}`;

  // First, try via storageHelper (handles profile prefix)
  let raw = getItem(localKey);
  let source = 'storageHelper';

  // If not found, try direct prefixed key
  if (!raw) {
    raw = localStorage.getItem(prefixedKey);
    source = 'prefixed';
  }

  // If still not found, try non-prefixed (legacy data)
  if (!raw) {
    raw = localStorage.getItem(localKey);
    source = 'non-prefixed';
  }

  return { raw, source, prefixedKey };
}

/**
 * Migrate all localStorage data to new Supabase columns
 */
export async function migrateToNewSync() {
  console.log('='.repeat(50));
  console.log('MIGRATION: localStorage → Supabase JSONB columns');
  console.log('='.repeat(50));

  // Get current user
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    console.error('❌ Not logged in. Please sign in first.');
    return { success: false, error: 'Not authenticated' };
  }

  const profileId = getActiveProfileId();
  console.log('User ID:', userId);
  console.log('Active Profile:', profileId);
  console.log('');

  // Gather all localStorage data
  const updates = {};
  const migrated = [];
  const skipped = [];
  const errors = [];

  for (const [localKey, column] of Object.entries(SYNC_MAP)) {
    try {
      const { raw, source, prefixedKey } = getDataFromAnyLocation(localKey);

      if (!raw) {
        skipped.push({ key: localKey, reason: 'No data in localStorage' });
        console.log(`⏭️  ${localKey}: No data found`);
        console.log(`    Checked: ${prefixedKey}, ${localKey}`);
        continue;
      }

      const data = JSON.parse(raw);

      // Check if data has content
      const isEmpty = Array.isArray(data)
        ? data.length === 0
        : (typeof data === 'object' && Object.keys(data).length === 0);

      if (isEmpty) {
        skipped.push({ key: localKey, reason: 'Empty data' });
        console.log(`⏭️  ${localKey}: Empty, skipping`);
        continue;
      }

      updates[column] = data;
      migrated.push({ key: localKey, column, size: raw.length, source });
      console.log(`✅ ${localKey} → ${column} (${raw.length} bytes, from ${source})`);

    } catch (e) {
      errors.push({ key: localKey, error: e.message });
      console.error(`❌ ${localKey}: ${e.message}`);
    }
  }

  if (Object.keys(updates).length === 0) {
    console.log('');
    console.log('Nothing to migrate.');
    return { success: true, migrated: [], skipped, errors };
  }

  // Add timestamp
  updates.updated_at = new Date().toISOString();

  console.log('');
  console.log('Pushing to Supabase...');

  // Push all at once
  const { error } = await supabase
    .from('users_profile')
    .update(updates)
    .eq('id', userId);

  if (error) {
    console.error('❌ Supabase update failed:', error);
    return { success: false, error: error.message, migrated, skipped, errors };
  }

  console.log('');
  console.log('='.repeat(50));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(50));
  console.log(`✅ Migrated: ${migrated.length} data types`);
  console.log(`⏭️  Skipped: ${skipped.length} data types`);
  console.log(`❌ Errors: ${errors.length}`);
  console.log('');
  console.log('Migrated:');
  migrated.forEach(m => console.log(`   - ${m.key} (${m.size} bytes, from ${m.source})`));

  return { success: true, migrated, skipped, errors };
}

/**
 * Verify migration by reading back from Supabase
 */
export async function verifyMigration() {
  console.log('='.repeat(50));
  console.log('VERIFYING MIGRATION');
  console.log('='.repeat(50));

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    console.error('❌ Not logged in');
    return;
  }

  const columns = Object.values(SYNC_MAP);

  const { data, error } = await supabase
    .from('users_profile')
    .select(columns.join(', '))
    .eq('id', userId)
    .single();

  if (error) {
    console.error('❌ Failed to read:', error);
    return;
  }

  console.log('');
  for (const column of columns) {
    const value = data[column];
    if (value) {
      const size = JSON.stringify(value).length;
      const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
      console.log(`✅ ${column}: ${type} (${size} bytes)`);
    } else {
      console.log(`⏭️  ${column}: null`);
    }
  }
}

/**
 * Debug function: Show where data is located in localStorage
 * Run from console: window.__debugLocalStorage()
 */
export function debugLocalStorage() {
  console.log('='.repeat(50));
  console.log('DEBUG: localStorage Data Locations');
  console.log('='.repeat(50));

  const profileId = getActiveProfileId();
  console.log('Active Profile ID:', profileId);
  console.log('');

  for (const localKey of Object.keys(SYNC_MAP)) {
    const prefixedKey = `${profileId}:${localKey}`;

    const prefixedData = localStorage.getItem(prefixedKey);
    const nonPrefixedData = localStorage.getItem(localKey);

    console.log(`📁 ${localKey}:`);

    if (prefixedData) {
      console.log(`   ✅ ${prefixedKey}: ${prefixedData.length} bytes`);
    } else {
      console.log(`   ❌ ${prefixedKey}: not found`);
    }

    if (nonPrefixedData) {
      console.log(`   ⚠️  ${localKey} (non-prefixed): ${nonPrefixedData.length} bytes`);
    } else {
      console.log(`   ❌ ${localKey} (non-prefixed): not found`);
    }

    console.log('');
  }

  console.log('='.repeat(50));
  console.log('TIP: Data should be in prefixed keys (profile_main:...)');
  console.log('If data is in non-prefixed keys, run __migrateToNewSync()');
}

// Export for console access
export default {
  migrateToNewSync,
  verifyMigration,
  debugLocalStorage,
};
