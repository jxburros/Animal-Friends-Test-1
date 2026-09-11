// Heuristic agent for Animal Friends TCG.
//
// Design notes (why this plays the way it does):
//  * Statues are the only win condition (5 of 9). Everything else is instrumental.
//  * An auction runs for as many rounds as the two Mayors can pay for: whoever is not the high
//    bidder may raise on their own turn by making another upright Character Busy. So a bid is
//    never simply "sniped" — the answer to being outbid is to bid again, and the real limits are
//    Supply and upright bodies. Announcing at the minimum is therefore fine; a big opening bid
//    mostly wastes Supply we could have spent one round at a time.
//  * Losing an auction is NOT free: the loser forfeits half of everything they escrowed. Every
//    raise is a real commitment, so we only enter a bidding war we expect to be able to finish,
//    and we value a card against the possibility of paying half of the bid for nothing.
//  * The Capital City tops back up after every purchase, so cycling it is cheap upkeep rather
//    than a public good somebody has to fund.
//  * Statues carry burdens as well as boons, but they still win the game, so the burden is only
//    a light thumb on the scale when we are far from the fifth Statue.
//
// The agent is synchronous, deterministic given `options.seed`, and never throws:
// every entry point is wrapped and falls back to a legal default.
//
//   makeHeuristicAgent({
//     seed,              // PRNG seed; only used to break ties between equally scored choices
//     aggression = 0.5,  // 0..1: how far above the minimum bid it will go, and how eagerly it challenges
//     debug = false,     // annotate returned actions with `why` (the engine ignores unknown fields)
//     params,            // override any DEFAULT_PARAMS weight (used by the playtest tuner)
//   })

import {
  cardDef, topCard, canAct, opponentOf, statueCount, findEventAssignment, eventReduction, rankOf, hasPassive,
} from '../engine/index.js';
import { cardPower } from '../engine/power.js';

// ---------------------------------------------------------------- tuning knobs
// Defaults are merged with `options.params` so the weights can be swept from a playtest harness.
const DEFAULT_PARAMS = {
  rateWeight: 3.4, // value of +1 Supply/turn of shift income, per remaining turn
  costWeight: 1.7, // value of 1 Supply spent on a Character
  bodyBonus: 4.5, // an extra upright body is worth something on its own
  upgradeBonus: 6, // upgrades keep orientation and re-trigger recruit abilities
  workBase: 7.0, // multiplier on a shift's supply-per-turn rate
  lowSupplyWork: 5, // extra urgency to work when broke
  eventCharCost: 3.2, // opportunity cost per Character tapped for an Event
  bidCost: 1.15, // Supply spent in a bid
  statueBase: 58,
  statuePerMine: 11,
  denial3: 20, // opponent has 3 statues
  denial4: 90, // opponent is one statue from winning
  winNow: 140, // this purchase would win the game
  riskPenalty: 26, // announcing a Statue the opponent can profitably steal
  challengeBase: 70, // appetite for taking the lead in an auction
  forfeitRisk: 0.5, // weight on "we may be outbid again and forfeit half of this"
  statueBurden: 4, // a Statue's burden, discounted against its boon and the win it buys
  // Walk-away ceilings. Raises are made one step at a time (losing early is cheaper than losing
  // late), so without a ceiling two Mayors who both price a Statue at "almost anything" trade +1
  // bids for the rest of the game. The ceiling is what actually ends an auction.
  lockedBodyCost: 2.4, // a pledged Character is Busy for the whole auction, not just a turn
  statueCeiling: 7, // Supply above the asking price we will pay for a Statue...
  statueCeilingPerMine: 2, // ...plus this per Statue we already hold (the next one is worth more)
  marketCeiling: 1.6, // multiple of a Market card's estimated worth we will pay for it
  reservePenalty: 11, // penalty for tapping the last body while a Statue is on display
  cycleBase: 10, // base value of emptying the Capital City when no Statue is showing
  cycleBehind: 12, // ...more urgent when we are behind on Statues (the leader profits from a deadlock)
  cycleRich: 10, // ...more urgent when we can afford to spend the tempo
  cycleLate: 2, // ...more urgent the longer the deadlock has lasted
  cycleReserve: 0.6, // only cycle while keeping this much of the opponent's Supply in hand
  horizonCap: 11,
  premiumBase: 6, // how far above the minimum bid we will open on a Statue...
  premiumAggr: 8, // ...plus this much, scaled by (aggression - 0.5)
  riskAggr: 0.5, // aggression discount on the risk penalty
  challengeAggr: 14, // extra appetite for Statue challenges, scaled by (aggression - 0.5)
  challengeGate: 3, // reluctance to spend a body challenging a non-Statue
  oppPad: 5, // Supply we assume the opponent will add before their next turn
  drawWhenRich: 9, // Supply level at which drawing beats taking Supply
  drawHandCap: 6, // ...as long as the hand is no bigger than this
};

