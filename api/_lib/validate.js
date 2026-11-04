import { VOCAB } from '../../public/shared/vocab.js';

export const MAX_SIGNS = 8;
export const LANGS = ['en', 'sw', 'both'];
const KNOWN = new Set(VOCAB);

// The proxy only accepts known sign tokens, so it cannot be used as a general LLM proxy.
export function validateInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'body must be a JSON object' };
  const { signs, lang = 'en' } = body;
  if (!Array.isArray(signs) || signs.length < 1 || signs.length > MAX_SIGNS) {
    return { ok: false, error: `signs must be an array of 1-${MAX_SIGNS} tokens` };
  }
  for (const s of signs) if (typeof s !== 'string' || !KNOWN.has(s)) return { ok: false, error: 'unknown sign token' };
  if (!LANGS.includes(lang)) return { ok: false, error: 'lang must be en, sw or both' };
  return { ok: true, signs, lang };
}

// Model is asked for JSON; never trust it. Returns {en?, sw?} or null.
export function parseModelOutput(text, lang) {
  if (typeof text !== 'string') return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  let obj;
  try { obj = JSON.parse(m[0]); } catch { return null; }
  const out = {};
  for (const k of lang === 'both' ? ['en', 'sw'] : [lang]) {
    const v = obj?.[k];
    if (typeof v !== 'string') return null;
    const t = v.trim();
    if (!t || t.length > 200) return null;
    out[k] = t;
  }
  return out;
}

// ---- Phase 4: strict interpretation JSON {intent, english, kiswahili, missing_info, clarifying_question, confidence}
import { INTENTS, MISSING } from '../../public/shared/intent.js';

export function parseInterpretation(text) {
  if (typeof text !== 'string') return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  let o;
  try { o = JSON.parse(m[0]); } catch { return null; }
  if (!o || typeof o !== 'object') return null;
  const s = (v) => (typeof v === 'string' ? v.trim() : null);
  const en = s(o.english), sw = s(o.kiswahili), cq = s(o.clarifying_question);
  if (!INTENTS.includes(o.intent)) return null;
  if (en === null || sw === null || cq === null || en.length > 200 || sw.length > 200 || cq.length > 200) return null;
  if (!Array.isArray(o.missing_info) || !o.missing_info.every((x) => MISSING.includes(x))) return null;
  if (typeof o.confidence !== 'number' || !(o.confidence >= 0 && o.confidence <= 1)) return null;
  if (o.intent === 'unclear') { if (!cq) return null; } // ambiguous input must ask, not guess
  else if (!en || !sw) return null;
  return { intent: o.intent, english: en, kiswahili: sw, missing_info: [...new Set(o.missing_info)], clarifying_question: cq, confidence: o.confidence };
}