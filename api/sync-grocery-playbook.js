import Anthropic from '@anthropic-ai/sdk';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { groceryData, playbook, profile, pendingSuggestions = [] } = req.body;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (!groceryData || !playbook) {
    return res.json({ suggestions: [], wins: [], habitsToAdd: [] });
  }

  const client = new Anthropic({ apiKey });

  const frequentItems = groceryData.allItems
    ?.sort((a, b) => b.count - a.count)
    .slice(0, 30)
    .map(i => `${i.name} (${i.count}x)`)
    .join('\n') || 'No items';

  const recentPurchases = groceryData.orders
    ?.slice(0, 3)
    .map(o => `${new Date(o.date).toLocaleDateString()}: ${o.items.join(', ')}`)
    .join('\n') || 'No recent orders';

  const playbookSummary = `
Summary: ${playbook.summary || 'None'}

Key Principles:
${(playbook.principles || []).map((p, i) => `[${i}] ${p.text}`).join('\n') || 'None'}

This Week's Focus:
${(playbook.weeklyFocus || []).map((f, i) => `[${i}] ${f.action}`).join('\n') || 'None'}

On Your Radar:
${(playbook.radar || []).map((r, i) => `[${i}] ${r.suggestion}`).join('\n') || 'None'}
`;

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

1. **Completed Recommendations**: If the Playbook suggests something and they're now buying it
2. **Positive Progress**: Things they're doing well that align with goals
3. **New Concerns**: If shopping patterns suggest a new issue
4. **Habit Formation**: If they've consistently bought something healthy (3+ orders)

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
        "index": 0
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
  "dismissSuggestionIds": ["id1"]
}

IMPORTANT: Return ONLY valid JSON.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: syncPrompt }],
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

      res.json({
        suggestions: result.suggestions || [],
        wins: result.wins || [],
        habitsToAdd: result.habitsToAdd || [],
        dismissSuggestionIds: result.dismissSuggestionIds || [],
      });
    } catch (parseErr) {
      res.json({ suggestions: [], wins: [], habitsToAdd: [], dismissSuggestionIds: [] });
    }
  } catch (err) {
    console.error('Grocery-playbook sync error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
