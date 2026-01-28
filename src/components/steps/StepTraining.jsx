import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import RichTextArea from '../RichTextArea';
import ExpandingTextarea from '../ExpandingTextarea';

const EXERCISE_SUGGESTIONS = [
  'Yoga', 'Weightlifting', 'Running', 'Cycling', 'Swimming',
  'HIIT', 'Walking', 'Pilates', 'Basketball', 'Tennis',
  'Rock Climbing', 'Martial Arts', 'Dancing', 'Rowing',
];

const INTENSITY_OPTIONS = [
  { value: 'light', label: 'Light', desc: 'Can hold a conversation easily' },
  { value: 'moderate', label: 'Moderate', desc: 'Challenging but sustainable' },
  { value: 'hard', label: 'Hard', desc: 'Near max effort regularly' },
  { value: 'mixed', label: 'Mixed', desc: 'Varies by session' },
];

export default function StepTraining({ data, onChange }) {
  const [customExercise, setCustomExercise] = useState('');

  function addExercise(name) {
    if (data.exercises.find(e => e.name === name)) return;
    onChange({ exercises: [...data.exercises, { name, frequency: 3 }] });
  }

  function removeExercise(name) {
    onChange({ exercises: data.exercises.filter(e => e.name !== name) });
  }

  function updateFrequency(name, frequency) {
    onChange({
      exercises: data.exercises.map(e =>
        e.name === name ? { ...e, frequency: parseInt(frequency) || 0 } : e
      ),
    });
  }

  function addCustom() {
    if (customExercise.trim() && !data.exercises.find(e => e.name === customExercise.trim())) {
      addExercise(customExercise.trim());
      setCustomExercise('');
    }
  }

  const available = EXERCISE_SUGGESTIONS.filter(
    name => !data.exercises.find(e => e.name === name)
  );

  return (
    <div className="space-y-6">
      <p className="text-gray-500 text-sm">Progressive training with proper recovery enables body recomposition.</p>

      {/* Exercise Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Current activities & frequency</label>

        {data.exercises.length > 0 && (
          <div className="space-y-2 mb-3">
            {data.exercises.map(exercise => (
              <div key={exercise.name} className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl">
                <span className="flex-1 text-sm font-medium text-gray-700">{exercise.name}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={exercise.frequency}
                    onChange={e => updateFrequency(exercise.name, e.target.value)}
                    className="w-14 px-2 py-1 text-center rounded-lg border border-primary-200 text-sm"
                  />
                  <span className="text-xs text-gray-500">/wk</span>
                </div>
                <button onClick={() => removeExercise(exercise.name)} className="p-1 text-gray-400 hover:text-red-500">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          {available.map(name => (
            <button
              key={name}
              onClick={() => addExercise(name)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all"
            >
              + {name}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={customExercise}
            onChange={e => setCustomExercise(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustom()}
            placeholder="Add your own..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
          />
          <button onClick={addCustom} className="px-4 py-2.5 bg-primary-100 text-primary-700 rounded-xl hover:bg-primary-200">
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Training Age */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Training age</label>
        <ExpandingTextarea
          value={data.trainingAge || ''}
          onChange={val => onChange({ trainingAge: val })}
          placeholder="e.g., 2 years consistently, 6 months, just starting out..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
        />
      </div>

      {/* Intensity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Typical training intensity</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {INTENSITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ trainingIntensity: opt.value })}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                data.trainingIntensity === opt.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <span className="font-medium text-sm">{opt.label}</span>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Progressive Overload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Progressive overload</label>
        <RichTextArea
          value={data.progressiveOverload}
          onChange={val => onChange({ progressiveOverload: val })}
          hint="Do you track and increase weights, reps, or distance over time? Use an app? Go by feel? Have a structured approach or just wing it?"
          minRows={3}
        />
      </div>

      {/* Recovery days */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Recovery approach</label>
        <RichTextArea
          value={data.recoveryDays}
          onChange={val => onChange({ recoveryDays: val })}
          hint="How many rest days per week? Complete rest or active recovery (walks, yoga)? Do you listen to your body or follow a fixed schedule regardless?"
          minRows={3}
        />
      </div>

      {/* Injuries */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Injuries or physical limitations</label>
        <RichTextArea
          value={data.injuries}
          onChange={val => onChange({ injuries: val })}
          hint="Current or past injuries that affect what you can do. Chronic pain areas, surgeries, mobility restrictions, things you avoid. Or 'none' if you're injury-free."
          minRows={3}
        />
      </div>

      {/* Program */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Training program</label>
        <ExpandingTextarea
          value={data.trainingProgram || ''}
          onChange={val => onChange({ trainingProgram: val })}
          placeholder="e.g., PPL split, 5/3/1, Couch to 5K, self-directed, no program..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
        />
      </div>

      {/* Cardio type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Cardio approach</label>
        <ExpandingTextarea
          value={data.cardioType || ''}
          onChange={val => onChange({ cardioType: val })}
          placeholder="e.g., Zone 2 runs, HIIT 2x/week, mix of both, just walking..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
        />
      </div>

      {/* Flexibility */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Flexibility & mobility work</label>
        <ExpandingTextarea
          value={data.flexibilityWork || ''}
          onChange={val => onChange({ flexibilityWork: val })}
          placeholder="e.g., stretch after workouts, yoga 1x/week, foam roll daily, nothing..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
        />
      </div>
    </div>
  );
}
