/**
 * Multi-Chat Store
 * Manages multiple chat conversations with archiving, categories, and search
 */

import { getItem, setItem } from './storageHelper';
import { syncChats } from './lib/simpleSync';

const STORAGE_KEY = 'health-advisor-chats';

// Chat categories with colors
// Blue=Fitness, Amber=Nutrition, Purple=Recovery, Green=Goals, Gray=General
export const CHAT_CATEGORIES = {
  fitness: { label: 'Fitness', color: '#3b82f6', bgColor: '#dbeafe' },      // Blue
  nutrition: { label: 'Nutrition', color: '#f59e0b', bgColor: '#fef3c7' },  // Amber
  recovery: { label: 'Recovery', color: '#a855f7', bgColor: '#f3e8ff' },    // Purple
  goals: { label: 'Goals', color: '#22c55e', bgColor: '#dcfce7' },          // Green
  general: { label: 'General', color: '#6b7280', bgColor: '#f3f4f6' },      // Gray
};

// Keywords for auto-categorization
// Order matters: Recovery keywords are checked with priority for sleep-related content
const CATEGORY_KEYWORDS = {
  recovery: ['sleep', 'slept', 'nap', 'rest', 'recover', 'recovery', 'stress', 'tired', 'fatigue', 'sore', 'soreness', 'injury', 'stretch', 'mobility', 'relax', 'off day', 'rest day', 'insomnia', 'bedtime', 'wake', 'meditation', 'mindful', 'anxiety', 'pain'],
  nutrition: ['protein', 'carb', 'fat', 'calorie', 'diet', 'eat', 'ate', 'food', 'meal', 'grocery', 'nutrition', 'macro', 'vitamin', 'supplement', 'hydration', 'water', 'breakfast', 'lunch', 'dinner', 'snack'],
  fitness: ['workout', 'exercise', 'run', 'ran', 'lift', 'lifting', 'strength', 'cardio', 'gym', 'training', 'mile', 'rep', 'set', 'muscle', 'bench', 'squat', 'deadlift', 'jog', 'swim', 'bike', 'hiit'],
  goals: ['goal', 'target', 'plan', 'playbook', 'focus', 'progress', 'track', 'improve', 'achieve', 'week', 'strategy'],
};

/**
 * Get all chats from storage
 */
