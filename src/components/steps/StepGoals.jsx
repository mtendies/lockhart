import { ChevronDown } from 'lucide-react';
import ExpandingTextarea from '../ExpandingTextarea';

const GOAL_OPTIONS = [
  { value: 'fat_loss', label: 'Lose Body Fat', desc: 'Reduce body fat while maintaining muscle', placeholder: 'e.g., "I want to go from 20% to 12-15% body fat over 6 months"' },
  { value: 'muscle_gain', label: 'Build Muscle', desc: 'Build strength and muscle mass', placeholder: 'e.g., "I want to add 10lbs of lean muscle and increase my bench press to 225lbs"' },
  { value: 'endurance', label: 'Improve Endurance', desc: 'Improve cardiovascular fitness', placeholder: 'e.g., "I want to run 10 miles comfortably by summer" or "Complete a half marathon"' },
  { value: 'marathon', label: 'Marathon/Race Training', desc: 'Prepare for a specific race or event', placeholder: 'e.g., "I\'m training for the Chicago Marathon in October, aiming for sub-4 hours"' },
  { value: 'strength', label: 'Get Stronger', desc: 'Increase overall strength', placeholder: 'e.g., "I want to hit a 315lb squat and 405lb deadlift"' },
  { value: 'general_health', label: 'General Health', desc: 'Feel better overall, more energy', placeholder: 'e.g., "I want more energy throughout the day and to feel healthier overall"' },
  { value: 'flexibility', label: 'Flexibility & Mobility', desc: 'Improve range of motion', placeholder: 'e.g., "I want to be able to touch my toes and do a full squat without pain"' },
  { value: 'stress', label: 'Stress Management', desc: 'Better mental health and recovery', placeholder: 'e.g., "I want to manage work stress better and not feel burned out"' },
  { value: 'sleep', label: 'Better Sleep', desc: 'Improve sleep quality and duration', placeholder: 'e.g., "I want to consistently get 7-8 hours of quality sleep"' },
  { value: 'nutrition', label: 'Better Nutrition', desc: 'Eat healthier without obsessing', placeholder: 'e.g., "I want to eat more whole foods and reduce sugar intake"' },
];

export default function StepGoals({ data, onChange }) {
  const goals = data.goals || [];
  const goalDetails = data.goalDetails || {};

  function toggleGoal(value) {
    if (goals.includes(value)) {
      // Remove goal and its details
      const newDetails = { ...goalDetails };
      delete newDetails[value];
      onChange({
        goals: goals.filter(g => g !== value),
        goalDetails: newDetails
      });
    } else {
      onChange({
        goals: [...goals, value],
        goalDetails: { ...goalDetails, [value]: '' }
      });
    }
  }

  function updateGoalDetail(goalValue, detail) {
    onChange({
      goalDetails: { ...goalDetails, [goalValue]: detail }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-600 text-sm">
        Select your goals, then tell me specifically what you want to achieve. The more detail you provide, the better I can help.
      </p>

      <div className="space-y-3">
        {GOAL_OPTIONS.map(goal => {
          const selected = goals.includes(goal.value);
          return (
            <div key={goal.value} className="space-y-2">
              <button
                onClick={() => toggleGoal(goal.value)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selected ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                    }`}>
                      {selected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-gray-800">{goal.label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{goal.desc}</p>
                    </div>
                  </div>
                  {selected && (
                    <ChevronDown size={18} className="text-primary-500" />
                  )}
                </div>
              </button>

              {/* Expanded detail input */}
              {selected && (
                <div className="ml-8 animate-in slide-in-from-top-2 duration-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tell me more — what specifically do you want to achieve?
                  </label>
                  <ExpandingTextarea
                    value={goalDetails[goal.value] || ''}
                    onChange={(val) => updateGoalDetail(goal.value, val)}
                    placeholder={goal.placeholder}
                    rows={2}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
