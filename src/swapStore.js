/**
 * Swap Tracking Store
 * Tracks grocery swaps - healthier product substitutions users make.
 * Integrates with grocery uploads, chat, and playbook.
 */

import { getItem, setItem } from './storageHelper';
import { syncToSupabaseDebounced } from './lib/simpleSync';

const STORAGE_KEY = 'health-advisor-swaps';

// Swap sources
export const SWAP_SOURCES = {
  ADVISOR: 'advisor',           // From AI suggestion
  MANUAL: 'manual',             // User logged via quick entry
  CHAT: 'chat',                 // Mentioned in chat conversation
  GROCERY_DETECTED: 'grocery',  // Detected from grocery upload
};

// Swap status
export const SWAP_STATUS = {
  PENDING: 'pending',     // Considering this swap but hasn't made it yet
  ACTIVE: 'active',       // Still using the new product
  REVERTED: 'reverted',   // Went back to original
  TRIED: 'tried',         // Tested but moved on to something else
};

// Swap categories
export const SWAP_CATEGORIES = {
  CEREAL: 'cereal',
  SNACKS: 'snacks',
  DAIRY: 'dairy',
  PROTEIN: 'protein',
  BEVERAGES: 'beverages',
  BREAD: 'bread',
  CONDIMENTS: 'condiments',
  FROZEN: 'frozen',
  COOKING: 'cooking',
  OTHER: 'other',
};

// Category labels for UI
export const CATEGORY_LABELS = {
  cereal: 'Cereal & Breakfast',
  snacks: 'Snacks',
  dairy: 'Dairy & Alternatives',
  protein: 'Protein',
  beverages: 'Beverages',
  bread: 'Bread & Bakery',
  condiments: 'Condiments & Sauces',
  frozen: 'Frozen Foods',
  cooking: 'Cooking & Oils',
  other: 'Other',
};

/**
 * Get all swap data from localStorage
 */
export function getSwapData() {
  try {
    const saved = getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { swaps: [], stats: {} };
  } catch {
    return { swaps: [], stats: {} };
  }
}

/**
 * Save swap data to localStorage
 */
export function saveSwapData(data) {
  // CRITICAL: Always add updatedAt for sync conflict resolution
  const dataWithTimestamp = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  setItem(STORAGE_KEY, JSON.stringify(dataWithTimestamp));
  syncToSupabaseDebounced(STORAGE_KEY);
}

/**
 * Get all swaps
 */
export function getSwaps() {
  const data = getSwapData();
  return data.swaps || [];
}

/**
 * Get Monday of the week for a given date
 */
