---
name: remake-character
description: Remake one character's cards for Animal Friends TCG — write their backstory and the cards that come out of it, onto the maker shelf in spec/maker_card_set.json. Use whenever the maker asks to remake, replace, redo or rewrite a named character's cards ("I want to replace the Acorn cards", "remake Pip", "redo Clover — 3 in Science, 2 in Agriculture"), or asks for a character's backstory to drive their cards. Not for editing the printed set, engine work, or the Deck Workshop UI.
---

# Remake a character

The collection is being rebuilt one character at a time, and every character is being given a
backstory that their cards come out of. The maker says as much as they already know — the backstory,
how many cards, which studies — and you fill in the rest so job, cost, shift, ability and flavor all
read as consequences of the same story.

## Do this first

**Read `docs/REMAKING_A_CHARACTER.md` in full before writing anything.** It is the brief: what the
maker owns versus what you fill in, the card schema, the cost/rank/rarity rules, the engine's
ability vocabulary, and the do-nots. This file only points at it; the brief is the authority.

Then read, in this order:

1. `docs/TOWN_BIBLE.md` — the shared, established facts. Never contradict them; append what you
   establish.
2. The character's printed versions — `docs/character_versions.csv` (run `npm run characters` if it
   is stale), or grep `spec/starter_card_set.json`.
3. The character's species charter in `spec/species.json` — its centre of gravity, its hole, its
   signature verb.
4. `test/cardset.test.mjs` — the effect, trigger and condition vocabulary the engine actually runs.

## The shape of the work

- Everything lands in **`spec/maker_card_set.json`**: a `characters` entry (backstory, voice, arc,
  `retires`, `wantedVerbs`) and the `cards` themselves.
- **Never touch `spec/starter_card_set.json`** and never change `src/engine/` — the printed set is
  the control copy, and new engine verbs are separate, approved work. Log the wish in `wantedVerbs`
  and build the nearest thing from verbs that exist.
- Every printed version of the character is either claimed by a new card's `remakes` (an **id**, not
  a name) or listed in `retires` with a reason. None may be left silent.
- Every card carries one of two labels: `remakes`, or `addition: true` with an `addedBecause` line
  when the card replaces nothing (a rung the printed versions never had, or an added character's
  cards). `npm test` fails a card with neither — an unlabelled card looks exactly like a remake whose
  link was forgotten.
- **Never hand-write `rarity` or `power`** — `npm run stamp` computes them.
- Every card's `flavor` references the backstory and could not belong to any other character.

## Before you commit

```
npm test                      # schema, effect vocabulary, maker-set integrity
npm run stamp                 # compute rarity + power
npm run identity -- --check   # species identity and power creep
npm run characters            # regenerate the character spreadsheet
```

Check the batch by eye in the Deck Workshop (`npm run serve` → Build your own deck → Maker cards),
then commit with the character in the subject — `Remake Acorn: 3 Commerce, 2 Crafts` — saying what
was retired and why, and anything logged in `wantedVerbs`.
