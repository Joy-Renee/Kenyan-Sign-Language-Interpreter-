// Data-collection page: records landmark clips (no video) for the KSL classifier.
// Saves frames in the format expected by training/features.py.
// v2: draws the camera frame itself, shows pose/hand check, adds hands-free mode
//     (countdown -> auto-start -> auto-stop when hands leave view; leading/trailing empty frames trimmed).
import { HandLandmarker, PoseLandmarker, FilesetResolver }
  from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import { VOCAB_INFO as VOCAB, REST_ID } from "./shared/vocab.js";

const VERSION = "0.10.14";
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const HAND_MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const POSE_MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const POSE_IDX = [0, 9, 10, 11, 12]; // nose, mouth L, mouth R, shoulder L, shoulder R
const TARGET_PER_CLASS = 36;         // e.g. 3 sessions x 12 clips
const MIN_FRAMES = 6, MAX_FRAMES = 150;
const COUNTDOWN_S = 3, HANDS_GONE_MS = 600, NO_HAND_TIMEOUT_MS = 4000, REST_MS = 1500;

const classes = [...VOCAB.map((v) => v.id), REST_ID];
const label = (id) => (id === REST_ID ? "rest (no sign)" : VOCAB.find((v) => v.id === id).en);

const $ = (id) => document.getElementById(id);
const video = $("video"), overlay = $("overlay"), ctx = overlay.getContext("2d");
let hand, pose, selected = 0, recording = false, cur = [], t0 = 0, lastVideoTime = -1;
let clips = []; // clips of the current session
let counting = false, countTimer = null, seenHand = false, lastHandAt = 0;

const r4 = (v) => Math.round(v * 1e4) / 1e4;
const setStatus = (m) => { $("status").textContent = m; };

// ---------- extra UI created here (keeps collect.html unchanged) ----------
const check = document.createElement("div");
check.style.cssText = "font-size:.9rem;margin:4px 0;font-weight:600";
check.textContent = "Camera check: waiting…";
$("status").after(check);
const autoLabel = document.createElement("label");
autoLabel.style.cssText = "display:block;margin:6px 0";
autoLabel.innerHTML = '<input type="checkbox" id="auto" checked> Hands-free mode: tap Space once, 3-second countdown, ' +
  "recording starts by itself and stops when your hands leave the picture";
$("rec").before(autoLabel);
const autoOn = () => $("auto").checked;
$("auto").addEventListener("change", () => { cancelAll(); updateRecButton(); });
function updateRecButton() {
  $("rec").textContent = autoOn() ? "Start countdown (or tap Space)" : "Hold to record (or hold Space)";
}
updateRecButton();

function beep(freq = 880, ms = 120) {
  try {
    const ac = beep.ac || (beep.ac = new (window.AudioContext || window.webkitAudioContext)());
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = freq; g.gain.value = 0.08; o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + ms / 1000);
  } catch { /* sound is optional */ }
}

