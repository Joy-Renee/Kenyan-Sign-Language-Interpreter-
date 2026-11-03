# Held-out evaluation (leave-one-session-out)



**Held-out accuracy here measures consistency of ONE hearing signer's own signing across recording sessions. It is not correctness in KSL and not accuracy for other signers. No sign is verified by a Deaf signer.**

Clips: 33; sessions: 3; classes: 11; majority-class baseline: 0.091; chance (uniform): 0.091

| model | pooled acc | macro-F1 | worst session | best session |
|---|---|---|---|---|
| logreg | 0.788 | 0.781 | 0.636 | 1.000 |
| knn | 0.364 | 0.351 | 0.273 | 0.455 |
| random_forest | 0.818 | 0.823 | 0.727 | 1.000 |

## Most confused pairs (logreg, the exported model)

| pair | errors (a as b + b as a) | clips a / b |
|---|---|---|
| mother / send | 0 + 2 | 3 / 3 |
| mother / yes | 1 + 0 | 3 / 3 |
| me / yes | 0 + 1 | 3 / 3 |
| me / rest | 1 + 0 | 3 / 3 |
| help / money | 0 + 1 | 3 / 3 |
| give / money | 1 + 0 | 3 / 3 |

Confusion matrices: `confusion_<model>.png` in this folder.

Note: the exported weights are fit on ALL sessions, so the exported model itself has no independent test; the numbers above come from the leave-one-session-out refits.
