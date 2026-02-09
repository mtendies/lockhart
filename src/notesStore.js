import { getItem, setItem, removeItem } from './storageHelper';
import { syncNotes } from './lib/simpleSync';

const STORAGE_KEY = 'health-advisor-notes';

export function getNotes() {
  try {
    const raw = getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function addNote(section, text) {
  const notes = getNotes();
  if (!notes[section]) notes[section] = [];
  notes[section].push({ text, date: new Date().toISOString() });
  saveNotes(notes);
  return notes;
}

export function saveNotes(notes) {
  // CRITICAL: Always add updatedAt for sync conflict resolution
  const dataWithTimestamp = {
    ...notes,
    updatedAt: new Date().toISOString(),
  };
  setItem(STORAGE_KEY, JSON.stringify(dataWithTimestamp));
  // Sync to Supabase in background (debounced)
  syncNotes();
}

export function clearNotes() {
  removeItem(STORAGE_KEY);
  syncNotes();
}
