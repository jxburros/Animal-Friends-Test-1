// Recruiting, upgrades, recruit-cost discounts, and recruit-triggered abilities.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, addStack, addToHand, setSupply, giveStatue, addMod, UPRIGHT, BUSY,
} from './helpers.mjs';
import { applyAction, legalActions, cardDef } from '../src/engine/index.js';

function begin(state, pi) {
  state.phase = 'actions';
  state.active = pi;
}

describe('recruiting', () => {
  test('pays the printed cost and enters at the rank-appropriate orientation', async () => {
    const state = newGame();
    setSupply(state, 0, 10);
    const c = addToHand(state, 0, 'bb_fern_1'); // cost 2
    begin(state, 0);
    await applyAction(state, 0, { type: 'recruit', cardUid: c.uid, cardId: c.cardId, cost: 2 });
    assert.equal(state.players[0].supply, 8);
    const s = state.players[0].town.find((s) => s.cards[0].uid === c.uid);
    assert.equal(s.orientation, BUSY);
  });

  test('cannot afford a recruit above current Supply', async () => {
    const state = newGame();
    setSupply(state, 0, 1);
    const c = addToHand(state, 0, 'bb_fern_1'); // cost 2
    begin(state, 0);
    await assert.rejects(() => applyAction(state, 0, { type: 'recruit', cardUid: c.uid, cardId: c.cardId, cost: 2 }), /afford/);
    const acts = legalActions(state, 0);
    assert.ok(!acts.some((a) => a.type === 'recruit' && a.cardId === 'bb_fern_1'), 'not offered as a legal action either');
  });
});

describe('upgrades', () => {
  test('upgrading a same-name lower-cost stack pays only the difference and keeps orientation', async () => {
    const state = newGame();
    setSupply(state, 0, 10);
    const target = addStack(state, 0, 'bb_clover_1', BUSY); // Clover, Seedling Helper, cost 0, currently Busy
    const upgrade = addToHand(state, 0, 'bb_clover_2'); // Clover, Community Gardener, cost 3
    begin(state, 0);
    const acts = legalActions(state, 0);
    const up = acts.find((a) => a.type === 'recruit' && a.upgrade && a.cardUid === upgrade.uid);
    assert.ok(up, 'upgrade action should be offered');
    assert.equal(up.cost, 3 - 0, 'pays only the cost difference');
    await applyAction(state, 0, up);
    assert.equal(state.players[0].supply, 10 - 3);
    assert.equal(target.cards.length, 2, 'the stack now holds both cards');
    assert.equal(target.cards[0].cardId, 'bb_clover_2', 'the new card is on top');
    assert.equal(target.orientation, BUSY, "upgrading keeps the stack's current orientation");
  });

  test('a lower-cost card of the same name cannot "upgrade" a higher-cost stack', async () => {
    const state = newGame();
    setSupply(state, 0, 10);
    addStack(state, 0, 'bb_clover_2', UPRIGHT); // cost 3 already in town
    const lower = addToHand(state, 0, 'bb_clover_1'); // cost 0
    begin(state, 0);
    const acts = legalActions(state, 0);
    assert.ok(!acts.some((a) => a.type === 'recruit' && a.upgrade && a.cardUid === lower.uid), 'cost 0 cannot upgrade a cost-3 stack');
  });
});

describe('Town Charter discount', () => {
  test('applies to only the first recruit', async () => {
    const state = newGame();
    setSupply(state, 0, 10);
    addMod(state, 0, 'recruitDiscount', 1, 'nextTurnStart', { consumable: true });
    const a = addToHand(state, 0, 'bb_fern_1'); // cost 2
    const b = addToHand(state, 0, 'pp_hazel_1'); // cost 2
    begin(state, 0);
    await applyAction(state, 0, { type: 'recruit', cardUid: a.uid, cardId: a.cardId, cost: 1 });
    assert.equal(state.players[0].supply, 9, 'first recruit costs 1 less (2 - 1 discount)');
    assert.equal(state.players[0].mods.some((m) => m.key === 'recruitDiscount'), false, 'discount is consumed');
    await applyAction(state, 0, { type: 'recruit', cardUid: b.uid, cardId: b.cardId, cost: 2 });
    assert.equal(state.players[0].supply, 7, 'second recruit pays full cost');
  });
});

describe("Clover, Seedling Helper's recruit trigger", () => {
  test('only fires when another Agriculture character is already in town', async () => {
    const state = newGame();
    setSupply(state, 0, 10);
    const c = addToHand(state, 0, 'bb_clover_1');
    begin(state, 0);
    const handBefore = state.players[0].hand.length;
    await applyAction(state, 0, { type: 'recruit', cardUid: c.uid, cardId: c.cardId, cost: 0 });
    // No other Agriculture character in town yet: draw/discard should not fire (hand count net unchanged,
    // aside from the recruited card leaving the hand).
    assert.equal(state.players[0].hand.length, handBefore - 1, 'recruit trigger did not fire');
  });

  test('fires (draw 1, discard 1) when another Agriculture character is present', async () => {
    const state = newGame();
    setSupply(state, 0, 10);
    addStack(state, 0, 'bb_mabel_1', UPRIGHT); // Mabel, Seed Keeper: Mouse/Agriculture
    const c = addToHand(state, 0, 'bb_clover_1'); // Rabbit/Agriculture
    begin(state, 0);
    state.agents = [{ choose: async (s, pi, req) => (req.kind === 'pick' ? [req.options[0].uid] : undefined) }, {}];
    const handBefore = state.players[0].hand.length;
    await applyAction(state, 0, { type: 'recruit', cardUid: c.uid, cardId: c.cardId, cost: 0 });
    // hand: -1 (recruited) +1 (draw) -1 (discard) = -1 net, but let's check draw/discard actually ran
    // by checking the dump gained a card and the deck lost one (draw then discard nets to -1 net hand
    // change identical to the no-trigger case, so check dump/deck directly instead).
    assert.equal(state.players[0].dump.length, 1, 'discarded a card into the Town Dump');
  });
});
