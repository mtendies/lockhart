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
        // Fall back to line splitting
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
        // Fall back to line splitting
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
