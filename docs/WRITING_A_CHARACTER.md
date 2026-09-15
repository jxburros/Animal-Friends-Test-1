# Writing a character

The collection is written one character at a time, and every character is given a **backstory that
the cards come out of**. A card is not a stat line with a joke under it: the job, the cost, the
shift, the ability and the flavor should all read as consequences of the same story. This file is
the brief. An agent asked to write or rewrite a character reads it and needs nothing else explained.

Companion files: [TOWN_BIBLE.md](TOWN_BIBLE.md) (the shared world) and
`.claude/skills/write-character/SKILL.md` (loads this brief automatically).

---

## 1. The request, and what fills the gaps

A request looks like this, and may be much vaguer:

> I want to redo the Peanut cards. They are a bright,
> kind accountant who has always had a lot of friends. They should have 3 cards in the Commerce track
> as an accountant and similar jobs in the same career track at 0, 2 and 5 cost; they should also
> have 2 cards in a (new) Food category as a barista and café manager at 1 and 4 cost.

(That is close to the real request that produced Peanut — §9 walks through what the agent filled in.)

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

**"Field" means study**: Agriculture, Civics, Commerce, Crafts, Lore, Science. "3 in Commerce and 2
in Crafts" means three of the five versions have `"study": "Commerce"`.

**A new study is the maker's call, and it is a bigger change than it looks.** Peanut opened **Food**.
Declare it in the set's `studies` and describe it in `newStudies` (what the study is, who introduced
it, what is still owed). It has to be given a place in the species charters, and the town decks
re-checked — `npm run decks` rebuilds them and `npm run identity -- --check` says whether the studies
still play differently. A new study also needs an icon and a card backdrop in `src/ui/art.js`, or its
cards render as a grey dot on a grey sky.

**Species is fixed.** Peanut is a Squirrel and stays one unless the maker says otherwise — species is
a design space with a charter (`spec/species.json`), and the charter constrains what the abilities
should do. Studies are the axis that moves.

If the request is genuinely ambiguous in a way that changes the work — "make him stronger" with no
sense of how, a study that contradicts the stated backstory — ask one question and then carry on.
Do not stack up questions; fill in and state the assumption instead.

---

## 2. Where the work goes

Everything lands in **`spec/maker_card_set.json`** — the collection, and the only card set the game
reads. Every screen plays off it, so a card is live the moment it lands.

The file has two top-level arrays:

```jsonc
{
  "characters": [ /* one entry per character: the backstory */ ],
  "cards":      [ /* the cards themselves */ ]
}
```

### The character entry

```jsonc
{
  "name": "Peanut",
  "species": "Squirrel",
  "studies": ["Commerce", "Food"],
  "pronouns": "they/them",
  "backstory": "Two or three paragraphs. Where they came from, what changed, what they do now, what\nthey are bad at. Written as town history, not as a stat justification.",
  "voice": "Warm, quick, faintly bookkeeperish. Never says 'no', says 'not this quarter'.",
  "arc": "How the versions escalate: what the apprentice has that the master doesn't, and why the master is worth 5 Supply.",
  "wantedVerbs": [
    { "verb": "shiftBonusPerCharacter", "why": "The story wants every shift to pay +1 as a standing rule.", "workaround": "An onShiftCompleted ability with no self condition — same outcome, logged per shift." }
  ]
}
```

`backstory`, `voice` and `arc` are what the next agent — and the flavor text — work from.
`wantedVerbs` is covered in §6. `wantedArt` lists cards whose illustration does not exist yet (§2,
`art`). `pronouns` is worth setting whenever the maker gives them — the flavor and the backstory
should use them.

Every character entry needs cards and every Character card needs an entry: `npm test` fails a card
whose name has no story behind it, because the Book's **Story** panel would have nothing to show.

### The card

A card uses the schema described in the `$comment` at the top of `spec/maker_card_set.json`:

