# PROJECT_STATE
Last updated: Mon 2 Nov 2026, Nairobi (end of Phase 0 + Claude Code question)
Working style: concept first (max 10 lines), then build everything without more questions, end each phase with Built / Not built / Needs my action, then update this file. Don't overstate anything.

## Done (built and working)
- GitHub repo exists and is public. Meta Model API account, API key and $150 credits claimed.
- Nothing else is verified working yet.

## Built but untested
- Serverless proxy (`api/interpret.js`): token allowlist, per-IP rate limit, cache by sign sequence, daily call cap, token/latency log, rule-based fallback. Sandbox only: `npm test` 10/10 pass; dev server run with a fake key showed fallback, 400, 429, 405 paths working.
- `scripts/test-meta-call.mjs`, `scripts/test-proxy.mjs`, `scripts/dev-server.mjs`; placeholder `public/index.html`; README stub; LICENSE; `.env.example`; `.gitignore`.
- NOT yet pushed to GitHub (repo currently holds only the empty PROJECT_STATE template).

## NOT built
- Camera app, MediaPipe capture, data collection page, landmark normalization, classifier, in-browser inference, smoothing + utterance detection, text-to-speech, scenario UI, demo video, submission text.
- Any real Meta API call from my code; Vercel deployment; Deaf-signer validation; Kiswahili quality check.

## Decisions (vocabulary, model ids, thresholds, theme)
- Track: Indie (solo). Theme: Build for Your World (revisit in Phase 1 if needed).
- Scenario: Deaf customer at a mobile money agent; simulated transactions only; no medical content.
- Pipeline: browser, MediaPipe Hand Landmarker JS -> normalized landmarks -> logistic regression (scikit-learn, weights exported to JSON, run in JS) -> smoothing + pause-based utterance detection -> proxy -> Muse Spark -> text + TTS. Fallback labelled as fallback.
- Sentence model: `muse-spark-1.3` (reasoning effort `minimal`, max_output_tokens 300). One call per completed utterance, cached.
- Vocabulary: 10-12 handshape signs; English primary, Kiswahili secondary. Current list in `public/shared/vocab.js` is a PLACEHOLDER, not verified KSL. Final list: Phase 1.
- Hosting: Vercel (static `public/` + `api/` in one project).
- Coding assistant for Phase 1+: undecided (see "Next phase needs from me").
- Speech-to-text: not in core pipeline; model id unknown (not in pasted docs).

## URLs (repo, live app, proxy, video)
- Repo: https://github.com/Joy-Renee/Kenyan-Sign-Language-Interpreter-
- Live app / proxy: not deployed. Video: not recorded.

## Numbers (held-out accuracy, eval table, latency, tokens)
- Held-out accuracy / eval table / latency: none yet.
- Meta dashboard (7d, seen 2 Nov): 421 requests, 9.4M input tokens, 594.1k output tokens, spend KSh 0.00. Source of those requests is not recorded here; check Billing for credits remaining.
- List prices per 1M tokens (secondary sources citing dev.meta.ai/docs/pricing-rate-limits; VERIFY): muse-wonder-1.0 $4 in / $0.20 cached / $20 out; muse-spark-1.3 $1.25 in / $0.15 cached / $4.25 out.

## Known problems
- Meta call, `reasoning` parameter, JSON compliance, Kiswahili quality: all unverified.
- Proxy rate limit and cache are in-memory per warm serverless instance (best effort). Backstop is the Meta Spend Limit.
- Only ~2.5 days to my own deadline (Nov 4, 8:00 PM Nairobi); official deadline Nov 4, 9:00 PM ET = Nov 5, 05:00 Nairobi.
- No verified KSL sign source or Deaf signer yet (biggest risk).

## Next phase needs from me
1. Decide: use Claude Code pointed at Meta Model API (Muse Wonder) for building, or code by hand / another tool. Check Billing for remaining credits first.
2. Run `npm install`, `npm test`, `npm run test:meta` locally and send me the output (key hidden).
3. Push the repo (clone-first method), deploy to Vercel, set env vars, set a Meta Spend Limit notification.
4. Fill README "AI assistance" line truthfully (name each tool used).
5. Find verified KSL sign sources and a signer.

## Reference
- Deadlines: submissions Nov 4 9 PM ET (EST). Judging Nov 5-8. Closing Nov 9. Community vote result Nov 16. Office hours weekdays 10-11 AM ET (6-7 PM Nairobi), Discord text only.
- Rubric: Impact 30, Meta AI tooling 25, Technical depth 20, Demo 25. Stage 1 pass/fail: fits theme and reasonably uses Meta Model API / open weights.
- Rules: public repo; demo shows only what was built during the hackathon; 3-minute video; no rights-violating assets; avoid listed anti-projects (medical advice, basic RAG, etc.).
- Meta API: base `https://api.meta.ai/v1`; Responses API; OpenAI SDK with explicit `api_key`; `output_text`. Anthropic-format Messages endpoint exists (used by Claude Code). Avoid `muse-spark-1.3-contributor` (Meta may train on content). Tool calling / structured output listed as supported; syntax not yet read.
- Credit strategy: model only for the sentence step; cache; fallback; Spend Limit; keep a reserve for demo day and the backup video.
- Submission form fields: team name, track, problem statement, optional X link, description, public repo, 3-min YouTube video, use of Meta products, why Meta models matter, partner feedback (optional), likelihood/opinion/recommend questions, marketing-consent checkbox (my decision), Muse Code questions (only if I used Muse Code), obstacle, comparison, switching, production blockers. Answer from real experience.
- May claim now: proxy and repo skeleton written during the hackathon. Must not claim: working recognition, KSL accuracy, community validation, Kiswahili quality, any numbers not measured.
- Plan (proposed): Phase 1 vocab lock + data collection + normalization; Phase 2 train/export/in-browser inference; Phase 3 live loop + proxy + TTS + UI; Phase 4 testing, backup video, README, submission well before 8 PM Nairobi Nov 4.
