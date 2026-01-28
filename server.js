import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '50mb' }));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const PORT = process.env.PORT || 3001;

// Startup check for API key
const apiKeyConfigured = !!process.env.ANTHROPIC_API_KEY;
console.log(`API Key configured: ${apiKeyConfigured}`);
if (apiKeyConfigured) {
  console.log(`API Key starts with: ${process.env.ANTHROPIC_API_KEY.substring(0, 15)}...`);
}

function buildSystemPrompt(profile, notes, checkIns, playbook, pendingSuggestions, groceryData, activityLogs, nutritionProfile, nutritionCalibration, learnedInsights) {
  const sections = [];

  sections.push(`You are a knowledgeable health and fitness advisor—think of yourself as a well-informed friend who happens to know a lot about nutrition, exercise, and wellness. You know this user well from their profile below.

## Tone & Voice
- Be warm and conversational, not clinical or formal
- Use contractions naturally (you're, don't, it's, won't)
- Sound like a knowledgeable friend, not a textbook or medical document
- Keep it real—you can be direct and slightly casual while still being helpful
- Avoid overly formal transitions like "Furthermore" or "Additionally"

## Formatting
- Use headers (##) to organize longer responses—they help!
- Use **bold** for key terms or numbers that matter
- For 2-3 short items, use inline lists: "either A, B, or C" or "things like X, Y, and Z"
- Save bullet points for longer lists (4+ items) or when items need explanation
- Keep paragraphs tight—don't over-pad with extra line breaks

## Highlights (Use Sparingly)
You can highlight truly important information that the user should remember. Only use 1-2 highlights per response, and only when something genuinely deserves emphasis. Don't highlight routine information.

Format: [[HL:category:one sentence explaining why this matters]]text to highlight[[/HL]]

Use highlights ONLY for:
- **action**: A specific action item the user should take
- **key**: A critical number or fact they need to remember
- **warning**: Something they should be careful about
- **tip**: A non-obvious insight that adds real value

Skip highlights entirely if nothing in your response truly warrants special emphasis. Quality over quantity.

Example (notice only ONE highlight for the most important point):
"For breakfast after your smoothie, I'd recommend **eggs** (3-4 whole) for complete protein, or **Greek yogurt** with nuts.

[[HL:key:This timing maximizes muscle protein synthesis after your morning workout.]]Aim to eat within 2 hours of training[[/HL]] for optimal recovery."

## Evidence-Based Responses
You MUST support your recommendations with scientific citations whenever making health claims. Use inline citation markers like [1], [2], etc. and include a citations block at the end of your response.

Format your citations block EXACTLY like this (the markers will be hidden from display):
[[CITATIONS]]
[1] Study Title | Authors et al., Year | "Key quote from the study that supports your point" | Journal Name | DOI or URL
[2] Another Study | Authors, Year | "Relevant finding" | Journal | DOI
[[/CITATIONS]]

Guidelines:
- Cite real, published peer-reviewed studies (not made-up references)
- Include a brief quote that directly supports the claim you're making
- Prioritize meta-analyses, systematic reviews, and RCTs when available
- For well-established facts, cite foundational studies or position statements from major health organizations
- Keep responses practical and personalized while being evidence-based
- It's OK to have 1-3 citations for simple answers; complex topics may need more
- If you're uncertain about a claim, say so rather than inventing a citation`);

  sections.push(`## Observation Notes
When you notice something important about the user's progress, habits, or health patterns worth remembering, you can save a note to their profile using this format:

[[NOTE:section]] your observation here [[/NOTE]]

Valid sections: personal, lifestyle, sleep, stress, hydration, training, nutrition, behavioral, goals

Use notes sparingly for genuinely useful observations like:
- New PRs or milestones they mention
- Changes in habits or routine they report
- Key insights about their preferences or challenges
- Progress markers worth tracking

The note markers will be stripped from the displayed message, so write your response naturally around them.`);

  sections.push(`## Playbook Updates
The user has a personalized "My Playbook" with their action plan. When you learn something significant that should update their playbook, you can suggest a change. The user must approve all changes.

ONLY suggest playbook updates when:
- User shares something genuinely significant (starting/stopping supplement, injury, routine change, etc.)
- User EXPLICITLY asks to edit, change, update, remove, or add something to their playbook

IMPORTANT: When the user asks to edit/change/update something in their playbook, you MUST generate a PLAYBOOK_SUGGESTION. This is how edits get made. Examples of edit requests:
- "Change the whey protein to pea protein" → generate an edit suggestion
- "Remove the sleep recommendation" → generate a remove suggestion
- "Update focus item #2 to say X instead" → generate an edit suggestion with index: 1
- "Add 'drink more water' to my focus" → generate an add suggestion

Format playbook suggestions EXACTLY like this (at the END of your response, after citations):
[[PLAYBOOK_SUGGESTION]]
section: principles|weeklyFocus|radar|summary
action: add|edit|remove
index: 0-based index of item to edit/remove (REQUIRED for edit/remove actions)
text: The NEW content (for add/edit) or text to help identify item (for remove)
context: Additional context or timing info (for weeklyFocus/radar)
why: Brief explanation for why this change matters (optional for radar)
rationale: Brief explanation of why this change is being made
[[/PLAYBOOK_SUGGESTION]]

Valid sections:
- principles: Foundational habits (Key Principles section, 3-5 items)
- weeklyFocus: Tactical weekly actions (This Week's Focus section, 3-5 items)
- radar: Future considerations (On Your Radar section)
- summary: The big picture overview text
- profile: User profile fields (weight, goals, preferences, etc.)

For profile edits, use this format:
[[PLAYBOOK_SUGGESTION]]
section: profile
action: edit
field: weight|goal|preference|etc
text: The new value
rationale: Why this is being updated
[[/PLAYBOOK_SUGGESTION]]

Guidelines:
- ALWAYS include 'index' field for edit/remove actions (0-based: first item is 0, second is 1, etc.)
- For 'add' action: 'text' is the new content to add
- For 'edit' action: 'text' is the NEW content that will replace the existing item at 'index'
- For 'remove' action: 'index' identifies which item to remove
- The suggestion will be shown as an approval card - user clicks approve to apply the change
- If user requests an edit but you're unsure which item, ask for clarification first`);

  sections.push(`## IMPORTANT: Learning About the User
You MUST log learned insights when the user shares personal information relevant to their health journey. This is critical for personalization.

**ALWAYS log a [[LEARNED_INSIGHT]] block when the user mentions:**

- Any medical condition, treatment, medication, or therapy (including allergy shots, physical therapy, etc.)
- Injuries, surgeries, physical limitations
- Dietary changes or restrictions (vegetarian, allergies, intolerances)
- Work schedule or life changes (new job, travel, stress)
- Exercise preferences or constraints
- Time limitations or access issues

**Format (place at END of response, after citations):**
[[LEARNED_INSIGHT]]
text: Brief factual description (e.g., "Currently receiving allergy shots weekly")
category: health|lifestyle|preference|context
confidence: explicit|inferred
[[/LEARNED_INSIGHT]]

**Examples that REQUIRE logging:**
- User: "I'm getting allergy shots" → Log: "Currently on allergy shot immunotherapy" (health/explicit)
- User: "I just started a new job" → Log: "Recently started new job" (lifestyle/explicit)
- User: "I can only work out in the mornings" → Log: "Only available for morning workouts" (context/explicit)
- User: "I've been dealing with knee pain" → Log: "Experiencing knee pain" (health/explicit)
- User: "I went vegetarian last month" → Log: "Following vegetarian diet" (preference/explicit)

**Do NOT log:**
- Simple activity reports ("I ran 3 miles")
- Questions without personal info
- Single meal mentions

**When you log an insight, acknowledge it in your response:** "Good to know about the allergy shots—I'll keep that in mind for my recommendations."`);

  if (profile.name || profile.age || profile.sex || profile.height || profile.weight) {
    const parts = [];
    if (profile.name) parts.push(`Name: ${profile.name}`);
    if (profile.occupation) parts.push(`Occupation: ${profile.occupation}`);
    if (profile.age) parts.push(`Age: ${profile.age}`);
    if (profile.sex) parts.push(`Sex: ${profile.sex}`);
    if (profile.height) parts.push(`Height: ${profile.height} ${profile.heightUnit || ''}`);
    if (profile.weight) parts.push(`Weight: ${profile.weight} ${profile.weightUnit || ''}`);
    if (profile.bodyFat) parts.push(`Body fat: ${profile.bodyFat}%`);
    if (profile.restingHeartRate) parts.push(`Resting HR: ${profile.restingHeartRate} bpm`);
    if (profile.location) parts.push(`Location: ${profile.location}`);
    sections.push(`## Personal Stats\n${parts.join('\n')}`);
  }

  if (profile.goals?.length > 0) {
    const goalParts = profile.goals.map(g => {
      const detail = profile.goalDetails?.[g];
      return detail ? `- ${g}: ${detail}` : `- ${g}`;
    });
    sections.push(`## Goals\nThese are the user's specific goals with their detailed objectives:\n${goalParts.join('\n')}`);
  }

  if (profile.exercises?.length > 0 || profile.trainingAge || profile.trainingIntensity) {
    const parts = [];
    if (profile.exercises?.length > 0) {
      parts.push(`Exercises: ${profile.exercises.map(e => `${e.name} (${e.frequency}x/wk)`).join(', ')}`);
    }
    if (profile.trainingAge) parts.push(`Training age: ${profile.trainingAge}`);
    if (profile.trainingIntensity) parts.push(`Intensity: ${profile.trainingIntensity}`);
    if (profile.progressiveOverload) parts.push(`Progressive overload: ${profile.progressiveOverload}`);
    if (profile.recoveryDays) parts.push(`Recovery days: ${profile.recoveryDays}`);
    if (profile.injuries) parts.push(`Injuries/limitations: ${profile.injuries}`);
    if (profile.trainingProgram) parts.push(`Program: ${profile.trainingProgram}`);
    if (profile.cardioType) parts.push(`Cardio: ${profile.cardioType}`);
    if (profile.flexibilityWork) parts.push(`Flexibility: ${profile.flexibilityWork}`);
    sections.push(`## Training\n${parts.join('\n')}`);
  }

  if (profile.meals || profile.restrictions || profile.supplements || profile.mealPattern) {
    const parts = [];
    // Meal pattern - which meals the user typically eats
    if (profile.mealPattern && Array.isArray(profile.mealPattern)) {
      const mealLabels = {
        breakfast: 'Breakfast',
        morningSnack: 'Morning Snack',
        lunch: 'Lunch',
        afternoonSnack: 'Afternoon Snack',
        dinner: 'Dinner',
        eveningSnack: 'Evening Snack/Dessert',
        snacks: 'Snacks',
        dessert: 'Dessert/Other',
      };
      const mealNames = profile.mealPattern.map(m => mealLabels[m] || m);
      parts.push(`Daily meals: ${mealNames.join(', ')}`);
    }
    if (profile.meals) parts.push(`Typical meals: ${profile.meals}`);
    if (profile.goToMeals) parts.push(`Go-to meals: ${profile.goToMeals}`);
    if (profile.favoriteFoods) parts.push(`Favorites: ${profile.favoriteFoods}`);
    if (profile.restrictions) parts.push(`Restrictions: ${profile.restrictions}`);
    if (profile.proteinDistribution) parts.push(`Protein distribution: ${profile.proteinDistribution}`);
    if (profile.mealTiming) parts.push(`Meal timing: ${profile.mealTiming}`);
    if (profile.prePostWorkoutNutrition) parts.push(`Pre/post workout: ${profile.prePostWorkoutNutrition}`);
    if (profile.processedFood) parts.push(`Processed food: ${profile.processedFood}`);
    if (profile.micronutrients) parts.push(`Micronutrients: ${profile.micronutrients}`);
    if (profile.supplements) parts.push(`Supplements: ${profile.supplements}`);
    if (profile.foodQuality) parts.push(`Food quality: ${profile.foodQuality}`);
    sections.push(`## Nutrition\n${parts.join('\n')}`);
  }

  if (profile.sleepQuality || profile.sleepHoursWeekday) {
    const parts = [];
    if (profile.sleepQuality) parts.push(`Quality: ${profile.sleepQuality}/10`);
    if (profile.sleepHoursWeekday) parts.push(`Weekday sleep: ${profile.sleepHoursWeekday} hrs`);
    if (profile.sleepHoursWeekend) parts.push(`Weekend sleep: ${profile.sleepHoursWeekend} hrs`);
    if (profile.sleepConsistency) parts.push(`Consistency: ${profile.sleepConsistency}`);
    if (profile.sleepDisruptions) parts.push(`Disruptions: ${profile.sleepDisruptions}`);
    if (profile.preSleepHabits) parts.push(`Pre-sleep habits: ${profile.preSleepHabits}`);
    if (profile.naps) parts.push(`Naps: ${profile.naps}`);
    sections.push(`## Sleep & Recovery\n${parts.join('\n')}`);
  }

  if (profile.stressLevel || profile.mentalHealth) {
    const parts = [];
    if (profile.stressLevel) parts.push(`Stress level: ${profile.stressLevel}`);
    if (profile.mentalHealth) parts.push(`Mental health: ${profile.mentalHealth}`);
    if (profile.stressManagement) parts.push(`Management: ${profile.stressManagement}`);
    if (profile.lifeStressors) parts.push(`Stressors: ${profile.lifeStressors}`);
    if (profile.recoveryPractices) parts.push(`Recovery practices: ${profile.recoveryPractices}`);
    sections.push(`## Stress & Mental Health\n${parts.join('\n')}`);
  }

  if (profile.waterIntake || profile.sweatRate) {
    const parts = [];
    if (profile.waterIntake) parts.push(`Daily intake: ${profile.waterIntake}`);
    if (profile.sweatRate) parts.push(`Sweat rate: ${profile.sweatRate}`);
    if (profile.hydrationHabits) parts.push(`Habits: ${profile.hydrationHabits}`);
    if (profile.workoutHydration) parts.push(`Workout hydration: ${profile.workoutHydration}`);
    if (profile.electrolytes) parts.push(`Electrolytes: ${profile.electrolytes}`);
    if (profile.alcohol) parts.push(`Alcohol: ${profile.alcohol}`);
    sections.push(`## Hydration\n${parts.join('\n')}`);
  }

  if (profile.activityLevel || profile.dailySteps) {
    const parts = [];
    if (profile.activityLevel) parts.push(`Activity level: ${profile.activityLevel}`);
    if (profile.dailySteps) parts.push(`Daily steps: ${profile.dailySteps}`);
    if (profile.wakeTime) parts.push(`Wake time: ${profile.wakeTime}`);
    if (profile.bedTime) parts.push(`Bedtime: ${profile.bedTime}`);
    if (profile.workHours) parts.push(`Work hours: ${profile.workHours}`);
    if (profile.availableTime) parts.push(`Available time: ${profile.availableTime}`);
    if (profile.commute) parts.push(`Commute: ${profile.commute}`);
    if (profile.hobbies) parts.push(`Hobbies & interests: ${profile.hobbies}`);
    sections.push(`## Lifestyle\n${parts.join('\n')}`);
  }

  if (profile.motivation || profile.adherencePatterns) {
    const parts = [];
    if (profile.motivation) parts.push(`Motivation: ${profile.motivation}`);
    if (profile.adherencePatterns) parts.push(`Adherence: ${profile.adherencePatterns}`);
    if (profile.pastAttempts) parts.push(`Past attempts: ${profile.pastAttempts}`);
    if (profile.socialEating) parts.push(`Social eating: ${profile.socialEating}`);
    if (profile.mealPrep) parts.push(`Meal prep: ${profile.mealPrep}`);
    if (profile.foodRelationship) parts.push(`Food relationship: ${profile.foodRelationship}`);
    sections.push(`## Behavioral\n${parts.join('\n')}`);
  }

  const extras = ['extraPersonal', 'extraLifestyle', 'extraSleep', 'extraStress', 'extraHydration', 'extraTraining', 'extraNutrition', 'extraBehavioral', 'extraGoals']
    .filter(k => profile[k] && profile[k] !== '<br>' && profile[k] !== '<div><br></div>')
    .map(k => profile[k].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (extras.length > 0) {
    sections.push(`## Additional Notes\n${extras.join('\n')}`);
  }

  // Include previous observations from notes
  if (notes && Object.keys(notes).length > 0) {
    const noteParts = [];
    for (const [section, entries] of Object.entries(notes)) {
      if (entries && entries.length > 0) {
        for (const entry of entries) {
          noteParts.push(`- [${section}] (${new Date(entry.date).toLocaleDateString()}): ${entry.text}`);
        }
      }
    }
    if (noteParts.length > 0) {
      sections.push(`## Previous Observations\nThese are notes you've saved from prior conversations:\n${noteParts.join('\n')}`);
    }
  }

  // Include learned insights about the user
  if (learnedInsights && learnedInsights.length > 0) {
    const categoryLabels = {
      health: 'Health & Medical',
      lifestyle: 'Lifestyle',
      preference: 'Preferences',
      context: 'Context',
    };

    const grouped = {};
    for (const insight of learnedInsights) {
      const cat = insight.category || 'context';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(insight);
    }

    const insightParts = [];
    insightParts.push('## What I\'ve Learned About This User');
    insightParts.push('These are things I\'ve learned about the user from previous conversations. Use this to personalize advice.\n');

    for (const [category, insights] of Object.entries(grouped)) {
      insightParts.push(`**${categoryLabels[category] || 'Other'}:**`);
      for (const insight of insights) {
        insightParts.push(`- ${insight.text}`);
      }
      insightParts.push('');
    }

    sections.push(insightParts.join('\n'));
  }

  // Include weekly check-in history
  if (checkIns && checkIns.length > 0) {
    const checkInParts = checkIns.map(c => {
      const parts = [`Week of ${c.weekOf}:`];
      if (c.weight) parts.push(`Weight: ${c.weight} lbs`);
      if (c.milesRun) parts.push(`Miles run: ${c.milesRun}`);
      if (c.weeklyMileage) parts.push(`Weekly mileage: ${c.weeklyMileage}`);
      if (c.strengthSessions) parts.push(`Strength sessions: ${c.strengthSessions}`);
      if (c.energy) parts.push(`Energy: ${c.energy}/10`);
      if (c.sleepQuality) parts.push(`Sleep quality: ${c.sleepQuality}/10`);
      if (c.stress) parts.push(`Stress: ${c.stress}/10`);
      // Include reflections
      const reflections = Object.entries(c)
        .filter(([k, v]) => k.endsWith('Reflection') && v)
        .map(([k, v]) => `${k.replace('Reflection', '')}: ${v}`);
      if (reflections.length > 0) parts.push(...reflections);
      if (c.openReflection) parts.push(`Notes: ${c.openReflection}`);
      return parts.join(' | ');
    });
    sections.push(`## Weekly Check-In History\nRecent check-ins from the user (most recent first). Use this to understand their progress and provide personalized advice:\n${checkInParts.join('\n')}`);
  }

  // Include the user's current playbook
  if (playbook) {
    const playbookParts = [];
    playbookParts.push('## Current Playbook');
    playbookParts.push('This is the user\'s personalized action plan. Items are numbered [0], [1], [2], etc.');
    playbookParts.push('When editing or removing items, use these index numbers in your PLAYBOOK_SUGGESTION.\n');

    if (playbook.summary) {
      playbookParts.push(`**Big Picture Summary:**\n${playbook.summary}\n`);
    }

    if (playbook.principles && playbook.principles.length > 0) {
      playbookParts.push('**Key Principles:**');
      playbook.principles.forEach((p, i) => {
        playbookParts.push(`[${i}] ${p.text}${p.why ? ` (Why: ${p.why})` : ''}`);
      });
      playbookParts.push('');
    }

    if (playbook.weeklyFocus && playbook.weeklyFocus.length > 0) {
      playbookParts.push('**This Week\'s Focus:**');
      playbook.weeklyFocus.forEach((f, i) => {
        playbookParts.push(`[${i}] ${f.action}${f.context ? ` (Context: ${f.context})` : ''}`);
      });
      playbookParts.push('');
    }

    if (playbook.radar && playbook.radar.length > 0) {
      playbookParts.push('**On Your Radar (Future Considerations):**');
      playbook.radar.forEach((r, i) => {
        playbookParts.push(`[${i}] ${r.suggestion}${r.timing ? ` (Timing: ${r.timing})` : ''}`);
      });
      playbookParts.push('');
    }

    sections.push(playbookParts.join('\n'));
  }

  // Include pending suggestions awaiting user approval
  if (pendingSuggestions && pendingSuggestions.length > 0) {
    const pendingParts = [];
    pendingParts.push('## Pending Playbook Suggestions');
    pendingParts.push('These suggestions are awaiting user approval. Do not duplicate them.\n');
    pendingSuggestions.forEach(s => {
      pendingParts.push(`- [${s.action}] ${s.section}: "${s.content?.text}" (Status: pending)`);
    });
    sections.push(pendingParts.join('\n'));
  }

  // Include grocery data if available
  if (groceryData && groceryData.allItems && groceryData.allItems.length > 0) {
    const groceryParts = [];
    groceryParts.push('## Grocery Shopping Data');
    groceryParts.push('This is data from the user\'s uploaded grocery orders. Use this to personalize nutrition advice and answer questions about their shopping habits.\n');

    // Summary stats
    groceryParts.push(`**Total Orders:** ${groceryData.orders?.length || 0}`);
    groceryParts.push(`**Unique Items Tracked:** ${groceryData.allItems.length}`);
    groceryParts.push(`**Last analyzed:** ${groceryData.lastAnalyzed ? new Date(groceryData.lastAnalyzed).toLocaleDateString() : 'Not yet analyzed'}`);
    groceryParts.push('');

    // Frequent items with more detail
    const frequentItems = groceryData.allItems
      .sort((a, b) => b.count - a.count)
      .slice(0, 25);
    if (frequentItems.length > 0) {
      groceryParts.push('**Frequently Purchased Items (with purchase count):**');
      frequentItems.forEach(item => {
        groceryParts.push(`- ${item.name} (${item.count}x)${item.category ? ` [${item.category}]` : ''}`);
      });
      groceryParts.push('');
    }

    // Recent orders with items
    if (groceryData.orders && groceryData.orders.length > 0) {
      groceryParts.push('**Recent Orders (last 5):**');
      groceryData.orders.slice(0, 5).forEach(order => {
        const date = new Date(order.date).toLocaleDateString();
        groceryParts.push(`- ${date} (${order.source}): ${order.items.slice(0, 10).join(', ')}${order.items.length > 10 ? ` ... and ${order.items.length - 10} more` : ''}`);
      });
      groceryParts.push('');
    }

    // Category breakdown
    if (groceryData.patterns?.categoryBreakdown) {
      groceryParts.push('**Shopping Category Distribution:**');
      Object.entries(groceryData.patterns.categoryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, pct]) => {
          groceryParts.push(`- ${cat}: ${pct}%`);
        });
      groceryParts.push('');
    }

    // Analysis results if available
    if (groceryData.recommendations) {
      const recs = groceryData.recommendations;
      if (recs.potentialGaps && recs.potentialGaps.length > 0) {
        groceryParts.push('**Identified Nutritional Gaps:**');
        recs.potentialGaps.forEach(gap => {
          groceryParts.push(`- ${gap.gap}: ${gap.suggestion}`);
        });
        groceryParts.push('');
      }
      if (recs.smartSwaps && recs.smartSwaps.length > 0) {
        groceryParts.push('**Suggested Swaps:**');
        recs.smartSwaps.forEach(swap => {
          groceryParts.push(`- ${swap.current} → ${swap.suggestion} (${swap.reason})`);
        });
        groceryParts.push('');
      }
      if (recs.cartSuggestions && recs.cartSuggestions.length > 0) {
        groceryParts.push('**Suggested Additions:**');
        recs.cartSuggestions.forEach(sug => {
          groceryParts.push(`- ${sug.item}: ${sug.reason}`);
        });
        groceryParts.push('');
      }
    }

    // Habits formed (positive reinforcement)
    if (groceryData.habitsFormed && groceryData.habitsFormed.length > 0) {
      groceryParts.push('**Healthy Habits Formed (celebrate these!):**');
      groceryData.habitsFormed.forEach(habit => {
        groceryParts.push(`- ${habit.text}`);
      });
      groceryParts.push('');
    }

    // Recent wins
    if (groceryData.wins && groceryData.wins.length > 0) {
      groceryParts.push('**Recent Wins:**');
      groceryData.wins.slice(0, 5).forEach(win => {
        groceryParts.push(`- ${win.text}`);
      });
      groceryParts.push('');
    }

    groceryParts.push('You can use this data to:');
    groceryParts.push('- Answer questions about what they\'ve been buying');
    groceryParts.push('- Suggest additions to their grocery list based on goals');
    groceryParts.push('- Identify if they\'re buying enough protein sources, vegetables, etc.');
    groceryParts.push('- Celebrate when they\'re consistently buying healthy items');

    sections.push(groceryParts.join('\n'));
  }

  // Include recent activity logs (quick entries)
  if (activityLogs && activityLogs.length > 0) {
    const activityParts = [];
    activityParts.push('## Recent Activity Logs');
    activityParts.push('These are quick entries the user logged this week. Reference them when relevant - they\'ve already told you this, so don\'t ask again!\n');

    activityLogs.slice(0, 15).forEach(log => {
      const date = new Date(log.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      let details = log.summary || log.rawText;
      if (log.data) {
        const dataPoints = [];
        if (log.data.distance) dataPoints.push(`${log.data.distance} miles`);
        if (log.data.pace) dataPoints.push(`pace: ${log.data.pace}`);
        if (log.data.duration) dataPoints.push(`${log.data.duration} min`);
        if (log.data.weight) dataPoints.push(`${log.data.weight} lbs`);
        if (log.data.feeling) dataPoints.push(`felt ${log.data.feeling}`);
        if (log.data.pr) dataPoints.push(`PR: ${log.data.prValue || 'yes'}`);
        if (dataPoints.length > 0) details += ` (${dataPoints.join(', ')})`;
      }
      activityParts.push(`- [${date}] ${log.type}${log.subType ? `/${log.subType}` : ''}: ${details}`);
    });

    activityParts.push('\nUse this data to:');
    activityParts.push('- Track their progress on weekly focus items');
    activityParts.push('- Reference past activities in conversation');
    activityParts.push('- Celebrate consistency and PRs');
    activityParts.push('- Avoid asking about things they already logged');

    sections.push(activityParts.join('\n'));
  }

  // Include Daily Nutritional Profile if unlocked
  if (nutritionProfile && !nutritionProfile.needsAnalysis) {
    const nutritionParts = [];
    nutritionParts.push('## Daily Nutritional Profile');
    nutritionParts.push('The user completed 5 days of meal tracking. Use this to personalize all nutrition advice.\n');

    // Overview
    if (nutritionProfile.overview) {
      nutritionParts.push('**Estimated Daily Intake:**');
      nutritionParts.push(`- Calories: ${nutritionProfile.overview.estimatedDailyCalories || '~2,000'}`);
      nutritionParts.push(`- Protein: ${nutritionProfile.overview.proteinEstimate || '~80g'}`);
      nutritionParts.push(`- Carbs: ${nutritionProfile.overview.carbEstimate || '~250g'}`);
      nutritionParts.push(`- Fats: ${nutritionProfile.overview.fatEstimate || '~70g'}`);
      nutritionParts.push('');
    }

    // Meal patterns
    if (nutritionProfile.mealPatterns) {
      nutritionParts.push('**Typical Meals:**');
      Object.entries(nutritionProfile.mealPatterns).forEach(([meal, data]) => {
        if (data.typical && data.typical.length > 0) {
          nutritionParts.push(`- ${meal.charAt(0).toUpperCase() + meal.slice(1)}: ${data.typical.slice(0, 2).join('; ')}`);
        }
      });
      nutritionParts.push('');
    }

    // Strengths
    if (nutritionProfile.strengths && nutritionProfile.strengths.length > 0) {
      nutritionParts.push('**Identified Strengths:**');
      nutritionProfile.strengths.forEach(s => nutritionParts.push(`- ${s}`));
      nutritionParts.push('');
    }

    // Gaps
    if (nutritionProfile.gaps && nutritionProfile.gaps.length > 0) {
      nutritionParts.push('**Areas for Improvement:**');
      nutritionProfile.gaps.forEach(g => nutritionParts.push(`- ${g}`));
      nutritionParts.push('');
    }

    nutritionParts.push('Reference this profile when discussing nutrition, suggesting meals, or answering food-related questions.');
    sections.push(nutritionParts.join('\n'));
  }

  // Include calibration progress if still in progress
  if (nutritionCalibration && !nutritionCalibration.isComplete && nutritionCalibration.inPeriod) {
    const calParts = [];
    calParts.push('## Nutrition Calibration In Progress');
    calParts.push(`The user is tracking meals for their first week (${nutritionCalibration.completed}/5 days complete).`);
    calParts.push('When they mention meals, encourage them to log it in their calibration tracker.');

    // Show what they've logged so far
    if (nutritionCalibration.days) {
      const completedDays = Object.entries(nutritionCalibration.days)
        .filter(([_, data]) => data.completed)
        .map(([day, data]) => `${day}: breakfast (${data.breakfast ? 'logged' : 'empty'}), lunch (${data.lunch ? 'logged' : 'empty'}), dinner (${data.dinner ? 'logged' : 'empty'})`);
      if (completedDays.length > 0) {
        calParts.push('\n**Completed days:**');
        completedDays.forEach(d => calParts.push(`- ${d}`));
      }
    }

    sections.push(calParts.join('\n'));
  }

  return sections.join('\n\n');
}

