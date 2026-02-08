import Anthropic from '@anthropic-ai/sdk';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { text, profile, playbook, weeklyProgress } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text input required' });
  }

  if (!apiKey) {
    return res.json({
      type: 'unknown',
      isQuestion: true,
      message: 'Got it! (Demo mode - API key required for smart parsing)',
      activity: null,
    });
  }

  const client = new Anthropic({ apiKey });

  const weeklyFocusContext = playbook?.weeklyFocus
    ? playbook.weeklyFocus.map((f, i) => {
        const progress = weeklyProgress?.[i];
        if (progress?.trackable) {
          return `[${i}] "${f.action}" - Progress: ${progress.current}/${progress.target}`;
        }
        return `[${i}] "${f.action}"`;
      }).join('\n')
    : 'No weekly focus items';

  const playbookContext = playbook ? `
Current Playbook:
- Key Principles: ${playbook.principles?.map((p, i) => `[${i}] ${p.text}`).join('; ') || 'None'}
- This Week's Focus: ${playbook.weeklyFocus?.map((f, i) => `[${i}] ${f.action}`).join('; ') || 'None'}
- On Your Radar: ${playbook.radar?.map((r, i) => `[${i}] ${r.suggestion}`).join('; ') || 'None'}
- Big Picture Summary: ${playbook.summary || 'None'}
` : '';

  // Safely convert goals to array
  const goalsArray = Array.isArray(profile?.goals)
    ? profile.goals
    : typeof profile?.goals === 'string'
      ? [profile.goals]
      : [];

  const profileContext = profile ? `
Current Profile:
- Weight: ${profile.weight || 'Not set'} lbs
- Goals: ${goalsArray.join(', ') || 'None'}
- Preferences: ${profile.preferences || 'None'}
` : '';

  const parsePrompt = `You are a health advisor parsing a quick entry from a user. Determine the intent:

1. ACTIVITY LOG (workout, meal, sleep, weight, etc.) - parse and store
2. PLAYBOOK EDIT (change/update/remove/add to playbook items) - generate suggestion
3. PROFILE EDIT (update weight, goals, preferences) - generate suggestion
4. QUESTION (needs a conversational answer) - route to chat

User's input: "${text}"

User's goals: ${goalsArray.join(', ') || 'General health'}

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
      "feeling": null,
      "weight": 182, "hitProteinGoal": true,
      "quality": null,
      "hours": 7.5,
      "exercise": "bench press", "pr": true, "prValue": "185 lbs",
      "notes": "any additional context the user explicitly provided"
    },
    "goalConnections": [0, 2],
    "nutritionPlacement": {
      "mealType": "breakfast|morningSnack|lunch|afternoonSnack|dinner|eveningSnack|null",
      "confidence": "high|medium|low",
      "reason": "Why this meal type was chosen",
      "requiresUserConfirmation": true/false,
      "isExplicitOverwrite": true/false
    }
  },
  "response": {
    "message": "Encouraging response",
    "progressUpdate": "1 of 3 runs done this week!",
    "clarifyingQuestion": "How did that feel?"
  },
  "needsClarification": true/false
}

FOR TARGET-ONLY UPDATES:
{
  "intent": "targetUpdate",
  "isQuestion": false,
  "type": "general",
  "targetUpdate": {
    "index": 0,
    "target": 4
  },
  "response": {
    "message": "Updated target to 4 times per week"
  }
}

FOR PLAYBOOK EDITS:
{
  "intent": "playbookEdit",
  "isQuestion": false,
  "type": "general",
  "playbookSuggestion": {
    "section": "weeklyFocus|principles|radar|summary",
    "action": "add|edit|remove",
    "index": 0,
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

FOR PROFILE EDITS:
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

FOR GROCERY SWAPS:
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

Return ONLY valid JSON.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: parsePrompt }],
    });

    const content = response.content[0]?.text || '';

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
}
