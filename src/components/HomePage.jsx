import { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { getPlaybook } from '../playbookStore';
import { getWeeklyFocusProgress, generateWeeklyWins, setCustomTarget } from '../weeklyProgressStore';
import {
  isInCalibrationPeriod,
  isCalibrationComplete,
  getCalibrationProgress,
  getCalibrationData,
  updateMealById,
  getTodayDayKey,
  DAY_LABELS,
  CALIBRATION_DAYS,
  reorderDayMeals,
  addMealToDay,
  removeMealFromDay,
  ALL_MEAL_TYPES,
  getDefaultMealPattern,
  saveDefaultMealPattern,
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

  // Get user's goals from profile
  const goals = profile?.goals || [];
  const goalDetails = profile?.goalDetails || {};

  if (goals.length === 0) return null;

  // Create a summary of goals
  const goalLabels = {
    weightLoss: 'Lose body fat',
    strength: 'Build strength',
    endurance: 'Improve endurance',
    sleep: 'Better sleep',
    nutrition: 'Better nutrition',
  };

  // Get first goal detail or fallback to label
  const primaryGoal = goalDetails[goals[0]] || goalLabels[goals[0]] || goals[0];
  const additionalGoals = goals.slice(1).map(g => goalLabels[g] || g);

  return (
    <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl px-4 py-3 mb-4">
      <div className="flex items-start gap-3">
        <Target size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-indigo-800">
            <span className="font-medium">Working towards:</span>{' '}
            <span className="text-indigo-700">
              {primaryGoal.length > 60 ? primaryGoal.substring(0, 60) + '...' : primaryGoal}
              {additionalGoals.length > 0 && (
                <span className="text-indigo-500"> • {additionalGoals.join(' • ')}</span>
              )}
            </span>
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded transition-colors flex-shrink-0"
          title="Dismiss for today"
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

// Quick Entry Component
function QuickEntryBox({ onSubmit, isLoading }) {
  const [input, setInput] = useState('');
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

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSubmit(input.trim());
    setInput('');
  }

  function handleKeyDown(e) {
    // Submit on Enter without Shift
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <form onSubmit={handleSubmit}>
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Log a meal, workout, or anything..."
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none overflow-hidden"
            style={{ minHeight: '48px' }}
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
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
function DraggableMealSlot({ meal, dayKey, index, onUpdate, onDragStart, onDragOver, onDragEnd, onDelete, isDragging, canDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(meal.content || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  function handleSave() {
    onUpdate(dayKey, meal.id, editValue);
    setIsEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(meal.content || '');
      setIsEditing(false);
    }
  }

  const hasMeal = meal.content?.trim();

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-white border-2 border-amber-400">
        <span className="text-sm text-gray-600 font-medium w-24 flex-shrink-0">
          {meal.label}:
        </span>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder="What did you have?"
          className="flex-1 px-2 py-1 text-sm bg-transparent border-none focus:outline-none"
        />
        <button
          onClick={handleSave}
          className="p-1 text-green-600 hover:bg-green-50 rounded"
        >
          <Check size={14} />
        </button>
        <button
          onClick={() => {
            setEditValue(meal.content || '');
            setIsEditing(false);
          }}
          className="p-1 text-gray-400 hover:bg-gray-100 rounded"
        >
          <X size={14} />
        </button>
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
      <div className="text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0">
        <GripVertical size={14} />
      </div>

      {/* Checkbox */}
      {hasMeal ? (
        <Check size={14} className="text-green-600 flex-shrink-0" />
      ) : (
        <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
      )}

      {/* Content - Click to edit */}
      <button
        onClick={() => setIsEditing(true)}
        className="flex-1 flex items-start gap-2 text-left min-w-0"
      >
        <span className="text-sm text-gray-600 font-medium w-24 flex-shrink-0 pt-0.5">
          {meal.label}:
        </span>
        <span className={`text-sm flex-1 ${
          hasMeal ? 'text-gray-800' : 'text-gray-400 italic'
        }`}>
          {hasMeal ? meal.content : 'Tap to add'}
        </span>
        {hasMeal && (
          <Edit2 size={12} className="text-gray-400 flex-shrink-0 mt-1" />
        )}
      </button>

      {/* Delete button (only if canDelete) */}
      {canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(dayKey, meal.id);
          }}
          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded flex-shrink-0"
        >
          <Trash2 size={12} />
        </button>
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

// Nutrition Calibration Section for Home (Toned down version)
function NutritionCalibrationCard() {
  const [calibrationData, setCalibrationData] = useState(null);
  const [showPreviousDays, setShowPreviousDays] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const todayKey = getTodayDayKey();

  useEffect(() => {
    setCalibrationData(getCalibrationData());
  }, []);

  function handleMealUpdate(dayKey, mealId, content) {
    updateMealById(dayKey, mealId, { content });
    setCalibrationData(getCalibrationData());
  }

  function handleDragStart(e, index) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const meals = [...(calibrationData.days[todayKey]?.meals || [])];
    const [draggedMeal] = meals.splice(dragIndex, 1);
    meals.splice(index, 0, draggedMeal);

    setCalibrationData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [todayKey]: {
          ...prev.days[todayKey],
          meals,
        },
      },
    }));
    setDragIndex(index);
  }

  function handleDragEnd() {
    if (todayKey && calibrationData.days[todayKey]?.meals) {
      reorderDayMeals(todayKey, calibrationData.days[todayKey].meals);
    }
    setDragIndex(null);
  }

  function handleAddMeal(type) {
    if (!todayKey) return;
    addMealToDay(todayKey, type);
    setCalibrationData(getCalibrationData());
    setShowAddMeal(false);
  }

  function handleDeleteMeal(dayKey, mealId) {
    removeMealFromDay(dayKey, mealId);
    setCalibrationData(getCalibrationData());
  }

  if (!calibrationData) return null;

  const progress = getCalibrationProgress();
  const todayData = todayKey && CALIBRATION_DAYS.includes(todayKey)
    ? calibrationData.days[todayKey]
    : null;
  const meals = todayData?.meals || [];
  const filledCount = meals.filter(m => m.content?.trim()).length;

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
          Day {progress.completed + 1} of 5
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-amber-200 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-500"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {/* Today's Meals - Toned down date header */}
      {todayData && !todayData.completed && (
        <div className="mb-4">
          {/* Today Header - Simpler, not shouty */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">{formatSimpleDate()}</span>
              <span className="text-xs text-amber-600 font-medium">· Today</span>
            </div>
            <span className="text-sm text-gray-500">{filledCount} of {meals.length} logged</span>
          </div>

          {/* Meal Slots */}
          <div className="space-y-2">
            {meals.map((meal, index) => (
              <DraggableMealSlot
                key={meal.id}
                meal={meal}
                dayKey={todayKey}
                index={index}
                onUpdate={handleMealUpdate}
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

      {/* View completed days */}
      {completedDays.length > 0 && (
        <>
          <button
            onClick={() => setShowPreviousDays(!showPreviousDays)}
            className="text-sm text-amber-700 hover:text-amber-800 flex items-center gap-1"
          >
            View completed days ({completedDays.length})
            {showPreviousDays ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Previous Days List - Less Emphasized */}
          {showPreviousDays && (
            <div className="mt-3 space-y-3">
              {completedDays.map(day => {
                const dayData = calibrationData.days[day];
                const dayMeals = dayData?.meals || [];
                const dayFilledCount = dayMeals.filter(m => m.content?.trim()).length;

                // Get the actual date for this day of week
                const today = new Date();
                const todayDayIndex = today.getDay();
                const dayOrder = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
                const targetDayIndex = dayOrder[day];
                const diff = targetDayIndex - todayDayIndex;
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + diff);

                return (
                  <div key={day} className="p-3 bg-white/40 rounded-lg border border-amber-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">
                        {targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-xs text-gray-500">
                        {dayFilledCount} of {dayMeals.length}
                        {dayData?.completed && <Check size={12} className="inline ml-1 text-green-500" />}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {dayMeals.filter(m => m.content?.trim()).map(meal => (
                        <div key={meal.id} className="flex items-start gap-2 text-sm">
                          <Check size={12} className="text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-500 font-medium flex-shrink-0">{meal.label}:</span>
                          <span className="text-gray-700">{meal.content}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Simple Focus Goal Card for Home (minimal, green-only, no buttons)
function SimpleFocusGoalCard({ item }) {
  const Icon = item.progress?.trackable ? getFocusIcon(item.progress.type) : Target;
  const isComplete = item.progress?.complete;
  const hasProgress = item.progress?.current > 0;
  const progressPercent = item.progress?.trackable
    ? Math.round((item.progress.current / item.progress.target) * 100)
    : 0;

  // Green-only color scheme
  let bgColor = 'bg-white';
  let progressBarColor = 'bg-gray-200';
  let progressFillColor = 'bg-green-500';

  if (isComplete) {
    bgColor = 'bg-green-50';
    progressFillColor = 'bg-green-500';
  } else if (hasProgress) {
    bgColor = 'bg-white';
    progressFillColor = 'bg-green-500';
  } else {
    bgColor = 'bg-white';
    progressBarColor = 'bg-gray-200';
    progressFillColor = 'bg-gray-300';
  }

  return (
    <div className={`rounded-xl ${bgColor} border border-gray-200 p-3`}>
      <div className="flex items-center gap-3">
        {/* Checkbox/Status */}
        {isComplete ? (
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <Check size={12} className="text-white" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
        )}

        {/* Goal text and progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`text-sm ${isComplete ? 'text-green-700' : 'text-gray-800'}`}>
              {item.action}
            </span>
            {item.progress?.trackable && (
              <span className={`text-sm font-semibold flex-shrink-0 ${
                isComplete ? 'text-green-600' : 'text-gray-600'
              }`}>
                {item.progress.current}/{item.progress.target}
                {isComplete && ' ✓'}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {item.progress?.trackable && (
            <div className={`h-1.5 ${progressBarColor} rounded-full overflow-hidden`}>
              <div
                className={`h-full ${progressFillColor} rounded-full transition-all duration-300`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Focus Goals Section for Home - Simplified, Green, No Buttons
function FocusGoalsCard({ onViewPlaybook }) {
  const [focusProgress, setFocusProgress] = useState([]);

  useEffect(() => {
    setFocusProgress(getWeeklyFocusProgress());
  }, []);

  if (focusProgress.length === 0) return null;

  const completedCount = focusProgress.filter(f => f.progress?.complete).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-green-600" />
          <span className="font-semibold text-gray-900">Focus Goals</span>
        </div>
        <span className="text-sm text-gray-500">
          {completedCount} of {focusProgress.length} done
        </span>
      </div>

      {/* Goals list - simple, clean */}
      <div className="space-y-2">
        {focusProgress.map((item, idx) => (
          <SimpleFocusGoalCard key={idx} item={item} />
        ))}
      </div>

      {/* View in Playbook link */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <button
          onClick={onViewPlaybook}
          className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
        >
          View Full Focus Goals in Playbook <ChevronRight size={14} />
        </button>
      </div>
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

// Playbook Link Card - Indigo accent
function PlaybookLinkCard({ onViewPlaybook }) {
  const [playbook, setPlaybook] = useState(null);
  const profile = getProfile();

  useEffect(() => {
    setPlaybook(getPlaybook());
  }, []);

  // Get goal description from profile
  const goalText = profile?.goals?.[0]
    ? `your goal to ${profile.goals[0].replace(/_/g, ' ')}`
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
    updateMealById(dayKey, mealId, { content });
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
  const goalText = profile?.goals?.[0]
    ? `reaching ${profile.goals[0].replace(/_/g, ' ')}`
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
                  Day {progress.completed + 1} of 5
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

// Main HomePage Component
export default function HomePage({ onNavigate, onOpenCheckIn }) {
  const [profile, setProfile] = useState(null);
  const [showPlaybook, setShowPlaybook] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    principles: false,
    wins: false,
  });

  // Check if in calibration period
  const inCalibration = isInCalibrationPeriod() && !isCalibrationComplete();

  useEffect(() => {
    window.scrollTo(0, 0);
    setProfile(getProfile());
  }, []);

  function toggleSection(section) {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  async function handleQuickEntry(text) {
    setIsLoading(true);
    // Navigate to advisor with the initial question
    onNavigate('advisor', null, text);
    setTimeout(() => setIsLoading(false), 500);
  }

  function handleStartCheckIn() {
    onOpenCheckIn?.();
  }

  return (
    <div className="bg-gray-50/50 pb-8">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* 1. Greeting + Goal Reminder + Quick Entry */}
        <section>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {getGreeting()}, {profile?.name?.split(' ')[0] || 'there'}
          </h1>
          <GoalReminder profile={profile} />
          <QuickEntryBox onSubmit={handleQuickEntry} isLoading={isLoading} />
        </section>

        {/* 2. Nutrition Calibration (Week 1 only) - No encouragement message on Home */}
        {inCalibration && (
          <section>
            <NutritionCalibrationCard />
          </section>
        )}

        {/* 3. Your Playbook card - Indigo */}
        <section>
          <PlaybookLinkCard onViewPlaybook={() => setShowPlaybook(true)} />
        </section>

        {/* 4. Focus Goals - Green, minimal, no buttons */}
        <section>
          <FocusGoalsCard onViewPlaybook={() => setShowPlaybook(true)} />
        </section>

        {/* 5. Key Principles - Blue (collapsed) */}
        <section>
          <KeyPrinciplesCard
            expanded={expandedSections.principles}
            onToggle={() => toggleSection('principles')}
          />
        </section>

        {/* 6. Weekly Wins - Gold (collapsed, LAST) */}
        <section>
          <WeeklyWinsCard
            expanded={expandedSections.wins}
            onToggle={() => toggleSection('wins')}
          />
        </section>

        {/* 7. Check-in Banner (Sundays only) */}
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
