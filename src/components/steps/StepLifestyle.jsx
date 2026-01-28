import RichTextArea from '../RichTextArea';
import ExpandingTextarea from '../ExpandingTextarea';

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Desk job, minimal movement' },
  { value: 'lightly_active', label: 'Lightly Active', desc: 'Some walking, light tasks' },
  { value: 'active', label: 'Active', desc: 'On your feet most of the day' },
  { value: 'very_active', label: 'Very Active', desc: 'Physical labor or constant movement' },
];

export default function StepLifestyle({ data, onChange }) {
  return (
    <div className="space-y-6">
      {/* Work Activity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Work Activity Level</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACTIVITY_LEVELS.map(level => (
            <button
              key={level.value}
              onClick={() => onChange({ activityLevel: level.value })}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                data.activityLevel === level.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <span className="font-medium text-sm">{level.label}</span>
              <p className="text-xs text-gray-500 mt-0.5">{level.desc}</p>
            </button>
          ))}
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tell me more about your typical work day</label>
          <RichTextArea
            value={data.activityDetail}
            onChange={val => onChange({ activityDetail: val })}
            hint="What does a typical day look like? Are you at a desk, on your feet, moving between locations? Do you take breaks to walk? Work from home or commute?"
            minRows={3}
          />
        </div>
      </div>

      {/* Schedule */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Daily Schedule</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Wake up</label>
            <input
              type="time"
              value={data.wakeTime}
              onChange={e => onChange({ wakeTime: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bedtime</label>
            <input
              type="time"
              value={data.bedTime}
              onChange={e => onChange({ bedTime: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs text-gray-500 mb-1">Work hours</label>
          <ExpandingTextarea
            value={data.workHours || ''}
            onChange={val => onChange({ workHours: val })}
            placeholder="e.g., 9am–5pm, flexible, shift work..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
          />
        </div>
        <div className="mt-3">
          <label className="block text-xs text-gray-500 mb-1">Best times to exercise or cook</label>
          <ExpandingTextarea
            value={data.availableTime || ''}
            onChange={val => onChange({ availableTime: val })}
            placeholder="e.g., mornings before work, lunch break, evenings after 7pm..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
          />
        </div>
      </div>

      {/* Daily Life */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Daily Life</label>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Commute</label>
            <ExpandingTextarea
              value={data.commute || ''}
              onChange={val => onChange({ commute: val })}
              placeholder="e.g., 30 min drive, work from home, bike 20 min..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Daily steps (if tracked)</label>
              <input
                type="text"
                value={data.dailySteps}
                onChange={e => onChange({ dailySteps: e.target.value })}
                placeholder="e.g., ~8,000"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Screen time (hrs/day)</label>
              <input
                type="text"
                value={data.screenTime}
                onChange={e => onChange({ screenTime: e.target.value })}
                placeholder="e.g., 8+ for work"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Social support</label>
            <ExpandingTextarea
              value={data.socialSupport || ''}
              onChange={val => onChange({ socialSupport: val })}
              placeholder="e.g., training partner, supportive partner, gym community..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hobbies & interests</label>
            <ExpandingTextarea
              value={data.hobbies || ''}
              onChange={val => onChange({ hobbies: val })}
              placeholder="e.g., reading, gaming, hiking, photography..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Helps personalize suggestions and conversation</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Travel frequency</label>
            <ExpandingTextarea
              value={data.travelFrequency || ''}
              onChange={val => onChange({ travelFrequency: val })}
              placeholder="e.g., rarely, monthly for work, weekends away..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
