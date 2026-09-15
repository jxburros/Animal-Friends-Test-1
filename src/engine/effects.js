// Effect interpreter, hooks, and shared mutations (draw, discard, unemploy, shifts, market gains).
import { shuffle, rand } from './rng.js';
import {
  cardDef, topCard, log, nextUid, opponentOf, entryOrientation, rankOf, abilitySources, hasPassive,
  hasMod, consumeMod, isUpright, canAct, speciesInTown, refillCity, UPRIGHT, BUSY, findStack, hasTownRoom,
  hasBuildingRoom, canDemolishFor, buildingsBuilt, tokenKey, tokenCount, addTokens, spendTokens,
  passiveTotal, pairBonusFor,
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
/** A token kind in words, using the name printed on its card when the set declares one. */
const tokenLabel = (state, key) => {
  const card = (state.set.cards || []).find((c) => c.type === 'token' && tokenKey(c.token) === key);
  return card ? card.name : key;
};
const stackOpt = (state, s) => ({ uid: s.uid, cardId: s.cards[0].cardId, name: `${topCard(state, s).name}, ${topCard(state, s).title}`, orientation: s.orientation });

// ---------- basic mutations ----------
export function gainSupply(state, pi, n, why = '') {
  if (n <= 0) return 0;
  const p = state.players[pi];
  p.supply += n;
  p.stats.supplyEarned += n;
  log(state, pi, `${p.name} gains ${n} Supply${why ? ` (${why})` : ''}.`, { kind: 'supply', player: pi, amount: n, why });
  return n;
}
export function loseSupply(state, pi, n, { byOpponent = false } = {}) {
  const p = state.players[pi];
  if (byOpponent && hasMod(p, 'lossShield')) {
    const prevented = consumeMod(p, 'lossShield', n);
    n -= prevented;
    if (prevented) log(state, pi, `${p.name} prevents ${prevented} Supply loss.`, { kind: 'shield', player: pi, amount: prevented });
  }
  n = Math.min(n, p.supply);
  p.supply -= n;
  if (n > 0) log(state, pi, `${p.name} loses ${n} Supply.`, { kind: 'supply', player: pi, amount: -n });
  return n;
}
/**
 * Lose Supply and tell the town about it. `onSupplyLost` fires for the Mayor who actually lost
 * something — the trigger a cautious animal's cellar listens for — and never for a loss of nothing.
 * It cannot cascade: a card that reacts to a loss by causing one does not re-enter this hook.
 */
export async function loseSupplyAndNotify(state, pi, n, opts = {}) {
  const lost = loseSupply(state, pi, n, opts);
  if (lost > 0 && !state.notifyingSupplyLoss) {
    state.notifyingSupplyLoss = true;
    try {
      await fireHook(state, 'onSupplyLost', { player: pi, listeners: [pi], amount: lost });
    } finally {
      state.notifyingSupplyLoss = false;
    }
  }
  return lost;
}
export function draw(state, pi, n, why = '') {
  const p = state.players[pi];
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    // A town deck is a clock, and it is meant to outlast the game. When it does run out its Mayor
    // may shuffle the Town Dump back in, but only as many times as rules.deckOut.maxReshuffles
    // allows — once — and after that an empty deck simply draws nothing.
    if (p.deck.length === 0 && p.dump.length > 0 && state.rules.deckOut.shuffleTownDumpIntoDeck) {
      const allowed = state.rules.deckOut.maxReshuffles;
      if (typeof allowed !== 'number' || (p.reshuffles || 0) < allowed) {
        p.reshuffles = (p.reshuffles || 0) + 1;
        p.deck = shuffle(state, p.dump.splice(0));
        log(state, pi, `${p.name} shuffles the Town Dump into a new deck${typeof allowed === 'number' ? ' — the one time they may' : ''}.`, { kind: 'reshuffleDeck', player: pi, reshuffles: p.reshuffles });
      } else if (!p.deckOutAnnounced) {
        p.deckOutAnnounced = true;
        log(state, pi, `${p.name} has read their deck to the end and has nothing left to draw.`, { kind: 'deckOut', player: pi });
      }
    }
    const c = p.deck.shift();
    if (!c) break;
    p.hand.push(c);
    drawn++;
  }
  if (drawn) log(state, pi, `${p.name} draws ${drawn} card${drawn === 1 ? '' : 's'}${why ? ` (${why})` : ''}.`, { kind: 'draw', player: pi, count: drawn, uids: p.hand.slice(-drawn).map((c) => c.uid) });
  return drawn;
}
export async function discard(state, pi, n, { byOpponent = false } = {}) {
  const p = state.players[pi];
  if (byOpponent && hasMod(p, 'lossShield')) {
    log(state, pi, `${p.name} ignores the discard effect.`, { kind: 'shield', player: pi, amount: 0 });
    return 0;
  }
  const count = Math.min(n, p.hand.length);
  if (count === 0) return 0;
  const chosen = await ask(state, pi, { kind: 'pick', reason: 'discard', from: 'hand', options: p.hand.map((c) => inst(state, c)), min: count, max: count });
  for (const uid of chosen) {
    const i = p.hand.findIndex((c) => c.uid === uid);
    const [c] = p.hand.splice(i, 1);
    p.dump.push(c);
    log(state, pi, `${p.name} discards ${cardDef(state, c.cardId).name}.`, { kind: 'discard', player: pi, uid: c.uid, cardId: c.cardId });
  }
  return chosen.length;
}

export function makeStack(state, pi, cardInst, orientation) {
  const p = state.players[pi];
  const s = { uid: nextUid(state), cards: [cardInst], orientation, shift: null, enteredTurn: state.turnNumber, hasBeenUpright: orientation === UPRIGHT, readyNextTurn: false, lockedBid: null, stored: 0, protectedUntil: 0, selfReadyUsed: false, shiftsWorked: 0, pairedWith: null, pairBonus: 0 };
  p.town.push(s);
  return s;
}

export async function completeShift(state, pi, stack) {
  const p = state.players[pi];
  const def = topCard(state, stack);
  let out = stack.shift.output;
  const bonus = consumeMod(p, 'shiftBonus');
  out += bonus;
  // Two standing rates on top of the one-shot mod. `townShiftBonus` is the actuary's: the figures
  // are simply better now, so every shift this town finishes pays more for as long as he is here.
  // The pair bonus is the florist's: it pays only the two animals who were put together.
  const standing = passiveTotal(state, pi, 'townShiftBonus');
  const paired = pairBonusFor(state, pi, stack);
  out += standing + paired;
  stack.shift = null;
  // A burnt-out animal's next shift pays less than this one did (`shift.decay`), so the count of
  // shifts finished is kept on the stack rather than recomputed from anything.
  stack.shiftsWorked = (stack.shiftsWorked || 0) + 1;
  p.stats.shiftsCompleted++;
  p.turn.shiftsCompleted++;
  log(state, pi, `${def.name}, ${def.title} finishes the shift.`, { kind: 'shiftDone', player: pi, uid: stack.uid, output: out });
  const extra = bonus + standing + paired;
  gainSupply(state, pi, out, `${def.name}'s shift${extra ? `, +${extra} bonus` : ''}`);
  await fireHook(state, 'onShiftCompleted', { player: pi, stackUid: stack.uid });
}

export async function readyStack(state, pi, stack, why = '') {
  if (stack.lockedBid) return; // pledged to an open auction; nothing frees it but the auction ending
  if (stack.shift && state.rules.shifts.readyEffectCompletesShift) await completeShift(state, pi, stack);
  stack.shift = null;
  if (stack.orientation !== UPRIGHT) state.players[pi].turn.readied++;
  stack.orientation = UPRIGHT;
  stack.hasBeenUpright = true;
  stack.readyNextTurn = false;
  log(state, pi, `${topCard(state, stack).name} is readied${why ? ` (${why})` : ''}.`, { kind: 'ready', player: pi, uids: [stack.uid], advanced: [stack.uid] });
}

