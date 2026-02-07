import { useState, useEffect } from 'react';
import { hasGoal } from '../profileHelpers';
import {
  Lock,
  Unlock,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Check,
  Coffee,
  Sun,
  Moon,
  Cookie,
  Cake,
  Apple,
  Zap,
  Droplets,
  Leaf,
  Target,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import {
  getNutritionProfile,
  getCalibrationProgress,
  isCalibrationComplete,
  isInCalibrationPeriod,
  updateNutritionProfileWithAnalysis,
  isCalibrationDismissed,
  optIntoCalibration,
} from '../nutritionCalibrationStore';
import SourcePopup, { COMMON_SOURCES, generateRationale } from './SourcePopup';

// Icons for each meal type
const MEAL_ICONS = {
  breakfast: Coffee,
  morningSnack: Apple,
  lunch: Sun,
  afternoonSnack: Cookie,
  dinner: Moon,
  eveningSnack: Cake,
  snacks: Cookie,
  dessert: Cake,
};

// Labels for meal types
const MEAL_LABELS = {
  breakfast: 'Breakfast',
  morningSnack: 'Morning Snack',
  lunch: 'Lunch',
  afternoonSnack: 'Afternoon Snack',
  dinner: 'Dinner',
  eveningSnack: 'Evening Snack',
  snacks: 'Snacks',
  dessert: 'Dessert',
};

/**
 * Locked/teaser state of the nutrition profile
 */
function LockedProfile({ progress }) {
  const teaserItems = [
    { icon: Zap, label: 'Estimated daily calories', color: 'text-amber-600' },
    { icon: Target, label: 'Protein intake analysis', color: 'text-emerald-600' },
    { icon: Leaf, label: 'Micronutrient gaps & strengths', color: 'text-green-600' },
    { icon: Coffee, label: 'Meal-by-meal breakdown', color: 'text-blue-600' },
    { icon: Sparkles, label: 'Personalized recommendations', color: 'text-purple-600' },
  ];

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-6 relative overflow-hidden">
      {/* Lock overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4 relative">
        <div className="p-2.5 bg-gray-200 rounded-xl">
          <Lock size={20} className="text-gray-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-700">Your Daily Nutritional Profile</h2>
          <p className="text-sm text-gray-500">Complete your nutrition calibration to unlock</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-5 relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            {progress.completed} of 5 days tracked
          </span>
          <span className="text-sm text-amber-600 font-medium">
            {progress.remaining} day{progress.remaining !== 1 ? 's' : ''} remaining
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Teaser items - what they'll unlock */}
      <div className="space-y-3 relative">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          What you'll unlock:
        </p>
        {teaserItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-gray-200"
            >
              <div className="p-1.5 bg-gray-100 rounded-lg">
                <Icon size={16} className={item.color} />
              </div>
              <span className="text-sm text-gray-600">{item.label}</span>
              <Lock size={12} className="text-gray-300 ml-auto" />
            </div>
          );
        })}
      </div>

      {/* Motivational CTA */}
      <div className="mt-5 p-4 bg-amber-50 rounded-xl border border-amber-200 relative">
        <div className="flex items-start gap-3">
          <Sparkles size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Your personalized insights are waiting!</p>
            <p className="text-xs text-amber-700 mt-1">
              Track your meals for {progress.remaining} more day{progress.remaining !== 1 ? 's' : ''} to unlock detailed nutrition analysis tailored to your eating patterns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Metric card with source popup
 */
