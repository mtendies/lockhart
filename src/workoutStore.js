/**
 * Workout Store
 * Central storage for workout logging, tracked metrics, and progress data.
 * Integrates with activity log for cross-app syncing.
 */

import { getItem, setItem } from './storageHelper';
import { getActivities, logActivity, deleteActivity, ACTIVITY_TYPES, WORKOUT_TYPES, getWeekOf } from './activityLogStore';

const WORKOUTS_KEY = 'health-advisor-workouts';
const TRACKED_METRICS_KEY = 'health-advisor-tracked-metrics';

// Common exercises for dropdown
export const COMMON_EXERCISES = {
  strength: [
    'Bench Press',
    'Squat',
    'Deadlift',
    'Overhead Press',
    'Barbell Row',
    'Pull-ups',
    'Lat Pulldown',
    'Dumbbell Curl',
    'Tricep Pushdown',
    'Leg Press',
    'Romanian Deadlift',
    'Lunges',
    'Dips',
    'Face Pulls',
    'Cable Fly',
  ],
  cardio: [
    'Run',
    'Walk',
    'Cycling',
    'Swimming',
    'Rowing',
    'Elliptical',
    'Stair Climber',
    'Jump Rope',
    'HIIT',
  ],
  flexibility: [
    'Yoga',
    'Stretching',
    'Mobility Work',
    'Foam Rolling',
    'Pilates',
  ],
};

// Workout types for filtering
export const TRAINING_TYPES = {
  STRENGTH: 'strength',
  CARDIO: 'cardio',
  FLEXIBILITY: 'flexibility',
  OTHER: 'other',
};

// Default tracked metrics
const DEFAULT_TRACKED_METRICS = [
  { id: 'bench-press', name: 'Bench Press', type: 'strength', unit: 'lbs' },
  { id: 'squat', name: 'Squat', type: 'strength', unit: 'lbs' },
  { id: 'deadlift', name: 'Deadlift', type: 'strength', unit: 'lbs' },
  { id: 'mile-time', name: 'Mile Time', type: 'cardio', unit: 'time' },
  { id: 'longest-run', name: 'Longest Run', type: 'cardio', unit: 'miles' },
];

/**
 * Get all workouts from storage
 */
