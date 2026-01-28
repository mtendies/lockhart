import RichTextArea from '../RichTextArea';
import ExpandingTextarea from '../ExpandingTextarea';

const MOTIVATION_OPTIONS = [
  { value: 'intrinsic', label: 'Intrinsic', desc: 'Enjoy the process itself' },
  { value: 'extrinsic', label: 'Goal-driven', desc: 'Motivated by specific outcomes' },
  { value: 'mixed', label: 'Both', desc: 'Mix of enjoyment and goals' },
  { value: 'struggling', label: 'Struggling', desc: 'Hard to stay motivated' },
];

const ADHERENCE_OPTIONS = [
  { value: 'all_in', label: 'All-in', desc: 'Go hard then burn out' },
  { value: 'moderate', label: 'Moderate', desc: 'Steady and sustainable' },
  { value: 'inconsistent', label: 'Inconsistent', desc: 'On and off patterns' },
  { value: 'building', label: 'Building', desc: 'Working on consistency' },
];

export default function StepBehavioral({ data, onChange }) {
  return (
    <div className="space-y-6">
      <p className="text-gray-500 text-sm">Understanding your patterns helps the advisor give realistic, sustainable recommendations.</p>

      {/* Motivation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">What motivates you?</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MOTIVATION_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ motivation: opt.value })}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                data.motivation === opt.value
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

      {/* Past attempts */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Past diet & exercise attempts</label>
        <RichTextArea
          value={data.pastAttempts}
          onChange={val => onChange({ pastAttempts: val })}
          hint="What have you tried before? What worked, even temporarily? What didn't stick and why? Keto, calorie counting, group classes, personal trainer, running streak, etc. Your history helps avoid repeating what doesn't work for you."
          minRows={4}
        />
      </div>

      {/* Adherence patterns */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Adherence pattern</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ADHERENCE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ adherencePatterns: opt.value })}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                data.adherencePatterns === opt.value
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

      {/* Social eating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Social eating</label>
        <ExpandingTextarea
          value={data.socialEating || ''}
          onChange={val => onChange({ socialEating: val })}
          placeholder="How often do you eat out or with others? (e.g., 3-4x/week, mostly alone, every meal with family)"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
        />
      </div>

      {/* Meal prep */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Meal prep</label>
        <ExpandingTextarea
          value={data.mealPrep || ''}
          onChange={val => onChange({ mealPrep: val })}
          placeholder="e.g., Sunday meal prep, cook fresh daily, never prep ahead, batch cook proteins..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
        />
      </div>

      {/* Relationship with food */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Relationship with food <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <RichTextArea
          value={data.foodRelationship}
          onChange={val => onChange({ foodRelationship: val })}
          hint="Any patterns worth sharing: emotional eating, binge/restrict cycles, food guilt, orthorexia tendencies, or a generally healthy relationship. This helps the advisor be sensitive to your needs and avoid triggering recommendations."
          minRows={3}
        />
      </div>
    </div>
  );
}
