import { useState, useRef, useEffect } from 'react';
import { Target, Compass, Calendar, Lightbulb, ChevronDown, ChevronUp, RefreshCw, Sparkles, Dumbbell, Moon, Utensils, Footprints, Brain, Loader2, AlertCircle, Check, X, Scale, Droplets, Send, History, Clock, Edit2, Trash2 } from 'lucide-react';
import { getRecentCheckIns, formatWeekOf } from '../checkInStore';
import { savePlaybook, applyPlaybookSuggestion, getPlaybook } from '../playbookStore';
import { getPendingBySection, approveSuggestion, dismissSuggestion } from '../playbookSuggestionsStore';
import { getWeeklyFocusProgress, setCustomTarget } from '../weeklyProgressStore';
import { logActivity, getActivities, deleteActivity, ACTIVITY_SOURCES } from '../activityLogStore';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import {
  isInCalibrationPeriod,
  isCalibrationComplete,
  getCalibrationData,
  updateMealEntry,
} from '../nutritionCalibrationStore';
import NutritionCalibration from './NutritionCalibration';

const GOAL_LABELS = {
  general_health: 'General Health',
  fat_loss: 'Lose Body Fat',
  muscle_gain: 'Build Muscle',
  endurance: 'Improve Endurance',
  marathon: 'Race Training',
  strength: 'Get Stronger',
  flexibility: 'Flexibility & Mobility',
  stress: 'Stress Management',
  sleep: 'Better Sleep',
  nutrition: 'Better Nutrition',
};

// Icon mapping for principles
const PRINCIPLE_ICONS = {
  protein: Utensils,
  strength: Dumbbell,
  sleep: Moon,
  cardio: Footprints,
  recovery: Brain,
  default: Target,
};

function getPrincipleIcon(text) {
  const lower = text.toLowerCase();
  if (lower.includes('protein') || lower.includes('eat') || lower.includes('meal') || lower.includes('nutrition') || lower.includes('calor')) return PRINCIPLE_ICONS.protein;
  if (lower.includes('strength') || lower.includes('lift') || lower.includes('weight') || lower.includes('train')) return PRINCIPLE_ICONS.strength;
  if (lower.includes('sleep') || lower.includes('rest') || lower.includes('hour')) return PRINCIPLE_ICONS.sleep;
  if (lower.includes('run') || lower.includes('cardio') || lower.includes('mile') || lower.includes('endurance')) return PRINCIPLE_ICONS.cardio;
  if (lower.includes('recover') || lower.includes('stress') || lower.includes('stretch')) return PRINCIPLE_ICONS.recovery;
  return PRINCIPLE_ICONS.default;
}


// Suggestion badge component
function SuggestionBadge({ count, onClick, expanded }) {
  if (count === 0) return null;
  return (
    <button
      onClick={onClick}
      className={`ml-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
        expanded
          ? 'bg-amber-500 text-white'
          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
      }`}
    >
      <AlertCircle size={12} />
      {count} pending
    </button>
  );
}

