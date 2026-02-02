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
  setItem(STORAGE_KEY, JSON.stringify(notes));
  // Sync to Supabase in background (debounced)
  syncNotes();
}

export function clearNotes() {
  removeItem(STORAGE_KEY);
  syncNotes();
}
