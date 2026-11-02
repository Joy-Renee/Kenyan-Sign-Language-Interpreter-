// Proves a real call to the Meta Model API works with YOUR key. Run: npm run test:meta
// Step 1 mirrors the docs' quickstart call. Step 2 uses the proxy's real code path
// (prompt, reasoning effort, JSON parsing). Costs a few hundred tokens in total.
import OpenAI from 'openai';
import { generateSentence, MODEL } from '../api/_lib/meta.js';

if (!process.env.MODEL_API_KEY) {
  console.error('MODEL_API_KEY is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

let failed = false;

try {
  const client = new OpenAI({ baseURL: process.env.META_BASE_URL || 'https://api.meta.ai/v1', apiKey: process.env.MODEL_API_KEY, maxRetries: 0 });
  const t = Date.now();
  const r = await client.responses.create({ model: MODEL, input: 'What is the capital of France?' });
  console.log(`[1] OK model=${r.model} status=${r.status} ${Date.now() - t}ms`);
  console.log('    answer:', r.output_text);
  console.log('    usage :', JSON.stringify(r.usage));
} catch (e) {
  failed = true;
  console.error('[1] FAILED:', e?.status ?? '', e?.message ?? e);
}

const t2 = Date.now();
const g = await generateSentence(['me', 'send', 'money', 'mother'], 'both');
if (g.ok) {
  console.log(`[2] OK ${Date.now() - t2}ms`, JSON.stringify(g.result), 'usage:', JSON.stringify(g.usage));
} else {
  failed = true;
  console.error('[2] FAILED:', g.reason, g.detail ?? '', g.usage ? JSON.stringify(g.usage) : '');
  console.error('    If this is a 400 about "reasoning", set META_REASONING_EFFORT= (empty) in .env and rerun.');
}
process.exit(failed ? 1 : 0);
