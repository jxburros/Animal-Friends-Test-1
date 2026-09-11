// Effect interpreter, hooks, and shared mutations (draw, discard, unemploy, shifts, market gains).
import { shuffle } from './rng.js';
import {
  cardDef, topCard, log, nextUid, opponentOf, entryOrientation, rankOf, abilitySources, hasPassive,
  hasMod, consumeMod, isUpright, speciesInTown, refillCity, UPRIGHT, BUSY, findStack,
} from './state.js';

// ---------- agent I/O ----------
// Every decision goes through ask(); the agent returns a value (or Promise). Invalid answers fall back to a default.
export async function ask(state, pi, req) {
  const agent = state.agents && state.agents[pi];
  let answer;
  if (agent && typeof agent.choose === 'function') {
    try {
      answer = await agent.choose(state, pi, req);
    } catch (e) {
      log(state, pi, `Agent error on ${req.kind}: ${e.message}`);
    }
  }
  return validateAnswer(req, answer);
}

function validateAnswer(req, a) {
  switch (req.kind) {
    case 'resources':
      return a === 'draw' || a === 'supply' ? a : 'supply';
    case 'confirm':
      return typeof a === 'boolean' ? a : !!req.default;
    case 'pick': {
      const ids = new Set(req.options.map((o) => o.uid));
      const arr = Array.isArray(a) ? a.filter((x, i, self) => ids.has(x) && self.indexOf(x) === i) : [];
      if (arr.length >= req.min && arr.length <= req.max) return arr;
      if (arr.length > req.max) return arr.slice(0, req.max);
      // too few: pad with first unused options
      const out = arr.slice();
      for (const o of req.options) {
        if (out.length >= req.min) break;
        if (!out.includes(o.uid)) out.push(o.uid);
      }
      return out;
    }
    case 'order': {
      const ids = req.options.map((o) => o.uid);
      if (Array.isArray(a) && a.length === ids.length && ids.every((id) => a.includes(id))) return a;
      return ids;
    }
    case 'action':
      return a; // validated by the game loop
    default:
      return a;
  }
}

const inst = (state, c) => ({ uid: c.uid, cardId: c.cardId, name: cardDef(state, c.cardId).name });
const stackOpt = (state, s) => ({ uid: s.uid, cardId: s.cards[0].cardId, name: `${topCard(state, s).name}, ${topCard(state, s).title}`, orientation: s.orientation });

// ---------- basic mutations ----------
export function gainSupply(state, pi, n, why = '') {
  if (n <= 0) return 0;
  const p = state.players[pi];
  p.supply += n;
  p.stats.supplyEarned += n;
  log(state, pi, `${p.name} gains ${n} Supply${why ? ` (${why})` : ''}.`);
  return n;
}
export function loseSupply(state, pi, n, { byOpponent = false } = {}) {
  const p = state.players[pi];
  if (byOpponent && hasMod(p, 'lossShield')) {
    const prevented = consumeMod(p, 'lossShield', n);
    n -= prevented;
    if (prevented) log(state, pi, `${p.name} prevents ${prevented} Supply loss.`);
  }
  n = Math.min(n, p.supply);
  p.supply -= n;
  return n;
}
export function draw(state, pi, n, why = '') {
  const p = state.players[pi];
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    if (p.deck.length === 0 && p.dump.length > 0 && state.rules.deckOut.shuffleTownDumpIntoDeck) {
      p.deck = shuffle(state, p.dump.splice(0));
      log(state, pi, `${p.name} shuffles the Town Dump into a new deck.`);
    }
    const c = p.deck.shift();
    if (!c) break;
    p.hand.push(c);
    drawn++;
  }
  if (drawn) log(state, pi, `${p.name} draws ${drawn} card${drawn === 1 ? '' : 's'}${why ? ` (${why})` : ''}.`);
  return drawn;
}
export async function discard(state, pi, n, { byOpponent = false } = {}) {
  const p = state.players[pi];
  if (byOpponent && hasMod(p, 'lossShield')) {
    log(state, pi, `${p.name} ignores the discard effect.`);
    return 0;
  }
  const count = Math.min(n, p.hand.length);
  if (count === 0) return 0;
  const chosen = await ask(state, pi, { kind: 'pick', reason: 'discard', from: 'hand', options: p.hand.map((c) => inst(state, c)), min: count, max: count });
  for (const uid of chosen) {
    const i = p.hand.findIndex((c) => c.uid === uid);
    const [c] = p.hand.splice(i, 1);
    p.dump.push(c);
    log(state, pi, `${p.name} discards ${cardDef(state, c.cardId).name}.`);
  }
  return chosen.length;
}