/** Send a stack to Unemployment following the knock-down rule. Returns false if prevented. */
export async function unemployStack(state, ownerPi, stack, { byEffect = true, sourcePi = null } = {}) {
  const p = state.players[ownerPi];
  // Yellow's wish (docs/ENGINE_API.md, sixth round): a printed animal who simply never goes to
  // Unemployment, full stop, rather than one who is shielded from it until some turn boundary.
  // `immuneToUnemployment` is a fact about the card, not a mod that can lapse or a shelter that can
  // expire mid-turn, so it is checked before anything that can — nothing in the collection currently
  // sends a Mayor's own Character to Unemployment by choice, so there is no case this should let through.
  if (byEffect && topCard(state, stack).immuneToUnemployment) {
    log(state, ownerPi, `${topCard(state, stack).name} does not go to Unemployment. Ever.`, { kind: 'shield', player: ownerPi, uid: stack.uid });
    return false;
  }
  // A sheltered animal is not merely untargetable: nothing takes them out of the town while the
  // cover holds — not a rival's removal, and not weather that falls on both towns. Their own Mayor
  // may still let them go, because a shelter is not a contract.
  if (byEffect && sourcePi !== ownerPi && isProtected(state, stack)) {
    log(state, ownerPi, `${topCard(state, stack).name} is under cover and stays in ${p.name}'s town.`, { kind: 'shield', player: ownerPi, uid: stack.uid });
    return false;
  }
  if (byEffect && hasMod(p, 'unemploymentShield')) {
    log(state, ownerPi, `${p.name}'s Characters are protected; ${topCard(state, stack).name} stays in town.`, { kind: 'shield', player: ownerPi, uid: stack.uid });
    return false;
  }
  const idx = p.town.indexOf(stack);
  if (idx < 0) return false;
  p.town.splice(idx, 1);
  // A Squirrel's cache is not lost when they lose the job: the stored Supply comes home.
  if (stack.stored) {
    gainSupply(state, ownerPi, stack.stored, 'a cache coming home');
    stack.stored = 0;
  }
  const [top, ...rest] = stack.cards;
  // Hired help is retained labour, not a citizen. The moment a hired Character would be sent to
  // Unemployment they go back to the City Dump instead: they have no house to wait in, and nobody
  // can rehire or promote them. It makes an Unemployment effect aimed at hired help a demolition.
  const mc = state.rules.market?.characters;
  if (rest.length === 0 && cardDef(state, top.cardId).type === 'marketCharacter' && mc?.returnsWhenUnemployed !== false) {
    if (mc?.returnsTo === 'outOfPlay') state.market.outOfPlay.push(top.cardId);
    else state.market.cityDump.push(top.cardId);
    log(state, ownerPi, `${cardDef(state, top.cardId).name}'s work in ${p.name}'s town is over; they go back to the Capital City.`, { kind: 'hireLeaves', player: ownerPi, stackUid: stack.uid, cardId: top.cardId });
    if (byEffect) await fireHook(state, 'onCharacterUnemployed', { player: ownerPi, listeners: [0, 1], sourcePlayer: sourcePi });
    return true;
  }
  if (rest.length === 0) {
    p.unemployment.push(top);
    log(state, ownerPi, `${cardDef(state, top.cardId).name}, ${cardDef(state, top.cardId).title} is sent to Unemployment.`, { kind: 'unemploy', player: ownerPi, stackUid: stack.uid, uid: top.uid, cardId: top.cardId });
  } else {
    p.dump.push(top);
    p.unemployment.push(rest[0]);
    p.dump.push(...rest.slice(1));
    log(state, ownerPi, `${cardDef(state, top.cardId).name} is knocked down: ${cardDef(state, top.cardId).title} goes to the Town Dump and ${cardDef(state, rest[0].cardId).title} goes to Unemployment.`, { kind: 'unemploy', player: ownerPi, stackUid: stack.uid, uid: rest[0].uid, cardId: rest[0].cardId, knockedDown: top.cardId });
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
      log(state, p.index, `${p.name} controls ${p.victoryRow.length} Statues and wins the game!`, { kind: 'win', player: p.index });
      return;
    }
  }
}

/** Winner gains a Capital City card: statues stay in the Victory Row; market cards resolve and are disposed. */
/**
 * Demolish one Building to free a place, asking which. Returns false when there is nothing to
 * demolish: a Statue can never come down, so a town whose eight places are all Statues is simply
 * full and stays that way. A Capital City Building goes to the City Dump and can be dealt again;
 * a Town Building goes home to its owner's Town Dump.
 */
export async function demolishOne(state, pi, { reason = 'demolish' } = {}) {
  const p = state.players[pi];
  if (!(p.buildings || []).length) return false;
  const options = p.buildings.map((b, i) => ({ uid: i, cardId: b.cardId, name: cardDef(state, b.cardId).name }));
  const picked = await ask(state, pi, { kind: 'pick', reason, from: 'buildings', options, min: 1, max: 1 });
  const idx = Array.isArray(picked) && picked.length ? Math.max(0, Math.min(p.buildings.length - 1, picked[0])) : 0;
  const [gone] = p.buildings.splice(idx, 1);
  if (gone.source === 'deck') p.dump.push({ uid: gone.uid, cardId: gone.cardId });
  else state.market.cityDump.push(gone.cardId);
  log(state, pi, `${p.name} demolishes ${cardDef(state, gone.cardId).name} to make room.`, { kind: 'demolish', player: pi, cardId: gone.cardId, source: gone.source });
  return true;
}

/**
 * Put a Building into a town, demolishing one first if all eight places are taken. The Statues in the
 * Victory Row stand in these places too, so a Mayor two Statues from winning has six places left for
 * everything else.
 */
export async function addBuilding(state, pi, cardId, { source = 'market', uid = null } = {}) {
  const p = state.players[pi];
  if (!p.buildings) p.buildings = [];
  if (!hasBuildingRoom(state, pi)) await demolishOne(state, pi);
  p.buildings.push({ uid: uid ?? nextUid(state), cardId, source });
  log(state, pi, `${cardDef(state, cardId).name} is built in ${p.name}'s town.`, { kind: 'build', player: pi, cardId, source });
}

/**
 * Make an empty Building place for a Statue that has just been won, by demolishing if need be.
 * Returns false when the Mayor has nothing they are willing or able to pull down, in which case the
 * purchase does not happen at all — a Statue with nowhere to stand is not won.
 */
export async function makeStatueRoom(state, pi) {
  if (hasBuildingRoom(state, pi)) return true;
  if (!canDemolishFor(state, pi)) return false;
  await demolishOne(state, pi, { reason: 'demolishForStatue' });
  return hasBuildingRoom(state, pi);
}

export async function gainMarketCard(state, pi, cardId, why = '') {
  const p = state.players[pi];
  const def = cardDef(state, cardId);
  log(state, pi, `${p.name} gains ${def.name}${why ? ` (${why})` : ''}.`, { kind: 'marketGain', player: pi, cardId, statue: def.type === 'statue', disposal: def.type === 'statue' ? 'victoryRow' : (def.disposal || 'cityDump') });
  if (def.type === 'statue') {
    p.victoryRow.push(cardId);
    if (def.onGain) await runEffect(state, pi, def.onGain, { sourceCardId: cardId });
    checkVictory(state);
  } else if (def.type === 'building') {
    // A Building stays in town and keeps working. A town holds only so many, so a fourth
    // means demolishing one: the Supply sink is the price, and the cap is the decision.
    if (def.onGain) await runEffect(state, pi, def.onGain, { sourceCardId: cardId });
    await addBuilding(state, pi, cardId, { source: 'market' });
  } else if (def.type === 'marketCharacter') {
    // A Character hired out of the Capital City. They are new in town, so they arrive Busy
    // whatever they cost, and they become ladder fuel and a worker from the next turn on.
    if (def.onGain) await runEffect(state, pi, def.onGain, { sourceCardId: cardId });
    if (!hasTownRoom(state, pi)) {
      // A full town has nowhere to put them; the hire is paid for but cannot move in.
      state.market.cityDump.push(cardId);
      log(state, pi, `${def.name} has nowhere to live in ${p.name}'s full town and moves on.`, { kind: 'marketRecruitRefused', player: pi, cardId });
    } else {
      const stack = makeStack(state, pi, { uid: nextUid(state), cardId }, BUSY);
      // A hire with a term is retained, not resident: `leavesAfter` counts down at the end of each
      // of its Mayor's turns, and when it runs out the animal goes back to the Capital City.
      if (def.leavesAfter) stack.termRemaining = def.leavesAfter;
      log(state, pi, `${def.name} moves into ${p.name}'s town, Busy after the journey${def.leavesAfter ? `, retained for ${def.leavesAfter} turn${def.leavesAfter === 1 ? '' : 's'}` : ''}.`, { kind: 'marketRecruit', player: pi, cardId, uid: stack.uid, term: def.leavesAfter || 0 });
      await fireHook(state, 'onRecruit', { player: pi, stackUid: stack.uid, selfOnly: stack.uid });
    }
  } else if (def.hold) {
    // An Event bought to keep. It was paid for at auction, so it waits in hand until the turn that
    // suits its buyer and then costs nothing and asks for nobody when it comes down.
    const c = { uid: nextUid(state), cardId };
    p.hand.push(c);
    log(state, pi, `${def.name} goes into ${p.name}'s hand, to be played when it suits them.`, { kind: 'holdToHand', player: pi, cardId, uid: c.uid });
  } else {
    if (def.onGain) await runEffect(state, pi, def.onGain, { sourceCardId: cardId });
    if (def.disposal === 'outOfPlay') state.market.outOfPlay.push(cardId);
    else state.market.cityDump.push(cardId);
  }
  p.stats.purchasesWon++;
  state.market.turnsSinceGain = 0;
  await fireHook(state, 'onGainMarketCard', { player: pi, cardId, nonStatue: def.type !== 'statue' });
  refillCity(state);
  await flushReveals(state);
}

// ---------- disruptions ----------
/**
 * Resolve every Disruption that has been dealt into the Capital City since the last flush. A Disruption
 * is never bought: it hits both towns the moment it is revealed and then goes to the City Dump.
 * Callers refill the display first, so this runs after `refillCity`.
 */
