import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlow } from '../public/shared/flow.js';
import { ruleInterpret } from '../public/shared/intent.js';
import { parseInterpretation } from '../api/_lib/validate.js';

const good = '{"intent":"send_money","english":"I want to send money.","kiswahili":"Nataka kutuma pesa.","missing_info":["amount"],"clarifying_question":"","confidence":0.8}';

test('parseInterpretation accepts valid and rejects bad JSON', () => {
  assert.equal(parseInterpretation('x ' + good + ' y').intent, 'send_money');
  assert.equal(parseInterpretation('not json'), null);
  assert.equal(parseInterpretation(good.replace('send_money', 'pay_bill')), null);
  assert.equal(parseInterpretation(good.replace('0.8', '1.5')), null);
  assert.equal(parseInterpretation(good.replace('"amount"', '"pin"')), null);
  assert.equal(parseInterpretation(good.replace('send_money', 'unclear')), null); // unclear without a question
});

test('rule baseline asks when unclear', () => {
  assert.equal(ruleInterpret(['money']).intent, 'unclear');
  assert.ok(ruleInterpret(['yes', 'no']).clarifying_question);
  assert.equal(ruleInterpret(['me', 'send', 'money', 'mother']).intent, 'send_money');
});

test('nothing is spoken before YES; NO cancels', () => {
  const f = createFlow();
  assert.equal(f.propose(ruleInterpret(['me', 'send', 'money', 'mother']), ['me', 'send', 'money', 'mother']).action, 'ask_confirm');
  assert.equal(f.snapshot().txn, null);
  assert.equal(f.control(['no']), 'cancel');
  assert.equal(f.cancel().action, 'cancelled');
  assert.equal(f.snapshot().pending, null);
});

test('send money: YES -> draft, agent fills, YES -> created', () => {
  const f = createFlow(); const s = ['send', 'money', 'mother'];
  f.propose(ruleInterpret(s), s);
  assert.equal(f.control(['yes']), 'confirm');
  const r = f.confirm();
  assert.equal(r.action, 'speak'); assert.equal(r.txn.status, 'draft'); assert.equal(r.txn.simulated, true);
  assert.equal(f.fill('amount', '-5').ok, false);
  assert.equal(f.fill('phone', '12345').ok, false);
  assert.equal(f.fill('amount', '500').awaitingConfirm, false);
  assert.equal(f.fill('phone', '0712345678').awaitingConfirm, true);
  assert.equal(f.snapshot().txn.status, 'draft'); // not created until the customer confirms
  assert.equal(f.control(['yes']), 'confirm');
  assert.equal(f.confirm().txn.status, 'created');
});

test('unclear input yields a question and no confirmable proposal', () => {
  const f = createFlow();
  assert.equal(f.propose(ruleInterpret(['money']), ['money']).action, 'clarify');
  assert.equal(f.snapshot().pending, null);
});