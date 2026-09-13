# Engine API (src/engine)

The engine is a headless, deterministic, data-driven ES-module implementation of the rules in
`ANIMAL_FRIENDS_TCG_DESIGN_REFERENCE.md`. It runs unchanged in Node 22 and in browsers.
Rules constants come from `spec/game.json`; cards from `spec/starter_card_set.json`.

```js
import { createGame, playGame, playTurn, mulliganPhase, legalActions, applyAction, cardDef, topCard, cloneState } from './src/engine/index.js';
const state = createGame(rules, set, { seed: 42, decks: ['burrow-bloom', 'paws-papers'], names: ['You', 'Rival'] });
await playGame(state, [agent0, agent1]);          // runs to completion; state.winner = 0 | 1 | null, state.result
```

## Decks and the Market Deck

`createGame(rules, set, { seed, decks, names, market })` — `market` selects the shared Market Deck from
`set.marketDecks` (`first-boroughs`, `boom-town`, `hard-times`, `founders-fair`, `whiskerwood-fair`, `many-hats-fair`; default: the first). Each entry of `decks` is either a deck id from the set or a
deck object `{ id?, name?, list: { cardId: count } }` (`resolveDeck`), which is how the Deck Workshop plays a
custom deck. `deckProblems(rules, set, list)` returns the deck's legality problems as player-facing sentences
(empty array = legal); `deckRules(rules)` exposes the limits from `spec/game.json` `deckbuilding`.

`set.marketDecks` is a list of `{ id, name, blurb, always, pool, poolSize }`; `resolveMarketDeck(set, ref)` picks one
and `buildMarketDeck` deals every `always` card (all nine Statues) plus a seeded random `poolSize` of `pool`, so a
Market Deck keeps one size while its contents vary per game. A plain array of card ids is still accepted, as is the
legacy single `set.marketDeck` field.

Card types: `character`, `event` (town decks); `statue`, `market`, `building`, `marketCharacter`,
`ordinance`, `disruption` (the Market Deck). A `building` goes to its buyer's town (capped by
`rules.buildings.maxPerTown`, demolishing one if full); a `marketCharacter` joins the town as a Busy
stack; an `ordinance` occupies a display slot, cannot be announced on, and applies `cityRule` keys while
it is there.

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
cards go to the bottom — `min` is 0, so an empty answer keeps them all).
`confirm` reasons: `raiseBid`, and `mulligan` (answered `true` to throw the opening hand back; the request
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

`cityRule(state, key)` sums the rule changes of the Ordinances currently displayed
(`pledgeLadderDelta`, `statueCostDelta`, `buildingCostDelta`, `noRaises`).

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
      unemployment:[Card], victoryRow:[cardId], buildings:[cardId], supply, escrow, mods:[{key,value,expires}],
      turn:{...counters}, stats }
Card  = { uid, cardId }                       // cardDef(state, cardId) gives the definition
Stack = { uid, cards:[Card top-first], orientation:0|180|270, shift:null|{remaining,output}, hasBeenUpright,
          readyNextTurn, lockedBid,  // lockedBid = the auction this Character is standing in, if any
          stored,                    // Supply put by on this card (a Squirrel's cache)
          protectedUntil,            // turn number until which an opponent cannot target it
          selfReadyUsed }            // a Cat's once-per-game self-ready
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
`eventCharReductionPerTurn`, `firstBidPlus1`, and the Statue burdens `opponentRehireDiscount`,
`opponentFirstBidPlus1`, `apprenticeEntersBusy`, `eventCostPlus1`, `resourceSupplyMinus1`, `losingBidsPayFull`.

Disruption effect ops (global, both players): `allCharactersToUnemployment`, `endAllShifts`, `everyoneLosesSupply`,
`everyoneGainsSupply`, `everyoneDraws`, `everyoneDiscardsDownTo`, `blockNextReady`, `everyoneRehiresFree`.

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

