// The eighth round (docs/ENGINE_API.md, v0.14.0): the verbs built for the maker's second batch.
// Each one is here because a card in spec/maker_card_set.json says it and nothing in the engine
// could say it before — the fortune-teller's window on the rival's deck, the building that opens
// its doors on the hour, the whole hand of Otters, the search for a word rather than a keyword, the
// rate paid over roofs, and the shutter that comes down for a turn.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, addStack, addToHand, addToDeckTop, setSupply, makeScriptedAgent, pickAgentFor,
  giveBuilding, UPRIGHT, BUSY,
} from './helpers.mjs';
import { runEffect, fireHook, mentionsWord } from '../src/engine/effects.js';
import { cardDef } from '../src/engine/state.js';

function stage(opts = {}) {
  const state = newGame(opts);
  state.phase = 'actions';
  state.active = 0;
  state.players[0].hand = [];
  state.players[1].hand = [];
  state.agents = [makeScriptedAgent(), makeScriptedAgent()];
  return state;
}

// -------------------------------------------------- peekOpponentDeck: Elvira's third window

test('peekOpponentDeck reads the top of the rival deck, moves nothing, and says so out loud', async () => {
  const state = stage();
  addToDeckTop(state, 1, 'mk_peanut_ledger_0');
  addToDeckTop(state, 1, 'mk_clover_market_gardener_2');
  const before = state.players[1].deck.map((c) => c.cardId);
  const logged = state.log.length;

  await runEffect(state, 0, { do: 'peekOpponentDeck', count: 2 }, { player: 0 });

  assert.deepEqual(state.players[1].deck.map((c) => c.cardId), before, 'nothing is taken or reordered');
  assert.deepEqual(state.players[0].knownOpponentDeckTop, before.slice(0, 2), 'the reader knows the two');
  const entry = state.log.slice(logged).find((e) => e.fx && e.fx.kind === 'peekOpponentDeck');
  assert.ok(entry, 'the rival is told they were read');
  assert.deepEqual(entry.fx.cardIds, before.slice(0, 2));
});

test('peekOpponentDeck on an empty deck is a reading that finds nothing, not a crash', async () => {
  const state = stage();
  state.players[1].deck = [];
  await runEffect(state, 0, { do: 'peekOpponentDeck', count: 2 }, { player: 0 });
  const entry = state.log.find((e) => e.fx && e.fx.kind === 'peekOpponentDeck');
  assert.deepEqual(entry.fx.cardIds, []);
});

// -------------------------------------------------- readyCharacter `all`: FutureTech HQ

test('readyCharacter all stands the whole floor up, without asking which', async () => {
  const state = stage();
  const a = addStack(state, 0, 'mk_peanut_ledger_0', BUSY);
  const b = addStack(state, 0, 'mk_clover_market_gardener_2', BUSY);
  const c = addStack(state, 0, 'mk_ned_page_runner_1', UPRIGHT);
  let asked = false;
  state.agents = [{ async choose() { asked = true; return []; } }, makeScriptedAgent()];

  await runEffect(state, 0, { do: 'readyCharacter', all: true }, { player: 0, sourceCardId: 'mk_bld_futuretech_hq' });

  assert.equal(asked, false, 'the doors open on the hour; nobody is asked for a name');
  for (const s of [a, b, c]) assert.equal(s.orientation, UPRIGHT, 'everybody is up');
});

test('readyCharacter all leaves an animal pledged into an auction where they are', async () => {
  const state = stage();
  const pledged = addStack(state, 0, 'mk_peanut_ledger_0', BUSY);
  pledged.lockedBid = true;
  await runEffect(state, 0, { do: 'readyCharacter', all: true }, { player: 0, sourceCardId: 'mk_bld_futuretech_hq' });
  assert.equal(pledged.orientation, BUSY, 'a pledge is a pledge whoever opened the doors');
});

// -------------------------------------------------- recruitFromHand `count`: Otter Time!

test('recruitFromHand takes as many out of hand as the card says, and only the species named', async () => {
  const state = stage();
  const otters = ['mk_brooke_mooring_hand_0', 'mk_brooke_dock_hand_1', 'mk_abigail_five_minutes_2']
    .map((id) => addToHand(state, 0, id));
  const squirrel = addToHand(state, 0, 'mk_peanut_ledger_0');
  const town = state.players[0].town.length;
  const supply = state.players[0].supply;
  state.agents = [pickAgentFor('recruitFree', (s, pi, req) => req.options.map((o) => o.uid)), makeScriptedAgent()];

  await runEffect(state, 0, { do: 'recruitFromHand', count: 6, filter: { species: 'Otter' } }, { player: 0 });

  assert.equal(state.players[0].town.length, town + otters.length, 'every otter in the hand came out');
  assert.equal(state.players[0].supply, supply, 'and none of them was paid for');
  assert.ok(state.players[0].hand.some((c) => c.uid === squirrel.uid), 'the squirrel is still holding his hat');
});

