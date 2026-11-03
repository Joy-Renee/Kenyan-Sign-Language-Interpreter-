# KSL sign list (hackathon prototype)

Last updated: Mon 2 Nov 2026
Status of the whole list: **UNVERIFIED. Not reviewed by a Deaf signer or KSL expert.** Do not describe any sign here as "correct KSL".

## Source

* KSL Dictionary, https://www.ksldictionary.com/dictionary (online dictionary with an Android app; copyright notice on the site, 2015; built by a named developer, not confirmed by me as endorsed by a Deaf organisation).
* Individual entries are at `https://www.ksldictionary.com/dictionary/sign/<number>`. Copy the entry URL for each word from the browser address bar after opening it.

## Provenance rules

* This file stores only: the word, my label, the entry URL, which entry variant I chose, whether it looks static or moving, and the date I checked. It does NOT copy the dictionary's descriptions, images or videos (rights; the hackathon bans assets I don't have the rights to).
* All training samples are recorded by me (a hearing student) following the dictionary entry. The prototype therefore shows that the pipeline can recognise my own repeatable signing. It does not measure correctness in KSL.

## Signs

|id (code label)|English meaning|Kiswahili (my suggestion, check)|Dictionary entry URL (fill)|Entry variant chosen (fill)|Motion: static / moving / unsure (fill from entry)|Date checked (fill)|Status|
|-|-|-|-|-|-|-|-|
|me|me / I|mimi|https://www.ksldictionary.com/component/ksl/sign/7058|linked entry (confirmed by me)|static; 1 hand; at chest|2 Nov 2026|Unverified|
|money|money|pesa|https://www.ksldictionary.com/component/ksl/sign/7142|linked entry (confirmed by me)|moving (small finger rub); 1 hand|2 Nov 2026|Unverified|
|send|send|tuma|https://www.ksldictionary.com/component/ksl/sign/8026|linked entry (confirmed by me)|moving (path, hand shape changes); 1 hand|2 Nov 2026|Unverified|
|give|give|toa / pea|https://www.ksldictionary.com/component/ksl/sign/6102|linked entry (confirmed by me)|moving (path); 1 hand|2 Nov 2026|Unverified|
|help|help|msaada / saidia|https://www.ksldictionary.com/component/ksl/sign/6266|linked entry (confirmed by me)|moving (small lift); 2 hands|2 Nov 2026|Unverified|
|mother|mother|mama|https://www.ksldictionary.com/component/ksl/sign/2697|linked entry (confirmed by me)|moving (repeated contact); 1 hand at cheek|2 Nov 2026|Unverified|
|how_much|how much|ni kiasi gani / bei gani|https://www.ksldictionary.com/component/ksl/sign/6349|linked entry (confirmed by me)|moving (path, hand shape changes); 2 hands; entry notes facial expression matters|2 Nov 2026|Unverified|
|yes|yes|ndiyo|https://www.ksldictionary.com/component/ksl/sign/8902|linked entry (confirmed by me)|moving (up-down); 1 hand|2 Nov 2026|Unverified|
|no|no|hapana|https://www.ksldictionary.com/component/ksl/sign/7273|linked entry (confirmed by me)|moving (path); 2 hands, crossed at start|2 Nov 2026|Unverified|
|thank_you|thank you|asante|https://www.ksldictionary.com/component/ksl/sign/8437|linked entry (confirmed by me)|moving (path); 1 hand starting below mouth|2 Nov 2026|Unverified|

## Notes for filling the table

* If a word has several entries (for example numbered variants), record which one you chose in the variant column.
* If a word is not in the dictionary, write "not found" in the URL column and keep the status Unverified. Do not invent a sign.
* Some dictionary entries may have the same or very similar description as another entry. If SEND and GIVE (or any other pair) look alike, write the pair in the notes below: they are likely confusion pairs for the classifier.
* Sentence meaning for the demo uses only these words. There are no numerals, so amounts come from the agent or the screen.

Confusion pairs noticed: from the entry descriptions (my reading, not tested): SEND vs GIVE (similar starting hand shape, different palm direction and path); MONEY vs HOW_MUCH (similar start); a closed-fist group, YES / MOTHER / THANK_YOU / HELP / NO (similar hand shape, differing mainly in location and movement).

## For Phase 2

* Use `id` as the class label in data collection, training and `public/shared/vocab.js`.
* Use the Motion column to decide which signs a single-frame landmark classifier can handle (static) and which will need a short window of frames (moving). Do not drop a word silently: if it is replaced, record the replacement and the reason here.
* Result of the motion check: 9 of 10 signs involve movement and only ME is static. Phase 2 should record short clips (a window of frames) for every sign, not single frames, and needs body/face location for signs near the cheek, mouth or chest (MOTHER, THANK_YOU, ME). Two-handed signs (HELP, HOW_MUCH, NO) need both hands tracked.

## README wording (use unless it becomes untrue)

> The sign list was taken from the public KSL Dictionary (ksldictionary.com). It has not been reviewed by a Deaf signer or KSL expert, and the signs were performed and recorded by a hearing student following the dictionary entries. The prototype demonstrates the recognition and sentence-generation pipeline on a small vocabulary; it makes no claim about KSL correctness or about accuracy with other signers.

