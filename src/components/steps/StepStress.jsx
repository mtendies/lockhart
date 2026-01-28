import RichTextArea from '../RichTextArea';

const STRESS_LEVELS = [
  { value: 'low', label: 'Low', desc: 'Generally relaxed, manageable demands' },
  { value: 'moderate', label: 'Moderate', desc: 'Regular stress but coping well' },
  { value: 'high', label: 'High', desc: 'Frequently overwhelmed or tense' },
  { value: 'very_high', label: 'Very High', desc: 'Constant stress, difficulty coping' },
];

export default function StepStress({ data, onChange }) {
  return (
    <div className="space-y-6">
      <p className="text-gray-500 text-sm">Chronic stress elevates cortisol, impairing recovery and increasing injury risk.</p>

      {/* Stress Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Work/life stress level</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {STRESS_LEVELS.map(level => (
            <button
              key={level.value}
              onClick={() => onChange({ stressLevel: level.value })}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                data.stressLevel === level.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <span className="font-medium text-sm">{level.label}</span>
              <p className="text-xs text-gray-500 mt-0.5">{level.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Mental Health */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Mental health <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <RichTextArea
          value={data.mentalHealth}
          onChange={val => onChange({ mentalHealth: val })}
          hint="Any anxiety, depression, ADHD, mood concerns, or conditions? How do they affect your energy, motivation, or routine? This stays private and helps personalize recommendations."
          minRows={3}
        />
      </div>

      {/* Stress Management */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">How do you manage stress?</label>
        <RichTextArea
          value={data.stressManagement}
          onChange={val => onChange({ stressManagement: val })}
          hint="Meditation, yoga, breathwork, journaling, therapy, long walks, music, time with friends, video games, nothing currently... Whatever works for you (or what you wish you did more of)."
          minRows={3}
        />
      </div>

      {/* Life Stressors */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Current life stressors <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <RichTextArea
          value={data.lifeStressors}
          onChange={val => onChange({ lifeStressors: val })}
          hint="Major life events, job transitions, financial pressure, relationship dynamics, caregiving, health concerns of loved ones... Context helps the advisor understand your full picture."
          minRows={3}
        />
      </div>

      {/* Recovery Practices */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Physical recovery practices</label>
        <RichTextArea
          value={data.recoveryPractices}
          onChange={val => onChange({ recoveryPractices: val })}
          hint="Foam rolling, stretching routines, massage, sauna, cold plunge, epsom salt baths, compression boots, or nothing at all. How do you recover between training sessions?"
          minRows={3}
        />
      </div>
    </div>
  );
}
