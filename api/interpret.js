import { createHash } from 'node:crypto';
import { validateInput } from './_lib/validate.js';
import { createCache, createRateLimiter, createDailyCap, cacheKey } from './_lib/guards.js';
import { generateSentence, MODEL } from './_lib/meta.js';
import { logEvent } from './_lib/log.js';
import { fallbackSentence } from '../public/shared/fallback.js';

const cache = createCache();
const limiter = createRateLimiter({ limit: Number(process.env.RATE_LIMIT_PER_MIN) || 20 });
const cap = createDailyCap(Number(process.env.DAILY_MODEL_CALL_CAP) || 400);

function setCors(req, res) {
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const o = req.headers.origin;
  if (o && allowed.includes(o)) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}

export default async function handler(req, res) {
  const t0 = Date.now();
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ ok: false, error: 'method not allowed' });
  }

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
  if (!v.ok) {
    logEvent({ ev: 'bad_request', ip: ipId, error: v.error });
    return res.status(400).json({ ok: false, error: v.error });
  }

  const key = cacheKey(v.signs, v.lang);
  const hit = cache.get(key);
  if (hit) {
    const latencyMs = Date.now() - t0;
    logEvent({ ev: 'interpret', ip: ipId, signs: v.signs.join(' '), lang: v.lang, source: 'model', cached: true, latencyMs, tokens: 0 });
    return res.status(200).json({ ok: true, source: 'model', cached: true, ...hit, model: MODEL, latencyMs });
  }

  let reason;
  let usage;
  if (!cap.tryTake()) {
    reason = 'daily_cap';
  } else {
    const r = await generateSentence(v.signs, v.lang);
    usage = r.usage;
    if (r.ok) {
      cache.set(key, r.result);
      const latencyMs = Date.now() - t0;
      logEvent({ ev: 'interpret', ip: ipId, signs: v.signs.join(' '), lang: v.lang, source: 'model', cached: false, latencyMs, usage, callsToday: cap.used });
      return res.status(200).json({ ok: true, source: 'model', cached: false, ...r.result, model: MODEL, usage, latencyMs });
    }
    reason = r.reason;
    if (r.detail) logEvent({ ev: 'model_error_detail', reason, detail: r.detail });
  }

  const fb = fallbackSentence(v.signs, v.lang);
  const latencyMs = Date.now() - t0;
  logEvent({ ev: 'interpret', ip: ipId, signs: v.signs.join(' '), lang: v.lang, source: 'fallback', reason, latencyMs, usage });
  return res.status(200).json({ ok: true, source: 'fallback', cached: false, reason, ...fb, latencyMs });
}
