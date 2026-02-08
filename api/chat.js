import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, getDemoResponse } from './_utils.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { messages, profile, notes, checkIns, playbook, pendingSuggestions, groceryData, activityLogs, nutritionProfile, nutritionCalibration, learnedInsights, focusGoals, todaysNutrition } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Demo mode when no API key
  if (!apiKey) {
    const userMessage = messages[messages.length - 1]?.content || '';
    const demoResponse = getDemoResponse(userMessage);

    const words = demoResponse.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(' ') + ' ';
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      await new Promise(r => setTimeout(r, 30));
    }
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  const client = new Anthropic({ apiKey });
  const systemPrompt = buildSystemPrompt(profile || {}, notes || {}, checkIns || [], playbook || null, pendingSuggestions || [], groceryData || null, activityLogs || [], nutritionProfile || null, nutritionCalibration || null, learnedInsights || [], focusGoals || [], todaysNutrition || null);

  try {
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Anthropic API Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
}
