# Remaking a character

The collection is being rebuilt one character at a time, and every character is being given a
**backstory that the cards come out of**. A remade card is not a stat line with a joke under it: the
job, the cost, the shift, the ability and the flavor should all read as consequences of the same
story. This file is the brief. An agent asked to remake a character reads it and needs nothing else
explained.

Companion files: [REMAKING_THE_COLLECTION.md](REMAKING_THE_COLLECTION.md) (the two shelves and the
tick list), [TOWN_BIBLE.md](TOWN_BIBLE.md) (the shared world), and
`.claude/skills/remake-character/SKILL.md` (loads this brief automatically).

---

## 1. The request, and what fills the gaps

A request looks like this, and may be much vaguer:

> I want to replace the Acorn cards. His backstory is now: he ran the family nut stall until the
> bridge tolls ate the margin, so he retrained as a cartwright. I want him to have 3 cards in
> Commerce and 2 in Crafts.

Everything stated is **fixed** — the agent does not improve it, second-guess it, or quietly widen it.
Everything unstated is **the agent's to fill in**, chosen to fit the backstory, the species charter
and the existing set:

| The maker states | The agent fills in |
| --- | --- |
| the backstory (however much of it) | the rest of the backstory, consistent with the town bible |
| how many cards, and in which studies | jobs and titles, one per version |
| sometimes a cost, an ability, a job | costs and the rank curve, shift delay/output |
| sometimes a card to keep or kill | abilities, from the engine's vocabulary |
| | rules text and flavor text for every card |
| | which printed cards each new card replaces or retires |

**"Field" means study**: Agriculture, Civics, Commerce, Crafts, Lore, Science. "3 in Commerce and 2
in Crafts" means three of the five versions have `"study": "Commerce"`.

**Species is fixed.** Acorn is a Squirrel and stays one unless the maker says otherwise — species is
a design space with a charter (`spec/species.json`), and the charter constrains what the abilities
should do. Studies are the axis that moves.

If the request is genuinely ambiguous in a way that changes the work — "make him stronger" with no
sense of how, a study that contradicts the stated backstory — ask one question and then carry on.
Do not stack up questions; fill in and state the assumption instead.

---

## 2. Where the work goes

Everything lands in **`spec/maker_card_set.json`** — the maker shelf. Nothing is written to
`spec/starter_card_set.json`. The printed set is the thing being replaced; it stays untouched until
the whole collection is remade and the maker set is switched on.

The file has two top-level arrays:

```jsonc
{
  "characters": [ /* one entry per remade character: the backstory */ ],
  "cards":      [ /* the cards themselves */ ]
}
```

### The character entry

```jsonc
{
  "name": "Acorn",
  "species": "Squirrel",
  "studies": ["Commerce", "Crafts"],
  "backstory": "Two or three paragraphs. Where he came from, what changed, what he does now, what\nhe is bad at. Written as town history, not as a stat justification.",
  "voice": "Brisk, over-explains prices, never finishes a sentence about his father.",
  "arc": "How the versions escalate: what the apprentice has that the master doesn't, and why the master is worth 5 Supply.",
  "remade": "2026-09-13",
  "retires": [
    { "id": "rr_acorn_2", "why": "The Guild Broker belongs to the old tolls plot; nothing in the new arc carries it." }
  ],
  "wantedVerbs": [
    { "verb": "swapCardWithOpponent", "why": "His cart trades goods; the story wants a swap.", "workaround": "Used draw + opponentTopdeckFromHand instead." }
  ]
}
```

`backstory`, `voice` and `arc` are what the next agent — and the flavor text — work from. `retires`
and `wantedVerbs` are covered in §4 and §6.

### The card

A maker card uses exactly the printed schema (see the `$comment` at the top of
`spec/starter_card_set.json`) plus `remakes`:

```jsonc
{
  "id": "mk_acorn_cartwright_2",      // mk_<character>_<job>_<cost>; must not collide with a printed id
  "type": "character",
  "name": "Acorn",
  "title": "Cartwright",
  "job": "Cartwright",
  "species": "Squirrel",
  "study": "Crafts",
  "cost": 2,
  "shift": { "delay": 1, "output": 2 },
  "text": "Upgrades Acorn. Busy: move a shift from one of your Characters to another.",
  "flavor": "The stall paid for the axles; the axles outlived the stall.",
  "abilities": [ { "trigger": "busy", "effect": { "do": "moveShift" } } ],
  "art": { "atlas": "neighbors", "tile": 14 },
  "remakes": "rr_acorn_1"
}
```

