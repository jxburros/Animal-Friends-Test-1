# Playtest notes (prototype, automated)

Method: `node scripts/playtest.mjs --games 480 --seed <n> --decks all --market <id>` with the heuristic AI on
both sides, rotating through every ordered deck pairing. Runs take about 40 ms per game. Numbers below are from
the current `spec/` after the tuning listed at the end.

## The auction rewrite

The one-shot challenge became an open bidding war: a Mayor who is not the high bidder may raise on their own
turn by pledging another upright Character, for as many rounds as both can pay for. Three things end an auction —
running out of Supply, running out of upright animals, and deciding the card is not worth the next step.

Three rules do the work:

- **Pledged animals stay Busy until the auction ends.** They do not advance at Ready and no effect can wake them.
  This, not the Supply, is what usually ends a long war.
- **The loser forfeits half of their escrow** (rounded up). Walking away from a war you started is expensive.
- **The required step grows by 1 every two bids**, so a war converges instead of crawling upward by single Supply.

### Before and after (100 games, all deck pairings, seed 5)

| Measure | One-shot challenge | Open auction |
| --- | --- | --- |
| Contested purchases | 3.98/game | 3.76/game |
| **Who won a contested card** | **challenger 100%** | first bidder 42%, raiser 58% |
| Bidding rounds when contested | 1 | avg 6.1, longest 34 |
| Events played (per player-game) | 2.7 | 3.6 |
| Recruits (per player-game) | 10.3 | 12.6 |
| Game length | 25.1 turns | 36.5 turns |

The headline is the second row. Under the old rule the announcer could not answer a challenge, so a challenger
who could pay one more Supply *always* won; announcing a Statue at its printed cost simply handed it away, and
the only defence was to open above the opponent's entire Supply. That degenerate line is gone — an opening bid is
now an opening bid, and roughly two contested cards in five are still held by the Mayor who announced them.

The cost is length: games run about 11 turns longer, because each round of bidding pushes resolution out another
turn and pledged animals are not working while it lasts.

## Headline results (480 games per market, seed 4400)

| Measure | First Boroughs | Boom Town | Hard Times |
| --- | --- | --- | --- |
| Seat balance (P0 win rate) | 47.3% | 49.6% | 46.0% |
| Game length (mean turns) | 37.3 | 35.5 | 33.9 |
| Games decided by Statues | 99.4% | 99.4% | 100% |
| Statues claimed per game | 7.03 of 9 | 7.06 | 7.06 |
| Contested auctions | 3.66/game | 3.72/game | 3.27/game |
| Bidding rounds when contested | avg 6.3 | avg 6.2 | avg 5.5 |
| Supply forfeited by losing bidders | 52.6/game | 53.2/game | 39.9/game |
| Disruptions fired | — | 1.4/game | 3.1/game |

All three markets sit within sampling noise of an even seat split, essentially all games are decided by Statues
rather than the turn cap, and card conservation holds over 200 random-vs-random games across all three decks
(`npm run invariants`).

Hard Times is measurably the fastest and the poorest market: three shared shocks a game keep Supply scarce, which
shortens the bidding wars (5.5 rounds, 40 Supply forfeited) and the game with it.

## Observations for the design

1. **Deck balance is the biggest open problem, and it got worse.** Over 480 games per market the four printed
   decks land at roughly Burrow & Bloom 33%, Bramble & Bristle 45%, Paws & Papers 52%, Ripple & Rune 70%. The
   pre-change baseline was 42 / 65 / 40 / 53, so the spread has both widened and moved: Ripple & Rune is now the
   clear best deck and Burrow & Bloom the clear worst. The new bidding rules reward a deck that can field many
   cheap bodies — every raise costs an animal for the duration — and Ripple & Rune's cheap Otters and Squirrels
   supply exactly that, while Burrow & Bloom's slower, higher-output Characters are painful to pledge. **This
   wants a content tuning pass that has not been made**: the honest fix is to look at Ripple & Rune's cheap
   bodies and Burrow & Bloom's shift economy, not to shave the auction rules.
2. **The first-player offset had to be retuned, in the opposite direction.** The old +2 Supply / +1 card put the
   *second* player at 57% once Supply became ammunition for a multi-round auction: a head start in Supply is far
   more valuable when you can spend it one round at a time in a war. Dropping to +1 card and no extra Supply puts
   the first player at 50.0% over 480 games (+2/+1: 42.9%, +1/+1: 46.0%, +1/+0: 55.2%, +0/+0: 52.7%).
3. **Statue burdens do their job quietly.** Statues per game barely moved (7.64 → 7.03), so the burdens are not
   scaring the AI off collecting them, but they tax the leader throughout. The burdens most often felt are
   Community's thinner Resources choice and Joy's per-turn tithe; Harmony's "pay losing bids in full" is the one
   that interacts most sharply with the new auction and is worth watching in human play.
4. **Unemployment finally matters — in Hard Times.** The old set fired Unemployment a few times per game at most,
   leaving Kindness, both Rowans, Appeal Board, Community Kitchen and Neighborhood Watch keyed to a mechanic that
   rarely happened. Recession alone now fires about 0.55 times per Hard Times game and empties both towns when it
   does, and Open Hiring Fair gives the recovery cards something to answer. In First Boroughs those cards are
   still nearly dead; if that matters, the starter market wants one Unemployment source of its own.
5. **Long auctions are dramatic but rare.** The median contested auction runs about 6 bids; the tail reaches into
   the thirties, and those are almost always the endgame fight over a fifth Statue, where both Mayors correctly
   value the card at everything they own. That reads as a feature, but it is the case to watch first if human
   games feel bloated.
6. **Events are still the thinnest part of the turn** at 2.9–3.9 per player-game. Bidding now competes with
   Events for exactly the same resource — upright animals — and for longer. Events went *up* slightly against the
   baseline, so the new rules did not crowd them out, but they remain the least-used action in the game.

## Tuning applied in this prototype

- The Capital City auction replaces the one-shot challenge: unlimited raises, each pledging another upright
  Character, resolving at the high bidder's next turn start.
- Pledged Characters stay Busy for the whole auction (`market.auction.biddersLockedUntilAuctionEnds`).
- Losing bidders forfeit half their escrow, rounded up (`losingBidForfeit*`).
- The minimum raise grows by 1 every two bids (`incrementGrowsEveryNRounds: 2`). Without this, two AIs traded +1
  bids for entire games: the first pass measured 21-round average auctions and 82% of games hitting the turn cap.
- `setup.secondPlayerBonusSupply` 2 → 0; `secondPlayerBonusCards` stays 1.
- Nine Statue burdens added (Section 9 of the design reference).
- Seven Disruption cards added, resolving on reveal.
- Three Market Decks (First Boroughs, Boom Town, Hard Times), selectable at setup and from
  `--market` in the playtest runner.
- Engine fix: a player could finish a turn holding six Statues, because several auctions settling in the same
  Start phase kept resolving after one of them had already won the game. This predates the auction rewrite.
- The heuristic AI learned walk-away ceilings (it folds once the price passes what a card is worth), to price a
  pledged animal as lost for the whole war rather than for a turn, and to weigh the half-forfeit risk of entering
  a war it may not finish.

## Still open

- The deck balance pass described in observation 1.
- Whether the endgame Statue auction wants a cap, or whether running out of animals is limit enough.
- Whether First Boroughs should carry a single Unemployment source so its recovery cards are live.
