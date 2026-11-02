import OpenAI from 'openai';
import { parseModelOutput } from './validate.js';

export const MODEL = process.env.META_MODEL || 'muse-spark-1.3';

// Fixed prefix + short suffix keeps input tokens small and cache-friendly.
// If the vocabulary changes in Phase 1, update the examples to use real tokens.
const PREFIX = [
  'You turn a sequence of sign-language gloss tokens into ONE short, natural sentence.',
  'Context: a Deaf customer is speaking to a mobile money agent in Kenya (simulated demo).',
  'Rules:',
  '- Use ONLY the information in the tokens. Never invent amounts, names, phone numbers or other facts.',
  '- Tokens are glosses, not full grammar; word order may differ from spoken language.',
  '- If the sequence is ambiguous, give the most literal reasonable sentence.',
  '- Reply with ONLY a JSON object and no other text. Keys: "en" (English), "sw" (Kiswahili). Include only the requested keys.',
  'Examples:',
  'tokens: me send money mother | keys: en,sw -> {"en":"I want to send money to my mother.","sw":"Nataka kutuma pesa kwa mama yangu."}',
  'tokens: how_much | keys: en -> {"en":"How much is it?"}',
  'tokens: me withdraw money | keys: sw -> {"sw":"Nataka kutoa pesa."}',
  'tokens: help me | keys: en,sw -> {"en":"Please help me.","sw":"Tafadhali nisaidie."}',
].join('\n');

export function buildPrompt(signs, lang) {
  return `${PREFIX}\n\nNow convert:\ntokens: ${signs.join(' ')} | keys: ${lang === 'both' ? 'en,sw' : lang} ->`;
}

let client;
function getClient() {
  if (!client) {
    client = new OpenAI({
      baseURL: process.env.META_BASE_URL || 'https://api.meta.ai/v1',
      apiKey: process.env.MODEL_API_KEY, // the SDK does not read MODEL_API_KEY itself; pass explicitly
      maxRetries: 0,                      // retries would burn credits and time
      timeout: Number(process.env.META_TIMEOUT_MS) || 8000,
    });
  }
  return client;
}

const reasonFor = (e) =>
  e instanceof OpenAI.APIConnectionTimeoutError ? 'timeout'
    : e instanceof OpenAI.APIConnectionError ? 'connection_error'
      : `api_error_${e?.status ?? 'unknown'}`;

export async function generateSentence(signs, lang) {
  if (!process.env.MODEL_API_KEY) return { ok: false, reason: 'no_api_key' };
  const body = {
    model: MODEL,
    input: buildPrompt(signs, lang),
    max_output_tokens: Number(process.env.META_MAX_OUTPUT_TOKENS) || 300,
  };
  const effort = process.env.META_REASONING_EFFORT ?? 'minimal';
  if (effort) body.reasoning = { effort };
  try {
    const r = await getClient().responses.create(body);
    const usage = {
      input: r.usage?.input_tokens ?? null,
      output: r.usage?.output_tokens ?? null,
      reasoning: r.usage?.output_tokens_details?.reasoning_tokens ?? null,
      total: r.usage?.total_tokens ?? null,
    };
    const parsed = parseModelOutput(r.output_text, lang);
    if (!parsed) return { ok: false, reason: r.status === 'incomplete' ? 'incomplete' : 'unparseable', usage };
    return { ok: true, result: parsed, usage };
  } catch (e) {
    return { ok: false, reason: reasonFor(e), detail: String(e?.message ?? e).slice(0, 300) };
  }
}