// ---------------------------------------------------------------- small utils
function mulberry32(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);

function def(state, cardId) {
  try {
    return cardDef(state, cardId);
  } catch {
    return null;
  }
}
function rateOf(d) {
  return d && d.shift ? d.shift.output / Math.max(1, d.shift.delay) : 0;
}
function stackTop(state, s) {
  try {
    return topCard(state, s);
  } catch {
    return null;
  }
}
function stackRate(state, s) {
  return rateOf(stackTop(state, s));
}
function findStack(state, pi, uid) {
  return state.players[pi].town.find((s) => s.uid === uid) || null;
}
function entryDelayTurns(state, d) {
  const rank = rankOf(state.rules, d.cost);
  return rank === 'apprentice' ? 0 : rank === 'journeyman' ? 1 : 2;
}

// ---------------------------------------------------------------- card valuation
// Both valuations below start from the set's own power model (src/engine/power.js), which rates
// every card in Supply-equivalents, and then correct it for the board in front of us: a free rehire
// is worth nothing with an empty Unemployment, however well it rates on paper. Rating the cards from
// their data rather than from a table means a new card is understood the day it is printed.

/** Every effect node in a card's effect tree, flattened. */
function effectNodes(eff, out = []) {
  if (!eff || !eff.do) return out;
  out.push(eff);
  if (eff.do === 'seq') for (const st of eff.steps || []) effectNodes(st, out);
  return out;
}
/** The effect nodes a card would resolve when it is gained, played or revealed. */
function cardEffects(d) {
  return [...effectNodes(d.effect), ...effectNodes(d.onGain), ...effectNodes(d.onReveal)];
}
const findEffect = (d, kind) => cardEffects(d).find((e) => e.do === kind);
const hasMod = (d, key) => cardEffects(d).some((e) => e.do === 'addMod' && e.key === key);

/**
 * Multiplier for effects that can fizzle on the current board. 0 means "this card does nothing for
 * me right now", which is what keeps the agent from paying for an empty Rehire.
 */
function situationFactor(state, pi, d) {
  const p = state.players[pi];
  const o = state.players[opponentOf(pi)];
  let f = 1;
  const rehire = findEffect(d, 'rehire');
  if (rehire) {
    const eligible = p.unemployment.filter((c) => {
      const cd = def(state, c.cardId) || { cost: 9 };
      const max = rehire.filter && (rehire.filter.maxCost ?? rehire.filter.cost);
      return max === undefined || cd.cost <= max;
    });
    if (!eligible.length) f *= 0.08;
  }
  const recruit = findEffect(d, 'recruitFromHand');
  if (recruit) {
    const max = (recruit.filter && recruit.filter.maxCost) ?? 5;
    if (!p.hand.some((c) => { const cd = def(state, c.cardId); return cd && cd.type === 'character' && cd.cost <= max; })) f *= 0.1;
  }
  const unemploy = findEffect(d, 'unemployOpponentCharacter');
  if (unemploy) {
    const max = unemploy.maxCost ?? 5;
    if (!o.town.some((st) => (stackTop(state, st) || { cost: 9 }).cost <= max)) f *= 0.12;
  }
  if (cardEffects(d).some((e) => e.do === 'eventFromDumpToHand' || e.do === 'eventFromDumpToDeckBottom')) {
    if (!p.dump.some((c) => (def(state, c.cardId) || {}).type === 'event')) f *= 0.2;
  }
  if (findEffect(d, 'raiseOwnBid') && !state.market.pending.some((pd) => pd.high === pi)) f *= 0.1;
  if (findEffect(d, 'readyCharacter') && !p.town.some((st) => st.orientation !== 0 && !st.lockedBid)) f *= 0.3;
  return f;
}

