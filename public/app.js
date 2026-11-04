// Live KSL loop (Phase 3). Camera -> MediaPipe hands+pose -> frame (same format as collect.js) -> LiveEngine.
// Replay feeds recorded frames through the SAME engine, so the demo works without a camera.
// NOT in this phase: Meta proxy call, text-to-speech (see onUtterance()).
import { HandLandmarker, PoseLandmarker, FilesetResolver }
  from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import { VOCAB_INFO } from "./shared/vocab.js";
import { loadModel } from "./shared/classifier.js";
import { LiveEngine, DEFAULT_CONFIG, CONFIG_FIELDS } from "./shared/live.js";
import { createAssistant } from "./assistant.js";

const VERSION = "0.10.14";
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const HAND_MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const POSE_MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const POSE_IDX = [0, 9, 10, 11, 12];            // same as collect.js: nose, mouth L/R, shoulder L/R
const HAND_CONN = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const CFG_KEY = "ksl-live-config-v1";
const MAX_REC_FRAMES = 1800;                    // ~60 s of recorded stream
const DT = 33;

const $ = (id) => document.getElementById(id);
const canvas = $("view"), ctx = canvas.getContext("2d");
const video = document.createElement("video");
video.playsInline = true; video.muted = true;
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const info = (id) => VOCAB_INFO.find((v) => v.id === id);
const word = (id) => (info(id) ? info(id).en : id);

// ---------- state ----------
let model = null, hand = null, pose = null, cameraReady = false;
let mode = "off";                               // "live" | "replay" | "off"
let engine = null, liveT0 = 0, lastVideoTime = -1, aspect = 4 / 3;
let cfg = loadCfg();
let history = [];
let recording = false, recFrames = [], recT0 = 0;
let replayStream = null;
const perf = { fps: 0, lastFrameAt: 0, detectMs: 0, frames: 0, lastUI: 0 };

const setStatus = (m) => { $("status").textContent = m; };
function setBadge(text, cls) { const b = $("badge"); b.textContent = text; b.className = cls || ""; }

// ---------- config ----------
function loadCfg() {
  const c = { ...DEFAULT_CONFIG };
  try {
    const saved = JSON.parse(localStorage.getItem(CFG_KEY) || "{}");
    for (const k of Object.keys(DEFAULT_CONFIG)) {
      if (k === "mode") { if (saved.mode === "window" || saved.mode === "segment") c.mode = saved.mode; }
      else if (typeof saved[k] === "number" && isFinite(saved[k])) c[k] = saved[k];
    }
  } catch { /* storage optional */ }
  return c;
}
function saveCfg() { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch { /* optional */ } }
function applyCfg() { if (engine) engine.setConfig(cfg); saveCfg(); }
function buildCfgUI() {
  const box = $("cfg"); box.innerHTML = "";
  const m = document.createElement("div");
  m.innerHTML = '<label>Mode<select id="cfg-mode"><option value="window">window (sliding vote)</option><option value="segment">segment (one sign per hands-visible run)</option></select></label><div class="h">segment matches how the model was trained</div>';
  box.append(m);
  const sel = m.querySelector("select"); sel.value = cfg.mode;
  sel.addEventListener("change", () => { cfg.mode = sel.value; applyCfg(); resetEngine(); });
  for (const f of CONFIG_FIELDS) {
    const d = document.createElement("div");
    d.innerHTML = `<label>${f.label}<input type="number" min="${f.min}" max="${f.max}" step="${f.step}" value="${cfg[f.key]}"></label><div class="h">${f.help}</div>`;
    d.querySelector("input").addEventListener("change", (e) => {
      const v = Number(e.target.value);
      if (!isFinite(v)) { e.target.value = cfg[f.key]; return; }
      cfg[f.key] = Math.min(f.max, Math.max(f.min, v)); e.target.value = cfg[f.key]; applyCfg();
    });
    box.append(d);
  }
}
$("cfgReset").addEventListener("click", () => { cfg = { ...DEFAULT_CONFIG }; applyCfg(); buildCfgUI(); resetEngine(); });