export function makeStack(state, pi, cardInst, orientation) {
  const p = state.players[pi];
  const s = { uid: nextUid(state), cards: [cardInst], orientation, shift: null, enteredTurn: state.turnNumber, hasBeenUpright: orientation === UPRIGHT, readyNextTurn: false };
  p.town.push(s);
  return s;
}

export async function completeShift(state, pi, stack) {
  const p = state.players[pi];
  const def = topCard(state, stack);
  let out = stack.shift.output;
  const bonus = consumeMod(p, 'shiftBonus');
  out += bonus;
  stack.shift = null;
  p.stats.shiftsCompleted++;
  p.turn.shiftsCompleted++;
  gainSupply(state, pi, out, `${def.name}'s shift${bonus ? `, +${bonus} bonus` : ''}`);
  await fireHook(state, 'onShiftCompleted', { player: pi, stackUid: stack.uid });
}

export async function readyStack(state, pi, stack, why = '') {
  if (stack.shift && state.rules.shifts.readyEffectCompletesShift) await completeShift(state, pi, stack);
  stack.shift = null;
  stack.orientation = UPRIGHT;
  stack.hasBeenUpright = true;
  stack.readyNextTurn = false;
  log(state, pi, `${topCard(state, stack).name} is readied${why ? ` (${why})` : ''}.`);
}

/** Send a stack to Unemployment following the knock-down rule. Returns false if prevented. */
export async function unemployStack(state, ownerPi, stack, { byEffect = true, sourcePi = null } = {}) {
  const p = state.players[ownerPi];
  if (byEffect && hasMod(p, 'unemploymentShield')) {
    log(state, ownerPi, `${p.name}'s Characters are protected; ${topCard(state, stack).name} stays in town.`);
    return false;
  }
  const idx = p.town.indexOf(stack);
  if (idx < 0) return false;
  p.town.splice(idx, 1);
  const [top, ...rest] = stack.cards;
  if (rest.length === 0) {
    p.unemployment.push(top);
    log(state, ownerPi, `${cardDef(state, top.cardId).name}, ${cardDef(state, top.cardId).title} is sent to Unemployment.`);
  } else {
    p.dump.push(top);
    p.unemployment.push(rest[0]);
    p.dump.push(...rest.slice(1));
    log(state, ownerPi, `${cardDef(state, top.cardId).name} is knocked down: ${cardDef(state, top.cardId).title} goes to the Town Dump and ${cardDef(state, rest[0].cardId).title} goes to Unemployment.`);
  }
  if (byEffect) await fireHook(state, 'onCharacterUnemployed', { player: ownerPi, listeners: [0, 1], sourcePlayer: sourcePi });
  return true;
}

export function checkVictory(state) {
  if (state.winner !== null) return;
  for (const p of state.players) {
    if (p.victoryRow.length >= state.rules.victory.statuesToWin) {
      state.winner = p.index;
      state.result = 'statues';
      log(state, p.index, `${p.name} controls ${p.victoryRow.length} Statues and wins the game!`);
      return;
    }
  }
}

/** Winner gains a Capital City card: statues stay in the Victory Row; market cards resolve and are disposed. */
export async function gainMarketCard(state, pi, cardId, why = '') {
  const p = state.players[pi];
  const def = cardDef(state, cardId);
  log(state, pi, `${p.name} gains ${def.name}${why ? ` (${why})` : ''}.`);
  if (def.type === 'statue') {
    p.victoryRow.push(cardId);
    if (def.onGain) await runEffect(state, pi, def.onGain, { sourceCardId: cardId });
    checkVictory(state);
  } else {
    if (def.onGain) await runEffect(state, pi, def.onGain, { sourceCardId: cardId });
    if (def.disposal === 'outOfPlay') state.market.outOfPlay.push(cardId);
    else state.market.cityDump.push(cardId);
  }
  p.stats.purchasesWon++;
  await fireHook(state, 'onGainMarketCard', { player: pi, cardId, nonStatue: def.type !== 'statue' });
  refillCity(state);
}

