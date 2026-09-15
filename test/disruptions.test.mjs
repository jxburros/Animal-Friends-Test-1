// Disruption cards: shared shocks that resolve the moment they are dealt into the Capital City,
// never enter the display, and hit both towns equally.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, SET, newGame, addStack, addToHand, setSupply, setCity, addBidder,
} from './helpers.mjs';
import { createGame, flushReveals, refillCity, startPhase, UPRIGHT, BUSY } from '../src/engine/index.js';

/** Put `cardId` on top of the Market Deck, empty a display slot, and deal it out. */
async function reveal(state, cardId) {
  // The City Dump is emptied first so that what is under test is the Disruption named here and
  // nothing else: setup may already have dealt one, and a dump shuffled back into an exhausted
  // Market Deck would deal that one a second time and resolve two shocks instead of one.
  state.market.cityDump.length = 0;
  state.market.deck.unshift(cardId);
  state.market.city.pop();
  refillCity(state);
  return flushReveals(state);
}

describe('revealing a Disruption', () => {
  test('it never reaches the display: it resolves, is discarded, and another card is dealt', async () => {
    const state = newGame();
    state.market.deck = ['mk_mkt_penny_jar'];
    state.market.city = ['mk_mkt_community_oven'];
    setSupply(state, 0, 8);
    setSupply(state, 1, 8);
    const resolved = await reveal(state, 'mk_dx_tax_assessors');
    assert.equal(resolved, 1);
    assert.ok(!state.market.city.includes('mk_dx_tax_assessors'), 'a Disruption is never displayed');
    assert.ok(state.market.cityDump.includes('mk_dx_tax_assessors'), 'it goes to the City Dump');
    assert.equal(state.players[0].supply, 4);
    assert.equal(state.players[1].supply, 4, 'both towns are hit equally');
  });

  test('a Lean Season puts one animal out of work in every town', async () => {
    const state = newGame();
    state.market.deck = [];
    state.market.city = ['mk_mkt_penny_jar'];
    addBidder(state, 0, 1);
    addStack(state, 0, 'mk_maribel_seed_keeper_1', BUSY);
    addBidder(state, 1, 2);
    const pick = { choose: async (s, pi, req) => (req.kind === 'pick' ? req.options.slice(0, Math.max(1, req.min)).map((o) => o.uid) : 'supply') };
    state.agents = [pick, pick];
    await reveal(state, 'mk_dx_lean_season');
    assert.equal(state.players[0].town.length, 1, 'one of the two goes');
    assert.equal(state.players[1].town.length, 0);
    assert.equal(state.players[0].unemployment.length, 1);
    assert.equal(state.players[1].unemployment.length, 1);
  });

  test('a shielded town rides out a Lean Season', async () => {
    const state = newGame();
    state.market.deck = [];
    state.market.city = ['mk_mkt_penny_jar'];
    addBidder(state, 0, 1);
    addBidder(state, 1, 2);
    const pick = { choose: async (s, pi, req) => (req.kind === 'pick' ? req.options.slice(0, Math.max(1, req.min)).map((o) => o.uid) : 'supply') };
    state.agents = [pick, pick];
    state.players[0].mods.push({ key: 'unemploymentShield', value: 1, expires: 'nextTurnStart' });
    await reveal(state, 'mk_dx_lean_season');
    assert.equal(state.players[0].town.length, 1, 'the shielded town rides it out');
    assert.equal(state.players[1].town.length, 0);
  });

  test('Hard Winter ends every shift in progress and pays nothing', async () => {
    const state = newGame();
    state.market.deck = [];
    state.market.city = ['mk_mkt_penny_jar'];
    const a = addStack(state, 0, 'mk_clover_seedling_helper_0', BUSY, { shift: { remaining: 1, output: 4 } });
    const b = addStack(state, 1, 'mk_patch_junkyard_diver_0', BUSY, { shift: { remaining: 2, output: 3 } });
    setSupply(state, 0, 0);
    setSupply(state, 1, 0);
    await reveal(state, 'mk_dx_hard_winter');
    assert.equal(a.shift, null);
    assert.equal(b.shift, null);
    assert.equal(state.players[0].supply, 0, 'an abandoned shift pays nothing');
    assert.equal(state.players[1].supply, 0);
  });

  test('Bridge Out stops both towns advancing at their next Ready, once', async () => {
    const state = newGame();
    state.market.deck = [];
    state.market.city = ['mk_mkt_penny_jar'];
    const s = addStack(state, 0, 'mk_clover_seedling_helper_0', BUSY);
    await reveal(state, 'mk_dx_bridge_goes');
    state.agents = [{ choose: async () => 'supply' }, { choose: async () => 'supply' }];
    const { readyPhase } = await import('../src/engine/game.js');
    await readyPhase(state, 0);
    assert.equal(s.orientation, BUSY, 'the bridge is out, so nobody advances');
    await readyPhase(state, 0);
    assert.equal(s.orientation, UPRIGHT, 'the next Ready works normally again');
  });

  test('the Midges trim both hands down to four cards', async () => {
    const state = newGame();
    state.market.deck = [];
    state.market.city = ['mk_mkt_penny_jar'];
    for (let i = 0; i < 3; i++) addToHand(state, 0, 'mk_clover_seedling_helper_0');
    const pick = { choose: async (s, pi, req) => (req.kind === 'pick' ? req.options.slice(0, req.min).map((o) => o.uid) : 'supply') };
    state.agents = [pick, pick];
    await reveal(state, 'mk_dx_midges');
    assert.equal(state.players[0].hand.length, 4);
    assert.equal(state.players[1].hand.length, 4);
  });

  test('a Disruption dealt during setup is set aside instead of resolving', () => {
    // Every game deals five cards at setup; none of them may fire before turn 1.
    for (let seed = 1; seed <= 12; seed++) {
      const state = createGame(RULES, SET, { seed });
      assert.equal(state.market.revealQueue.length, 0, 'nothing is left queued from setup');
      assert.equal(state.log.some((l) => l.fx && l.fx.kind === 'disruption'), false, `seed ${seed} fired a Disruption at setup`);
      for (const id of state.market.city) {
        assert.notEqual(SET.cards.find((c) => c.id === id).type, 'disruption', 'no Disruption is on display');
      }
    }
  });

  test('a Disruption revealed while topping up after a purchase resolves at once', async () => {
    const state = newGame();
    setSupply(state, 0, 10);
    setCity(state, ['mk_mkt_community_oven']);
    // The City Dump is emptied first, for the same reason the `reveal` helper above does it: setup
    // may already have dealt a Disruption, and a dump shuffled back into an exhausted Market Deck
    // would fire that one too and make this assertion about both shocks rather than the named one.
    state.market.cityDump.length = 0;
    state.market.deck = ['mk_dx_tax_assessors', 'mk_mkt_penny_jar', 'mk_mkt_town_bell', 'mk_mkt_chit_tin', 'mk_mkt_ledger_audit'];
    const s = addBidder(state, 0, 1);
    state.phase = 'actions';
    state.active = 0;
    const { applyAction, resolvePurchase } = await import('../src/engine/index.js');
    await applyAction(state, 0, { type: 'announce', cardId: 'mk_mkt_community_oven', charUid: s.uid, bid: 2, minBid: 2, maxBid: 10 });
    const before = state.players[1].supply;
    await resolvePurchase(state, state.market.pending[0]);
    assert.ok(state.log.some((l) => l.fx && l.fx.kind === 'disruption'), 'the Disruption fired on the refill');
    assert.equal(state.players[1].supply, Math.max(0, before - 4), 'and hit the player who was not buying');
  });
});

