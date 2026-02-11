import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, User, Briefcase, Moon, Brain, Droplets, Dumbbell, UtensilsCrossed, Lightbulb, Target, AlertCircle } from 'lucide-react';
import { getBackup, restoreFromBackup } from '../dataBackup';
import { getItem, setItem, removeItem } from '../storageHelper';
import RichTextArea from './RichTextArea';
import StepPersonal from './steps/StepPersonal';
import StepLifestyle from './steps/StepLifestyle';
import StepSleep from './steps/StepSleep';
import StepStress from './steps/StepStress';
import StepHydration from './steps/StepHydration';
import StepTraining from './steps/StepTraining';
import StepNutrition from './steps/StepNutrition';
import StepBehavioral from './steps/StepBehavioral';
import StepGoals from './steps/StepGoals';

const DRAFT_KEY = 'health-advisor-draft';

const DEPTH_OPTIONS = [
  {
    id: 'chill',
    label: 'Chill',
    description: 'Quick onboarding to answer basic health questions.',
    steps: ['personal', 'training', 'goals'],
  },
  {
    id: 'moderate',
    label: 'Moderate',
    description: "You want detailed answers but don't have the time or desire to go super in depth. That's okay! The advisor will still be able to provide you with useful information.",
    steps: ['personal', 'lifestyle', 'sleep', 'training', 'nutrition', 'goals'],
  },
  {
    id: 'hardcore',
    label: 'Hardcore',
    description: 'You want to provide as much information to the advisor so it can offer detailed and personalized recommendations on health, including diet, exercise, recovery, and sleep.',
    steps: ['personal', 'lifestyle', 'sleep', 'stress', 'hydration', 'training', 'nutrition', 'behavioral', 'goals'],
  },
];

const ALL_STEPS = [
  { id: 'personal', label: 'Personal', icon: User, extra: 'Anything else about you that would help me understand your situation?' },
  { id: 'lifestyle', label: 'Lifestyle', icon: Briefcase, extra: 'Anything else about your daily life, routines, or habits I should know?' },
  { id: 'sleep', label: 'Sleep', icon: Moon, extra: 'Anything else about your sleep patterns or nighttime routine?' },
  { id: 'stress', label: 'Stress', icon: Brain, extra: 'Anything else about your mental health, stress, or coping strategies?' },
  { id: 'hydration', label: 'Hydration', icon: Droplets, extra: 'Anything else about your hydration or fluid intake habits?' },
  { id: 'training', label: 'Training', icon: Dumbbell, extra: 'Anything else about your training, movement, or physical activity?' },
  { id: 'nutrition', label: 'Nutrition', icon: UtensilsCrossed, extra: 'Anything else about your eating habits, relationship with food, or diet?' },
  { id: 'behavioral', label: 'Behavioral', icon: Lightbulb, extra: 'Anything else about your mindset, patterns, or lifestyle choices I should know?' },
  { id: 'goals', label: 'Goals', icon: Target, extra: 'Any other goals, timelines, or context about what you want to achieve?' },
];

function DataRecoveryBanner({ onRecover }) {
  const [backup, setBackup] = useState(null);

  useEffect(() => {
    const b = getBackup();
    if (b?.data?.['health-advisor-profile']) {
      setBackup(b);
    }
  }, []);

  if (!backup) return null;

  const backupDate = new Date(backup.timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
      <div className="flex items-start gap-3">
        <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <p className="font-medium text-amber-800">Previous data found!</p>
          <p className="text-sm text-amber-700 mt-1">
            We found a backup from {backupDate}. Would you like to restore it?
          </p>
          <button
            onClick={onRecover}
            className="mt-3 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
          >
            Restore My Data
          </button>
        </div>
      </div>
    </div>
  );
}