- **`remakes`** is an id, or a list of ids, of printed cards this card replaces. **Ids, never names** —
  that is what survives you renaming the card later.
- **`rarity` and `power` are not hand-written.** `npm run stamp` computes them (§5).
- **`art`**: inherit the atlas/tile of the printed card being replaced when the illustration still
  fits the new job. When it doesn't, leave `art` off and add a line to the character entry's
  `wantedArt` so it can be commissioned later. Never point at a tile that depicts a different job.

---

## 3. The process, step by step

1. **Read the town bible** (`docs/TOWN_BIBLE.md`) before writing a word. It holds the established
   facts — who knows whom, what happened to the borough, which shops exist. A new backstory may
   extend it and must never contradict it.
2. **Read what is being replaced.** `npm run characters` then look the character up in
   `docs/character_versions.csv`, or grep `spec/starter_card_set.json`. Note every printed version,
   its cost, study, job and ability, and every Event that names the character in `requires`.
3. **Read the species charter** for this character in `spec/species.json` — its centre of gravity,
   its hole, and its signature verb. The remade abilities must keep the species recognisable;
   `npm run identity -- --check` fails the build if a species stops playing differently.
4. **Write the backstory first**, then the arc, then the jobs. If the mechanics come first the
   flavor ends up decorating them, which is exactly what this rebuild exists to stop.
5. **Write the cards**, cheapest first, following §5 (balance) and §6 (abilities).
6. **Link every printed version**: each is either named in some card's `remakes` or listed in
   `retires` with a reason. None may be left unaccounted for.
7. **Handle the character's Events.** An Event naming the character (`requires: [{ "name": "Acorn" }]`,
   e.g. *Acorn's Bidding War*) is part of the batch: remake it with the others, or retire it. An
   Event that only requires a species or a study is not.
8. **Append to the town bible** the facts this backstory establishes, in the format §7 sets out.
9. **Validate** (§8), regenerate the spreadsheet, and commit with the character named in the subject.

---

## 4. How many cards, and what happens to the old ones

The maker's count wins. Five printed Acorns may become three cards, or seven; the printed count
never dictates the new one.

Every printed version still has to be **accounted for**, so the tick list stays honest:

- a version with a successor → named in that card's `remakes`;
- a version with no successor → an entry in the character's `retires` with a one-line reason;
- several old versions folded into one new card → list them all: `"remakes": ["rr_acorn_1", "rr_acorn_3"]`.

A printed card may be claimed by **at most one** maker card (`npm test` enforces it). Retiring is a
normal outcome, not a failure — say plainly in the reason why the card has no place in the new arc.

---

## 5. Cost, rank, shift and rarity

The agent designs the cost curve; the power model assigns rarity. Never write a rarity by hand.

**Cost sets the rank**, and rank is a real rules difference (`spec/game.json`):

| Cost | Rank | Enters the town |
| --- | --- | --- |
| 0–1 | Apprentice | upright — acts at once |
| 2–3 | Journeyman | busy — ready next turn |
| 4–5 | Master | ready in two turns |

So a cost is a design statement: a cost-1 card has to be worth playing on turn one, and a cost-5 card
has to be worth waiting two turns for. Costs run 0–5; there is no 6.

**A version chain reads upward.** Where a card supersedes a cheaper version of the same character,
open its rules text with `Upgrades <Name>.` — the convention used 104 times in the printed set.
Cheap versions do one small thing; expensive ones pay off the arc.

**Shift** is `{ delay, output }`: how many turns the character is busy, and the Supply it produces.
Printed practice is roughly `delay 1 → output 1–2`, `delay 2 → output 4–5`. A character whose story
is about patience can sit at the slow end; one whose story is about hustle should not.

**Rarity is computed.** After writing the cards run `npm run stamp`, which rates every card
(`power^0.6 × efficiency^0.4`) and stamps `rarity` and `power`. Rarity then caps deck copies —
Common 3, Uncommon 3, Rare 2, Super Rare 1, Legendary 1 — so it is a balance fact, not a badge.
If a card comes back Legendary and the story says "ordinary cartwright", the card is too strong:
change the card, not the rarity.

A useful check: the batch should not rate far above the printed versions it replaces.
`npm run identity -- --check` fails on power creep across a set.

---

## 6. Abilities: stay inside the engine's vocabulary

