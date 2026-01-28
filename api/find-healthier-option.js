import Anthropic from '@anthropic-ai/sdk';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { product, profile, playbook } = req.body;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (!product || !product.trim()) {
    return res.status(400).json({ error: 'Product name required' });
  }

  const client = new Anthropic({ apiKey });

  const userGoals = (profile?.goals || []).join(', ') || 'general health';
  const playbookSummary = playbook?.summary || '';

  const searchPrompt = `You are a nutrition advisor helping someone find healthier alternatives to a product they buy.

## User's Goals
${userGoals}
${playbookSummary ? `\nContext: ${playbookSummary}` : ''}

## Product to Replace
"${product}"

## Your Task
Suggest 2-3 healthier alternatives that serve THE SAME PURPOSE as this product.

CRITICAL RULES:
1. Alternatives MUST be in the SAME functional category:
   - If it's a cereal, suggest other cereals
   - If it's a milk, suggest other milks
   - If it's a bread, suggest other breads
   - If it's a snack, suggest similar snacks
   - If it's a yogurt, suggest other yogurts

2. Think: "What is this product USED FOR?" The alternatives must work as drop-in replacements.

3. For each alternative, explain:
   - Why it's healthier (specific numbers when possible)
   - How it supports the user's goals
   - Taste/texture similarity if relevant

4. Prioritize real, available products with brand names when possible.

5. If there truly is no healthier option in the same category, say so honestly.

Respond with JSON:
{
  "originalProduct": "${product}",
  "category": "The product category (e.g., 'cereal', 'milk', 'snack')",
  "alternatives": [
    {
      "name": "Specific product name with brand",
      "whyHealthier": "Specific comparison (e.g., '11g protein vs 2g, 5g sugar vs 12g')",
      "goalConnection": "How this helps their specific goals",
      "tasteSimilarity": "Optional: taste/texture notes for easier transition"
    }
  ],
  "noAlternatives": false,
  "noAlternativesReason": "Only if there are no healthier options in the same category"
}

IMPORTANT: Return ONLY valid JSON.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: searchPrompt }],
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
      res.status(500).json({ error: 'Failed to find alternatives' });
    }
  } catch (err) {
    console.error('Find healthier option error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