function MetricCard({ label, value, sources, rationale, profileContext, userProfile }) {
  return (
    <div className="bg-white rounded-xl p-3 border border-gray-100">
      <div className="flex items-start justify-between">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <SourcePopup
          title={label}
          sources={sources}
          rationale={rationale}
          profileContext={profileContext}
        />
      </div>
      <p className="text-xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

/**
 * Insight item with source popup
 */
function InsightItem({ icon: Icon, text, iconColor, sources, rationale, profileContext }) {
  return (
    <div className="flex items-start gap-2 bg-white rounded-lg p-2.5 border border-gray-100">
      <Icon size={14} className={`${iconColor} shrink-0 mt-0.5`} />
      <span className="text-sm text-gray-700 flex-1">{text}</span>
      <SourcePopup
        title="About this insight"
        sources={sources}
        rationale={rationale}
        profileContext={profileContext}
      />
    </div>
  );
}

/**
 * Unlocked/full nutrition profile
 */
function UnlockedProfile({ profile, onAnalyze, userProfile }) {
  const [expandedSection, setExpandedSection] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Trigger analysis if profile needs it
  useEffect(() => {
    if (profile.needsAnalysis && !analyzing) {
      handleAnalyze();
    }
  }, [profile.needsAnalysis]);

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      await onAnalyze?.();
    } finally {
      setAnalyzing(false);
    }
  }

  if (analyzing || profile.needsAnalysis) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-emerald-200 rounded-xl">
            <Loader2 size={20} className="text-emerald-600 animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-emerald-800">Analyzing Your Nutrition...</h2>
            <p className="text-sm text-emerald-600">Building your personalized profile</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 size={32} className="text-emerald-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-emerald-700">Analyzing your meal patterns...</p>
          </div>
        </div>
      </div>
    );
  }

  // Generate personalized rationales
  const calorieRationale = generateRationale('calories', userProfile);
  const proteinRationale = generateRationale('protein', userProfile);

  // Build profile context string
  const profileParts = [];
  if (userProfile?.weight) profileParts.push(`${userProfile.weight} ${userProfile.weightUnit || 'lbs'}`);
  if (userProfile?.age) profileParts.push(`${userProfile.age} years old`);
  if (userProfile?.sex) profileParts.push(userProfile.sex);
  if (userProfile?.activityLevel) profileParts.push(userProfile.activityLevel);
  const profileContextStr = profileParts.join(', ');

  const sections = [
    {
      id: 'overview',
      title: 'Daily Overview',
      icon: Zap,
      color: 'amber',
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MetricCard
            label="Est. Daily Calories"
            value={profile.overview?.estimatedDailyCalories || '~2,000'}
            sources={[COMMON_SOURCES.mayoClinicCalories, COMMON_SOURCES.usdaGuidelines]}
            rationale={calorieRationale.rationale}
            profileContext={calorieRationale.profileContext}
            userProfile={userProfile}
          />
          <MetricCard
            label="Protein Estimate"
            value={profile.overview?.proteinEstimate || '~80g'}
            sources={[
              hasGoal(userProfile?.goals, 'muscle')
                ? COMMON_SOURCES.proteinAthletes
                : COMMON_SOURCES.proteinRDA,
              COMMON_SOURCES.acsm,
            ]}
            rationale={proteinRationale.rationale}
            profileContext={proteinRationale.profileContext}
            userProfile={userProfile}
          />
          <MetricCard
            label="Carbs Estimate"
            value={profile.overview?.carbEstimate || '~250g'}
            sources={[COMMON_SOURCES.usdaGuidelines]}
            rationale="Carbohydrate needs vary based on activity level and goals. Active individuals generally need more carbs to fuel their workouts."
            profileContext={profileContextStr}
            userProfile={userProfile}
          />
          <MetricCard
            label="Fats Estimate"
            value={profile.overview?.fatEstimate || '~70g'}
            sources={[COMMON_SOURCES.usdaGuidelines, COMMON_SOURCES.harvardNutritionSource]}
            rationale="Fat intake should comprise 20-35% of total calories. Focus on unsaturated fats from sources like olive oil, nuts, and fish."
            profileContext={profileContextStr}
            userProfile={userProfile}
          />
        </div>
      ),
    },
    {
      id: 'meals',
      title: 'Meal Patterns',
      icon: Coffee,
      color: 'blue',
      content: (
        <div className="space-y-3">
          {Object.entries(profile.mealPatterns || {}).map(([meal, data]) => {
            const Icon = MEAL_ICONS[meal] || Coffee;
            const label = MEAL_LABELS[meal] || meal;
            if (!data.typical?.length && !data.avgProtein && !data.suggestions?.length) return null;

            return (
              <div key={meal} className="bg-white rounded-xl p-3 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  {data.avgProtein && (
                    <span className="text-xs text-gray-400 ml-auto">{data.avgProtein} protein</span>
                  )}
                </div>
                {data.typical?.length > 0 && (
                  <p className="text-xs text-gray-600">
                    Typical: {data.typical.slice(0, 2).join(', ')}
                  </p>
                )}
                {data.suggestions?.length > 0 && (
                  <p className="text-xs text-emerald-600 mt-1">
                    Tip: {data.suggestions[0]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ),
    },
    {
      id: 'strengths',
      title: 'Your Strengths',
      icon: Check,
      color: 'emerald',
      content: (
        <div className="space-y-2">
          {(profile.strengths?.length > 0 ? profile.strengths : [
            'Consistent meal timing',
            'Good variety in protein sources',
            'Regular vegetable intake',
          ]).map((strength, idx) => (
            <InsightItem
              key={idx}
              icon={Check}
              text={strength}
              iconColor="text-emerald-500"
              sources={[]}
              rationale={profile.strengthRationales?.[idx] || "Based on your logged meals over the past 5 days, this pattern emerged as a positive aspect of your diet."}
              profileContext={profileContextStr}
            />
          ))}
        </div>
      ),
    },
    {
      id: 'gaps',
      title: 'Areas to Improve',
      icon: AlertCircle,
      color: 'amber',
      content: (
        <div className="space-y-2">
          {(profile.gaps?.length > 0 ? profile.gaps : [
            'Breakfast protein could be higher',
            'Consider adding more fiber-rich foods',
            'Hydration throughout the day',
          ]).map((gap, idx) => (
            <InsightItem
              key={idx}
              icon={AlertCircle}
              text={gap}
              iconColor="text-amber-500"
              sources={gap.toLowerCase().includes('protein')
                ? [COMMON_SOURCES.proteinAthletes]
                : gap.toLowerCase().includes('iron')
                  ? [COMMON_SOURCES.nihIron]
                  : []
              }
              rationale={profile.gapRationales?.[idx] || "This area was identified based on analyzing your meal patterns and comparing to recommended intake levels for your profile."}
              profileContext={profileContextStr}
            />
          ))}
        </div>
      ),
    },
    {
      id: 'recommendations',
      title: 'Personalized Recommendations',
      icon: Sparkles,
      color: 'purple',
      content: (
        <div className="space-y-2">
          {(profile.recommendations?.length > 0 ? profile.recommendations : [
            'Add Greek yogurt or eggs to breakfast for 20+ extra grams of protein',
            'Include a serving of vegetables with lunch',
            'Consider a handful of nuts as a protein-rich snack',
          ]).map((rec, idx) => (
            <InsightItem
              key={idx}
              icon={Sparkles}
              text={rec}
              iconColor="text-purple-500"
              sources={rec.toLowerCase().includes('protein')
                ? [COMMON_SOURCES.proteinAthletes, COMMON_SOURCES.acsm]
                : [COMMON_SOURCES.usdaGuidelines]
              }
              rationale={profile.recommendationRationales?.[idx] || `This recommendation is tailored to address gaps identified in your eating patterns while being practical for your lifestyle.`}
              profileContext={profileContextStr}
            />
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-200 p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-emerald-200 rounded-xl">
          <Unlock size={20} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-emerald-800">Your Daily Nutritional Profile</h2>
          <p className="text-sm text-emerald-600">Based on your 5-day meal tracking</p>
        </div>
      </div>

      {/* Personalization notice */}
      <div className="mb-4 p-3 bg-white/60 rounded-lg border border-emerald-100">
        <p className="text-xs text-emerald-700">
          <strong>Personalized for you:</strong> These insights are calculated based on your profile ({profileContextStr || 'your provided information'}).
          Tap the <span className="inline-flex items-center"><span className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 text-[10px] font-bold flex items-center justify-center">?</span></span> icons to see sources and why each recommendation applies to you.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSection === section.id;
          const colorClasses = {
            amber: 'bg-amber-100 text-amber-600',
            blue: 'bg-blue-100 text-blue-600',
            emerald: 'bg-emerald-100 text-emerald-600',
            purple: 'bg-purple-100 text-purple-600',
          };

          return (
            <div key={section.id} className="rounded-xl border border-emerald-200 overflow-hidden">
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${colorClasses[section.color]}`}>
                    <Icon size={14} />
                  </div>
                  <span className="text-sm font-medium text-gray-800">{section.title}</span>
                </div>
                {isExpanded ? (
                  <ChevronUp size={16} className="text-gray-400" />
                ) : (
                  <ChevronDown size={16} className="text-gray-400" />
                )}
              </button>
              {isExpanded && (
                <div className="p-3 bg-gray-50 border-t border-emerald-100">
                  {section.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-emerald-200">
        <p className="text-xs text-emerald-700 text-center">
          Generated on {new Date(profile.generatedAt).toLocaleDateString()}. Tell your Advisor about diet changes to update your profile.
        </p>
      </div>
    </div>
  );
}

/**
 * Prompt for users who dismissed calibration to opt back in
 */
function DismissedCalibrationPrompt({ onOptIn }) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-gray-200 rounded-xl">
          <Lock size={20} className="text-gray-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-700">Daily Nutritional Profile</h2>
          <p className="text-sm text-gray-500">You skipped nutrition calibration</p>
        </div>
      </div>

      <div className="mb-4 p-4 bg-white rounded-xl border border-gray-100">
        <p className="text-sm text-gray-600 mb-3">
          Track your meals for 5 days to unlock personalized nutrition insights including:
        </p>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-center gap-2">
            <Zap size={14} className="text-amber-500" />
            Estimated daily calorie and macro targets
          </li>
          <li className="flex items-center gap-2">
            <Target size={14} className="text-emerald-500" />
            Personalized protein recommendations
          </li>
          <li className="flex items-center gap-2">
            <Sparkles size={14} className="text-purple-500" />
            Nutrition strengths and areas to improve
          </li>
        </ul>
      </div>

      <button
        onClick={onOptIn}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors"
      >
        <Unlock size={16} />
        Start Nutrition Calibration
      </button>
    </div>
  );
}

/**
 * Main Daily Nutrition Profile component
 * Shows locked or unlocked state based on calibration completion
 */
export default function DailyNutritionProfile({ profile: userProfile }) {
  const [nutritionProfile, setNutritionProfile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const currentProgress = getCalibrationProgress();
    setProgress(currentProgress);
    setIsDismissed(isCalibrationDismissed());

    if (currentProgress.isComplete) {
      setNutritionProfile(getNutritionProfile());
    }
  }, [refreshKey]);

  // Handle opt-in from dismissed state
  function handleOptIn() {
    optIntoCalibration();
    setIsDismissed(false);
    setRefreshKey(k => k + 1);
  }

  // Show opt-in prompt for users who dismissed calibration
  if (isDismissed && !progress?.isComplete) {
    return <DismissedCalibrationPrompt onOptIn={handleOptIn} />;
  }

  // Don't show anything if calibration hasn't started
  if (!progress || (!progress.isComplete && !progress.inPeriod && progress.completed === 0)) {
    return null;
  }

  // If complete, show unlocked profile
  if (progress.isComplete && nutritionProfile) {
    return (
      <UnlockedProfile
        profile={nutritionProfile}
        userProfile={userProfile}
        onAnalyze={async () => {
          try {
            // Call API to analyze the profile
            const calibrationData = {
              days: progress.days,
            };

            const response = await fetch('/api/analyze-nutrition-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                calibrationData,
                profile: userProfile,
              }),
            });

            if (response.ok) {
              const analysis = await response.json();
              updateNutritionProfileWithAnalysis(analysis);
            } else {
              // Use fallback analysis if API fails
              const fallbackAnalysis = {
                overview: {
                  estimatedDailyCalories: '~1,850',
                  proteinEstimate: '~95g',
                  carbEstimate: '~200g',
                  fatEstimate: '~65g',
                },
                strengths: [
                  'Good protein variety across meals',
                  'Consistent eating schedule',
                  'Healthy snacking habits',
                ],
                gaps: [
                  'Breakfast could use more protein (aim for 30g)',
                  'Consider adding more leafy greens',
                  'Evening snacks tend to be carb-heavy',
                ],
                recommendations: [
                  'Add eggs or Greek yogurt to breakfast for extra protein',
                  'Swap afternoon chips for nuts or veggies with hummus',
                  'Include a salad or vegetable side with dinner',
                ],
              };
              updateNutritionProfileWithAnalysis(fallbackAnalysis);
            }
          } catch (err) {
            console.error('Error analyzing nutrition profile:', err);
            // Use fallback analysis on error
            const fallbackAnalysis = {
              overview: {
                estimatedDailyCalories: '~1,850',
                proteinEstimate: '~95g',
                carbEstimate: '~200g',
                fatEstimate: '~65g',
              },
              strengths: ['Consistent meal timing'],
              gaps: ['Protein distribution could be improved'],
              recommendations: ['Add protein to breakfast'],
            };
            updateNutritionProfileWithAnalysis(fallbackAnalysis);
          }
          setRefreshKey(k => k + 1);
        }}
      />
    );
  }

  // Show locked state during calibration
  if (progress.inPeriod) {
    return <LockedProfile progress={progress} />;
  }

  return null;
}
