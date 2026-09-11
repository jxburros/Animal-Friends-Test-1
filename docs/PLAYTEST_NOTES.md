# Playtest notes (prototype, automated)

Method: `node scripts/playtest.mjs --games 400 --seed <n>` with the heuristic AI on both sides,
alternating decks and seats. Runs take about 10 ms per game. Numbers below are from the current
`spec/` after the tuning listed at the end.

## Headline results

| Measure | Value |
| --- | --- |
| Heuristic vs random | 100% wins for the heuristic (both seats) |
| Seat balance (P0 win rate) | 46.5% on seed 7 (200 games), so within noise of even |
| Deck balance | Burrow & Bloom 50.5%, Paws & Papers 49.5% |
| Games decided by Statues | 100% (none hit the turn cap) |
| Game length | mean 26.9 player turns, median 27, min 11, max 40 |
| Statues claimed per game | 7.79 of 9 |
| Contested purchases | 3.97 per game; the challenger wins 100% |

## Observations for the design

1. **A challenge cannot be answered.** Pending purchases resolve at the announcer's next Start phase and
   the announcer has no turn in between, so a challenger who can pay one more Supply than the announcer's
   bid always wins. The only defence is to announce at a bid the opponent cannot match. Winning Statue bids
   therefore climb far above printed costs (often 20 or more Supply late in the game), and the printed cost
   mostly matters for cheap non-Statue cards. If that is not the intended feel, consider letting the announcer
   raise once in response, or making some ties go to the challenger.
2. **Cycling the Capital City was a public good.** With refill only on an empty display, a player who never
   buys filler cards free-rides on the opponent's cycling and wins about 63/37; two such players deadlocked in
   100% of games. This was fixed permanently by adopting the top-up refill: the Capital City is dealt back up to
   five cards whenever a purchase resolves, so the Market Deck keeps flowing instead of sitting idle while unwanted
   cards silt up the display. The stale-market sweep (six turns without a purchase redeals the display, Statues
   returning to the Market Deck) remains as a safety valve but is rarely needed.
3. **First-player advantage** was 56% with one extra Supply for the second player. Two extra Supply plus one
   extra card brings it to roughly even.
4. **Two-Character Events are expensive.** Seed Swap and Fair Hearing were never played because they tap two
   upright Characters, the same resource bids need. Both were buffed in `spec/starter_card_set.json`;
   single-Character "gain Supply" Events (Community Garden, Open Ledger) remain the most played.
5. **Unemployment rarely happens.** Only Poacher's Pardon and Scrap Yard send Characters there, so Kindness,
   both Rowans, Appeal Board, Community Kitchen, Neighborhood Watch and Fair Hearing key off a mechanic that
   fires a few times per game at most. The starter set may want one deck-side Unemployment effect.
6. **Shift value is output ÷ delay.** Delay-1 Characters (Juniper Messenger, Fern Forager, Hazel Market Vendor)
   are the most recruited; Poppy Postmaster (2 → 2) is the weakest 1-cost body.

The top-up refill has made games noticeably shorter: the mean game length dropped from 30–35 turns to 26.9 turns.

## Tuning applied in this prototype

- Fixed an engine bug where Civic Rally's +1 was quoted but not applied to challenge bids.
- Added top-up refill: the Capital City is dealt back up to five cards whenever a purchase resolves (`market.refillToFull: true`).
- Added `market.staleTurns = 6` (stale-market sweep safety valve).
- `setup.secondPlayerBonusSupply = 2`, `setup.secondPlayerBonusCards = 1`.
- Seed Swap: draw 3, discard 1, gain 1 Supply. Fair Hearing: free rehire, draw 2, opponent gains 1 Supply.

## Expansion playtest (97-card set, four decks)

500 heuristic-vs-heuristic games per pass, every deck against every other deck in both seats:

| Deck | Win rate |
| --- | --- |
| Burrow & Bloom | 47.3% |
| Paws & Papers | 44.7% |
| Bramble & Bristle | 53.3% |
| Ripple & Rune | 54.7% |

Mean game length is unchanged at ~26 turns, and card conservation holds over 200 random-vs-random games.

First pass measured the new decks at 63% (Bramble & Bristle) and 56% (Ripple & Rune); the supply-per-game
diagnostic showed both were simply earning more Supply (138 and 145 versus 105 for Burrow & Bloom). Tuning
applied:

- Thistle, Field Hand: cost 1 → 2 and shift 1 → 2 delay. "+1 Supply whenever it becomes upright" stacked on a
  delay-1 shift meant two Supply a turn from a one-cost body.
- Willow, Ferry Trader: shift 1/1 → 2/2, for the same reason on the shift-start trigger.
- Barn Raising: 3 → 2 Supply. Tool Lending Day: dropped the extra Supply (readying a working Character already
  cashes its shift, which is the strongest line in the game).

Still open: both new decks sit a couple of points above the two starters, mostly on Supply throughput; the
next pass should look at Bramble, Master Joiner and the Capital City cards that hand out two effects at once
(Watermill, Beacon Hill).
