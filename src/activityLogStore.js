/**
 * Activity Log Store
 * Central storage for all quick entries and activity logs.
 * These feed into: This Week's Focus progress, Weekly Wins, Check-in pre-fill
 */

import { getItem, setItem, removeItem } from './storageHelper';

const STORAGE_KEY = 'health-advisor-activities';

// Activity types
export const ACTIVITY_TYPES = {
  WORKOUT: 'workout',
  NUTRITION: 'nutrition',
  SLEEP: 'sleep',
  WEIGHT: 'weight',
  HYDRATION: 'hydration',
  GENERAL: 'general',
};

// Activity sources - where the entry was logged from
export const ACTIVITY_SOURCES = {
  DASHBOARD: 'dashboard',
  PLAYBOOK: 'playbook',
  CHAT: 'chat',
  CHECK_IN: 'check-in',
};

// Sub-types for more specific categorization
export const WORKOUT_TYPES = {
  RUN: 'run',
  STRENGTH: 'strength',
  CARDIO: 'cardio',
  YOGA: 'yoga',
  WALK: 'walk',
  OTHER: 'other',
};

/**
 * Get all activities from storage
 */
export function getActivities() {
  try {
    const data = getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save activities to storage
 */
function saveActivities(activities) {
  setItem(STORAGE_KEY, JSON.stringify(activities));
}

/**
 * Log a new activity
 * @param {Object} activity - Activity data
 * @param {string} activity.type - One of ACTIVITY_TYPES
 * @param {string} activity.subType - More specific type (e.g., 'run', 'strength')
 * @param {string} activity.rawText - Original user input
 * @param {Object} activity.data - Parsed structured data (distance, duration, weight, etc.)
 * @param {string} activity.summary - Brief summary for display
 * @param {Array} activity.goalConnections - IDs of related playbook goals
 */
export function logActivity(activity) {
  const activities = getActivities();

  const newActivity = {
    id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    weekOf: getWeekOf(new Date()),
    ...activity,
  };

  activities.unshift(newActivity); // Most recent first
  saveActivities(activities);

  return newActivity;
}

/**
 * Get activities for a specific date
 */
export function getActivitiesForDate(date) {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  return getActivities().filter(a => a.date === dateStr);
}

/**
 * Get activities for the current week
 */
export function getActivitiesThisWeek() {
  const weekOf = getWeekOf(new Date());
  return getActivities().filter(a => a.weekOf === weekOf);
}

/**
 * Get activities for a specific week
 */
export function getActivitiesForWeek(weekOf) {
  return getActivities().filter(a => a.weekOf === weekOf);
}

/**
 * Get activities by type for current week
 */
export function getActivitiesByTypeThisWeek(type, subType = null) {
  const activities = getActivitiesThisWeek();
  return activities.filter(a => {
    if (a.type !== type) return false;
    if (subType && a.subType !== subType) return false;
    return true;
  });
}

/**
 * Get recent activities (last N)
 */
export function getRecentActivities(count = 10) {
  return getActivities().slice(0, count);
}

/**
 * Get the Monday of the week for a given date (ISO week)
 */
export function getWeekOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Get summary stats for the current week
 */
export function getWeeklySummary() {
  const activities = getActivitiesThisWeek();

  const summary = {
    totalActivities: activities.length,
    workouts: activities.filter(a => a.type === ACTIVITY_TYPES.WORKOUT).length,
    runs: activities.filter(a => a.subType === WORKOUT_TYPES.RUN).length,
    strengthSessions: activities.filter(a => a.subType === WORKOUT_TYPES.STRENGTH).length,
    nutritionLogs: activities.filter(a => a.type === ACTIVITY_TYPES.NUTRITION).length,
    proteinGoalHits: activities.filter(a => a.type === ACTIVITY_TYPES.NUTRITION && a.data?.hitProteinGoal).length,
    weightEntries: activities.filter(a => a.type === ACTIVITY_TYPES.WEIGHT),
    sleepLogs: activities.filter(a => a.type === ACTIVITY_TYPES.SLEEP).length,
  };

  // Calculate totals
  const runActivities = activities.filter(a => a.subType === WORKOUT_TYPES.RUN);
  summary.totalMiles = runActivities.reduce((sum, a) => sum + (a.data?.distance || 0), 0);

  // Latest weight
  if (summary.weightEntries.length > 0) {
    summary.latestWeight = summary.weightEntries[0].data?.weight;
  }

  return summary;
}

/**
 * Delete an activity
 */
export function deleteActivity(id) {
  const activities = getActivities().filter(a => a.id !== id);
  saveActivities(activities);
  return activities;
}

/**
 * Update an activity by ID
 */
export function updateActivity(id, updates) {
  const activities = getActivities();
  const index = activities.findIndex(a => a.id === id);
  if (index !== -1) {
    activities[index] = { ...activities[index], ...updates };
    // Merge data if provided
    if (updates.data) {
      activities[index].data = { ...activities[index].data, ...updates.data };
    }
    saveActivities(activities);
    return activities[index];
  }
  return null;
}

/**
 * Clear all activities (use with caution)
 */
export function clearActivities() {
  removeItem(STORAGE_KEY);
}

/**
 * Search activities by text query
 */
export function searchActivities(query) {
  if (!query || !query.trim()) return getActivities();

  const normalizedQuery = query.toLowerCase().trim();
  return getActivities().filter(a => {
    const searchText = [
      a.rawText,
      a.summary,
      a.data?.notes,
      a.data?.exercise,
    ].filter(Boolean).join(' ').toLowerCase();

    return searchText.includes(normalizedQuery);
  });
}

/**
 * Filter activities by type, date range, and source
 */
export function filterActivities({ type, source, startDate, endDate } = {}) {
  let activities = getActivities();

  if (type && type !== 'all') {
    activities = activities.filter(a => a.type === type);
  }

  if (source && source !== 'all') {
    activities = activities.filter(a => a.source === source);
  }

  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    activities = activities.filter(a => new Date(a.timestamp) >= start);
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    activities = activities.filter(a => new Date(a.timestamp) <= end);
  }

  return activities;
}

/**
 * Get activities with combined search and filters
 */
export function getFilteredActivities({ query, type, source, startDate, endDate } = {}) {
  let activities = getActivities();

  // Apply text search
  if (query && query.trim()) {
    const normalizedQuery = query.toLowerCase().trim();
    activities = activities.filter(a => {
      const searchText = [
        a.rawText,
        a.summary,
        a.data?.notes,
        a.data?.exercise,
      ].filter(Boolean).join(' ').toLowerCase();
      return searchText.includes(normalizedQuery);
    });
  }

  // Apply type filter
  if (type && type !== 'all') {
    activities = activities.filter(a => a.type === type);
  }

  // Apply source filter
  if (source && source !== 'all') {
    activities = activities.filter(a => a.source === source);
  }

  // Apply date range
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    activities = activities.filter(a => new Date(a.timestamp) >= start);
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    activities = activities.filter(a => new Date(a.timestamp) <= end);
  }

  return activities;
}

