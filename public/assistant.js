// Glue: completed utterance -> /api/understand (Muse Spark) or rule fallback ->
// confirmation (sign YES/NO or Confirm/Cancel buttons) -> speech + SIMULATED transaction.
// Language toggle: captions show the selected language large (the other small);
// speech speaks the selected language, with the speech.js Kiswahili-voice fallback.
import { createFlow, SIM_LABEL } from "./shared/flow.js";
import { ruleInterpret } from "./shared/intent.js";
import { speakText, onVoicesReady } from "./shared/speech.js";
import { t } from "./shared/i18n.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function createAssistant({ mount, after, endpoint = "/api/understand", speak, getLang = () => "en" }) {
  const flow = createFlow();
  const box = document.createElement("section");
  box.setAttribute("aria-live", "polite");
  box.className = "assistant";
  if (mount) mount.append(box); else if (after) after.after(box);
  const doSpeak = speak || ((text, opts) => speakText(text, opts));
  let ui = { msg: null, meta: null, busy: false, log: [], err: "", voiceNote: "", totals: { calls: 0, modelCalls: 0, tokens: 0, fallbacks: 0 }, lastLatencyMs: null };
  let chain = Promise.resolve();
  onVoicesReady(() => render());

  const lang = () => (getLang() === "sw" ? "sw" : "en");
  const primary = (p) => (lang() === "sw" ? p.kiswahili : p.english);
  const secondary = (p) => (lang() === "sw" ? p.english : p.kiswahili);

  function speakSentence(en, sw) {
    const L = lang();
    const r = doSpeak(L === "sw" ? sw : en, { lang: L, fallbackText: en, english: en, kiswahili: sw });
    ui.voiceNote = !r?.ok ? "Speech unavailable on this device — read the caption on screen."
      : r.fellBack && L === "sw" ? "No Kiswahili voice on this device — spoken with an English voice. Kiswahili text is shown above."
      : "";
    return r;
  }

  function render() {
    const { pending, txn } = flow.snapshot();
    const m = ui.meta, L = lang();
    const badge = !m ? `<span class="badge idle">Ready</span>` : m.source === "fallback"
      ? `<span class="badge warn">FALLBACK MODE</span> <small>(${esc(m.reason || "rule-based")})</small>`
      : `<span class="badge ok">Muse Spark</span>${m.cached ? " <small>(cached)</small>" : ""}`;
    const stats = m ? `<small> · ${m.latencyMs ?? ui.lastLatencyMs ?? "?"} ms${m.usage ? ` · ${m.usage.total} tokens` : " · 0 tokens (fallback/cache)"}${m.attempts > 1 ? " · retried once" : ""}</small>` : "";
    const counter = `<div class="tokens" title="Session total sent to the sentence step">Tokens this session: ${ui.totals.tokens} · calls: ${ui.totals.calls} (model ${ui.totals.modelCalls}, fallback ${ui.totals.fallbacks})</div>`;
    let h = `<div class="meta-row">${badge}${stats}${ui.busy ? " <i>thinking…</i>" : ""}</div>${counter}`;
    h += `<div class="hint">${esc(ui.msg ?? t(L, "signPrompt"))}</div>`;
    if (pending) {
      h += `<div class="caption" lang="${L === "sw" ? "sw" : "en"}">${esc(primary(pending))}</div><div class="caption-alt">${esc(secondary(pending))}</div>` +
        `<div class="confirm-row"><button id="cfYes" class="yes">${esc(t(L, "confirm"))}</button><button id="cfNo" class="no">${esc(t(L, "cancel"))}</button></div>`;
    }
    if (txn) {
      h += `<div class="txn" role="status"><b>${esc(SIM_LABEL)}</b><br>${esc(txn.id)} · status: <b>${esc(txn.status)}</b> · to: ${esc(txn.to ?? "(not signed)")} · amount: ${txn.amount != null ? "KSh " + esc(txn.amount) : "missing"} · phone: ${esc(txn.phone ?? "missing")}`;
      if (txn.status === "draft") {
        h += `<div class="agent-row"><span>${esc(t(L, "agentEntry"))}</span> <input id="aAmt" inputmode="numeric" placeholder="amount" size="7" aria-label="amount"> <input id="aPh" inputmode="tel" placeholder="07XXXXXXXX" size="12" aria-label="phone"> <button id="aFill">Set</button> <button id="aCancelTxn" class="no">Cancel transaction</button></div>`;
        if (pending?.kind === "txn_final") h += `<div class="hint"><b>Final text above in the caption — customer signs YES to create it, NO to cancel.</b></div>`;
      }
      h += `</div>`;
    }
    if (ui.voiceNote) h += `<div class="voice-note">${esc(ui.voiceNote)}</div>`;
    if (ui.err) h += `<div class="err">${esc(ui.err)}</div>`;
    h += `<div class="log">${ui.log.map(esc).join("<br>")}</div>`;
    box.innerHTML = h;
    const fill = box.querySelector("#aFill");
    if (fill) fill.onclick = () => {
      ui.err = "";
      for (const [id, f] of [["aAmt", "amount"], ["aPh", "phone"]]) {
        const v = box.querySelector("#" + id).value.trim();
        if (!v) continue;
        const r = flow.fill(f, v);
        if (!r.ok) { ui.err = r.error; break; }
        if (r.awaitingConfirm) ui.msg = lang() === "sw" ? "Taarifa kamili. Mteja athibitishe kwa NDIYO." : "Details complete. Waiting for the customer to sign YES.";
      }
      render();
    };
    const cx = box.querySelector("#aCancelTxn");
    if (cx) cx.onclick = () => { apply(flow.cancelTxn()); render(); };
    const y = box.querySelector("#cfYes"); if (y) y.onclick = () => { apply(flow.confirm()); render(); };
    const n = box.querySelector("#cfNo"); if (n) n.onclick = () => { apply(flow.snapshot().pending ? flow.cancel() : flow.cancelTxn()); render(); };
  }

  const log = (s) => { ui.log = [s, ...ui.log].slice(0, 5); };

  function apply(res) {
    if (res.action === "speak") {
      speakSentence(res.english, res.kiswahili);
      ui.msg = res.txn?.status === "created" ? "Confirmed. Spoken to the agent. (Simulated transaction created.)" : "Confirmed. Spoken to the agent.";
      log(`spoken: ${lang() === "sw" ? res.kiswahili : res.english}`);
    } else if (res.action === "cancelled") { ui.msg = "Cancelled. Sign again."; log("cancelled by customer"); }
  }

  async function handle(signs) {
    ui.err = "";
    const ctl = flow.control(signs);
    if (ctl === "confirm") apply(flow.confirm());
    else if (ctl === "cancel") apply(flow.cancel());
    else if (ctl === "cancel_txn") apply(flow.cancelTxn());
    else {
      ui.busy = true; render();
      let data;
      try {
        const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 12000);
        const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signs: signs.slice(0, 8), lang: lang() }), signal: ac.signal });
        clearTimeout(tm);
        data = await r.json();
        if (!data.ok) throw new Error(data.error || `HTTP ${r.status}`);
      } catch (e) {
        data = { ok: true, source: "fallback", reason: e?.name === "AbortError" ? "proxy_timeout" : "proxy_unreachable", result: ruleInterpret(signs), latencyMs: null };
      }
      ui.busy = false; ui.meta = data; ui.lastLatencyMs = data.latencyMs ?? null;
      ui.totals.calls += 1;
      if (data.source === "fallback") ui.totals.fallbacks += 1; else ui.totals.modelCalls += 1;
      ui.totals.tokens += data.usage?.total ?? 0;
      const p = flow.propose(data.result, signs);
      ui.msg = p.action === "clarify" ? (data.result.clarifying_question || "Not clear — please sign again.") : null;
      log(`${signs.join(" ")} -> ${data.result.intent} [${data.source}${data.cached ? ", cached" : ""}]`);
      console.log("[assistant]", { signs, lang: lang(), source: data.source, reason: data.reason, latencyMs: data.latencyMs, usage: data.usage });
    }
    render();
  }

  render();
  return {
    onUtterance: (signs) => { chain = chain.then(() => handle(signs)).catch((e) => { ui.busy = false; ui.err = String(e); render(); }); },
    refresh: render,
    confirm: () => { apply(flow.confirm()); render(); },
    cancel: () => { apply(flow.snapshot().pending ? flow.cancel() : flow.cancelTxn()); render(); },
  };
}
