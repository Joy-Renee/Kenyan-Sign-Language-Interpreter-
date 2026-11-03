// Runs the exported linear (multinomial logistic regression) model in the browser/Node.
import { clipToFeatures, FEATURE_VERSION } from "./features.js";

export function loadModel(json) {
  if (json.feature_version !== FEATURE_VERSION) {
    throw new Error(`Model feature_version ${json.feature_version} != code ${FEATURE_VERSION}`);
  }
  return json;
}

export function softmax(z) {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

export function predictProbs(model, feats) {
  const D = model.mean.length;
  if (feats.length !== D) throw new Error(`Expected ${D} features, got ${feats.length}`);
  const z = new Array(D);
  for (let d = 0; d < D; d++) z[d] = (feats[d] - model.mean[d]) / model.scale[d];
  const logits = model.coef.map((row, c) => {
    let acc = model.intercept[c];
    for (let d = 0; d < D; d++) acc += row[d] * z[d];
    return acc;
  });
  return softmax(logits);
}

export function classifyClip(model, clip) {
  const feats = clipToFeatures(clip, model.T);
  const probs = predictProbs(model, feats);
  let best = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;
  return { label: model.classes[best], confidence: probs[best], probs };
}
