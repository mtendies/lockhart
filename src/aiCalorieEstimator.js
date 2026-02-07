/**
 * AI-Powered Calorie Estimator
 *
 * Calls the Anthropic API to parse meal descriptions into calorie breakdowns.
 * Falls back to the rule-based estimator when offline or on API failure.
 * Caches results in memory so the same meal text doesn't re-call the API.
 * Includes recent grocery context for smarter assumptions.
 */

import { estimateCalories as estimateCaloriesRuleBased } from './calorieEstimator';
import { getRecentOrders } from './groceryStore';

// In-memory cache: normalized text → estimate result
const cache = new Map();

// Normalize text for cache keys (lowercase, collapse whitespace, trim)
function normalizeText(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Convert AI response format to the format expected by CaloriePopup.
 *
 * AI returns:  { name, quantity, unit, caloriesPerUnit, totalCalories, confidence }
 * App expects: { food, calories, quantity, unit, calculation, source, sourceUrl,
 *                baseServing, itemConfidence, confidenceNote }
 */
/**
 * Get recent grocery items for context (last 2 weeks).
 * Returns array of unique item names.
 */
function getRecentGroceryItems() {
  try {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const orders = getRecentOrders(20); // Get plenty of orders
    const recentItems = [];

    for (const order of orders) {
      if (new Date(order.date) >= twoWeeksAgo) {
        recentItems.push(...(order.items || []));
      }
    }

    // Dedupe and return (limit to 50 items to keep prompt reasonable)
    return [...new Set(recentItems)].slice(0, 50);
  } catch (err) {
    console.warn('[AICalorie] Failed to get grocery context:', err.message);
    return [];
  }
}

function transformAIResponse(aiResult) {
  const items = (aiResult.items || []).map(item => {
    const calPerUnit = item.caloriesPerUnit || Math.round(item.totalCalories / (item.quantity || 1));
    const totalCal = item.totalCalories || Math.round(calPerUnit * (item.quantity || 1));

    // Build confidence note based on confidence level
    let confidenceNote = null;
    if (item.confidence === 'medium') {
      confidenceNote = 'Portion size estimated — adjust if needed';
    } else if (item.confidence === 'low') {
      confidenceNote = 'Rough estimate — could vary significantly';
    }

    return {
      food: item.name,
      calories: totalCal,
      quantity: item.quantity || 1,
      unit: item.unit || 'serving',
      calculation: `${item.quantity || 1} ${item.unit || 'serving'} × ${calPerUnit} cal/${item.unit || 'serving'}`,
      source: 'AI estimate (Claude)',
      sourceUrl: null,
      baseServing: `1 ${item.unit || 'serving'}`,
      itemConfidence: item.confidence || 'medium',
      confidenceNote,
    };
  });

  // Determine overall confidence from item confidences
  const confidenceLevels = items.map(i => i.itemConfidence);
  let overallConfidence = 'high';
  if (confidenceLevels.includes('low')) {
    overallConfidence = 'low';
  } else if (confidenceLevels.includes('medium')) {
    overallConfidence = 'medium';
  }

  return {
    totalCalories: aiResult.totalCalories || items.reduce((sum, i) => sum + i.calories, 0),
    items,
    tips: aiResult.notes ? [aiResult.notes] : [],
    confidence: overallConfidence,
    matchedFoods: items.length,
    isAI: true,
    // Clarification fields (if AI needs user input)
    needsClarification: aiResult.needsClarification || false,
    clarificationQuestion: aiResult.clarificationQuestion || null,
    clarificationOptions: aiResult.clarificationOptions || null,
  };
}

/**
 * Get a calorie estimate using AI, with rule-based fallback.
 *
 * @param {string} text - Meal description
 * @returns {Promise<{ estimate: object, isAI: boolean }>}
 */
export async function estimateCaloriesAI(text) {
  if (!text || !text.trim()) {
    return { estimate: { totalCalories: 0, items: [], tips: [], confidence: 'low', matchedFoods: 0 }, isAI: false };
  }

  const key = normalizeText(text);

  // Check cache first
  if (cache.has(key)) {
    return { estimate: cache.get(key), isAI: cache.get(key).isAI !== false };
  }

  try {
    // Get recent grocery items for context
    const recentGroceries = getRecentGroceryItems();

    const res = await fetch('/api/estimate-calories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.trim(),
        recentGroceries: recentGroceries.length > 0 ? recentGroceries : undefined,
      }),
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const aiResult = await res.json();

    if (aiResult.error) {
      throw new Error(aiResult.error);
    }

    const estimate = transformAIResponse(aiResult);
    cache.set(key, estimate);
    return { estimate, isAI: true };

  } catch (err) {
    console.warn('[AICalorie] AI estimation failed, using rule-based fallback:', err.message);

    // Fall back to rule-based
    const fallback = estimateCaloriesRuleBased(text);
    fallback.isAI = false;
    // Don't cache fallback results — retry AI next time
    return { estimate: fallback, isAI: false };
  }
}

/**
 * Get cached AI estimate if available, otherwise use rule-based.
 * Synchronous — for use in daily total calculations.
 *
 * @param {string} text - Meal description
 * @returns {object} - Calorie estimate
 */
export function getCachedOrRuleBased(text) {
  if (!text || !text.trim()) {
    return { totalCalories: 0, items: [], tips: [], confidence: 'low', matchedFoods: 0 };
  }

  const key = normalizeText(text);

  // Use cached AI result if available
  if (cache.has(key)) {
    return cache.get(key);
  }

  // Fall back to rule-based
  return estimateCaloriesRuleBased(text);
}

/**
 * Clear the cache (for testing or profile switches).
 */
export function clearCalorieCache() {
  cache.clear();
}