/**
 * Get activities formatted for check-in pre-fill
 * Groups activities by type and extracts relevant data
 */
export function getCheckInPrefill(weekOf) {
  const activities = getActivitiesForWeek(weekOf);

  const prefill = {
    workouts: [],
    runs: [],
    weights: [],
    sleepNotes: [],
    nutritionNotes: [],
  };

  for (const activity of activities) {
    switch (activity.type) {
      case ACTIVITY_TYPES.WORKOUT:
        if (activity.subType === WORKOUT_TYPES.RUN) {
          prefill.runs.push({
            date: activity.date,
            distance: activity.data?.distance,
            pace: activity.data?.pace,
            feeling: activity.data?.feeling,
          });
        } else {
          prefill.workouts.push({
            date: activity.date,
            type: activity.subType,
            summary: activity.summary,
            data: activity.data,
          });
        }
        break;
      case ACTIVITY_TYPES.WEIGHT:
        prefill.weights.push({
          date: activity.date,
          weight: activity.data?.weight,
        });
        break;
      case ACTIVITY_TYPES.SLEEP:
        prefill.sleepNotes.push({
          date: activity.date,
          quality: activity.data?.quality,
          hours: activity.data?.hours,
          notes: activity.summary,
        });
        break;
      case ACTIVITY_TYPES.NUTRITION:
        prefill.nutritionNotes.push({
          date: activity.date,
          summary: activity.summary,
          data: activity.data,
        });
        break;
    }
  }

  return prefill;
}

