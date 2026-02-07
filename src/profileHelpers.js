/**
 * Profile Helpers
 * Safe utility functions for working with user profile data,
 * especially for handling goals which can be array, string, object, or undefined.
 */

/**
 * Safely check if the user has a specific goal keyword.
 * Handles cases where goals is an array, string, object, or undefined.
 *
 * @param {any} goals - The goals field from the profile (can be any type)
 * @param {string} keyword - The keyword to search for (case-insensitive)
 * @returns {boolean} - True if the goal keyword is found
 */
export function hasGoal(goals, keyword) {
  if (!goals || !keyword) return false;

  const lowerKeyword = keyword.toLowerCase();

  // Handle array of goals
  if (Array.isArray(goals)) {
    return goals.some(g => {
      if (typeof g === 'string') {
        return g.toLowerCase().includes(lowerKeyword);
      }
      if (typeof g === 'object' && g !== null) {
        // Handle objects like { name: "Build muscle" }
        return Object.values(g).some(v =>
          typeof v === 'string' && v.toLowerCase().includes(lowerKeyword)
        );
      }
      return false;
    });
  }

  // Handle string goal
  if (typeof goals === 'string') {
    return goals.toLowerCase().includes(lowerKeyword);
  }

  // Handle object goal (e.g., { primary: "Build muscle" })
  if (typeof goals === 'object') {
    return Object.values(goals).some(v => {
      if (typeof v === 'string') {
        return v.toLowerCase().includes(lowerKeyword);
      }
      if (Array.isArray(v)) {
        return v.some(item =>
          typeof item === 'string' && item.toLowerCase().includes(lowerKeyword)
        );
      }
      return false;
    });
  }

  return false;
}

/**
 * Safely get goals as an array.
 * Converts string or object to array format.
 *
 * @param {any} goals - The goals field from the profile
 * @returns {string[]} - Array of goal strings
 */
export function getGoalsArray(goals) {
  if (!goals) return [];

  if (Array.isArray(goals)) {
    return goals.filter(g => typeof g === 'string');
  }

  if (typeof goals === 'string') {
    return [goals];
  }

  if (typeof goals === 'object') {
    // Extract string values from object
    const extracted = [];
    for (const value of Object.values(goals)) {
      if (typeof value === 'string') {
        extracted.push(value);
      } else if (Array.isArray(value)) {
        extracted.push(...value.filter(v => typeof v === 'string'));
      }
    }
    return extracted;
  }

  return [];
}

/**
 * Safely join goals into a string for display.
 *
 * @param {any} goals - The goals field from the profile
 * @param {string} separator - The separator to use (default: ', ')
 * @returns {string} - Joined goals string
 */
export function joinGoals(goals, separator = ', ') {
  return getGoalsArray(goals).join(separator);
}

/**
 * Check if goals has a specific goal by exact match or includes check.
 * More specific than hasGoal - checks for exact goal key matches.
 *
 * @param {any} goals - The goals field from the profile
 * @param {string[]} goalKeys - Array of goal keys to check for
 * @returns {boolean} - True if any goal key is found
 */
export function hasAnyGoalKey(goals, goalKeys) {
  const goalsArray = getGoalsArray(goals);
  return goalKeys.some(key => goalsArray.includes(key));
}

/**
 * Check for fat loss related goals
 */
export function hasLoseFatGoal(goals) {
  return hasAnyGoalKey(goals, ['fat_loss', 'lose_fat', 'loseFat', 'weightLoss', 'weight_loss']) ||
    hasGoal(goals, 'loss') ||
    hasGoal(goals, 'fat');
}

/**
 * Check for muscle building related goals
 */
export function hasBuildMuscleGoal(goals) {
  return hasAnyGoalKey(goals, ['build_muscle', 'buildMuscle', 'muscle_gain', 'muscleGain']) ||
    hasGoal(goals, 'muscle') ||
    hasGoal(goals, 'gain');
}
