import { getItem, setItem, removeItem } from './storageHelper';
import { syncBookmarks } from './lib/simpleSync';

const STORAGE_KEY = 'health-advisor-bookmarks';

export function getBookmarks() {
  try {
    const raw = getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    // Backwards compatibility: handle both array and wrapper object formats
    return Array.isArray(data) ? data : (data?.bookmarks || []);
  } catch {
    return [];
  }
}

/**
 * Save bookmarks to storage and sync to Supabase
 * Wraps bookmarks array with updatedAt for sync conflict resolution
 */
function saveBookmarks(bookmarks) {
  // CRITICAL: Wrap with updatedAt for sync conflict resolution
  const dataWithTimestamp = {
    bookmarks,
    updatedAt: new Date().toISOString(),
  };
  setItem(STORAGE_KEY, JSON.stringify(dataWithTimestamp));
  // Sync to Supabase in background (debounced)
  syncBookmarks();
}

export function addBookmark(bookmark) {
  const bookmarks = getBookmarks();
  bookmarks.push(bookmark);
  saveBookmarks(bookmarks);
  return bookmarks;
}

export function removeBookmark(id) {
  const bookmarks = getBookmarks().filter(b => b.id !== id);
  saveBookmarks(bookmarks);
  return bookmarks;
}

/**
 * Update a bookmark's properties (e.g., category)
 * Triggers sync to Supabase
 */
export function updateBookmark(id, updates) {
  const bookmarks = getBookmarks();
  const idx = bookmarks.findIndex(b => b.id === id);
  if (idx === -1) return bookmarks;

  bookmarks[idx] = { ...bookmarks[idx], ...updates };
  saveBookmarks(bookmarks);
  return bookmarks;
}

export function clearBookmarks() {
  removeItem(STORAGE_KEY);
  syncBookmarks();
}
