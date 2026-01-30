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

// Process sync queue with debouncing
function processSyncQueue() {
  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
    const items = [...syncQueue];
    syncQueue = [];

    const userId = await getCurrentUserId();
    if (!userId) {
      console.log('[Sync] No user ID, skipping sync');
      return;
    }

    for (const item of items) {
      try {
        await item.syncFn(userId, item.data);
        console.log(`[Sync] Synced ${item.type} to Supabase`);
      } catch (err) {
        console.error(`[Sync] Error syncing ${item.type}:`, err);
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
  deleteActivityFromSupabase,
  deleteConversationFromSupabase,
  deleteInsightFromSupabase,
};
