// Turn structure: Start → Resources → Ready → Actions → End, plus the whole-game runner.
import { cardDef, topCard, log, opponentOf, expireMods, consumeMod, hasMod, refillCity, freshTurnCounters, UPRIGHT, BUSY, findStack } from './state.js';
import { ask, draw, gainSupply, completeShift, readyStack, gainMarketCard, fireHook, checkVictory } from './effects.js';
import { legalActions, applyAction } from './actions.js';

const MAX_ACTIONS_PER_TURN = 60;

export async function startPhase(state, pi) {
  const p = state.players[pi];
  state.phase = 'start';
  state.turnNumber++;
  p.turn = freshTurnCounters();
  expireMods(p, 'nextTurnStart');
  log(state, pi, `— Turn ${state.turnNumber}: ${p.name} (Supply ${p.supply}, hand ${p.hand.length}, Statues ${p.victoryRow.length}) —`);
  // Resolve pending purchases announced by this player.
  const mine = state.market.pending.filter((pd) => pd.announcer === pi);
  for (const pd of mine) await resolvePurchase(state, pd);
  // Characters flagged to be ready at the start of this turn.
  for (const s of p.town.slice()) if (s.readyNextTurn) await readyStack(state, pi, s, 'ready-next-turn effect');
  await fireHook(state, 'onTurnStart', { player: pi });
}

export async function resolvePurchase(state, pd) {
  const m = state.market;
  m.pending.splice(m.pending.indexOf(pd), 1);
  const ann = state.players[pd.announcer];
  const def = cardDef(state, pd.cardId);
  let winner = pd.announcer;
  let tied = false;
  if (pd.challenge) {
    const ch = state.players[pd.challenge.player];
    const annEff = pd.bid + pd.bonus;
    const chEff = pd.challenge.bid + pd.challenge.bonus;
    if (chEff > annEff || (chEff === annEff && pd.challenge.winsTies)) winner = pd.challenge.player;
    tied = chEff === annEff;
    log(state, pd.announcer, `Purchase of ${def.name} resolves: ${ann.name} bid ${annEff}, ${ch.name} bid ${chEff}${tied ? ' (tie)' : ''}. ${state.players[winner].name} wins.`);
    // settle escrow
    if (winner === pd.announcer) {
      ann.escrow -= pd.bid;
      ch.escrow -= pd.challenge.paid;
      ch.supply += pd.challenge.paid;
    } else {
      ch.escrow -= pd.challenge.paid;
      ann.escrow -= pd.bid;
      ann.supply += pd.bid;
    }
  } else {
    ann.escrow -= pd.bid;
    log(state, pd.announcer, `Purchase of ${def.name} resolves unchallenged for ${pd.bid} Supply.`);
  }
  if (!m.city.includes(pd.cardId)) {
    log(state, winner, `${def.name} is no longer in the Capital City; the purchase fizzles.`);
    return;
  }
  m.city.splice(m.city.indexOf(pd.cardId), 1);
  if (tied) await fireHook(state, 'onTiedBid', { player: winner, listeners: [0, 1] });
  await gainMarketCard(state, winner, pd.cardId, pd.challenge ? 'won the bid' : 'unchallenged');
}

export async function resourcesPhase(state, pi) {
  const p = state.players[pi];
  state.phase = 'resources';
  const choice = await ask(state, pi, { kind: 'resources', options: ['draw', 'supply'] });
  if (choice === 'draw') draw(state, pi, state.rules.resources.choices.draw.cards, 'resource choice');
  else gainSupply(state, pi, state.rules.resources.choices.supply.amount, 'resource choice');
}

export async function readyPhase(state, pi) {
  const p = state.players[pi];
  state.phase = 'ready';
  const steps = 1 + (hasMod(p, 'extraAdvance') ? consumeMod(p, 'extraAdvance') : 0);
  const becameUpright = [];
  for (const s of p.town) {
    for (let k = 0; k < steps; k++) {
      if (s.orientation === UPRIGHT) break;
      if (s.shift && state.rules.shifts.blocksReadyWhileInProgress) break;
      const order = state.rules.orientation.advanceOrder;
      const i = order.indexOf(s.orientation);
      s.orientation = order[Math.min(order.length - 1, i + 1)];
      if (s.orientation === UPRIGHT) becameUpright.push(s);
    }
    if (s.orientation === UPRIGHT) s.hasBeenUpright = true;
  }
  if (becameUpright.length) log(state, pi, `Ready: ${becameUpright.map((s) => topCard(state, s).name).join(', ')} now upright.`);
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
  }
  for (const e of p.events.slice()) {
    e.remaining--;
    if (e.remaining <= 0) {
      p.events.splice(p.events.indexOf(e), 1);
      p.dump.push({ uid: e.uid, cardId: e.cardId });
      log(state, pi, `${cardDef(state, e.cardId).name} expires.`);
    }
  }
  expireMods(p, 'turnEnd');
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
    log(state, null, `Turn limit reached. ${state.winner === null ? 'The game is a draw.' : `${state.players[state.winner].name} leads on tiebreak.`}`);
  }
  return state;
}