// Demo responses for testing without API key
const DEMO_RESPONSES = [
  {
    keywords: ['protein', 'how much', 'need'],
    response: `Based on your profile, I'd recommend aiming for about 1.6-2.2g of protein per kg of bodyweight daily [1]. This range is optimal for muscle protein synthesis, especially if you're doing resistance training.

For practical implementation:
- Spread protein intake across 4-5 meals
- Aim for 25-40g per meal to maximize muscle protein synthesis [2]
- Include a protein source within 2 hours post-workout

[[CITATIONS]]
[1] Dietary Protein for Athletes | Phillips & Van Loon, 2011 | "Protein intakes of 1.3-1.8 g/kg/day are sufficient to maintain nitrogen balance in athletes" | Journal of Sports Sciences | 10.1080/02640414.2011.619204
[2] Protein Dose-Response | Moore et al., 2009 | "Ingestion of 20-25g of high-quality protein is sufficient to maximally stimulate muscle protein synthesis" | American Journal of Clinical Nutrition | 10.3945/ajcn.2008.26401
[[/CITATIONS]]`
  },
  {
    keywords: ['sleep', 'better', 'improve', 'tired'],
    response: `Sleep quality has a huge impact on recovery and performance. Here are evidence-based strategies:

**Sleep Hygiene Fundamentals:**
1. **Consistent schedule** - Keep wake times within 30 min daily, even weekends [1]
2. **Cool room** - Aim for 65-68°F (18-20°C) for optimal sleep [2]
3. **Light exposure** - Get bright light within 30 min of waking, dim lights 2 hours before bed

**Pre-sleep Routine:**
- Stop caffeine 8-10 hours before bed
- Limit screens 1 hour before sleep (or use night mode)
- Consider magnesium glycinate (200-400mg) if deficient [3]

[[CITATIONS]]
[1] Sleep Regularity and Health | Phillips et al., 2017 | "Irregular sleep patterns are associated with poorer academic performance, delayed circadian rhythms, and metabolic dysfunction" | Scientific Reports | 10.1038/s41598-017-03171-4
[2] Temperature and Sleep | Okamoto-Mizuno & Mizuno, 2012 | "Thermal environment is one of the most important factors affecting sleep" | Journal of Physiological Anthropology | 10.1186/1880-6805-31-14
[3] Magnesium and Sleep | Abbasi et al., 2012 | "Magnesium supplementation improved subjective measures of insomnia, sleep efficiency, and sleep onset latency" | Journal of Research in Medical Sciences | PMID: 23853635
[[/CITATIONS]]`
  },
  {
    keywords: ['workout', 'routine', 'exercise', 'training', 'program'],
    response: `For building an effective workout routine, the research points to several key principles:

**Training Frequency:**
Training each muscle group 2x per week produces superior hypertrophy compared to 1x per week [1]. This can be achieved through:
- Upper/Lower split (4 days)
- Push/Pull/Legs (6 days)
- Full body (3 days)

**Volume & Intensity:**
- Aim for 10-20 hard sets per muscle group per week [2]
- Train 2-3 reps shy of failure for most sets
- Progressive overload is key - add weight, reps, or sets over time

**Recovery:**
- 48-72 hours between training the same muscle group
- Sleep and nutrition matter as much as the workout itself

[[CITATIONS]]
[1] Training Frequency for Hypertrophy | Schoenfeld et al., 2016 | "Training a muscle group twice per week is superior to once per week for maximizing muscle growth" | Sports Medicine | 10.1007/s40279-016-0543-8
[2] Resistance Training Volume | Schoenfeld & Grgic, 2018 | "Evidence suggests a graded dose-response relationship between volume and hypertrophy, with higher volumes providing greater gains" | Journal of Strength and Conditioning Research | 10.1519/JSC.0000000000002389
[[/CITATIONS]]`
  },
  {
    keywords: ['weight', 'lose', 'fat', 'diet', 'calories'],
    response: `For sustainable fat loss, the evidence strongly supports a moderate caloric deficit combined with adequate protein:

**Caloric Deficit:**
A deficit of 300-500 calories/day is optimal for fat loss while preserving muscle mass [1]. Larger deficits increase muscle loss risk.

**Protein Priority:**
During a deficit, protein needs actually *increase* to ~2.3-3.1g/kg of lean body mass to preserve muscle [2].

**Practical Approach:**
- Track intake for 1-2 weeks to establish baseline
- Reduce by 300-500 kcal from maintenance
- Prioritize protein at each meal
- Maintain resistance training to preserve muscle
- Aim for 0.5-1% bodyweight loss per week

[[CITATIONS]]
[1] Rate of Weight Loss and Body Composition | Garthe et al., 2011 | "Slow rate of weight loss (0.7% BW/week) preserved lean body mass and increased strength compared to fast rate (1.4% BW/week)" | International Journal of Sport Nutrition and Exercise Metabolism | 10.1123/ijsnem.21.2.97
[2] Protein During Energy Restriction | Helms et al., 2014 | "Protein intakes of 2.3-3.1 g/kg FFM are recommended for lean athletes during caloric restriction" | International Journal of Sport Nutrition and Exercise Metabolism | 10.1123/ijsnem.2013-0054
[[/CITATIONS]]`
  }
];

