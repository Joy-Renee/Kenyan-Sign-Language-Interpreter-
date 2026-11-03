# PROJECT_STATE
Last updated: Tue 3 Nov 2026, Nairobi (end of Phase 2: code merged into my repo copy, NO real data recorded yet)
Working style: concept first (max 10 lines), then build everything without more questions, end each phase with Built / Not built / Needs my action, then update this file. Don't overstate anything.

## Done (built and working)
- GitHub repo exists and is public. Meta Model API account, API key and $150 credits claimed.
- Phase 1 written deliverables exist as text drafts (theme decision, verification sheet, demo dialogue, README scope paragraph, outreach message). Not yet in the repo.
- `ksl-sign-list.md` filled: 10 labels, entry URLs (confirmed by me), motion notes in my own words. All signs Unverified. Must contain no copied dictionary text before it goes in the public repo (as docs/ksl-sign-list.md).
- Merged repo: `npm test` 10/10 pass after the vocab/fallback changes (sandbox, fake key). Phase 2 JS/Python feature code agree: `node --test tests/parity.test.mjs` passed 27/27 in the sandbox, but ONLY on synthetic fixtures (exercises single frame, no pose, no hands, duplicate hand label). Real-data parity not yet run.
- Nothing else is verified working with real signing.

## Built but untested
- Phase 1: serverless proxy (`api/interpret.js`), scripts, placeholder `public/index.html`, README stub, LICENSE, `.env.example`, `.gitignore`. Sandbox only (10/10 npm tests with fake key). NOT yet pushed.
- Phase 2 (sandbox, not yet in repo): `public/collect.html` + `public/collect.js` (clip recorder: hand + 5 pose points, IndexedDB, session JSON download; syntax-checked only, never run in a browser, CDN/model URLs unverified), `public/shared/features.js`, `public/shared/classifier.js`, `public/shared/vocab.js` (replaces the Phase 1 placeholder: reconcile with the proxy allowlist), `training/features.py`, `training/train.py`, `training/make_synthetic.py`, `training/requirements.txt`, `training/README.md`, `tests/parity.test.mjs`.
- train.py ran end to end on SYNTHETIC data only (4 fake sessions): logreg/kNN/RF, leave-one-session-out, confusion PNGs, most-confused pairs, JSON export, parity fixtures. Synthetic accuracy (1.00 easy case, ~0.91 with send/give forced identical) is NOT a result and must never be quoted.

## NOT built
- Real recorded data (data/raw is empty), real held-out accuracy, real confusion pairs, exported real model (`public/models/ksl-linear.json` does not exist yet).
- Live camera loop, smoothing + utterance detection, text-to-speech, scenario UI, wiring classifier to proxy, demo video, submission text.
- Any real Meta API call from my code; Vercel deployment; Deaf-signer validation; Kiswahili quality check.

## Decisions (vocabulary, model ids, thresholds, theme)
- Track: Indie (solo). Theme: Build for Your World. I must not claim to be Deaf or to have firsthand Deaf experience; the firsthand part is the Kenyan mobile-money setting and working with a signer (if one is found).
- Scenario: Deaf customer at a mobile money agent; simulated transactions only; no medical content.
- Pipeline (changed in Phase 2): browser, MediaPipe Hand Landmarker + Pose Landmarker (lite) JS -> CLIP of frames -> normalization -> 8-step resample -> 784-number vector -> logistic regression (scikit-learn, JSON weights, run in JS) -> smoothing + pause-based utterance detection -> proxy -> Muse Spark -> text + TTS. Fallback labelled as fallback.
- Phase 2 feature recipe (v1, `FEATURE_VERSION = 1`): per hand: wrist-translate, scale by wrist->middle-MCP distance, x multiplied by video aspect, left-labelled hands mirrored; location of wrist relative to shoulder midpoint, nose and mouth in shoulder-width units (fallback to image-centre coords if pose missing). Hand slots by MediaPipe label (Left/Right, from UNMIRRORED video; highest score kept if a label repeats). Clip resampled by nearest frame to T=8. Use the same dominant hand in every session.
- Classes: 10 signs + `rest` (hands down/idle). Evaluation: leave-one-session-out; models: logreg (C=1, standardized), kNN k=5, random forest 300; hyperparameters fixed, not tuned. The exported model is logreg fit on all sessions (so it has no independent test).
- Held-out accuracy must always be described as: one hearing signer, consistency across my own recording sessions, not KSL correctness, not other signers.
- Sentence model: `muse-spark-1.3` (reasoning effort `minimal`, max_output_tokens 300). One call per completed utterance, cached.
- Candidate vocabulary (10, UNVERIFIED): ME, MONEY, SEND, GIVE, HELP, MOTHER, HOW-MUCH, YES, NO, THANK-YOU. No numerals. English primary, Kiswahili secondary.
- KSL source: https://www.ksldictionary.com/dictionary. No signer verification, so every sign stays UNVERIFIED and the README must say so. Do not use dictionary videos/images as training data or demo assets; record my own samples.
- Hosting: Vercel (static `public/` + `api/`). Coding assistant for Phase 1+: undecided. Speech-to-text: not in core pipeline.