export function getWorkouts() {
  try {
    const data = getItem(WORKOUTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save workouts to storage
 */
function saveWorkouts(workouts) {
  setItem(WORKOUTS_KEY, JSON.stringify(workouts));
}

/**
 * Log a new workout
 * Also syncs to activity log
 */
export function logWorkout(workout) {
  const workouts = getWorkouts();

  const newWorkout = {
    id: `workout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    date: workout.date || new Date().toISOString().split('T')[0],
    weekOf: getWeekOf(new Date(workout.date || new Date())),
    ...workout,
  };

  workouts.unshift(newWorkout);
  saveWorkouts(workouts);

  // Also log to activity log for cross-app sync
  const workoutType = mapTrainingTypeToWorkoutType(workout.type);
  logActivity({
    type: ACTIVITY_TYPES.WORKOUT,
    subType: workoutType,
    rawText: workout.rawText || formatWorkoutSummary(workout),
    summary: formatWorkoutSummary(workout),
    source: 'training',
    data: {
      exercise: workout.exercise,
      sets: workout.sets,
      reps: workout.reps,
      weight: workout.weight,
      distance: workout.distance,
      duration: workout.duration,
      pace: workout.pace,
      notes: workout.notes,
      workoutId: newWorkout.id,
    },
  });

  return newWorkout;
}

/**
 * Map training type to workout subtype
 */
function mapTrainingTypeToWorkoutType(type) {
  switch (type) {
    case TRAINING_TYPES.STRENGTH:
      return WORKOUT_TYPES.STRENGTH;
    case TRAINING_TYPES.CARDIO:
      return WORKOUT_TYPES.RUN; // Default cardio to run for now
    case TRAINING_TYPES.FLEXIBILITY:
      return WORKOUT_TYPES.YOGA;
    default:
      return WORKOUT_TYPES.OTHER;
  }
}

/**
 * Format workout into a summary string
 */
function formatWorkoutSummary(workout) {
  const parts = [];

  if (workout.exercise) {
    parts.push(workout.exercise);
  }

  if (workout.weight && workout.reps && workout.sets) {
    parts.push(`${workout.weight} ${workout.weightUnit || 'lbs'} × ${workout.reps} reps × ${workout.sets} sets`);
  } else if (workout.weight && workout.reps) {
    parts.push(`${workout.weight} ${workout.weightUnit || 'lbs'} × ${workout.reps} reps`);
  }

  if (workout.distance) {
    const paceStr = workout.pace ? ` @ ${workout.pace}` : '';
    parts.push(`${workout.distance} ${workout.distanceUnit || 'miles'}${paceStr}`);
  }

  if (workout.duration && !workout.distance) {
    parts.push(`${workout.duration} min`);
  }

  return parts.join(': ') || workout.exercise || 'Workout logged';
}

/**
 * Get workouts for a specific date
 */
export function getWorkoutsForDate(date) {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  return getWorkouts().filter(w => w.date === dateStr);
}

/**
 * Get recent workouts — merges workoutStore entries with workout-type activities
 * so workouts logged from the home quick-entry also appear on the Training page.
 */
export function getRecentWorkouts(count = 10) {
  const storeWorkouts = getWorkouts();

  // Also pull workout-type activities that may not be in the store
  const activities = getActivities()
    .filter(a => a.type === ACTIVITY_TYPES.WORKOUT)
    .filter(a => !storeWorkouts.some(w => w.id === a.data?.workoutId));

  // Convert activities to workout-like shape
  const activityWorkouts = activities.map(a => ({
    id: a.id,
    timestamp: a.timestamp,
    date: a.timestamp?.split('T')[0],
    rawText: a.rawText,
    summary: a.summary,
    exercise: a.data?.exercise,
    type: a.subType || 'other',
    sets: a.data?.sets,
    reps: a.data?.reps,
    weight: a.data?.weight,
    distance: a.data?.distance,
    duration: a.data?.duration,
    pace: a.data?.pace,
    notes: a.data?.notes,
    source: a.source || 'dashboard',
  }));

  // Merge and sort by timestamp descending
  return [...storeWorkouts, ...activityWorkouts]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, count);
}

/**
 * Get workouts for this week
 */
export function getWorkoutsThisWeek() {
  const weekOf = getWeekOf(new Date());
  return getWorkouts().filter(w => w.weekOf === weekOf);
}

/**
 * Delete a workout
 * Also deletes linked activity from activity log
 */
export function deleteWorkout(id) {
  const workouts = getWorkouts().filter(w => w.id !== id);
  saveWorkouts(workouts);

  // Also delete from activity log if there's a linked activity
  // The activity may have workoutId in its data, or the activity ID may match
  const activities = getActivities();
  const linkedActivity = activities.find(a =>
    a.data?.workoutId === id || a.id === id
  );
  if (linkedActivity) {
    deleteActivity(linkedActivity.id);
  }

  return workouts;
}

/**
 * Update a workout
 */
export function updateWorkout(id, updates) {
  const workouts = getWorkouts();
  const index = workouts.findIndex(w => w.id === id);
  if (index !== -1) {
    workouts[index] = { ...workouts[index], ...updates };
    saveWorkouts(workouts);
    return workouts[index];
  }
  return null;
}

/**
 * Get tracked metrics
 */
export function getTrackedMetrics() {
  try {
    const data = getItem(TRACKED_METRICS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // Fall through to default
  }
  // Return default metrics
  return [...DEFAULT_TRACKED_METRICS];
}

/**
 * Save tracked metrics
 */
export function saveTrackedMetrics(metrics) {
  setItem(TRACKED_METRICS_KEY, JSON.stringify(metrics));
}

/**
 * Add a tracked metric
 */
export function addTrackedMetric(metric) {
  const metrics = getTrackedMetrics();
  const newMetric = {
    id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...metric,
  };
  metrics.push(newMetric);
  saveTrackedMetrics(metrics);
  return newMetric;
}

/**
 * Remove a tracked metric
 */
export function removeTrackedMetric(id) {
  const metrics = getTrackedMetrics().filter(m => m.id !== id);
  saveTrackedMetrics(metrics);
  return metrics;
}

/**
 * Get progress data for a specific metric
 * Returns array of { date, value } sorted by date
 */
export function getMetricProgress(metricName) {
  // Get workouts that match this metric
  const workouts = getWorkouts();
  const metricLower = metricName.toLowerCase();

  const progressData = [];

  for (const workout of workouts) {
    const exerciseLower = (workout.exercise || '').toLowerCase();

    // Check if exercise matches metric
    if (exerciseLower.includes(metricLower) || metricLower.includes(exerciseLower)) {
      // For strength exercises, use weight
      if (workout.weight) {
        progressData.push({
          date: workout.date,
          value: parseFloat(workout.weight),
          reps: workout.reps,
          sets: workout.sets,
          timestamp: workout.timestamp,
        });
      }
      // For cardio, use distance or time
      else if (workout.distance) {
        progressData.push({
          date: workout.date,
          value: parseFloat(workout.distance),
          duration: workout.duration,
          pace: workout.pace,
          timestamp: workout.timestamp,
        });
      }
      // For time-based metrics (like mile time)
      else if (workout.duration && metricLower.includes('time')) {
        progressData.push({
          date: workout.date,
          value: parseFloat(workout.duration),
          timestamp: workout.timestamp,
        });
      }
    }
  }

  // Also check activity log for workout entries
  const activities = getActivities().filter(a => a.type === ACTIVITY_TYPES.WORKOUT);

  for (const activity of activities) {
    // Skip if already captured from workouts
    if (activity.data?.workoutId) continue;

    const exerciseLower = (activity.data?.exercise || activity.summary || '').toLowerCase();

    if (exerciseLower.includes(metricLower) || metricLower.includes(exerciseLower)) {
      if (activity.data?.weight) {
        progressData.push({
          date: activity.date,
          value: parseFloat(activity.data.weight),
          reps: activity.data.reps,
          sets: activity.data.sets,
          timestamp: activity.timestamp,
        });
      } else if (activity.data?.distance) {
        progressData.push({
          date: activity.date,
          value: parseFloat(activity.data.distance),
          duration: activity.data.duration,
          pace: activity.data.pace,
          timestamp: activity.timestamp,
        });
      }
    }
  }

  // Sort by date ascending
  progressData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Remove duplicates (same date, keep highest value)
  const uniqueByDate = {};
  for (const entry of progressData) {
    if (!uniqueByDate[entry.date] || entry.value > uniqueByDate[entry.date].value) {
      uniqueByDate[entry.date] = entry;
    }
  }

  return Object.values(uniqueByDate).sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Get personal record for a metric
 */
export function getMetricPR(metricName) {
  const progress = getMetricProgress(metricName);

  if (progress.length === 0) return null;

  // For time-based metrics (like mile time), lower is better
  const isTimeBased = metricName.toLowerCase().includes('time');

  let pr = progress[0];
  for (const entry of progress) {
    if (isTimeBased) {
      if (entry.value < pr.value) pr = entry;
    } else {
      if (entry.value > pr.value) pr = entry;
    }
  }

  return pr;
}

/**
 * Get workout statistics
 */
export function getWorkoutStats(days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const workouts = getWorkouts().filter(w => w.date >= cutoffStr);

  return {
    totalWorkouts: workouts.length,
    strengthSessions: workouts.filter(w => w.type === TRAINING_TYPES.STRENGTH).length,
    cardioSessions: workouts.filter(w => w.type === TRAINING_TYPES.CARDIO).length,
    flexibilitySessions: workouts.filter(w => w.type === TRAINING_TYPES.FLEXIBILITY).length,
    totalDuration: workouts.reduce((sum, w) => sum + (parseFloat(w.duration) || 0), 0),
    totalDistance: workouts.reduce((sum, w) => sum + (parseFloat(w.distance) || 0), 0),
  };
}

/**
 * Parse quick entry text into workout data
 */
export function parseQuickEntry(text) {
  const workout = {
    rawText: text,
    type: TRAINING_TYPES.OTHER,
    exercise: '',
    sets: null,
    reps: null,
    weight: null,
    weightUnit: 'lbs',
    distance: null,
    distanceUnit: 'miles',
    duration: null,
    pace: null,
    notes: '',
  };

  const lower = text.toLowerCase();

  // Detect workout type
  if (lower.includes('run') || lower.includes('ran') || lower.includes('jog') || lower.includes('mile')) {
    workout.type = TRAINING_TYPES.CARDIO;
    workout.exercise = 'Run';
  } else if (lower.includes('walk')) {
    workout.type = TRAINING_TYPES.CARDIO;
    workout.exercise = 'Walk';
  } else if (lower.includes('bike') || lower.includes('cycling') || lower.includes('cycle')) {
    workout.type = TRAINING_TYPES.CARDIO;
    workout.exercise = 'Cycling';
  } else if (lower.includes('swim')) {
    workout.type = TRAINING_TYPES.CARDIO;
    workout.exercise = 'Swimming';
  } else if (lower.includes('yoga') || lower.includes('stretch')) {
    workout.type = TRAINING_TYPES.FLEXIBILITY;
    workout.exercise = lower.includes('yoga') ? 'Yoga' : 'Stretching';
  } else {
    // Check for strength exercises
    for (const exercise of COMMON_EXERCISES.strength) {
      if (lower.includes(exercise.toLowerCase())) {
        workout.type = TRAINING_TYPES.STRENGTH;
        workout.exercise = exercise;
        break;
      }
    }

    // Generic strength keywords
    if (!workout.exercise && (lower.includes('lift') || lower.includes('weight') || lower.includes('strength') ||
        lower.includes('circuit') || lower.includes('pulldown') || lower.includes('curl') ||
        lower.includes('row') || lower.includes('press') || lower.includes('dumbbell') ||
        lower.includes('barbell') || lower.includes('kettlebell'))) {
      workout.type = TRAINING_TYPES.STRENGTH;

      // Try to determine specific exercise type
      if (lower.includes('back')) workout.exercise = 'Back workout';
      else if (lower.includes('chest')) workout.exercise = 'Chest workout';
      else if (lower.includes('leg')) workout.exercise = 'Leg workout';
      else if (lower.includes('arm') || lower.includes('bicep') || lower.includes('tricep')) workout.exercise = 'Arm workout';
      else if (lower.includes('shoulder')) workout.exercise = 'Shoulder workout';
      else if (lower.includes('circuit')) workout.exercise = 'Circuit training';
      else workout.exercise = 'Strength training';
    }
  }

  // Parse weight (e.g., "185 lbs", "185lbs", "185 pounds")
  const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pound|pounds|kg)/i);
  if (weightMatch) {
    workout.weight = parseFloat(weightMatch[1]);
    workout.weightUnit = weightMatch[0].toLowerCase().includes('kg') ? 'kg' : 'lbs';
  }

  // Parse sets x reps (e.g., "5x5", "3 sets of 10", "5 sets 5 reps")
  const setsRepsMatch = text.match(/(\d+)\s*[x×]\s*(\d+)/i) ||
                        text.match(/(\d+)\s*sets?\s*(?:of\s*)?(\d+)\s*reps?/i) ||
                        text.match(/(\d+)\s*sets?\s*(\d+)\s*reps?/i);
  if (setsRepsMatch) {
    workout.sets = parseInt(setsRepsMatch[1]);
    workout.reps = parseInt(setsRepsMatch[2]);
  } else {
    // Try to find just reps
    const repsMatch = text.match(/(\d+)\s*reps?/i);
    if (repsMatch) {
      workout.reps = parseInt(repsMatch[1]);
    }
    // Try to find just sets
    const setsMatch = text.match(/(\d+)\s*sets?/i);
    if (setsMatch) {
      workout.sets = parseInt(setsMatch[1]);
    }
  }

  // Parse distance (e.g., "3 miles", "5k", "2.5 mi")
  const distanceMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:mile|miles|mi)\b/i);
  if (distanceMatch) {
    workout.distance = parseFloat(distanceMatch[1]);
    workout.distanceUnit = 'miles';
  } else {
    const kmMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometer|kilometers)\b/i);
    if (kmMatch) {
      workout.distance = parseFloat(kmMatch[1]);
      workout.distanceUnit = 'km';
    } else {
      // Handle "5k" format
      const kMatch = text.match(/(\d+(?:\.\d+)?)\s*k\b/i);
      if (kMatch) {
        workout.distance = parseFloat(kMatch[1]);
        workout.distanceUnit = 'km';
      }
    }
  }

  // Parse duration (e.g., "30 minutes", "45 min", "1 hour")
  const durationMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:min|mins|minutes?)\b/i);
  if (durationMatch) {
    workout.duration = parseFloat(durationMatch[1]);
  } else {
    const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hr|hrs|hours?)\b/i);
    if (hourMatch) {
      workout.duration = parseFloat(hourMatch[1]) * 60;
    }
  }

  // Parse pace (e.g., "9:30/mi", "9:30 pace", "at 9:30")
  const paceMatch = text.match(/(\d+:\d+)\s*(?:\/mi|\/mile|pace|per mile)?/i);
  if (paceMatch) {
    workout.pace = paceMatch[1];
  }

  // If no exercise detected but has weight/sets/reps, it's likely strength
  if (!workout.exercise && (workout.weight || (workout.sets && workout.reps))) {
    workout.type = TRAINING_TYPES.STRENGTH;
  }

  // Use raw text as notes if we couldn't parse much
  if (!workout.exercise && !workout.distance && !workout.weight) {
    workout.notes = text;
  }

  return workout;
}

/**
 * Get all workouts from both workout store and activity log
 * Merges and deduplicates
 */
export function getAllWorkouts() {
  const storeWorkouts = getWorkouts();
  const activityWorkouts = getActivities()
    .filter(a => a.type === ACTIVITY_TYPES.WORKOUT)
    .map(a => ({
      id: a.id,
      timestamp: a.timestamp,
      date: a.date,
      weekOf: a.weekOf,
      exercise: a.data?.exercise || a.summary,
      type: mapWorkoutTypeToTrainingType(a.subType),
      sets: a.data?.sets,
      reps: a.data?.reps,
      weight: a.data?.weight,
      distance: a.data?.distance,
      duration: a.data?.duration,
      pace: a.data?.pace,
      notes: a.data?.notes,
      rawText: a.rawText,
      source: a.source,
      fromActivityLog: true,
    }));

  // Merge, avoiding duplicates (by workoutId link)
  const workoutIds = new Set(storeWorkouts.map(w => w.id));
  const linkedActivityIds = new Set(
    activityWorkouts
      .filter(a => a.data?.workoutId && workoutIds.has(a.data.workoutId))
      .map(a => a.id)
  );

  const uniqueActivityWorkouts = activityWorkouts.filter(a => !linkedActivityIds.has(a.id));

  // Combine and sort by timestamp descending
  const allWorkouts = [...storeWorkouts, ...uniqueActivityWorkouts];
  allWorkouts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return allWorkouts;
}

/**
 * Map workout subtype back to training type
 */
function mapWorkoutTypeToTrainingType(subType) {
  switch (subType) {
    case WORKOUT_TYPES.STRENGTH:
      return TRAINING_TYPES.STRENGTH;
    case WORKOUT_TYPES.RUN:
    case WORKOUT_TYPES.WALK:
    case WORKOUT_TYPES.CARDIO:
      return TRAINING_TYPES.CARDIO;
    case WORKOUT_TYPES.YOGA:
      return TRAINING_TYPES.FLEXIBILITY;
    default:
      return TRAINING_TYPES.OTHER;
  }
}

/**
 * Group workouts by date
 */
export function groupWorkoutsByDate(workouts) {
  const groups = {};

  for (const workout of workouts) {
    const date = workout.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(workout);
  }

  return groups;
}

/**
 * Group workouts by week
 */
export function groupWorkoutsByWeek(workouts) {
  const groups = {};

  for (const workout of workouts) {
    const weekOf = workout.weekOf || getWeekOf(new Date(workout.date));
    if (!groups[weekOf]) {
      groups[weekOf] = [];
    }
    groups[weekOf].push(workout);
  }

  return groups;
}

/**
 * Format date for display
 */
export function formatWorkoutDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Check if date is this week
 */
export function isThisWeek(dateStr) {
  const weekOf = getWeekOf(new Date());
  const dateWeekOf = getWeekOf(new Date(dateStr));
  return weekOf === dateWeekOf;
}

/**
 * Check if date is last week
 */
export function isLastWeek(dateStr) {
  const today = new Date();
  const lastWeekDate = new Date(today);
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastWeekOf = getWeekOf(lastWeekDate);
  const dateWeekOf = getWeekOf(new Date(dateStr));
  return lastWeekOf === dateWeekOf;
}
