# A deck for every Legendary

> **Retired in v0.13.0.** The ten decks described here, and the fifteen town decks they were built
> alongside, were taken off the shelf when the roster was rebuilt as one deck per species. The pass is
> kept on the record for the builder work it settled — the anchor-and-support scheme, the `--only`
> workflow, and the three builder bugs it found. The shelf the game actually ships is described in the
> README and in [the playtest notes](PLAYTEST_NOTES.md).

The collection carves ten Legendary cards. Until this pass none of them had a deck written around it:
a Legendary is a one-copy card, it turns up in about a third of games, and when it did it arrived in
a town arranged for two species and two studies rather than for what the card actually does.

These ten decks are the other way round. The card is the input. Each states the Legendary it is built
around — seeded into the list before anything else the builder chooses — and a `support` rule saying
what feeds it, which is added to every card's affinity and so steers every later pass rather than
bolting a few pieces on the end.

| Deck | Built around | Species | Studies | What the support rule looks for |
| --- | --- | --- | --- | --- |
| Warden & Bench | Berry, Guild Warden | Hedgehog, Badger | Civics, Crafts | Rehiring and Unemployment, and animals dear enough that three Supply off is worth having |
| Whistle & Lamp | Biff, Chief Constable | Hedgehog, Fox | Civics, Lore | Putting the other town back to work — `makeBusy`, ended shifts, blocked Readies |
| Knife & Kindling | Betty, Whittler | Hedgehog, Mouse | Crafts, Commerce | Cheap animals and recruit triggers; dear ones are worth less here |
| Hedge & Horizon | Betty, Land Clearer | Hedgehog, Rabbit | Agriculture, Civics | Anything that advances or readies a Character, and Supply |
| Can & Row | Clover, Seedling Helper | Rabbit, Mouse | Agriculture, Entertainment | Characters costing 2 or less — the ones Clover pulls out of hand for free |
| Gate & Wall | The Quill Wall | Hedgehog, Otter | Crafts, Civics | Town Buildings, and the bodies it takes to raise one |
| Barrel & Bonfire | Quill, Cider Maker | Hedgehog, Mouse | Food, Lore | Ready triggers, and anything that brings one round sooner |
| Basket & Ladder | Quill, Harvest Steward | Hedgehog, Badger | Agriculture, Commerce | Long shifts worth shielding, and the cards that shield them |
| Apron & Hook | Gwen, The Apron on the Hook | Mouse, Otter | Food, Commerce | Rehiring, Unemployment, and Busy abilities |
| Paper & Lamplight | Annabelle, Last One Up | Owl, Cat | Lore, Science | Draw and protection — and **no other Raccoon**, because she only pays while she is the only one standing |

Every deck is 40 cards and legal by the ordinary rules: copies capped at two (one for a Super Rare or
a Legendary), at most five marquee cards, three Town Buildings, the curve covered, and the economy and
shift-throughput floors met. Rebuild them with:

```
node scripts/build-decks.mjs --only mk-warden-bench,mk-whistle-lamp,mk-knife-kindling,mk-hedge-horizon,mk-can-row,mk-gate-wall,mk-barrel-bonfire,mk-basket-ladder,mk-apron-hook,mk-paper-lamplight
```

`--only` leaves the fifteen town decks and the three Capital Cities exactly as they are, which is the
point: their printed lists are the ones playtest settled.

## What the identities cost

The identity is not decoration; it is the power level. Three of the ten were settled the way the
six-deck pass settled its own, by measuring and changing what was measured:

- **Apron & Hook** first ran Mouse and Otter of Food and Commerce with every mention of `rehire`
  weighted at 4. A support weight competes with the species and study bonuses, so a heavy one buys
  engine pieces with card quality: it hired the borough's slowest Otters because their cards say the
  word, came out at the throughput floor, and won **21% of 240 games**. Halving the weight and adding
  a lean towards animals who actually earn — a shift of 1.5 Supply a turn or better — took the same
  identity to about half. Swapping the species instead did nothing: Mouse and Badger won 14%.
- **Barrel & Bonfire** was Hedgehog and Cat of Food and Entertainment and won **76%**. The study was
  doing it, not the species: Hedgehog and Mouse of Food and Lore, the same animal and the same engine,
  wins about 54%.
- **Hedge & Horizon** was Hedgehog and Rabbit of Agriculture and Food, which is Hedgerow & Hearth's
  identity exactly — and at 71% it was the strongest deck in the set. Civics in place of Food keeps
  Betty's hedgerow its own town.

## Measured

4500 games, heuristic on both seats, every ordered pairing of all twenty-five decks across all three
Capital Cities (`node scripts/playtest.mjs --games 4500 --decks all --market all`).

| | Win rate |
| --- | --- |
| Hedge & Horizon | 69.5% |
| Whistle & Lamp | 69.0% |
| Basket & Ladder | 61.8% |
| Gate & Wall | 60.9% |
| Barrel & Bonfire | 53.7% |
| Warden & Bench | 53.4% |
| Can & Row | 50.9% |
| Apron & Hook | 47.1% |
| Knife & Kindling | 43.7% |
| Paper & Lamplight | 42.8% |

The fifteen towns over the same run span 32.0% (Ledger & Larder) to 62.4% (Hedgerow & Hearth), so the
ten sit inside the printed spread apart from the two at the top, which are a few points above the
strongest town. A deck named for a marquee card being one of the stronger decks is defensible; being
the weakest thing in the set, as the first cut of Apron & Hook was, is not.

## Three builder bugs these decks found

The ten had to reach further into the collection than any deck before them — everything good was
already printed, and each one had to keep a particular card working. That turned up three faults in
`scripts/build-decks.mjs` that the fifteen had never pushed hard enough to expose:

1. **The throughput floor could give up.** It hired the best earner it could find, and if that was a
   Super Rare in a deck that had already spent its five marquee slots, `take` refused it and the loop
   broke — leaving the deck below the floor. Marquee cards the deck has no room for are no longer
   candidates; the same applies to both top-up passes, which used to fall through to Events.
2. **The character top-up took a whole cost band.** It sorted the catalogue once by which band was
   furthest behind the curve and then walked that order, so every card of the band that was behind at
   sort time went in. One deck came out with thirteen cost-3 animals. It now re-picks each time round,
   as the final top-up already did.
3. **A heavy support weight is paid for in card quality.** See Apron & Hook above. Support is a lean,
   not a fence: 2 or 3 points, against 3 for a species and 2 for a study.
