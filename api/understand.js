// POST {signs:[...]} -> {ok, source:'model'|'fallback', cached, reason?, result:{intent,...}, usage?, latencyMs}
import { createHash } from 'node:crypto';
import { validateInput } from './_lib/validate.js';
import { createCache, createRateLimiter, createDailyCap, cacheKey } from './_lib/guards.js';
import { generateInterpretation, MODEL } from './_lib/understand.js';
import { logEvent } from './_lib/log.js';
import { ruleInterpret } from '../public/shared/intent.js';

const cache = createCache();
const limiter = createRateLimiter({ limit: Number(process.env.RATE_LIMIT_PER_MIN) || 20 });
const cap = createDailyCap(Number(process.env.DAILY_MODEL_CALL_CAP) || 400);

function setCors(req, res) {
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const o = req.headers.origin;
  if (o && allowed.includes(o)) {
    res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}

export default async function handler(req, res) {
  const t0 = Date.now();
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST, OPTIONS'); return res.status(405).json({ ok: false, error: 'method not allowed' }); }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  const ipId = createHash('sha256').update(ip + (process.env.LOG_SALT || '')).digest('hex').slice(0, 8);
  const rl = limiter(ip);
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfterSec));
    logEvent({ ev: 'rate_limited', ip: ipId });
    return res.status(429).json({ ok: false, error: 'rate limited', retryAfterSec: rl.retryAfterSec });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const v = validateInput(body);
  if (!v.ok) { logEvent({ ev: 'bad_request', ip: ipId, error: v.error }); return res.status(400).json({ ok: false, error: v.error }); }

  const key = cacheKey(v.signs, 'intent');
  const hit = cache.get(key);
  if (hit) {
    const latencyMs = Date.now() - t0;
    logEvent({ ev: 'understand', ip: ipId, signs: v.signs.join(' '), source: 'model', cached: true, latencyMs, tokens: 0 });
    return res.status(200).json({ ok: true, source: 'model', cached: true, result: hit, model: MODEL, latencyMs });
  }

  const r = await generateInterpretation(v.signs, { allowCall: () => cap.tryTake() });
  const latencyMs = Date.now() - t0;
  if (r.ok) {
    cache.set(key, r.result);
    logEvent({ ev: 'understand', ip: ipId, signs: v.signs.join(' '), source: 'model', cached: false, attempts: r.attempts, latencyMs, usage: r.usage, callsToday: cap.used });
    return res.status(200).json({ ok: true, source: 'model', cached: false, attempts: r.attempts, result: r.result, model: MODEL, usage: r.usage, latencyMs });
  }
  logEvent({ ev: 'understand', ip: ipId, signs: v.signs.join(' '), source: 'fallback', reason: r.reason, attempts: r.attempts, latencyMs, usage: r.usage });
  return res.status(200).json({ ok: true, source: 'fallback', cached: false, reason: r.reason, result: ruleInterpret(v.signs), latencyMs });
}