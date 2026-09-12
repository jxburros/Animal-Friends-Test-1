// Turn structure: Start → Resources → Ready → Actions → End, plus the whole-game runner.
import { cardDef, topCard, log, opponentOf, expireMods, consumeMod, hasMod, hasPassive, refillCity, sweepStaleCity, freshTurnCounters, UPRIGHT, BUSY, findStack } from './state.js';
import { ask, draw, gainSupply, completeShift, readyStack, gainMarketCard, fireHook, checkVictory, flushReveals } from './effects.js';
import { legalActions, applyAction, forfeitOf, auctionAtPledgeCap } from './actions.js';
import { shuffle } from './rng.js';

const MAX_ACTIONS_PER_TURN = 60;

export async function startPhase(state, pi) {
  const p = state.players[pi];
  state.phase = 'start';
  state.turnNumber++;
  p.turn = freshTurnCounters();
  expireMods(p, 'nextTurnStart');
  log(state, pi, `— Turn ${state.turnNumber}: ${p.name} (Supply ${p.supply}, hand ${p.hand.length}, Statues ${p.victoryRow.length}) —`, { kind: 'turnStart', player: pi, turn: state.turnNumber });
  // Every auction this player is still winning resolves now: the players alternate turns, so a standing
  // high bid at the start of your own turn means your rival had a turn and chose not to answer it.
  const mine = state.market.pending.filter((pd) => pd.high === pi);
  for (const pd of mine) {
    if (state.winner !== null) break; // a Statue won the game; later auctions never settle
    await resolvePurchase(state, pd);
  }
  state.market.turnsSinceGain++;
  sweepStaleCity(state);
  await flushReveals(state);
  // Characters flagged to be ready at the start of this turn.
  for (const s of p.town.slice()) if (s.readyNextTurn) await readyStack(state, pi, s, 'ready-next-turn effect');
  await fireHook(state, 'onTurnStart', { player: pi });
}

/** Free every Character pledged to this auction: they resume advancing at their owner's next Ready. */
export function releaseBidders(state, pd) {
  for (let pi = 0; pi < 2; pi++) {
    for (const uid of pd.chars[pi]) {
      const s = findStack(state, pi, uid);
      if (s && s.lockedBid === pd.id) s.lockedBid = null;
    }
  }
}

/**
 * Settle a finished auction. The winner spends everything they escrowed; the loser forfeits half of
 * theirs (Statue of Harmony's burden makes them pay it all) and is refunded the rest, so a bidding war
 * you walk away from still costs you.
 */
export async function resolvePurchase(state, pd) {
  const m = state.market;
  m.pending.splice(m.pending.indexOf(pd), 1);
  releaseBidders(state, pd);
  const def = cardDef(state, pd.cardId);
  const winner = pd.high;
  const loser = opponentOf(winner);
  const win = state.players[winner];
  const lose = state.players[loser];
  const contested = pd.rounds.length > 1;
  const winningBid = pd.bid + pd.bonus;
  const tied = contested && pd.rounds[pd.rounds.length - 2].bid + pd.rounds[pd.rounds.length - 2].bonus === winningBid;

  win.escrow -= pd.committed[winner];
  const escrowed = pd.committed[loser];
  const forfeit = forfeitOf(state, loser, escrowed);
  lose.escrow -= escrowed;
  lose.supply += escrowed - forfeit;

  log(
    state, winner,
    contested
      ? `The auction for ${def.name} closes after ${pd.rounds.length} bids: ${win.name} wins at ${winningBid}. ${lose.name} forfeits ${forfeit} of ${escrowed} Supply pledged.`
      : `Purchase of ${def.name} resolves unopposed for ${pd.bid} Supply.`,
    { kind: 'resolve', cardId: pd.cardId, winner, loser, announcer: pd.announcer, challenger: contested ? loser : null, winningBid, rounds: pd.rounds.length, tied, forfeit, refund: escrowed - forfeit },
  );
  if (forfeit > 0) log(state, loser, `${lose.name} pays ${forfeit} Supply for the losing bid and is refunded ${escrowed - forfeit}.`, { kind: 'forfeit', player: loser, forfeit, refund: escrowed - forfeit, cardId: pd.cardId });

  if (!m.city.includes(pd.cardId)) {
    log(state, winner, `${def.name} is no longer in the Capital City; the purchase fizzles.`, { kind: 'fizzle', cardId: pd.cardId, player: winner });
    return;
  }
  m.city.splice(m.city.indexOf(pd.cardId), 1);
  if (tied) await fireHook(state, 'onTiedBid', { player: winner, listeners: [0, 1] });
  await gainMarketCard(state, winner, pd.cardId, contested ? 'won the auction' : 'unopposed');
}

