#!/usr/bin/env python3
"""Train + evaluate KSL clip classifiers, export the linear model for the browser.

Held-out accuracy = leave-one-session-out (LOSO): for each recording session, train on all
the other sessions and test on that one. Pooled predictions give the confusion matrix.
CAVEAT (must be repeated wherever a number is quoted): one signer, so this measures how
consistent the signer's own signing is across sessions. It does NOT measure correctness in
KSL or accuracy for other signers.

Usage:
  python training/train.py                         # data/raw/*.json -> public/models/ksl-linear.json
  python training/train.py --data training/synthetic/raw   # pipeline test; outputs go to training/synthetic/
"""
import argparse, glob, json, re, sys, datetime
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import LeaveOneGroupOut
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parent))
from features import FEATURE_VERSION, T_DEFAULT, clip_to_features  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
CAVEAT = ("Held-out accuracy here measures consistency of ONE hearing signer's own signing across "
          "recording sessions. It is not correctness in KSL and not accuracy for other signers. "
          "No sign is verified by a Deaf signer.")


def vocab_ids():
    txt = (ROOT / "public/shared/vocab.js").read_text()
    ids = re.findall(r'id:\s*"([a-z_]+)"', txt.split("export const VOCAB_INFO", 1)[1])
    if not ids:
        sys.exit("Could not read ids from public/shared/vocab.js")
    return ids + ["rest"]


def load_clips(data_dir):
    files = sorted(glob.glob(str(Path(data_dir) / "*.json")))
    if not files:
        sys.exit(f"No .json session files in {data_dir}")
    clips, seen, synthetic = [], set(), False
    for f in files:
        doc = json.load(open(f))
        synthetic = synthetic or bool(doc.get("synthetic"))
        for c in doc["clips"]:
            if c["id"] in seen:
                continue  # same session downloaded twice
            seen.add(c["id"])
            clips.append(dict(c, session=doc["session_id"]))
    return clips, synthetic


def most_confused(cm, classes, k=10):
    pairs = []
    for i in range(len(classes)):
        for j in range(i + 1, len(classes)):
            n = int(cm[i, j] + cm[j, i])
            if n:
                pairs.append((n, classes[i], classes[j], int(cm[i, j]), int(cm[j, i]),
                              int(cm[i].sum()), int(cm[j].sum())))
    pairs.sort(reverse=True)
    return pairs[:k]