// ---------- IndexedDB (clips persist across reloads; falls back to memory) ----------
let dbp = null;
try {
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open("ksl-collect", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("clips", { keyPath: "id" }).createIndex("session", "session_id");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
} catch { dbp = null; }
async function idb(mode, fn) {
  if (!dbp) return null;
  try {
    const db = await dbp;
    return await new Promise((res, rej) => {
      const t = db.transaction("clips", mode);
      const req = fn(t.objectStore("clips"));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
    });
  } catch (e) { console.warn("IndexedDB unavailable", e); return null; }
}

// ---------- session ----------
const pad = (n) => String(n).padStart(2, "0");
const d = new Date();
$("session").value = `s-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
const sessionId = () => $("session").value.trim() || "session";
async function loadSession() {
  clips = (await idb("readonly", (s) => s.index("session").getAll(sessionId()))) || [];
  renderCounts();
}
$("session").addEventListener("change", loadSession);

// ---------- UI ----------
function renderCounts() {
  const n = Object.fromEntries(classes.map((c) => [c, 0]));
  clips.forEach((c) => { n[c.label] += 1; });
  $("counts").innerHTML = "<tr><th>#</th><th>class</th><th>this session</th><th>target (all sessions)</th></tr>" +
    classes.map((c, i) => `<tr class="cls ${i === selected ? "sel" : ""}" data-i="${i}"><td>${c === REST_ID ? "R" : (i + 1) % 10}</td>` +
      `<td>${label(c)}</td><td>${n[c]}</td><td>${TARGET_PER_CLASS}</td></tr>`).join("");
  document.querySelectorAll("tr.cls").forEach((tr) => tr.addEventListener("click", () => { selected = +tr.dataset.i; renderCounts(); }));
}

// ---------- recording ----------
function beginRecording() {
  recording = true; cur = []; t0 = performance.now(); seenHand = false; lastHandAt = t0;
  $("rec").classList.add("on");
  beep(1000, 150);
  setStatus(`RECORDING "${label(classes[selected])}"…` + (autoOn() ? " (drop your hands out of view when done)" : ""));
}
function cancelAll(msg) {
  clearTimeout(countTimer); counting = false;
  if (recording) { recording = false; cur = []; $("rec").classList.remove("on"); }
  if (msg) setStatus(msg);
}
function startCountdown() {
  if (!hand || counting || recording) return;
  counting = true;
  let n = COUNTDOWN_S;
  const tick = () => {
    if (!counting) return;
    if (n === 0) { counting = false; beginRecording(); return; }
    setStatus(`Get ready: ${n}… (hands down, out of view)`); beep(500, 80);
    n -= 1; countTimer = setTimeout(tick, 1000);
  };
  tick();
}
function startHold() { if (!recording && hand) beginRecording(); }
async function stopRec() {
  if (!recording) return;
  recording = false; $("rec").classList.remove("on");
  beep(600, 150);
  let frames = cur; cur = [];
  const cls = classes[selected];
  if (cls !== REST_ID) { // trim leading/trailing frames with no hands: the clip is the span where hands are visible
    const first = frames.findIndex((f) => f.hands.length > 0);
    let last = -1;
    frames.forEach((f, i) => { if (f.hands.length > 0) last = i; });
    if (first < 0) return setStatus("No hands detected in that clip; not saved.");
    frames = frames.slice(first, last + 1);
  }
  if (frames.length < MIN_FRAMES) return setStatus(`Too short (${frames.length} frames); not saved. Try again a bit slower.`);
  const clip = { id: crypto.randomUUID(), session_id: sessionId(), label: cls,
                 aspect: video.videoWidth / video.videoHeight, n_frames: frames.length, frames };
  clips.push(clip);
  await idb("readwrite", (s) => s.put(clip));
  renderCounts();
  setStatus(`Saved ${label(cls)} (${frames.length} frames). Total this session: ${clips.length}.`);
}
async function undo() {
  const c = clips.pop();
  if (!c) return setStatus("Nothing to delete.");
  await idb("readwrite", (s) => s.delete(c.id));
  renderCounts(); setStatus(`Deleted last clip (${label(c.label)}).`);
}
function download() {
  if (!clips.length) return setStatus("No clips in this session yet.");
  const doc = { schema: "ksl-landmarks-v1", session_id: sessionId(), note: $("note").value,
    created: new Date().toISOString(), mirrored_input: false, tasks_vision_version: VERSION,
    recorder: "collect.js v2 (trimmed to hand-visible span for sign classes)",
    signer: "hearing student (self); signs reference-matched, unverified", clips };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(doc)], { type: "application/json" }));
  a.download = `ksl-${sessionId()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ---------- input ----------
const typing = (e) => ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName);
addEventListener("keydown", (e) => {
  if (typing(e)) return;
  if (e.code === "Space") {
    e.preventDefault();
    if (e.repeat) return;
    if (autoOn()) { if (counting || recording) cancelAll("Cancelled."); else startCountdown(); }
    else startHold();
  } else if (e.code === "Backspace") { e.preventDefault(); undo(); }
  else if (e.code === "KeyR") { selected = classes.length - 1; renderCounts(); }
  else if (/^Digit[0-9]$/.test(e.code)) {
    const i = (Number(e.code.slice(5)) + 9) % 10; // 1..9 -> 0..8, 0 -> 9
    if (i < classes.length - 1) { selected = i; renderCounts(); }
  }
});
addEventListener("keyup", (e) => { if (e.code === "Space" && !typing(e) && !autoOn()) stopRec(); });
$("rec").addEventListener("pointerdown", () => {
  if (autoOn()) { if (counting || recording) cancelAll("Cancelled."); else startCountdown(); }
  else startHold();
});
addEventListener("pointerup", () => { if (recording && !autoOn()) stopRec(); });
$("undo").addEventListener("click", undo);
$("dl").addEventListener("click", download);

// ---------- capture loop ----------
function draw(hands, poseOut) {
  ctx.drawImage(video, 0, 0, overlay.width, overlay.height); // canvas shows the camera itself
  ctx.fillStyle = "#3b82f6";                                  // blue = nose, mouth, shoulders
  if (poseOut) for (const p of poseOut) { ctx.beginPath(); ctx.arc(p[0] * overlay.width, p[1] * overlay.height, 6, 0, 7); ctx.fill(); }
  ctx.fillStyle = recording ? "#ef4444" : "#22c55e";          // green/red = hand landmarks
  for (const h of hands) for (const p of h.lm) {
    ctx.beginPath(); ctx.arc(p[0] * overlay.width, p[1] * overlay.height, 3, 0, 7); ctx.fill();
  }
}
function updateCheck(hands, poseOut) {
  const ok = !!poseOut;
  check.textContent = `Hands in view: ${hands.length}   |   Shoulders + face: ${ok ? "OK" : "NOT SEEN (move back / tilt camera so both shoulders and your face show)"}`;
  check.style.color = ok ? "#16a34a" : "#dc2626";
}
function autoStopLogic(ts, hands) {
  if (!recording || !autoOn()) return;
  const cls = classes[selected];
  if (hands.length) { seenHand = true; lastHandAt = ts; }
  if (cls === REST_ID) { if (ts - t0 > REST_MS) stopRec(); return; }
  if (!seenHand && ts - t0 > NO_HAND_TIMEOUT_MS) { cancelAll("No hands appeared; nothing saved."); return; }
  if (seenHand && ts - lastHandAt > HANDS_GONE_MS) stopRec();
  else if (cur.length >= MAX_FRAMES) stopRec();
}
function loop() {
  if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const ts = performance.now();
    const hr = hand.detectForVideo(video, ts);
    const pr = pose.detectForVideo(video, ts);
    const handed = hr.handedness || hr.handednesses || [];
    const hands = hr.landmarks.map((lm, i) => ({
      h: handed[i][0].categoryName, s: r4(handed[i][0].score),
      lm: lm.map((p) => [r4(p.x), r4(p.y), r4(p.z)]),
    }));
    let poseOut = null;
    const pl = pr.landmarks && pr.landmarks[0];
    if (pl && (pl[11].visibility ?? 1) > 0.3 && (pl[12].visibility ?? 1) > 0.3) {
      poseOut = POSE_IDX.map((k) => [r4(pl[k].x), r4(pl[k].y)]);
    }
    draw(hands, poseOut);
    updateCheck(hands, poseOut);
    if (recording && cur.length < MAX_FRAMES) cur.push({ t: Math.round(ts - t0), hands, pose: poseOut });
    autoStopLogic(ts, hands);
  }
  requestAnimationFrame(loop);
}

