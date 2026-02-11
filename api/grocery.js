import Anthropic from '@anthropic-ai/sdk';

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { action } = req.body;

  if (action === 'parse') {
    return handleParse(req, res, apiKey);
  } else if (action === 'analyze') {
    return handleAnalyze(req, res, apiKey);
  } else {
    return res.status(400).json({ error: 'Invalid action. Use "parse" or "analyze".' });
  }
}

// ============================================
// PARSE: Extract items from receipt/image/text
// ============================================
async function handleParse(req, res, apiKey) {
  try {
    const { source, fileData, fileType, manualText } = req.body;
    const client = new Anthropic({ apiKey });

    // Handle manual text input
    if (manualText) {
      const parsePrompt = `Extract all grocery/food item names from this text. This is from a ${source || 'grocery'} order.

TEXT:
${manualText}

Rules:
- Only include food and grocery items
- Include brand names when present
- Skip non-food items (bags, fees, tips, taxes)
- Clean up item names (remove quantities, prices, item codes)

Return ONLY a JSON array of item names, like:
["Organic Bananas", "Chobani Greek Yogurt", "Kirkland Olive Oil"]

IMPORTANT: Return ONLY the JSON array, no other text.`;

      const parseResponse = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: parsePrompt }],
      });

      const content = parseResponse.content[0]?.text || '';

      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const items = JSON.parse(jsonMatch[0]);
          return res.json({
            items: items.filter(i => i && typeof i === 'string' && i.trim()),
            source: source || 'Unknown',
          });
        }
      } catch (parseErr) {
        const items = manualText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && line.length > 2 && line.length < 100);
        return res.json({
          items: items.slice(0, 100),
          source: source || 'Unknown',
        });
      }
    }

    // Handle base64-encoded file data
    if (!fileData) {
      return res.status(400).json({
        error: 'No file data provided. Please provide fileData (base64) or manualText.',
        needsManualInput: true,
      });
    }

    const isPDF = fileType === 'application/pdf';
    const isImage = fileType?.startsWith('image/');

    let extractedText = '';

    if (isPDF) {
      try {
        const pdfResponse = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: fileData,
                },
              },
              {
                type: 'text',
                text: `This is a grocery receipt or order confirmation from ${source || 'a grocery delivery service'}. Extract ALL the grocery/food item names.

Rules:
- Only extract food and grocery items (not prices, quantities, tax, totals, etc.)
- Include brand names if visible
- Skip non-food items (bags, delivery fees, tips, etc.)

Return ONLY a JSON array of item names, like:
["Organic Bananas", "Chobani Greek Yogurt", "Kirkland Olive Oil"]

IMPORTANT: Return ONLY the JSON array, no other text.`,
              },
            ],
          }],
        });

        const pdfContent = pdfResponse.content[0]?.text || '';
        try {
          const jsonMatch = pdfContent.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const items = JSON.parse(jsonMatch[0]);
            return res.json({
              items: items.filter(i => i && typeof i === 'string' && i.trim()),
              source: source || 'Unknown',
            });
          }
        } catch (parseErr) {
          extractedText = pdfContent;
        }
      } catch (pdfErr) {
        return res.status(400).json({
          error: 'Could not read PDF. Please take a screenshot and upload that, or paste your items manually.',
          needsManualInput: true,
        });
      }
    } else if (isImage) {
      const visionResponse = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: fileType,
                data: fileData,
              },
            },
            {
              type: 'text',
              text: `This is a grocery receipt or order confirmation. Extract ALL the grocery/food item names from this image.

Rules:
- Only extract food and grocery items (not prices, quantities, tax, totals, etc.)
- Include brand names if visible
- Skip non-food items
- Do NOT include any commentary

Return ONLY a JSON array of item names.`,
            },
          ],
        }],
      });

      const visionContent = visionResponse.content[0]?.text || '';
      try {
        const jsonMatch = visionContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const items = JSON.parse(jsonMatch[0]);
          return res.json({
            items: items.filter(i => i && typeof i === 'string' && i.trim()),
            source: source || 'Unknown',
          });
        }
      } catch (parseErr) {
        extractedText = visionContent;
      }
    } else {
      return res.status(400).json({
        error: 'Unsupported file type. Please upload a PDF or image.',
      });
    }

    // If we got extracted text but not JSON, try to clean it up
    if (extractedText) {
      const parsePrompt = `Extract all grocery/food item names from this text.

TEXT:
${extractedText}

Return ONLY a JSON array of item names.`;

      const parseResponse = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: parsePrompt }],
      });

      const content = parseResponse.content[0]?.text || '';

      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const items = JSON.parse(jsonMatch[0]);
          return res.json({
            items: items.filter(i => i && typeof i === 'string' && i.trim()),
            source: source || 'Unknown',
          });
        }
      } catch (parseErr) {
        const items = extractedText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && line.length > 2 && line.length < 100);
        return res.json({
          items: items.slice(0, 100),
          source: source || 'Unknown',
          parseWarning: 'Items may need manual review',
        });
      }
    }

    return res.status(400).json({
      error: 'Failed to parse grocery order. Please paste your items manually.',
      needsManualInput: true,
    });

  } catch (err) {
    console.error('Grocery parsing error:', err.message);
    res.status(500).json({
      error: 'Failed to parse grocery order. Please paste your items manually.',
      needsManualInput: true,
    });
  }
}

