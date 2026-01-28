import { useState, useEffect } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Calendar,
  Loader2,
  Edit3,
  Target,
  Trophy,
  X,
  Sparkles,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import {
  addCheckIn,
  getCurrentWeekCheckIn,
  getRecentCheckIns,
  formatWeekOf,
  saveDraft,
  getDraft,
  clearDraft,
} from '../checkInStore';
import {
  getActivitiesThisWeek,
  getWeeklySummary,
} from '../activityLogStore';
import { getWeeklyFocusProgress, generateWeeklyWins } from '../weeklyProgressStore';
import { getCalibrationData, CALIBRATION_DAYS, getTodayDayKey } from '../nutritionCalibrationStore';

// Get week date range string
function getWeekDateRange() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const format = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${format(monday)} - ${format(sunday)}`;
}

// Generate week summary from all available data sources (local fallback)
function generateWeekSummaryText(activities, focusProgress, nutritionData) {
  // Filter out system updates and focus on actual activities
  const validActivities = activities.filter(activity => {
    const summary = (activity.summary || activity.rawText || '').toLowerCase();
    // Skip system updates
    if (summary.includes('updated focus item') ||
        summary.includes('updated protein preference') ||
        summary.includes('tracking plan') ||
        summary.includes('set target')) {
      return false;
    }
    return true;
  });

  // Categorize activities
  const workouts = validActivities.filter(a => a.type === 'workout');
  const weightLogs = validActivities.filter(a => a.type === 'weight');
  const nutritionLogs = validActivities.filter(a => a.type === 'nutrition');

  const parts = [];

  // Training summary
  if (workouts.length > 0) {
    const runs = workouts.filter(w => w.subType === 'run' || w.subType === 'cardio');
    const strength = workouts.filter(w => w.subType === 'strength');

    const trainingParts = [];
    if (strength.length > 0) {
      trainingParts.push(`${strength.length} strength session${strength.length !== 1 ? 's' : ''}`);
    }
    if (runs.length > 0) {
      trainingParts.push(`${runs.length} run${runs.length !== 1 ? 's' : ''}`);
    }
    if (trainingParts.length > 0) {
      parts.push(`This week you logged ${trainingParts.join(' and ')}.`);
    }
  }

  // Weight tracking
  if (weightLogs.length > 0) {
    const weights = weightLogs.map(w => w.data?.weight).filter(Boolean);
    if (weights.length > 0) {
      const latest = weights[0];
      parts.push(`You tracked your weight ${weightLogs.length} time${weightLogs.length !== 1 ? 's' : ''}, most recently at ${latest} lbs.`);
    }
  }

  // High-level nutrition (don't list every meal)
  if (nutritionLogs.length > 0) {
    const proteinHits = nutritionLogs.filter(n => n.data?.hitProteinGoal).length;
    if (proteinHits > 0) {
      parts.push(`You hit your protein goal ${proteinHits} time${proteinHits !== 1 ? 's' : ''}.`);
    } else {
      parts.push(`You logged ${nutritionLogs.length} nutrition entr${nutritionLogs.length !== 1 ? 'ies' : 'y'}.`);
    }
  }

  // Check nutrition calibration
  if (nutritionData?.days) {
    const daysWithMeals = Object.values(nutritionData.days).filter(d =>
      d?.meals?.some(m => m.content?.trim())
    ).length;
    if (daysWithMeals > 0 && nutritionLogs.length === 0) {
      parts.push(`You logged meals on ${daysWithMeals} day${daysWithMeals !== 1 ? 's' : ''}.`);
    }
  }

  if (parts.length === 0) {
    return '';
  }

  // Add a note that AI summary is being generated
  return parts.join(' ') + '\n\n(Generating personalized summary...)';
}

// Emoji button component - Mobile optimized with larger tap targets
function EmojiButton({ emoji, label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 p-3 min-h-[72px] rounded-xl transition-all touch-manipulation ${
        selected
          ? 'bg-indigo-100 border-2 border-indigo-400 scale-105'
          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 active:bg-gray-200'
      }`}
    >
      <span className="text-2xl sm:text-3xl">{emoji}</span>
      <span className={`text-xs font-medium ${selected ? 'text-indigo-700' : 'text-gray-600'}`}>
        {label}
      </span>
    </button>
  );
}