/**
 * Void an auction that has hit the per-Mayor pledge cap on every side: nobody can raise it further, so
 * instead of awarding it to the standing bidder it is called off. Every Mayor is refunded their escrow in
 * full (no forfeit — a capped-out standoff is nobody's loss), every pledged Character is released to ready
 * normally, and the card itself is shuffled back into the Market Deck to come up again later.
 */
export async function voidAuction(state, pd) {
  const m = state.market;
  m.pending.splice(m.pending.indexOf(pd), 1);
  releaseBidders(state, pd);
  const def = cardDef(state, pd.cardId);
  for (let pi = 0; pi < state.players.length; pi++) {
    const committed = pd.committed[pi] || 0;
    if (committed <= 0) continue;
    const p = state.players[pi];
    p.escrow -= committed;
    p.supply += committed;
  }
  log(
    state, null,
    `The auction for ${def.name} is called off after ${pd.rounds.length} bids: both Mayors have pledged all the Characters they may. Every bid is refunded in full and ${def.name} is shuffled back into the Market Deck.`,
    { kind: 'auctionVoided', cardId: pd.cardId, rounds: pd.rounds.length },
  );
  if (m.city.includes(pd.cardId)) {
    m.city.splice(m.city.indexOf(pd.cardId), 1);
    m.deck.push(pd.cardId);
    shuffle(state, m.deck);
    refillCity(state);
  }
}

/**
 * Call off any pending auction where every contesting Mayor has hit the pledge cap. A card gets one
 * reprieve: if it hits the cap again later (the same standoff replayed after reshuffling back in), the
 * second cap-out resolves for real to the standing bidder instead of voiding forever — otherwise two
 * evenly-matched Mayors can refight an identical stalemate for the rest of the game without ever settling it.
 */
export async function voidCappedAuctions(state) {
  for (const pd of state.market.pending.slice()) {
    if (!auctionAtPledgeCap(state, pd)) continue;
    if (state.market.voidedOnce[pd.cardId]) await resolvePurchase(state, pd);
    else {
      state.market.voidedOnce[pd.cardId] = true;
      await voidAuction(state, pd);
    }
  }
}

export async function resourcesPhase(state, pi) {
  const p = state.players[pi];
  state.phase = 'resources';
  const choice = await ask(state, pi, { kind: 'resources', options: ['draw', 'supply'] });
  log(state, pi, `${p.name} chooses ${choice === 'draw' ? 'to draw a card' : 'to gain Supply'}.`, { kind: 'phase', player: pi, phase: 'resources', choice });
  if (choice === 'draw') draw(state, pi, state.rules.resources.choices.draw.cards, 'resource choice');
  else {
    // Statue of Community's burden thins the resource choice.
    const amount = state.rules.resources.choices.supply.amount - (hasPassive(state, pi, 'resourceSupplyMinus1') ? 1 : 0);
    gainSupply(state, pi, Math.max(0, amount), 'resource choice');
  }
}