// Suggestion panel component
function SuggestionPanel({ suggestions, onApprove, onDismiss }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4"
        >
          <div className="flex items-start gap-2 mb-3">
            <div className="p-1.5 bg-amber-200 rounded-lg shrink-0">
              <Sparkles size={14} className="text-amber-700" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-amber-800 uppercase">
                  {suggestion.action === 'add' ? 'Add New' : suggestion.action === 'edit' ? 'Update' : 'Remove'}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <p className="text-sm text-gray-800 font-medium">{suggestion.content.text}</p>
            {suggestion.content.why && (
              <p className="text-xs text-gray-600 mt-1">{suggestion.content.why}</p>
            )}
          </div>

          {suggestion.rationale && (
            <div className="mb-3 p-3 bg-white/60 rounded-lg">
              <p className="text-xs text-gray-500 font-medium mb-1">Why this change?</p>
              <p className="text-xs text-gray-700">{suggestion.rationale}</p>
            </div>
          )}

          {suggestion.sources && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Supporting research:</p>
              <p className="text-xs text-amber-700">{suggestion.sources}</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-amber-200">
            <button
              onClick={() => onApprove(suggestion)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Check size={14} />
              Approve
            </button>
            <button
              onClick={() => onDismiss(suggestion)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300 transition-colors"
            >
              <X size={14} />
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Playbook({ profile, playbook, onSuggestionCountChange, onPlaybookChange, onAskQuestion, onActivityLogged, onProfileUpdate, onNavigate }) {
  const [radarOpen, setRadarOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);

  // Quick entry state
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastLogFeedback, setLastLogFeedback] = useState(null);
  const [expandedActivities, setExpandedActivities] = useState(null); // Index of focus item showing activities
  const [pendingQuickSuggestion, setPendingQuickSuggestion] = useState(null); // For quick entry playbook/profile suggestions
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  // Focus item editing state
  const [editingFocusIndex, setEditingFocusIndex] = useState(null); // Index of focus item being edited
  const [editingFocusText, setEditingFocusText] = useState('');
  const [targetDropdownIndex, setTargetDropdownIndex] = useState(null); // Index of focus item showing target dropdown
  const [deleteTarget, setDeleteTarget] = useState(null); // Activity to be deleted
  const [focusRefreshKey, setFocusRefreshKey] = useState(0); // Key to trigger focus progress refresh
  const editInputRef = useRef(null);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingFocusIndex !== null && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingFocusIndex]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (targetDropdownIndex !== null && !e.target.closest('.target-dropdown')) {
        setTargetDropdownIndex(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [targetDropdownIndex]);

  // Save focus item text edit
  function saveFocusEdit(index) {
    if (editingFocusText.trim() && editingFocusText.trim() !== playbook.weeklyFocus[index]?.action) {
      applyPlaybookSuggestion({
        section: 'weeklyFocus',
        action: 'edit',
        content: {
          index,
          text: editingFocusText.trim(),
          context: playbook.weeklyFocus[index]?.context,
        },
      });
      onPlaybookChange?.();
    }
    setEditingFocusIndex(null);
    setEditingFocusText('');
  }

  // Update target for a focus item
  function handleTargetChange(index, newTarget) {
    setCustomTarget(index, newTarget);
    setTargetDropdownIndex(null);
    onPlaybookChange?.(); // Trigger re-render
  }

  // Get icon for activity type
  function getActivityIcon(type) {
    if (type === 'workout') return <Dumbbell size={16} className="text-emerald-600" />;
    if (type === 'nutrition') return <Utensils size={16} className="text-emerald-600" />;
    if (type === 'sleep') return <Moon size={16} className="text-emerald-600" />;
    if (type === 'weight') return <Scale size={16} className="text-emerald-600" />;
    if (type === 'hydration') return <Droplets size={16} className="text-emerald-600" />;
    return <Check size={16} className="text-emerald-600" />;
  }

  async function handleSmartInput() {
    if (!input.trim() || isProcessing) return;

    const text = input.trim();
    setInput('');
    setIsProcessing(true);
    setLastLogFeedback(null);
    setPendingQuickSuggestion(null);

    try {
      const focusProgress = getWeeklyFocusProgress();
      const res = await fetch('/api/quick-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          profile,
          playbook,
          weeklyProgress: focusProgress.reduce((acc, f, i) => {
            acc[i] = f.progress;
            return acc;
          }, {}),
        }),
      });

      if (!res.ok) throw new Error('Failed to process entry');

      const result = await res.json();

      // If it's a question, route to chat
      if (result.isQuestion || result.intent === 'question') {
        onAskQuestion?.(text);
        return;
      }

      // Handle playbook edit suggestions
      if (result.intent === 'playbookEdit' && result.playbookSuggestion) {
        setPendingQuickSuggestion({
          type: 'playbook',
          suggestion: result.playbookSuggestion,
          message: result.response?.message || 'Update your playbook?',
        });
        return;
      }

      // Handle target-only updates (no text change, just the number)
      if (result.intent === 'targetUpdate' && result.targetUpdate) {
        const { index, target } = result.targetUpdate;
        setCustomTarget(index, target);
        onPlaybookChange?.(); // Trigger re-render
        setLastLogFeedback({
          type: 'success',
          icon: <Target size={16} className="text-emerald-600" />,
          message: result.response?.message || `Updated target to ${target}x per week`,
        });
        return;
      }

      // Handle profile edit suggestions
      if (result.intent === 'profileEdit' && result.profileSuggestion) {
        setPendingQuickSuggestion({
          type: 'profile',
          suggestion: result.profileSuggestion,
          message: result.response?.message || 'Update your profile?',
        });
        return;
      }

      // It's an activity log - store it and show feedback
      if (result.activity) {
        logActivity({
          type: result.type,
          subType: result.subType,
          rawText: text,
          data: result.activity.data,
          summary: result.activity.summary,
          goalConnections: result.activity.goalConnections || [],
          encouragement: result.response?.message || null,
          progressNote: result.response?.progressUpdate || null,
          source: ACTIVITY_SOURCES.PLAYBOOK,
        });

        // If it's a nutrition activity and user is in calibration period, try to log to calibration
        if (result.type === 'nutrition' && isInCalibrationPeriod() && !isCalibrationComplete()) {
          const lowerText = text.toLowerCase();
          const calibration = getCalibrationData();
          const currentDay = calibration.currentDay;

          if (!calibration.days[currentDay]?.completed) {
            // Detect meal type from text
            let mealType = null;
            if (lowerText.includes('breakfast') || lowerText.includes('morning')) {
              mealType = 'breakfast';
            } else if (lowerText.includes('lunch') || lowerText.includes('midday')) {
              mealType = 'lunch';
            } else if (lowerText.includes('dinner') || lowerText.includes('evening') || lowerText.includes('supper')) {
              mealType = 'dinner';
            } else if (lowerText.includes('snack')) {
              mealType = 'snacks';
            } else if (lowerText.includes('dessert') || lowerText.includes('sweet') || lowerText.includes('treat')) {
              mealType = 'dessert';
            }

            if (mealType) {
              updateMealEntry(currentDay, mealType, text);
            }
          }
        }

        // Notify parent that activity was logged
        onActivityLogged?.();

        // Show feedback (user dismisses manually)
        setLastLogFeedback({
          type: 'success',
          icon: getActivityIcon(result.type),
          message: result.response?.message || 'Logged!',
          progressUpdate: result.response?.progressUpdate,
        });
      }
    } catch (err) {
      console.error('Quick entry error:', err);
      // Fall back to treating as a question
      onAskQuestion?.(text);
    } finally {
      setIsProcessing(false);
    }
  }

  function handleApproveQuickSuggestion() {
    if (!pendingQuickSuggestion) return;

    if (pendingQuickSuggestion.type === 'playbook') {
      const suggestion = pendingQuickSuggestion.suggestion;
      const formattedSuggestion = {
        section: suggestion.section,
        action: suggestion.action,
        content: {
          text: suggestion.content?.text,
          why: suggestion.content?.why,
          context: suggestion.content?.context,
          index: suggestion.index,
        },
      };
      applyPlaybookSuggestion(formattedSuggestion);
      onPlaybookChange?.();

      setLastLogFeedback({
        type: 'success',
        icon: <Check size={16} className="text-emerald-600" />,
        message: 'Playbook updated!',
      });
    } else if (pendingQuickSuggestion.type === 'profile') {
      const suggestion = pendingQuickSuggestion.suggestion;
      let value = suggestion.value;

      if (suggestion.field === 'weight') {
        const numMatch = String(value).match(/[\d.]+/);
        if (numMatch) value = parseFloat(numMatch[0]);
      }

      onProfileUpdate?.({ [suggestion.field]: value });

      setLastLogFeedback({
        type: 'success',
        icon: <Check size={16} className="text-emerald-600" />,
        message: 'Profile updated!',
      });
    }

    setPendingQuickSuggestion(null);
    onSuggestionCountChange?.();
  }

  function handleDismissQuickSuggestion() {
    setPendingQuickSuggestion(null);
  }

  function toggleSectionSuggestions(section) {
    setExpandedSection(expandedSection === section ? null : section);
  }

  const checkIns = getRecentCheckIns(8);
  const latestCheckIn = checkIns[0];
  const goals = profile?.goals || [];
  const goalDetails = profile?.goalDetails || {};

  // Check if user is in calibration period
  const showCalibration = isInCalibrationPeriod() && !isCalibrationComplete();

  // Get focus progress (refreshes when focusRefreshKey changes)
  const focusProgress = playbook ? getWeeklyFocusProgress() : [];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const refreshedFocusProgress = focusRefreshKey >= 0 ? focusProgress : focusProgress;

  // Handle activity entry deletion
  function handleDeleteEntry(activity) {
    setDeleteTarget(activity);
  }

  function confirmDeleteEntry() {
    if (deleteTarget) {
      deleteActivity(deleteTarget.id);
      setDeleteTarget(null);
      setFocusRefreshKey(k => k + 1);
      onActivityLogged?.(); // Notify parent to refresh
    }
  }

  // Sort focus progress: incomplete items first, completed at bottom
  const sortedFocusProgress = [...focusProgress].sort((a, b) => {
    const aComplete = a.progress?.trackable && a.progress.complete;
    const bComplete = b.progress?.trackable && b.progress.complete;
    if (aComplete && !bComplete) return 1;
    if (!aComplete && bComplete) return -1;
    return 0;
  });

  // Get pending suggestions by section
  const pendingBySections = {
    summary: getPendingBySection('summary'),
    principles: getPendingBySection('principles'),
    weeklyFocus: getPendingBySection('weeklyFocus'),
    radar: getPendingBySection('radar'),
  };

  function handleApproveSuggestion(suggestion) {
    applyPlaybookSuggestion(suggestion);
    approveSuggestion(suggestion.id);
    onPlaybookChange?.();
    setExpandedSection(null);
    onSuggestionCountChange?.();
  }

  function handleDismissSuggestion(suggestion) {
    dismissSuggestion(suggestion.id);
    setExpandedSection(null);
    onSuggestionCountChange?.();
  }

  async function generatePlaybook() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/playbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          checkIns,
          existingPlaybook: playbook, // Send existing playbook for incremental updates
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate playbook');
      }

      const data = await res.json();
      savePlaybook(data);
      onPlaybookChange?.(); // Sync playbook state in App.jsx
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const lastUpdated = playbook?.generatedAt
    ? new Date(playbook.generatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;

  // Show generate prompt if no playbook exists
  if (!playbook && !loading) {
    return (
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles size={32} className="text-primary-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">My Playbook</h1>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Generate your personalized action plan based on your profile, goals, and check-in history.
            </p>
            <button
              onClick={generatePlaybook}
              className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors inline-flex items-center gap-2"
            >
              <Sparkles size={18} />
              Generate My Playbook
            </button>
            {error && (
              <p className="text-red-500 text-sm mt-4">{error}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
          <div className="text-center py-16">
            <Loader2 size={48} className="text-primary-600 animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {playbook ? 'Updating Your Playbook' : 'Generating Your Playbook'}
            </h2>
            <p className="text-gray-500">
              {playbook ? 'Reviewing your progress and making adjustments...' : 'Analyzing your profile and check-ins...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Playbook</h1>
            <p className="text-gray-500 mt-1">Your personalized action plan</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-gray-400">Updated {lastUpdated}</span>
            )}
            <button
              onClick={generatePlaybook}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all disabled:opacity-50"
              title="Update playbook based on latest profile & check-ins"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Goal Badges - Compact display of user's goals */}
        {goals.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {goals.map(goalKey => (
              <span
                key={goalKey}
                className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium"
              >
                {GOAL_LABELS[goalKey] || goalKey}
              </span>
            ))}
          </div>
        )}

        {/* Initial Nutrition Calibration - First Week Priority (TOP) */}
        {showCalibration && (
          <section className="mb-8">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Week 1 Priority
              </span>
            </div>
            <NutritionCalibration
              profile={profile}
              onComplete={() => {
                onPlaybookChange?.();
              }}
            />
          </section>
        )}

        {/* Section 1: This Week's Focus (Primary Action Section) */}
        {playbook.weeklyFocus && playbook.weeklyFocus.length > 0 && (
          <section className="mb-8">
            {/* Focus Header - consistent across app */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Target size={16} className="text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">Focus Goals for the Week</h2>
                    <SuggestionBadge
                      count={pendingBySections.weeklyFocus.length}
                      onClick={() => toggleSectionSuggestions('weeklyFocus')}
                      expanded={expandedSection === 'weeklyFocus'}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {focusProgress.filter(f => f.progress?.complete).length}/{focusProgress.length} complete
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
              <div className="space-y-1">
                {sortedFocusProgress.map((item, i) => {
                  const { progress } = item;
                  const originalIndex = item.index; // Use original index, not sorted position
                  const isComplete = progress?.trackable && progress.complete;
                  const showProgress = progress?.trackable && !progress.complete;
                  const hasActivities = progress?.contributingActivities?.length > 0;
                  const isExpanded = expandedActivities === originalIndex;
                  const isEditing = editingFocusIndex === originalIndex;
                  const showTargetDropdown = targetDropdownIndex === originalIndex;

                  return (
                    <div
                      key={originalIndex}
                      className={`group p-2 rounded-lg transition-colors ${
                        isComplete ? 'bg-emerald-50/50' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isComplete
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white border-2 border-emerald-300 text-emerald-600'
                        }`}>
                          {isComplete ? <Check size={10} strokeWidth={3} /> : <span className="text-[9px] font-bold">{originalIndex + 1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Focus item text */}
                            {isEditing ? (
                              <div className="flex items-center gap-2 flex-1">
                                <input
                                  ref={editInputRef}
                                  type="text"
                                  value={editingFocusText}
                                  onChange={(e) => setEditingFocusText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveFocusEdit(originalIndex);
                                    if (e.key === 'Escape') {
                                      setEditingFocusIndex(null);
                                      setEditingFocusText('');
                                    }
                                  }}
                                  onBlur={() => saveFocusEdit(originalIndex)}
                                  className="flex-1 text-sm px-2 py-0.5 border border-emerald-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                              </div>
                            ) : (
                              <p className={`text-sm flex-1 ${isComplete ? 'text-emerald-700' : 'text-gray-800'}`}>
                                {item.action}
                              </p>
                            )}

                            {/* Action buttons - always visible when not editing */}
                            {!isEditing && (
                              <div className="flex items-center gap-0.5">
                                {/* Progress counter with target dropdown - only for trackable items */}
                                {progress?.trackable && (
                                  <div className="relative target-dropdown">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTargetDropdownIndex(showTargetDropdown ? null : originalIndex);
                                      }}
                                      className={`flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                                        isComplete
                                          ? 'text-emerald-700 bg-emerald-200 hover:bg-emerald-300'
                                          : 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200'
                                      }`}
                                      title="Click to adjust target"
                                    >
                                      {progress.current}/{progress.target}
                                      <ChevronDown size={10} className={`transition-transform ${showTargetDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Target dropdown */}
                                    {showTargetDropdown && (
                                      <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[100px]">
                                        <p className="px-2 py-0.5 text-[10px] text-gray-500 uppercase tracking-wide">Target</p>
                                        {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                                          <button
                                          key={num}
                                          onClick={() => handleTargetChange(originalIndex, num)}
                                          className={`w-full text-left px-2 py-1 text-xs hover:bg-emerald-50 transition-colors ${
                                            progress.target === num ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'
                                          }`}
                                        >
                                          {num}x/wk
                                          {progress.target === num && <Check size={10} className="inline ml-1" />}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  </div>
                                )}

                                {/* Edit button - small green icon - ALWAYS visible */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingFocusIndex(originalIndex);
                                    setEditingFocusText(item.action);
                                  }}
                                  className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                                  title="Edit goal"
                                >
                                  <Edit2 size={12} />
                                </button>

                                {/* History button - small green icon - only when has activities */}
                                {hasActivities && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedActivities(isExpanded ? null : originalIndex);
                                    }}
                                    className={`p-1 rounded transition-colors ${
                                      isExpanded
                                        ? 'bg-green-200 text-green-700'
                                        : 'text-green-600 hover:bg-green-100'
                                    }`}
                                    title="View entries"
                                  >
                                    <History size={12} />
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Done badge for non-trackable completed items */}
                            {isComplete && !progress?.trackable && (
                              <span className="text-xs font-medium text-emerald-700 bg-emerald-200 px-2 py-0.5 rounded-full">
                                Done
                              </span>
                            )}
                          </div>
                          {item.context && !isEditing && (
                            <p className="text-[11px] text-gray-500 mt-0.5">{item.context}</p>
                          )}
                          {showProgress && progress.percentage > 0 && (
                            <div className="mt-1.5 h-1 bg-emerald-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${progress.percentage}%` }}
                              />
                            </div>
                          )}

                          {/* Contributing Activities Dropdown */}
                          {isExpanded && hasActivities && (
                            <div className="mt-2 p-2 bg-white rounded-lg border border-emerald-200 space-y-1">
                              <p className="text-[10px] font-medium text-gray-500 mb-1">Entries:</p>
                              {progress.contributingActivities.map((activity, ai) => (
                                <div key={activity.id || ai} className="flex items-center gap-1.5 text-[11px] text-gray-700 group/entry">
                                  <Clock size={10} className="text-gray-400 shrink-0" />
                                  <span className="flex-1 truncate">{activity.summary || activity.rawText}</span>
                                  <span className="text-gray-400 text-[10px]">
                                    {new Date(activity.timestamp).toLocaleDateString(undefined, { weekday: 'short' })}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteEntry(activity);
                                    }}
                                    className="p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover/entry:opacity-100 transition-opacity"
                                    title="Delete entry"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {latestCheckIn && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-[10px] text-gray-400">
                    Based on check-in from {formatWeekOf(latestCheckIn.weekOf)}
                  </p>
                </div>
              )}
            </div>

            {/* Weekly Focus Suggestions */}
            {expandedSection === 'weeklyFocus' && (
              <SuggestionPanel
                suggestions={pendingBySections.weeklyFocus}
                onApprove={handleApproveSuggestion}
                onDismiss={handleDismissSuggestion}
              />
            )}
          </section>
        )}

        {/* Quick Entry Box - Log progress toward focus items */}
        <section className="mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Log progress
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  Workouts, meals, sleep, weight
                </span>
                {/* Recent entries dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      showHistoryDropdown ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                    title="Recent entries"
                  >
                    <History size={16} />
                  </button>
                  {showHistoryDropdown && (
                    <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                      <p className="px-3 py-1 text-xs text-gray-500 font-medium uppercase tracking-wide">Recent entries</p>
                      {getActivities().slice(0, 5).length === 0 ? (
                        <p className="px-3 py-2 text-sm text-gray-400">No entries yet</p>
                      ) : (
                        getActivities().slice(0, 5).map((activity) => (
                          <button
                            key={activity.id}
                            onClick={() => {
                              setInput(activity.rawText || activity.summary || '');
                              setShowHistoryDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
                          >
                            <p className="text-sm text-gray-700 truncate">{activity.summary || activity.rawText}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(activity.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-expand with max height
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && input.trim() && !isProcessing) {
                    e.preventDefault();
                    handleSmartInput();
                  }
                }}
                onFocus={() => setShowHistoryDropdown(false)}
                placeholder="Log progress, edit focus, or ask a question..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-300 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-gray-700 placeholder:text-gray-400 text-sm resize-none min-h-[42px]"
                disabled={isProcessing}
                rows={1}
              />
              <button
                onClick={handleSmartInput}
                disabled={!input.trim() || isProcessing}
                className="px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 h-[42px]"
              >
                {isProcessing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>

            {/* Feedback after logging */}
            {lastLogFeedback && (
              <div className={`mt-3 p-3 rounded-xl flex items-start gap-3 ${
                lastLogFeedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-100'
                  : 'bg-blue-50 border border-blue-100'
              }`}>
                {lastLogFeedback.icon && (
                  <div className={`p-1.5 rounded-lg ${
                    lastLogFeedback.type === 'success' ? 'bg-emerald-100' : 'bg-blue-100'
                  }`}>
                    {lastLogFeedback.icon}
                  </div>
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    lastLogFeedback.type === 'success' ? 'text-emerald-800' : 'text-blue-800'
                  }`}>
                    {lastLogFeedback.message}
                  </p>
                  {lastLogFeedback.progressUpdate && (
                    <p className={`text-xs mt-0.5 ${
                      lastLogFeedback.type === 'success' ? 'text-emerald-600' : 'text-blue-600'
                    }`}>
                      {lastLogFeedback.progressUpdate}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setLastLogFeedback(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            )}

            {/* Pending Quick Suggestion Approval */}
            {pendingQuickSuggestion && (
              <div className="mt-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-amber-200 rounded-lg shrink-0">
                    <Sparkles size={14} className="text-amber-700" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-amber-800 uppercase">
                        {pendingQuickSuggestion.type === 'playbook' ? 'Playbook Update' : 'Profile Update'}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded">
                        {pendingQuickSuggestion.type === 'playbook'
                          ? pendingQuickSuggestion.suggestion.action
                          : 'edit'}
                      </span>
                    </div>
                    <p className="text-sm text-amber-900 mb-2">{pendingQuickSuggestion.message}</p>
                    {pendingQuickSuggestion.type === 'playbook' && (
                      <div className="text-xs text-amber-700 mb-2">
                        <span className="font-medium">{pendingQuickSuggestion.suggestion.section}</span>
                        {pendingQuickSuggestion.suggestion.index !== undefined && (
                          <span> (item {pendingQuickSuggestion.suggestion.index + 1})</span>
                        )}
                        : "{pendingQuickSuggestion.suggestion.content?.text}"
                      </div>
                    )}
                    {pendingQuickSuggestion.type === 'profile' && (
                      <div className="text-xs text-amber-700 mb-2">
                        <span className="font-medium">{pendingQuickSuggestion.suggestion.field}</span>
                        : {pendingQuickSuggestion.suggestion.value}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleApproveQuickSuggestion}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition-colors"
                      >
                        <Check size={14} />
                        Approve
                      </button>
                      <button
                        onClick={handleDismissQuickSuggestion}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        <X size={14} />
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Key Principles (Below the Fold) */}
        {playbook.principles && playbook.principles.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Compass size={18} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">Key Principles</h2>
                  <SuggestionBadge
                    count={pendingBySections.principles.length}
                    onClick={() => toggleSectionSuggestions('principles')}
                    expanded={expandedSection === 'principles'}
                  />
                </div>
                <p className="text-xs text-gray-500">Your foundational habits - stay consistent with these</p>
              </div>
            </div>

            <div className="space-y-3">
              {playbook.principles.map((principle, i) => {
                const Icon = getPrincipleIcon(principle.text);
                return (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                        <Icon size={16} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{principle.text}</p>
                        {principle.why && (
                          <p className="text-xs text-gray-500 mt-1">{principle.why}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Principles Suggestions */}
            {expandedSection === 'principles' && (
              <SuggestionPanel
                suggestions={pendingBySections.principles}
                onApprove={handleApproveSuggestion}
                onDismiss={handleDismissSuggestion}
              />
            )}
          </section>
        )}

        {/* Section 4: On Your Radar (Collapsible) */}
        {playbook.radar && playbook.radar.length > 0 && (
          <section className="mb-8">
            <button
              onClick={() => setRadarOpen(!radarOpen)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gray-200 rounded-lg">
                  <Lightbulb size={18} className="text-gray-600" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">On Your Radar</h2>
                    {pendingBySections.radar.length > 0 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSectionSuggestions('radar');
                        }}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          expandedSection === 'radar'
                            ? 'bg-amber-500 text-white'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}
                      >
                        <AlertCircle size={12} />
                        {pendingBySections.radar.length} pending
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Future considerations & longer-term ideas</p>
                </div>
              </div>
              {radarOpen ? (
                <ChevronUp size={20} className="text-gray-400" />
              ) : (
                <ChevronDown size={20} className="text-gray-400" />
              )}
            </button>

            {radarOpen && (
              <div className="mt-3 bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                {playbook.radar.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 shrink-0" />
                    <div>
                      <p className="text-sm text-gray-700">{item.suggestion}</p>
                      {item.timing && (
                        <p className="text-xs text-gray-400 mt-1">{item.timing}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Radar Suggestions */}
            {expandedSection === 'radar' && (
              <SuggestionPanel
                suggestions={pendingBySections.radar}
                onApprove={handleApproveSuggestion}
                onDismiss={handleDismissSuggestion}
              />
            )}
          </section>
        )}

        {/* Section 5: AI Summary (Collapsible at bottom) */}
        {playbook.summary && (
          <section className="mb-8">
            <button
              onClick={() => setSummaryOpen(!summaryOpen)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Target size={18} className="text-primary-600" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">The Big Picture</h2>
                    {pendingBySections.summary.length > 0 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSectionSuggestions('summary');
                        }}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          expandedSection === 'summary'
                            ? 'bg-amber-500 text-white'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}
                      >
                        <AlertCircle size={12} />
                        {pendingBySections.summary.length} pending
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Your overall strategy summary</p>
                </div>
              </div>
              {summaryOpen ? (
                <ChevronUp size={20} className="text-gray-400" />
              ) : (
                <ChevronDown size={20} className="text-gray-400" />
              )}
            </button>

            {summaryOpen && (
              <div className="mt-3 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl border border-primary-200 p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary-200 rounded-lg shrink-0">
                    <Sparkles size={16} className="text-primary-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-800 leading-relaxed">{playbook.summary}</p>
                  </div>
                </div>

                {/* Goal details */}
                {goals.length > 0 && goals.slice(0, 2).some(g => goalDetails[g]) && (
                  <div className="mt-4 pt-4 border-t border-primary-200 space-y-2">
                    {goals.slice(0, 2).map(goalKey => goalDetails[goalKey] && (
                      <p key={goalKey} className="text-xs text-gray-600">
                        <span className="font-medium text-gray-700">{GOAL_LABELS[goalKey]}:</span> {goalDetails[goalKey]}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Summary Suggestions */}
            {expandedSection === 'summary' && pendingBySections.summary.length > 0 && (
              <SuggestionPanel
                suggestions={pendingBySections.summary}
                onApprove={handleApproveSuggestion}
                onDismiss={handleDismissSuggestion}
              />
            )}
          </section>
        )}

        {/* Tip for updates */}
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500">
            Complete a weekly check-in, then tap the refresh icon to update your playbook with new recommendations while preserving what's working.
          </p>
        </div>
      </div>

      {/* Delete Entry Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmationModal
          title="Delete this entry?"
          itemSummary={deleteTarget.summary || deleteTarget.rawText}
          onConfirm={confirmDeleteEntry}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
