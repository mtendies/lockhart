import { useState, useEffect, useRef } from 'react';
import {
  Utensils,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Loader2,
  Sparkles,
  Check,
  AlertTriangle,
  Target,
  Flame,
  Edit2,
  BarChart3,
  Coffee,
  Sun,
  Moon,
  Apple,
} from 'lucide-react';
import { estimateCalories } from '../calorieEstimator';
import { estimateCaloriesAI, getCachedOrRuleBased } from '../aiCalorieEstimator';
import {
  getTodayMeals,
  addTodayMeal,
  updateTodayMeal,
  removeTodayMeal,
  getNutritionProfile,
  isCalibrationComplete,
  saveDailyAnalysis,
  getTodayAnalysis,
} from '../nutritionCalibrationStore';
import { getProfile } from '../store';
import { getGroceryData } from '../groceryStore';

// Meal type configuration
const MEAL_SLOTS = [
  { type: 'breakfast', label: 'Breakfast', icon: Coffee, emoji: '☀️', timeHint: 'morning' },
  { type: 'lunch', label: 'Lunch', icon: Sun, emoji: '🌤️', timeHint: 'midday' },
  { type: 'dinner', label: 'Dinner', icon: Moon, emoji: '🌙', timeHint: 'evening' },
  { type: 'snacks', label: 'Snacks', icon: Apple, emoji: '🍎', timeHint: 'anytime' },
];

