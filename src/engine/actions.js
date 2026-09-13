// Legal action enumeration and action application for the Actions phase.
import {
  cardDef, topCard, log, nextUid, opponentOf, entryOrientation, rankOf, hasPassive, hasMod, getMod, consumeMod,
  canAct, findStack, cityRule, UPRIGHT, BUSY,
} from './state.js';
import { ask, gainSupply, draw, discard, makeStack, fireHook, runEffect, matchesFilter } from './effects.js';

// ---------- costs & requirements ----------
export function recruitCost(state, pi, cardId, targetUid = null) {
  const p = state.players[pi];
  const def = cardDef(state, cardId);
  let cost = def.cost;
  if (targetUid) {
    const s = findStack(state, pi, targetUid);
    cost = def.cost - topCard(state, s).cost;
  }
  cost = Math.max(0, cost - getMod(p, 'recruitDiscount'));
  return cost;
}

export function upgradeTargets(state, pi, cardId) {
  const def = cardDef(state, cardId);
  return state.players[pi].town.filter((s) => {
    const t = topCard(state, s);
    return t.name === def.name && t.cost < def.cost;
  });
}

/** Number of requirement "units" this player may waive on the next Event (Mabel Horticulturist mod + Statue of Ingenuity). */
export function eventReduction(state, pi) {
  const p = state.players[pi];
  let n = getMod(p, 'eventCharReduction');
  if (!p.turn.ingenuityUsed && hasPassive(state, pi, 'eventCharReductionPerTurn')) n += 1;
  // An Event may be discounted by at most one Character, however many discounts you are holding.
  // Without this cap a town of Mice stacked reductions until its Events cost nothing at all, and
  // the Event deck won three games in four — bodies are the currency, so a discount on bodies has
  // to be a discount, not an exemption.
  return Math.min(n, state.rules.deckbuilding?.maxEventReduction ?? 1);
}

function requirementUnits(def) {
  const units = [];
  for (const r of def.requires || []) for (let i = 0; i < (r.count || 1); i++) units.push(r);
  return units;
}

function unitMatches(state, stack, unit) {
  return matchesFilter(state, stack, { species: unit.species, study: unit.study, name: unit.name });
}

/** Can `stacks` (upright, distinct) satisfy the event's requirements with up to `waive` units waived? Returns the number of units they cover or -1. */
export function assignmentCovers(state, def, stacks, waive) {
  const units = requirementUnits(def);
  const n = units.length;
  if (stacks.length > n) return -1;
  // brute-force matching (tiny sizes)
  let best = -1;
  const used = new Array(stacks.length).fill(false);
  const rec = (u, covered) => {
    if (u === n) {
      if (covered > best) best = covered;
      return;
    }
    // try assign a stack to unit u
    for (let i = 0; i < stacks.length; i++) {
      if (!used[i] && unitMatches(state, stacks[i], units[u])) {
        used[i] = true;
        rec(u + 1, covered + 1);
        used[i] = false;
      }
    }
    rec(u + 1, covered); // leave unit uncovered
  };
  rec(0, 0);
  if (best < 0) return -1;
  if (best !== stacks.length) return -1; // every chosen stack must be doing something
  return n - best <= waive ? best : -1;
}

/** Find a cheapest set of upright stacks satisfying the event (fewest stacks, then lowest shift output). */
export function findEventAssignment(state, pi, def, waive, avoid = new Set()) {
  const units = requirementUnits(def);
  const need = Math.max(0, units.length - waive);
  const avail = state.players[pi].town.filter((s) => canAct(s) && !avoid.has(s.uid))
    .sort((a, b) => topCard(state, a).shift.output - topCard(state, b).shift.output || topCard(state, a).cost - topCard(state, b).cost);
  if (need === 0) return [];
  // search subsets of size `need` (sizes are tiny)
  const pick = [];
  const rec = (start) => {
    if (pick.length === need) return assignmentCovers(state, def, pick, waive) >= 0 ? pick.slice() : null;
    for (let i = start; i < avail.length; i++) {
      pick.push(avail[i]);
      const r = rec(i + 1);
      pick.pop();
      if (r) return r;
    }
    return null;
  };
  return rec(0);
}

