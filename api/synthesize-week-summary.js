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
    const {
      activities,
      focusProgress,
      nutritionData,
      profile,
      weeklyFocus,
      userFeedback,
      existingSummary,
      detailPreference = 'good',
    } = req.body;

    let contextParts = [];

    const workouts = (activities || []).filter(a => a.type === 'workout');
    const nutritionActivities = (activities || []).filter(a => a.type === 'nutrition');
    const weightEntries = (activities || []).filter(a => a.type === 'weight');
    const sleepEntries = (activities || []).filter(a => a.type === 'sleep');

    if (workouts.length > 0) {
      const workoutDetails = workouts.map(a => {
        const date = new Date(a.timestamp);
        const day = date.toLocaleDateString('en-US', { weekday: 'long' });
        const parts = [`${day}:`];

        if (a.subType === 'run' || a.subType === 'cardio') {
          if (a.data?.distance) parts.push(`${a.data.distance} mile${a.data.distance !== 1 ? 's' : ''}`);
          if (a.data?.pace) parts.push(`at ${a.data.pace} pace`);
          if (a.data?.duration) parts.push(`(${a.data.duration} min)`);
        } else if (a.subType === 'strength') {
          if (a.data?.exercise) parts.push(a.data.exercise);
          if (a.data?.weight && a.data?.reps) {
            parts.push(`${a.data.weight} lbs x ${a.data.reps} reps`);
            if (a.data?.sets) parts.push(`x ${a.data.sets} sets`);
          }
          if (a.data?.pr) parts.push('(PR!)');
        } else {
          parts.push(a.summary || a.rawText);
        }

        if (a.data?.feeling) parts.push(`- felt ${a.data.feeling}`);
        return parts.join(' ');
      }).join('\n');
      contextParts.push(`WORKOUTS THIS WEEK:\n${workoutDetails}`);
    }

    if (weightEntries.length > 0) {
      const weights = weightEntries.map(a => {
        const day = new Date(a.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
        return `${day}: ${a.data?.weight || 'unknown'} lbs`;
      }).join(', ');

      const firstWeight = weightEntries[weightEntries.length - 1]?.data?.weight;
      const lastWeight = weightEntries[0]?.data?.weight;
      const change = firstWeight && lastWeight ? (lastWeight - firstWeight).toFixed(1) : null;

      contextParts.push(`WEIGHT TRACKING:\n${weights}${change ? `\nChange this week: ${change > 0 ? '+' : ''}${change} lbs` : ''}`);
    }

    if (nutritionActivities.length > 0) {
      const proteinGoalHits = nutritionActivities.filter(a => a.data?.hitProteinGoal).length;
      const nutritionSummary = [];

      if (proteinGoalHits > 0) {
        nutritionSummary.push(`Hit protein goal ${proteinGoalHits} time${proteinGoalHits !== 1 ? 's' : ''}`);
      }

      const snackingEntries = nutritionActivities.filter(a =>
        (a.summary || a.rawText || '').toLowerCase().includes('snack')
      );
      if (snackingEntries.length > 0) {
        nutritionSummary.push(`Logged ${snackingEntries.length} snack${snackingEntries.length !== 1 ? 's' : ''}`);
      }

      contextParts.push(`NUTRITION OVERVIEW:\n${nutritionSummary.join('\n') || 'Logged some nutrition entries'}\nTotal nutrition logs: ${nutritionActivities.length}`);
    }

    if (nutritionData?.days) {
      const dayCount = Object.values(nutritionData.days).filter(d =>
        d?.meals?.some(m => m.content?.trim())
      ).length;

      if (dayCount > 0) {
        contextParts.push(`MEAL LOGGING: Logged meals on ${dayCount} day${dayCount !== 1 ? 's' : ''} this week`);
      }
    }

    if (weeklyFocus && weeklyFocus.length > 0 && focusProgress) {
      const focusSummary = weeklyFocus.map((goal, idx) => {
        const progress = focusProgress[idx]?.progress || {};
        const status = progress.complete
          ? '✓ COMPLETE'
          : `${progress.current || 0}/${progress.target || 1} (${Math.round(((progress.current || 0) / (progress.target || 1)) * 100)}%)`;
        return `- "${goal.action}": ${status}`;
      }).join('\n');
      contextParts.push(`FOCUS GOALS THIS WEEK:\n${focusSummary}`);
    }

    if (profile) {
      // Safely convert goals to array
      const goalsArray = Array.isArray(profile.goals)
        ? profile.goals
        : typeof profile.goals === 'string'
          ? [profile.goals]
          : [];
      const goals = goalsArray.join(', ') || 'general fitness';
      const preferences = profile.preferences || '';
      contextParts.push(`USER'S BIG PICTURE GOALS: ${goals}${preferences ? `\nPreferences/Notes: ${preferences}` : ''}`);
    }

    const context = contextParts.join('\n\n');

    const detailInstructions = {
      less: 'Keep it concise - shorter paragraphs, just the highlights.',
      good: 'Balanced detail - cover the key points without being too long or too short.',
      more: 'Be thorough - include more specifics about workouts, metrics, and insights.',
    };

    const feedbackInstruction = userFeedback
      ? `\n\nUser feedback to incorporate: "${userFeedback}"\nUpdate the summary based on this feedback.`
      : '';

    const existingSummaryContext = existingSummary && userFeedback
      ? `\n\nPrevious summary (to be updated):\n"${existingSummary}"`
      : '';

    const systemPrompt = `You are a supportive fitness coach writing a comprehensive weekly check-in summary.

WRITING STYLE:
- Coach-like and encouraging
- Focused on progress and wins
- Honest about misses without being negative
- Forward-looking and actionable
- Use second person ("you")

DETAIL LEVEL: ${detailInstructions[detailPreference] || detailInstructions.good}

STRUCTURE YOUR RESPONSE AS JSON with this format:
{
  "trainingRecap": "Paragraph about workouts - exercises, weights, reps, distances. Note consistency and connect to their goals.",
  "nutritionMetrics": "HIGH LEVEL nutrition assessment (NOT every meal). Overall quality, patterns, protein adherence, weight changes if relevant.",
  "overallAssessment": "Big picture of the week. What went well, what could improve, encouragement.",
  "suggestions": [
    {
      "type": "keep" | "improve",
      "text": "Specific, actionable suggestion based on their data and goals"
    }
  ]
}

RULES FOR SUGGESTIONS (2-4 suggestions):
- Be SPECIFIC (not "exercise more" but "add one more leg day this week")
- Base on their ACTUAL DATA and stated goals
- Mix "keep doing X" (type: keep) and "try improving Y" (type: improve)
- Reference specific numbers/metrics when possible
- Keep encouraging, not critical

DO NOT:
- List every meal and ingredient
- Include system updates or administrative entries
- Make up activities they didn't log
- Be generic - personalize based on their data${feedbackInstruction}`;

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate a weekly check-in summary based on this data:\n\n${context}${existingSummaryContext}`,
        },
      ],
    });

    const responseText = response.content[0].text.trim();

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        const fullSummary = [
          parsed.trainingRecap,
          parsed.nutritionMetrics,
          parsed.overallAssessment,
        ].filter(Boolean).join('\n\n');

        res.json({
          summary: fullSummary,
          sections: {
            training: parsed.trainingRecap,
            nutrition: parsed.nutritionMetrics,
            overall: parsed.overallAssessment,
          },
          suggestions: parsed.suggestions || [],
        });
      } else {
        res.json({ summary: responseText, suggestions: [] });
      }
    } catch (parseErr) {
      res.json({ summary: responseText, suggestions: [] });
    }

  } catch (err) {
    console.error('Week summary synthesis error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