function getDemoResponse(userMessage) {
  const lower = userMessage.toLowerCase();
  for (const demo of DEMO_RESPONSES) {
    if (demo.keywords.some(kw => lower.includes(kw))) {
      return demo.response;
    }
  }
  // Default response
  return `That's a great question! As your health advisor, I'm here to provide personalized, evidence-based guidance.

Based on your profile, I can help with:
- **Nutrition** - protein intake, meal timing, supplements
- **Training** - workout programming, recovery, progressive overload
- **Sleep** - optimizing sleep quality and duration
- **Weight management** - sustainable approaches to fat loss or muscle gain

Try asking something specific like:
- "How much protein do I need?"
- "How can I improve my sleep?"
- "What's a good workout routine for me?"

[[CITATIONS]]
[1] Personalized Nutrition | Zeevi et al., 2015 | "Individuals vary in their glycemic responses to identical meals, highlighting the need for personalized dietary recommendations" | Cell | 10.1016/j.cell.2015.11.001
[[/CITATIONS]]`;
}

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { messages, profile, notes, checkIns, playbook, pendingSuggestions, groceryData, activityLogs, nutritionProfile, nutritionCalibration, learnedInsights } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Demo mode when no API key
  if (!apiKey) {
    const userMessage = messages[messages.length - 1]?.content || '';
    const demoResponse = getDemoResponse(userMessage);

    // Simulate streaming with chunks
    const words = demoResponse.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(' ') + ' ';
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      await new Promise(r => setTimeout(r, 30));
    }
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  const client = new Anthropic({ apiKey });
  const systemPrompt = buildSystemPrompt(profile || {}, notes || {}, checkIns || [], playbook || null, pendingSuggestions || [], groceryData || null, activityLogs || [], nutritionProfile || null, nutritionCalibration || null, learnedInsights || []);

  console.log('--- API Request ---');
  console.log('Messages count:', messages.length);
  console.log('Last message:', messages[messages.length - 1]?.content?.substring(0, 100));
  console.log('System prompt length:', systemPrompt.length);

  try {
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    console.log('Stream created successfully');

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
    console.log('Response completed successfully');
  } catch (err) {
    console.error('--- Anthropic API Error ---');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Error status:', err.status);
    console.error('Full error:', JSON.stringify(err, null, 2));
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

// Quick Entry - Smart logging that parses activity updates
app.post('/api/quick-entry', async (req, res) => {
  console.log('--- Quick Entry request ---');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { text, profile, playbook, weeklyProgress } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text input required' });
  }

  console.log('Quick entry:', text.substring(0, 100));

  // If no API key, return a basic response
  if (!apiKey) {
    return res.json({
      type: 'unknown',
      isQuestion: true,
      message: 'Got it! (Demo mode - API key required for smart parsing)',
      activity: null,
    });
  }

  const client = new Anthropic({ apiKey });

  // Build context about current weekly focus
  const weeklyFocusContext = playbook?.weeklyFocus
    ? playbook.weeklyFocus.map((f, i) => {
        const progress = weeklyProgress?.[i];
        if (progress?.trackable) {
          return `[${i}] "${f.action}" - Progress: ${progress.current}/${progress.target}`;
        }
        return `[${i}] "${f.action}"`;
      }).join('\n')
    : 'No weekly focus items';

  // Build playbook context for edit detection
  const playbookContext = playbook ? `
Current Playbook:
- Key Principles: ${playbook.principles?.map((p, i) => `[${i}] ${p.text}`).join('; ') || 'None'}
- This Week's Focus: ${playbook.weeklyFocus?.map((f, i) => `[${i}] ${f.action}`).join('; ') || 'None'}
- On Your Radar: ${playbook.radar?.map((r, i) => `[${i}] ${r.suggestion}`).join('; ') || 'None'}
- Big Picture Summary: ${playbook.summary || 'None'}
` : '';

  const profileContext = profile ? `
Current Profile:
- Weight: ${profile.weight || 'Not set'} lbs
- Goals: ${(profile.goals || []).join(', ') || 'None'}
- Preferences: ${profile.preferences || 'None'}
` : '';

  const parsePrompt = `You are a health advisor parsing a quick entry from a user. Determine the intent:

1. ACTIVITY LOG (workout, meal, sleep, weight, etc.) - parse and store
2. PLAYBOOK EDIT (change/update/remove/add to playbook items) - generate suggestion
3. PROFILE EDIT (update weight, goals, preferences) - generate suggestion
4. QUESTION (needs a conversational answer) - route to chat

User's input: "${text}"

User's goals: ${(profile?.goals || []).join(', ') || 'General health'}

Current This Week's Focus:
${weeklyFocusContext}
${playbookContext}
${profileContext}
---

Respond with JSON based on the detected intent:

FOR ACTIVITY LOGS:
{
  "intent": "activity",
  "isQuestion": false,
  "type": "workout|nutrition|sleep|weight|hydration|general",
  "subType": "run|strength|cardio|yoga|walk|other" (for workouts only),
  "activity": {
    "summary": "Brief summary for display - ONLY include what user explicitly said",
    "data": {
      "distance": 2.0, "pace": "9:30", "duration": 45,
      "feeling": null,  // ONLY set if user explicitly mentioned how they felt
      "weight": 182, "hitProteinGoal": true,
      "quality": null,  // ONLY set if user explicitly mentioned quality
      "hours": 7.5,
      "exercise": "bench press", "pr": true, "prValue": "185 lbs",
      "notes": "any additional context the user explicitly provided"
    },
    "goalConnections": [0, 2],
    "nutritionPlacement": {  // ONLY for type: "nutrition"
      "mealType": "breakfast|morningSnack|lunch|afternoonSnack|dinner|eveningSnack|null",
      "confidence": "high|medium|low",
      "reason": "Why this meal type was chosen",
      "requiresUserConfirmation": true/false,
      "isExplicitOverwrite": true/false  // true if user explicitly said "replace", "change to", etc.
    }
  },
  "response": {
    "message": "Encouraging response",
    "progressUpdate": "1 of 3 runs done this week!",
    "clarifyingQuestion": "How did that feel?" // Ask ONLY if feeling was not provided
  },
  "needsClarification": true/false  // true if user didn't mention how they felt
}

NUTRITION PLACEMENT RULES (CRITICAL):
- For nutrition entries, ALWAYS include nutritionPlacement object

MEAL TYPE DETECTION - EXPLICIT KEYWORDS (HIGH CONFIDENCE - auto-place):

BREAKFAST (auto-place when ANY of these appear):
- "breakfast", "for breakfast", "at breakfast", "breakfast was", "had for breakfast"
- "morning meal" (NOT just "morning" or "this morning" - those are ambiguous!)

LUNCH (auto-place when ANY of these appear):
- "lunch", "for lunch", "at lunch", "lunch was", "had for lunch", "lunch break"
- "midday", "noon", "at noon", "around noon", "12pm", "1pm" + food context

DINNER (auto-place when ANY of these appear):
- "dinner", "for dinner", "at dinner", "dinner was", "had for dinner", "supper"
- "evening meal", "tonight I had", "tonight I ate", "this evening" + food
- "6pm", "7pm", "8pm" + food context

SNACK (auto-place when ANY of these appear):
- "snack", "snacked on", "had a snack", "quick bite", "between meals"
- "mid-morning snack", "mid-afternoon snack", "afternoon snack", "morning snack"
- "late night snack", "before bed snack", "munchies", "grabbed a"
- "before breakfast" (explicitly a snack BEFORE breakfast)
- "pre-breakfast", "post-lunch snack", "post-dinner snack"

DESSERT (auto-place when ANY of these appear):
- "dessert", "for dessert", "after dinner treat", "sweet treat"

AMBIGUOUS - REQUIRES CLARIFICATION (confidence: low):
- "this morning" WITHOUT explicit meal keyword (could be snack before breakfast OR breakfast)
- "woke up and had", "first thing I ate", "started the day with"
- "before work" (could be any morning meal or snack)
- Time stamps 6am-9am without meal keyword (ambiguous morning)
- No meal keywords AND no time keywords at all

CRITICAL: "this morning" alone is NOT breakfast!
- "this morning I had a smoothie" → LOW confidence, ASK (could be pre-breakfast snack)
- "for breakfast this morning I had a smoothie" → HIGH confidence, breakfast (explicit "for breakfast")
- "breakfast this morning was oatmeal" → HIGH confidence, breakfast (explicit "breakfast")

CONFIDENCE LEVELS:
- high: Explicit meal keyword present ("for lunch", "breakfast was", "dinner tonight", "had a snack")
- medium: Clear time indicator without ambiguity ("at noon" = lunch, "8pm" = dinner)
- low: Morning context without explicit meal keyword, OR no indicators at all

requiresUserConfirmation: true ONLY if confidence is "low"
isExplicitOverwrite: true ONLY if user said "replace", "change to", "update to", "instead of"

EXAMPLES:
- "for lunch I had a sandwich" → mealType: "lunch", confidence: "high", requiresUserConfirmation: false
- "breakfast was eggs" → mealType: "breakfast", confidence: "high", requiresUserConfirmation: false
- "this morning I had yogurt" → mealType: null, confidence: "low", requiresUserConfirmation: true
- "had a protein shake" → mealType: null, confidence: "low", requiresUserConfirmation: true
- "at noon I grabbed a salad" → mealType: "lunch", confidence: "high", requiresUserConfirmation: false
- "before breakfast I had a smoothie" → mealType: "morningSnack", confidence: "high", requiresUserConfirmation: false

CRITICAL - NO HALLUCINATION RULES:
- NEVER add feelings the user didn't mention ("felt good", "felt strong", etc.)
- NEVER add details the user didn't provide
- If user said "back squat 190 for 6 reps" and nothing else:
  - summary: "back squat 190 lbs for 6 reps" (exactly what they said)
  - feeling: null (NOT "good" or any other assumed feeling)
  - needsClarification: true (so we can ask how it felt)
- ONLY include data fields that user explicitly mentioned
- If in doubt, leave the field null and set needsClarification: true

PREFERENCE vs ACTIVITY - CRITICAL DISTINCTION:
- Dietary preferences, allergies, supplement choices are PROFILE EDITS, NOT activities
- Examples that are PROFILE EDITS (use intent: "profileEdit"):
  - "I'm lactose intolerant" → profile preference
  - "I use pea protein instead of whey" → profile preference
  - "I prefer Vega Sport protein powder" → profile preference
  - "I can't eat dairy" → profile preference
- Examples that ARE activities (use intent: "activity"):
  - "Had 30g protein shake" → nutrition activity
  - "Hit my protein goal today" → nutrition activity
  - "Bench pressed 185 lbs" → workout activity

GOAL CONNECTIONS - STRICT TYPE MATCHING (CRITICAL):
- goalConnections should ONLY include focus item indices where BOTH conditions are met:
  1. Activity TYPE matches goal TYPE (workout→workout, nutrition→nutrition, sleep→sleep)
  2. Activity CONTENT matches goal CONTENT (running matches running goals, protein shake matches protein goals)

- STRICT RULES:
  - Workout activities (squat, bench, deadlift, run) → ONLY connect to WORKOUT/EXERCISE goals
  - Nutrition activities (meals, protein, food) → ONLY connect to NUTRITION/FOOD goals
  - Sleep activities → ONLY connect to SLEEP goals

- EXAMPLES OF WRONG MATCHING (NEVER DO THIS):
  - "Back squat 190 lbs" should NOT connect to "Add Vega protein powder" (workout ≠ nutrition)
  - "Bench press 185 lbs" should NOT connect to "Eat more protein" (workout ≠ nutrition)
  - "Ran 3 miles" should NOT connect to "Sleep 8 hours" (workout ≠ sleep)

- EXAMPLES OF CORRECT MATCHING:
  - "Back squat 190 lbs" → connects to "Strength train 3x this week" (both are workouts)
  - "Had a scoop of Vega protein" → connects to "Add Vega protein powder daily" (both nutrition, same product)
  - "Ran 3 miles" → connects to "Run 15 miles this week" (both are running)
  - "Hit protein goal today" → connects to "Hit 150g protein daily" (both nutrition, protein-related)

- When in doubt, use goalConnections: [] (empty array) - it's better to NOT connect than to connect incorrectly
- NEVER connect preference/profile information to focus goals

FOR TARGET-ONLY UPDATES (changing how many times per week for a focus item WITHOUT changing the text):
When user says "increase focus 1 to 4 times" / "change target for item 2 to 5" / "set protein goal to 5x per week":
{
  "intent": "targetUpdate",
  "isQuestion": false,
  "type": "general",
  "targetUpdate": {
    "index": 0,  // 0-based index of the focus item
    "target": 4  // New target number
  },
  "response": {
    "message": "Updated target to 4 times per week"
  }
}
IMPORTANT: Use targetUpdate (not playbookEdit) when the user ONLY wants to change the number/frequency, not the wording of the focus item.

FOR PLAYBOOK EDITS (change wording/content/remove/add focus items, principles, radar, summary):
{
  "intent": "playbookEdit",
  "isQuestion": false,
  "type": "general",
  "playbookSuggestion": {
    "section": "weeklyFocus|principles|radar|summary",
    "action": "add|edit|remove",
    "index": 0,  // 0-based index for edit/remove (REQUIRED)
    "content": {
      "text": "The new content",
      "why": "Reason (for principles)",
      "context": "Context (for weeklyFocus/radar)"
    },
    "rationale": "Why this change makes sense"
  },
  "response": {
    "message": "Brief confirmation of what will be changed"
  }
}

FOR PROFILE EDITS (update weight, goals, preferences):
{
  "intent": "profileEdit",
  "isQuestion": false,
  "type": "general",
  "profileSuggestion": {
    "field": "weight|goals|preferences|etc",
    "value": "the new value",
    "rationale": "Why this is being updated"
  },
  "response": {
    "message": "Brief confirmation"
  }
}

FOR GROCERY SWAPS (user mentions switching/swapping products):
When user says "switched from X to Y", "swapped X for Y", "now buying X instead of Y", "replaced X with Y":
{
  "intent": "grocerySwap",
  "isQuestion": false,
  "type": "nutrition",
  "swap": {
    "originalProduct": "The old product they stopped buying",
    "newProduct": "The new healthier product they now buy",
    "reason": "Why they made the swap (if mentioned)",
    "category": "cereal|snacks|dairy|protein|beverages|bread|condiments|frozen|cooking|other"
  },
  "response": {
    "message": "Great swap! I've logged that you switched from [original] to [new].",
    "insight": "Optional encouraging insight about the swap"
  }
}

FOR QUESTIONS:
{
  "intent": "question",
  "isQuestion": true,
  "type": "question",
  "activity": null,
  "response": { "message": "I'll help you with that in chat!" }
}

DETECTION RULES:
- "Increase focus 1 to 4 times" / "Set target for item 2 to 5" / "Change the running goal to 4x per week" → targetUpdate (ONLY changes the number, not the text)
- "Change focus item 2 to..." / "Update the protein goal to say..." / "Remove the sleep recommendation" / "Reword focus 1 to..." → playbookEdit (changes the actual text/content)
- "I weigh 180 now" / "Update my weight to 180" → profileEdit (field: weight, value: 180)
- "I'm lactose intolerant" / "I use pea protein" / "I can't have dairy" / "I prefer plant-based" → profileEdit (field: preferences, NOT an activity!)
- "Ran 2 miles" / "Hit protein goal" / "Slept 8 hours" → activity
- "Switched from Cheerios to Catalina Crunch" / "Swapped regular soda for sparkling water" / "Now buying Greek yogurt instead of regular" / "Replaced white bread with Ezekiel bread" → grocerySwap
- "How much protein..." / "Should I..." / "What's the best..." → question

IMPORTANT DISTINCTION:
- If user wants to change HOW MANY times (frequency/target) → use targetUpdate
- If user wants to change WHAT the item says (wording/content) → use playbookEdit

INDEX RULES (CRITICAL):
- When user says "item 1" or "focus 1" or "#1", use index: 0 (0-based!)
- When user says "item 2" or "focus 2" or "#2", use index: 1
- When user says "first", use index: 0
- When user says "second", use index: 1
- Always match the item by checking the Current Playbook content above

Return ONLY valid JSON.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: parsePrompt }],
    });

    const content = response.content[0]?.text || '';
    console.log('Quick entry parse result:', content.substring(0, 300));

    try {
      let result;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(content);
      }

      res.json(result);
    } catch (parseErr) {
      console.error('Failed to parse quick entry JSON:', content);
      // Return as a question if parsing fails
      res.json({
        isQuestion: true,
        type: 'question',
        activity: null,
        response: { message: "I'll help you with that!" },
      });
    }
  } catch (err) {
    console.error('Quick entry error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Synthesize check-in entries into cohesive narratives
app.post('/api/synthesize-checkin', async (req, res) => {
  console.log('--- Check-in synthesis request ---');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { checkInData, activities, profile } = req.body;

  if (!apiKey) {
    // Return original data if no API key
    return res.json({ synthesized: checkInData });
  }

  const client = new Anthropic({ apiKey });

  // Sort activities by date (Monday first, then Tuesday, etc.)
  const sortedActivities = [...(activities || [])].sort((a, b) =>
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  // Group activities by day for cleaner formatting
  const activitiesByDay = {};
  sortedActivities.forEach(a => {
    const dayName = new Date(a.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
    if (!activitiesByDay[dayName]) activitiesByDay[dayName] = [];
    activitiesByDay[dayName].push(a);
  });

  // Format activities in chronological order
  const chronologicalActivities = Object.entries(activitiesByDay)
    .map(([day, acts]) => {
      const dayEntries = acts.map(a => {
        // ONLY include data that actually exists
        const parts = [a.summary || a.rawText];
        if (a.data?.feeling) parts.push(`(felt ${a.data.feeling})`);
        return parts.join(' ');
      }).join('; ');
      return `- ${day}: ${dayEntries}`;
    }).join('\n');

  // Build synthesis prompt
  const synthesisPrompt = `You are a supportive health coach synthesizing a user's weekly check-in data into well-written, cohesive paragraphs.

USER PROFILE:
- Name: ${profile?.name || 'User'}
- Goals: ${(profile?.goals || []).join(', ') || 'General health'}

RAW CHECK-IN DATA:
${JSON.stringify(checkInData, null, 2)}

ACTIVITY ENTRIES THIS WEEK (in chronological order, Monday to Sunday):
${chronologicalActivities || 'No activities logged'}

---

YOUR TASK:
Transform the raw check-in data into synthesized, readable narratives.

**CRITICAL RULES - NO HALLUCINATION:**
1. NEVER add feelings or details the user didn't provide
2. If user logged "back squat 190 for 6 reps" but didn't say how they felt, DO NOT add "felt good" or any feeling
3. Only include information that appears in the raw data above
4. If a feeling field is null/empty, do not mention feelings for that activity

**FORMAT RULES:**
1. CHRONOLOGICAL ORDER: Always start with Monday and work forward through the week
2. Use natural connectors: "On Monday...", "The next day...", "Later in the week...", "Midweek..."
3. Make it read like a journal entry, not bullet points
4. Combine related activities into flowing sentences

**EXAMPLE OF CORRECT OUTPUT:**
"On Monday, you did dumbbell bench press. On Tuesday, you back squatted 190 pounds for 6 reps. Later in the week, you ran 3 miles."

**EXAMPLE OF WRONG OUTPUT (includes hallucinated feelings):**
"On Monday, you did dumbbell bench press and felt strong. On Tuesday, you back squatted 190 pounds for 6 reps and felt great."
(Wrong because the user never said how they felt)

Return JSON with this structure:
{
  "synthesizedReflection": "A chronological paragraph summarizing their week (Monday to Sunday)...",
  "focusNarratives": {
    "0": "Synthesized narrative for focus item 0 (chronological)...",
    "1": "Synthesized narrative for focus item 1 (chronological)...",
  },
  "weekHighlight": "One sentence capturing the best thing about their week",
  "coachNote": "Brief encouraging note (1-2 sentences)"
}

REMEMBER:
- Chronological order (Monday → Sunday)
- NO hallucinated feelings or details
- Only include what the user actually logged
- Keep specific numbers and achievements

Return ONLY valid JSON.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: synthesisPrompt }],
    });

    const content = response.content[0]?.text || '';
    console.log('Synthesis result:', content.substring(0, 200));

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      res.json({ synthesized: result });
    } catch (parseErr) {
      console.error('Failed to parse synthesis JSON:', content);
      res.json({ synthesized: checkInData }); // Return original on error
    }
  } catch (err) {
    console.error('Synthesis error:', err.message);
    res.json({ synthesized: checkInData }); // Return original on error
  }
});

