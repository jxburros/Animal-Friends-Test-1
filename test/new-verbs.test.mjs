// The verbs added for the remade collection: each one exists because a character's story asked for
// something the engine could not say. These tests pin what each actually does — including the
// manners they inherit (never a Character mid-shift, never one pledged, never one behind quills).
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, addStack, addToHand, addToUnemployment, setSupply, UPRIGHT, BUSY } from './helpers.mjs';
import { runEffect, isProtected } from '../src/engine/effects.js';
import { cityRule } from '../src/engine/state.js';
import { pledgeMinCost } from '../src/engine/actions.js';
import { endPhase } from '../src/engine/game.js';
import { recruitCost } from '../src/engine/actions.js';

const MASTER_ENTRY = 180;

function stage() {
  const state = newGame();
  state.phase = 'actions';
  state.active = 0;
  return state;
}
/** Answer every choice with "all of the options offered", which is what these effects need. */
function agentTakesAll(state) {
  state.agents = [{ choose: async (_s, _pi, req) => (req.kind === 'pick' ? req.options.map((o) => o.uid) : true) }];
}

test('makeBusy turns an opponent Character one step back toward Busy', async () => {
  const state = stage();
  agentTakesAll(state);
  const theirs = addStack(state, 1, 'bb_clover_1', UPRIGHT);
  await runEffect(state, 0, { do: 'makeBusy' }, {});
  assert.equal(theirs.orientation, BUSY, 'an upright Character is put back to work');
  await runEffect(state, 0, { do: 'makeBusy' }, {});
  assert.equal(theirs.orientation, MASTER_ENTRY, 'a Busy Character is turned a further step back');
  await runEffect(state, 0, { do: 'makeBusy' }, {});
  assert.equal(theirs.orientation, MASTER_ENTRY, 'and no further: there is nowhere past the entry face');
});

test('makeBusy leaves work, pledges and quills alone', async () => {
  const state = stage();
  agentTakesAll(state);
  const working = addStack(state, 1, 'bb_clover_1', UPRIGHT);
  working.shift = { delay: 1, output: 2, remaining: 1 };
  const pledged = addStack(state, 1, 'bb_sorrel_1', UPRIGHT);
  pledged.lockedBid = 1;
  const quilled = addStack(state, 1, 'bb_mabel_1', UPRIGHT);
  quilled.protectedUntil = state.turnNumber + 2;
  assert.ok(isProtected(state, quilled));
  await runEffect(state, 0, { do: 'makeBusy', count: 3 }, {});
  assert.equal(working.orientation, UPRIGHT, 'a Character mid-shift is not touched');
  assert.equal(pledged.orientation, UPRIGHT, 'a Character pledged into an auction is not touched');
  assert.equal(quilled.orientation, UPRIGHT, 'a protected Character is not touched');
});

test('makeBusy respects a cost filter', async () => {
  const state = stage();
  agentTakesAll(state);
  const cheap = addStack(state, 1, 'bb_clover_1', UPRIGHT); // cost 0
  const dear = addStack(state, 1, 'rr_pip_3', UPRIGHT); // cost 5
  await runEffect(state, 0, { do: 'makeBusy', count: 2, filter: { maxCost: 1 } }, {});
  assert.equal(cheap.orientation, BUSY);
  assert.equal(dear.orientation, UPRIGHT, 'a filter keeps the dear ones out of reach');
});

test('scryDeck can send what you do not want to the Town Dump', async () => {
  const state = stage();
  agentTakesAll(state);
  const p = state.players[0];
  const top = p.deck.slice(0, 4).map((c) => c.uid);
  const dumpBefore = p.dump.length;
  await runEffect(state, 0, { do: 'scryDeck', count: 4, to: 'dump' }, {});
  assert.equal(p.dump.length, dumpBefore + 4, 'the four are in the Town Dump');
  for (const uid of top) assert.ok(!p.deck.some((c) => c.uid === uid), 'and out of the deck entirely');
});

test('scryDeck without `to` still only bottoms the cards', async () => {
  const state = stage();
  agentTakesAll(state);
  const p = state.players[0];
  const size = p.deck.length;
  const dumpBefore = p.dump.length;
  const top = p.deck.slice(0, 2).map((c) => c.uid);
  await runEffect(state, 0, { do: 'scryDeck', count: 2 }, {});
  assert.equal(p.dump.length, dumpBefore, 'nothing goes to the Dump');
  assert.equal(p.deck.length, size, 'the deck is the same size');
  assert.deepEqual(p.deck.slice(-2).map((c) => c.uid), top, 'the cards are on the bottom');
});

