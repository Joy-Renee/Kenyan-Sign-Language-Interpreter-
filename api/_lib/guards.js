// In-memory guards. On serverless these are per warm instance (best effort, not global).
// The hard backstop is the Spend Limit on the Meta Billing page.

export const cacheKey = (signs, lang) => `${lang}|${signs.join(',')}`;

export function createCache({ max = 500, ttlMs = 24 * 3600 * 1000 } = {}) {
  const m = new Map();
  return {
    get(k) {
      const e = m.get(k);
      if (!e) return undefined;
      if (e.exp < Date.now()) { m.delete(k); return undefined; }
      return e.v;
    },
    set(k, v) {
      if (m.size >= max) m.delete(m.keys().next().value);
      m.set(k, { v, exp: Date.now() + ttlMs });
    },
    get size() { return m.size; },
  };
}

export function createRateLimiter({ limit = 20, windowMs = 60000 } = {}) {
  const hits = new Map();
  return function check(key, now = Date.now()) {
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= limit) {
      hits.set(key, arr);
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - arr[0])) / 1000)) };
    }
    arr.push(now);
    hits.set(key, arr);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    return { allowed: true };
  };
}

export function createDailyCap(cap = 400) {
  let day = new Date().toISOString().slice(0, 10);
  let n = 0;
  return {
    tryTake() {
      const d = new Date().toISOString().slice(0, 10);
      if (d !== day) { day = d; n = 0; }
      if (n >= cap) return false;
      n += 1;
      return true;
    },
    get used() { return n; },
  };
}
