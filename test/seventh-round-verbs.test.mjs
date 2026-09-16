// The seventh round (docs/ENGINE_API.md, v0.13.0): the verbs built for the maker's sixty-three-card
// batch. Each one is here because a card in spec/maker_card_set.json says it and nothing in the
// engine could say it before — the twins' swap, the till that charges, the animal a Mayor lets go,
// the rival's hand burnt, the day hire, the counter that reaches across the table.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, addStack, addToHand, addToUnemployment, setSupply, makeScriptedAgent, pickAgentFor,
  UPRIGHT, BUSY,
} from './helpers.mjs';
import { runEffect, completeShift } from '../src/engine/effects.js';
import { topCard } from '../src/engine/state.js';
import { canPledge } from '../src/engine/actions.js';
import { endPhase } from '../src/engine/game.js';

function stage(opts = {}) {
  const state = newGame(opts);
  state.phase = 'actions';
  state.active = 0;
  state.players[0].hand = [];
  state.players[1].hand = [];
  return state;
}

// -------------------------------------------------- swapWithHand: the twins' trick

test('swapWithHand changes who is standing in the post and keeps everything about the post', async () => {
  const state = stage();
  const stack = addStack(state, 0, 'mk_dirt_classroom_assistant_0', BUSY);
  const card = addToHand(state, 0, 'mk_squirt_club_captain_5');
  const before = { uid: stack.uid, orientation: stack.orientation, town: state.players[0].town.length };
  const supply = state.players[0].supply;
  state.agents = [pickAgentFor('swapWithHand', [card.uid]), makeScriptedAgent()];
  await runEffect(state, 0, { do: 'swapWithHand', filter: { nameIn: ['Dirt', 'Squirt'] } },
    { sourceStackUid: stack.uid, player: 0 });
  assert.equal(topCard(state, stack).name, 'Squirt', 'the other twin is in the room now');
  assert.equal(stack.uid, before.uid, 'the same post');
  assert.equal(stack.orientation, before.orientation, 'and it is still as Busy as it was');
  assert.equal(state.players[0].town.length, before.town, 'no second place in the town');
  assert.equal(state.players[0].supply, supply, 'a 0 becomes a 5 and nothing is paid');
  assert.ok(state.players[0].hand.some((c) => c.cardId === 'mk_dirt_classroom_assistant_0'),
    'and the one who stepped out is back in hand');
});

test('swapWithHand offers nobody the filter does not name', async () => {
  const state = stage();
  const stack = addStack(state, 0, 'mk_mimi_trolley_service_0', UPRIGHT);
  addToHand(state, 0, 'mk_dirt_classroom_assistant_0');
  let asked = false;
  state.agents = [{ async choose(s, pi, req) { asked = true; return []; } }, makeScriptedAgent()];
  await runEffect(state, 0, { do: 'swapWithHand', filter: { name: 'Mimi' } },
    { sourceStackUid: stack.uid, player: 0 });
  assert.equal(asked, false, 'a Squirrel in hand is not another Mimi');
  assert.equal(topCard(state, stack).name, 'Mimi');
});

// -------------------------------------------------- paySupply: the till

test('paySupply takes the Supply and runs the rider, and refuses a price it cannot meet', async () => {
  const state = stage();
  setSupply(state, 0, 3);
  state.agents = [makeScriptedAgent([true]), makeScriptedAgent()];
  const hand = state.players[0].hand.length;
  await runEffect(state, 0, { do: 'paySupply', amount: 3, then: { do: 'draw', count: 2 } }, { player: 0 });
  assert.equal(state.players[0].supply, 0);
  assert.equal(state.players[0].hand.length, hand + 2);

  const short = stage();
  setSupply(short, 0, 2);
  const held = short.players[0].hand.length;
  await runEffect(short, 0, { do: 'paySupply', amount: 3, then: { do: 'draw', count: 2 } }, { player: 0 });
  assert.equal(short.players[0].supply, 2, 'a price that cannot be met is not part-paid');
  assert.equal(short.players[0].hand.length, held, 'and the rider does not run');
});

// -------------------------------------------------- unemployOwnCharacter and opponentDiscards

test('unemployOwnCharacter lets a Mayor go of her own, through the ordinary door', async () => {
  const state = stage();
  const keep = addStack(state, 0, 'mk_mildred_branch_manager_5', UPRIGHT);
  const go = addStack(state, 0, 'mk_kitten_kitten_0', UPRIGHT);
  go.hasBeenUpright = true;
  state.agents = [pickAgentFor('unemployOwn', [go.uid]), makeScriptedAgent()];
  await runEffect(state, 0, { do: 'unemployOwnCharacter', count: 1, filter: { maxCost: 1 } }, { player: 0 });
  assert.deepEqual(state.players[0].town.map((s) => s.uid), [keep.uid], 'the cheap one went');
  assert.equal(state.players[0].unemployment.length, 1);
});

test('opponentDiscards burns the rival’s hand rather than reordering it', async () => {
  const state = stage();
  const a = addToHand(state, 1, 'mk_kitten_kitten_0');
  addToHand(state, 1, 'mk_owlet_owlet_0');
  state.agents = [makeScriptedAgent(), pickAgentFor('discard', [a.uid])];
  await runEffect(state, 0, { do: 'opponentDiscards', count: 1 }, { player: 0 });
  assert.equal(state.players[1].hand.length, 1);
  assert.equal(state.players[1].dump.length, 1, 'into their Town Dump, not on top of their deck');
  assert.equal(state.players[1].deck.every((c) => c.uid !== a.uid), true);
});

// -------------------------------------------------- the day hire

