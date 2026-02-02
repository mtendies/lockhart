/**
 * Sync Helper - Utility for syncing localStorage writes to Supabase
 *
 * This provides fire-and-forget sync functions that stores can call
 * after writing to localStorage. The sync happens in the background
 * and doesn't block the UI.
 */

import { supabase } from './supabase';
import * as dataService from './dataService';

// Get current user ID from Supabase session
async function getCurrentUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

// Queue for batching syncs
let syncQueue = [];
let syncTimeout = null;

// Track failed syncs to avoid spam
const failedSyncs = new Map();
const FAIL_COOLDOWN = 60000; // Don't retry failed syncs for 60 seconds

// Process sync queue with debouncing
function processSyncQueue() {
  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
    const items = [...syncQueue];
    syncQueue = [];

    const userId = await getCurrentUserId();
    if (!userId) {
      // Only log once per session
      if (!processSyncQueue._noUserLogged) {
        console.log('[Sync] No user ID, skipping sync');
        processSyncQueue._noUserLogged = true;
      }
      return;
    }
    processSyncQueue._noUserLogged = false;

    for (const item of items) {
      // Skip if this type recently failed
      const lastFail = failedSyncs.get(item.type);
      if (lastFail && Date.now() - lastFail < FAIL_COOLDOWN) {
        continue; // Skip silently
      }

      try {
        const result = await item.syncFn(userId, item.data);
        if (result?.error) {
          // Log error once, then cooldown
          if (!lastFail || Date.now() - lastFail > FAIL_COOLDOWN) {
            console.warn(`[Sync] ${item.type} sync issue (will retry in 60s):`, result.error?.message || result.error);
          }
          failedSyncs.set(item.type, Date.now());
        } else {
          failedSyncs.delete(item.type); // Clear on success
          console.log(`[Sync] Synced ${item.type} to Supabase`);
        }
      } catch (err) {
        if (!lastFail || Date.now() - lastFail > FAIL_COOLDOWN) {
          console.warn(`[Sync] ${item.type} error (will retry in 60s):`, err.message || err);
        }
        failedSyncs.set(item.type, Date.now());
      }
    }
  }, 1000); // Debounce for 1 second
}

// Sync an activity to Supabase
export function syncActivity(activity) {
  syncQueue.push({
    type: 'activity',
    data: activity,
    syncFn: dataService.addActivity,
  });
  processSyncQueue();
}

// Sync profile to Supabase
export function syncProfile(profile) {
  syncQueue.push({
    type: 'profile',
    data: profile,
    syncFn: dataService.upsertProfile,
  });
  processSyncQueue();
}

// Sync playbook to Supabase
export function syncPlaybook(playbook) {
  syncQueue.push({
    type: 'playbook',
    data: playbook,
    syncFn: dataService.upsertPlaybook,
  });
  processSyncQueue();
}

// Sync conversation to Supabase
export function syncConversation(conversation) {
  syncQueue.push({
    type: 'conversation',
    data: conversation,
    syncFn: dataService.upsertConversation,
  });
  processSyncQueue();
}

// Sync learned insight to Supabase
export function syncInsight(insight) {
  syncQueue.push({
    type: 'insight',
    data: {
      text: insight.text || insight.insight,
      category: insight.category,
      confidence: insight.confidence,
    },
    syncFn: dataService.addLearnedInsight,
  });
  processSyncQueue();
}

// Sync check-in to Supabase
export function syncCheckin(checkin) {
  syncQueue.push({
    type: 'checkin',
    data: checkin,
    syncFn: dataService.upsertCheckin,
  });
  processSyncQueue();
}

// Sync nutrition day to Supabase
export function syncNutritionDay(date, meals, complete) {
  syncQueue.push({
    type: 'nutritionDay',
    data: { date, meals, complete },
    syncFn: async (userId, data) => {
      return dataService.upsertNutritionDay(userId, data.date, data.meals, data.complete);
    },
  });
  processSyncQueue();
}

// Sync entire nutrition calibration to Supabase
export function syncNutritionCalibration(calibrationData) {
  syncQueue.push({
    type: 'nutritionCalibration',
    data: calibrationData,
    syncFn: async (userId, data) => {
      return dataService.upsertNutritionCalibration(userId, data);
    },
  });
  processSyncQueue();
}

// Sync grocery data to Supabase
export function syncGrocery(groceryData) {
  syncQueue.push({
    type: 'grocery',
    data: groceryData,
    syncFn: dataService.upsertGroceryData,
  });
  processSyncQueue();
}

// Delete activity from Supabase
export async function deleteActivityFromSupabase(activityId) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  try {
    await dataService.deleteActivity(activityId);
    console.log(`[Sync] Deleted activity ${activityId} from Supabase`);
  } catch (err) {
    console.error('[Sync] Error deleting activity:', err);
  }
}

// Delete conversation from Supabase
export async function deleteConversationFromSupabase(conversationId) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  try {
    await dataService.deleteConversation(conversationId);
    console.log(`[Sync] Deleted conversation ${conversationId} from Supabase`);
  } catch (err) {
    console.error('[Sync] Error deleting conversation:', err);
  }
}

// Delete insight from Supabase
export async function deleteInsightFromSupabase(insightId) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  try {
    await dataService.deleteLearnedInsight(insightId);
    console.log(`[Sync] Deleted insight ${insightId} from Supabase`);
  } catch (err) {
    console.error('[Sync] Error deleting insight:', err);
  }
}

export default {
  syncActivity,
  syncProfile,
  syncPlaybook,
  syncConversation,
  syncInsight,
  syncCheckin,
  syncNutritionDay,
  syncNutritionCalibration,
  syncGrocery,
  deleteActivityFromSupabase,
  deleteConversationFromSupabase,
  deleteInsightFromSupabase,
};
