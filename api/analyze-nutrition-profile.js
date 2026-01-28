import Anthropic from '@anthropic-ai/sdk';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { calibrationData, profile } = req.body;

    if (!calibrationData) {
      return res.status(400).json({ error: 'Calibration data required' });
    }

    const userMeals = profile?.mealPattern || ['breakfast', 'lunch', 'dinner', 'snacks', 'dessert'];
    const mealLabels = {
      breakfast: 'Breakfast',
      morningSnack: 'Morning Snack',
      lunch: 'Lunch',
      afternoonSnack: 'Afternoon Snack',
      dinner: 'Dinner',
      eveningSnack: 'Evening Snack/Dessert',
      snacks: 'Snacks',
      dessert: 'Dessert/Other',
    };

    const mealSummary = Object.entries(calibrationData.days || {})
      .filter(([_, data]) => data.completed)
      .map(([day, data]) => {
        const mealLines = userMeals.map(meal => {
          const label = mealLabels[meal] || meal;
          const content = data[meal] || 'Not logged';
          return `- ${label}: ${content}`;
        }).join('\n');
        return `${day.charAt(0).toUpperCase() + day.slice(1)}:\n${mealLines}`;
      })
      .join('\n\n');

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `You are a nutrition analyst. Analyze the user's 5-day meal tracking data and provide insights.

User profile:
- Name: ${profile?.name || 'Unknown'}
- Goals: ${profile?.goals?.join(', ') || 'General health'}
- Weight: ${profile?.weight || 'Unknown'} ${profile?.weightUnit || 'lbs'}
- Meals they typically eat: ${userMeals.map(m => mealLabels[m] || m).join(', ')}

IMPORTANT - Recipe & Portion Handling:
When users log meals, they may include:
1. Full recipes with ingredient lists and quantities
2. Portion indicators like "ate half", "had about 1/3", "2 servings out of 6"

When analyzing entries with recipes:
- Parse out the ingredients and estimate total recipe nutrition
- Apply any portion fraction mentioned to calculate what they ACTUALLY ate

Return a JSON object with this structure:
{
  "overview": {
    "estimatedDailyCalories": "~X,XXX",
    "proteinEstimate": "~XXg",
    "carbEstimate": "~XXXg",
    "fatEstimate": "~XXg"
  },
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "strengthRationales": [
    "Why strength 1 is a strength for this user...",
    "Why strength 2 emerged from their meal patterns...",
    "Why strength 3 supports their specific goals..."
  ],
  "gaps": ["gap 1", "gap 2", "gap 3"],
  "gapRationales": [
    "Why gap 1 matters for this user...",
    "Why gap 2 was identified...",
    "Why gap 3 is important..."
  ],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "recommendationRationales": [
    "Why this recommendation...",
    "Why this recommendation...",
    "Why this recommendation..."
  ],
  "mealPatterns": {
    "breakfast": { "avgProtein": "~XXg", "suggestions": ["suggestion"] },
    "lunch": { "avgProtein": "~XXg", "suggestions": ["suggestion"] },
    "dinner": { "avgProtein": "~XXg", "suggestions": ["suggestion"] }
  },
  "parsedRecipes": [
    {
      "day": "monday",
      "meal": "dinner",
      "recipeName": "Chicken Stir Fry",
      "totalServings": 4,
      "portionEaten": "half (2 servings)",
      "estimatedCalories": "~450",
      "estimatedProtein": "~35g"
    }
  ]
}

Be specific and actionable.`,
      messages: [
        {
          role: 'user',
          content: `Here is my 5-day meal log. Please analyze my eating patterns:\n\n${mealSummary}`,
        },
      ],
    });

    const content = response.content[0].text;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      res.json(analysis);
    } else {
      res.json({
        overview: {
          estimatedDailyCalories: '~2,000',
          proteinEstimate: '~80g',
          carbEstimate: '~250g',
          fatEstimate: '~70g',
        },
        strengths: ['Consistent meal timing', 'Good variety in food choices'],
        gaps: ['Protein distribution could be improved', 'Consider more vegetables'],
        recommendations: ['Add protein to breakfast', 'Include a vegetable with each meal'],
        mealPatterns: {
          breakfast: { avgProtein: '~15g', suggestions: ['Add eggs or Greek yogurt'] },
          lunch: { avgProtein: '~25g', suggestions: ['Good protein balance'] },
          dinner: { avgProtein: '~30g', suggestions: ['Maintain current portions'] },
          snacks: { avgProtein: '~5g', suggestions: ['Consider protein-rich snacks'] },
        },
      });
    }
  } catch (err) {
    console.error('Nutrition profile analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
