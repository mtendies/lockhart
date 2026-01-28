import Anthropic from '@anthropic-ai/sdk';
import { getNestedValue, formatFieldName } from './_utils.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { oldProfile, newProfile, playbook, changedFields, pendingSuggestions = [] } = req.body;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (!changedFields || changedFields.length === 0) {
    return res.json({ suggestion: null });
  }

  const client = new Anthropic({ apiKey });

  const changesDescription = changedFields.map(field => {
    const oldValue = getNestedValue(oldProfile, field) || '(not set)';
    const newValue = getNestedValue(newProfile, field) || '(not set)';
    return `- ${formatFieldName(field)}: "${oldValue}" → "${newValue}"`;
  }).join('\n');

  const playbookDescription = playbook ? `
Current Playbook:
- Summary: ${playbook.summary || '(none)'}
- Principles: ${(playbook.principles || []).map((p, i) => `[${i}] ${p.text}`).join('; ') || '(none)'}
- Weekly Focus: ${(playbook.weeklyFocus || []).map((f, i) => `[${i}] ${f.action}`).join('; ') || '(none)'}
- On Your Radar: ${(playbook.radar || []).map((r, i) => `[${i}] ${r.suggestion}`).join('; ') || '(none)'}
` : 'No playbook generated yet.';

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
- If the user IMPROVED something, check if there are pending suggestions about that issue and mark them for dismissal
- If the user FIXED an issue that led to an existing playbook item, suggest REMOVING that item
- Only create NEW suggestions for genuinely new concerns
- If the change is a positive improvement with no further action needed, acknowledge it positively

Respond with a JSON object:
{
  "dismissSuggestionIds": ["id1", "id2"],
  "resolved": true/false,
  "message": "Positive acknowledgment",
  "shouldUpdate": true/false,
  "section": "principles" | "weeklyFocus" | "radar" | "summary",
  "action": "add" | "edit" | "remove",
  "text": "EXACT text to match",
  "why": "Brief explanation",
  "context": "Additional context",
  "timing": "When to consider",
  "rationale": "Why this matters",
  "sources": "Research/guidelines",
  "removeIndex": 0
}

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
    } catch (parseErr) {
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
        res.json({ suggestion: null, dismissSuggestionIds: [], resolved: false });
      }
    }
  } catch (err) {
    console.error('Profile change analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
