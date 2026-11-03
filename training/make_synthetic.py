#!/usr/bin/env python3
"""Generate SYNTHETIC landmark sessions to exercise the pipeline code.
These are NOT sign data. Accuracy on them says nothing about KSL or about your signing.
Output: training/synthetic/raw/*.json  (every file carries "synthetic": true)
"""
import argparse, json, math, random, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TWO_HANDED = {"help", "how_much", "no"}


def vocab_ids():
    txt = (ROOT / "public/shared/vocab.js").read_text()
    return re.findall(r'id:\s*"([a-z_]+)"', txt.split("export const VOCAB_INFO", 1)[1])


def r4(v):
    return round(v, 4)


def make_class_protos(ids):
    protos = {}
    for k, cid in enumerate(ids + ["rest"]):
        rng = random.Random(1000 + k)
        base = [[rng.gauss(0, 0.5), rng.gauss(0, 0.5)] for _ in range(21)]
        base[0] = [0.0, 0.0]
        base[9] = [0.0, -1.0]
        n_hands = 0 if cid == "rest" else (2 if cid in TWO_HANDED else 1)
        locs = [[(rng.uniform(-1, 1), rng.uniform(-1.5, 0.5)), (rng.uniform(-1, 1), rng.uniform(-1.5, 0.5))]
                for _ in range(n_hands)]
        protos[cid] = (base, n_hands, locs)
    return protos


def make_clip(cid, proto, rng, sess_off, aspect):
    base, n_hands, locs = proto
    n = rng.randint(15, 45)
    shoulders = ((0.4, 0.7), (0.6, 0.7))
    frames = []
    for f in range(n):
        u = f / (n - 1)
        pose = [[r4(0.5 + rng.gauss(0, .003)), r4(0.4)], [r4(0.48), r4(0.48)], [r4(0.52), r4(0.48)],
                [r4(shoulders[0][0]), r4(shoulders[0][1])], [r4(shoulders[1][0]), r4(shoulders[1][1])]]
        hands = []
        for hi in range(n_hands):
            if rng.random() < 0.05:
                continue  # dropped detection
            lab = "Right" if hi == 0 else "Left"
            (sx, sy), (ex, ey) = locs[hi]
            lx = sx + (ex - sx) * u + sess_off[0] + rng.gauss(0, .05)
            ly = sy + (ey - sy) * u + sess_off[1] + rng.gauss(0, .05)
            wx = 0.5 + lx * 0.2 / aspect
            wy = 0.7 + ly * 0.2
            p = 0.1
            lm = []
            for (bx, by) in base:
                bx2 = bx + rng.gauss(0, .05) + sess_off[2]
                by2 = by + rng.gauss(0, .05)
                if lab == "Left":
                    bx2 = -bx2
                lm.append([r4(wx + bx2 * p / aspect), r4(wy + by2 * p), 0.0])
            hands.append({"h": lab, "s": r4(0.9 + rng.random() * 0.09), "lm": lm})
        frames.append({"t": f * 33, "hands": hands, "pose": pose})
    return {"id": f"syn-{rng.random():.12f}", "label": cid, "aspect": aspect, "frames": frames}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hard", action="store_true", help="make send/give identical so the confusion code path is exercised")
    hard = ap.parse_args().hard
    ids = vocab_ids()
    protos = make_class_protos(ids)
    if hard:
        protos["give"] = protos["send"]
    out = ROOT / "training/synthetic/raw"
    out.mkdir(parents=True, exist_ok=True)
    for s in range(4):
        rng = random.Random(7 + s)
        sess_off = (rng.gauss(0, .03), rng.gauss(0, .03), rng.gauss(0, .03))
        clips = [make_clip(cid, protos[cid], rng, sess_off, 16 / 9)
                 for cid in ids + ["rest"] for _ in range(10)]
        doc = {"schema": "ksl-landmarks-v1", "synthetic": True, "session_id": f"synthetic-s{s+1}",
               "note": "SYNTHETIC test data, not sign data", "clips": clips}
        (out / f"synthetic-s{s+1}.json").write_text(json.dumps(doc))
    print("wrote", out)


if __name__ == "__main__":
    main()
