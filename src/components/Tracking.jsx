import { useState } from 'react';
import { Scale, Dumbbell, UtensilsCrossed, Heart, Check, Calendar } from 'lucide-react';
import { addEntry, getEntries } from '../trackingStore';
import TrackingCalendar from './TrackingCalendar';

const TABS = [
  { id: 'weight', label: 'Weight', icon: Scale },
  { id: 'workout', label: 'Workout', icon: Dumbbell },
];

const WORKOUT_TYPES = ['Yoga', 'Weightlifting', 'Running', 'Walking', 'Cycling', 'Swimming', 'HIIT', 'Other'];

export default function Tracking() {
  const [tab, setTab] = useState('weight');
  const [showCalendar, setShowCalendar] = useState(false);
  const [saved, setSaved] = useState(null);
  const [entries, setEntries] = useState(() => getEntries());

  // Weight form
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('lbs');

  // Workout form
  const [workoutType, setWorkoutType] = useState('Weightlifting');
  const [duration, setDuration] = useState('');
  const [workoutNotes, setWorkoutNotes] = useState('');

  function showSavedFeedback() {
    setSaved(tab);
    setTimeout(() => setSaved(null), 1500);
  }

  function handleLogWeight(e) {
    e.preventDefault();
    if (!weight) return;
    const updated = addEntry({ type: 'weight', value: parseFloat(weight), unit: weightUnit });
    setEntries(updated);
    setWeight('');
    showSavedFeedback();
  }

  function handleLogWorkout(e) {
    e.preventDefault();
    if (!workoutType) return;
    const updated = addEntry({ type: 'workout', workoutType, duration: duration ? parseInt(duration) : null, notes: workoutNotes || null });
    setEntries(updated);
    setDuration('');
    setWorkoutNotes('');
    showSavedFeedback();
  }

  return (
    <div className="flex-1">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-bold text-gray-900">Track</h1>
          <button
            onClick={() => setShowCalendar(c => !c)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showCalendar ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Calendar size={15} />
            Calendar
          </button>
        </div>

        {showCalendar && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <TrackingCalendar entries={entries} />
          </div>
        )}

        {/* Quick-log tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Forms */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          {saved === tab && (
            <div className="flex items-center gap-2 mb-3 text-sm text-green-600 font-medium animate-in fade-in">
              <Check size={16} /> Saved!
            </div>
          )}

          {tab === 'weight' && (
            <form onSubmit={handleLogWeight} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Today's weight</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder="Enter weight"
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus
                />
                <select
                  value={weightUnit}
                  onChange={e => setWeightUnit(e.target.value)}
                  className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={!weight}
                className="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-40 transition-colors"
              >
                Log Weight
              </button>
            </form>
          )}

          {tab === 'workout' && (
            <form onSubmit={handleLogWorkout} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Workout</label>
              <select
                value={workoutType}
                onChange={e => setWorkoutType(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {WORKOUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                type="number"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="Duration (minutes) — optional"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <input
                type="text"
                value={workoutNotes}
                onChange={e => setWorkoutNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                Log Workout
              </button>
            </form>
          )}
        </div>

        {/* Recent entries */}
        <RecentEntries entries={entries} />
      </div>
    </div>
  );
}

function RecentEntries({ entries }) {
  const recent = entries
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  if (recent.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent</h3>
      <div className="space-y-2">
        {recent.map(entry => (
          <div key={entry.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-2.5">
            <EntryIcon type={entry.type} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 truncate">{formatEntryShort(entry)}</p>
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {formatRelativeDate(entry.date)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EntryIcon({ type }) {
  const icons = { weight: Scale, workout: Dumbbell, meal: UtensilsCrossed, feeling: Heart };
  const colors = { weight: 'text-purple-500 bg-purple-50', workout: 'text-blue-500 bg-blue-50', meal: 'text-green-500 bg-green-50', feeling: 'text-amber-500 bg-amber-50' };
  const Icon = icons[type] || Scale;
  return (
    <div className={`p-1.5 rounded-lg ${colors[type] || 'text-gray-500 bg-gray-50'}`}>
      <Icon size={14} />
    </div>
  );
}

function formatEntryShort(entry) {
  switch (entry.type) {
    case 'weight': return `${entry.value} ${entry.unit}`;
    case 'workout': return `${entry.workoutType}${entry.duration ? ` · ${entry.duration} min` : ''}`;
    case 'meal': return entry.description;
    case 'feeling': return `Energy ${entry.energy} · Motivation ${entry.motivation} · ${entry.mood}`;
    default: return '';
  }
}

function formatRelativeDate(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
