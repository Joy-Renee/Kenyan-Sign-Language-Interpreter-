# KSL Assistant

A prototype that helps a Deaf customer communicate with a mobile money agent in Kenya (simulated transactions only). The customer signs a small vocabulary to a camera; the app recognises the signs, a Meta model (Muse Spark) turns the sign sequence into a natural English or Kiswahili sentence, and the sentence is shown and read aloud.

Built for the **Meta Global AI Developer Hackathon** (Indie Developer track, solo). Theme: *Build for Your World*.

## Status: Phase 0 (skeleton only)

| Part | State |
|---|---|
| Serverless proxy to Meta Model API (rate limit, cache, usage/latency log, fallback) | written; unit-tested; live Meta call not yet verified |
| Browser camera app, hand-landmark capture, classifier, text-to-speech | **not built yet** |

This table is updated as work lands.

## Built during the hackathon

Everything in this repository was created during the hackathon (Oct 26 - Nov 4, 2026). The commit history is the record; nothing was backdated. Third-party libraries (MediaPipe, scikit-learn, the OpenAI-compatible SDK used to call Meta Model API, etc.) are dependencies, not my work.

AI assistance: [AUTHOR TO EDIT: state exactly which AI tools helped write code, e.g. Claude, and what you reviewed or tested yourself.]

## Scope and limits (please read)

- Recognises a **small vocabulary (about 10-12 signs)** in controlled conditions. It is **not** a Kenyan Sign Language translator and does not understand KSL grammar.
- Sign references have **not** been validated by a Deaf KSL signer unless this README says so later.
- Not a replacement for human interpreters. No real money is moved; no medical content.

## Architecture

```
Browser camera -> MediaPipe hand landmarks -> normalize -> classifier (weights as JSON)
  -> smoothing + pause-based utterance detection
  -> POST /api/interpret (serverless proxy, holds the API key)
       -> Meta Model API (Muse Spark)   [fallback: rule-based templates]
  -> sentence on screen + text-to-speech
```

The model is called once per completed utterance, never per frame. The proxy only accepts known sign tokens, rate-limits per IP, caches by sign sequence, caps daily model calls, and logs token usage and latency.

## Run locally

```bash
npm install
cp .env.example .env      # then put your MODEL_API_KEY in .env
npm test                  # unit tests, no network needed
npm run test:meta         # one real call to Meta Model API (uses a few hundred tokens)
npm run dev               # http://localhost:3000 (static page + /api/interpret)
npm run test:proxy        # in a second terminal
```

Deploy: import the repo into Vercel and set the variables from `.env.example` in Project Settings. Never commit `.env`.

## License

MIT, see `LICENSE`.
