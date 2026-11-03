// Clip -> fixed-length feature vector. MUST stay identical to training/features.py
// (the parity test enforces this). Change both together and bump FEATURE_VERSION.
//
// Clip shape: { aspect, frames: [ { t, hands: [ {h:"Left"|"Right", s, lm:[[x,y,z]*21]} ],
//                                   pose: null | [[x,y]*5] } ] }
// pose points: nose, mouth-left, mouth-right, shoulder-left, shoulder-right.
// Coordinates are MediaPipe normalized image coords from an UNMIRRORED video frame.

export const FEATURE_VERSION = 1;
export const T_DEFAULT = 8;
export const SLOTS = ["Left", "Right"];
const POSE_COUNT = 5;
const PER_HAND = 1 + 42 + 6;

function pickHands(frame) {
  const best = {};
  for (const h of frame.hands || []) {
    if (!SLOTS.includes(h.h)) continue;
    if (!(h.h in best) || h.s > best[h.h].s) best[h.h] = h;
  }
  return best;
}

function body(frame, aspect) {
  const pose = frame.pose;
  if (!pose || pose.length < POSE_COUNT) return null;
  const [nose, ml, mr, sl, sr] = pose;
  const s = Math.hypot((sl[0] - sr[0]) * aspect, sl[1] - sr[1]);
  if (s < 1e-6) return null;
  return {
    ox: ((sl[0] + sr[0]) / 2) * aspect, oy: (sl[1] + sr[1]) / 2, s,
    nx: nose[0] * aspect, ny: nose[1],
    mx: ((ml[0] + mr[0]) / 2) * aspect, my: (ml[1] + mr[1]) / 2,
  };
}

function handVec(h, b, aspect) {
  const lm = h.lm;
  const xs = lm.map((p) => p[0] * aspect);
  const ys = lm.map((p) => p[1]);
  const wx = xs[0], wy = ys[0];
  let palm = Math.hypot(xs[9] - wx, ys[9] - wy);
  if (palm < 1e-6) palm = 1.0;
  const sign = h.h === "Left" ? -1.0 : 1.0;
  const out = [1.0];
  for (let i = 0; i < 21; i++) {
    out.push((sign * (xs[i] - wx)) / palm);
    out.push((ys[i] - wy) / palm);
  }
  if (b) {
    const s = b.s;
    out.push((wx - b.ox) / s, (wy - b.oy) / s, (wx - b.nx) / s, (wy - b.ny) / s,
             (wx - b.mx) / s, (wy - b.my) / s);
  } else {
    out.push(wx - 0.5 * aspect, wy - 0.5, 0, 0, 0, 0);
  }
  return out;
}

export function frameVec(frame, aspect) {
  const hands = pickHands(frame);
  const b = body(frame, aspect);
  const out = [];
  for (const slot of SLOTS) {
    if (slot in hands) out.push(...handVec(hands[slot], b, aspect));
    else for (let i = 0; i < PER_HAND; i++) out.push(0.0);
  }
  return out;
}

export function clipToFeatures(clip, T = T_DEFAULT) {
  const frames = clip.frames || [];
  const dim = PER_HAND * 2 * T;
  if (frames.length === 0) return new Array(dim).fill(0.0);
  const aspect = clip.aspect || 1.0;
  const vecs = frames.map((f) => frameVec(f, aspect));
  const n = vecs.length;
  const out = [];
  for (let i = 0; i < T; i++) {
    const idx = n === 1 ? 0 : Math.floor((i * (n - 1)) / (T - 1) + 0.5);
    out.push(...vecs[idx]);
  }
  return out;
}
