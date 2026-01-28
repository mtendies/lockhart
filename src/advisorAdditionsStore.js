/**
 * Advisor Additions Store
 * Tracks content added by the Advisor that needs user review/approval
 */

import { getItem, setItem } from './storageHelper';

const ADDITIONS_KEY = 'health-advisor-additions';

/**
 * Get all pending advisor additions
 */
export function getAdvisorAdditions() {
  try {
    const data = getItem(ADDITIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save advisor additions
 */
function saveAdditions(additions) {
  setItem(ADDITIONS_KEY, JSON.stringify(additions));
}

/**
 * Track a new advisor addition
 * @param {Object} addition
 * @param {string} addition.type - 'nutrition' | 'activity' | etc
 * @param {string} addition.location - Where it was added (e.g., 'breakfast', 'lunch')
 * @param {string} addition.day - The day key (e.g., 'monday')
 * @param {string} addition.mealId - The meal ID if nutrition
 * @param {string} addition.addedContent - The content that was added
 * @param {string} addition.originalContent - What was there before (if appending)
 * @param {string} addition.reason - Why it was added
 * @param {string} addition.sourceText - The user's original input
 */
export function trackAdvisorAddition(addition) {
  const additions = getAdvisorAdditions();

  const newAddition = {
    id: `add-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    status: 'pending', // 'pending' | 'approved' | 'removed'
    ...addition,
  };

  additions.unshift(newAddition);
  saveAdditions(additions);

  return newAddition;
}

/**
 * Approve an advisor addition (user confirmed it's correct)
 */
export function approveAddition(additionId) {
  const additions = getAdvisorAdditions();
  const index = additions.findIndex(a => a.id === additionId);

  if (index !== -1) {
    additions[index].status = 'approved';
    additions[index].approvedAt = new Date().toISOString();
    saveAdditions(additions);
    return true;
  }
  return false;
}

/**
 * Remove an advisor addition (user wants to undo it)
 * Returns the addition details so the caller can revert the change
 */
export function removeAddition(additionId) {
  const additions = getAdvisorAdditions();
  const index = additions.findIndex(a => a.id === additionId);

  if (index !== -1) {
    const addition = additions[index];
    additions[index].status = 'removed';
    additions[index].removedAt = new Date().toISOString();
    saveAdditions(additions);
    return addition;
  }
  return null;
}

/**
 * Get pending additions for a specific location
 * @param {string} type - 'nutrition' | 'activity'
 * @param {string} day - Day key for nutrition
 * @param {string} mealId - Meal ID for nutrition
 */
export function getPendingAdditionFor(type, day = null, mealId = null) {
  const additions = getAdvisorAdditions();

  return additions.find(a => {
    if (a.status !== 'pending') return false;
    if (a.type !== type) return false;
    if (day && a.day !== day) return false;
    if (mealId && a.mealId !== mealId) return false;
    return true;
  });
}

/**
 * Get all pending additions for a day's nutrition
 */
export function getPendingNutritionAdditions(day) {
  const additions = getAdvisorAdditions();
  return additions.filter(a =>
    a.status === 'pending' &&
    a.type === 'nutrition' &&
    a.day === day
  );
}

/**
 * Clean up old additions (older than 7 days)
 */
export function cleanupOldAdditions() {
  const additions = getAdvisorAdditions();
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  const filtered = additions.filter(a => {
    const timestamp = new Date(a.timestamp).getTime();
    return timestamp > weekAgo;
  });

  if (filtered.length !== additions.length) {
    saveAdditions(filtered);
  }
}

/**
 * Check if content at a location has a pending advisor addition
 */
export function hasPendingAddition(type, day, mealId) {
  return !!getPendingAdditionFor(type, day, mealId);
}
