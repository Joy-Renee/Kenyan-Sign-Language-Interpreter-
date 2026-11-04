// Intent list + rule-based baseline/fallback. The model prompt in api/_lib/understand.js must use the same INTENTS.
// Kiswahili strings here were written by the assistant and have NOT been reviewed by a Kiswahili speaker.
export const INTENTS = ['send_money', 'ask_fee', 'confirm', 'deny', 'thank', 'request_help', 'unclear'];
export const MISSING = ['amount', 'recipient', 'recipient_phone'];

const FIXED = {
  ask_fee: ['How much is it?', 'Ni kiasi gani?'],
  confirm: ['Yes.', 'Ndiyo.'],
  deny: ['No.', 'Hapana.'],
  thank: ['Thank you.', 'Asante.'],
  request_help: ['Please help me.', 'Tafadhali nisaidie.'],
};

export function ruleInterpret(signs) {
  const has = (x) => signs.includes(x);
  const all = (...xs) => signs.every((s) => xs.includes(s));
  let intent = 'unclear';
  if (has('yes') && has('no')) intent = 'unclear';
  else if (has('how_much')) intent = 'ask_fee';
  else if (has('money') && (has('send') || has('give'))) intent = 'send_money';
  else if (all('yes')) intent = 'confirm';
  else if (all('no')) intent = 'deny';
  else if (all('thank_you', 'me') && has('thank_you')) intent = 'thank';
  else if (all('help', 'me') && has('help')) intent = 'request_help';

  if (intent === 'unclear') {
    return { intent, english: '', kiswahili: '', missing_info: [], confidence: 0.2,
      clarifying_question: 'I am not sure what you mean. Do you want to send money, ask the price, or get help?' };
  }
  if (intent === 'send_money') {
    const m = has('mother');
    return { intent, confidence: 0.9, clarifying_question: '',
      english: m ? 'I want to send money to my mother.' : 'I want to send money.',
      kiswahili: m ? 'Nataka kutuma pesa kwa mama yangu.' : 'Nataka kutuma pesa.',
      missing_info: m ? ['amount', 'recipient_phone'] : ['amount', 'recipient', 'recipient_phone'] };
  }
  return { intent, english: FIXED[intent][0], kiswahili: FIXED[intent][1], missing_info: [], clarifying_question: '', confidence: 0.9 };
}