function getWeekOf(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Log a new swap
 * @param {Object} swap - Swap details
 * @param {string} swap.status - Optional status (defaults to ACTIVE, can be PENDING for suggestions)
 */
export function logSwap(swap) {
  const data = getSwapData();
  const now = new Date();
  const isPending = swap.status === SWAP_STATUS.PENDING;

  const newSwap = {
    id: `swap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: now.toISOString(),
    date: now.toISOString().split('T')[0],
    weekOf: getWeekOf(now),

    // Swap details
    originalProduct: swap.originalProduct || '',
    newProduct: swap.newProduct || '',
    category: swap.category || SWAP_CATEGORIES.OTHER,

    // Context
    source: swap.source || SWAP_SOURCES.MANUAL,
    reason: swap.reason || '',

    // Tracking
    status: swap.status || SWAP_STATUS.ACTIVE,
    purchaseCount: isPending ? 0 : 1,
    lastPurchased: isPending ? null : now.toISOString(),

    // User feedback
    notes: swap.notes || '',
    rating: null, // 1-5 scale
  };

  // Check for duplicate (same original + new product)
  const existingIndex = data.swaps.findIndex(s =>
    s.originalProduct.toLowerCase() === newSwap.originalProduct.toLowerCase() &&
    s.newProduct.toLowerCase() === newSwap.newProduct.toLowerCase()
  );

  if (existingIndex !== -1) {
    // If adding as pending but exists, don't duplicate
    if (isPending) {
      return data.swaps[existingIndex];
    }
    // Update existing swap instead of creating duplicate
    data.swaps[existingIndex] = {
      ...data.swaps[existingIndex],
      purchaseCount: (data.swaps[existingIndex].purchaseCount || 0) + 1,
      lastPurchased: now.toISOString(),
      status: SWAP_STATUS.ACTIVE, // Reactivate if they bought it again
    };
  } else {
    data.swaps.unshift(newSwap); // Add to beginning (newest first)
  }

  saveSwapData(data);
  return existingIndex !== -1 ? data.swaps[existingIndex] : newSwap;
}

/**
 * Update a swap
 */
export function updateSwap(id, updates) {
  const data = getSwapData();
  const index = data.swaps.findIndex(s => s.id === id);

  if (index !== -1) {
    data.swaps[index] = {
      ...data.swaps[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveSwapData(data);
    return data.swaps[index];
  }
  return null;
}

/**
 * Update swap status
 */
export function updateSwapStatus(id, status, notes = null) {
  const updates = { status };
  if (notes) updates.statusNotes = notes;
  if (status === SWAP_STATUS.REVERTED) {
    updates.revertedAt = new Date().toISOString();
  }
  return updateSwap(id, updates);
}

/**
 * Rate a swap
 */
export function rateSwap(id, rating) {
  return updateSwap(id, { rating: Math.max(1, Math.min(5, rating)) });
}

/**
 * Delete a swap
 */
export function deleteSwap(id) {
  const data = getSwapData();
  data.swaps = data.swaps.filter(s => s.id !== id);
  saveSwapData(data);
}

/**
 * Get active swaps
 */
export function getActiveSwaps() {
  return getSwaps().filter(s => s.status === SWAP_STATUS.ACTIVE);
}

/**
 * Get swaps by status
 */
export function getSwapsByStatus(status) {
  return getSwaps().filter(s => s.status === status);
}

/**
 * Get swaps by category
 */
export function getSwapsByCategory(category) {
  return getSwaps().filter(s => s.category === category);
}

/**
 * Get swaps from this week
 */
export function getSwapsThisWeek() {
  const weekOf = getWeekOf();
  return getSwaps().filter(s => s.weekOf === weekOf);
}

/**
 * Record that a swapped product was purchased again (from grocery upload)
 */
export function recordSwapPurchase(productName) {
  const data = getSwapData();
  const normalizedName = productName.toLowerCase().trim();

  // Find any active swap where the new product matches
  const matchingSwap = data.swaps.find(s =>
    s.status === SWAP_STATUS.ACTIVE &&
    normalizedName.includes(s.newProduct.toLowerCase())
  );

  if (matchingSwap) {
    matchingSwap.purchaseCount = (matchingSwap.purchaseCount || 0) + 1;
    matchingSwap.lastPurchased = new Date().toISOString();
    saveSwapData(data);
    return { type: 'confirmed', swap: matchingSwap };
  }

  // Check if a PENDING swap's new product was purchased (should activate it!)
  const pendingSwap = data.swaps.find(s =>
    s.status === SWAP_STATUS.PENDING &&
    normalizedName.includes(s.newProduct.toLowerCase())
  );

  if (pendingSwap) {
    return { type: 'pending_purchased', swap: pendingSwap };
  }

  // Check if original product reappeared (potential revert)
  const revertedSwap = data.swaps.find(s =>
    s.status === SWAP_STATUS.ACTIVE &&
    normalizedName.includes(s.originalProduct.toLowerCase())
  );

  if (revertedSwap) {
    return { type: 'potential_revert', swap: revertedSwap };
  }

  return null;
}

/**
 * Get pending swaps
 */
export function getPendingSwaps() {
  return getSwaps().filter(s => s.status === SWAP_STATUS.PENDING);
}

/**
 * Activate a pending swap (user made the swap)
 */
export function activatePendingSwap(id) {
  const data = getSwapData();
  const swap = data.swaps.find(s => s.id === id);

  if (swap && swap.status === SWAP_STATUS.PENDING) {
    swap.status = SWAP_STATUS.ACTIVE;
    swap.purchaseCount = 1;
    swap.lastPurchased = new Date().toISOString();
    swap.activatedAt = new Date().toISOString();
    saveSwapData(data);
    return swap;
  }
  return null;
}

/**
 * Get swap statistics
 */
export function getSwapStats() {
  const swaps = getSwaps();
  const pending = swaps.filter(s => s.status === SWAP_STATUS.PENDING);
  const active = swaps.filter(s => s.status === SWAP_STATUS.ACTIVE);
  const reverted = swaps.filter(s => s.status === SWAP_STATUS.REVERTED);
  const tried = swaps.filter(s => s.status === SWAP_STATUS.TRIED);

  // Category breakdown
  const byCategory = {};
  for (const swap of active) {
    byCategory[swap.category] = (byCategory[swap.category] || 0) + 1;
  }

  // Calculate retention rate
  const completedSwaps = swaps.filter(s =>
    s.status !== SWAP_STATUS.ACTIVE || s.purchaseCount > 1
  );
  const retentionRate = completedSwaps.length > 0
    ? (active.filter(s => s.purchaseCount > 1).length / completedSwaps.length) * 100
    : 0;

  // Calculate consistency streak (weeks with active swaps)
  const weeklySwaps = {};
  for (const swap of active) {
    weeklySwaps[swap.weekOf] = true;
  }

  // Average rating
  const ratedSwaps = swaps.filter(s => s.rating);
  const avgRating = ratedSwaps.length > 0
    ? ratedSwaps.reduce((sum, s) => sum + s.rating, 0) / ratedSwaps.length
    : null;

  return {
    total: swaps.length,
    pending: pending.length,
    active: active.length,
    reverted: reverted.length,
    tried: tried.length,
    byCategory,
    retentionRate: Math.round(retentionRate),
    avgRating: avgRating ? avgRating.toFixed(1) : null,
    topCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
  };
}

/**
 * Get swap-related wins for weekly wins integration
 */
export function getSwapWins() {
  const wins = [];
  const stats = getSwapStats();
  const active = getActiveSwaps();

  // Win: Multiple active swaps
  if (stats.active >= 3) {
    wins.push({
      type: 'swap_count',
      text: `Maintaining ${stats.active} healthy swaps`,
      icon: 'swap',
      priority: 2,
      link: { view: 'nutrition', section: 'swaps' },
    });
  } else if (stats.active >= 1) {
    wins.push({
      type: 'swap_active',
      text: `${stats.active} active swap${stats.active > 1 ? 's' : ''} going strong`,
      icon: 'swap',
      priority: 3,
      link: { view: 'nutrition', section: 'swaps' },
    });
  }

  // Win: High retention rate
  if (stats.retentionRate >= 75 && stats.total >= 3) {
    wins.push({
      type: 'swap_retention',
      text: `${stats.retentionRate}% of your swaps are sticking`,
      icon: 'trending',
      priority: 2,
      link: { view: 'nutrition', section: 'swaps' },
    });
  }

  // Win: Long-running swaps (purchased 3+ times)
  const loyalSwaps = active.filter(s => s.purchaseCount >= 3);
  if (loyalSwaps.length >= 1) {
    wins.push({
      type: 'swap_loyalty',
      text: `${loyalSwaps.length} swap${loyalSwaps.length > 1 ? 's' : ''} maintained for 3+ purchases`,
      icon: 'check',
      priority: 2,
      link: { view: 'nutrition', section: 'swaps' },
    });
  }

  // Win: New swap this week
  const thisWeek = getSwapsThisWeek();
  if (thisWeek.length > 0) {
    wins.push({
      type: 'swap_new',
      text: `Made ${thisWeek.length} new swap${thisWeek.length > 1 ? 's' : ''} this week`,
      icon: 'plus',
      priority: 3,
      link: { view: 'nutrition', section: 'swaps' },
    });
  }

  return wins;
}

/**
 * Detect category from product name
 */
export function detectCategory(productName) {
  const name = productName.toLowerCase();

  const patterns = {
    [SWAP_CATEGORIES.CEREAL]: ['cereal', 'oatmeal', 'granola', 'muesli', 'cheerios', 'flakes', 'krispies', 'chex'],
    [SWAP_CATEGORIES.SNACKS]: ['chips', 'crackers', 'cookies', 'bars', 'popcorn', 'pretzels', 'nuts', 'trail mix', 'snack'],
    [SWAP_CATEGORIES.DAIRY]: ['milk', 'yogurt', 'cheese', 'butter', 'cream', 'oat milk', 'almond milk', 'cottage'],
    [SWAP_CATEGORIES.PROTEIN]: ['chicken', 'beef', 'fish', 'salmon', 'tuna', 'turkey', 'pork', 'eggs', 'tofu', 'tempeh', 'protein'],
    [SWAP_CATEGORIES.BEVERAGES]: ['soda', 'juice', 'water', 'coffee', 'tea', 'drink', 'cola', 'sprite', 'energy'],
    [SWAP_CATEGORIES.BREAD]: ['bread', 'bagel', 'muffin', 'tortilla', 'wrap', 'bun', 'roll', 'toast'],
    [SWAP_CATEGORIES.CONDIMENTS]: ['sauce', 'ketchup', 'mustard', 'mayo', 'dressing', 'salsa', 'syrup', 'jam'],
    [SWAP_CATEGORIES.FROZEN]: ['frozen', 'ice cream', 'pizza', 'nuggets', 'fries', 'meal'],
    [SWAP_CATEGORIES.COOKING]: ['oil', 'olive', 'coconut', 'avocado oil', 'cooking spray', 'butter'],
  };

  for (const [category, keywords] of Object.entries(patterns)) {
    if (keywords.some(kw => name.includes(kw))) {
      return category;
    }
  }

  return SWAP_CATEGORIES.OTHER;
}

/**
 * Parse a swap from natural language
 * e.g., "switched from Cheerios to Catalina Crunch for more protein"
 */
export function parseSwapFromText(text) {
  const lowerText = text.toLowerCase();

  // Pattern: "switched from X to Y"
  let match = lowerText.match(/switch(?:ed)?\s+(?:from\s+)?(.+?)\s+to\s+(.+?)(?:\s+(?:for|because|since)\s+(.+))?$/i);
  if (match) {
    return {
      originalProduct: match[1].trim(),
      newProduct: match[2].replace(/\s+(for|because|since).*$/i, '').trim(),
      reason: match[3]?.trim() || '',
    };
  }

  // Pattern: "swapped X for Y"
  match = lowerText.match(/swap(?:ped)?\s+(.+?)\s+(?:for|with)\s+(.+?)(?:\s+(?:because|since)\s+(.+))?$/i);
  if (match) {
    return {
      originalProduct: match[1].trim(),
      newProduct: match[2].replace(/\s+(because|since).*$/i, '').trim(),
      reason: match[3]?.trim() || '',
    };
  }

  // Pattern: "replaced X with Y"
  match = lowerText.match(/replac(?:ed|ing)?\s+(.+?)\s+with\s+(.+?)(?:\s+(?:for|because|since)\s+(.+))?$/i);
  if (match) {
    return {
      originalProduct: match[1].trim(),
      newProduct: match[2].replace(/\s+(for|because|since).*$/i, '').trim(),
      reason: match[3]?.trim() || '',
    };
  }

  // Pattern: "now buying X instead of Y"
  match = lowerText.match(/(?:now\s+)?buy(?:ing)?\s+(.+?)\s+instead\s+of\s+(.+?)(?:\s+(?:for|because|since)\s+(.+))?$/i);
  if (match) {
    return {
      originalProduct: match[2].trim(),
      newProduct: match[1].replace(/\s+(instead).*$/i, '').trim(),
      reason: match[3]?.trim() || '',
    };
  }

  return null;
}

/**
 * Get swaps formatted for display
 */
export function getSwapsForDisplay(filter = 'all', categoryFilter = null) {
  let swaps = getSwaps();

  // Apply status filter
  if (filter !== 'all') {
    swaps = swaps.filter(s => s.status === filter);
  }

  // Apply category filter
  if (categoryFilter) {
    swaps = swaps.filter(s => s.category === categoryFilter);
  }

  return swaps;
}

/**
 * Get categories that have swaps
 */
export function getUsedCategories() {
  const swaps = getSwaps();
  const categories = new Set(swaps.map(s => s.category));
  return Array.from(categories);
}