// Focus Goal Review Item - Mobile optimized
function FocusGoalReviewItem({ item, progress, onBlockerChange, blockerText }) {
  const [showBlockerInput, setShowBlockerInput] = useState(false);
  const isComplete = progress?.complete;
  const current = progress?.current || 0;
  const target = progress?.target || 1;
  const progressPercent = Math.min(100, Math.round((current / target) * 100));

  let statusText = '';
  if (isComplete) {
    statusText = 'You crushed it!';
  } else if (current === 0) {
    statusText = "Didn't get to it this week";
  } else if (progressPercent >= 80) {
    statusText = 'So close! Almost there';
  } else {
    statusText = `Made some progress (${current}/${target})`;
  }

  return (
    <div className={`rounded-xl p-4 ${
      isComplete ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-200'
    }`}>
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isComplete
            ? 'bg-green-500 text-white'
            : current > 0
            ? 'bg-amber-100 text-amber-600 border-2 border-amber-300'
            : 'bg-gray-100 text-gray-400 border-2 border-gray-300'
        }`}>
          {isComplete ? (
            <Check size={14} strokeWidth={3} />
          ) : current > 0 ? (
            <span className="text-xs font-bold">~</span>
          ) : (
            <span className="text-xs font-bold">-</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Goal text */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <span className={`text-sm font-medium ${isComplete ? 'text-green-800' : 'text-gray-800'}`}>
              {item.action}
            </span>
            <span className={`text-sm font-semibold flex-shrink-0 ${
              isComplete ? 'text-green-600' : 'text-gray-500'
            }`}>
              ({current}/{target}) {isComplete && '✓'}
            </span>
          </div>

          {/* Status text */}
          <p className={`text-xs ${isComplete ? 'text-green-600' : 'text-gray-500'}`}>
            {statusText}
          </p>

          {/* Blocker input for incomplete goals */}
          {!isComplete && (
            <div className="mt-3">
              {showBlockerInput ? (
                <textarea
                  value={blockerText || ''}
                  onChange={(e) => onBlockerChange(e.target.value)}
                  placeholder="What got in the way? (optional)"
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowBlockerInput(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 py-1"
                >
                  + What got in the way? (optional)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Completion View - Mobile optimized
function CheckInComplete({ wins, suggestions, onBack }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6 animate-scale-in my-4">
        <div className="text-center mb-5">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check-in Complete!</h2>
          <p className="text-gray-600 text-sm">
            Your week has been logged. Here's what stood out:
          </p>
        </div>

        {/* Weekly Wins */}
        {wins.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={18} className="text-yellow-500" />
              <h3 className="font-semibold text-gray-900">Weekly Wins</h3>
            </div>
            <div className="space-y-2">
              {wins.slice(0, 5).map((win, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2.5 bg-yellow-50 rounded-lg">
                  <Check size={14} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{win.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions for Next Week */}
        {suggestions && suggestions.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Target size={18} className="text-indigo-500" />
              <h3 className="font-semibold text-gray-900">Focus for Next Week</h3>
            </div>
            <div className="space-y-2">
              {suggestions.slice(0, 4).map((suggestion, idx) => (
                <div key={idx} className={`flex items-start gap-2 p-2.5 rounded-lg ${
                  suggestion.type === 'keep' ? 'bg-green-50' : 'bg-amber-50'
                }`}>
                  <span className="flex-shrink-0 mt-0.5">
                    {suggestion.type === 'keep' ? '✓' : '→'}
                  </span>
                  <span className={`text-sm ${
                    suggestion.type === 'keep' ? 'text-green-800' : 'text-amber-800'
                  }`}>{suggestion.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500 text-center mb-5">
          Your Advisor will use this to refine next week's focus goals.
        </p>

        <button
          onClick={onBack}
          className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-colors touch-manipulation"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

// Check-In History Component
function CheckInHistory({ checkIns, expanded, onToggle }) {
  if (checkIns.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Calendar size={16} />
        Past Check-Ins
      </h3>
      <div className="space-y-2">
        {checkIns.map(checkIn => (
          <div key={checkIn.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => onToggle(expanded === checkIn.id ? null : checkIn.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
            >
              <span className="text-sm font-medium text-gray-800">
                Week of {formatWeekOf(checkIn.weekOf)}
              </span>
              {expanded === checkIn.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expanded === checkIn.id && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3">
                {checkIn.weekSummary && (
                  <p className="text-sm text-gray-700">{checkIn.weekSummary}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  {checkIn.energy && (
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      Energy: {checkIn.energy.charAt(0).toUpperCase() + checkIn.energy.slice(1)}
                    </span>
                  )}
                  {checkIn.sleep && (
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      Sleep: {checkIn.sleep.charAt(0).toUpperCase() + checkIn.sleep.slice(1)}
                    </span>
                  )}
                </div>
                {checkIn.notes && (
                  <p className="text-sm text-gray-600 italic">"{checkIn.notes}"</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Suggestion item component
function SuggestionItem({ suggestion, index }) {
  const isKeep = suggestion.type === 'keep';
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${
      isKeep ? 'bg-green-50' : 'bg-amber-50'
    }`}>
      <span className="text-lg flex-shrink-0 mt-0.5">
        {isKeep ? '✓' : '→'}
      </span>
      <p className={`text-sm ${isKeep ? 'text-green-800' : 'text-amber-800'}`}>
        {suggestion.text}
      </p>
    </div>
  );
}