/** Corrections the power model cannot see, because they are about this engine's auctions. */
function auctionBonus(d) {
  let b = 0;
  if (hasMod(d, 'unchallengeable')) b += 3.0; // an unchallengeable Statue announcement wins games
  if (hasMod(d, 'cancelNextChallenge')) b += 1.8;
  return b;
}

// Rough "supply equivalent" of gaining a non-Statue Market card.
function marketCardValue(state, pi, d) {
  const base = cardPower(d) * 0.9 + auctionBonus(d);
  return Math.max(0.2, base * situationFactor(state, pi, d));
}

// Value of resolving an Event right now (before the cost of the Characters it taps).
function eventValue(state, pi, d) {
  const base = cardPower(d) + 1.0 + auctionBonus(d);
  const v = base * situationFactor(state, pi, d);
  // A Limited Event that only pays out on later turns is worth less the closer the game is to over.
  return d.kind === 'limited' ? v * 0.9 : v;
}

// How much we want a card sitting in hand (used for discard / topdeck / deck ordering).
function handCardValue(state, pi, cardId) {
  const p = state.players[pi];
  const d = def(state, cardId);
  if (!d) return 0;
  if (d.type === 'event') {
    const waive = eventReduction(state, pi);
    const playable = !!findEventAssignment(state, pi, d, waive);
    const units = (d.requires || []).reduce((a, r) => a + (r.count || 1), 0);
    return eventValue(state, pi, d) + (playable ? 2.5 : 0) - units * 0.6;
  }
  // character
  let v = rateOf(d) * 3.0 + 2.0 - d.cost * 0.9;
  const upgradeTarget = p.town.some((s) => {
    const t = stackTop(state, s);
    return t && t.name === d.name && t.cost < d.cost;
  });
  const alreadyBetter = p.town.some((s) => {
    const t = stackTop(state, s);
    return t && t.name === d.name && t.cost >= d.cost;
  });
  if (upgradeTarget) v += 4;
  if (alreadyBetter) v -= 3.5; // a duplicate of a Character we have already upgraded past
  if (d.cost > p.supply + 3) v -= 2.5; // cannot deploy it any time soon
  return v;
}

/**
 * What a Statue's burden is worth avoiding. Statues win the game, so this is deliberately small:
 * it only breaks ties between Statues, and it disappears entirely on the Statue that wins or that
 * stops the opponent winning.
 */
/**
 * The most Supply we will commit to one card. Nothing is worth every Supply we own except the
 * Statue that wins the game or the one that stops the opponent winning theirs.
 */
function bidCeiling(state, ctx, d, P, askingPrice) {
  const winsGame = ctx.myStatues + 1 >= (state.rules.victory.statuesToWin || 5);
  if (winsGame || ctx.oppStatues >= 4) return Infinity;
  if (d.type === 'statue') return askingPrice + P.statueCeiling + P.statueCeilingPerMine * ctx.myStatues;
  return Math.max(askingPrice, marketCardValue(state, ctx.pi, d) * P.marketCeiling);
}

function statueBurdenCost(ctx, d, P, winsGame) {
  if (winsGame || ctx.oppStatues >= 4) return 0;
  if (!(d.abilities || []).some((ab) => ab.burden)) return 0;
  return P.statueBurden;
}

