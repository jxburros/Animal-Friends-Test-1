# Playtest notes (prototype, automated)

Method: `npm run playtest -- --games N --decks all --market all`, heuristic AI on both sides, walking
the full cross product of every ordered deck pairing and every Capital City. The set the harness runs
over has changed several times, so each section below says what it measured: the v0.13.0 run at the
top is one run of 1080 games over ten decks and four Capital Cities, the v0.12.0 run is one run of
1260 games over fifteen decks and three Capital Cities, v0.7.0 was one run of 1120
over eight decks and seven markets, and the v0.6.0 figures further down are the **mean of three
independent runs** of 720 games with `origin/main` measured on the identical harness.

## v0.13.0 — a deck per species, and four Capital Cities

One run of `npm run playtest -- --games 1080 --decks all --market all`: the full cross product of the
90 ordered pairings of the ten printed decks and all four Capital Cities, heuristic AI on both sides.
A single run, not the mean of three, so read the deck figures as ±3 points.

The roster this measures is a different shelf from the one above. The twenty-five decks of the v0.12
passes — fifteen two-species towns and ten written around a Legendary — were retired and replaced by
**ten decks, one for each species**, and the three Capital Cities by four new ones.

**Deck balance: 36.1 points of spread**, Furrow & Warren (Rabbits) at 71.3% and Margin & Pantry (Mice)
at 35.2%. That is wider than the 19.0 the fifteen mixed towns managed, and it is the species charters
showing through rather than a builder fault: a printed deck is now one species, so Rabbits arriving in
crowds and Hedgehogs nobody can touch are no longer averaged against a second species, and the Owl
hole — "wise, awake and poor" — is the whole of Dome & Dusk's economy. Measured on the same harness
the retired twenty-five span 34.4% to 73.3%, so the shelf is no less even than the one it replaces.

| Deck | Species | Win rate |
| --- | --- | --- |
| Furrow & Warren | Rabbit | 71.3% |
| Hedge & Holiday | Hedgehog | 69.4% |
| Cache & Kitchen | Squirrel | 60.2% |
| Gavel & Greasepaint | Fox | 51.4% |
| Bin & Barter | Raccoon | 47.7% |
| Current & Counter | Otter | 46.8% |
| Lens & Lathe | Cat | 44.4% |
| Dome & Dusk | Owl | 38.0% |
| Bench & Bylaw | Badger | 35.6% |
| Margin & Pantry | Mouse | 35.2% |

**No Capital City decides a game.** Over 270 games each, the first seat wins 41.9% on The Grand
Exchange, 50.4% on The Hard Frost, 51.9% on The Open Hiring and 49.6% on Guild Row.

**Games finish.** 1077 of 1080 ended on Statues, mean length 36.2 turns (median 34, longest 80). Card
conservation holds over 200 random-vs-random games across all four Capital Cities (`npm run
invariants`).

**Throughput still predicts nothing about the spread here.** The ten decks sit between 42.0 and 54.5
shift throughput and the two strongest are not the two fastest — what separates them is what their
species does, which is the intended reading of a roster written one species at a time. Raising the
throughput floor from 42 to 50 was tried and made the spread slightly worse (37.5 points), so the
floor stands where the fifteen-deck pass left it.

## v0.12.0 — fifteen decks, three Capital Cities, and a floor that bites

One run of `npm run playtest -- --games 1260 --decks all --market all`: the full cross product of the
210 ordered pairings of the fifteen printed decks and all three Capital Cities, heuristic AI on both
sides. A single run, not the mean of three, so read the deck figures as ±3 points.

This pass followed the six-deck, two-market pass straight away and rebuilt on top of it: the six
identities settled there keep their names, species and studies and are six of the fifteen here.

**The decks were rebuilt to show the collection rather than to win with it.** Copies are capped at two
(one for a Super Rare), the roster covers all ten species and all eight studies, Town Buildings are in
a printed deck for the first time, and a card no earlier deck has taken wins every tie in the builder.
The printed decks between them now reach **249 of the 380 cards a deck may legally hold (66%), against
123 (35%) after the six-deck pass** — every Town Building, and the fifteen decks are not all the same forty cards.

**Deck balance: 19.0 points of spread**, Tin & Tally at 59.5% and Towpath & Bazaar at 40.5% — tighter
than the 24.4 the v0.6.0 pass managed over six decks, across fifteen. Games finish: all 1260 ended on
Statues, mean length 35.4 turns.

