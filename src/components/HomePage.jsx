import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Check,
  Target,
  Compass,
  BookOpen,
  Trophy,
  Calendar,
  Loader2,
  Sparkles,
  Dumbbell,
  Footprints,
  Utensils,
  Moon,
  Brain,
  Scale,
  Clock,
  Unlock,
  Edit2,
  X,
  ExternalLink,
  GripVertical,
  Plus,
  Trash2,
  Info,
  Pencil,
  FolderOpen,
  Edit3,
  Flame,
  MessageCircle,
  CheckCircle,
  RefreshCw,
  Cloud,
  CloudOff,
  AlertTriangle,
} from 'lucide-react';
import { estimateCalories, SOURCE_URLS } from '../calorieEstimator';
import { estimateCaloriesAI, getCachedOrRuleBased } from '../aiCalorieEstimator';
import { hasLoseFatGoal, hasBuildMuscleGoal, getGoalsArray } from '../profileHelpers';
import { getPlaybook } from '../playbookStore';
import { logActivity, ACTIVITY_TYPES, ACTIVITY_SOURCES, WORKOUT_TYPES } from '../activityLogStore';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import DailyNutritionTracker from './DailyNutritionTracker';

/**
 * MET values for common exercises (Metabolic Equivalent of Task)
 * Calories burned = MET × weight(kg) × duration(hours)
 */
const EXERCISE_DATA = {
  // Exercise: { met: base MET value, defaultDuration: minutes per session }
  'running': { met: 9.8, defaultDuration: 45 },
  'weightlifting': { met: 5.0, defaultDuration: 60 },
  'yoga': { met: 3.0, defaultDuration: 60 },
  'cycling': { met: 7.5, defaultDuration: 45 },
  'swimming': { met: 7.0, defaultDuration: 45 },
  'hiit': { met: 9.0, defaultDuration: 30 },
  'walking': { met: 3.5, defaultDuration: 45 },
  'pilates': { met: 3.5, defaultDuration: 50 },
  'basketball': { met: 6.5, defaultDuration: 60 },
  'tennis': { met: 7.0, defaultDuration: 60 },
  'rock climbing': { met: 5.8, defaultDuration: 90 },
  'martial arts': { met: 6.0, defaultDuration: 60 },
  'dancing': { met: 5.0, defaultDuration: 60 },
  'rowing': { met: 7.0, defaultDuration: 30 },
};

// Intensity multipliers for training intensity
const INTENSITY_MULTIPLIERS = {
  'light': 0.85,
  'moderate': 1.0,
  'hard': 1.2,
  'mixed': 1.05,
};

/**
 * Calculate weekly exercise calories from profile exercises
 */
function calculateWeeklyExerciseCalories(exercises, weightKg, trainingIntensity) {
  if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
    return 0;
  }

  const intensityMult = INTENSITY_MULTIPLIERS[trainingIntensity] || 1.0;

  let weeklyCalories = 0;
  for (const exercise of exercises) {
    const name = exercise.name?.toLowerCase() || '';
    const frequency = exercise.frequency || 0;
    const duration = exercise.duration || EXERCISE_DATA[name]?.defaultDuration || 45;

    // Find matching exercise data (partial match)
    let exerciseInfo = EXERCISE_DATA[name];
    if (!exerciseInfo) {
      // Try partial matching
      for (const [key, data] of Object.entries(EXERCISE_DATA)) {
        if (name.includes(key) || key.includes(name)) {
          exerciseInfo = data;
          break;
        }
      }
    }

    // Default to moderate activity if exercise not found
    const met = exerciseInfo?.met || 4.5;
    const durationHours = duration / 60;

    // Calories per session = MET × weight(kg) × duration(hours) × intensity
    const caloriesPerSession = met * weightKg * durationHours * intensityMult;
    weeklyCalories += caloriesPerSession * frequency;
  }

  return Math.round(weeklyCalories);
}

/**
 * Calculate daily calorie budget using BMR + NEAT + Exercise
 */
