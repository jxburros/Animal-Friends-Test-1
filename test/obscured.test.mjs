// The obscured figures: the eighteen animals the borough never got a name for, one for every species
// and one for every study. They are the one place in the collection where an upgrade is not a
// promotion — somebody simply turns out to have been standing there, and the ward record is corrected
// to their name. Mechanically that is `anchor`, and these tests pin what it does and what it refuses.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES, SET, newGame, addStack, addToHand, addToUnemployment, setSupply } from './helpers.mjs';
import { upgradeTargets, unemployedUpgradeTargets, legalActions, applyAction, topCard } from '../src/engine/index.js';

const figures = SET.cards.filter((c) => c.anchor);

test('there is an obscured figure for every species and every study, spread across 0, 1 and 2', () => {
  assert.equal(figures.length, SET.species.length + SET.studies.length);
  const bySpecies = figures.filter((c) => c.anchor.species);
  const byStudy = figures.filter((c) => c.anchor.study);
  assert.deepEqual(bySpecies.map((c) => c.species).sort(), [...SET.species].sort());
  assert.deepEqual(byStudy.map((c) => c.study).sort(), [...SET.studies].sort());
  // Each is called something different — the borough named them for what it could see.
  const names = figures.map((c) => c.name);
  assert.equal(new Set(names).size, names.length);
  for (const cost of [0, 1, 2]) {
    assert.ok(figures.some((c) => c.cost === cost), `nothing to start at ${cost}`);
  }
  assert.deepEqual([...new Set(figures.map((c) => c.cost))].sort(), [0, 1, 2], 'and nothing dearer than 2');
  // Every figure is written up, like any other Character on the shelf.
  for (const c of figures) {
    assert.ok(SET.characters.some((e) => e.name === c.name), `${c.id} has nobody behind it`);
  }
});

test('a species anchor takes any dearer animal of that species, whatever their name', () => {
  const state = newGame();
  addStack(state, 0, 'mk_masked_otter_counter_hand_1');
  // Brooke is an Otter and costs more; nothing else about her matches.
  const targets = upgradeTargets(state, 0, 'mk_brooke_regatta_caller_3');
  assert.equal(targets.length, 1, 'the otter at the counter turns out to have been Brooke');
  assert.equal(upgradeTargets(state, 0, 'mk_peanut_ledger_0').length, 0, 'and not a cheaper animal');
  // A Squirrel is a different animal in every sense.
  assert.equal(upgradeTargets(state, 0, 'mk_peanut_accountant_2').length, 0, 'a Squirrel was never under that scarf');
});

test('a study anchor takes any dearer animal who does that work, whatever their species', () => {
  const state = newGame();
  addStack(state, 0, 'mk_cloaked_tradesman_1');
  const commerce = SET.cards.find((c) => c.type === 'character' && c.study === 'Commerce' && c.cost > 1 && c.species !== 'Mouse');
  assert.ok(commerce, 'the shelf has a dearer Commerce animal of another species');
  assert.equal(upgradeTargets(state, 0, commerce.id).length, 1, `${commerce.name} steps out of the cloak`);
  const farming = SET.cards.find((c) => c.type === 'character' && c.study === 'Agriculture' && c.cost > 1);
  assert.equal(upgradeTargets(state, 0, farming.id).length, 0, 'a grower is not who was selling');
});

test('an anchor reaches into Unemployment too, and a plain Character still needs its own name', () => {
  const state = newGame();
  addToUnemployment(state, 0, 'mk_veiled_wright_0');
  assert.equal(unemployedUpgradeTargets(state, 0, 'mk_moss_toolsmith_2').length, 1, 'the Crafts anchor promotes Moss out of Unemployment');
  const plain = newGame();
  addStack(plain, 0, 'mk_peanut_ledger_0');
  assert.equal(upgradeTargets(plain, 0, 'mk_moss_toolsmith_2').length, 0, 'an ordinary animal is still only upgraded by themselves');
  assert.equal(upgradeTargets(plain, 0, 'mk_peanut_accountant_2').length, 1);
});

test('upgrading over a figure costs the plain difference and takes no second town place', async () => {
  const state = newGame();
  state.phase = 'actions';
  state.active = 0;
  addStack(state, 0, 'mk_masked_otter_counter_hand_1');
  const card = addToHand(state, 0, 'mk_brooke_regatta_caller_3');
  setSupply(state, 0, 10);
  const before = state.players[0].town.length;
  const act = legalActions(state, 0).find((a) => a.type === 'recruit' && a.cardUid === card.uid && a.upgrade);
  assert.ok(act, 'the upgrade is offered');
  assert.equal(act.cost, 3 - 1, 'the plain printed difference');
  await applyAction(state, 0, act);
  assert.equal(state.players[0].town.length, before, 'the same animal, under a name at last');
  assert.equal(topCard(state, state.players[0].town[0]).name, 'Brooke');
});
