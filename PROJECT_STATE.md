# PROJECT_STATE
Last updated: Wed 4 Nov 2026, Nairobi (end of Phase 5: single-page UI, bilingual TTS, try-without-camera demo, deployment checklist written; NOT browser-tested by me yet, NOT deployed; model NOT retrained, by decision)
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

## Phase 4 code (written 4 Nov; sandbox-tested without network, then run by me locally: see Phase 4 results)
- (a) `api/_lib/understand.js` + `api/understand.js` (NEW endpoint; old `api/interpret.js` untouched): fixed prompt + 4 few-shot examples, strict JSON {intent, english, kiswahili, missing_info, clarifying_question, confidence}, validated by `parseInterpretation` (appended to `api/_lib/validate.js`), 1 retry then rule fallback, cache by sign sequence, daily cap counted per model call, JSON log line with usage. `max_output_tokens` raised to 600. Unclear input must return intent `unclear` + a question (validator rejects otherwise).
- (b) `public/shared/flow.js`: nothing is spoken until the customer signs YES; NO cancels; a lone YES/NO while something waits is a control signal (no model call). Bare YES/NO with nothing pending is treated as a normal utterance that itself needs confirmation.
- (c) Simulated transaction in `flow.js`: draft after YES on send_money; AGENT TYPES amount and phone (vocabulary has no numerals); customer must sign YES on the final text before status = created. UI shows "SIMULATED: no real money moves". NO tool calling is used: JSON only, transaction logic is deterministic code.
- (d) `public/shared/intent.js` rule fallback (also the eval baseline); badge "FALLBACK MODE" + reason; latency/tokens shown in the UI and logged server-side.
- Wiring: `public/assistant.js` + 3-line patch in `public/app.js` (import, create, `onUtterance` calls it). Browser behaviour untested; TTS is English only via speechSynthesis.
- (e) `scripts/eval.mjs` (`npm run eval` needs the script added to package.json): 30 sequences, writes `eval/results-table.md`, `eval/results.json`, `eval/kiswahili-rating.md`. Gold labels and the baseline were written by the same AI author: baseline accuracy is NOT evidence of generalisation. Few-shot examples are disjoint from the eval sequences.
- Tests: `node --test tests/flow.test.js` 5/5 in sandbox (validator, baseline, confirm flow, txn flow). No test touches the network.
- Kiswahili strings in `intent.js`/prompt were written by the assistant, unreviewed.
- demo-dialogue.md was rewritten for the YES-confirmation flow (utterance -> YES -> spoken; amount/phone typed by the agent; final YES).

## Phase 5 code (written 4 Nov; not yet run by me in a browser; not deployed)
- Single-page responsive UI (`public/index.html` rewritten, Phase 3 IDs kept): header + EN/Kiswahili toggle, camera panel with badge, large current-sign + large caption, sequence chips, Confirm/Cancel buttons (same path as sign YES/NO), SIMULATED transaction card (`SIMULATED: no real money moves`), FALLBACK MODE / Muse Spark badge, small session token counter (tokens + model/fallback call counts), recent utterances, debug/thresholds collapsed at the bottom. Phone-width stacks to one column.
- `public/assistant.js` rewritten: renders into `#assistantMount`, caption shows the selected language large and the other small, agent amount/phone entry + Cancel transaction, clarifying questions, latency/tokens per call. Proxy request now also sends `lang` (proxy already returns both languages; no proxy contract change).
- TTS: `public/shared/speech.js` — `selectVoice`/`planSpeech` (pure logic, unit tests written in `tests/speech.test.js`, not yet run) + `speakText`. Kiswahili with no Swahili voice: speaks the English sentence instead of mangling Kiswahili with an English voice, and the UI shows "No Kiswahili voice on this device…". No speechSynthesis at all: caption-only notice. `public/shared/i18n.js` holds EN/SW UI strings (Kiswahili unreviewed, same caveat as before).
- "Try without camera": Replay (recorded landmarks through the real classifier, as Phase 3) plus gloss-demo buttons from `public/demo/sequences.js` (5 recorded gloss sequences from the demo dialogue) sent straight to the sentence step. Both labelled in-app as demo mode; gloss buttons explicitly do not test recognition.
- `scripts/dev-server.mjs` now also mounts `/api/understand` (local `npm run dev` previously only served `/api/interpret`).
- `vercel.json` added (`outputDirectory: public`, 15 s function cap, nosniff/no-referrer headers). `docs/deployment.md`: Vercel checklist, test-the-live-URL checklist, Cloudflare note (Pages static OK; `api/` handlers need a fetch-style rewrite — not done). Recommended credit guards: `RATE_LIMIT_PER_MIN=10`, `DAILY_MODEL_CALL_CAP=300`, plus a Meta Billing Spend Limit as the only hard cap.
- Tests: new `tests/speech.test.js` (voice selection, Kiswahili fallback plan, demo sequences use only vocab tokens); added to `npm test`. In-session verification this phase: shell was unavailable to the assistant; reported by me on my machine (4 Nov): `node --check public/app.js && node --check public/assistant.js && npm test && node --test tests/flow.test.js tests/live.test.js` -> 18 tests passed. Browser click-through not yet done.

