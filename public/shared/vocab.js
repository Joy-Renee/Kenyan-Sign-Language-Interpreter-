// Single source of truth: the browser app, the data collector, the trainer and the proxy all read this.
// ALL SIGNS ARE UNVERIFIED: reference-matched to the KSL Dictionary only, not reviewed by a Deaf signer.
// Do not describe them as "correct KSL". ids match docs/ksl-sign-list.md.
export const REST_ID = 'rest'; // "no sign" class for the classifier (hands down / idle). Not a word; never sent to the proxy.

// Plain token list: used by api/_lib/validate.js (allowlist), fallback.js and the tests.
export const VOCAB = [
  'me', 'money', 'send', 'give', 'help', 'mother', 'how_much', 'yes', 'no', 'thank_you',
];

// Detail used by public/collect.js. training/train.py reads the ids below with a regex:
// keep one entry per line and keep `id:` first.
export const VOCAB_INFO = [
  { id: "me", en: "me", sw: "mimi", hands: 1, motion: "static" },
  { id: "money", en: "money", sw: "pesa", hands: 1, motion: "moving" },
  { id: "send", en: "send", sw: "tuma", hands: 1, motion: "moving" },
  { id: "give", en: "give", sw: "toa / pea", hands: 1, motion: "moving" },
  { id: "help", en: "help", sw: "msaada / saidia", hands: 2, motion: "moving" },
  { id: "mother", en: "mother", sw: "mama", hands: 1, motion: "moving" },
  { id: "how_much", en: "how much", sw: "ni kiasi gani / bei gani", hands: 2, motion: "moving" },
  { id: "yes", en: "yes", sw: "ndiyo", hands: 1, motion: "moving" },
  { id: "no", en: "no", sw: "hapana", hands: 2, motion: "moving" },
  { id: "thank_you", en: "thank you", sw: "asante", hands: 1, motion: "moving" },
];
