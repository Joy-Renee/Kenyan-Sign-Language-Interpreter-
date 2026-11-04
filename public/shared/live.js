// Live recognition engine. Pure logic (no DOM, no MediaPipe) so it runs in the browser and in Node tests.
// Input: frames { t (ms, any monotonic clock), hands: [...], pose: null|[[x,y]*5] } in the SAME format
// the collector records. Output: callbacks "prediction", "sign", "utterance".
//
// The classifier is CLIP-level (hand-visible span -> 8 steps -> vector), so "per-frame prediction" here means:
// every strideMs, take the last windowMs of frames, trim to the span where hands are visible (as in training),
// classify that span, and put the result into a vote buffer.
import { classifyClip } from "./classifier.js";

export const DEFAULT_CONFIG = {
  mode: "window",        // "window" = sliding-window vote; "segment" = classify each hands-visible run once
  windowMs: 1200,        // window mode: how much recent history one prediction sees
  strideMs: 100,         // window mode: time between predictions
  minHandFrames: 6,      // fewer hand frames than this in the span -> treated as "no sign" (collector MIN_FRAMES)
  minConfidence: 0.55,   // below this a prediction counts as "uncertain"
  voteSize: 5,           // window mode: number of recent predictions that vote
  voteMin: 3,            // window mode: votes the winner needs
  refractoryMs: 300,     // minimum time between two sign events
  utteranceGapMs: 1500,  // no hand for this long after >=1 sign -> utterance complete
  segmentGapMs: 400,     // segment mode: no hand for this long ends a segment
  maxSegmentMs: 3000,    // segment mode: force-cut a very long segment
  maxSigns: 12,          // safety: close the utterance after this many signs
};

