import { getItem, setItem, removeItem } from './storageHelper';

const STORAGE_KEY = 'health-advisor-bookmarks';

export function getBookmarks() {
  try {
    const raw = getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addBookmark(bookmark) {
  const bookmarks = getBookmarks();
  bookmarks.push(bookmark);
  setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  return bookmarks;
}

export function removeBookmark(id) {
  const bookmarks = getBookmarks().filter(b => b.id !== id);
  setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  return bookmarks;
}

export function clearBookmarks() {
  removeItem(STORAGE_KEY);
}