/**
 * What this card costs *this* player. A Statue is priced from the buyer's own Victory Row: the first
 * figure in `victory.statueCostTiers` while they hold fewer than `statueCostTierBreak`, the second once
 * they hold that many or more. The two Mayors can therefore face different prices in the same auction,
 * and the fifth and winning Statue is always bought at the higher price.
 */
export function cardCostFor(state, pi, cardId) {
  const def = cardDef(state, cardId);
  const v = state.rules.victory || {};
  if (def.type === 'statue' && Array.isArray(v.statueCostTiers) && v.statueCostTiers.length >= 2) {
    const held = state.players[pi].victoryRow.length;
    const tier = held < (v.statueCostTierBreak ?? 2) ? v.statueCostTiers[0] : v.statueCostTiers[1];
    return Math.max(0, tier + cityRule(state, 'statueCostDelta'));
  }
  return Math.max(0, def.cost + (def.type === 'building' ? cityRule(state, 'buildingCostDelta') : 0));
}

export function minBidFor(state, pi, cardId) {
  const p = state.players[pi];
  let min = cardCostFor(state, pi, cardId);
  if (p.turn.announcements === 0 && hasPassive(state, pi, 'firstAnnounceMinBidMinus1')) min = Math.max(0, min - 1);
  return min;
}

// ---------- the pledge ladder ----------
/**
 * The cost a Character must have to be this player's next pledge in `pending` (null = opening an auction).
 * Your Nth pledge must cost at least N, so a Mayor bids at most five times in one auction and only if their
 * town runs the whole curve; cost-0 Characters cannot bid at all. This, not the price, is what converges a
 * bidding war — which is why there is no growing minimum increment any more.
 */
export function pledgeMinCost(state, pending, pi) {
  const a = state.rules.market.auction || {};
  if (a.pledgeLadder !== 'cost') return 0;
  const already = pending ? pending.chars[pi].length : 0;
  const harmony = hasPassive(state, pi, 'pledgeLadderPlus1') ? 1 : 0; // Statue of Harmony's burden
  return Math.max(0, already + (a.minPledgeCost ?? 1) + cityRule(state, 'pledgeLadderDelta') + harmony);
}

/** Can this Character be pledged as the player's next bid in this auction? */
export function canPledge(state, pi, pending, stack) {
  return topCard(state, stack).cost >= pledgeMinCost(state, pending, pi);
}

/** Does this player have anyone left who could make their next bid in this auction? */
export function hasPledgeAvailable(state, pi, pending) {
  return state.players[pi].town.some((s) => canAct(s) && canPledge(state, pi, pending, s));
}
export function bidBonus(state, pi) {
  const p = state.players[pi];
  if (p.turn.bids !== 0) return 0;
  let bonus = hasPassive(state, pi, 'firstBidPlus1') ? 1 : 0;
  if (hasPassive(state, opponentOf(pi), 'opponentFirstBidPlus1')) bonus += 1; // Statue of Courage's burden
  return bonus;
}

/**
 * Lowest bid that takes the lead in `pending` away from its current high bidder. The required step
 * grows as the auction wears on, so a long bidding war converges instead of trading single Supply
 * for the rest of the game.
 */
export function raiseIncrement(state, pending) {
  const per = state.rules.market.auction?.incrementGrowsEveryNRounds || 0;
  return 1 + (per ? Math.floor((pending.rounds.length - 1) / per) : 0);
}
export function raiseMinBid(state, pi, pending) {
  const standing = pending.bid + pending.bonus;
  const winsTies = hasPassive(state, pi, 'winTiesAsChallenger');
  return Math.max(0, (winsTies ? standing : standing + raiseIncrement(state, pending)) - bidBonus(state, pi));
}

/** Supply this player must hand over now to stand at `bid`: they have already escrowed their earlier bids. */
export function raisePayment(state, pi, pending, bid) {
  const owed = bid - (pending.committed[pi] || 0);
  return Math.max(0, owed - getMod(state.players[pi], 'challengeDiscount'));
}