function calculateDailyCalorieBudget(profile) {
  if (!profile) return 2000;

  const age = parseInt(profile.age) || 30;
  const sex = profile.sex?.toLowerCase() || 'male';

  let weightKg = parseFloat(profile.weight) || 70;
  if (profile.weightUnit === 'lbs') {
    weightKg = weightKg * 0.453592;
  }

  let heightCm = parseFloat(profile.height) || 170;
  if (profile.heightUnit === 'in') {
    heightCm = heightCm * 2.54;
  }

  // Mifflin-St Jeor for BMR
  let bmr;
  if (sex === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  // NEAT multiplier (Non-Exercise Activity Thermogenesis) - based on daily/work activity
  const neatMultipliers = {
    sedentary: 1.2,      // Desk job, minimal movement
    light: 1.3,          // Some walking, light activity
    lightly_active: 1.3,
    moderate: 1.4,       // On feet part of day
    moderately_active: 1.4,
    active: 1.5,         // Physical job
    very_active: 1.6,    // Very physical job
  };

  const activityLevel = profile.activityLevel?.toLowerCase().replace(/\s+/g, '_') || 'moderate';
  const neatMultiplier = neatMultipliers[activityLevel] || 1.3;

  // Base TDEE from BMR + NEAT (non-exercise daily activity)
  const baseTdee = bmr * neatMultiplier;

  // Add exercise calories
  const exercises = profile.exercises || [];
  const trainingIntensity = profile.trainingIntensity || 'moderate';
  const weeklyExerciseCalories = calculateWeeklyExerciseCalories(exercises, weightKg, trainingIntensity);
  const dailyExerciseCalories = weeklyExerciseCalories / 7;

  // Total TDEE = base + exercise
  const totalTdee = baseTdee + dailyExerciseCalories;

  // Goal adjustments - use safe helpers
  const hasLoseFat = hasLoseFatGoal(profile.goals);
  const hasBuildMuscle = hasBuildMuscleGoal(profile.goals);

  // Fat loss takes priority over muscle gain
  if (hasLoseFat) return Math.round(totalTdee - 500);
  if (hasBuildMuscle) return Math.round(totalTdee + 300);
  return Math.round(totalTdee);
}

/**
 * Get total calories from meals array
 */
function getTodaysCaloriesFromMeals(meals) {
  if (!meals || !Array.isArray(meals)) return 0;
  return meals.reduce((total, meal) => {
    if (meal.content && meal.content.trim()) {
      // Use user-adjusted override if available, otherwise re-parse
      if (typeof meal.calorieOverride === 'number') {
        return total + meal.calorieOverride;
      }
      // Use cached AI result if available, else fall back to rule-based
      const estimate = getCachedOrRuleBased(meal.content);
      return total + estimate.totalCalories;
    }
    return total;
  }, 0);
}
import { getWeeklyFocusProgress, generateWeeklyWins, setCustomTarget } from '../weeklyProgressStore';
import {
  getGoalsWithProgress,
  addGoal,
  updateGoal,
  removeGoal,
  incrementGoal,
  canAddGoal,
  getLastWeekSummary,
  getGoalHistory,
  getGoalStreaks,
  getCurrentWeekOf,
} from '../focusGoalStore';
import {
  isInCalibrationPeriod,
  isCalibrationComplete,
  getCalibrationProgress,
  getCalibrationData,
  saveCalibrationData,
  updateMealById,
  getTodayDayKey,
  DAY_LABELS,
  CALIBRATION_DAYS,
  reorderDayMeals,
  addMealToDay,
  removeMealFromDay,
  canCompleteDay,
  ALL_MEAL_TYPES,
  getDefaultMealPattern,
  saveDefaultMealPattern,
  getNutritionProfile,
  addTodayMeal,
  getTodayMeals,
  updateTodayMeal,
  removeTodayMeal,
  TRACKING_MODES,
  getTrackingMode,
  setTrackingMode,
  isOngoingTrackingEnabled,
} from '../nutritionCalibrationStore';
import { getCurrentWeekCheckIn } from '../checkInStore';
import { getProfile } from '../store';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Goal Reminder Component - Subtle reminder of user's main goals
function GoalReminder({ profile }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // Get user's goals from profile - use safe helper
  const goals = getGoalsArray(profile?.goals);
  const goalDetails = profile?.goalDetails || {};

  if (goals.length === 0) return null;

  // Map goal IDs to friendly labels
  const goalLabels = {
    weightLoss: 'Lose body fat',
    weight_loss: 'Lose body fat',
    muscle_gain: 'Build muscle',
    muscleGain: 'Build muscle',
    strength: 'Build strength',
    endurance: 'Improve endurance',
    sleep: 'Better sleep',
    nutrition: 'Better nutrition',
    flexibility: 'Improve flexibility',
    energy: 'More energy',
    stress: 'Reduce stress',
    general: 'Overall health',
  };

  // Get the primary goal - prefer the user's written detail over the label
  const primaryGoalDetail = goalDetails[goals[0]];
  const primaryGoalLabel = goalLabels[goals[0]] || goals[0].replace(/_/g, ' ');

  // Format additional goals as labels only
  const additionalGoalLabels = goals.slice(1).map(g => goalLabels[g] || g.replace(/_/g, ' '));

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl px-4 py-3 mb-4">
      <div className="flex items-start gap-3">
        <div className="p-1.5 bg-indigo-100 rounded-lg flex-shrink-0">
          <Target size={14} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-indigo-500 uppercase tracking-wide mb-1">Working towards</p>
          {primaryGoalDetail ? (
            <p className="text-sm text-indigo-900 leading-snug">
              {primaryGoalDetail.length > 80 ? primaryGoalDetail.substring(0, 80) + '...' : primaryGoalDetail}
            </p>
          ) : (
            <p className="text-sm text-indigo-900">{primaryGoalLabel}</p>
          )}
          {additionalGoalLabels.length > 0 && (
            <p className="text-xs text-indigo-500 mt-1">
              Also: {additionalGoalLabels.join(' • ')}
            </p>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-indigo-300 hover:text-indigo-600 hover:bg-indigo-100 rounded transition-colors flex-shrink-0"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// Format date in simple style: "Wednesday, Jan 28 · Today"
function formatSimpleDate(date = new Date()) {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${dayName}, ${monthDay}`;
}

// Get icon for different goal types
function getFocusIcon(type) {
  const icons = {
    run: Footprints,
    strength: Dumbbell,
    cardio: Dumbbell,
    workout: Dumbbell,
    proteinGoal: Utensils,
    meal: Utensils,
    supplement: Utensils,
    sleep: Moon,
    water: Scale,
    walk: Footprints,
    yoga: Brain,
    weight: Scale,
  };
  return icons[type] || Target;
}

// Get win icon
function getWinIcon(iconName) {
  const icons = {
    dumbbell: Dumbbell,
    run: Footprints,
    footprints: Footprints,
    utensils: Utensils,
    moon: Moon,
    scale: Scale,
    calendar: Calendar,
    check: Check,
  };
  return icons[iconName] || Check;
}

/**
 * Detect user intent from text
 * Returns: 'question' | 'log' | 'unclear'
 */
function detectIntent(text) {
  const lowerText = text.toLowerCase();

  // QUESTION indicators - DO NOT auto-log
  const questionIndicators = [
    'should i', 'can i', 'would it', 'will it', 'is it',
    'how do', 'how does', 'how should', 'how can',
    'what should', 'what would', 'what if',
    'do you think', 'does it matter',
    'not sure', 'wondering', 'curious',
    'advice', 'recommend', 'suggestion',
    'before my', 'after my', // "before my yoga class" - asking about timing
    'or will', 'or should', // "...or will that cause..."
  ];

  // LOG indicators - likely logging an activity
  const logIndicators = [
    'i did', 'i had', 'i ate', 'i ran', 'i went',
    'just did', 'just had', 'just ate', 'just finished',
    'completed', 'logged', 'tracking',
    'for breakfast', 'for lunch', 'for dinner', 'for a snack',
    'this morning', 'today i', 'yesterday i',
    'weighed in', 'weighed myself', 'weight was', 'weight is',
    'slept for', 'got hours', 'hours of sleep',
  ];

  const hasQuestionMark = lowerText.includes('?');
  const isQuestion = questionIndicators.some(q => lowerText.includes(q)) || hasQuestionMark;
  const isLog = logIndicators.some(l => lowerText.includes(l));

  // If it's clearly a question and NOT a log, return question
  if (isQuestion && !isLog) return 'question';
  // If it's clearly a log and NOT a question, return log
  if (isLog && !isQuestion) return 'log';
  // If it has both indicators or neither, it's unclear
  // But if it has a question mark, lean toward question
  if (hasQuestionMark) return 'question';
  return 'unclear';
}

// Detect activity type and log it
function detectAndLogQuickEntry(text) {
  const lower = text.toLowerCase();
  const loggedWorkouts = [];

  // First, detect user intent
  const intent = detectIntent(text);

  // If this is a question (not a log), don't auto-log anything
  if (intent === 'question') {
    return {
      type: 'question',
      icon: MessageCircle,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
      message: 'This looks like a question for your advisor',
      destination: 'Chat with Advisor',
      isQuestion: true,
      originalText: text,
    };
  }

  // Weight/weigh-in detection (exclusive - not combined with workouts)
  if (lower.includes('weigh') || lower.includes('scale') || lower.includes('weight check') ||
      (lower.match(/\d+(\.\d+)?\s*(lbs?|pounds?)/) && (lower.includes('at') || lower.includes('today')))) {
    const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?|kg|kilos?)?/i);
    const weight = weightMatch ? parseFloat(weightMatch[1]) : null;
    logActivity({
      type: ACTIVITY_TYPES.WEIGHT,
      source: ACTIVITY_SOURCES.DASHBOARD,
      rawText: text,
      summary: weight ? `Weighed in at ${weight} lbs` : 'Weight check',
      data: { weight },
    });
    return {
      type: 'weight',
      icon: Scale,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      message: weight ? `Weight logged: ${weight} lbs` : 'Weight check logged',
      destination: 'Focus Goals',
    };
  }

  // Sleep detection (exclusive)
  if (lower.includes('slept') || lower.includes('sleep') || lower.includes('hours of rest')) {
    const hoursMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
    logActivity({
      type: ACTIVITY_TYPES.SLEEP,
      source: ACTIVITY_SOURCES.DASHBOARD,
      rawText: text,
      summary: hoursMatch ? `${hoursMatch[1]} hours of sleep` : 'Sleep logged',
      data: { hours: hoursMatch ? parseFloat(hoursMatch[1]) : null },
    });
    return {
      type: 'sleep',
      icon: Moon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      message: hoursMatch ? `Sleep logged: ${hoursMatch[1]} hours` : 'Sleep logged',
      destination: 'Focus Goals',
    };
  }

  // Split text into segments for multi-workout detection
  const segments = text.split(/\band\b|\bthen\b|,|;/i).map(s => s.trim()).filter(s => s.length > 0);

  // Process each segment for workouts
  for (const segment of segments) {
    const segLower = segment.toLowerCase();

    // Running detection
    if (segLower.includes('ran') || segLower.includes('run ') || segLower.includes('running') ||
        segLower.includes('jog') || (segLower.includes('mile') && !segLower.includes('walk'))) {
      const distanceMatch = segment.match(/(\d+(?:\.\d+)?)\s*(?:miles?|mi)\b/i) ||
                            text.match(/(\d+(?:\.\d+)?)\s*(?:miles?|mi)\b/i);
      const paceMatch = segment.match(/(\d+:\d+)\s*(?:pace|\/mi|per mile)?/i) ||
                        text.match(/(\d+:\d+)\s*(?:pace|\/mi|per mile)?/i);
      const distance = distanceMatch ? parseFloat(distanceMatch[1]) : null;
      const pace = paceMatch ? paceMatch[1] : null;

      logActivity({
        type: ACTIVITY_TYPES.WORKOUT,
        subType: WORKOUT_TYPES.RUN,
        source: ACTIVITY_SOURCES.DASHBOARD,
        rawText: segment,
        summary: distance ? `Ran ${distance} miles${pace ? ` @ ${pace}` : ''}` : 'Went for a run',
        data: { distance, pace, exercise: 'Run' },
      });
      loggedWorkouts.push({ type: 'run', message: distance ? `${distance} mi run` : 'Run' });
      continue;
    }

    // Strength/weightlifting detection
    if (segLower.includes('lift') || segLower.includes('weights') || segLower.includes('gym') ||
        segLower.includes('squat') || segLower.includes('bench') || segLower.includes('deadlift') ||
        segLower.includes('circuit') || segLower.includes('pulldown') || segLower.includes('curl') ||
        segLower.includes('row') || segLower.includes('press') || segLower.includes('pull-up') ||
        segLower.includes('pullup') || segLower.includes('dumbbell') || segLower.includes('barbell') ||
        segLower.includes('kettlebell') || segLower.includes('strength')) {

      const durationMatch = segment.match(/(\d+)\s*(?:min|mins|minutes?)\b/i);
      const duration = durationMatch ? parseInt(durationMatch[1]) : null;

      let exerciseName = 'Strength training';
      if (segLower.includes('back')) exerciseName = 'Back workout';
      else if (segLower.includes('chest')) exerciseName = 'Chest workout';
      else if (segLower.includes('leg')) exerciseName = 'Leg workout';
      else if (segLower.includes('arm') || segLower.includes('bicep') || segLower.includes('tricep')) exerciseName = 'Arm workout';
      else if (segLower.includes('shoulder')) exerciseName = 'Shoulder workout';
      else if (segLower.includes('circuit')) exerciseName = 'Circuit training';

      logActivity({
        type: ACTIVITY_TYPES.WORKOUT,
        subType: WORKOUT_TYPES.STRENGTH,
        source: ACTIVITY_SOURCES.DASHBOARD,
        rawText: segment,
        summary: duration ? `${exerciseName} (${duration} min)` : exerciseName,
        data: { duration, exercise: exerciseName },
      });
      loggedWorkouts.push({ type: 'strength', message: duration ? `${exerciseName} (${duration}m)` : exerciseName });
      continue;
    }

    // Yoga detection
    if (segLower.includes('yoga') || segLower.includes('stretch')) {
      const durationMatch = segment.match(/(\d+)\s*(?:min|mins|minutes?)\b/i);
      const duration = durationMatch ? parseInt(durationMatch[1]) : null;

      logActivity({
        type: ACTIVITY_TYPES.WORKOUT,
        subType: WORKOUT_TYPES.YOGA,
        source: ACTIVITY_SOURCES.DASHBOARD,
        rawText: segment,
        summary: duration ? `Yoga (${duration} min)` : 'Yoga session',
        data: { duration, exercise: 'Yoga' },
      });
      loggedWorkouts.push({ type: 'yoga', message: duration ? `Yoga (${duration}m)` : 'Yoga' });
      continue;
    }

    // Walking detection
    if (segLower.includes('walk') || segLower.includes('steps') || segLower.includes('stroll')) {
      const distanceMatch = segment.match(/(\d+(?:\.\d+)?)\s*(?:miles?|mi|km|k)\b/i);
      const stepsMatch = segment.match(/(\d{3,})\s*steps?/i);

      logActivity({
        type: ACTIVITY_TYPES.WORKOUT,
        subType: WORKOUT_TYPES.WALK,
        source: ACTIVITY_SOURCES.DASHBOARD,
        rawText: segment,
        summary: distanceMatch ? `Walked ${distanceMatch[1]} miles` : stepsMatch ? `${stepsMatch[1]} steps` : 'Walk',
        data: {
          distance: distanceMatch ? parseFloat(distanceMatch[1]) : null,
          steps: stepsMatch ? parseInt(stepsMatch[1]) : null,
          exercise: 'Walk',
        },
      });
      loggedWorkouts.push({ type: 'walk', message: distanceMatch ? `${distanceMatch[1]} mi walk` : stepsMatch ? `${stepsMatch[1]} steps` : 'Walk' });
      continue;
    }

    // General workout detection
    if (segLower.includes('workout') || segLower.includes('exercise') ||
        segLower.includes('cardio') || segLower.includes('hiit')) {
      const durationMatch = segment.match(/(\d+)\s*(?:min|mins|minutes?)\b/i);
      const duration = durationMatch ? parseInt(durationMatch[1]) : null;

      logActivity({
        type: ACTIVITY_TYPES.WORKOUT,
        subType: WORKOUT_TYPES.OTHER,
        source: ACTIVITY_SOURCES.DASHBOARD,
        rawText: segment,
        summary: duration ? `Workout (${duration} min)` : 'Workout',
        data: { duration, exercise: 'Workout' },
      });
      loggedWorkouts.push({ type: 'other', message: duration ? `Workout (${duration}m)` : 'Workout' });
      continue;
    }
  }

  // If we logged workouts, return combined confirmation
  if (loggedWorkouts.length > 0) {
    const messages = loggedWorkouts.map(w => w.message);
    return {
      type: 'workout',
      icon: loggedWorkouts.length > 1 ? Dumbbell : (loggedWorkouts[0].type === 'run' ? Footprints : Dumbbell),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      message: loggedWorkouts.length > 1 ? `Logged: ${messages.join(' + ')}` : `Logged: ${messages[0]}`,
      destination: 'Training & Focus Goals',
    };
  }

  // Nutrition/meal detection (default for food-related)
  if (lower.includes('ate') || lower.includes('had') || lower.includes('breakfast') ||
      lower.includes('lunch') || lower.includes('dinner') || lower.includes('snack') ||
      lower.includes('meal') || lower.includes('eggs') || lower.includes('salad') ||
      lower.includes('smoothie') || lower.includes('coffee')) {
    logActivity({
      type: ACTIVITY_TYPES.NUTRITION,
      source: ACTIVITY_SOURCES.DASHBOARD,
      rawText: text,
      summary: text.length > 50 ? text.substring(0, 50) + '...' : text,
    });
    return {
      type: 'nutrition',
      icon: Utensils,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      message: 'Meal logged',
      destination: 'Nutrition',
    };
  }

  // Default - general activity
  logActivity({
    type: ACTIVITY_TYPES.GENERAL,
    source: ACTIVITY_SOURCES.DASHBOARD,
    rawText: text,
    summary: text.length > 50 ? text.substring(0, 50) + '...' : text,
  });
  return {
    type: 'general',
    icon: CheckCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    message: 'Entry logged',
    destination: 'Activity Log',
  };
}

// Quick Entry Component
function QuickEntryBox({ onSubmit, onNavigate, onActivityLogged }) {
  const [input, setInput] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [clarifyingQuestion, setClarifyingQuestion] = useState(null);
  const textareaRef = useRef(null);

  const tips = [
    '"For breakfast I had oatmeal with honey and two eggs"',
    '"Just finished a 3-mile run in 28 minutes"',
    '"Lunch was a chicken salad with avocado"',
    '"Did 30 minutes of strength training - bench, squats, rows"',
  ];
  const [tipIndex] = useState(Math.floor(Math.random() * tips.length));

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  // Auto-dismiss confirmation after 5 seconds
  useEffect(() => {
    if (confirmation && !confirmation.isQuestion) {
      const timer = setTimeout(() => setConfirmation(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [confirmation]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;

    const trimmedInput = input.trim();

    // Detect, log, and get confirmation info
    const result = detectAndLogQuickEntry(trimmedInput);

    // If it's a question, send directly to advisor
    if (result.isQuestion) {
      onSubmit(trimmedInput, true); // true = is question, create new chat
      setInput('');
      return;
    }

    // Check if we need clarification for ambiguous entries
    const intent = detectIntent(trimmedInput);
    if (intent === 'unclear') {
      // Check if text mentions an activity we might want to log
      const lower = trimmedInput.toLowerCase();
      const activityMentions = ['yoga', 'run', 'workout', 'gym', 'lift', 'walk', 'exercise'];
      const mentionedActivity = activityMentions.find(a => lower.includes(a));

      if (mentionedActivity) {
        setClarifyingQuestion({
          originalText: trimmedInput,
          activity: mentionedActivity,
          message: `I noticed you mentioned "${mentionedActivity}" - did you want me to log that as a workout?`,
        });
        setInput('');
        return;
      }
    }

    setConfirmation({ ...result, originalText: trimmedInput });
    setInput('');

    // Notify parent that activity was logged
    if (!result.isQuestion) {
      onActivityLogged?.();
    }
  }

  function handleKeyDown(e) {
    // Submit on Enter without Shift
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleChatWithAdvisor() {
    if (confirmation) {
      onSubmit(confirmation.originalText, confirmation.isQuestion);
      setConfirmation(null);
    }
  }

  function handleDismiss() {
    setConfirmation(null);
    setClarifyingQuestion(null);
  }

  // Handle clarifying question response
  function handleClarifyYes() {
    if (clarifyingQuestion) {
      // Log the activity
      const result = detectAndLogQuickEntry(clarifyingQuestion.originalText);
      setConfirmation({ ...result, originalText: clarifyingQuestion.originalText });
      setClarifyingQuestion(null);
      onActivityLogged?.();
    }
  }

  function handleClarifyNo() {
    if (clarifyingQuestion) {
      // Send to advisor as a question
      onSubmit(clarifyingQuestion.originalText, true);
      setClarifyingQuestion(null);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      {/* Clarifying Question */}
      {clarifyingQuestion && (
        <div className="mb-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0">
              <MessageCircle size={16} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800 mb-3">
                {clarifyingQuestion.message}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleClarifyYes}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Yes, log it
                </button>
                <button
                  onClick={handleClarifyNo}
                  className="px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  No, just asking
                </button>
                <button
                  onClick={handleDismiss}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors ml-auto"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation message */}
      {confirmation && !clarifyingQuestion && (
        <div className={`mb-3 p-3 rounded-xl ${confirmation.bgColor} border border-opacity-50 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <confirmation.icon size={18} className={confirmation.color} />
            <span className="text-sm font-medium text-gray-700">
              {confirmation.message}
            </span>
            <span className="text-xs text-gray-500">
              → {confirmation.destination}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleChatWithAdvisor}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-white rounded-lg border border-primary-200 hover:bg-primary-50 transition-colors"
            >
              <MessageCircle size={14} />
              Chat with Advisor
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Log a meal, workout, or ask your advisor anything..."
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none overflow-hidden"
            style={{ minHeight: '48px' }}
            rows={1}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
      <p className="text-xs text-gray-500 mt-3 flex items-start gap-1.5">
        <Sparkles size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <span>Tip: {tips[tipIndex]} – I'll take care of the rest!</span>
      </p>
    </div>
  );
}

// Draggable Meal Slot Component
function DraggableMealSlot({ meal, dayKey, index, onUpdate, onSaveCalories, onDragStart, onDragOver, onDragEnd, onDelete, isDragging, canDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(meal.content || '');
  const [showCalories, setShowCalories] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize textarea
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  // Auto-resize on content change
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [editValue]);

  function handleSave() {
    onUpdate(dayKey, meal.id, editValue);
    setIsEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(meal.content || '');
      setIsEditing(false);
    }
  }

  const hasMeal = meal.content?.trim();
  const calorieEstimate = hasMeal ? getCachedOrRuleBased(meal.content) : null;
  const displayCalories = typeof meal.calorieOverride === 'number' ? meal.calorieOverride : calorieEstimate?.totalCalories;
  const hasCalories = calorieEstimate && displayCalories > 0;

  if (isEditing) {
    return (
      <div className="p-2 rounded-lg bg-white border-2 border-amber-400">
        <div className="flex items-start gap-2 mb-2">
          <span className="text-sm text-gray-600 font-medium w-24 flex-shrink-0 pt-1">
            {meal.label}:
          </span>
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What did you have? Be specific for better tracking..."
            className="flex-1 px-2 py-1 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none overflow-hidden"
            style={{ minHeight: '36px' }}
            rows={1}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setEditValue(meal.content || '');
              setIsEditing(false);
            }}
            className="px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-sm bg-amber-500 text-white rounded hover:bg-amber-600"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      className={`flex items-start gap-2 p-2 rounded-lg transition-all cursor-move ${
        isDragging
          ? 'opacity-50 bg-amber-100 border-2 border-dashed border-amber-400'
          : hasMeal
            ? 'bg-white/60 border border-amber-100 hover:bg-white/80'
            : 'bg-white/40 border border-dashed border-amber-200 hover:bg-white/60 hover:border-amber-300'
      }`}
    >
      {/* Drag Handle */}
      <div className="text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0 mt-0.5">
        <GripVertical size={14} />
      </div>

      {/* Checkbox */}
      {hasMeal ? (
        <Check size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
      ) : (
        <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />
      )}

      {/* Content - Click to edit */}
      <button
        onClick={() => setIsEditing(true)}
        className="flex-1 flex items-start gap-2 text-left min-w-0"
      >
        <span className="text-sm text-gray-600 font-medium w-24 flex-shrink-0">
          {meal.label}:
        </span>
        <span className={`text-sm flex-1 ${
          hasMeal ? 'text-gray-800' : 'text-gray-400 italic'
        }`}>
          {hasMeal ? meal.content : 'Tap to add'}
        </span>
      </button>

      {/* Action buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Calorie estimate icon */}
        {hasCalories && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCalories(true);
            }}
            className="p-1 text-orange-500 hover:bg-orange-50 rounded transition-colors"
            title={`~${displayCalories} cal`}
          >
            <Flame size={12} />
          </button>
        )}

        {/* Edit icon */}
        {hasMeal && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <Edit2 size={12} />
          </button>
        )}

        {/* Delete button */}
        {canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(dayKey, meal.id);
            }}
            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Calorie Popup */}
      {showCalories && calorieEstimate && (
        <CaloriePopup
          estimate={calorieEstimate}
          mealText={meal.content}
          dayKey={dayKey}
          mealId={meal.id}
          onClose={() => setShowCalories(false)}
          onSaveCalories={onSaveCalories}
        />
      )}
    </div>
  );
}

