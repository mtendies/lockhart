/**
 * Learned Insight Parser
 * Parses [[LEARNED_INSIGHT]] blocks from Advisor responses
 */

import { INSIGHT_CATEGORIES } from './learnedInsightsStore';

/**
 * Parse learned insights from text
 * Format: [[LEARNED_INSIGHT]]
 * text: What was learned
 * category: health|lifestyle|preference|context
 * confidence: explicit|inferred
 * [[/LEARNED_INSIGHT]]
 *
 * @param {string} text - Response text containing potential insight blocks
 * @returns {Object} { cleanText: string, insights: Array }
 */
export function parseLearnedInsights(text) {
  if (!text) return { cleanText: '', insights: [] };

  const insights = [];
  const insightRegex = /\[\[LEARNED_INSIGHT\]\]([\s\S]*?)\[\[\/LEARNED_INSIGHT\]\]/gi;

  let cleanText = text;
  let match;

  while ((match = insightRegex.exec(text)) !== null) {
    const blockContent = match[1].trim();
    const insight = parseInsightBlock(blockContent);

    if (insight) {
      insights.push(insight);
    }
  }

  // Remove insight blocks from text
  cleanText = cleanText.replace(insightRegex, '').trim();

  // Clean up any extra whitespace
  cleanText = cleanText.replace(/\n{3,}/g, '\n\n');

  return { cleanText, insights };
}

/**
 * Parse a single insight block content
 * @param {string} content - The content inside the LEARNED_INSIGHT block
 * @returns {Object|null} Parsed insight or null if invalid
 */
function parseInsightBlock(content) {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const insight = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();

    switch (key) {
      case 'text':
        insight.text = value;
        break;
      case 'category':
        insight.category = normalizeCategory(value);
        break;
      case 'confidence':
        insight.confidence = value.toLowerCase() === 'inferred' ? 'inferred' : 'explicit';
        break;
    }
  }

  // Validate required fields
  if (!insight.text) return null;

  // Set defaults
  if (!insight.category) {
    insight.category = INSIGHT_CATEGORIES.CONTEXT;
  }
  if (!insight.confidence) {
    insight.confidence = 'explicit';
  }

  return insight;
}

/**
 * Normalize category string to valid category
 * @param {string} category - Category string from AI
 * @returns {string} Valid category constant
 */
function normalizeCategory(category) {
  const normalized = category.toLowerCase().trim();

  const mappings = {
    'health': INSIGHT_CATEGORIES.HEALTH,
    'health & medical': INSIGHT_CATEGORIES.HEALTH,
    'medical': INSIGHT_CATEGORIES.HEALTH,
    'lifestyle': INSIGHT_CATEGORIES.LIFESTYLE,
    'preference': INSIGHT_CATEGORIES.PREFERENCE,
    'preferences': INSIGHT_CATEGORIES.PREFERENCE,
    'context': INSIGHT_CATEGORIES.CONTEXT,
    'circumstances': INSIGHT_CATEGORIES.CONTEXT,
  };

  return mappings[normalized] || INSIGHT_CATEGORIES.CONTEXT;
}

/**
 * Strip insight blocks from text (for display)
 * @param {string} text - Text with potential insight blocks
 * @returns {string} Text without insight blocks
 */
export function stripInsightBlocks(text) {
  if (!text) return '';
  return text
    .replace(/\[\[LEARNED_INSIGHT\]\][\s\S]*?\[\[\/LEARNED_INSIGHT\]\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