// ---------------------------------------------------------------- shared context
function buildContext(state, pi, P) {
  const p = state.players[pi];
  const oi = opponentOf(pi);
  const o = state.players[oi];
  const cap = (state.rules.simulation.maxTurnsPerPlayer || 40) * 2;
  const horizon = clamp((cap - state.turnNumber) / 2, 1, P.horizonCap);
  const pendingIds = new Set(state.market.pending.map((pd) => pd.cardId));
  const cityStatues = state.market.city.filter((id) => {
    const d = def(state, id);
    return d && d.type === 'statue' && !pendingIds.has(id);
  });
  const myPending = state.market.pending.filter((pd) => pd.high === pi);
  const oppPending = state.market.pending.filter((pd) => pd.high === oi && !pd.unchallengeable);
  return {
    pi, oi, p, o, horizon,
    myStatues: statueCount(state, pi),
    oppStatues: statueCount(state, oi),
    upright: p.town.filter(canAct),
    oppUpright: o.town.filter(canAct).length,
    // What the opponent can realistically spend on a challenge during their next turn.
    oppSupplyEst: o.supply + P.oppPad,
    cityStatues,
    myPending,
    oppPending,
    statueThreat: cityStatues.length > 0,
    // Statues neither claimed nor on display: how many are still hiding in the Market Deck.
    statuesUnseen: (state.rules.victory.statueTotal || 9) - statueCount(state, pi) - statueCount(state, oi)
      - state.market.city.filter((id) => (def(state, id) || {}).type === 'statue').length,
  };
}

