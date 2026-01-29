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
} from 'lucide-react';
import { estimateCalories, needsClarification } from '../calorieEstimator';
import { getPendingAdditionFor, approveAddition, removeAddition } from '../advisorAdditionsStore';
import {
  getCalibrationData,
  startCalibration,
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
 * Calorie Estimator Popup
 */
function CalorieEstimatorPopup({ content, onClose }) {
  const estimate = estimateCalories(content);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-orange-500" />
            <span className="font-semibold text-gray-900">Estimated Calories</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          {/* Total */}
          <div className="text-center mb-4">
            <span className="text-3xl font-bold text-gray-900">~{estimate.totalCalories}</span>
            <span className="text-gray-500 ml-1">cal</span>
            <p className="text-xs text-gray-400 mt-1">
              {estimate.confidence === 'high' ? 'Good estimate' : estimate.confidence === 'medium' ? 'Moderate confidence' : 'Rough estimate'}
            </p>
          </div>

          {/* Breakdown */}
          {estimate.breakdown.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Breakdown</p>
              <div className="space-y-2">
                {estimate.breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.food} <span className="text-gray-400">({item.serving})</span></span>
                    <span className="text-gray-600 font-medium">~{item.calories} cal</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {estimate.tips.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-4">
              <div className="flex gap-2">
                <Info size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <p className="font-medium mb-1">Did you know?</p>
                  {estimate.tips.map((tip, idx) => (
                    <p key={idx}>{tip}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-[10px] text-gray-400 text-center">
            This is an estimate based on typical portions. Actual calories may vary based on preparation and exact quantities.
          </p>
        </div>
      </div>
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
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary-300 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm text-gray-700 placeholder:text-gray-400 resize-none overflow-hidden whitespace-pre-wrap ${
          disabled ? 'bg-gray-50 text-gray-500' : 'bg-white'
        }`}
        style={{ minHeight: '80px' }}
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
function SortableMealEntry({ meal, day, onContentChange, onRemove, onAdvisorAction, disabled, showRemove }) {
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
          <MealEntryActions content={meal.content} mealId={meal.id} />
        )}
      </div>
    </div>
  );
}

/**
 * Actions for a meal entry (calorie estimator, clarifying questions)
 */
function MealEntryActions({ content, mealId }) {
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
  const estimate = estimateCalories(content);
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
          onClose={() => setShowCalories(false)}
        />
      )}

      {showClarify && clarification && (
        <ClarifyingQuestionPopup
          clarification={clarification}
          onAnswer={(option) => {
            // Could update the estimate with the multiplier here
            console.log('Selected option:', option);
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
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
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
function DayCompletedMessage({ day, nextDay, onEdit }) {
  const dayLabel = DAY_LABELS[day];
  const nextDayLabel = nextDay ? DAY_LABELS[nextDay] : null;

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <PartyPopper size={20} className="text-emerald-600" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-emerald-800">
            Nice work logging {dayLabel}'s meals!
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
  const dayCompleted = dayData.completed;
  const dayInPast = isDayInPast(day);
  const dayInFuture = isDayInFuture(day);
  const meals = dayData.meals || [];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
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
    return <DayCompletedMessage day={day} nextDay={nextDay} onEdit={onToggle} />;
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
        </div>
        {isExpanded ? (
          <ChevronUp size={16} className="text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
      </button>

      {/* Meal entries with drag-and-drop */}
      {isExpanded && (
        <div className="p-4">
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

          {/* Complete day button */}
          {!dayCompleted && (
            <button
              onClick={onComplete}
              disabled={!canComplete}
              className={`w-full mt-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
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
            <div className="mt-4 p-2 bg-emerald-50 rounded-lg text-center">
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

    // Start calibration if not started
    const data = startCalibration();
    setCalibrationData(data);

    // Get today's day
    const progress = getCalibrationProgress();
    const today = progress.todayDay;

    // Expand today's entry if it's a weekday and not completed
    if (today && data.days[today] && !data.days[today].completed) {
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
    updateMealById(day, mealId, { content });
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
    setCalibrationData(updatedData);
    setJustCompleted(day);
    setExpandedDay(null); // Collapse the day

    // If all complete, notify parent
    if (updatedData.completedAt) {
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
    const aCompleted = calibrationData.days[a].completed;
    const bCompleted = calibrationData.days[b].completed;
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
    ? sortedDays.filter(day => isDayToday(day) || isDayInPast(day) || calibrationData.days[day].completed)
    : sortedDays;

  return (
    <div className={`bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 ${compact ? 'p-4' : 'p-5'}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-amber-200 rounded-lg shrink-0">
          <Sparkles size={18} className="text-amber-700" />
        </div>
        <div className="flex-1">
          <h2 className={`font-semibold text-gray-900 ${compact ? 'text-base' : 'text-lg'}`}>
            Unlock Your Nutrition Profile
          </h2>
          <p className="text-sm text-amber-700 mt-0.5">
            {progress.remaining > 0
              ? `${progress.remaining} more day${progress.remaining > 1 ? 's' : ''} until your personalized insights unlock!`
              : 'Almost there!'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-amber-800">{progress.completed} of 5 days logged</span>
          <span className="text-xs text-amber-600">{progress.percentage}% complete</span>
        </div>
        <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Weekend message - shown on weekends but completed days still visible below */}
      {!todayDay && (
        <WeekendMessage progress={progress} />
      )}

      {/* Day entries - ALWAYS show completed days so users can edit them */}
      <div className="space-y-2">
        {visibleDays.map((day) => {
          const dayData = calibrationData.days[day];
          const isToday = isDayToday(day);
          const isExpanded = expandedDay === day || (isToday && !dayData.completed && expandedDay === null);

          // On weekends, only show completed days (skip incomplete future/past days)
          if (!todayDay && !dayData.completed) {
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

      {/* Motivational footer */}
      <div className="mt-4 pt-3 border-t border-amber-200">
        <p className="text-xs text-amber-700 text-center">
          Track 5 days of meals to unlock your Daily Nutritional Profile with personalized insights.
        </p>
      </div>

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
