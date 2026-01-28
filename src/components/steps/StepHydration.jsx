import RichTextArea from '../RichTextArea';
import ExpandingTextarea from '../ExpandingTextarea';

const SWEAT_RATES = [
  { value: 'light', label: 'Light', desc: "Don't sweat much" },
  { value: 'moderate', label: 'Moderate', desc: 'Average sweater' },
  { value: 'heavy', label: 'Heavy', desc: 'Soak through clothes easily' },
];

export default function StepHydration({ data, onChange }) {
  return (
    <div className="space-y-6">
      <p className="text-gray-500 text-sm">Even 2% dehydration significantly reduces exercise performance.</p>

      {/* Daily intake */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Daily water intake</label>
        <ExpandingTextarea
          value={data.waterIntake || ''}
          onChange={val => onChange({ waterIntake: val })}
          placeholder="e.g., 64 oz, about 2 liters, 8 glasses, not sure..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
        />
      </div>

      {/* Hydration habits */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Hydration habits</label>
        <RichTextArea
          value={data.hydrationHabits}
          onChange={val => onChange({ hydrationHabits: val })}
          hint="Do you drink consistently throughout the day or forget until you're thirsty? Carry a water bottle? Mostly drink with meals? Does it change by season or activity level?"
          minRows={3}
        />
      </div>

      {/* Workout hydration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Workout hydration strategy</label>
        <ExpandingTextarea
          value={data.workoutHydration || ''}
          onChange={val => onChange({ workoutHydration: val })}
          placeholder="e.g., water during, sports drink for long sessions, drink when thirsty..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
        />
      </div>

      {/* Electrolytes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Electrolyte intake</label>
        <ExpandingTextarea
          value={data.electrolytes || ''}
          onChange={val => onChange({ electrolytes: val })}
          placeholder="e.g., LMNT packets, Gatorade on long runs, salt food well, none..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
        />
      </div>

      {/* Urine color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Urine color awareness</label>
        <ExpandingTextarea
          value={data.urineColor || ''}
          onChange={val => onChange({ urineColor: val })}
          placeholder="e.g., usually pale yellow, often dark in the morning, don't monitor..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
        />
      </div>

      {/* Sweat rate */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Sweat rate during exercise</label>
        <div className="grid grid-cols-3 gap-2">
          {SWEAT_RATES.map(rate => (
            <button
              key={rate.value}
              onClick={() => onChange({ sweatRate: rate.value })}
              className={`text-center p-3 rounded-xl border-2 transition-all ${
                data.sweatRate === rate.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <span className="font-medium text-sm">{rate.label}</span>
              <p className="text-xs text-gray-500 mt-0.5">{rate.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Alcohol */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Alcohol consumption</label>
        <ExpandingTextarea
          value={data.alcohol || ''}
          onChange={val => onChange({ alcohol: val })}
          placeholder="e.g., 2-3 drinks/week, weekends only, rarely, none..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
        />
      </div>
    </div>
  );
}
