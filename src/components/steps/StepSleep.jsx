import RichTextArea from '../RichTextArea';
import ExpandingTextarea from '../ExpandingTextarea';

const QUALITY_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

const CONSISTENCY_OPTIONS = [
  { value: 'very_consistent', label: 'Very consistent', desc: 'Same times every day' },
  { value: 'mostly_consistent', label: 'Mostly consistent', desc: 'Weekdays are regular' },
  { value: 'inconsistent', label: 'Inconsistent', desc: 'Varies a lot day to day' },
  { value: 'shift_based', label: 'Shift-based', desc: 'Rotating or irregular schedule' },
];

export default function StepSleep({ data, onChange }) {
  return (
    <div className="space-y-6">
      <p className="text-gray-500 text-sm">Sleep directly impacts recovery, hormone regulation, and performance.</p>

      {/* Sleep Quality */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sleep quality <span className="text-gray-400 font-normal">(1 = terrible, 10 = perfect)</span>
        </label>
        <div className="flex gap-1.5">
          {QUALITY_OPTIONS.map(n => (
            <button
              key={n}
              onClick={() => onChange({ sleepQuality: n.toString() })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                data.sleepQuality === n.toString()
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Average hours per night</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Weekdays</label>
            <input
              type="number"
              step="0.5"
              value={data.sleepHoursWeekday}
              onChange={e => onChange({ sleepHoursWeekday: e.target.value })}
              placeholder="e.g., 7"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Weekends</label>
            <input
              type="number"
              step="0.5"
              value={data.sleepHoursWeekend}
              onChange={e => onChange({ sleepHoursWeekend: e.target.value })}
              placeholder="e.g., 8.5"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Consistency */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Sleep consistency</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CONSISTENCY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ sleepConsistency: opt.value })}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                data.sleepConsistency === opt.value
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

      {/* Disruptions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Sleep disruptions</label>
        <RichTextArea
          value={data.sleepDisruptions}
          onChange={val => onChange({ sleepDisruptions: val })}
          hint="Do you have trouble falling asleep? Wake up during the night? Feel groggy in the morning? Snore? Have racing thoughts at bedtime?"
          minRows={3}
        />
      </div>

      {/* Pre-sleep habits */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Pre-sleep habits & wind-down routine</label>
        <RichTextArea
          value={data.preSleepHabits}
          onChange={val => onChange({ preSleepHabits: val })}
          hint="What does your last hour before bed look like? Phone in bed? Reading? TV? When do you cut off caffeine? Do you have a wind-down routine or just crash?"
          minRows={3}
        />
      </div>

      {/* Naps */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Naps</label>
        <ExpandingTextarea
          value={data.naps || ''}
          onChange={val => onChange({ naps: val })}
          placeholder="e.g., never, 20 min after lunch daily, occasional weekend naps..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
        />
      </div>
    </div>
  );
}