// ---------------------------------------------------------------- action scoring
function scoreAction(state, ctx, a, agg, out, P) {
  const { p, o, horizon } = ctx;
  switch (a.type) {
    case 'endTurn':
      return 0;

    case 'recruit': {
      const d = def(state, a.cardId);
      if (!d) return -1;
      if (a.upgrade) {
        const target = findStack(state, ctx.pi, a.targetUid);
        const cur = target ? stackTop(state, target) : null;
        const gain = rateOf(d) - rateOf(cur);
        let s = gain * P.rateWeight * horizon - a.cost * P.costWeight + P.upgradeBonus;
        if (d.abilities && d.abilities.some((x) => x.trigger === 'passive')) s += 5;
        out.why = `upgrade ${d.name} (+${gain.toFixed(1)}/turn)`;
        return s;
      }
      const delay = entryDelayTurns(state, d);
      let s = rateOf(d) * P.rateWeight * Math.max(0, horizon - delay) - a.cost * P.costWeight + P.bodyBonus;
      if (p.town.length >= 6) s -= 4; // diminishing returns on a crowded town
      out.why = `recruit ${d.name} (${rateOf(d).toFixed(1)}/turn)`;
      return s;
    }

    case 'work': {
      const rate = a.output / Math.max(1, a.delay);
      let s = P.workBase * rate;
      if (p.supply <= 3) s += P.lowSupplyWork;
      if (ctx.upright.length === 1 && ctx.statueThreat && p.supply >= 3) s -= P.reservePenalty;
      out.why = `work ${a.output}/${a.delay}`;
      return s;
    }

    case 'ability': {
      const d = def(state, a.cardId);
      if (!d) return -1;
      if (d.id === 'bb_mabel_2') {
        // Only worth going Busy if it unlocks an Event we cannot otherwise play.
        const waive = eventReduction(state, ctx.pi);
        const avoid = new Set([a.charUid]);
        for (const c of p.hand) {
          const ed = def(state, c.cardId);
          if (!ed || ed.type !== 'event') continue;
          if (findEventAssignment(state, ctx.pi, ed, waive, avoid)) continue; // already playable elsewhere
          if (findEventAssignment(state, ctx.pi, ed, waive + 1, avoid)) {
            out.why = `busy to unlock ${ed.name}`;
            return eventValue(state, ctx.pi, ed) * 1.5 - stackRate(state, findStack(state, ctx.pi, a.charUid)) * 2;
          }
        }
        return -1;
      }
      if (d.id === 'pp_rowan_2') {
        // Unemployment shield: only when the opponent actually has the tools to use it.
        const threat = state.market.city.some((id) => ['mk_poachers_pardon', 'mk_scrap_yard', 'mk_boundary_stone'].includes(id));
        out.why = 'unemployment shield';
        return threat ? 4 : -1;
      }
      if (d.id === 'br_moss_2') {
        // Readying cashes a shift in progress, so it is only worth Moss's own tempo when
        // there is a working (or stuck) Character to free.
        const best = p.town.filter((st) => st.uid !== a.charUid && (st.shift || st.orientation !== 0))
          .reduce((acc, st) => Math.max(acc, stackRate(state, st) * (st.shift ? 3 : 1.5)), 0);
        out.why = 'busy to ready a Character';
        return best > 0 ? best - stackRate(state, findStack(state, ctx.pi, a.charUid)) * 2 : -1;
      }
      if (d.id === 'br_thistle_2') {
        const cheapest = p.unemployment.reduce((acc, c) => Math.min(acc, (def(state, c.cardId) || { cost: 99 }).cost), 99);
        const affordable = cheapest < 99 && Math.max(0, cheapest - 1) <= p.supply;
        out.why = 'busy to rehire';
        return affordable ? 3.5 : -1;
      }
      return -1;
    }

    case 'playEvent': {
      const d = def(state, a.cardId);
      if (!d) return -1;
      const chars = (a.characters || []).map((uid) => findStack(state, ctx.pi, uid));
      const tapCost = chars.reduce((acc, s) => acc + (s ? stackRate(state, s) : 0), 0) * P.eventCharCost;
      let s = eventValue(state, ctx.pi, d) * 3.0 - tapCost - a.cost * P.costWeight;
      const remainingUpright = ctx.upright.length - chars.length;
      if (remainingUpright <= 0 && ctx.statueThreat && p.supply >= 3) s -= P.reservePenalty;
      out.why = `event ${d.name}`;
      return s;
    }

    case 'announce': {
      const d = def(state, a.cardId);
      if (!d) return -1;
      const stack = findStack(state, ctx.pi, a.charUid);
      const charCost = stack ? stackRate(state, stack) * 2.2 : 0;
      const minBid = a.minBid;
      const maxBid = Math.min(a.maxBid, p.supply);
      if (minBid > maxBid) return -1;

      if (d.type === 'statue') {
        const winsGame = ctx.myStatues + 1 >= (state.rules.victory.statuesToWin || 5);
        // Open modestly: we can answer a raise next turn, and every Supply we escrow now is
        // Supply we cannot raise with later (and half of it is forfeit if we lose anyway).
        // Opening above the opponent's reach is only worth it when this purchase ends the game.
        const premiumCap = Math.round(P.premiumBase + P.premiumAggr * (agg - 0.5)) + ctx.myStatues + (winsGame ? 40 : 0) + (ctx.oppStatues >= 4 ? 12 : 0);
        const deter = winsGame || ctx.oppStatues >= 4 ? clamp(ctx.oppSupplyEst, minBid, maxBid) : maxBid;
        const ceiling = bidCeiling(state, ctx, d, P, minBid);
        const bid = clamp(Math.floor(Math.min(deter, ceiling, minBid + premiumCap)), minBid, maxBid);
        const safe = bid >= ctx.oppSupplyEst || ctx.oppUpright === 0;
        let s = P.statueBase + P.statuePerMine * ctx.myStatues - bid * P.bidCost - charCost;
        s -= statueBurdenCost(ctx, d, P, winsGame);
        if (ctx.oppStatues >= 3) s += P.denial3;
        if (ctx.oppStatues >= 4) s += P.denial4;
        if (winsGame) s += P.winNow;
        // Being outbid is survivable now (we can answer), but it still costs half of our escrow,
        // so an opening we cannot defend is worth a little less than one we can.
        if (!safe) s -= P.riskPenalty * 0.4 * Math.max(0.2, 1 + P.riskAggr * 0.5 - P.riskAggr * agg);
        out.bid = bid;
        out.why = `announce STATUE ${d.name} @${bid}${safe ? ' (deterrent)' : ''}`;
        return s;
      }

      // Ordinary Market card: worth it for its effect, and for draining the Capital City
      // so that fresh Statues can appear. The City only refills when empty, so when no Statue
      // is on display somebody has to buy the display out — but whoever does it spends Supply
      // and tempo that the opponent can then use on the Statues that appear. So we cycle when
      // we are behind (a deadlock favours the leader), when we are richer, or when the
      // deadlock has already dragged on.
      const cityLeft = state.market.city.length;
      let cycle = 0;
      const keepsReserve = p.supply - minBid >= P.cycleReserve * ctx.oppSupplyEst;
      if (ctx.cityStatues.length === 0 && ctx.statuesUnseen > 0 && keepsReserve) {
        cycle = P.cycleBase
          + P.cycleBehind * clamp(ctx.oppStatues - ctx.myStatues, -2, 2)
          + P.cycleRich * clamp((p.supply - o.supply) / 5, -1.5, 1.5)
          + P.cycleLate * clamp((state.turnNumber - 16) / 24, 0, 1);
        cycle = Math.max(0, cycle) * (1 + (5 - cityLeft) * 0.25) - d.cost * 1.2;
      }
      const bid = clamp(minBid, minBid, maxBid);
      let s = marketCardValue(state, ctx.pi, d) * 2.6 + cycle - bid * P.bidCost - charCost;
      if (ctx.upright.length === 1 && ctx.statueThreat && p.supply >= 3) s -= P.reservePenalty;
      out.bid = bid;
      out.why = `announce ${d.name} @${bid}${cycle ? ' (cycle)' : ''}`;
      return s;
    }

    case 'raise': {
      const d = def(state, a.cardId);
      if (!d) return -1;
      const stack = findStack(state, ctx.pi, a.charUid);
      // Pledging a Character to an auction takes it off the board until the bidding ends, which is
      // far dearer than the single Busy turn a shift or an Event costs.
      const charCost = stack ? stackRate(state, stack) * P.lockedBodyCost : 0;
      // Take the lead on the raw numbers rather than trusting our own bid bonus: `raiseMinBid`
      // credits a firstBidPlus1 that would leave us tied, and a tie stays with the standing bidder.
      const pd = state.market.pending.find((x) => x.id === a.pendingId);
      const standing = pd ? pd.bid + pd.bonus : a.minBid;
      const needed = hasPassive(state, ctx.pi, 'winTiesAsChallenger') ? standing : standing + 1;
      const bid = clamp(Math.max(a.minBid, needed), a.minBid, a.maxBid);
      if (bid > a.maxBid || bid < needed) return -1; // cannot actually take the lead
      // Raise one step at a time, and fold once the price passes what the card is worth to us.
      if (bid > bidCeiling(state, ctx, d, P, def(state, a.cardId)?.cost ?? bid)) return -1;
      // If we take the lead and are then outbid again, we forfeit half of everything escrowed.
      // The deeper the war and the richer the opponent, the more that costs us.
      const escrowed = pd ? pd.committed[ctx.pi] + (bid - pd.committed[ctx.pi]) : bid;
      const mayBeOutbid = ctx.oppSupplyEst > bid && ctx.oppUpright > 0;
      const forfeitRisk = mayBeOutbid ? P.forfeitRisk * (escrowed / 2) : 0;

      if (d.type === 'statue') {
        const winsGame = ctx.myStatues + 1 >= (state.rules.victory.statuesToWin || 5);
        let s = P.challengeBase + P.statuePerMine * ctx.myStatues - bid * P.bidCost - charCost - forfeitRisk;
        s -= statueBurdenCost(ctx, d, P, winsGame);
        if (ctx.oppStatues >= 3) s += P.denial3;
        if (ctx.oppStatues >= 4) s += P.denial4;
        if (winsGame) s += P.winNow;
        s += P.challengeAggr * (agg - 0.5);
        out.bid = bid;
        out.why = `raise STATUE ${d.name} @${bid}`;
        return s;
      }
      let s = marketCardValue(state, ctx.pi, d) * 2.2 - bid * P.bidCost - charCost - forfeitRisk - P.challengeGate * (1 - agg);
      // Denying a card the opponent clearly wants is worth a little on its own.
      s += 4 * (agg - 0.5);
      out.bid = bid;
      out.why = `raise ${d.name} @${bid}`;
      return s;
    }

    case 'rehire': {
      const d = def(state, a.cardId);
      if (!d) return -1;
      let s = rateOf(d) * P.rateWeight * horizon - a.cost * P.costWeight + P.bodyBonus;
      out.why = `rehire ${d.name}`;
      return s;
    }

    default:
      return -1;
  }
}

