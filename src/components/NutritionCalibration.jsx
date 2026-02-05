import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Utensils,
  ChevronDown,
  ChevronUp,
  Check,
  Lock,
  Sparkles,
  Coffee,
  Sun,
  Moon,
  Cookie,
  Cake,
  Apple,
  PartyPopper,
  Calendar,
  CheckCircle2,
  Pencil,
  GripVertical,
  Plus,
  X,
  Trash2,
  Bot,
  Flame,
  HelpCircle,
  Info,
  Target,
  Salad,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { estimateCalories, needsClarification, SOURCE_URLS } from '../calorieEstimator';
import { estimateCaloriesAI, getCachedOrRuleBased } from '../aiCalorieEstimator';
import { getPendingAdditionFor, approveAddition, removeAddition } from '../advisorAdditionsStore';
import { getProfile } from '../store';

/**
 * Calculate daily calorie budget using Mifflin-St Jeor equation
 */
function calculateDailyCalorieBudget(profile) {
  if (!profile) return 2000; // Default fallback

  // Extract and convert profile data
  const age = parseInt(profile.age) || 30;
  const sex = profile.sex?.toLowerCase() || 'male';

  // Convert weight to kg
  let weightKg = parseFloat(profile.weight) || 70;
  if (profile.weightUnit === 'lbs') {
    weightKg = weightKg * 0.453592;
  }

  // Convert height to cm
  let heightCm = parseFloat(profile.height) || 170;
  if (profile.heightUnit === 'in') {
    heightCm = heightCm * 2.54;
  } else if (profile.heightUnit === 'ft') {
    heightCm = heightCm * 30.48;
  }

  // Mifflin-St Jeor equation for BMR
  let bmr;
  if (sex === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  // Activity multiplier
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    lightly_active: 1.375,
    moderate: 1.55,
    moderately_active: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const activityLevel = profile.activityLevel?.toLowerCase().replace(/\s+/g, '_') || 'moderate';
  const multiplier = activityMultipliers[activityLevel] || 1.55;

  const tdee = bmr * multiplier;

  // Check for weight-related goals (check all possible key variations)
  const goals = profile.goals || [];
  const hasLoseFat = goals.includes('fat_loss') || goals.includes('lose_fat') || goals.includes('loseFat') || goals.includes('weightLoss') || goals.includes('weight_loss');
  const hasBuildMuscle = goals.includes('build_muscle') || goals.includes('buildMuscle') || goals.includes('muscle_gain') || goals.includes('muscleGain');

  // Fat loss takes priority over muscle gain for calorie calculation
  if (hasLoseFat) {
    return Math.round(tdee - 500); // 500 cal deficit for weight loss
  } else if (hasBuildMuscle) {
    return Math.round(tdee + 300); // 300 cal surplus for muscle building
  }

  return Math.round(tdee); // Maintenance
}

/**
 * Get today's total calories from meals
 */
function getTodaysCaloriesFromMeals(dayData) {
  if (!dayData?.meals || !Array.isArray(dayData.meals)) return 0;

  return dayData.meals.reduce((total, meal) => {
    if (meal.content && meal.content.trim()) {
      // Use user-adjusted override if available, otherwise re-parse
      if (typeof meal.calorieOverride === 'number') {
        return total + meal.calorieOverride;
      }
      const estimate = getCachedOrRuleBased(meal.content);
      return total + estimate.totalCalories;
    }
    return total;
  }, 0);
}

/**
 * Get calorie status based on remaining calories
 */
function getCalorieStatus(remaining, budget) {
  const percentUsed = ((budget - remaining) / budget) * 100;

  if (remaining < 0) return 'over';
  if (percentUsed >= 80) return 'approaching';
  return 'on_track';
}

/**
 * Smart Suggestions Popup Component
 */
function SmartSuggestionsPopup({ remainingCalories, profile, onClose }) {
  // Determine user's dietary preferences
  const restrictions = profile?.restrictions?.toLowerCase() || '';
  const isVegetarian = restrictions.includes('vegetarian') || restrictions.includes('vegan');
  const isDairyFree = restrictions.includes('dairy') || restrictions.includes('lactose');

  // Filter meal suggestions based on preferences
  const filterSuggestions = (items) => {
    return items.filter(item => {
      if (isVegetarian && item.hasMeat) return false;
      if (isDairyFree && item.hasDairy) return false;
      return true;
    });
  };

  // Meal suggestions (500-600 cal)
  const dinnerSuggestions = filterSuggestions([
    { text: 'Grilled chicken breast with roasted vegetables', cal: '~500 cal', hasMeat: true },
    { text: 'Salmon with quinoa and steamed broccoli', cal: '~550 cal', hasMeat: true },
    { text: 'Turkey stir-fry with brown rice', cal: '~480 cal', hasMeat: true },
    { text: 'Tofu and vegetable curry with rice', cal: '~520 cal' },
    { text: 'Pasta primavera with olive oil', cal: '~550 cal' },
    { text: 'Bean and vegetable burrito bowl', cal: '~500 cal' },
  ]);

  // Snack suggestions (150-250 cal)
  const snackSuggestions = filterSuggestions([
    { text: 'Greek yogurt with berries', cal: '~150 cal', hasDairy: true },
    { text: 'Apple with 2 tbsp almond butter', cal: '~250 cal' },
    { text: 'Handful of almonds (~23 nuts)', cal: '~165 cal' },
    { text: 'Protein shake', cal: '~120 cal' },
    { text: 'Cottage cheese with fruit', cal: '~180 cal', hasDairy: true },
    { text: 'Hummus with veggie sticks', cal: '~150 cal' },
  ]);

  // Light snacks (under 100 cal)
  const lightSnackSuggestions = filterSuggestions([
    { text: 'Small apple', cal: '~80 cal' },
    { text: 'Cup of berries', cal: '~85 cal' },
    { text: 'String cheese', cal: '~80 cal', hasDairy: true },
    { text: 'Hard boiled egg', cal: '~78 cal' },
    { text: 'Small handful of almonds (10-12)', cal: '~80 cal' },
    { text: 'Celery with 1 tbsp peanut butter', cal: '~100 cal' },
  ]);

  // Determine which suggestions to show
  let content;
  let title;
  let icon;
  let tipText;

  if (remainingCalories > 500) {
    title = `You have ~${remainingCalories.toLocaleString()} calories remaining today`;
    icon = <Salad size={20} className="text-green-500" />;
    tipText = "You could have a solid dinner AND a snack and still stay under your target!";
    content = (
      <>
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Dinner ideas (~500-600 cal):</p>
          <ul className="space-y-1.5">
            {dinnerSuggestions.slice(0, 3).map((item, i) => (
              <li key={i} className="text-sm text-gray-600 flex justify-between">
                <span>• {item.text}</span>
                <span className="text-gray-400 ml-2">{item.cal}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Snack ideas (~150-250 cal):</p>
          <ul className="space-y-1.5">
            {snackSuggestions.slice(0, 4).map((item, i) => (
              <li key={i} className="text-sm text-gray-600 flex justify-between">
                <span>• {item.text}</span>
                <span className="text-gray-400 ml-2">{item.cal}</span>
              </li>
            ))}
          </ul>
        </div>
      </>
    );
  } else if (remainingCalories > 200) {
    title = `You have ~${remainingCalories.toLocaleString()} calories remaining today`;
    icon = <Target size={20} className="text-blue-500" />;
    tipText = "A satisfying snack would fit perfectly!";
    content = (
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Snack ideas that fit your budget:</p>
        <ul className="space-y-1.5">
          {snackSuggestions.map((item, i) => (
            <li key={i} className="text-sm text-gray-600 flex justify-between">
              <span>• {item.text}</span>
              <span className="text-gray-400 ml-2">{item.cal}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  } else if (remainingCalories > 0) {
    title = "You're almost at your target for today!";
    icon = <CheckCircle2 size={20} className="text-green-500" />;
    tipText = "Going slightly over occasionally is totally fine! Consistency over perfection.";
    content = (
      <div>
        <p className="text-sm text-gray-600 mb-3">
          You have ~{remainingCalories} calories remaining.
        </p>
        <p className="text-sm font-medium text-gray-700 mb-2">If you're still hungry, consider:</p>
        <ul className="space-y-1.5">
          {lightSnackSuggestions.slice(0, 4).map((item, i) => (
            <li key={i} className="text-sm text-gray-600 flex justify-between">
              <span>• {item.text}</span>
              <span className="text-gray-400 ml-2">{item.cal}</span>
            </li>
          ))}
          <li className="text-sm text-gray-600">• Raw veggies (cucumber, celery, peppers)</li>
          <li className="text-sm text-gray-600">• Herbal tea</li>
        </ul>
      </div>
    );
  } else {
    const overAmount = Math.abs(remainingCalories);
    title = `You're ~${overAmount.toLocaleString()} calories over your target today`;
    icon = <TrendingUp size={20} className="text-amber-500" />;
    tipText = "Remember: It's about the weekly average, not perfection every single day.";
    content = (
      <div>
        <p className="text-sm text-gray-600 mb-4">
          No worries! One day doesn't define your progress.
        </p>
        <p className="text-sm font-medium text-gray-700 mb-2">Options:</p>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• <strong>Call it a day</strong> - tomorrow is a fresh start</li>
          <li>• <strong>Add some extra activity</strong> - a 30-min walk burns ~150 cal</li>
          <li>• <strong>Slightly reduce tomorrow's intake</strong> to balance out</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[85vh] overflow-hidden animate-slide-up sm:animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 sm:px-5 sm:py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                {icon}
              </div>
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Smart Suggestions</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg -mr-1">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-140px)] px-4 py-4 sm:px-5">
          <p className="font-medium text-gray-900 mb-4">{title}</p>

          {content}

          {/* Tip */}
          <div className="mt-4 p-3 bg-amber-50 rounded-xl">
            <div className="flex gap-2">
              <Lightbulb size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{tipText}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 sm:px-5">
          <p className="text-xs text-gray-400 text-center">
            These are estimates. Actual calories may vary.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Calorie Progress Section Component - Shows at top of nutrition profile
 */
function CalorieProgressSection({ dayData, profile, todayDay }) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const consumedCalories = getTodaysCaloriesFromMeals(dayData);
  const targetCalories = calculateDailyCalorieBudget(profile);
  const remainingCalories = targetCalories - consumedCalories;
  const percentUsed = Math.min(100, Math.round((consumedCalories / targetCalories) * 100));
  const status = getCalorieStatus(remainingCalories, targetCalories);

  // Progress bar color based on status
  const getProgressColor = () => {
    if (status === 'over') return 'bg-red-500';
    if (status === 'approaching') return 'bg-amber-500';
    return 'bg-green-500';
  };

  // Text color based on status
  const getRemainingColor = () => {
    if (status === 'over') return 'text-red-600';
    if (status === 'approaching') return 'text-amber-600';
    return 'text-green-600';
  };

  if (!todayDay) return null; // Don't show on weekends

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Today's Calories</h3>
      </div>

      {/* Calories display */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900">{consumedCalories.toLocaleString()}</span>
          <span className="text-gray-400">/</span>
          <span className="text-lg text-gray-500">{targetCalories.toLocaleString()} cal</span>
        </div>

        <button
          onClick={() => setShowSuggestions(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium transition-colors ${getRemainingColor()} hover:bg-gray-50`}
        >
          {remainingCalories >= 0 ? (
            <>{remainingCalories.toLocaleString()} cal remaining</>
          ) : (
            <>{Math.abs(remainingCalories).toLocaleString()} cal over</>
          )}
          <Info size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${getProgressColor()} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>

      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-gray-400">{percentUsed}% of daily target</span>
        {status === 'on_track' && consumedCalories > 0 && (
          <span className="text-xs text-green-600">On track</span>
        )}
        {status === 'approaching' && (
          <span className="text-xs text-amber-600">Approaching target</span>
        )}
        {status === 'over' && (
          <span className="text-xs text-red-600">Over target</span>
        )}
      </div>

      {/* Smart Suggestions Popup */}
      {showSuggestions && (
        <SmartSuggestionsPopup
          remainingCalories={remainingCalories}
          profile={profile}
          onClose={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
}

/**
 * Completed Days Dropdown Component - Shows at bottom
 */
function CompletedDaysDropdown({ progress, calibrationData, onEditDay }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Encouraging messages based on progress
  const getEncouragingMessage = () => {
    const { completed, remaining } = progress;

    if (remaining === 0) {
      return { text: "Nutrition Profile Unlocked! View your personalized insights.", icon: "🎉" };
    }

    const messages = {
      0: { text: "Great start! 5 days until your nutrition insights unlock.", icon: "🚀" },
      1: { text: "Great start! 4 more days to unlock your nutrition insights.", icon: "🌱" },
      2: { text: "You're building momentum! 3 more days to go.", icon: "💪" },
      3: { text: "Halfway there! Keep logging to unlock personalized insights.", icon: "⭐" },
      4: { text: "Almost there! Just 1 more day.", icon: "🔥" },
      5: { text: "Final day! Complete today to unlock your nutrition profile.", icon: "🏆" },
    };

    return messages[completed] || messages[0];
  };

  const encouragement = getEncouragingMessage();

  // Get day status icon
  const getDayStatus = (day) => {
    const dayData = calibrationData.days[day];
    const isToday = isDayToday(day);

    if (dayData?.completed) return { icon: '✓', color: 'text-green-600 bg-green-100' };
    if (isToday) return { icon: '●', color: 'text-blue-600 bg-blue-100' };
    if (isDayInPast(day)) {
      const hasMeals = dayData?.meals?.some(m => m.content?.trim());
      if (hasMeals && !canCompleteDay(day)) return { icon: '!', color: 'text-orange-600 bg-orange-100' }; // incomplete — not enough meals
      if (hasMeals) return { icon: '✓', color: 'text-green-600 bg-green-100' }; // filled enough to be complete
      return { icon: '○', color: 'text-gray-400 bg-gray-100' }; // no data
    }
    return { icon: '○', color: 'text-gray-400 bg-gray-100' };
  };

  // Get total calories for a day
  const getDayCalories = (day) => {
    const dayData = calibrationData.days[day];
    return getTodaysCaloriesFromMeals(dayData);
  };

  return (
    <div className="mt-4 pt-3 border-t border-amber-200">
      {/* Collapsed/Expandable Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-amber-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{encouragement.icon}</span>
          <span className="text-sm font-medium text-amber-800">
            Day {progress.calendarDay || Math.min(progress.completed + 1, 5)} of 5
            {progress.completed > 0 && progress.remaining > 0 && " - Keep it up!"}
            {progress.completed === 5 && " - All done!"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-amber-600">
          <span className="text-xs">View completed days</span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 bg-white rounded-xl border border-amber-100 overflow-hidden">
          {CALIBRATION_DAYS.map((day) => {
            const dayData = calibrationData.days[day];
            const status = getDayStatus(day);
            const isToday = isDayToday(day);
            const calories = getDayCalories(day);

            return (
              <div
                key={day}
                className={`flex items-center justify-between px-3 py-2.5 border-b border-gray-100 last:border-b-0 ${
                  isToday ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${status.color}`}>
                    {status.icon}
                  </span>
                  <div>
                    <span className="text-sm font-medium text-gray-800">
                      {DAY_LABELS[day]}
                      {isToday && <span className="text-blue-600 ml-1">(Today)</span>}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {dayData?.completed ? (
                        `Complete${calories > 0 ? ` (${calories.toLocaleString()} cal)` : ''}`
                      ) : isToday ? (
                        `In Progress${calories > 0 ? ` (${calories.toLocaleString()} cal)` : ''}`
                      ) : isDayInPast(day) && dayData?.meals?.some(m => m.content?.trim()) && !canCompleteDay(day) ? (
                        'Incomplete — needs at least 2 meals'
                      ) : isDayInPast(day) && dayData?.meals?.some(m => m.content?.trim()) ? (
                        `Complete${calories > 0 ? ` (${calories.toLocaleString()} cal)` : ''}`
                      ) : isDayInPast(day) ? (
                        'Missed'
                      ) : (
                        'Not started'
                      )}
                    </span>
                  </div>
                </div>

                {dayData?.completed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditDay(day);
                    }}
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium px-2 py-1 hover:bg-amber-50 rounded"
                  >
                    Edit
                  </button>
                )}
              </div>
            );
          })}

          {/* Encouragement message */}
          <div className="px-3 py-2.5 bg-amber-50 text-center">
            <p className="text-xs text-amber-700">
              {progress.remaining > 0
                ? `${progress.remaining} more day${progress.remaining > 1 ? 's' : ''} until your personalized insights unlock!`
                : 'Your personalized insights are ready!'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
import {
  getCalibrationData,
  startCalibration,
  alignCalibrationToCurrentWeek,
  updateMealById,
  completeDay,
  canCompleteDay,
  getCalibrationProgress,
  CALIBRATION_DAYS,
  MEAL_LABELS,
  DAY_LABELS,
  ALL_MEAL_TYPES,
  isDayToday,
  isDayInPast,
  isDayInFuture,
  isFirstCalibrationView,
  dismissCalibration,
  isCalibrationDismissed,
  reorderDayMeals,
  addMealToDay,
  removeMealFromDay,
  getDefaultMealPattern,
  saveDefaultMealPattern,
  hasSetupMealPattern,
  createMeal,
  isCalibrationComplete,
  hasChosenTrackingMode,
  setTrackingMode,
  getTrackingMode,
  TRACKING_MODES,
  saveDailyJournalEntry,
  getTodayJournalEntry,
} from '../nutritionCalibrationStore';

/**
 * Source Detail Sub-Popup for calorie sources
 */
function SourceDetailPopup({ item, onClose }) {
  const [copied, setCopied] = useState(false);
  const sourceUrl = item.sourceUrl || SOURCE_URLS[item.source] || null;

  function handleCopyLink() {
    if (sourceUrl) {
      navigator.clipboard.writeText(sourceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-4 animate-scale-in select-text"
        onClick={(e) => e.stopPropagation()}
        style={{ userSelect: 'text' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 text-sm">{item.food} - Calorie Source</h4>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Calorie info */}
          <div className="p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-800 font-medium">
              ~{item.calories} calories
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {item.baseServing}
            </p>
          </div>

          {/* Calculation */}
          <div className="text-xs text-gray-600">
            <span className="text-gray-400">Calculation: </span>
            <span>{item.calculation}</span>
          </div>

          {/* Source */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Source</p>
            <p className="text-sm font-medium text-blue-700">{item.source}</p>
            {sourceUrl && (
              <p className="text-xs text-blue-600 mt-1 break-all">{sourceUrl}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            {sourceUrl && (
              <button
                onClick={handleCopyLink}
                className="flex-1 px-3 py-2 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                {copied ? (
                  <>
                    <Check size={12} /> Copied!
                  </>
                ) : (
                  'Copy Link'
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Calorie Estimator Popup - Mobile-friendly with detailed breakdown and selectable text
 */
// Available units for the editable calorie popup dropdown
const UNIT_OPTIONS = {
  volume: ['tbsp', 'tsp', 'cup', 'oz', 'ml'],
  weight: ['oz', 'g', 'lb'],
  count: ['piece', 'slice', 'whole', 'serving', 'handful', 'scoop', 'egg', 'breast', 'thigh', 'fillet'],
};

function getUnitOptionsForItem(item) {
  const unit = item.unit;
  if (['tbsp', 'tsp', 'cup', 'ml'].includes(unit)) return [...new Set([unit, ...UNIT_OPTIONS.volume])];
  if (['g', 'lb'].includes(unit)) return [...new Set([unit, ...UNIT_OPTIONS.weight])];
  if (['oz'].includes(unit)) return [...new Set([unit, ...UNIT_OPTIONS.volume, ...UNIT_OPTIONS.weight])];
  return [...new Set([unit, ...UNIT_OPTIONS.count])];
}

// Unit conversion factors (relative to each other)
const UNIT_CONVERSIONS = {
  'tbsp_to_tsp': 3, 'tsp_to_tbsp': 1/3,
  'cup_to_tbsp': 16, 'tbsp_to_cup': 1/16,
  'cup_to_oz': 8, 'oz_to_cup': 1/8,
  'cup_to_tsp': 48, 'tsp_to_cup': 1/48,
  'lb_to_oz': 16, 'oz_to_lb': 1/16,
  'lb_to_g': 453.6, 'g_to_lb': 1/453.6,
  'oz_to_g': 28.35, 'g_to_oz': 1/28.35,
};

function convertBetweenUnits(qty, from, to) {
  if (from === to) return qty;
  const key = `${from}_to_${to}`;
  if (UNIT_CONVERSIONS[key]) return qty * UNIT_CONVERSIONS[key];
  return qty; // no conversion available, keep quantity
}

function CalorieEstimatorPopup({ content, dayKey, mealId, onClose, onSaveCalories }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [confidenceTooltipIdx, setConfidenceTooltipIdx] = useState(null);
  const qtyInputRefs = useRef([]);
  const fallbackEstimate = estimateCalories(content);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeEstimate, setActiveEstimate] = useState(fallbackEstimate);
  const [isAI, setIsAI] = useState(false);

  // Fetch AI estimate on mount
  useEffect(() => {
    if (!content) return;
    let cancelled = false;
    setAiLoading(true);
    estimateCaloriesAI(content).then(({ estimate: aiEst, isAI: gotAI }) => {
      if (cancelled) return;
      setActiveEstimate(aiEst);
      setIsAI(gotAI);
      setEditableItems(
        (aiEst?.items || []).map(item => ({
          ...item,
          editQty: item.quantity,
          editUnit: item.unit,
          calPerUnit: Math.round(item.calories / item.quantity) || item.calories,
        }))
      );
      setAiLoading(false);
    }).catch(() => {
      if (!cancelled) setAiLoading(false);
    });
    return () => { cancelled = true; };
  }, [content]);

  // Editable items state - each item gets its own quantity/unit
  const [editableItems, setEditableItems] = useState(() =>
    fallbackEstimate.items.map(item => ({
      ...item,
      editQty: item.quantity,
      editUnit: item.unit,
      calPerUnit: Math.round(item.calories / item.quantity) || item.calories,
    }))
  );

  // Recalculate totals from editable items
  const totalCalories = editableItems.reduce((sum, item) => sum + Math.round(item.calPerUnit * item.editQty), 0);

  // Always save the displayed calorie total as override on close
  // so the daily total reflects the AI estimate (not just the rule-based fallback)
  function handleClose() {
    if (totalCalories > 0 && dayKey && mealId) {
      updateMealById(dayKey, mealId, { calorieOverride: totalCalories });
      onSaveCalories?.();
    }
    onClose();
  }

  function handleQtyChange(idx, newQty) {
    setEditableItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, editQty: newQty } : item
    ));
  }

  function handleUnitChange(idx, newUnit) {
    setEditableItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const converted = convertBetweenUnits(item.editQty, item.editUnit, newUnit);
      return { ...item, editUnit: newUnit, editQty: Math.round(converted * 10) / 10 };
    }));
  }

  const confidenceLabels = {
    low: { text: 'Rough estimate', color: 'text-amber-600 bg-amber-50' },
    medium: { text: 'Moderate confidence', color: 'text-blue-600 bg-blue-50' },
    high: { text: 'Good estimate', color: 'text-green-600 bg-green-50' },
  };
  const confidence = confidenceLabels[activeEstimate.confidence] || confidenceLabels.low;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={handleClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[85vh] overflow-hidden animate-slide-up sm:animate-scale-in select-text"
        onClick={(e) => e.stopPropagation()}
        style={{ userSelect: 'text' }}
      >
        {/* Header - sticky */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 sm:px-5 sm:py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg">
                <Flame size={18} className="text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Calorie Estimate</h3>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${confidence.color}`}>
                    {confidence.text} - tap to adjust
                  </span>
                  {isAI && !aiLoading && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-violet-50 text-violet-600">AI</span>
                  )}
                  {aiLoading && (
                    <Loader2 size={12} className="text-violet-500 animate-spin" />
                  )}
                </div>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg -mr-1">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[calc(85vh-120px)] px-4 py-4 sm:px-5">
          {/* Total */}
          <div className="text-center mb-5 pb-4 border-b border-gray-100">
            <p className={`text-4xl sm:text-5xl font-bold text-orange-600 ${aiLoading ? 'opacity-50' : ''}`}>{totalCalories}</p>
            <p className="text-sm text-gray-500 mt-1">estimated calories</p>
          </div>

          {/* Line-item breakdown - editable */}
          {editableItems.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Breakdown ({editableItems.length} item{editableItems.length !== 1 ? 's' : ''})
              </p>

              {editableItems.map((item, idx) => {
                const itemCal = Math.round(item.calPerUnit * item.editQty);
                const unitOptions = getUnitOptionsForItem(item);
                const showConfidenceIcon = item.itemConfidence === 'medium' || item.itemConfidence === 'low';
                const confidenceColor = item.itemConfidence === 'low' ? 'text-orange-500' : 'text-amber-500';

                return (
                  <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
                    {/* Food name with confidence indicator */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-900">{item.food}</span>
                        {showConfidenceIcon && (
                          <button
                            onClick={() => {
                              if (confidenceTooltipIdx === idx) {
                                setConfidenceTooltipIdx(null);
                              } else {
                                setConfidenceTooltipIdx(idx);
                              }
                            }}
                            className="flex-shrink-0"
                          >
                            <AlertTriangle size={14} className={confidenceColor} />
                          </button>
                        )}
                      </div>
                      <span className="text-sm font-bold text-orange-600 whitespace-nowrap">{itemCal} cal</span>
                    </div>

                    {/* Confidence tooltip */}
                    {confidenceTooltipIdx === idx && item.confidenceNote && (
                      <button
                        onClick={() => {
                          setConfidenceTooltipIdx(null);
                          qtyInputRefs.current[idx]?.focus();
                        }}
                        className={`text-xs px-2 py-1 rounded-md w-full text-left ${
                          item.itemConfidence === 'low' ? 'bg-orange-50 text-orange-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {item.confidenceNote} — tap to adjust
                      </button>
                    )}

                    {/* Editable quantity and unit */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <input
                        ref={el => qtyInputRefs.current[idx] = el}
                        type="number"
                        value={item.editQty}
                        onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.25"
                        className="w-14 px-1.5 py-1 border border-gray-300 rounded-md text-center text-sm font-medium focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400"
                      />
                      <select
                        value={item.editUnit}
                        onChange={(e) => handleUnitChange(idx, e.target.value)}
                        className="px-1.5 py-1 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400"
                      >
                        {unitOptions.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                      <span className="text-gray-400 mx-0.5">&times;</span>
                      <span className="text-gray-600">{item.calPerUnit} cal/{item.unit}</span>
                      <span className="text-gray-400 mx-0.5">=</span>
                      <span className="font-semibold text-orange-600">{itemCal}</span>
                    </div>

                    {/* Source */}
                    {item.source && (
                      <div className="text-xs text-gray-500">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                          {item.source}
                          <Info size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* No items detected */}
          {editableItems.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">No specific foods detected</p>
              <p className="text-xs text-gray-400 mt-1">Try being more specific with food names</p>
            </div>
          )}

          {/* Tips / AI notes */}
          {activeEstimate.tips && activeEstimate.tips.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 rounded-xl">
              <div className="flex gap-2">
                <Info size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <p className="font-medium mb-1">{isAI ? 'Note' : 'Did you know?'}</p>
                  {activeEstimate.tips.map((tip, idx) => (
                    <p key={idx}>{tip}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - sticky */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 sm:px-5 sm:py-4">
          <p className="text-xs text-gray-400 text-center">
            {isAI ? 'Powered by AI — estimates may vary' : 'Estimates based on USDA FoodData Central & manufacturer labels'}
          </p>
        </div>
      </div>

      {/* Source Detail Sub-Popup */}
      {selectedItem && (
        <SourceDetailPopup
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

/**
 * Clarifying Question Popup
 */
function ClarifyingQuestionPopup({ clarification, onAnswer, onDismiss, onClose }) {
  const [selectedOption, setSelectedOption] = useState(null);

  function handleSave() {
    if (selectedOption !== null) {
      onAnswer(clarification.options[selectedOption]);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle size={18} className="text-blue-500" />
            <span className="font-medium text-gray-900">Quick question!</span>
            <span className="text-xs text-gray-400">(optional)</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-gray-700 mb-4">{clarification.question}</p>

          <div className="space-y-2 mb-4">
            {clarification.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedOption(idx)}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                  selectedOption === idx
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-sm">{option.label}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={selectedOption === null}
              className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
            <button
              onClick={() => {
                onDismiss(clarification.matchedFood);
                onClose();
              }}
              className="px-3 py-2 text-gray-500 text-sm hover:bg-gray-100 rounded-lg"
            >
              Don't ask again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Post-Calibration Options Modal
 * Shown after 5-day calibration is complete
 */
function PostCalibrationOptionsModal({ onSelect, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PartyPopper className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Nutrition Profile Complete!</h2>
            <p className="text-gray-600 text-sm">
              Great job logging 5 days of meals. Your personalized nutrition insights are now unlocked!
            </p>
          </div>

          {/* Question */}
          <p className="text-center text-gray-700 font-medium mb-4">
            Would you like to continue tracking your meals?
          </p>

          {/* Options */}
          <div className="space-y-3">
            {/* Detailed Tracking */}
            <button
              onClick={() => onSelect(TRACKING_MODES.DETAILED)}
              className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 group-hover:bg-emerald-200">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Detailed Tracking</p>
                  <p className="text-sm text-gray-500">Continue meal-by-meal logging (same format as calibration)</p>
                </div>
              </div>
            </button>

            {/* Simple Journal */}
            <button
              onClick={() => onSelect(TRACKING_MODES.JOURNAL)}
              className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-200">
                  <Pencil size={20} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Simple Daily Journal</p>
                  <p className="text-sm text-gray-500">One text box per day to reflect on eating (quick and mindful)</p>
                </div>
              </div>
            </button>

            {/* Pause */}
            <button
              onClick={() => onSelect(TRACKING_MODES.PAUSED)}
              className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg text-gray-500 group-hover:bg-gray-200">
                  <Lock size={20} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Pause Tracking</p>
                  <p className="text-sm text-gray-500">I'm good for now, maybe later</p>
                </div>
              </div>
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">
            You can change this anytime in Settings
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Daily Journal Entry Component (for simple tracking mode)
 */
function DailyJournalEntry() {
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    const existing = getTodayJournalEntry();
    if (existing) {
      setContent(existing.content);
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [content]);

  function handleSave() {
    const today = new Date().toISOString().split('T')[0];
    saveDailyJournalEntry(today, content);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{dateLabel}</h3>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <Check size={12} /> Saved
          </span>
        )}
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="How was your eating today? What did you have for meals? Any reflections..."
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        style={{ minHeight: '100px' }}
      />

      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-gray-400">
          Estimate based on your typical patterns
        </p>
        <button
          onClick={handleSave}
          disabled={!content.trim()}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Entry
        </button>
      </div>
    </div>
  );
}

// Icons for each meal type
const MEAL_ICONS = {
  breakfast: Coffee,
  morningSnack: Apple,
  lunch: Sun,
  afternoonSnack: Cookie,
  dinner: Moon,
  eveningSnack: Cake,
  snacks: Cookie,
  snack: Cookie,
  dessert: Cake,
  custom: Utensils,
};

/**
 * Auto-expanding textarea that grows with content and preserves formatting
 */
function ExpandingTextarea({ value, onChange, placeholder, disabled, onSave }) {
  const textareaRef = useRef(null);
  const [localValue, setLocalValue] = useState(value);
  const [saved, setSaved] = useState(false);
  const saveTimeoutRef = useRef(null);
  const savedIndicatorRef = useRef(null);

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.max(80, textarea.scrollHeight) + 'px';
    }
  }, [localValue]);

  // Debounced save
  const debouncedSave = useCallback((val) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      onChange(val);
      onSave?.();
      // Show saved indicator
      setSaved(true);
      if (savedIndicatorRef.current) {
        clearTimeout(savedIndicatorRef.current);
      }
      savedIndicatorRef.current = setTimeout(() => setSaved(false), 1500);
    }, 500); // Save after 500ms of no typing
  }, [onChange, onSave]);

  function handleChange(e) {
    const val = e.target.value;
    setLocalValue(val);
    debouncedSave(val);
    // Auto-expand textarea
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  }

  // Auto-size on initial load and when value changes externally
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [localValue]);

  function handleBlur() {
    // Save immediately on blur
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (localValue !== value) {
      onChange(localValue);
      onSave?.();
      setSaved(true);
      if (savedIndicatorRef.current) {
        clearTimeout(savedIndicatorRef.current);
      }
      savedIndicatorRef.current = setTimeout(() => setSaved(false), 1500);
    }
  }

  // On focus, scroll textarea into view (for mobile keyboard)
  function handleFocus() {
    // Small delay to let keyboard appear
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary-300 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm text-gray-700 placeholder:text-gray-400 resize-none overflow-hidden whitespace-pre-wrap ${
          disabled ? 'bg-gray-50 text-gray-500' : 'bg-white'
        }`}
        style={{ minHeight: '80px', touchAction: 'manipulation' }}
      />
      {/* Saved indicator - positioned below the textarea */}
      {saved && (
        <div className="flex justify-end mt-1">
          <div className="flex items-center gap-1 text-emerald-500 text-xs animate-fade-in-place">
            <Check size={12} />
            <span>Saved</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Sortable meal entry item
 */
function SortableMealEntry({ meal, day, onContentChange, onRemove, onAdvisorAction, onSaveCalories, disabled, showRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: meal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  const Icon = MEAL_ICONS[meal.type] || Utensils;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Check for pending advisor addition
  const pendingAddition = getPendingAdditionFor('nutrition', day, meal.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mb-3 bg-white rounded-xl border ${isDragging ? 'border-primary-300 shadow-lg' : 'border-gray-200'} overflow-hidden`}
    >
      {/* Header with drag handle and remove button */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>

        {/* Icon and label */}
        <Icon size={14} className="text-gray-500" />
        <span className="text-sm font-medium text-gray-700 flex-1">{meal.label}</span>

        {/* Advisor addition indicator */}
        {pendingAddition && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary-100 text-primary-600 rounded text-[10px] font-medium">
            <Bot size={10} />
            AI added
          </span>
        )}

        {/* Remove button */}
        {showRemove && !showDeleteConfirm && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Remove meal"
          >
            <X size={16} />
          </button>
        )}

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600">Remove?</span>
            <button
              onClick={() => {
                onRemove(meal.id);
                setShowDeleteConfirm(false);
              }}
              className="px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600"
            >
              Yes
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              No
            </button>
          </div>
        )}
      </div>

      {/* Advisor addition details (if pending) */}
      {pendingAddition && (
        <div className="px-3 py-2 bg-primary-50 border-b border-primary-100">
          <p className="text-xs text-primary-700 mb-1">
            <strong>Advisor added:</strong> "{pendingAddition.addedContent}"
          </p>
          <p className="text-[10px] text-primary-600 mb-2">{pendingAddition.reason}</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                approveAddition(pendingAddition.id);
                onAdvisorAction?.('approve', pendingAddition);
              }}
              className="flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white text-[10px] font-medium rounded hover:bg-emerald-600"
            >
              <Check size={10} /> Keep
            </button>
            <button
              onClick={() => {
                const addition = removeAddition(pendingAddition.id);
                // Revert the content
                if (addition?.originalContent !== undefined) {
                  onContentChange(meal.id, addition.originalContent);
                }
                onAdvisorAction?.('remove', addition);
              }}
              className="flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 text-[10px] font-medium rounded hover:bg-gray-300"
            >
              <X size={10} /> Remove
            </button>
          </div>
        </div>
      )}

      {/* Text area */}
      <div className="p-3">
        <ExpandingTextarea
          value={meal.content || ''}
          onChange={(val) => onContentChange(meal.id, val)}
          disabled={disabled}
          placeholder={`What did you have for ${meal.label.toLowerCase()}? You can paste recipes, list items, or describe your meal...`}
        />

        {/* Calorie & Clarification icons (only show when there's content) */}
        {meal.content && meal.content.trim() && (
          <MealEntryActions content={meal.content} mealId={meal.id} dayKey={day} onSaveCalories={onSaveCalories} />
        )}
      </div>
    </div>
  );
}

/**
 * Actions for a meal entry (calorie estimator, clarifying questions)
 */
function MealEntryActions({ content, mealId, dayKey, onSaveCalories }) {
  const [showCalories, setShowCalories] = useState(false);
  const [showClarify, setShowClarify] = useState(false);
  const [dismissedItems, setDismissedItems] = useState(() => {
    try {
      const saved = localStorage.getItem('health-advisor-clarify-dismissed');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const clarification = needsClarification(content);
  const needsQuestion = clarification && !dismissedItems.includes(clarification.matchedFood);
  const estimate = getCachedOrRuleBased(content);
  const hasEstimate = estimate.totalCalories > 0;

  function handleDismissClarification(item) {
    const updated = [...dismissedItems, item];
    setDismissedItems(updated);
    localStorage.setItem('health-advisor-clarify-dismissed', JSON.stringify(updated));
  }

  if (!hasEstimate && !needsQuestion) return null;

  return (
    <>
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
        {/* Calorie estimator icon */}
        {hasEstimate && (
          <button
            onClick={() => setShowCalories(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
            title="View calorie estimate"
          >
            <Flame size={12} />
            <span>~{estimate.totalCalories} cal</span>
          </button>
        )}

        {/* Clarifying question icon */}
        {needsQuestion && (
          <button
            onClick={() => setShowClarify(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Help us estimate better"
          >
            <HelpCircle size={12} />
            <span>Clarify portion</span>
          </button>
        )}
      </div>

      {/* Popups */}
      {showCalories && (
        <CalorieEstimatorPopup
          content={content}
          dayKey={dayKey}
          mealId={mealId}
          onClose={() => setShowCalories(false)}
          onSaveCalories={onSaveCalories}
        />
      )}

      {showClarify && clarification && (
        <ClarifyingQuestionPopup
          clarification={clarification}
          onAnswer={(option) => {
            // Could update the estimate with the multiplier here
          }}
          onDismiss={handleDismissClarification}
          onClose={() => setShowClarify(false)}
        />
      )}
    </>
  );
}

/**
 * Add meal dropdown
 */
function AddMealDropdown({ onAdd, existingTypes }) {
  const [isOpen, setIsOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const mealOptions = [
    { type: 'breakfast', label: 'Breakfast' },
    { type: 'morningSnack', label: 'Morning Snack' },
    { type: 'lunch', label: 'Lunch' },
    { type: 'afternoonSnack', label: 'Afternoon Snack' },
    { type: 'dinner', label: 'Dinner' },
    { type: 'eveningSnack', label: 'Evening Snack' },
    { type: 'snack', label: 'Snack' },
  ];

  function handleAddMeal(type, label = null) {
    onAdd(type, label);
    setIsOpen(false);
    setShowCustomInput(false);
    setCustomLabel('');
  }

  function handleAddCustom() {
    if (customLabel.trim()) {
      onAdd('custom', customLabel.trim());
      setIsOpen(false);
      setShowCustomInput(false);
      setCustomLabel('');
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-colors"
      >
        <Plus size={16} />
        <span className="text-sm font-medium">Add meal</span>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Add a meal</span>
        <button
          onClick={() => {
            setIsOpen(false);
            setShowCustomInput(false);
          }}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>

      {!showCustomInput ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            {mealOptions.map((option) => {
              const Icon = MEAL_ICONS[option.type] || Utensils;
              return (
                <button
                  key={option.type}
                  onClick={() => handleAddMeal(option.type)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-primary-50 hover:text-primary-700 transition-colors"
                >
                  <Icon size={14} />
                  {option.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setShowCustomInput(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Pencil size={14} />
            Custom label...
          </button>
        </>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Enter meal name..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-primary-300 focus:ring-2 focus:ring-primary-100 outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCustom();
              if (e.key === 'Escape') setShowCustomInput(false);
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddCustom}
              disabled={!customLabel.trim()}
              className="flex-1 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
            <button
              onClick={() => setShowCustomInput(false)}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Meal Pattern Setup Wizard - shown on first calibration view
 */
function MealPatternSetup({ onComplete, onSkip }) {
  const [meals, setMeals] = useState(() => {
    // Start with default pattern
    return getDefaultMealPattern();
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      // Longer delay prevents interference with tapping to focus inputs
      activationConstraint: { delay: 400, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setMeals((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  function handleRemoveMeal(mealId) {
    setMeals((items) => items.filter((m) => m.id !== mealId));
  }

  function handleAddMeal(type, label = null) {
    const mealLabel = label || MEAL_LABELS[type] || type;
    // Check if we already have this type
    const sameTypeMeals = meals.filter(m => m.type === type);
    let finalLabel = mealLabel;
    if (sameTypeMeals.length > 0 && !label) {
      finalLabel = `${mealLabel} ${sameTypeMeals.length + 1}`;
      // Rename first one if needed
      if (sameTypeMeals.length === 1 && !sameTypeMeals[0].label.match(/\d+$/)) {
        setMeals(items => items.map(m =>
          m.id === sameTypeMeals[0].id
            ? { ...m, label: `${m.label} 1` }
            : m
        ));
      }
    }

    const newMeal = createMeal(type, finalLabel, meals.length);
    setMeals((items) => [...items, newMeal]);
  }

  function handleSave() {
    saveDefaultMealPattern(meals);
    onComplete();
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-200 p-6">
      <div className="flex items-start gap-4 mb-5">
        <div className="p-3 bg-emerald-100 rounded-xl shrink-0">
          <Utensils size={24} className="text-emerald-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Set Up Your Eating Pattern
          </h3>
          <p className="text-sm text-gray-600">
            Drag to set your typical meal order. You can add or remove meals to match your routine.
          </p>
        </div>
      </div>

      {/* Draggable meal list */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Your typical eating order
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={meals.map(m => m.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {meals.map((meal) => (
                <SortableMealSetupItem
                  key={meal.id}
                  meal={meal}
                  onRemove={handleRemoveMeal}
                  canRemove={meals.length > 1}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add meal */}
        <div className="mt-3">
          <AddMealDropdown onAdd={handleAddMeal} existingTypes={meals.map(m => m.type)} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={meals.length === 0}
          className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          Save as my default
        </button>
        <button
          onClick={onSkip}
          className="px-4 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
        >
          Use defaults
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center mt-3">
        You can always change individual days later
      </p>
    </div>
  );
}

/**
 * Sortable item for meal pattern setup
 */
function SortableMealSetupItem({ meal, onRemove, canRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: meal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = MEAL_ICONS[meal.type] || Utensils;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg ${isDragging ? 'shadow-lg ring-2 ring-primary-300' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical size={16} />
      </button>
      <Icon size={16} className="text-gray-500" />
      <span className="flex-1 text-sm font-medium text-gray-700">{meal.label}</span>
      {canRemove && (
        <button
          onClick={() => onRemove(meal.id)}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

/**
 * Encouraging message shown after completing a day - clickable to edit
 */
function DayCompletedMessage({ day, nextDay, onEdit, calibrationData }) {
  const dayLabel = DAY_LABELS[day];
  const nextDayLabel = nextDay ? DAY_LABELS[nextDay] : null;

  // Calculate calorie total for the completed day
  const dayData = calibrationData?.days?.[day];
  const dayCalories = (dayData?.meals || []).reduce((total, meal) => {
    if (meal.content && meal.content.trim()) {
      const est = getCachedOrRuleBased(meal.content);
      return total + est.totalCalories;
    }
    return total;
  }, 0);

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <PartyPopper size={20} className="text-emerald-600" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-emerald-800">
            Nice work logging {dayLabel}'s meals!
            {dayCalories > 0 && (
              <span className="ml-2 text-sm font-normal text-emerald-600">
                (~{dayCalories.toLocaleString()} cal)
              </span>
            )}
          </p>
          {nextDayLabel ? (
            <p className="text-sm text-emerald-600 mt-1">
              {nextDayLabel}'s entry will unlock tomorrow. Come back then to continue building your nutrition profile!
            </p>
          ) : (
            <p className="text-sm text-emerald-600 mt-1">
              All done for this week! Your nutrition profile is being generated.
            </p>
          )}
        </div>
        {/* Edit button */}
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
        >
          <Pencil size={14} />
          Edit
        </button>
      </div>
    </div>
  );
}

/**
 * Weekend message when no entry is available
 */
function WeekendMessage({ progress }) {
  const nextDay = progress.nextDay;
  const nextDayLabel = nextDay ? DAY_LABELS[nextDay] : 'Monday';

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Calendar size={20} className="text-blue-600" />
        </div>
        <div>
          <p className="font-medium text-blue-800">Enjoy your weekend!</p>
          <p className="text-sm text-blue-600 mt-1">
            Meal tracking resumes on {nextDayLabel}. You've logged {progress.completed} of 5 days so far!
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Single day's meal entries with drag-and-drop
 */
function DayEntry({
  day,
  dayData,
  isToday,
  isExpanded,
  onToggle,
  onMealChange,
  onComplete,
  onReorder,
  onAddMeal,
  onRemoveMeal,
  profile,
  showCompletedMessage,
  nextDay,
  onDataChange,
}) {
  const dayCompleted = dayData?.completed;
  const dayInPast = isDayInPast(day);
  const dayInFuture = isDayInFuture(day);
  const meals = dayData?.meals || [];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      // Longer delay prevents interference with tapping to focus inputs
      activationConstraint: { delay: 400, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = meals.findIndex((m) => m.id === active.id);
      const newIndex = meals.findIndex((m) => m.id === over.id);
      const newOrder = arrayMove(meals, oldIndex, newIndex);
      onReorder(day, newOrder);
    }
  }

  // If today is done and we should show completed message
  if (isToday && dayCompleted && showCompletedMessage) {
    return <DayCompletedMessage day={day} nextDay={nextDay} onEdit={onToggle} calibrationData={{ days: { [day]: dayData } }} />;
  }

  // Collapsed completed day (can be expanded to edit)
  if (dayCompleted && !isExpanded) {
    return (
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
            <Check size={14} className="text-white" strokeWidth={3} />
          </div>
          <span className="font-medium text-emerald-700">{DAY_LABELS[day]}</span>
          <span className="text-xs text-emerald-500">Logged</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-600">
          <Pencil size={14} />
          <span className="text-xs font-medium">Edit</span>
          <ChevronDown size={16} />
        </div>
      </button>
    );
  }

  // Future day - locked
  if (dayInFuture && !dayCompleted) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 opacity-60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
            <Lock size={12} className="text-gray-500" />
          </div>
          <span className="font-medium text-gray-500">{DAY_LABELS[day]}</span>
        </div>
        <span className="text-xs text-gray-400">Unlocks on {DAY_LABELS[day]}</span>
      </div>
    );
  }

  // Past incomplete day - can still be filled
  if (dayInPast && !dayCompleted && !isExpanded) {
    return (
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center">
            <Utensils size={12} className="text-white" />
          </div>
          <span className="font-medium text-amber-700">{DAY_LABELS[day]}</span>
          <span className="text-xs text-amber-500">(missed - tap to log)</span>
        </div>
        <ChevronDown size={16} className="text-amber-500" />
      </button>
    );
  }

  // Today or expanded day - show full entry form
  const canComplete = canCompleteDay(day, profile);

  // Calculate daily calorie total from all meals with content
  const dailyCalories = meals.reduce((total, meal) => {
    if (meal.content && meal.content.trim()) {
      const est = getCachedOrRuleBased(meal.content);
      return total + est.totalCalories;
    }
    return total;
  }, 0);

  return (
    <div className={`rounded-xl border ${dayCompleted ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-gray-200'} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-3 ${dayCompleted ? 'bg-emerald-50' : 'bg-gray-50'} border-b ${dayCompleted ? 'border-emerald-200' : 'border-gray-200'}`}
      >
        <div className="flex items-center gap-2">
          {dayCompleted ? (
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
              <Check size={14} className="text-white" strokeWidth={3} />
            </div>
          ) : (
            <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
              <Utensils size={12} className="text-white" />
            </div>
          )}
          <span className={`font-medium ${dayCompleted ? 'text-emerald-700' : 'text-gray-800'}`}>
            {DAY_LABELS[day]}'s Meals
          </span>
          {isToday && !dayCompleted && (
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">Today</span>
          )}
          {dailyCalories > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
              dayCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
            }`}>
              <Flame size={10} />
              ~{dailyCalories.toLocaleString()} cal
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp size={16} className="text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
      </button>

      {/* Meal entries with drag-and-drop */}
      {isExpanded && (
        <div className="p-4 pb-32">
          <p className="text-xs text-gray-500 mb-3">
            Drag meals to reorder. Add or remove as needed.
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={meals.map(m => m.id)} strategy={verticalListSortingStrategy}>
              {meals.map((meal) => (
                <SortableMealEntry
                  key={meal.id}
                  meal={meal}
                  day={day}
                  onContentChange={(mealId, content) => onMealChange(day, mealId, content)}
                  onRemove={(mealId) => onRemoveMeal(day, mealId)}
                  onAdvisorAction={(action, addition) => onDataChange?.()}
                  onSaveCalories={() => onDataChange?.()}
                  disabled={false}
                  showRemove={meals.length > 1}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Add meal */}
          <AddMealDropdown
            onAdd={(type, label) => onAddMeal(day, type, label)}
            existingTypes={meals.map(m => m.type)}
          />

          {/* Daily total */}
          {dailyCalories > 0 && (
            <div className="mt-4 p-3 bg-orange-50 rounded-xl border border-orange-100 text-center">
              <div className="flex items-center justify-center gap-2">
                <Flame size={16} className="text-orange-500" />
                <span className="text-lg font-bold text-orange-600">~{dailyCalories.toLocaleString()} cal</span>
              </div>
              <p className="text-xs text-orange-400 mt-0.5">estimated daily total</p>
            </div>
          )}

          {/* Complete day button */}
          {!dayCompleted && (
            <button
              onClick={onComplete}
              disabled={!canComplete}
              className={`w-full mt-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                canComplete
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {canComplete ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} />
                  Complete {DAY_LABELS[day]}'s Log
                </span>
              ) : (
                'Fill in at least 2 meals to complete'
              )}
            </button>
          )}

          {/* Already completed - just show info */}
          {dayCompleted && (
            <div className="mt-3 p-2 bg-emerald-50 rounded-lg text-center">
              <p className="text-xs text-emerald-600">
                Changes are auto-saved. This day is marked complete.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Main Nutrition Calibration component
 */
export default function NutritionCalibration({ onComplete, compact = false, profile }) {
  const [calibrationData, setCalibrationData] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [justCompleted, setJustCompleted] = useState(null);
  const [showDismissPrompt, setShowDismissPrompt] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [showMealSetup, setShowMealSetup] = useState(false);
  const [showTrackingOptions, setShowTrackingOptions] = useState(false);
  const [trackingMode, setTrackingModeState] = useState(() => getTrackingMode());

  // Check if calibration is complete but user hasn't chosen tracking mode
  const calibrationComplete = isCalibrationComplete();
  const needsTrackingChoice = calibrationComplete && !hasChosenTrackingMode();

  // Show tracking options modal if calibration just completed
  useEffect(() => {
    if (needsTrackingChoice && !showTrackingOptions) {
      setShowTrackingOptions(true);
    }
  }, [needsTrackingChoice]);

  // Handle tracking mode selection
  function handleSelectTrackingMode(mode) {
    setTrackingMode(mode);
    setTrackingModeState(mode);
    setShowTrackingOptions(false);
  }

  // Check if this is Level 1 (chill) user and first view
  const isLevel1 = profile?.onboardingDepth === 'chill';
  const isFirstView = isFirstCalibrationView();
  const needsMealSetup = !hasSetupMealPattern();

  useEffect(() => {
    // Check if dismissed
    if (isCalibrationDismissed()) {
      return;
    }

    // For Level 1 users on first view, show the prompt
    if (isLevel1 && isFirstView && !hasAccepted) {
      setShowDismissPrompt(true);
      return;
    }

    // If first view and meal pattern not setup, show setup wizard
    if (isFirstView && needsMealSetup && !showMealSetup) {
      setShowMealSetup(true);
      return;
    }

    // Start calibration if not started, then align dates to current week
    startCalibration();
    let data = alignCalibrationToCurrentWeek();
    setCalibrationData(data);

    // Get today's day
    const progress = getCalibrationProgress();
    const today = progress.todayDay;

    // Auto-complete all past days that meet the completion threshold
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    if (today) {
      const todayIdx = dayOrder.indexOf(today);
      for (let i = 0; i < todayIdx; i++) {
        const pastDay = dayOrder[i];
        const pastDayData = data.days[pastDay];
        if (pastDayData && !pastDayData.completed && canCompleteDay(pastDay)) {
          const updated = completeDay(pastDay);
          data = updated;
        }
      }
      setCalibrationData(data);
    }

    // Re-read data after potential auto-complete
    const freshData = getCalibrationData();
    setCalibrationData(freshData);

    // Expand today's entry if it's a weekday and not completed
    if (today && freshData.days[today] && !freshData.days[today].completed) {
      setExpandedDay(today);
    }
  }, [refreshKey, isLevel1, isFirstView, hasAccepted, needsMealSetup, showMealSetup]);

  // Handle accepting calibration
  function handleAcceptCalibration() {
    setHasAccepted(true);
    setShowDismissPrompt(false);
    // Check if meal setup needed
    if (needsMealSetup) {
      setShowMealSetup(true);
    } else {
      // Now start calibration
      const data = startCalibration();
      setCalibrationData(data);
      const progress = getCalibrationProgress();
      const today = progress.todayDay;
      if (today && data.days[today] && !data.days[today].completed) {
        setExpandedDay(today);
      }
    }
  }

  // Handle dismissing calibration
  function handleDismissCalibration() {
    dismissCalibration();
    setShowDismissPrompt(false);
  }

  // Handle meal setup complete
  function handleMealSetupComplete() {
    setShowMealSetup(false);
    // Now start calibration
    const data = startCalibration();
    setCalibrationData(data);
    const progress = getCalibrationProgress();
    const today = progress.todayDay;
    if (today && data.days[today] && !data.days[today].completed) {
      setExpandedDay(today);
    }
    setRefreshKey(k => k + 1);
  }

  // Handle skip meal setup (use defaults)
  function handleSkipMealSetup() {
    setShowMealSetup(false);
    const data = startCalibration();
    setCalibrationData(data);
    const progress = getCalibrationProgress();
    const today = progress.todayDay;
    if (today && data.days[today] && !data.days[today].completed) {
      setExpandedDay(today);
    }
  }

  // Show meal setup wizard
  if (showMealSetup && !isCalibrationDismissed()) {
    return <MealPatternSetup onComplete={handleMealSetupComplete} onSkip={handleSkipMealSetup} />;
  }

  // Show dismiss prompt for Level 1 users
  if (showDismissPrompt && isLevel1) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-200 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-100 rounded-xl shrink-0">
            <Utensils size={24} className="text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Unlock Your Nutrition Profile?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Track your meals for 5 days to get personalized nutrition insights. This helps us understand your eating patterns and give better recommendations.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAcceptCalibration}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Let's do it
              </button>
              <button
                onClick={handleDismissCalibration}
                className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Skip for now
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              You can always start this later from the Nutrition page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!calibrationData) return null;

  const progress = getCalibrationProgress();

  // Don't show if complete or not in calibration period
  if (progress.isComplete || !progress.inPeriod) {
    return null;
  }

  function handleMealChange(day, mealId, content) {
    updateMealById(day, mealId, { content, calorieOverride: null });
    setCalibrationData(getCalibrationData());
  }

  function handleReorderMeals(day, newOrder) {
    reorderDayMeals(day, newOrder);
    setCalibrationData(getCalibrationData());
  }

  function handleAddMeal(day, type, label) {
    addMealToDay(day, type, label);
    setCalibrationData(getCalibrationData());
  }

  function handleRemoveMeal(day, mealId) {
    removeMealFromDay(day, mealId);
    setCalibrationData(getCalibrationData());
  }

  function handleCompleteDay(day) {
    const updatedData = completeDay(day);
    // Re-read to get the updated currentDay
    const freshData = getCalibrationData();
    setCalibrationData(freshData);
    setJustCompleted(day);

    // Expand the next uncompleted day
    const nextDay = freshData.currentDay;
    if (nextDay && nextDay !== day && !freshData.days[nextDay]?.completed) {
      setExpandedDay(nextDay);
    } else {
      setExpandedDay(null);
    }

    // If all complete, notify parent
    if (freshData.completedAt) {
      onComplete?.();
    }
  }

  function handleToggleDay(day) {
    // Clear just-completed state when user manually toggles
    if (day === justCompleted) {
      setJustCompleted(null);
    }
    setExpandedDay(expandedDay === day ? null : day);
  }

  // Today's day (null on weekends)
  const todayDay = progress.todayDay;
  const isTodayComplete = todayDay && calibrationData.days[todayDay]?.completed;
  const showCompletedForToday = todayDay && (justCompleted === todayDay || isTodayComplete);

  // Sort days: today first, then past incomplete, then past complete, then future
  const sortedDays = [...CALIBRATION_DAYS].sort((a, b) => {
    const aToday = isDayToday(a);
    const bToday = isDayToday(b);
    const aCompleted = calibrationData.days[a]?.completed;
    const bCompleted = calibrationData.days[b]?.completed;
    const aPast = isDayInPast(a);
    const bPast = isDayInPast(b);

    // Today always first
    if (aToday) return -1;
    if (bToday) return 1;

    // Past incomplete before past complete
    if (aPast && bPast) {
      if (!aCompleted && bCompleted) return -1;
      if (aCompleted && !bCompleted) return 1;
    }

    // Past before future
    if (aPast && !bPast) return -1;
    if (!aPast && bPast) return 1;

    // Default to original order
    return CALIBRATION_DAYS.indexOf(a) - CALIBRATION_DAYS.indexOf(b);
  });

  // Filter out future days in compact mode
  const visibleDays = compact
    ? sortedDays.filter(day => isDayToday(day) || isDayInPast(day) || calibrationData.days[day]?.completed)
    : sortedDays;

  // Get today's day data for calorie progress
  const todayDayData = todayDay ? calibrationData.days[todayDay] : null;

  return (
    <div className={`bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 ${compact ? 'p-4' : 'p-5'}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-amber-200 rounded-lg shrink-0">
          <Sparkles size={18} className="text-amber-700" />
        </div>
        <div className="flex-1">
          <h2 className={`font-semibold text-gray-900 ${compact ? 'text-base' : 'text-lg'}`}>
            Nutrition Profile
          </h2>
          <p className="text-sm text-amber-700 mt-0.5">
            {progress.remaining > 0
              ? `${progress.remaining} more day${progress.remaining > 1 ? 's' : ''} until your personalized insights unlock!`
              : 'Almost there!'}
          </p>
        </div>
      </div>

      {/* FEATURE 1: Calorie Progress Section at TOP */}
      {todayDay && todayDayData && (
        <CalorieProgressSection
          dayData={todayDayData}
          profile={profile}
          todayDay={todayDay}
        />
      )}

      {/* Today's date label */}
      {todayDay && (
        <div className="mb-3">
          <p className="text-sm font-medium text-gray-700">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · Today
          </p>
        </div>
      )}

      {/* Weekend message - shown on weekends but completed days still visible below */}
      {!todayDay && (
        <WeekendMessage progress={progress} />
      )}

      {/* Day entries - ALWAYS show completed days so users can edit them */}
      <div className="space-y-2">
        {visibleDays.map((day) => {
          const dayData = calibrationData.days[day];
          const isToday = isDayToday(day);
          const isExpanded = expandedDay === day || (isToday && !dayData?.completed && expandedDay === null);

          // On weekends, only show completed days (skip incomplete future/past days)
          if (!todayDay && !dayData?.completed) {
            return null;
          }

          return (
            <DayEntry
              key={day}
              day={day}
              dayData={dayData}
              isToday={isToday}
              isExpanded={isExpanded}
              onToggle={() => handleToggleDay(day)}
              onMealChange={handleMealChange}
              onComplete={() => handleCompleteDay(day)}
              onReorder={handleReorderMeals}
              onAddMeal={handleAddMeal}
              onRemoveMeal={handleRemoveMeal}
              profile={profile}
              showCompletedMessage={isToday && showCompletedForToday && !isExpanded}
              nextDay={progress.nextDay}
              onDataChange={() => setCalibrationData(getCalibrationData())}
            />
          );
        })}
      </div>

      {/* FEATURE 3: Combined Day Progress + Completed Days Dropdown at BOTTOM */}
      <CompletedDaysDropdown
        progress={progress}
        calibrationData={calibrationData}
        onEditDay={(day) => {
          setExpandedDay(day);
          setJustCompleted(null);
        }}
      />

      {/* Post-calibration options modal */}
      {showTrackingOptions && (
        <PostCalibrationOptionsModal
          onSelect={handleSelectTrackingMode}
          onClose={() => setShowTrackingOptions(false)}
        />
      )}
    </div>
  );
}

/**
 * Post-Calibration Nutrition Tracker
 * Shows either detailed tracking, simple journal, or paused state
 */
export function PostCalibrationTracker({ profile }) {
  const trackingMode = getTrackingMode();
  const [showOptions, setShowOptions] = useState(false);

  // If no tracking mode chosen yet, don't show anything
  if (!trackingMode) return null;

  // Paused mode - show minimal UI with option to resume
  if (trackingMode === TRACKING_MODES.PAUSED) {
    return (
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
        <div className="text-center">
          <Lock size={24} className="text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-3">Nutrition tracking is paused</p>
          <button
            onClick={() => setShowOptions(true)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Resume tracking
          </button>
        </div>
        {showOptions && (
          <PostCalibrationOptionsModal
            onSelect={(mode) => {
              setTrackingMode(mode);
              setShowOptions(false);
              window.location.reload();
            }}
            onClose={() => setShowOptions(false)}
          />
        )}
      </div>
    );
  }

  // Journal mode - show daily journal entry
  if (trackingMode === TRACKING_MODES.JOURNAL) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Daily Nutrition Journal</h3>
          <button
            onClick={() => setShowOptions(true)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Change mode
          </button>
        </div>
        <DailyJournalEntry />
        {showOptions && (
          <PostCalibrationOptionsModal
            onSelect={(mode) => {
              setTrackingMode(mode);
              setShowOptions(false);
              window.location.reload();
            }}
            onClose={() => setShowOptions(false)}
          />
        )}
      </div>
    );
  }

  // Detailed mode - handled by regular NutritionCalibration component
  return null;
}
