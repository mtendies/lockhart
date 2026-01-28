import Anthropic from '@anthropic-ai/sdk';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
