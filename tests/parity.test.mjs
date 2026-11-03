// JS inference must reproduce sklearn's features and probabilities for the exported model.
// Run: node --test tests/parity.test.mjs
// Override paths with KSL_MODEL / KSL_FIXTURES (e.g. for the synthetic pipeline test).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { clipToFeatures } from "../public/shared/features.js";
import { loadModel, predictProbs } from "../public/shared/classifier.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const modelPath = process.env.KSL_MODEL || path.join(here, "../public/models/ksl-linear.json");
const fixPath = process.env.KSL_FIXTURES || path.join(here, "fixtures/parity.json");
const TOL = 1e-9;
const maxAbs = (a, b) => a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0);

for (const p of [modelPath, fixPath]) {
  assert.ok(fs.existsSync(p), `Missing ${p}. Run: python training/train.py`);
}
const model = loadModel(JSON.parse(fs.readFileSync(modelPath, "utf8")));
const fx = JSON.parse(fs.readFileSync(fixPath, "utf8"));

test("class order and dimensions match", () => {
  assert.deepEqual(model.classes, fx.classes);
  assert.equal(model.T, fx.T);
  assert.equal(model.mean.length, fx.items[0].features.length);
});

for (const item of fx.items) {
  test(`parity: ${item.name}`, () => {
    const feats = clipToFeatures(item.clip, model.T);
    assert.equal(feats.length, item.features.length);
    assert.ok(maxAbs(feats, item.features) < TOL, `features differ by ${maxAbs(feats, item.features)}`);
    const probs = predictProbs(model, feats);
    assert.ok(maxAbs(probs, item.probs) < TOL, `probs differ by ${maxAbs(probs, item.probs)}`);
    const jsLabel = model.classes[probs.indexOf(Math.max(...probs))];
    assert.equal(jsLabel, item.label);
  });
}