// Used by the UI to build the settings panel.
export const CONFIG_FIELDS = [
  { key: "windowMs", label: "Window (ms)", min: 400, max: 3000, step: 50, help: "window mode: history per prediction" },
  { key: "strideMs", label: "Stride (ms)", min: 33, max: 500, step: 11, help: "window mode: time between predictions" },
  { key: "minHandFrames", label: "Min hand frames", min: 2, max: 30, step: 1, help: "fewer hand frames in the span = no sign" },
  { key: "minConfidence", label: "Min confidence", min: 0.1, max: 0.99, step: 0.01, help: "below = uncertain" },
  { key: "voteSize", label: "Vote size", min: 1, max: 15, step: 1, help: "window mode: predictions that vote" },
  { key: "voteMin", label: "Votes needed", min: 1, max: 15, step: 1, help: "window mode: majority threshold" },
  { key: "refractoryMs", label: "Refractory (ms)", min: 0, max: 2000, step: 50, help: "min time between sign events" },
  { key: "utteranceGapMs", label: "Utterance gap (ms)", min: 500, max: 4000, step: 100, help: "no hand this long = utterance ends" },
  { key: "segmentGapMs", label: "Segment gap (ms)", min: 150, max: 1500, step: 50, help: "segment mode: no hand this long ends a sign" },
  { key: "maxSegmentMs", label: "Max segment (ms)", min: 1000, max: 8000, step: 250, help: "segment mode: force-cut" },
  { key: "maxSigns", label: "Max signs / utterance", min: 1, max: 30, step: 1, help: "safety limit" },
];

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export class LiveEngine {
  constructor({ model = null, classify = null, config = {}, aspect = 4 / 3, onEvent = () => {} } = {}) {
    this.model = model;
    this.classify = classify || ((clip) => classifyClip(model, clip));
    this.cfg = { ...DEFAULT_CONFIG, ...config };
    this.aspect = aspect;
    this.onEvent = onEvent;
    this.reset();
  }

  setConfig(patch) { Object.assign(this.cfg, patch); }

  reset() {
    this.buf = [];                // window mode: recent frames
    this.seg = null;              // segment mode: { frames, startT }
    this.votes = [];              // window mode: [{label, conf}]
    this.sequence = [];           // signs of the utterance in progress: {label, conf, t, latencyMs}
    this.lastEmitted = null;
    this.lastEmitT = -Infinity;
    this.armed = true;
    this.lastPredT = -Infinity;
    this.lastHandT = -Infinity;
    this.segStartT = null;        // start of the current hand-visible run (for latency)
    this.handsNow = false;
    this.state = { winner: "rest", conf: 0, raw: null, votes: [], listening: false };
    this.stats = { predictions: 0, classifyMsLast: 0, classifyMsAvg: 0, lastSignLatencyMs: null };
  }

  // Feed one frame. Frames must arrive in time order.
  push(frame) {
    const t = frame.t;
    const has = (frame.hands || []).length > 0;
    if (has) {
      if (t - this.lastHandT > this.cfg.segmentGapMs) this.segStartT = t;
      this.lastHandT = t;
    }
    this.handsNow = has;
    if (this.cfg.mode === "segment") this._segmentStep(frame, has);
    else this._windowStep(frame);
    this._utteranceCheck(t);
  }

  // ---------- window mode ----------
  _windowStep(frame) {
    const c = this.cfg, t = frame.t;
    this.buf.push(frame);
    while (this.buf.length && this.buf[0].t < t - c.windowMs) this.buf.shift();
    if (t - this.lastPredT < c.strideMs) return;
    this.lastPredT = t;
    const pred = this._predictSpan(this._latestRun(this.buf, t));
    const label = this._voteLabel(pred);
    this.votes.push({ label, conf: pred.label === "none" ? 1 : pred.conf });
    while (this.votes.length > c.voteSize) this.votes.shift();
    const win = this._winner();
    this.state = { winner: win.label, conf: win.conf, raw: pred, votes: this.votes.map((v) => v.label), listening: false };
    this.onEvent("prediction", { t, pred, winner: win });
    this._maybeEmit(win, t);
  }

  // Latest hand-visible run inside the window: if hands have been absent for segmentGapMs the run is stale
  // (-> no sign, so a finished sign stops voting and the next sign can re-arm); a longer hands-absent break
  // inside the window starts a new run, so an old sign does not leak into the next one.
  _latestRun(frames, t) {
    let last = -1;
    for (let i = frames.length - 1; i >= 0; i--) if ((frames[i].hands || []).length > 0) { last = i; break; }
    if (last < 0 || t - frames[last].t >= this.cfg.segmentGapMs) return [];
    let start = last;
    for (let i = last - 1, prevT = frames[last].t; i >= 0; i--) {
      if ((frames[i].hands || []).length === 0) continue;
      if (prevT - frames[i].t >= this.cfg.segmentGapMs) break;
      start = i; prevT = frames[i].t;
    }
    return frames.slice(start, last + 1);
  }

  _voteLabel(pred) {
    if (pred.label === "none" || pred.label === "rest") return "rest";
    return pred.conf >= this.cfg.minConfidence ? pred.label : "uncertain";
  }

  _winner() {
    const need = Math.min(this.cfg.voteMin, this.cfg.voteSize);
    const counts = {};
    for (const v of this.votes) counts[v.label] = (counts[v.label] || 0) + 1;
    let best = null;
    for (const [l, n] of Object.entries(counts)) if (!best || n > best.n) best = { label: l, n };
    if (!best || best.n < need) return { label: "uncertain", conf: 0 };
    const mine = this.votes.filter((v) => v.label === best.label);
    return { label: best.label, conf: mine.reduce((a, v) => a + v.conf, 0) / mine.length };
  }

  _maybeEmit(win, t) {
    const c = this.cfg;
    if (win.label === "rest") { this.armed = true; return; }
    if (win.label === "uncertain") return;
    if (!this.armed && win.label === this.lastEmitted) return;   // same sign still being held
    if (t - this.lastEmitT < c.refractoryMs) return;
    this._emitSign(win.label, win.conf, t, Math.max(this.segStartT ?? t, this.lastEmitT));
  }

  // ---------- segment mode ----------
  _segmentStep(frame, has) {
    const c = this.cfg, t = frame.t;
    if (!this.seg) {
      if (!has) return;
      this.seg = { frames: [], startT: t };
    }
    this.seg.frames.push(frame);
    const gone = t - this.lastHandT >= c.segmentGapMs;
    const tooLong = t - this.seg.startT >= c.maxSegmentMs;
    this.state.listening = true;
    if (gone || tooLong) {
      const { frames, startT } = this.seg;
      this.seg = has && !gone ? { frames: [], startT: t } : null;
      this.state.listening = !!this.seg;
      this._finishSegment(frames, startT, t);
    }
  }

  _finishSegment(frames, startT, t) {
    const pred = this._predictSpan(frames);
    const label = this._voteLabel(pred);
    const conf = pred.label === "none" ? 1 : pred.conf;
    this.state = { ...this.state, winner: label, conf, raw: pred, votes: [label] };
    this.onEvent("prediction", { t, pred, winner: { label, conf } });
    if (label !== "rest" && label !== "uncertain") this._emitSign(label, conf, t, startT);
  }

  // ---------- shared ----------
  // Trim to the span where hands are visible (as the collector does), then classify.
  _predictSpan(frames) {
    let first = -1, last = -1, n = 0;
    for (let i = 0; i < frames.length; i++) {
      if ((frames[i].hands || []).length > 0) { if (first < 0) first = i; last = i; n++; }
    }
    if (first < 0 || n < this.cfg.minHandFrames) return { label: "none", conf: 1, handFrames: n, spanFrames: 0, ms: 0, top3: [] };
    const span = frames.slice(first, last + 1);
    const a = now();
    const r = this.classify({ aspect: this.aspect, frames: span });
    const ms = now() - a;
    this.stats.predictions += 1;
    this.stats.classifyMsLast = ms;
    this.stats.classifyMsAvg += (ms - this.stats.classifyMsAvg) * 0.1;
    let top3 = [];
    if (r.probs && this.model && this.model.classes) {
      top3 = r.probs.map((p, i) => ({ label: this.model.classes[i], p })).sort((x, y) => y.p - x.p).slice(0, 3);
    }
    return { label: r.label, conf: r.confidence, handFrames: n, spanFrames: span.length, ms, top3 };
  }

  _emitSign(label, conf, t, sinceT) {
    const latencyMs = Math.max(0, t - sinceT);
    const item = { label, conf, t, latencyMs };
    this.sequence.push(item);
    this.lastEmitted = label;
    this.lastEmitT = t;
    this.armed = false;
    this.stats.lastSignLatencyMs = latencyMs;
    this.onEvent("sign", item);
    if (this.sequence.length >= this.cfg.maxSigns) this._finishUtterance(t);
  }

  _utteranceCheck(t) {
    if (!this.sequence.length || this.handsNow) return;
    const c = this.cfg;
    const gap = Math.max(c.utteranceGapMs, c.mode === "segment" ? c.segmentGapMs + 100 : 0);
    if (t - this.lastHandT >= gap) this._finishUtterance(t);
  }

  _finishUtterance(t) {
    const items = this.sequence;
    this.onEvent("utterance", { signs: items.map((s) => s.label), items, startT: items[0].t, endT: t });
    this.sequence = [];
    this.votes = [];
    this.buf = [];
    this.lastEmitted = null;
    this.armed = true;
    this.state = { ...this.state, winner: "rest", conf: 0, votes: [] };
  }
}