export async function flushReveals(state) {
  const m = state.market;
  let resolved = 0;
  while (m.revealQueue.length) {
    const cardId = m.revealQueue.shift();
    const def = cardDef(state, cardId);
    const braced = state.players.findIndex((pl) => hasMod(pl, 'cancelNextReveal'));
    if (braced >= 0 && def.shock) {
      consumeMod(state.players[braced], 'cancelNextReveal');
      log(state, null, `${def.name} arrives, and ${state.players[braced].name}'s town has already dug in: it passes over both towns.`, { kind: 'disruptionCancelled', cardId, player: braced });
      m.cityDump.push(cardId);
      resolved++;
      continue;
    }
    log(state, null, `${def.name} sweeps through both towns: ${def.text}`, { kind: 'disruption', cardId });
    await runEffect(state, 0, def.onReveal, { sourceCardId: cardId, global: true });
    m.cityDump.push(cardId);
    resolved++;
  }
  return resolved;
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
      log(state, pi, `${src.def.name}${src.def.title ? `, ${src.def.title}` : ''} triggers.`, { kind: 'trigger', player: pi, cardId: src.def.id, uid: src.stack ? src.stack.uid : null, source: src.kind });
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
  if (cond.statue && ctx.nonStatue !== false) return false;
  if (cond.handAtLeast !== undefined && p.hand.length < cond.handAtLeast) return false;
  if (cond.unemploymentNotMoreThanOpponent && p.unemployment.length > opp.unemployment.length) return false;
  if (cond.minSpeciesInTown && speciesInTown(state, pi).size < cond.minSpeciesInTown) return false;
  // How much this town has built. The naturalist's condition: her work is worth most to a Mayor who
  // has raised nothing, and least to one whose eight places are full. Statues are not counted —
  // they are bought, not built — so this reads the Buildings and nothing else.
  if (cond.buildingsAtMost !== undefined && buildingsBuilt(state, pi) > cond.buildingsAtMost) return false;
  if (cond.buildingsAtLeast !== undefined && buildingsBuilt(state, pi) < cond.buildingsAtLeast) return false;
  // Tokens the town is holding. Nothing on either shelf sets this yet; it is here so the first card
  // that wants to ask "have you got two Rabbit tokens?" does not have to invent the question.
  if (cond.tokensAtLeast) {
    const t = cond.tokensAtLeast;
    if (tokenCount(p, t) < (t.count ?? 1)) return false;
  }
  return true;
}

export function matchesFilter(state, stack, f = {}) {
  const def = topCard(state, stack);
  if (f.name && def.name !== f.name) return false; // a specific Character, whichever version is on top
  if (f.study && def.study !== f.study) return false;
  if (f.species && def.species !== f.species) return false;
  if (f.rank && rankOf(state.rules, def.cost) !== f.rank) return false;
  if (f.maxCost !== undefined && def.cost > f.maxCost) return false;
  if (f.cost !== undefined && def.cost !== f.cost) return false;
  return true;
}

// ---------- effect interpreter ----------

