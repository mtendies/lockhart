/**
 * Focus Goal Store
 * New goal system with per-goal tracking, carry-over, recurring goals, and history.
 * Replaces the old playbook-based weekly focus system.
 */

import { getItem, setItem } from './storageHelper';
import { syncGoals, syncGoalHistory } from './lib/simpleSync';
import { getPlaybook } from './playbookStore';
import { getWeekOf, getActivitiesThisWeek, ACTIVITY_TYPES, WORKOUT_TYPES } from './activityLogStore';
import { parseFocusItem, calculateFocusProgress } from './weeklyProgressStore';

const GOALS_KEY = 'health-advisor-focus-goals';
const HISTORY_KEY = 'health-advisor-goal-history';

const MAX_GOALS = 3;
const MAX_WITH_CARRY = 4;

// ============================================
// HELPERS
// ============================================

function generateId() {
  return 'goal_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export function getCurrentWeekOf() {
  return getWeekOf(new Date());
}

// ============================================
// CORE CRUD
// ============================================

/**
 * Get current week's goals data
 */
export function getGoalsData() {
  try {
    const raw = getItem(GOALS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Save goals data and sync
 */
export function saveGoalsData(data) {
  // CRITICAL: Always add updatedAt for sync conflict resolution
  const dataWithTimestamp = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  setItem(GOALS_KEY, JSON.stringify(dataWithTimestamp));
  syncGoals();
}

/**
 * Get current week's goals, initializing if needed
 */
export function getGoals() {
  const data = getGoalsData();
  const currentWeek = getCurrentWeekOf();

  // If no data or from a different week, check if migration/transition is needed
  if (!data || data.weekOf !== currentWeek) {
    return ensureCurrentWeek();
  }

  return data.goals || [];
}

/**
 * Ensure goals data is for the current week.
 * Handles week transitions and migration from old playbook format.
 */
function ensureCurrentWeek() {
  const currentWeek = getCurrentWeekOf();
  const data = getGoalsData();

  // If we have data from a previous week, do auto-transition
  if (data && data.weekOf !== currentWeek) {
    return autoTransitionWeek(data, currentWeek);
  }

  // No data at all — try migration from playbook
  if (!data) {
    const migrated = migrateFromPlaybook();
    if (migrated.length > 0) {
      const newData = { weekOf: currentWeek, goals: migrated };
      saveGoalsData(newData);
      return migrated;
    }
    // Truly empty
    const emptyData = { weekOf: currentWeek, goals: [] };
    saveGoalsData(emptyData);
    return [];
  }

  return data.goals || [];
}

/**
 * Add a new goal
 * @returns {{ success: boolean, error?: string, goal?: object }}
 */
export function addGoal({ text, target = 1, unit = 'times', type = 'one-time' }) {
  const goals = getGoals();
  const hasCarried = goals.some(g => g.status === 'carried' || g.carriedFrom);

  const maxAllowed = hasCarried ? MAX_WITH_CARRY : MAX_GOALS;
  if (goals.filter(g => g.status !== 'completed' && g.status !== 'dropped').length >= maxAllowed) {
    return {
      success: false,
      error: `You have ${MAX_GOALS} goals this week. Complete or remove one first.`,
    };
  }

  const goal = {
    id: generateId(),
    text: text.trim(),
    type,
    target,
    current: 0,
    unit,
    status: 'active',
    autoCompleted: false,
    confirmedComplete: false,
    weekOf: getCurrentWeekOf(),
    createdAt: new Date().toISOString(),
    completedAt: null,
    carriedFrom: null,
    source: 'manual',
  };

  goals.push(goal);
  saveGoalsData({ weekOf: getCurrentWeekOf(), goals });

  return { success: true, goal };
}

/**
 * Update a goal by ID
 */
export function updateGoal(goalId, updates) {
  const data = getGoalsData();
  if (!data) return false;

  const idx = data.goals.findIndex(g => g.id === goalId);
  if (idx === -1) return false;

  data.goals[idx] = { ...data.goals[idx], ...updates };
  saveGoalsData(data);
  return true;
}

/**
 * Remove a goal by ID
 */
export function removeGoal(goalId) {
  const data = getGoalsData();
  if (!data) return false;

  data.goals = data.goals.filter(g => g.id !== goalId);
  saveGoalsData(data);
  return true;
}

/**
 * Increment a goal's current count by 1
 */
export function incrementGoal(goalId) {
  const data = getGoalsData();
  if (!data) return null;

  const goal = data.goals.find(g => g.id === goalId);
  if (!goal || goal.status === 'completed' || goal.status === 'dropped') return null;

  goal.current = Math.min(goal.current + 1, goal.target);

  // Check for auto-completion
  if (goal.current >= goal.target && !goal.autoCompleted) {
    goal.autoCompleted = true;
    goal.status = 'completed';
    goal.completedAt = new Date().toISOString();
  }

  saveGoalsData(data);
  return goal;
}

// ============================================
// AUTO-PROGRESS FROM ACTIVITIES
// ============================================

/**
 * Recalculate goal progress from logged activities.
 * Called when activities change or on page load.
 */
export function refreshGoalProgress() {
  const data = getGoalsData();
  if (!data || !data.goals) return [];

  const currentWeek = getCurrentWeekOf();
  if (data.weekOf !== currentWeek) {
    return ensureCurrentWeek();
  }

  let changed = false;

  for (const goal of data.goals) {
    if (goal.status === 'dropped') continue;

    // Try to auto-track from activities using the existing parseFocusItem system
    const parsed = parseFocusItem(goal.text);
    if (parsed) {
      const progress = calculateFocusProgress({ action: goal.text });
      if (progress.trackable) {
        const newCurrent = Math.min(progress.current, goal.target);
        if (newCurrent !== goal.current) {
          goal.current = newCurrent;
          changed = true;
        }

        // Auto-complete if target reached
        if (goal.current >= goal.target && goal.status === 'active') {
          goal.autoCompleted = true;
          goal.status = 'completed';
          goal.completedAt = new Date().toISOString();
          changed = true;
        }
      }
    }
  }

  if (changed) {
    saveGoalsData(data);
  }

  return data.goals;
}

/**
 * Get goals with fresh progress data and contributing activities.
 * contributingActivities is computed on-the-fly (not persisted).
 */
export function getGoalsWithProgress() {
  const goals = getGoals();
  refreshGoalProgress();
  // Re-read after refresh
  const data = getGoalsData();
  const refreshedGoals = data?.goals || goals;

  // Attach contributing activities to each trackable goal
  return refreshedGoals.map(goal => {
    if (goal.status === 'dropped') return goal;
    const parsed = parseFocusItem(goal.text);
    if (parsed) {
      const progress = calculateFocusProgress({ action: goal.text });
      if (progress.trackable && progress.contributingActivities) {
        return { ...goal, contributingActivities: progress.contributingActivities };
      }
    }
    return goal;
  });
}

// ============================================
// MIGRATION FROM PLAYBOOK
// ============================================

/**
 * Migrate existing playbook weeklyFocus items to new goal format
 */
function migrateFromPlaybook() {
  const playbook = getPlaybook();
  if (!playbook?.weeklyFocus || playbook.weeklyFocus.length === 0) return [];

  const currentWeek = getCurrentWeekOf();

  return playbook.weeklyFocus.slice(0, MAX_GOALS).map((item, idx) => {
    const parsed = parseFocusItem(item.action);
    const progress = parsed ? calculateFocusProgress(item, idx) : null;

    return {
      id: generateId(),
      text: item.action,
      type: 'recurring',
      target: progress?.target || parsed?.target || 3,
      current: progress?.current || 0,
      unit: parsed?.countField === 'days' ? 'days' : 'times',
      status: progress?.complete ? 'completed' : 'active',
      autoCompleted: progress?.complete || false,
      confirmedComplete: false,
      weekOf: currentWeek,
      createdAt: new Date().toISOString(),
      completedAt: progress?.complete ? new Date().toISOString() : null,
      carriedFrom: null,
      source: 'manual',
    };
  });
}

// ============================================
// WEEKLY TRANSITION
// ============================================

/**
 * Auto-transition when a new week starts without a check-in review.
 * - Recurring completed goals → re-add with current=0
 * - Incomplete goals → carry over
 * - Dropped goals → stay in history
 */
function autoTransitionWeek(oldData, newWeek) {
  // Archive old week to history
  archiveWeekToHistory(oldData);

  const newGoals = [];

  for (const goal of oldData.goals) {
    if (goal.status === 'dropped') continue;

    if (goal.status === 'completed' && goal.type === 'recurring') {
      // Recurring completed → re-add for new week
      newGoals.push({
        ...goal,
        id: generateId(),
        current: 0,
        status: 'active',
        autoCompleted: false,
        confirmedComplete: false,
        weekOf: newWeek,
        createdAt: new Date().toISOString(),
        completedAt: null,
        carriedFrom: null,
        source: 'recurring_auto',
      });
    } else if (goal.status === 'active' || goal.status === 'carried') {
      // Incomplete → carry over
      newGoals.push({
        ...goal,
        id: generateId(),
        current: 0,
        status: 'carried',
        autoCompleted: false,
        confirmedComplete: false,
        weekOf: newWeek,
        createdAt: new Date().toISOString(),
        completedAt: null,
        carriedFrom: oldData.weekOf,
        source: goal.source,
      });
    }
  }

  const newData = { weekOf: newWeek, goals: newGoals.slice(0, MAX_WITH_CARRY) };
  saveGoalsData(newData);
  return newData.goals;
}

/**
 * Perform the weekly transition based on user review decisions.
 * Called from the weekly check-in goal review step.
 *
 * @param {Array} decisions - Array of { goalId, action: 'keep'|'carry'|'drop'|'change', newTarget? }
 * @returns {Array} New week's goals
 */
export function performWeeklyTransition(decisions) {
  const data = getGoalsData();
  if (!data) return [];

  const newWeek = getCurrentWeekOf();

  // Archive current week
  archiveWeekToHistory(data);

  const newGoals = [];

  for (const decision of decisions) {
    const goal = data.goals.find(g => g.id === decision.goalId);
    if (!goal) continue;

    switch (decision.action) {
      case 'keep': {
        // Keep as recurring for next week
        newGoals.push({
          ...goal,
          id: generateId(),
          type: 'recurring',
          current: 0,
          target: decision.newTarget || goal.target,
          status: 'active',
          autoCompleted: false,
          confirmedComplete: false,
          weekOf: newWeek,
          createdAt: new Date().toISOString(),
          completedAt: null,
          carriedFrom: null,
          source: 'recurring_auto',
        });
        break;
      }
      case 'carry': {
        // Carry over incomplete goal
        newGoals.push({
          ...goal,
          id: generateId(),
          current: 0,
          target: decision.newTarget || goal.target,
          status: 'carried',
          autoCompleted: false,
          confirmedComplete: false,
          weekOf: newWeek,
          createdAt: new Date().toISOString(),
          completedAt: null,
          carriedFrom: data.weekOf,
          source: goal.source,
        });
        break;
      }
      case 'change': {
        // Keep with modified target
        newGoals.push({
          ...goal,
          id: generateId(),
          type: goal.type,
          current: 0,
          target: decision.newTarget || goal.target,
          text: decision.newText || goal.text,
          status: 'active',
          autoCompleted: false,
          confirmedComplete: false,
          weekOf: newWeek,
          createdAt: new Date().toISOString(),
          completedAt: null,
          carriedFrom: null,
          source: goal.source,
        });
        break;
      }
      case 'drop':
      default:
        // Don't carry to next week
        break;
    }
  }

  const newData = { weekOf: newWeek, goals: newGoals.slice(0, MAX_WITH_CARRY) };
  saveGoalsData(newData);
  return newData.goals;
}

// ============================================
// HISTORY
// ============================================

/**
 * Get all goal history
 * Handles both legacy array format and new {history, updatedAt} wrapper format
 */
export function getGoalHistory() {
  try {
    const raw = getItem(HISTORY_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    // Backwards compatibility: handle both array and wrapper object formats
    return Array.isArray(data) ? data : (data?.history || []);
  } catch {
    return [];
  }
}

/**
 * Save goal history and sync
 * Wraps history array with updatedAt for sync conflict resolution
 */
function saveGoalHistory(history) {
  // CRITICAL: Wrap with updatedAt for sync conflict resolution
  const dataWithTimestamp = {
    history,
    updatedAt: new Date().toISOString(),
  };
  setItem(HISTORY_KEY, JSON.stringify(dataWithTimestamp));
  syncGoalHistory();
}

/**
 * Archive a week's goals to history
 */
function archiveWeekToHistory(weekData) {
  if (!weekData?.goals?.length) return;

  const history = getGoalHistory();

  // Don't duplicate
  if (history.some(h => h.weekOf === weekData.weekOf)) return;

  history.unshift({
    weekOf: weekData.weekOf,
    goals: weekData.goals.map(g => ({ ...g })),
    reviewedAt: new Date().toISOString(),
  });

  // Keep last 12 weeks
  if (history.length > 12) {
    history.length = 12;
  }

  saveGoalHistory(history);
}

// ============================================
// STREAKS
// ============================================

/**
 * Calculate streaks for recurring goals across history
 */
export function getGoalStreaks() {
  const history = getGoalHistory();
  const currentGoals = getGoals();
  const allWeeks = [
    { weekOf: getCurrentWeekOf(), goals: currentGoals },
    ...history,
  ];

  // Group by goal text (normalized)
  const goalWeeks = {};

  for (const week of allWeeks) {
    for (const goal of week.goals) {
      const key = goal.text.toLowerCase().trim();
      if (!goalWeeks[key]) {
        goalWeeks[key] = { text: goal.text, weeks: [] };
      }
      goalWeeks[key].weeks.push({
        weekOf: week.weekOf,
        completed: goal.status === 'completed',
      });
    }
  }

  // Calculate streaks (consecutive completed weeks, most recent first)
  const streaks = [];

  for (const [, data] of Object.entries(goalWeeks)) {
    // Sort weeks by date descending
    data.weeks.sort((a, b) => b.weekOf.localeCompare(a.weekOf));

    let streak = 0;
    for (const week of data.weeks) {
      if (week.completed) {
        streak++;
      } else {
        break;
      }
    }

    if (streak >= 2) {
      streaks.push({ text: data.text, weeks: streak });
    }
  }

  streaks.sort((a, b) => b.weeks - a.weeks);
  return streaks;
}

// ============================================
// UTILITY
// ============================================

/**
 * Get count of active (non-completed, non-dropped) goals
 */
export function getActiveGoalCount() {
  const goals = getGoals();
  return goals.filter(g => g.status === 'active' || g.status === 'carried').length;
}

/**
 * Check if user can add more goals
 */
export function canAddGoal() {
  const goals = getGoals();
  const hasCarried = goals.some(g => g.carriedFrom);
  const activeCount = goals.filter(g => g.status !== 'dropped').length;
  return activeCount < (hasCarried ? MAX_WITH_CARRY : MAX_GOALS);
}

/**
 * Get the previous week's summary for "last week" display
 */
export function getLastWeekSummary() {
  const history = getGoalHistory();
  if (history.length === 0) return null;

  const lastWeek = history[0];
  const completed = lastWeek.goals.filter(g => g.status === 'completed').length;
  const total = lastWeek.goals.length;

  return {
    weekOf: lastWeek.weekOf,
    completed,
    total,
    goals: lastWeek.goals,
  };
}
