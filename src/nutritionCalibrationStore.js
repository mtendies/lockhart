/**
 * Nutrition Calibration Store
 * Tracks the 5-day initial nutrition calibration for new users.
 * Stores meal data and generates the Daily Nutritional Profile.
 *
 * NEW: Supports flexible meal arrays with drag-and-drop reordering,
 * adding/removing meals, and user-defined default eating patterns.
 * Meal pattern is determined by the user's onboarding selections.
 */

import { getItem, setItem, removeItem } from './storageHelper';
import { getProfile } from './store';
import { logActivity, ACTIVITY_TYPES } from './activityLogStore';

const STORAGE_KEY = 'health-advisor-nutrition-calibration';
const PROFILE_KEY = 'health-advisor-nutrition-profile';
const DISMISSED_KEY = 'health-advisor-calibration-dismissed';
const MEAL_PATTERN_KEY = 'health-advisor-meal-pattern';
const TRACKING_MODE_KEY = 'health-advisor-tracking-mode';
const DAILY_JOURNAL_KEY = 'health-advisor-daily-journal';

// Tracking modes after calibration
export const TRACKING_MODES = {
  DETAILED: 'detailed',    // Continue meal-by-meal logging
  JOURNAL: 'journal',      // Simple daily journal entry
  PAUSED: 'paused',        // Not tracking
};

/**
 * Get the user's chosen tracking mode (post-calibration)
 */
export function getTrackingMode() {
  try {
    const mode = getItem(TRACKING_MODE_KEY);
    return mode ? JSON.parse(mode) : null;
  } catch {
    return null;
  }
}

/**
 * Set the tracking mode
 */
export function setTrackingMode(mode) {
  setItem(TRACKING_MODE_KEY, JSON.stringify(mode));
}

/**
 * Check if user has chosen a tracking mode
 */
export function hasChosenTrackingMode() {
  return getTrackingMode() !== null;
}

/**
 * Get daily journal entries
 */