```jsonc
{
  "id": "mk_peanut_accountant_2",     // mk_<character>_<job>_<cost>; must not collide with a printed id
  "type": "character",
  "name": "Peanut",                   // every version of a character carries the same name
  "title": "Accountant",
  "job": "Accountant",
  "species": "Squirrel",
  "study": "Commerce",
  "cost": 2,
  "shift": { "delay": 1, "output": 2 },
  "text": "Upgrades Peanut. Busy: take every Supply your Characters have put by.",
  "flavor": "Peanut calls it 'bringing the tins in', and has never once been wrong about which tin.",
  "abilities": [ { "trigger": "busy", "effect": { "do": "takeStoredSupply" } } ],
  "art": { "atlas": "neighbors", "tile": 14 }
}
```

- **`id`** is `mk_<character>_<job>_<cost>` and must be unique across the set.
- **`rarity` and `power` are not hand-written.** `npm run stamp` computes them (§5).
- **`art`**: point at an atlas tile that depicts this job. If the version you are replacing had one
  that still fits, keep it; otherwise leave `art` off and add a line to the character entry's
  `wantedArt` so it can be commissioned later. Never point at a tile that depicts a different job.

---

## 3. The process, step by step

1. **Read the town bible** (`docs/TOWN_BIBLE.md`) before writing a word. It holds the established
   facts — who knows whom, what happened to the borough, which shops exist. A new backstory may
   extend it and must never contradict it.
2. **Read what the character already has.** `npm run characters` then look them up in
   `docs/character_versions.csv`, or grep `spec/maker_card_set.json`. Note every version, its cost,
   study, job and ability, and every Event that names the character in `requires`.
3. **Read the species charter** for this character in `spec/species.json` — its centre of gravity,
   its hole, and its signature verb. The abilities must keep the species recognisable;
   `npm run identity -- --check` fails the build if a species stops playing differently.
4. **Write the backstory first**, then the arc, then the jobs. If the mechanics come first the
   flavor ends up decorating them, which is exactly what this rebuild exists to stop.