// ---------------------------------------------------------------- pick handlers
function pickBest(options, valueFn, req) {
  const scored = options.map((o, i) => ({ o, i, v: valueFn(o) }));
  scored.sort((x, y) => y.v - x.v || x.i - y.i);
  const out = [];
  for (const s of scored) {
    if (out.length >= req.max) break;
    if (out.length >= req.min && s.v <= 0) break;
    out.push(s.o.uid);
  }
  while (out.length < req.min && out.length < options.length) {
    const next = scored.find((s) => !out.includes(s.o.uid));
    if (!next) break;
    out.push(next.o.uid);
  }
  return out;
}

function pickWorst(options, valueFn, req) {
  const scored = options.map((o, i) => ({ o, i, v: valueFn(o) }));
  scored.sort((x, y) => x.v - y.v || x.i - y.i);
  const n = clamp(req.min, 0, req.max);
  return scored.slice(0, n).map((s) => s.o.uid);
}

// ---------------------------------------------------------------- agent
export function makeHeuristicAgent(options = {}) {
  const agg = clamp(typeof options.aggression === 'number' ? options.aggression : 0.5, 0, 1);
  const debug = !!options.debug;
  const P = { ...DEFAULT_PARAMS, ...(options.params || {}) };
  const rnd = mulberry32((options.seed ?? 12345) >>> 0);

  function chooseResources(state, pi) {
    const ctx = buildContext(state, pi, P);
    const p = state.players[pi];
    // Do we want Supply to fund a Statue bid this turn (opening one, or answering one)?
    let need = 0;
    for (const id of ctx.cityStatues) {
      const d = def(state, id);
      if (d) need = Math.max(need, d.cost);
    }
    for (const pd of ctx.oppPending) {
      const d = def(state, pd.cardId);
      if (d && d.type === 'statue') need = Math.max(need, pd.bid + pd.bonus + 1);
    }
    if (need > 0 && p.supply < need + 2 && p.supply + 2 >= need) return 'supply';
    if (p.hand.length <= 2) return 'draw';
    if (p.supply >= P.drawWhenRich && p.hand.length <= P.drawHandCap) return 'draw';
    if (p.hand.length >= 8) return 'supply';
    return p.supply >= P.drawWhenRich + 3 ? 'draw' : 'supply';
  }

  function chooseAction(state, pi, req) {
    const ctx = buildContext(state, pi, P);
    const acts = Array.isArray(req.options) ? req.options : [];
    let best = { type: 'endTurn' };
    let bestScore = 0; // anything that does not beat "do nothing" is not worth doing
    for (const a of acts) {
      if (a.type === 'endTurn') continue;
      const out = {};
      let s;
      try {
        s = scoreAction(state, ctx, a, agg, out, P);
      } catch {
        s = -1;
      }
      if (!Number.isFinite(s)) s = -1;
      s += rnd() * 0.01; // deterministic tie-break
      if (s > bestScore) {
        bestScore = s;
        const chosen = { ...a };
        if (out.bid !== undefined && (a.type === 'announce' || a.type === 'raise')) {
          chosen.bid = clamp(Math.floor(out.bid), a.minBid, a.maxBid);
        }
        if (debug) chosen.why = `${out.why || a.type} [${s.toFixed(1)}]`;
        best = chosen;
      }
    }
    return best;
  }

  function choosePick(state, pi, req) {
    const oi = opponentOf(pi);
    const opts = req.options || [];
    switch (req.reason) {
      case 'discard':
      case 'topdeck':
        // Shed the least useful cards; for topdeck the same ranking keeps the good cards in hand.
        return pickWorst(opts, (o) => handCardValue(state, pi, o.cardId), req);

      case 'ready':
      case 'readyNextTurn':
        // Readying a working Character cashes its shift immediately, so prefer big shifts.
        return pickBest(opts, (o) => {
          const s = findStack(state, pi, o.uid);
          if (!s) return 0.1;
          const t = stackTop(state, s);
          const pending = s.shift ? s.shift.output * 1.8 : 0;
          return pending + rateOf(t) * 2 + (s.orientation === 180 ? 1 : 0) + 0.5;
        }, req);

      case 'rehire':
      case 'recruitFree':
        return pickBest(opts, (o) => {
          const d = def(state, o.cardId);
          if (!d) return 0.1;
          return rateOf(d) * 3 + 1.5 - d.cost * 0.3;
        }, req);

      case 'eventFromDumpToHand':
      case 'eventFromDumpToDeckBottom':
        return pickBest(opts, (o) => {
          const d = def(state, o.cardId);
          return d ? eventValue(state, pi, d) + 0.5 : 0.1;
        }, req);

      case 'unemployOpponent':
        return pickBest(opts, (o) => {
          const s = findStack(state, oi, o.uid);
          if (!s) return 0.1;
          const t = stackTop(state, s);
          if (!t) return 0.1;
          return t.cost * 1.2 + rateOf(t) * 2.5 + (s.orientation === 0 ? 3 : 0) + (s.cards.length > 1 ? 2 : 0);
        }, req);

      case 'raiseBidTarget':
        return pickBest(opts, (o) => {
          const d = def(state, o.cardId);
          if (!d) return 0.1;
          return d.type === 'statue' ? 10 : 1;
        }, req);

      default:
        return pickBest(opts, (o) => (o.cardId ? handCardValue(state, pi, o.cardId) : 1), req);
    }
  }

  function chooseOrder(state, pi, req) {
    const opts = (req.options || []).slice();
    // Top of the deck first: put what we most want to draw on top.
    opts.sort((a, b) => handCardValue(state, pi, b.cardId) - handCardValue(state, pi, a.cardId));
    return opts.map((o) => o.uid);
  }

  function chooseConfirm(state, pi, req) {
    if (req.reason === 'raiseBid') {
      // Juniper's +1: cheap insurance, but only on a Statue we are contesting.
      const p = state.players[pi];
      const mine = state.market.pending.filter((pd) => pd.high === pi);
      const statue = mine.some((pd) => {
        const d = def(state, pd.cardId);
        return d && d.type === 'statue';
      });
      return statue && p.supply >= 2;
    }
    return !!req.default;
  }

  return {
    name: 'heuristic',
    options: { aggression: agg, debug },
    choose(state, pi, request) {
      const req = request || {};
      try {
        switch (req.kind) {
          case 'resources': return chooseResources(state, pi);
          case 'action': return chooseAction(state, pi, req);
          case 'pick': return choosePick(state, pi, req);
          case 'order': return chooseOrder(state, pi, req);
          case 'confirm': return chooseConfirm(state, pi, req);
          default: return undefined;
        }
      } catch {
        // Safe, always-legal defaults — the agent must never break a game.
        switch (req.kind) {
          case 'resources': return 'supply';
          case 'action': return { type: 'endTurn' };
          case 'pick': return (req.options || []).slice(0, req.min || 0).map((o) => o.uid);
          case 'order': return (req.options || []).map((o) => o.uid);
          case 'confirm': return !!req.default;
          default: return undefined;
        }
      }
    },
  };
}

export default makeHeuristicAgent;