// Calorie popup for editing meal breakdown
function MealCaloriePopup({ meal, onClose, onSave }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(meal.calories || 0);

  useEffect(() => {
    async function fetchEstimate() {
      try {
        const result = await estimateCaloriesAI(meal.content);
        if (result?.estimate?.items) {
          setItems(result.estimate.items.map(item => ({
            ...item,
            editQty: item.quantity || 1,
            editUnit: item.unit || 'serving',
          })));
        }
      } catch (err) {
        // Fallback to rule-based
        const fallback = estimateCalories(meal.content);
        if (fallback?.items) {
          setItems(fallback.items.map(item => ({
            ...item,
            editQty: item.quantity || 1,
            editUnit: item.unit || 'serving',
          })));
        }
      } finally {
        setLoading(false);
      }
    }
    fetchEstimate();
  }, [meal.content]);

  useEffect(() => {
    const newTotal = items.reduce((sum, item) => {
      const calPerUnit = item.calories / (item.quantity || 1);
      return sum + (calPerUnit * item.editQty);
    }, 0);
    setTotal(Math.round(newTotal));
  }, [items]);

  function handleQtyChange(index, newQty) {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, editQty: parseFloat(newQty) || 0 } : item
    ));
  }

  function handleSave() {
    onSave(total, items);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-900">Calorie Breakdown</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-emerald-500" size={24} />
              <span className="ml-2 text-gray-500">Analyzing...</span>
            </div>
          ) : items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Could not parse meal items</p>
          ) : (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{item.food}</p>
                    <p className="text-xs text-gray-500">
                      {Math.round((item.calories / (item.quantity || 1)) * item.editQty)} cal
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={item.editQty}
                      onChange={e => handleQtyChange(idx, e.target.value)}
                      className="w-16 px-2 py-1 text-sm border rounded text-center"
                      step="0.5"
                      min="0"
                    />
                    <span className="text-xs text-gray-500">{item.editUnit}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-gray-700">Total</span>
            <span className="text-lg font-bold text-emerald-600">{total} cal</span>
          </div>
          <button
            onClick={handleSave}
            className="w-full py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// Individual meal slot component
function MealSlot({ slot, meal, onAdd, onUpdate, onRemove, disabled }) {
  const [inputValue, setInputValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const inputRef = useRef(null);
  const profile = getProfile();
  const SlotIcon = slot.icon;

  const hasMeal = meal && meal.content && meal.content.trim();

  async function handleAdd() {
    if (!inputValue.trim()) return;

    setIsAdding(true);
    try {
      const estimate = await getCachedOrRuleBased(inputValue, profile);
      onAdd({
        type: slot.type,
        label: slot.label,
        content: inputValue,
        calories: estimate?.totalCalories || null,
        calorieItems: estimate?.items || [],
      });
      setInputValue('');
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to add meal:', err);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleUpdate() {
    if (!inputValue.trim()) return;

    setIsAdding(true);
    try {
      const estimate = await getCachedOrRuleBased(inputValue, profile);
      onUpdate(meal.id, {
        content: inputValue,
        calories: estimate?.totalCalories || null,
        calorieItems: estimate?.items || [],
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update meal:', err);
    } finally {
      setIsAdding(false);
    }
  }

  function handleCalorieSave(newTotal, newItems) {
    onUpdate(meal.id, {
      calories: newTotal,
      calorieItems: newItems,
    });
  }

  // Start editing existing meal
  function startEdit() {
    setInputValue(meal.content);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // Cancel editing
  function cancelEdit() {
    setInputValue('');
    setIsEditing(false);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Meal Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">{slot.emoji}</span>
          <span className="font-medium text-gray-800">{slot.label}</span>
        </div>
        {hasMeal && !isEditing && (
          <span className="text-sm font-semibold text-emerald-600">
            {meal.calories || 0} cal
          </span>
        )}
      </div>

      {/* Meal Content */}
      <div className="p-4">
        {hasMeal && !isEditing ? (
          // Show logged meal
          <div>
            <p className="text-sm text-gray-700 mb-3">{meal.content}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPopup(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100"
              >
                <BarChart3 size={14} />
                View breakdown
              </button>
              <button
                onClick={startEdit}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Edit2 size={14} />
                Edit
              </button>
              <button
                onClick={() => onRemove(meal.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          // Input for adding/editing
          <div>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  hasMeal ? handleUpdate() : handleAdd();
                }
                if (e.key === 'Escape') cancelEdit();
              }}
              placeholder={`What did you have for ${slot.label.toLowerCase()}?`}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              rows={2}
              disabled={disabled || isAdding}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-400">
                e.g., "3 eggs, toast with butter, coffee"
              </p>
              <div className="flex gap-2">
                {isEditing && (
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={hasMeal ? handleUpdate : handleAdd}
                  disabled={isAdding || !inputValue.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isAdding ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  {hasMeal ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calorie Popup */}
      {showPopup && meal && (
        <MealCaloriePopup
          meal={meal}
          onClose={() => setShowPopup(false)}
          onSave={handleCalorieSave}
        />
      )}
    </div>
  );
}

// Daily analysis section
function DailyAnalysisSection({ meals, calorieTarget, proteinTarget, onAnalyze }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Load saved analysis on mount
  useEffect(() => {
    const saved = getTodayAnalysis();
    if (saved) {
      setAnalysis(saved);
      setExpanded(true);
    }
  }, []);

  async function handleAnalyze() {
    const profile = getProfile();
    const groceryData = getGroceryData?.() || null;

    setLoading(true);
    try {
      const response = await fetch('/api/analyze-daily-nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meals,
          profile,
          groceryData,
          calorieTarget,
          proteinTarget,
        }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const data = await response.json();
      setAnalysis(data);
      setExpanded(true);

      // Save to history
      saveDailyAnalysis(data);
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  }

  const hasEnoughMeals = meals.filter(m => m.content?.trim()).length >= 2;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => analysis && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-purple-600" />
          <span className="font-medium text-gray-800">Daily Insights</span>
        </div>
        {analysis ? (
          <button className="p-1 text-gray-400">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        ) : (
          <button
            onClick={handleAnalyze}
            disabled={loading || !hasEnoughMeals}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {loading ? 'Analyzing...' : 'Get Analysis'}
          </button>
        )}
      </div>

      {/* Analysis Content */}
      {expanded && analysis && (
        <div className="px-4 pb-4 space-y-4">
          {/* Macro Summary */}
          <div className="grid grid-cols-2 gap-2">
            {/* Calories */}
            <div className={`p-3 rounded-lg ${
              analysis.calorieAssessment?.status === 'on-track' ? 'bg-emerald-100' :
              analysis.calorieAssessment?.status === 'under' ? 'bg-amber-100' : 'bg-red-100'
            }`}>
              <div className="flex items-center gap-1 mb-1">
                <Flame size={14} className={
                  analysis.calorieAssessment?.status === 'on-track' ? 'text-emerald-600' :
                  analysis.calorieAssessment?.status === 'under' ? 'text-amber-600' : 'text-red-600'
                } />
                <span className="text-xs font-medium text-gray-600">Calories</span>
              </div>
              <p className="text-lg font-bold text-gray-800">
                {analysis.totalCalories || 0} / {calorieTarget}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {analysis.calorieAssessment?.message}
              </p>
            </div>

            {/* Protein */}
            <div className={`p-3 rounded-lg ${
              analysis.proteinAssessment?.status === 'good' ? 'bg-emerald-100' :
              analysis.proteinAssessment?.status === 'low' ? 'bg-amber-100' : 'bg-blue-100'
            }`}>
              <div className="flex items-center gap-1 mb-1">
                <Target size={14} className={
                  analysis.proteinAssessment?.status === 'good' ? 'text-emerald-600' :
                  analysis.proteinAssessment?.status === 'low' ? 'text-amber-600' : 'text-blue-600'
                } />
                <span className="text-xs font-medium text-gray-600">Protein</span>
              </div>
              <p className="text-lg font-bold text-gray-800">
                {analysis.macros?.protein?.grams || 0}g / {proteinTarget}g
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {analysis.proteinAssessment?.message}
              </p>
            </div>
          </div>

          {/* Fiber & Other Macros */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-white/60 rounded-lg text-center">
              <p className="text-xs text-gray-500">Carbs</p>
              <p className="text-sm font-semibold text-gray-800">
                {analysis.macros?.carbs?.grams || 0}g
              </p>
            </div>
            <div className="p-2 bg-white/60 rounded-lg text-center">
              <p className="text-xs text-gray-500">Fats</p>
              <p className="text-sm font-semibold text-gray-800">
                {analysis.macros?.fats?.grams || 0}g
              </p>
            </div>
            <div className="p-2 bg-white/60 rounded-lg text-center">
              <p className="text-xs text-gray-500">Fiber</p>
              <p className="text-sm font-semibold text-gray-800">
                {analysis.macros?.fiber?.grams || 0}g
              </p>
            </div>
          </div>

          {/* Highlights */}
          {analysis.highlights?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">What you did well</p>
              {analysis.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Check size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{h.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Gaps */}
          {analysis.gaps?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Consider adding</p>
              {analysis.gaps.map((g, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    <strong>{g.nutrient}:</strong> {g.suggestion}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Personalized Tip */}
          {analysis.personalizedTip && (
            <div className="p-3 bg-purple-100 rounded-lg">
              <div className="flex items-start gap-2">
                <Sparkles size={16} className="text-purple-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-purple-800">{analysis.personalizedTip}</p>
              </div>
            </div>
          )}

          {/* Re-analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full py-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            {loading ? 'Analyzing...' : 'Refresh Analysis'}
          </button>
        </div>
      )}

      {/* Empty state */}
      {!analysis && !loading && (
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-500">
            {hasEnoughMeals
              ? 'Click "Get Analysis" to see your daily nutrition breakdown'
              : 'Log at least 2 meals to get your daily analysis'}
          </p>
        </div>
      )}
    </div>
  );
}

// Main component
export default function DailyNutritionTracker() {
  const [meals, setMeals] = useState([]);
  const [calorieTarget, setCalorieTarget] = useState(2000);
  const [proteinTarget, setProteinTarget] = useState(100);
  const profile = getProfile();

  // Load meals and targets on mount
  useEffect(() => {
    setMeals(getTodayMeals());

    // Get targets from nutrition profile
    const nutritionProfile = getNutritionProfile();
    if (nutritionProfile?.overview?.estimatedDailyCalories) {
      const cal = parseInt(nutritionProfile.overview.estimatedDailyCalories.replace(/[^0-9]/g, ''));
      if (cal > 0) setCalorieTarget(cal);
    }
    if (nutritionProfile?.overview?.proteinEstimate) {
      const protein = parseInt(nutritionProfile.overview.proteinEstimate.replace(/[^0-9]/g, ''));
      if (protein > 0) setProteinTarget(protein);
    }
  }, []);

  // Calculate totals
  const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const percentage = Math.min(100, Math.round((totalCalories / calorieTarget) * 100));
  const remaining = calorieTarget - totalCalories;

  // Get meal for each slot
  function getMealForSlot(slotType) {
    return meals.find(m => m.type === slotType);
  }

  // Add meal handler
  function handleAddMeal(mealData) {
    addTodayMeal(mealData);
    setMeals(getTodayMeals());
  }

  // Update meal handler
  function handleUpdateMeal(mealId, updates) {
    updateTodayMeal(mealId, updates);
    setMeals(getTodayMeals());
  }

  // Remove meal handler
  function handleRemoveMeal(mealId) {
    removeTodayMeal(mealId);
    setMeals(getTodayMeals());
  }

  // Get today's date formatted
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-emerald-500 to-teal-500">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Utensils size={20} className="text-white" />
            <span className="font-semibold text-white text-lg">Today's Nutrition</span>
          </div>
          <span className="text-sm text-white/80">{today}</span>
        </div>

        {/* Calorie Progress */}
        <div className="mt-2">
          <div className="flex items-end justify-between mb-2">
            <div>
              <span className="text-3xl font-bold text-white">{totalCalories}</span>
              <span className="text-white/80 ml-1">/ {calorieTarget} cal</span>
            </div>
            <span className="text-white/80 text-sm">
              {remaining > 0 ? `${remaining} remaining` : `${Math.abs(remaining)} over`}
            </span>
          </div>
          <div className="h-3 bg-white/30 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all rounded-full ${
                percentage > 100 ? 'bg-red-400' :
                percentage > 85 ? 'bg-amber-400' :
                'bg-white'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Meal Slots */}
      <div className="p-4 space-y-3">
        {MEAL_SLOTS.map(slot => (
          <MealSlot
            key={slot.type}
            slot={slot}
            meal={getMealForSlot(slot.type)}
            onAdd={handleAddMeal}
            onUpdate={handleUpdateMeal}
            onRemove={handleRemoveMeal}
          />
        ))}
      </div>

      {/* Daily Analysis */}
      <div className="px-4 pb-4">
        <DailyAnalysisSection
          meals={meals}
          calorieTarget={calorieTarget}
          proteinTarget={proteinTarget}
        />
      </div>
    </div>
  );
}
