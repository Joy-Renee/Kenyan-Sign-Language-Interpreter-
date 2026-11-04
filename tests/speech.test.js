import test from 'node:test';
import assert from 'node:assert/strict';
import { selectVoice, planSpeech } from '../public/shared/speech.js';
import { DEMO_SEQUENCES } from '../public/demo/sequences.js';
import { VOCAB } from '../public/shared/vocab.js';

const enVoice = { lang: 'en-US', name: 'English US' };
const swVoice = { lang: 'sw-KE', name: 'Kiswahili' };

test('selectVoice picks Kiswahili when present, else flags fallback', () => {
  assert.equal(selectVoice([enVoice, swVoice], 'sw').voice, swVoice);
  assert.equal(selectVoice([enVoice, swVoice], 'sw').fellBack, false);
  const fb = selectVoice([enVoice], 'sw');
  assert.equal(fb.fellBack, true); assert.equal(fb.reason, 'no_sw_voice');
  assert.equal(selectVoice([], 'sw').reason, 'no_voices');
});

test('planSpeech never reads Kiswahili text with an English voice', () => {
  const p = planSpeech('Nataka kutuma pesa.', { lang: 'sw', fallbackText: 'I want to send money.', voices: [enVoice] });
  assert.equal(p.text, 'I want to send money.'); assert.equal(p.fellBack, true);
  const q = planSpeech('Nataka kutuma pesa.', { lang: 'sw', fallbackText: 'I want to send money.', voices: [swVoice] });
  assert.equal(q.text, 'Nataka kutuma pesa.'); assert.equal(q.fellBack, false); assert.equal(q.lang, 'sw-KE');
});

test('demo sequences only use known vocab tokens', () => {
  for (const d of DEMO_SEQUENCES) for (const s of d.signs) assert.ok(VOCAB.includes(s), `${d.id}: ${s}`);
});