/**
 * Format a date as a readable day name (e.g., "Monday", "Tuesday")
 */
function formatDayName(dateStr) {
  const date = new Date(dateStr + 'T12:00:00'); // Add time to avoid timezone issues
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Get day order for sorting (Monday = 0, Sunday = 6)
 */
function getDayOrder(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  // Convert so Monday = 0, Sunday = 6
  return day === 0 ? 6 : day - 1;
}

/**
 * Sort activities chronologically by date (Monday first)
 */
function sortChronologically(activities) {
  return [...activities].sort((a, b) => {
    const orderA = getDayOrder(a.date);
    const orderB = getDayOrder(b.date);
    if (orderA !== orderB) return orderA - orderB;
    // If same day, sort by timestamp
    return new Date(a.timestamp) - new Date(b.timestamp);
  });
}

/**
 * Check if an activity is a playbook/profile modification or preference info (not actual progress)
 */
function isModificationEntry(activity) {
  // Check for modification-related keywords in summary or rawText
  const text = (activity.summary || activity.rawText || '').toLowerCase();

  // Keywords that indicate this is a modification/edit request
  const modificationKeywords = [
    'change focus', 'update focus', 'edit focus', 'modify focus',
    'change principle', 'update principle', 'edit principle',
    'change radar', 'update radar', 'remove',
    'updated focus item', 'changed focus item', 'modified',
    'update my weight to', 'change my weight to',
    'swap', 'replace', 'switch to', 'switching to',
  ];

  if (modificationKeywords.some(keyword => text.includes(keyword))) {
    return true;
  }

  // Keywords that indicate this is profile/preference information, not workout progress
  const profileInfoKeywords = [
    'lactose intolerant', 'intolerant', 'allergy', 'allergic',
    'instead of whey', 'instead of casein', 'pea protein', 'vega sport',
    'uses', 'prefers', 'preference', 'i use', 'i prefer',
    'can\'t have', 'cannot have', 'don\'t eat', 'avoid eating',
    'dietary restriction', 'food sensitivity',
  ];

  if (profileInfoKeywords.some(keyword => text.includes(keyword))) {
    return true;
  }

  // Check if it's a general type with no meaningful data (likely an edit request)
  if (activity.type === ACTIVITY_TYPES.GENERAL) {
    const hasRealData = activity.data && (
      activity.data.distance || activity.data.duration || activity.data.weight ||
      activity.data.hours || activity.data.feeling || activity.data.pr ||
      activity.data.hitProteinGoal || activity.data.quality
    );
    if (!hasRealData) {
      return true;
    }
  }

  // Check if it's nutrition type but just describes preferences, not actual intake
  if (activity.type === ACTIVITY_TYPES.NUTRITION) {
    const isPreferenceInfo = !activity.data?.hitProteinGoal &&
      !activity.data?.calories &&
      !activity.data?.protein &&
      (text.includes('protein powder') || text.includes('supplement'));
    if (isPreferenceInfo) {
      return true;
    }
  }

  return false;
}

/**
 * Get activities filtered to only include actual progress (no modifications)
 */
export function getProgressActivitiesThisWeek() {
  return getActivitiesThisWeek().filter(a => !isModificationEntry(a));
}

/**
 * Generate intelligent narrative summaries for check-in pre-fill
 * Returns readable text summaries grouped by category
 * IMPORTANT: Chronological order (Monday → Sunday), NO hallucinated feelings
 * Only includes actual progress entries, not playbook/profile modifications
 */
export function generateNarrativeSummaries() {
  const activities = getProgressActivitiesThisWeek(); // Only progress entries
  const summaries = {};

  // Group activities by category and sort chronologically
  const runs = sortChronologically(activities.filter(a => a.subType === WORKOUT_TYPES.RUN));
  const strengthSessions = sortChronologically(activities.filter(a => a.subType === WORKOUT_TYPES.STRENGTH));
  const otherWorkouts = sortChronologically(activities.filter(a => a.type === ACTIVITY_TYPES.WORKOUT && a.subType !== WORKOUT_TYPES.RUN && a.subType !== WORKOUT_TYPES.STRENGTH));
  const sleepLogs = sortChronologically(activities.filter(a => a.type === ACTIVITY_TYPES.SLEEP));
  const nutritionLogs = sortChronologically(activities.filter(a => a.type === ACTIVITY_TYPES.NUTRITION));
  const weightLogs = sortChronologically(activities.filter(a => a.type === ACTIVITY_TYPES.WEIGHT));

  // Generate running summary - chronological, no hallucinated feelings
  if (runs.length > 0) {
    const runDetails = runs.map(run => {
      const day = formatDayName(run.date);
      const parts = [];
      if (run.data?.distance) parts.push(`${run.data.distance} mile${run.data.distance !== 1 ? 's' : ''}`);
      if (run.data?.pace) parts.push(`${run.data.pace}/mile pace`);
      if (run.data?.duration) parts.push(`${run.data.duration} min`);
      // ONLY include feeling if explicitly provided
      if (run.data?.feeling && run.data.feeling !== null) parts.push(`felt ${run.data.feeling}`);

      const detail = parts.length > 0 ? parts.join(', ') : (run.summary || run.rawText || 'ran');
      return `${day}: ${detail}`;
    });

    const totalMiles = runs.reduce((sum, r) => sum + (r.data?.distance || 0), 0);
    let runSummary = runDetails.join('. ') + '.';
    if (runs.length > 1 && totalMiles > 0) {
      runSummary += ` Total: ${totalMiles} mile${totalMiles !== 1 ? 's' : ''} across ${runs.length} runs.`;
    }
    summaries.running = runSummary;
  }

  // Generate strength training summary - chronological, no hallucinated feelings
  if (strengthSessions.length > 0) {
    const strengthDetails = strengthSessions.map(session => {
      const day = formatDayName(session.date);
      const parts = [];

      if (session.data?.exercise) parts.push(session.data.exercise);
      if (session.data?.pr && session.data?.prValue) {
        parts.push(`PR: ${session.data.prValue}`);
      } else if (session.data?.pr) {
        parts.push('hit a PR');
      }
      // ONLY include feeling if explicitly provided
      if (session.data?.feeling && session.data.feeling !== null) parts.push(`felt ${session.data.feeling}`);

      const detail = parts.length > 0 ? parts.join(', ') : (session.summary || session.rawText || 'strength training');
      return `${day}: ${detail}`;
    });

    summaries.strength = strengthDetails.join('. ') + '.';
  }

  // Generate other workouts summary - chronological
  if (otherWorkouts.length > 0) {
    const workoutDetails = otherWorkouts.map(workout => {
      const day = formatDayName(workout.date);
      const type = workout.subType || 'workout';
      const detail = workout.summary || workout.rawText || workout.data?.notes || type;
      return `${day}: ${detail}`;
    });
    summaries.otherWorkouts = workoutDetails.join('. ') + '.';
  }

  // Generate sleep summary - chronological
  if (sleepLogs.length > 0) {
    const sleepDetails = sleepLogs.map(log => {
      const day = formatDayName(log.date);
      const parts = [];
      if (log.data?.hours) parts.push(`${log.data.hours} hours`);
      // ONLY include quality if explicitly provided
      if (log.data?.quality && log.data.quality !== null) parts.push(`${log.data.quality} quality`);
      if (log.data?.notes) parts.push(log.data.notes);

      const detail = parts.length > 0 ? parts.join(', ') : (log.summary || log.rawText || 'logged');
      return `${day}: ${detail}`;
    });

    const avgHours = sleepLogs.reduce((sum, l) => sum + (l.data?.hours || 0), 0) / sleepLogs.length;
    let sleepSummary = sleepDetails.join('. ') + '.';
    if (sleepLogs.length > 1 && avgHours > 0) {
      sleepSummary += ` Average: ${avgHours.toFixed(1)} hours/night.`;
    }
    summaries.sleep = sleepSummary;
  }

  // Generate nutrition summary - chronological
  if (nutritionLogs.length > 0) {
    const proteinHits = nutritionLogs.filter(n => n.data?.hitProteinGoal).length;
    const nutritionDetails = nutritionLogs.map(log => {
      const day = formatDayName(log.date);
      if (log.data?.hitProteinGoal) {
        return `${day}: Hit protein goal`;
      }
      return `${day}: ${log.summary || log.rawText || log.data?.notes || 'logged'}`;
    });

    let nutritionSummary = nutritionDetails.join('. ') + '.';
    if (proteinHits > 0) {
      nutritionSummary += ` Hit protein goal ${proteinHits} time${proteinHits !== 1 ? 's' : ''} this week.`;
    }
    summaries.nutrition = nutritionSummary;
  }

  // Generate weight summary - chronological
  if (weightLogs.length > 0) {
    const weights = weightLogs.map(w => ({
      day: formatDayName(w.date),
      weight: w.data?.weight,
      date: w.date,
    })).filter(w => w.weight);

    if (weights.length > 0) {
      const earliest = weights[0]; // First in week (Monday)
      const latest = weights[weights.length - 1]; // Latest in week
      if (weights.length === 1) {
        summaries.weight = `${earliest.day}: Weighed in at ${earliest.weight} lbs.`;
      } else {
        const change = latest.weight - earliest.weight;
        const changeText = change > 0 ? `up ${change.toFixed(1)}` : change < 0 ? `down ${Math.abs(change).toFixed(1)}` : 'no change';
        summaries.weight = `Weighed in ${weights.length} times. Started at ${earliest.weight} lbs on ${earliest.day}, latest: ${latest.weight} lbs (${changeText} lbs).`;
      }
    }
  }

  // Generate combined workout summary - chronological
  if (runs.length > 0 || strengthSessions.length > 0 || otherWorkouts.length > 0) {
    const allWorkouts = sortChronologically([...runs, ...strengthSessions, ...otherWorkouts]);

    const combinedDetails = allWorkouts.map(w => {
      const day = formatDayName(w.date);
      let type = w.subType || 'workout';
      if (type === 'run') type = 'ran';
      if (type === 'strength') type = 'strength training';

      const parts = [];
      if (w.data?.distance) parts.push(`${w.data.distance} miles`);
      if (w.data?.pace) parts.push(`${w.data.pace} pace`);
      if (w.data?.exercise) parts.push(w.data.exercise);
      if (w.data?.pr && w.data?.prValue) parts.push(`PR: ${w.data.prValue}`);
      // ONLY include feeling if explicitly provided
      if (w.data?.feeling && w.data.feeling !== null) parts.push(`felt ${w.data.feeling}`);

      const detail = parts.length > 0 ? `${type} (${parts.join(', ')})` : (w.summary || w.rawText || type);
      return `${day}: ${detail}`;
    });

    summaries.allWorkouts = combinedDetails.join('. ') + '.';
  }

  return summaries;
}

/**
 * Get activities with full details for a focus item
 * Uses TYPE-based matching, NOT goalConnections (which can be incorrect)
 * Only includes actual progress entries, not modifications
 *
 * NOTE: This function needs the focus item text to do proper type matching.
 * If focusText is not provided, falls back to goalConnections (legacy behavior)
 */
export function getActivitiesForFocusItem(focusIndex, focusText = null) {
  const activities = getProgressActivitiesThisWeek();

  // If no focus text provided, fall back to goalConnections
  // This maintains backwards compatibility but is less accurate
  if (!focusText) {
    return activities.filter(a => a.goalConnections?.includes(focusIndex));
  }

  // Use type-based matching (same logic as weeklyProgressStore)
  const text = focusText.toLowerCase();

  // Determine the goal type from text
  let goalType = null;
  let goalSubType = null;
  let contentKeywords = [];

  // Check for workout-related keywords
  const workoutKeywords = ['run ', 'runs', 'running', 'jog', 'mile', 'strength', 'lift', 'lifting', 'weights', 'gym', 'squat', 'deadlift', 'bench', 'workout', 'exercise', 'cardio', 'walk', 'yoga', 'stretch'];
  const nutritionKeywords = ['protein', 'meal', 'eat', 'breakfast', 'lunch', 'dinner', 'snack', 'calorie', 'food', 'vega', 'shake', 'scoop', 'supplement'];
  const sleepKeywords = ['sleep', 'bed', 'rest', 'hour'];
  const waterKeywords = ['water', 'hydrat', 'drink', 'fluid'];
  const weightKeywords = ['weigh', 'scale', 'weight check'];

  if (workoutKeywords.some(kw => text.includes(kw))) {
    goalType = ACTIVITY_TYPES.WORKOUT;
    // Determine subtype
    if (['run ', 'runs', 'running', 'jog', 'mile'].some(kw => text.includes(kw))) {
      goalSubType = WORKOUT_TYPES.RUN;
    } else if (['strength', 'lift', 'lifting', 'weights', 'gym', 'squat', 'deadlift', 'bench'].some(kw => text.includes(kw))) {
      goalSubType = WORKOUT_TYPES.STRENGTH;
    } else if (['cardio', 'hiit', 'bike', 'cycling', 'swim'].some(kw => text.includes(kw))) {
      goalSubType = WORKOUT_TYPES.CARDIO;
    } else if (['walk', 'steps'].some(kw => text.includes(kw))) {
      goalSubType = WORKOUT_TYPES.WALK;
    } else if (['yoga', 'stretch', 'mobility'].some(kw => text.includes(kw))) {
      goalSubType = WORKOUT_TYPES.YOGA;
    }
  } else if (nutritionKeywords.some(kw => text.includes(kw))) {
    goalType = ACTIVITY_TYPES.NUTRITION;
    // Extract content keywords for specific products
    if (text.includes('vega')) contentKeywords.push('vega');
    if (text.includes('protein powder') || text.includes('protein shake')) {
      contentKeywords.push('protein powder', 'protein shake', 'shake', 'scoop');
    }
    if (text.includes('shake')) contentKeywords.push('shake');
    if (text.includes('scoop')) contentKeywords.push('scoop');
  } else if (sleepKeywords.some(kw => text.includes(kw))) {
    goalType = ACTIVITY_TYPES.SLEEP;
  } else if (waterKeywords.some(kw => text.includes(kw))) {
    goalType = ACTIVITY_TYPES.HYDRATION;
  } else if (weightKeywords.some(kw => text.includes(kw))) {
    goalType = ACTIVITY_TYPES.WEIGHT;
  }

  // Filter activities by type
  return activities.filter(a => {
    // Must match goal type
    if (goalType && a.type !== goalType) return false;

    // For workout goals with subtype, must match subtype
    if (goalSubType && a.subType !== goalSubType) return false;

    // For content-specific goals, activity must mention relevant keywords
    if (contentKeywords.length > 0) {
      const activityText = [a.rawText, a.summary, a.data?.notes].filter(Boolean).join(' ').toLowerCase();
      if (!contentKeywords.some(kw => activityText.includes(kw))) return false;
    }

    return true;
  });
}

/**
 * Generate a narrative summary for a specific focus item
 * IMPORTANT: Chronological order (Monday → Sunday), NO hallucinated feelings
 */
export function getFocusItemNarrative(focusIndex, focusText) {
  // Pass focus text for proper type-based filtering
  const activities = getActivitiesForFocusItem(focusIndex, focusText);
  if (activities.length === 0) return null;

  // Sort chronologically (Monday first)
  const sorted = sortChronologically(activities);

  const details = sorted.map(a => {
    const day = formatDayName(a.date);
    const parts = [];

    // Include all relevant data - ONLY what user explicitly provided
    if (a.data?.distance) parts.push(`${a.data.distance} mile${a.data.distance !== 1 ? 's' : ''}`);
    if (a.data?.pace) parts.push(`${a.data.pace}/mile`);
    if (a.data?.duration) parts.push(`${a.data.duration} min`);
    if (a.data?.exercise) parts.push(a.data.exercise);
    if (a.data?.pr && a.data?.prValue) parts.push(`PR: ${a.data.prValue}`);
    else if (a.data?.pr) parts.push('PR');
    // ONLY include feeling if user explicitly provided it (not null/undefined)
    if (a.data?.feeling && a.data.feeling !== null) parts.push(`felt ${a.data.feeling}`);
    if (a.data?.notes) parts.push(a.data.notes);

    const detail = parts.length > 0 ? parts.join(', ') : (a.summary || a.rawText || 'logged');
    return `${day}: ${detail}`;
  });

  return details.join('. ') + '.';
}

/**
 * Get activities this week that are missing feeling/detail information
 * Used for clarifying questions before check-in finalization
 * Returns activities that would benefit from additional context
 */
export function getActivitiesNeedingClarification(maxCount = 5) {
  const activities = getProgressActivitiesThisWeek();

  // Filter to workout activities without feeling data
  const needsClarification = activities.filter(a => {
    // Only workouts and runs typically benefit from "how did it feel" questions
    if (a.type !== ACTIVITY_TYPES.WORKOUT) return false;

    // Skip if already has feeling data
    if (a.data?.feeling && a.data.feeling !== null) return false;

    // Has meaningful workout data to ask about
    const hasWorkoutData = a.data?.exercise || a.data?.distance || a.data?.duration || a.data?.pr;
    return hasWorkoutData || a.summary;
  });

  // Sort chronologically and take max count
  return sortChronologically(needsClarification).slice(0, maxCount);
}

/**
 * Generate a clarifying question for an activity
 */
export function generateClarifyingQuestion(activity) {
  const day = formatDayName(activity.date);

  if (activity.data?.exercise) {
    // Strength workout
    const exercise = activity.data.exercise;
    if (activity.data?.pr || activity.data?.prValue) {
      return `You hit a PR on ${exercise} on ${day} - how did that feel?`;
    }
    return `You did ${exercise} on ${day} - how did that feel?`;
  }

  if (activity.data?.distance) {
    // Run
    const distance = activity.data.distance;
    return `You ran ${distance} mile${distance !== 1 ? 's' : ''} on ${day} - how did it feel?`;
  }

  if (activity.subType === WORKOUT_TYPES.STRENGTH) {
    return `You did strength training on ${day} - how did it feel?`;
  }

  if (activity.subType === WORKOUT_TYPES.RUN) {
    return `You ran on ${day} - how did it feel?`;
  }

  // Generic workout
  const summary = activity.summary || activity.rawText || 'your workout';
  return `${day}: ${summary} - how did it feel?`;
}

/**
 * Generate a cohesive narrative paragraph for a focus item
 * Uses natural language connectors for chronological flow
 */
export function getFocusItemCohesiveNarrative(focusIndex, focusText) {
  // Pass focus text for proper type-based filtering
  const activities = getActivitiesForFocusItem(focusIndex, focusText);
  if (activities.length === 0) return null;

  // Sort chronologically (Monday first)
  const sorted = sortChronologically(activities);

  // Build cohesive sentences
  const sentences = sorted.map((a, idx) => {
    const day = formatDayName(a.date);
    const parts = [];

    // Build activity description - ONLY what user provided
    if (a.data?.exercise) parts.push(a.data.exercise);
    if (a.data?.distance) parts.push(`${a.data.distance} mile${a.data.distance !== 1 ? 's' : ''}`);
    if (a.data?.pace) parts.push(`at ${a.data.pace}/mile`);
    if (a.data?.duration) parts.push(`for ${a.data.duration} minutes`);
    if (a.data?.pr && a.data?.prValue) parts.push(`(PR: ${a.data.prValue})`);
    // ONLY include feeling if explicitly provided
    if (a.data?.feeling && a.data.feeling !== null) parts.push(`and felt ${a.data.feeling}`);

    const activity = parts.length > 0 ? parts.join(' ') : (a.summary || a.rawText || 'logged activity');

    // Use varied connectors based on position
    if (idx === 0) {
      return `On ${day}, ${activity}`;
    } else if (idx === sorted.length - 1 && sorted.length > 2) {
      return `Finally on ${day}, ${activity}`;
    } else {
      const connectors = ['On', 'Then on', 'Later on'];
      return `${connectors[idx % connectors.length]} ${day}, ${activity}`;
    }
  });

  return sentences.join('. ') + '.';
}
