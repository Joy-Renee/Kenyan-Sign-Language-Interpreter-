# PROJECT_STATE
Last updated: Tue 3 Nov 2026, Nairobi (end of Phase 3; parity on real model reported OK: live loop code written and tested in sandbox; NOT yet run in a browser by me; model NOT retrained, by decision)
Working style: concept first (max 10 lines), then build everything without more questions, end each phase with Built / Not built / Needs my action, then update this file. Don't overstate anything.

## Done (built and working)
- GitHub repo public. Meta Model API account, key and $150 credits claimed.
- Phase 1 written deliverables exist as text drafts (theme decision, verification sheet, demo dialogue, README scope paragraph, outreach message). Not all are in the repo.
- `docs/ksl-sign-list.md` in repo: 10 labels, entry URLs, motion notes in my own words. All signs Unverified.
- Phase 1 code pushed: proxy `api/interpret.js` + `api/_lib/*`, scripts, README stub. `npm test` 10/10 (sandbox, fake key; re-run on my machine after merge: reported OK).
- Phase 2 merged into my repo and pushed. Vocabulary reconciled: `public/shared/vocab.js` exports `VOCAB` (string array, used by proxy) and `VOCAB_INFO` (details, used by collector/trainer/app); `fallback.js`, its test and the `meta.js` example use the real 10 tokens.
- Data collection page `public/collect.html` + `public/collect.js` (v2). Works in my browser (reported by me): camera, MediaPipe models, saving clips, download.
- Real data recorded: 3 sessions (s-20261103-1546, -1635, -1649), same day, 1 clip per class per session = 33 clips, 11 classes (10 signs + rest). Session JSONs in `data/raw/` (gitignored), backed up on my Desktop.
- Trained with `training/train.py` on those 33 clips; exported `public/models/ksl-linear.json` (214 KB, logistic regression fit on all 33 clips, `synthetic: false`) and `tests/fixtures/parity.json` (26 items).
- `npm run test:parity` on the REAL model and real fixtures (`tests/fixtures/parity.json`): reported by me on my machine: `# fail 0` (JS features/classifier match the Python trainer). Exact pass count not recorded here.
- Phase 3 engine `public/shared/live.js` (pure logic, no DOM): `node --test tests/live.test.js` -> 13/13 pass in the sandbox. 12 tests use a FAKE classifier (they check voting, debounce, sequence, utterance end, segment mode, config, latency, NOT recognition); 1 test loads the real model JSON and checks the engine runs on synthetic frames without errors. Writing the tests found and fixed one real bug (a finished sign kept voting, so a repeated sign could not re-arm).

## Built but untested
- `public/index.html` (replaces the placeholder) + `public/app.js`: live camera loop, skeleton overlay, current sign + confidence bar, sequence chips, completed-utterance list, debug panel (FPS, detect ms, classify ms, sign latency, raw prediction, top-3, votes, winner), threshold panel (saved in localStorage), replay (load file, record live stream, download). Only syntax-checked (`node --check`) and the session->replay builder run in Node on synthetic clips. NEVER run in a browser yet: camera loop, MediaPipe init, drawing, buttons, file loading, replay timing are all unverified.
- Live recognition quality with the real model: unknown. Default thresholds are guesses, not tuned.
- Phase 2 and Phase 3 files may not all be committed yet: check `git status`.

## NOT built
- Wiring to the proxy / Muse Spark (hook is an empty `onUtterance()` in `app.js`), text-to-speech, scenario UI, demo video, submission text.
- Any real Meta API call from my code (`npm run test:meta` not yet run/reported); Vercel deployment; Deaf-signer validation; Kiswahili quality check.
- Clarifying-question / bilingual-output strengthening (not committed).