// ---------- engine wiring ----------
function makeEngine(asp) {
  return new LiveEngine({ model, config: cfg, aspect: asp, onEvent: handleEvent });
}
function resetEngine() { if (model) engine = makeEngine(aspect); }
function handleEvent(type, p) {
  if (type === "utterance") {
    const words = p.signs.map(word);
    history.unshift({ words, endT: p.endT, mode });
    history = history.slice(0, 6);
    $("sentence").textContent = `Signs: ${words.map((w) => w.toUpperCase()).join(" + ")}.`;
    $("history").innerHTML = history.map((h) => `<li>${h.words.join(" · ")} <small>(${h.mode})</small></li>`).join("");
    onUtterance(p.items);
  }
}
// Hook for the next phase: call the proxy with p.signs here, then show the sentence and speak it.
const assistant = createAssistant({ after: document.getElementById("sentence") });
function onUtterance(items) { assistant.onUtterance(items.map((i) => i.label)); }

// ---------- drawing ----------
function drawFrame(frame, bg) {
  const W = canvas.width, H = canvas.height;
  if (bg) ctx.drawImage(bg, 0, 0, W, H);
  else { ctx.fillStyle = "#1b1f27"; ctx.fillRect(0, 0, W, H); }
  const col = recording ? "#ef4444" : mode === "replay" ? "#f59e0b" : "#22c55e";
  if (frame.pose) {
    ctx.fillStyle = "#3b82f6";
    for (const p of frame.pose) { ctx.beginPath(); ctx.arc(p[0] * W, p[1] * H, 6, 0, 7); ctx.fill(); }
    ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(frame.pose[3][0] * W, frame.pose[3][1] * H); ctx.lineTo(frame.pose[4][0] * W, frame.pose[4][1] * H); ctx.stroke();
  }
  for (const h of frame.hands) {
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath();
    for (const [a, b] of HAND_CONN) { ctx.moveTo(h.lm[a][0] * W, h.lm[a][1] * H); ctx.lineTo(h.lm[b][0] * W, h.lm[b][1] * H); }
    ctx.stroke();
    ctx.fillStyle = col;
    for (const p of h.lm) { ctx.beginPath(); ctx.arc(p[0] * W, p[1] * H, 3, 0, 7); ctx.fill(); }
  }
}

// ---------- per-frame processing (live and replay share this) ----------
function process(frame, bg) {
  const nowMs = performance.now();
  if (perf.lastFrameAt) { const inst = 1000 / Math.max(1, nowMs - perf.lastFrameAt); perf.fps += (inst - perf.fps) * 0.1; }
  perf.lastFrameAt = nowMs; perf.frames += 1;
  drawFrame(frame, bg);
  if (recording) {
    if (!recFrames.length) recT0 = frame.t;
    if (recFrames.length < MAX_REC_FRAMES) recFrames.push({ t: frame.t - recT0, hands: frame.hands, pose: frame.pose });
    else stopRecording();
  }
  engine.push(frame);
  if (nowMs - perf.lastUI > 80) { perf.lastUI = nowMs; refreshUI(); }
}

function refreshUI() {
  const s = engine.state, e = engine;
  let cur = "–", sw = "";
  if (!e.handsNow && !(e.state.listening)) cur = "no hands";
  else if (s.winner === "rest") cur = "(rest)";
  else if (s.winner === "uncertain") cur = "…";
  else { cur = word(s.winner).toUpperCase(); sw = info(s.winner)?.sw || ""; }
  $("cur").innerHTML = sw ? `${cur}<small>${sw}</small>` : cur;
  $("confbar").style.width = `${Math.round((s.conf || 0) * 100)}%`;
  $("seq").innerHTML = e.sequence.map((x) => `<span class="chip">${word(x.label)}</span>`).join("");
  const r = s.raw, c = engine.cfg;
  const f = (v, d = 1) => (v == null ? "–" : Number(v).toFixed(d));
  $("debugbox").textContent =
    `mode            ${mode}   engine: ${c.mode}\n` +
    `FPS (frames)    ${f(perf.fps)}\n` +
    `detect ms       ${f(perf.detectMs)} (hands+pose, camera only)\n` +
    `classify ms     ${f(e.stats.classifyMsLast, 2)} last / ${f(e.stats.classifyMsAvg, 2)} avg (${e.stats.predictions} predictions)\n` +
    `sign latency    ${e.stats.lastSignLatencyMs == null ? "–" : Math.round(e.stats.lastSignLatencyMs) + " ms"} (hands appeared -> sign event, approx.)\n` +
    `raw prediction  ${r ? `${r.label} @ ${f(r.conf, 2)}  (hand frames ${r.handFrames}, span ${r.spanFrames})` : "–"}\n` +
    `top-3           ${r && r.top3 && r.top3.length ? r.top3.map((x) => `${x.label} ${f(x.p, 2)}`).join(" | ") : "–"}\n` +
    `votes           ${s.votes && s.votes.length ? s.votes.join(" ") : "–"}\n` +
    `winner          ${s.winner} @ ${f(s.conf, 2)}   (min conf ${c.minConfidence}, need ${Math.min(c.voteMin, c.voteSize)}/${c.voteSize})\n` +
    `hands in view   ${e.handsNow ? "yes" : "no"}   armed: ${e.armed}   utterance gap: ${c.utteranceGapMs} ms\n` +
    `model           ${model.classes.length} classes, feature v${model.feature_version}, T=${model.T}`;
}