export function getDailyJournal() {
  try {
    const data = getItem(DAILY_JOURNAL_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * Save a daily journal entry
 */
export function saveDailyJournalEntry(date, content) {
  const journal = getDailyJournal();
  journal[date] = {
    content,
    updatedAt: new Date().toISOString(),
  };
  setItem(DAILY_JOURNAL_KEY, JSON.stringify(journal));

  // Also log as activity for check-in synthesis
  if (content && content.trim()) {
    logActivity({
      type: ACTIVITY_TYPES.NUTRITION,
      rawText: content,
      summary: 'Daily nutrition journal',
      data: {
        journalEntry: true,
        date,
      },
    });
  }

  return journal;
}

/**
 * Get today's journal entry
 */
export function getTodayJournalEntry() {
  const today = new Date().toISOString().split('T')[0];
  const journal = getDailyJournal();
  return journal[today] || null;
}

// Days to track (Monday-Friday)
export const CALIBRATION_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

// Default meal types (can be customized per user in profile)
export const DEFAULT_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks', 'dessert'];

// All possible meal types for customization
export const ALL_MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: 'Coffee' },
  { id: 'morningSnack', label: 'Morning Snack', icon: 'Apple' },
  { id: 'lunch', label: 'Lunch', icon: 'Sun' },
  { id: 'afternoonSnack', label: 'Afternoon Snack', icon: 'Cookie' },
  { id: 'dinner', label: 'Dinner', icon: 'Moon' },
  { id: 'eveningSnack', label: 'Evening Snack/Dessert', icon: 'Cake' },
  { id: 'snack', label: 'Snack', icon: 'Cookie' },
  { id: 'custom', label: 'Custom', icon: 'Utensils' },
];

// Legacy meal types for backwards compatibility
export const MEAL_TYPES = DEFAULT_MEAL_TYPES;

// Meal labels for display
export const MEAL_LABELS = {
  breakfast: 'Breakfast',
  morningSnack: 'Morning Snack',
  lunch: 'Lunch',
  afternoonSnack: 'Afternoon Snack',
  dinner: 'Dinner',
  eveningSnack: 'Evening Snack/Dessert',
  snacks: 'Snacks',
  snack: 'Snack',
  dessert: 'Dessert/Other',
  custom: 'Custom',
};

// Day labels for display
export const DAY_LABELS = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

/**
 * Generate a unique ID for meals
 */
function generateMealId() {
  return `meal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get the default meal pattern - user's typical eating order
 * Checks in order:
 * 1. Saved meal pattern (from user customization)
 * 2. Profile's mealPattern from onboarding
 * 3. Default pattern
 */
export function getDefaultMealPattern() {
  // First check for a saved/customized meal pattern
  try {
    const saved = getItem(MEAL_PATTERN_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading default meal pattern:', e);
  }

  // Next, check the profile for mealPattern from onboarding
  try {
    const profile = getProfile();
    if (profile?.mealPattern && Array.isArray(profile.mealPattern) && profile.mealPattern.length > 0) {
      // Convert profile mealPattern (array of IDs) to meal objects
      return profile.mealPattern.map((mealId, idx) => ({
        id: generateMealId(),
        type: mealId,
        label: MEAL_LABELS[mealId] || mealId.charAt(0).toUpperCase() + mealId.slice(1),
        order: idx,
      }));
    }
  } catch (e) {
    console.error('Error getting profile meal pattern:', e);
  }

  // Default pattern fallback
  return [
    { id: generateMealId(), type: 'breakfast', label: 'Breakfast', order: 0 },
    { id: generateMealId(), type: 'lunch', label: 'Lunch', order: 1 },
    { id: generateMealId(), type: 'dinner', label: 'Dinner', order: 2 },
    { id: generateMealId(), type: 'snack', label: 'Snack', order: 3 },
  ];
}

/**
 * Save the default meal pattern
 */
export function saveDefaultMealPattern(pattern) {
  // Ensure orders are sequential
  const orderedPattern = pattern.map((meal, idx) => ({ ...meal, order: idx }));
  setItem(MEAL_PATTERN_KEY, JSON.stringify(orderedPattern));
  return orderedPattern;
}

/**
 * Check if user has set up their default meal pattern
 */
export function hasSetupMealPattern() {
  try {
    return getItem(MEAL_PATTERN_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Create a new meal object
 */
export function createMeal(type, label = null, order = 0) {
  return {
    id: generateMealId(),
    type,
    label: label || MEAL_LABELS[type] || type,
    content: '',
    order,
  };
}

/**
 * Create day's meals from default pattern
 */
function createDayMealsFromPattern() {
  const pattern = getDefaultMealPattern();
  return pattern.map((meal, idx) => ({
    id: generateMealId(),
    type: meal.type,
    label: meal.label,
    content: '',
    order: idx,
  }));
}

/**
 * Create empty day structure with flexible meals array
 */
function createEmptyDayWithMeals() {
  return {
    meals: createDayMealsFromPattern(),
    completed: false,
    completedAt: null,
    // Legacy fields for backwards compatibility
    breakfast: '',
    morningSnack: '',
    lunch: '',
    afternoonSnack: '',
    dinner: '',
    eveningSnack: '',
    snacks: '',
    dessert: '',
  };
}

/**
 * Migrate old day data to new meals array format
 */
function migrateDayToMeals(dayData) {
  if (dayData.meals && Array.isArray(dayData.meals)) {
    return dayData; // Already migrated
  }

  // Convert old field-based data to meals array
  const meals = [];
  const legacyFields = ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner', 'eveningSnack', 'snacks', 'dessert'];

  let order = 0;
  for (const field of legacyFields) {
    if (dayData[field] && dayData[field].trim()) {
      meals.push({
        id: generateMealId(),
        type: field,
        label: MEAL_LABELS[field] || field,
        content: dayData[field],
        order: order++,
      });
    }
  }

  // If no meals were filled, create from default pattern
  if (meals.length === 0) {
    return {
      ...dayData,
      meals: createDayMealsFromPattern(),
    };
  }

  return {
    ...dayData,
    meals,
  };
}

/**
 * Get today's day of week as a calibration day key
 */
export function getTodayDayKey() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = new Date().getDay();
  return days[today];
}

/**
 * Check if a specific day is today (calendar-based)
 */
export function isDayToday(day) {
  return getTodayDayKey() === day;
}

/**
 * Check if a day is in the past (already happened this week)
 */
export function isDayInPast(day) {
  const dayOrder = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  const today = new Date().getDay();
  const dayIndex = dayOrder[day];
  return dayIndex < today;
}

/**
 * Check if a day is in the future (hasn't happened yet this week)
 */
export function isDayInFuture(day) {
  const dayOrder = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  const today = new Date().getDay();
  const dayIndex = dayOrder[day];
  return dayIndex > today;
}

/**
 * Get the user's selected meal types from profile, or defaults
 * (Legacy function - returns array of type strings)
 */
export function getUserMealTypes(profile) {
  if (profile?.mealPattern && Array.isArray(profile.mealPattern) && profile.mealPattern.length > 0) {
    return profile.mealPattern;
  }
  return DEFAULT_MEAL_TYPES;
}

/**
 * Get the current calibration data
 */
export function getCalibrationData() {
  try {
    const saved = getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      // Migrate all days to new meals array format
      for (const day of CALIBRATION_DAYS) {
        if (data.days[day]) {
          data.days[day] = migrateDayToMeals(data.days[day]);
        }
      }
      return data;
    }
  } catch (e) {
    console.error('Error loading calibration data:', e);
  }

  // Initialize empty calibration structure
  return {
    startedAt: null,
    completedAt: null,
    currentDay: 'monday',
    days: {
      monday: createEmptyDayWithMeals(),
      tuesday: createEmptyDayWithMeals(),
      wednesday: createEmptyDayWithMeals(),
      thursday: createEmptyDayWithMeals(),
      friday: createEmptyDayWithMeals(),
    },
  };
}

/**
 * Save calibration data
 */
export function saveCalibrationData(data) {
  setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Start calibration (called when user first sees it)
 */
export function startCalibration() {
  const data = getCalibrationData();
  if (!data.startedAt) {
    data.startedAt = new Date().toISOString();
    saveCalibrationData(data);
  }
  return data;
}

/**
 * Update a meal entry for a specific day (legacy field-based)
 */
export function updateMealEntry(day, mealType, value) {
  const data = getCalibrationData();
  if (data.days[day]) {
    // Update legacy field
    data.days[day][mealType] = value;

    // Also update in meals array if present
    if (data.days[day].meals) {
      const meal = data.days[day].meals.find(m => m.type === mealType);
      if (meal) {
        meal.content = value;
      }
    }

    saveCalibrationData(data);
  }
  return data;
}

/**
 * Update a specific meal by ID in the meals array
 * Also logs the entry as a nutrition activity for Focus Goal tracking
 */
export function updateMealById(day, mealId, updates) {
  const data = getCalibrationData();
  if (data.days[day]?.meals) {
    const mealIndex = data.days[day].meals.findIndex(m => m.id === mealId);
    if (mealIndex !== -1) {
      const previousContent = data.days[day].meals[mealIndex].content;

      data.days[day].meals[mealIndex] = {
        ...data.days[day].meals[mealIndex],
        ...updates,
      };

      // Sync to legacy field if updating content
      if (updates.content !== undefined) {
        const mealType = data.days[day].meals[mealIndex].type;
        if (data.days[day][mealType] !== undefined) {
          data.days[day][mealType] = updates.content;
        }

        // Log as nutrition activity for Focus Goal tracking (only if new content)
        if (updates.content && updates.content.trim() && updates.content !== previousContent) {
          const mealLabel = data.days[day].meals[mealIndex].label || mealType;
          logNutritionActivity(mealLabel, updates.content, day);
        }
      }

      saveCalibrationData(data);
    }
  }
  return data;
}

/**
 * Log a nutrition entry as an activity for Focus Goal tracking
 */
function logNutritionActivity(mealLabel, content, day) {
  const contentLower = content.toLowerCase();

  // Create activity for tracking
  const activity = {
    type: ACTIVITY_TYPES.NUTRITION,
    rawText: `${mealLabel}: ${content}`,
    summary: `Logged ${mealLabel.toLowerCase()}`,
    data: {
      meal: mealLabel,
      content: content,
      day: day,
    },
  };

  // Check for specific items that might match Focus Goals
  // Keywords that might indicate protein supplement usage
  const proteinKeywords = ['protein', 'vega', 'whey', 'shake', 'scoop', 'powder'];
  if (proteinKeywords.some(kw => contentLower.includes(kw))) {
    activity.data.hasProteinSupplement = true;
  }

  logActivity(activity);
}

/**
 * Reorder meals for a specific day
 */
export function reorderDayMeals(day, newMealsOrder) {
  const data = getCalibrationData();
  if (data.days[day]) {
    // Update orders
    data.days[day].meals = newMealsOrder.map((meal, idx) => ({
      ...meal,
      order: idx,
    }));
    saveCalibrationData(data);
  }
  return data;
}

/**
 * Add a new meal to a specific day
 */
export function addMealToDay(day, type, label = null) {
  const data = getCalibrationData();
  if (data.days[day]) {
    const meals = data.days[day].meals || [];

    // Count existing meals of this type for auto-numbering
    const sameTypeMeals = meals.filter(m => m.type === type);
    let mealLabel = label;

    if (!mealLabel) {
      if (sameTypeMeals.length > 0) {
        // Add number suffix: "Snack 2", "Snack 3", etc.
        mealLabel = `${MEAL_LABELS[type] || type} ${sameTypeMeals.length + 1}`;
        // Also rename the first one to include "1" if it doesn't have a number
        const firstMeal = sameTypeMeals[0];
        if (firstMeal && !firstMeal.label.match(/\d+$/)) {
          firstMeal.label = `${firstMeal.label} 1`;
        }
      } else {
        mealLabel = MEAL_LABELS[type] || type;
      }
    }

    const newMeal = createMeal(type, mealLabel, meals.length);
    data.days[day].meals = [...meals, newMeal];
    saveCalibrationData(data);
  }
  return data;
}

/**
 * Remove a meal from a specific day
 */
export function removeMealFromDay(day, mealId) {
  const data = getCalibrationData();
  if (data.days[day]?.meals) {
    data.days[day].meals = data.days[day].meals
      .filter(m => m.id !== mealId)
      .map((meal, idx) => ({ ...meal, order: idx })); // Reorder
    saveCalibrationData(data);
  }
  return data;
}

/**
 * Reset a day's meals to the default pattern
 */
export function resetDayToDefault(day) {
  const data = getCalibrationData();
  if (data.days[day]) {
    data.days[day].meals = createDayMealsFromPattern();
    // Clear legacy fields
    data.days[day].breakfast = '';
    data.days[day].morningSnack = '';
    data.days[day].lunch = '';
    data.days[day].afternoonSnack = '';
    data.days[day].dinner = '';
    data.days[day].eveningSnack = '';
    data.days[day].snacks = '';
    data.days[day].dessert = '';
    saveCalibrationData(data);
  }
  return data;
}

/**
 * Mark a day as complete
 * NOTE: Does NOT auto-advance to next day - that's determined by calendar date
 */
export function completeDay(day) {
  const data = getCalibrationData();
  if (data.days[day]) {
    data.days[day].completed = true;
    data.days[day].completedAt = new Date().toISOString();

    // Update currentDay to today's day if it's a valid calibration day
    const today = getTodayDayKey();
    if (CALIBRATION_DAYS.includes(today)) {
      data.currentDay = today;
    }

    // Check if all days are complete
    const allComplete = CALIBRATION_DAYS.every(d => data.days[d].completed);
    if (allComplete && !data.completedAt) {
      data.completedAt = new Date().toISOString();
      // Generate the nutrition profile
      generateNutritionProfile(data);
    }

    saveCalibrationData(data);
  }
  return data;
}

/**
 * Get which day should be shown/active based on calendar date
 */
export function getCurrentCalendarDay() {
  const today = getTodayDayKey();
  // Only return a calibration day if today is Mon-Fri
  if (CALIBRATION_DAYS.includes(today)) {
    return today;
  }
  // On weekend, return null (no entry possible)
  return null;
}

/**
 * Get next available day for entry after today
 */
export function getNextAvailableDay() {
  const today = getTodayDayKey();
  const dayOrder = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
  const todayOrder = dayOrder[today] || 0;

  for (const day of CALIBRATION_DAYS) {
    if (dayOrder[day] > todayOrder) {
      return day;
    }
  }
  return null;
}

/**
 * Check if a day has enough data to be marked complete
 * With new flexible meals: require at least 2 meals with content
 */
export function canCompleteDay(day, profile = null) {
  const data = getCalibrationData();
  const dayData = data.days[day];
  if (!dayData) return false;

  // New meals array system
  if (dayData.meals && Array.isArray(dayData.meals)) {
    const filledMeals = dayData.meals.filter(m => m.content && m.content.trim() !== '');
    return filledMeals.length >= 2;
  }

  // Legacy system fallback
  const userMeals = getUserMealTypes(profile);
  const mainMeals = ['breakfast', 'lunch', 'dinner'];
  const requiredMeals = userMeals.filter(m => mainMeals.includes(m));

  if (requiredMeals.length === 0) {
    const filledCount = userMeals.filter(m => (dayData[m] || '').trim() !== '').length;
    return filledCount >= Math.min(2, userMeals.length);
  }

  return requiredMeals.every(meal => (dayData[meal] || '').trim() !== '');
}

/**
 * Get the number of completed days
 */
export function getCompletedDaysCount() {
  const data = getCalibrationData();
  return CALIBRATION_DAYS.filter(day => data.days[day].completed).length;
}

/**
 * Get remaining days count
 */
export function getRemainingDaysCount() {
  return 5 - getCompletedDaysCount();
}

/**
 * Check if calibration is complete
 */
export function isCalibrationComplete() {
  const data = getCalibrationData();
  return data.completedAt !== null;
}

/**
 * Check if calibration has started
 */
export function hasCalibrationStarted() {
  const data = getCalibrationData();
  return data.startedAt !== null;
}

/**
 * Check if user is in their first week (calibration period)
 */
export function isInCalibrationPeriod() {
  const data = getCalibrationData();

  // If dismissed, not in calibration period
  if (isCalibrationDismissed()) return false;

  // If already completed, not in calibration period
  if (data.completedAt) return false;

  // If not started, they're in calibration period (will start soon)
  if (!data.startedAt) return true;

  // Check if it's been more than 7 days since start
  const startDate = new Date(data.startedAt);
  const now = new Date();
  const daysSinceStart = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));

  return daysSinceStart < 7;
}

/**
 * Check if nutrition calibration was dismissed by user
 */
export function isCalibrationDismissed() {
  try {
    return getItem(DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Dismiss nutrition calibration (for Level 1 users who want to skip)
 */
export function dismissCalibration() {
  setItem(DISMISSED_KEY, 'true');
}

/**
 * Opt back into nutrition calibration (undo dismiss)
 */
export function optIntoCalibration() {
  removeItem(DISMISSED_KEY);
}

/**
 * Check if this is the first time showing calibration (for prompt)
 */
export function isFirstCalibrationView() {
  const data = getCalibrationData();
  return !data.startedAt && !isCalibrationDismissed();
}

/**
 * Get the Daily Nutritional Profile
 */
export function getNutritionProfile() {
  try {
    const saved = getItem(PROFILE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

/**
 * Save the nutrition profile
 */
export function saveNutritionProfile(profile) {
  setItem(PROFILE_KEY, JSON.stringify(profile));
}

/**
 * Generate the nutrition profile from calibration data
 * This creates estimated nutritional insights based on the logged meals
 */
export function generateNutritionProfile(calibrationData) {
  const profile = {
    generatedAt: new Date().toISOString(),
    calibrationData: calibrationData.days,

    // These will be populated by AI analysis, but we set defaults
    overview: {
      estimatedDailyCalories: null,
      proteinEstimate: null,
      carbEstimate: null,
      fatEstimate: null,
      mealTimingPattern: 'standard', // standard, late-eater, early-eater
    },

    mealPatterns: {
      breakfast: { typical: [], avgProtein: null, suggestions: [] },
      lunch: { typical: [], avgProtein: null, suggestions: [] },
      dinner: { typical: [], avgProtein: null, suggestions: [] },
      snacks: { typical: [], avgProtein: null, suggestions: [] },
    },

    strengths: [],
    gaps: [],
    recommendations: [],

    // Flag that profile needs AI analysis
    needsAnalysis: true,
  };

  // Extract typical foods from each meal across all days
  for (const day of CALIBRATION_DAYS) {
    const dayData = calibrationData.days[day];
    if (dayData.completed) {
      // New meals array system
      if (dayData.meals && Array.isArray(dayData.meals)) {
        for (const meal of dayData.meals) {
          if (meal.content && meal.content.trim()) {
            const mealCategory = meal.type.includes('snack') || meal.type === 'snacks'
              ? 'snacks'
              : meal.type;
            if (profile.mealPatterns[mealCategory]) {
              profile.mealPatterns[mealCategory].typical.push(meal.content);
            }
          }
        }
      } else {
        // Legacy system
        if (dayData.breakfast) profile.mealPatterns.breakfast.typical.push(dayData.breakfast);
        if (dayData.lunch) profile.mealPatterns.lunch.typical.push(dayData.lunch);
        if (dayData.dinner) profile.mealPatterns.dinner.typical.push(dayData.dinner);
        if (dayData.snacks) profile.mealPatterns.snacks.typical.push(dayData.snacks);
      }
    }
  }

  saveNutritionProfile(profile);
  return profile;
}

/**
 * Update nutrition profile with AI analysis results
 */
export function updateNutritionProfileWithAnalysis(analysis) {
  const profile = getNutritionProfile();
  if (!profile) return null;

  // Merge analysis into profile
  if (analysis.overview) {
    profile.overview = { ...profile.overview, ...analysis.overview };
  }
  if (analysis.mealPatterns) {
    for (const meal of Object.keys(analysis.mealPatterns)) {
      if (profile.mealPatterns[meal]) {
        profile.mealPatterns[meal] = { ...profile.mealPatterns[meal], ...analysis.mealPatterns[meal] };
      }
    }
  }
  if (analysis.strengths) profile.strengths = analysis.strengths;
  if (analysis.gaps) profile.gaps = analysis.gaps;
  if (analysis.recommendations) profile.recommendations = analysis.recommendations;

  profile.needsAnalysis = false;
  profile.analyzedAt = new Date().toISOString();

  saveNutritionProfile(profile);
  return profile;
}

/**
 * Log a meal from chat/advisor (auto-fills the appropriate day/meal)
 */
export function logMealFromChat(mealType, description) {
  const data = getCalibrationData();

  // Only log if in calibration period and not complete
  if (!isInCalibrationPeriod() || isCalibrationComplete()) {
    return null;
  }

  // Log to current day
  const currentDay = data.currentDay;
  if (data.days[currentDay] && !data.days[currentDay].completed) {
    // Update legacy field
    data.days[currentDay][mealType] = description;

    // Also update in meals array
    if (data.days[currentDay].meals) {
      const meal = data.days[currentDay].meals.find(m => m.type === mealType);
      if (meal) {
        meal.content = description;
      } else {
        // Add new meal of this type
        const newMeal = createMeal(mealType, null, data.days[currentDay].meals.length);
        newMeal.content = description;
        data.days[currentDay].meals.push(newMeal);
      }
    }

    saveCalibrationData(data);
    return { day: currentDay, mealType, description };
  }

  return null;
}

/**
 * Get a summary of calibration progress for display
 */
export function getCalibrationProgress() {
  const data = getCalibrationData();
  const completed = getCompletedDaysCount();
  const remaining = getRemainingDaysCount();
  const isComplete = isCalibrationComplete();
  const inPeriod = isInCalibrationPeriod();
  const todayDay = getCurrentCalendarDay();
  const nextDay = getNextAvailableDay();

  return {
    completed,
    remaining,
    total: 5,
    percentage: Math.round((completed / 5) * 100),
    isComplete,
    inPeriod,
    currentDay: data.currentDay,
    todayDay, // The actual calendar day (null on weekends)
    nextDay, // Next available day after today
    days: data.days,
    startedAt: data.startedAt,
    completedAt: data.completedAt,
  };
}

/**
 * Reset calibration (for testing)
 */
export function resetCalibration() {
  removeItem(STORAGE_KEY);
  removeItem(PROFILE_KEY);
  removeItem(MEAL_PATTERN_KEY);
}
