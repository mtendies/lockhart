import { getItem, setItem } from './storageHelper';

const STORAGE_KEY = 'health-advisor-tracking';

export function getEntries() {
  try {
    const raw = getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addEntry(entry) {
  const entries = getEntries();
  entries.push({ ...entry, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), date: new Date().toISOString() });
  setItem(STORAGE_KEY, JSON.stringify(entries));
  return entries;
}

export function removeEntry(id) {
  const entries = getEntries().filter(e => e.id !== id);
  setItem(STORAGE_KEY, JSON.stringify(entries));
  return entries;
}

export function getEntriesByDateRange(startDate, endDate) {
  return getEntries().filter(e => {
    const d = new Date(e.date);
    return d >= startDate && d <= endDate;
  });
}

export function getRecentEntries(days = 7) {
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return getEntries().filter(e => new Date(e.date) >= start).sort((a, b) => new Date(b.date) - new Date(a.date));
}
