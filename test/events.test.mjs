// Events: requirement matching, species/study requirements, waived requirement units, Limited
// events ticking down and expiring, and an Event that recruits out of hand for free.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, addStack, addToHand, setSupply, giveStatue, UPRIGHT, BUSY, SET,
} from './helpers.mjs';
import { applyAction, legalActions, endPhase } from '../src/engine/index.js';

function begin(state, pi) {
  state.phase = 'actions';
  state.active = pi;
}

describe('event requirements', () => {
  test('requirements must be met by upright characters, which become Busy when the event is played', async () => {
    const state = newGame();
    setSupply(state, 0, 0);
    const cook = addStack(state, 0, 'mk_taco_cart_cook_1', UPRIGHT); // Otter/Food
    const ev = addToHand(state, 0, 'mk_fresh_batch'); // requires 1 Food
    begin(state, 0);
    await applyAction(state, 0, { type: 'playEvent', cardUid: ev.uid, cardId: ev.cardId, characters: [cook.uid], cost: 0 });
    assert.equal(cook.orientation, BUSY, 'the Character fueling the Event becomes Busy');
    assert.ok(state.players[0].supply >= 3, 'Fresh Batch pays its 3 Supply');
  });

  test('a Busy character cannot satisfy a requirement', async () => {
    const state = newGame();
    addStack(state, 0, 'mk_taco_cart_cook_1', BUSY);
    const ev = addToHand(state, 0, 'mk_fresh_batch');
    begin(state, 0);
    const acts = legalActions(state, 0);
    assert.ok(!acts.some((a) => a.type === 'playEvent' && a.cardId === 'mk_fresh_batch'), 'no legal way to play it');
  });

  test('study requirement rejects a character of the wrong study', async () => {
    const state = newGame();
    const wrongStudy = addStack(state, 0, 'mk_clover_seedling_helper_0', UPRIGHT); // Rabbit/Agriculture — wrong for an Entertainment requirement
    const ev = addToHand(state, 0, 'mk_open_mic_night'); // requires Entertainment
    begin(state, 0);
    const acts = legalActions(state, 0);
    assert.ok(!acts.some((a) => a.type === 'playEvent' && a.cardId === 'mk_open_mic_night'));
    await assert.rejects(() => applyAction(state, 0, { type: 'playEvent', cardUid: ev.uid, cardId: ev.cardId, characters: [wrongStudy.uid], cost: 0 }), /Requirements not met/);
  });

  test('the Hedge Apothecary requires a Hedgehog and a Mouse', async () => {
    const state = newGame();
    const hedgehog = addStack(state, 0, 'mk_biff_cadet_constable_0', UPRIGHT);
    const ev = addToHand(state, 0, 'mk_hedge_apothecary');
    begin(state, 0);
    // Only a Hedgehog present: not enough.
    assert.ok(!legalActions(state, 0).some((a) => a.type === 'playEvent' && a.cardId === 'mk_hedge_apothecary'));
    const mouse = addStack(state, 0, 'mk_maribel_seed_keeper_1', UPRIGHT);
    const acts = legalActions(state, 0);
    const act = acts.find((a) => a.type === 'playEvent' && a.cardId === 'mk_hedge_apothecary');
    assert.ok(act, 'Hedgehog + Mouse satisfies it');
    assert.equal(new Set(act.characters).size, 2);
    await applyAction(state, 0, act);
    assert.equal(hedgehog.orientation, BUSY);
    assert.equal(mouse.orientation, BUSY);
  });

  test('species requirement (two Rabbits) needs two distinct upright Rabbits', async () => {
    const state = newGame();
    addStack(state, 0, 'mk_clover_seedling_helper_0', UPRIGHT);
    const ev = addToHand(state, 0, 'mk_warren_muster'); // requires 2 Rabbits
    begin(state, 0);
    assert.ok(!legalActions(state, 0).some((a) => a.type === 'playEvent' && a.cardId === 'mk_warren_muster'), 'only one Rabbit available');
    addStack(state, 0, 'mk_hibiscus_post_runner_1', UPRIGHT); // second Rabbit
    assert.ok(legalActions(state, 0).some((a) => a.type === 'playEvent' && a.cardId === 'mk_warren_muster'));
  });
});