def plot_cm(cm, classes, title, path):
    rows = cm.sum(axis=1, keepdims=True)
    norm = np.divide(cm, rows, out=np.zeros_like(cm, dtype=float), where=rows > 0)
    fig, ax = plt.subplots(figsize=(8, 7))
    ax.imshow(norm, vmin=0, vmax=1, cmap="Blues")
    ax.set_xticks(range(len(classes)), classes, rotation=60, ha="right")
    ax.set_yticks(range(len(classes)), classes)
    ax.set_xlabel("predicted"); ax.set_ylabel("true (row-normalised, counts shown)")
    ax.set_title(title, fontsize=9)
    for i in range(len(classes)):
        for j in range(len(classes)):
            if cm[i, j]:
                ax.text(j, i, int(cm[i, j]), ha="center", va="center",
                        color="white" if norm[i, j] > 0.5 else "black", fontsize=8)
    fig.tight_layout(); fig.savefig(path, dpi=130); plt.close(fig)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(ROOT / "data/raw"))
    ap.add_argument("--out", default=None)
    ap.add_argument("--reports", default=None)
    ap.add_argument("--parity-out", default=None)
    ap.add_argument("--T", type=int, default=T_DEFAULT)
    a = ap.parse_args()

    classes_expected = vocab_ids()
    clips, synthetic = load_clips(a.data)
    unknown = sorted({c["label"] for c in clips} - set(classes_expected))
    if unknown:
        sys.exit(f"Labels not in vocab.js: {unknown}")

    syn_dir = ROOT / "training/synthetic"
    out = Path(a.out) if a.out else (syn_dir / "ksl-linear.synthetic.json" if synthetic
                                     else ROOT / "public/models/ksl-linear.json")
    reports = Path(a.reports) if a.reports else (syn_dir / "reports" if synthetic
                                                 else ROOT / "training/reports")
    parity_out = Path(a.parity_out) if a.parity_out else (syn_dir / "parity.json" if synthetic
                                                          else ROOT / "tests/fixtures/parity.json")
    reports.mkdir(parents=True, exist_ok=True)

    banner = "!!! SYNTHETIC DATA: pipeline test only. Numbers below are NOT results. !!!" if synthetic else ""
    if banner:
        print(banner)

    y = np.array([c["label"] for c in clips])
    groups = np.array([c["session"] for c in clips])
    sessions = sorted(str(g) for g in set(groups))
    classes = sorted(str(c) for c in set(y))
    missing = sorted(set(classes_expected) - set(classes))
    print(f"{len(clips)} clips, {len(sessions)} sessions: {sessions}")
    if len(sessions) < 2:
        sys.exit("Need at least 2 sessions for a session-held-out evaluation (3+ recommended).")
    if len(sessions) < 3:
        print("WARNING: only 2 sessions; the held-out estimate is very rough.")
    if missing:
        print(f"WARNING: no data for classes {missing}; they will be absent from the model.")

    table = defaultdict(Counter)
    for lab, s in zip(y, groups):
        table[lab][s] += 1
    print("\nclips per class x session")
    print(f"{'class':<10}" + "".join(f"{s[:12]:>14}" for s in sessions))
    for lab in classes:
        print(f"{lab:<10}" + "".join(f"{table[lab][s]:>14}" for s in sessions))
        if sum(1 for s in sessions if table[lab][s] > 0) < 2:
            print(f"WARNING: class '{lab}' appears in <2 sessions; held-out numbers for it are unreliable.")

    X = np.stack([clip_to_features(c, a.T) for c in clips])
    print(f"\nfeature matrix {X.shape}")

    models = {
        "logreg": lambda: make_pipeline(StandardScaler(), LogisticRegression(C=1.0, max_iter=5000)),
        "knn": lambda: make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=5)),
        "random_forest": lambda: RandomForestClassifier(n_estimators=300, random_state=0, n_jobs=-1),
    }
    majority = max(Counter(y).values()) / len(y)
    results, md = {}, []
    for name, make in models.items():
        pred = np.empty(len(y), dtype=object)
        folds = {}
        for tr, te in LeaveOneGroupOut().split(X, y, groups):
            m = make().fit(X[tr], y[tr])
            pred[te] = m.predict(X[te])
            folds[str(groups[te][0])] = float(accuracy_score(y[te], pred[te]))
        pred = pred.astype(str)
        cm = confusion_matrix(y, pred, labels=classes)
        results[name] = dict(
            pooled_accuracy=float(accuracy_score(y, pred)),
            macro_f1=float(f1_score(y, pred, labels=classes, average="macro", zero_division=0)),
            per_session_accuracy=folds,
            confused_pairs=[dict(n=p[0], a=p[1], b=p[2], a_as_b=p[3], b_as_a=p[4], a_total=p[5], b_total=p[6])
                            for p in most_confused(cm, classes)])
        plot_cm(cm, classes, f"{name} - leave-one-session-out, pooled ({len(sessions)} sessions)"
                + (" - SYNTHETIC" if synthetic else ""), reports / f"confusion_{name}.png")
        r = results[name]
        print(f"\n[{name}] pooled acc {r['pooled_accuracy']:.3f}  macro-F1 {r['macro_f1']:.3f}  "
              f"per-session {', '.join(f'{v:.2f}' for v in folds.values())}")
        for p in r["confused_pairs"][:5]:
            print(f"   {p['a']} <-> {p['b']}: {p['a_as_b']} + {p['b_as_a']} errors")

    md += [f"# Held-out evaluation (leave-one-session-out)", "", banner, "", f"**{CAVEAT}**", "",
           f"Clips: {len(clips)}; sessions: {len(sessions)}; classes: {len(classes)}; "
           f"majority-class baseline: {majority:.3f}; chance (uniform): {1/len(classes):.3f}", "",
           "| model | pooled acc | macro-F1 | worst session | best session |", "|---|---|---|---|---|"]
    for n, r in results.items():
        v = list(r["per_session_accuracy"].values())
        md.append(f"| {n} | {r['pooled_accuracy']:.3f} | {r['macro_f1']:.3f} | {min(v):.3f} | {max(v):.3f} |")
    md += ["", "## Most confused pairs (logreg, the exported model)", "",
           "| pair | errors (a as b + b as a) | clips a / b |", "|---|---|---|"]
    for p in results["logreg"]["confused_pairs"]:
        md.append(f"| {p['a']} / {p['b']} | {p['a_as_b']} + {p['b_as_a']} | {p['a_total']} / {p['b_total']} |")
    md += ["", "Confusion matrices: `confusion_<model>.png` in this folder.", "",
           "Note: the exported weights are fit on ALL sessions, so the exported model itself has no "
           "independent test; the numbers above come from the leave-one-session-out refits."]
    (reports / "report.md").write_text("\n".join(md) + "\n")
    (reports / "metrics.json").write_text(json.dumps(
        dict(synthetic=synthetic, caveat=CAVEAT, n_clips=len(clips), sessions=sessions,
             majority_baseline=majority, results=results), indent=2))

    # ---- export linear model (fit on all data) ----
    scaler = StandardScaler().fit(X)
    lr = LogisticRegression(C=1.0, max_iter=5000).fit(scaler.transform(X), y)
    out.parent.mkdir(parents=True, exist_ok=True)
    json.dump(dict(
        format="ksl-linear-v1", feature_version=FEATURE_VERSION, T=a.T,
        classes=[str(c) for c in lr.classes_], mean=scaler.mean_.tolist(), scale=scaler.scale_.tolist(),
        coef=lr.coef_.tolist(), intercept=lr.intercept_.tolist(),
        synthetic=synthetic, created=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        trained_on=dict(n_clips=len(clips), n_sessions=len(sessions), sessions=sessions),
        heldout_loso_accuracy_logreg=results["logreg"]["pooled_accuracy"],
        caveat=CAVEAT), open(out, "w"))
    print(f"\nexported {out}  ({out.stat().st_size/1024:.0f} KB)")

    # ---- parity fixtures: sklearn probabilities for the exported model ----
    final = make_pipeline(scaler, lr)
    rng = np.random.RandomState(0)
    pick = []
    for c in classes:
        idx = np.where(y == c)[0]
        pick += list(rng.choice(idx, size=min(2, len(idx)), replace=False))
    items = [(f"clip_{i}_{y[i]}", clips[i]) for i in pick]
    src = next((c for c in clips if sum(1 for f in c["frames"] for _ in f["hands"]) > len(c["frames"])), clips[0])
    import copy
    e = copy.deepcopy(src); e["frames"] = e["frames"][:1]; items.append(("edge_single_frame", e))
    e = copy.deepcopy(src)
    for f in e["frames"]: f["pose"] = None
    items.append(("edge_no_pose", e))
    e = copy.deepcopy(src)
    for f in e["frames"]: f["hands"] = []
    items.append(("edge_no_hands", e))
    e = copy.deepcopy(src)
    for f in e["frames"]:
        for h in f["hands"]: h["h"] = "Left"
    items.append(("edge_duplicate_label", e))
    fx = []
    for name, c in items:
        feats = clip_to_features(c, a.T)
        probs = final.predict_proba(feats.reshape(1, -1))[0]
        fx.append(dict(name=name, clip=dict(aspect=c.get("aspect"), frames=c["frames"]),
                       features=feats.tolist(), probs=probs.tolist(), label=str(final.classes_[probs.argmax()])))
    parity_out.parent.mkdir(parents=True, exist_ok=True)
    json.dump(dict(feature_version=FEATURE_VERSION, T=a.T, classes=[str(c) for c in lr.classes_],
                   synthetic=synthetic, items=fx), open(parity_out, "w"))
    print(f"wrote parity fixtures {parity_out} ({len(fx)} items)")
    print("\n" + CAVEAT)


if __name__ == "__main__":
    main()
