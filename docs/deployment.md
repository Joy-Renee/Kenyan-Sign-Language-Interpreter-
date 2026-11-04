# Deployment checklist (Phase 5)

Primary target: **Vercel** (repo already has `api/` functions + `public/` static, `vercel.json` sets `outputDirectory: "public"`). Cloudflare alternative is noted at the end — it needs an adapter, the proxy code is not Cloudflare-native.

## Rate-limit setting (so judges can't drain credits) — set these in Vercel

| Variable | Recommended | Why |
|---|---|---|
| `RATE_LIMIT_PER_MIN` | `10` | Per-IP per-minute cap in `api/understand.js` (in-memory, per warm instance). A judge signing/demo-clicking needs only a few calls/min. |
| `DAILY_MODEL_CALL_CAP` | `300` | Per-instance daily cap on *actual model calls* (retries count, cache hits don't). Eval measured ~1,070 tokens/utterance incl. retries; 300 calls ≈ a few hundred K tokens — small against the $150 credit, and the fallback keeps the demo alive past the cap. |
| `ALLOWED_ORIGINS` | your exact Vercel URL(s), comma-separated | Proxy returns CORS headers only for these. The app itself is same-origin, so this mainly blocks casual cross-site reuse of your endpoint. |
| `LOG_SALT` | any long random string | Hashes client IPs in logs. |
| `MODEL_API_KEY` | Meta Model API key | Server-side only; never in `public/`. |

**Hard backstop (do this too):** in Meta Billing, set a **Spend Limit** well below your credit (e.g. $20). The in-code limits are per warm serverless instance, not global — the Spend Limit is the only absolute cap.

Extra protection already in code: proxy only accepts the 10 known sign tokens (can't be used as a general LLM), responses are cached by sign sequence, ambiguous input returns one clarifying question, and past the daily cap / on any API failure the app shows **FALLBACK MODE** and keeps working with rules.

## Vercel steps

1. Import the public GitHub repo into Vercel (root = repo root; `vercel.json` handles the rest). Framework preset: Other.
2. Project Settings → Environment Variables (Production): `MODEL_API_KEY`, `ALLOWED_ORIGINS=https://<your-app>.vercel.app`, `RATE_LIMIT_PER_MIN=10`, `DAILY_MODEL_CALL_CAP=300`, `LOG_SALT=<random>`. Optionally `META_MODEL=muse-spark-1.3`.
3. Set the Meta Billing Spend Limit (above).
4. Deploy, then test the live URL (below). Camera needs HTTPS — Vercel provides it.
5. Re-run tests after deploy config changes: `npm test`, `node --test tests/live.test.js tests/flow.test.js tests/speech.test.js`.

## Test the live URL (tick each)

- [ ] Page loads on phone width and desktop; no horizontal scroll.
- [ ] Camera path: sign `ME SEND MONEY MOTHER`, lower hands ~1.5 s → caption appears → sign `YES` (or Confirm button) → spoken → SIMULATED draft → agent types amount + `07…` phone → Set → sign YES → status `created`.
- [ ] Language toggle: switch to Kiswahili → caption shows Kiswahili large; Confirm speaks Kiswahili if a Swahili voice exists, otherwise English voice + the “No Kiswahili voice…” notice.
- [ ] “Try without camera”: Replay button runs the recorded-landmark sequence; each gloss-demo button produces a caption (labelled demo mode).
- [ ] Fallback: temporarily break the endpoint (e.g. deploy preview without `MODEL_API_KEY`) → orange FALLBACK MODE badge, app still completes the flow.
- [ ] Token counter increments on model calls, shows 0 added tokens on cached repeats.
- [ ] Rate limit: 11 rapid gloss-demo calls from one IP → 429 handled as fallback, not a crash. (Note: per-instance, so this may need repeated tries on Vercel.)
- [ ] `SIMULATED: no real money moves` is visible on the transaction card throughout.

## Cloudflare alternative (not wired — only do this if Vercel is blocked)

The pages in `public/` deploy as-is to Cloudflare Pages, but `api/*.js` are Vercel-style `(req, res)` handlers and will not run as Pages Functions/Workers without rewriting them to `fetch`-style handlers. Budget ~1 hour: port `api/understand.js` + `api/_lib/*`, move the same env vars and limits into Worker secrets/vars, keep the Meta Spend Limit. Don't claim it's deployed until the checklist above passes there.