describe('Limited events', () => {
  test('a Limited Event stays for 2 of its owner\'s End phases, then goes to the Town Dump', async () => {
    const state = newGame();
    addStack(state, 0, 'mk_daniel_chart_copier_1', UPRIGHT); // Lore character to satisfy the requirement
    const ev = addToHand(state, 0, 'mk_reading_lanterns');
    begin(state, 0);
    const acts = legalActions(state, 0);
    const act = acts.find((a) => a.type === 'playEvent' && a.cardId === 'mk_reading_lanterns');
    assert.ok(act);
    await applyAction(state, 0, act);
    assert.equal(state.players[0].events.length, 1);
    assert.equal(state.players[0].events[0].remaining, 2);

    await endPhase(state, 0); // remaining 2 -> 1
    assert.equal(state.players[0].events.length, 1, 'still in play after the first End phase');
    assert.equal(state.players[0].events[0].remaining, 1);
    assert.equal(state.players[0].dump.some((c) => c.cardId === 'mk_reading_lanterns'), false);

    await endPhase(state, 0); // remaining 1 -> 0, expires
    assert.equal(state.players[0].events.length, 0, 'expired after the second End phase');
    assert.equal(state.players[0].dump.some((c) => c.cardId === 'mk_reading_lanterns'), true, 'moved to the Town Dump');
  });
});

describe('requirement waivers', () => {
  test('a Busy ability that waives a requirement unit makes an unplayable Event playable', async () => {
    // Found in the set rather than named: the species pass moves abilities around, but the waiver
    // rule itself has to keep working wherever it is printed.
    const waiver = SET.cards.find((c) => c.type === 'character' && (c.abilities || []).some(
      (a) => a.trigger === 'busy' && JSON.stringify(a.effect || {}).includes('"eventCharReduction"'),
    ));
    assert.ok(waiver, 'the set prints a Character who can waive a requirement');
    const state = newGame();
    setSupply(state, 0, 0);
    const src = addStack(state, 0, waiver.id, UPRIGHT);
    const ev = addToHand(state, 0, 'mk_fresh_batch'); // requires 1 Food, none present
    begin(state, 0);
    const playable = () => legalActions(state, 0).find((a) => a.type === 'playEvent' && a.cardId === 'mk_fresh_batch');
    const before = playable();
    await applyAction(state, 0, { type: 'ability', charUid: src.uid, cardId: waiver.id });
    assert.equal(src.orientation, BUSY, 'waiving costs the Character their turn');
    const after = playable();
    assert.ok(after, 'the requirement is now waived');
    if (before) assert.ok(after.characters.length < before.characters.length, 'it needs fewer Characters than before');
    else assert.deepEqual(after.characters, [], 'no Characters need to be assigned');
  });

  test('Statue of Ingenuity waives one requirement unit, once per turn', async () => {
    const state = newGame();
    giveStatue(state, 0, 'mk_st_ingenuity');
    const ev1 = addToHand(state, 0, 'mk_fresh_batch');
    const ev2 = addToHand(state, 0, 'mk_open_mic_night'); // also requires 1 Character
    begin(state, 0);
    let acts = legalActions(state, 0);
    assert.ok(acts.some((a) => a.type === 'playEvent' && a.cardId === 'mk_fresh_batch'), 'first Event this turn gets the waiver');
    const act1 = acts.find((a) => a.type === 'playEvent' && a.cardId === 'mk_fresh_batch');
    await applyAction(state, 0, act1);
    acts = legalActions(state, 0);
    assert.ok(!acts.some((a) => a.type === 'playEvent' && a.cardId === 'mk_open_mic_night'), 'waiver already used this turn');
  });
});

describe("Clover's Potato Experiment", () => {
  test('recruits a cheap Character out of hand for free, entering Busy', async () => {
    const state = newGame();
    setSupply(state, 0, 0);
    addStack(state, 0, 'mk_clover_seedling_helper_0', UPRIGHT); // Clover, and Agriculture
    addStack(state, 0, 'mk_maribel_seed_keeper_1', UPRIGHT); // the second Agriculture Character
    const ev = addToHand(state, 0, 'mk_clovers_potato_experiment');
    const freeChar = addToHand(state, 0, 'mk_peter_hedge_cutter_0'); // cost 0
    begin(state, 0);
    state.agents = [{ choose: async (s, pi, req) => (req.kind === 'pick' && req.reason === 'recruitFree' ? [freeChar.uid] : []) }, {}];
    const acts = legalActions(state, 0);
    const act = acts.find((a) => a.type === 'playEvent' && a.cardId === 'mk_clovers_potato_experiment');
    assert.ok(act);
    await applyAction(state, 0, act);
    const s = state.players[0].town.find((s) => s.cards[0].uid === freeChar.uid);
    assert.ok(s, 'the free Character entered town');
    assert.equal(s.orientation, BUSY, 'the free recruit arrives Busy, not upright');
    assert.equal(state.players[0].supply, 3, 'the Event paid its 3 Supply and the recruit cost nothing');
  });
});