// Focus for Next Week Section
function NextWeekSuggestions({ suggestions }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl border border-indigo-200 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target size={18} className="text-indigo-600" />
        <h2 className="font-semibold text-gray-900">Focus for Next Week</h2>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Based on this week, here's what I'd suggest:
      </p>

      <div className="space-y-2">
        {suggestions.map((suggestion, idx) => (
          <SuggestionItem key={idx} suggestion={suggestion} index={idx} />
        ))}
      </div>
    </section>
  );
}

// Detail Level Selector
function DetailLevelSelector({ value, onChange }) {
  const options = [
    { key: 'less', label: 'Less Detail' },
    { key: 'good', label: 'This is Good' },
    { key: 'more', label: 'More Detail' },
  ];

  return (
    <div className="flex gap-2">
      {options.map(opt => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors touch-manipulation ${
            value === opt.key
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Week Summary Section with AI synthesis - Enhanced version
function WeekSummarySection({
  summary,
  sections,
  onSummaryChange,
  isEditing,
  setIsEditing,
  hasData,
  isGenerating,
  onRegenerate,
  userFeedback,
  setUserFeedback,
  detailPreference,
  setDetailPreference,
}) {
  const [localSummary, setLocalSummary] = useState(summary);

  useEffect(() => {
    setLocalSummary(summary);
  }, [summary]);

  function handleSave() {
    onSummaryChange(localSummary);
    setIsEditing(false);
  }

  function handleCancel() {
    setLocalSummary(summary);
    setIsEditing(false);
  }

  // No data state
  if (!hasData && !summary) {
    return (
      <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Your Week Summary</h2>

        <div className="p-4 bg-gray-50 rounded-xl mb-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            I don't have much logged from this week yet. Would you like to add a quick summary of how your week went?
          </p>
        </div>

        <textarea
          value={localSummary}
          onChange={(e) => {
            setLocalSummary(e.target.value);
            onSummaryChange(e.target.value);
          }}
          placeholder="Write your own summary here..."
          rows={4}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </section>
    );
  }

  // Render summary with sections if available
  function renderSummary() {
    if (sections && (sections.training || sections.nutrition || sections.overall)) {
      return (
        <div className="space-y-4">
          {sections.training && (
            <div>
              <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">
                Training Recap
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {sections.training}
              </p>
            </div>
          )}
          {sections.nutrition && (
            <div>
              <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">
                Nutrition & Metrics
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {sections.nutrition}
              </p>
            </div>
          )}
          {sections.overall && (
            <div>
              <h3 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">
                Overall Assessment
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {sections.overall}
              </p>
            </div>
          )}
        </div>
      );
    }

    // Fallback: render as paragraphs if summary contains newlines
    if (summary && summary.includes('\n\n')) {
      const paragraphs = summary.split('\n\n').filter(p => p.trim());
      return (
        <div className="space-y-3">
          {paragraphs.map((para, idx) => (
            <p key={idx} className="text-sm text-gray-700 leading-relaxed">
              {para}
            </p>
          ))}
        </div>
      );
    }

    // Simple text fallback
    return (
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
        {summary || 'No activities logged this week.'}
      </p>
    );
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Your Week Summary</h2>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-indigo-50 transition-colors touch-manipulation"
          >
            <Edit3 size={12} />
            Edit
          </button>
        )}
      </div>

      {isGenerating ? (
        <div className="p-8 bg-gray-50 rounded-xl flex flex-col items-center justify-center">
          <Loader2 size={28} className="text-indigo-600 animate-spin mb-3" />
          <p className="text-sm text-gray-600 font-medium">Analyzing your week...</p>
          <p className="text-xs text-gray-400 mt-1">Creating your personalized summary</p>
        </div>
      ) : isEditing ? (
        <div className="space-y-3">
          <textarea
            value={localSummary}
            onChange={(e) => setLocalSummary(e.target.value)}
            rows={10}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="Describe how your week went..."
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors touch-manipulation"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="p-4 bg-gray-50 rounded-xl">
            {renderSummary()}
          </div>

          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
            <Sparkles size={10} />
            Auto-generated from your logged entries
          </p>

          {/* Feedback loop section */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle size={14} className="text-gray-400" />
              <p className="text-sm font-medium text-gray-700">Help me improve</p>
            </div>

            {/* Detail level preference */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">For next week's summary, would you prefer:</p>
              <DetailLevelSelector
                value={detailPreference}
                onChange={setDetailPreference}
              />
            </div>

            {/* Free-form feedback */}
            <div>
              <textarea
                value={userFeedback}
                onChange={(e) => setUserFeedback(e.target.value)}
                placeholder="Any other feedback? Tell me what to focus on more/less, what felt off, what you liked..."
                rows={2}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              {userFeedback && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  disabled={isGenerating}
                  className="mt-2 flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-700 py-1 font-medium"
                >
                  <RefreshCw size={12} />
                  Regenerate with feedback
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

// Get stored detail preference
function getStoredDetailPreference() {
  try {
    return localStorage.getItem('health-advisor-summary-detail') || 'good';
  } catch {
    return 'good';
  }
}

function saveDetailPreference(pref) {
  try {
    localStorage.setItem('health-advisor-summary-detail', pref);
  } catch {
    // Ignore
  }
}

// Main Component
export default function WeeklyCheckIn({ profile, playbook, onCheckInComplete, onClose, analyzingCheckIn }) {
  const [step, setStep] = useState('form');
  const [weekSummary, setWeekSummary] = useState('');
  const [summarySections, setSummarySections] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [detailPreference, setDetailPreferenceState] = useState(getStoredDetailPreference);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [userFeedback, setUserFeedback] = useState('');
  const [focusBlockers, setFocusBlockers] = useState({});
  const [energy, setEnergy] = useState(null);
  const [sleep, setSleep] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [wins, setWins] = useState([]);

  // Wrapper to save detail preference when changed
  function setDetailPreference(pref) {
    setDetailPreferenceState(pref);
    saveDetailPreference(pref);
  }

  const existingCheckIn = getCurrentWeekCheckIn();
  const recentCheckIns = getRecentCheckIns(5).filter(c => c.id !== existingCheckIn?.id);
  const activities = getActivitiesThisWeek();
  const focusProgress = getWeeklyFocusProgress();
  const weeklyFocus = playbook?.weeklyFocus || [];
  const nutritionData = getCalibrationData();

  const hasData = activities.length > 0 ||
    (nutritionData?.days && Object.values(nutritionData.days).some(d => d?.meals?.some(m => m.content?.trim())));

  useEffect(() => {
    window.scrollTo(0, 0);

    if (existingCheckIn) {
      setStep('complete');
      setWins(generateWeeklyWins());
      return;
    }

    // Fetch fresh activities data inside useEffect to avoid stale closures
    const currentActivities = getActivitiesThisWeek();
    const currentFocusProgress = getWeeklyFocusProgress();
    const currentNutritionData = getCalibrationData();

    // Check for saved draft
    const draft = getDraft();
    if (draft) {
      setFocusBlockers(draft.focusBlockers || {});
      setEnergy(draft.energy || null);
      setSleep(draft.sleep || null);
      setNotes(draft.notes || '');
      setUserFeedback(draft.userFeedback || '');

      // If draft has a summary AND no new activities, use draft; otherwise regenerate
      if (draft.weekSummary && draft.weekSummary.trim() && currentActivities.length === 0) {
        setWeekSummary(draft.weekSummary);
      } else if (currentActivities.length > 0) {
        // We have activities - always regenerate summary from current data
        const summary = generateWeekSummaryText(currentActivities, currentFocusProgress, currentNutritionData);
        setWeekSummary(summary);
        // Also try AI summary
        generateAISummary(currentActivities, currentFocusProgress, currentNutritionData);
      } else {
        // No activities and draft has empty summary
        setWeekSummary(draft.weekSummary || '');
      }
    } else {
      // No draft - generate initial summary from local data
      const summary = generateWeekSummaryText(currentActivities, currentFocusProgress, currentNutritionData);
      setWeekSummary(summary);

      // Try to generate AI-enhanced summary
      if (currentActivities.length > 0) {
        generateAISummary(currentActivities, currentFocusProgress, currentNutritionData);
      }
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (step === 'form' && !existingCheckIn) {
      const draftData = { weekSummary, focusBlockers, energy, sleep, notes, userFeedback };
      saveDraft(draftData);
    }
  }, [weekSummary, focusBlockers, energy, sleep, notes, userFeedback, step, existingCheckIn]);

  async function generateAISummary(activitiesData, focusData, nutritionInfo, feedback = '') {
    if (!hasData && !feedback) {
      return;
    }

    setIsGeneratingSummary(true);

    try {
      const response = await fetch('/api/synthesize-week-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activities: activitiesData || activities,
          focusProgress: focusData || focusProgress,
          nutritionData: nutritionInfo || nutritionData,
          profile,
          weeklyFocus,
          userFeedback: feedback,
          existingSummary: weekSummary,
          detailPreference,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.summary) {
          setWeekSummary(data.summary);
        }
        if (data.sections) {
          setSummarySections(data.sections);
        }
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        }
      } else {
        const errorText = await response.text();
        console.error('[WeeklyCheckIn] API error:', response.status, errorText);
      }
    } catch (err) {
      console.error('[WeeklyCheckIn] Error generating AI summary:', err);
      // Keep the locally generated summary as fallback
    } finally {
      setIsGeneratingSummary(false);
    }
  }

  function handleRegenerate() {
    generateAISummary(activities, focusProgress, nutritionData, userFeedback);
    setUserFeedback('');
  }

  function handleBlockerChange(index, text) {
    setFocusBlockers(prev => ({ ...prev, [index]: text }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const checkInData = {
        weekSummary,
        summarySections,
        suggestions,
        focusBlockers,
        energy,
        sleep,
        notes,
        focusProgress: focusProgress.map((fp, idx) => ({
          action: weeklyFocus[idx]?.action || '',
          current: fp.progress?.current || 0,
          target: fp.progress?.target || 1,
          complete: fp.progress?.complete || false,
          blocker: focusBlockers[idx] || null,
        })),
        completedGoals: focusProgress.filter(fp => fp.progress?.complete).length,
        totalGoals: focusProgress.length,
        detailPreference,
      };

      addCheckIn(checkInData);
      clearDraft();

      const newWins = generateWeeklyWins();
      setWins(newWins);

      onCheckInComplete?.(checkInData);
      setStep('complete');
    } catch (err) {
      console.error('Error saving check-in:', err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackToHome() {
    onClose?.();
  }

  if (step === 'complete') {
    return <CheckInComplete wins={wins} suggestions={suggestions} onBack={handleBackToHome} />;
  }

  const completedGoals = focusProgress.filter(fp => fp.progress?.complete).length;

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto overscroll-contain">
      {/* Header - Mobile optimized */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10 safe-area-top">
        <div className="max-w-2xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="p-2 -ml-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <Edit3 size={16} className="text-indigo-600" />
                Weekly Check-In
              </h1>
              <p className="text-xs text-gray-500">{getWeekDateRange()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 sm:py-6 pb-safe">
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          {/* YOUR WEEK SUMMARY */}
          <WeekSummarySection
            summary={weekSummary}
            sections={summarySections}
            onSummaryChange={setWeekSummary}
            isEditing={isEditingSummary}
            setIsEditing={setIsEditingSummary}
            hasData={hasData}
            isGenerating={isGeneratingSummary}
            onRegenerate={handleRegenerate}
            userFeedback={userFeedback}
            setUserFeedback={setUserFeedback}
            detailPreference={detailPreference}
            setDetailPreference={setDetailPreference}
          />

          {/* FOCUS FOR NEXT WEEK - Suggestions */}
          <NextWeekSuggestions suggestions={suggestions} />

          {/* FOCUS GOAL REVIEW */}
          {weeklyFocus.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target size={18} className="text-green-600" />
                  <h2 className="font-semibold text-gray-900">Focus Goal Review</h2>
                </div>
                <span className="text-sm text-gray-500">
                  {completedGoals}/{weeklyFocus.length} done
                </span>
              </div>

              <div className="space-y-3">
                {weeklyFocus.map((item, idx) => (
                  <FocusGoalReviewItem
                    key={idx}
                    item={item}
                    progress={focusProgress[idx]?.progress}
                    blockerText={focusBlockers[idx]}
                    onBlockerChange={(text) => handleBlockerChange(idx, text)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* QUICK QUESTIONS - Mobile optimized */}
          <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="font-semibold text-gray-900">Quick Questions</h2>
              <p className="text-xs text-gray-500">
                Only asking what I couldn't figure out from your logs
              </p>
            </div>

            {/* Energy */}
            <div className="mb-5">
              <label className="text-sm font-medium text-gray-700 mb-3 block">
                How was your energy this week overall?
              </label>
              <div className="grid grid-cols-4 gap-2">
                <EmojiButton emoji="😫" label="Low" selected={energy === 'low'} onClick={() => setEnergy('low')} />
                <EmojiButton emoji="😐" label="Okay" selected={energy === 'okay'} onClick={() => setEnergy('okay')} />
                <EmojiButton emoji="🙂" label="Good" selected={energy === 'good'} onClick={() => setEnergy('good')} />
                <EmojiButton emoji="😄" label="Great" selected={energy === 'great'} onClick={() => setEnergy('great')} />
              </div>
            </div>

            {/* Sleep */}
            <div className="mb-5">
              <label className="text-sm font-medium text-gray-700 mb-3 block">
                How was your sleep quality?
              </label>
              <div className="grid grid-cols-4 gap-2">
                <EmojiButton emoji="😫" label="Poor" selected={sleep === 'poor'} onClick={() => setSleep('poor')} />
                <EmojiButton emoji="😐" label="Fair" selected={sleep === 'fair'} onClick={() => setSleep('fair')} />
                <EmojiButton emoji="🙂" label="Good" selected={sleep === 'good'} onClick={() => setSleep('good')} />
                <EmojiButton emoji="😄" label="Great" selected={sleep === 'great'} onClick={() => setSleep('great')} />
              </div>
            </div>

            {/* Open notes */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Any wins or struggles you want to remember?
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional - add anything else about your week"
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          </section>

          {/* Submit Button - Mobile optimized with safe area */}
          <div className="pb-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Complete Check-in
                </>
              )}
            </button>
          </div>
        </form>

        {/* Check-In History */}
        <CheckInHistory
          checkIns={recentCheckIns}
          expanded={expandedHistory}
          onToggle={setExpandedHistory}
        />
      </div>
    </div>
  );
}
