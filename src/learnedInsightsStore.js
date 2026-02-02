/**
 * Learned Insights Store
 * Stores information the Advisor has learned about the user from conversations.
 * Each insight links back to the source message.
 */

import { getItem, setItem } from './storageHelper';
import { syncInsights } from './lib/simpleSync';

const STORAGE_KEY = 'health-advisor-learned-insights';

// Insight categories
export const INSIGHT_CATEGORIES = {
  HEALTH: 'health',
  LIFESTYLE: 'lifestyle',
  PREFERENCE: 'preference',
  CONTEXT: 'context',
};

export const CATEGORY_LABELS = {
  [INSIGHT_CATEGORIES.HEALTH]: 'Health & Medical',
  [INSIGHT_CATEGORIES.LIFESTYLE]: 'Lifestyle',
  [INSIGHT_CATEGORIES.PREFERENCE]: 'Preferences',
  [INSIGHT_CATEGORIES.CONTEXT]: 'Context',
};

export const CATEGORY_COLORS = {
  [INSIGHT_CATEGORIES.HEALTH]: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  [INSIGHT_CATEGORIES.LIFESTYLE]: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  [INSIGHT_CATEGORIES.PREFERENCE]: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  [INSIGHT_CATEGORIES.CONTEXT]: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

/**
 * Get all learned insights
 * @returns {Array} Array of insight objects
 */
export function getLearnedInsights() {
  try {
    const data = getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save insights to storage and sync to Supabase
 */
function saveInsights(insights) {
  setItem(STORAGE_KEY, JSON.stringify(insights));
  // Sync to Supabase in background (debounced)
  syncInsights();
}

/**
 * Add a new learned insight
 * @param {Object} insight - The insight to add
 * @param {string} insight.text - The insight text (e.g., "On allergy shot routine")
 * @param {string} insight.category - One of INSIGHT_CATEGORIES
 * @param {string} insight.chatId - ID of the chat where this was mentioned
 * @param {number} insight.messageIndex - Index of the message in the chat
 * @param {string} insight.originalText - The original user message that triggered this
 * @param {string} insight.confidence - 'explicit' or 'inferred'
 * @returns {Object} The created insight with ID
 */
export function addLearnedInsight(insight) {
  const insights = getLearnedInsights();

  // Check for duplicates (similar text in same category)
  const isDuplicate = insights.some(existing =>
    existing.category === insight.category &&
    existing.text.toLowerCase() === insight.text.toLowerCase()
  );

  if (isDuplicate) {
    return null;
  }

  const newInsight = {
    id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text: insight.text,
    category: insight.category || INSIGHT_CATEGORIES.CONTEXT,
    chatId: insight.chatId,
    messageIndex: insight.messageIndex,
    originalText: insight.originalText,
    confidence: insight.confidence || 'explicit',
    dateAdded: new Date().toISOString(),
  };

  insights.unshift(newInsight);
  saveInsights(insights);

  return newInsight;
}

/**
 * Update an existing insight
 * @param {string} id - Insight ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated insight or null if not found
 */
export function updateLearnedInsight(id, updates) {
  const insights = getLearnedInsights();
  const index = insights.findIndex(i => i.id === id);

  if (index === -1) return null;

  insights[index] = {
    ...insights[index],
    ...updates,
    dateModified: new Date().toISOString(),
  };

  saveInsights(insights);
  return insights[index];
}

/**
 * Delete an insight
 * @param {string} id - Insight ID
 * @returns {boolean} Whether deletion was successful
 */
export function deleteLearnedInsight(id) {
  const insights = getLearnedInsights();
  const filtered = insights.filter(i => i.id !== id);

  if (filtered.length === insights.length) return false;

  saveInsights(filtered);
  // saveInsights already syncs to Supabase (full array replaces old)
  return true;
}

/**
 * Get insights grouped by category
 * @returns {Object} Insights grouped by category
 */
export function getInsightsByCategory() {
  const insights = getLearnedInsights();
  const grouped = {
    [INSIGHT_CATEGORIES.HEALTH]: [],
    [INSIGHT_CATEGORIES.LIFESTYLE]: [],
    [INSIGHT_CATEGORIES.PREFERENCE]: [],
    [INSIGHT_CATEGORIES.CONTEXT]: [],
  };

  for (const insight of insights) {
    if (grouped[insight.category]) {
      grouped[insight.category].push(insight);
    } else {
      grouped[INSIGHT_CATEGORIES.CONTEXT].push(insight);
    }
  }

  return grouped;
}

/**
 * Get insights formatted for Advisor context
 * @returns {string} Formatted string of insights for AI context
 */
export function getInsightsForContext() {
  const grouped = getInsightsByCategory();
  const sections = [];

  for (const [category, insights] of Object.entries(grouped)) {
    if (insights.length === 0) continue;

    const label = CATEGORY_LABELS[category];
    const items = insights.map(i => `- ${i.text}`).join('\n');
    sections.push(`${label}:\n${items}`);
  }

  if (sections.length === 0) return '';

  return `What I've learned about the user:\n${sections.join('\n\n')}`;
}

/**
 * Clear all insights (use with caution)
 */
export function clearLearnedInsights() {
  saveInsights([]);
}

/**
 * Get insight count
 * @returns {number} Total number of insights
 */
export function getInsightCount() {
  return getLearnedInsights().length;
}
