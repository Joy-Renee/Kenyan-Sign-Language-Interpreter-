// Glue: completed utterance -> /api/understand (Muse Spark) or rule fallback -> confirmation (sign YES / NO) -> speech + SIMULATED transaction.
import { createFlow, SIM_LABEL } from "./shared/flow.js";
import { ruleInterpret } from "./shared/intent.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const defaultSpeak = (text) => {
  if (!("speechSynthesis" in window) || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; speechSynthesis.speak(u); // English only; Kiswahili voice not attempted
};

export function createAssistant({ after, endpoint = "/api/understand", speak = defaultSpeak }) {
  const flow = createFlow();
  const box = document.createElement("div");
  box.style.cssText = "border:1px solid #8886;border-radius:6px;padding:8px;margin-top:8px;font-size:.9rem";
  after.after(box);
  let ui = { msg: "Sign a sentence, then lower your hands.", meta: null, busy: false, log: [], err: "" };
  let chain = Promise.resolve();

  function render() {
    const { pending, txn } = flow.snapshot();
    const m = ui.meta;
    const badge = !m ? "" : m.source === "fallback"
      ? `<b style="background:#d97706;color:#fff;padding:1px 6px;border-radius:4px">FALLBACK MODE</b> <small>(${esc(m.reason)})</small>`
      : `<b style="background:#16a34a;color:#fff;padding:1px 6px;border-radius:4px">Muse Spark</b>${m.cached ? " <small>(cached)</small>" : ""}`;
    const stats = m ? `<small> ${m.latencyMs ?? "?"} ms${m.usage ? ` · ${m.usage.total} tokens` : ""}${m.attempts > 1 ? " · retried once" : ""}</small>` : "";
    let h = `<div>${badge}${stats}${ui.busy ? " <i>thinking…</i>" : ""}</div><div style="margin:6px 0">${esc(ui.msg)}</div>`;
    if (pending) {
      h += `<div style="font-size:1.3rem;font-weight:700">${esc(pending.english)}</div><div>${esc(pending.kiswahili)}</div>` +
        `<div style="margin-top:4px"><b>Sign YES to confirm and speak it, NO to cancel.</b></div>`;
    }
    if (txn) {
      h += `<div style="margin-top:8px;border:2px dashed #d97706;padding:6px;border-radius:6px"><b>${esc(SIM_LABEL)}</b><br>` +
        `${esc(txn.id)} · status: <b>${esc(txn.status)}</b> · to: ${esc(txn.to ?? "(not signed)")} · amount: ${esc(txn.amount ?? "missing")} · phone: ${esc(txn.phone ?? "missing")}`;
      if (txn.status === "draft") {
        h += `<div style="margin-top:4px">Agent entry (typed; no numerals in the sign list): ` +
          `<input id="aAmt" placeholder="amount" size="7"> <input id="aPh" placeholder="07XXXXXXXX" size="12"> <button id="aFill">Set</button></div>`;
      }
      h += `</div>`;
    }
    if (ui.err) h += `<div style="color:#dc2626">${esc(ui.err)}</div>`;
    h += `<div style="opacity:.7;font-size:.78rem;margin-top:6px">${ui.log.map(esc).join("<br>")}</div>`;
    box.innerHTML = h;
    const b = box.querySelector("#aFill");
    if (b) b.onclick = () => {
      ui.err = "";
      for (const [id, f] of [["aAmt", "amount"], ["aPh", "phone"]]) {
        const v = box.querySelector("#" + id).value.trim();
        if (!v) continue;
        const r = flow.fill(f, v);
        if (!r.ok) { ui.err = r.error; break; }
        if (r.awaitingConfirm) ui.msg = "Details complete. Waiting for the customer to sign YES.";
      }
      render();
    };
  }

  const log = (s) => { ui.log = [s, ...ui.log].slice(0, 5); };

  function apply(res) {
    if (res.action === "speak") {
      speak(res.english);
      ui.msg = res.txn?.status === "created" ? "Confirmed. Spoken to the agent. (Simulated transaction created.)" : "Confirmed. Spoken to the agent.";
      log(`spoken: ${res.english}`);
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
        const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 12000);
        const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signs: signs.slice(0, 8) }), signal: ac.signal });
        clearTimeout(t);
        data = await r.json();
        if (!data.ok) throw new Error(data.error || `HTTP ${r.status}`);
      } catch (e) {
        data = { ok: true, source: "fallback", reason: "proxy_unreachable", result: ruleInterpret(signs), latencyMs: null };
      }
      ui.busy = false; ui.meta = data;
      const p = flow.propose(data.result, signs);
      ui.msg = p.action === "clarify" ? `Not clear: ${p.text}` : "Is this what you meant?";
      log(`${signs.join(" ")} -> ${data.result.intent} [${data.source}${data.cached ? ", cached" : ""}]`);
      console.log("[assistant]", { signs, source: data.source, reason: data.reason, latencyMs: data.latencyMs, usage: data.usage });
    }
    render();
  }

  render();
  return { onUtterance: (signs) => { chain = chain.then(() => handle(signs)).catch((e) => { ui.busy = false; ui.err = String(e); render(); }); } };
}