/** A Character a Hedgehog has quilled: an opponent's effect cannot choose it until its owner's next turn. */
export function isProtected(state, stack) {
  return !!stack.protectedUntil && state.turnNumber < stack.protectedUntil;
}

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
      if (n > 0 && !state.notifyingSupplyLoss) {
        state.notifyingSupplyLoss = true;
        try { await fireHook(state, 'onSupplyLost', { player: pi, listeners: [pi], amount: n }); }
        finally { state.notifyingSupplyLoss = false; }
      }
      return;
    }
    case 'draw':
      draw(state, pi, eff.count, ctx.sourceCardId ? cardDef(state, ctx.sourceCardId).name : '');
      return;
    case 'discard':
      await discard(state, pi, eff.count);
      return;
    case 'addMod': {
      // A mod's value is usually printed. `valuePer` counts something in the town instead: the
      // registrar's rate is a rate, and an office that has stamped four Buildings is better at the
      // fifth than an office that has stamped none. `max` is what keeps a scaling rate rateable —
      // a value with no ceiling is a card nobody can price, this model included.
      let value = eff.value;
      if (eff.valuePer) {
        const per = eff.valuePer === 'buildingsBuilt' ? buildingsBuilt(state, pi) : 0;
        value = (eff.value === undefined ? 1 : eff.value) * per;
        if (eff.max !== undefined) value = Math.min(value, eff.max);
        if (value <= 0) {
          log(state, pi, `${p.name}'s ${eff.key} comes to nothing this turn.`, { kind: 'mod', player: pi, key: eff.key, value: 0 });
          return;
        }
      }
      p.mods.push({ key: eff.key, value, expires: eff.expires || 'untilUsed', consumable: !!eff.consumable, filter: eff.filter || null, source: ctx.sourceCardId || null });
      log(state, pi, `${p.name} gains an ongoing effect: ${eff.key} (${value}).`, { kind: 'mod', player: pi, key: eff.key, value });
      return;
    }
    case 'readyCharacter': {
      const opts = p.town.filter((s) => s.orientation !== UPRIGHT && !s.lockedBid && matchesFilter(state, s, eff.filter));
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
      const opts = p.town.filter((s) => matchesFilter(state, s, f) && !s.lockedBid && !(notSelf && s.uid === ctx.stackUid) && (s.orientation !== UPRIGHT || s.shift));
      if (!opts.length) return;
      const chosen = await ask(state, pi, { kind: 'pick', reason: 'readyNextTurn', from: 'town', options: opts.map((s) => stackOpt(state, s)), min: eff.optional ? 0 : 1, max: 1 });
      for (const uid of chosen) {
        findStack(state, pi, uid).readyNextTurn = true;
        log(state, pi, `${topCard(state, findStack(state, pi, uid)).name} will be upright at the start of ${p.name}'s next turn.`, { kind: 'readyNextTurn', player: pi, uid });
      }
      return;
    }
    case 'rehire': {
      // `filter` reads the card in Unemployment rather than a stack in town: who is out of work, not
      // who is standing where. Cost was always here; study and species are the herbalist's version —
      // she takes the animal who came to the gate, not the cheapest one going.
      const f = eff.filter || {};
      const opts = p.unemployment.filter((c) => {
        const d = cardDef(state, c.cardId);
        if (f.cost !== undefined && d.cost !== f.cost) return false;
        if (f.maxCost !== undefined && d.cost > f.maxCost) return false;
        if (f.minCost !== undefined && d.cost < f.minCost) return false;
        if (f.study && d.study !== f.study) return false;
        if (f.species && d.species !== f.species) return false;
        return eff.free || Math.max(0, d.cost - (eff.discount || 0)) <= p.supply;
      });
      if (!opts.length) return;
      const chosen = await ask(state, pi, { kind: 'pick', reason: 'rehire', from: 'unemployment', options: opts.map((c) => inst(state, c)), min: eff.optional ? 0 : 1, max: 1 });
      for (const uid of chosen) {
        const c = p.unemployment.splice(p.unemployment.findIndex((x) => x.uid === uid), 1)[0];
        const d = cardDef(state, c.cardId);
        const cost = eff.free ? 0 : Math.max(0, d.cost - (eff.discount || 0));
        p.supply -= cost;
        const s = makeStack(state, pi, c, UPRIGHT);
        log(state, pi, `${p.name} rehires ${d.name}, ${d.title} for ${cost} Supply (upright).`, { kind: 'rehire', player: pi, uid: s.uid, cardUid: c.uid, cardId: c.cardId, cost });
      }
      return;
    }
    case 'rehireFromAnywhere': {
      // Gwen's verb, and the only hiring in the collection that does not read your own Unemployment
      // and stop there. The diner's rule is that anybody who walks in gets a shift, so the door is
      // open to three queues at once: your own animals out of work, the rival's animals out of work
      // — who are nobody's while they are face down, and become yours the moment they take the
      // shift — and the hired help lying in the City Dump with no town to go back to.
      //
      // `from` names which queues this card reaches; leaving it off opens all three. An animal taken
      // out of the rival's Unemployment is a deck card changing hands, which the card census counts
      // across both towns rather than one at a time, so nothing is created or lost by the move.
      if (!hasTownRoom(state, pi)) return; // a full town has no counter to put anybody behind
      const f = eff.filter || {};
      const from = eff.from || ['unemployment', 'opponentUnemployment', 'cityDump'];
      const affordable = (d) => eff.free || Math.max(0, (d.cost || 0) - (eff.discount || 0)) <= p.supply;
      const wanted = (d) => {
        if (!d) return false;
        if (f.cost !== undefined && d.cost !== f.cost) return false;
        if (f.maxCost !== undefined && d.cost > f.maxCost) return false;
        if (f.minCost !== undefined && d.cost < f.minCost) return false;
        if (f.study && d.study !== f.study) return false;
        if (f.species && d.species !== f.species) return false;
        if (f.name && d.name !== f.name) return false;
        return affordable(d);
      };
      const opts = [];
      if (from.includes('unemployment')) {
        for (const c of p.unemployment) {
          if (wanted(cardDef(state, c.cardId))) opts.push({ uid: `own:${c.uid}`, cardId: c.cardId, name: `${cardDef(state, c.cardId).name} (out of work here)`, where: 'unemployment', cardUid: c.uid });
        }
      }
      if (from.includes('opponentUnemployment')) {
        for (const c of o.unemployment) {
          if (wanted(cardDef(state, c.cardId))) opts.push({ uid: `opp:${c.uid}`, cardId: c.cardId, name: `${cardDef(state, c.cardId).name} (out of work across the way)`, where: 'opponentUnemployment', cardUid: c.uid });
        }
      }
      if (from.includes('cityDump')) {
        state.market.cityDump.forEach((id, i) => {
          const d = cardDef(state, id);
          if (d && d.type === 'marketCharacter' && wanted(d)) opts.push({ uid: `dump:${i}`, cardId: id, name: `${d.name} (nobody's, out of the City Dump)`, where: 'cityDump', index: i });
        });
      }
      if (!opts.length) return;
      const chosen = await ask(state, pi, { kind: 'pick', reason: 'rehireFromAnywhere', from: 'anywhere', options: opts.map((x) => ({ uid: x.uid, cardId: x.cardId, name: x.name })), min: eff.optional ? 0 : 1, max: 1 });
      const pickId = chosen[0];
      const pick = opts.find((x) => x.uid === pickId) || (eff.optional ? null : opts[0]);
      if (!pick) return;
      const d = cardDef(state, pick.cardId);
      const cost = eff.free ? 0 : Math.max(0, (d.cost || 0) - (eff.discount || 0));
      if (cost > p.supply) return;
      let card;
      if (pick.where === 'cityDump') {
        const at = state.market.cityDump.indexOf(pick.cardId);
        if (at < 0) return;
        state.market.cityDump.splice(at, 1);
        card = { uid: nextUid(state), cardId: pick.cardId };
      } else {
        const owner = pick.where === 'opponentUnemployment' ? o : p;
        const at = owner.unemployment.findIndex((x) => x.uid === pick.cardUid);
        if (at < 0) return;
        card = owner.unemployment.splice(at, 1)[0];
      }
      p.supply -= cost;
      const s2 = makeStack(state, pi, card, eff.orientation ?? UPRIGHT);
      log(state, pi, `${p.name} gives ${d.name}, ${d.title} a shift for ${cost} Supply — ${pick.where === 'opponentUnemployment' ? `out of ${o.name}'s Unemployment` : pick.where === 'cityDump' ? 'off the City Dump' : 'off their own books'}.`, { kind: 'rehire', player: pi, uid: s2.uid, cardUid: card.uid, cardId: pick.cardId, cost, source: pick.where });
      await fireHook(state, 'onRecruit', { player: pi, stackUid: s2.uid, listeners: [pi], selfOnly: s2.uid });
      return;
    }
    case 'recruitFromHand': {
      if (!hasTownRoom(state, pi)) return; // a full town cannot take another body
      const opts = p.hand.filter((c) => {
        const d = cardDef(state, c.cardId);
        return d.type === 'character' && (eff.filter?.maxCost === undefined || d.cost <= eff.filter.maxCost);
      });
      if (!opts.length) return;
      const chosen = await ask(state, pi, { kind: 'pick', reason: 'recruitFree', from: 'hand', options: opts.map((c) => inst(state, c)), min: eff.optional ? 0 : 1, max: 1 });
      for (const uid of chosen) {
        const c = p.hand.splice(p.hand.findIndex((x) => x.uid === uid), 1)[0];
        const d = cardDef(state, c.cardId);
        // A card may say how it arrives (`entersUpright`), and an animal who arrives ready arrives
        // ready however she got here — out of hand for free is still arriving.
        const orientation = eff.orientation ?? (d.entersUpright ? UPRIGHT : entryOrientation(state.rules, d.cost));
        const s = makeStack(state, pi, c, orientation);
        p.stats.recruits++;
        log(state, pi, `${p.name} recruits ${d.name}, ${d.title} for free (${orientation === UPRIGHT ? 'upright' : 'Busy'}).`, { kind: 'recruit', player: pi, uid: s.uid, cardUid: c.uid, cardId: c.cardId, cost: 0, upgrade: false });
        await fireHook(state, 'onRecruit', { player: pi, stackUid: s.uid, listeners: [pi], selfOnly: s.uid });
        // `then` is the rider the friend arrives with: it runs only when somebody actually came out
        // of hand, which is what separates it from putting the same step in a `seq`. Declining the
        // recruit declines the rider with it.
        if (eff.then) await runEffect(state, pi, eff.then, { ...ctx, recruitedStackUid: s.uid });
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
      log(state, pi, `${p.name} looks at the top ${n} cards of the deck and reorders them.`, { kind: 'peekDeck', player: pi, count: n });
      return;
    }
    case 'searchDeck': {
      // The whole deck, not the top of it. Every other way a town looks at its own cards is a look
      // at what is coming — `reorderDeckTop` and `scryDeck` both work the first few — and this is
      // the animal who goes and fetches the card you actually want. It is the dearest thing a
      // Character does, which is why every card printed with it charges Supply for the privilege:
      // a search with no price is a deck that holds one card in four copies and draws it every game.
      const f = eff.filter || {};
      const legal = p.deck.filter((c) => {
        const d = cardDef(state, c.cardId);
        if (!d) return false;
        if (f.type && d.type !== f.type) return false;
        if (f.typeIn && !f.typeIn.includes(d.type)) return false;
        if (f.maxCost !== undefined && (d.cost || 0) > f.maxCost) return false;
        if (f.study && d.study !== f.study) return false;
        if (f.species && d.species !== f.species) return false;
        if (f.name && d.name !== f.name) return false;
        return true;
      });
      const max = Math.min(eff.count || 1, legal.length);
      if (!max) {
        // A search that finds nothing still disturbs the deck, and the rival still watched you do it.
        p.deck = shuffle(state, p.deck);
        log(state, pi, `${p.name} goes through the whole deck and finds nothing worth carrying back.`, { kind: 'searchDeck', player: pi, found: 0 });
        return;
      }
      const chosen = await ask(state, pi, { kind: 'pick', reason: 'searchDeck', from: 'deck', options: legal.map((c) => inst(state, c)), min: eff.optional ? 0 : Math.min(1, max), max });
      const taken = legal.filter((c) => chosen.includes(c.uid));
      p.deck = p.deck.filter((c) => !chosen.includes(c.uid));
      // The deck is shuffled afterwards whether anything was found or not, so a search never doubles
      // as a free look at the order of what is left.
      p.deck = shuffle(state, p.deck);
      // `to` says where the search puts what it found: the hand by default, the top of the deck for
      // a card that means to draw it in the ordinary way.
      if (eff.to === 'deckTop') p.deck.unshift(...taken);
      else p.hand.push(...taken);
      const names = taken.map((c) => cardDef(state, c.cardId).name);
      log(state, pi, `${p.name} searches the deck and carries back ${names.length ? names.join(', ') : 'nothing'}${eff.to === 'deckTop' ? ' to the top of the deck' : ''}, then shuffles.`, { kind: 'searchDeck', player: pi, found: taken.length, cardIds: taken.map((c) => c.cardId), to: eff.to || 'hand' });
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
          log(state, pi, `${p.name} returns ${cardDef(state, c.cardId).name} from the Town Dump to hand.`, { kind: 'dumpToHand', player: pi, uid: c.uid, cardId: c.cardId });
        } else {
          p.deck.push(c);
          log(state, pi, `${p.name} puts ${cardDef(state, c.cardId).name} on the bottom of the deck.`, { kind: 'dumpToDeck', player: pi, uid: c.uid, cardId: c.cardId });
        }
      }
      return;
    }
    case 'cardFromDumpToHand': {
      // The whole bin, not just the Events in it. `eventFromDumpToHand` is the narrow verb and stays
      // the narrow verb; this is the animal who goes through the Town Dump properly and comes back
      // up with whatever is in there — a Character, a Town Building, an Event, anything of yours
      // that has been used. A filter narrows it to what a particular card is allowed to reach.
      const f = eff.filter || {};
      const opts = p.dump.filter((c) => {
        const d = cardDef(state, c.cardId);
        if (f.type && d.type !== f.type) return false;
        if (f.typeIn && !f.typeIn.includes(d.type)) return false;
        if (f.maxCost !== undefined && (d.cost || 0) > f.maxCost) return false;
        if (f.study && d.study !== f.study) return false;
        if (f.species && d.species !== f.species) return false;
        if (f.name && d.name !== f.name) return false;
        return true;
      });
      if (!opts.length) return;
      const max = Math.min(eff.count || 1, opts.length);
      const chosen = await ask(state, pi, { kind: 'pick', reason: 'cardFromDumpToHand', from: 'dump', options: opts.map((c) => inst(state, c)), min: eff.optional ? 0 : Math.min(1, max), max });
      for (const uid of chosen) {
        const at = p.dump.findIndex((x) => x.uid === uid);
        if (at < 0) continue;
        const c = p.dump.splice(at, 1)[0];
        p.hand.push(c);
        log(state, pi, `${p.name} takes ${cardDef(state, c.cardId).name} back out of the Town Dump.`, { kind: 'dumpToHand', player: pi, uid: c.uid, cardId: c.cardId });
      }
      return;
    }
    case 'opponentLosesSupply': {
      // A rival's Supply, taken rather than given — the one reaching verb the collection did not
      // have. It takes what is there and no more, and the rival is told, because `onSupplyLost` is
      // a trigger animals build their turn around and a loss nobody is told about is not one.
      const take = Math.min(eff.amount, o.supply);
      if (take <= 0) return;
      o.supply -= take;
      log(state, pi, `${o.name} loses ${take} Supply to ${ctx.sourceCardId ? cardDef(state, ctx.sourceCardId).name : p.name}.`, { kind: 'supply', player: oi, delta: -take, total: o.supply });
      if (!state.notifyingSupplyLoss) {
        state.notifyingSupplyLoss = true;
        try { await fireHook(state, 'onSupplyLost', { player: oi, listeners: [oi], amount: take }); }
        finally { state.notifyingSupplyLoss = false; }
      }
      return;
    }
    case 'opponentChoice': {
      // Two hardships on the table and the rival picks which one they take. Every other reaching
      // verb decides for them; this one hands the decision across, which is a different kind of
      // pressure — the branch they leave is the one they could least afford. The branches are
      // written from the playing Mayor's side, exactly as they read on the card.
      const branches = (eff.options || []).filter((b) => b && b.effect);
      if (!branches.length) return;
      const opts = branches.map((b, i) => ({ uid: `br${i}`, name: b.label || `Option ${i + 1}` }));
      const [picked] = await ask(state, oi, { kind: 'pick', reason: 'opponentChoice', from: 'choice', options: opts, min: 1, max: 1 });
      const branch = branches[opts.findIndex((o2) => o2.uid === picked)] || branches[0];
      log(state, oi, `${o.name} chooses: ${branch.label || 'the first option'}.`, { kind: 'opponentChoice', player: oi, chooser: oi, source: pi, label: branch.label || null, cardId: ctx.sourceCardId || null });
      await runEffect(state, pi, branch.effect, ctx);
      return;
    }
    case 'peekMarketDeck': {
      const n = Math.min(eff.count || 1, state.market.deck.length);
      let ids = state.market.deck.slice(0, n);
      // `reorder` is the sky watch's half of it: knowing the order things arrive in is one thing,
      // and saying what that order is going to be is another. It is `reorderDeckTop` pointed at the
      // Capital City's deck rather than your own, so both Mayors meet what you left on top.
      if (eff.reorder && n > 1) {
        const opts = ids.map((id, i) => ({ uid: `mkt${i}`, cardId: id, name: cardDef(state, id).name }));
        const byUid = Object.fromEntries(opts.map((o) => [o.uid, o.cardId]));
        const order = await ask(state, pi, { kind: 'order', reason: 'reorderMarket', options: opts });
        ids = order.map((uid) => byUid[uid]);
        state.market.deck.splice(0, n, ...ids);
      }
      // `toBottom` is the other half of manipulating a deck neither Mayor owns: having looked, send
      // one of them to the bottom of it, where it will not be dealt into the display this game. It
      // is the only way in the collection to take a lot off the table before anybody can bid on it,
      // so it is written for the animals who read the Capital City rather than fight over it.
      let sunk = null;
      if (eff.toBottom && ids.length) {
        const opts = ids.map((id, i) => ({ uid: `sink${i}`, cardId: id, name: cardDef(state, id).name }));
        const chosen = await ask(state, pi, { kind: 'pick', reason: 'marketToBottom', from: 'marketDeck', options: opts, min: eff.optional ? 0 : 1, max: 1 });
        const at = opts.findIndex((o2) => o2.uid === chosen[0]);
        if (at >= 0) {
          sunk = ids[at];
          ids.splice(at, 1);
          state.market.deck.splice(0, n, ...ids);
          state.market.deck.push(sunk);
          log(state, pi, `${p.name} puts ${cardDef(state, sunk).name} to the bottom of the Market Deck.`, { kind: 'marketToBottom', player: pi, cardId: sunk });
        }
      }
      p.knownMarketTop = ids.slice();
      const names = ids.map((id) => cardDef(state, id).name);
      log(state, pi, `${p.name} looks at the top of the Market Deck${names.length ? `: ${names.join(', ')}` : ' (empty)'}${eff.reorder && n > 1 ? ', and puts them back in that order' : ''}.`, { kind: 'peekMarket', player: pi, cardIds: ids.slice(), reordered: !!(eff.reorder && n > 1), sunk });
      return;
    }
    case 'peekOpponentHand': {
      // The other side of the glass: the one effect in the collection that looks into a rival's hand.
      // Information only — nothing moves, and the rival is told they were read, because a card that
      // looked at your hand without saying so would be a card nobody could play around.
      if (!o.hand.length) {
        log(state, pi, `${p.name} looks across at ${o.name}'s hand and finds it empty.`, { kind: 'peekHand', player: pi, opponent: oi, cardIds: [] });
        return;
      }
      p.knownOpponentHand = o.hand.map((c) => c.cardId);
      const names = p.knownOpponentHand.map((id) => cardDef(state, id).name);
      log(state, pi, `${p.name} looks at ${o.name}'s hand: ${names.join(', ')}.`, { kind: 'peekHand', player: pi, opponent: oi, cardIds: p.knownOpponentHand.slice() });
      return;
    }
    case 'gainToken': {
      // Tokens are the small change of the town (see `tokenKey` in state.js). No card on either
      // shelf spends them yet; the verb is here so the first one that does needs no engine work.
      const key = tokenKey(eff);
      if (!key) return;
      // `per` is the ferryman's count: a chit for every animal who actually crossed, rather than a
      // flat handful whether the boat was full or empty. `charactersReadied` counts the Characters
      // who have stood up in this town this turn; `uprightCharacters` counts who is standing now.
      const per = eff.per === 'charactersReadied' ? p.turn.readied
        : eff.per === 'uprightCharacters' ? p.town.filter((st) => st.orientation === UPRIGHT).length
          : null;
      const n = per !== null ? per * (eff.count === undefined ? 1 : eff.count)
        : (eff.count === undefined ? 1 : eff.count);
      if (n <= 0) return;
      const now = addTokens(p, key, n, state.rules.tokens?.cap ?? null);
      log(state, pi, `${p.name} takes ${n} ${tokenLabel(state, key)} token${n === 1 ? '' : 's'} (now ${now}).`, { kind: 'token', player: pi, token: key, delta: n, total: now });
      return;
    }
    case 'spendToken': {
      const key = tokenKey(eff);
      if (!key) return;
      const n = eff.count === undefined ? 1 : eff.count;
      // A cost you cannot meet is not paid at all: the tokens stay where they are and the rider does
      // not run. Checking before spending is the whole of it — a part-paid price is not a price.
      if (tokenCount(p, key) < n) return;
      const spent = spendTokens(p, key, n);
      log(state, pi, `${p.name} spends ${spent} ${tokenLabel(state, key)} token${spent === 1 ? '' : 's'}.`, { kind: 'token', player: pi, token: key, delta: -spent, total: tokenCount(p, key) });
      if (eff.then) await runEffect(state, pi, eff.then, ctx);
      return;
    }
    case 'opponentTopdeckFromHand': {
      if (!o.hand.length) return;
      const chosen = await ask(state, oi, { kind: 'pick', reason: 'topdeck', from: 'hand', options: o.hand.map((c) => inst(state, c)), min: 1, max: 1 });
      const c = o.hand.splice(o.hand.findIndex((x) => x.uid === chosen[0]), 1)[0];
      o.deck.unshift(c);
      log(state, oi, `${o.name} puts a card from hand on top of the deck.`, { kind: 'topdeck', player: oi, uid: c.uid });
      return;
    }
    case 'makeBusy': {
      // The constable's verb: turn an opponent's Character one step AWAY from upright — upright
      // becomes Busy, Busy becomes a Master's half-turn — so it is a turn of tempo, not a job lost.
      // It is the mirror of advanceCharacter and keeps the same manners: never a Character mid-shift
      // (the work is not the animal's fault), never one pledged into an auction, and never one a
      // Hedgehog has quilled.
      const order = state.rules.orientation.advanceOrder;
      const opts = o.town.filter((st) => !st.lockedBid && !isProtected(state, st)
        && !(st.shift && state.rules.shifts.blocksReadyWhileInProgress)
        && order.indexOf(st.orientation) > 0
        && matchesFilter(state, st, eff.filter));
      if (!opts.length) return;
      const max = Math.min(eff.count || 1, opts.length);
      const chosen = await ask(state, pi, { kind: 'pick', reason: 'makeBusy', from: 'opponentTown', options: opts.map((st) => stackOpt(state, st)), min: eff.optional ? 0 : Math.min(1, max), max });
      for (const uid of chosen) {
        const st = findStack(state, oi, uid);
        if (!st || st.lockedBid) continue;
        const at = order.indexOf(st.orientation);
        if (at <= 0) continue;
        st.orientation = order[at - 1];
        log(state, pi, `${topCard(state, st).name} is put back to work in ${o.name}'s town.`, { kind: 'makeBusy', player: oi, uid: st.uid, orientation: st.orientation });
      }
      return;
    }
    case 'unemployOpponentCharacter': {
      if (hasMod(o, 'unemploymentShield')) {
        log(state, pi, `${o.name}'s Characters are protected from Unemployment.`, { kind: 'shield', player: oi });
        return;
      }
      if (eff.discardFirst && p.hand.length < eff.discardFirst) return;
      const opts = o.town.filter((s) => (!state.rules.unemployment.protectNewCharacters || s.hasBeenUpright) && !isProtected(state, s) && (eff.maxCost === undefined || topCard(state, s).cost <= eff.maxCost));
      if (!opts.length) return;
      const chosen = await ask(state, pi, { kind: 'pick', reason: 'unemployOpponent', from: 'opponentTown', options: opts.map((s) => stackOpt(state, s)), min: eff.optional ? 0 : 1, max: 1 });
      if (!chosen.length) return;
      if (eff.discardFirst) await discard(state, pi, eff.discardFirst);
      await unemployStack(state, oi, findStack(state, oi, chosen[0]), { byEffect: true, sourcePi: pi });
      return;
    }
    // ---- shared shocks (Disruption cards): these always hit both towns, whoever is active ----
    case 'everyoneUnemploys': {
      // The gentle shared shock. Recession empties both towns; this asks each Mayor to let one or two
      // animals go, choosing for themselves. It is the shape most of the set's Unemployment should
      // take: weather that falls on both towns and rewards the Mayor who prepared, rather than a
      // pointed removal aimed at one player (Section 2, "build a town, not a prison").
      const count = eff.count ?? 1;
      for (const pl of state.players) {
        if (hasMod(pl, 'unemploymentShield')) {
          log(state, pl.index, `${pl.name}'s Characters are protected from Unemployment.`, { kind: 'shield', player: pl.index });
          continue;
        }
        for (let k = 0; k < count; k++) {
          const opts = pl.town.filter((st) => (!state.rules.unemployment.protectNewCharacters || st.hasBeenUpright)
            && !isProtected(state, st)
            && (eff.maxCost === undefined || topCard(state, st).cost <= eff.maxCost));
          if (!opts.length) break;
          const chosen = await ask(state, pl.index, { kind: 'pick', reason: 'unemployOwn', from: 'town', options: opts.map((st) => stackOpt(state, st)), min: 1, max: 1 });
          const target = chosen.length ? findStack(state, pl.index, chosen[0]) : opts[0];
          await unemployStack(state, pl.index, target, { byEffect: true, sourcePi: null });
        }
      }
      return;
    }
    case 'allCharactersToUnemployment': {
      for (const pl of state.players) {
        for (const s of pl.town.slice()) await unemployStack(state, pl.index, s, { byEffect: true, sourcePi: null });
      }
      return;
    }
    case 'endAllShifts': {
      for (const pl of state.players) {
        for (const s of pl.town) {
          if (!s.shift) continue;
          s.shift = null;
          log(state, pl.index, `${topCard(state, s).name}'s shift is abandoned unfinished.`, { kind: 'shiftDone', player: pl.index, uid: s.uid, output: 0 });
        }
      }
      return;
    }
    case 'everyoneLosesSupply':
      for (const pl of state.players) await loseSupplyAndNotify(state, pl.index, eff.amount);
      return;
    /**
     * PROTOTYPE: a flat shared toll (the County Fair). Each Mayor pays `eff.amount` Supply; a Mayor
     * who cannot cover it pays everything they have (loseSupplyAndNotify already clamps to what they
     * hold) and Busies one upright Character instead of the shortfall — the fair still gets its due,
     * one way or the other.
     */
    /**
     * PROTOTYPE: a toll set as a share of what each Mayor is actually holding, not a flat amount — a
     * wealth tax rather than a flat one. Always payable in full (a percentage of what you have is
     * never more than what you have), so there is no Busy fallback: the rich pay more in absolute
     * terms, the poor barely feel it, which is the point next to the flat-amount Fair cards.
     */
    case 'everyoneLosesPercentSupply': {
      const pct = Math.max(0, Math.min(100, eff.percent || 0)) / 100;
      for (const pl of state.players) {
        const amount = Math.round(pl.supply * pct);
        if (amount > 0) await loseSupplyAndNotify(state, pl.index, amount);
      }
      return;
    }
    case 'everyonePaysTollOrBusy': {
      for (const pl of state.players) {
        const owed = eff.amount;
        const paid = await loseSupplyAndNotify(state, pl.index, owed);
        if (paid < owed) {
          const uprights = pl.town.filter(canAct);
          if (uprights.length) {
            const options = uprights.map((s) => ({ uid: s.uid, cardId: topCard(state, s).id, name: topCard(state, s).name }));
            const picked = await ask(state, pl.index, { kind: 'pick', reason: 'tollShortfall', from: 'town', options, min: 1, max: 1 });
            const uid = Array.isArray(picked) && picked.length ? picked[0] : options[0].uid;
            const s = uprights.find((x) => x.uid === uid) || uprights[0];
            s.orientation = BUSY;
            log(state, pl.index, `${pl.name} cannot cover the full ${owed} Supply, so ${topCard(state, s).name} is put to work instead.`, { kind: 'tollShortfall', player: pl.index, uid: s.uid, owed, paid });
          }
        }
      }
      return;
    }
    case 'everyoneGainsSupply':
      for (const pl of state.players) gainSupply(state, pl.index, eff.amount, ctx.sourceCardId ? cardDef(state, ctx.sourceCardId).name : '');
      return;
    case 'everyoneDraws':
      for (const pl of state.players) draw(state, pl.index, eff.count, ctx.sourceCardId ? cardDef(state, ctx.sourceCardId).name : '');
      return;
    case 'everyoneDiscardsDownTo':
      for (const pl of state.players) await discard(state, pl.index, Math.max(0, pl.hand.length - eff.count));
      return;
    case 'blockNextReady':
      for (const pl of state.players) {
        pl.mods.push({ key: 'skipNextAdvance', value: 1, expires: 'untilUsed', source: ctx.sourceCardId || null });
        log(state, pl.index, `${pl.name}'s Characters will not advance at the next Ready.`, { kind: 'mod', player: pl.index, key: 'skipNextAdvance', value: 1 });
      }
      return;
    case 'everyoneRehiresFree': {
      // `count` is how many each Mayor takes back, and it is what makes the total shocks printable.
      // A card that empties both towns and hands back one animal is not a hard winter, it is the end
      // of the game; the borough's actual bad years are the ones everybody comes back from, shorter
      // a few animals and out of step. One is the old behaviour and stays the default.
      const times = Math.max(1, eff.count || 1);
      for (const pl of state.players) {
        for (let k = 0; k < times; k++) {
          await runEffect(state, pl.index, { do: 'rehire', free: true, optional: true }, ctx);
        }
      }
      return;
    }
    case 'raiseOwnBid': {
      if (hasPassive(state, oi, 'blockOpponentBidRaise')) return;
      const own = state.market.pending.filter((pd) => pd.high === pi); // top up an auction you are currently winning
      if (!own.length || p.supply < eff.amount) return;
      const ok = await ask(state, pi, { kind: 'confirm', reason: 'raiseBid', default: true, options: own.map((pd) => ({ uid: pd.id, cardId: pd.cardId })) });
      if (!ok) return;
      const chosen = await ask(state, pi, { kind: 'pick', reason: 'raiseBidTarget', from: 'pending', options: own.map((pd) => ({ uid: pd.id, cardId: pd.cardId, name: cardDef(state, pd.cardId).name })), min: 1, max: 1 });
      const pd = own.find((x) => x.id === chosen[0]);
      p.supply -= eff.amount;
      p.escrow += eff.amount;
      pd.committed[pi] += eff.amount;
      pd.bid += eff.amount;
      log(state, pi, `${p.name} raises the bid on ${cardDef(state, pd.cardId).name} by ${eff.amount}.`, { kind: 'raiseBid', player: pi, cardId: pd.cardId, amount: eff.amount });
      return;
    }
    case 'behindPlayerGains': {
      // On-reveal catch-up: the Mayor with fewer Statues (nobody, on a tie) gets the help.
      const [a, b] = state.players;
      if (a.victoryRow.length === b.victoryRow.length) return;
      const bi = a.victoryRow.length < b.victoryRow.length ? 0 : 1;
      if (eff.supply) gainSupply(state, bi, eff.supply, 'word from the Capital');
      if (eff.cards) draw(state, bi, eff.cards, 'word from the Capital');
      return;
    }
    case 'behindPlayerReadies': {
      const [a, b] = state.players;
      if (a.victoryRow.length === b.victoryRow.length) return;
      const bi = a.victoryRow.length < b.victoryRow.length ? 0 : 1;
      const opts = state.players[bi].town.filter((st) => st.orientation !== UPRIGHT && !st.lockedBid);
      if (!opts.length) return;
      const chosen = await ask(state, bi, { kind: 'pick', reason: 'ready', from: 'town', options: opts.map((st) => stackOpt(state, st)), min: 1, max: Math.min(eff.count || 1, opts.length) });
      for (const uid of chosen) await readyStack(state, bi, findStack(state, bi, uid), 'word from the Capital');
      return;
    }
    // ---- species signature verbs (see spec/species.json) ----
    case 'storeSupply': {
      // Squirrel: cache Supply on a Character. Stored Supply is out of the economy — it cannot be bid,
      // and no shared shock can take it — until its owner draws it back down.
      const amount = Math.min(eff.amount ?? 1, p.supply);
      if (amount <= 0) return;
      const opts = p.town.filter((st) => matchesFilter(state, st, eff.filter));
      if (!opts.length) return;
      const chosen = ctx.sourceStackUid && opts.some((st) => st.uid === ctx.sourceStackUid)
        ? [ctx.sourceStackUid]
        : await ask(state, pi, { kind: 'pick', reason: 'storeSupply', from: 'town', options: opts.map((st) => stackOpt(state, st)), min: 1, max: 1 });
      const st = findStack(state, pi, chosen[0]);
      if (!st) return;
      const cap = eff.cap ?? 3;
      const room = Math.max(0, cap - (st.stored || 0));
      const put = Math.min(amount, room);
      if (put <= 0) return;
      p.supply -= put;
      st.stored = (st.stored || 0) + put;
      log(state, pi, `${topCard(state, st).name} puts ${put} Supply by (${st.stored} stored).`, { kind: 'store', player: pi, uid: st.uid, amount: put, stored: st.stored });
      // A full cache opens itself, with half again in interest. Without this a Squirrel had to spend
      // an action to get its own Supply back, which made the whole plan cost more than it paid.
      if (st.stored >= cap) {
        const total = st.stored + Math.floor(st.stored / 2);
        st.stored = 0;
        gainSupply(state, pi, total, `${topCard(state, st).name}'s cache, opened with interest`);
      }
      return;
    }
    case 'takeStoredSupply': {
      const opts = p.town.filter((st) => (st.stored || 0) > 0);
      if (!opts.length) return;
      let taken = 0;
      for (const st of opts) {
        taken += st.stored;
        st.stored = 0;
      }
      // A hoard grows: half again on what was put by. This is what pays a Squirrel back for being
      // the slowest species in the game, and it is why storing is a plan rather than a delay.
      const interest = Math.floor(taken / 2);
      gainSupply(state, pi, taken + interest, interest ? 'a hoard opened, with interest' : 'stored Supply');
      return;
    }
    case 'takeFromCityDump': {
      // Raccoon: the shared City Dump is nobody's and therefore a Raccoon's.
      const dump = state.market.cityDump;
      if (!dump.length) return;
      // Only ordinary Market cards: a Raccoon scavenges, it does not walk off with a Building.
      const legal = dump.filter((id) => cardDef(state, id).type === 'market');
      if (!legal.length) return;
      const chosen = await ask(state, pi, {
        kind: 'pick', reason: 'takeFromCityDump', from: 'cityDump',
        options: legal.map((id, i) => ({ uid: i, cardId: id, name: cardDef(state, id).name })), min: 1, max: 1,
      });
      const cardId = legal[Math.max(0, Math.min(legal.length - 1, chosen[0] ?? 0))];
      dump.splice(dump.indexOf(cardId), 1);
      log(state, pi, `${p.name} fishes ${cardDef(state, cardId).name} out of the City Dump.`, { kind: 'scavenge', player: pi, cardId });
      await gainMarketCard(state, pi, cardId, 'salvaged');
      return;
    }
    case 'protectCharacter': {
      // Hedgehog: a Character an opponent's effect simply cannot reach, until this player's next turn.
      // `filter: { notSelf: true }` is the grandparently version: the quills go around somebody else.
      // Without it the source Character protects itself whenever it legally can, as it always has.
      //
      // Two things make this a stronger shield than it was. `turns` is how many of the protected
      // Mayor's turns it holds for, and a protected animal is now out of reach of Unemployment
      // itself — a rival's removal, and the weather that falls on both towns — rather than merely
      // untargetable. `everyone: true` is Oatmeal's: the shelter is put up over the whole square,
      // so each Mayor names one of their own animals and both are covered. That it helps the rival
      // too is the price of it being this good, and it is the only protection in the collection
      // written from outside one town.
      const pf = { ...(eff.filter || {}) };
      const protectNotSelf = pf.notSelf;
      delete pf.notSelf;
      const turns = Math.max(1, eff.turns || 1);
      const self = ctx.sourceStackUid || ctx.stackUid;
      const shelter = async (pl, allowSelf) => {
        const opts = pl.town.filter((st) => matchesFilter(state, st, pf) && !(protectNotSelf && allowSelf && st.uid === self));
        if (!opts.length) return;
        const auto = allowSelf && !protectNotSelf && ctx.sourceStackUid && opts.some((st) => st.uid === ctx.sourceStackUid);
        const chosen = auto
          ? [ctx.sourceStackUid]
          : await ask(state, pl.index, { kind: 'pick', reason: 'protect', from: 'town', options: opts.map((st) => stackOpt(state, st)), min: 1, max: 1 });
        const st = findStack(state, pl.index, chosen[0]) || opts[0];
        if (!st) return;
        st.protectedUntil = state.turnNumber + 2 * turns;
        log(state, pl.index, `${topCard(state, st).name} is under cover: nothing may take them out of ${pl.name}'s town until ${pl.name}'s ${turns > 1 ? `${turns}th turn from now` : 'next turn'}.`, { kind: 'protect', player: pl.index, uid: st.uid, turns });
      };
      if (eff.everyone) {
        // The playing Mayor first, so the card reads in the order it is printed.
        await shelter(p, true);
        await shelter(o, false);
        return;
      }
      await shelter(p, true);
      return;
    }
    case 'moveShift': {
      // Otter: hand the work to somebody else. The shift keeps its remaining time and output.
      const working = p.town.filter((st) => st.shift && !st.lockedBid);
      const free = p.town.filter((st) => !st.shift && !st.lockedBid && st.orientation === UPRIGHT);
      if (!working.length || !free.length) return;
      const from = await ask(state, pi, { kind: 'pick', reason: 'moveShiftFrom', from: 'town', options: working.map((st) => stackOpt(state, st)), min: 1, max: 1 });
      const to = await ask(state, pi, { kind: 'pick', reason: 'moveShiftTo', from: 'town', options: free.map((st) => stackOpt(state, st)), min: 1, max: 1 });
      const a = findStack(state, pi, from[0]);
      const b = findStack(state, pi, to[0]);
      if (!a || !b || a === b || !a.shift) return;
      b.shift = a.shift;
      a.shift = null;
      b.orientation = BUSY;
      a.orientation = UPRIGHT;
      a.hasBeenUpright = true;
      log(state, pi, `${topCard(state, a).name} hands the shift to ${topCard(state, b).name} and steps back upright.`, { kind: 'moveShift', player: pi, from: a.uid, to: b.uid });
      return;
    }
    case 'advanceCharacter': {
      // Owl: the wake-up call. A Character turns one step toward upright outside the Ready phase —
      // a Master at 180° becomes Busy, a Busy Character stands up. It does not touch work in progress:
      // a shift keeps its Character Busy for its full delay whoever is hooting at it (that is Otter
      // territory), and a pledged Character stays where it is. Owls wake the ones who are merely asleep.
      const f = { ...(eff.filter || {}) };
      const notSelf = f.notSelf;
      delete f.notSelf;
      const opts = p.town.filter((st) => st.orientation !== UPRIGHT && !st.lockedBid
        && !(st.shift && state.rules.shifts.blocksReadyWhileInProgress)
        && !(notSelf && st.uid === (ctx.sourceStackUid || ctx.stackUid))
        && matchesFilter(state, st, f));
      if (!opts.length) return;
      const max = Math.min(eff.count || 1, opts.length);
      const chosen = await ask(state, pi, { kind: 'pick', reason: 'advance', from: 'town', options: opts.map((st) => stackOpt(state, st)), min: eff.optional ? 0 : Math.min(1, max), max });
      const why = ctx.sourceCardId ? cardDef(state, ctx.sourceCardId).name : '';
      for (const uid of chosen) {
        const st = findStack(state, pi, uid);
        if (!st || st.orientation === UPRIGHT || st.lockedBid) continue;
        const order = state.rules.orientation.advanceOrder;
        const next = order[Math.min(order.length - 1, order.indexOf(st.orientation) + 1)];
        if (next === UPRIGHT) {
          await readyStack(state, pi, st, why);
        } else {
          st.orientation = next;
          log(state, pi, `${topCard(state, st).name} turns one step toward upright${why ? ` (${why})` : ''}.`, { kind: 'ready', player: pi, uids: [], advanced: [st.uid] });
        }
      }
      return;
    }
    case 'scryDeck': {
      // Look at the top cards of your own deck and put any you do not want on the bottom; the rest
      // stay on top in the same order. Squirrels reorder; astronomers just know what to look past.
      const n = Math.min(eff.count || 1, p.deck.length);
      if (n < 1) return;
      const top = p.deck.slice(0, n);
      const chosen = await ask(state, pi, { kind: 'pick', reason: 'scry', from: 'deck', options: top.map((c) => inst(state, c)), min: 0, max: n });
      const picked = top.filter((c) => chosen.includes(c.uid));
      // `to: 'dump'` is the auditor's version: what you do not want is out of the deck for good
      // (until the Town Dump is shuffled back in), rather than merely postponed to the bottom.
      const toDump = eff.to === 'dump';
      if (picked.length) {
        p.deck = p.deck.filter((c) => !chosen.includes(c.uid));
        if (toDump) p.dump.push(...picked);
        else p.deck.push(...picked);
      }
      const what = picked.length ? ` and ${toDump ? `sends ${picked.length} to the Town Dump` : `puts ${picked.length} on the bottom`}` : '';
      log(state, pi, `${p.name} looks at the top ${n} card${n === 1 ? '' : 's'} of the deck${what}.`, { kind: 'peekDeck', player: pi, count: n, bottomed: toDump ? 0 : picked.length, dumped: toDump ? picked.length : 0 });
      return;
    }
    case 'coinFlip': {
      // Chance the borough can actually call: the ha'penny goes up, and one of two things happens.
      // It reads the same seeded rng every shuffle uses, so a game is still replayable from its seed
      // and a test can still say what the coin did. Either side may be left off — a flip with only
      // `heads` is a card that does something half the time and nothing the other half, which is a
      // real card and not a broken one.
      const heads = rand(state) < 0.5;
      log(state, pi, `${p.name} tosses a coin: ${heads ? 'heads' : 'tails'}.`, { kind: 'coinFlip', player: pi, heads, cardId: ctx.sourceCardId || null });
      const branch = heads ? eff.heads : eff.tails;
      if (branch) await runEffect(state, pi, branch, ctx);
      return;
    }
    case 'giveToUnemployed': {
      // The baker's verb, and pointedly not a rehire: nobody is paid and nobody is hired back onto
      // terms. An animal with nothing is fed, and turns up — Busy, because being fed is not the same
      // as being ready. No Supply changes hands, so a rehire discount neither helps nor applies.
      const f = eff.filter || {};
      const opts = p.unemployment.filter((c) => {
        const d = cardDef(state, c.cardId);
        if (f.maxCost !== undefined && d.cost > f.maxCost) return false;
        if (f.cost !== undefined && d.cost !== f.cost) return false;
        if (f.study && d.study !== f.study) return false;
        if (f.species && d.species !== f.species) return false;
        return true;
      });
      if (!opts.length || !hasTownRoom(state, pi)) return;
      const chosen = await ask(state, pi, { kind: 'pick', reason: 'giveToUnemployed', from: 'unemployment', options: opts.map((c) => inst(state, c)), min: eff.optional ? 0 : 1, max: 1 });
      for (const uid of chosen) {
        const at = p.unemployment.findIndex((x) => x.uid === uid);
        if (at < 0) continue;
        const c = p.unemployment.splice(at, 1)[0];
        const d = cardDef(state, c.cardId);
        const st = makeStack(state, pi, c, BUSY);
        log(state, pi, `${d.name}, ${d.title} is fed and comes back to work in ${p.name}'s town (Busy).`, { kind: 'rehire', player: pi, uid: st.uid, cardUid: c.uid, cardId: c.cardId, cost: 0, fed: true });
      }
      return;
    }
    case 'pairCharacters': {
      // Two animals who are worth more to each other. The source Character is one half of it and
      // picks the other; an Event, which has no stack of its own, puts two of the town together.
      // The bond is held on both stacks and read back through the partner, so it lapses the moment
      // either of them stops standing in this town — which is what a pairing is.
      const bonus = eff.bonus === undefined ? 1 : eff.bonus;
      const self = ctx.sourceStackUid ? findStack(state, pi, ctx.sourceStackUid) : null;
      const eligible = (st) => st !== self && !st.pairedWith && matchesFilter(state, st, eff.filter);
      const opts = p.town.filter(eligible);
      if (!opts.length) return;
      let a = self;
      let b = null;
      if (a && a.pairedWith) return; // already somebody's, and a pairing is not swapped about
      if (!a) {
        if (opts.length < 2) return;
        const first = await ask(state, pi, { kind: 'pick', reason: 'pair', from: 'town', options: opts.map((st) => stackOpt(state, st)), min: 1, max: 1 });
        a = findStack(state, pi, first[0]);
        if (!a) return;
      }
      const rest = p.town.filter((st) => st !== a && eligible(st));
      if (!rest.length) return;
      const second = await ask(state, pi, { kind: 'pick', reason: 'pair', from: 'town', options: rest.map((st) => stackOpt(state, st)), min: 1, max: 1 });
      b = findStack(state, pi, second[0]);
      if (!b || b === a) return;
      a.pairedWith = b.uid;
      b.pairedWith = a.uid;
      a.pairBonus = bonus;
      b.pairBonus = bonus;
      log(state, pi, `${topCard(state, a).name} and ${topCard(state, b).name} work together: each of their shifts pays ${bonus} more.`, { kind: 'pair', player: pi, uids: [a.uid, b.uid], bonus });
      return;
    }
    case 'swapBuilding': {
      // The yard's trade: the old mangle out, the mended one in. One of this town's Buildings comes
      // down — a bought one to the City Dump, a built one home to its own Town Dump — and a Building
      // somebody else threw away goes up in the place it left. Nothing happens unless both halves
      // can: a town with nothing up has nothing to trade, and an empty Dump has nothing to trade for.
      if (!(p.buildings || []).length) return;
      const spares = state.market.cityDump.filter((id) => cardDef(state, id).type === 'building');
      if (!spares.length) return;
      if (eff.optional) {
        const go = await ask(state, pi, { kind: 'confirm', reason: 'swapBuilding', default: true });
        if (!go) return;
      }
      const chosen = await ask(state, pi, {
        kind: 'pick', reason: 'takeFromCityDump', from: 'cityDump',
        options: spares.map((id, i) => ({ uid: i, cardId: id, name: cardDef(state, id).name })), min: 1, max: 1,
      });
      const cardId = spares[Math.max(0, Math.min(spares.length - 1, chosen[0] ?? 0))];
      if (!await demolishOne(state, pi, { reason: 'swapBuilding' })) return;
      state.market.cityDump.splice(state.market.cityDump.indexOf(cardId), 1);
      log(state, pi, `${p.name} puts ${cardDef(state, cardId).name} up in its place.`, { kind: 'scavenge', player: pi, cardId });
      await addBuilding(state, pi, cardId, { source: 'market' });
      return;
    }
    case 'eventFromOpponentDump': {
      // The one pair of hands that crosses the alley. Events go to their own town's Dump and stay
      // there; a Raccoon at the gate at dusk is how one comes back out of somebody else's.
      const opts = o.dump.filter((c) => cardDef(state, c.cardId).type === 'event');
      if (!opts.length) return;
      const chosen = await ask(state, pi, { kind: 'pick', reason: 'eventFromOpponentDump', from: 'opponentDump', options: opts.map((c) => inst(state, c)), min: eff.optional ? 0 : 1, max: 1 });
      for (const uid of chosen) {
        const at = o.dump.findIndex((x) => x.uid === uid);
        if (at < 0) continue;
        const c = o.dump.splice(at, 1)[0];
        p.hand.push(c);
        log(state, pi, `${p.name} takes ${cardDef(state, c.cardId).name} out of ${o.name}'s Town Dump.`, { kind: 'dumpToHand', player: pi, uid: c.uid, cardId: c.cardId, fromOpponent: true });
      }
      return;
    }
    case 'selfReady': {
      // Cat: act when a Character should not be able to. Once per game per card, tracked on the stack.
      const st = ctx.sourceStackUid ? findStack(state, pi, ctx.sourceStackUid) : null;
      if (!st || st.lockedBid) return;
      if (eff.oncePerGame && st.selfReadyUsed) return;
      st.selfReadyUsed = true;
      await readyStack(state, pi, st, cardDef(state, ctx.sourceCardId).name);
      return;
    }
    case 'cancelReveal': {
      // Badger: stand in the way of the next on-reveal Market card.
      p.mods.push({ key: 'cancelNextReveal', value: 1, expires: 'nextTurnStart', consumable: true, source: ctx.sourceCardId || null });
      log(state, pi, `${p.name}'s town braces for the next shock from the Capital City.`, { kind: 'mod', player: pi, key: 'cancelNextReveal', value: 1 });
      return;
    }
    default:
      log(state, pi, `Unknown effect ${eff.do} ignored.`);
  }
}

/** True when an effect is the Cat's bare self-ready (alone, or the first step of a sequence). */
export function isSelfReadyEffect(eff) {
  if (!eff) return false;
  if (eff.do === 'selfReady') return true;
  return eff.do === 'seq' && Array.isArray(eff.steps) && eff.steps.length > 0 && eff.steps[0].do === 'selfReady';
}

export { BUSY };
