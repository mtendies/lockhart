import { getItem, setItem, removeItem } from './storageHelper';

const STORAGE_KEY = 'health-advisor-chat';

export function getMessages() {
  try {
    const data = getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveMessages(messages) {
  setItem(STORAGE_KEY, JSON.stringify(messages));
}

export function clearMessages() {
  removeItem(STORAGE_KEY);
}
