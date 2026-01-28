import { useState, useEffect, useMemo } from 'react';
import {
  Dumbbell,
  TrendingUp,
  Lightbulb,
  History,
  Send,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Search,
  Filter,
  Calendar,
  Clock,
  Target,
  Award,
  Trash2,
  Edit3,
  CheckCircle2,
  Flame,
  ArrowRight,
  Zap,
  Heart,
  Timer,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  logWorkout,
  getRecentWorkouts,
  getAllWorkouts,
  getTrackedMetrics,
  saveTrackedMetrics,
  addTrackedMetric,
  removeTrackedMetric,
  getMetricProgress,
  getMetricPR,
  getWorkoutStats,
  parseQuickEntry,
  groupWorkoutsByDate,
  formatWorkoutDate,
  isThisWeek,
  isLastWeek,
  deleteWorkout,
  COMMON_EXERCISES,
  TRAINING_TYPES,
} from '../workoutStore';
import { getPlaybook } from '../playbookStore';

const TABS = [
  { id: 'log', label: 'Log', icon: Plus },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'recommendations', label: 'Tips', icon: Lightbulb },
  { id: 'history', label: 'History', icon: History },
];

export default function TrainingPage({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('log');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  function handleWorkoutLogged() {
    setRefreshKey(k => k + 1);
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 flex-shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-200/50">
              <Dumbbell className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Training</h1>
              <p className="text-sm text-gray-500">Track workouts & see progress</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto pb-px">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'log' && (
          <LogTab onWorkoutLogged={handleWorkoutLogged} refreshKey={refreshKey} />
        )}
        {activeTab === 'progress' && <ProgressTab refreshKey={refreshKey} />}
        {activeTab === 'recommendations' && <RecommendationsTab onNavigate={onNavigate} />}
        {activeTab === 'history' && <HistoryTab refreshKey={refreshKey} onRefresh={() => setRefreshKey(k => k + 1)} />}
      </div>
    </div>
  );
}

// =============================================================================
// LOG TAB
// =============================================================================

