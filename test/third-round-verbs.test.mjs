// The third round of wishes: the verbs the maker shelf asked for and the engine could not say.
//
// Each one exists because a character's story wanted it (their `wantedVerbs` entry in
// spec/maker_card_set.json says which), and each is pinned here by what it actually does — including
// the manners it inherits: nothing touches a Character pledged into an auction, a price that cannot
// be paid is not paid at all, and a pairing lapses on its own when one half of it stops standing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, addStack, addToDump, addToUnemployment, defineCard, giveBuilding, UPRIGHT, BUSY,
} from './helpers.mjs';
import { runEffect, completeShift, readyStack } from '../src/engine/effects.js';
import { readyPhase } from '../src/engine/game.js';

function stage() {
  const state = newGame();
  state.phase = 'actions';
  state.active = 0;
  return state;
}
/** Answer every choice with the first option offered, and yes to every confirm. */
function agentTakesFirst(state) {
  state.agents = [{ choose: async (_s, _pi, req) => (req.kind === 'pick' ? req.options.slice(0, Math.max(1, req.min)).map((o) => o.uid) : true) }, {}];
}

// ---------------------------------------------------------------- the ha'penny

test('coinFlip runs one branch or the other, and the same seed gives the same toss', async () => {
  const seen = [];
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const state = newGame({ seed });
    state.players[0].supply = 0;
    await runEffect(state, 0, {
      do: 'coinFlip',
      heads: { do: 'gainSupply', amount: 3 },
      tails: { do: 'gainSupply', amount: 1 },
    }, {});
    seen.push(state.players[0].supply);
  }
  assert.ok(seen.every((n) => n === 3 || n === 1), 'exactly one of the two branches runs');
  assert.ok(seen.includes(3) && seen.includes(1), 'both sides of the coin come up across six seeds');
  // Replayability: the same seed tosses the same way, which is what makes a game reproducible.
  const again = newGame({ seed: 1 });
  again.players[0].supply = 0;
  await runEffect(again, 0, { do: 'coinFlip', heads: { do: 'gainSupply', amount: 3 }, tails: { do: 'gainSupply', amount: 1 } }, {});
  assert.equal(again.players[0].supply, seen[0]);
});

test('coinFlip with only one branch printed does nothing on the other side', async () => {
  for (const seed of [1, 2, 3, 4]) {
    const state = newGame({ seed });
    state.players[0].supply = 0;
    await runEffect(state, 0, { do: 'coinFlip', heads: { do: 'gainSupply', amount: 2 } }, {});
    assert.ok([0, 2].includes(state.players[0].supply));
  }
});

// ---------------------------------------------------------------- the fed animal

test('giveToUnemployed brings an animal back for nothing, and brings it back Busy', async () => {
  const state = stage();
  agentTakesFirst(state);
  addToUnemployment(state, 0, 'mk_clover_seedling_helper_0');
  state.players[0].supply = 0;
  await runEffect(state, 0, { do: 'giveToUnemployed' }, {});
  assert.equal(state.players[0].unemployment.length, 0, 'the animal leaves Unemployment');
  assert.equal(state.players[0].town.length, 1);
  assert.equal(state.players[0].town[0].orientation, BUSY, 'fed is not the same as ready');
  assert.equal(state.players[0].supply, 0, 'nobody is paid: it is food, not wages');
});

test('giveToUnemployed reads its filter, and does nothing with nobody out of work', async () => {
  const state = stage();
  agentTakesFirst(state);
  addToUnemployment(state, 0, 'mk_lynnette_press_feeder_2'); // cost 2
  await runEffect(state, 0, { do: 'giveToUnemployed', filter: { maxCost: 1 } }, {});
  assert.equal(state.players[0].unemployment.length, 1, 'too dear for this card to reach');
  const empty = stage();
  agentTakesFirst(empty);
  await runEffect(empty, 0, { do: 'giveToUnemployed' }, {});
  assert.equal(empty.players[0].town.length, 0);
});

// ---------------------------------------------------------------- the pairing

test('pairCharacters pairs the source with another animal, and each of their shifts pays more', async () => {
  const state = stage();
  agentTakesFirst(state);
  const daisy = addStack(state, 0, 'mk_clover_seedling_helper_0', UPRIGHT);
  const other = addStack(state, 0, 'mk_lynnette_press_feeder_2', UPRIGHT);
  await runEffect(state, 0, { do: 'pairCharacters', bonus: 1 }, { sourceStackUid: daisy.uid });
  assert.equal(daisy.pairedWith, other.uid);
  assert.equal(other.pairedWith, daisy.uid);

  state.players[0].supply = 0;
  other.shift = { remaining: 0, output: 2 };
  await completeShift(state, 0, other);
  assert.equal(state.players[0].supply, 3, 'the partner is worth a Supply on the shift too');
});

test('a pairing lapses on its own when one half stops standing in the town', async () => {
  const state = stage();
  agentTakesFirst(state);
  const a = addStack(state, 0, 'mk_clover_seedling_helper_0', UPRIGHT);
  const b = addStack(state, 0, 'mk_lynnette_press_feeder_2', UPRIGHT);
  await runEffect(state, 0, { do: 'pairCharacters', bonus: 2 }, { sourceStackUid: a.uid });
  state.players[0].town = state.players[0].town.filter((s) => s !== b); // b is unemployed, upgraded, sent home
  state.players[0].supply = 0;
  a.shift = { remaining: 0, output: 2 };
  await completeShift(state, 0, a);
  assert.equal(state.players[0].supply, 2, 'the bonus goes with the partner');
});

// ---------------------------------------------------------------- the standing rate