export function getAllChats() {
  try {
    const data = getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save all chats to storage and sync to Supabase
 */
function saveChats(chats) {
  setItem(STORAGE_KEY, JSON.stringify(chats));
  // Sync to Supabase in background (debounced)
  syncChats();
}

/**
 * Get active (non-archived) chats, sorted by last activity
 */
export function getActiveChats() {
  return getAllChats()
    .filter(c => !c.archived)
    .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
}

/**
 * Get archived chats
 */
export function getArchivedChats() {
  return getAllChats()
    .filter(c => c.archived)
    .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
}

/**
 * Get a single chat by ID
 */
export function getChatById(chatId) {
  return getAllChats().find(c => c.id === chatId) || null;
}

/**
 * Auto-detect category from message content
 * Priority: Sleep-related content is always "recovery"
 */
export function detectCategory(text) {
  const lower = text.toLowerCase();

  // Priority check: Sleep-related content should always be Recovery
  const sleepKeywords = ['sleep', 'slept', 'nap', 'rest day', 'off day', 'tired', 'fatigue', 'insomnia', 'bedtime', '8 hours', '7 hours', '6 hours'];
  if (sleepKeywords.some(kw => lower.includes(kw))) {
    return 'recovery';
  }

  const scores = {};

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[category] = keywords.filter(kw => lower.includes(kw)).length;
  }

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'general';

  const topCategory = Object.entries(scores).find(([, score]) => score === maxScore);
  return topCategory ? topCategory[0] : 'general';
}

/**
 * Generate a smart, concise title from the first user message
 */
export function generateTitle(firstMessage) {
  if (!firstMessage) return 'New Chat';

  const text = firstMessage.trim().toLowerCase();

  // Topic patterns - match specific health topics and generate clean titles
  const topicPatterns = [
    // Activity logging patterns
    { pattern: /(?:i |just |today i )?(?:ran|run|went running|jogged|jog)\s*(\d+)?/i, title: (m) => m[1] ? `${m[1]} Mile Run` : 'Running Session' },
    { pattern: /(?:i |just )?(?:walked|walk|went walking)\s*(\d+)?/i, title: (m) => m[1] ? `${m[1]} Mile Walk` : 'Walking Session' },
    { pattern: /(?:i |just )?(?:lifted|lift|weight training|weights|strength)/i, title: () => 'Strength Training' },
    { pattern: /(?:i |just )?(?:swam|swim|swimming|pool)/i, title: () => 'Swimming Session' },
    { pattern: /(?:i |just )?(?:cycled|bike|biking|cycling)\s*(\d+)?/i, title: (m) => m[1] ? `${m[1]} Mile Ride` : 'Cycling Session' },
    { pattern: /(?:i |just )?(?:did|do|doing)\s+(?:yoga|pilates|stretching)/i, title: (m) => 'Yoga & Stretching' },
    { pattern: /(?:i |just )?(?:hiit|interval|circuit)/i, title: () => 'HIIT Workout' },

    // Nutrition patterns
    { pattern: /protein\s*(?:shake|powder|supplement|intake|timing|amount)/i, title: () => 'Protein Intake' },
    { pattern: /(?:how much|daily|need)\s*protein/i, title: () => 'Protein Requirements' },
    { pattern: /(?:pre|post)[\s-]?workout\s*(?:meal|food|eat|nutrition)/i, title: () => 'Workout Nutrition' },
    { pattern: /(?:meal prep|meal planning|weekly meals)/i, title: () => 'Meal Planning' },
    { pattern: /(?:calorie|calories|caloric)\s*(?:deficit|surplus|intake|count)/i, title: () => 'Calorie Goals' },
    { pattern: /(?:macro|macros|macronutrient)/i, title: () => 'Macro Balance' },
    { pattern: /(?:carb|carbs|carbohydrate)/i, title: () => 'Carb Intake' },
    { pattern: /(?:fat|fats|healthy fats|omega)/i, title: () => 'Dietary Fats' },
    { pattern: /(?:sugar|glucose|blood sugar)/i, title: () => 'Sugar & Glucose' },
    { pattern: /(?:fiber|fibre|digestion|gut health)/i, title: () => 'Fiber & Digestion' },
    { pattern: /(?:vitamin|supplement|multivitamin)/i, title: () => 'Supplements' },
    { pattern: /(?:creatine)/i, title: () => 'Creatine' },
    { pattern: /(?:caffeine|coffee|pre-workout)/i, title: () => 'Caffeine & Energy' },
    { pattern: /(?:hydration|water intake|drink.*water|how much water)/i, title: () => 'Hydration' },
    { pattern: /(?:breakfast|morning meal)/i, title: () => 'Breakfast Ideas' },
    { pattern: /(?:lunch)/i, title: () => 'Lunch Ideas' },
    { pattern: /(?:dinner|evening meal)/i, title: () => 'Dinner Ideas' },
    { pattern: /(?:snack|healthy snack)/i, title: () => 'Snack Ideas' },
    { pattern: /(?:vegetarian|vegan|plant.based)/i, title: () => 'Plant-Based Eating' },
    { pattern: /(?:keto|ketogenic|low.carb)/i, title: () => 'Low-Carb Diet' },
    { pattern: /(?:intermittent fasting|fasting|eating window)/i, title: () => 'Intermittent Fasting' },

    // Sleep patterns
    { pattern: /(?:sleep|sleeping)\s*(?:quality|better|improve|trouble|problem|schedule)/i, title: () => 'Sleep Quality' },
    { pattern: /(?:insomnia|can't sleep|falling asleep)/i, title: () => 'Sleep Issues' },
    { pattern: /(?:sleep|slept)\s*(\d+)\s*hours?/i, title: (m) => `${m[1]}h Sleep Review` },
    { pattern: /(?:nap|napping|power nap)/i, title: () => 'Napping Strategy' },
    { pattern: /(?:circadian|sleep cycle|sleep schedule)/i, title: () => 'Sleep Schedule' },
    { pattern: /(?:melatonin|sleep supplement)/i, title: () => 'Sleep Supplements' },

    // Recovery patterns
    { pattern: /(?:sore|soreness|doms|muscle ache)/i, title: () => 'Muscle Soreness' },
    { pattern: /(?:recovery|rest day|active recovery)/i, title: () => 'Recovery Strategy' },
    { pattern: /(?:stretching|flexibility|mobility)/i, title: () => 'Flexibility Work' },
    { pattern: /(?:foam roll|massage|myofascial)/i, title: () => 'Muscle Recovery' },
    { pattern: /(?:injury|injured|pain|hurt)/i, title: () => 'Injury & Pain' },

    // Fitness goals patterns
    { pattern: /(?:lose|losing)\s*(?:weight|fat|pounds|lbs)/i, title: () => 'Weight Loss' },
    { pattern: /(?:gain|gaining|build)\s*(?:weight|muscle|mass)/i, title: () => 'Muscle Building' },
    { pattern: /(?:tone|toning|lean|cut|cutting)/i, title: () => 'Getting Lean' },
    { pattern: /(?:bulk|bulking)/i, title: () => 'Bulking Phase' },
    { pattern: /(?:maintain|maintenance)/i, title: () => 'Maintenance' },
    { pattern: /(?:body composition|body fat|bf%)/i, title: () => 'Body Composition' },

    // Workout planning
    { pattern: /(?:workout plan|training plan|exercise routine|program)/i, title: () => 'Training Plan' },
    { pattern: /(?:leg day|legs workout|lower body)/i, title: () => 'Leg Training' },
    { pattern: /(?:arm|arms|bicep|tricep|upper body)/i, title: () => 'Upper Body' },
    { pattern: /(?:chest|bench press|push)/i, title: () => 'Chest Training' },
    { pattern: /(?:back|pull|row|lat)/i, title: () => 'Back Training' },
    { pattern: /(?:shoulder|delt|overhead)/i, title: () => 'Shoulder Training' },
    { pattern: /(?:core|abs|abdominal|plank)/i, title: () => 'Core Training' },
    { pattern: /(?:cardio|aerobic|endurance)/i, title: () => 'Cardio Training' },
    { pattern: /(?:warm.?up|cool.?down)/i, title: () => 'Warm-up & Cool-down' },

    // Stress & mental
    { pattern: /(?:stress|stressed|anxiety|anxious)/i, title: () => 'Stress Management' },
    { pattern: /(?:motivation|motivated|discipline)/i, title: () => 'Motivation' },
    { pattern: /(?:meditation|mindful|breathing)/i, title: () => 'Mindfulness' },
    { pattern: /(?:mental health|mood|depression)/i, title: () => 'Mental Wellness' },
    { pattern: /(?:burnout|overtrain|too much)/i, title: () => 'Avoiding Burnout' },

    // Progress & tracking
    { pattern: /(?:progress|plateau|stuck|not seeing)/i, title: () => 'Progress Check' },
    { pattern: /(?:weigh|weight|scale)\s*(?:in|check|today)/i, title: () => 'Weight Check' },
    { pattern: /(?:measure|measurement|body stats)/i, title: () => 'Measurements' },
    { pattern: /(?:goal|target|aim)/i, title: () => 'Goal Setting' },
  ];

  // Try to match topic patterns
  for (const { pattern, title } of topicPatterns) {
    const match = text.match(pattern);
    if (match) {
      return title(match);
    }
  }

  // Fallback: Extract key topic words and create a concise title
  const lower = firstMessage.toLowerCase();

  // Key topic words to look for and their clean titles
  const topicWords = [
    // Food items
    { words: ['egg', 'eggs'], title: 'Eggs & Nutrition' },
    { words: ['chicken', 'turkey', 'poultry'], title: 'Poultry Options' },
    { words: ['beef', 'steak', 'meat'], title: 'Meat & Protein' },
    { words: ['fish', 'salmon', 'tuna'], title: 'Fish & Seafood' },
    { words: ['rice', 'pasta', 'grain'], title: 'Grains & Carbs' },
    { words: ['vegetable', 'veggies', 'salad', 'greens'], title: 'Vegetables' },
    { words: ['fruit', 'apple', 'banana', 'berry'], title: 'Fruits' },
    { words: ['nuts', 'almond', 'peanut'], title: 'Nuts & Seeds' },
    { words: ['dairy', 'milk', 'cheese', 'yogurt'], title: 'Dairy Options' },
    { words: ['bread', 'toast', 'sandwich'], title: 'Bread & Grains' },
    { words: ['oatmeal', 'oats', 'cereal'], title: 'Breakfast Grains' },
    { words: ['smoothie', 'shake', 'blend'], title: 'Smoothies & Shakes' },

    // Time-based
    { words: ['morning', 'wake up', 'start the day'], title: 'Morning Routine' },
    { words: ['evening', 'night', 'before bed'], title: 'Evening Routine' },
    { words: ['after workout', 'post workout', 'after training'], title: 'Post-Workout' },
    { words: ['before workout', 'pre workout', 'before training'], title: 'Pre-Workout' },

    // Goals
    { words: ['best', 'optimal', 'ideal', 'perfect'], title: 'Optimal Choices' },
    { words: ['healthy', 'healthier', 'nutritious'], title: 'Healthy Options' },
    { words: ['quick', 'fast', 'easy'], title: 'Quick Options' },
    { words: ['cheap', 'budget', 'affordable'], title: 'Budget Options' },

    // Actions
    { words: ['eat', 'eating', 'food', 'foods'], title: 'Food Choices' },
    { words: ['drink', 'drinking', 'beverage'], title: 'Beverages' },
    { words: ['cook', 'cooking', 'prepare', 'make'], title: 'Meal Prep' },
    { words: ['buy', 'shop', 'grocery', 'groceries'], title: 'Grocery Shopping' },
    { words: ['avoid', 'stop', 'quit', 'reduce'], title: 'What to Avoid' },
    { words: ['start', 'begin', 'try', 'new'], title: 'Getting Started' },
    { words: ['improve', 'better', 'increase', 'boost'], title: 'Improvements' },
    { words: ['help', 'advice', 'recommend', 'suggest'], title: 'Recommendations' },
  ];

  // Check for topic word matches
  for (const { words, title } of topicWords) {
    if (words.some(w => lower.includes(w))) {
      // Try to make it more specific by combining with context
      if (lower.includes('breakfast')) return `Breakfast ${title.split(' ')[0]}`;
      if (lower.includes('lunch')) return `Lunch ${title.split(' ')[0]}`;
      if (lower.includes('dinner')) return `Dinner ${title.split(' ')[0]}`;
      if (lower.includes('recovery')) return `Recovery ${title.split(' ')[0]}`;
      if (lower.includes('workout')) return `Workout ${title.split(' ')[0]}`;
      if (lower.includes('muscle')) return `Muscle ${title.split(' ')[0]}`;
      if (lower.includes('energy')) return `Energy ${title.split(' ')[0]}`;
      return title;
    }
  }

  // Last resort: Extract first few meaningful words
  let cleaned = firstMessage.trim()
    .replace(/^(hey|hi|hello|please|can you|could you|would you|i need|i want|i'd like|help me|tell me|explain|what's|what is|how do i|how can i|how to|should i|do i need|is it|are there|why do|why is|when should|what are|what should|is there)\s*/i, '')
    .replace(/[?!.,]+$/, '')
    .replace(/\s+(please|thanks|thank you|for me)$/i, '')
    .replace(/\s+(the best|good|some|any|a few)\s+/i, ' ')
    .trim();

  // Get first 3-4 words max
  const words = cleaned.split(/\s+/).slice(0, 4);
  if (words.length > 0) {
    let title = words.join(' ');
    title = title.charAt(0).toUpperCase() + title.slice(1);
    // Remove trailing articles/prepositions
    title = title.replace(/\s+(to|for|the|a|an|of|in|on|with)$/i, '');
    return title || 'Health Question';
  }

  return 'Health Question';
}

/**
 * Create a new chat
 */
export function createChat(initialMessage = null) {
  const chats = getAllChats();
  const now = new Date().toISOString();

  const newChat = {
    id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: initialMessage ? generateTitle(initialMessage) : 'New Chat',
    category: initialMessage ? detectCategory(initialMessage) : 'general',
    createdAt: now,
    lastActivity: now,
    archived: false,
    messages: [],
    archivedMessages: [], // Individual archived messages
  };

  chats.unshift(newChat);
  saveChats(chats);

  return newChat;
}

/**
 * Update a chat's messages
 */
// Helper to extract text from message content
function getContentText(content) {
  if (!content) return '';
  return typeof content === 'string'
    ? content
    : (content?.content || content?.text || '');
}

export function updateChatMessages(chatId, messages) {
  const chats = getAllChats();
  const index = chats.findIndex(c => c.id === chatId);

  if (index === -1) return null;

  // Update category based on all messages
  const allText = messages.map(m => getContentText(m.content)).join(' ');
  const category = detectCategory(allText);

  // Update title if it's still "New Chat" and we have a user message
  let title = chats[index].title;
  if (title === 'New Chat' && messages.length > 0) {
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (firstUserMsg) {
      title = generateTitle(getContentText(firstUserMsg.content));
    }
  }

  chats[index] = {
    ...chats[index],
    messages,
    category,
    title,
    lastActivity: new Date().toISOString(),
  };

  saveChats(chats);

  return chats[index];
}

/**
 * Update chat title
 */
export function updateChatTitle(chatId, newTitle) {
  const chats = getAllChats();
  const index = chats.findIndex(c => c.id === chatId);

  if (index === -1) return null;

  chats[index].title = newTitle;
  saveChats(chats);
  return chats[index];
}

/**
 * Archive a chat
 */
export function archiveChat(chatId) {
  const chats = getAllChats();
  const index = chats.findIndex(c => c.id === chatId);

  if (index === -1) return null;

  chats[index].archived = true;
  chats[index].archivedAt = new Date().toISOString();
  saveChats(chats);
  return chats[index];
}

/**
 * Unarchive a chat
 */
export function unarchiveChat(chatId) {
  const chats = getAllChats();
  const index = chats.findIndex(c => c.id === chatId);

  if (index === -1) return null;

  chats[index].archived = false;
  delete chats[index].archivedAt;
  saveChats(chats);
  return chats[index];
}

/**
 * Archive a single message within a chat
 */
export function archiveMessage(chatId, messageIndex) {
  const chats = getAllChats();
  const chatIndex = chats.findIndex(c => c.id === chatId);

  if (chatIndex === -1) return null;

  const chat = chats[chatIndex];
  const message = chat.messages[messageIndex];

  if (!message) return null;

  // Add to archived messages with metadata
  chat.archivedMessages = chat.archivedMessages || [];
  chat.archivedMessages.push({
    ...message,
    originalIndex: messageIndex,
    archivedAt: new Date().toISOString(),
  });

  // Remove from main messages
  chat.messages.splice(messageIndex, 1);

  saveChats(chats);
  return chat;
}

/**
 * Delete a chat permanently
 */
export function deleteChat(chatId) {
  const chats = getAllChats().filter(c => c.id !== chatId);
  saveChats(chats);
  // saveChats already syncs to Supabase (full array replaces old)
}

/**
 * Search across all chats (active and archived)
 */
export function searchChats(query) {
  if (!query || query.trim().length < 2) return [];

  const lower = query.toLowerCase();
  const allChats = getAllChats();

  // Helper to extract text from message content
  const getMessageText = (m) => {
    if (!m || !m.content) return '';
    return typeof m.content === 'string'
      ? m.content
      : (m.content?.content || m.content?.text || '');
  };

  return allChats.filter(chat => {
    // Search in title
    if (chat.title.toLowerCase().includes(lower)) return true;

    // Search in messages
    return chat.messages.some(m => getMessageText(m).toLowerCase().includes(lower));
  }).sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
}

/**
 * Filter chats by category
 */
export function filterChatsByCategory(category, includeArchived = false) {
  let chats = includeArchived ? getAllChats() : getActiveChats();

  if (category && category !== 'all') {
    chats = chats.filter(c => c.category === category);
  }

  return chats.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
}

/**
 * Get the last message preview for a chat
 */
export function getLastMessagePreview(chat, maxLength = 50) {
  if (!chat.messages || chat.messages.length === 0) {
    return 'No messages yet';
  }

  const lastMsg = chat.messages[chat.messages.length - 1];
  // Handle both string content and object content {type, content}
  const contentText = typeof lastMsg.content === 'string'
    ? lastMsg.content
    : (lastMsg.content?.content || lastMsg.content?.text || '');
  let preview = contentText.replace(/\n/g, ' ').trim();

  if (preview.length > maxLength) {
    preview = preview.substring(0, maxLength - 3) + '...';
  }

  return preview;
}

/**
 * Generate a smart one-sentence summary of a chat based on its content
 */
export function getChatSummary(chat) {
  if (!chat.messages || chat.messages.length === 0) {
    return 'Start a new conversation';
  }

  // Get the first user message to understand the topic
  const firstUserMsg = chat.messages.find(m => m.role === 'user');
  if (!firstUserMsg) {
    return 'Conversation in progress';
  }

  const text = getContentText(firstUserMsg.content).toLowerCase();
  const category = chat.category || 'general';
  const messageCount = chat.messages.length;
  const hasResponses = chat.messages.some(m => m.role === 'assistant');

  // Activity logging summaries
  if (/(?:i |just |today i )?(?:ran|run|went running|jogged)/.test(text)) {
    return hasResponses ? 'Logged a run and got feedback' : 'Logging a running session';
  }
  if (/(?:i |just )?(?:lifted|weight|strength|gym|workout)/.test(text)) {
    return hasResponses ? 'Discussed strength training' : 'Logging a workout';
  }
  if (/(?:i |just )?(?:walked|walk|swimming|swam|cycled|bike)/.test(text)) {
    return hasResponses ? 'Logged activity and got tips' : 'Logging an exercise session';
  }
  if (/(?:ate|eating|had for|breakfast|lunch|dinner|meal)/.test(text)) {
    return hasResponses ? 'Discussed meals and nutrition' : 'Logging food intake';
  }
  if (/(?:slept|sleep|hours of sleep|woke up)/.test(text)) {
    return hasResponses ? 'Reviewed sleep patterns' : 'Logging sleep';
  }
  if (/(?:weigh|weight).*(?:lbs|pounds|kg|\d+)/.test(text)) {
    return hasResponses ? 'Tracked weight progress' : 'Logging weight';
  }

  // Question-based summaries by category
  const summaryByCategory = {
    nutrition: [
      { pattern: /protein/, summary: 'Exploring protein intake and timing' },
      { pattern: /calorie|calories/, summary: 'Discussing calorie goals' },
      { pattern: /macro/, summary: 'Planning macronutrient balance' },
      { pattern: /meal|food|eat/, summary: 'Getting nutrition advice' },
      { pattern: /supplement|vitamin|creatine/, summary: 'Reviewing supplements' },
      { pattern: /diet|keto|fasting/, summary: 'Discussing diet strategies' },
      { pattern: /water|hydrat/, summary: 'Optimizing hydration' },
    ],
    fitness: [
      { pattern: /workout|training|exercise/, summary: 'Planning workouts' },
      { pattern: /cardio|running|run/, summary: 'Discussing cardio training' },
      { pattern: /strength|muscle|lift/, summary: 'Building strength routine' },
      { pattern: /stretch|flexibility|mobility/, summary: 'Improving flexibility' },
      { pattern: /rest|recovery/, summary: 'Optimizing recovery' },
    ],
    recovery: [
      { pattern: /sleep/, summary: 'Improving sleep quality' },
      { pattern: /sore|pain|injury/, summary: 'Managing soreness or injury' },
      { pattern: /stress|anxiety/, summary: 'Managing stress levels' },
      { pattern: /tired|fatigue|energy/, summary: 'Boosting energy levels' },
      { pattern: /rest|recover/, summary: 'Planning recovery strategy' },
    ],
    goals: [
      { pattern: /lose|weight loss|fat/, summary: 'Working toward weight loss' },
      { pattern: /gain|muscle|bulk/, summary: 'Building muscle mass' },
      { pattern: /goal|target|plan/, summary: 'Setting health goals' },
      { pattern: /progress|plateau/, summary: 'Reviewing progress' },
      { pattern: /improve|better/, summary: 'Improving overall health' },
    ],
  };

  // Check category-specific patterns
  const categoryPatterns = summaryByCategory[category] || [];
  for (const { pattern, summary } of categoryPatterns) {
    if (pattern.test(text)) {
      return summary;
    }
  }

  // Check all patterns if category didn't match
  for (const patterns of Object.values(summaryByCategory)) {
    for (const { pattern, summary } of patterns) {
      if (pattern.test(text)) {
        return summary;
      }
    }
  }

  // Fallback based on category and message count
  const fallbacks = {
    nutrition: 'Discussing nutrition and diet',
    fitness: 'Planning fitness activities',
    recovery: 'Focusing on rest and recovery',
    goals: 'Working on health goals',
    general: messageCount > 2 ? 'Ongoing health conversation' : 'Getting health advice',
  };

  return fallbacks[category] || fallbacks.general;
}

/**
 * Recategorize all chats using the updated category detection
 * This fixes chats with outdated categories (e.g., sleep should be recovery)
 */
export function recategorizeAllChats() {
  const chats = getAllChats();
  let updated = false;

  for (const chat of chats) {
    if (!chat.messages || chat.messages.length === 0) continue;

    // Recategorize based on all message content
    const allText = chat.messages.map(m => getContentText(m.content)).join(' ');
    const newCategory = detectCategory(allText);

    if (chat.category !== newCategory) {
      console.log(`Recategorizing chat "${chat.title}" from ${chat.category} to ${newCategory}`);
      chat.category = newCategory;
      updated = true;
    }
  }

  if (updated) {
    saveChats(chats);
    console.log('Recategorized chats with updated category logic');
  }

  return updated;
}

/**
 * Regenerate all chat titles using the smart title generator
 * Also recategorizes chats with updated category detection
 */
export function regenerateAllTitles() {
  const chats = getAllChats();
  let updated = false;

  for (const chat of chats) {
    if (!chat.messages || chat.messages.length === 0) continue;

    const firstUserMsg = chat.messages.find(m => m.role === 'user');
    if (!firstUserMsg) continue;

    // Always recategorize to pick up new category logic
    const allText = chat.messages.map(m => getContentText(m.content)).join(' ');
    const newCategory = detectCategory(allText);
    if (chat.category !== newCategory) {
      chat.category = newCategory;
      updated = true;
    }

    const newTitle = generateTitle(getContentText(firstUserMsg.content));

    // Only update if title looks truncated (ends with partial word or is same as message start)
    const oldTitle = chat.title || '';
    const isTruncated = oldTitle.includes('...') ||
                        oldTitle.length > 30 ||
                        oldTitle.toLowerCase().startsWith('should') ||
                        oldTitle.toLowerCase().startsWith('what') ||
                        oldTitle.toLowerCase().startsWith('how') ||
                        oldTitle.toLowerCase().startsWith('can') ||
                        oldTitle.toLowerCase().startsWith('is') ||
                        oldTitle.toLowerCase().startsWith('do') ||
                        oldTitle.toLowerCase().startsWith('why');

    if (isTruncated && newTitle !== oldTitle) {
      chat.title = newTitle;
      updated = true;
    }
  }

  if (updated) {
    saveChats(chats);
    console.log('Regenerated chat titles and categories');
  }

  return updated;
}

/**
 * Migrate old single-chat data to multi-chat format
 */
export function migrateFromOldFormat() {
  const oldKey = 'health-advisor-chat';
  const oldData = getItem(oldKey);

  // Always recategorize and regenerate titles for existing chats
  console.log('Running chat migration/recategorization...');
  recategorizeAllChats();
  regenerateAllTitles();

  if (!oldData) return false;

  try {
    const oldMessages = JSON.parse(oldData);
    if (!Array.isArray(oldMessages) || oldMessages.length === 0) return false;

    // Check if we already have chats
    const existingChats = getAllChats();
    if (existingChats.length > 0) return false;

    // Create a new chat from old messages
    const firstUserMsg = oldMessages.find(m => m.role === 'user');
    const title = firstUserMsg ? generateTitle(getContentText(firstUserMsg.content)) : 'Previous Conversation';
    const category = detectCategory(oldMessages.map(m => getContentText(m.content)).join(' '));

    const migratedChat = {
      id: `chat-migrated-${Date.now()}`,
      title,
      category,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      archived: false,
      messages: oldMessages,
      archivedMessages: [],
    };

    saveChats([migratedChat]);

    // Optionally clear old data
    // localStorage.removeItem(oldKey);

    console.log('Migrated old chat data to new format');
    return true;
  } catch (err) {
    console.error('Migration failed:', err);
    return false;
  }
}
