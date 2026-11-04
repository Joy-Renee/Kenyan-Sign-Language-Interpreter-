// Tests for public/shared/live.js. Run: node --test tests/live.test.js
// Most tests use a FAKE classifier that decodes the class from the synthetic frames, so they check the
// engine logic (voting, debounce, sequence, utterance end), NOT recognition accuracy.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { LiveEngine, DEFAULT_CONFIG } from "../public/shared/live.js";
import { loadModel, classifyClip } from "../public/shared/classifier.js";

const CLASSES = ["me", "send", "money", "rest"];
const DT = 33;

function lm(idx) { return Array.from({ length: 21 }, (_, i) => [idx / 100 + i * 0.001, 0.5 + i * 0.001, 0]); }
function signFrames(idx, t0, ms) {
  const out = [];
  for (let t = t0; t < t0 + ms; t += DT) out.push({ t, hands: [{ h: "Right", s: 0.9, lm: lm(idx) }], pose: null });
  return out;
}
function gapFrames(t0, ms) {
  const out = [];
  for (let t = t0; t < t0 + ms; t += DT) out.push({ t, hands: [], pose: null });
  return out;
}
// fake classifier: class index encoded in the first landmark x; conf configurable
function fake(conf = 0.9) {
  return (clip) => {
    const idx = Math.round(clip.frames[0].hands[0].lm[0][0] * 100);
    return { label: CLASSES[idx], confidence: conf, probs: CLASSES.map((_, i) => (i === idx ? conf : (1 - conf) / 3)) };
  };
}
function run(frames, { conf = 0.9, config = {} } = {}) {
  const events = [];
  const e = new LiveEngine({ classify: fake(conf), config, onEvent: (type, p) => events.push({ type, p }) });
  for (const f of frames) e.push(f);
  return { e, signs: events.filter((x) => x.type === "sign").map((x) => x.p.label),
           utts: events.filter((x) => x.type === "utterance").map((x) => x.p.signs), events };
}
function build(parts) { // parts: [["sign", idx, ms] | ["gap", ms]]
  let t = 0; const frames = [];
  for (const p of parts) {
    const fr = p[0] === "sign" ? signFrames(p[1], t, p[2]) : gapFrames(t, p[1]);
    frames.push(...fr); t += (p[0] === "sign" ? p[2] : p[1]);
  }
  return frames;
}

test("window mode: three signs with short gaps -> one utterance in order", () => {
  const r = run(build([["gap", 300], ["sign", 0, 900], ["gap", 500], ["sign", 1, 900], ["gap", 500], ["sign", 2, 900], ["gap", 2000]]));
  assert.deepEqual(r.signs, ["me", "send", "money"]);
  assert.deepEqual(r.utts, [["me", "send", "money"]]);
});

test("window mode: a held sign emits once", () => {
  const r = run(build([["sign", 0, 3000], ["gap", 2000]]));
  assert.deepEqual(r.signs, ["me"]);
});

test("window mode: same sign twice with a break emits twice", () => {
  const r = run(build([["sign", 1, 900], ["gap", 800], ["sign", 1, 900], ["gap", 2000]]));
  assert.deepEqual(r.signs, ["send", "send"]);
});

test("rest class is never emitted as a sign", () => {
  const r = run(build([["sign", 3, 2000], ["gap", 2000]]));
  assert.deepEqual(r.signs, []);
  assert.deepEqual(r.utts, []);
});

test("low confidence is not emitted; lowering the threshold emits it", () => {
  const frames = build([["sign", 0, 1200], ["gap", 2000]]);
  assert.deepEqual(run(frames, { conf: 0.4 }).signs, []);
  assert.deepEqual(run(frames, { conf: 0.4, config: { minConfidence: 0.3 } }).signs, ["me"]);
});

test("utterance does not end before the gap, ends after it", () => {
  const short = run(build([["sign", 0, 900], ["gap", 1000]]));
  assert.equal(short.utts.length, 0);
  assert.equal(short.e.sequence.length, 1);
  const long = run(build([["sign", 0, 900], ["gap", 1700]]));
  assert.equal(long.utts.length, 1);
});

test("two utterances separated by a long gap", () => {
  const r = run(build([["sign", 0, 900], ["gap", 2000], ["sign", 2, 900], ["gap", 2000]]));
  assert.deepEqual(r.utts, [["me"], ["money"]]);
});

test("too few hand frames (flicker) is ignored", () => {
  const r = run(build([["sign", 0, 100], ["gap", 2000]]));
  assert.deepEqual(r.signs, []);
});

test("segment mode: one sign per hands-visible run, sequence and utterance", () => {
  const r = run(build([["gap", 300], ["sign", 0, 900], ["gap", 600], ["sign", 1, 900], ["gap", 600], ["sign", 2, 900], ["gap", 2000]]),
    { config: { mode: "segment" } });
  assert.deepEqual(r.signs, ["me", "send", "money"]);
  assert.deepEqual(r.utts, [["me", "send", "money"]]);
});

test("segment mode: same sign twice emits twice", () => {
  const r = run(build([["sign", 1, 900], ["gap", 700], ["sign", 1, 900], ["gap", 2000]]), { config: { mode: "segment" } });
  assert.deepEqual(r.signs, ["send", "send"]);
});

test("config changes apply to a running engine", () => {
  const e = new LiveEngine({ classify: fake(), config: {} });
  e.setConfig({ utteranceGapMs: 700 });
  assert.equal(e.cfg.utteranceGapMs, 700);
  assert.equal(DEFAULT_CONFIG.utteranceGapMs, 1500);
});

test("sign latency is reported and positive", () => {
  const r = run(build([["sign", 0, 1200], ["gap", 2000]]));
  const s = r.events.find((x) => x.type === "sign").p;
  assert.ok(s.latencyMs > 0 && s.latencyMs < 1200, `latency ${s.latencyMs}`);
});

const MODEL = new URL("../public/models/ksl-linear.json", import.meta.url);
test("real model loads and the engine runs on it without errors (no accuracy claim)", { skip: !fs.existsSync(MODEL) }, () => {
  const model = loadModel(JSON.parse(fs.readFileSync(MODEL, "utf8")));
  const frames = build([["sign", 0, 900], ["gap", 2000]]);
  const events = [];
  const e = new LiveEngine({ model, onEvent: (t, p) => events.push(t) });
  for (const f of frames) e.push(f);
  assert.ok(events.includes("prediction"));
  const c = classifyClip(model, { aspect: 4 / 3, frames: frames.slice(0, 20) });
  assert.ok(model.classes.includes(c.label));
  assert.ok(c.confidence > 0 && c.confidence <= 1);
});
