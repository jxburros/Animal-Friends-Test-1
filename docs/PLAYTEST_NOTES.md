# Playtest notes (prototype, automated)

Method: `node scripts/playtest.mjs --games 400 --seed <n>` with the heuristic AI on both sides,
alternating decks and seats. Runs take about 10 ms per game. Numbers below are from the current
`spec/` after the tuning listed at the end.

## Headline results

| Measure | Value |
| --- | --- |
| Heuristic vs random | 100% wins for the heuristic (both seats) |
| Seat balance (P0 win rate) | 51% on seed 7, 46% on seed 99 (400 games each), so within noise of even |
| Deck balance | Burrow & Bloom 49–53%, Paws & Papers 47–51% |
| Games decided by Statues | 99.5% or more; the rest hit the 80-turn safety cap |
| Game length | mean 30–35 player turns, median 30–33, min 16 |
| Statues claimed per game | 7.6 of 9 |
| Contested purchases | about 4 per game; the challenger wins nearly all of them |

## Observations for the design

1. **A challenge cannot be answered.** Pending purchases resolve at the announcer's next Start phase and
   the announcer has no turn in between, so a challenger who can pay one more Supply than the announcer's
   bid always wins. The only defence is to announce at a bid the opponent cannot match. Winning Statue bids
   therefore climb far above printed costs (often 20 or more Supply late in the game), and the printed cost
   mostly matters for cheap non-Statue cards. If that is not the intended feel, consider letting the announcer
   raise once in response, or making some ties go to the challenger.
2. **Cycling the Capital City was a public good.** With refill only on an empty display, a player who never
   buys filler cards free-rides on the opponent's cycling and wins about 63/37; two such players deadlocked in
   100% of games. The prototype now adds a stale-market sweep (six turns without a purchase redeals the display,
   Statues returning to the Market Deck). A partial refill rule would be a cleaner permanent fix.
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

## Tuning applied in this prototype

- Fixed an engine bug where Civic Rally's +1 was quoted but not applied to challenge bids.
- Added `market.staleTurns = 6` (stale-market sweep).
- `setup.secondPlayerBonusSupply = 2`, `setup.secondPlayerBonusCards = 1`.
- Seed Swap: draw 3, discard 1, gain 1 Supply. Fair Hearing: free rehire, draw 2, opponent gains 1 Supply.
