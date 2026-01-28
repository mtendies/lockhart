import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from './_utils.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { profile, checkIns, existingPlaybook } = req.body;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const client = new Anthropic({ apiKey });

  const engagementLevel = profile?.onboardingDepth || 'moderate';
  const levelConfig = {
    chill: { focusGoals: '2-3', principles: '2-3', radar: '1-2', tone: 'Keep it simple and approachable. Focus on the highest-impact items only.' },
    moderate: { focusGoals: '3-4', principles: '3-4', radar: '2-3', tone: 'Balance detail with simplicity. Provide clear reasoning without overwhelming.' },
    hardcore: { focusGoals: '4-5', principles: '4-5', radar: '3-4', tone: 'Be comprehensive and detailed. Include specific metrics and advanced techniques.' },
  };
  const config = levelConfig[engagementLevel] || levelConfig.moderate;

  const profileContext = buildSystemPrompt(profile || {}, {}, checkIns || []);

  let playbookPrompt;

  if (existingPlaybook) {
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
2. **UPDATE** items that need adjustment based on new data
3. **REMOVE** items that are no longer relevant
4. **ADD** new items only if there's a clear gap or new need

For the Summary: Update it to reflect current status and recent progress.
For Key Principles: Keep ${config.principles} principles total
For This Week's Focus: Keep ${config.focusGoals} focus items.
Tone guidance: ${config.tone}

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
- Generate ${config.focusGoals} weekly focus items based on their most recent check-in data
- Generate ${config.radar} radar items for future consideration
- Be specific and actionable, not vague
- Reference their actual goals, metrics, and check-in data
- Include research-backed reasoning in the "why" fields

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

    try {
      const playbook = JSON.parse(content);
      res.json(playbook);
    } catch (parseErr) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const playbook = JSON.parse(jsonMatch[0]);
        res.json(playbook);
      } else {
        res.status(500).json({ error: 'Failed to generate playbook' });
      }
    }
  } catch (err) {
    console.error('Playbook generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
