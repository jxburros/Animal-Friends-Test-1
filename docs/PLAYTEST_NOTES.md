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

## The expansion: 208 cards, rarity, and an AI that reads the card

The set was doubled (104 → 208 cards), every card was rated by a power/cost model, and the ratings were
turned into rarities that cap how often a card may repeat in a deck.

**The model** (`src/engine/power.js`) rates a card in Supply-equivalents: *power* is what it gives you (shift
throughput, an ability times how often its trigger fires, discounted per condition; a Statue's burden
subtracts), *opportunity cost* is what it asks for (Supply, the action, the turns a Master rotates, the
Characters an Event taps, the deck slot). The rating is `power^0.6 × efficiency^0.4`, which is the whole
argument of the pass: efficiency decides between cards of similar size, size decides between cards of similar
efficiency. Bands were then chosen to make a pyramid.

| Rarity | Score ≥ | Copies per deck | Cards | Share |
| --- | ---: | ---: | ---: | ---: |
| Common | — | 3 | 106 | 51% |
| Uncommon | 2.4 | 3 | 49 | 24% |
| Rare | 3.6 | 2 | 37 | 18% |
| Super Rare | 4.5 | 1 | 10 | 5% |
| Legendary | 5.4 | 1 | 6 | 3% |

Two findings fell out of the model rather than out of play:

- **A shield printed with a sentinel value broke the first pass.** `lossShield: 99` rated Hedgerow Guard and
  Rumor Control at 80 power, twenty times the next card. Flag-shaped mods are now rated flat.
- **The Capital City is where the Commons live.** 54 of 64 market cards rate Common, because a one-shot
  effect bought for Supply *and* a pledged animal simply cannot match a Character who produces every turn.
  That is a real statement about the market, not a modelling artefact, and it is the thing to look at if
  buying a non-Statue card should ever feel exciting on its own.

**The AI now rates cards from the model.** Both `marketCardValue` and `eventValue` in the heuristic agent were
hardcoded tables keyed by card id, with `default: 1.5` / `2.0` for anything unlisted — so the agent was blind
to all 104 new cards and played almost none of them. They now start from `cardPower` and correct for the board
(a free rehire with an empty Unemployment is worth nothing, an Unemployment effect with no legal target likewise),
plus a named bonus for this engine's auction tools. Events played per player-game went 2.6 → 4.0.

### Deck balance, 480 games per market, seed 4400, all ordered deck pairings

| Deck | First Boroughs | Boom Town | Hard Times | Founders' Fair |
| --- | ---: | ---: | ---: | ---: |
| Burrow & Bloom | 48.1% | 46.9% | 43.1% | 43.8% |
| Paws & Papers | 54.4% | 55.0% | 56.3% | 54.4% |
| Bramble & Bristle | 62.5% | 58.1% | 60.0% | 55.0% |
| Ripple & Rune | 50.0% | 47.5% | 44.4% | 49.4% |
| Lantern & Ledger | 51.3% | 51.3% | 53.1% | 51.9% |
| Root & Rampart | 33.8% | 41.3% | 43.1% | 45.6% |
| Seat balance (P0) | 49.6% | 50.2% | 51.0% | 48.5% |

The spread narrowed from 37 points (33–70% across four decks) to 18 (41–59% across six), which is the deck
balance pass that observation 1 below asked for — though it was rarity and curve work, not a rules change.
Two decks were rebuilt twice during the pass: Root & Rampart opened at 17.5% because its curve was top-heavy
(only five cards at cost 0–1), and Ripple & Rune at 42.5% on a hand of all-Common Events. Bramble & Bristle
is now the best deck and Root & Rampart still the worst; the honest read is that a two-species deck built from
three boroughs' leftovers (Root & Rampart is Badgers and Rabbits borrowed from three other decks) is harder to
make coherent than one with its own borough.

Seat balance holds in all four markets, essentially every game is still decided by Statues, and card
conservation holds over 200 random-vs-random games across all four Market Decks (`npm run invariants`).

## Headline results, before the expansion (480 games per market, seed 4400)

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

1. **Deck balance was the biggest open problem** (largely addressed by the rarity pass above; the numbers in
   this observation are the pre-expansion ones). **It got worse with the auction rewrite.** Over 480 games per market the four printed
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
- The card set doubled to 208 cards, sorted by power/cost rating, with a rarity on every card and rarity-based
  copy limits (`deckbuilding.maxCopiesByRarity`, 3/3/2/1/1).
- Two new printed decks (Lantern & Ledger, Root & Rampart) and a fourth Market Deck (Founders' Fair).
- The heuristic AI's card valuations were replaced by the power model, so it understands new cards.
- The heuristic AI learned walk-away ceilings (it folds once the price passes what a card is worth), to price a
  pledged animal as lost for the whole war rather than for a turn, and to weigh the half-forfeit risk of entering
  a war it may not finish.

## Still open

- Bramble & Bristle (≈59%) against Root & Rampart (≈41%) is the remaining deck-balance gap.
- Whether non-Statue Market cards should be worth more: the model says 54 of 64 are Commons, and the AI's own
  ratings agree with it.
- Whether the endgame Statue auction wants a cap, or whether running out of animals is limit enough.
- Whether First Boroughs should carry a single Unemployment source so its recovery cards are live.
