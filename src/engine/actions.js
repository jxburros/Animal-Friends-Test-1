// Legal action enumeration and action application for the Actions phase.
import {
  cardDef, topCard, log, nextUid, opponentOf, entryOrientation, rankOf, hasPassive, hasMod, getMod, consumeMod,
  canAct, findStack, UPRIGHT, BUSY,
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
  return n;
}

function requirementUnits(def) {
  const units = [];
  for (const r of def.requires || []) for (let i = 0; i < (r.count || 1); i++) units.push(r);
  return units;
}

function unitMatches(state, stack, unit) {
  return matchesFilter(state, stack, { species: unit.species, study: unit.study });
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

export function minBidFor(state, pi, cardId) {
  const p = state.players[pi];
  let min = cardDef(state, cardId).cost;
  if (p.turn.announcements === 0 && hasPassive(state, pi, 'firstAnnounceMinBidMinus1')) min = Math.max(0, min - 1);
  return min;
}
export function bidBonus(state, pi) {
  const p = state.players[pi];
  return p.turn.bids === 0 && hasPassive(state, pi, 'firstBidPlus1') ? 1 : 0;
}
export function challengeMinBid(state, pi, pending) {
  const annEff = pending.bid + pending.bonus;
  const winsTies = hasPassive(state, pi, 'winTiesAsChallenger');
  const bonus = bidBonus(state, pi);
  return Math.max(0, (winsTies ? annEff : annEff + 1) - bonus);
}
export function challengePayment(state, pi, bid) {
  return Math.max(0, bid - getMod(state.players[pi], 'challengeDiscount'));
}
export function rehireCost(state, pi, cardId) {
  return Math.max(0, cardDef(state, cardId).cost - getMod(state.players[pi], 'rehireDiscount'));
}

// ---------- legal actions ----------
export function legalActions(state, pi) {
  const p = state.players[pi];
  const oi = opponentOf(pi);
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
    if ((def.cost || 0) > p.supply) continue;
    const assign = findEventAssignment(state, pi, def, waive);
    if (assign) acts.push({ type: 'playEvent', cardUid: c.uid, cardId: c.cardId, characters: assign.map((s) => s.uid), cost: def.cost || 0 });
  }
  // announce purchases
  const pendingIds = new Set(state.market.pending.map((pd) => pd.cardId));
  const uprights = p.town.filter(canAct);
  for (const cardId of state.market.city) {
    if (pendingIds.has(cardId)) continue;
    const minBid = minBidFor(state, pi, cardId);
    if (minBid > p.supply) continue;
    for (const s of uprights) acts.push({ type: 'announce', cardId, charUid: s.uid, bid: minBid, minBid, maxBid: p.supply });
  }
  // challenge
  for (const pd of state.market.pending) {
    if (pd.announcer !== oi || pd.challenge || pd.unchallengeable) continue;
    const minBid = challengeMinBid(state, pi, pd);
    const pay = challengePayment(state, pi, minBid);
    if (pay > p.supply) continue;
    for (const s of uprights) acts.push({ type: 'challenge', pendingId: pd.id, cardId: pd.cardId, charUid: s.uid, bid: minBid, minBid, maxBid: p.supply + (minBid - pay) });
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
  const oi = opponentOf(pi);
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
      if ((def.cost || 0) > p.supply) throw new Error('Cannot afford');
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
      p.supply -= def.cost || 0;
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
      const pd = { id: nextUid(state), cardId: a.cardId, announcer: pi, bid, bonus, charUid: s.uid, challenge: null, unchallengeable: false, turnAnnounced: state.turnNumber };
      if (hasMod(p, 'unchallengeable')) {
        consumeMod(p, 'unchallengeable');
        pd.unchallengeable = true;
      }
      s.orientation = BUSY;
      state.market.pending.push(pd);
      p.turn.announcements++;
      p.turn.bids++;
      p.stats.announcements++;
      log(state, pi, `${p.name} announces a purchase of ${cardDef(state, a.cardId).name} with ${topCard(state, s).name}, bidding ${bid}${bonus ? ` (+${bonus})` : ''}${pd.unchallengeable ? ' (cannot be challenged)' : ''}.`, { kind: 'announce', player: pi, cardId: a.cardId, uid: s.uid, bid, bonus });
      await fireHook(state, 'onAnnounce', { player: pi, stackUid: s.uid, uprightSpeciesSnapshot: snapshot, pendingId: pd.id });
      return false;
    }
    case 'challenge': {
      const pd = state.market.pending.find((x) => x.id === a.pendingId);
      if (!pd || pd.announcer !== oi) throw new Error('No such purchase to challenge');
      if (pd.challenge || pd.unchallengeable) throw new Error('Cannot challenge');
      const s = findStack(state, pi, a.charUid);
      if (!s || !canAct(s)) throw new Error('Character cannot challenge');
      const minBid = challengeMinBid(state, pi, pd);
      const bid = Math.floor(a.bid ?? minBid);
      const pay = challengePayment(state, pi, bid);
      if (bid < minBid || pay > p.supply) throw new Error('Invalid challenge bid');
      s.orientation = BUSY;
      p.stats.challenges++;
      const bonus = bidBonus(state, pi);
      p.turn.bids++;
      const o = state.players[oi];
      if (hasMod(o, 'cancelNextChallenge')) {
        consumeMod(o, 'cancelNextChallenge');
        log(state, pi, `${p.name} challenges ${cardDef(state, pd.cardId).name}, but the challenge is cancelled by Quiet Mediation.`, { kind: 'challenge', player: pi, cardId: pd.cardId, uid: s.uid, bid, cancelled: true });
        return false;
      }
      if (getMod(p, 'challengeDiscount')) consumeMod(p, 'challengeDiscount');
      p.supply -= pay;
      p.escrow += pay;
      pd.challenge = { player: pi, bid, paid: pay, bonus, charUid: s.uid, winsTies: hasPassive(state, pi, 'winTiesAsChallenger') };
      log(state, pi, `${p.name} challenges the purchase of ${cardDef(state, pd.cardId).name} with ${topCard(state, s).name}, bidding ${bid}${pd.challenge.bonus ? ` (+${pd.challenge.bonus})` : ''}.`, { kind: 'challenge', player: pi, cardId: pd.cardId, uid: s.uid, bid, bonus, cancelled: false });
      await fireHook(state, 'onChallengedByOpponent', { player: oi, pendingId: pd.id });
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
