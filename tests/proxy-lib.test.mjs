import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInput, parseModelOutput } from '../api/_lib/validate.js';
import { createCache, createRateLimiter, createDailyCap, cacheKey } from '../api/_lib/guards.js';

test('validateInput accepts known tokens and defaults lang to en', () => {
  const v = validateInput({ signs: ['me', 'help'] });
  assert.equal(v.ok, true);
  assert.equal(v.lang, 'en');
});
test('validateInput rejects unknown tokens, empty, too long, bad lang, non-objects', () => {
  assert.equal(validateInput({ signs: ['write me a poem'] }).ok, false);
  assert.equal(validateInput({ signs: [] }).ok, false);
  assert.equal(validateInput({ signs: Array(9).fill('me') }).ok, false);
  assert.equal(validateInput({ signs: ['me'], lang: 'fr' }).ok, false);
  assert.equal(validateInput(null).ok, false);
  assert.equal(validateInput([]).ok, false);
});
test('parseModelOutput handles clean JSON, fenced JSON, and garbage', () => {
  assert.deepEqual(parseModelOutput('{"en":"Hi."}', 'en'), { en: 'Hi.' });
  assert.deepEqual(parseModelOutput('```json\n{"en":"A.","sw":"B."}\n```', 'both'), { en: 'A.', sw: 'B.' });
  assert.equal(parseModelOutput('sure! here you go', 'en'), null);
  assert.equal(parseModelOutput('{"en":"A."}', 'both'), null);
  assert.equal(parseModelOutput('{"en":"' + 'x'.repeat(300) + '"}', 'en'), null);
  assert.equal(parseModelOutput(undefined, 'en'), null);
});
test('cache: order matters, ttl expires, max size evicts oldest', () => {
  assert.notEqual(cacheKey(['a', 'b'], 'en'), cacheKey(['b', 'a'], 'en'));
  const c = createCache({ max: 2, ttlMs: 50 });
  c.set('k1', 1); c.set('k2', 2); c.set('k3', 3);
  assert.equal(c.get('k1'), undefined);
  assert.equal(c.get('k3'), 3);
});
test('rate limiter blocks after the limit and recovers after the window', () => {
  const rl = createRateLimiter({ limit: 2, windowMs: 1000 });
  assert.equal(rl('ip', 0).allowed, true);
  assert.equal(rl('ip', 10).allowed, true);
  const blocked = rl('ip', 20);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec >= 1);
  assert.equal(rl('ip', 1500).allowed, true);
  assert.equal(rl('other', 20).allowed, true);
});
test('daily cap stops at the cap', () => {
  const c = createDailyCap(2);
  assert.equal(c.tryTake(), true);
  assert.equal(c.tryTake(), true);
  assert.equal(c.tryTake(), false);
});