test('protectCharacter with notSelf puts the quills around somebody else', async () => {
  const state = stage();
  agentTakesAll(state);
  const berry = addStack(state, 0, 'br_bramble_1', UPRIGHT);
  const other = addStack(state, 0, 'bb_clover_1', UPRIGHT);
  await runEffect(state, 0, { do: 'protectCharacter', filter: { notSelf: true } }, { sourceStackUid: berry.uid });
  assert.ok(isProtected(state, other), 'the other Character is protected');
  assert.ok(!isProtected(state, berry), 'and the source is not');
});

test('protectCharacter without a filter still protects the source, as it always did', async () => {
  const state = stage();
  agentTakesAll(state);
  const self = addStack(state, 0, 'br_bramble_1', UPRIGHT);
  addStack(state, 0, 'bb_clover_1', UPRIGHT);
  await runEffect(state, 0, { do: 'protectCharacter' }, { sourceStackUid: self.uid });
  assert.ok(isProtected(state, self));
});

test('a recruit discount can be typed to a study', async () => {
  const state = stage();
  const p = state.players[0];
  await runEffect(state, 0, { do: 'addMod', key: 'recruitDiscount', value: 1, filter: { study: 'Lore' } }, {});
  // rr_pip_3 is Lore; bb_clover_1 is Agriculture.
  assert.equal(recruitCost(state, 0, 'rr_pip_3'), 4, 'the Lore animal is a Supply cheaper');
  assert.equal(recruitCost(state, 0, 'bb_clover_1'), 0, 'and an Agriculture animal is unaffected');
  assert.equal(p.mods.length, 1);
});

test('an untyped recruit discount still applies to everybody', async () => {
  const state = stage();
  await runEffect(state, 0, { do: 'addMod', key: 'recruitDiscount', value: 1 }, {});
  assert.equal(recruitCost(state, 0, 'rr_pip_3'), 4);
});

test('a buildingDiscount makes Buildings cheaper and nothing else', async () => {
  const state = stage();
  const { cardCostFor } = await import('../src/engine/actions.js');
  const building = state.set.cards.find((c) => c.type === 'building');
  const market = state.set.cards.find((c) => c.type === 'market');
  const before = cardCostFor(state, 0, building.id);
  const marketBefore = cardCostFor(state, 0, market.id);
  await runEffect(state, 0, { do: 'addMod', key: 'buildingDiscount', value: 1 }, {});
  assert.equal(cardCostFor(state, 0, building.id), Math.max(0, before - 1));
  assert.equal(cardCostFor(state, 0, market.id), marketBefore, 'an ordinary Market card is unaffected');
});

test('a retained hire goes back to the Capital City when the term runs out', async () => {
  const state = stage();
  const hire = addStack(state, 0, 'mkt_barrow', BUSY);
  hire.termRemaining = 2;
  const p = state.players[0];
  await endPhase(state, 0);
  assert.equal(hire.termRemaining, 1, 'the retainer ticks down at the end of the turn');
  assert.ok(p.town.includes(hire), 'and the hire is still in town');
  await endPhase(state, 0);
  assert.ok(!p.town.includes(hire), 'when it runs out they leave town');
  assert.ok(state.market.cityDump.includes('mkt_barrow'), 'and go back to the Capital City');
});

test('a retained hire pledged into an auction stays until it resolves', async () => {
  const state = stage();
  const hire = addStack(state, 0, 'mkt_barrow', UPRIGHT);
  hire.termRemaining = 1;
  hire.lockedBid = 1;
  await endPhase(state, 0);
  assert.ok(state.players[0].town.includes(hire), 'the town cannot send home what it has bid');
  assert.equal(hire.termRemaining, 1, 'and the term does not run while it is pledged');
});

// ---------------------------------------------------------------- the second round of wishes
// Four more verbs, each one a gap a remade character walked into: the gate animal who should work
// the door while he is still on display, the friend who should arrive with something, the cellar
// that should notice a loss, and the herbalist who takes whoever came to the gate.

test('a displayed market animal changes the rules of the Capital City', () => {
  const state = stage();
  const gate = { id: 'test_gate', type: 'marketCharacter', name: 'Gate', cost: 3, abilities: [{ trigger: 'displayed', key: 'pledgeLadderDelta', value: 1 }] };
  state.set.cardsById[gate.id] = gate;
  assert.equal(cityRule(state, 'pledgeLadderDelta'), 0, 'nothing on display, nothing owed');
  state.market.city.push(gate.id);
  assert.equal(cityRule(state, 'pledgeLadderDelta'), 1, 'the animal on the door taxes the ladder');
  assert.equal(pledgeMinCost(state, null, 0), 2, 'and the first pledge of an auction costs a rung more');
  state.market.city.pop();
  assert.equal(cityRule(state, 'pledgeLadderDelta'), 0, 'hire him out of the display and the gate is open');
});

