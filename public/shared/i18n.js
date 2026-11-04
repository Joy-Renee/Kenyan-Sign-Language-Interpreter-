// UI chrome strings for the language toggle. Kiswahili strings were written by the
// assistant and have NOT been reviewed by a Kiswahili speaker — same caveat as intent.js.
export const STRINGS = {
  en: {
    title: "KSL Assistant — mobile money",
    subtitle: "A Deaf customer at a mobile money agent. Simulated transactions only — no real money moves. Signs are reference-matched, unverified by a Deaf signer; model trained on one hearing signer's 33 clips.",
    camera: "Camera", currentSign: "Current sign", sequence: "Sequence (utterance in progress)",
    caption: "Caption — is this what you meant?", confirm: "Confirm (or sign YES)", cancel: "Cancel (or sign NO)",
    tryNoCamera: "Try without camera", history: "Recent utterances", agentEntry: "Agent entry (typed; no numerals in the sign list):",
    signPrompt: "Sign a sentence, then lower your hands.",
  },
  sw: {
    title: "Msaidizi wa KSL — pesa kwa simu",
    subtitle: "Mteja Kiziwi kwa wakala wa pesa kwa simu. Miamala ya majaribio tu — hakuna pesa halisi inayotumwa. Ishara hazijathibitishwa na mtumiaji Kiziwi wa KSL; modeli imefundishwa kwa ishara za mtu mmoja.",
    camera: "Kamera", currentSign: "Ishara ya sasa", sequence: "Mfuatano (sentensi inayoendelea)",
    caption: "Maelezo — je, ndicho ulichomaanisha?", confirm: "Thibitisha (au ishara NDIYO)", cancel: "Ghairi (au ishara HAPANA)",
    tryNoCamera: "Jaribu bila kamera", history: "Sentensi za hivi karibuni", agentEntry: "Wakala anaandika (hakuna nambari kwenye orodha ya ishara):",
    signPrompt: "Tumia ishara, kisha shusha mikono yako.",
  },
};
export const t = (lang, key) => STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
