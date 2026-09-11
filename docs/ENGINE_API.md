# Engine API (src/engine)

The engine is a headless, deterministic, data-driven ES-module implementation of the rules in
`ANIMAL_FRIENDS_TCG_DESIGN_REFERENCE.md`. It runs unchanged in Node 22 and in browsers.
Rules constants come from `spec/game.json`; cards from `spec/starter_card_set.json`.

```js
import { createGame, playGame, playTurn, legalActions, applyAction, cardDef, topCard, cloneState } from './src/engine/index.js';
const state = createGame(rules, set, { seed: 42, decks: ['burrow-bloom', 'paws-papers'], names: ['You', 'Rival'] });
await playGame(state, [agent0, agent1]);          // runs to completion; state.winner = 0 | 1 | null, state.result
```

## Decks and the Market Deck

`createGame(rules, set, { seed, decks, names })` — each entry of `decks` is either a deck id from the set or a
deck object `{ id?, name?, list: { cardId: count } }` (`resolveDeck`), which is how the Deck Workshop plays a
custom deck. `deckProblems(rules, set, list)` returns the deck's legality problems as player-facing sentences
(empty array = legal); `deckRules(rules)` exposes the limits from `spec/game.json` `deckbuilding`.

`set.marketDeck` is either a plain array of card ids or `{ always, pool, poolSize }`: `buildMarketDeck` deals
every `always` card plus a seeded random `poolSize` of `pool`, so the Market Deck keeps one size while its
contents vary per game.

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
`topdeck` (asked of the *opponent*), `unemployOpponent`, `raiseBidTarget`. `confirm` reason: `raiseBid`.

## Actions (Actions phase)

```
{type:'endTurn'}
{type:'recruit', cardUid, cardId, cost}                       // new stack
{type:'recruit', cardUid, cardId, targetUid, cost, upgrade:true} // upgrade same-name lower-cost stack (pay difference)
{type:'work', charUid, cardId, delay, output}
{type:'ability', charUid, cardId}                             // Busy ability
{type:'playEvent', cardUid, cardId, characters:[charUid...], cost}
{type:'announce', cardId, charUid, bid, minBid, maxBid}       // Capital City card; bid escrowed
{type:'challenge', pendingId, cardId, charUid, bid, minBid, maxBid}
{type:'rehire', cardUid, cardId, cost}
```
`legalActions(state, pi)` enumerates these (one canonical character assignment per event; min bid per
announce/challenge — raise `bid` if you want). `applyAction(state, pi, action)` validates and applies.

## State shape (serialisable; `state.set` and `state.rules` are shared data)

```
state = { seed, rng, turnNumber, active, phase, players:[P,P], market, log:[{turn,player,text,fx?}], winner, result }
P = { index, name, deckId, deck:[Card], hand:[Card], town:[Stack], events:[{uid,cardId,remaining}], dump:[Card],
      unemployment:[Card], victoryRow:[cardId], supply, escrow, mods:[{key,value,expires}], turn:{...counters}, stats }
Card  = { uid, cardId }                       // cardDef(state, cardId) gives the definition
Stack = { uid, cards:[Card top-first], orientation:0|180|270, shift:null|{remaining,output}, hasBeenUpright, readyNextTurn }
market = { deck:[cardId], city:[cardId], cityDump:[cardId], outOfPlay:[cardId],
           pending:[{id, cardId, announcer, bid, bonus, charUid, challenge:null|{player,bid,paid,bonus,charUid,winsTies}, unchallengeable}] }
```
Helpers: `topCard(state, stack)`, `canAct(stack)` (upright and not on a shift), `rankOf(rules, cost)`,
`opponentOf(pi)`, `statueCount(state, pi)`, `getMod/hasMod(player, key)`, `hasPassive(state, pi, key)`,
`recruitCost`, `rehireCost`, `minBidFor`, `challengeMinBid`, `eventReduction`, `findEventAssignment`,
`serialize/deserialize/cloneState`.

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
| `challenge` | player, cardId, uid, bid, bonus?, cancelled |
| `raiseBid` | player, cardId, amount |
| `resolve` | cardId, winner, announcer, challenger, winningBid, tied, refund |
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

Turn flow: `playTurn(state)` runs Start (resolve this player's pending purchases) → Resources (ask) →
Ready (orientation advance) → Actions (ask until `endTurn`) → End (shifts tick and pay out, Limited Events tick).
Pending purchases resolve at the start of the **announcer's** next turn; the opponent may challenge during their
own turn in between. Only the winner pays; the loser's escrow is refunded.

Mod keys (player.mods): `recruitDiscount`, `rehireDiscount`, `eventCharReduction`, `unchallengeable`,
`cancelNextChallenge`, `shiftBonus`, `extraAdvance`, `unemploymentShield`, `lossShield`, `challengeDiscount`.
Passive keys: `winTiesAsChallenger`, `blockOpponentBidRaise`, `firstAnnounceMinBidMinus1`, `masterDelayMinus1`,
`eventCharReductionPerTurn`, `firstBidPlus1`.