test('a day hire arrives upright, cannot be pledged, and is gone by the end of the turn', async () => {
  const state = stage();
  const card = addToHand(state, 0, 'mk_mildred_branch_manager_5');
  state.agents = [pickAgentFor('recruitFree', [card.uid]), makeScriptedAgent()];
  await runEffect(state, 0, { do: 'recruitFromHand', orientation: UPRIGHT, dayLabour: true }, { player: 0 });
  const [stack] = state.players[0].town;
  assert.equal(topCard(state, stack).name, 'Mildred');
  assert.equal(stack.orientation, UPRIGHT, 'off the morning aircraft and standing');
  assert.equal(stack.dayLabour, true);
  assert.equal(canPledge(state, 0, null, stack), false, 'nobody pledges an animal who will not be here');
  await endPhase(state, 0);
  assert.equal(state.players[0].town.length, 0, 'the day is over');
  assert.equal(state.players[0].unemployment.length, 1);
});

// -------------------------------------------------- the rival's forecourt and the rival's shifts

test('recruitFromHand for the opponent takes the body out of THEIR hand and into THEIR town', async () => {
  const state = stage();
  const card = addToHand(state, 1, 'mk_kitten_kitten_0');
  state.agents = [makeScriptedAgent(), pickAgentFor('recruitFree', [card.uid])];
  await runEffect(state, 0, { do: 'recruitFromHand', filter: { maxCost: 2 }, for: 'opponent' }, { player: 0 });
  assert.equal(state.players[0].town.length, 0);
  assert.equal(state.players[1].town.length, 1, 'they drove it home, not you');
  assert.equal(state.players[1].hand.length, 0);
});

test('opponentShiftPenalty takes Supply off the other town’s shifts and never below nothing', async () => {
  const state = stage();
  addStack(state, 0, 'mk_mildred_branch_manager_5', UPRIGHT); // the passive is value 2
  const worker = addStack(state, 1, 'mk_kitten_kitten_0', BUSY);
  worker.shift = { remaining: 0, output: 1 };
  setSupply(state, 1, 0);
  await completeShift(state, 1, worker);
  assert.equal(state.players[1].supply, 0, 'a 1-Supply shift under a 2-Supply penalty pays nothing, not minus one');

  const other = stage();
  addStack(other, 0, 'mk_mildred_teller_2', UPRIGHT); // value 1
  const w2 = addStack(other, 1, 'mk_mildred_branch_manager_5', BUSY);
  w2.shift = { remaining: 0, output: 4 };
  setSupply(other, 1, 0);
  await completeShift(other, 1, w2);
  assert.equal(other.players[1].supply, 3, 'and one Supply is withheld from a 4-Supply shift');
});

// -------------------------------------------------- the rest of the round, briefly

test('gainSupply per counts the town, and honours its printed ceiling', async () => {
  const state = stage();
  addStack(state, 0, 'mk_kitten_kitten_0', UPRIGHT);
  addStack(state, 0, 'mk_owlet_owlet_0', UPRIGHT);
  addStack(state, 0, 'mk_bunny_kit_0', BUSY);
  setSupply(state, 0, 0);
  await runEffect(state, 0, { do: 'gainSupply', per: 'uprightCharacters', amount: 1, max: 3 }, { player: 0 });
  assert.equal(state.players[0].supply, 2, 'two on their feet, one working');
  setSupply(state, 0, 0);
  await runEffect(state, 0, { do: 'gainSupply', per: 'charactersInTown', amount: 1, max: 2 }, { player: 0 });
  assert.equal(state.players[0].supply, 2, 'three in the town, capped at the printed two');
});

test('spendToken of any takes whatever kinds are there, and refuses a total it cannot cover', async () => {
  const state = stage();
  const p = state.players[0];
  p.tokens = { 'species:Mouse': 1, 'study:Food': 1 };
  setSupply(state, 0, 0);
  await runEffect(state, 0, { do: 'spendToken', of: 'any', count: 2, then: { do: 'gainSupply', amount: 4 } }, { player: 0 });
  assert.equal(state.players[0].supply, 4);
  assert.equal(Object.values(p.tokens).reduce((a, v) => a + v, 0), 0, 'two is two, whatever they were');

  p.tokens = { 'species:Mouse': 1 };
  setSupply(state, 0, 0);
  await runEffect(state, 0, { do: 'spendToken', of: 'any', count: 2, then: { do: 'gainSupply', amount: 4 } }, { player: 0 });
  assert.equal(state.players[0].supply, 0, 'a short holding spends nothing at all');
  assert.equal(p.tokens['species:Mouse'], 1);
});

test('makeBusy side self, onlySelf, and advanceCharacter across the table', async () => {
  const state = stage();
  const her = addStack(state, 0, 'mk_teresa_head_coach_3', UPRIGHT);
  addStack(state, 0, 'mk_kitten_kitten_0', UPRIGHT);
  state.agents = [makeScriptedAgent(), makeScriptedAgent()];
  await runEffect(state, 0, { do: 'makeBusy', side: 'self', onlySelf: true },
    { player: 0, sourceStackUid: her.uid });
  assert.equal(her.orientation, BUSY, 'the coach works herself hardest, and nobody else is nominated');
  assert.equal(topCard(state, state.players[0].town[1]).name, 'Kitten');
  assert.equal(state.players[0].town[1].orientation, UPRIGHT);

  const round = stage();
  const theirs = addStack(round, 1, 'mk_kitten_kitten_0', BUSY);
  round.agents = [pickAgentFor('advance', [theirs.uid]), makeScriptedAgent()];
  await runEffect(round, 0, { do: 'advanceCharacter', count: 1, side: 'opponent' }, { player: 0 });
  assert.equal(theirs.orientation, UPRIGHT, 'the doctor’s second round crosses the ward boundary');
});
