import { getItem, setItem, removeItem } from './storageHelper';
import { syncGrocery } from './lib/simpleSync';

const STORAGE_KEY = 'health-advisor-groceries';

export function getGroceryData() {
  try {
    const raw = getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {
      orders: [],
      allItems: [],
      lastAnalyzed: null,
      patterns: null,
      recommendations: null,
      habitsFormed: [], // Track healthy habits user has built
      wins: [], // Recent positive achievements
    };
  } catch {
    return {
      orders: [],
      allItems: [],
      lastAnalyzed: null,
      patterns: null,
      recommendations: null,
      habitsFormed: [],
      wins: [],
    };
  }
}

export function saveGroceryData(data) {
  setItem(STORAGE_KEY, JSON.stringify(data));
  // Sync to Supabase in background (debounced)
  syncGrocery();
}

export function addGroceryOrder(order) {
  const data = getGroceryData();
  const newOrder = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    date: new Date().toISOString(),
    source: order.source || 'unknown',
    items: order.items || [],
    itemCount: order.items?.length || 0,
  };
  data.orders.unshift(newOrder);

  // Update allItems with frequency tracking
  for (const item of newOrder.items) {
    const normalized = normalizeItemName(item);
    const existing = data.allItems.find(i => i.normalized === normalized);
    if (existing) {
      existing.count += 1;
      existing.lastPurchased = newOrder.date;
    } else {
      data.allItems.push({
        name: item,
        normalized,
        count: 1,
        category: null, // Will be set during analysis
        lastPurchased: newOrder.date,
      });
    }
  }

  saveGroceryData(data);
  return data;
}

export function updatePatterns(patterns) {
  const data = getGroceryData();
  data.patterns = patterns;
  data.lastAnalyzed = new Date().toISOString();
  saveGroceryData(data);
  return data;
}

export function updateRecommendations(recommendations) {
  const data = getGroceryData();
  data.recommendations = recommendations;
  saveGroceryData(data);
  return data;
}

export function getFrequentItems(limit = 10) {
  const data = getGroceryData();
  return data.allItems
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getRecentOrders(limit = 10) {
  const data = getGroceryData();
  return data.orders.slice(0, limit);
}

export function clearGroceryData() {
  removeItem(STORAGE_KEY);
}

// Normalize item names for comparison
function normalizeItemName(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatOrderDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Add a habit that has been formed (user consistently does something healthy)
export function addHabitFormed(habit) {
  const data = getGroceryData();
  if (!data.habitsFormed) data.habitsFormed = [];

  const newHabit = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    text: habit.text,
    category: habit.category || 'nutrition',
    formedDate: new Date().toISOString(),
    relatedItems: habit.relatedItems || [],
  };

  // Avoid duplicates
  const exists = data.habitsFormed.some(h =>
    h.text.toLowerCase() === newHabit.text.toLowerCase()
  );
  if (!exists) {
    data.habitsFormed.push(newHabit);
    saveGroceryData(data);
  }
  return data;
}

// Add a win/achievement
export function addWin(win) {
  const data = getGroceryData();
  if (!data.wins) data.wins = [];

  const newWin = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    text: win.text,
    category: win.category || 'nutrition',
    date: new Date().toISOString(),
    details: win.details || null,
  };

  data.wins.unshift(newWin);
  // Keep only recent wins (last 20)
  data.wins = data.wins.slice(0, 20);
  saveGroceryData(data);
  return data;
}

// Get habits formed
export function getHabitsFormed() {
  const data = getGroceryData();
  return data.habitsFormed || [];
}

// Get recent wins
export function getWins(limit = 10) {
  const data = getGroceryData();
  return (data.wins || []).slice(0, limit);
}

// Update habits and wins from analysis
export function updateHabitsAndWins(habitsFormed, wins) {
  const data = getGroceryData();

  if (habitsFormed && habitsFormed.length > 0) {
    if (!data.habitsFormed) data.habitsFormed = [];
    for (const habit of habitsFormed) {
      const exists = data.habitsFormed.some(h =>
        h.text.toLowerCase() === habit.text.toLowerCase()
      );
      if (!exists) {
        data.habitsFormed.push({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          ...habit,
          formedDate: new Date().toISOString(),
        });
      }
    }
  }

  if (wins && wins.length > 0) {
    if (!data.wins) data.wins = [];
    for (const win of wins) {
      data.wins.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        ...win,
        date: new Date().toISOString(),
      });
    }
    data.wins = data.wins.slice(0, 20);
  }

  saveGroceryData(data);
  return data;
}
