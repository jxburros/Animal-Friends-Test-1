# Remaking the collection

The collection is being rebuilt card by card. This is the workbench for that: a second shelf in the
Deck Workshop holding the remade cards, a tick list for the printed ones, and a spreadsheet of every
Character and every version they have.

Nothing here changes the game. Decks still draw only from `spec/starter_card_set.json`, and the
engine never loads the maker set.

## The two shelves

Open **✎ Build your own deck** and the Workshop now starts with a shelf picker:

| Shelf | What it holds | Playable |
| --- | --- | --- |
| **The printed book** | `spec/starter_card_set.json` — the published collection | Yes |
| **Maker cards** | `spec/maker_card_set.json` — the hand-remade collection | **Not yet** |

The Maker shelf starts empty. Its cards render exactly like printed ones (hover to read one, or
press **Read**), but they carry no `+`/`−` controls and a *Not playable yet* tag instead: they are
there to be compared against the printed card they replace. When they become playable, the change
is to let the pool and `deckProblems` see them — the shelf itself, the sort and the ticks all stay
as they are.

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

`rarity` and `power` are left off: `npm run stamp` computes them from the card and writes them in.

`remakes` is the point of the whole thing: it is **an id, not a name**. Rename the card, give it a
new title, move it to a different species — the link still points at the printed card it came from,
and the Workshop keeps that card ticked off. `npm test` checks every `remakes` id exists, that no
two maker cards claim the same printed card, and that no maker id collides with a printed one.

## Ticking off the printed cards

Every card on the printed shelf has a **Mark remade** button under it.

* Ticking by hand is kept in this browser (`localStorage`, key `af-remade-cards`) along with the
  name and title the card had at the time, so a tick can still be traced after a rename.
* A card claimed by a maker card's `remakes` shows **✓ Remade (maker card)** and cannot be unticked
  by hand — that tick lives in the spec file, where it belongs.
* **Remade: Any / Remade / Not yet** filters the shelf, so "what is left to do" is one click away.
* The bar reads `Remade N of 461 cards in the printed collection`, and **Export remade list**
  downloads the ticks as JSON (ids, names at time of ticking, and which maker card claims each).
  Ticks made by hand for cards that have since left the set are kept in that export rather than
  dropped — they are the trail.

## Sorting by Character

Both shelves share the **Sort by: Power · Character · Cost · Name** row.

**Character** groups the shelf under headings — one per named Character, alphabetical, versions
cheapest first — so every version of Acorn sits in one run and a new version can be read against
the old ones. Events that name a Character in their requirements (`requires: [{ "name": "Clover" }]`)
file with that Character; everything else falls into a final *No named Character* group. The deck
list on the right follows the same sort, so a Character's versions sit together there too.

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
