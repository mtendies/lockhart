import { useState, useMemo } from 'react';
import {
  Dumbbell,
  Utensils,
  Moon,
  Scale,
  Droplets,
  Check,
  Trash2,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  X,
  MessageCircle,
} from 'lucide-react';
import {
  getFilteredActivities,
  deleteActivity,
  ACTIVITY_TYPES,
  WORKOUT_TYPES,
  ACTIVITY_SOURCES,
} from '../activityLogStore';

// Category display config
// Sleep is displayed as "Recovery" with purple colors to match chat categories
const CATEGORY_CONFIG = {
  [ACTIVITY_TYPES.WORKOUT]: { label: 'Exercise', icon: Dumbbell, color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-600' },
  [ACTIVITY_TYPES.NUTRITION]: { label: 'Nutrition', icon: Utensils, color: 'bg-amber-50 border-amber-200', textColor: 'text-amber-600' },
  [ACTIVITY_TYPES.SLEEP]: { label: 'Recovery', icon: Moon, color: 'bg-purple-50 border-purple-200', textColor: 'text-purple-600' },
  [ACTIVITY_TYPES.WEIGHT]: { label: 'Weight', icon: Scale, color: 'bg-gray-50 border-gray-200', textColor: 'text-gray-600' },
  [ACTIVITY_TYPES.HYDRATION]: { label: 'Hydration', icon: Droplets, color: 'bg-cyan-50 border-cyan-200', textColor: 'text-cyan-600' },
  [ACTIVITY_TYPES.GENERAL]: { label: 'General', icon: MessageCircle, color: 'bg-gray-50 border-gray-200', textColor: 'text-gray-600' },
};

// Source display config
const SOURCE_CONFIG = {
  [ACTIVITY_SOURCES.DASHBOARD]: { label: 'Dashboard' },
  [ACTIVITY_SOURCES.PLAYBOOK]: { label: 'Playbook' },
  [ACTIVITY_SOURCES.CHAT]: { label: 'Chat' },
  [ACTIVITY_SOURCES.CHECK_IN]: { label: 'Check-in' },
};

function getActivityIcon(type, subType) {
  const config = CATEGORY_CONFIG[type] || CATEGORY_CONFIG[ACTIVITY_TYPES.GENERAL];
  const Icon = config.icon;
  return <Icon size={16} className={config.textColor} />;
}

function getActivityColor(type) {
  const config = CATEGORY_CONFIG[type] || CATEGORY_CONFIG[ACTIVITY_TYPES.GENERAL];
  return config.color;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function getSubTypeLabel(subType) {
  switch (subType) {
    case WORKOUT_TYPES.RUN: return 'Run';
    case WORKOUT_TYPES.STRENGTH: return 'Strength';
    case WORKOUT_TYPES.CARDIO: return 'Cardio';
    case WORKOUT_TYPES.YOGA: return 'Yoga';
    case WORKOUT_TYPES.WALK: return 'Walk';
    default: return 'Workout';
  }
}

export default function ActivityLog({ onActivityDeleted, onClose, compact = false }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const activities = useMemo(() => {
    return getFilteredActivities({
      query: searchQuery,
      type: typeFilter,
      source: sourceFilter,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }, [searchQuery, typeFilter, sourceFilter, startDate, endDate, refreshKey]);

  function handleDelete(id) {
    deleteActivity(id);
    setRefreshKey(k => k + 1);
    onActivityDeleted?.();
  }

  function clearFilters() {
    setSearchQuery('');
    setTypeFilter('all');
    setSourceFilter('all');
    setStartDate('');
    setEndDate('');
  }

  const hasFilters = typeFilter !== 'all' || sourceFilter !== 'all' || startDate || endDate;

  // Group activities by date
  const groupedByDate = activities.reduce((groups, activity) => {
    const date = activity.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

  if (activities.length === 0 && !searchQuery && !hasFilters) {
    return (
      <div className={`${compact ? '' : 'flex-1'} flex items-center justify-center p-8`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No activities logged</h3>
          <p className="text-gray-500 text-sm max-w-xs">
            Use the quick entry box on the Dashboard or Playbook to log workouts, meals, sleep, and more.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${compact ? '' : 'pb-8'} flex flex-col`}>
      {/* Header with search */}
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
              <Clock size={16} className="text-primary-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Activity Log</h2>
              <p className="text-xs text-gray-500">{activities.length} entries</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries... (e.g., 'running', 'protein')"
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Filter toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <Filter size={12} />
            Filters
            {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {hasFilters && (
              <span className="px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded-full text-[10px]">
                Active
              </span>
            )}
          </button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
            {/* Category filter */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    typeFilter === 'all'
                      ? 'bg-gray-800 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  All
                </button>
                {Object.entries(CATEGORY_CONFIG).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      typeFilter === type
                        ? 'bg-gray-800 text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Source filter */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Source</label>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setSourceFilter('all')}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    sourceFilter === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  All
                </button>
                {Object.entries(SOURCE_CONFIG).map(([source, config]) => (
                  <button
                    key={source}
                    onClick={() => setSourceFilter(source)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      sourceFilter === source
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Activity list */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-6 ${compact ? 'max-h-[400px]' : ''}`}>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Search size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No entries match your search</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          sortedDates.map(date => (
            <div key={date}>
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                <Calendar size={14} />
                {formatDate(date)}
              </h3>
              <div className="space-y-2">
                {groupedByDate[date].map(activity => {
                  const sourceLabel = SOURCE_CONFIG[activity.source]?.label || activity.source;
                  return (
                    <div
                      key={activity.id}
                      className={`rounded-xl border p-3 ${getActivityColor(activity.type)}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          {getActivityIcon(activity.type, activity.subType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">
                              {activity.summary || activity.rawText}
                            </span>
                            {activity.subType && (
                              <span className="text-xs px-2 py-0.5 bg-white rounded-full text-gray-600">
                                {getSubTypeLabel(activity.subType)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatTime(activity.timestamp)}
                            </span>
                            {sourceLabel && (
                              <span className="text-gray-400">via {sourceLabel}</span>
                            )}
                          </div>

                          {/* Expandable details */}
                          {activity.rawText && activity.rawText !== activity.summary && (
                            <button
                              onClick={() => setExpandedId(expandedId === activity.id ? null : activity.id)}
                              className="mt-2 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                            >
                              {expandedId === activity.id ? (
                                <>
                                  <ChevronUp size={12} />
                                  Hide details
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={12} />
                                  Show details
                                </>
                              )}
                            </button>
                          )}

                          {expandedId === activity.id && (
                            <div className="mt-2 p-2 bg-white/50 rounded-lg text-xs text-gray-600 space-y-1">
                              <p><span className="font-medium">Original:</span> "{activity.rawText}"</p>
                              <p><span className="font-medium">Type:</span> {activity.type}{activity.subType ? ` / ${activity.subType}` : ''}</p>
                              {activity.data && Object.keys(activity.data).length > 0 && (
                                <p><span className="font-medium">Data:</span> {JSON.stringify(activity.data)}</p>
                              )}
                              {activity.goalConnections?.length > 0 && (
                                <p><span className="font-medium">Goal connections:</span> Focus items #{activity.goalConnections.map(i => i + 1).join(', #')}</p>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(activity.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                          title="Delete activity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