// Generate or update personalized playbook
app.post('/api/playbook', async (req, res) => {
  console.log('--- Playbook generation request ---');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { profile, checkIns, existingPlaybook } = req.body;

  if (!apiKey) {
    console.log('No API key configured');
    return res.status(500).json({ error: 'API key not configured' });
  }
  console.log('Generating playbook for:', profile?.name, existingPlaybook ? '(updating existing)' : '(new)');

  const client = new Anthropic({ apiKey });

  // Determine user's engagement level for customization
  const engagementLevel = profile?.onboardingDepth || 'moderate';
  const levelConfig = {
    chill: { focusGoals: '2-3', principles: '2-3', radar: '1-2', tone: 'Keep it simple and approachable. Focus on the highest-impact items only.' },
    moderate: { focusGoals: '3-4', principles: '3-4', radar: '2-3', tone: 'Balance detail with simplicity. Provide clear reasoning without overwhelming.' },
    hardcore: { focusGoals: '4-5', principles: '4-5', radar: '3-4', tone: 'Be comprehensive and detailed. Include specific metrics and advanced techniques.' },
  };
  const config = levelConfig[engagementLevel] || levelConfig.moderate;

  // Build context about the user
  const profileContext = buildSystemPrompt(profile || {}, {}, checkIns || []);

  let playbookPrompt;

  if (existingPlaybook) {
    // UPDATE existing playbook - preserve what works, update what's changed
    playbookPrompt = `You are reviewing and updating a user's existing health Playbook based on their current profile and recent check-ins.

${profileContext}

## CURRENT PLAYBOOK (to be updated):

**Summary:** ${existingPlaybook.summary || '(none)'}

**Key Principles:**
${(existingPlaybook.principles || []).map((p, i) => `${i + 1}. ${p.text} (Why: ${p.why || 'N/A'})`).join('\n') || '(none)'}

**This Week's Focus:**
${(existingPlaybook.weeklyFocus || []).map((f, i) => `${i + 1}. ${f.action}${f.context ? ` (${f.context})` : ''}`).join('\n') || '(none)'}

**On Your Radar:**
${(existingPlaybook.radar || []).map((r, i) => `${i + 1}. ${r.suggestion}${r.timing ? ` (${r.timing})` : ''}`).join('\n') || '(none)'}

---

## YOUR TASK:
Review and UPDATE this playbook. Your goal is to make MINIMAL, TARGETED changes:

1. **PRESERVE** items that are still relevant and working
2. **UPDATE** items that need adjustment based on new data (e.g., check-in progress, profile changes)
3. **REMOVE** items that are no longer relevant (achieved goals, outdated advice)
4. **ADD** new items only if there's a clear gap or new need

For the Summary: Update it to reflect current status and recent progress.

For Key Principles: These are foundational habits - they should rarely change completely. Only modify if:
- The user has achieved a principle and needs a new challenge
- Profile data suggests the principle is no longer appropriate
- Keep ${config.principles} principles total

For This Week's Focus: These SHOULD update based on recent check-ins. Refresh these to be relevant to where the user is NOW. Keep ${config.focusGoals} focus items.

Tone guidance: ${config.tone}

For On Your Radar: Update timing, remove items that have been addressed, add new long-term considerations.

Return the UPDATED playbook as JSON with this exact structure:
{
  "summary": "Updated summary reflecting current status",
  "principles": [
    { "text": "Principle text", "why": "Brief explanation" }
  ],
  "weeklyFocus": [
    { "action": "Specific action for this week", "context": "Why now (optional)" }
  ],
  "radar": [
    { "suggestion": "Future consideration", "timing": "When to consider" }
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting or extra text.`;
  } else {
    // Generate NEW playbook from scratch
    playbookPrompt = `Based on this user's health profile and check-in history, generate a personalized "Playbook" - their action plan for achieving their health goals.

${profileContext}

Generate a JSON response with this exact structure:
{
  "summary": "A 2-3 sentence personalized summary of where they are now and what to focus on. Reference specific data from their check-ins if available. Be encouraging but honest.",
  "principles": [
    {
      "text": "The principle/habit (be specific, include numbers when relevant)",
      "why": "Brief explanation of why this matters for their specific goals"
    }
  ],
  "weeklyFocus": [
    {
      "action": "Specific tactical action for this week",
      "context": "Why this matters right now based on their recent data (optional)"
    }
  ],
  "radar": [
    {
      "suggestion": "Future consideration or longer-term idea",
      "timing": "When to consider this (e.g., 'In 4-6 weeks', 'At your next doctor visit')"
    }
  ]
}

Guidelines:
- Generate ${config.principles} principles that are foundational to their specific goals
- Generate ${config.focusGoals} weekly focus items based on their most recent check-in data (if available)
- Generate ${config.radar} radar items for future consideration
- Be specific and actionable, not vague
- Reference their actual goals, metrics, and check-in data
- Include research-backed reasoning in the "why" fields
- If they mentioned specific challenges (low energy, stress, etc.), address them
- Tailor recommendations to their occupation, lifestyle, and constraints

Tone guidance: ${config.tone}

IMPORTANT: Return ONLY valid JSON, no markdown formatting or extra text.`;
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: playbookPrompt }],
    });

    const content = response.content[0]?.text || '';

    // Parse the JSON response
    try {
      const playbook = JSON.parse(content);
      res.json(playbook);
    } catch (parseErr) {
      // Try to extract JSON from the response if it has extra text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const playbook = JSON.parse(jsonMatch[0]);
        res.json(playbook);
      } else {
        console.error('Failed to parse playbook JSON:', content);
        res.status(500).json({ error: 'Failed to generate playbook' });
      }
    }
  } catch (err) {
    console.error('Playbook generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Analyze profile changes for playbook suggestions
app.post('/api/analyze-profile-change', async (req, res) => {
  console.log('--- Profile change analysis request ---');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { oldProfile, newProfile, playbook, changedFields, pendingSuggestions = [] } = req.body;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (!changedFields || changedFields.length === 0) {
    return res.json({ suggestion: null });
  }

  console.log('Analyzing profile changes:', changedFields);
  console.log('Pending suggestions to consider:', pendingSuggestions.length);

  const client = new Anthropic({ apiKey });

  // Format the changes for the prompt
  const changesDescription = changedFields.map(field => {
    const oldValue = getNestedValue(oldProfile, field) || '(not set)';
    const newValue = getNestedValue(newProfile, field) || '(not set)';
    return `- ${formatFieldName(field)}: "${oldValue}" → "${newValue}"`;
  }).join('\n');

  // Format current playbook
  const playbookDescription = playbook ? `
Current Playbook:
- Summary: ${playbook.summary || '(none)'}
- Principles: ${(playbook.principles || []).map((p, i) => `[${i}] ${p.text}`).join('; ') || '(none)'}
- Weekly Focus: ${(playbook.weeklyFocus || []).map((f, i) => `[${i}] ${f.action}`).join('; ') || '(none)'}
- On Your Radar: ${(playbook.radar || []).map((r, i) => `[${i}] ${r.suggestion}`).join('; ') || '(none)'}
` : 'No playbook generated yet.';

  // Format pending suggestions
  const pendingDescription = pendingSuggestions.length > 0 ? `
Pending Suggestions (not yet approved):
${pendingSuggestions.map(s => `- ID: ${s.id} | Section: ${s.section} | Action: ${s.action} | Text: "${s.content?.text}" | Triggered by: ${(s.changedFields || []).join(', ')}`).join('\n')}
` : 'No pending suggestions.';

  const analysisPrompt = `You are a health advisor analyzing a user's profile update. You need to determine:
1. Should any PENDING suggestions be dismissed (because the user fixed the issue)?
2. Should any EXISTING playbook items be removed (because they're now obsolete)?
3. Should a NEW suggestion be created?

The user just made these changes to their profile:
${changesDescription}

${playbookDescription}

${pendingDescription}

User's goals: ${(newProfile?.goals || []).join(', ') || 'Not specified'}

IMPORTANT LOGIC:
- If the user IMPROVED something (e.g., increased water intake from unhealthy to healthy levels), check if there are pending suggestions about that issue and mark them for dismissal
- If the user FIXED an issue that led to an existing playbook item, suggest REMOVING that item
- Only create NEW suggestions for genuinely new concerns
- If the change is a positive improvement with no further action needed, acknowledge it positively

Respond with a JSON object:
{
  "dismissSuggestionIds": ["id1", "id2"],  // IDs of pending suggestions to auto-dismiss (empty array if none)
  "resolved": true/false,                   // true if this change resolves a previous issue
  "message": "Positive acknowledgment",     // shown to user if resolved=true (e.g., "Great! Your water intake is now in a healthy range.")
  "shouldUpdate": true/false,               // true if a NEW playbook change is needed
  "section": "principles" | "weeklyFocus" | "radar" | "summary",  // only if shouldUpdate=true
  "action": "add" | "edit" | "remove",      // only if shouldUpdate=true
  "text": "EXACT text to match",            // For REMOVE: copy the EXACT text of the item to remove from the playbook above. For ADD: the new content.
  "why": "Brief explanation",               // for principles
  "context": "Additional context",          // for weeklyFocus
  "timing": "When to consider",             // for radar
  "rationale": "Why this matters",          // detailed reasoning
  "sources": "Research/guidelines",         // optional
  "removeIndex": 0                          // REQUIRED for remove: the [index] number shown in the playbook above
}

CRITICAL FOR REMOVE ACTIONS:
- You MUST provide "removeIndex" - the number in brackets [0], [1], etc. from the playbook list above
- You MUST copy the EXACT "text" of the item to remove (for backup matching)

Examples:
1. User changes water from 6oz → 80oz (was unhealthy, now healthy):
   - If there's a pending suggestion about increasing water → dismissSuggestionIds: [that ID]
   - resolved: true, message: "Great! Your water intake is now in a healthy range."
   - shouldUpdate: false (no new suggestion needed)

2. User changes water from 80oz → 6oz (was healthy, now unhealthy):
   - dismissSuggestionIds: []
   - resolved: false
   - shouldUpdate: true, action: "add", text: "Increase water intake..."

3. Playbook has "[2] Increase daily water intake to 80oz" and user fixed their water intake:
   - shouldUpdate: true, action: "remove", section: "principles"
   - removeIndex: 2
   - text: "Increase daily water intake to 80oz"  // EXACT text from playbook

4. User changes water slightly (78oz → 80oz):
   - Minor change, no action needed
   - dismissSuggestionIds: [], resolved: false, shouldUpdate: false

IMPORTANT: Return ONLY valid JSON, no markdown formatting.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: analysisPrompt }],
    });

    const content = response.content[0]?.text || '';
    console.log('AI analysis response:', content);

    try {
      const analysis = JSON.parse(content);
      const result = {
        dismissSuggestionIds: analysis.dismissSuggestionIds || [],
        resolved: analysis.resolved || false,
        message: analysis.message || null,
        suggestion: null,
      };

      if (analysis.shouldUpdate) {
        result.suggestion = {
          section: analysis.section,
          action: analysis.action,
          content: {
            text: analysis.text,
            why: analysis.why || null,
            context: analysis.context || null,
            timing: analysis.timing || null,
            index: analysis.removeIndex,
          },
          rationale: analysis.rationale || null,
          sources: analysis.sources || null,
          trigger: 'profile_change',
          changedFields: changedFields,
        };
        console.log('Suggesting playbook update:', result.suggestion);
      }

      if (result.dismissSuggestionIds.length > 0) {
        console.log('Auto-dismissing suggestions:', result.dismissSuggestionIds);
      }

      if (result.resolved) {
        console.log('Issue resolved:', result.message);
      }

      res.json(result);
    } catch (parseErr) {
      // Try to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        const result = {
          dismissSuggestionIds: analysis.dismissSuggestionIds || [],
          resolved: analysis.resolved || false,
          message: analysis.message || null,
          suggestion: null,
        };

        if (analysis.shouldUpdate) {
          result.suggestion = {
            section: analysis.section,
            action: analysis.action,
            content: {
              text: analysis.text,
              why: analysis.why || null,
              context: analysis.context || null,
              timing: analysis.timing || null,
              index: analysis.removeIndex,
            },
            rationale: analysis.rationale || null,
            sources: analysis.sources || null,
            trigger: 'profile_change',
            changedFields: changedFields,
          };
        }
        res.json(result);
      } else {
        console.error('Failed to parse analysis JSON:', content);
        res.json({ suggestion: null, dismissSuggestionIds: [], resolved: false });
      }
    }
  } catch (err) {
    console.error('Profile change analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Helper to get nested object values
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    if (value === undefined || value === null) return undefined;
    value = value[key];
  }
  return value;
}

// Helper to format field names for display
function formatFieldName(field) {
  const fieldNames = {
    'supplements': 'Supplements',
    'vitaminD': 'Vitamin D',
    'sleepSchedule': 'Sleep Schedule',
    'bedtime': 'Bedtime',
    'wakeTime': 'Wake Time',
    'sleepQuality': 'Sleep Quality',
    'trainingFrequency': 'Training Frequency',
    'workoutTypes': 'Workout Types',
    'goals': 'Goals',
    'dietaryApproach': 'Dietary Approach',
    'mealTiming': 'Meal Timing',
    'waterIntake': 'Water Intake',
    'stressLevel': 'Stress Level',
    'stressManagement': 'Stress Management',
  };
  return fieldNames[field] || field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

// Analyze weekly check-in and suggest playbook updates
app.post('/api/analyze-checkin', async (req, res) => {
  console.log('--- Check-in analysis request ---');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { checkIn, playbook, profile } = req.body;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (!checkIn || !playbook) {
    return res.json({ suggestions: [] });
  }

  console.log('Analyzing check-in for playbook suggestions');

  const client = new Anthropic({ apiKey });

  // Format focus item responses
  const focusResponses = checkIn.focusResponses || {};
  const weeklyFocusItems = checkIn.weeklyFocusItems || [];
  const focusSummary = weeklyFocusItems.map((item, idx) => {
    const response = focusResponses[idx] || {};
    let status = 'No response';
    if (response.completed === true) status = 'Completed';
    else if (response.completed === false) status = 'Not completed';
    else if (response.value) status = `Result: ${response.value}`;
    return `- "${item}": ${status}${response.notes ? ` - Notes: ${response.notes}` : ''}`;
  }).join('\n');

  // Format current playbook
  const playbookDescription = `
Current Playbook:
- Summary: ${playbook.summary || '(none)'}
- Principles: ${(playbook.principles || []).map((p, i) => `[${i}] ${p.text}`).join('; ') || '(none)'}
- Weekly Focus: ${(playbook.weeklyFocus || []).map((f, i) => `[${i}] ${f.action}`).join('; ') || '(none)'}
- On Your Radar: ${(playbook.radar || []).map((r, i) => `[${i}] ${r.suggestion}`).join('; ') || '(none)'}
`;

  const analysisPrompt = `You are a health advisor analyzing a user's weekly check-in to suggest updates to their Playbook for next week.

## User Profile
Name: ${profile?.name || 'User'}
Goals: ${(profile?.goals || []).join(', ') || 'Not specified'}

${playbookDescription}

## This Week's Check-In Results

**Focus Item Performance:**
${focusSummary || 'No focus items tracked'}

**Well-being Metrics:**
- Energy: ${checkIn.energy}/10
- Sleep Quality: ${checkIn.sleepQuality}/10
- Stress: ${checkIn.stress}/10 (lower is better)

**Open Reflection:**
${checkIn.openReflection || 'No additional notes'}

---

## Your Task

Based on this check-in, suggest updates to the user's Playbook for NEXT WEEK. Focus primarily on the "weeklyFocus" section since that's what changes week to week.

Consider:
1. Items they completed successfully - should they continue, progress, or graduate them?
2. Items they struggled with - should they be adjusted, made easier, or replaced?
3. Any patterns in their well-being metrics (low energy might mean adjusting intensity, etc.)
4. Anything mentioned in their open reflection

Generate 1-3 suggestions. Respond with JSON:
{
  "suggestions": [
    {
      "section": "weeklyFocus",
      "action": "add|edit|remove",
      "content": {
        "text": "The new/updated focus item",
        "context": "Why this is relevant for next week",
        "index": 0  // For edit/remove: which item to modify
      },
      "rationale": "Explanation of why you're suggesting this change"
    }
  ]
}

Guidelines:
- For "weeklyFocus", suggest practical, achievable actions for the coming week
- Reference their actual performance when explaining changes
- If they crushed all their goals, suggest progressing to the next level
- If they struggled, suggest adjustments that set them up for success
- Include at most ONE suggestion for principles (only if there's a significant pattern)
- Keep rationales concise but informative

If their check-in shows solid progress and no changes needed, return: { "suggestions": [] }

IMPORTANT: Return ONLY valid JSON, no markdown formatting.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: analysisPrompt }],
    });

    const content = response.content[0]?.text || '';
    console.log('Check-in analysis response:', content);

    try {
      const analysis = JSON.parse(content);
      res.json({ suggestions: analysis.suggestions || [] });
    } catch (parseErr) {
      // Try to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        res.json({ suggestions: analysis.suggestions || [] });
      } else {
        console.error('Failed to parse check-in analysis JSON:', content);
        res.json({ suggestions: [] });
      }
    }
  } catch (err) {
    console.error('Check-in analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Parse grocery order from uploaded file (PDF or image)
app.post('/api/parse-grocery', upload.single('file'), async (req, res) => {
  console.log('--- Grocery parsing request ---');
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { source } = req.body; // e.g., 'Shipt', 'Instacart', 'Amazon Fresh'
  console.log('File received:', req.file.originalname, req.file.mimetype, `${(req.file.size / 1024).toFixed(1)}KB`);

  const client = new Anthropic({ apiKey });

  try {
    let extractedText = '';
    const isPDF = req.file.mimetype === 'application/pdf';
    const isImage = req.file.mimetype.startsWith('image/');

    if (isPDF) {
      // Use Claude's PDF understanding capabilities
      const base64PDF = req.file.buffer.toString('base64');
      console.log('Using Claude to parse PDF...');

      try {
        const pdfResponse = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64PDF,
                },
              },
              {
                type: 'text',
                text: `This is a grocery receipt or order confirmation from ${source || 'a grocery delivery service'}. Extract ALL the grocery/food item names.

Rules:
- Only extract food and grocery items (not prices, quantities, tax, totals, etc.)
- Include brand names if visible (e.g., "Chobani Greek Yogurt" not just "yogurt")
- Skip non-food items (bags, delivery fees, tips, etc.)
- One item per line
- If you can't read some items, skip them

Return ONLY a JSON array of item names, like:
["Organic Bananas", "Chobani Greek Yogurt", "Kirkland Olive Oil"]

IMPORTANT: Return ONLY the JSON array, no other text.`,
              },
            ],
          }],
        });

        const pdfContent = pdfResponse.content[0]?.text || '';
        // Try to parse as JSON directly
        try {
          const jsonMatch = pdfContent.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const items = JSON.parse(jsonMatch[0]);
            console.log('PDF parsed, items count:', items.length);
            return res.json({
              items: items.filter(i => i && typeof i === 'string' && i.trim()),
              source: source || 'Unknown',
            });
          }
        } catch (parseErr) {
          console.log('PDF parsing returned non-JSON, using as text');
        }
        extractedText = pdfContent;
      } catch (pdfErr) {
        console.error('PDF parsing error:', pdfErr.message);
        return res.status(400).json({
          error: 'Could not read PDF. Please take a screenshot and upload that, or paste your items manually.',
          needsManualInput: true,
        });
      }
    } else if (isImage) {
      // Use Claude's vision to read the image
      const base64Image = req.file.buffer.toString('base64');
      const mediaType = req.file.mimetype;

      console.log('Using vision to parse image...');
      const visionResponse = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `This is a grocery receipt or order confirmation. Extract ALL the grocery/food item names from this image.

Rules:
- Only extract food and grocery items (not prices, quantities, tax, totals, etc.)
- Include brand names if visible (e.g., "Chobani Greek Yogurt" not just "yogurt")
- Skip non-food items (bags, delivery fees, tips, etc.)
- One item per line
- If you can't read some items, skip them
- Do NOT include any commentary, just list the items

Example output:
Organic Bananas
Chobani Greek Yogurt Vanilla
Kirkland Signature Olive Oil
Amy's Organic Soup Lentil
...`,
            },
          ],
        }],
      });

      extractedText = visionResponse.content[0]?.text || '';
      console.log('Vision extracted text, length:', extractedText.length);
    } else {
      return res.status(400).json({
        error: 'Unsupported file type. Please upload a PDF or image.',
      });
    }

    // Now use Claude to clean up and extract just the grocery items
    const parsePrompt = `Extract all grocery/food item names from this text. This is from a ${source || 'grocery'} order.

TEXT:
${extractedText}

Rules:
- Only include food and grocery items
- Include brand names when present (e.g., "Chobani Greek Yogurt" not just "yogurt")
- Skip non-food items (bags, fees, tips, taxes, totals, addresses, dates)
- Clean up item names (remove quantities, prices, item codes)
- One item per line
- If unsure, include it (better to have extra than miss items)

Return ONLY a JSON array of item names, like:
["Organic Bananas", "Chobani Greek Yogurt", "Kirkland Olive Oil"]

IMPORTANT: Return ONLY the JSON array, no other text.`;

    const parseResponse = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: parsePrompt }],
    });

    const content = parseResponse.content[0]?.text || '';
    console.log('Parse response:', content.substring(0, 200));

    // Extract the JSON array
    try {
      let items;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        items = JSON.parse(jsonMatch[0]);
      } else {
        items = JSON.parse(content);
      }

      console.log('Parsed items count:', items.length);
      res.json({
        items: items.filter(i => i && typeof i === 'string' && i.trim()),
        source: source || 'Unknown',
      });
    } catch (parseErr) {
      console.error('Failed to parse items JSON:', content);
      // If parsing fails, try to split by newlines
      const items = extractedText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.length > 2 && line.length < 100);
      res.json({
        items: items.slice(0, 100), // Limit to 100 items
        source: source || 'Unknown',
        parseWarning: 'Items may need manual review',
      });
    }
  } catch (err) {
    console.error('Grocery parsing error:', err.message);
    res.status(500).json({
      error: 'Failed to parse grocery order. Please paste your items manually.',
      needsManualInput: true,
    });
  }
});

