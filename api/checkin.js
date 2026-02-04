import Anthropic from '@anthropic-ai/sdk';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  if (action === 'analyze') {
    return handleAnalyze(req, res);
  } else if (action === 'synthesize') {
    return handleSynthesize(req, res);
  } else {
    return res.status(400).json({ error: `Unknown action: ${action}` });
  }
}

// ============================================
// ACTION: analyze
// ============================================
async function handleAnalyze(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { checkIn, playbook, profile } = req.body;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (!checkIn || !playbook) {
    return res.json({ suggestions: [] });
  }

  const client = new Anthropic({ apiKey });

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
3. Any patterns in their well-being metrics
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
        "index": 0
      },
      "rationale": "Explanation of why you're suggesting this change"
    }
  ]
}

If their check-in shows solid progress and no changes needed, return: { "suggestions": [] }

IMPORTANT: Return ONLY valid JSON, no markdown formatting.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: analysisPrompt }],
    });

    const content = response.content[0]?.text || '';

    try {
      const analysis = JSON.parse(content);
      res.json({ suggestions: analysis.suggestions || [] });
    } catch (parseErr) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        res.json({ suggestions: analysis.suggestions || [] });
      } else {
        res.json({ suggestions: [] });
      }
    }
  } catch (err) {
    console.error('Check-in analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ============================================
// ACTION: synthesize
// ============================================
async function handleSynthesize(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { checkInData, activities, profile } = req.body;

  if (!apiKey) {
    return res.json({ synthesized: checkInData });
  }

  const client = new Anthropic({ apiKey });

  const sortedActivities = [...(activities || [])].sort((a, b) =>
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  const activitiesByDay = {};
  sortedActivities.forEach(a => {
    const dayName = new Date(a.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
    if (!activitiesByDay[dayName]) activitiesByDay[dayName] = [];
    activitiesByDay[dayName].push(a);
  });

  const chronologicalActivities = Object.entries(activitiesByDay)
    .map(([day, acts]) => {
      const dayEntries = acts.map(a => {
        const parts = [a.summary || a.rawText];
        if (a.data?.feeling) parts.push(`(felt ${a.data.feeling})`);
        return parts.join(' ');
      }).join('; ');
      return `- ${day}: ${dayEntries}`;
    }).join('\n');

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

Return ONLY valid JSON.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: synthesisPrompt }],
    });

    const content = response.content[0]?.text || '';

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      res.json({ synthesized: result });
    } catch (parseErr) {
      res.json({ synthesized: checkInData });
    }
  } catch (err) {
    console.error('Synthesis error:', err.message);
    res.json({ synthesized: checkInData });
  }
}
