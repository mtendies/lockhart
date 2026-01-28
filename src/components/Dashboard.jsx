import { useState, useEffect } from 'react';
import {
  Send,
  Loader2,
  Check,
  X,
  Dumbbell,
  Utensils,
  Moon,
  Scale,
  Droplets,
  Target,
  History,
  Trophy,
  Footprints,
  Brain,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ShoppingCart,
  Sparkles,
  MessageCircle,
  Clock,
  Calendar,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { MealPlacementPopup, OverwriteApprovalPopup } from './AdvisorClarifyPopup';
import { trackAdvisorAddition, approveAddition, removeAddition, getPendingNutritionAdditions } from '../advisorAdditionsStore';
import { getRecentCheckIns } from '../checkInStore';
import { logActivity, getActivities, updateActivity, ACTIVITY_SOURCES } from '../activityLogStore';
import { getWeeklyFocusProgress, setCustomTarget, generateWeeklyWins } from '../weeklyProgressStore';
import { applyPlaybookSuggestion } from '../playbookStore';
import { logSwap, detectCategory, SWAP_SOURCES } from '../swapStore';
import {
  isInCalibrationPeriod,
  isCalibrationComplete,
  getCalibrationData,
  updateMealEntry,
  updateMealById,
  CALIBRATION_DAYS,
  DAY_LABELS,
  MEAL_LABELS,
  getTodayDayKey,
} from '../nutritionCalibrationStore';
import ActivityLog from './ActivityLog';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Icon mapping for weekly wins
function getWinIcon(iconName) {
  const icons = {
    dumbbell: Dumbbell,
    run: Footprints,
    heart: Brain,
    utensils: Utensils,
    moon: Moon,
    footprints: Footprints,
    check: Check,
    scale: Scale,
    calendar: Calendar,
  };
  return icons[iconName] || Check;
}

/**
 * Client-side meal placement detection
 * Returns { mealType, confidence } or null if should ask
 * This serves as a fallback/override for the API's detection
 */
function detectMealPlacement(text) {
  const lower = text.toLowerCase();

  // BREAKFAST - explicit keywords (HIGH confidence)
  const breakfastExplicit = [
    'for breakfast', 'at breakfast', 'breakfast was', 'had for breakfast',
    'breakfast i had', 'breakfast today', 'my breakfast',
  ];
  if (breakfastExplicit.some(kw => lower.includes(kw))) {
    return { mealType: 'breakfast', confidence: 'high' };
  }
  // "breakfast" at word boundary (not "post-breakfast" etc)
  if (/\bbreakfast\b/.test(lower) && !lower.includes('before breakfast') && !lower.includes('post-breakfast') && !lower.includes('pre-breakfast')) {
    return { mealType: 'breakfast', confidence: 'high' };
  }

  // LUNCH - explicit keywords (HIGH confidence)
  const lunchExplicit = [
    'for lunch', 'at lunch', 'lunch was', 'had for lunch', 'lunch i had',
    'lunch today', 'my lunch', 'lunch break', 'at noon', 'around noon',
    'for midday', 'midday meal',
  ];
  if (lunchExplicit.some(kw => lower.includes(kw))) {
    return { mealType: 'lunch', confidence: 'high' };
  }
  if (/\blunch\b/.test(lower)) {
    return { mealType: 'lunch', confidence: 'high' };
  }
  // Time-based lunch detection
  if (/\b(12|1)(pm|:00\s*pm|:30\s*pm)\b/.test(lower) || lower.includes('noon')) {
    return { mealType: 'lunch', confidence: 'medium' };
  }

  // DINNER - explicit keywords (HIGH confidence)
  const dinnerExplicit = [
    'for dinner', 'at dinner', 'dinner was', 'had for dinner', 'dinner i had',
    'dinner today', 'my dinner', 'for supper', 'supper was', 'tonight i had',
    'tonight i ate', 'tonight for', 'this evening i had', 'this evening i ate',
    'evening meal',
  ];
  if (dinnerExplicit.some(kw => lower.includes(kw))) {
    return { mealType: 'dinner', confidence: 'high' };
  }
  if (/\b(dinner|supper)\b/.test(lower)) {
    return { mealType: 'dinner', confidence: 'high' };
  }
  // Time-based dinner detection
  if (/\b(6|7|8)(pm|:00\s*pm|:30\s*pm)\b/.test(lower)) {
    return { mealType: 'dinner', confidence: 'medium' };
  }

  // SNACK - explicit keywords (HIGH confidence)
  const snackExplicit = [
    'had a snack', 'for a snack', 'snacked on', 'quick bite', 'grabbed a snack',
    'afternoon snack', 'morning snack', 'mid-morning snack', 'mid-afternoon snack',
    'late night snack', 'before bed snack', 'evening snack', 'snack time',
    'between meals', 'munchies',
  ];
  if (snackExplicit.some(kw => lower.includes(kw))) {
    return { mealType: 'snacks', confidence: 'high' };
  }
  // "before breakfast" is explicitly a snack
  if (lower.includes('before breakfast') || lower.includes('pre-breakfast')) {
    return { mealType: 'snacks', confidence: 'high' };
  }
  if (/\bsnack\b/.test(lower)) {
    return { mealType: 'snacks', confidence: 'high' };
  }

  // DESSERT - explicit keywords (HIGH confidence)
  const dessertExplicit = [
    'for dessert', 'had dessert', 'dessert was', 'after dinner treat',
    'sweet treat after',
  ];
  if (dessertExplicit.some(kw => lower.includes(kw))) {
    return { mealType: 'dessert', confidence: 'high' };
  }
  if (/\bdessert\b/.test(lower)) {
    return { mealType: 'dessert', confidence: 'high' };
  }

  // AMBIGUOUS MORNING PHRASES - these should ASK, not auto-place
  const ambiguousMorning = [
    'this morning', 'woke up and', 'first thing i', 'started the day',
    'before work', 'on my way to work',
  ];
  if (ambiguousMorning.some(kw => lower.includes(kw))) {
    // Only ambiguous if NO explicit meal keyword was matched above
    // At this point, we know there's no explicit breakfast/lunch/etc keyword
    return null; // Should ask
  }

  // NO MEAL INDICATORS - should ask
  return null;
}

export default function Dashboard({ profile, playbook, onNavigate, onEditProfile, onAskQuestion, onActivityLogged, onPlaybookChange, onProfileUpdate }) {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastLogFeedback, setLastLogFeedback] = useState(null);
  const [pendingSuggestion, setPendingSuggestion] = useState(null);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [calibrationExpanded, setCalibrationExpanded] = useState(false);
  const [clarifyingQuestion, setClarifyingQuestion] = useState(null);
  const [calibrationRefreshKey, setCalibrationRefreshKey] = useState(0);
  const [targetDropdownIndex, setTargetDropdownIndex] = useState(null);
  const [pendingNutritionPlacement, setPendingNutritionPlacement] = useState(null);

  // Close target dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (targetDropdownIndex !== null && !e.target.closest('.target-dropdown')) {
        setTargetDropdownIndex(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [targetDropdownIndex]);

  // Handle target change for focus goals
  function handleTargetChange(index, newTarget) {
    setCustomTarget(index, newTarget);
    setTargetDropdownIndex(null);
    onPlaybookChange?.();
  }

  const weeklyFocus = playbook?.weeklyFocus || [];
  const focusProgress = getWeeklyFocusProgress();
  const weeklyWins = playbook ? generateWeeklyWins() : [];
  const showCalibration = isInCalibrationPeriod() && !isCalibrationComplete();

  // Get icon for activity type
  function getActivityIcon(type) {
    if (type === 'workout') return <Dumbbell size={16} className="text-emerald-600" />;
    if (type === 'nutrition') return <Utensils size={16} className="text-emerald-600" />;
    if (type === 'sleep') return <Moon size={16} className="text-emerald-600" />;
    if (type === 'weight') return <Scale size={16} className="text-emerald-600" />;
    if (type === 'hydration') return <Droplets size={16} className="text-emerald-600" />;
    return <Check size={16} className="text-emerald-600" />;
  }

  async function handleSmartInput() {
    if (!input.trim() || isProcessing) return;

    const text = input.trim();
    setInput('');
    setIsProcessing(true);
    setLastLogFeedback(null);
    setPendingSuggestion(null);

    try {
      const res = await fetch('/api/quick-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          profile,
          playbook,
          weeklyProgress: focusProgress.reduce((acc, f, i) => {
            acc[i] = f.progress;
            return acc;
          }, {}),
        }),
      });

      if (!res.ok) throw new Error('Failed to process entry');

      const result = await res.json();

      // Route questions to chat
      if (result.isQuestion || result.intent === 'question') {
        onAskQuestion?.(text);
        return;
      }

      // Handle playbook edit suggestions
      if (result.intent === 'playbookEdit' && result.playbookSuggestion) {
        setPendingSuggestion({
          type: 'playbook',
          suggestion: result.playbookSuggestion,
          message: result.response?.message || 'Update your playbook?',
        });
        return;
      }

      // Handle target updates
      if (result.intent === 'targetUpdate' && result.targetUpdate) {
        const { index, target } = result.targetUpdate;
        setCustomTarget(index, target);
        onActivityLogged?.();
        setLastLogFeedback({
          type: 'success',
          icon: <Target size={16} className="text-emerald-600" />,
          message: result.response?.message || `Updated target to ${target}x per week`,
        });
        return;
      }

      // Handle profile edit suggestions
      if (result.intent === 'profileEdit' && result.profileSuggestion) {
        setPendingSuggestion({
          type: 'profile',
          suggestion: result.profileSuggestion,
          message: result.response?.message || 'Update your profile?',
        });
        return;
      }

      // Handle grocery swaps
      if (result.intent === 'grocerySwap' && result.swap) {
        logSwap({
          originalProduct: result.swap.originalProduct,
          newProduct: result.swap.newProduct,
          reason: result.swap.reason || '',
          category: result.swap.category || detectCategory(result.swap.newProduct),
          source: SWAP_SOURCES.CHAT,
        });
        setLastLogFeedback({
          type: 'success',
          icon: <ShoppingCart size={16} className="text-emerald-600" />,
          message: result.response?.message || `Swap logged`,
        });
        return;
      }

      // Activity log
      if (result.activity) {
        const activity = logActivity({
          type: result.type,
          subType: result.subType,
          rawText: text,
          data: result.activity.data,
          summary: result.activity.summary,
          goalConnections: result.activity.goalConnections || [],
          encouragement: result.response?.message || null,
          progressNote: result.response?.progressUpdate || null,
          source: ACTIVITY_SOURCES.DASHBOARD,
        });

        // Log to calibration if applicable - with smart Advisor handling
        if (result.type === 'nutrition' && isInCalibrationPeriod() && !isCalibrationComplete()) {
          const calibration = getCalibrationData();
          // Use actual calendar day, not stored currentDay (fixes Tuesday meals bug)
          const todayDay = getTodayDayKey();
          // Only log to calibration if today is a valid calibration day (Mon-Fri)
          const isValidCalibrationDay = CALIBRATION_DAYS.includes(todayDay);
          const currentDay = isValidCalibrationDay ? todayDay : calibration.currentDay;

          if (isValidCalibrationDay && !calibration.days[currentDay]?.completed) {
            const apiPlacement = result.activity?.nutritionPlacement;

            // Use client-side detection as fallback/override when API is uncertain
            const clientDetection = detectMealPlacement(text);

            // Determine final meal type and confidence
            // Priority: API high confidence > client high confidence > API medium > client medium > ask
            let finalMealType = null;
            let finalConfidence = 'low';
            let isExplicitOverwrite = apiPlacement?.isExplicitOverwrite || false;

            if (apiPlacement?.confidence === 'high' && apiPlacement?.mealType) {
              // API is confident - use its result
              finalMealType = apiPlacement.mealType;
              finalConfidence = 'high';
            } else if (clientDetection?.confidence === 'high') {
              // Client-side detected explicit keywords - use client result
              finalMealType = clientDetection.mealType;
              finalConfidence = 'high';
            } else if (apiPlacement?.confidence === 'medium' && apiPlacement?.mealType) {
              // API is medium confident
              finalMealType = apiPlacement.mealType;
              finalConfidence = 'medium';
            } else if (clientDetection?.confidence === 'medium') {
              // Client-side medium confidence
              finalMealType = clientDetection.mealType;
              finalConfidence = 'medium';
            }
            // Otherwise finalMealType stays null and finalConfidence stays 'low'

            // Get current meals for the day
            const dayMeals = calibration.days[currentDay]?.meals || [];

            // Find the target meal if we have a type
            const targetMeal = finalMealType ? dayMeals.find(m => m.type === finalMealType) : null;
            const hasExistingContent = targetMeal?.content?.trim();

            // Determine what to do
            if (!finalMealType || finalConfidence === 'low') {
              // Need to ask user where to place this
              setPendingNutritionPlacement({
                text: result.activity.summary || text,
                rawText: text,
                activityId: activity.id,
                currentDay,
                meals: dayMeals,
              });
            } else if (hasExistingContent && !isExplicitOverwrite) {
              // Would overwrite existing - need approval
              setPendingNutritionPlacement({
                type: 'overwrite',
                text: result.activity.summary || text,
                rawText: text,
                activityId: activity.id,
                currentDay,
                mealType: finalMealType,
                mealId: targetMeal.id,
                mealLabel: targetMeal.label || MEAL_LABELS[finalMealType] || finalMealType,
                existingContent: targetMeal.content,
              });
            } else {
              // Can add without asking
              const newContent = hasExistingContent && !isExplicitOverwrite
                ? `${targetMeal.content}, ${result.activity.summary || text}`
                : (result.activity.summary || text);

              if (targetMeal) {
                updateMealById(currentDay, targetMeal.id, { content: newContent });
              }
              setCalibrationRefreshKey(k => k + 1);

              // Track as advisor addition if we're adding to existing
              if (hasExistingContent) {
                trackAdvisorAddition({
                  type: 'nutrition',
                  day: currentDay,
                  mealId: targetMeal.id,
                  location: targetMeal.label || finalMealType,
                  addedContent: result.activity.summary || text,
                  originalContent: targetMeal.content,
                  reason: `You logged "${text}" - added to ${targetMeal.label || finalMealType}`,
                  sourceText: text,
                });
              }
            }
          }
        }

        onActivityLogged?.();
        setLastLogFeedback({
          type: 'success',
          icon: getActivityIcon(result.type),
          message: result.response?.message || 'Logged!',
        });

        if (result.needsClarification && result.response?.clarifyingQuestion) {
          setClarifyingQuestion({
            activityId: activity.id,
            question: result.response.clarifyingQuestion,
          });
        }
      }
    } catch (err) {
      console.error('Quick entry error:', err);
      // Show user-friendly error message
      setLastLogFeedback({
        type: 'error',
        icon: <AlertCircle size={16} className="text-red-500" />,
        message: err.message?.includes('fetch') || err.message?.includes('network')
          ? 'Connection error. Sending to Advisor...'
          : 'Something went wrong. Sending to Advisor...',
      });
      // Fallback to chat
      setTimeout(() => onAskQuestion?.(text), 1500);
    } finally {
      setIsProcessing(false);
    }
  }

  function handleApproveSuggestion() {
    if (!pendingSuggestion) return;

    if (pendingSuggestion.type === 'playbook') {
      const suggestion = pendingSuggestion.suggestion;
      applyPlaybookSuggestion({
        section: suggestion.section,
        action: suggestion.action,
        content: {
          text: suggestion.content?.text,
          why: suggestion.content?.why,
          context: suggestion.content?.context,
          index: suggestion.index,
        },
      });
      onPlaybookChange?.();
      setLastLogFeedback({ type: 'success', icon: <Check size={16} className="text-emerald-600" />, message: 'Playbook updated!' });
    } else if (pendingSuggestion.type === 'profile') {
      const suggestion = pendingSuggestion.suggestion;
      let value = suggestion.value;
      if (suggestion.field === 'weight') {
        const numMatch = String(value).match(/[\d.]+/);
        if (numMatch) value = parseFloat(numMatch[0]);
      }
      onProfileUpdate?.({ [suggestion.field]: value });
      setLastLogFeedback({ type: 'success', icon: <Check size={16} className="text-emerald-600" />, message: 'Profile updated!' });
    }
    setPendingSuggestion(null);
  }

  function handleClarifyingResponse(response) {
    if (!clarifyingQuestion) return;
    const activities = getActivities();
    const activity = activities.find(a => a.id === clarifyingQuestion.activityId);
    if (activity) {
      const newSummary = activity.summary && !activity.summary.includes('felt')
        ? `${activity.summary}, felt ${response}` : activity.summary;
      updateActivity(clarifyingQuestion.activityId, { data: { feeling: response }, summary: newSummary });
      onActivityLogged?.();
    }
    setLastLogFeedback({ type: 'success', icon: <Check size={16} className="text-emerald-600" />, message: `Added: felt ${response}` });
    setClarifyingQuestion(null);
  }

  // Handle nutrition placement selection (from clarifying popup)
  function handleNutritionPlacementSelect(selection) {
    if (!pendingNutritionPlacement) return;

    const { currentDay, text, rawText, activityId } = pendingNutritionPlacement;
    const calibration = getCalibrationData();
    const dayMeals = calibration.days[currentDay]?.meals || [];

    // Normalize selection - MealPlacementPopup sends objects, OverwriteApprovalPopup sends strings
    const action = typeof selection === 'string' ? selection : selection?.action;

    if (action === 'skip') {
      // User chose not to add to nutrition profile
      setLastLogFeedback({
        type: 'info',
        icon: <Check size={16} className="text-blue-600" />,
        message: 'Logged to Focus Goal only',
      });
    } else if ((action === 'append' || action === 'add') && selection?.mealId) {
      // Add to specified meal (from MealPlacementPopup which sends object with mealId)
      const targetMeal = dayMeals.find(m => m.id === selection.mealId);
      if (targetMeal) {
        const existingContent = targetMeal.content?.trim();
        const newContent = existingContent ? `${existingContent}, ${text}` : text;

        updateMealById(currentDay, targetMeal.id, { content: newContent });
        setCalibrationRefreshKey(k => k + 1);

        // Track as advisor addition if appending
        if (existingContent) {
          trackAdvisorAddition({
            type: 'nutrition',
            day: currentDay,
            mealId: targetMeal.id,
            location: targetMeal.label || selection.mealType,
            addedContent: text,
            originalContent: existingContent,
            reason: `You logged "${rawText}" - added to ${targetMeal.label}`,
            sourceText: rawText,
          });
        }

        setLastLogFeedback({
          type: 'success',
          icon: <Check size={16} className="text-emerald-600" />,
          message: `Added to ${targetMeal.label}`,
        });
      }
    } else if (action === 'replace') {
      // Replace existing content (overwrite approval flow)
      const { mealId, mealLabel } = pendingNutritionPlacement;
      updateMealById(currentDay, mealId, { content: text });
      setCalibrationRefreshKey(k => k + 1);

      setLastLogFeedback({
        type: 'success',
        icon: <Check size={16} className="text-emerald-600" />,
        message: `Replaced ${mealLabel}`,
      });
    } else if (action === 'append' && pendingNutritionPlacement.type === 'overwrite') {
      // Append to existing content (overwrite approval flow - string 'append' from OverwriteApprovalPopup)
      const { mealId, mealLabel, existingContent } = pendingNutritionPlacement;
      const newContent = `${existingContent}, ${text}`;
      updateMealById(currentDay, mealId, { content: newContent });
      setCalibrationRefreshKey(k => k + 1);

      // Track as advisor addition
      trackAdvisorAddition({
        type: 'nutrition',
        day: currentDay,
        mealId,
        location: mealLabel,
        addedContent: text,
        originalContent: existingContent,
        reason: `You logged "${rawText}" - added to ${mealLabel}`,
        sourceText: rawText,
      });

      setLastLogFeedback({
        type: 'success',
        icon: <Check size={16} className="text-emerald-600" />,
        message: `Added to ${mealLabel}`,
      });
    }

    setPendingNutritionPlacement(null);
  }

  function handleNutritionPlacementDismiss() {
    setPendingNutritionPlacement(null);
    setLastLogFeedback({
      type: 'info',
      icon: <Check size={16} className="text-gray-500" />,
      message: 'Logged to Focus Goal only',
    });
  }

  // Nutrition calibration helpers
  const calibrationData = getCalibrationData();
  const todayKey = getTodayDayKey();
  const isCalibrationDay = CALIBRATION_DAYS.includes(todayKey);
  const todayData = calibrationData.days?.[todayKey];
  const todayMeals = todayData?.meals || [];
  const mealsLogged = todayMeals.filter(m => m.content?.trim()).length;
  const totalMeals = todayMeals.length || 5;

  return (
    <div className="flex-1 bg-gray-50/50">
      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Minimal Greeting */}
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">
            {getGreeting()}, {profile.name?.split(' ')[0] || 'there'}
          </h1>
        </div>

        {/* ========== UPDATE 1: QUICK ENTRY BOX - TOP AND EMPHASIZED ========== */}
        <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl border border-primary-200 p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-primary-800">Log something</span>
            <div className="relative">
              <button
                onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                className={`p-1.5 rounded-lg transition-colors ${
                  showHistoryDropdown ? 'bg-primary-200 text-primary-700' : 'text-primary-500 hover:bg-primary-100'
                }`}
                title="Recent entries"
              >
                <History size={16} />
              </button>
              {showHistoryDropdown && (
                <div className="absolute right-0 top-full mt-1 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                  <p className="px-3 py-1 text-xs text-gray-500 font-medium">Recent</p>
                  {getActivities().slice(0, 5).length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-400">No entries yet</p>
                  ) : (
                    getActivities().slice(0, 5).map((activity) => (
                      <button
                        key={activity.id}
                        onClick={() => { setInput(activity.rawText || activity.summary || ''); setShowHistoryDropdown(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                        <p className="text-sm text-gray-700 truncate">{activity.summary || activity.rawText}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-expand to show all text
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && input.trim() && !isProcessing) {
                  e.preventDefault();
                  handleSmartInput();
                }
              }}
              onFocus={() => setShowHistoryDropdown(false)}
              placeholder="Log a meal, workout, or update..."
              className="flex-1 px-4 py-3 rounded-xl border-0 bg-white shadow-sm focus:ring-2 focus:ring-primary-300 outline-none text-gray-700 placeholder:text-gray-400 text-base resize-none min-h-[48px]"
              disabled={isProcessing}
              rows={1}
            />
            <button
              onClick={handleSmartInput}
              disabled={!input.trim() || isProcessing}
              className="px-5 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[56px] h-[48px]"
            >
              {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>

          {/* Feedback */}
          {lastLogFeedback && (
            <div className="mt-3 p-3 rounded-xl bg-white/80 flex items-center gap-3">
              {lastLogFeedback.icon}
              <span className="text-sm font-medium text-gray-800 flex-1">{lastLogFeedback.message}</span>
              <button onClick={() => setLastLogFeedback(null)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
          )}

          {/* Clarifying Question */}
          {clarifyingQuestion && (
            <div className="mt-3 p-3 rounded-xl bg-white border border-blue-200">
              <p className="text-sm text-gray-700 mb-2">{clarifyingQuestion.question}</p>
              <div className="flex flex-wrap gap-2">
                {['great', 'good', 'okay', 'tough'].map(f => (
                  <button key={f} onClick={() => handleClarifyingResponse(f)}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 capitalize">
                    {f === 'great' ? 'Great' : f === 'good' ? 'Good' : f === 'okay' ? 'Okay' : 'Tough'}
                  </button>
                ))}
                <button onClick={() => setClarifyingQuestion(null)} className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">Skip</button>
              </div>
            </div>
          )}

          {/* Pending Suggestion */}
          {pendingSuggestion && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-900 mb-2">{pendingSuggestion.message}</p>
              <div className="flex gap-2">
                <button onClick={handleApproveSuggestion} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600">
                  <Check size={14} /> Approve
                </button>
                <button onClick={() => setPendingSuggestion(null)} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300">
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Nutrition Placement Popup - for clarifying where to add nutrition entries */}
          {pendingNutritionPlacement && pendingNutritionPlacement.type !== 'overwrite' && (
            <MealPlacementPopup
              content={pendingNutritionPlacement.text}
              availableMeals={pendingNutritionPlacement.meals.map(m => ({
                id: m.id,
                type: m.type,
                label: m.label || MEAL_LABELS[m.type] || m.type,
              }))}
              existingMeals={pendingNutritionPlacement.meals.reduce((acc, m) => {
                acc[m.id] = m.content || '';
                return acc;
              }, {})}
              onSelect={handleNutritionPlacementSelect}
              onDismiss={handleNutritionPlacementDismiss}
            />
          )}

          {/* Overwrite Approval Popup - when replacing existing nutrition content */}
          {pendingNutritionPlacement && pendingNutritionPlacement.type === 'overwrite' && (
            <OverwriteApprovalPopup
              existingContent={pendingNutritionPlacement.existingContent}
              newContent={pendingNutritionPlacement.text}
              mealLabel={pendingNutritionPlacement.mealLabel}
              onSelect={handleNutritionPlacementSelect}
              onDismiss={handleNutritionPlacementDismiss}
            />
          )}
        </div>

        {/* ========== UPDATE 3: SIMPLIFIED FOCUS GOALS ========== */}
        {weeklyFocus.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target size={18} className="text-emerald-600" />
                <span className="font-semibold text-gray-900">Focus Goals</span>
                <span className="text-xs text-gray-500">
                  {focusProgress.filter(f => f.progress?.complete).length}/{focusProgress.length}
                </span>
              </div>
              <button
                onClick={() => onNavigate?.('playbook')}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-0.5"
              >
                Details <ChevronRight size={14} />
              </button>
            </div>

            <div className="space-y-2">
              {focusProgress.slice(0, 5).map((item, idx) => {
                const { progress } = item;
                const originalIndex = item.index; // Use original index from playbook
                const isComplete = progress?.trackable && progress.complete;
                const hasProgress = progress?.trackable && progress.target > 0;
                const showTargetDropdown = targetDropdownIndex === originalIndex;

                return (
                  <div key={originalIndex} className="flex items-center gap-3 py-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isComplete ? 'bg-emerald-500 text-white' : 'border-2 border-gray-300'
                    }`}>
                      {isComplete && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span className={`flex-1 text-sm ${isComplete ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                      {item.action}
                    </span>
                    {hasProgress && (
                      <div className="relative target-dropdown">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTargetDropdownIndex(showTargetDropdown ? null : originalIndex);
                          }}
                          className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                            isComplete
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Click to adjust target"
                        >
                          {progress.current}/{progress.target}
                          <ChevronDown size={10} className={`transition-transform ${showTargetDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Target dropdown */}
                        {showTargetDropdown && (
                          <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[120px] max-w-[calc(100vw-2rem)]">
                            <p className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wide">Set target</p>
                            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                              <button
                                key={num}
                                onClick={() => handleTargetChange(originalIndex, num)}
                                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-emerald-50 transition-colors ${
                                  progress.target === num ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'
                                }`}
                              >
                                {num}x per week
                                {progress.target === num && <Check size={12} className="inline ml-2" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========== UPDATE 2: SIMPLIFIED NUTRITION CALIBRATION ========== */}
        {showCalibration && isCalibrationDay && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
            <button
              onClick={() => setCalibrationExpanded(!calibrationExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-amber-600" />
                <div className="text-left">
                  <span className="font-medium text-gray-900">{DAY_LABELS[todayKey]}'s Meals</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    mealsLogged === totalMeals ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {mealsLogged === totalMeals ? 'Complete' : `${mealsLogged}/${totalMeals} logged`}
                  </span>
                </div>
              </div>
              {calibrationExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>

            {calibrationExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                <div className="space-y-2">
                  {todayMeals.map((meal, idx) => (
                    <div key={meal.id || idx} className="flex items-center gap-3 py-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        meal.content?.trim() ? 'bg-emerald-500 text-white' : 'border-2 border-gray-300'
                      }`}>
                        {meal.content?.trim() && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700">{meal.label}</span>
                        {meal.content?.trim() ? (
                          <p className="text-xs text-gray-500 truncate">{meal.content}</p>
                        ) : (
                          <p className="text-xs text-gray-400 italic">Tap to add</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => onNavigate?.('playbook')}
                  className="mt-3 w-full py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  Edit in Playbook
                </button>
              </div>
            )}
          </div>
        )}

        {/* Weekly Wins - Brief */}
        {weeklyWins.length > 0 && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={18} className="text-amber-600" />
              <span className="font-semibold text-gray-900">Weekly Wins</span>
            </div>
            <div className="space-y-2">
              {weeklyWins.slice(0, 3).map((win, i) => {
                const WinIcon = getWinIcon(win.icon);
                return (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <WinIcon size={14} className="text-amber-600" />
                    <span className="text-sm text-gray-800">{win.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Playbook CTA */}
        {weeklyFocus.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles size={20} className="text-primary-600" />
              <span className="font-semibold text-gray-900">Create Your Playbook</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Chat with your Advisor to get a personalized action plan.
            </p>
            <button
              onClick={() => onNavigate?.('playbook')}
              className="w-full py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Activity Log - Collapsible */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button
            onClick={() => setShowActivityLog(!showActivityLog)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-gray-500" />
              <span className="font-medium text-gray-900">Activity Log</span>
            </div>
            {showActivityLog ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </button>
          {showActivityLog && (
            <div className="border-t border-gray-100">
              <ActivityLog compact onActivityDeleted={onActivityLogged} onClose={() => setShowActivityLog(false)} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
