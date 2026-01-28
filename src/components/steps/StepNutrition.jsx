import { Coffee, Apple, Sun, Cookie, Moon, Cake } from 'lucide-react';
import RichTextArea from '../RichTextArea';
import ExpandingTextarea from '../ExpandingTextarea';

// Meal options with icons for the multi-select
const MEAL_OPTIONS = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee },
  { id: 'morningSnack', label: 'Morning Snack', icon: Apple },
  { id: 'lunch', label: 'Lunch', icon: Sun },
  { id: 'afternoonSnack', label: 'Afternoon Snack', icon: Cookie },
  { id: 'dinner', label: 'Dinner', icon: Moon },
  { id: 'eveningSnack', label: 'Evening Snack/Dessert', icon: Cake },
];

export default function StepNutrition({ data, onChange }) {
  // Initialize mealPattern with defaults if not set
  const mealPattern = data.mealPattern || ['breakfast', 'lunch', 'dinner'];

  function toggleMeal(mealId) {
    const current = [...mealPattern];
    const index = current.indexOf(mealId);
    if (index >= 0) {
      // Don't allow removing all meals - must have at least one
      if (current.length > 1) {
        current.splice(index, 1);
      }
    } else {
      current.push(mealId);
    }
    // Sort by the original order
    const ordered = MEAL_OPTIONS.filter(m => current.includes(m.id)).map(m => m.id);
    onChange({ mealPattern: ordered });
  }

  return (
    <div className="space-y-6">
      <p className="text-gray-500 text-sm">No calorie counting — just describe how you eat so the advisor can help optimize.</p>

      {/* Meal pattern selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What meals and snacks do you typically eat each day?
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Select all that apply. This personalizes your nutrition tracking.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {MEAL_OPTIONS.map(meal => {
            const Icon = meal.icon;
            const isSelected = mealPattern.includes(meal.id);
            return (
              <button
                key={meal.id}
                type="button"
                onClick={() => toggleMeal(meal.id)}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Icon size={16} className={isSelected ? 'text-primary-500' : 'text-gray-400'} />
                <span className="text-sm font-medium">{meal.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Typical meals */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Typical daily meals</label>
        <RichTextArea
          value={data.meals}
          onChange={val => onChange({ meals: val })}
          hint="Walk me through a typical day of eating. What do you have for breakfast (or do you skip it)? Lunch? Dinner? Snacks? Include rough portions if you can."
          minRows={4}
        />
      </div>

      {/* Go-to meals */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Go-to meals</label>
        <RichTextArea
          value={data.goToMeals}
          onChange={val => onChange({ goToMeals: val })}
          hint="What meals do you make on repeat or order regularly? Your staples, comfort foods, quick fixes. These are the building blocks we can work with."
          minRows={3}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Favorite foods</label>
          <ExpandingTextarea
            value={data.favoriteFoods || ''}
            onChange={val => onChange({ favoriteFoods: val })}
            placeholder="Foods you love"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Restrictions/allergies</label>
          <ExpandingTextarea
            value={data.restrictions || ''}
            onChange={val => onChange({ restrictions: val })}
            placeholder="e.g., dairy-free, nut allergy"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
          />
        </div>
      </div>

      {/* Protein */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Protein distribution</label>
        <RichTextArea
          value={data.proteinDistribution}
          onChange={val => onChange({ proteinDistribution: val })}
          hint="How many of your meals include a solid protein source? What are your main sources (chicken, eggs, tofu, protein powder, etc.)? Do you feel like you're getting enough?"
          minRows={3}
        />
      </div>

      {/* Meal timing */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Meal timing & eating patterns</label>
        <RichTextArea
          value={data.mealTiming}
          onChange={val => onChange({ mealTiming: val })}
          hint="Do you eat at set times or graze? Intermittent fasting? Late-night eating? Does your schedule affect when you eat? What about weekends vs weekdays?"
          minRows={3}
        />
      </div>

      {/* Pre/post workout */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Pre/post-workout nutrition</label>
        <RichTextArea
          value={data.prePostWorkoutNutrition}
          onChange={val => onChange({ prePostWorkoutNutrition: val })}
          hint="What do you eat or drink before and after training? Do you train fasted? Have a protein shake after? Is this intentional or just whatever happens?"
          minRows={3}
        />
      </div>

      {/* Processed food */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Processed food intake</label>
        <ExpandingTextarea
          value={data.processedFood || ''}
          onChange={val => onChange({ processedFood: val })}
          placeholder="e.g., mostly whole foods, mix of both, lots of packaged/fast food..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
        />
      </div>

      {/* Micronutrients */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Micronutrient awareness</label>
        <ExpandingTextarea
          value={data.micronutrients || ''}
          onChange={val => onChange({ micronutrients: val })}
          placeholder="Known deficiencies or tracking? (e.g., low vitamin D, iron deficient, don't track)"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
        />
      </div>

      {/* Supplements */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Supplements</label>
        <ExpandingTextarea
          value={data.supplements || ''}
          onChange={val => onChange({ supplements: val })}
          placeholder="e.g., whey protein, creatine 5g/day, vitamin D, fish oil, multivitamin, none..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
        />
      </div>

      {/* Food quality */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Food quality & sourcing</label>
        <ExpandingTextarea
          value={data.foodQuality || ''}
          onChange={val => onChange({ foodQuality: val })}
          placeholder="e.g., mostly home-cooked, 50/50 takeout, organic when possible, budget-conscious..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
        />
      </div>
    </div>
  );
}
