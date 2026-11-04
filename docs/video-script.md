# 2:50 demo video — script and shot list

Target **2:50**, hard limit 3:00. One performer (you, playing both roles — say so). Simulated transaction only; fake amount and number on screen. Captions on everything (plan at the end).

Rules kept: only features in this repo; no recognition-accuracy claim; signs called "reference-matched, not community-validated; performed by a hearing student" if described at all.

## Before you record (do all of this first)

1. Use the exact demo setup you will describe: live URL `https://kenyan-sign-language-interpreter.vercel.app/`, browser zoom 100%, debug panel closed, same camera/light/distance as your practice runs. Reload the page once so the token counter and history start clean.
2. Run the full dialogue live **3 times**. Record only if all 3 complete; if a step fails in practice, cut that step now, not on camera.
3. Dummy data ready to paste/type: amount `500`, phone `0712345678` (fake).
4. Record the backups **before** the main take (see "Backup recording plan"). Set phone/OBS aside; do not spend main-take time on them.
5. Sound: quiet room, system volume up so app speech is audible in the recording; turn off notifications.

## Shot list (single continuous demo take — no edits inside 0:25–1:45)

| Time | Visual | Action | Audio |
|---|---|---|---|
| 0:00–0:25 | You to camera (or app behind you) | Read V1 | Voice-over V1 |
| 0:25–1:45 | **Uncut:** app full screen, camera panel + caption + SIMULATED card visible the whole time | Demo steps D1–D6 below | **No narration.** App speech only |
| 1:45–1:50 | GitHub repo → commit history, slow scroll | Show Phase 1→5 commits (3–5 s, no clicking into files) | V2 starts over this |
| 1:50–2:20 | One slide: "How Meta models are used + eval" (text below) | Hold slide | V2 continues |
| 2:20–2:45 | You to camera | Read V3 | Voice-over V3 |
| 2:45–2:50 | App + live URL on screen | Read V4, end card: live URL + repo URL | Voice-over V4 |

### Demo steps D1–D6 (internal checkpoints — if you pass a checkpoint >5 s late, drop D4)

| Checkpoint | Step |
|---|---|
| 0:25–0:38 | **D1** Sign ME, SEND, MONEY, MOTHER. Hands down ~2 s. Caption appears (Muse Spark badge visible). |
| 0:38–0:42 | **D2** Sign YES. Sentence is spoken. SIMULATED draft card appears. |
| 0:42–0:57 | **D3** (as agent) type `500` and `0712345678`, click Set. Final text appears. Sign YES → status **created**, final sentence spoken. |
| 0:57–1:14 | **D4** Sign HOW-MUCH → hands down → caption → sign YES → spoken. *(First cut if behind.)* |
| 1:14–1:25 | **D5** Sign MONEY alone → hands down → app shows a clarifying question, no guess, nothing spoken. Hold 2 s so judges can read it. |
| 1:25–1:45 | **D6** Sign THANK-YOU → YES → spoken. Then rest on the created SIMULATED card + token counter for the last seconds. *(Thank-you half is second cut; never cut D5.)* |

If any sign is misread during the take: stop, reset the page, restart the whole demo take. Do not edit around a misread inside the uncut segment.

## Voice-over script (read exactly; ~140 wpm — timings in brackets)

**V1 — Problem [0:00–0:25]**
"At a mobile money agent in Kenya, a Deaf customer and the agent may have no language in common, and no interpreter. I built a prototype that helps with that one conversation. The customer signs a few words to a camera; the app shows what it understood, the customer confirms it, and only then is it spoken to the agent. Everything you will see is simulated — no real money moves."

**V2 — Meta models + eval [1:45–2:20, starts over commit history]**
"This was built during the hackathon — the commit history is the record. Recognition is a small classifier I trained, running in the browser. Meta's Muse Spark does the language step: once per finished sentence, through a small proxy, it returns an intent plus English and Kiswahili text — and a question instead of a guess when the signs are unclear. On thirty fixed sign sequences, one run: valid JSON sixty-seven percent after one retry, intent ninety-seven percent end-to-end with the rule fallback — and that fallback also keeps the app working if the model is unreachable."

**V3 — Honest scope [2:20–2:45]**
"Honest scope: ten signs, trained on my own signing — thirty-three clips, three sessions on one day. I am a hearing student; the signs are matched to a public dictionary and have not been reviewed by a Deaf KSL signer. The Kiswahili is my own check, not a validated review, and multi-person testing is still to be done. This is a prototype for one conversation — not a sign-language translator."

**V4 — Next steps [2:45–2:50]**
"Next: Deaf signer review, more signers, more signs. Try it live — the link is on screen."

### Words to never say
"Interpreter" (for the app), "fluent", "accurate", "validated", "works for Deaf Kenyans", any percentage for recognition.

## The one slide (1:50–2:20) — put exactly this on it

```
How Meta models are used
Camera → MediaPipe landmarks → my classifier (browser) → sign sequence
→ proxy (rate-limited, cached) → Muse Spark, once per utterance
→ JSON {intent, english, kiswahili, clarifying_question} → confirm (sign YES) → speech
Unclear signs → clarifying question, not a guess.  Model unreachable → labelled rule fallback.

Eval — 30 fixed sign sequences, muse-spark-1.3, ONE run (idealised sequences, not recogniser output)
Valid JSON: 53% first try · 67% after 1 retry
Intent accuracy: 63% model only · 97% end-to-end with fallback
Clarifying question on unclear: 5/7 · Latency ≈ 4.7 s mean · ≈1,070 tokens/utterance
Caveat: gold labels and the rule baseline share an author, so the baseline's score is not evidence it generalises.
```

Do not put the leave-one-session-out 0.788 number anywhere in the video.

## Backup recording plan (record in this order, before the main session)

1. **Backup A — replay take (5 min):** screen-record "Replay recorded sequence" running the whole dialogue, plus one gloss-demo click-through. If used in the final video, add an on-screen label for those seconds: "Recorded landmarks replay — not live signing." Never present it as live.
2. **Backup B — local take:** full dialogue once on `vercel dev` at localhost. Proves the flow even if the venue network/Vercel fails on recording day.
3. **Main takes:** record the live deployed take at least twice (OBS/screen + a phone filming the screen as a second angle). Keep the *first fully clean* take; don't chase perfection past three attempts — pick the clean one.
4. Save every take twice (laptop + phone/cloud folder) with names like `take-live-1.mp4`. Watch one full playback with sound before you stop.

## Captions plan

- Caption **all** voice-over (V1–V4) and **all app speech** as `[app speaks: "…"]`, including the spoken Kiswahili sentence (caption the Kiswahili text shown on screen; add the English line under it).
- Caption the clarifying-question moment with the exact question text.
- YouTube: upload the caption file (or use YouTube captions and fix names: *Muse Spark, Kiswahili, M-PESA is not mentioned — do not add it*). Also burn captions into the exported file if your editor allows, so the embedded/linked copy is captioned either way.
- Minimum size: captions readable at 480p; check one playback on your phone.

## Final checks before upload

- [ ] Runtime ≤ 3:00 (target 2:50); demo segment is one uncut take
- [ ] SIMULATED card and the token counter/badge are visible at least once
- [ ] Commit-history moment is in (1:45–1:50)
- [ ] No accuracy/validation claims beyond V3's wording; live + repo URLs on the end card
- [ ] Captions on, checked on a phone; title/description do not overstate ("prototype", 10 signs)
