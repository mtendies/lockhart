import Anthropic from '@anthropic-ai/sdk';

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { text, recentGroceries } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Meal text required' });
  }

  if (!apiKey) {
    return res.status(503).json({ error: 'API key not configured' });
  }

  const client = new Anthropic({ apiKey });

  // Build grocery context section if available
  const groceryContext = recentGroceries && recentGroceries.length > 0
    ? `\n\nThe user recently purchased these groceries:\n${recentGroceries.map(item => `- ${item}`).join('\n')}\n\nWhen the user mentions a generic food (like "yogurt" or "bread"), assume it's one of their recently purchased items unless they specify otherwise. If ambiguous between multiple purchased options (e.g., they have both "0% Fage Greek Yogurt" and "2% Chobani"), use the most common/likely one but set needsClarification to true.`
    : '';

  const systemPrompt = `You are a nutrition calculator. Parse the following meal description and return ONLY a JSON object of food items with calories. Be accurate about portions - if the user says "2 sandwiches", multiply ALL ingredients by 2. Account for cooking methods and preparation.${groceryContext}

Return format:
{
  "items": [
    {
      "name": "Tuna (canned, 2 sandwiches worth)",
      "quantity": 2,
      "unit": "cans",
      "caloriesPerUnit": 100,
      "totalCalories": 200,
      "confidence": "high"
    }
  ],
  "totalCalories": 850,
  "notes": "Estimated for 2 full sandwiches with standard portions",
  "needsClarification": false,
  "clarificationQuestion": null,
  "clarificationOptions": null
}

If you need to clarify which specific product the user meant (because they have multiple similar items in their groceries), include:
- "needsClarification": true
- "clarificationQuestion": "Did you mean the 0% Fage Greek Yogurt you bought recently?"
- "clarificationOptions": ["0% Fage Greek Yogurt", "2% Chobani", "Other yogurt"]

Still provide your best estimate in the items array even when asking for clarification.

Confidence levels:
- high: common food, clear portion (or matched to user's grocery item)
- medium: had to estimate portion size
- low: very ambiguous, could vary significantly

Rules:
- Break compound foods into their component ingredients (e.g., "tuna salad sandwich" = bread + tuna + mayo + lettuce)
- If a portion is ambiguous, use a reasonable default and set confidence to "medium"
- For homemade items, estimate typical home-prepared portions
- For restaurant items, use typical restaurant portions (usually larger)
- Always include reasonable amounts of cooking oils, condiments, and spreads when implied
- Use standard USDA-referenced calorie values where possible
- Round totalCalories for each item to the nearest 5
- When matching to user's grocery items, use the specific product's nutrition info if you know it

Respond with ONLY valid JSON, no other text.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: text.trim() }],
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

      // Validate structure
      if (!result.items || !Array.isArray(result.items)) {
        return res.status(502).json({ error: 'Invalid response structure' });
      }

      res.json(result);
    } catch (parseErr) {
      console.error('Failed to parse AI calorie response:', parseErr.message);
      res.status(502).json({ error: 'Failed to parse AI response' });
    }
  } catch (err) {
    console.error('Calorie estimation error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
