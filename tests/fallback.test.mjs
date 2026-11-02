import test from 'node:test';
import assert from 'node:assert/strict';
import { fallbackSentence } from '../public/shared/fallback.js';
import { VOCAB } from '../public/shared/vocab.js';

test('send money to mother', () => {
  const r = fallbackSentence(['me', 'send', 'money', 'mother'], 'both');
  assert.equal(r.en, 'I want to send money to my mother.');
  assert.equal(r.sw, 'Nataka kutuma pesa kwa mama yangu.');
  assert.equal(r.lowConfidence, false);
});
test('single-language output only has that key', () => {
  const r = fallbackSentence(['yes'], 'en');
  assert.equal(r.en, 'Yes.');
  assert.equal('sw' in r, false);
});
test('unmatched sequence falls back to literal gloss and is flagged', () => {
  const r = fallbackSentence(['you', 'mother'], 'en');
  assert.equal(r.en, 'You my mother.');
  assert.equal(r.lowConfidence, true);
});
test('every vocab token alone yields a string without throwing', () => {
  for (const t of VOCAB) {
    const r = fallbackSentence([t], 'both');
    assert.equal(typeof r.en, 'string');
    assert.equal(typeof r.sw, 'string');
  }
});