// ---------- live ----------
function liveLoop() {
  if (mode === "live" && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const ts = performance.now();
    const hr = hand.detectForVideo(video, ts);
    const pr = pose.detectForVideo(video, ts);
    perf.detectMs += (performance.now() - ts - perf.detectMs) * 0.1;
    const handed = hr.handedness || hr.handednesses || [];
    const hands = hr.landmarks.map((lm, i) => ({
      h: handed[i][0].categoryName, s: r4(handed[i][0].score),
      lm: lm.map((p) => [r4(p.x), r4(p.y), r4(p.z)]),
    }));
    let poseOut = null;                         // identical gating to collect.js
    const pl = pr.landmarks && pr.landmarks[0];
    if (pl && (pl[11].visibility ?? 1) > 0.3 && (pl[12].visibility ?? 1) > 0.3) poseOut = POSE_IDX.map((k) => [r4(pl[k].x), r4(pl[k].y)]);
    process({ t: Math.round(ts - liveT0), hands, pose: poseOut }, video);
  }
  requestAnimationFrame(liveLoop);
}
function goLive() {
  if (!cameraReady) { mode = "off"; setBadge("NO CAMERA", "off"); return; }
  mode = "live"; aspect = video.videoWidth / video.videoHeight;
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  liveT0 = performance.now(); lastVideoTime = -1;
  engine = makeEngine(aspect);
  setBadge("LIVE CAMERA", "");
  setStatus("Live. Sign toward the camera, keep both shoulders and your face in view.");
}

// ---------- recording a live stream for replay ----------
function startRecording() {
  if (mode !== "live") return setStatus("Record only works with the live camera running.");
  recording = true; recFrames = []; $("recBtn").textContent = "Stop recording"; $("recBtn").classList.add("rec");
  setStatus("Recording the live stream: sign your sequence, then stop.");
}
function stopRecording() {
  if (!recording) return;
  recording = false; $("recBtn").textContent = "Record live stream for replay"; $("recBtn").classList.remove("rec");
  if (recFrames.length < 10) return setStatus("Recording too short; discarded.");
  setReplay({ schema: "ksl-stream-v1", aspect, source: "recorded from live camera", frames: recFrames },
    `recorded live (${recFrames.length} frames)`);
  setStatus("Recording saved in memory. Use 'Download replay file' to keep it (put it at public/demo/replay.json).");
}
$("recBtn").addEventListener("click", () => (recording ? stopRecording() : startRecording()));

// ---------- replay ----------
function setReplay(stream, label) {
  replayStream = stream;
  const last = stream.frames[stream.frames.length - 1].t;
  $("replayInfo").textContent = `Replay loaded: ${label}; ${stream.frames.length} frames, ${(last / 1000).toFixed(1)} s; source: ${stream.source}.`;
}
function emptyFrames(t0, ms, poseOut) {
  const out = [];
  for (let t = t0; t < t0 + ms; t += DT) out.push({ t, hands: [], pose: poseOut });
  return out;
}
function buildFromSession(doc, spec) {
  const byLabel = {};
  for (const c of doc.clips) (byLabel[c.label] ||= []).push(c);
  const utts = spec.split(";").map((u) => u.split(",").map((s) => s.trim().toLowerCase().replace(/[\s-]+/g, "_")).filter(Boolean)).filter((u) => u.length);
  if (!utts.length) throw new Error("script is empty");
  const frames = []; let t = 0, lastPose = null;
  const gap = (ms) => { const g = emptyFrames(t, ms, lastPose); frames.push(...g); t += ms; };
  for (const u of utts) {
    gap(600);
    u.forEach((id, k) => {
      const clip = (byLabel[id] || [])[0];
      if (!clip) throw new Error(`no clip for "${id}" in this session file`);
      const base = clip.frames[0].t;
      for (const f of clip.frames) { frames.push({ t: t + (f.t - base), hands: f.hands, pose: f.pose }); lastPose = f.pose; }
      t += clip.frames[clip.frames.length - 1].t - base + DT;
      if (k < u.length - 1) gap(500);
    });
    gap(2200);
  }
  return { schema: "ksl-stream-v1", aspect: doc.clips[0].aspect || 4 / 3,
           source: "built from recorded clips of the training data (shows the loop works; not an accuracy test)", frames };
}
$("file").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const doc = JSON.parse(await f.text());
    if (doc.schema === "ksl-stream-v1" && Array.isArray(doc.frames) && doc.frames.length) setReplay(doc, f.name);
    else if (doc.schema === "ksl-landmarks-v1" && Array.isArray(doc.clips) && doc.clips.length) setReplay(buildFromSession(doc, $("script").value), `${f.name} [${$("script").value}]`);
    else throw new Error("unknown file format");
    setStatus("Replay ready. Press 'Replay recorded sequence'.");
  } catch (err) { setStatus(`Could not load replay file: ${err.message}`); }
});
$("dlStream").addEventListener("click", () => {
  if (!replayStream) return setStatus("No replay loaded to download.");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(replayStream)], { type: "application/json" }));
  a.download = "replay.json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});