test('only a displayed card with the rule carries it: a Building in town is not the Capital City', () => {
  const state = stage();
  const bld = { id: 'test_bld', type: 'building', name: 'Shed', cost: 3, abilities: [{ trigger: 'displayed', key: 'buildingCostDelta', value: 2 }] };
  state.set.cardsById[bld.id] = bld;
  state.market.city.push(bld.id);
  assert.equal(cityRule(state, 'buildingCostDelta'), 0, 'a Building is bought, not a standing rule');
});

test('recruitFromHand runs its `then` rider only when somebody actually comes out of hand', async () => {
  const state = stage();
  state.players[0].hand = [];
  const friend = addToHand(state, 0, 'ns_copper_0'); // cost 0, and brings nobody else with it
  state.agents = [{ choose: async (_s, _pi, req) => (req.kind === 'pick' ? [friend.uid] : true) }];
  setSupply(state, 0, 0);
  await runEffect(state, 0, { do: 'recruitFromHand', filter: { maxCost: 1 }, orientation: BUSY, then: { do: 'gainSupply', amount: 2 } }, {});
  assert.equal(state.players[0].town.length, 1, 'the friend came out');
  assert.equal(state.players[0].supply, 2, 'and the rider paid for the seed');
});

test('the `then` rider does not pay out when there is nobody to bring', async () => {
  const state = stage();
  state.players[0].hand = [];
  agentTakesAll(state);
  setSupply(state, 0, 0);
  await runEffect(state, 0, { do: 'recruitFromHand', filter: { maxCost: 1 }, orientation: BUSY, then: { do: 'gainSupply', amount: 2 } }, {});
  assert.equal(state.players[0].town.length, 0);
  assert.equal(state.players[0].supply, 0, 'an empty hand pays nothing — this is what a seq could not say');
});

test('onSupplyLost fires for the Mayor who lost something, and not for a loss of nothing', async () => {
  const state = stage();
  setSupply(state, 0, 5);
  setSupply(state, 1, 0);
  const watcher = addStack(state, 0, 'bb_clover_1', UPRIGHT);
  state.set.cardsById.bb_clover_1 = { ...state.set.cardsById.bb_clover_1, abilities: [{ trigger: 'onSupplyLost', effect: { do: 'gainSupply', amount: 1 } }] };
  const other = addStack(state, 1, 'bb_mabel_1', UPRIGHT);
  state.set.cardsById.bb_mabel_1 = { ...state.set.cardsById.bb_mabel_1, abilities: [{ trigger: 'onSupplyLost', effect: { do: 'gainSupply', amount: 1 } }] };
  assert.ok(watcher && other);
  await runEffect(state, 0, { do: 'everyoneLosesSupply', amount: 3 }, {});
  assert.equal(state.players[0].supply, 3, '5 - 3 lost, +1 back from the cellar');
  assert.equal(state.players[1].supply, 0, 'a Mayor with nothing to lose loses nothing and is told nothing');
});

test('a cellar that reacts to a loss by causing one does not cascade', async () => {
  const state = stage();
  setSupply(state, 0, 10);
  addStack(state, 0, 'bb_clover_1', UPRIGHT);
  state.set.cardsById.bb_clover_1 = { ...state.set.cardsById.bb_clover_1, abilities: [{ trigger: 'onSupplyLost', effect: { do: 'everyoneLosesSupply', amount: 1 } }] };
  await runEffect(state, 0, { do: 'everyoneLosesSupply', amount: 2 }, {});
  assert.equal(state.players[0].supply, 7, '2 lost, then the reaction takes 1 more, and there it stops');
});

test('rehire can be filtered by study and by species, not only by cost', async () => {
  const state = stage();
  setSupply(state, 0, 0);
  addToUnemployment(state, 0, 'bb_clover_1'); // Rabbit, Agriculture
  addToUnemployment(state, 0, 'rr_pip_1'); // Squirrel, Lore
  state.agents = [{ choose: async (_s, _pi, req) => (req.kind === 'pick' ? [req.options[0].uid] : true) }];
  await runEffect(state, 0, { do: 'rehire', free: true, filter: { study: 'Lore' }, optional: true }, {});
  assert.deepEqual(state.players[0].town.map((s) => s.cards[0].cardId), ['rr_pip_1'], 'only the Lore animal was on offer');
  await runEffect(state, 0, { do: 'rehire', free: true, filter: { species: 'Squirrel' }, optional: true }, {});
  assert.equal(state.players[0].town.length, 1, 'no Squirrel left in Unemployment, so nothing happens');
  await runEffect(state, 0, { do: 'rehire', free: true, filter: { species: 'Rabbit' }, optional: true }, {});
  assert.equal(state.players[0].town.length, 2, 'the Rabbit comes back when the filter asks for one');
});
