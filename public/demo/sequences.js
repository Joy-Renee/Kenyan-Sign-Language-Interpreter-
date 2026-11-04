// Recorded gloss sequences for "Try without camera" demo mode.
// These are sign-token sequences (from docs/demo-dialogue.md), sent straight to the
// sentence step (/api/understand -> Muse Spark, or rule fallback). They do NOT test
// camera recognition — the UI labels them that way. For recognition without a live
// signer, use Replay, which runs recorded landmarks through the real classifier.
export const DEMO_SEQUENCES = [
  { id: "send-mother", signs: ["me", "send", "money", "mother"], en: "Send money to mother", sw: "Tuma pesa kwa mama" },
  { id: "ask-fee", signs: ["how_much"], en: "Ask the fee", sw: "Uliza gharama" },
  { id: "help", signs: ["help", "me"], en: "Ask for help", sw: "Omba msaada" },
  { id: "thank", signs: ["thank_you"], en: "Thank you", sw: "Asante" },
  { id: "unclear", signs: ["money"], en: "Unclear example (money alone)", sw: "Mfano usio wazi (pesa tu)" },
];