/** What a losing bidder actually forfeits of their escrow (the rest is refunded). */
export function forfeitOf(state, pi, escrowed) {
  if (escrowed <= 0) return 0;
  const a = state.rules.market.auction || {};
  // A losing bidder is refunded in full: the pledge ladder, not a forfeit, is what makes a bid a real promise.
  if (a.losingBidRefundsInFull) return 0;
  if (hasPassive(state, pi, 'losingBidsPayFull')) return escrowed;
  const num = a.losingBidForfeitNumerator ?? 1;
  const den = a.losingBidForfeitDenominator ?? 2;
  const raw = (escrowed * num) / den;
  return a.losingBidForfeitRounding === 'down' ? Math.floor(raw) : Math.ceil(raw);
}

export function eventCost(state, pi, def) {
  return (def.cost || 0) + (hasPassive(state, pi, 'eventCostPlus1') ? 1 : 0); // Statue of Ingenuity's burden
}

export function rehireCost(state, pi, cardId) {
  const discount = getMod(state.players[pi], 'rehireDiscount')
    + (hasPassive(state, opponentOf(pi), 'opponentRehireDiscount') ? 1 : 0); // Statue of Kindness's burden
  return Math.max(0, cardDef(state, cardId).cost - discount);
}

// ---------- legal actions ----------
export function legalActions(state, pi) {
  const p = state.players[pi];
  const acts = [{ type: 'endTurn' }];
  if (state.phase !== 'actions' || state.active !== pi || state.winner !== null) return acts;
  const seen = new Set();
  // recruit / upgrade
  for (const c of p.hand) {
    const def = cardDef(state, c.cardId);
    if (def.type !== 'character' || seen.has('r' + c.cardId)) continue;
    seen.add('r' + c.cardId);
    const cost = recruitCost(state, pi, c.cardId);
    if (cost <= p.supply) acts.push({ type: 'recruit', cardUid: c.uid, cardId: c.cardId, cost });
    for (const t of upgradeTargets(state, pi, c.cardId)) {
      const uc = recruitCost(state, pi, c.cardId, t.uid);
      if (uc <= p.supply) acts.push({ type: 'recruit', cardUid: c.uid, cardId: c.cardId, targetUid: t.uid, cost: uc, upgrade: true });
    }
  }
  // work, abilities
  for (const s of p.town) {
    if (!canAct(s)) continue;
    const def = topCard(state, s);
    acts.push({ type: 'work', charUid: s.uid, cardId: def.id, delay: def.shift.delay, output: def.shift.output });
    if ((def.abilities || []).some((a) => a.trigger === 'busy')) acts.push({ type: 'ability', charUid: s.uid, cardId: def.id });
  }
  // events
  const waive = eventReduction(state, pi);
  for (const c of p.hand) {
    const def = cardDef(state, c.cardId);
    if (def.type !== 'event' || seen.has('e' + c.cardId)) continue;
    seen.add('e' + c.cardId);
    const cost = eventCost(state, pi, def);
    if (cost > p.supply) continue;
    const assign = findEventAssignment(state, pi, def, waive);
    if (assign) acts.push({ type: 'playEvent', cardUid: c.uid, cardId: c.cardId, characters: assign.map((s) => s.uid), cost });
  }
  // announce purchases
  const pendingIds = new Set(state.market.pending.map((pd) => pd.cardId));
  const uprights = p.town.filter(canAct);
  for (const cardId of state.market.city) {
    if (pendingIds.has(cardId)) continue;
    if (cardDef(state, cardId).type === 'ordinance') continue; // an Ordinance is a rule, not a lot
    const minBid = minBidFor(state, pi, cardId);
    if (minBid > p.supply) continue;
    for (const s of uprights) {
      if (!canPledge(state, pi, null, s)) continue;
      acts.push({ type: 'announce', cardId, charUid: s.uid, bid: minBid, minBid, maxBid: p.supply });
    }
  }
  // raise an auction someone else is currently winning — as often as you can pay for it
  for (const pd of state.market.pending) {
    if (pd.high === pi || pd.unchallengeable) continue;
    if (cityRule(state, 'noRaises')) continue; // an Ordinance has closed the bidding
    const minBid = raiseMinBid(state, pi, pd);
    const pay = raisePayment(state, pi, pd, minBid);
    if (pay > p.supply) continue;
    const maxBid = minBid + (p.supply - pay);
    for (const s of uprights) {
      if (!canPledge(state, pi, pd, s)) continue;
      acts.push({ type: 'raise', pendingId: pd.id, cardId: pd.cardId, charUid: s.uid, bid: minBid, minBid, maxBid });
    }
  }
  // rehire
  for (const c of p.unemployment) {
    const cost = rehireCost(state, pi, c.cardId);
    if (cost <= p.supply && !seen.has('u' + c.cardId)) {
      seen.add('u' + c.cardId);
      acts.push({ type: 'rehire', cardUid: c.uid, cardId: c.cardId, cost });
    }
  }
  return acts;
}

