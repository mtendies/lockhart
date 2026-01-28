import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

try {
  console.log('Testing streaming...');
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 50,
    system: 'You are a helpful assistant.',
    messages: [{ role: 'user', content: 'Say hello' }]
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.text) {
      process.stdout.write(event.delta.text);
    }
  }
  console.log('\nStream completed!');
} catch (err) {
  console.error('Error:', err.message);
  console.error('Status:', err.status);
  console.error('Full error:', err);
}