That figure is the one part of this pass that came out better than either half of it on its own. Built
on fifteen fresh identities the spread was 31.6 points; keeping the six identities the six-deck pass
had already settled by playtest, and adding nine around them, took it to 19.0. The six were tuned
against a different builder and their printed lists here are not the ones that pass measured, so what
carried over was the *pairings* — which two species and which two studies a deck is written for, which
is most of what a deck's power level is.

**The economy floor had stopped biting, and that was most of the spread.** The v0.6.0 floor counts
*cards* that produce Supply or draw. Once a Character's shift was counted as economy — which it plainly
is, and which the old rule missed entirely — almost every Character qualified and the floor was met by
accident. The first rebuild measured at **49.5 points of spread**, and the cause was legible:

| | corr. with win rate |
|---|---|
| shift throughput (Σ `output / delay` over the deck's Characters) | **0.78** |
| Characters in the deck | 0.70 |
| Events in the deck | −0.70 |
| total power of the deck's cards | 0.26 |
| Supply the deck's curve can pledge | 0.01 |

The three decks below 32 throughput won 19%, 21% and 35%, and **all three were Owl decks** — the Owl
charter working exactly as written ("an Owl town is wise, awake and poor"). A species hole is a thing
to build around, not a thing to print a losing deck about, so the builder gained a **throughput floor**
of 42: a deck short of it trades its least useful Events for the best earners it can reach, from
outside its own two species if that is what it takes. That took the spread from 49.5 to 31.6, lifted
every Owl deck by 12 to 17 points, and dropped throughput's correlation with win rate from 0.78 to
0.25 — which is the point. Folding in the six settled pairings then took it the rest of the way to
19.0, and both Owl decks in the merged roster now sit within six points of even (Lamp & Lens 44.0%,
Warren & Watch 56.5%). What is left is species identity rather than deck construction.

**Three Capital Cities, and none of them decides the game.** The Founders' Fair deals from the whole
market catalogue (88 lots), the Lean Winter leans on weather and Ordinances with a floor of six
on-reveal cards in twenty-six, and the Hiring Fair on animals to take on and roofs to put up. Each
quarries twelve of the fifteen virtues, overlapping but not equal, so which monuments are on the
table is part of where you chose to play. Seat advantage
across them runs 46.7% / 52.9% / 51.3% for the first player, which is the same seat noise the rest of
the harness shows.

Under *random* agents the three markets finish 82%, 70% and 78% of games inside the turn cap. Hard
Times being the hardest to finish is the market working as printed; a random agent never clears an
Ordinance and never rebuilds a town efficiently, and under the heuristic all three finish.

Card conservation holds over 200 random-vs-random games across all three Capital Cities
(`npm run invariants`). Putting Town Buildings in decks turned up a latent bug in that census and in
`test/determinism.test.mjs`: a Building raised out of a player's own deck was being counted as a market
card. No deck had ever held one, so nothing had ever noticed.

## v0.7.0 — Night Shift: Owls, Science, and the Cat's trick

One run of `npm run playtest -- --games 1120 --decks all --market all --seed 2026`: the full cross
product of 56 ordered pairings of the eight printed decks and all seven Market Decks, heuristic AI on
both sides. A single run, not the mean of three, so read the deck figures as ±3 points.

**The set grew by 86 cards and nothing broke.** 100% of games ended through Statue victories (none hit
the turn cap), mean length 35.5 turns against 35.3 in v0.6.0, 10.7 recruits and 209 Supply earned per
player-game, 6.1 on-reveal cards a game. 300 randomized games passed the conservation, orientation,
nonnegative-economy and escrow invariants across every pairing and market.

**The Cat's signature was a no-op, and now is not.** Building Comet exposed it: "Busy, once per game:
readies itself" was only ever offered from upright, where going Busy and standing back up is nothing, and
the effect could not find its own stack through the Busy action's context anyway. It is now offered only
from Busy, mid-shift or 180°, once, and readying a working Cat cashes its shift. The power model stopped
weighting a once-per-game effect as a repeating Busy ability, which re-rated Mittens (Legendary → Rare),
Pippa, Herb Cook and Thimble, Sailmaker (Rare → Uncommon). No printed deck became illegal.

**The Owl is the most distinct species in the set.** `npm run identity`: similarity 0.00 to Badger, and
the mean across all 45 pairs fell from 0.29 to 0.25, because the wake-up call and the deck scry are verbs
nobody else has. The creep gate held at 1.06× the base set after eleven cards were trimmed in development
(mostly Masters' 2 → 4 shifts becoming 2 → 3).

### Deck win rates

| Deck | Win rate | as P0 / as P1 |
| --- | ---: | --- |
| Burrow & Bloom | 58.9% | 55.7% / 62.1% |
| Paws & Papers | 57.5% | 52.1% / 62.9% |
| Steam & Starlight ✦ | 53.9% | 52.1% / 55.7% |
| Moon & Mocha ✦ | 53.2% | 49.3% / 57.1% |
| Bramble & Bastion | 51.4% | 47.9% / 55.0% |
| Whisker & Willow | 45.0% | 39.3% / 50.7% |
| Root & Rampart | 41.4% | 36.4% / 46.4% |
| Ripple & Rune | 38.6% | 37.1% / 40.0% |

Spread 20.3 points across eight decks (24.4 across six in v0.6.0, though that figure was a mean of three
runs). The two new decks land in the middle of the field, which is where an expansion deck should land.
Head to head in the Night Market over 400 games with seats swapped, **Steam & Starlight took 62%**: the
Badgers' 2 → 3 and 3 → 6 shifts out-earn a town of Owls and Cats, which both charters say should happen
(Owls do not earn; Cats do not co-operate), but it is the widest printed head-to-head and the first thing
to look at in a balance pass. Night Shift, the Owl Event ("one of your Characters turns one step toward
upright, then draw 1 card"), was the second most played card in the whole set at 0.83 a game; Coffee
Round, Owl Post and Telescope Hire were bought about as often as the familiar cards around them, and The
Late Shift and the Night Market itself were bought least.

**Seat balance** stays with the second player, 53.8% to 46.3%, as in v0.6.0.

## v0.6.0 — the town cap, three-tier Statues and live Unemployment

Two measuring tools were wrong, and both had been quietly distorting the published numbers. Say this
first, because it invalidates figures printed in the v0.5.0 section below.

- **`scripts/playtest.mjs` indexed the deck pairing and the Market Deck on the same counter.** There
  are 30 ordered deck pairs and 6 markets, and 6 divides 30, so **every deck pairing was only ever
  played on one market**. Five sixths of the matrix was never sampled, and what the notes called a
  deck's win rate was really its win rate on a single market. The harness now walks the full cross
  product. **The 27-point deck spread reported for v0.5.0 is an artefact of this bug**; re-measured
  properly, `origin/main` had a spread of 33.2 points.
- **`scripts/invariants.mjs` never counted hired Market animals** that reach a player's deck by way of
  a Town Dump reshuffle — which laying off makes common.

### What the pass did, measured

| Measure | origin/main | after |
| --- | ---: | ---: |
| Deck win-rate spread | 33.2 pts | 24.4 pts |
| End-of-game Supply per player | 56 | 51 |
| Upgrades per game (both players) | 0.19 | 2.69 |
| Recruits per player | 14.1 | 10.4 |
| Mean turns | 31.9 | 35.3 |

**The town cap is what made upgrading exist.** A town holds ten animals, counting those at work,
those pledged into an auction and those face down in Unemployment. With an unlimited field, recruiting
a second animal always beat improving the one you had, and upgrades ran at **0.19 a game across both
players** while the set prints a second version of all 38 named Characters. They now run at **2.69**,
of which 2.41 are in-town upgrades. Recruits fell from 14.1 to 10.4 per player, which is the same
change seen from the other side: a place in town is now a thing worth spending on twice.

**Unemployment is a live mechanic.** A new shared verb — each Mayor lets one or two animals go,
choosing for themselves — and six new cards, weighted to each market's printed character (Hard Times
carries 13 shocks; Founders' Fair keeps its fair weather at 2 and takes only the recovery cards).
Unemployment events now run **3.8 a game**, against about none before. This is what Hedgehog's
*protection* and Badger's *endurance* charters were printed to answer, and until now had almost
nothing to answer.

**The Statue tier is charged at resolution**, not when the auction opens. Several auctions run at
once, so without this a Mayor holding three Statues could open auctions on two of them in the same
turn, lock both in at the middle tier, and win the game without ever paying the top tier — exactly
the purchase the third tier exists to make expensive.

**Works in the Square** blocks all Statue purchases until two animals have been put to work clearing
it. One Mayor can finish the job alone, which is what stops it deadlocking: blocking Statues hurts
whoever is closest to winning, so a rule requiring both Mayors to pay would let the trailing one
refuse forever. Cleared **0.41 times a game**.

**The display now ages at the start of the second player's turn.** Whoever the aging fires for gets
first sight of the replacement card, and that edge belongs to the Mayor who moves second: on a matched
comparison it moved seat bias from +2.8 to −0.7.

**Buildings finally pay for themselves.** The power model learned the game's second currency — an
animal is worth something for simply being one, and pays for the town place it occupies — and a
Building's repeating ability is now priced for permanence rather than at an Event's trigger weight.
Building power-to-cost ratios went from 0.13–0.57 to **1.01–1.27** while they remain the dearest cards
on the board. Five Many Hats cards were trimmed to hold the 1.08× power-creep gate.

### Deck win rates

| Deck | Win rate |
| --- | ---: |
| Paws & Papers | 60.7% |
| Burrow & Bloom | 60.4% |
| Bramble & Bastion | 52.9% |
| Ripple & Rune | 42.8% |
| Whisker & Willow | 42.4% |
| Root & Rampart | 40.8% |

**Read the spread honestly.** It is noisy run to run: the three runs after the pass gave 27.5, 22.1
and 23.8 points, and the three runs on `origin/main` gave 35.8, 31.7 and 32.1. The mean improvement of
about 8.8 points is larger than the noise and every run after the pass beat every run before it, so
this one is real — but 24.4 points is still nowhere near a solved problem.

### Seat balance and game shape

Seat bias is within a couple of points of even, and inside the run-to-run noise: the three runs after
the pass read −0.1, +1.9 and −2.6 (mean −0.3), and the three on `origin/main` read +0.1, 0.0 and +2.1
(mean +0.7). No single figure here should be quoted as precise.

| Measure | v0.6.0 |
| --- | --- |
| Mean turns | 35.3 |
| Contested auctions | 3.07/game (was 2.00) |
| Final Statue count | 5–4 in the plurality of games |
| Unemployment events | 3.8/game |
| In-town upgrades | 2.41/game |
| Promotions out of Unemployment | 0.07/game |
| Works in the Square cleared | 0.41/game |
| Lay-offs | ~0/game |

Lay-offs sit at about zero in AI play, and that is the intended shape: the agent can nearly always
rehire or promote instead, so the action is a guarantee against lockout rather than a frequent play.

Card conservation holds over 200 random-vs-random games (`npm run invariants`), now also counting
hired Market animals that reach a player's deck through a Town Dump reshuffle.

## v0.5.0 — the auction rewrite, two-tier Statues, species charters

Kept as the record of that pass. Every per-deck figure in it was measured with the broken harness
described above, so each deck's win rate is really its win rate on one market; the auction, game
length and identity figures are unaffected.

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

1. **Deck balance is still the biggest problem.** (Superseded by the v0.12.0 section above, which
   measures 31.6 points across fifteen decks and names what is left: species identity rather than
   deck construction. The diagnosis below is kept because it is the one that produced the economy
   floor, and because the floor stopping working is exactly how the problem came back.)

   24.4 points of spread is a real improvement on the
   33.2 on `origin/main` — every run after the pass beat every run before it — but nothing about it is
   solved: Root & Rampart still sits at 40.8% and Paws & Papers at 60.7%.

   The diagnosis is documented because it is more useful than the number. Win rate tracks **Events
   played per game** almost exactly (the top deck plays 10, the bottom 3), and Events played tracks
   raw economy: the winning decks simply recruit more, work more shifts and earn more Supply. Two
   fixes were tried and measured:

   - Making the deck builder check that an Event's requirements can actually be paid by the deck's
     own Characters, rather than merely matching its identity. This lifted the worst decks several
     points — a real deck-construction bug, now fixed.
   - An economy floor: every deck must hold at least 22 cards that produce Supply or draw. This
     lifted Bramble & Bastion from 34% to 59%.

   What remains is that some species charters are simply worth more than others in this set. The
   defensive species were the clearest case: the model priced protection and shock resistance as
   though there were much to defend against, when almost nothing in the set sent a Character to
   Unemployment. The v0.6.0 pass answered that with content rather than with a coefficient —
   Unemployment events now run 3.8 a game — but the decks have not been rebuilt against the new
   ratings. Bramble & Bastion did move, from near the bottom to 52.9%, once the rarity thresholds were
   re-derived against the finished set and the printed decks were rebuilt on the new ratings.

2. **Supply still inflates.** 51 per player unspent at the end, down only 5 from 56. The third Statue
   tier and the repriced Buildings were the two designated fixes and both helped less than hoped; the
   game still hands out more Supply than it has places to spend it.

3. **Promotions out of Unemployment are rare — 0.07 a game.** The mechanic works and is tested, but
   the queue is small and a promotion needs the right card in hand at the right moment. Either the
   queue has to be larger or the payoff more reachable before this path carries any weight.

4. **The heuristic AI was extended, not retuned.** It understands the new actions — laying off,
   promoting out of Unemployment, clearing the square, and valuing an in-town upgrade higher as the
   town fills — but its weights were fitted to the old game. Every number here understates how tight
   human play would be.