test('the townShiftBonus passive pays every shift the town finishes, and stops when it does', async () => {
  const state = stage();
  defineCard(state, {
    id: 'test_actuary', type: 'character', name: 'Actuary', title: 'Test', species: 'Badger', study: 'Science',
    cost: 4, shift: { delay: 2, output: 4 },
    abilities: [{ trigger: 'passive', key: 'townShiftBonus', value: 1, requiresUpright: true }],
  });
  const actuary = addStack(state, 0, 'test_actuary', UPRIGHT);
  const worker = addStack(state, 0, 'mk_lynnette_press_feeder_2', BUSY);
  state.players[0].supply = 0;
  worker.shift = { remaining: 0, output: 2 };
  await completeShift(state, 0, worker);
  assert.equal(state.players[0].supply, 3, 'the figures are simply better now');

  actuary.orientation = BUSY; // the rate wants him standing
  state.players[0].supply = 0;
  worker.shift = { remaining: 0, output: 2 };
  await completeShift(state, 0, worker);
  assert.equal(state.players[0].supply, 2);
});

// ---------------------------------------------------------------- the yard's trade

test('swapBuilding pulls one Building down and puts a thrown-away one up in its place', async () => {
  const state = stage();
  agentTakesFirst(state);
  giveBuilding(state, 0, 'mk_bld_hiring_hall', 'market');
  state.market.cityDump.push('mk_bld_winter_stores');
  await runEffect(state, 0, { do: 'swapBuilding' }, {});
  assert.deepEqual(state.players[0].buildings.map((b) => b.cardId), ['mk_bld_winter_stores']);
  assert.ok(state.market.cityDump.includes('mk_bld_hiring_hall'), 'the old one goes to the City Dump');
  assert.ok(!state.market.cityDump.includes('mk_bld_winter_stores'));
});

test('swapBuilding needs both halves: nothing standing, or nothing to trade for, and it does not happen', async () => {
  const nothingUp = stage();
  agentTakesFirst(nothingUp);
  nothingUp.market.cityDump.push('mk_bld_winter_stores');
  await runEffect(nothingUp, 0, { do: 'swapBuilding' }, {});
  assert.equal(nothingUp.players[0].buildings.length, 0);
  assert.ok(nothingUp.market.cityDump.includes('mk_bld_winter_stores'), 'the Dump is untouched');

  const emptyDump = stage();
  agentTakesFirst(emptyDump);
  giveBuilding(emptyDump, 0, 'mk_bld_hiring_hall', 'market');
  emptyDump.market.cityDump.push('mk_mkt_penny_jar'); // a Market card is not a Building
  await runEffect(emptyDump, 0, { do: 'swapBuilding' }, {});
  assert.deepEqual(emptyDump.players[0].buildings.map((b) => b.cardId), ['mk_bld_hiring_hall']);
});

// ---------------------------------------------------------------- the other town's Dump

test('eventFromOpponentDump takes an Event out of the rival Town Dump and into your hand', async () => {
  const state = stage();
  agentTakesFirst(state);
  const ev = addToDump(state, 1, 'mk_glut_of_squash');
  addToDump(state, 1, 'mk_clover_seedling_helper_0'); // a Character in the Dump is not an Event
  const before = state.players[0].hand.length;
  await runEffect(state, 0, { do: 'eventFromOpponentDump' }, {});
  assert.equal(state.players[0].hand.length, before + 1);
  assert.equal(state.players[0].hand.at(-1).uid, ev.uid);
  assert.equal(state.players[1].dump.length, 1, 'only the Event crosses the alley');
});

test('eventFromOpponentDump does nothing when the rival has binned no Events', async () => {
  const state = stage();
  agentTakesFirst(state);
  addToDump(state, 1, 'mk_clover_seedling_helper_0');
  const before = state.players[0].hand.length;
  await runEffect(state, 0, { do: 'eventFromOpponentDump' }, {});
  assert.equal(state.players[0].hand.length, before);
});

// ---------------------------------------------------------------- a chit per passenger

test('gainToken per charactersReadied pays by the animal, and pays nothing on a quiet turn', async () => {
  const state = stage();
  const a = addStack(state, 0, 'mk_clover_seedling_helper_0', BUSY);
  const b = addStack(state, 0, 'mk_lynnette_press_feeder_2', BUSY);
  addStack(state, 0, 'mk_clover_seedling_helper_0', UPRIGHT); // already standing; nobody crossed on their account
  await readyPhase(state, 0);
  assert.equal(a.orientation, UPRIGHT);
  assert.equal(b.orientation, UPRIGHT);
  await runEffect(state, 0, { do: 'gainToken', of: 'species', species: 'Otter', per: 'charactersReadied' }, {});
  assert.equal(state.players[0].tokens['species:Otter'], 2, 'a chit for each animal who crossed');

  const quiet = stage();
  addStack(quiet, 0, 'mk_clover_seedling_helper_0', UPRIGHT);
  await runEffect(quiet, 0, { do: 'gainToken', of: 'species', species: 'Otter', per: 'charactersReadied' }, {});
  assert.equal(quiet.players[0].tokens['species:Otter'] ?? 0, 0, 'an empty boat takes no fares');
});

test('an effect that readies an animal counts it as a crossing too', async () => {
  const state = stage();
  const busy = addStack(state, 0, 'mk_clover_seedling_helper_0', BUSY);
  await readyStack(state, 0, busy, 'test');
  await runEffect(state, 0, { do: 'gainToken', of: 'species', species: 'Otter', per: 'charactersReadied' }, {});
  assert.equal(state.players[0].tokens['species:Otter'], 1);
});
