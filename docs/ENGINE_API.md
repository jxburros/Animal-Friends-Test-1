# Engine API (src/engine)

The engine is a headless, deterministic, data-driven ES-module implementation of the rules in
`ANIMAL_FRIENDS_TCG_DESIGN_REFERENCE.md`. It runs unchanged in Node 22 and in browsers.
Rules constants come from `spec/game.json`; cards from `spec/maker_card_set.json`.

```js
import { createGame, playGame, playTurn, mulliganPhase, legalActions, applyAction, cardDef, topCard, cloneState } from './src/engine/index.js';
const state = createGame(rules, set, { seed: 42, decks: ['burrow-bloom', 'paws-papers'], names: ['You', 'Rival'] });
await playGame(state, [agent0, agent1]);          // runs to completion; state.winner = 0 | 1 | null, state.result
```

## Decks and the Market Deck

`createGame(rules, set, { seed, decks, names, market })` — `market` selects the shared Market Deck from
`set.marketDecks` (`mk-grand-exchange`, `mk-hard-frost`, `mk-open-hiring`, `mk-guild-row`; default: the first). Each entry of `decks` is either a deck id from the set or a
deck object `{ id?, name?, list: { cardId: count } }` (`resolveDeck`), which is how the Deck Workshop plays a
custom deck. `deckProblems(rules, set, list)` returns the deck's legality problems as player-facing sentences
(empty array = legal); `deckRules(rules)` exposes the limits from `spec/game.json` `deckbuilding`.

`set.marketDecks` is a list of `{ id, name, blurb, always, pool, poolSize }`; `resolveMarketDeck(set, ref)` picks one
and `buildMarketDeck` deals every `always` card (all nine Statues) plus a seeded random `poolSize` of `pool`, so a
Market Deck keeps one size while its contents vary per game. A plain array of card ids is still accepted, as is the
legacy single `set.marketDeck` field.

Card types: `character`, `event`, `townBuilding` (town decks); `statue`, `market`, `building`,
`marketCharacter`, `ordinance`, `disruption` (the Market Deck).