describe('market decks', () => {
  test('each Market Deck can be chosen and plays its own mix', () => {
    for (const spec of SET.marketDecks) {
      const state = createGame(RULES, SET, { seed: 4, market: spec.id });
      assert.equal(state.market.deckId, spec.id);
      assert.equal(state.market.deckName, spec.name);
      assert.equal(state.market.city.length, RULES.setup.capitalCitySize);
    }
  });

  test('an unknown Market Deck is rejected rather than silently defaulted', () => {
    assert.throws(() => createGame(RULES, SET, { seed: 1, market: 'no-such-market' }), /Unknown market deck/);
  });

  test('every market carries on-reveal cards, and every one of them is a shared shock', () => {
    // On-reveal cards do not only hurt: they also pay the Mayor who is behind and set the weather.
    // What they have in common is that they land on both towns at once, which is what `shock` marks.
    const cardOf = (id) => SET.cards.find((c) => c.id === id);
    const reveals = (deck) => deck.pool.filter((id) => cardOf(id).type === 'disruption');
    for (const deck of SET.marketDecks) {
      assert.ok(reveals(deck).length >= 1, `${deck.id} should deal some on-reveal cards`);
      assert.ok(reveals(deck).every((id) => cardOf(id).shock), `${deck.id} deals an on-reveal card that is not a shared shock`);
      assert.ok(reveals(deck).length >= (deck.minDisruptions || 0), `${deck.id} cannot meet its own floor`);
    }
  });
});