export async function readyPhase(state, pi) {
  const p = state.players[pi];
  state.phase = 'ready';
  let steps = 1 + (hasMod(p, 'extraAdvance') ? consumeMod(p, 'extraAdvance') : 0);
  if (hasMod(p, 'skipNextAdvance')) {
    consumeMod(p, 'skipNextAdvance');
    steps = 0;
    log(state, pi, `${p.name}'s Characters cannot advance this turn.`, { kind: 'ready', player: pi, uids: [], advanced: [], blocked: true });
  }
  const becameUpright = [];
  const advanced = [];
  for (const s of p.town) {
    // A Character pledged to an open auction stays Busy for as long as the bidding lasts.
    if (s.lockedBid) continue;
    for (let k = 0; k < steps; k++) {
      if (s.orientation === UPRIGHT) break;
      if (s.shift && state.rules.shifts.blocksReadyWhileInProgress) break;
      const order = state.rules.orientation.advanceOrder;
      const i = order.indexOf(s.orientation);
      s.orientation = order[Math.min(order.length - 1, i + 1)];
      if (!advanced.includes(s)) advanced.push(s);
      if (s.orientation === UPRIGHT) becameUpright.push(s);
    }
    if (s.orientation === UPRIGHT) s.hasBeenUpright = true;
  }
  if (advanced.length) log(state, pi, `Ready: ${becameUpright.length ? `${becameUpright.map((s) => topCard(state, s).name).join(', ')} now upright` : 'Characters turn toward upright'}.`, { kind: 'ready', player: pi, uids: becameUpright.map((s) => s.uid), advanced: advanced.map((s) => s.uid) });
  for (const s of becameUpright) await fireHook(state, 'onReady', { player: pi, stackUid: s.uid, selfOnly: s.uid });
}

export async function actionsPhase(state, pi) {
  state.phase = 'actions';
  for (let i = 0; i < MAX_ACTIONS_PER_TURN; i++) {
    if (state.winner !== null) return;
    const options = legalActions(state, pi);
    let a = await ask(state, pi, { kind: 'action', options });
    if (!a || typeof a !== 'object') a = { type: 'endTurn' };
    let done;
    try {
      done = await applyAction(state, pi, a);
    } catch (e) {
      log(state, pi, `Illegal action ${a.type} (${e.message}); turn ends.`);
      done = true;
    }
    await voidCappedAuctions(state);
    if (done) return;
  }
  log(state, pi, 'Action limit reached; turn ends.');
}

export async function endPhase(state, pi) {
  const p = state.players[pi];
  state.phase = 'end';
  for (const s of p.town.slice()) {
    if (!s.shift) continue;
    s.shift.remaining--;
    if (s.shift.remaining <= 0) await completeShift(state, pi, s);
    else log(state, pi, `${topCard(state, s).name} keeps working (${s.shift.remaining} turn${s.shift.remaining === 1 ? '' : 's'} left).`, { kind: 'shiftTick', player: pi, uid: s.uid, remaining: s.shift.remaining });
  }
  for (const e of p.events.slice()) {
    e.remaining--;
    if (e.remaining <= 0) {
      p.events.splice(p.events.indexOf(e), 1);
      p.dump.push({ uid: e.uid, cardId: e.cardId });
      log(state, pi, `${cardDef(state, e.cardId).name} expires.`, { kind: 'eventExpire', player: pi, uid: e.uid, cardId: e.cardId });
    }
  }
  await fireHook(state, 'onTurnEnd', { player: pi });
  expireMods(p, 'turnEnd');
  log(state, pi, `${p.name} ends the turn.`, { kind: 'turnEnd', player: pi });
}

/** Play one full turn for the active player. */
export async function playTurn(state) {
  const pi = state.active;
  await startPhase(state, pi);
  if (state.winner !== null) return;
  await resourcesPhase(state, pi);
  await readyPhase(state, pi);
  await actionsPhase(state, pi);
  if (state.winner !== null) return;
  await endPhase(state, pi);
  checkVictory(state);
  state.active = opponentOf(pi);
  state.phase = 'start';
}

/**
 * Run a whole game. agents: [agent0, agent1], each with choose(state, pi, request).
 * Returns the finished state. state.winner is 0/1 or null (draw); state.result explains.
 */
export async function playGame(state, agents, { maxTurnsPerPlayer } = {}) {
  state.agents = agents;
  const cap = (maxTurnsPerPlayer || state.rules.simulation.maxTurnsPerPlayer) * 2;
  while (state.winner === null && state.turnNumber < cap) await playTurn(state);
  if (state.winner === null) {
    const [a, b] = state.players;
    if (a.victoryRow.length !== b.victoryRow.length) state.winner = a.victoryRow.length > b.victoryRow.length ? 0 : 1;
    else if (a.supply !== b.supply) state.winner = a.supply > b.supply ? 0 : 1;
    state.result = 'turnLimit';
    log(state, null, `Turn limit reached. ${state.winner === null ? 'The game is a draw.' : `${state.players[state.winner].name} leads on tiebreak.`}`, { kind: 'win', player: state.winner });
  }
  return state;
}