test('recruitFromHand with no count is still the one hire it always was', async () => {
  const state = stage();
  addToHand(state, 0, 'mk_brooke_mooring_hand_0');
  addToHand(state, 0, 'mk_brooke_dock_hand_1');
  const town = state.players[0].town.length;
  state.agents = [pickAgentFor('recruitFree', (s, pi, req) => {
    assert.equal(req.max, 1, 'one hire is one hire');
    return [req.options[0].uid];
  }), makeScriptedAgent()];
  await runEffect(state, 0, { do: 'recruitFromHand', filter: { species: 'Otter' } }, { player: 0 });
  assert.equal(state.players[0].town.length, town + 1);
});

// -------------------------------------------------- searchDeck `mentions`: Release Day

test('searchDeck mentions finds every card that says the word, whatever part of it says it', async () => {
  const state = stage();
  // Named for the company, about the company, and owned by it: three different ways of saying it.
  const wanted = ['mk_tb_futuretech_store', 'mk_jim_futuretech_fanboy_5', 'mk_tb_starfish_coffee']
    .map((id) => addToDeckTop(state, 0, id));
  addToDeckTop(state, 0, 'mk_peanut_ledger_0');
  state.agents = [pickAgentFor('searchDeck', (s, pi, req) => {
    assert.equal(req.options.length, wanted.length, 'the shop, the fan and the coffee bar, and nothing else');
    return [req.options[0].uid];
  }), makeScriptedAgent()];

  await runEffect(state, 0, { do: 'searchDeck', count: 1, filter: { mentions: 'FutureTech' } }, { player: 0 });

  assert.equal(state.players[0].hand.length, 1, 'one of them is carried back');
  assert.ok(mentionsWord(cardDef(state, state.players[0].hand[0].cardId), 'futuretech'), 'and it says the word');
});

// -------------------------------------------------- gainSupply per buildingsBuilt: the Store

test('a rate paid over roofs counts the Buildings, not the animals, and honours its ceiling', async () => {
  const state = stage();
  addStack(state, 0, 'mk_peanut_ledger_0', UPRIGHT);
  setSupply(state, 0, 0);
  await runEffect(state, 0, { do: 'gainSupply', per: 'buildingsBuilt', amount: 2, max: 6 }, { player: 0 });
  assert.equal(state.players[0].supply, 0, 'a town with no roof is paid nothing, whoever is standing in it');

  giveBuilding(state, 0, 'mk_bld_weighbridge');
  giveBuilding(state, 0, 'mk_bld_hiring_hall');
  await runEffect(state, 0, { do: 'gainSupply', per: 'buildingsBuilt', amount: 2, max: 6 }, { player: 0 });
  assert.equal(state.players[0].supply, 4, 'two roofs at 2 apiece');

  giveBuilding(state, 0, 'mk_bld_bank');
  giveBuilding(state, 0, 'mk_bld_owlery');
  setSupply(state, 0, 0);
  await runEffect(state, 0, { do: 'gainSupply', per: 'buildingsBuilt', amount: 2, max: 6 }, { player: 0 });
  assert.equal(state.players[0].supply, 6, 'and the printed ceiling is a real ceiling');
});

// -------------------------------------------------- cooldownTurns: the Ice Cream Shop

test('an ability on a cooldown fires, then sits out the Mayor\'s next turn', async () => {
  const state = stage();
  const theirs = addStack(state, 1, 'mk_peanut_ledger_0', UPRIGHT);
  giveBuilding(state, 0, 'mk_tb_ice_cream_shop');
  const busyAgain = () => { theirs.orientation = UPRIGHT; };

  state.turnNumber = 10;
  await fireHook(state, 'onTurnStart', { player: 0 });
  assert.equal(theirs.orientation, BUSY, 'half the other town is in the queue');

  busyAgain();
  state.turnNumber = 12; // the Mayor's very next turn
  await fireHook(state, 'onTurnStart', { player: 0 });
  assert.equal(theirs.orientation, UPRIGHT, 'the shutter is down: nothing happens this turn');

  state.turnNumber = 14; // and the turn after that
  await fireHook(state, 'onTurnStart', { player: 0 });
  assert.equal(theirs.orientation, BUSY, 'open again');
});

test('a cooldown is kept per ability and per Mayor, not shared across the table', async () => {
  const state = stage();
  const mine = addStack(state, 0, 'mk_peanut_ledger_0', UPRIGHT);
  const theirs = addStack(state, 1, 'mk_ned_page_runner_1', UPRIGHT);
  giveBuilding(state, 0, 'mk_tb_ice_cream_shop');
  giveBuilding(state, 1, 'mk_tb_ice_cream_shop');

  state.turnNumber = 20;
  await fireHook(state, 'onTurnStart', { player: 0 });
  await fireHook(state, 'onTurnStart', { player: 1 });
  assert.equal(theirs.orientation, BUSY, 'one town queues');
  assert.equal(mine.orientation, BUSY, 'and so does the other; neither shop is shut by the other');
});
