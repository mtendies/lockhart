import Anthropic from '@anthropic-ai/sdk';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
