// Rule-based fallback. Used when the Meta API is slow, down, capped, or returns
// something unusable. Output is clearly labelled source:"fallback" by callers.
// Kiswahili templates are written by hand and must be checked by a fluent speaker.
const EN = { me: 'I', you: 'you', money: 'money', send: 'send', withdraw: 'withdraw', deposit: 'deposit',
  help: 'help', mother: 'my mother', how_much: 'how much', yes: 'yes', no: 'no', thanks: 'thank you' };
const SW = { me: 'mimi', you: 'wewe', money: 'pesa', send: 'tuma', withdraw: 'toa', deposit: 'weka',
  help: 'msaada', mother: 'mama', how_much: 'kiasi gani', yes: 'ndiyo', no: 'hapana', thanks: 'asante' };

const only = (s, t) => s.length === 1 && s[0] === t;
const has = (s, ...t) => t.every((x) => s.includes(x));

// First matching rule wins.
const RULES = [
  { when: (s) => has(s, 'how_much'), en: 'How much is it?', sw: 'Ni kiasi gani?' },
  { when: (s) => has(s, 'send', 'money'),
    en: (s) => `I want to send money${s.includes('mother') ? ' to my mother' : ''}.`,
    sw: (s) => `Nataka kutuma pesa${s.includes('mother') ? ' kwa mama yangu' : ''}.` },
  { when: (s) => has(s, 'withdraw', 'money'), en: 'I want to withdraw money.', sw: 'Nataka kutoa pesa.' },
  { when: (s) => has(s, 'deposit', 'money'), en: 'I want to deposit money.', sw: 'Nataka kuweka pesa.' },
  { when: (s) => has(s, 'help'), en: 'Please help me.', sw: 'Tafadhali nisaidie.' },
  { when: (s) => only(s, 'yes'), en: 'Yes.', sw: 'Ndiyo.' },
  { when: (s) => only(s, 'no'), en: 'No.', sw: 'Hapana.' },
  { when: (s) => only(s, 'thanks'), en: 'Thank you.', sw: 'Asante.' },
];

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export function fallbackSentence(signs, lang = 'en') {
  const rule = RULES.find((r) => r.when(signs));
  const keys = lang === 'both' ? ['en', 'sw'] : [lang];
  const out = { lowConfidence: !rule };
  for (const k of keys) {
    if (rule) {
      out[k] = typeof rule[k] === 'function' ? rule[k](signs) : rule[k];
    } else {
      // No rule matched: literal gloss join. Flagged lowConfidence so the UI can say so.
      const dict = k === 'en' ? EN : SW;
      out[k] = cap(signs.map((t) => dict[t] ?? t).join(' ')) + '.';
    }
  }
  return out;
}
