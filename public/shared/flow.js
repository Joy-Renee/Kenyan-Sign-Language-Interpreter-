// Confirmation + SIMULATED transaction logic. Pure (no DOM, no network).
// Rule: nothing is spoken and no transaction advances until the Deaf user signs YES. NO cancels.
export const SIM_LABEL = 'SIMULATED: no real money moves';
const DEMO_MAX = 100000;

export function createFlow() {
  let pending = null, txn = null, n = 0;
  const snapshot = () => ({ pending, txn });
  return {
    snapshot,
    // A lone YES/NO while something waits is a control signal (no model call needed).
    control(signs) {
      if (signs.length !== 1) return null;
      const s = signs[0];
      if (pending) return s === 'yes' ? 'confirm' : s === 'no' ? 'cancel' : null;
      if (txn?.status === 'draft' && s === 'no') return 'cancel_txn';
      return null;
    },
    propose(interp, signs) {
      if (interp.intent === 'unclear') { pending = null; return { action: 'clarify', text: interp.clarifying_question }; }
      pending = { ...interp, signs, kind: 'utterance' };
      return { action: 'ask_confirm' };
    },
    confirm() {
      if (!pending) return { action: 'none' };
      const p = pending; pending = null;
      if (p.kind === 'txn_final') { txn.status = 'created'; txn.createdAt = Date.now(); return { action: 'speak', english: p.english, kiswahili: p.kiswahili, txn }; }
      if (p.intent === 'send_money') {
        txn = { id: `SIM-${++n}`, simulated: true, status: 'draft', to: p.signs.includes('mother') ? 'mother' : null, amount: null, phone: null, missing: ['amount', 'phone'] };
      }
      return { action: 'speak', english: p.english, kiswahili: p.kiswahili, txn };
    },
    cancel() { pending = null; return { action: 'cancelled' }; },
    cancelTxn() { if (txn?.status === 'draft') txn.status = 'cancelled'; pending = null; return { action: 'cancelled', txn }; },
    // The agent types the details (the sign vocabulary has no numerals), then the Deaf user confirms the final text.
    fill(field, value) {
      if (!txn || txn.status !== 'draft') return { ok: false, error: 'no draft transaction' };
      if (field === 'amount') {
        const v = Number(value);
        if (!Number.isInteger(v) || v < 1 || v > DEMO_MAX) return { ok: false, error: `amount must be a whole number 1-${DEMO_MAX}` };
        txn.amount = v;
      } else if (field === 'phone') {
        const v = String(value).replace(/\s/g, '');
        if (!/^0[17]\d{8}$/.test(v)) return { ok: false, error: 'phone must look like 07XXXXXXXX or 01XXXXXXXX' };
        txn.phone = v;
      } else return { ok: false, error: 'unknown field' };
      txn.missing = ['amount', 'phone'].filter((k) => txn[k] == null);
      if (!txn.missing.length) {
        pending = { kind: 'txn_final', intent: 'send_money', signs: [],
          english: `Please send KSh ${txn.amount} to ${txn.phone}.`, kiswahili: `Tafadhali tuma KSh ${txn.amount} kwa ${txn.phone}.` };
      }
      return { ok: true, txn, awaitingConfirm: !txn.missing.length };
    },
  };
}