Every ability is `{ trigger, effect }`, and both come from lists the engine actually interprets.
`npm test` (`test/cardset.test.mjs`) fails on anything else, so an invented verb is a broken card,
not a wish.

**Triggers**: `passive`, `busy`, `onRecruit`, `onTurnStart`, `onTurnEnd`, `onReady`,
`onShiftStarted`, `onShiftCompleted`, `onEventPlayed`, `onAnnounce`, `onChallengedByOpponent`,
`onGainMarketCard`, `onCharacterUnemployed`, `onTiedBid`, `displayed`.

**Effects**: `seq`, `gainSupply`, `opponentGainSupply`, `giveSupplyToOpponent`, `draw`, `discard`,
`addMod`, `readyCharacter`, `readyNextTurn`, `rehire`, `recruitFromHand`, `reorderDeckTop`,
`eventFromDumpToDeckBottom`, `eventFromDumpToHand`, `peekMarketDeck`, `opponentTopdeckFromHand`,
`unemployOpponentCharacter`, `raiseOwnBid`, `scryDeck`, plus the species signatures `storeSupply`,
`takeStoredSupply`, `takeFromCityDump`, `protectCharacter`, `moveShift`, `selfReady`, `cancelReveal`,
`advanceCharacter`. (`test/cardset.test.mjs` is the authority — read it, not this list, if they ever
disagree. Shared-shock verbs like `everyoneLosesSupply` belong to Disruptions, not Characters.)

**When the story wants something the engine cannot do**: do not invent a verb, and do not write an
unplayable card. Build the nearest thing out of verbs that exist, and log the gap in the character
entry's `wantedVerbs` with what the story wanted and what you used instead. The maker approves new
engine verbs as separate work; a remake batch never changes `src/engine/`.

Rules text must say exactly what the effect does, in the printed set's voice — plain sentences,
town words ("Busy:", "Upgrades Acorn.", "gain 1 Supply"), no keyword soup.

---

## 7. Flavor, backstory and the town bible

**Every card's `flavor` references the backstory.** Not a generic joke — a line that only makes
sense for this character, and that a reader who has seen the other versions can place in the arc.
Across a batch the flavor lines should read in cost order as a thread, not five isolated quips.

**Flavor may run longer than the card face shows.** The card face clips; the Deck Workshop's
**Read** view shows the whole card, and the story panel shows the character's backstory alongside
it. Write the line the story deserves rather than the line that fits in the box — but keep the first
sentence self-contained, since that is what a player reads at a glance.

**The town bible** (`docs/TOWN_BIBLE.md`) is shared and cumulative:

- **Read it first.** A backstory may not contradict an established fact. If the maker's request
  contradicts one, follow the maker, then update the bible and say in the commit what changed.
- **Append what you establish**: new places, events, relationships, dates. One bullet each, under
  the right heading, with the character it came from in brackets.
- Keep it to facts other characters could trip over. Acorn's opinion of his father belongs in his
  backstory; the bridge tolls that closed the stall belong in the bible, because the next character
  may have paid them too.

---

## 8. Before you commit

```
npm test                      # card schema, effect vocabulary, maker-set integrity
npm run stamp                 # compute rarity + power for the new cards
npm run identity -- --check   # species still play differently; no power creep
npm run characters            # regenerate docs/characters.csv + docs/character_versions.csv
```

Then check by eye, in the Deck Workshop (`npm run serve`, **Build your own deck** → **Maker cards**):

- every new card renders, and **Read** shows the full flavor;
- on the printed shelf, sorted by **Character**, every old version of this character shows
  `✓ Remade (maker card)` or is listed in `retires`;
- the counts in the shelf bar moved by the number you expected.

Commit with the character in the subject — `Remake Acorn: 3 Commerce, 2 Crafts` — and say in the body
what was retired and why, and anything logged in `wantedVerbs`.

---

## 9. The do-nots

- **Do not touch `spec/starter_card_set.json`.** The printed set is the control copy.
- **Do not change `src/engine/`** in a remake batch. New verbs are separate, approved work.
- **Do not hand-write `rarity` or `power`.** `npm run stamp` owns them.
- **Do not reuse a printed card id**, and do not let two maker cards claim the same printed card.
- **Do not leave a printed version unaccounted for** — replaced or retired, never silent.
- **Do not widen the request.** If the maker asks for Acorn, remake Acorn; note anything else you
  noticed rather than fixing it.
- **Do not write flavor that would fit any character.** If the line survives a find-and-replace of
  the name, it is not doing its job.