// Source Detail Sub-Popup
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

// Unit options for editable calorie popup
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
  return qty;
}

// Calorie Popup Component - Shows calorie breakdown with editable servings
function CaloriePopup({ estimate: fallbackEstimate, mealText, dayKey, mealId, onClose, onSaveCalories }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [confidenceTooltipIdx, setConfidenceTooltipIdx] = useState(null);
  const qtyInputRefs = useRef([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeEstimate, setActiveEstimate] = useState(fallbackEstimate);
  const [isAI, setIsAI] = useState(fallbackEstimate?.isAI || false);
  const [clarificationDismissed, setClarificationDismissed] = useState(false);

  // Fetch AI estimate on mount
  useEffect(() => {
    if (!mealText) return;
    let cancelled = false;
    setAiLoading(true);
    estimateCaloriesAI(mealText).then(({ estimate: aiEst, isAI: gotAI }) => {
      if (cancelled) return;
      setActiveEstimate(aiEst);
      setIsAI(gotAI);
      // Update editable items with AI result
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
  }, [mealText]);

  // Editable items state - each item gets its own quantity/unit
  const [editableItems, setEditableItems] = useState(() =>
    (activeEstimate?.items || []).map(item => ({
      ...item,
      editQty: item.quantity,
      editUnit: item.unit,
      calPerUnit: Math.round(item.calories / item.quantity) || item.calories,
    }))
  );

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

  if (!activeEstimate) return null;

  const confidenceLabels = {
    low: { text: 'Low confidence', color: 'text-amber-600 bg-amber-50' },
    medium: { text: 'Medium confidence', color: 'text-blue-600 bg-blue-50' },
    high: { text: 'High confidence', color: 'text-green-600 bg-green-50' },
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
                    {confidence.text}
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

          {/* Clarification prompt (if AI needs user input) */}
          {activeEstimate.needsClarification && !clarificationDismissed && activeEstimate.clarificationQuestion && (
            <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-blue-800">{activeEstimate.clarificationQuestion}</p>
                <button
                  onClick={() => setClarificationDismissed(true)}
                  className="text-blue-400 hover:text-blue-600 flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
              {activeEstimate.clarificationOptions && activeEstimate.clarificationOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {activeEstimate.clarificationOptions.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        // For now, just dismiss — user can manually adjust items
                        // Future: could re-estimate with the selected option
                        setClarificationDismissed(true);
                      }}
                      className="px-2 py-1 text-xs bg-white border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-blue-500 mt-2">You can also adjust quantities above if needed.</p>
            </div>
          )}

          {/* Tips / AI notes */}
          {activeEstimate.tips && activeEstimate.tips.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 rounded-xl">
              <p className="text-xs font-medium text-amber-700 mb-1">💡 {isAI ? 'Note' : 'Tip'}</p>
              {activeEstimate.tips.map((tip, idx) => (
                <p key={idx} className="text-xs text-amber-600">{tip}</p>
              ))}
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

// Info Tooltip Component
function InfoTooltip({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Why 5 Days?</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Logging your meals for 5 days helps the Advisor understand your <strong>real</strong> eating patterns - not just one "perfect" day.
          </p>
          <p className="font-medium text-gray-700">Once complete, you'll unlock:</p>
          <ul className="space-y-1.5 ml-1">
            <li className="flex items-start gap-2">
              <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
              Personalized nutrition insights
            </li>
            <li className="flex items-start gap-2">
              <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
              Smarter grocery swap suggestions
            </li>
            <li className="flex items-start gap-2">
              <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
              Recommendations based on YOUR habits
            </li>
          </ul>
          <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
            The more accurate your logs, the better your insights!
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Smart Suggestions Popup - Shows meal/snack ideas based on remaining calories
 */
function SmartSuggestionsPopup({ remainingCalories, profile, onClose }) {
  const restrictions = profile?.restrictions?.toLowerCase() || '';
  const isVegetarian = restrictions.includes('vegetarian') || restrictions.includes('vegan');
  const isDairyFree = restrictions.includes('dairy') || restrictions.includes('lactose');

  const filterSuggestions = (items) => {
    return items.filter(item => {
      if (isVegetarian && item.hasMeat) return false;
      if (isDairyFree && item.hasDairy) return false;
      return true;
    });
  };

  const dinnerSuggestions = filterSuggestions([
    { text: 'Grilled chicken breast with roasted vegetables', cal: '~500 cal', hasMeat: true },
    { text: 'Salmon with quinoa and steamed broccoli', cal: '~550 cal', hasMeat: true },
    { text: 'Turkey stir-fry with brown rice', cal: '~480 cal', hasMeat: true },
    { text: 'Tofu and vegetable curry with rice', cal: '~520 cal' },
    { text: 'Pasta primavera with olive oil', cal: '~550 cal' },
    { text: 'Bean and vegetable burrito bowl', cal: '~500 cal' },
  ]);

  const snackSuggestions = filterSuggestions([
    { text: 'Greek yogurt with berries', cal: '~150 cal', hasDairy: true },
    { text: 'Apple with 2 tbsp almond butter', cal: '~250 cal' },
    { text: 'Handful of almonds (~23 nuts)', cal: '~165 cal' },
    { text: 'Protein shake', cal: '~120 cal' },
    { text: 'Cottage cheese with fruit', cal: '~180 cal', hasDairy: true },
    { text: 'Hummus with veggie sticks', cal: '~150 cal' },
  ]);

  const lightSnackSuggestions = filterSuggestions([
    { text: 'Small apple', cal: '~80 cal' },
    { text: 'Cup of berries', cal: '~85 cal' },
    { text: 'String cheese', cal: '~80 cal', hasDairy: true },
    { text: 'Hard boiled egg', cal: '~78 cal' },
    { text: 'Small handful of almonds (10-12)', cal: '~80 cal' },
    { text: 'Celery with 1 tbsp peanut butter', cal: '~100 cal' },
  ]);

  let content, title, tipText;

  if (remainingCalories > 500) {
    title = `You have ~${remainingCalories.toLocaleString()} calories remaining today`;
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
    tipText = "Going slightly over occasionally is totally fine! Consistency over perfection.";
    content = (
      <div>
        <p className="text-sm text-gray-600 mb-3">You have ~{remainingCalories} calories remaining.</p>
        <p className="text-sm font-medium text-gray-700 mb-2">If you're still hungry, consider:</p>
        <ul className="space-y-1.5">
          {lightSnackSuggestions.slice(0, 4).map((item, i) => (
            <li key={i} className="text-sm text-gray-600 flex justify-between">
              <span>• {item.text}</span>
              <span className="text-gray-400 ml-2">{item.cal}</span>
            </li>
          ))}
          <li className="text-sm text-gray-600">• Raw veggies (cucumber, celery, peppers)</li>
        </ul>
      </div>
    );
  } else {
    const overAmount = Math.abs(remainingCalories);
    title = `You're ~${overAmount.toLocaleString()} calories over your target today`;
    tipText = "Remember: It's about the weekly average, not perfection every single day.";
    content = (
      <div>
        <p className="text-sm text-gray-600 mb-4">No worries! One day doesn't define your progress.</p>
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
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target size={18} className="text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Smart Suggestions</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg -mr-1">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-140px)] px-4 py-4">
          <p className="font-medium text-gray-900 mb-4">{title}</p>
          {content}
          <div className="mt-4 p-3 bg-amber-50 rounded-xl">
            <div className="flex gap-2">
              <Sparkles size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{tipText}</p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-400 text-center">These are estimates. Actual calories may vary.</p>
        </div>
      </div>
    </div>
  );
}

// Nutrition Calibration Section for Home (Toned down version)
function NutritionCalibrationCard() {
  const [calibrationData, setCalibrationData] = useState(null);
  const [showPreviousDays, setShowPreviousDays] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingDay, setEditingDay] = useState(null); // Track which day is being edited (null = today)
  const todayKey = getTodayDayKey();
  const activeDay = editingDay || todayKey; // The day currently being edited
  const profile = getProfile();

  useEffect(() => {
    const data = getCalibrationData();
    // Ensure today has meals initialized (in case synced data has empty meals)
    if (todayKey && CALIBRATION_DAYS.includes(todayKey)) {
      if (!data.days[todayKey]?.meals || data.days[todayKey].meals.length === 0) {
        // Initialize today with default meals
        const defaultMeals = getDefaultMealPattern().map((meal, idx) => ({
          id: `${todayKey}-${meal.type}-${Date.now()}-${idx}`,
          type: meal.type,
          label: meal.label,
          content: '',
          order: idx,
        }));
        data.days[todayKey] = {
          ...data.days[todayKey],
          meals: defaultMeals,
          completed: false,
        };
        saveCalibrationData(data);
      }
    }
    setCalibrationData(data);
  }, [todayKey]);

  // Initialize meals for past day when selected for editing
  useEffect(() => {
    if (editingDay && CALIBRATION_DAYS.includes(editingDay)) {
      const data = getCalibrationData();
      if (!data.days[editingDay]?.meals || data.days[editingDay].meals.length === 0) {
        // Initialize the past day with default meals
        const defaultMeals = getDefaultMealPattern().map((meal, idx) => ({
          id: `${editingDay}-${meal.type}-${Date.now()}-${idx}`,
          type: meal.type,
          label: meal.label,
          content: '',
          order: idx,
        }));
        data.days[editingDay] = {
          ...data.days[editingDay],
          meals: defaultMeals,
          completed: false,
        };
        saveCalibrationData(data);
        setCalibrationData(data);
      }
    }
  }, [editingDay]);

  function handleMealUpdate(dayKey, mealId, content) {
    updateMealById(dayKey, mealId, { content, calorieOverride: null });
    setCalibrationData(getCalibrationData());
  }

  function handleDragStart(e, index) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const meals = [...(calibrationData.days[activeDay]?.meals || [])];
    const [draggedMeal] = meals.splice(dragIndex, 1);
    meals.splice(index, 0, draggedMeal);

    setCalibrationData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [activeDay]: {
          ...prev.days[activeDay],
          meals,
        },
      },
    }));
    setDragIndex(index);
  }

  function handleDragEnd() {
    if (activeDay && calibrationData.days[activeDay]?.meals) {
      reorderDayMeals(activeDay, calibrationData.days[activeDay].meals);
    }
    setDragIndex(null);
  }

  function handleAddMeal(type) {
    if (!activeDay) return;
    addMealToDay(activeDay, type);
    setCalibrationData(getCalibrationData());
    setShowAddMeal(false);
  }

  function handleDeleteMeal(dayKey, mealId) {
    removeMealFromDay(dayKey, mealId);
    setCalibrationData(getCalibrationData());
  }

  if (!calibrationData) return null;

  const progress = getCalibrationProgress();
  const activeDayData = activeDay && CALIBRATION_DAYS.includes(activeDay)
    ? calibrationData.days[activeDay]
    : null;
  const meals = activeDayData?.meals || [];
  const filledCount = meals.filter(m => m.content?.trim()).length;
  const isEditingPastDay = editingDay && editingDay !== todayKey;

  // Get completed days for "View completed days"
  const completedDays = CALIBRATION_DAYS.filter(day =>
    calibrationData.days[day]?.completed ||
    (calibrationData.days[day]?.meals?.some(m => m.content?.trim()) && day !== todayKey)
  );

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Unlock size={18} className="text-amber-600" />
          <span className="font-semibold text-gray-900">Unlock Your Nutrition Profile</span>
        </div>
        <span className="text-sm text-amber-700 font-medium">
          Day {progress.calendarDay || Math.min(progress.completed + 1, 5)} of 5
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-amber-200 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-500"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {/* FEATURE 1: Calorie Progress Section */}
      {activeDayData && meals.length > 0 && (() => {
        const consumedCalories = getTodaysCaloriesFromMeals(meals);
        const targetCalories = calculateDailyCalorieBudget(profile);
        const remainingCalories = targetCalories - consumedCalories;
        const percentUsed = Math.min(100, Math.round((consumedCalories / targetCalories) * 100));
        const isOver = remainingCalories < 0;
        const isApproaching = percentUsed >= 80 && !isOver;

        return (
          <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 uppercase tracking-wide mb-2">
              <span className="font-semibold">{isEditingPastDay ? `${DAY_LABELS[activeDay]}'s Calories` : "Today's Calories"}</span>
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-gray-900">{consumedCalories.toLocaleString()}</span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-500">{targetCalories.toLocaleString()} cal</span>
              </div>

              <button
                onClick={() => setShowSuggestions(true)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                  isOver ? 'text-red-600 hover:bg-red-50' :
                  isApproaching ? 'text-amber-600 hover:bg-amber-50' :
                  'text-green-600 hover:bg-green-50'
                }`}
              >
                {remainingCalories >= 0 ? (
                  <>{remainingCalories.toLocaleString()} remaining</>
                ) : (
                  <>{Math.abs(remainingCalories).toLocaleString()} over</>
                )}
                <Info size={12} />
              </button>
            </div>

            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOver ? 'bg-red-500' :
                  isApproaching ? 'bg-amber-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(percentUsed, 100)}%` }}
              />
            </div>

            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-gray-400">{percentUsed}% of daily target</span>
              {consumedCalories > 0 && !isOver && !isApproaching && (
                <span className="text-xs text-green-600">On track</span>
              )}
              {isApproaching && (
                <span className="text-xs text-amber-600">Approaching target</span>
              )}
              {isOver && (
                <span className="text-xs text-red-600">Over target</span>
              )}
            </div>
          </div>
        );
      })()}

      {/* Active Day's Meals - Toned down date header */}
      {activeDayData && (
        <div className="mb-4">
          {/* Day Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-200">
            <div className="flex items-center gap-2">
              {isEditingPastDay ? (
                <>
                  <span className="text-sm font-medium text-gray-700">{DAY_LABELS[activeDay]}</span>
                  <span className="text-xs text-purple-600 font-medium">· Editing</span>
                  {activeDayData.completed && (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Completed</span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-gray-700">{formatSimpleDate()}</span>
                  <span className="text-xs text-amber-600 font-medium">· Today</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{filledCount} of {meals.length} logged</span>
              {isEditingPastDay && (
                <button
                  onClick={() => setEditingDay(null)}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                >
                  ← Back to today
                </button>
              )}
            </div>
          </div>

          {/* Meal Slots */}
          <div className="space-y-2">
            {meals.map((meal, index) => (
              <DraggableMealSlot
                key={meal.id}
                meal={meal}
                dayKey={activeDay}
                index={index}
                onUpdate={handleMealUpdate}
                onSaveCalories={() => setCalibrationData(getCalibrationData())}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDelete={handleDeleteMeal}
                isDragging={dragIndex === index}
                canDelete={meals.length > 2}
              />
            ))}
          </div>

          {/* Add Meal Button */}
          <div className="mt-2">
            {showAddMeal ? (
              <div className="p-3 bg-white/60 rounded-lg border border-amber-200">
                <p className="text-xs text-gray-600 mb-2">Add a meal slot:</p>
                <div className="flex flex-wrap gap-1">
                  {ALL_MEAL_TYPES.slice(0, 6).map(type => (
                    <button
                      key={type.id}
                      onClick={() => handleAddMeal(type.id)}
                      className="px-2 py-1 text-xs bg-white border border-gray-200 rounded-lg hover:border-amber-300 hover:bg-amber-50"
                    >
                      + {type.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowAddMeal(false)}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddMeal(true)}
                className="text-xs text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                <Plus size={12} /> Add another meal slot
              </button>
            )}
          </div>
        </div>
      )}

      {/* FEATURE 3: Combined Day Progress + Completed Days Dropdown */}
      <div className="mt-4 pt-3 border-t border-amber-200">
        {/* Encouraging message with dropdown toggle */}
        <button
          onClick={() => setShowPreviousDays(!showPreviousDays)}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-amber-100/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">
              {progress.remaining === 0 ? '🎉' :
               progress.completed === 0 ? '🚀' :
               progress.completed === 1 ? '🌱' :
               progress.completed === 2 ? '💪' :
               progress.completed === 3 ? '⭐' : '🔥'}
            </span>
            <span className="text-sm font-medium text-amber-800">
              Day {progress.calendarDay || Math.min(progress.completed + 1, 5)} of 5
              {progress.completed > 0 && progress.remaining > 0 && " - Keep it up!"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-amber-600">
            <span className="text-xs">View completed days</span>
            {showPreviousDays ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </button>

        {/* Expanded dropdown with all days */}
        {showPreviousDays && (
          <div className="mt-3 bg-white rounded-xl border border-amber-100 overflow-hidden">
            {CALIBRATION_DAYS.map(day => {
              const dayData = calibrationData.days[day];
              const dayMeals = dayData?.meals || [];
              const dayFilledCount = dayMeals.filter(m => m.content?.trim()).length;
              const isToday = day === todayKey;
              const dayCalories = getTodaysCaloriesFromMeals(dayMeals);

              // Get day status
              let statusIcon, statusColor;
              const isPast = (() => {
                const dayOrderMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
                return dayOrderMap[day] < new Date().getDay();
              })();
              if (dayData?.completed) {
                statusIcon = '✓';
                statusColor = 'text-green-600 bg-green-100';
              } else if (isToday) {
                statusIcon = '●';
                statusColor = 'text-blue-600 bg-blue-100';
              } else if (isPast && dayFilledCount > 0 && !canCompleteDay(day)) {
                statusIcon = '!';
                statusColor = 'text-orange-600 bg-orange-100'; // incomplete — not enough meals
              } else if (isPast && dayFilledCount > 0) {
                statusIcon = '✓';
                statusColor = 'text-green-600 bg-green-100'; // filled enough to be complete
              } else if (isPast) {
                statusIcon = '○';
                statusColor = 'text-gray-400 bg-gray-100'; // past, no data
              } else {
                statusIcon = '○';
                statusColor = 'text-gray-400 bg-gray-100';
              }

              // Get the actual date for this day
              const today = new Date();
              const todayDayIndex = today.getDay();
              const dayOrder = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
              const targetDayIndex = dayOrder[day];
              const diff = targetDayIndex - todayDayIndex;
              const targetDate = new Date(today);
              targetDate.setDate(today.getDate() + diff);

              // Check if this day is editable (not a future day)
              const isFuture = dayOrder[day] > todayDayIndex && day !== todayKey;
              const isEditable = !isFuture || dayData?.completed || dayFilledCount > 0;
              const isCurrentlyEditing = editingDay === day || (editingDay === null && isToday);

              return (
                <button
                  key={day}
                  onClick={() => {
                    if (isEditable) {
                      setEditingDay(day === todayKey ? null : day);
                      setShowPreviousDays(false);
                    }
                  }}
                  disabled={!isEditable}
                  className={`w-full flex items-center justify-between px-3 py-2.5 border-b border-gray-100 last:border-b-0 transition-colors ${
                    isCurrentlyEditing ? 'bg-primary-50 border-l-2 border-l-primary-500' :
                    isToday ? 'bg-blue-50 hover:bg-blue-100' :
                    isEditable ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${statusColor}`}>
                      {statusIcon}
                    </span>
                    <div className="text-left">
                      <span className="text-sm font-medium text-gray-800">
                        {DAY_LABELS[day]}
                        {isToday && <span className="text-blue-600 ml-1">(Today)</span>}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {dayData?.completed ? (
                          `Complete${dayCalories > 0 ? ` (${dayCalories.toLocaleString()} cal)` : ''}`
                        ) : isToday ? (
                          `In Progress${dayCalories > 0 ? ` (${dayCalories.toLocaleString()} cal)` : ''}`
                        ) : isPast && dayFilledCount > 0 && !canCompleteDay(day) ? (
                          `Incomplete — needs at least 2 meals`
                        ) : isPast && dayFilledCount > 0 ? (
                          `Complete${dayCalories > 0 ? ` (${dayCalories.toLocaleString()} cal)` : ''}`
                        ) : dayFilledCount > 0 ? (
                          `${dayFilledCount} meals logged`
                        ) : (
                          'Not started'
                        )}
                      </span>
                    </div>
                  </div>
                  {isEditable && (
                    <span className="text-xs text-gray-400">
                      {isCurrentlyEditing ? 'Editing' : 'Tap to edit'}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Encouragement message */}
            <div className="px-3 py-2.5 bg-amber-50 text-center">
              <p className="text-xs text-amber-700">
                {progress.remaining > 0
                  ? `${progress.remaining} more day${progress.remaining > 1 ? 's' : ''} until your personalized insights unlock! 🎉`
                  : 'Your personalized insights are ready! 🎉'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Smart Suggestions Popup */}
      {showSuggestions && (
        <SmartSuggestionsPopup
          remainingCalories={(() => {
            const consumed = getTodaysCaloriesFromMeals(meals);
            const target = calculateDailyCalorieBudget(profile);
            return target - consumed;
          })()}
          profile={profile}
          onClose={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
}

// Simple Focus Goal Card for Home (with edit target and view entries)
// ============================================
// NEW FOCUS GOALS SYSTEM
// ============================================

// Add Goal Form
function AddGoalForm({ onAdd, onCancel }) {
  const [text, setText] = useState('');
  const [target, setTarget] = useState(3);
  const [unit, setUnit] = useState('times');
  const [type, setType] = useState('recurring');

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const result = onAdd({ text, target, unit, type });
    if (result?.success) {
      setText('');
      onCancel();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-3 space-y-3 border border-gray-200">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g., Run 3 times this week"
        className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
        autoFocus
      />
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setTarget(Math.max(1, target - 1))}
            className="w-7 h-7 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center justify-center text-sm font-semibold">-</button>
          <span className="text-sm font-bold w-6 text-center">{target}</span>
          <button type="button" onClick={() => setTarget(Math.min(14, target + 1))}
            className="w-7 h-7 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center justify-center text-sm font-semibold">+</button>
        </div>
        <select value={unit} onChange={(e) => setUnit(e.target.value)}
          className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white">
          <option value="times">times</option>
          <option value="days">days</option>
          <option value="lbs">lbs</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}
          className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white">
          <option value="recurring">Recurring</option>
          <option value="one-time">One-time</option>
        </select>
        <div className="flex-1" />
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
        <button type="submit" disabled={!text.trim()}
          className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">Add</button>
      </div>
    </form>
  );
}

// Single Goal Card for new system
function GoalCard({ goal, onIncrement, onEdit, onRemove, goalHistory }) {
  const [showEntries, setShowEntries] = useState(false);
  const isComplete = goal.status === 'completed';
  const isCarried = !!goal.carriedFrom;
  const isAutoCompleted = isComplete && goal.autoCompleted && !goal.confirmedComplete;
  const progressPercent = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
  const activities = goal.contributingActivities || [];

  // Look up previous week progress for carried goals
  let prevProgress = null;
  if (isCarried && goalHistory) {
    const prevWeek = goalHistory.find(h => h.weekOf === goal.carriedFrom);
    if (prevWeek) {
      const prevGoal = prevWeek.goals.find(g => g.text === goal.text);
      if (prevGoal) prevProgress = { current: prevGoal.current, target: prevGoal.target };
    }
  }

  let bgColor = 'bg-white';
  let progressFillColor = 'bg-green-500';

  if (isComplete) {
    bgColor = 'bg-green-50';
    progressFillColor = 'bg-green-500';
  } else if (isCarried) {
    bgColor = 'bg-amber-50';
    progressFillColor = 'bg-amber-500';
  } else if (goal.current > 0) {
    progressFillColor = 'bg-green-500';
  } else {
    progressFillColor = 'bg-gray-300';
  }

  return (
    <div className={`rounded-xl ${bgColor} border border-gray-200 p-3`}>
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="mt-0.5 flex-shrink-0">
          {isComplete ? (
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <Check size={12} className="text-white" />
            </div>
          ) : isCarried ? (
            <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
              <RefreshCw size={10} className="text-white" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
          )}
        </div>

        {/* Goal content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`text-sm leading-snug ${isComplete ? 'text-green-700' : 'text-gray-800'}`}>
                {goal.text}
                {isComplete && goal.current >= goal.target && ' \ud83c\udf89'}
              </p>
              {isCarried && (
                <p className="text-xs text-amber-600 mt-0.5">
                  Carried from last week{prevProgress ? ` (was ${prevProgress.current}/${prevProgress.target})` : ''}
                </p>
              )}
              {isComplete && goal.autoCompleted && !goal.confirmedComplete && (
                <p className="text-xs text-green-600 mt-0.5">Auto-completed! Will confirm in Sunday check-in</p>
              )}
            </div>
          </div>

          {/* Progress bar row */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${progressFillColor} rounded-full transition-all duration-500`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <span className={`text-xs font-semibold min-w-[32px] text-right ${
              isComplete ? 'text-green-600' : 'text-gray-500'
            }`}>
              {goal.current}/{goal.target}
            </span>

            {/* Action buttons */}
            <div className="flex items-center gap-0.5 ml-1">
              {(!isComplete || isAutoCompleted) && (
                <button
                  onClick={(e) => { e.stopPropagation(); onIncrement?.(goal.id); }}
                  className="px-1.5 py-0.5 text-xs font-semibold text-green-600 hover:bg-green-50 active:bg-green-100 rounded transition-colors border border-green-200"
                  title="Log +1"
                >
                  +1
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onEdit?.(goal); }}
                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Edit goal"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove?.(goal.id); }}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove goal"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Contributing entries toggle */}
          {activities.length > 0 && (
            <button
              onClick={() => setShowEntries(!showEntries)}
              className="mt-1.5 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showEntries ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {activities.length} {activities.length === 1 ? 'entry' : 'entries'}
            </button>
          )}

          {/* Expanded entries list */}
          {showEntries && activities.length > 0 && (
            <div className="mt-2 space-y-1 pl-1 border-l-2 border-gray-200 ml-1">
              {activities.map((a, i) => {
                const dayName = new Date(a.timestamp).toLocaleDateString('en-US', { weekday: 'short' });
                const summary = a.summary || a.rawText || '';
                return (
                  <p key={a.id || i} className="text-xs text-gray-500 pl-2 leading-snug">
                    <span className="font-medium text-gray-600">{dayName}:</span>{' '}
                    {summary.length > 60 ? summary.slice(0, 60) + '...' : summary}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Edit Goal Modal
function EditGoalModal({ goal, onSave, onClose }) {
  const [text, setText] = useState(goal.text);
  const [target, setTarget] = useState(goal.target);
  const [type, setType] = useState(goal.type);

  function handleSave() {
    updateGoal(goal.id, { text, target, type });
    onSave();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-900 mb-3">Edit Goal</h3>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Target:</span>
            <button onClick={() => setTarget(Math.max(1, target - 1))}
              className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center justify-center text-lg font-semibold">-</button>
            <span className="text-xl font-bold text-gray-900 w-8 text-center">{target}</span>
            <button onClick={() => setTarget(Math.min(14, target + 1))}
              className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center justify-center text-lg font-semibold">+</button>
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white">
            <option value="recurring">Recurring</option>
            <option value="one-time">One-time</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Save</button>
        </div>
      </div>
    </div>
  );
}

// Goal History Modal
function GoalHistoryModal({ onClose }) {
  const history = getGoalHistory();
  const currentGoals = getGoalsWithProgress();
  const streaks = getGoalStreaks();
  const currentWeek = getCurrentWeekOf();

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            <h3 className="font-semibold text-gray-900">Goal History</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-60px)] px-4 py-4 space-y-5">
          {/* Streaks */}
          {streaks.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Streaks</p>
              {streaks.map((s, i) => (
                <p key={i} className="text-sm text-amber-800">
                  \ud83d\udd25 {s.text}: {s.weeks} weeks running
                </p>
              ))}
            </div>
          )}

          {/* Current week */}
          {currentGoals.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Week of {new Date(currentWeek + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (current)
              </p>
              {currentGoals.map(g => (
                <div key={g.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span>{g.status === 'completed' ? '\u2705' : g.carriedFrom ? '\ud83d\udd04' : '\u25cb'}</span>
                    <span className="text-sm text-gray-800">{g.text}</span>
                  </div>
                  <span className="text-xs text-gray-500">({g.current}/{g.target})</span>
                </div>
              ))}
            </div>
          )}

          {/* Past weeks */}
          {history.map((week, wi) => (
            <div key={wi}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Week of {new Date(week.weekOf + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
              {week.goals.map((g, gi) => (
                <div key={gi} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span>{g.status === 'completed' ? '\u2705' : '\u274c'}</span>
                    <span className="text-sm text-gray-800">{g.text}</span>
                  </div>
                  <span className="text-xs text-gray-500">({g.current}/{g.target})</span>
                </div>
              ))}
            </div>
          ))}

          {history.length === 0 && currentGoals.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No goal history yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Focus Goals Section for Home — NEW system
function FocusGoalsCard() {
  const [goals, setGoals] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState(null);
  const goalHistory = useMemo(() => getGoalHistory(), [goals]);

  useEffect(() => {
    setGoals(getGoalsWithProgress());
  }, []);

  function handleRefresh() {
    setGoals(getGoalsWithProgress());
  }

  function handleAddGoal(goalData) {
    const result = addGoal(goalData);
    if (!result.success) {
      setToast(result.error);
      setTimeout(() => setToast(null), 3000);
      return result;
    }
    handleRefresh();
    return result;
  }

  function handleIncrement(goalId) {
    const updatedGoal = incrementGoal(goalId);
    handleRefresh();
    if (updatedGoal?.autoCompleted) {
      setToast(`\ud83c\udf89 Goal complete: ${updatedGoal.text}!`);
      setTimeout(() => setToast(null), 4000);
    }
  }

  function handleRemove(goalId) {
    removeGoal(goalId);
    handleRefresh();
  }

  const completedCount = goals.filter(g => g.status === 'completed').length;
  const lastWeek = getLastWeekSummary();
  const currentWeek = getCurrentWeekOf();
  const weekLabel = new Date(currentWeek + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      {/* Toast notification */}
      {toast && (
        <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 animate-slide-up">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-green-600" />
          <span className="font-semibold text-gray-900">This Week's Focus</span>
        </div>
        <span className="text-xs text-gray-400">Week of {weekLabel}</span>
      </div>

      {/* Goals list */}
      {goals.length > 0 ? (
        <div className="space-y-2">
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              goalHistory={goalHistory}
              onIncrement={handleIncrement}
              onEdit={(g) => setEditingGoal(g)}
              onRemove={handleRemove}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">No goals set for this week</p>
          <p className="text-xs text-gray-400 mt-1">Add up to 3 focus goals to stay on track</p>
        </div>
      )}

      {/* Add Goal */}
      {showAddForm ? (
        <div className="mt-3">
          <AddGoalForm onAdd={handleAddGoal} onCancel={() => setShowAddForm(false)} />
        </div>
      ) : canAddGoal() && (
        <button
          onClick={() => setShowAddForm(true)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-sm text-green-600 hover:bg-green-50 border border-dashed border-green-300 rounded-xl transition-colors"
        >
          <Plus size={14} /> Add Goal
        </button>
      )}

      {/* Last week summary + history link */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        {lastWeek ? (
          <span className="text-xs text-gray-500">
            <Trophy size={12} className="inline text-amber-500 mr-1" />
            Last week: {lastWeek.completed} of {lastWeek.total} goals completed
          </span>
        ) : (
          <span className="text-xs text-gray-400">
            {completedCount} of {goals.length} done this week
          </span>
        )}
        <button
          onClick={() => setShowHistory(true)}
          className="text-xs text-green-600 hover:text-green-700"
        >
          View History
        </button>
      </div>

      {/* Edit Goal Modal */}
      {editingGoal && (
        <EditGoalModal
          goal={editingGoal}
          onSave={handleRefresh}
          onClose={() => setEditingGoal(null)}
        />
      )}

      {/* History Modal */}
      {showHistory && (
        <GoalHistoryModal onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}

// Key Principles Section - Blue Background
function KeyPrinciplesCard({ expanded, onToggle }) {
  const [playbook, setPlaybook] = useState(null);

  useEffect(() => {
    setPlaybook(getPlaybook());
  }, []);

  const principles = playbook?.principles || [];
  if (principles.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Compass size={18} className="text-blue-600" />
          <span className="font-semibold text-gray-900">Key Principles</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{principles.length} habits</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>

      {!expanded && (
        <p className="text-sm text-gray-500 mt-2">
          Your foundational habits for reaching your goals
        </p>
      )}

      {/* Expanded content - Blue background cards */}
      {expanded && (
        <div className="mt-4 space-y-3">
          {principles.map((principle, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <span className="text-sm font-medium text-blue-600 w-5 flex-shrink-0">
                {idx + 1}.
              </span>
              <p className="text-sm text-gray-700">{principle.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Nutrition Profile Summary Card - Orange/Amber accent
function NutritionProfileCard({ onNavigate }) {
  const [profile, setProfile] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const userProfile = getProfile();

  useEffect(() => {
    if (isCalibrationComplete()) {
      setProfile(getNutritionProfile());
    }
  }, []);

  // Only show if calibration is complete
  if (!isCalibrationComplete() || !profile) return null;

  const overview = profile.overview || {};

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-orange-100 rounded-xl">
            <Flame size={18} className="text-orange-600" />
          </div>
          <span className="font-semibold text-gray-900">Your Nutrition Profile</span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="bg-white/60 rounded-lg p-2 text-center">
          <div className="text-sm font-bold text-orange-700">{overview.estimatedDailyCalories || '~2,000'}</div>
          <div className="text-xs text-gray-500">Calories</div>
        </div>
        <div className="bg-white/60 rounded-lg p-2 text-center">
          <div className="text-sm font-bold text-orange-700">{overview.proteinEstimate || '~80g'}</div>
          <div className="text-xs text-gray-500">Protein</div>
        </div>
        <div className="bg-white/60 rounded-lg p-2 text-center">
          <div className="text-sm font-bold text-orange-700">{overview.carbEstimate || '~250g'}</div>
          <div className="text-xs text-gray-500">Carbs</div>
        </div>
        <div className="bg-white/60 rounded-lg p-2 text-center">
          <div className="text-sm font-bold text-orange-700">{overview.fatEstimate || '~70g'}</div>
          <div className="text-xs text-gray-500">Fats</div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="space-y-3 pt-3 border-t border-orange-200">
          {profile.strengths?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase mb-1">Strengths</div>
              <ul className="text-sm text-gray-700 space-y-1">
                {profile.strengths.slice(0, 2).map((s, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {profile.gaps?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase mb-1">Areas to Improve</div>
              <ul className="text-sm text-gray-700 space-y-1">
                {profile.gaps.slice(0, 2).map((g, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <Target size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {profile.recommendations?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase mb-1">Top Recommendation</div>
              <p className="text-sm text-gray-700 flex items-start gap-1">
                <Sparkles size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                {profile.recommendations[0]}
              </p>
            </div>
          )}
        </div>
      )}

      {/* View Full Profile Button */}
      <button
        onClick={() => onNavigate?.('nutrition')}
        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-200 transition-colors"
      >
        View Full Profile
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// Helper to get the next logical meal based on time of day
function getNextMealType() {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 17) return 'snack';
  return 'dinner';
}

// Helper to parse meal type from input text
function parseMealInput(input) {
  const text = input.trim();

  // Common patterns: "breakfast - eggs", "breakfast: eggs", "breakfast, eggs", "breakfast eggs"
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'snacks', 'dessert', 'brunch'];
  const patterns = [
    /^(breakfast|lunch|dinner|snack|snacks|dessert|brunch)\s*[-:,]\s*(.+)$/i,
    /^(breakfast|lunch|dinner|snack|snacks|dessert|brunch)\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let type = match[1].toLowerCase();
      if (type === 'snacks') type = 'snack';
      return {
        type,
        label: type.charAt(0).toUpperCase() + type.slice(1),
        content: match[2].trim(),
      };
    }
  }

  // Check if input starts with a meal type word
  const lowerText = text.toLowerCase();
  for (const mealType of mealTypes) {
    if (lowerText.startsWith(mealType + ' ')) {
      let type = mealType;
      if (type === 'snacks') type = 'snack';
      return {
        type,
        label: type.charAt(0).toUpperCase() + type.slice(1),
        content: text.slice(mealType.length).trim(),
      };
    }
  }

  // No meal type found - use time-based default
  const defaultType = getNextMealType();
  return {
    type: defaultType,
    label: defaultType.charAt(0).toUpperCase() + defaultType.slice(1),
    content: text,
  };
}

// Meal type icons
const MEAL_ICONS = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
  dessert: '🍰',
  brunch: '🥂',
};

// Today's Meals Tracker Card - Simplified ongoing tracking
function TodaysMealsCard() {
  const [meals, setMeals] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [calorieTarget, setCalorieTarget] = useState(2000);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const profile = getProfile();

  useEffect(() => {
    // Only show if calibration is complete
    if (isCalibrationComplete()) {
      const enabled = isOngoingTrackingEnabled();
      setTrackingEnabled(enabled);

      if (enabled) {
        setMeals(getTodayMeals());
      }

      // Get calorie target from nutrition profile
      const nutritionProfile = getNutritionProfile();
      if (nutritionProfile?.overview?.estimatedDailyCalories) {
        const cal = parseInt(nutritionProfile.overview.estimatedDailyCalories.replace(/[^0-9]/g, ''));
        if (cal > 0) setCalorieTarget(cal);
      }
    }
  }, []);

  // Don't show if calibration not complete
  if (!isCalibrationComplete()) return null;

  // Check tracking mode directly
  const trackingMode = getTrackingMode();

  // If user explicitly paused, don't show the card
  if (trackingMode === TRACKING_MODES.PAUSED) return null;

  // If user hasn't chosen yet (null), show opt-in prompt
  if (!trackingEnabled && trackingMode === null) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <Utensils size={18} className="text-emerald-600" />
          </div>
          <span className="font-semibold text-gray-900">Continue Tracking Meals?</span>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          You've completed your nutrition calibration! Would you like to keep logging meals to track your daily calories?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setTrackingMode(TRACKING_MODES.DETAILED);
              setTrackingEnabled(true);
              setMeals(getTodayMeals());
            }}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Yes, keep tracking
          </button>
          <button
            onClick={() => {
              setTrackingMode(TRACKING_MODES.PAUSED);
            }}
            className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    );
  }

  // If tracking not enabled at this point, don't show
  if (!trackingEnabled) return null;

  const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const remaining = calorieTarget - totalCalories;
  const percentage = Math.min(100, Math.round((totalCalories / calorieTarget) * 100));

  async function handleAddMeal() {
    if (!inputValue.trim()) return;

    setIsAdding(true);
    try {
      // Parse meal type and content from input
      const { type, label, content } = parseMealInput(inputValue);

      // Estimate calories with AI/rules (use just the food content, not the meal type prefix)
      const estimate = await getCachedOrRuleBased(content, profile);

      addTodayMeal({
        type,
        label,
        content,
        calories: estimate?.total || null,
        calorieItems: estimate?.items || [],
      });

      setMeals(getTodayMeals());
      setInputValue('');
    } catch (err) {
      console.error('Failed to add meal:', err);
    } finally {
      setIsAdding(false);
    }
  }

  function handleRemoveMeal(mealId) {
    removeTodayMeal(mealId);
    setMeals(getTodayMeals());
  }

  // Get the next suggested meal type for placeholder
  const nextMeal = getNextMealType();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <Utensils size={18} className="text-emerald-600" />
          </div>
          <span className="font-semibold text-gray-900">Today's Meals</span>
        </div>
        <div className="text-sm font-medium text-emerald-600">
          {totalCalories} / {calorieTarget} cal
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              percentage > 100 ? 'bg-red-400' : percentage > 80 ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{percentage}% of daily target</span>
          <span>{remaining > 0 ? `${remaining} cal remaining` : `${Math.abs(remaining)} cal over`}</span>
        </div>
      </div>

      {/* Meal List */}
      {meals.length > 0 && (
        <div className="space-y-2 mb-4">
          {meals.map(meal => (
            <div
              key={meal.id}
              className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <span className="text-lg flex-shrink-0">{MEAL_ICONS[meal.type] || '🍽️'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">{meal.label}</span>
                    {meal.calories && (
                      <span className="text-xs text-emerald-600 font-medium">{meal.calories} cal</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 mt-0.5">{meal.content}</p>
                </div>
              </div>
              <button
                onClick={() => handleRemoveMeal(meal.id)}
                className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Instruction Text */}
      <p className="text-xs text-gray-500 mb-2">
        Tell me the meal type and what you ate (e.g., "breakfast - 3 eggs and toast" or "lunch: big salad with chicken")
      </p>

      {/* Quick Add Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddMeal()}
          placeholder={`${nextMeal} - what did you eat?`}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          disabled={isAdding}
        />
        <button
          onClick={handleAddMeal}
          disabled={isAdding || !inputValue.trim()}
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        </button>
      </div>

      {meals.length === 0 && (
        <p className="text-center text-sm text-gray-400 mt-3">
          No meals logged yet today. Start tracking!
        </p>
      )}
    </div>
  );
}

// Playbook Link Card - Indigo accent
function PlaybookLinkCard({ onViewPlaybook }) {
  const [playbook, setPlaybook] = useState(null);
  const profile = getProfile();

  useEffect(() => {
    setPlaybook(getPlaybook());
  }, []);

  // Get goal description from profile - use safe helper
  const goalsArr = getGoalsArray(profile?.goals);
  const goalText = goalsArr.length > 0
    ? `your goal to ${goalsArr[0].replace(/_/g, ' ')}`
    : 'reaching your health goals';

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-5 border-l-4 border-l-indigo-400">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-indigo-100 rounded-xl">
          <BookOpen size={20} className="text-indigo-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">Your Playbook</h3>
          <p className="text-sm text-gray-600 mb-4">
            Your personalized strategy based on your goals, habits, and what we've learned together.
          </p>
          <button
            onClick={onViewPlaybook}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            View Full Playbook
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Weekly Wins Section - Gold accent
function WeeklyWinsCard({ expanded, onToggle }) {
  const [wins, setWins] = useState([]);

  useEffect(() => {
    setWins(generateWeeklyWins());
  }, []);

  if (wins.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-yellow-500" />
          <span className="font-semibold text-gray-900">Weekly Wins</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{wins.length} win{wins.length > 1 ? 's' : ''}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>

      {!expanded && (
        <p className="text-sm text-gray-500 mt-2">
          {wins.length} win{wins.length > 1 ? 's' : ''} this week - nice work!
        </p>
      )}

      {/* Expanded content - Gold/yellow */}
      {expanded && (
        <div className="mt-4 space-y-2">
          {wins.map((win, idx) => {
            const Icon = getWinIcon(win.icon);
            return (
              <div key={idx} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                <Check size={16} className="text-yellow-600 flex-shrink-0" />
                <span className="text-sm text-gray-700 flex-1">{win.text}</span>
                <Icon size={16} className="text-yellow-500" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Check-in Banner - Shows when check-in is available
function CheckInBanner({ onStartCheckIn }) {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // const today = new Date().getDay();
    // const sunday = today === 0;
    const hasCompletedThisWeek = getCurrentWeekCheckIn() !== null;

    // TESTING: Show on any day (revert to Sunday-only later)
    // setShowBanner(sunday && !hasCompletedThisWeek);
    setShowBanner(!hasCompletedThisWeek);
  }, []);

  if (!showBanner) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-4 text-white">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-xl flex-shrink-0">
          <Edit3 size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            Weekly check-in ready! I've summarized your week.
          </p>
        </div>
        <button
          onClick={onStartCheckIn}
          className="flex-shrink-0 px-3 py-1.5 bg-white text-indigo-600 text-sm font-medium rounded-lg hover:bg-white/90 transition-colors flex items-center gap-1"
        >
          Complete Check-in
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// Detailed Focus Goal Card for Playbook (with icon-only buttons)
function DetailedFocusGoalCard({ item, index, onEditTarget, onRefresh }) {
  const [showEntries, setShowEntries] = useState(false);
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);

  const Icon = item.progress?.trackable ? getFocusIcon(item.progress.type) : Target;
  const isComplete = item.progress?.complete;
  const hasProgress = item.progress?.current > 0;
  const progressPercent = item.progress?.trackable
    ? Math.round((item.progress.current / item.progress.target) * 100)
    : 0;

  // Color scheme - green only
  let bgColor = 'bg-white';
  let progressFillColor = 'bg-green-500';

  if (isComplete) {
    bgColor = 'bg-green-50';
  }

  // Encouragement text
  let encouragement = '';
  if (isComplete) {
    encouragement = 'Great job staying consistent!';
  } else if (progressPercent >= 50) {
    encouragement = "You're over halfway there!";
  } else if (hasProgress) {
    encouragement = 'Keep it up!';
  } else {
    encouragement = 'Give it a shot this week!';
  }

  function handleTargetChange(newTarget) {
    onEditTarget(index, newTarget);
    setShowTargetDropdown(false);
  }

  const activities = item.progress?.contributingActivities || [];

  return (
    <div className={`rounded-lg ${bgColor} border border-gray-200 p-3`}>
      {/* Goal header */}
      <div className="flex items-start gap-2 mb-1.5">
        {isComplete ? (
          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check size={10} className="text-white" />
          </div>
        ) : (
          <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />
        )}
        <span className={`text-sm font-medium ${isComplete ? 'text-green-700' : 'text-gray-800'}`}>
          {item.action}
        </span>
      </div>

      {/* Progress bar */}
      {item.progress?.trackable && (
        <div className="mb-1.5 ml-6">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${progressFillColor} rounded-full transition-all duration-300`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className={`text-xs font-semibold flex-shrink-0 ${
              isComplete ? 'text-green-600' : 'text-gray-600'
            }`}>
              {item.progress.current}/{item.progress.target}
              {isComplete && ' ✓'}
            </span>
          </div>
        </div>
      )}

      {/* Encouragement + buttons on same row */}
      <div className="flex items-center justify-between ml-6">
        <p className="text-[11px] text-gray-500">{encouragement}</p>

        {/* Icon-only action buttons - tiny green */}
        <div className="flex items-center gap-0.5">
          {item.progress?.trackable && (
            <div className="relative">
              <button
                onClick={() => setShowTargetDropdown(!showTargetDropdown)}
                className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                title="Edit target"
              >
                <Pencil size={12} />
              </button>

              {/* Target Dropdown */}
              {showTargetDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[80px]">
                  <p className="px-2 py-0.5 text-[10px] text-gray-500 border-b border-gray-100">Target:</p>
                  {[1, 2, 3, 4, 5, 6, 7].map(num => (
                    <button
                      key={num}
                      onClick={() => handleTargetChange(num)}
                      className={`w-full px-2 py-1 text-left text-xs hover:bg-green-50 flex items-center justify-between ${
                        num === item.progress.target ? 'bg-green-50 text-green-600' : ''
                      }`}
                    >
                      <span>{num}x/wk</span>
                      {num === item.progress.target && <Check size={10} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activities.length > 0 && (
            <button
              onClick={() => setShowEntries(!showEntries)}
              className={`p-1 rounded transition-colors ${
                showEntries
                  ? 'text-green-700 bg-green-200'
                  : 'text-green-600 hover:bg-green-100'
              }`}
              title="View entries"
            >
              <FolderOpen size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded entries */}
      {showEntries && activities.length > 0 && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="space-y-1.5">
            {activities.map((activity, aIdx) => (
              <div key={aIdx} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="text-gray-400">•</span>
                <span>
                  {activity.date && (
                    <span className="font-medium text-gray-500 mr-1">
                      {new Date(activity.date).toLocaleDateString('en-US', { weekday: 'short' })}:
                    </span>
                  )}
                  {activity.summary || activity.rawText?.slice(0, 50)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Full Playbook Modal with indigo theme
function FullPlaybookModal({ isOpen, onClose }) {
  const [playbook, setPlaybook] = useState(null);
  const [focusProgress, setFocusProgress] = useState([]);
  const [wins, setWins] = useState([]);
  const [calibrationData, setCalibrationData] = useState(null);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [editingDay, setEditingDay] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const todayKey = getTodayDayKey();

  useEffect(() => {
    if (isOpen) {
      setPlaybook(getPlaybook());
      setFocusProgress(getWeeklyFocusProgress());
      setWins(generateWeeklyWins());
      setCalibrationData(getCalibrationData());
      // Expand today by default
      setExpandedDay(todayKey);
    }
  }, [isOpen, refreshKey, todayKey]);

  function handleTargetChange(index, newTarget) {
    setCustomTarget(index, newTarget);
    setRefreshKey(k => k + 1);
  }

  function handleMealUpdate(dayKey, mealId, content) {
    updateMealById(dayKey, mealId, { content, calorieOverride: null });
    setCalibrationData(getCalibrationData());
  }

  function handleDragStart(e, index, dayKey) {
    setDragIndex(index);
    setEditingDay(dayKey);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, index, dayKey) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index || editingDay !== dayKey) return;

    const meals = [...(calibrationData.days[dayKey]?.meals || [])];
    const [draggedMeal] = meals.splice(dragIndex, 1);
    meals.splice(index, 0, draggedMeal);

    setCalibrationData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [dayKey]: {
          ...prev.days[dayKey],
          meals,
        },
      },
    }));
    setDragIndex(index);
  }

  function handleDragEnd(dayKey) {
    if (dayKey && calibrationData.days[dayKey]?.meals) {
      reorderDayMeals(dayKey, calibrationData.days[dayKey].meals);
    }
    setDragIndex(null);
    setEditingDay(null);
  }

  if (!isOpen) return null;

  const principles = playbook?.principles || [];
  const radar = playbook?.radar || [];
  const inCalibration = isInCalibrationPeriod() && !isCalibrationComplete();
  const progress = getCalibrationProgress();
  const profile = getProfile();

  // Get goal description
  const goalsArray = getGoalsArray(profile?.goals);
  const goalText = goalsArray.length > 0
    ? `reaching ${goalsArray[0].replace(/_/g, ' ')}`
    : 'reaching your health goals';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl">
        {/* Header - Indigo theme */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <BookOpen size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Your Playbook</h2>
                <p className="text-sm text-white/80">
                  Your personalized strategy for {goalText}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Nutrition Profile - Amber accent */}
          {inCalibration && calibrationData && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Utensils size={16} className="text-amber-600" />
                  Nutrition Profile
                </h3>
                <span className="text-sm text-amber-600 font-medium">
                  Day {progress.calendarDay || Math.min(progress.completed + 1, 5)} of 5
                </span>
              </div>

              {/* Encouragement with info icon */}
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mb-4">
                <div className="flex items-start gap-2">
                  <Target size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800 flex-1">
                    {progress.remaining > 0
                      ? `Keep going! ${progress.remaining} more day${progress.remaining > 1 ? 's' : ''} until your personalized nutrition insights unlock.`
                      : 'Almost there! Complete today to unlock your nutrition profile.'}
                  </p>
                  <button
                    onClick={() => setShowInfoTooltip(true)}
                    className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg flex-shrink-0"
                    title="Why 5 days?"
                  >
                    <Info size={16} />
                  </button>
                </div>
              </div>

              {/* Days list - Today expanded by default */}
              <div className="space-y-3">
                {CALIBRATION_DAYS.map(day => {
                  const dayData = calibrationData.days[day];
                  const dayMeals = dayData?.meals || [];
                  const filledCount = dayMeals.filter(m => m.content?.trim()).length;
                  const isExpanded = expandedDay === day;
                  const isToday = day === todayKey;

                  // Get the actual date for this day of week
                  const today = new Date();
                  const todayDayIndex = today.getDay();
                  const dayOrder = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
                  const targetDayIndex = dayOrder[day];
                  const diff = targetDayIndex - todayDayIndex;
                  const targetDate = new Date(today);
                  targetDate.setDate(today.getDate() + diff);
                  const dateStr = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

                  return (
                    <div key={day} className={`rounded-xl border overflow-hidden ${
                      isToday ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <button
                        onClick={() => setExpandedDay(isExpanded ? null : day)}
                        className={`w-full p-3 flex items-center justify-between transition-colors ${
                          isToday ? 'hover:bg-amber-100/50' : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span className={`text-sm ${isToday ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                            {dateStr}
                          </span>
                          {isToday && (
                            <span className="text-xs text-amber-600 font-medium">· Today</span>
                          )}
                          {dayData?.completed && (
                            <Check size={14} className="text-green-500" />
                          )}
                        </div>
                        <span className="text-sm text-gray-500">{filledCount} of {dayMeals.length} logged</span>
                      </button>

                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-2">
                          {dayMeals.map((meal, index) => (
                            <DraggableMealSlot
                              key={meal.id}
                              meal={meal}
                              dayKey={day}
                              index={index}
                              onUpdate={handleMealUpdate}
                              onSaveCalories={() => setCalibrationData(getCalibrationData())}
                              onDragStart={(e, idx) => handleDragStart(e, idx, day)}
                              onDragOver={(e, idx) => handleDragOver(e, idx, day)}
                              onDragEnd={() => handleDragEnd(day)}
                              onDelete={(dk, id) => {
                                removeMealFromDay(dk, id);
                                setCalibrationData(getCalibrationData());
                              }}
                              isDragging={dragIndex === index && editingDay === day}
                              canDelete={dayMeals.length > 2}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Focus Goals - Green accent with icon buttons */}
          {focusProgress.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Target size={16} className="text-green-600" />
                  Focus Goals for the Week
                </h3>
                <span className="text-sm text-gray-500">
                  {focusProgress.filter(f => f.progress?.complete).length} of {focusProgress.length} done
                </span>
              </div>
              <div className="space-y-2">
                {focusProgress.map((item, idx) => (
                  <DetailedFocusGoalCard
                    key={idx}
                    item={item}
                    index={idx}
                    onEditTarget={handleTargetChange}
                    onRefresh={() => setRefreshKey(k => k + 1)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Key Principles - Blue accent, expanded by default */}
          {principles.length > 0 && (
            <section>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Compass size={16} className="text-blue-600" />
                Key Principles
              </h3>
              <p className="text-sm text-gray-500 mb-3">Your {principles.length} foundational habits</p>
              <div className="space-y-3">
                {principles.map((principle, idx) => (
                  <div key={idx} className="p-4 bg-blue-50 rounded-xl border-l-4 border-blue-400">
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-medium text-blue-600 w-5">
                        {idx + 1}.
                      </span>
                      <div>
                        <p className="text-sm text-gray-800">{principle.text}</p>
                        {principle.why && (
                          <p className="text-xs text-gray-500 mt-1">{principle.why}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Weekly Wins - Gold accent */}
          {wins.length > 0 && (
            <section>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Trophy size={16} className="text-yellow-500" />
                Weekly Wins
              </h3>
              <div className="space-y-2">
                {wins.map((win, idx) => {
                  const WinIcon = getWinIcon(win.icon);
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                      <Check size={16} className="text-yellow-600" />
                      <span className="text-sm text-gray-700 flex-1">{win.text}</span>
                      <WinIcon size={16} className="text-yellow-500" />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* On Your Radar */}
          {radar.length > 0 && (
            <section>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock size={16} className="text-purple-600" />
                On Your Radar
              </h3>
              <div className="space-y-3">
                {radar.map((item, idx) => (
                  <div key={idx} className="p-4 bg-purple-50 rounded-xl border-l-4 border-purple-400">
                    <p className="text-sm text-gray-800">{item.suggestion}</p>
                    {item.timing && (
                      <p className="text-xs text-purple-600 mt-1">{item.timing}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Info Tooltip */}
      <InfoTooltip isOpen={showInfoTooltip} onClose={() => setShowInfoTooltip(false)} />
    </div>
  );
}

// Sync Status Indicator Component
function SyncIndicator({ syncStatus, onRefresh }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing || syncStatus === 'syncing') return;
    setIsRefreshing(true);
    try {
      await onRefresh?.();
      // Reload the page to show fresh data
      window.location.reload();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const isActive = isRefreshing || syncStatus === 'syncing';

  return (
    <button
      onClick={handleRefresh}
      disabled={isActive}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ${
        isActive
          ? 'bg-blue-50 text-blue-600'
          : syncStatus === 'error'
          ? 'bg-red-50 text-red-600 hover:bg-red-100'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
      title={isActive ? 'Syncing...' : 'Tap to refresh from cloud'}
    >
      {syncStatus === 'error' ? (
        <CloudOff size={14} />
      ) : (
        <Cloud size={14} className={isActive ? 'text-blue-500' : ''} />
      )}
      <RefreshCw
        size={12}
        className={isActive ? 'animate-spin' : ''}
      />
      <span className="hidden sm:inline">
        {isActive ? 'Syncing...' : 'Sync'}
      </span>
    </button>
  );
}

// Main HomePage Component
export default function HomePage({ onNavigate, onOpenCheckIn, syncStatus, onRefresh }) {
  const [profile, setProfile] = useState(null);
  const [showPlaybook, setShowPlaybook] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    principles: false,
    wins: false,
  });

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef(null);
  const PULL_THRESHOLD = 80; // Pixels to pull before triggering refresh

  // Check if in calibration period
  const inCalibration = isInCalibrationPeriod() && !isCalibrationComplete();
  const calibrationJustCompleted = isCalibrationComplete();
  const [showCompletionBanner, setShowCompletionBanner] = useState(() => {
    // Show banner if calibration is complete but user hasn't dismissed it yet
    if (!calibrationJustCompleted) return false;
    const dismissed = localStorage.getItem('health-advisor-calibration-banner-dismissed');
    return !dismissed;
  });

  // Load profile on mount and when sync status changes to ready
  useEffect(() => {
    window.scrollTo(0, 0);
    setProfile(getProfile());
  }, [syncStatus]);

  // Pull-to-refresh handlers
  const handleTouchStart = (e) => {
    // Only activate when scrolled to top
    if (window.scrollY === 0 && onRefresh) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling || isRefreshing) return;

    const touchY = e.touches[0].clientY;
    const diff = touchY - touchStartY.current;

    // Only allow pulling down (positive diff) when at top
    if (diff > 0 && window.scrollY === 0) {
      // Apply resistance (pull slows down as you pull more)
      const resistance = Math.min(diff * 0.4, PULL_THRESHOLD + 40);
      setPullDistance(resistance);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;

    if (pullDistance >= PULL_THRESHOLD && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
        window.location.reload();
      } catch (err) {
        console.error('Pull refresh failed:', err);
      } finally {
        setIsRefreshing(false);
      }
    }

    setIsPulling(false);
    setPullDistance(0);
  };

  function toggleSection(section) {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  function handleGoToAdvisor(text, isQuestion = false) {
    // Navigate to advisor with the initial question
    // Pass isQuestion flag to create new chat with smart title
    onNavigate('advisor', null, text, isQuestion);
  }

  function handleActivityLogged() {
    // Refresh focus goals when activity is logged
    setProfile(getProfile());
  }

  function handleStartCheckIn() {
    onOpenCheckIn?.();
  }

  return (
    <div
      ref={containerRef}
      className="bg-gray-50/50 pb-8"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-200"
          style={{ height: isRefreshing ? 50 : pullDistance }}
        >
          <div className={`flex items-center gap-2 text-sm ${
            pullDistance >= PULL_THRESHOLD || isRefreshing ? 'text-primary-600' : 'text-gray-400'
          }`}>
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span>
              {isRefreshing ? 'Refreshing...' : pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* 1. Greeting + Goal Reminder + Quick Entry */}
        <section>
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {getGreeting()}, {profile?.name?.split(' ')[0] || 'there'}
            </h1>
            {onRefresh && <SyncIndicator syncStatus={syncStatus} onRefresh={onRefresh} />}
          </div>
          <GoalReminder profile={profile} />
          <QuickEntryBox
            onSubmit={handleGoToAdvisor}
            onActivityLogged={handleActivityLogged}
          />
        </section>

        {/* 2. Nutrition Calibration (Week 1 only) - No encouragement message on Home */}
        {inCalibration && (
          <section>
            <NutritionCalibrationCard />
          </section>
        )}

        {/* 2b. Calibration Complete Banner */}
        {showCompletionBanner && (
          <section>
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-200 p-5 relative">
              <button
                onClick={() => {
                  setShowCompletionBanner(false);
                  localStorage.setItem('health-advisor-calibration-banner-dismissed', 'true');
                }}
                className="absolute top-3 right-3 p-1 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <Trophy size={24} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-emerald-800 text-lg">Nutrition Profile Unlocked!</h3>
                  <p className="text-emerald-600 text-sm mt-1">
                    Great job completing 5 days of meal tracking. Your personalized nutrition insights are ready!
                  </p>
                  <button
                    onClick={() => {
                      setShowCompletionBanner(false);
                      localStorage.setItem('health-advisor-calibration-banner-dismissed', 'true');
                      // Navigate to Nutrition page using SPA navigation
                      onNavigate?.('nutrition');
                    }}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors"
                  >
                    View Your Nutrition Profile
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 2c. Daily Nutrition Tracker (post-calibration) - Full featured */}
        {isCalibrationComplete() && (
          <section>
            <DailyNutritionTracker />
          </section>
        )}

        {/* 3. Focus Goals - Green, minimal, no buttons */}
        <section>
          <FocusGoalsCard />
        </section>

        {/* 4. Your Playbook card - Indigo */}
        <section>
          <PlaybookLinkCard onViewPlaybook={() => setShowPlaybook(true)} />
        </section>

        {/* 6. Key Principles - Blue (collapsed) */}
        <section>
          <KeyPrinciplesCard
            expanded={expandedSections.principles}
            onToggle={() => toggleSection('principles')}
          />
        </section>

        {/* 7. Weekly Wins - Gold (collapsed, LAST) */}
        <section>
          <WeeklyWinsCard
            expanded={expandedSections.wins}
            onToggle={() => toggleSection('wins')}
          />
        </section>

        {/* 8. Check-in Banner (Sundays only) */}
        <section>
          <CheckInBanner onStartCheckIn={handleStartCheckIn} />
        </section>
      </div>

      {/* Full Playbook Modal */}
      <FullPlaybookModal
        isOpen={showPlaybook}
        onClose={() => setShowPlaybook(false)}
      />
    </div>
  );
}
