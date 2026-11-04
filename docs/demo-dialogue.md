# Demo dialogue and 3-minute video script (DRAFT, updated for the YES-confirmation flow)

Scenario: a Deaf customer at a mobile money agent. **Simulated only.** No real money, no real person's data. The agent is played by me; the agent's speech is NOT captured by the app (sign -> sentence -> speech is one direction only). The agent types the amount and phone number into the SIMULATED box, because the sign list has no numerals.

Rule from the hackathon: the video may show only what was built during the event. Do not show the old ASL project or any feature not in this repo.

## How the flow works (say this once in the video)
Sign a sentence, lower your hands for about 2 seconds, the app shows its reading in English and Kiswahili, and nothing is spoken until the customer signs YES (NO cancels). Each YES is its own short utterance, so leave about 2 seconds between steps.

## Before recording (10 minutes)
1. Run the whole script live 3 times in the exact demo setup (same camera, light, background, hand, distance). Cut any step that does not work rather than retry on camera.
2. Confirm every sign used exists in the model labels and `public/shared/vocab.js`.
3. Have the "Replay recorded sequence" button ready as a camera fallback; say so on screen if used.
4. Do one dry run with `vercel dev` stopped to confirm FALLBACK MODE shows.

## Dialogue
| Step | Customer signs | App shows | Customer then | Agent says / does (not captured) |
|---|---|---|---|---|
| 1 | ME, SEND, MONEY, MOTHER | "I want to send money to my mother." / "Nataka kutuma pesa kwa mama yangu." | YES -> spoken aloud | "Sure. How much, and what number?" |
| 2 | HOW-MUCH | "How much is it?" / "Ni kiasi gani?" | YES -> spoken aloud | "The fee is 30 shillings (demo figure)." |
| 3 | (agent types a demo amount and number, e.g. 500 and 0712345678, and clicks Set) | "Please send KSh 500 to 0712345678." | YES -> status `created` (SIMULATED) | "Done. Receipt printing." |
| 4 | THANK-YOU | "Thank you." / "Asante." | YES -> spoken aloud | "Karibu." |
| Optional | Sign something unclear (for example MONEY alone) | The app asks a clarifying question instead of guessing | | Show once if time allows |

Only keep a step if the live app produced that behaviour. Model wording may differ slightly; show what it actually says. Speech is English only.

## Timeline (target 2:50, hard limit 3:00)
- 0:00-0:20 Problem in two sentences: Deaf Kenyans often have no interpreter at everyday services. Say this is a prototype, not a translator.
- 0:20-0:50 One architecture slide: camera -> hand landmarks (MediaPipe) -> classifier -> pause detection -> small proxy -> Meta Muse Spark -> confirm with YES -> text and speech. State what Muse Spark does: reads the sign sequence and returns an intent plus English and Kiswahili text, and asks a question when the signs are unclear. Called once per finished utterance (a lone YES or NO does not call it).
- 0:50-2:20 Live demo, steps 1-4. Show the badge once (source, latency, tokens).
- 2:20-2:40 Resilience: stop the proxy, sign once, show the orange FALLBACK MODE badge. Show one log line (tokens, latency).
- 2:40-3:00 Honest scope, spoken plainly: about 10 signs; trained on my own signing from 3 same-day sessions; sign list not verified by a Deaf KSL signer; English and Kiswahili output not reviewed by a Deaf user. Next step: community review and more signers.
- If over time, cut step 4 first.

## Numbers to quote (fill ONLY from real measurements; delete the line if unmeasured)
- Eval: [FILL from eval/results-table.md: intent accuracy and valid-JSON rate on 30 fixed sequences, one run, idealised sequences]
- Typical end-to-end latency: [FILL from the badge]
- Tokens per model call: [FILL from the badge or log]
- Do NOT quote recognition accuracy from the 33-clip leave-one-session-out numbers.

## Do not say
"Interpreter", "fluent", "accurate for Deaf Kenyans", "validated", or any claim about KSL grammar or Kiswahili quality.