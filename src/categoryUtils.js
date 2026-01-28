export const CATEGORIES = ['fitness', 'nutrition', 'recovery', 'goals', 'general'];

// Category colors matching multiChatStore
export const CATEGORY_COLORS = {
  fitness: { color: '#3b82f6', bgColor: '#dbeafe', label: 'Fitness' },      // Blue
  nutrition: { color: '#f59e0b', bgColor: '#fef3c7', label: 'Nutrition' },  // Amber
  recovery: { color: '#a855f7', bgColor: '#f3e8ff', label: 'Recovery' },    // Purple
  goals: { color: '#22c55e', bgColor: '#dcfce7', label: 'Goals' },          // Green
  general: { color: '#6b7280', bgColor: '#f3f4f6', label: 'General' },      // Gray
};

const KEYWORDS = {
  // Recovery includes sleep, rest, stress management
  recovery: ['sleep', 'slept', 'nap', 'rest', 'recovery', 'recover', 'off day', 'rest day', 'tired', 'fatigue', 'sore', 'soreness', 'insomnia', 'bedtime', 'wake', 'circadian', 'melatonin', 'dream', 'pillow', 'mattress', 'stress', 'anxiety', 'relax', 'meditation', 'mindful', 'breathe', 'breathing', 'calm', 'mental', 'stretch', 'mobility', 'foam roll', 'massage', 'injury', 'pain'],
  // Fitness is workouts and exercise
  fitness: ['exercise', 'workout', 'training', 'run', 'ran', 'running', 'lift', 'lifting', 'cardio', 'strength', 'muscle', 'rep', 'set', 'squat', 'push-up', 'pull-up', 'plank', 'endurance', 'hiit', 'gym', 'weights', 'dumbbell', 'barbell', 'resistance', 'bench', 'deadlift', 'mile', 'jog', 'swim', 'cycling', 'bike'],
  // Nutrition is food and diet
  nutrition: ['eat', 'ate', 'food', 'meal', 'calorie', 'protein', 'carb', 'fat', 'fiber', 'vitamin', 'nutrient', 'diet', 'nutrition', 'snack', 'breakfast', 'lunch', 'dinner', 'supplement', 'macro', 'vegetable', 'fruit', 'sugar', 'sodium', 'water', 'hydrat', 'drink', 'fluid', 'electrolyte', 'grocery', 'recipe'],
  // Goals and planning
  goals: ['goal', 'target', 'plan', 'focus', 'progress', 'track', 'improve', 'achieve', 'strategy', 'playbook', 'week'],
};

export function assignCategory(text) {
  const lower = text.toLowerCase();

  // Priority check: Sleep-related content should always be Recovery
  const sleepKeywords = ['sleep', 'slept', 'nap', 'rest day', 'off day', 'tired', 'fatigue', 'insomnia', 'bedtime'];
  if (sleepKeywords.some(kw => lower.includes(kw))) {
    return 'recovery';
  }

  let bestCategory = 'general';
  let bestCount = 0;

  for (const [category, keywords] of Object.entries(KEYWORDS)) {
    let count = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      bestCategory = category;
    }
  }

  return bestCategory;
}
