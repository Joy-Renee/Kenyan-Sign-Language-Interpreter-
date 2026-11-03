# Training (Phase 2)

```
pip install -r training/requirements.txt
# 1. record sessions at http://localhost:3000/collect.html (any static server on localhost works,
#    e.g. `npx serve public`), download each session JSON into data/raw/
# 2. train + evaluate + export
python training/train.py
# 3. check JS == Python
node --test tests/parity.test.mjs
```

Outputs: `public/models/ksl-linear.json`, `tests/fixtures/parity.json`,
`training/reports/{report.md,metrics.json,confusion_*.png}`.

Pipeline test without real data (never commit these, never quote the numbers):
```
python training/make_synthetic.py [--hard]
python training/train.py --data training/synthetic/raw
KSL_MODEL=training/synthetic/ksl-linear.synthetic.json KSL_FIXTURES=training/synthetic/parity.json node --test tests/parity.test.mjs
```

Held-out accuracy = leave-one-session-out, one hearing signer. It measures consistency of that
signer across sessions; it is NOT KSL correctness and NOT accuracy for other signers.