function stopReplay(msg) {
  if (mode !== "replay") return;
  if (cameraReady) goLive(); else { mode = "off"; setBadge("NO CAMERA", "off"); engine = makeEngine(aspect); }
  if (msg) setStatus(msg);
}
function startReplay() {
  if (!model) return setStatus("Model not loaded yet.");
  if (!replayStream) return setStatus("No replay loaded. Load a replay file or record one first.");
  if (recording) stopRecording();
  mode = "replay";
  const s = replayStream; aspect = s.aspect || 4 / 3;
  canvas.width = 640; canvas.height = Math.round(640 / aspect);
  const lastF = s.frames[s.frames.length - 1];
  const frames = [...s.frames, ...emptyFrames(lastF.t + DT, cfg.utteranceGapMs + 800, lastF.pose)]; // let the last utterance close
  engine = makeEngine(aspect); history = [];
  setBadge("REPLAY: recorded landmarks, not live", "replay");
  setStatus(`Replaying (${s.source}).`);
  let i = 0; const t0 = performance.now();
  const step = () => {
    if (mode !== "replay") return;
    const el = performance.now() - t0;
    while (i < frames.length && frames[i].t <= el) process(frames[i++], null);
    if (i >= frames.length) return stopReplay("Replay finished.");
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
$("replayBtn").addEventListener("click", startReplay);
$("stopReplay").addEventListener("click", () => stopReplay("Replay stopped."));

// ---------- init ----------
(async () => {
  buildCfgUI();
  try {
    model = loadModel(await (await fetch("./models/ksl-linear.json")).json());
    engine = makeEngine(aspect);
    refreshUI();
  } catch (e) { setBadge("NO MODEL", "off"); return setStatus(`Could not load models/ksl-linear.json: ${e.message}`); }
  try {                                          // optional bundled replay
    const r = await fetch("./demo/replay.json");
    if (r.ok) { const d = await r.json(); if (d.schema === "ksl-stream-v1" && d.frames?.length) setReplay(d, "demo/replay.json"); }
  } catch { /* none bundled */ }
  setStatus("Model loaded. Starting camera…");
  requestAnimationFrame(liveLoop);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
    video.srcObject = stream; await video.play();
    setStatus("Loading MediaPipe models…");
    const fileset = await FilesetResolver.forVisionTasks(WASM);
    const make = async (Cls, path, extra) => {
      for (const delegate of ["GPU", "CPU"]) {
        try { return await Cls.createFromOptions(fileset, { baseOptions: { modelAssetPath: path, delegate }, runningMode: "VIDEO", ...extra }); }
        catch (e) { console.warn(`${delegate} delegate failed`, e); }
      }
      throw new Error("could not create MediaPipe task");
    };
    hand = await make(HandLandmarker, HAND_MODEL, { numHands: 2 });
    pose = await make(PoseLandmarker, POSE_MODEL, { numPoses: 1 });
    cameraReady = true;
    if (mode !== "replay") goLive();
  } catch (e) {
    console.error(e);
    setBadge("NO CAMERA", "off");
    setStatus(`Camera/MediaPipe unavailable (${e.message || e}). Replay still works: load a replay file.`);
  }
})();