// ---------- hooks ----------
/**
 * Fire a trigger. ctx.player is the primary player; ctx.listeners lists which players' sources may respond (default [ctx.player]).
 */
export async function fireHook(state, trigger, ctx) {
  const listeners = ctx.listeners || [ctx.player];
  for (const pi of listeners) {
    for (const src of abilitySources(state, pi)) {
      const ab = src.ability;
      if (ab.trigger !== trigger) continue;
      if (ctx.selfOnly && (!src.stack || src.stack.uid !== ctx.selfOnly)) continue;
      if (ab.requiresUpright && src.kind === 'character' && !isUpright(src.stack)) continue;
      if (!conditionHolds(state, pi, src, ab.condition, ctx)) continue;
      const p = state.players[pi];
      if (ab.oncePerTurn) {
        if (p.turn.usedOnce.includes(src.key)) continue;
        p.turn.usedOnce.push(src.key);
      }
      log(state, pi, `${src.def.name}${src.def.title ? `, ${src.def.title}` : ''} triggers.`);
      await runEffect(state, pi, ab.effect, { ...ctx, sourceCardId: src.def.id, sourceStackUid: src.stack ? src.stack.uid : null });
    }
  }
}

function conditionHolds(state, pi, src, cond, ctx) {
  if (!cond) return true;
  const p = state.players[pi];
  const opp = state.players[opponentOf(pi)];
  if (cond.self && ctx.stackUid !== (src.stack && src.stack.uid)) return false;
  if (cond.announcerIsSelf && ctx.stackUid !== (src.stack && src.stack.uid)) return false;
  if (cond.onlyUprightOfSpecies) {
    const sp = src.def.species;
    const uprightSame = p.town.filter((s) => s.orientation === UPRIGHT && topCard(state, s).species === sp);
    if (!(uprightSame.length === 1 && uprightSame[0] === src.stack) && !(ctx.uprightSpeciesSnapshot && ctx.uprightSpeciesSnapshot[sp] === 1)) return false;
  }
  if (cond.otherCharacterInTown) {
    const f = cond.otherCharacterInTown;
    if (!p.town.some((s) => s !== src.stack && matchesFilter(state, s, f))) return false;
  }
  if (cond.eventRequiresStudy) {
    const ev = ctx.eventDef;
    if (!ev || !(ev.requires || []).some((r) => r.study === cond.eventRequiresStudy)) return false;
  }
  if (cond.nonStatue && !ctx.nonStatue) return false;
  if (cond.unemploymentNotMoreThanOpponent && p.unemployment.length > opp.unemployment.length) return false;
  if (cond.minSpeciesInTown && speciesInTown(state, pi).size < cond.minSpeciesInTown) return false;
  return true;
}

export function matchesFilter(state, stack, f = {}) {
  const def = topCard(state, stack);
  if (f.study && def.study !== f.study) return false;
  if (f.species && def.species !== f.species) return false;
  if (f.rank && rankOf(state.rules, def.cost) !== f.rank) return false;
  if (f.maxCost !== undefined && def.cost > f.maxCost) return false;
  if (f.cost !== undefined && def.cost !== f.cost) return false;
  return true;
}

