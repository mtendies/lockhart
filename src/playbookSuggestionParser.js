// Parse playbook suggestions from AI response
export function parsePlaybookSuggestion(text) {
  const suggestionRegex = /\[\[PLAYBOOK_SUGGESTION\]\]([\s\S]*?)\[\[\/PLAYBOOK_SUGGESTION\]\]/g;
  const matches = [...text.matchAll(suggestionRegex)];

  if (matches.length === 0) {
    return { cleanText: text, suggestion: null };
  }

  // Only take the first suggestion (one per response)
  const match = matches[0];
  const suggestionBlock = match[1].trim();
  console.log('=== Parsing PLAYBOOK_SUGGESTION ===');
  console.log('Raw suggestion block:', suggestionBlock);

  // Parse the suggestion fields
  const suggestion = {};
  const lines = suggestionBlock.split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim().toLowerCase();
      const value = line.slice(colonIndex + 1).trim();

      if (key && value) {
        suggestion[key] = value;
      }
    }
  }

  // Validate required fields
  if (!suggestion.section || !suggestion.action || !suggestion.text) {
    return { cleanText: text, suggestion: null };
  }

  // Normalize section names
  const sectionMap = {
    'principles': 'principles',
    'principle': 'principles',
    'key principles': 'principles',
    'weeklyfocus': 'weeklyFocus',
    'weekly focus': 'weeklyFocus',
    'weekly_focus': 'weeklyFocus',
    'focus': 'weeklyFocus',
    'radar': 'radar',
    'on your radar': 'radar',
    'summary': 'summary',
    'big picture': 'summary',
    'profile': 'profile',
  };

  suggestion.section = sectionMap[suggestion.section.toLowerCase()] || suggestion.section;

  // Normalize action
  const actionMap = {
    'add': 'add',
    'edit': 'edit',
    'update': 'edit',
    'change': 'edit',
    'remove': 'remove',
    'delete': 'remove',
  };

  suggestion.action = actionMap[suggestion.action.toLowerCase()] || suggestion.action;

  // Parse index if present (for edit/remove actions)
  let index = null;
  if (suggestion.index !== undefined && suggestion.index !== '') {
    const parsedIndex = parseInt(suggestion.index, 10);
    console.log('Parsing index:', suggestion.index, '-> parsed:', parsedIndex);
    if (!isNaN(parsedIndex) && parsedIndex >= 0) {
      index = parsedIndex;
    }
  }
  console.log('Final parsed index:', index);

  // Remove the suggestion block from the text
  const cleanText = text.replace(suggestionRegex, '').trim();

  return {
    cleanText,
    suggestion: {
      section: suggestion.section,
      action: suggestion.action,
      content: {
        text: suggestion.text,
        why: suggestion.why || null,
        context: suggestion.context || null,
        timing: suggestion.timing || suggestion.context || null,
        index: index, // Include parsed index in content
        field: suggestion.field || null, // For profile edits
      },
      rationale: suggestion.rationale || null,
      sources: suggestion.sources || null,
    }
  };
}

// Strip suggestion markers from text (for display)
export function stripPlaybookSuggestion(text) {
  return text.replace(/\[\[PLAYBOOK_SUGGESTION\]\][\s\S]*?\[\[\/PLAYBOOK_SUGGESTION\]\]/g, '').trim();
}