// ============================================
// FIX #13: Build allergen keywords from user profile
// ============================================
function buildAllergenKeywords(allergies = [], intolerances = []) {
  const keywords = [];

  const allergenMap = {
    'lactose': ['milk', 'dairy', 'yogurt', 'cheese', 'whey', 'casein', 'cream', 'butter', 'ice cream'],
    'dairy': ['milk', 'dairy', 'yogurt', 'cheese', 'whey', 'casein', 'cream', 'butter', 'ice cream'],
    'gluten': ['wheat', 'bread', 'pasta', 'flour', 'barley', 'rye', 'cereal', 'crackers'],
    'nuts': ['almond', 'peanut', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'nut'],
    'tree nuts': ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'macadamia'],
    'peanuts': ['peanut', 'peanut butter'],
    'eggs': ['egg', 'eggs', 'mayonnaise', 'mayo'],
    'soy': ['soy', 'tofu', 'tempeh', 'edamame', 'soybean'],
    'shellfish': ['shrimp', 'crab', 'lobster', 'shellfish', 'clam', 'mussel', 'oyster'],
    'fish': ['salmon', 'tuna', 'cod', 'fish', 'tilapia', 'sardine', 'anchovy'],
    'sesame': ['sesame', 'tahini'],
  };

  const all = [...allergies, ...intolerances];
  for (const item of all) {
    if (!item) continue;
    const lower = item.toLowerCase();

    // Check if it matches a known allergen category
    for (const [allergen, relatedKeywords] of Object.entries(allergenMap)) {
      if (lower.includes(allergen)) {
        keywords.push(...relatedKeywords);
      }
    }

    // Also add the raw allergen term itself
    keywords.push(lower);
  }

  return [...new Set(keywords)]; // Dedupe
}

// ============================================
// ANALYZE: Analyze shopping patterns
// ============================================
async function handleAnalyze(req, res, apiKey) {
  const { groceryData, profile, playbook } = req.body;

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

  // FIX #13: Extract allergies and intolerances from profile
  const allergies = profile?.allergies || [];
  const intolerances = profile?.intolerances || [];
  const dietaryRestrictions = [...allergies, ...intolerances, restrictions]
    .filter(r => r && r !== 'none specified')
    .join(', ') || 'none';

  const weeklyFocus = (playbook?.weeklyFocus || []).map(f => f.action).join('; ') || 'none';
  const principles = (playbook?.principles || []).map(p => p.text).join('; ') || 'none';

  const analysisPrompt = `You are a nutrition advisor analyzing a user's grocery shopping patterns to provide personalized recommendations.

## User Profile
- Goals: ${userGoals}
- **CRITICAL - Dietary restrictions/allergies/intolerances: ${dietaryRestrictions}**
- Playbook summary: ${playBookSummary || 'No playbook yet'}

**IMPORTANT: NEVER suggest products containing ingredients the user is allergic to or intolerant of.**
- If user is lactose intolerant: NO dairy-based products (milk, yogurt, cheese, whey protein, etc.)
- If user has nut allergy: NO nut-based products (almond milk, peanut butter, etc.)
- If user is gluten-free: NO wheat/gluten products

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

      // FIX #13: Post-process to filter out swaps containing allergens
      const allergenKeywords = buildAllergenKeywords(allergies, intolerances);
      const filteredSwaps = (analysis.smartSwaps || []).filter(swap => {
        const suggestion = (swap.suggestion || '').toLowerCase();
        return !allergenKeywords.some(keyword => suggestion.includes(keyword));
      });

      const filteredSuggestions = (analysis.cartSuggestions || []).filter(item => {
        const itemName = (item.item || '').toLowerCase();
        return !allergenKeywords.some(keyword => itemName.includes(keyword));
      });

      res.json({
        patterns: {
          categoryBreakdown: analysis.categoryBreakdown,
          frequentItems: analysis.frequentItems,
        },
        recommendations: {
          smartSwaps: filteredSwaps,
          potentialGaps: analysis.potentialGaps,
          cartSuggestions: filteredSuggestions,
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
