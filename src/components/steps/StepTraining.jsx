import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
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

// Exercise-specific detail configurations
const EXERCISE_DETAILS = {
  'running': {
    fields: [
      { key: 'avgDistance', label: 'Typical run distance', type: 'text', placeholder: 'e.g., 3-5 miles' },
      { key: 'pace', label: 'Average pace', type: 'text', placeholder: 'e.g., 9:00/mile' },
      { key: 'terrain', label: 'Terrain', type: 'select', options: ['Road', 'Trail', 'Treadmill', 'Mixed'] },
      { key: 'zone', label: 'Heart rate zone focus', type: 'select', options: ['Zone 2 (easy)', 'Zone 3 (moderate)', 'Zone 4-5 (hard)', 'Mixed'] },
    ],
  },
  'weightlifting': {
    fields: [
      { key: 'split', label: 'Training split', type: 'select', options: ['Push/Pull/Legs', 'Upper/Lower', 'Full Body', 'Bro Split', 'Other'] },
      { key: 'duration', label: 'Session duration', type: 'select', options: ['30-45 min', '45-60 min', '60-90 min', '90+ min'] },
      { key: 'focus', label: 'Primary focus', type: 'select', options: ['Strength', 'Hypertrophy', 'Endurance', 'Mixed'] },
    ],
  },
  'yoga': {
    fields: [
      { key: 'style', label: 'Style', type: 'select', options: ['Vinyasa/Flow', 'Hot/Bikram', 'Hatha', 'Yin/Restorative', 'Power', 'Mixed'] },
      { key: 'duration', label: 'Class duration', type: 'select', options: ['30 min', '45 min', '60 min', '75 min', '90 min'] },
      { key: 'location', label: 'Where', type: 'select', options: ['Studio', 'Home', 'Both'] },
    ],
  },
  'cycling': {
    fields: [
      { key: 'type', label: 'Type', type: 'select', options: ['Road', 'Mountain', 'Indoor/Spin', 'Commute', 'Mixed'] },
      { key: 'avgDistance', label: 'Typical ride distance', type: 'text', placeholder: 'e.g., 15-20 miles' },
      { key: 'duration', label: 'Average ride time', type: 'text', placeholder: 'e.g., 45-60 min' },
    ],
  },
  'swimming': {
    fields: [
      { key: 'type', label: 'Type', type: 'select', options: ['Lap swimming', 'Open water', 'Both'] },
      { key: 'distance', label: 'Typical distance', type: 'text', placeholder: 'e.g., 1500m, 1 mile' },
      { key: 'duration', label: 'Session duration', type: 'select', options: ['30 min', '45 min', '60 min', '90 min'] },
    ],
  },
  'hiit': {
    fields: [
      { key: 'duration', label: 'Session duration', type: 'select', options: ['15-20 min', '20-30 min', '30-45 min', '45+ min'] },
      { key: 'style', label: 'Style', type: 'select', options: ['CrossFit', 'Bootcamp', 'Tabata', 'Circuit training', 'Other'] },
    ],
  },
  'walking': {
    fields: [
      { key: 'avgDistance', label: 'Typical walk distance', type: 'text', placeholder: 'e.g., 2-3 miles' },
      { key: 'pace', label: 'Pace', type: 'select', options: ['Leisurely', 'Moderate', 'Brisk/Power walking'] },
    ],
  },
  'pilates': {
    fields: [
      { key: 'type', label: 'Type', type: 'select', options: ['Mat', 'Reformer', 'Both'] },
      { key: 'duration', label: 'Session duration', type: 'select', options: ['30 min', '45 min', '50 min', '60 min'] },
    ],
  },
  'tennis': {
    fields: [
      { key: 'type', label: 'Type', type: 'select', options: ['Singles', 'Doubles', 'Both'] },
      { key: 'duration', label: 'Match/session duration', type: 'select', options: ['30-60 min', '60-90 min', '90+ min'] },
      { key: 'level', label: 'Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced', 'Competitive'] },
    ],
  },
  'basketball': {
    fields: [
      { key: 'type', label: 'Type', type: 'select', options: ['Pickup games', 'League', 'Solo drills', 'Mixed'] },
      { key: 'duration', label: 'Session duration', type: 'select', options: ['30-60 min', '60-90 min', '90+ min'] },
    ],
  },
  'rock climbing': {
    fields: [
      { key: 'type', label: 'Type', type: 'select', options: ['Bouldering', 'Top rope', 'Lead', 'Outdoor', 'Mixed'] },
      { key: 'duration', label: 'Session duration', type: 'select', options: ['60 min', '90 min', '2 hours', '2+ hours'] },
      { key: 'level', label: 'Grade range', type: 'text', placeholder: 'e.g., V3-V5, 5.10-5.11' },
    ],
  },
  'martial arts': {
    fields: [
      { key: 'style', label: 'Style', type: 'text', placeholder: 'e.g., BJJ, Muay Thai, Boxing, MMA' },
      { key: 'duration', label: 'Class duration', type: 'select', options: ['45 min', '60 min', '90 min', '2 hours'] },
    ],
  },
  'dancing': {
    fields: [
      { key: 'style', label: 'Style', type: 'text', placeholder: 'e.g., Salsa, Hip hop, Ballet, Zumba' },
      { key: 'duration', label: 'Session duration', type: 'select', options: ['30 min', '45 min', '60 min', '90 min'] },
    ],
  },
  'rowing': {
    fields: [
      { key: 'type', label: 'Type', type: 'select', options: ['Ergometer/Indoor', 'On water', 'Both'] },
      { key: 'duration', label: 'Session duration', type: 'select', options: ['15-20 min', '20-30 min', '30-45 min', '45+ min'] },
    ],
  },
};

