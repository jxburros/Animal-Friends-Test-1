// The sixth round of wishes: the two `wantedVerbs` the fifth round left unbuilt (Winter and Yellow,
// docs/ENGINE_API.md). Each one is here because a character's story wanted it and the engine could
// not say it, and now can.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, addStack, addToUnemployment, defineCard, setCity, UPRIGHT, BUSY,
} from './helpers.mjs';
import { unemployStack } from '../src/engine/effects.js';
import { capitalCitySize, refillCity } from '../src/engine/state.js';

function stage(opts = {}) {
  const state = newGame(opts);
  state.phase = 'actions';
  state.active = 0;
  state.players[0].hand = [];
  state.players[1].hand = [];
  return state;
}

// -------------------------------------------------- Winter: a sixth stall in the display

const EXTRA_STALL_CARD = {
  id: 'tst_extra_stall', type: 'character', name: 'Test Winter', title: 'Test Winter',
  species: 'Owl', study: 'Science', cost: 5, shift: { delay: 2, output: 5 },
  text: 'While upright, the Capital City deals one extra stall.',
  abilities: [{ trigger: 'passive', key: 'capitalCityExtraStalls', value: 1, requiresUpright: true }],
};

test('capitalCitySize reads the printed floor plus whatever either town is carrying', () => {
  const state = stage();
  assert.equal(capitalCitySize(state), state.rules.setup.capitalCitySize, 'nobody is carrying it yet');
  defineCard(state, EXTRA_STALL_CARD);
  addStack(state, 0, 'tst_extra_stall', UPRIGHT);
  assert.equal(capitalCitySize(state), state.rules.setup.capitalCitySize + 1, 'one Mayor opens a sixth stall');
});

test('the extra stall only counts while its animal is upright', () => {
  const state = stage();
  defineCard(state, EXTRA_STALL_CARD);
  addStack(state, 0, 'tst_extra_stall', BUSY);
  assert.equal(capitalCitySize(state), state.rules.setup.capitalCitySize, 'busy, not upright: no bonus stall');
});

test('the extra stall is shared: it reads for both Mayors, whoever is carrying it', () => {
  const state = stage();
  defineCard(state, EXTRA_STALL_CARD);
  addStack(state, 1, 'tst_extra_stall', UPRIGHT); // the rival's town this time
  assert.equal(capitalCitySize(state), state.rules.setup.capitalCitySize + 1);
});

test('two of them stack: a sixth stall from one town and a seventh from the other', () => {
  const state = stage();
  defineCard(state, EXTRA_STALL_CARD);
  addStack(state, 0, 'tst_extra_stall', UPRIGHT);
  addStack(state, 1, 'tst_extra_stall', UPRIGHT);
  assert.equal(capitalCitySize(state), state.rules.setup.capitalCitySize + 2);
});

test('refillCity deals up to the sixth stall while the passive holds, and stops refilling past it once it lapses', () => {
  const state = stage();
  defineCard(state, EXTRA_STALL_CARD);
  const filler = ['mk_mkt_town_bell', 'mk_mkt_penny_jar', 'mk_mkt_telescope_hire', 'mk_mkt_owl_post', 'mk_mkt_chit_tin', 'mk_mkt_night_market'];
  setCity(state, [], { deck: filler });
  const stack = addStack(state, 0, 'tst_extra_stall', UPRIGHT);
  refillCity(state);
  assert.equal(state.market.city.length, state.rules.setup.capitalCitySize + 1, 'dealt all the way up to the sixth stall');

  // Winter sits down; the display does not claw the sixth card back, it just stops refilling past
  // whatever is already standing — exactly the `>= target` guard refillCity already had.
  stack.orientation = BUSY;
  refillCity(state);
  assert.equal(state.market.city.length, state.rules.setup.capitalCitySize + 1, 'nothing is taken back once dealt');
});

// -------------------------------------------------- Yellow: never goes to Unemployment, full stop

const NEVER_UNEMPLOYED_CARD = {
  id: 'tst_immune', type: 'character', name: 'Test Yellow', title: 'Test Yellow',
  species: 'Squirrel', study: 'Entertainment', cost: 4, shift: { delay: 2, output: 4 },
  text: 'Cannot be sent to Unemployment.',
  immuneToUnemployment: true,
};

test('immuneToUnemployment blocks an opponent’s effect outright', async () => {
  const state = stage();
  defineCard(state, NEVER_UNEMPLOYED_CARD);
  const stack = addStack(state, 0, 'tst_immune', UPRIGHT);
  const sent = await unemployStack(state, 0, stack, { byEffect: true, sourcePi: 1 });
  assert.equal(sent, false, 'the send is refused');
  assert.equal(state.players[0].town.length, 1, 'still standing in the town');
  assert.equal(state.players[0].unemployment.length, 0);
});

test('immuneToUnemployment blocks a shared shock the same way it blocks a rival', async () => {
  const state = stage();
  defineCard(state, NEVER_UNEMPLOYED_CARD);
  const stack = addStack(state, 0, 'tst_immune', UPRIGHT);
  const sent = await unemployStack(state, 0, stack, { byEffect: true, sourcePi: null });
  assert.equal(sent, false, 'weather does not touch him either');
  assert.equal(state.players[0].town.length, 1);
});

test('immuneToUnemployment does not shelter a different Character standing next to him', async () => {
  const state = stage();
  defineCard(state, NEVER_UNEMPLOYED_CARD);
  addStack(state, 0, 'tst_immune', UPRIGHT);
  const ordinary = addStack(state, 0, 'mk_rosabeth_garden_hand_1', UPRIGHT);
  const sent = await unemployStack(state, 0, ordinary, { byEffect: true, sourcePi: 1 });
  assert.equal(sent, true, 'an ordinary neighbour is not covered by his printed guarantee');
  assert.equal(state.players[0].unemployment.length, 1);
});

test('it survives even a temporary shelter running out: it is a fact about the card, not a mod', async () => {
  const state = stage();
  defineCard(state, NEVER_UNEMPLOYED_CARD);
  const stack = addStack(state, 0, 'tst_immune', UPRIGHT);
  // No protectedUntil set at all, and no unemploymentShield mod either — the immunity does not lean
  // on either mechanism.
  assert.ok(!stack.protectedUntil, 'no shelter in force');
  const sent = await unemployStack(state, 0, stack, { byEffect: true, sourcePi: 1 });
  assert.equal(sent, false);
});
