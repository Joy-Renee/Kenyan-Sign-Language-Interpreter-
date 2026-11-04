# Submission form text (draft — paste, then adjust to the form's fields)

Only claims from what is actually built. Replace [VIDEO LINK] before submitting.

## Name
KSL Assistant

## Tagline
Sign it, confirm it, then it's spoken — a mobile-money conversation for a Deaf customer, in English and Kiswahili. (Simulated transactions only.)

## Short description
KSL Assistant is a browser prototype that helps a Deaf customer communicate with a mobile-money agent in Kenya. The customer signs a small vocabulary to a webcam; a classifier I trained runs in the browser, and Meta's Muse Spark turns each confirmed sign sequence into an English or Kiswahili sentence with an intent, asking a clarifying question when the signs are unclear. Nothing is spoken until the customer confirms with a YES sign, and transactions are simulated only — no real money moves. Built solo during the hackathon, it is a proof of concept for one everyday conversation, not a sign-language translator: it recognises 10 signs and has not yet been validated by Deaf KSL signers.

## Problem statement
At a mobile money agent in Kenya, a Deaf customer and the agent may have no language in common and no interpreter. Sending money or asking a fee becomes slow, error-prone, or impossible. KSL Assistant supports that one conversation with customer-confirmed, bilingual output and zero financial risk.

## Use of Meta products
I used Meta's Muse Spark (`muse-spark-1.3`) through the Meta Model API as the language-understanding step. Once per completed sign sequence, a small serverless proxy sends the recognised sign tokens to Muse Spark, which returns validated JSON: an intent, English and Kiswahili sentences, any missing details (amount, phone), and a clarifying question instead of a guess when the signs are unclear. The app shows that sentence for the customer to confirm with a YES sign before speaking it, and creates the simulated transaction with deterministic code — not the model. The proxy caches responses, rate-limits calls (10/min per IP, 300/day cap), and falls back to a clearly labelled rule-based interpreter if the model is unreachable, so the demo never breaks. I also ran an offline eval of 30 fixed sequences through the same Muse Spark code path (one run: 67% valid JSON after one retry, 97% intent accuracy end-to-end with the fallback, ~4.7 s mean latency, ~1,070 tokens/utterance; gold labels and the baseline share an author, so the baseline score is not evidence of generalisation).

## Why Meta models matter
My classifier only outputs sign glosses like `ME SEND MONEY MOTHER` — rigid templates would break with any variation. Muse Spark adds the judgement the system needs: it infers intent, writes a natural sentence in English and Kiswahili, flags missing details like an amount or phone number, and asks a clarifying question instead of guessing when signs are ambiguous. My classifier handles the hands; Meta's model handles the meaning.

## Links
- Live product: https://kenyan-sign-language-interpreter.vercel.app/
- Public repo: https://github.com/Joy-Renee/Kenyan-Sign-Language-Interpreter-
- Demo video: [VIDEO LINK]
- Track: Indie (solo) · Theme: Build for Your World

## Honest one-liner for any "results" field
Prototype, 10 signs, trained on my own signing (33 clips); signs not yet reviewed by a Deaf KSL signer; no recognition-accuracy claim.

## Optional X post
I built KSL Assistant for the Meta Global AI Developer Hackathon 🇰🇪 A Deaf customer signs to a webcam → my browser classifier reads 10 signs → Meta Muse Spark writes the English/Kiswahili sentence → the customer confirms with a YES sign before anything is spoken. Simulated mobile-money only, no real money moves. Live: kenyan-sign-language-interpreter.vercel.app — prototype, not yet validated by Deaf KSL signers; that's the next step. #BuildForYourWorld