## Decisions (vocabulary, model ids, thresholds, theme)
- Track: Indie (solo). Theme: Build for Your World. I must not claim to be Deaf or to have firsthand Deaf experience; the firsthand part is the Kenyan mobile-money setting.
- Scenario: Deaf customer at a mobile money agent; simulated transactions only; no medical content.
- Pipeline: browser, MediaPipe Hand Landmarker + Pose Landmarker (lite) JS -> frames -> normalization -> 8-step resample -> 784-number vector -> logistic regression (JSON weights, run in JS) -> window vote / segment + debounce + pause-based utterance detection -> proxy -> Muse Spark -> text + TTS. Fallback labelled as fallback.
- Feature recipe v1 (`FEATURE_VERSION = 1`): per hand wrist-translate, palm-scale, x times aspect, left-labelled hands mirrored; wrist location relative to shoulder midpoint, nose, mouth in shoulder-width units; hand slots by MediaPipe label from UNMIRRORED video (highest score per label); nearest-frame resample to T=8. Same dominant hand and same camera every session. Training clips are trimmed to the hand-visible span, so live inference trims the same way.
- Live loop design (Phase 3): the classifier is CLIP-level, so "per-frame prediction" = every `strideMs` classify the latest hand-visible run inside the last `windowMs` (trimmed to hand-visible span; a run with no hand for `segmentGapMs` is stale = no sign). Last `voteSize` predictions vote; winner needs `voteMin`; prediction below `minConfidence` = uncertain; `rest` or no hands = rest. A sign event fires once; the same sign fires again only after a rest vote (re-arm) or a different sign; `refractoryMs` between events. Utterance closes after `utteranceGapMs` with no hand once >=1 sign exists. Second mode `segment`: each hands-visible run (ended by `segmentGapMs` without hand) is classified once; this matches training most closely. Both modes switchable live; default `window` (as requested), not yet compared on real signing.
- Default thresholds (guesses): window 1200 ms, stride 100 ms, min hand frames 6, min confidence 0.55, vote 3 of 5, refractory 300 ms, utterance gap 1500 ms, segment gap 400 ms, max segment 3000 ms, max 12 signs.
- Replay: engine is fed recorded frames at their timestamps (1x). Badge says REPLAY. Replay of a session file replays TRAINING clips (not an accuracy test, labelled so). Preferred demo fallback: a stream recorded live (`Record live stream`), saved as `public/demo/replay.json` (auto-loaded if present).
- DECISION (3 Nov): do NOT retrain before Phase 3 (no time). Use the current model. If time remains at the end, record more sessions, re-run train.py and drop in the new `ksl-linear.json` (format unchanged).
- Held-out accuracy must always be described as: one hearing signer, consistency across my own sessions, not KSL correctness, not other signers.
- Sentence model: `muse-spark-1.3` (reasoning effort `minimal`, max_output_tokens 300). One call per completed utterance, cached.
- Vocabulary (10, UNVERIFIED): ME, MONEY, SEND, GIVE, HELP, MOTHER, HOW-MUCH, YES, NO, THANK-YOU. No numerals. English primary, Kiswahili secondary.
- KSL source: https://www.ksldictionary.com/dictionary. No signer verification; every sign UNVERIFIED and README must say so. No dictionary videos/images as training data or demo assets.
- Hosting: Vercel (static `public/` + `api/`). Coding assistant for Phase 1+: undecided. Speech-to-text: not in core pipeline.

## URLs (repo, live app, proxy, video)
- Repo: https://github.com/Joy-Renee/Kenyan-Sign-Language-Interpreter-
- Live app / proxy: not deployed. Video: not recorded.
- KSL reference source: https://www.ksldictionary.com/dictionary (2015 copyright; not confirmed as endorsed by a Deaf organisation).
- Candidate organisations (no contact details found): KNAD; KSLIA; KSL Research Project, University of Nairobi.

## Numbers (held-out accuracy, eval table, latency, tokens)
Leave-one-session-out on 33 clips (3 sessions x 11 classes x 1 clip). TOO SMALL TO QUOTE AS ACCURACY: each held-out session is 11 clips, one clip = 9 points.
| model | pooled | macro-F1 | per-session |
|---|---|---|---|
| logreg (exported) | 0.788 (26/33) | 0.781 | 0.73, 0.64, 1.00 |
| random forest | 0.818 (27/33) | 0.823 | 0.73, 0.73, 1.00 |
| kNN | 0.364 | 0.351 | 0.36, 0.27, 0.45 |
- Majority/chance baseline 0.091. Confused pairs (1-2 clips each, unreliable): mother/send, mother/yes, me/yes, me/rest, help/money, give/money.
- The only defensible statement: on this small set the features carry signal well above chance for my own signing; no per-sign or general accuracy claim.
- Live-loop numbers (FPS, detect ms, classify ms, sign latency, live accuracy): NONE measured yet. The debug panel shows them; record them from my machine before quoting any.
- Meta dashboard (7d, seen 2 Nov): 421 requests, 9.4M input, 594.1k output tokens, spend KSh 0.00 (source of requests not recorded; check Billing).
- List prices per 1M tokens (secondary sources; VERIFY): muse-wonder-1.0 $4 in / $0.20 cached / $20 out; muse-spark-1.3 $1.25 in / $0.15 cached / $4.25 out.

