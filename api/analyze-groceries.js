import Anthropic from '@anthropic-ai/sdk';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  const itemsSummary = groceryData.allItems
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)
    .map(i => `${i.name} (purchased ${i.count}x)`)
    .join('\n');

  const orderHistory = groceryData.orders
    .slice(0, 5)
    .map(o => `${new Date(o.date).toLocaleDateString()}: ${o.itemCount} items from ${o.source}`)
    .join('\n');

  const userGoals = (profile?.goals || []).join(', ') || 'general health';
  const restrictions = profile?.restrictions || 'none specified';
  const playBookSummary = playbook?.summary || '';

  const weeklyFocus = (playbook?.weeklyFocus || []).map(f => f.action).join('; ') || 'none';
  const principles = (playbook?.principles || []).map(p => p.text).join('; ') || 'none';

  const analysisPrompt = `You are a nutrition advisor analyzing a user's grocery shopping patterns to provide personalized recommendations.

## User Profile
- Goals: ${userGoals}
- Dietary restrictions: ${restrictions}
- Playbook summary: ${playBookSummary || 'No playbook yet'}

## Current Playbook Focus
- This Week's Focus: ${weeklyFocus}
- Key Principles: ${principles}

## Grocery History
Recent orders:
${orderHistory}

## Frequently Purchased Items (most frequent first):
${itemsSummary}

---

Analyze this shopping data and provide:

1. **Category Breakdown**: Categorize items into: Produce, Protein, Dairy, Grains, Snacks, Beverages, Frozen, Condiments/Sauces, Other.

2. **Smart Swaps**: Suggest 3-5 specific product swaps that serve THE SAME FUNCTIONAL PURPOSE.

3. **Potential Gaps**: Identify 2-4 micronutrients or food groups that seem underrepresented.

4. **Cart Suggestions**: 5-7 specific items to add to their shopping.

5. **Wins**: Identify 1-3 positive things about their shopping.

6. **Habits Formed**: If they're consistently buying something healthy (3+ orders), note it.

Respond with JSON:
{
  "categoryBreakdown": {
    "Produce": 15,
    "Protein": 20,
    ...
  },
  "frequentItems": ["item1", "item2", ...],
  "smartSwaps": [
    { "current": "Honey Nut Cheerios", "suggestion": "Catalina Crunch Honey Graham", "reason": "11g protein vs 2g, lower sugar" }
  ],
  "potentialGaps": [
    { "gap": "Omega-3 sources", "suggestion": "Consider adding salmon, walnuts, or sardines", "relevance": "Supports cognitive function" }
  ],
  "cartSuggestions": [
    { "item": "Greek Yogurt", "reason": "High protein, supports your fat loss goal" }
  ],
  "wins": [
    { "text": "Great protein variety with chicken, fish, and Greek yogurt", "category": "protein" }
  ],
  "habitsFormed": [
    { "text": "Consistently buying leafy greens (spinach, kale)", "category": "produce", "relatedItems": ["spinach", "kale"] }
  ]
}

IMPORTANT: Return ONLY valid JSON.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: analysisPrompt }],
    });

    const content = response.content[0]?.text || '';

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
      res.status(500).json({ error: 'Failed to analyze groceries' });
    }
  } catch (err) {
    console.error('Grocery analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