// Get detail config for an exercise (case-insensitive)
function getExerciseDetails(name) {
  const key = name.toLowerCase();
  return EXERCISE_DETAILS[key] || null;
}

export default function StepTraining({ data, onChange }) {
  const [customExercise, setCustomExercise] = useState('');
  const [expandedExercise, setExpandedExercise] = useState(null);

  function addExercise(name) {
    if (data.exercises.find(e => e.name === name)) return;
    onChange({ exercises: [...data.exercises, { name, frequency: 3 }] });
    // Auto-expand if exercise has detail fields
    if (getExerciseDetails(name)) {
      setExpandedExercise(name);
    }
  }

  function removeExercise(name) {
    onChange({ exercises: data.exercises.filter(e => e.name !== name) });
    if (expandedExercise === name) setExpandedExercise(null);
  }

  function updateExercise(name, updates) {
    onChange({
      exercises: data.exercises.map(e =>
        e.name === name ? { ...e, ...updates } : e
      ),
    });
  }

  function updateFrequency(name, frequency) {
    updateExercise(name, { frequency: parseInt(frequency) || 0 });
  }

  function updateDetail(name, key, value) {
    const exercise = data.exercises.find(e => e.name === name);
    const details = exercise?.details || {};
    updateExercise(name, { details: { ...details, [key]: value } });
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
      <p className="text-gray-500 text-sm">Tell us about your current activities so Lockhart can estimate your calorie needs accurately.</p>

      {/* Exercise Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Current activities & frequency</label>

        {data.exercises.length > 0 && (
          <div className="space-y-2 mb-3">
            {data.exercises.map(exercise => {
              const detailConfig = getExerciseDetails(exercise.name);
              const isExpanded = expandedExercise === exercise.name;
              const hasDetails = detailConfig && detailConfig.fields.length > 0;

              return (
                <div key={exercise.name} className="rounded-xl border border-primary-200 overflow-hidden">
                  {/* Exercise header row */}
                  <div className="flex items-center gap-3 p-3 bg-primary-50">
                    {hasDetails && (
                      <button
                        onClick={() => setExpandedExercise(isExpanded ? null : exercise.name)}
                        className="p-1 text-gray-500 hover:text-gray-700"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    )}
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

                  {/* Exercise detail fields (expandable) */}
                  {hasDetails && isExpanded && (
                    <div className="p-3 bg-white border-t border-primary-100 space-y-3">
                      <p className="text-xs text-gray-500">Add details for more accurate calorie estimates:</p>
                      {detailConfig.fields.map(field => (
                        <div key={field.key} className="flex items-center gap-3">
                          <label className="text-xs text-gray-600 w-28 flex-shrink-0">{field.label}</label>
                          {field.type === 'select' ? (
                            <select
                              value={exercise.details?.[field.key] || ''}
                              onChange={e => updateDetail(exercise.name, field.key, e.target.value)}
                              className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:border-primary-400 outline-none"
                            >
                              <option value="">Select...</option>
                              {field.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={exercise.details?.[field.key] || ''}
                              onChange={e => updateDetail(exercise.name, field.key, e.target.value)}
                              placeholder={field.placeholder}
                              className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:border-primary-400 outline-none"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hint to expand for details */}
                  {hasDetails && !isExpanded && (
                    <button
                      onClick={() => setExpandedExercise(exercise.name)}
                      className="w-full px-3 py-1.5 text-xs text-primary-600 bg-primary-50/50 hover:bg-primary-100 text-left"
                    >
                      + Add details (distance, duration, style...)
                    </button>
                  )}
                </div>
              );
            })}
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

      {/* Intensity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Overall training intensity</label>
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

      {/* Training Age */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Training experience</label>
        <ExpandingTextarea
          value={data.trainingAge || ''}
          onChange={val => onChange({ trainingAge: val })}
          placeholder="e.g., 2 years consistently, 6 months, just starting out, on and off for 5 years..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
        />
      </div>

      {/* Injuries - Important for safety */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Injuries or limitations</label>
        <RichTextArea
          value={data.injuries}
          onChange={val => onChange({ injuries: val })}
          hint="Current or past injuries, chronic pain, surgeries, mobility restrictions. Or 'none' if injury-free."
          minRows={2}
        />
      </div>

      {/* Recovery approach */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Recovery approach</label>
        <ExpandingTextarea
          value={data.recoveryDays || ''}
          onChange={val => onChange({ recoveryDays: val })}
          placeholder="e.g., 2 rest days/week, active recovery on off days, listen to my body..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
        />
      </div>
    </div>
  );
}