function DepthSelection({ onSelect, current, onRecover }) {
  return (
    <div className="space-y-4" data-testid="onboarding-depth-selection">
      <DataRecoveryBanner onRecover={onRecover} />
      <p className="text-gray-600 text-sm mb-6">How detailed would you like the onboarding process to be?</p>
      {DEPTH_OPTIONS.map(opt => (
        <button
          key={opt.id}
          data-testid={`depth-option-${opt.id}`}
          onClick={() => onSelect(opt.id)}
          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
            current === opt.id
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-100 hover:border-primary-200 hover:bg-gray-50'
          }`}
        >
          <span className="font-semibold text-gray-800">{opt.label}</span>
          <p className="text-sm text-gray-500 mt-1">{opt.description}</p>
        </button>
      ))}
    </div>
  );
}

const INITIAL_DATA = {
  // Personal
  name: '',
  location: '',
  // Full address (optional)
  streetAddress: '',
  city: '',
  stateProvince: '',
  postalCode: '',
  country: '',
  occupation: '',
  age: '',
  height: '',
  heightUnit: 'in',
  weight: '',
  weightUnit: 'lbs',
  sex: '',
  bodyFat: '',
  restingHeartRate: '',
  income: '',
  budgetWillingness: '',

  // Lifestyle
  activityLevel: '',
  activityDetail: '',
  wakeTime: '',
  bedTime: '',
  workHours: '',
  availableTime: '',
  commute: '',
  dailySteps: '',
  screenTime: '',
  socialSupport: '',
  hobbies: '',
  travelFrequency: '',

  // Sleep & Recovery
  sleepQuality: '',
  sleepHoursWeekday: '',
  sleepHoursWeekend: '',
  sleepConsistency: '',
  sleepDisruptions: '',
  preSleepHabits: '',
  naps: '',

  // Stress & Mental Health
  stressLevel: '',
  mentalHealth: '',
  stressManagement: '',
  lifeStressors: '',
  recoveryPractices: '',

  // Hydration
  waterIntake: '',
  hydrationHabits: '',
  workoutHydration: '',
  electrolytes: '',
  urineColor: '',
  sweatRate: '',
  alcohol: '',

  // Training
  exercises: [],
  trainingAge: '',
  trainingIntensity: '',
  progressiveOverload: '',
  recoveryDays: '',
  injuries: '',
  trainingProgram: '',
  cardioType: '',
  flexibilityWork: '',

  // Nutrition
  meals: '',
  goToMeals: '',
  favoriteFoods: '',
  restrictions: '',
  proteinDistribution: '',
  mealTiming: '',
  prePostWorkoutNutrition: '',
  processedFood: '',
  micronutrients: '',
  supplements: '',
  foodQuality: '',
  mealPattern: ['breakfast', 'lunch', 'dinner'], // Default meals the user eats

  // Behavioral
  motivation: '',
  pastAttempts: '',
  adherencePatterns: '',
  socialEating: '',
  mealPrep: '',
  foodRelationship: '',

  // Goals
  goals: [],
  goalDetails: {},

  // "Anything else?" per step
  extraPersonal: '',
  extraLifestyle: '',
  extraSleep: '',
  extraStress: '',
  extraHydration: '',
  extraTraining: '',
  extraNutrition: '',
  extraBehavioral: '',
  extraGoals: '',
};

function loadDraft(isEditing) {
  // If editing an existing profile, don't load drafts - use the saved profile data
  if (isEditing) return null;

  try {
    const saved = getItem(DRAFT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Check if draft is stale (more than 2 hours old)
      if (parsed.savedAt) {
        const draftAge = Date.now() - new Date(parsed.savedAt).getTime();
        const twoHours = 2 * 60 * 60 * 1000;
        if (draftAge > twoHours) {
          // Clear stale draft
          removeItem(DRAFT_KEY);
          return null;
        }
      }
      return { data: { ...INITIAL_DATA, ...parsed.data }, step: parsed.step || 0, depth: parsed.depth || '' };
    }
  } catch {
    // If draft is corrupted, remove it
    removeItem(DRAFT_KEY);
  }
  return null;
}

const STEP_COMPONENTS = {
  personal: (data, onChange) => <StepPersonal data={data} onChange={onChange} />,
  lifestyle: (data, onChange) => <StepLifestyle data={data} onChange={onChange} />,
  sleep: (data, onChange) => <StepSleep data={data} onChange={onChange} />,
  stress: (data, onChange) => <StepStress data={data} onChange={onChange} />,
  hydration: (data, onChange) => <StepHydration data={data} onChange={onChange} />,
  training: (data, onChange) => <StepTraining data={data} onChange={onChange} />,
  nutrition: (data, onChange) => <StepNutrition data={data} onChange={onChange} />,
  behavioral: (data, onChange) => <StepBehavioral data={data} onChange={onChange} />,
  goals: (data, onChange) => <StepGoals data={data} onChange={onChange} />,
};

export default function Onboarding({ onComplete, initialData, onCancel }) {
  const isEditing = !!initialData;
  const draft = loadDraft(isEditing);

  // Priority: draft (in-progress) > initialData (editing existing profile) > empty
  const [step, setStep] = useState(draft?.step || 0);
  const [data, setData] = useState(draft?.data || (initialData ? { ...INITIAL_DATA, ...initialData } : INITIAL_DATA));
  const [depth, setDepth] = useState(draft?.depth || initialData?.onboardingDepth || '');

  const steps = depth
    ? ALL_STEPS.filter(s => DEPTH_OPTIONS.find(d => d.id === depth).steps.includes(s.id))
    : [];

  // Auto-save on every change (with timestamp for staleness detection)
  const saveDraft = useCallback((newData, newStep, newDepth) => {
    // Don't save drafts when editing existing profile
    if (isEditing) return;
    setItem(DRAFT_KEY, JSON.stringify({
      data: newData,
      step: newStep,
      depth: newDepth,
      savedAt: new Date().toISOString(),
    }));
  }, [isEditing]);

  useEffect(() => {
    saveDraft(data, step, depth);
  }, [data, step, depth, saveDraft]);

  // Save before unload (but not when editing existing profile)
  useEffect(() => {
    if (isEditing) return;
    function handleBeforeUnload() {
      setItem(DRAFT_KEY, JSON.stringify({
        data,
        step,
        depth,
        savedAt: new Date().toISOString(),
      }));
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [data, step, depth, isEditing]);

  function updateData(fields) {
    setData(prev => ({ ...prev, ...fields }));
  }

  function next() {
    if (step < steps.length - 1) {
      setStep(step + 1);
      // Auto-scroll to top on page change
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function back() {
    if (step > 0) {
      setStep(step - 1);
      // Auto-scroll to top on page change
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setDepth('');
    }
  }

  function handleSubmit() {
    removeItem(DRAFT_KEY);
    onComplete({ ...data, onboardingDepth: depth, onboardedAt: new Date().toISOString() });
  }

  // FIX #30: Validate required fields for current step
  function getValidationErrors() {
    const errors = {};
    const currentStepId = steps[step]?.id;

    if (currentStepId === 'personal') {
      if (!data.name?.trim()) errors.name = 'Name is required';
      if (!data.age?.trim()) errors.age = 'Age is required';
      if (!data.weight?.trim()) errors.weight = 'Weight is required';
      if (!data.height?.trim() && !data.heightFeet?.trim()) errors.height = 'Height is required';
    }

    if (currentStepId === 'goals') {
      // FIX #30: goals is an array, check length instead of trim
      if (!data.goals || (Array.isArray(data.goals) ? data.goals.length === 0 : !data.goals.trim())) {
        errors.goals = 'Please select at least one health goal';
      }
    }

    return errors;
  }

  const validationErrors = getValidationErrors();
  const hasErrors = Object.keys(validationErrors).length > 0;

  function handleRecoverData() {
    if (restoreFromBackup()) {
      // Reload the page to pick up recovered data
      window.location.reload();
    }
  }

  // Depth selection screen
  if (!depth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isEditing ? 'Edit Profile' : 'Welcome!'}
            </h1>
            <p className="text-gray-500 mt-2 text-sm sm:text-base">
              {isEditing ? 'Review and update your health profile' : "Let's set up your health profile"}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <DepthSelection
              current={initialData?.onboardingDepth || null}
              onSelect={(id) => { setDepth(id); setStep(0); }}
              onRecover={handleRecoverData}
            />
            {isEditing && onCancel && (
              <button
                onClick={onCancel}
                className="w-full mt-4 py-3 text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            )}

            {/* Dev Mode - Skip onboarding with test profile */}
            {!isEditing && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-400 text-center mb-3">Developer Options</p>
                <button
                  onClick={() => {
                    const testProfile = {
                      name: 'Test User',
                      age: '30',
                      weight: '175',
                      weightUnit: 'lbs',
                      height: '70',
                      heightUnit: 'in',
                      sex: 'male',
                      activityLevel: 'moderate',
                      trainingFrequency: '3-4x',
                      goals: 'General fitness and health',
                      onboardingDepth: 'chill',
                      onboardedAt: new Date().toISOString(),
                    };
                    removeItem(DRAFT_KEY);
                    onComplete(testProfile);
                  }}
                  className="w-full py-2 px-4 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Skip with Test Profile (Dev Mode)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentStep = steps[step];
  const extraKey = `extra${currentStep.id.charAt(0).toUpperCase()}${currentStep.id.slice(1)}`;
  const isLastStep = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50" data-testid="onboarding-form">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {isEditing ? `Edit: ${currentStep.label}` : (step === 0 ? "Let's get to know you" : currentStep.label)}
          </h1>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">
            {isEditing ? 'Review and update your answers' : `Step ${step + 1} of ${steps.length}`}
          </p>
        </div>

        {/* Progress bar and step navigation */}
        <div className="mb-8">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step icons - clickable */}
          <div className="flex justify-between mt-3">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isCurrent = i === step;
              const isCompleted = i < step;
              return (
                <button
                  key={s.id}
                  onClick={() => setStep(i)}
                  className={`flex flex-col items-center gap-1 transition-all px-1.5 py-1 rounded-lg ${
                    isCurrent
                      ? 'text-primary-600 bg-primary-50'
                      : isCompleted
                        ? 'text-primary-500 hover:bg-primary-50'
                        : 'text-gray-300 hover:text-gray-400 hover:bg-gray-50'
                  }`}
                  title={`Go to ${s.label}`}
                >
                  <Icon size={16} />
                  <span className="text-[10px] hidden sm:block">{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick jump dropdown for editing */}
          {isEditing && (
            <div className="mt-3 flex justify-center">
              <select
                value={step}
                onChange={(e) => setStep(Number(e.target.value))}
                className="text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-200"
              >
                {steps.map((s, i) => (
                  <option key={s.id} value={i}>
                    {i + 1}. {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 max-h-[65vh] overflow-y-auto">
          {STEP_COMPONENTS[currentStep.id](data, updateData)}

          {/* "Anything else?" section */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Is there anything else I should know?
            </label>
            <RichTextArea
              value={data[extraKey]}
              onChange={val => updateData({ [extraKey]: val })}
              hint={currentStep.extra}
              minRows={3}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <div className="flex items-center gap-2">
            <button
              onClick={back}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-gray-600 hover:bg-white hover:shadow-sm transition-all"
            >
              <ChevronLeft size={18} /> Back
            </button>
            {isEditing && onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
          {isLastStep ? (
            <button
              onClick={handleSubmit}
              disabled={hasErrors}
              data-testid="onboarding-submit-button"
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium shadow-md transition-all ${
                hasErrors
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:shadow-lg hover:from-primary-600 hover:to-primary-700'
              }`}
            >
              {isEditing ? 'Save Changes' : 'Complete Setup'}
            </button>
          ) : (
            <button
              onClick={next}
              disabled={hasErrors}
              data-testid="onboarding-next-button"
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                hasErrors
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary-500 text-white hover:bg-primary-600'
              }`}
            >
              Next <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
