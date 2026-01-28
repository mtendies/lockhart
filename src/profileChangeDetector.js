// Detect meaningful changes between old and new profile

// Fields that are relevant for playbook updates
const TRACKED_FIELDS = [
  'supplements',
  'sleepSchedule',
  'bedtime',
  'wakeTime',
  'sleepQuality',
  'sleepIssues',
  'trainingFrequency',
  'workoutTypes',
  'trainingAge',
  'currentRoutine',
  'goals',
  'goalDetails',
  'dietaryApproach',
  'dietaryRestrictions',
  'mealTiming',
  'nutritionChallenges',
  'waterIntake',
  'hydrationStrategy',
  'stressLevel',
  'stressManagement',
  'energyPatterns',
  'healthConditions',
  'injuries',
  'medications',
];

export function detectProfileChanges(oldProfile, newProfile) {
  if (!oldProfile || !newProfile) return [];

  const changedFields = [];

  for (const field of TRACKED_FIELDS) {
    const oldValue = oldProfile[field];
    const newValue = newProfile[field];

    // Skip if both are empty/undefined
    if (isEmpty(oldValue) && isEmpty(newValue)) continue;

    // Check if values are different
    if (!deepEqual(oldValue, newValue)) {
      changedFields.push(field);
    }
  }

  return changedFields;
}

function isEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  return false;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (isEmpty(a) && isEmpty(b)) return true;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  if (typeof a === 'object' && a !== null && b !== null) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => deepEqual(a[key], b[key]));
  }

  return false;
}

// Analyze profile change and get playbook suggestion
export async function analyzeProfileChange(oldProfile, newProfile, playbook, pendingSuggestions = []) {
  const changedFields = detectProfileChanges(oldProfile, newProfile);

  console.log('=== Profile Change Detection ===');
  console.log('Changed fields detected:', changedFields);

  if (changedFields.length === 0) {
    console.log('No changes detected - returning null');
    return null;
  }

  console.log('Calling /api/analyze-profile-change with:', { changedFields, pendingSuggestions: pendingSuggestions.length });

  try {
    const res = await fetch('/api/analyze-profile-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oldProfile,
        newProfile,
        playbook,
        changedFields,
        pendingSuggestions,
      }),
    });

    if (!res.ok) {
      console.error('Failed to analyze profile change');
      return null;
    }

    const data = await res.json();
    // Return the full result object which may include:
    // - suggestion: new suggestion to add
    // - dismissSuggestionIds: IDs of pending suggestions to dismiss
    // - resolved: boolean indicating issue was resolved
    // - message: acknowledgment message
    return data;
  } catch (err) {
    console.error('Error analyzing profile change:', err);
    return null;
  }
}
