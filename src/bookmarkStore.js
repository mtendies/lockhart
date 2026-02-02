import { getItem, setItem, removeItem } from './storageHelper';
import { syncBookmarks } from './lib/simpleSync';

const STORAGE_KEY = 'health-advisor-bookmarks';

export function getBookmarks() {
  try {
    const raw = getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks) {
  setItem(STORAGE_KEY, JSON.stringify(bookmarks));
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

export function clearBookmarks() {
  removeItem(STORAGE_KEY);
  syncBookmarks();
}
