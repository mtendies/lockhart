import Anthropic from '@anthropic-ai/sdk';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { meals, profile, groceryData, calorieTarget, proteinTarget } = req.body;

  if (!meals || !Array.isArray(meals)) {
    return res.status(400).json({ error: 'meals array required' });
  }

  // Calculate totals from meals
  const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const mealDescriptions = meals
    .filter(m => m.content && m.content.trim())
    .map(m => `${m.label || m.type}: ${m.content}`)
    .join('\n');

  if (!mealDescriptions) {
    return res.status(400).json({ error: 'No meal content to analyze' });
  }

  // Build context about the user
  const profileContext = [];
  if (profile?.weight) profileContext.push(`Weight: ${profile.weight} ${profile.weightUnit || 'lbs'}`);
  if (profile?.age) profileContext.push(`Age: ${profile.age}`);
  if (profile?.sex) profileContext.push(`Sex: ${profile.sex}`);
  if (profile?.activityLevel) profileContext.push(`Activity: ${profile.activityLevel}`);

  // Get goals
  const goalsArray = Array.isArray(profile?.goals) ? profile.goals :
                     typeof profile?.goals === 'string' ? [profile.goals] : [];
  const hasMuscleBuildingGoal = goalsArray.some(g =>
    g?.toLowerCase?.()?.includes('muscle') || g?.toLowerCase?.()?.includes('gain')
  );
  const hasWeightLossGoal = goalsArray.some(g =>
    g?.toLowerCase?.()?.includes('loss') || g?.toLowerCase?.()?.includes('fat') || g?.toLowerCase?.()?.includes('weight')
  );

  const goalContext = hasMuscleBuildingGoal ? 'muscle building/gaining weight' :
                      hasWeightLossGoal ? 'weight loss/fat loss' :
                      'general health and wellness';

  // Recent grocery items for context
  const recentGroceries = groceryData?.allItems?.slice(0, 15)
    ?.map(i => i.name)?.join(', ') || 'Not available';

  const prompt = `Analyze this person's daily food intake and provide personalized nutrition feedback.

## User Profile
${profileContext.join('\n') || 'No profile data'}
Goal: ${goalContext}
Daily calorie target: ${calorieTarget || 2000} calories
Daily protein target: ${proteinTarget || 100}g

## Today's Meals
${mealDescriptions}

## Recent Groceries (for context)
${recentGroceries}

## Instructions
Analyze the day's nutrition and provide feedback in this exact JSON format:

{
  "totalCalories": <estimated total calories as number>,
  "macros": {
    "protein": {"grams": <number>, "target": ${proteinTarget || 100}, "percentage": <0-100>},
    "carbs": {"grams": <number>, "target": <estimated target>, "percentage": <0-100>},
    "fats": {"grams": <number>, "target": <estimated target>, "percentage": <0-100>},
    "fiber": {"grams": <number>, "target": 30, "percentage": <0-100>}
  },
  "calorieAssessment": {
    "status": "on-track" | "under" | "over",
    "message": "<short 1-sentence assessment>"
  },
  "proteinAssessment": {
    "status": "good" | "low" | "high",
    "message": "<short 1-sentence assessment with specific suggestion if low>"
  },
  "highlights": [
    {"type": "positive", "text": "<something they did well>"},
    {"type": "positive", "text": "<another positive if applicable>"}
  ],
  "gaps": [
    {"nutrient": "<missing nutrient>", "suggestion": "<specific food suggestion>"}
  ],
  "personalizedTip": "<1-2 sentence tip based specifically on their ${goalContext} goal>",
  "mealByMealBreakdown": [
    {"meal": "Breakfast", "calories": <number>, "protein": <number>, "notes": "<brief note>"},
    {"meal": "Lunch", "calories": <number>, "protein": <number>, "notes": "<brief note>"},
    {"meal": "Dinner", "calories": <number>, "protein": <number>, "notes": "<brief note>"},
    {"meal": "Snacks", "calories": <number>, "protein": <number>, "notes": "<brief note>"}
  ]
}

Be realistic with estimates. For ${goalContext}:
${hasMuscleBuildingGoal ? '- Emphasize protein intake and whether they hit their protein goal\n- Suggest high-protein additions if falling short' : ''}
${hasWeightLossGoal ? '- Focus on calorie deficit and satiety\n- Highlight fiber and protein for fullness\n- Note any calorie-dense items that could be swapped' : ''}
${!hasMuscleBuildingGoal && !hasWeightLossGoal ? '- Focus on balanced nutrition\n- Highlight variety and micronutrient coverage' : ''}

Return ONLY the JSON object, no other text.`;

  // Demo mode when no API key
  if (!apiKey) {
    const demoAnalysis = {
      totalCalories: totalCalories || 1800,
      macros: {
        protein: { grams: 85, target: proteinTarget || 100, percentage: 85 },
        carbs: { grams: 200, target: 250, percentage: 80 },
        fats: { grams: 70, target: 75, percentage: 93 },
        fiber: { grams: 22, target: 30, percentage: 73 },
      },
      calorieAssessment: {
        status: 'on-track',
        message: 'Good progress toward your daily calorie goal.',
      },
      proteinAssessment: {
        status: 'good',
        message: 'Solid protein intake today!',
      },
      highlights: [
        { type: 'positive', text: 'Good protein distribution across meals' },
        { type: 'positive', text: 'Included vegetables at multiple meals' },
      ],
      gaps: [
        { nutrient: 'Fiber', suggestion: 'Add a handful of berries or leafy greens' },
      ],
      personalizedTip: 'Based on your goals, consider adding a protein-rich snack in the afternoon to support your progress.',
      mealByMealBreakdown: meals.map(m => ({
        meal: m.label || m.type,
        calories: m.calories || 0,
        protein: Math.round((m.calories || 0) * 0.15 / 4),
        notes: 'Balanced meal',
      })),
    };
    return res.status(200).json(demoAnalysis);
  }

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', text);
      return res.status(500).json({ error: 'Failed to parse analysis' });
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return res.status(200).json(analysis);

  } catch (err) {
    console.error('Daily nutrition analysis error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
