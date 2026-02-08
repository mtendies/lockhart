// Shared utilities for API routes

export function buildSystemPrompt(profile, notes, checkIns, playbook, pendingSuggestions, groceryData, activityLogs, nutritionProfile, nutritionCalibration, learnedInsights) {
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

  // Safely convert goals to array (handles array, string, object, or undefined)
  const goalsArray = Array.isArray(profile.goals)
    ? profile.goals
    : typeof profile.goals === 'string'
      ? [profile.goals]
      : [];

  if (goalsArray.length > 0) {
    const goalParts = goalsArray.map(g => {
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
      const reflections = Object.entries(c)
        .filter(([k, v]) => k.endsWith('Reflection') && v)
        .map(([k, v]) => `${k.replace('Reflection', '')}: ${v}`);
      if (reflections.length > 0) parts.push(...reflections);
      if (c.openReflection) parts.push(`Notes: ${c.openReflection}`);
      return parts.join(' | ');
    });
    sections.push(`## Weekly Check-In History\nRecent check-ins from the user (most recent first). Use this to understand their progress and provide personalized advice:\n${checkInParts.join('\n')}`);
  }

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

  if (pendingSuggestions && pendingSuggestions.length > 0) {
    const pendingParts = [];
    pendingParts.push('## Pending Playbook Suggestions');
    pendingParts.push('These suggestions are awaiting user approval. Do not duplicate them.\n');
    pendingSuggestions.forEach(s => {
      pendingParts.push(`- [${s.action}] ${s.section}: "${s.content?.text}" (Status: pending)`);
    });
    sections.push(pendingParts.join('\n'));
  }

  if (groceryData && groceryData.allItems && groceryData.allItems.length > 0) {
    const groceryParts = [];
    groceryParts.push('## Grocery Shopping Data');
    groceryParts.push('This is data from the user\'s uploaded grocery orders. Use this to personalize nutrition advice and answer questions about their shopping habits.\n');

    groceryParts.push(`**Total Orders:** ${groceryData.orders?.length || 0}`);
    groceryParts.push(`**Unique Items Tracked:** ${groceryData.allItems.length}`);
    groceryParts.push(`**Last analyzed:** ${groceryData.lastAnalyzed ? new Date(groceryData.lastAnalyzed).toLocaleDateString() : 'Not yet analyzed'}`);
    groceryParts.push('');

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

    if (groceryData.orders && groceryData.orders.length > 0) {
      groceryParts.push('**Recent Orders (last 5):**');
      groceryData.orders.slice(0, 5).forEach(order => {
        const date = new Date(order.date).toLocaleDateString();
        groceryParts.push(`- ${date} (${order.source}): ${order.items.slice(0, 10).join(', ')}${order.items.length > 10 ? ` ... and ${order.items.length - 10} more` : ''}`);
      });
      groceryParts.push('');
    }

    if (groceryData.patterns?.categoryBreakdown) {
      groceryParts.push('**Shopping Category Distribution:**');
      Object.entries(groceryData.patterns.categoryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, pct]) => {
          groceryParts.push(`- ${cat}: ${pct}%`);
        });
      groceryParts.push('');
    }

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

    if (groceryData.habitsFormed && groceryData.habitsFormed.length > 0) {
      groceryParts.push('**Healthy Habits Formed (celebrate these!):**');
      groceryData.habitsFormed.forEach(habit => {
        groceryParts.push(`- ${habit.text}`);
      });
      groceryParts.push('');
    }

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

  if (nutritionProfile && !nutritionProfile.needsAnalysis) {
    const nutritionParts = [];
    nutritionParts.push('## Daily Nutritional Profile');
    nutritionParts.push('The user completed 5 days of meal tracking. Use this to personalize all nutrition advice.\n');

    if (nutritionProfile.overview) {
      nutritionParts.push('**Estimated Daily Intake:**');
      nutritionParts.push(`- Calories: ${nutritionProfile.overview.estimatedDailyCalories || '~2,000'}`);
      nutritionParts.push(`- Protein: ${nutritionProfile.overview.proteinEstimate || '~80g'}`);
      nutritionParts.push(`- Carbs: ${nutritionProfile.overview.carbEstimate || '~250g'}`);
      nutritionParts.push(`- Fats: ${nutritionProfile.overview.fatEstimate || '~70g'}`);
      nutritionParts.push('');
    }

    if (nutritionProfile.mealPatterns) {
      nutritionParts.push('**Typical Meals:**');
      Object.entries(nutritionProfile.mealPatterns).forEach(([meal, data]) => {
        if (data.typical && data.typical.length > 0) {
          nutritionParts.push(`- ${meal.charAt(0).toUpperCase() + meal.slice(1)}: ${data.typical.slice(0, 2).join('; ')}`);
        }
      });
      nutritionParts.push('');
    }

    if (nutritionProfile.strengths && nutritionProfile.strengths.length > 0) {
      nutritionParts.push('**Identified Strengths:**');
      nutritionProfile.strengths.forEach(s => nutritionParts.push(`- ${s}`));
      nutritionParts.push('');
    }

    if (nutritionProfile.gaps && nutritionProfile.gaps.length > 0) {
      nutritionParts.push('**Areas for Improvement:**');
      nutritionProfile.gaps.forEach(g => nutritionParts.push(`- ${g}`));
      nutritionParts.push('');
    }

    nutritionParts.push('Reference this profile when discussing nutrition, suggesting meals, or answering food-related questions.');
    sections.push(nutritionParts.join('\n'));
  }

  if (nutritionCalibration && !nutritionCalibration.isComplete && nutritionCalibration.inPeriod) {
    const calParts = [];
    calParts.push('## Nutrition Calibration In Progress');
    calParts.push(`The user is tracking meals for their first week (${nutritionCalibration.completed}/5 days complete).`);
    calParts.push('When they mention meals, encourage them to log it in their calibration tracker.');

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

export const DEMO_RESPONSES = [
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

export function getDemoResponse(userMessage) {
  const lower = userMessage.toLowerCase();
  for (const demo of DEMO_RESPONSES) {
    if (demo.keywords.some(kw => lower.includes(kw))) {
      return demo.response;
    }
  }
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

export function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    if (value === undefined || value === null) return undefined;
    value = value[key];
  }
  return value;
}

export function formatFieldName(field) {
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
