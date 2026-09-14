# Remaking the collection

The collection is being rebuilt card by card. This is the workbench for that: **the Book**, where
both collections are read side by side, a tick list for the printed cards, and a spreadsheet of every
Character and every version they have.

The two collections stay separate. A Classic deck draws only from `spec/starter_card_set.json` and a
Maker deck only from `spec/maker_card_set.json`; nothing ever mixes them, and the Deck Workshop
builds out of whichever collection the mode being played uses.

## The two shelves

The book opens on three doors — **Classic**, **Maker** and **Book**. The Book is the workbench:

| Shelf | What it holds | Played by |
| --- | --- | --- |
| **Classic** | `spec/starter_card_set.json` — the published collection | Classic Mode |
| **Maker** | `spec/maker_card_set.json` — the hand-remade collection | Maker Mode |

Cards render exactly as they do at the table (hover to read one, or press **Read**), each with a row
of chips for the printings it exists in, and **Story** opens a Maker character's backstory beside the
full flavor of every version of them — the flavor a card face is too small to show.

Maker cards are playable now: Maker Mode has two decks of its own and a Capital City of its own. What
it has *not* got is Statues, so `spec/maker_card_set.json` carries a `borrowsFromPrinted` list naming
the printed cards the collection cannot yet do without, by id. `composeMakerSet` in
`src/engine/modes.js` reads those into the Maker collection at load time and marks them `borrowed`,
which is why the Book labels them. Remaking one is a matter of writing the Maker card and striking
the id off that list.

## Writing a maker card

Cards are written a character at a time, out of that character's backstory — the process is
[REMAKING_A_CHARACTER.md](REMAKING_A_CHARACTER.md), and `/remake-character` loads it for an agent.
This section is just the file format.

Add an object to `cards` in `spec/maker_card_set.json`. It uses the same fields as a printed card
(see the `$comment` at the top of `spec/starter_card_set.json`), plus one:

```jsonc
{
  "id": "mk_acorn_stall_runner",   // must not collide with a printed id
  "type": "character",
  "name": "Acorn",
  "title": "Stall Runner",
  "species": "Squirrel",
  "study": "Commerce",
  "cost": 2,
  "shift": { "delay": 1, "output": 2 },
  "text": "Busy: take every Supply your Characters have put by.",
  "remakes": "rr_acorn_1"          // the printed card this replaces — an id, or a list of ids
}
```

`rarity` and `power` are left off: `npm run stamp -- --maker` computes them from the card and writes
them in. (Plain `npm run stamp` stamps the printed set — a different file.)

`remakes` is the point of the whole thing: it is **an id, not a name**. Rename the card, give it a
new title, move it to a different species — the link still points at the printed card it came from,
and the Book keeps that card ticked off. `npm test` checks every `remakes` id exists, that no
two maker cards claim the same printed card, and that no maker id collides with a printed one.

### Additions: a card that replaces nothing

Not every maker card is a remake. Some are **additions**, and they carry the other label:

```jsonc
{
  "id": "mk_tb_coppers_cellar",
  "type": "townBuilding",
  "addition": true,
  "addedBecause": "The printed set has no Town Buildings at all — the type did not exist when it was printed."
}
```

