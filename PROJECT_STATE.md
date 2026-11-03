# PROJECT_STATE
Last updated: Tue 3 Nov 2026, Nairobi (end of Phase 2: real data recorded, model trained and exported; NOT retrained, by decision)
Working style: concept first (max 10 lines), then build everything without more questions, end each phase with Built / Not built / Needs my action, then update this file. Don't overstate anything.

## Done (built and working)
- GitHub repo public. Meta Model API account, key and $150 credits claimed.
- Phase 1 written deliverables exist as text drafts (theme decision, verification sheet, demo dialogue, README scope paragraph, outreach message). Not all are in the repo.
- `docs/ksl-sign-list.md` in repo: 10 labels, entry URLs, motion notes in my own words. All signs Unverified.
- Phase 1 code pushed: proxy `api/interpret.js` + `api/_lib/*`, scripts, placeholder `public/index.html`, README stub. `npm test` 10/10 (sandbox, fake key; re-run on my machine after merge: reported OK).
- Phase 2 merged into my repo and pushed. Vocabulary reconciled: `public/shared/vocab.js` exports `VOCAB` (string array, used by proxy) and `VOCAB_INFO` (details, used by collector/trainer); `fallback.js`, its test and the `meta.js` example use the real 10 tokens.
- Data collection page `public/collect.html` + `public/collect.js` (v2: camera frame drawn on canvas, hand/pose check line, hands-free mode with countdown and auto-stop, empty edge frames trimmed). Works in my browser (reported by me): camera, MediaPipe models, saving clips, download.
- Real data recorded: 3 sessions (s-20261103-1546, -1635, -1649), same day, 1 clip per class per session = 33 clips, 11 classes (10 signs + rest). Session JSONs are in `data/raw/` (gitignored) and backed up on my Desktop.
- Trained with `training/train.py` on those 33 clips; exported `public/models/ksl-linear.json` (214 KB, logistic regression fit on all 33 clips) and `tests/fixtures/parity.json` (26 items).

## Built but untested
- `npm run test:parity` on the REAL model/fixtures: passed 27/27, fail 0 (3 Nov, my machine). Python and JS agree on real clips.
- Phase 2 files may not all be committed yet (model, fixtures, reports): check `git status`.
- Nothing in Phase 3 exists.

## NOT built
- Live camera classification loop, windowing + smoothing + pause-based utterance detection, text-to-speech, scenario UI, wiring classifier to proxy, demo video, submission text.
- Any real Meta API call from my code (`npm run test:meta` not yet run/reported); Vercel deployment; Deaf-signer validation; Kiswahili quality check.

## Decisions (vocabulary, model ids, thresholds, theme)
- Track: Indie (solo). Theme: Build for Your World. I must not claim to be Deaf or to have firsthand Deaf experience; the firsthand part is the Kenyan mobile-money setting.
- Scenario: Deaf customer at a mobile money agent; simulated transactions only; no medical content.
- Pipeline: browser, MediaPipe Hand Landmarker + Pose Landmarker (lite) JS -> clip of frames -> normalization -> 8-step resample -> 784-number vector -> logistic regression (JSON weights, run in JS) -> smoothing + pause-based utterance detection -> proxy -> Muse Spark -> text + TTS. Fallback labelled as fallback.
- Feature recipe v1 (`FEATURE_VERSION = 1`): per hand wrist-translate, palm-scale, x times aspect, left-labelled hands mirrored; wrist location relative to shoulder midpoint, nose, mouth in shoulder-width units; hand slots by MediaPipe label from UNMIRRORED video (highest score per label); nearest-frame resample to T=8. Same dominant hand and same camera every session. Recorded clips are trimmed to the span where hands are visible (sign classes), so live inference should segment the same way.
- Classes: 10 signs + `rest`. Evaluation: leave-one-session-out; logreg (C=1, standardized), kNN k=5, random forest 300; hyperparameters fixed.
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
- Latency / tokens from my code: none. Meta dashboard (7d, seen 2 Nov): 421 requests, 9.4M input, 594.1k output tokens, spend KSh 0.00 (source of requests not recorded; check Billing).
- List prices per 1M tokens (secondary sources; VERIFY): muse-wonder-1.0 $4 in / $0.20 cached / $20 out; muse-spark-1.3 $1.25 in / $0.15 cached / $4.25 out.

