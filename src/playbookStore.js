import { getItem, setItem, removeItem } from './storageHelper';
import { syncPlaybook } from './lib/simpleSync';

const STORAGE_KEY = 'health-advisor-playbook';

export function getPlaybook() {
  try {
    const saved = getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function savePlaybook(playbook) {
  const playbookWithTimestamp = {
    ...playbook,
    generatedAt: playbook.generatedAt || new Date().toISOString(),
    // CRITICAL: Always add updatedAt for sync conflict resolution
    updatedAt: new Date().toISOString(),
  };

  setItem(STORAGE_KEY, JSON.stringify(playbookWithTimestamp));

  // Sync to Supabase in background (debounced)
  syncPlaybook();
}

export function clearPlaybook() {
  removeItem(STORAGE_KEY);
}

// Helper to find index by text matching (fuzzy match)
function findIndexByText(items, searchText, textKey = 'text') {
  if (!items || !searchText) return -1;

  const searchLower = searchText.toLowerCase();

  // First try exact match
  let index = items.findIndex(item => {
    const itemText = (item[textKey] || '').toLowerCase();
    return itemText === searchLower;
  });

  if (index !== -1) return index;

  // Then try partial match (search text contains or is contained by item text)
  index = items.findIndex(item => {
    const itemText = (item[textKey] || '').toLowerCase();
    return itemText.includes(searchLower) || searchLower.includes(itemText);
  });

  if (index !== -1) return index;

  // Finally try keyword matching (at least 3 significant words match)
  const searchWords = searchLower.split(/\s+/).filter(w => w.length > 3);
  index = items.findIndex(item => {
    const itemText = (item[textKey] || '').toLowerCase();
    const matchCount = searchWords.filter(word => itemText.includes(word)).length;
    return matchCount >= Math.min(3, searchWords.length);
  });

  return index;
}

// Apply a suggestion to the playbook
export function applyPlaybookSuggestion(suggestion) {
  const playbook = getPlaybook();
  if (!playbook) {
    return null;
  }

  const { section, action, content } = suggestion;

  switch (section) {
    case 'summary':
      if (action === 'edit') {
        playbook.summary = content.text;
      }
      break;

    case 'principles':
      if (action === 'add') {
        playbook.principles = playbook.principles || [];
        playbook.principles.push({ text: content.text, why: content.why });
      } else if (action === 'edit') {
        const editIndex = content.index !== undefined ? content.index : findIndexByText(playbook.principles, content.text, 'text');
        if (playbook.principles && playbook.principles[editIndex]) {
          playbook.principles[editIndex] = { text: content.text, why: content.why };
        }
      } else if (action === 'remove') {
        if (playbook.principles) {
          let removeIndex = content.index;
          if (removeIndex === undefined || removeIndex === null) {
            removeIndex = findIndexByText(playbook.principles, content.text, 'text');
          }
          if (removeIndex !== -1 && removeIndex !== undefined && playbook.principles[removeIndex]) {
            playbook.principles.splice(removeIndex, 1);
          }
        }
      }
      break;

    case 'weeklyFocus':
      if (action === 'add') {
        playbook.weeklyFocus = playbook.weeklyFocus || [];
        playbook.weeklyFocus.push({ action: content.text, context: content.context });
      } else if (action === 'edit') {
        const editIndex = content.index !== undefined && content.index !== null ? content.index : findIndexByText(playbook.weeklyFocus, content.text, 'action');
        if (playbook.weeklyFocus && editIndex >= 0 && playbook.weeklyFocus[editIndex]) {
          playbook.weeklyFocus[editIndex] = { action: content.text, context: content.context };
        }
      } else if (action === 'remove') {
        if (playbook.weeklyFocus) {
          let removeIndex = content.index;
          if (removeIndex === undefined || removeIndex === null) {
            removeIndex = findIndexByText(playbook.weeklyFocus, content.text, 'action');
          }
          if (removeIndex !== -1 && removeIndex !== undefined && playbook.weeklyFocus[removeIndex]) {
            playbook.weeklyFocus.splice(removeIndex, 1);
          }
        }
      }
      break;

    case 'radar':
      if (action === 'add') {
        playbook.radar = playbook.radar || [];
        playbook.radar.push({ suggestion: content.text, timing: content.timing });
      } else if (action === 'edit') {
        const editIndex = content.index !== undefined ? content.index : findIndexByText(playbook.radar, content.text, 'suggestion');
        if (playbook.radar && playbook.radar[editIndex]) {
          playbook.radar[editIndex] = { suggestion: content.text, timing: content.timing };
        }
      } else if (action === 'remove') {
        if (playbook.radar) {
          let removeIndex = content.index;
          if (removeIndex === undefined || removeIndex === null) {
            removeIndex = findIndexByText(playbook.radar, content.text, 'suggestion');
          }
          if (removeIndex !== -1 && removeIndex !== undefined && playbook.radar[removeIndex]) {
            playbook.radar.splice(removeIndex, 1);
          }
        }
      }
      break;
  }

  playbook.lastModified = new Date().toISOString();
  savePlaybook(playbook);

  return playbook;
}