Three kinds of card land here. An **extra rung** in a remade character's arc, where the maker's count
beat the printed one (Betty's six versions against four printed Burrs). An **added character's** cards
(Bob, who kept the gate when the printed Gate Hedgehog became two animals) — the character entry
carries `addition` too, and §*Adding a character* in
[REMAKING_A_CHARACTER.md](REMAKING_A_CHARACTER.md) covers that. And a card of a **type the printed set
never had**, which is what every Town Building is.

Every maker card must carry one label or the other, and `npm test` enforces it. That is the point: an
unlabelled card is indistinguishable from a remake whose `remakes` link was forgotten, so a forgotten
link can no longer pass itself off as new work. An addition may claim nothing — declaring `addition`
on a card that also carries `remakes` fails — so the label is not a way out of a remake you did not
finish. The Book shows additions as **Added — replaces nothing**, with the reason.

## Ticking off the printed cards

Every card on the Book's **Classic** shelf has a **Mark remade** button under it.

* Ticking by hand is kept in this browser (`localStorage`, key `af-remade-cards`) along with the
  name and title the card had at the time, so a tick can still be traced after a rename.
* A card claimed by a maker card's `remakes` shows **✓ Remade (maker card)** and cannot be unticked
  by hand — that tick lives in the spec file, where it belongs.
* The line under the Book's heading reads `Remade N of 461 cards in the printed collection`, and **Export remade list**
  downloads the ticks as JSON (ids, names at time of ticking, and which maker card claims each).
  Ticks made by hand for cards that have since left the set are kept in that export rather than
  dropped — they are the trail.

## Sorting by Character

The Deck Workshop's **Sort by: Power · Character · Cost · Name** row sorts the collection it is
building from.

**Character** groups the shelf under headings — one per named Character, alphabetical, versions
cheapest first — so every version of Acorn sits in one run and a new version can be read against
the old ones. Events that name a Character in their requirements (`requires: [{ "name": "Clover" }]`)
file with that Character; everything else falls into a final *No named Character* group. The deck
list on the right follows the same sort, so a Character's versions sit together there too.

### The market side

Buildings, Market cards, Ordinances and Disruptions are remade too, and they carry `remakes` (or
`addition`, above) and are ticked off the same list — but they belong to **no character entry**,
because a Building is not somebody's backstory. `spec/maker_card_set.json` records why each batch of them exists under
`townCards` instead. Two things they are for: giving a new study a market side at all (before the
first batch, neither Food nor Entertainment had a single Building, Event, Market card or Disruption
anywhere in the collection), and giving the verbs a remade cast leans on something in the Capital
City that answers them.

**Town Buildings** are the other half of that shelf, and they are all additions: a Town Building is
played out of a Mayor's own deck for its Supply cost plus a crew of upright animals, and the printed
set has none, because the type did not exist when it was printed. Write them as *small and personal*
against the Capital City's civic monuments — a strip, a cellar, a bench, a shed, a gate — and take the
place from the town bible rather than inventing one. The crew size is the second dial after cost: one
animal for a building that waits for something, two for one that pays every turn, three only for
something a town would reorganise itself around. They rate below the printed Capital City band
(2.8–4.8 against 3.5–5.5), which is right — they are drawn rather than fought for.

A permanent is also **priced by how often its trigger actually comes round**: `permanentRuns` in
`src/engine/power.js` scales a Building's payouts against the turn start most of them wait for, so a
card that fires when Supply is taken off you is not paid as though that happened every turn. It never
mattered while every printed Building triggered at turn start; it started mattering the day a town
could build one of its own.

**Tokens** are the newest type on the shelf and the only one that is not a card anybody plays. A
token is a marker a Mayor holds beside their Supply — one kind for every species, one for every field
of study, and one for Buildings — and the `token` card is its face and its rules text, not something
that goes in a deck. All nineteen are additions, for the same reason every Town Building is: the
printed set has none. They rate 0 by construction and are always Common, because a marker costs its
holder nothing.

Nothing on either shelf spends a token yet. That is deliberate and it is the interesting part: a
token is the obvious answer to a whole family of cards the collection keeps reaching for — *your
Rabbits are worth something to each other*, *Food pays for Food*, *the town has built before and it
shows* — and every one of those cards wants the same counter underneath it. The counter was built
once, before any of them, so the first three do not each invent their own. The engine side is
`gainToken`, `spendToken` and the `tokensAtLeast` condition (`docs/ENGINE_API.md`); the rules side is
`spec/game.json` → `tokens`; the shelf's own account of why is `spec/maker_card_set.json` → `tokens`.

A **Building carries one ability**, and that is a balance fact rather than a style note: a second
standing ability is worth roughly +2 to +3.5 on the rating, which puts a Building straight past the
printed band (the dearest printed Building rates 5.39). Put the second idea on a Market card or an
Event, where a one-shot prices correctly. Where a printed Building was already the right card, a
remake may change only its name and flavor to place it in the remade world; that is a real remake
and the tick list treats it as one.

## The character spreadsheet

```
npm run characters        # writes docs/characters.csv and docs/character_versions.csv
npm run characters:xlsx   # the same, then binds both into docs/character_versions.xlsx
```

* **`docs/characters.csv`** — one row per named Character: species, the studies and jobs its
  versions cover, how many versions, the cost curve, rarities, expansions, how many Events name it,
  and how many of its versions are remade.
* **`docs/character_versions.csv`** — one row per printed version: ids, cost, rarity, expansion,
  shift, power score, rules text, and the maker card that remakes it.
* **`docs/character_versions.xlsx`** — both as sheets, with filterable frozen headers. The `.xlsx`
  step needs `openpyxl` (`pip install openpyxl`); the CSVs need nothing but Node.

Regenerate them after every batch of remade cards: the "Remade" columns are filled from
`spec/maker_card_set.json`, so the sheet doubles as the progress board for the rebuild.

## Where the code lives

| File | What it does |
| --- | --- |
| `docs/REMAKING_A_CHARACTER.md` | the process for remaking one character |
| `docs/TOWN_BIBLE.md` | the shared world every backstory must agree with |
| `.claude/skills/remake-character/SKILL.md` | loads the process for an agent |
| `spec/maker_card_set.json` | the remade collection: backstories and cards (starts empty) |
| `src/engine/characters.js` | Characters and their versions — used by the sort and the spreadsheet |
| `src/ui/remade.js` | the tick list: storage, the maker-card link, export/import |
| `src/ui/deckbuilder.js` | the shelves, the sort row and the tick buttons |
| `scripts/characters.mjs` | writes the two CSVs |
| `scripts/characters_xlsx.py` | binds the CSVs into the workbook |
| `test/maker-cards.test.mjs` | the promises above, checked on every `npm test` |
