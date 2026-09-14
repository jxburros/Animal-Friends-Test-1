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

Maker cards are playable now, and the shelf stands on its own: Maker Mode has two decks of its own, a
Capital City of its own and, since the Statues were remade, nine Statues of its own. It borrows
nothing, and `borrowsFromPrinted` is gone from `spec/maker_card_set.json` — the mechanism is still
there in `composeMakerSet` (`src/engine/modes.js`), which reads a borrowed id into the collection and
marks it `borrowed` so the Book can label it, and it is simply reading an empty list. That is what
finishing a borrow looks like: write the Maker cards, strike the ids, and the list goes with them.

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

**Statues** were the last thing on this shelf that was still somebody else's. All nine are remade
now — same nine virtues, same costs, same monuments — but each one is rebuilt around a verb the
engine has since learned: Kindness feeds an animal out of work, Curiosity bins what it does not want,
Courage tosses for it, Patience and Ingenuity and Joy keep chits, Community puts two animals
together. A Statue keeps its bargain whatever else changes: a boon, and a burden that lasts as long
as its Mayor holds it. The remade nine rate 2.44–2.83 against the printed 1.94–2.46 — a shade richer,
and tighter, which is the trade for nine cards that only ever play against each other.

**Written for the shelf, not off the list.** The later batches turn the market side around: instead of
taking the printed Market cards a run at a time, they start from the cast already on the shelf and the
scenes the art already has, and ask what is missing. The twenty-five-card batch of 2026-09-14 is the
clearest case — Andrew's late desk, Willow's harbour office, Quill's cider social, Maribel's seed
bank, Liz's weighbridge, Orien's engine in the Counting House, Hazel's seat on the market committee,
Faustus's fitting room, and the borough's own weather: the winter the Grain Exchange shut, the year
the bridge went, the eclipse, the midges off the water. Sixteen of the twenty-five still claim a
printed card, because a card written for this shelf usually turns out to be the successor of one on
the other; the rest carry `addition` and say why. Two rules came out of writing it. A new **Market
card, Building or Disruption has to be added to `marketDecks[0].pool`** or it is a card nobody can
be dealt (Events go in a Mayor's own deck and belong to the Deck Workshop instead). And **a shared
shock is dealt far more often on a 26-card market than on the printed one** — the first draft of
*A Lean Season* sent every Character in both towns to Unemployment, as the printed Recession does,
and it doubled the average maker game from 50 turns to 93 and stalled two games in twenty-four.
Play the shelf before committing a Disruption; a card that never lets the towns fill up is a card
that never lets anybody win.

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

Three cards spend a token now, and they are the three the counter was built for: *your Rabbits are
worth something to each other* (Warren Muster), *Food pays for Food* (the Ovens' Account) and *the
town has built before and it shows* (the Surveyor's Table). Building the counter once, before any of
them existed, is what stopped each of them inventing its own — which was the whole argument for
printing nineteen cards nobody could use yet. Each spender is paired with something that hands the
chit out (the Chit Tin, the two Founders' cards, the Harvest Fair), and a price a town cannot meet is
not paid at all, so the rest of the card still happens and a spender is safe to print. The engine side
is `gainToken`, `spendToken` and the `tokensAtLeast` condition (`docs/ENGINE_API.md`); the rules side
is `spec/game.json` → `tokens`; the shelf's own account of why is
`spec/maker_card_set.json` → `tokens`.

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
| `src/ui/full-art.js` | the Full Art registry, and `remadeAs`: the painting a Maker remake inherits |
| `src/ui/deckbuilder.js` | the shelves, the sort row and the tick buttons |
| `scripts/characters.mjs` | writes the two CSVs |
| `scripts/characters_xlsx.py` | binds the CSVs into the workbook |
| `test/maker-cards.test.mjs` | the promises above, checked on every `npm test` |
