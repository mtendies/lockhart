import { getItem, setItem } from './storageHelper';

const STORAGE_KEY = 'health-advisor-playbook-suggestions';

export function getSuggestions() {
  try {
    const saved = getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveSuggestions(suggestions) {
  setItem(STORAGE_KEY, JSON.stringify(suggestions));
}

export function addSuggestion(suggestion) {
  const suggestions = getSuggestions();
  const newSuggestion = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    ...suggestion,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  suggestions.unshift(newSuggestion);
  saveSuggestions(suggestions);
  return newSuggestion;
}

export function approveSuggestion(id) {
  const suggestions = getSuggestions();
  const index = suggestions.findIndex(s => s.id === id);
  if (index !== -1) {
    suggestions[index].status = 'approved';
    suggestions[index].approvedAt = new Date().toISOString();
    saveSuggestions(suggestions);
    return suggestions[index];
  }
  return null;
}

export function dismissSuggestion(id, reason = null) {
  const suggestions = getSuggestions();
  const index = suggestions.findIndex(s => s.id === id);
  if (index !== -1) {
    suggestions[index].status = 'dismissed';
    suggestions[index].dismissedAt = new Date().toISOString();
    if (reason) suggestions[index].dismissReason = reason;
    saveSuggestions(suggestions);
    return suggestions[index];
  }
  return null;
}

export function getPendingSuggestions() {
  return getSuggestions().filter(s => s.status === 'pending');
}

export function getPendingCount() {
  return getPendingSuggestions().length;
}

export function getPendingBySection(section) {
  return getPendingSuggestions().filter(s => s.section === section);
}

export function clearAllPending() {
  const suggestions = getSuggestions();
  const updated = suggestions.map(s =>
    s.status === 'pending' ? { ...s, status: 'dismissed', dismissedAt: new Date().toISOString() } : s
  );
  saveSuggestions(updated);
}
