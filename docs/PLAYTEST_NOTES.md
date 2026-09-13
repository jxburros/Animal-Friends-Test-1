# Playtest notes (prototype, automated)

Method: `npm run playtest -- --games 360 --seed 101 --decks all --market all`, heuristic AI on both
sides, rotating every ordered deck pairing across all six Market Decks. Numbers are from the current
`spec/` after the v0.5.0 pass.

## v0.5.0 — the auction rewrite, two-tier Statues, species charters

The headline change is that **games are now close**. The old design was decided around halfway and
then played out: over half of all games ended 5–0 or 5–1. The two-tier Statue price fixed that.

| Loser's final Statues | 0 | 1 | 2 | 3 | 4 |
| --- | ---: | ---: | ---: | ---: | ---: |
| before (v0.4.0) | 23% | 27% | 22% | 10% | 18% |
| **after (v0.5.0)** | **1%** | **9%** | **18%** | **30%** | **41%** |

71% of games now end 5–3 or 5–4. The winner stops being tied-or-behind only about three quarters of
the way through, against under half before, so the race stays live into the endgame.

### What each change did, measured

**The pledge ladder** (your Nth pledge must cost at least N; cost-0 animals cannot bid) replaced the
growing minimum increment. Longest auction seen: **36 bids → 11**. Average rounds when contested
3.31. Auctions converge because a Mayor runs out of *curve*, not out of money — which is the point,
and it is why removing the increment was safe.

Removing the increment on its own was not: measured alone it left the longest auction at 35 bids and
made late-game Supply inflation *worse*. The two changes only work as a pair.

**Two-tier Statue pricing** (10 below two Statues held, 20 at or above) is what produced the table
above. It also raises the average winning bid from 7.7 to about 11, and because the fifth Statue is
always bought at the high tier, the game-winning purchase is the hardest one in the game.

**No forfeiture.** Losing bidders are refunded in full. The ladder already punishes a bid you cannot
follow through on, by costing you an expensive animal for the whole auction. This deleted escrow
accounting, the half-rounding rule, and the old Statue of Harmony burden.

**Species charters.** Before this pass, species were mechanically indistinguishable: mean pairwise
similarity of their effect profiles was 0.78, with Rabbit/Cat at 0.98. After the rework it is **0.27**,
with no pair above 0.86. `npm run identity` measures this and fails the build if it regresses.

**Power creep gate.** The Many Hats expansion was rating 17% richer than the base set. The same
script now fails above 8%; Many Hats was trimmed to 1.06×.

### Seat balance and game shape

| Measure | v0.5.0 |
| --- | --- |
| Seat balance (P0 win rate) | 50.6% |
| Game length (mean turns) | 32.3 |
| Games decided by Statues | 100% |
| Statues claimed per game | 8.00 of 9 |
| Contested auctions | 2.00/game |
| Bidding rounds when contested | avg 3.31, longest 11 |
| Supply forfeited by losers | 0 (rule removed) |
| On-reveal cards fired | 3.44/game |

Card conservation holds over 200 random-vs-random games across all six Market Decks
(`npm run invariants`), now counting Buildings and hired animals as market cards that came to rest.

## Still open

1. **Deck balance is the remaining problem, and it did not improve.** The six rebuilt decks land at
   Burrow & Bloom 63%, Whisker & Willow 60%, Paws & Papers 55%, Bramble & Bastion 49%, Ripple & Rune
   37%, Root & Rampart 36% — a 27-point spread against 26 points before the pass.

   The diagnosis is documented because it is more useful than the number. Win rate tracks **Events
   played per game** almost exactly (the top deck plays 10, the bottom 3), and Events played tracks
   raw economy: the winning decks simply recruit more, work more shifts and earn more Supply. Two
   fixes were tried and measured:

   - Making the deck builder check that an Event's requirements can actually be paid by the deck's
     own Characters, rather than merely matching its identity. This lifted the worst decks several
     points — a real deck-construction bug, now fixed.
   - An economy floor: every deck must hold at least 22 cards that produce Supply or draw. This
     lifted Bramble & Bastion from 34% to 59%.

   What remains is that some species charters are simply worth more than others in this set. Notably
   **the power model is currently anti-correlated with deck win rate**: it rated Bramble & Bastion
   the strongest deck while it won least. The cause is that the model priced protection and shock
   resistance as though there were much to defend against, when seven cards in the whole set send a
   Character to Unemployment. Those values were repriced down, which helped, but the deeper answer is
   content: **the set needs real interaction before defensive species can be worth their charter.**

2. **Supply still inflates**, and removing the forfeiture made it worse by deleting the game's largest
   sink (about 47 Supply per game). Buildings are the designated replacement sink and are now in the
   set, but the AI buys them rarely; they need pricing work and the agent needs to value permanence
   properly before this can be called fixed.

3. **The heuristic AI was retuned for the ladder but not re-tuned from scratch.** It now prices the
   ladder rung it is about to spend, penalises over-qualified pledges, and answers the new prompts,
   but its weights were fitted to the old game. Every number here understates how tight human play
   would be.