A town has `rules.buildings.maxPerTown` **Building places**, and `buildingSlotsUsed(state, pi)` counts
everything standing in them: `building` cards bought at auction, `townBuilding` cards built out of the deck,
and — when `rules.buildings.statuesOccupySlots` is set — the Statues in the Victory Row. `p.buildings` holds
`{ uid, cardId, source }` entries, `source` being `'market'` or `'deck'`; `addBuilding` demolishes one first
when the places are full (a market one to the City Dump, a deck one to its owner's Town Dump), and
`makeStatueRoom` does the same for a Statue that has just been won, failing when only Statues are left to
pull down. `legalActions` refuses to announce a Statue auction without room, and `resolvePurchase` checks
again at resolution, refunding the bid if the places filled up in between.

A `townBuilding` is played from hand with the `build` action: it pays `def.cost` and turns `def.build.animals`
upright Characters Busy without starting a shift, then stands in a Building place and works at once. A
`market` card printed `hold: true` goes to the buyer's hand instead of resolving, and is played later with the
`playHeld` action, free and without requirements. A `marketCharacter` joins the town as a Busy stack and, when
it would be unemployed, returns to the City Dump instead (`rules.market.characters`). An `ordinance` occupies
a display slot, cannot be announced on, and applies `cityRule` keys while it is there.

A `disruption` card is never displayed or bought. When `refillCity` deals one it goes to `market.revealQueue`
and dealing continues past it; `await flushReveals(state)` then resolves each one against both towns and moves it
to the City Dump. Every async caller that refills (`gainMarketCard`, `startPhase`) flushes; `createGame` sets
aside anything dealt during setup without resolving it.

## Agents

An agent is `{ name, choose(state, playerIndex, request) }` returning a value or a Promise. Requests:

| kind | fields | answer |
| --- | --- | --- |
| `resources` | `options: ['draw','supply']` | `'draw'` or `'supply'` |
| `action` | `options: Action[]` (always includes `{type:'endTurn'}`) | one of the options (you may change `bid` within `[minBid, maxBid]` on announce/challenge actions) |
| `pick` | `reason, from, options:[{uid,cardId,name,orientation?}], min, max` | array of uids |
| `order` | `reason, options:[{uid,cardId,name}]` (top of deck first) | array of all uids in new order |
| `confirm` | `reason, default` | boolean |

Invalid answers are replaced by a safe default, so agents never crash the engine. `pick` reasons:
`discard`, `ready`, `readyNextTurn`, `rehire`, `recruitFree`, `eventFromDumpToDeckBottom`, `eventFromDumpToHand`,
`topdeck` (asked of the *opponent*), `unemployOpponent`, `raiseBidTarget`, `demolish` (which Building to knock
down), `storeSupply`, `takeFromCityDump`, `protect`, `moveShiftFrom`, `moveShiftTo`, `advance` (an Owl's
wake-up call: which Character turns one step toward upright), `scry` (`from: 'deck'`; which of the top
cards go to the bottom — `min` is 0, so an empty answer keeps them all),
`giveToUnemployed` (which animal out of work is fed back into the town), `pair` (asked once or twice:
which two animals are put together), `eventFromOpponentDump` (`from: 'opponentDump'`).
`confirm` reasons: `raiseBid`, `swapBuilding`, and `mulligan` (answered `true` to throw the opening hand back; the request
carries `hand`).

`await mulliganPhase(state)` runs the free single mulligan before the first turn. `playGame` calls it; a
caller driving `playTurn` itself should call it first.

## The pledge ladder

`pledgeMinCost(state, pending, pi)` is the cost a Character must have to be that player's next pledge in
that auction (`pending` is `null` for opening one): their Nth pledge must cost at least N, shifted by any
displayed Ordinance and by the Statue of Harmony's burden. `canPledge(state, pi, pending, stack)` applies
it to a stack, and `hasPledgeAvailable(state, pi, pending)` says whether they have anyone left who could
answer. `legalActions` already filters by this, so an agent never sees an illegal pledge.

`cardCostFor(state, pi, cardId)` is what a card costs *that* player — the two-tier Statue price is read
from the bidder's own Victory Row, so the two Mayors can face different prices in the same auction.

`cityRule(state, key)` sums the rule changes of the cards currently displayed
(`pledgeLadderDelta`, `statueCostDelta`, `buildingCostDelta`, `noRaises`, `blockStatuePurchase`).
Ordinances are the usual source; a **marketCharacter** may also carry a `displayed` ability, so an
animal can work the door of the Capital City until somebody hires them out of the way — buying them
is how the rule is removed. No other card type is read, so a `displayed` key on a Building or a
Character is a no-op.

`loseSupplyAndNotify(state, pi, n, opts)` is the async form of `loseSupply`: it fires the
`onSupplyLost` trigger for the Mayor who actually lost something, and never for a loss of nothing.
It does not cascade — an ability that answers a loss by causing one does not re-enter the hook.
`everyoneLosesSupply` and `giveSupplyToOpponent` both route through it.

`ageCity(state)` discards the oldest displayed card nobody is bidding on and refills; `startPhase` calls
it once a round.

## Actions (Actions phase)

```
{type:'endTurn'}
{type:'recruit', cardUid, cardId, cost}                       // new stack
{type:'recruit', cardUid, cardId, targetUid, cost, upgrade:true} // upgrade same-name lower-cost stack (pay difference)
{type:'work', charUid, cardId, delay, output}
{type:'ability', charUid, cardId}                             // Busy ability
{type:'playEvent', cardUid, cardId, characters:[charUid...], cost}
{type:'announce', cardId, charUid, bid, minBid, maxBid}       // opens an auction; bid escrowed
{type:'raise', pendingId, cardId, charUid, bid, minBid, maxBid} // outbid an auction you are not winning
{type:'rehire', cardUid, cardId, cost}
```
`legalActions(state, pi)` enumerates these (one canonical character assignment per event; min bid per
announce/raise — raise `bid` if you want). `applyAction(state, pi, action)` validates and applies.

## State shape (serialisable; `state.set` and `state.rules` are shared data)

```
state = { seed, rng, turnNumber, active, phase, players:[P,P], market, log:[{turn,player,text,fx?}], winner, result }
P = { index, name, deckId, deck:[Card], hand:[Card], town:[Stack], events:[{uid,cardId,remaining}], dump:[Card],
      unemployment:[Card], victoryRow:[cardId], buildings:[cardId], supply, escrow, mods:[{key,value,expires,filter?}],
      tokens:{ 'species:Rabbit'|'study:Food'|'building': count }, turn:{...counters}, stats }
Card  = { uid, cardId }                       // cardDef(state, cardId) gives the definition
Stack = { uid, cards:[Card top-first], orientation:0|180|270, shift:null|{remaining,output}, hasBeenUpright,
          readyNextTurn, lockedBid,  // lockedBid = the auction this Character is standing in, if any
          stored,                    // Supply put by on this card (a Squirrel's cache)
          protectedUntil,            // turn number until which an opponent cannot target it
          selfReadyUsed,             // a Cat's once-per-game self-ready
          shiftsWorked,              // shifts finished here; a decaying shift pays less each time
          termRemaining }            // turns left on a retained hire (leavesAfter)
market = { deckId, deckName, deck:[cardId], city:[cardId], cityDump:[cardId], outOfPlay:[cardId], revealQueue:[cardId],
           pending:[{id, cardId, announcer, high, bid, bonus, committed:[n,n], chars:[[uid],[uid]],
                     rounds:[{player,bid,bonus,turn}], unchallengeable, turnAnnounced, lastBidTurn}] }
```
Helpers: `topCard(state, stack)`, `canAct(stack)` (upright and not on a shift), `rankOf(rules, cost)`,
`opponentOf(pi)`, `statueCount(state, pi)`, `getMod/hasMod(player, key)`, `hasPassive(state, pi, key)`,
`recruitCost`, `rehireCost`, `eventCost`, `minBidFor`, `raiseMinBid`, `raiseIncrement`, `raisePayment`,
`forfeitOf`, `releaseBidders`, `eventReduction`, `findEventAssignment`, `serialize/deserialize/cloneState`.

## Log entry `fx` field (presentation layer)

Log entries may carry an optional `fx` object describing what happened, for animation or presentation. The engine stores but never reads `fx`; it exists for a UI layer like `src/ui/choreo.js` to animate events. `fx` kinds and their fields:

| kind | fields |
| --- | --- |
| `gameStart` | (none) |
| `turnStart` | player, turn |
| `phase` | player, phase, choice |
| `supply` | player, amount, why? |
| `draw` | player, count, uids |
| `discard` | player, uid, cardId |
| `ready` | player, uids, advanced |
| `readyNextTurn` | player, uid |
| `shiftStart` | player, uid, delay, output |
| `shiftTick` | player, uid, remaining |
| `shiftDone` | player, uid, output |
| `ability` | player, uid, cardId |
| `recruit` | player, uid, cardUid, cardId, cost, upgrade, orientation? |
| `playEvent` | player, uid, cardId, limited, chars |
| `announce` | player, cardId, uid, bid, bonus? |
| `raise` | player, cardId, uid, bid, bonus?, round, cancelled |
| `raiseBid` | player, cardId, amount |
| `resolve` | cardId, winner, loser, announcer, challenger, winningBid, rounds, tied, forfeit, refund |
| `forfeit` | player, forfeit, refund, cardId |
| `disruption` | cardId |
| `fizzle` | cardId, player, winner |
| `marketGain` | player, cardId, statue, disposal |
| `refill` | cardIds |
| `reshuffleMarket` | (none) |
| `sweep` | (none) |
| `rehire` | player, uid, cardUid, cardId, cost |
| `topdeck` | player, uid |
| `dumpToHand` | player, uid, cardId |
| `dumpToDeck` | player, uid, cardId |
| `peekDeck` | player, count |
| `coinFlip` | player, heads, cardId |
| `pair` | player, uids, bonus |
| `peekMarket` | player, cardIds |
| `unemploy` | player, stackUid, uid, cardId, knockedDown? |
| `shield` | player, amount?, uid? |
| `trigger` | player, cardId, uid?, source |
| `mod` | player, key, value |
| `reshuffleDeck` | player |
| `eventExpire` | player, uid, cardId |
| `turnEnd` | player |
| `win` | player |

Turn flow: `playTurn(state)` runs Start (settle auctions this player is winning) → Resources (ask) →
Ready (orientation advance) → Actions (ask until `endTurn`) → End (shifts tick and pay out, Limited Events tick,
`onTurnEnd` fires).

An auction settles at the start of the **high bidder's** turn: because the players alternate, still leading when
your own turn comes round means your rival had a turn and declined to answer. Either player may `raise` on their
own turn as long as they are not already the high bidder; each raise pledges another upright Character, which stays
Busy (`stack.lockedBid`) until `releaseBidders` frees it at resolution. The winner pays everything they escrowed;
the loser forfeits `forfeitOf(...)` — half, rounded up — and is refunded the rest.

Mod keys (player.mods): `recruitDiscount`, `rehireDiscount`, `eventCharReduction`, `unchallengeable`,
`cancelNextChallenge`, `shiftBonus`, `extraAdvance`, `unemploymentShield`, `lossShield`, `challengeDiscount`,
`skipNextAdvance`.
Passive keys: `winTiesAsChallenger`, `blockOpponentBidRaise`, `firstAnnounceMinBidMinus1`, `masterDelayMinus1`,
`eventCharReductionPerTurn`, `firstBidPlus1`, `townShiftBonus` (carries a `value`), and the Statue burdens `opponentRehireDiscount`,
`opponentFirstBidPlus1`, `apprenticeEntersBusy`, `eventCostPlus1`, `resourceSupplyMinus1`, `losingBidsPayFull`,
`townRecruitDiscount` (carries a `value`) and `opponentPledgeLadderPlus1`.

Opponent-facing ops: `unemployOpponentCharacter`, `opponentTopdeckFromHand`, `makeBusy`, `peekOpponentHand`,
`eventFromOpponentDump`, `opponentLosesSupply`, `opponentChoice`.

Town Dump ops: `eventFromDumpToHand`, `eventFromDumpToDeckBottom`, `cardFromDumpToHand`.

Token ops: `gainToken`, `spendToken` (see **Tokens** below).

Disruption effect ops (global, both players): `allCharactersToUnemployment`, `endAllShifts`, `everyoneLosesSupply`,
`everyoneGainsSupply`, `everyoneDraws`, `everyoneDiscardsDownTo`, `blockNextReady`, `everyoneRehiresFree`.

## Card data: the remade collection's verbs (v0.7.1)

Six additions, each written because a character in `spec/maker_card_set.json` needed something the
engine could not say (`docs/WRITING_A_CHARACTER.md`; the wish that produced each one is kept in that
character's `wantedVerbs`). Nothing in the printed set uses them, so every printed rating is unchanged.

- **`makeBusy`** — the mirror of `advanceCharacter`, pointed across the table: an opponent's Character
  turns one step *away* from upright. Takes `count`, `filter` and `optional`. It keeps
  `advanceCharacter`'s manners: never a Character mid-shift, never one pledged into an auction, never
  one a Hedgehog has quilled (`isProtected`), and never past the entry face.
- **`scryDeck: { to: "dump" }`** — what you do not want goes to your Town Dump instead of the bottom of
  your deck. Without `to` the verb behaves exactly as it always has.
- **`protectCharacter: { filter: { notSelf: true } }`** — the quills go around another Character. Without
  it the source protects itself whenever it legally can, as before.
- **Filtered mods** — `addMod` may carry a `filter` (`study`, `studyIn`, `species`, `type`, `maxCost`)
  naming what the mod applies to. `getModFor` / `consumeModFor` in `state.js` total and spend only the
  mods that match the card in hand; an unfiltered mod matches everything. `recruitCost` uses them, so a
  recruit discount can be good for one study and not another.
- **`buildingDiscount`** — a mod key `cardCostFor` applies to Buildings only, alongside an Ordinance's
  `buildingCostDelta`. The one Capital City price a Character may move.
- **`leavesAfter: N`** on a card — a hire with a term. A `marketCharacter` carrying it arrives with
  `stack.termRemaining`, which ticks down in `endPhase` (where Limited Events expire) and sends the
  animal back to the Capital City's City Dump when it runs out. A Character pledged into an open
  auction does not tick: the town cannot send home what it has bid. `power.js` caps such a card's
  ability runs at the term and discounts the whole card by `termFactor`.

## Card data: the second round of wishes (v0.7.2)

The four `wantedVerbs` the first round left unbuilt, and the same rule applies: nothing in the
printed set uses any of them, so every printed rating is unchanged.

- **`buildingsAtMost` / `buildingsAtLeast`** — conditions reading how many Buildings this Mayor has
  actually raised (`buildingsBuilt` in `state.js`: Capital City Buildings and Town Buildings, *not*
  the Statues, which are bought rather than built). Bella's wish: a naturalist at her best in a town
  that has put nothing up.
- **`peekOpponentHand`** — look at the rival's hand. Information only: nothing moves, and the rival is
  told they were read (`fx.kind === 'peekHand'`), because a card that looked without saying so would
  be a card nobody could play around. The looker keeps it on `player.knownOpponentHand`.
- **`shift: { decay, minOutput }`** on a card — the animal burns out. Every shift they work pays
  `decay` less than the one before, down to `minOutput` (0 when it is not printed). The count lives on
  the stack as `shiftsWorked`, so an animal who never works never burns out and a fresh copy starts at
  the printed figure. `shiftOutputFor(def, stack)` is the one place that arithmetic happens;
  `legalActions` reports the decayed figure and `power.js` rates the shift on the average of the
  shifts the card will actually work (its `leavesAfter` term, or four).
- **`filter: { upgradesOwn: true }`** on a mod — the printer's rate, good only for a recruit that
  upgrades a Character the town already has. Whether a recruit is an upgrade is not a property of the
  card, so `recruitCost` passes it to `getModFor`/`consumeModFor` as context and `modFilterMatches`
  reads it there.

## Card data: the third round of wishes (v0.8.0)

The `wantedVerbs` the second round left unbuilt. Same rule again: nothing in the printed set uses any
of them, so every printed rating is unchanged.

- **`coinFlip`** — `{ do: "coinFlip", heads: eff, tails: eff }`. The borough's method for a call that
  will not come down on its own. It draws on the same seeded rng every shuffle uses, so a game is
  still replayable from its seed, and the toss is in the log (`fx.kind === 'coinFlip'`) rather than
  hidden inside the effect. Either branch may be left off: a flip with only `heads` is a card that
  does something half the time, which `power.js` rates at exactly half.
- **`giveToUnemployed`** — the baker's verb, and pointedly not a rehire. An animal in your own
  Unemployment is fed and turns back up **Busy**, and no Supply changes hands, so a rehire discount
  neither helps nor applies. Takes `filter` (`maxCost`, `cost`, `study`, `species`) and `optional`.
- **`pairCharacters`** — two animals worth more to each other. The source Character is one half and
  picks the other (an Event, having no stack, puts two of the town together); while both keep
  standing in the same town, each of their shifts pays `bonus` more. The bond is held on both stacks
  (`stack.pairedWith`, `stack.pairBonus`) and read back through the partner, so it lapses on its own
  the moment one of them is unemployed, upgraded away or sent home.
- **`townShiftBonus`** — a passive with a `value`: every shift this town finishes pays that much more
  while the rule is in force. `passiveTotal(state, pi, key)` in `state.js` is the general form of
  `hasPassive` for a passive that carries a quantity, and `completeShift` adds it alongside the
  one-shot `shiftBonus` mod and the pair bonus.
- **`swapBuilding`** — the yard's trade. One of this town's Buildings comes down (a bought one to the
  City Dump, a built one home to its own Town Dump) and a Building somebody else threw away goes up
  in the place it left. Nothing happens unless both halves can: a town with nothing up has nothing to
  trade, and a City Dump with no Building in it has nothing to trade for.
- **`eventFromOpponentDump`** — the one pair of hands that crosses the alley. Events go to their own
  town's Dump and stay there; this takes one out of the *rival's* and into your hand.
- **`gainToken: { per }`** — a chit per passenger rather than a flat handful. `per:
  "charactersReadied"` counts the Characters who have stood up in this town this turn (`p.turn.readied`,
  bumped by the Ready phase and by any effect that readies one); `per: "uprightCharacters"` counts who
  is standing right now. `count` multiplies it.

## Card data: the fourth round of wishes (v0.9.0)

The eight `wantedVerbs` the third round left unbuilt — every wish on the shelf that was still waiting
for one. Same rule as the three rounds before it: nothing in the printed set uses any of them, so
every printed rating is unchanged.

- **`peekMarketDeck: { reorder: true }`** — looking at the Capital City's deck ends with putting it
  back in a chosen order, the way `reorderDeckTop` does for a town's own deck. It uses the same
  `order` request, and without `reorder` the verb behaves exactly as it always has. Sage's wish, and
  the one verb in the collection that sets what *both* Mayors will be bidding on next, which is why
  `power.js` prices it at twice a plain look.
- **`townRecruitDiscount`** — a passive with a `value`, read by `recruitCost` through `passiveTotal`
  alongside the `recruitDiscount` mods. The difference is the whole point of it: a mod is a discount
  you are holding and the first recruit it applies to spends it; a passive is what hiring costs in
  this town while a particular animal is standing in it, and nobody spends a rate. `requiresUpright`
  makes it stop when they sit down. Eric's wish.
- **`cardFromDumpToHand`** — any card of yours in the Town Dump, not only the Events. Takes `count`,
  `optional` and a `filter` (`type`, `typeIn`, `maxCost`, `study`, `species`, `name`) for a card that
  should reach less far. `eventFromDumpToHand` stays the narrow verb and stays on the cards that only
  ever meant Events. Benjamin's wish.
- **`returnsToMarket: true`** on a card with `leavesAfter` — when the retainer runs out the animal
  goes to the bottom of the **Market Deck** instead of the City Dump, so the next time the deck comes
  round to them either Mayor may take them on again. A Character pledged into an open auction still
  does not tick. `power.js` pays it a little, because it is a chance and not a second term: the rival
  may be the one who takes it. Jake's wish.
- **`opponentPledgeLadderPlus1`** — a passive that raises the *other* Mayor's pledge ladder by a rung
  and leaves its own alone, read in `pledgeMinCost` beside the Statue of Harmony's burden. The
  displayed `pledgeLadderDelta` is a rule of the room and falls on everybody in it, whoever put the
  card there; this is the same rule written against one side of the table. Faustus's wish.
- **`addMod: { valuePer, max }`** — a mod's value counted rather than printed. `valuePer:
  "buildingsBuilt"` multiplies `value` by the Buildings this Mayor has raised (the same count
  `buildingsAtLeast` reads, so the Statues do not count), and `max` caps it. A rate that comes to
  zero adds no mod at all. `max` is not optional in practice: `power.js` rates a scaling mod on the
  row a Mayor usually has up and honours the ceiling, and a value with no ceiling is a card nobody
  can price. Velvet's wish.
- **`anchor: { species: true } | { study: true }`** on a Character — an **obscured figure**, and the
  one place in the collection where an upgrade is not a promotion. The ordinary rule is that a
  version may only be played over a cheaper card of the *same name*; a figure carrying an anchor may
  be played over by any dearer Character of its species (or of its study), whatever that Character is
  called. `upgradesOver` in `src/engine/actions.js` is the authority and both upgrade paths read it,
  so an anchored figure can be promoted out of Unemployment as well as upgraded in town. The cost is
  the plain printed difference, as every upgrade's is, and the figure still has to be the cheaper
  card: an anchor is a cheap place for a career to have started, never a discount on one. `power.js`
  pays the card for it (a study anchor a little more than a species one, because a study is what half
  the shelf does), so a figure rates above a vanilla body of the same cost.
- **`entersUpright: true`** on a card — the animal arrives ready, whatever the cost says. Entry
  orientation is otherwise read off the cost alone (`entryOrientation`) before the card is on the
  table, so this is the only thing that can say otherwise; it is read by the recruit action and by
  `recruitFromHand`, so a free recruit out of hand arrives ready too. The Statue of Patience's burden
  still sits such an animal down, because that is a rule of the town and this is a fact about one
  animal. `power.js` takes the entry turns off the card's opportunity cost, which is exactly what the
  field buys. Mandee's wish.
- **`opponentLosesSupply`** and **`opponentChoice`** — the two halves of Willow's wish. The first
  takes Supply off a rival (nothing on a Character could, before this: `everyoneLosesSupply` is a
  Disruption's shared shock and `giveSupplyToOpponent` runs the other way); it takes what is there
  and no more, and fires `onSupplyLost` for them, because a loss nobody is told about is one nobody
  can play around. The second puts branches on the table — `options: [{ label, effect }, …]` — and
  asks the **rival** which one happens; the branches are written from the playing Mayor's side, as
  they read on the card. `power.js` pays the card the least of its branches, because the rival picks,
  which is also the design rule: print two you would be happy with.

## Card data: the fifth round of wishes, and the game's first Supply sink (v0.12.0)

Two things here. The last two `wantedVerbs` anybody still wanted, and a mechanism the collection had
been missing rather than a card: an ability with a price on it. Unlike the four rounds before this
one, the changes here **re-rate cards already in the set** — a protection is worth more than it was,
because it now stops more.

### The two wishes

- **`rehireFromAnywhere`** — Gwen's wish, and the one hiring verb that does not read your own
  Unemployment and stop there. `from` names the queues a card may reach: `unemployment` (your own),
  `opponentUnemployment` (the rival's, who are nobody's while they are face down) and `cityDump`
  (hired help with no town to go back to). Left off, it reads all three. Takes `filter` (`cost`,
  `maxCost`, `minCost`, `study`, `species`, `name`), `free`/`discount`, `optional` and `orientation`;
  the animal arrives upright by default, and `onRecruit` fires for them, because they have just
  arrived. A full town is offered nobody: there is no counter to put them behind.

  An animal taken out of the rival's Unemployment is a **deck card changing hands**. That is why the
  card census counts deck cards across both towns rather than one at a time — `scripts/invariants.mjs`
  always did, for the Bin Round, and `test/determinism.test.mjs` now does too.

- **`protectCharacter: { everyone: true, turns: N }`** — Oatmeal's wish, built with the help to the
  rival kept rather than designed out. `everyone` shelters one Character in *each* town, both Mayors
  choosing their own, and `turns` is how many of that Mayor's turns the cover holds for (one by
  default, exactly as before).

  The shelter is also stronger than it was, for every card that already had one. A protected
  Character is no longer merely untargetable by an opponent's effect: **nothing takes them out of
  their town while the cover holds** — not a rival's removal, not weather that falls on both towns.
  `unemployStack` is the authority, and the one exception is their own Mayor, who may always let them
  go. `power.js` prices protection at 2.6 a turn with diminishing returns rather than 0.7, and pays a
  shared shelter 0.4 of a private one, which is what re-rated the eight Hedgehog cards in the set.

### A price on an ability

A Character's `busy` ability may carry **`cost: { supply: N }`**. `abilityFee` in `src/engine/actions.js`
reads it; `legalActions` does not offer an ability its Mayor cannot pay for (the shift is still
offered — a fee takes the ability off the table and nothing else), and `applyAction` charges it
before the effect runs and refuses a forged action that cannot be paid for. Only a `busy` ability may
charge: a trigger that fires on its own has nobody to ask for the money.

This is the game's first Supply sink that is not a purchase, and it is here because the playtest
notes' second open problem — 51 Supply a player unspent at the end — is a problem about *places to
spend*, not about earnings. An ability with a price is on the table every turn, competes with the
shift the animal would otherwise work, and is the only sink that scales with how rich a Mayor
actually is.

Pricing one needed two figures in `power.js`, both documented at their definitions:

- **`SINK_SUPPLY` (0.35)** — what a Supply handed over a counter is worth against one earned on the
  turn you wanted it. The model's unit is the second kind; a sink eats the first. Charging a fee at
  face value rates every sink below zero, which is the mispricing that left the game with no sinks.
- **`feeRuns`** — a free Busy ability is used whenever the animal is standing; one that costs ten
  Supply is used when a Mayor has ten Supply they would rather not have. The fee shortens the
  ability's life and never lengthens it, with one use as the floor.

`src/ai/heuristic.js` reads the fee too, through `feeCost(fee, supply)`: ten Supply out of a purse of
forty is most of the way to free and ten out of twelve is the whole turn. Without it the agent either
never pays a fee at all or empties its purse at the first counter it passes.

### The rest of the round

- **`searchDeck`** — the whole deck, not the top of it. `reorderDeckTop` and `scryDeck` both work the
  first few cards; this is the animal who goes and fetches the one you want. Takes `count`, `filter`
  (`type`, `typeIn`, `maxCost`, `study`, `species`, `name`), `optional` and `to: 'deckTop'`. The deck
  is shuffled afterwards whether anything was found or not, so a search never doubles as a free look
  at what is left. Every card printed with it charges Supply, deliberately: a search with no price is
  a deck that holds one card in four copies and draws it every game.
- **`peekMarketDeck: { toBottom: true }`** — having looked, send one of them to the bottom of the
  Capital City's deck. The only way in the collection to take a lot off the table before anybody can
  bid on it, and written for the animals who read the market rather than fight over it.
- **`lotDiscount`** — a mod, read by `cardCostFor`, that marks a lot down **for one Mayor only**. It
  moves the minimum bid, the announcement and the settlement together, exactly as an Ordinance does,
  and a `filter` of `{ type }` narrows it to one kind of lot. A lot is never priced below nothing.
- **`everyoneRehiresFree: { count: N }`** — how many each Mayor takes back. It is what makes
  `allCharactersToUnemployment` printable at all: a card that empties both towns and hands back one
  animal is the end of the game rather than a hard winter. One is the old behaviour and the default.
- **`CITY_RULE_VALUE` in `power.js`** — a `displayed` ability is now rated. An Ordinance is never
  bought and never in a deck, so this settles no rarity and no copy limit; what it does is let the
  balance scripts see a card that closes the Statue yard, which until there were Ordinances on the
  shelf the model had no opinion about. `value` is read as a magnitude, because an Ordinance that
  makes Statues dearer and one that makes them cheaper bend the same game by the same amount.

### The vocabulary is a two-way contract

`test/maker-cards.test.mjs` now asserts that **every name the engine interprets is spoken by at least
one card**, and that the Capital City rules and this round's verbs are each on two. The collection
carried ten unspoken names at once before this round — four Ordinance rules among them, with no
Ordinance on the shelf to say any of them — and nothing failed, because nothing fails when a card set
simply declines to use a feature. That is exactly why the test is worth having.

## Card data: the sixth round of wishes (v0.12.1)

The two `wantedVerbs` the fifth round left unbuilt, and the only two logged against characters added
after the printed collection rather than a remake of one: Winter's Capital City, and Yellow's
Unemployment. Both re-rate the one card apiece that carried the wish rather than anything already in
the set, because nothing printed used either name before this round.

- **`capitalCityExtraStalls`** — a `passive` key, read by the new `capitalCitySize(state)` in
  `state.js` rather than by `passiveTotal` alone: the display is shared, so the target `refillCity`
  deals to is the printed `setup.capitalCitySize` plus this passive's total **across both Mayors**,
  not just its owner. Winter wanted a sixth stall in the Capital City and there is no rule in
  `spec/game.json` a Character can move — `capitalCitySize` was fixed at setup and read nowhere else
  — so the fix is at the one place that reads it. A stall that stops (its animal sits down, if the
  passive carries `requiresUpright`, or leaves town) is never clawed back: `refillCity`'s existing
  `city.length >= target` guard already means a shrinking target simply stops the next refill short,
  the same way it always stopped a full display from over-dealing. `mk_winter_tv_scientist_5` carries
  it at `value: 1`, `requiresUpright: true` — the show has to be on the air.

- **`immuneToUnemployment: true`** — a fact printed directly on a card, read once, at the top of
  `unemployStack` in `effects.js`, ahead of `isProtected` and the `unemploymentShield` mod. Yellow's
  wish was unconditional: not a shelter that lapses at a turn boundary and has to be renewed, which is
  what `protectCharacter` already gave every Hedgehog on the shelf, but a printed guarantee that never
  expires and needs no ability to keep firing. It sits beside `entersUpright`, `leavesAfter` and
  `returnsToMarket` as a fourth thing a card may say about itself without an ability doing the
  saying — `docs/WRITING_A_CHARACTER.md` §6 lists it with the others. Nothing in the collection
  currently sends a Mayor's own Character to Unemployment by choice, so the check does not need to
  carve out the owner's own hand the way `isProtected` does; if a voluntary path is ever added, that
  carve-out is the one thing this verb would still need. `mk_yellow_freshest_thing_4` carries it.
  `power.js` prices it at 1.6, above `unemploymentShield`'s 0.8 (one lapsing application) because this
  one never lapses.

Both are logged as `resolved` in their character's `wantedVerbs` entry in
`spec/maker_card_set.json`, naming what was built and what the card says now, per
`docs/WRITING_A_CHARACTER.md`'s convention.

## Card data: the seventh round (v0.13.0)

The first round built to a maker's batch rather than to a backlog of `wantedVerbs`: sixty-three cards
— ten babies, eight new characters, two characters given new tracks, eleven places and three shared
cards — asked for eleven things the engine could not do, and the maker approved them up front rather
than logging them for later. Everything here is new vocabulary in `test/card-vocabulary.mjs`, priced
in `src/engine/power.js`, and spoken by at least one card in `spec/maker_card_set.json`.

- **`anchor.asCost`** — what an obscured figure's post is *counted* as being worth when somebody is
  set over them, as against what the card cost to put out. `upgradeValue(def)` in `actions.js` reads
  it and both halves of the upgrade rule now go through that one function: `upgradesOver` gates who
  may be played over the figure, and `recruitCost` takes the difference against the same number. The
  ten babies are the whole of its use — a Kitten costs 0 and counts as 1, an Owlet costs 0 and counts
  as 2 — so a baby is a free body who is nonetheless a real rung of a career rather than a discount
  on one. `test/obscured.test.mjs` now separates the two kinds of `anchor`: a figure prints none of
  this, a baby always does.

- **`swapWithHand`** — the animal standing in the town and a card in hand change places. The stack
  keeps its `uid`, its orientation, its shift and its place in the town; only `cards[0]` moves, so it
  is the same post worked by somebody else. No Supply changes hands, which is the point: it is the
  one way in the collection to change which version of a character is standing without paying an
  upgrade. `filter.name` / `filter.nameIn` say who may do it — Dirt and Squirt swap with each other,
  Mimi with her own other versions — and it is always printed on the `busy` trigger, so the animal
  goes Busy to do it.

- **`paySupply`** — Supply handed over a counter to nobody, with a `then` rider. The first way a card
  can charge a Mayor outside a Busy ability's `cost.supply` fee, which is what a Building needed. A
  price that cannot be met is not part-paid and the rider does not run, the same manners `spendToken`
  keeps. Priced at `SINK_SUPPLY` like a fee, because it is one.

- **`unemployOwnCharacter`** — a Mayor's own animal let go, through `unemployStack` like anything
  else, so every shelter there still holds. Always a cost in `power.js`; it exists so a card can put
  a real price on a real advantage, which is the Fast Food Joint's whole design.

- **`opponentDiscards`** — the rival's hand burnt rather than reordered. `opponentTopdeckFromHand`
  merely postpones a card; this one is gone, and the rival chooses which.

- **`spendToken` with `of: 'any'`** — a counter that does not care what kind of chit is put on it,
  only that the count is there. It takes from whatever kinds the Mayor holds, in order, and refuses
  the whole price if the total will not cover it.

- **`recruitFromHand`** gained three things: `filter.species` / `filter.study` / `filter.minCost`
  (the Owlery takes Owls and nobody else), `for: 'opponent'` (the forecourt hands a body across the
  table, and the rival chooses which — priced negative, because it is), and `dayLabour: true` (the
  animal arrives, cannot be pledged, and goes to Unemployment at the end of the turn; read by
  `canPledge` in `actions.js` and by the new sweep at the top of `endPhase` in `game.js`).

- **`makeBusy` with `side: 'self'`, `onlySelf` and `random`** — the constable's verb turned on the
  Mayor's own town. Teresa works the other town harder and works herself harder still, which is one
  ability and not two, and `power.js` reads the bill: a self-facing `makeBusy` is negative. `random`
  is the same verb with nobody choosing, which is what the Juice Store's coin toss wanted.

- **`advanceCharacter` with `side: 'opponent'`** — the doctor's second round. The Mayor holding the
  card still chooses who, and it is priced as a cost, because helping the animal across the table is
  help. Shay is the only card in the collection that reaches both ways in one breath.

- **`per` on `gainSupply` and on `draw`** — `charactersInTown` or `uprightCharacters`, an optional
  `filter` (the Community Bonfire counts the Lore animals and nobody else), and a `max` that a
  scaling effect must print or the card cannot be rated. One counter, `perAmount` in `effects.js`,
  read by both verbs. The Farmer's Market pays what the borough actually brought; the Bonfire draws
  by who is doing the talking.

- **`opponentShiftPenalty`** — a `passive` key, and the first standing rate in the collection that
  makes a shift pay *less*. Read off the rival's town in `completeShift`, never takes a shift below
  nothing, and stops when whoever carries it sits down. Mildred is the whole of its use.

- **`everyoneRecruitsFree` and `everyoneSearchesDeck`** — each loops `runEffect` over both Mayors:
  the Car Show opens both forecourts, Passing Comets sends both towns to their own decks and
  shuffles both afterwards. They are the first `everyone*` verbs to sit on **deck Events** rather
  than Disruptions, which is the point of them: a shared shock is weather nobody chose, and a deck
  Event that moves both towns is a Mayor choosing to open the afternoon to the other borough. Both
  name requirements like any other Event, so they are paid for in bodies rather than dealt.

- **`anchor.asCost` is priced.** `power.js` adds `0.6` a point on top of the flat anchor bonus,
  because a figure counted at 2 makes every upgrade over them two Supply cheaper. It is well under
  face value — it only pays on the turn somebody is actually played over them — but the difference
  between a 1 and a 2 is the whole reason a maker sets one, so the model has to see it.

Two more things changed that are not verbs. `matchesFilter` gained `minCost`, the other end of the
rule `maxCost` was already half of, so an ability can be written for the dear animals rather than the
cheap ones (JT's juice list is read to a Master). And **two versions of one character may now share
a cost**: the rule is only that a character with more than one version has at least two different
costs among them, or nothing there upgrades anything. Sharing a cost is guidance now —
`docs/WRITING_A_CHARACTER.md` §4 — because a character who works two trades at once is a real shape
and the ward does not care that both posts pay the same.

The cards these were built for carry no `wantedVerbs`: the maker's instruction for this batch was to
build what the writing needed rather than log it, so the list is empty and the round is the record.

## Card data: the eighth round (v0.14.0)

The maker's second batch: six Legendary top cards for animals already on the shelf, five new
characters — Cindy, Elvira, Jim, Robbie and Cornelius — six new places, three Events, and five
Capital City Buildings moved onto the towns' own shelves. Six things the engine could not do, all
approved up front. Everything here is in `test/card-vocabulary.mjs` where it is a verb, priced in
`src/engine/power.js`, and spoken by at least one card.

- **`peekOpponentDeck`** — the top `count` cards of the rival's deck, read and put back. The one
  window on a deck that is not yours, and the third of the three Elvira's booth reads. Information
  only: nothing moves, nothing is taken, and the rival is told what was read, the same manners
  `peekOpponentHand` keeps — a card that reads your deck in silence is one you cannot play around.
  Priced at half a `peekOpponentHand` per card, because what is on top of a deck is not yet a
  decision anybody has made.

- **`readyCharacter`'s `all`** — the whole floor stands up, with nobody asked which. Everything that
  is not already upright and is not pledged into an auction is readied, which is the only honest
  shape for a building that opens its doors on the hour: FutureTech HQ does not know your names.
  Rated on how much of a town is usually down at the top of a turn rather than as a single ready.

- **`recruitFromHand`'s `count`** — the open door rather than the one hire, so Otter Time! can take
  every Otter in the hand at once. The town cap is still read per animal, so a town with two places
  left takes two however many turned up.

- **`searchDeck`'s `filter.mentions`** — the trade-name search: every card in the deck that says the
  word, in its name, title, rules text, flavor or the rules it actually runs (`mentionsWord` in
  `effects.js`). FutureTech Release Day finds the store, the fan and the coffee bar in one go without
  any of them carrying a keyword a player would have to learn.

- **`gainSupply`'s `per: 'buildingsBuilt'`** — a rate paid over the roofs rather than the animals,
  which is the one `per` in the collection that is not about a body. The FutureTech Store pays out
  over every Building the town has raised; `max` is still required, because a rate with no ceiling
  cannot be rated.

- **An ability's `cooldownTurns`** — the shutter coming down. An ability fires and then may not fire
  again for that many of the Mayor's own turns (their turns are two apart in `state.turnNumber`, the
  rival's falling between them). `oncePerTurn` is a limit inside one turn; this is the limit across
  them, and it is what lets the Ice Cream Shop put one of the rival's animals back to work every
  other turn rather than every turn or once a game.

One thing the batch asked for and did **not** get: a Building simply raised for nothing, which
Cornelius's pitch wanted. A roof that appears without an auction or a crew would be the one card in
the collection that skips both; his standing `buildingDiscount` and his `lotDiscount` on every lot
with a roof on it are the same bargain paid in instalments. It is logged in his `wantedVerbs`.

## Tokens (v0.7.2)

Tokens are markers a Mayor holds beside their Supply: one kind per species, one per field of study,
and one for Buildings. They are never drawn, bought, bid on or discarded, and they take neither a town
place nor a Building place. The rules are `spec/game.json` → `tokens`.

- **Declared by cards.** A card of `type: "token"` carrying `token: { of: "species", species }`,
  `{ of: "study", study }` or `{ of: "building" }` says that kind exists. `tokenKinds(set)` lists them.
  `DECK_TYPES` excludes tokens, so the Deck Workshop refuses one in a deck.
- **Held per player.** `player.tokens` maps a key (`species:Rabbit`, `study:Food`, `building`) to a
  count. `tokenKey`, `tokenCount`, `addTokens`, `spendTokens` in `state.js` are the whole API;
  `rules.tokens.cap` caps one kind and `rules.tokens.startingTokens` seeds every declared kind at setup.
- **Card verbs.** `gainToken { of, species|study, count }`, `spendToken { ..., then }` — a price you
  cannot meet is not paid at all, so a short holding spends nothing and the rider does not run — and
  the condition `tokensAtLeast: { of, species|study, count }`.
- **Nothing spends one yet**, deliberately. The counter was built ahead of the cards that will use it
  so that the first three of them do not each invent their own; `spec/maker_card_set.json` → `tokens`
  says why at length.

## Card data: naming a Character (v0.4.0)

Filters and Event requirements are matched by `matchesFilter(state, stack, f)` in `effects.js` against the
**top card** of a stack. Besides `species`, `study`, `rank`, `cost` and `maxCost`, a filter may carry `name`:
the Character's printed name, matching whichever version is currently on top.

- Conditions: `{ "otherCharacterInTown": { "name": "Pip" } }` holds while any Pip other than the source stack
  is in town (an Event or Statue source has no stack, so any Pip counts).
- Effects: `readyCharacter`, `readyNextTurn` and the other filtered effects accept `filter.name` the same way.
- Event requirements: `{ "requires": [{ "name": "Clover" }, { "study": "Agriculture" }] }` needs an upright
  Clover plus a second, distinct Agriculture Character. `requirementUnits` / `assignmentCovers` in `actions.js`
  treat a named pip like any other; waivers (Statue of Ingenuity, Mabel) apply to it too.

Card art is presentation data: `art: { atlas: "boroughs" | "whiskerwood", tile: 0..15 }` picks a tile of one
of the two bundled atlases (`src/ui/painted-art.js`, `explicitTile`); anything else falls back to the theme
rules, and the engine never reads it.

