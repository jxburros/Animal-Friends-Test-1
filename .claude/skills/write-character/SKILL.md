---
name: write-character
description: Write one character's cards for Animal Friends TCG — their backstory and the cards that come out of it, into spec/maker_card_set.json. Use whenever the maker asks to write, redo, replace or rewrite a named character's cards ("I want to replace the Peanut cards", "redo Clover — 3 in Science, 2 in Agriculture", "give Hazel a fourth version"), or asks for a character's backstory to drive their cards. Not for engine work or the Deck Workshop UI.
---

# Write a character

Every character in the collection has a **backstory that their cards come out of**. The maker says as
much as they already know — the backstory, how many cards, which studies — and you fill in the rest so
job, cost, shift, ability and flavor all read as consequences of the same story.

## Do this first

**Read `docs/WRITING_A_CHARACTER.md` in full before writing anything.** It is the brief: what the
maker owns versus what you fill in, the card schema, the cost/rank/rarity rules, the engine's
ability vocabulary, and the do-nots. This file only points at it; the brief is the authority.

Then read, in this order:

1. `docs/TOWN_BIBLE.md` — the shared, established facts. Never contradict them; append what you
   establish.
2. The character's existing versions — `docs/character_versions.csv` (run `npm run characters` if it
   is stale), or grep `spec/maker_card_set.json`.
3. The character's species charter in `spec/species.json` — its centre of gravity, its hole, its
   signature verb.
4. `test/card-vocabulary.mjs` — the effect, trigger and condition vocabulary the engine actually runs.

## The shape of the work

- Everything lands in **`spec/maker_card_set.json`**, the one card set the game reads: a `characters`
  entry (backstory, voice, arc, `wantedVerbs`) and the `cards` themselves.
- **Never change `src/engine/`** — new engine verbs are separate, approved work. Log the wish in
  `wantedVerbs` and build the nearest thing from verbs that exist.
- Every Character card needs a `characters` entry behind it, and every entry needs cards. `npm test`
  fails either way round, because the Book's Story panel would have nothing to show.
- Two versions of one character never share a cost: a shared cost means neither can upgrade the other.
- **Never hand-write `rarity` or `power`** — `npm run stamp` computes them.
- Every card's `flavor` references the backstory and could not belong to any other character.

## Before you commit

```
npm test                      # schema, effect vocabulary, set integrity
npm run stamp                 # compute rarity + power
npm run identity -- --check   # species identity and power creep
npm run characters            # regenerate the character spreadsheet
```

Check the batch by eye in the Book (`npm run serve` → Book), then commit with the character in the
subject — `Peanut: 3 Commerce, 2 Food` — saying what was dropped and why, and anything logged in
`wantedVerbs`.