## Known problems
- Model trained on 33 clips from 3 same-day sessions: live recognition is likely to be unreliable and sensitive to distance/lighting/hand. The demo must not overstate; consider showing the recognized sign for confirmation.
- Train/live mismatch: every training clip is ONE isolated sign with hands entering and leaving view; the model never saw continuous signing with hands staying in view, or sliding windows cutting a sign in half. Expect partial-sign mislabels; the vote + confidence threshold only reduces this. `segment` mode may work better; compare both on real signing.
- Utterance end needs hands OUT of view for 1.5 s; hands held in view (even idle) never end it.
- Single signer; sessions are not independent people. Sessions barely differed (same day).
- me/rest confusion: a static sign vs idle hands; rest class has 3 clips only. Resampling to 8 steps may blur fast motion.
- Handedness labels on unmirrored video may be swapped relative to the real hand; harmless if consistent (same hand every time).
- Replaying training clips looks better than reality (model has seen them); do not present it as live accuracy.
- Meta call, `reasoning` parameter, JSON compliance, Kiswahili quality: unverified.
- Proxy rate limit and cache are in-memory per warm instance; backstop is the Meta Spend Limit.
- Deadline: my own Nov 4, 8:00 PM Nairobi; official Nov 4 9:00 PM ET = Nov 5 05:00 Nairobi.
- No Deaf signer review. Vocabulary has no numerals.
- Meta AI tooling (25%) is the weakest rubric area: model only does the sentence step. Possible strengthening (not committed): clarifying question for ambiguous sequences, bilingual output.

## Next phase needs from me
1. Copy the Phase 3 files into the repo (`public/index.html` overwrites the placeholder, `public/app.js`, `public/shared/live.js`, `tests/live.test.js`), run `node --test tests/live.test.js` (expect 13/13). (`npm run test:parity` already reported `# fail 0`.)
2. Serve `public/` over localhost (e.g. `npx serve public` or `python3 -m http.server -d public`), open `index.html` in the same browser/camera/hand/distance as recording. Try both modes with your 10 signs plus an utterance (e.g. ME, SEND, MONEY, MOTHER, hands down 1.5 s). Send me: the debug panel numbers (FPS, detect ms, classify ms, sign latency), what was recognised vs what you signed, and any console errors.
3. Record a live stream of a clean utterance with `Record live stream for replay`, download it, save as `public/demo/replay.json`; test `Replay recorded sequence`.
4. Run `git status` (no .env, .venv, data/raw), commit and push Phase 2 + 3 files.
5. Run `npm run test:meta` with the real key (hide key); check Meta Billing for remaining credits.
6. Attach to the Phase 4 prompt: this file, `public/app.js`, `public/index.html`, `public/shared/{live,classifier,features,vocab}.js`, `api/interpret.js` and `api/_lib/*`, plus your debug-panel results.
7. Later: deploy to Vercel, set env vars and a Meta Spend Limit, fill README "AI assistance" line truthfully, submit with the list labelled "reference-matched, not community-validated; performed by a hearing student".

## Reference
- Deadlines: submissions Nov 4 9 PM ET. Judging Nov 5-8. Closing Nov 9. Community vote result Nov 16. Office hours weekdays 10-11 AM ET (6-7 PM Nairobi), Discord text only.
- Rubric: Impact 30, Meta AI tooling 25, Technical depth 20, Demo 25. Stage 1 pass/fail: fits theme and reasonably uses Meta Model API / open weights.
- Rules: public repo; demo shows only what was built during the hackathon; 3-minute video; no rights-violating assets; avoid listed anti-projects (medical advice, basic RAG, etc.).
- Meta API: base `https://api.meta.ai/v1`; Responses API; OpenAI SDK with explicit `api_key`; `output_text`. Avoid `muse-spark-1.3-contributor`.
- Submission form: team name, track, problem statement, optional X link, description, public repo, 3-min YouTube video, use of Meta products, why Meta models matter, partner feedback (optional), opinion questions, marketing-consent checkbox (my decision), Muse Code questions (only if used), obstacle/comparison/switching/production blockers. Answer from real experience.
- May claim now: proxy, repo skeleton, clip recorder, feature pipeline, training/export/parity code, a small own-signing dataset (33 clips) recorded during the hackathon, and a live-loop engine with unit tests (logic only). Must not claim: working recognition accuracy, KSL correctness, community validation, Kiswahili quality, any number not measured.
- Plan: Phase 4 = proxy wiring + TTS + scenario UI + testing + backup video + README + submission, well before 8 PM Nairobi Nov 4.

## Phase 3 results (my own runs, 4 Nov 2026)
- Live loop ran in my browser: camera, skeleton overlay, debug panel, thresholds, replay all load. Debug panel: about 15.4 FPS, detect 89.4 ms, classify 0.20 ms (one machine, one session).
- Window mode, live, ME / SEND / MONEY / MOTHER: all recognised after some tries. SEND and NO were first read as YES several times, then recognised.
- Saved live-recorded replay public/demo/replay.json (23.4 s, my own signing, landmarks only). Offline, the engine recognised all four signs in both window and segment mode. Four separate one-sign utterances because my pauses were over 2 s.
- Bug fixed: element id "dbg" clashed with MediaPipe's internal variable; renamed to "debugbox".
- test:parity: # fail 0 (reported earlier). test:meta result: test:meta.
- Still true: one hearing signer, 33 training clips, signs unverified. No accuracy claim.