5. **Write the cards**, cheapest first, following §5 (balance) and §6 (abilities).
6. **Handle the character's Events.** An Event naming the character
   (`requires: [{ "name": "Peanut" }]`, e.g. *Peanut's Standing Round*) is part of the batch: write it
   with the others, or drop it. An Event that only requires a species or a study is not.
8. **Append to the town bible** the facts this backstory establishes, in the format §7 sets out.
9. **Validate** (§8), regenerate the spreadsheet, and commit with the character named in the subject.

---

## 4. How many cards, and what happens to the old ones

The maker's count wins. Five Peanuts may become three cards, or seven; the count that is there never
dictates the new one.

When a batch **replaces** cards the character already has, every one of the old ids either keeps its
place in the new arc or leaves the file with it. Say in the commit which went and why — a version
dropped is a normal outcome, not a failure, and the commit message is where that is recorded now that
no card carries a link to what it replaced.

Two rules survive from the schema itself and `npm test` enforces both: an id is never reused, and two
versions of one character never share a cost, because a shared cost means neither can upgrade the
other.

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
open its rules text with `Upgrades <Name>.` — the convention the whole collection uses.
Cheap versions do one small thing; expensive ones pay off the arc.

**Shift** is `{ delay, output }`: how many turns the character is busy, and the Supply it produces.
Printed practice is roughly `delay 1 → output 1–2`, `delay 2 → output 4–5`. A character whose story
is about patience can sit at the slow end; one whose story is about hustle should not.

**Rarity is computed.** After writing the cards run `npm run stamp`, which rates every card
(`power^0.6 × efficiency^0.4`) and stamps `rarity` and `power`. Rarity then caps deck copies —
Common 4, Uncommon 3, Rare 2, Super Rare 1 — so it is a balance fact, not a badge. If a card comes
back Super Rare and the story says "ordinary cartwright", the card is too strong: change the card,
not the rarity.

A useful check: the batch should not rate far above the versions it replaces.
`npm run identity -- --check` fails on power creep across a set.

---

## 6. Abilities: stay inside the engine's vocabulary

Every ability is `{ trigger, effect }`, and both come from lists the engine actually interprets.
`npm test` (`test/cardset.test.mjs`) fails on anything else, so an invented verb is a broken card,
not a wish.

**Triggers**: `passive`, `busy`, `onRecruit`, `onTurnStart`, `onTurnEnd`, `onReady`,
`onShiftStarted`, `onShiftCompleted`, `onEventPlayed`, `onAnnounce`, `onChallengedByOpponent`,
`onGainMarketCard`, `onCharacterUnemployed`, `onTiedBid`, `onSupplyLost`, `displayed`.

A `displayed` ability is a rule the Capital City applies while the card sits in the display, named by
`key` rather than run as an effect (`pledgeLadderDelta`, `statueCostDelta`, `buildingCostDelta`,
`noRaises`, `blockStatuePurchase`). Only an **Ordinance** or a **marketCharacter** is ever displayed,
so it is the only place the key means anything — on a Character in a town it is read by nothing.

**Effects**: `seq`, `gainSupply`, `opponentGainSupply`, `giveSupplyToOpponent`, `draw`, `discard`,
`addMod`, `readyCharacter`, `readyNextTurn`, `rehire`, `recruitFromHand`, `reorderDeckTop`,
`eventFromDumpToDeckBottom`, `eventFromDumpToHand`, `peekMarketDeck`, `opponentTopdeckFromHand`,
`unemployOpponentCharacter`, `raiseOwnBid`, `scryDeck`, `makeBusy`, `peekOpponentHand`, `gainToken`,
`spendToken`, `coinFlip`, `giveToUnemployed`, `pairCharacters`, `swapBuilding`,
`eventFromOpponentDump`, `cardFromDumpToHand`, `opponentLosesSupply`, `opponentChoice`,
plus the species signatures `storeSupply`,
`takeStoredSupply`, `takeFromCityDump`, `protectCharacter`, `moveShift`, `selfReady`, `cancelReveal`,
`advanceCharacter`. (`test/card-vocabulary.mjs` is the authority — read it, not this list, if they ever
disagree. Shared-shock verbs like `everyoneLosesSupply` belong to Disruptions, not Characters.)

**Conditions** may also ask how much the town has built (`buildingsAtMost`, `buildingsAtLeast` — the
Buildings raised, never the Statues) and what tokens it is holding (`tokensAtLeast`). A card's `shift`
may carry `decay` and `minOutput`: the animal burns out, and every shift they work pays less than the
one before. A mod's `filter` may carry `upgradesOwn`, which is good only for a recruit that upgrades a
Character the town already has.

**A card itself may carry three things besides its abilities.** `leavesAfter: N` is a hire with a
term, and `returnsToMarket: true` sends them back to the bottom of the Market Deck rather than the
City Dump when it runs out, so they may be taken on again. `entersUpright: true` is an animal who
arrives ready whatever their cost. A mod may be counted rather than printed: `addMod` takes
`valuePer: "buildingsBuilt"` with a `max`, which is a rate that scales with what the town has
raised — always print the `max`, or the card cannot be rated.

Some of the vocabulary exists *because* a character asked for it — `makeBusy`, `scryDeck`'s `to: "dump"`,
`protectCharacter`'s `notSelf`, filtered mods, `buildingDiscount`, `leavesAfter`, and then the second
round: `buildingsAtMost` (Bella), `peekOpponentHand` (Inkwell), `shift.decay` (Kevin) and the
`upgradesOwn` mod filter (Lynnette), and then the third: `coinFlip` (Roger and Earl),
`giveToUnemployed` (Marmalade), `pairCharacters` (Daisy), the `townShiftBonus` passive (Orien),
`swapBuilding` (Patch), `eventFromOpponentDump` (Pockets) and `gainToken`'s `per` (Pebble), and then
the fourth, which cleared the list: `peekMarketDeck`'s `reorder` (Sage), the `townRecruitDiscount`
passive (Eric), `cardFromDumpToHand` (Benjamin), `returnsToMarket` (Jake), the
`opponentPledgeLadderPlus1` passive (Faustus), `addMod`'s `valuePer` (Velvet), `entersUpright`
(Mandee) and `opponentLosesSupply` with `opponentChoice` (Willow) — all wishes
first (see `docs/ENGINE_API.md`, and the `wantedVerbs` of the characters that wanted them). That is the
route: wish, then approval, then engine, then the card. A character entry's `wantedVerbs` entry gains a
`resolved` line when its wish is built, saying what was built and what the card says now; a wish that
was deliberately *not* built says that there too, with the reason.

**When the story wants something the engine cannot do**: do not invent a verb, and do not write an
unplayable card. Build the nearest thing out of verbs that exist, and log the gap in the character
entry's `wantedVerbs` with what the story wanted and what you used instead. The maker approves new
engine verbs as separate work; a writing batch never changes `src/engine/`.

Three effects take more than a count. `recruitFromHand` takes `filter` (`maxCost`), `orientation`
and `then` — a rider that runs **only when a Character actually came out of hand**, which is what
separates it from putting the same step in a `seq`. `rehire` filters on `cost`, `maxCost`, `minCost`,
`study` and `species`: who is out of work, not who is standing where. `protectCharacter` and
`readyNextTurn` take `filter: { notSelf: true }`.

Rules text must say exactly what the effect does, in the collection's voice — plain sentences,
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
npm test                          # card schema, effect vocabulary, set integrity
npm run stamp                     # compute rarity + power for the new cards
npm run identity -- --check       # species still play differently; no power creep
npm run characters                # regenerate docs/characters.csv + docs/character_versions.csv
```

Then check by eye, in **the Book** (`npm run serve` → **Book**):

- every new card renders, **Read** shows the full flavor, and **Story** shows the backstory beside
  every version's flavor — that panel is where the writing is actually judged;
- the card count on the search row moved by the number you expected, and the species and study chips
  still hold what you think they hold.

If the batch adds cards a deck can hold, also open **Play → Build your own deck** and check they are
on the shelf there: a new card is playable the moment it lands.

Commit with the character in the subject — `Peanut: 3 Commerce, 2 Food` — and say in the body what
was dropped and why, and anything logged in `wantedVerbs`.

---

## 9. A worked example

**Peanut** (`spec/maker_card_set.json`) is the first character through this process and the reference
for the next one. The request was: a bright and kind accountant with a lot of friends; three Commerce
cards on an accountant track at 0/2/5, two cards in a new Food study as a barista and café manager at
1/4; abilities about getting more Supply than normal; the 5 giving every Character extra Supply.

What the agent filled in: the café as the reason a Commerce accountant also works in Food, the job
titles, the shift numbers, all five abilities out of the Squirrel's storage charter (`storeSupply`
early, `takeStoredSupply` as the payoff), the flavor thread, and *Peanut's Standing Round*, the Event
that names them. What the model then corrected: the cost-2 first came back far too strong for an
ordinary accountant, so the deal-making half of its ability moved up to the cost-4 where the friends
are — and the batch now rates 2.95 / 3.60 / 5.69 / 5.14 / 5.08. No creep, and the arc reads upward.

## 10. The do-nots

- **Do not change `src/engine/`** in a writing batch. New verbs are separate, approved work.
- **Do not hand-write `rarity` or `power`.** `npm run stamp` owns them.
- **Do not reuse a card id**, and do not give two versions of one character the same cost.
- **Do not leave a Character card without a `characters` entry** — the Book has nothing to show for it.
- **Do not widen the request.** If the maker asks for Peanut, write Peanut; note anything else you
  noticed rather than fixing it.
- **Do not write flavor that would fit any character.** If the line survives a find-and-replace of
  the name, it is not doing its job.
