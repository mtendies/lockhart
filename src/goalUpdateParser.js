/**
 * Goal Update Parser
 * Parses [[GOAL_UPDATE]] blocks from AI responses to update focus goals
 */

/**
 * Parse goal update blocks from AI response text
 * Format: [[GOAL_UPDATE]]
 * action: update|add|remove|complete
 * goalId: goal_123... (for update/remove/complete)
 * text: "New goal text" (for add/update)
 * target: 3 (for add/update)
 * unit: times|days (for add/update)
 * [[/GOAL_UPDATE]]
 *
 * @param {string} text - The AI response text
 * @returns {{ cleanText: string, goalUpdates: Array }} - Clean text and parsed updates
 */
export function parseGoalUpdates(text) {
  const goalUpdates = [];
  const regex = /\[\[GOAL_UPDATE\]\]([\s\S]*?)\[\[\/GOAL_UPDATE\]\]/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const block = match[1].trim();
    const update = parseUpdateBlock(block);
    if (update) {
      goalUpdates.push(update);
    }
  }

  // Remove the goal update blocks from the text
  const cleanText = text.replace(regex, '').trim();

  return { cleanText, goalUpdates };
}

/**
 * Parse a single goal update block
 */
function parseUpdateBlock(block) {
  const lines = block.split('\n');
  const update = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();

    switch (key) {
      case 'action':
        update.action = value.toLowerCase();
        break;
      case 'goalid':
      case 'goal_id':
        update.goalId = value;
        break;
      case 'text':
        // Remove quotes if present
        update.text = value.replace(/^["']|["']$/g, '');
        break;
      case 'target':
        update.target = parseInt(value, 10);
        break;
      case 'unit':
        update.unit = value.toLowerCase();
        break;
      case 'type':
        update.type = value.toLowerCase();
        break;
    }
  }

  // Validate the update
  if (!update.action) return null;

  // Validate based on action type
  switch (update.action) {
    case 'update':
      if (!update.goalId) return null;
      break;
    case 'add':
      if (!update.text) return null;
      break;
    case 'remove':
    case 'complete':
      if (!update.goalId) return null;
      break;
    default:
      return null;
  }

  return update;
}

/**
 * Strip goal update blocks from text (for display)
 */
export function stripGoalUpdateBlocks(text) {
  return text.replace(/\[\[GOAL_UPDATE\]\][\s\S]*?\[\[\/GOAL_UPDATE\]\]/g, '').trim();
}
