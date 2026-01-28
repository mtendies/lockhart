/**
 * Weekly Progress Store
 * Tracks progress toward This Week's Focus items and generates Weekly Wins.
 * Connects activities to playbook goals.
 */

import { getActivitiesThisWeek, getWeekOf, ACTIVITY_TYPES, WORKOUT_TYPES } from './activityLogStore';
import { getPlaybook } from './playbookStore';
import { getRecentCheckIns } from './checkInStore';
import { getSwapWins } from './swapStore';
import { getItem, setItem, removeItem } from './storageHelper';

const PROGRESS_KEY = 'health-advisor-weekly-progress';
const WINS_KEY = 'health-advisor-weekly-wins';
const CUSTOM_TARGETS_KEY = 'health-advisor-custom-targets';

/**
 * Get custom targets (user-set overrides for focus item targets)
 */
export function getCustomTargets() {
  try {
    const saved = getItem(CUSTOM_TARGETS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

/**
 * Set a custom target for a focus item (by index)
 */
export function setCustomTarget(index, target) {
  const targets = getCustomTargets();
  targets[index] = target;
  setItem(CUSTOM_TARGETS_KEY, JSON.stringify(targets));
}

/**
 * Clear custom target for a focus item (revert to text-parsed target)
 */
export function clearCustomTarget(index) {
  const targets = getCustomTargets();
  delete targets[index];
  setItem(CUSTOM_TARGETS_KEY, JSON.stringify(targets));
}

/**
 * Clear all custom targets (e.g., when playbook changes)
 */
export function clearAllCustomTargets() {
  removeItem(CUSTOM_TARGETS_KEY);
}

/**
 * Goal matching patterns - maps keywords in focus items to activity types
 * IMPORTANT: Order matters! More specific patterns should come before generic ones.
 */
const GOAL_PATTERNS = {
  // SPECIFIC SUPPLEMENT/PRODUCT goals - must come before generic protein
  supplement: {
    keywords: ['protein powder', 'protein shake', 'shake', 'scoop', 'vega', 'whey', 'casein', 'creatine', 'supplement', 'bcaa', 'pre-workout', 'post-workout'],
    activityType: ACTIVITY_TYPES.NUTRITION,
    contentMatch: true, // Match based on activity content, not just type
    countField: 'occurrences',
  },
  run: {
    keywords: ['run ', 'runs', 'running', 'jog', 'mile'],
    activityType: ACTIVITY_TYPES.WORKOUT,
    subType: WORKOUT_TYPES.RUN,
    countField: 'occurrences',
  },
  strength: {
    keywords: ['strength', 'lift', 'lifting', 'weight training', 'weights', 'gym', 'resistance', 'squat', 'deadlift', 'bench', 'dumbbell', 'barbell', 'press', 'curl', 'row'],
    activityType: ACTIVITY_TYPES.WORKOUT,
    subType: WORKOUT_TYPES.STRENGTH,
    countField: 'occurrences',
  },
  cardio: {
    keywords: ['cardio', 'hiit', 'elliptical', 'bike', 'cycling', 'swim', 'rowing', 'jump rope'],
    activityType: ACTIVITY_TYPES.WORKOUT,
    subType: WORKOUT_TYPES.CARDIO,
    countField: 'occurrences',
  },
  workout: {
    // Generic workout - matches any workout type
    keywords: ['workout', 'work out', 'exercise', 'training session', 'session'],
    activityType: ACTIVITY_TYPES.WORKOUT,
    subType: null, // Matches any workout subtype
    countField: 'occurrences',
  },
  proteinGoal: {
    // Specific protein TARGET goals (hitting a number)
    keywords: ['g protein', 'grams protein', 'hit protein', 'protein goal', 'protein target'],
    activityType: ACTIVITY_TYPES.NUTRITION,
    dataField: 'hitProteinGoal',
    countField: 'days',
  },
  meal: {
    // General nutrition tracking
    keywords: ['meal', 'eat', 'breakfast', 'lunch', 'dinner', 'snack', 'calorie', 'food'],
    activityType: ACTIVITY_TYPES.NUTRITION,
    countField: 'occurrences',
  },
  sleep: {
    keywords: ['sleep', 'bed by', 'hours of sleep', 'bedtime', 'rest'],
    activityType: ACTIVITY_TYPES.SLEEP,
    countField: 'occurrences',
  },
  water: {
    keywords: ['water', 'hydrat', 'fluid', 'oz water', 'glasses', 'drink'],
    activityType: ACTIVITY_TYPES.HYDRATION,
    countField: 'occurrences',
  },
  walk: {
    keywords: ['walk', 'steps', '10k steps', '10,000 steps', 'walking'],
    activityType: ACTIVITY_TYPES.WORKOUT,
    subType: WORKOUT_TYPES.WALK,
    countField: 'occurrences',
  },
  yoga: {
    keywords: ['yoga', 'stretch', 'mobility', 'flexibility'],
    activityType: ACTIVITY_TYPES.WORKOUT,
    subType: WORKOUT_TYPES.YOGA,
    countField: 'occurrences',
  },
  weight: {
    keywords: ['weigh', 'scale', 'weight check', 'weigh-in', 'weigh in'],
    activityType: ACTIVITY_TYPES.WEIGHT,
    countField: 'occurrences',
  },
};

/**
 * Extract content-matching keywords from a focus item
 * Used for goals that need to match specific words in activity text
 */
function extractContentKeywords(focusText) {
  const text = focusText.toLowerCase();
  const keywords = [];

  // Extract specific product/brand names
  const productPatterns = [
    /vega/i, /whey/i, /casein/i, /creatine/i,
    /protein powder/i, /protein shake/i,
    /scoop/i, /shake/i, /supplement/i,
  ];

  for (const pattern of productPatterns) {
    const match = text.match(pattern);
    if (match) {
      keywords.push(match[0].toLowerCase());
    }
  }

  return keywords;
}

/**
 * Parse a focus item to extract the target number and type
 * e.g., "Run 3 times this week" → { type: 'run', target: 3 }
 */
export function parseFocusItem(focusText) {
  const text = focusText.toLowerCase();

  // Find matching pattern
  for (const [type, pattern] of Object.entries(GOAL_PATTERNS)) {
    if (pattern.keywords.some(kw => text.includes(kw))) {
      // Extract number from text - try multiple patterns
      let target = 1;

      // Pattern 1: "3 times", "3x", "3 sessions", "3 days", "3 workouts"
      const numberFirstMatch = text.match(/(\d+)\s*(times?|x|sessions?|days?|workouts?)?/);
      if (numberFirstMatch) {
        target = parseInt(numberFirstMatch[1], 10);
      }

      // Pattern 2: "twice" = 2, "three times" = 3, etc.
      if (text.includes('twice') || text.includes('two times')) target = 2;
      if (text.includes('three times') || text.includes('3x')) target = 3;
      if (text.includes('four times') || text.includes('4x')) target = 4;
      if (text.includes('five times') || text.includes('5x')) target = 5;
      if (text.includes('daily') || text.includes('every day') || text.includes('each day')) target = 7;

      // For content-matching goals, extract keywords to match against activity text
      const contentKeywords = pattern.contentMatch ? extractContentKeywords(focusText) : null;

      return {
        type,
        target,
        activityType: pattern.activityType,
        subType: pattern.subType,
        dataField: pattern.dataField,
        countField: pattern.countField,
        contentMatch: pattern.contentMatch || false,
        contentKeywords,
      };
    }
  }

  return null; // Not a trackable goal
}

/**
 * Check if activity text contains any of the given keywords
 */
function activityMatchesKeywords(activity, keywords) {
  if (!keywords || keywords.length === 0) return false;

  const activityText = [
    activity.rawText,
    activity.summary,
    activity.data?.notes,
    activity.data?.exercise,
  ].filter(Boolean).join(' ').toLowerCase();

  return keywords.some(kw => activityText.includes(kw.toLowerCase()));
}

/**
 * Calculate progress for a single focus item
 * @param focusItem - The focus item object with action text
 * @param index - The index of the focus item (for custom target lookup)
 */
export function calculateFocusProgress(focusItem, index = null) {
  const parsed = parseFocusItem(focusItem.action);
  if (!parsed) {
    return { trackable: false };
  }

  const activities = getActivitiesThisWeek();

  // Filter activities that match this goal
  const matching = activities.filter(a => {
    // FIRST: Activity type must match goal type (nutrition vs workout vs sleep etc)
    if (a.type !== parsed.activityType) return false;

    // SECOND: For workout goals, subType must match if specified
    if (parsed.subType && a.subType !== parsed.subType) return false;

    // THIRD: For data-field goals (like hitProteinGoal), check the data field
    if (parsed.dataField && !a.data?.[parsed.dataField]) return false;

    // FOURTH: For content-matching goals (like specific supplements),
    // activity text must contain relevant keywords
    if (parsed.contentMatch && parsed.contentKeywords?.length > 0) {
      if (!activityMatchesKeywords(a, parsed.contentKeywords)) return false;
    }

    return true;
  });

  const current = matching.length;

  // Use custom target if set, otherwise use parsed target
  const customTargets = getCustomTargets();
  const target = (index !== null && customTargets[index] !== undefined)
    ? customTargets[index]
    : parsed.target;
  const hasCustomTarget = index !== null && customTargets[index] !== undefined;

  const complete = current >= target;

  return {
    trackable: true,
    type: parsed.type,
    current,
    target,
    parsedTarget: parsed.target, // Original target from text (for reference)
    hasCustomTarget,
    complete,
    percentage: Math.min(100, Math.round((current / target) * 100)),
    contributingActivities: matching, // Include the matching activities
  };
}

/**
 * Get progress for all This Week's Focus items
 */
export function getWeeklyFocusProgress() {
  const playbook = getPlaybook();
  if (!playbook?.weeklyFocus) return [];

  return playbook.weeklyFocus.map((item, index) => ({
    ...item,
    index,
    progress: calculateFocusProgress(item, index),
  }));
}

/**
 * Generate Weekly Wins based on activities and check-ins
 */
export function generateWeeklyWins() {
  const wins = [];
  const activities = getActivitiesThisWeek();
  const checkIns = getRecentCheckIns(4);
  const playbook = getPlaybook();

  // 1. Check focus item completions
  if (playbook?.weeklyFocus) {
    for (const item of playbook.weeklyFocus) {
      const progress = calculateFocusProgress(item);
      if (progress.trackable && progress.complete) {
        wins.push({
          type: 'focus_complete',
          text: getWinText(progress.type, progress.target),
          icon: getWinIcon(progress.type),
          priority: 1,
          link: { view: 'playbook' },
        });
      }
    }
  }

  // 2. Workout consistency
  const workouts = activities.filter(a => a.type === ACTIVITY_TYPES.WORKOUT);
  if (workouts.length >= 3) {
    wins.push({
      type: 'workout_consistency',
      text: `${workouts.length} workouts this week`,
      icon: 'dumbbell',
      priority: 2,
      link: { view: 'checkin' },
    });
  }

  // 3. Running miles
  const runs = activities.filter(a => a.subType === WORKOUT_TYPES.RUN);
  const totalMiles = runs.reduce((sum, a) => sum + (a.data?.distance || 0), 0);
  if (totalMiles >= 5) {
    wins.push({
      type: 'running_miles',
      text: `Ran ${totalMiles.toFixed(1)} miles this week`,
      icon: 'run',
      priority: 2,
      link: { view: 'checkin' },
    });
  }

  // 4. Weight progress (compare to previous weeks)
  const weightEntries = activities.filter(a => a.type === ACTIVITY_TYPES.WEIGHT);
  if (weightEntries.length > 0 && checkIns.length > 1) {
    const currentWeight = weightEntries[0].data?.weight;
    const previousCheckIn = checkIns.find(c => c.weight && c.weekOf !== getWeekOf(new Date()));
    if (currentWeight && previousCheckIn?.weight) {
      const diff = previousCheckIn.weight - currentWeight;
      if (diff > 0.5) {
        wins.push({
          type: 'weight_loss',
          text: `Down ${diff.toFixed(1)} lbs`,
          icon: 'scale',
          priority: 1,
          link: { view: 'checkin' },
        });
      }
    }
  }

  // 5. Check-in streak
  if (checkIns.length >= 2) {
    // Check if consecutive weeks
    const weeks = checkIns.map(c => c.weekOf).slice(0, 4);
    let streak = 1;
    for (let i = 1; i < weeks.length; i++) {
      const prevWeek = new Date(weeks[i - 1]);
      const currWeek = new Date(weeks[i]);
      const diffDays = (prevWeek - currWeek) / (1000 * 60 * 60 * 24);
      if (diffDays >= 6 && diffDays <= 8) {
        streak++;
      } else {
        break;
      }
    }
    if (streak >= 2) {
      wins.push({
        type: 'checkin_streak',
        text: `${streak} week check-in streak`,
        icon: 'calendar',
        priority: 3,
        link: { view: 'checkin' },
      });
    }
  }

  // 6. Protein consistency
  const proteinHits = activities.filter(a =>
    a.type === ACTIVITY_TYPES.NUTRITION && a.data?.hitProteinGoal
  ).length;
  if (proteinHits >= 4) {
    wins.push({
      type: 'protein_goal',
      text: `Hit protein goal ${proteinHits} days`,
      icon: 'utensils',
      priority: 2,
      link: { view: 'checkin' },
    });
  }

  // 7. Sleep consistency
  const goodSleepNights = activities.filter(a =>
    a.type === ACTIVITY_TYPES.SLEEP &&
    (a.data?.quality === 'good' || a.data?.quality === 'great' || a.data?.hours >= 7)
  ).length;
  if (goodSleepNights >= 4) {
    wins.push({
      type: 'sleep_quality',
      text: `${goodSleepNights} nights of good sleep`,
      icon: 'moon',
      priority: 2,
      link: { view: 'checkin' },
    });
  }

  // 8. Grocery swap wins
  const swapWins = getSwapWins();
  wins.push(...swapWins);

  // Sort by priority and return top 4
  wins.sort((a, b) => a.priority - b.priority);
  return wins.slice(0, 4);
}

function getWinText(type, target) {
  switch (type) {
    case 'run': return `Ran ${target}x this week`;
    case 'strength': return `${target} strength sessions`;
    case 'cardio': return `${target} cardio sessions`;
    case 'protein': return `Hit protein goal ${target} days`;
    case 'sleep': return `Good sleep ${target} nights`;
    case 'walk': return `${target} walks completed`;
    default: return `Completed ${target}x`;
  }
}

function getWinIcon(type) {
  switch (type) {
    case 'run': return 'run';
    case 'strength': return 'dumbbell';
    case 'cardio': return 'heart';
    case 'protein': return 'utensils';
    case 'sleep': return 'moon';
    case 'walk': return 'footprints';
    default: return 'check';
  }
}

/**
 * Save/cache generated wins (optional, for performance)
 */
export function cacheWeeklyWins(wins) {
  const weekOf = getWeekOf(new Date());
  setItem(WINS_KEY, JSON.stringify({ weekOf, wins, generatedAt: new Date().toISOString() }));
}

/**
 * Get cached wins if still valid for this week
 */
export function getCachedWins() {
  try {
    const data = getItem(WINS_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    if (parsed.weekOf === getWeekOf(new Date())) {
      return parsed.wins;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Check if user is in baseline period (first 2 weeks)
 */
export function isBaselinePeriod() {
  const checkIns = getRecentCheckIns(10);
  return checkIns.length < 2;
}

/**
 * Get week number since user started
 */
export function getWeekNumber() {
  const checkIns = getRecentCheckIns(100);
  if (checkIns.length === 0) return 1;

  const firstCheckIn = checkIns[checkIns.length - 1];
  const firstDate = new Date(firstCheckIn.date || firstCheckIn.weekOf);
  const now = new Date();
  const diffWeeks = Math.floor((now - firstDate) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, diffWeeks + 1);
}