// ---------- apply ----------
export async function applyAction(state, pi, a) {
  const p = state.players[pi];
  if (state.phase !== 'actions' || state.active !== pi) throw new Error('Not in actions phase');
  state.actionCount++;
  switch (a.type) {
    case 'endTurn':
      return true;
    case 'recruit': {
      const idx = p.hand.findIndex((c) => c.uid === a.cardUid);
      if (idx < 0) throw new Error('Card not in hand');
      const def = cardDef(state, p.hand[idx].cardId);
      if (def.type !== 'character') throw new Error('Not a character');
      let target = null;
      if (a.targetUid) {
        target = findStack(state, pi, a.targetUid);
        if (!target || !upgradeTargets(state, pi, def.id).includes(target)) throw new Error('Invalid upgrade target');
      }
      const cost = recruitCost(state, pi, def.id, a.targetUid || null);
      if (cost > p.supply) throw new Error('Cannot afford');
      p.supply -= cost;
      if (getMod(p, 'recruitDiscount')) consumeMod(p, 'recruitDiscount');
      const [c] = p.hand.splice(idx, 1);
      p.stats.recruits++;
      p.turn.recruits++;
      let s;
      if (target) {
        target.cards.unshift(c);
        s = target;
        log(state, pi, `${p.name} upgrades ${def.name} to ${def.title} for ${cost} Supply.`, { kind: 'recruit', player: pi, uid: s.uid, cardUid: c.uid, cardId: def.id, cost, upgrade: true });
      } else {
        let orientation = entryOrientation(state.rules, def.cost);
        if (orientation === state.rules.orientation.masterEntry && hasPassive(state, pi, 'masterDelayMinus1')) orientation = BUSY;
        if (orientation === UPRIGHT && hasPassive(state, pi, 'apprenticeEntersBusy')) orientation = BUSY; // Statue of Patience's burden
        s = makeStack(state, pi, c, orientation);
        log(state, pi, `${p.name} recruits ${def.name}, ${def.title} (${def.species}, ${def.study}) for ${cost} Supply; enters at ${orientation}°.`, { kind: 'recruit', player: pi, uid: s.uid, cardUid: c.uid, cardId: def.id, cost, upgrade: false, orientation });
      }
      await fireHook(state, 'onRecruit', { player: pi, stackUid: s.uid, selfOnly: s.uid });
      return false;
    }
    case 'work': {
      const s = findStack(state, pi, a.charUid);
      if (!s || !canAct(s)) throw new Error('Character cannot work');
      const def = topCard(state, s);
      s.orientation = BUSY;
      s.shift = { remaining: def.shift.delay, output: def.shift.output };
      log(state, pi, `${def.name}, ${def.title} starts a shift (${def.shift.delay} turn${def.shift.delay === 1 ? '' : 's'} → ${def.shift.output} Supply).`, { kind: 'shiftStart', player: pi, uid: s.uid, delay: def.shift.delay, output: def.shift.output });
      await fireHook(state, 'onShiftStarted', { player: pi, stackUid: s.uid });
      return false;
    }
    case 'ability': {
      const s = findStack(state, pi, a.charUid);
      if (!s || !canAct(s)) throw new Error('Character cannot act');
      const def = topCard(state, s);
      const ab = (def.abilities || []).find((x) => x.trigger === 'busy');
      if (!ab) throw new Error('No Busy ability');
      s.orientation = BUSY;
      log(state, pi, `${def.name}, ${def.title} uses its Busy ability.`, { kind: 'ability', player: pi, uid: s.uid, cardId: def.id });
      await runEffect(state, pi, ab.effect, { player: pi, stackUid: s.uid, sourceCardId: def.id });
      return false;
    }
    case 'playEvent': {
      const idx = p.hand.findIndex((c) => c.uid === a.cardUid);
      if (idx < 0) throw new Error('Card not in hand');
      const def = cardDef(state, p.hand[idx].cardId);
      if (def.type !== 'event') throw new Error('Not an event');
      const cost = eventCost(state, pi, def);
      if (cost > p.supply) throw new Error('Cannot afford');
      const stacks = (a.characters || []).map((uid) => findStack(state, pi, uid));
      if (stacks.some((s) => !s || !canAct(s))) throw new Error('Chosen Characters must be upright');
      if (new Set(a.characters || []).size !== (a.characters || []).length) throw new Error('Duplicate Characters');
      const waive = eventReduction(state, pi);
      const covered = assignmentCovers(state, def, stacks, waive);
      if (covered < 0) throw new Error('Requirements not met');
      const units = requirementUnits(def).length;
      let waived = units - covered;
      if (waived > 0) {
        const fromMod = consumeMod(p, 'eventCharReduction', waived);
        waived -= fromMod;
        if (waived > 0) p.turn.ingenuityUsed = true;
      }
      p.supply -= cost;
      const [c] = p.hand.splice(idx, 1);
      for (const s of stacks) s.orientation = BUSY;
      p.stats.eventsPlayed++;
      p.turn.eventsPlayed++;
      log(state, pi, `${p.name} plays ${def.name}${stacks.length ? ` using ${stacks.map((s) => topCard(state, s).name).join(' and ')}` : ''}.`, { kind: 'playEvent', player: pi, uid: c.uid, cardId: def.id, limited: def.kind === 'limited', chars: stacks.map((s) => s.uid) });
      if (def.kind === 'limited') {
        p.events.push({ uid: c.uid, cardId: c.cardId, remaining: def.duration });
      } else {
        await runEffect(state, pi, def.effect, { player: pi, sourceCardId: def.id });
        p.dump.push(c);
      }
      await fireHook(state, 'onEventPlayed', { player: pi, eventDef: def });
      return false;
    }
    case 'announce': {
      const s = findStack(state, pi, a.charUid);
      if (!s || !canAct(s)) throw new Error('Character cannot announce');
      if (!canPledge(state, pi, null, s)) throw new Error(`Opening a bid needs a Character costing at least ${pledgeMinCost(state, null, pi)}`);
      if (!state.market.city.includes(a.cardId)) throw new Error('Card not in Capital City');
      if (state.market.pending.some((pd) => pd.cardId === a.cardId)) throw new Error('Card already pending');
      const minBid = minBidFor(state, pi, a.cardId);
      const bid = Math.floor(a.bid ?? minBid);
      if (bid < minBid || bid > p.supply) throw new Error('Invalid bid');
      const snapshot = {};
      for (const t of p.town) if (t.orientation === UPRIGHT) snapshot[topCard(state, t).species] = (snapshot[topCard(state, t).species] || 0) + 1;
      p.supply -= bid;
      p.escrow += bid;
      const bonus = bidBonus(state, pi);
      const pd = {
        id: nextUid(state), cardId: a.cardId, announcer: pi, high: pi, bid, bonus,
        committed: [0, 0], chars: [[], []], rounds: [], unchallengeable: false,
        turnAnnounced: state.turnNumber, lastBidTurn: state.turnNumber,
      };
      pd.committed[pi] = bid;
      pd.chars[pi].push(s.uid);
      s.lockedBid = pd.id; // committed to the auction: it will not ready until the bidding is over
      pd.rounds.push({ player: pi, bid, bonus, turn: state.turnNumber });
      if (hasMod(p, 'unchallengeable')) {
        consumeMod(p, 'unchallengeable');
        pd.unchallengeable = true;
      }
      s.orientation = BUSY;
      state.market.pending.push(pd);
      p.turn.announcements++;
      p.turn.bids++;
      p.stats.announcements++;
      log(state, pi, `${p.name} announces a purchase of ${cardDef(state, a.cardId).name} with ${topCard(state, s).name}, bidding ${bid}${bonus ? ` (+${bonus})` : ''}${pd.unchallengeable ? ' (cannot be raised against)' : ''}.`, { kind: 'announce', player: pi, cardId: a.cardId, uid: s.uid, bid, bonus });
      await fireHook(state, 'onAnnounce', { player: pi, stackUid: s.uid, uprightSpeciesSnapshot: snapshot, pendingId: pd.id });
      return false;
    }
    case 'raise': {
      const pd = state.market.pending.find((x) => x.id === a.pendingId);
      if (!pd) throw new Error('No such auction');
      if (pd.high === pi) throw new Error('You are already the high bidder');
      if (pd.unchallengeable) throw new Error('This auction cannot be raised against');
      const s = findStack(state, pi, a.charUid);
      if (!s || !canAct(s)) throw new Error('Character cannot bid');
      if (!canPledge(state, pi, pd, s)) throw new Error(`Bid ${pd.chars[pi].length + 1} in this auction needs a Character costing at least ${pledgeMinCost(state, pd, pi)}`);
      const minBid = raiseMinBid(state, pi, pd);
      const bid = Math.floor(a.bid ?? minBid);
      const pay = raisePayment(state, pi, pd, bid);
      if (bid < minBid || pay > p.supply) throw new Error('Invalid bid');
      s.orientation = BUSY;
      p.stats.challenges++;
      p.turn.bids++;
      const bonus = bidBonus(state, pi);
      const o = state.players[pd.high];
      if (hasMod(o, 'cancelNextChallenge')) {
        consumeMod(o, 'cancelNextChallenge');
        log(state, pi, `${p.name} bids on ${cardDef(state, pd.cardId).name}, but the raise is cancelled by Quiet Mediation.`, { kind: 'raise', player: pi, cardId: pd.cardId, uid: s.uid, bid, cancelled: true });
        return false;
      }
      if (getMod(p, 'challengeDiscount')) consumeMod(p, 'challengeDiscount');
      p.supply -= pay;
      p.escrow += pay;
      pd.committed[pi] += pay;
      pd.chars[pi].push(s.uid);
      s.lockedBid = pd.id;
      pd.high = pi;
      pd.bid = bid;
      pd.bonus = bonus;
      pd.lastBidTurn = state.turnNumber;
      pd.rounds.push({ player: pi, bid, bonus, turn: state.turnNumber });
      log(state, pi, `${p.name} outbids ${o.name} for ${cardDef(state, pd.cardId).name} with ${topCard(state, s).name}, bidding ${bid}${bonus ? ` (+${bonus})` : ''} (round ${pd.rounds.length}).`, { kind: 'raise', player: pi, cardId: pd.cardId, uid: s.uid, bid, bonus, round: pd.rounds.length, cancelled: false });
      await fireHook(state, 'onChallengedByOpponent', { player: opponentOf(pi), pendingId: pd.id });
      return false;
    }
    case 'rehire': {
      const idx = p.unemployment.findIndex((c) => c.uid === a.cardUid);
      if (idx < 0) throw new Error('Not in Unemployment');
      const def = cardDef(state, p.unemployment[idx].cardId);
      const cost = rehireCost(state, pi, def.id);
      if (cost > p.supply) throw new Error('Cannot afford');
      p.supply -= cost;
      if (getMod(p, 'rehireDiscount')) consumeMod(p, 'rehireDiscount');
      const [c] = p.unemployment.splice(idx, 1);
      const s = makeStack(state, pi, c, UPRIGHT);
      log(state, pi, `${p.name} rehires ${def.name}, ${def.title} for ${cost} Supply (upright).`, { kind: 'rehire', player: pi, uid: s.uid, cardUid: c.uid, cardId: def.id, cost });
      return false;
    }
    default:
      throw new Error(`Unknown action ${a.type}`);
  }
}