function LogTab({ onWorkoutLogged, refreshKey }) {
  const [quickEntry, setQuickEntry] = useState('');
  const [showStructured, setShowStructured] = useState(false);
  const [workoutType, setWorkoutType] = useState('strength');
  const [exercise, setExercise] = useState('');
  const [customExercise, setCustomExercise] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [pace, setPace] = useState('');
  const [notes, setNotes] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recentWorkouts = useMemo(() => getRecentWorkouts(5), [refreshKey]);

  function handleQuickSubmit(e) {
    e.preventDefault();
    if (!quickEntry.trim()) return;

    setIsSubmitting(true);

    const parsed = parseQuickEntry(quickEntry);
    logWorkout({
      ...parsed,
      date: workoutDate,
    });

    setQuickEntry('');
    setIsSubmitting(false);
    onWorkoutLogged();
  }

  function handleStructuredSubmit(e) {
    e.preventDefault();

    const exerciseName = exercise === 'custom' ? customExercise : exercise;
    if (!exerciseName) return;

    setIsSubmitting(true);

    logWorkout({
      type: workoutType,
      exercise: exerciseName,
      sets: sets ? parseInt(sets) : null,
      reps: reps ? parseInt(reps) : null,
      weight: weight ? parseFloat(weight) : null,
      weightUnit: 'lbs',
      distance: distance ? parseFloat(distance) : null,
      distanceUnit: 'miles',
      duration: duration ? parseFloat(duration) : null,
      pace: pace || null,
      notes: notes || null,
      date: workoutDate,
    });

    // Reset form
    setExercise('');
    setCustomExercise('');
    setSets('');
    setReps('');
    setWeight('');
    setDistance('');
    setDuration('');
    setPace('');
    setNotes('');
    setIsSubmitting(false);
    onWorkoutLogged();
  }

  const exerciseOptions = workoutType === 'strength'
    ? COMMON_EXERCISES.strength
    : workoutType === 'cardio'
      ? COMMON_EXERCISES.cardio
      : COMMON_EXERCISES.flexibility;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Quick Entry */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Zap size={18} className="text-blue-500" />
          Log Workout
        </h2>

        <form onSubmit={handleQuickSubmit}>
          <div className="relative">
            <input
              type="text"
              value={quickEntry}
              onChange={e => setQuickEntry(e.target.value)}
              placeholder='e.g., "Back squat 185 lbs for 5x5" or "Ran 3 miles at 9:30 pace"'
              className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!quickEntry.trim() || isSubmitting}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <button
              onClick={() => setShowStructured(!showStructured)}
              className="bg-white px-3 py-1 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              {showStructured ? 'Hide' : 'Or log structured'}
              {showStructured ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Structured Entry */}
        {showStructured && (
          <form onSubmit={handleStructuredSubmit} className="space-y-4">
            {/* Workout Type */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">Type</label>
              <div className="flex gap-2">
                {[
                  { id: 'strength', label: 'Strength', icon: Dumbbell },
                  { id: 'cardio', label: 'Cardio', icon: Heart },
                  { id: 'flexibility', label: 'Flexibility', icon: Target },
                  { id: 'other', label: 'Other', icon: Zap },
                ].map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setWorkoutType(type.id);
                        setExercise('');
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                        workoutType === type.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Icon size={14} />
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exercise Selection */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">Exercise</label>
              <select
                value={exercise}
                onChange={e => setExercise(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select exercise...</option>
                {exerciseOptions.map(ex => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
                <option value="custom">+ Custom exercise</option>
              </select>

              {exercise === 'custom' && (
                <input
                  type="text"
                  value={customExercise}
                  onChange={e => setCustomExercise(e.target.value)}
                  placeholder="Enter exercise name"
                  className="w-full mt-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {/* Strength Fields */}
            {workoutType === 'strength' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Sets</label>
                  <input
                    type="number"
                    value={sets}
                    onChange={e => setSets(e.target.value)}
                    placeholder="5"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Reps</label>
                  <input
                    type="number"
                    value={reps}
                    onChange={e => setReps(e.target.value)}
                    placeholder="5"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Weight (lbs)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    placeholder="185"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Cardio Fields */}
            {workoutType === 'cardio' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Distance (mi)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={distance}
                    onChange={e => setDistance(e.target.value)}
                    placeholder="3"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Duration (min)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    placeholder="28"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Pace (/mi)</label>
                  <input
                    type="text"
                    value={pace}
                    onChange={e => setPace(e.target.value)}
                    placeholder="9:20"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Flexibility Fields */}
            {(workoutType === 'flexibility' || workoutType === 'other') && (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Duration (min)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  placeholder="30"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="How did it feel?"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Date</label>
              <input
                type="date"
                value={workoutDate}
                onChange={e => setWorkoutDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={!(exercise || customExercise) || isSubmitting}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              Log Workout
            </button>
          </form>
        )}
      </div>

      {/* Recent Workouts */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Clock size={16} className="text-gray-400" />
          Recent Workouts
        </h3>

        {recentWorkouts.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Dumbbell size={24} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No workouts logged yet</p>
            <p className="text-xs text-gray-400 mt-1">Use the quick entry above to log your first workout</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentWorkouts.map(workout => (
              <WorkoutCard key={workout.id} workout={workout} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// PROGRESS TAB
// =============================================================================

function ProgressTab({ refreshKey }) {
  const [metrics, setMetrics] = useState(() => getTrackedMetrics());
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    setMetrics(getTrackedMetrics());
  }, [refreshKey]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp size={18} className="text-blue-500" />
          Tracked Metrics
        </h2>
        <button
          onClick={() => setShowEditModal(true)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Edit List
        </button>
      </div>

      {/* Metrics */}
      <div className="space-y-4">
        {metrics.map(metric => (
          <MetricCard key={metric.id} metric={metric} refreshKey={refreshKey} />
        ))}
      </div>

      {metrics.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No metrics tracked</h3>
          <p className="text-gray-500 text-sm mb-4">Add metrics to track your progress over time</p>
          <button
            onClick={() => setShowEditModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Add Metrics
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <EditMetricsModal
          metrics={metrics}
          onClose={() => setShowEditModal(false)}
          onSave={(newMetrics) => {
            saveTrackedMetrics(newMetrics);
            setMetrics(newMetrics);
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}

function MetricCard({ metric, refreshKey }) {
  const [expanded, setExpanded] = useState(true);

  const progress = useMemo(() => getMetricProgress(metric.name), [metric.name, refreshKey]);
  const pr = useMemo(() => getMetricPR(metric.name), [metric.name, refreshKey]);

  const chartData = useMemo(() => {
    return progress.map(p => ({
      date: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: p.value,
    }));
  }, [progress]);

  const firstEntry = progress[0];
  const latestEntry = progress[progress.length - 1];
  const totalChange = latestEntry && firstEntry ? latestEntry.value - firstEntry.value : 0;

  const isTimeBased = metric.unit === 'time';
  const formatValue = (val) => {
    if (isTimeBased && val) {
      const mins = Math.floor(val);
      const secs = Math.round((val - mins) * 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return val;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            metric.type === 'strength' ? 'bg-blue-100' : 'bg-emerald-100'
          }`}>
            {metric.type === 'strength' ? (
              <Dumbbell size={18} className="text-blue-600" />
            ) : (
              <Flame size={18} className="text-emerald-600" />
            )}
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">{metric.name}</h3>
            {pr && (
              <p className="text-xs text-gray-500">
                PR: {formatValue(pr.value)} {metric.unit !== 'time' && metric.unit}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pr && (
            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1">
              <Award size={12} />
              {formatValue(pr.value)} {metric.unit !== 'time' && metric.unit}
            </span>
          )}
          {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          {progress.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">No {metric.name.toLowerCase()} data yet.</p>
              <p className="text-xs text-gray-400 mt-1">Log a session to start tracking!</p>
            </div>
          ) : (
            <>
              {/* Chart */}
              {chartData.length > 1 && (
                <div className="h-32 mb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#9CA3AF' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#9CA3AF' }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        domain={['dataMin - 5', 'dataMax + 5']}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: '#9CA3AF' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value) => [formatValue(value) + (metric.unit !== 'time' ? ` ${metric.unit}` : ''), metric.name]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={{ fill: '#3B82F6', strokeWidth: 0, r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Stats */}
              <div className="text-sm text-gray-600 space-y-1">
                {latestEntry && (
                  <p>
                    Last logged: {formatValue(latestEntry.value)} {metric.unit !== 'time' && metric.unit}
                    {latestEntry.reps && ` × ${latestEntry.reps} reps`}
                    {latestEntry.sets && ` × ${latestEntry.sets} sets`}
                    {' '}
                    <span className="text-gray-400">
                      ({new Date(latestEntry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                    </span>
                  </p>
                )}
                {progress.length > 1 && totalChange !== 0 && (
                  <p className={totalChange > 0 ? 'text-emerald-600' : 'text-red-600'}>
                    {isTimeBased ? (totalChange < 0 ? '+' : '') : (totalChange > 0 ? '+' : '')}
                    {formatValue(Math.abs(totalChange))} {metric.unit !== 'time' && metric.unit} since you started tracking
                    {totalChange > 0 && !isTimeBased && ' 🎉'}
                    {totalChange < 0 && isTimeBased && ' 🎉'}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EditMetricsModal({ metrics, onClose, onSave }) {
  const [localMetrics, setLocalMetrics] = useState([...metrics]);
  const [newMetricName, setNewMetricName] = useState('');
  const [newMetricType, setNewMetricType] = useState('strength');
  const [showCustom, setShowCustom] = useState(false);

  const suggestedMetrics = [
    { name: 'Overhead Press', type: 'strength', unit: 'lbs' },
    { name: 'Pull-ups', type: 'strength', unit: 'reps' },
    { name: 'Barbell Row', type: 'strength', unit: 'lbs' },
    { name: 'Leg Press', type: 'strength', unit: 'lbs' },
    { name: 'Dips', type: 'strength', unit: 'reps' },
    { name: '5K Time', type: 'cardio', unit: 'time' },
    { name: 'Weekly Mileage', type: 'cardio', unit: 'miles' },
  ].filter(s => !localMetrics.find(m => m.name.toLowerCase() === s.name.toLowerCase()));

  function handleRemove(id) {
    setLocalMetrics(localMetrics.filter(m => m.id !== id));
  }

  function handleAddSuggested(suggestion) {
    const newMetric = {
      id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...suggestion,
    };
    setLocalMetrics([...localMetrics, newMetric]);
  }

  function handleAddCustom() {
    if (!newMetricName.trim()) return;

    const newMetric = {
      id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newMetricName.trim(),
      type: newMetricType,
      unit: newMetricType === 'strength' ? 'lbs' : 'miles',
    };

    setLocalMetrics([...localMetrics, newMetric]);
    setNewMetricName('');
    setShowCustom(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Tracked Metrics</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Current Metrics */}
          <div className="space-y-2">
            {localMetrics.map(metric => (
              <div key={metric.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span className="font-medium text-gray-900">{metric.name}</span>
                </div>
                <button
                  onClick={() => handleRemove(metric.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <hr className="border-gray-200" />

          {/* Add Metric */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Add Metric</h3>

            {/* Suggested */}
            {suggestedMetrics.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {suggestedMetrics.map(s => (
                  <button
                    key={s.name}
                    onClick={() => handleAddSuggested(s)}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    + {s.name}
                  </button>
                ))}
              </div>
            )}

            {/* Custom */}
            {showCustom ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newMetricName}
                  onChange={e => setNewMetricName(e.target.value)}
                  placeholder="Metric name"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <select
                    value={newMetricType}
                    onChange={e => setNewMetricType(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="strength">Strength</option>
                    <option value="cardio">Cardio</option>
                  </select>
                  <button
                    onClick={handleAddCustom}
                    disabled={!newMetricName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCustom(true)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add custom metric
              </button>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => onSave(localMetrics)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// RECOMMENDATIONS TAB
// =============================================================================

function RecommendationsTab({ onNavigate }) {
  const playbook = useMemo(() => getPlaybook(), []);
  const stats = useMemo(() => getWorkoutStats(7), []);
  const allWorkouts = useMemo(() => getAllWorkouts(), []);

  // Generate recommendations based on data
  const recommendations = useMemo(() => {
    const recs = [];

    // Check for progressive overload opportunity
    const strengthWorkouts = allWorkouts.filter(w => w.type === TRAINING_TYPES.STRENGTH);
    if (strengthWorkouts.length >= 3) {
      // Group by exercise
      const exerciseGroups = {};
      for (const w of strengthWorkouts) {
        if (!w.exercise) continue;
        if (!exerciseGroups[w.exercise]) exerciseGroups[w.exercise] = [];
        exerciseGroups[w.exercise].push(w);
      }

      // Check if any exercise has been at same weight 3+ times
      for (const [exercise, workouts] of Object.entries(exerciseGroups)) {
        if (workouts.length >= 3) {
          const recentWeights = workouts.slice(0, 3).map(w => w.weight).filter(Boolean);
          if (recentWeights.length >= 3 && new Set(recentWeights).size === 1) {
            recs.push({
              type: 'progressive',
              title: 'Progressive Overload Suggestion',
              message: `You've hit ${recentWeights[0]} lbs on ${exercise} for ${recentWeights.length} sessions in a row. Consider trying ${Math.round(recentWeights[0] * 1.025)} lbs for 3-4 reps next session to continue progressing.`,
            });
            break; // Only show one
          }
        }
      }
    }

    // Check for recovery
    if (stats.strengthSessions >= 4) {
      const cardioOrFlex = stats.cardioSessions + stats.flexibilitySessions;
      if (cardioOrFlex === 0) {
        recs.push({
          type: 'recovery',
          title: 'Recovery Note',
          message: `You've done ${stats.strengthSessions} strength sessions this week with no rest or flexibility work. Consider an active recovery day (yoga, walking, stretching) to optimize gains.`,
        });
      }
    }

    // Goal-based recommendations
    if (playbook?.summary) {
      const summaryLower = playbook.summary.toLowerCase();
      if (summaryLower.includes('lose') || summaryLower.includes('fat') || summaryLower.includes('weight loss')) {
        if (stats.cardioSessions < 2) {
          recs.push({
            type: 'goal',
            title: 'Based on Your Goals',
            message: 'Your goal involves fat loss. Keep strength training 3-4x/week to preserve muscle, and consider adding 1-2 cardio sessions for extra calorie burn.',
          });
        }
      }
      if (summaryLower.includes('muscle') || summaryLower.includes('strength') || summaryLower.includes('bulk')) {
        if (stats.strengthSessions < 3) {
          recs.push({
            type: 'goal',
            title: 'Based on Your Goals',
            message: 'Your goal involves building strength/muscle. Aim for at least 3-4 strength sessions per week, focusing on progressive overload.',
          });
        }
      }
    }

    // Default if no specific recommendations
    if (recs.length === 0) {
      recs.push({
        type: 'general',
        title: 'Keep It Up!',
        message: stats.totalWorkouts > 0
          ? `You've logged ${stats.totalWorkouts} workout${stats.totalWorkouts !== 1 ? 's' : ''} this week. Consistency is key to progress!`
          : 'Log your workouts to get personalized training recommendations based on your activity and goals.',
      });
    }

    return recs;
  }, [playbook, stats, allWorkouts]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="mb-2">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Lightbulb size={18} className="text-amber-500" />
          Training Recommendations
        </h2>
        <p className="text-sm text-gray-500">Based on your goals and recent activity</p>
      </div>

      {/* Recommendations */}
      <div className="space-y-3">
        {recommendations.map((rec, idx) => (
          <div
            key={idx}
            className={`rounded-2xl border p-4 ${
              rec.type === 'progressive' ? 'bg-blue-50 border-blue-200' :
              rec.type === 'recovery' ? 'bg-amber-50 border-amber-200' :
              rec.type === 'goal' ? 'bg-emerald-50 border-emerald-200' :
              'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                rec.type === 'progressive' ? 'bg-blue-100' :
                rec.type === 'recovery' ? 'bg-amber-100' :
                rec.type === 'goal' ? 'bg-emerald-100' :
                'bg-gray-100'
              }`}>
                <Lightbulb size={18} className={
                  rec.type === 'progressive' ? 'text-blue-600' :
                  rec.type === 'recovery' ? 'text-amber-600' :
                  rec.type === 'goal' ? 'text-emerald-600' :
                  'text-gray-600'
                } />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">{rec.title}</h3>
                <p className="text-sm text-gray-700">{rec.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Stats */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-3">This Week</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-gray-900">{stats.totalWorkouts}</p>
            <p className="text-xs text-gray-500">Workouts</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-gray-900">{stats.strengthSessions}</p>
            <p className="text-xs text-gray-500">Strength</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-gray-900">{stats.cardioSessions}</p>
            <p className="text-xs text-gray-500">Cardio</p>
          </div>
        </div>
      </div>

      {/* Ask Advisor */}
      <button
        onClick={() => onNavigate?.('advisor', null, 'I have a training question:')}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl text-white hover:from-blue-600 hover:to-indigo-700 transition-colors"
      >
        <span className="font-medium">Ask Advisor a Training Question</span>
        <ArrowRight size={20} />
      </button>
    </div>
  );
}

// =============================================================================
// HISTORY TAB
// =============================================================================

function HistoryTab({ refreshKey, onRefresh }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const allWorkouts = useMemo(() => getAllWorkouts(), [refreshKey]);

  const filteredWorkouts = useMemo(() => {
    let workouts = allWorkouts;

    // Filter by type
    if (typeFilter !== 'all') {
      workouts = workouts.filter(w => w.type === typeFilter);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      workouts = workouts.filter(w =>
        (w.exercise || '').toLowerCase().includes(query) ||
        (w.rawText || '').toLowerCase().includes(query) ||
        (w.notes || '').toLowerCase().includes(query)
      );
    }

    return workouts;
  }, [allWorkouts, typeFilter, searchQuery]);

  // Group by week
  const groupedWorkouts = useMemo(() => {
    const groups = {
      thisWeek: [],
      lastWeek: [],
      older: [],
    };

    for (const workout of filteredWorkouts) {
      if (isThisWeek(workout.date)) {
        groups.thisWeek.push(workout);
      } else if (isLastWeek(workout.date)) {
        groups.lastWeek.push(workout);
      } else {
        groups.older.push(workout);
      }
    }

    return groups;
  }, [filteredWorkouts]);

  function handleDelete(id) {
    deleteWorkout(id);
    onRefresh();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Search & Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search workouts..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="strength">Strength</option>
          <option value="cardio">Cardio</option>
          <option value="flexibility">Flexibility</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* No Results */}
      {filteredWorkouts.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <History size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {allWorkouts.length === 0 ? 'No workouts logged yet' : 'No workouts match your search'}
          </h3>
          <p className="text-gray-500 text-sm">
            {allWorkouts.length === 0
              ? 'Log a workout on the Log tab to see your history here'
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      )}

      {/* This Week */}
      {groupedWorkouts.thisWeek.length > 0 && (
        <WorkoutGroup
          title="This Week"
          workouts={groupedWorkouts.thisWeek}
          onDelete={handleDelete}
        />
      )}

      {/* Last Week */}
      {groupedWorkouts.lastWeek.length > 0 && (
        <WorkoutGroup
          title="Last Week"
          workouts={groupedWorkouts.lastWeek}
          onDelete={handleDelete}
        />
      )}

      {/* Older */}
      {groupedWorkouts.older.length > 0 && (
        <WorkoutGroup
          title="Earlier"
          workouts={groupedWorkouts.older}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function WorkoutGroup({ title, workouts, onDelete }) {
  // Group by date within the week
  const byDate = groupWorkoutsByDate(workouts);
  const sortedDates = Object.keys(byDate).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-4">
        {sortedDates.map(date => (
          <div key={date}>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              {formatWorkoutDate(date)}
            </h4>
            <div className="space-y-2">
              {byDate[date].map(workout => (
                <WorkoutCard key={workout.id} workout={workout} onDelete={onDelete} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkoutCard({ workout, onDelete, compact = false }) {
  const [expanded, setExpanded] = useState(false);

  const typeIcon = workout.type === TRAINING_TYPES.STRENGTH ? Dumbbell :
                   workout.type === TRAINING_TYPES.CARDIO ? Flame :
                   workout.type === TRAINING_TYPES.FLEXIBILITY ? Target : Zap;

  const typeColor = workout.type === TRAINING_TYPES.STRENGTH ? 'bg-blue-50 border-blue-200 text-blue-600' :
                    workout.type === TRAINING_TYPES.CARDIO ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                    workout.type === TRAINING_TYPES.FLEXIBILITY ? 'bg-purple-50 border-purple-200 text-purple-600' :
                    'bg-gray-50 border-gray-200 text-gray-600';

  const Icon = typeIcon;

  // Build summary
  let summary = workout.exercise || workout.rawText || 'Workout';
  let details = [];

  if (workout.weight && workout.reps) {
    details.push(`${workout.weight} ${workout.weightUnit || 'lbs'} × ${workout.reps}${workout.sets ? ` × ${workout.sets}` : ''}`);
  }
  if (workout.distance) {
    const paceStr = workout.pace ? ` @ ${workout.pace}` : '';
    details.push(`${workout.distance} ${workout.distanceUnit || 'miles'}${paceStr}`);
  }
  if (workout.duration && !workout.distance) {
    details.push(`${workout.duration} min`);
  }

  return (
    <div className={`rounded-xl border ${typeColor.split(' ').slice(0, 2).join(' ')} overflow-hidden`}>
      <div className="p-3 flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-white shadow-sm`}>
          <Icon size={16} className={typeColor.split(' ')[2]} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{summary}</p>
          {details.length > 0 && (
            <p className="text-sm text-gray-600">{details.join(' • ')}</p>
          )}
          {compact && (
            <p className="text-xs text-gray-400 mt-1">{formatWorkoutDate(workout.date)}</p>
          )}
        </div>

        {!compact && (
          <div className="flex items-center gap-1">
            {(workout.notes || workout.rawText !== workout.exercise) && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg"
              >
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(workout.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {expanded && !compact && (
        <div className="px-3 pb-3 pt-0">
          <div className="p-3 bg-white/50 rounded-lg text-sm text-gray-600 space-y-1">
            {workout.notes && <p><span className="font-medium">Notes:</span> {workout.notes}</p>}
            {workout.rawText && workout.rawText !== workout.exercise && (
              <p><span className="font-medium">Original:</span> "{workout.rawText}"</p>
            )}
            {workout.source && (
              <p className="text-xs text-gray-400">Logged via {workout.source}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
