"""Clip -> fixed-length feature vector. MUST stay identical to public/shared/features.js.
Pure-Python floats on purpose so the arithmetic order matches the JS version exactly.
Bump FEATURE_VERSION in both files if you change anything here.
"""
import math
import numpy as np

FEATURE_VERSION = 1
T_DEFAULT = 8
SLOTS = ("Left", "Right")
POSE_COUNT = 5            # nose, mouth-left, mouth-right, shoulder-left, shoulder-right
PER_HAND = 1 + 42 + 6     # present flag + 21*(x,y) shape + 6 location values
FRAME_DIM = PER_HAND * 2


def _pick_hands(frame):
    best = {}
    for h in frame.get("hands") or []:
        lab = h.get("h")
        if lab not in SLOTS:
            continue
        if lab not in best or h["s"] > best[lab]["s"]:
            best[lab] = h
    return best


def _body(frame, aspect):
    pose = frame.get("pose")
    if not pose or len(pose) < POSE_COUNT:
        return None
    nose, ml, mr, sl, sr = pose[:5]
    s = math.hypot((sl[0] - sr[0]) * aspect, sl[1] - sr[1])
    if s < 1e-6:
        return None
    return dict(ox=((sl[0] + sr[0]) / 2) * aspect, oy=(sl[1] + sr[1]) / 2, s=s,
                nx=nose[0] * aspect, ny=nose[1],
                mx=((ml[0] + mr[0]) / 2) * aspect, my=(ml[1] + mr[1]) / 2)


def _hand_vec(h, b, aspect):
    lm = h["lm"]
    xs = [p[0] * aspect for p in lm]
    ys = [p[1] for p in lm]
    wx, wy = xs[0], ys[0]
    palm = math.hypot(xs[9] - wx, ys[9] - wy)
    if palm < 1e-6:
        palm = 1.0
    sign = -1.0 if h["h"] == "Left" else 1.0   # mirror left-labelled hands
    out = [1.0]
    for i in range(21):
        out.append((sign * (xs[i] - wx)) / palm)
        out.append((ys[i] - wy) / palm)
    if b:
        s = b["s"]
        out += [(wx - b["ox"]) / s, (wy - b["oy"]) / s, (wx - b["nx"]) / s,
                (wy - b["ny"]) / s, (wx - b["mx"]) / s, (wy - b["my"]) / s]
    else:
        out += [wx - 0.5 * aspect, wy - 0.5, 0.0, 0.0, 0.0, 0.0]
    return out


def frame_vec(frame, aspect):
    hands = _pick_hands(frame)
    b = _body(frame, aspect)
    out = []
    for slot in SLOTS:
        out += _hand_vec(hands[slot], b, aspect) if slot in hands else [0.0] * PER_HAND
    return out


def clip_to_features(clip, T=T_DEFAULT):
    frames = clip.get("frames") or []
    if not frames:
        return np.zeros(PER_HAND * 2 * T, dtype=np.float64)
    aspect = clip.get("aspect") or 1.0
    vecs = [frame_vec(f, aspect) for f in frames]
    n = len(vecs)
    out = []
    for i in range(T):
        idx = 0 if n == 1 else int(math.floor((i * (n - 1)) / (T - 1) + 0.5))
        out += vecs[idx]
    return np.asarray(out, dtype=np.float64)