## URLs (repo, live app, proxy, video)
- Repo: https://github.com/Joy-Renee/Kenyan-Sign-Language-Interpreter-
- Live app / proxy: not deployed. Video: not recorded.
- KSL reference source: https://www.ksldictionary.com/dictionary (2015 copyright; not confirmed as endorsed by a Deaf organisation). Unchecked others: DEP Dictionary app; Akach (KNAD, 1991); Rothenborg-Jensen & Yego (2011).
- Candidate organisations to ask (contact details NOT found): KNAD; KSLIA; KSL Research Project, University of Nairobi.

## Numbers (held-out accuracy, eval table, latency, tokens)
- Held-out accuracy / eval table / latency: NONE with real data yet.
- Meta dashboard (7d, seen 2 Nov): 421 requests, 9.4M input tokens, 594.1k output tokens, spend KSh 0.00. Source of those requests not recorded; check Billing for credits remaining.
- List prices per 1M tokens (secondary sources; VERIFY): muse-wonder-1.0 $4 in / $0.20 cached / $20 out; muse-spark-1.3 $1.25 in / $0.15 cached / $4.25 out.

## Known problems
- collect.js never run in a real browser: camera, MediaPipe CDN/model URLs, GPU->CPU delegate fallback, Pose + Hand speed, IndexedDB all unverified. MediaPipe handedness labels on unmirrored video may be swapped relative to the real hand; harmless if consistent, but use the same hand throughout.
- Single signer: LOSO sessions are not independent people. Sessions must differ (lighting, distance, time) or the held-out number will be optimistic.
- Likely confusion pairs (untested): SEND/GIVE, MONEY/HOW_MUCH, closed-fist group YES/MOTHER/THANK_YOU/HELP/NO. 8-step resampling may blur fast motion. Rest class vs a sign start/end is untested.
- Meta call, `reasoning` parameter, JSON compliance, Kiswahili quality: unverified.
- Proxy rate limit and cache are in-memory per warm instance (best effort); backstop is the Meta Spend Limit.
- Deadline: my own Nov 4, 8:00 PM Nairobi (about 1 day left); official Nov 4 9:00 PM ET = Nov 5 05:00 Nairobi.
- No Deaf signer review. Vocabulary has no numerals.
- Meta AI tooling (25%) is the weakest rubric area: model only does the sentence step. Possible Phase 3 strengthening (not committed): clarifying question for ambiguous sequences, bilingual output.

## Next phase needs from me
1. Copy the contents of `ksl-repo-merged.zip` (folder `merged/`) over my local repo clone. It already reconciles `vocab.js` (VOCAB stays a string array for the proxy; new VOCAB_INFO for the collector/trainer), swaps placeholder tokens (thanks/you/withdraw/deposit) for the real 10 in `fallback.js`, its test and the `meta.js` example, and adds npm scripts + `.gitignore` line. Then add `docs/ksl-sign-list.md` (no copied dictionary text). `data/raw/` stays gitignored (my existing choice): back up recordings myself; commit the exported model + parity fixture.
2. Serve `public/` on localhost, open `/collect.html`, record 3+ sessions (about 12 clips per class per session incl. rest), download each JSON into `data/raw/`.
3. `pip install -r training/requirements.txt`, `python training/train.py`, `node --test tests/parity.test.mjs`; send me report.md, the confusion PNG and the terminal output (real numbers only).
4. Decide coding tool and check Meta Billing credits; run `npm install`, `npm test`, `npm run test:meta`; push repo; deploy to Vercel; set Spend Limit.
5. Fill README "AI assistance" line truthfully; submit with the list labelled "reference-matched, not community-validated; performed by a hearing student".

## Reference
- Deadlines: submissions Nov 4 9 PM ET. Judging Nov 5-8. Closing Nov 9. Community vote result Nov 16. Office hours weekdays 10-11 AM ET (6-7 PM Nairobi), Discord text only.
- Rubric: Impact 30, Meta AI tooling 25, Technical depth 20, Demo 25. Stage 1 pass/fail: fits theme and reasonably uses Meta Model API / open weights.
- Rules: public repo; demo shows only what was built during the hackathon; 3-minute video; no rights-violating assets; avoid listed anti-projects (medical advice, basic RAG, etc.).
- Meta API: base `https://api.meta.ai/v1`; Responses API; OpenAI SDK with explicit `api_key`; `output_text`. Avoid `muse-spark-1.3-contributor`.
- Submission form: team name, track, problem statement, optional X link, description, public repo, 3-min YouTube video, use of Meta products, why Meta models matter, partner feedback (optional), opinion questions, marketing-consent checkbox (my decision), Muse Code questions (only if used), obstacle/comparison/switching/production blockers. Answer from real experience.
- May claim now: proxy, repo skeleton, clip-recorder, feature pipeline and training/export/parity code written during the hackathon. Must not claim: working recognition, KSL accuracy, community validation, Kiswahili quality, any number not measured on real data.
- Plan: Phase 3 live loop (windowing + smoothing + utterance detection) + proxy + TTS + UI; Phase 4 testing, backup video, README, submission well before 8 PM Nairobi Nov 4.