// ---------- init ----------
(async () => {
  renderCounts(); await loadSession();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
    video.srcObject = stream; await video.play();
    overlay.width = video.videoWidth; overlay.height = video.videoHeight;
    const camName = stream.getVideoTracks()[0]?.label || "unknown camera";
    setStatus(`Loading MediaPipe models… (camera: ${camName}, ${video.videoWidth}x${video.videoHeight})`);
    const fileset = await FilesetResolver.forVisionTasks(WASM);
    const make = async (Cls, model, extra) => {
      for (const delegate of ["GPU", "CPU"]) {
        try { return await Cls.createFromOptions(fileset, { baseOptions: { modelAssetPath: model, delegate }, runningMode: "VIDEO", ...extra }); }
        catch (e) { console.warn(`${delegate} delegate failed`, e); }
      }
      throw new Error("could not create MediaPipe task");
    };
    hand = await make(HandLandmarker, HAND_MODEL, { numHands: 2 });
    pose = await make(PoseLandmarker, POSE_MODEL, { numPoses: 1 });
    setStatus(`Ready (camera: ${camName}, ${video.videoWidth}x${video.videoHeight}). Pick a sign, then tap Space.`);
    loop();
  } catch (e) {
    console.error(e);
    setStatus(`Setup failed: ${e.message || e}. Needs camera permission, HTTPS or localhost, internet for the model files.`);
  }
})();