// Analyze grocery history and generate recommendations
app.post('/api/analyze-groceries', async (req, res) => {
  console.log('--- Grocery analysis request ---');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { groceryData, profile, playbook } = req.body;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (!groceryData || !groceryData.allItems || groceryData.allItems.length === 0) {
    return res.json({
      patterns: null,
      recommendations: null,
      error: 'No grocery data to analyze',
    });
  }

  const client = new Anthropic({ apiKey });

  // Prepare grocery summary
  const itemsSummary = groceryData.allItems
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)
    .map(i => `${i.name} (purchased ${i.count}x)`)
    .join('\n');

  const orderHistory = groceryData.orders
    .slice(0, 5)
    .map(o => `${new Date(o.date).toLocaleDateString()}: ${o.itemCount} items from ${o.source}`)
    .join('\n');

  // User context
  const userGoals = (profile?.goals || []).join(', ') || 'general health';
  const restrictions = profile?.restrictions || 'none specified';
  const playBookSummary = playbook?.summary || '';

  // Playbook context for cart suggestions
  const weeklyFocus = (playbook?.weeklyFocus || []).map(f => f.action).join('; ') || 'none';
  const principles = (playbook?.principles || []).map(p => p.text).join('; ') || 'none';

  const analysisPrompt = `You are a nutrition advisor analyzing a user's grocery shopping patterns to provide personalized recommendations.

## User Profile
- Goals: ${userGoals}
- Dietary restrictions: ${restrictions}
- Playbook summary: ${playBookSummary || 'No playbook yet'}

## Current Playbook Focus (inform your cart suggestions with these)
- This Week's Focus: ${weeklyFocus}
- Key Principles: ${principles}

## Grocery History
Recent orders:
${orderHistory}

## Frequently Purchased Items (most frequent first):
${itemsSummary}

---

Analyze this shopping data and provide:

1. **Category Breakdown**: Categorize items into: Produce, Protein, Dairy, Grains, Snacks, Beverages, Frozen, Condiments/Sauces, Other. Estimate percentages.

2. **Smart Swaps**: Suggest 3-5 specific product swaps that serve THE SAME FUNCTIONAL PURPOSE. This is critical - think about what the product is USED FOR and only suggest alternatives that can replace it in the same way.

SAME-CATEGORY SWAP RULES:
- Cereal → only suggest other cereals (not protein bars)
- Milk → only suggest other milks (not protein shakes)
- Bread → only suggest other breads
- Rice cakes → only suggest other rice cakes or similar crackers/snacks
- Chips → only suggest other chips or similar salty snacks
- Yogurt → only suggest other yogurts
- Pasta → only suggest other pastas or pasta alternatives

BAD EXAMPLE: "Instead of fairlife milk → Core Power protein shake" (different use case - you don't pour shakes on cereal)
GOOD EXAMPLE: "Instead of fairlife 2% milk → Fairlife fat-free or Organic Valley 1%" (still milk, same use)

If there's no healthier option in the same functional category, DO NOT include that item in swaps - just skip it.

3. **Potential Gaps**: Identify 2-4 micronutrients or food groups that seem underrepresented. Connect to their goals when relevant.

4. **Cart Suggestions**: 5-7 specific items to add to their shopping, based on:
   - Gaps identified above
   - Their goals
   - IMPORTANT: Their current Playbook focus (This Week's Focus and Key Principles)
   For example, if This Week's Focus mentions hitting protein goals, emphasize protein sources.

5. **Wins**: Identify 1-3 positive things about their shopping (things they're doing well). Celebrate progress!
   - Example: "Consistently buying leafy greens", "Good protein variety", "Buying whole foods over processed"

6. **Habits Formed**: If they're consistently buying something healthy (3+ orders), note it as a formed habit.
   - Example: If they buy spinach in multiple orders, that's a habit to celebrate.

Respond with JSON:
{
  "categoryBreakdown": {
    "Produce": 15,
    "Protein": 20,
    "Dairy": 10,
    ...
  },
  "frequentItems": ["item1", "item2", ...],  // Top 10 most purchased
  "smartSwaps": [
    { "current": "Honey Nut Cheerios", "suggestion": "Catalina Crunch Honey Graham", "reason": "11g protein vs 2g, lower sugar - same cereal category" }
  ],
  "potentialGaps": [
    { "gap": "Omega-3 sources", "suggestion": "Consider adding salmon, walnuts, or sardines", "relevance": "Supports cognitive function and reduces inflammation" }
  ],
  "cartSuggestions": [
    { "item": "Greek Yogurt", "reason": "High protein, supports your fat loss goal and This Week's Focus" }
  ],
  "wins": [
    { "text": "Great protein variety with chicken, fish, and Greek yogurt", "category": "protein" }
  ],
  "habitsFormed": [
    { "text": "Consistently buying leafy greens (spinach, kale)", "category": "produce", "relatedItems": ["spinach", "kale"] }
  ]
}

Guidelines:
- Be encouraging, not judgmental ("here's how to optimize" not "you're eating wrong")
- Focus on easy 1-for-1 swaps, not overhauling their entire diet
- Make suggestions specific to their stated goals AND current Playbook focus
- Keep recommendations practical and affordable
- CELEBRATE wins - don't just focus on improvements
- Connect cart suggestions to their Playbook when possible

IMPORTANT: Return ONLY valid JSON.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: analysisPrompt }],
    });

    const content = response.content[0]?.text || '';
    console.log('Grocery analysis response length:', content.length);

    try {
      let analysis;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = JSON.parse(content);
      }

      res.json({
        patterns: {
          categoryBreakdown: analysis.categoryBreakdown,
          frequentItems: analysis.frequentItems,
        },
        recommendations: {
          smartSwaps: analysis.smartSwaps,
          potentialGaps: analysis.potentialGaps,
          cartSuggestions: analysis.cartSuggestions,
        },
        wins: analysis.wins || [],
        habitsFormed: analysis.habitsFormed || [],
      });
    } catch (parseErr) {
      console.error('Failed to parse grocery analysis JSON:', content);
      res.status(500).json({ error: 'Failed to analyze groceries' });
    }
  } catch (err) {
    console.error('Grocery analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Find healthier alternatives for a specific product
app.post('/api/find-healthier-option', async (req, res) => {
  console.log('--- Find healthier option request ---');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { product, profile, playbook } = req.body;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (!product || !product.trim()) {
    return res.status(400).json({ error: 'Product name required' });
  }

  const client = new Anthropic({ apiKey });

  const userGoals = (profile?.goals || []).join(', ') || 'general health';
  const playbookSummary = playbook?.summary || '';

  const searchPrompt = `You are a nutrition advisor helping someone find healthier alternatives to a product they buy.

## User's Goals
${userGoals}
${playbookSummary ? `\nContext: ${playbookSummary}` : ''}

## Product to Replace
"${product}"

## Your Task
Suggest 2-3 healthier alternatives that serve THE SAME PURPOSE as this product.

CRITICAL RULES:
1. Alternatives MUST be in the SAME functional category:
   - If it's a cereal, suggest other cereals
   - If it's a milk, suggest other milks
   - If it's a bread, suggest other breads
   - If it's a snack, suggest similar snacks
   - If it's a yogurt, suggest other yogurts

2. Think: "What is this product USED FOR?" The alternatives must work as drop-in replacements.

3. For each alternative, explain:
   - Why it's healthier (specific numbers when possible: protein, sugar, fiber, etc.)
   - How it supports the user's goals
   - Taste/texture similarity if relevant (helps with adoption)

4. Prioritize real, available products with brand names when possible.

5. If there truly is no healthier option in the same category, say so honestly.

Respond with JSON:
{
  "originalProduct": "${product}",
  "category": "The product category (e.g., 'cereal', 'milk', 'snack')",
  "alternatives": [
    {
      "name": "Specific product name with brand",
      "whyHealthier": "Specific comparison (e.g., '11g protein vs 2g, 5g sugar vs 12g')",
      "goalConnection": "How this helps their specific goals",
      "tasteSimilarity": "Optional: taste/texture notes for easier transition"
    }
  ],
  "noAlternatives": false,
  "noAlternativesReason": "Only if there are no healthier options in the same category"
}

IMPORTANT: Return ONLY valid JSON.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: searchPrompt }],
    });

    const content = response.content[0]?.text || '';
    console.log('Healthier option response:', content.substring(0, 200));

    try {
      let result;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(content);
      }
      res.json(result);
    } catch (parseErr) {
      console.error('Failed to parse healthier option JSON:', content);
      res.status(500).json({ error: 'Failed to find alternatives' });
    }
  } catch (err) {
    console.error('Find healthier option error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Sync grocery data with playbook - check for updates based on purchases
app.post('/api/sync-grocery-playbook', async (req, res) => {
  console.log('--- Grocery-Playbook sync request ---');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { groceryData, playbook, profile, pendingSuggestions = [] } = req.body;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (!groceryData || !playbook) {
    return res.json({ suggestions: [], wins: [], habitsToAdd: [] });
  }

  const client = new Anthropic({ apiKey });

  // Format grocery data
  const frequentItems = groceryData.allItems
    ?.sort((a, b) => b.count - a.count)
    .slice(0, 30)
    .map(i => `${i.name} (${i.count}x)`)
    .join('\n') || 'No items';

  const recentPurchases = groceryData.orders
    ?.slice(0, 3)
    .map(o => `${new Date(o.date).toLocaleDateString()}: ${o.items.join(', ')}`)
    .join('\n') || 'No recent orders';

  // Format playbook
  const playbookSummary = `
Summary: ${playbook.summary || 'None'}

Key Principles:
${(playbook.principles || []).map((p, i) => `[${i}] ${p.text}`).join('\n') || 'None'}

This Week's Focus:
${(playbook.weeklyFocus || []).map((f, i) => `[${i}] ${f.action}`).join('\n') || 'None'}

On Your Radar:
${(playbook.radar || []).map((r, i) => `[${i}] ${r.suggestion}`).join('\n') || 'None'}
`;

  // Format pending suggestions
  const pendingDesc = pendingSuggestions.length > 0
    ? `Pending suggestions (not yet approved):\n${pendingSuggestions.map(s => `- [${s.id}] ${s.section}: "${s.content?.text}"`).join('\n')}`
    : 'No pending suggestions';

  const syncPrompt = `You are a health advisor analyzing how a user's grocery shopping aligns with their Playbook goals.

## User Goals
${(profile?.goals || []).join(', ') || 'General health'}

## Current Playbook
${playbookSummary}

## ${pendingDesc}

## Frequently Purchased Items
${frequentItems}

## Recent Purchases
${recentPurchases}

## Existing Habits Formed
${(groceryData.habitsFormed || []).map(h => h.text).join('\n') || 'None tracked yet'}

---

## Your Task

Analyze whether their grocery purchases show progress on their Playbook goals. Look for:

1. **Completed Recommendations**: If the Playbook suggests something and they're now buying it:
   - Example: Playbook says "Add more leafy greens" and they bought spinach → Acknowledge the win
   - If they've done this 3+ times → Suggest removing the recommendation (habit formed!)

2. **Positive Progress**: Things they're doing well that align with goals
   - Celebrate these! Don't just focus on improvements.

3. **New Concerns**: If shopping patterns suggest a new issue:
   - Example: They stopped buying something healthy they used to buy
   - Example: Consistently buying something that conflicts with goals

4. **Habit Formation**: If they've consistently bought something healthy (3+ orders):
   - Note it as a formed habit for positive reinforcement

Return JSON:
{
  "suggestions": [
    {
      "type": "playbook_update",
      "section": "principles|weeklyFocus|radar|summary",
      "action": "add|edit|remove",
      "content": {
        "text": "The updated text",
        "why": "For principles",
        "context": "For weeklyFocus",
        "timing": "For radar",
        "index": 0  // Required for edit/remove - which item to modify
      },
      "rationale": "Why this change is suggested",
      "trigger": "grocery_sync"
    }
  ],
  "wins": [
    {
      "text": "Positive observation about their shopping",
      "relatedPlaybookItem": "Which playbook item this relates to (if any)"
    }
  ],
  "habitsToAdd": [
    {
      "text": "Description of the habit they've formed",
      "category": "nutrition|protein|produce|etc",
      "relatedItems": ["item1", "item2"]
    }
  ],
  "dismissSuggestionIds": ["id1"]  // IDs of pending suggestions that are now resolved
}

IMPORTANT RULES:
- If Playbook says "Add X" and they're now consistently buying X → suggest REMOVING that item (habit formed)
- Be encouraging - celebrate wins before suggesting improvements
- Only suggest meaningful changes, not minor tweaks
- If no changes needed, return empty arrays
- Don't duplicate existing pending suggestions

Return ONLY valid JSON.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: syncPrompt }],
    });

    const content = response.content[0]?.text || '';
    console.log('Grocery-playbook sync response:', content.substring(0, 300));

    try {
      let result;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(content);
      }

      res.json({
        suggestions: result.suggestions || [],
        wins: result.wins || [],
        habitsToAdd: result.habitsToAdd || [],
        dismissSuggestionIds: result.dismissSuggestionIds || [],
      });
    } catch (parseErr) {
      console.error('Failed to parse grocery-playbook sync JSON:', content);
      res.json({ suggestions: [], wins: [], habitsToAdd: [], dismissSuggestionIds: [] });
    }
  } catch (err) {
    console.error('Grocery-playbook sync error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Analyze nutrition profile from 5-day calibration
app.post('/api/analyze-nutrition-profile', async (req, res) => {
  try {
    const { calibrationData, profile } = req.body;

    if (!calibrationData) {
      return res.status(400).json({ error: 'Calibration data required' });
    }

    // Get user's meal pattern preference
    const userMeals = profile?.mealPattern || ['breakfast', 'lunch', 'dinner', 'snacks', 'dessert'];
    const mealLabels = {
      breakfast: 'Breakfast',
      morningSnack: 'Morning Snack',
      lunch: 'Lunch',
      afternoonSnack: 'Afternoon Snack',
      dinner: 'Dinner',
      eveningSnack: 'Evening Snack/Dessert',
      snacks: 'Snacks',
      dessert: 'Dessert/Other',
    };

    // Build meal summary from calibration, including all meal types the user tracks
    const mealSummary = Object.entries(calibrationData.days || {})
      .filter(([_, data]) => data.completed)
      .map(([day, data]) => {
        const mealLines = userMeals.map(meal => {
          const label = mealLabels[meal] || meal;
          const content = data[meal] || 'Not logged';
          return `- ${label}: ${content}`;
        }).join('\n');
        return `${day.charAt(0).toUpperCase() + day.slice(1)}:\n${mealLines}`;
      })
      .join('\n\n');

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `You are a nutrition analyst. Analyze the user's 5-day meal tracking data and provide insights.

User profile:
- Name: ${profile?.name || 'Unknown'}
- Goals: ${profile?.goals?.join(', ') || 'General health'}
- Weight: ${profile?.weight || 'Unknown'} ${profile?.weightUnit || 'lbs'}
- Meals they typically eat: ${userMeals.map(m => mealLabels[m] || m).join(', ')}

IMPORTANT - Recipe & Portion Handling:
When users log meals, they may include:
1. Full recipes with ingredient lists and quantities
2. Portion indicators like "ate half", "had about 1/3", "2 servings out of 6", "split with partner"

When analyzing entries with recipes:
- Parse out the ingredients and estimate total recipe nutrition
- Apply any portion fraction mentioned to calculate what they ACTUALLY ate
- Example: If recipe has "2 lbs chicken" and they "ate half", calculate based on ~1 lb chicken
- Look for phrases like: "had half", "ate 1/3", "2 servings (makes 6)", "split it", "small portion"

IMPORTANT - Personalized Rationales:
For each recommendation, gap, and strength, explain WHY it applies to THIS specific user based on:
- Their weight, age, sex, activity level
- Their stated goals
- Their actual logged meals
- Relevant nutritional science

Return a JSON object with this structure:
{
  "overview": {
    "estimatedDailyCalories": "~X,XXX" (string estimate based on actual portions eaten),
    "proteinEstimate": "~XXg" (string estimate),
    "carbEstimate": "~XXXg" (string estimate),
    "fatEstimate": "~XXg" (string estimate)
  },
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "strengthRationales": [
    "Why strength 1 is a strength for this user based on their profile...",
    "Why strength 2 emerged from their meal patterns...",
    "Why strength 3 supports their specific goals..."
  ],
  "gaps": ["gap 1", "gap 2", "gap 3"],
  "gapRationales": [
    "Why gap 1 matters for this user: Based on their [weight/goal/activity], they need X but only getting Y...",
    "Why gap 2 was identified: Their logged meals show...",
    "Why gap 3 is important: Given their goal of [goal], research shows..."
  ],
  "recommendations": ["specific actionable recommendation 1", "specific actionable recommendation 2", "specific actionable recommendation 3"],
  "recommendationRationales": [
    "Why this recommendation: Based on your [weight/goal], adding X would help because [science-based reason]...",
    "Why this recommendation: Your breakfast logs show [pattern], and research indicates [evidence]...",
    "Why this recommendation: Given your goal of [goal], this change would [specific benefit]..."
  ],
  "mealPatterns": {
    "breakfast": { "avgProtein": "~XXg", "suggestions": ["suggestion"] },
    "lunch": { "avgProtein": "~XXg", "suggestions": ["suggestion"] },
    "dinner": { "avgProtein": "~XXg", "suggestions": ["suggestion"] }
  },
  "parsedRecipes": [
    {
      "day": "monday",
      "meal": "dinner",
      "recipeName": "Chicken Stir Fry",
      "totalServings": 4,
      "portionEaten": "half (2 servings)",
      "estimatedCalories": "~450",
      "estimatedProtein": "~35g"
    }
  ]
}

Be specific and actionable. Personalize all rationales to this specific user's profile and goals.`,
      messages: [
        {
          role: 'user',
          content: `Here is my 5-day meal log. Please analyze my eating patterns and provide insights. Pay special attention to any recipes I've included and the portions I mentioned eating:\n\n${mealSummary}`,
        },
      ],
    });

    const content = response.content[0].text;

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      res.json(analysis);
    } else {
      // Return default analysis if parsing fails
      res.json({
        overview: {
          estimatedDailyCalories: '~2,000',
          proteinEstimate: '~80g',
          carbEstimate: '~250g',
          fatEstimate: '~70g',
        },
        strengths: ['Consistent meal timing', 'Good variety in food choices'],
        gaps: ['Protein distribution could be improved', 'Consider more vegetables'],
        recommendations: ['Add protein to breakfast', 'Include a vegetable with each meal'],
        mealPatterns: {
          breakfast: { avgProtein: '~15g', suggestions: ['Add eggs or Greek yogurt'] },
          lunch: { avgProtein: '~25g', suggestions: ['Good protein balance'] },
          dinner: { avgProtein: '~30g', suggestions: ['Maintain current portions'] },
          snacks: { avgProtein: '~5g', suggestions: ['Consider protein-rich snacks'] },
        },
      });
    }
  } catch (err) {
    console.error('Nutrition profile analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Synthesize weekly check-in summary from activities
app.post('/api/synthesize-week-summary', async (req, res) => {
  console.log('--- Week summary synthesis request ---');
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const {
      activities,
      focusProgress,
      nutritionData,
      profile,
      weeklyFocus,
      userFeedback,
      existingSummary,
      detailPreference = 'good', // 'less', 'good', 'more'
    } = req.body;

    // Build comprehensive context from all data sources
    let contextParts = [];

    // Separate activities by type for better organization
    const workouts = (activities || []).filter(a => a.type === 'workout');
    const nutritionActivities = (activities || []).filter(a => a.type === 'nutrition');
    const weightEntries = (activities || []).filter(a => a.type === 'weight');
    const sleepEntries = (activities || []).filter(a => a.type === 'sleep');
    const otherActivities = (activities || []).filter(a => !['workout', 'nutrition', 'weight', 'sleep'].includes(a.type));

    // Workouts section - detailed
    if (workouts.length > 0) {
      const workoutDetails = workouts.map(a => {
        const date = new Date(a.timestamp);
        const day = date.toLocaleDateString('en-US', { weekday: 'long' });
        const parts = [`${day}:`];

        if (a.subType === 'run' || a.subType === 'cardio') {
          if (a.data?.distance) parts.push(`${a.data.distance} mile${a.data.distance !== 1 ? 's' : ''}`);
          if (a.data?.pace) parts.push(`at ${a.data.pace} pace`);
          if (a.data?.duration) parts.push(`(${a.data.duration} min)`);
        } else if (a.subType === 'strength') {
          if (a.data?.exercise) parts.push(a.data.exercise);
          if (a.data?.weight && a.data?.reps) {
            parts.push(`${a.data.weight} lbs x ${a.data.reps} reps`);
            if (a.data?.sets) parts.push(`x ${a.data.sets} sets`);
          }
          if (a.data?.pr) parts.push('(PR!)');
        } else {
          parts.push(a.summary || a.rawText);
        }

        if (a.data?.feeling) parts.push(`- felt ${a.data.feeling}`);
        return parts.join(' ');
      }).join('\n');
      contextParts.push(`WORKOUTS THIS WEEK:\n${workoutDetails}`);
    }

    // Weight tracking
    if (weightEntries.length > 0) {
      const weights = weightEntries.map(a => {
        const day = new Date(a.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
        return `${day}: ${a.data?.weight || 'unknown'} lbs`;
      }).join(', ');

      const firstWeight = weightEntries[weightEntries.length - 1]?.data?.weight;
      const lastWeight = weightEntries[0]?.data?.weight;
      const change = firstWeight && lastWeight ? (lastWeight - firstWeight).toFixed(1) : null;

      contextParts.push(`WEIGHT TRACKING:\n${weights}${change ? `\nChange this week: ${change > 0 ? '+' : ''}${change} lbs` : ''}`);
    }

    // Nutrition - high level summary (not meal by meal)
    if (nutritionActivities.length > 0) {
      const proteinGoalHits = nutritionActivities.filter(a => a.data?.hitProteinGoal).length;
      const nutritionSummary = [];

      if (proteinGoalHits > 0) {
        nutritionSummary.push(`Hit protein goal ${proteinGoalHits} time${proteinGoalHits !== 1 ? 's' : ''}`);
      }

      // Look for patterns
      const snackingEntries = nutritionActivities.filter(a =>
        (a.summary || a.rawText || '').toLowerCase().includes('snack')
      );
      if (snackingEntries.length > 0) {
        nutritionSummary.push(`Logged ${snackingEntries.length} snack${snackingEntries.length !== 1 ? 's' : ''}`);
      }

      contextParts.push(`NUTRITION OVERVIEW:\n${nutritionSummary.join('\n') || 'Logged some nutrition entries'}\nTotal nutrition logs: ${nutritionActivities.length}`);
    }

    // Nutrition calibration data (meal logging) - summarize, don't list everything
    if (nutritionData?.days) {
      const dayCount = Object.values(nutritionData.days).filter(d =>
        d?.meals?.some(m => m.content?.trim())
      ).length;

      if (dayCount > 0) {
        contextParts.push(`MEAL LOGGING: Logged meals on ${dayCount} day${dayCount !== 1 ? 's' : ''} this week`);
      }
    }

    // Focus goals progress - important for suggestions
    if (weeklyFocus && weeklyFocus.length > 0 && focusProgress) {
      const focusSummary = weeklyFocus.map((goal, idx) => {
        const progress = focusProgress[idx]?.progress || {};
        const status = progress.complete
          ? '✓ COMPLETE'
          : `${progress.current || 0}/${progress.target || 1} (${Math.round(((progress.current || 0) / (progress.target || 1)) * 100)}%)`;
        return `- "${goal.action}": ${status}`;
      }).join('\n');
      contextParts.push(`FOCUS GOALS THIS WEEK:\n${focusSummary}`);
    }

    // Profile context - goals are important for personalization
    if (profile) {
      const goals = profile.goals?.join(', ') || 'general fitness';
      const preferences = profile.preferences || '';
      contextParts.push(`USER'S BIG PICTURE GOALS: ${goals}${preferences ? `\nPreferences/Notes: ${preferences}` : ''}`);
    }

    const context = contextParts.join('\n\n');

    // Detail level instructions
    const detailInstructions = {
      less: 'Keep it concise - shorter paragraphs, just the highlights.',
      good: 'Balanced detail - cover the key points without being too long or too short.',
      more: 'Be thorough - include more specifics about workouts, metrics, and insights.',
    };

    // User feedback for regeneration
    const feedbackInstruction = userFeedback
      ? `\n\nUser feedback to incorporate: "${userFeedback}"\nUpdate the summary based on this feedback.`
      : '';

    const existingSummaryContext = existingSummary && userFeedback
      ? `\n\nPrevious summary (to be updated):\n"${existingSummary}"`
      : '';

    const systemPrompt = `You are a supportive fitness coach writing a comprehensive weekly check-in summary.

WRITING STYLE:
- Coach-like and encouraging
- Focused on progress and wins
- Honest about misses without being negative
- Forward-looking and actionable
- Use second person ("you")

DETAIL LEVEL: ${detailInstructions[detailPreference] || detailInstructions.good}

STRUCTURE YOUR RESPONSE AS JSON with this format:
{
  "trainingRecap": "Paragraph about workouts - exercises, weights, reps, distances. Note consistency and connect to their goals.",
  "nutritionMetrics": "HIGH LEVEL nutrition assessment (NOT every meal). Overall quality, patterns, protein adherence, weight changes if relevant.",
  "overallAssessment": "Big picture of the week. What went well, what could improve, encouragement.",
  "suggestions": [
    {
      "type": "keep" | "improve",
      "text": "Specific, actionable suggestion based on their data and goals"
    }
  ]
}

RULES FOR SUGGESTIONS (2-4 suggestions):
- Be SPECIFIC (not "exercise more" but "add one more leg day this week")
- Base on their ACTUAL DATA and stated goals
- Mix "keep doing X" (type: keep) and "try improving Y" (type: improve)
- Reference specific numbers/metrics when possible
- Keep encouraging, not critical

DO NOT:
- List every meal and ingredient
- Include system updates or administrative entries
- Make up activities they didn't log
- Be generic - personalize based on their data${feedbackInstruction}`;

    // Create Anthropic client
    const client = new Anthropic({ apiKey });

    console.log('[synthesize-week-summary] Calling Claude API with', {
      activitiesCount: activities?.length,
      hasProfile: !!profile,
      detailPreference,
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate a weekly check-in summary based on this data:\n\n${context}${existingSummaryContext}`,
        },
      ],
    });

    console.log('[synthesize-week-summary] Got response, length:', response.content[0]?.text?.length);

    const responseText = response.content[0].text.trim();

    // Try to parse as JSON, fallback to legacy format
    try {
      // Extract JSON from response (may have markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Build the full summary text from sections
        const fullSummary = [
          parsed.trainingRecap,
          parsed.nutritionMetrics,
          parsed.overallAssessment,
        ].filter(Boolean).join('\n\n');

        res.json({
          summary: fullSummary,
          sections: {
            training: parsed.trainingRecap,
            nutrition: parsed.nutritionMetrics,
            overall: parsed.overallAssessment,
          },
          suggestions: parsed.suggestions || [],
        });
      } else {
        // Fallback - return as plain summary
        res.json({ summary: responseText, suggestions: [] });
      }
    } catch (parseErr) {
      console.error('Failed to parse synthesis JSON, using raw text:', parseErr.message);
      res.json({ summary: responseText, suggestions: [] });
    }

  } catch (err) {
    console.error('Week summary synthesis error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Serve static files in production
app.use(express.static(join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
