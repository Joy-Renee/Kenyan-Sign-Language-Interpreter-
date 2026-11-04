// Browser SpeechSynthesis helper. Pure planning logic is exported for Node tests.
// Graceful Kiswahili fallback: if no Swahili voice exists on the device, speak the
// English sentence instead and tell the caller so it can show a notice — reading
// Kiswahili text with an English voice mangles it, so we never do that.

const norm = (v) => String(v?.lang || "").toLowerCase().replace("_", "-");
const isSw = (v) => norm(v).startsWith("sw") || /swahili|kiswahili/i.test(v?.name || "");
const isEn = (v) => norm(v).startsWith("en");

export function selectVoice(voices = [], lang = "en") {
  const list = Array.isArray(voices) ? voices : [];
  if (!list.length) return { voice: null, fellBack: lang === "sw", reason: "no_voices" };
  if (lang === "sw") {
    const sw = list.find(isSw);
    if (sw) return { voice: sw, fellBack: false, reason: null };
    const en = list.find(isEn) || list[0];
    return { voice: en, fellBack: true, reason: "no_sw_voice" };
  }
  const en = list.find(isEn);
  return { voice: en || list[0], fellBack: false, reason: en ? null : "no_en_voice" };
}

// Decide exactly what will be spoken. Returns { text, lang, voice, fellBack, reason }.
export function planSpeech(text, { lang = "en", fallbackText = "", voices = [] } = {}) {
  const sel = selectVoice(voices, lang);
  if (lang === "sw" && sel.fellBack && fallbackText && fallbackText !== text) {
    // No Swahili voice: speak English, keep Kiswahili on screen (caller shows notice).
    const enSel = selectVoice(voices, "en");
    return { text: fallbackText, lang: "en-US", voice: enSel.voice, fellBack: true, reason: sel.reason };
  }
  return { text, lang: lang === "sw" ? "sw-KE" : "en-US", voice: sel.voice, fellBack: sel.fellBack, reason: sel.reason };
}

export function speakText(text, opts = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) {
    return { ok: false, reason: "no_speech_synthesis", fellBack: false };
  }
  const synth = window.speechSynthesis;
  const plan = planSpeech(text, { ...opts, voices: synth.getVoices() });
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(plan.text);
    u.lang = plan.lang;
    if (plan.voice) u.voice = plan.voice;
    synth.speak(u);
    return { ok: true, ...plan };
  } catch (e) {
    return { ok: false, reason: String(e?.message || e), fellBack: plan.fellBack };
  }
}

// Voices often load async; call cb once they arrive (or after 1s, whichever first).
export function onVoicesReady(cb) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  if (synth.getVoices().length) return cb(synth.getVoices());
  const done = () => cb(synth.getVoices());
  synth.addEventListener?.("voiceschanged", done, { once: true });
  setTimeout(done, 1000);
}