## NOT built
- (f) stretch: agent speech -> Muse Voice Transcribe -> rewrite. Not started.
- Still missing: Vercel deploy (only localhost:3000 works), 3-min video, README eval table, submission text.
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
0. (Superseded: Phase 4 is done, see "Phase 5 needs from me" at the end.)
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
- test:parity: # fail 0 (reported earlier). test:meta (my run, 4 Nov): OK. Call 1 muse-spark-1.3 6396 ms, 270 tokens (237 reasoning) for a trivial question. Call 2 (sentence prompt, effort minimal) 3234 ms, valid JSON, 408 tokens (118 reasoning). Reasoning tokens stay high even at "minimal"; one call is about 3 s.
- Still true: one hearing signer, 33 training clips, signs unverified. No accuracy claim.

## Phase 4 results (my own runs, 4 Nov 2026)
- Reported by me: all Phase 4 steps worked locally at http://localhost:3000 with `vercel dev` (live utterance -> Muse Spark sentence -> sign YES -> spoken -> SIMULATED draft -> agent types amount/phone -> YES -> created; stopping the proxy showed FALLBACK MODE). Console errors: [FILL: none / paste].
- `node --test tests/flow.test.js`: [5 pass, 0 fails]. `npm test`: [10 pass, 0 fails].
- `npm run eval` (30 sequences, one run): [Eval: 30 fixed sign sequences, model muse-spark-1.3, one run, effort minimal.

| Metric | Rule-based baseline | Muse Spark (via same code as proxy) |
|---|---|---|
| Valid JSON, first try | n/a (no model) | 53% (16/30) |
| Valid JSON, after 1 retry | n/a | 67% (20/30) |
| Intent accuracy | 100% (30/30) | 63% (19/30) (model answers only) |
| Intent accuracy, end to end with fallback | 100% (30/30) | 97% (29/30) |
| Asked a question on 7 unclear sequences | 100% (7/7) | 71% (5/7) |
| Latency per utterance (mean / median / p95) | <1 ms | 4654 / 3989 / 7786 ms |
| Tokens per utterance (input / output / total, incl. retries) | 0 | 661 / 408 / 1070 |

Caveats: gold labels and the baseline were written by the same author (an AI assistant), so the baseline is tuned to this set and its accuracy is not evidence it generalises. One run; model output varies. Sign sequences are idealised, not recognizer output.
]. Gold labels were written by an AI assistant; reviewed by me: [yes]. Baseline and gold share an author, so baseline accuracy does not show generalisation.
- Live badge numbers (one machine, one session): latency [4499] ms, tokens [675] per call.
- Kiswahili self-rating (me, not a validated review): average [13] over [14] sentences. Not reviewed by a Deaf user or a second Kiswahili speaker.
- Not deployed: no public URL; localhost only. Video not recorded. (f) not built.

## After Phase 5 — needs from me
1. Run locally: `node --check public/app.js public/assistant.js`, `npm test`, `node --test tests/flow.test.js tests/live.test.js` — paste any failures back. Then `vercel dev` (or `npm run dev`) and click through: language toggle both ways, Confirm/Cancel buttons, gloss-demo buttons, Replay, Kiswahili toggle with/without a Swahili voice (note which notice shows).
2. Fill the [FILL] verification lines (Phase 4 above and Phase 5), then zip the repo (this file is inside the zip; no separate copy needed).
3. Deploy to Vercel per `docs/deployment.md`: set MODEL_API_KEY, ALLOWED_ORIGINS (exact live URL), RATE_LIMIT_PER_MIN=10, DAILY_MODEL_CALL_CAP=300, LOG_SALT; set a Meta Spend Limit; run the test-the-live-URL checklist on the public URL.
4. Record the video from demo-dialogue.md after 3 live runs of each step; keep a backup recording.
5. README: scope paragraph, eval table (caveats included), AI-assistance line, "reference-matched, not community-validated; performed by a hearing student".
6. Submission form text; submit well before 8 PM Nairobi.