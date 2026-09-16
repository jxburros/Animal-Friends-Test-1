# Mayors: profiles, the collection, and games you can come back to

Everything in this document is local to one browser. There is no account server, no login and no
network call. A "Mayor" is a save file: a name, a card to stand for you, the cards you own, the
decks you have, the coins you have earned, and the games you have not finished yet.

The design answers five questions the game did not previously have answers to:

1. **Who is playing?** A Mayor, chosen from a picker at launch.
2. **Which cards may they use?** The ones in their collection, and only those.
3. **How do they get more?** By winning games and opening booster packs.
4. **What happens to a game they walk away from?** It waits for them.
5. **How does someone testing the game see everything at once?** The Sandbox Mayor.

## The shape of a Mayor

```js
{
  id: 'mayor-l3k2j1',
  name: 'Wren',
  avatar: { cardId: 'mk_clover_seedling_helper_0', printing: 'foil' },
  sandbox: false,
  createdAt: 1757900000000,
  starterDeckId: 'mk-cache-kitchen',
  coins: 240,
  packs: 2,                       // earned, still sealed
  inventory: {                    // cardId -> printing -> how many
    mk_beck_bylaw_reader_1: { regular: 2, foil: 1 },
  },
  decks: ['mk-cache-kitchen'],        // printed decks unlocked
  customDecks: [{ id, name, list, printings }],
  stats: { played: 12, won: 7, lost: 5, packsOpened: 9 },
  history: [{ at, won, deckId, deckName, opponentDeckId, marketId, turns, seed }],
  games: [{ id, savedAt, label, snapshot }],   // unfinished, newest first
}
```

`profile.js` owns this shape and never touches `localStorage` or the DOM: pure data in, new data
out, so every rule below is testable without a browser. `ui/store.js` is the only file that reads
or writes storage.

## The collection

**Inventory is per printing.** The six printings in `ui/versions.js` — regular, alternateArt, foil,
alternateArtFoil, creativeFoil, fullCardArt — are counted separately, because collecting a foil is
the point of opening a pack. A card you own in three printings is three entries under one card id.

**A copy is a copy.** For deck legality, `ownedCopies(cardId)` is the sum across every printing. A
foil Bylaw Reader and a regular one are two copies of the same card, and the deck may hold both.
Printings are presentation, exactly as `engine/boosterPack.js` already says: they never change a
card's rules, rarity or legality.

**A deck may not hold cards you do not have.** `collectionProblems` is a second gate alongside the
existing `deckProblems`: the rarity copy limit still applies, and your collection applies on top of
it. Two copies of a Rare in the deck needs two copies of that Rare in the collection.

**Which printing you play with is your choice.** A custom deck carries an optional `printings`
map, `cardId -> printing key`, saying which one to show on the table. It is cosmetic and is dropped
silently if you no longer own that printing.

## Getting cards

**Starting.** Creating a Mayor means choosing one of the printed decks. Its full list lands in the
collection in regular printings, and the deck itself is unlocked. Those cards are all you have, in
the Deck Workshop and in the Book alike.

**Winning.** A win pays a sealed booster pack and coins; a loss pays a smaller number of coins, so
a bad run still moves you forward. The numbers live in `spec/progression.json`, not in code.

**Packs.** `engine/boosterPack.js` already draws them: four Commons, three Uncommons, two Rares,
one Super Rare, one Legendary, plus one guaranteed non-regular hit. Opening a pack adds its twelve
cards to the inventory at the printing each was drawn in. Packs are bought with coins or earned by
winning, and sit sealed until you open them.

**More decks.** A printed deck unlocks two ways, and unlocking it grants its whole list into your
collection — a deck is a bundle of cards, so a deck you own is always a deck you can play:

- **Bought** outright with coins, at `deckPrice`.
- **Earned by coverage**: once packs have brought you `deckCoverage` of a deck's list, the rest is
  granted and the deck opens. Chasing a card you want has a second prize attached.

## The Book

Unowned cards stay on the shelf as greyed silhouettes with their rarity showing, so the Book still
says how big the set is and what you are chasing, but not what the card does. This matches what the
Book already does with printings nobody has painted yet. A card you own is shown in full, in every
printing you own it in; printings you do not own are greyed the same way.

## Games you can come back to

Game state was already plain data — `state.rng` is an integer, not a closure, and every card in
play is a `{ uid, cardId }` reference — so a snapshot is the state with `rules` and `set` removed
and the deck lists that built it kept alongside. `engine/snapshot.js` does that in both directions,
and `restore` re-attaches the loaded specs.

A snapshot is taken at the end of every turn. Leaving a game keeps it; finishing one removes it and
pays the reward. A Mayor holds up to `maxSavedGames` unfinished games, newest first.

Snapshots carry a `version`. A snapshot from an older version is not migrated — it is refused and
dropped with a note, because a half-restored game is worse than a lost one.

## The Sandbox Mayor

One profile, marked `sandbox: true`, owns every card in every printing, every deck, and unlimited
coins. Nothing is materialised: `ownedCopies` answers `Infinity` and `hasDeck` answers `true`. It
is created on demand from the picker, it never records history or rewards, and because it is a
separate profile it cannot corrupt real progress.

## Storage

One key per concern, all prefixed `af-`:

| Key | Holds |
| --- | --- |
| `af-profiles` | every Mayor, as one JSON array |
| `af-active-profile` | the id of the Mayor in play |
| `af-pace`, `af-welcome`, `af-log-folded` | unchanged; these are browser preferences, not progress |

`af-custom-decks-maker`, the Workshop's old key, is migrated once into the first Mayor created and
then left alone. Nothing is deleted: an older build of the game still finds its decks.

Every write is wrapped: a private window that refuses `localStorage` still plays a full session,
it just does not remember it. That is the rule the codebase already follows.