## Known problems
- Model trained on 33 clips from 3 same-day sessions: live recognition is likely to be unreliable and sensitive to distance/lighting/hand. The demo must not overstate; consider showing the recognized sign for confirmation.
- Single signer; sessions are not independent people. Sessions barely differed (same day).
- me/rest confusion: a static sign vs idle hands; rest class has 3 clips only. Resampling to 8 steps may blur fast motion.
- Handedness labels on unmirrored video may be swapped relative to the real hand; harmless if consistent (same hand every time).
- Meta call, `reasoning` parameter, JSON compliance, Kiswahili quality: unverified.
- Proxy rate limit and cache are in-memory per warm instance; backstop is the Meta Spend Limit.
- Deadline: my own Nov 4, 8:00 PM Nairobi; official Nov 4 9:00 PM ET = Nov 5 05:00 Nairobi.
- No Deaf signer review. Vocabulary has no numerals.
- Meta AI tooling (25%) is the weakest rubric area: model only does the sentence step. Possible Phase 3 strengthening (not committed): clarifying question for ambiguous sequences, bilingual output.

## Next phase needs from me
1. Run `npm run test:parity` on the real model; confirm `# fail 0`.
2. Commit and push Phase 2 outputs (`public/models`, `tests/fixtures`, `training/reports`, `public/collect.js`) after `git status` shows no .env, .venv, data/raw.
3. Run `npm run test:meta` with the real key (hide key) and send the output; check Meta Billing for remaining credits.
4. Attach to the Phase 3 prompt: this file, `public/shared/{features,classifier,vocab}.js`, `public/models/ksl-linear.json`, `public/collect.html`, `public/collect.js`.
5. Decide coding tool; later: deploy to Vercel, set env vars and a Meta Spend Limit, fill README "AI assistance" line truthfully, submit with the list labelled "reference-matched, not community-validated; performed by a hearing student".

## Reference
- Deadlines: submissions Nov 4 9 PM ET. Judging Nov 5-8. Closing Nov 9. Community vote result Nov 16. Office hours weekdays 10-11 AM ET (6-7 PM Nairobi), Discord text only.
- Rubric: Impact 30, Meta AI tooling 25, Technical depth 20, Demo 25. Stage 1 pass/fail: fits theme and reasonably uses Meta Model API / open weights.
- Rules: public repo; demo shows only what was built during the hackathon; 3-minute video; no rights-violating assets; avoid listed anti-projects (medical advice, basic RAG, etc.).
- Meta API: base `https://api.meta.ai/v1`; Responses API; OpenAI SDK with explicit `api_key`; `output_text`. Avoid `muse-spark-1.3-contributor`.
- Submission form: team name, track, problem statement, optional X link, description, public repo, 3-min YouTube video, use of Meta products, why Meta models matter, partner feedback (optional), opinion questions, marketing-consent checkbox (my decision), Muse Code questions (only if used), obstacle/comparison/switching/production blockers. Answer from real experience.
- May claim now: proxy, repo skeleton, clip recorder, feature pipeline, training/export/parity code, and a small own-signing dataset (33 clips) recorded during the hackathon. Must not claim: working recognition accuracy, KSL correctness, community validation, Kiswahili quality, any number not measured.
- Plan: Phase 3 live loop (windowing + smoothing + utterance detection) + proxy + TTS + UI; Phase 4 testing, backup video, README, submission well before 8 PM Nairobi Nov 4.