// ---------- effect interpreter ----------
export async function runEffect(state, pi, eff, ctx = {}) {
  if (!eff) return;
  const p = state.players[pi];
  const oi = opponentOf(pi);
  const o = state.players[oi];
  switch (eff.do) {
    case 'seq':
      for (const step of eff.steps) await runEffect(state, pi, step, ctx);
      return;
    case 'gainSupply':
      gainSupply(state, pi, eff.amount, ctx.sourceCardId ? cardDef(state, ctx.sourceCardId).name : '');
      return;
    case 'opponentGainSupply':
      gainSupply(state, oi, eff.amount, ctx.sourceCardId ? cardDef(state, ctx.sourceCardId).name : '');
      return;
    case 'giveSupplyToOpponent': {
      const n = Math.min(eff.amount, p.supply);
      p.supply -= n;
      gainSupply(state, oi, eff.amount, `${cardDef(state, ctx.sourceCardId).name}`);
      return;
    }
    case 'draw':
      draw(state, pi, eff.count, ctx.sourceCardId ? cardDef(state, ctx.sourceCardId).name : '');
      return;
    case 'discard':
      await discard(state, pi, eff.count);
      return;
    case 'addMod':
      p.mods.push({ key: eff.key, value: eff.value, expires: eff.expires || 'untilUsed', consumable: !!eff.consumable, source: ctx.sourceCardId || null });
      log(state, pi, `${p.name} gains an ongoing effect: ${eff.key} (${eff.value}).`);
      return;
    case 'readyCharacter': {
      const opts = p.town.filter((s) => s.orientation !== UPRIGHT && matchesFilter(state, s, eff.filter));
      if (!opts.length) return;
      const max = Math.min(eff.count || 1, opts.length);
      const chosen = await ask(state, pi, { kind: 'pick', reason: 'ready', from: 'town', options: opts.map((s) => stackOpt(state, s)), min: eff.optional ? 0 : Math.min(1, max), max });
      for (const uid of chosen) await readyStack(state, pi, findStack(state, pi, uid), cardDef(state, ctx.sourceCardId).name);
      return;
    }
    case 'readyNextTurn': {
      const f = { ...(eff.filter || {}) };
      const notSelf = f.notSelf;
      delete f.notSelf;
      const opts = p.town.filter((s) => matchesFilter(state, s, f) && !(notSelf && s.uid === ctx.stackUid) && (s.orientation !== UPRIGHT || s.shift));
      if (!opts.length) return;
      const chosen = await ask(state, pi, { kind: 'pick', reason: 'readyNextTurn', from: 'town', options: opts.map((s) => stackOpt(state, s)), min: eff.optional ? 0 : 1, max: 1 });
      for (const uid of chosen) {
        findStack(state, pi, uid).readyNextTurn = true;
        log(state, pi, `${topCard(state, findStack(state, pi, uid)).name} will be upright at the start of ${p.name}'s next turn.`);
      }
      return;
    }
    case 'rehire': {
      const opts = p.unemployment.filter((c) => {
        const d = cardDef(state, c.cardId);
        if (eff.filter && eff.filter.cost !== undefined && d.cost !== eff.filter.cost) return false;
        if (eff.filter && eff.filter.maxCost !== undefined && d.cost > eff.filter.maxCost) return false;
        return eff.free || Math.max(0, d.cost - (eff.discount || 0)) <= p.supply;
      });
      if (!opts.length) return;
      const chosen = await ask(state, pi, { kind: 'pick', reason: 'rehire', from: 'unemployment', options: opts.map((c) => inst(state, c)), min: eff.optional ? 0 : 1, max: 1 });
      for (const uid of chosen) {
        const c = p.unemployment.splice(p.unemployment.findIndex((x) => x.uid === uid), 1)[0];
        const d = cardDef(state, c.cardId);
        const cost = eff.free ? 0 : Math.max(0, d.cost - (eff.discount || 0));
        p.supply -= cost;
        makeStack(state, pi, c, UPRIGHT);
        log(state, pi, `${p.name} rehires ${d.name}, ${d.title} for ${cost} Supply (upright).`);
      }
      return;
    }
    case 'recruitFromHand': {
      const opts = p.hand.filter((c) => {
        const d = cardDef(state, c.cardId);
        return d.type === 'character' && (eff.filter?.maxCost === undefined || d.cost <= eff.filter.maxCost);
      });
      if (!opts.length) return;
      const chosen = await ask(state, pi, { kind: 'pick', reason: 'recruitFree', from: 'hand', options: opts.map((c) => inst(state, c)), min: eff.optional ? 0 : 1, max: 1 });
      for (const uid of chosen) {
        const c = p.hand.splice(p.hand.findIndex((x) => x.uid === uid), 1)[0];
        const d = cardDef(state, c.cardId);
        const orientation = eff.orientation ?? entryOrientation(state.rules, d.cost);
        const s = makeStack(state, pi, c, orientation);
        p.stats.recruits++;
        log(state, pi, `${p.name} recruits ${d.name}, ${d.title} for free (${orientation === UPRIGHT ? 'upright' : 'Busy'}).`);
        await fireHook(state, 'onRecruit', { player: pi, stackUid: s.uid, listeners: [pi], selfOnly: s.uid });
      }
      return;
    }
    case 'reorderDeckTop': {
      const n = Math.min(eff.count, p.deck.length);
      if (n < 2) return;
      const top = p.deck.slice(0, n);
      const order = await ask(state, pi, { kind: 'order', reason: 'reorderDeck', options: top.map((c) => inst(state, c)) });
      const byUid = Object.fromEntries(top.map((c) => [c.uid, c]));
      p.deck.splice(0, n, ...order.map((uid) => byUid[uid]));
      log(state, pi, `${p.name} looks at the top ${n} cards of the deck and reorders them.`);
      return;
    }
    case 'eventFromDumpToDeckBottom':
    case 'eventFromDumpToHand': {
      const opts = p.dump.filter((c) => cardDef(state, c.cardId).type === 'event');
      if (!opts.length) return;
      const chosen = await ask(state, pi, { kind: 'pick', reason: eff.do, from: 'dump', options: opts.map((c) => inst(state, c)), min: eff.optional ? 0 : 1, max: 1 });
      for (const uid of chosen) {
        const c = p.dump.splice(p.dump.findIndex((x) => x.uid === uid), 1)[0];
        if (eff.do === 'eventFromDumpToHand') {
          p.hand.push(c);
          log(state, pi, `${p.name} returns ${cardDef(state, c.cardId).name} from the Town Dump to hand.`);
        } else {
          p.deck.push(c);
          log(state, pi, `${p.name} puts ${cardDef(state, c.cardId).name} on the bottom of the deck.`);
        }
      }
      return;
    }
    case 'peekMarketDeck': {
      const top = state.market.deck.slice(0, eff.count || 1).map((id) => cardDef(state, id).name);
      p.knownMarketTop = state.market.deck.slice(0, eff.count || 1);
      log(state, pi, `${p.name} looks at the top of the Market Deck${top.length ? `: ${top.join(', ')}` : ' (empty)'}.`);
      return;
    }
    case 'opponentTopdeckFromHand': {
      if (!o.hand.length) return;
      const chosen = await ask(state, oi, { kind: 'pick', reason: 'topdeck', from: 'hand', options: o.hand.map((c) => inst(state, c)), min: 1, max: 1 });
      const c = o.hand.splice(o.hand.findIndex((x) => x.uid === chosen[0]), 1)[0];
      o.deck.unshift(c);
      log(state, oi, `${o.name} puts a card from hand on top of the deck.`);
      return;
    }
    case 'unemployOpponentCharacter': {
      if (hasMod(o, 'unemploymentShield')) {
        log(state, pi, `${o.name}'s Characters are protected from Unemployment.`);
        return;
      }
      if (eff.discardFirst && p.hand.length < eff.discardFirst) return;
      const opts = o.town.filter((s) => (!state.rules.unemployment.protectNewCharacters || s.hasBeenUpright) && (eff.maxCost === undefined || topCard(state, s).cost <= eff.maxCost));
      if (!opts.length) return;
      const chosen = await ask(state, pi, { kind: 'pick', reason: 'unemployOpponent', from: 'opponentTown', options: opts.map((s) => stackOpt(state, s)), min: eff.optional ? 0 : 1, max: 1 });
      if (!chosen.length) return;
      if (eff.discardFirst) await discard(state, pi, eff.discardFirst);
      await unemployStack(state, oi, findStack(state, oi, chosen[0]), { byEffect: true, sourcePi: pi });
      return;
    }
    case 'raiseOwnBid': {
      if (hasPassive(state, oi, 'blockOpponentBidRaise')) return;
      const own = state.market.pending.filter((pd) => pd.announcer === pi || (pd.challenge && pd.challenge.player === pi));
      if (!own.length || p.supply < eff.amount) return;
      const ok = await ask(state, pi, { kind: 'confirm', reason: 'raiseBid', default: true, options: own.map((pd) => ({ uid: pd.id, cardId: pd.cardId })) });
      if (!ok) return;
      const chosen = await ask(state, pi, { kind: 'pick', reason: 'raiseBidTarget', from: 'pending', options: own.map((pd) => ({ uid: pd.id, cardId: pd.cardId, name: cardDef(state, pd.cardId).name })), min: 1, max: 1 });
      const pd = own.find((x) => x.id === chosen[0]);
      p.supply -= eff.amount;
      p.escrow += eff.amount;
      if (pd.announcer === pi) pd.bid += eff.amount;
      else {
        pd.challenge.bid += eff.amount;
        pd.challenge.paid += eff.amount;
      }
      log(state, pi, `${p.name} raises the bid on ${cardDef(state, pd.cardId).name} by ${eff.amount}.`);
      return;
    }
    default:
      log(state, pi, `Unknown effect ${eff.do} ignored.`);
  }
}

export { BUSY };
