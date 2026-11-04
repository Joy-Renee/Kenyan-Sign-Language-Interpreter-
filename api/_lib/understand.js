import OpenAI from 'openai';
import { parseInterpretation } from './validate.js';

export const MODEL = process.env.META_MODEL || 'muse-spark-1.3';

// Fixed prefix (cache-friendly) + short suffix. Few-shot examples are deliberately NOT in the eval set (scripts/eval.mjs).
const PREFIX = [
  'You interpret a sequence of sign-language gloss tokens from a Deaf customer talking to a mobile money agent in Kenya (simulated demo).',
  'Reply with ONLY one JSON object, no other text. Keys: intent, english, kiswahili, missing_info, clarifying_question, confidence.',
  'intent is one of: send_money, ask_fee, confirm, deny, thank, request_help, unclear.',
  'Rules:',
  '- Use ONLY the tokens. Never invent amounts, names, phone numbers or other facts.',
  '- Tokens are glosses; order may differ from spoken language.',
  '- send_money needs "money" plus "send" or "give". missing_info lists what the agent still needs: amount, recipient_phone, and recipient if "mother" is absent. Otherwise missing_info is [].',
  '- If the tokens are incomplete, a single noun or verb, or contradict each other (for example yes and no), intent is "unclear": english and kiswahili are "", and clarifying_question is ONE short English question for the customer. Do NOT guess.',
  '- For any other intent clarifying_question is "". english and kiswahili are one short sentence each.',
  '- confidence is a number from 0 to 1.',
  'Examples:',
  'tokens: send money mother me -> {"intent":"send_money","english":"I want to send money to my mother.","kiswahili":"Nataka kutuma pesa kwa mama yangu.","missing_info":["amount","recipient_phone"],"clarifying_question":"","confidence":0.9}',
  'tokens: how_much send -> {"intent":"ask_fee","english":"How much does it cost?","kiswahili":"Inagharimu kiasi gani?","missing_info":[],"clarifying_question":"","confidence":0.7}',
  'tokens: give mother -> {"intent":"unclear","english":"","kiswahili":"","missing_info":[],"clarifying_question":"Do you want to send money to your mother, or something else?","confidence":0.3}',
  'tokens: yes yes yes -> {"intent":"confirm","english":"Yes.","kiswahili":"Ndiyo.","missing_info":[],"clarifying_question":"","confidence":0.9}',
].join('\n');

export const buildPrompt = (signs, retry = false) =>
  `${PREFIX}\n\n${retry ? 'Your previous reply was not valid. Reply with ONLY the JSON object.\n' : ''}Now interpret:\ntokens: ${signs.join(' ')} ->`;

let client;
const getClient = () => (client ||= new OpenAI({
  baseURL: process.env.META_BASE_URL || 'https://api.meta.ai/v1',
  apiKey: process.env.MODEL_API_KEY,
  maxRetries: 0, // we retry once ourselves, so cost and latency stay bounded
  timeout: Number(process.env.META_TIMEOUT_MS) || 8000,
}));

const reasonFor = (e) => e instanceof OpenAI.APIConnectionTimeoutError ? 'timeout'
  : e instanceof OpenAI.APIConnectionError ? 'connection_error' : `api_error_${e?.status ?? 'unknown'}`;

// Up to 2 model calls (1 retry). allowCall() lets the caller enforce a daily cap per call.
export async function generateInterpretation(signs, { allowCall = () => true } = {}) {
  if (!process.env.MODEL_API_KEY) return { ok: false, reason: 'no_api_key', attempts: 0, firstTryOk: false };
  const usage = { input: 0, output: 0, reasoning: 0, total: 0 };
  let reason = 'unknown', attempts = 0;
  for (let i = 1; i <= 2; i++) {
    if (!allowCall()) return { ok: false, reason: 'daily_cap', attempts, usage, firstTryOk: false };
    attempts = i;
    try {
      const body = { model: MODEL, input: buildPrompt(signs, i === 2), max_output_tokens: Number(process.env.META_MAX_OUTPUT_TOKENS) || 600 };
      const effort = process.env.META_REASONING_EFFORT ?? 'minimal';
      if (effort) body.reasoning = { effort };
      const r = await getClient().responses.create(body);
      usage.input += r.usage?.input_tokens ?? 0;
      usage.output += r.usage?.output_tokens ?? 0;
      usage.reasoning += r.usage?.output_tokens_details?.reasoning_tokens ?? 0;
      usage.total += r.usage?.total_tokens ?? 0;
      const result = parseInterpretation(r.output_text);
      if (result) return { ok: true, result, usage, attempts, firstTryOk: i === 1 };
      reason = r.status === 'incomplete' ? 'incomplete' : 'unparseable';
    } catch (e) { reason = reasonFor(e); }
  }
  return { ok: false, reason, attempts, usage, firstTryOk: false };
}