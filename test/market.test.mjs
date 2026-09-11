// Capital City: announcing, challenging, resolution, refresh/disposal.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, addStack, setSupply, setCity, addMod, giveStatue, addLimitedEvent,
} from './helpers.mjs';
import {
  applyAction, legalActions, startPhase, resolvePurchase, refillCity, UPRIGHT, BUSY,
} from '../src/engine/index.js';

function begin(state, pi) {
  state.phase = 'actions';
  state.active = pi;
}

describe('announcing a purchase', () => {
  test('requires an upright character', async () => {
    const state = newGame();
    setSupply(state, 0, 10);
    setCity(state, ['mk_festival_grant']); // cost 2
    const s = addStack(state, 0, 'bb_clover_1', BUSY);
    begin(state, 0);
    await assert.rejects(() => applyAction(state, 0, { type: 'announce', cardId: 'mk_festival_grant', charUid: s.uid, bid: 2, minBid: 2, maxBid: 10 }));
  });

  test('bid must be at least the card cost, and Supply is escrowed', async () => {
    const state = newGame();
    setSupply(state, 0, 10);
    setCity(state, ['mk_festival_grant']); // cost 2
    const s = addStack(state, 0, 'bb_clover_1', UPRIGHT);
    begin(state, 0);
    await assert.rejects(() => applyAction(state, 0, { type: 'announce', cardId: 'mk_festival_grant', charUid: s.uid, bid: 1, minBid: 2, maxBid: 10 }), /Invalid bid/);
    await applyAction(state, 0, { type: 'announce', cardId: 'mk_festival_grant', charUid: s.uid, bid: 3, minBid: 2, maxBid: 10 });
    assert.equal(state.players[0].supply, 7, 'bid Supply is moved out of the wallet');
    assert.equal(state.players[0].escrow, 3, 'bid Supply is held in escrow');
    assert.equal(s.orientation, BUSY, 'the announcing character becomes Busy');
    assert.equal(state.market.pending.length, 1);
  });

  test('the pending purchase resolves at the start of the announcer\'s next turn', async () => {
    const state = newGame();
    setSupply(state, 0, 10);
    setCity(state, ['mk_festival_grant']);
    const s = addStack(state, 0, 'bb_clover_1', UPRIGHT);
    begin(state, 0);
    await applyAction(state, 0, { type: 'announce', cardId: 'mk_festival_grant', charUid: s.uid, bid: 2, minBid: 2, maxBid: 10 });
    assert.ok(state.market.city.includes('mk_festival_grant'), 'card stays displayed while pending');
    state.agents = [{ choose: async () => 'supply' }, { choose: async () => 'supply' }];
    await startPhase(state, 0);
    assert.equal(state.market.pending.length, 0, 'purchase resolved');
    assert.ok(!state.market.city.includes('mk_festival_grant'), 'card left the Capital City');
    assert.equal(state.players[0].supply, 8 + 4, 'paid the 2-Supply bid and gained the 4-Supply card effect');
  });

  test('unchallenged purchases pay the bid', async () => {
    const state = newGame();
    setSupply(state, 0, 10);
    setCity(state, ['mk_festival_grant']);
    const s = addStack(state, 0, 'bb_clover_1', UPRIGHT);
    begin(state, 0);
    await applyAction(state, 0, { type: 'announce', cardId: 'mk_festival_grant', charUid: s.uid, bid: 4, minBid: 2, maxBid: 10 });
    const pd = state.market.pending[0];
    await resolvePurchase(state, pd);
    assert.equal(state.players[0].escrow, 0, 'escrow is released after resolving');
    assert.equal(state.players[0].supply, 6 + 4, '10-4(bid)+4(effect)=10... paid the bid, gained the card');
  });
});

describe('challenging', () => {
  function setupPending(state, { annBid = 3 } = {}) {
    setSupply(state, 0, 10);
    setSupply(state, 1, 10);
    setCity(state, ['mk_festival_grant']); // cost 2
    const annChar = addStack(state, 0, 'bb_clover_1', UPRIGHT);
    begin(state, 0);
    return applyAction(state, 0, { type: 'announce', cardId: 'mk_festival_grant', charUid: annChar.uid, bid: annBid, minBid: 2, maxBid: 10 })
      .then(() => state.market.pending[0]);
  }

  test('a challenge must bid higher; a higher challenger wins and only the winner pays', async () => {
    const state = newGame();
    const pd = await setupPending(state, { annBid: 3 });
    const chChar = addStack(state, 1, 'pp_patch_1', UPRIGHT);
    begin(state, 1);
    await applyAction(state, 1, { type: 'challenge', pendingId: pd.id, cardId: pd.cardId, charUid: chChar.uid, bid: 5, minBid: 4, maxBid: 10 });
    assert.equal(state.players[1].escrow, 5);
    state.agents = [{ choose: async () => 'supply' }, {}];
    await startPhase(state, 0); // announcer's next turn: resolves
    assert.equal(state.players[1].supply, 10 - 5 + 4, 'challenger paid their bid and got the card');
    assert.equal(state.players[1].escrow, 0);
    assert.equal(state.players[0].supply, 10 - 3 + 3, 'announcer loses nothing extra, escrow refunded');
    assert.equal(state.players[0].escrow, 0, "loser's escrow is refunded");
  });

  test('an equal bid loses to the announcer (ties go to announcer)', async () => {
    const state = newGame();
    const pd = await setupPending(state, { annBid: 3 });
    const chChar = addStack(state, 1, 'pp_patch_1', UPRIGHT);
    begin(state, 1);
    // Minimum legal challenge bid is already announcer+1, so force an equal bid directly to test resolution logic.
    pd.challenge = { player: 1, bid: 3, paid: 3, bonus: 0, charUid: chChar.uid, winsTies: false };
    state.players[1].supply -= 3;
    state.players[1].escrow += 3;
    state.agents = [{ choose: async () => 'supply' }, {}];
    await startPhase(state, 0);
    assert.equal(state.players[0].supply, 10 - 3 + 4, 'announcer wins the tie and gains the card');
    assert.equal(state.players[1].supply, 10 - 3 + 3, "challenger's escrow is refunded on a tie loss");
  });

  test('Poppy, Civic Planner lets her controller win ties as challenger', async () => {
    const state = newGame();
    const pd = await setupPending(state, { annBid: 3 });
    giveStatue(state, 1, 'st_kindness'); // unrelated statue, just to prove non-Poppy statues don't grant this
    addStack(state, 1, 'bb_poppy_2', UPRIGHT); // Poppy, Civic Planner: winTiesAsChallenger passive
    const chChar = state.players[1].town.find((s) => s.cards[0].cardId === 'bb_poppy_2');
    begin(state, 1);
    const acts = legalActions(state, 1);
    const chAct = acts.find((a) => a.type === 'challenge');
    assert.ok(chAct, 'a challenge action should be legal');
    assert.equal(chAct.minBid, 3, 'Poppy lets the challenger tie (announcer bid 3) instead of needing 4');
    await applyAction(state, 1, chAct);
    state.agents = [{ choose: async () => 'supply' }, {}];
    await startPhase(state, 0);
    assert.equal(state.players[1].supply, 10 - 3 + 4, 'challenger wins the tie thanks to Poppy');
  });

  test('only one challenge is permitted per purchase', async () => {
    const state = newGame();
    const pd = await setupPending(state, { annBid: 3 });
    const chChar = addStack(state, 1, 'pp_patch_1', UPRIGHT);
    begin(state, 1);
    await applyAction(state, 1, { type: 'challenge', pendingId: pd.id, cardId: pd.cardId, charUid: chChar.uid, bid: 5, minBid: 4, maxBid: 10 });
    const otherChar = addStack(state, 1, 'pp_juniper_1', UPRIGHT);
    await assert.rejects(() => applyAction(state, 1, { type: 'challenge', pendingId: pd.id, cardId: pd.cardId, charUid: otherChar.uid, bid: 6, minBid: 6, maxBid: 10 }));
  });

  test("Mayor's Seal blocks challenges on the next announcement", async () => {
    const state = newGame();
    setSupply(state, 0, 10);
    setSupply(state, 1, 10);
    setCity(state, ['mk_festival_grant']);
    addMod(state, 0, 'unchallengeable', 1, 'untilUsed');
    const s = addStack(state, 0, 'bb_clover_1', UPRIGHT);
    begin(state, 0);
    await applyAction(state, 0, { type: 'announce', cardId: 'mk_festival_grant', charUid: s.uid, bid: 2, minBid: 2, maxBid: 10 });
    const pd = state.market.pending[0];
    assert.equal(pd.unchallengeable, true);
    const chChar = addStack(state, 1, 'pp_patch_1', UPRIGHT);
    begin(state, 1);
    await assert.rejects(() => applyAction(state, 1, { type: 'challenge', pendingId: pd.id, cardId: pd.cardId, charUid: chChar.uid, bid: 3, minBid: 3, maxBid: 10 }));
  });

  test('Quiet Mediation cancels the next challenge against the announcer', async () => {
    const state = newGame();
    setSupply(state, 0, 10);
    setSupply(state, 1, 10);
    setCity(state, ['mk_festival_grant']);
    const s = addStack(state, 0, 'bb_clover_1', UPRIGHT);
    begin(state, 0);
    await applyAction(state, 0, { type: 'announce', cardId: 'mk_festival_grant', charUid: s.uid, bid: 2, minBid: 2, maxBid: 10 });
    addMod(state, 0, 'cancelNextChallenge', 1, 'untilUsed'); // as if Quiet Mediation had been gained earlier
    const pd = state.market.pending[0];
    const chChar = addStack(state, 1, 'pp_patch_1', UPRIGHT);
    begin(state, 1);
    await applyAction(state, 1, { type: 'challenge', pendingId: pd.id, cardId: pd.cardId, charUid: chChar.uid, bid: 3, minBid: 3, maxBid: 10 });
    assert.equal(pd.challenge, null, 'the challenge never registers');
    assert.equal(chChar.orientation, BUSY, "the challenger's character still commits to being Busy");
    assert.equal(state.players[0].mods.some((m) => m.key === 'cancelNextChallenge'), false, 'the mod is consumed');
  });

  test('Statue of Courage makes the next challenge cost 1 less to pay (but bid is unaffected)', async () => {
    const state = newGame();
    const pd = await setupPending(state, { annBid: 3 });
    giveStatue(state, 1, 'st_courage');
    addMod(state, 1, 'challengeDiscount', 1, 'untilUsed');
    const chChar = addStack(state, 1, 'pp_patch_1', UPRIGHT);
    begin(state, 1);
    await applyAction(state, 1, { type: 'challenge', pendingId: pd.id, cardId: pd.cardId, charUid: chChar.uid, bid: 4, minBid: 4, maxBid: 10 });
    assert.equal(state.players[1].escrow, 3, 'paid 1 less than the bid amount');
    assert.equal(pd.challenge.bid, 4, 'the recorded bid itself is still 4');
  });

  test('Patch, Town Auditor draws a card when the announcer is challenged', async () => {
    const state = newGame();
    setSupply(state, 0, 10);
    setSupply(state, 1, 10);
    setCity(state, ['mk_festival_grant']);
    addStack(state, 0, 'pp_patch_2', UPRIGHT); // Town Auditor: onChallengedByOpponent -> draw 1
    const s = addStack(state, 0, 'bb_clover_1', UPRIGHT);
    begin(state, 0);
    await applyAction(state, 0, { type: 'announce', cardId: 'mk_festival_grant', charUid: s.uid, bid: 2, minBid: 2, maxBid: 10 });
    const pd = state.market.pending[0];
    const chChar = addStack(state, 1, 'pp_juniper_1', UPRIGHT);
    begin(state, 1);
    const before = state.players[0].hand.length;
    await applyAction(state, 1, { type: 'challenge', pendingId: pd.id, cardId: pd.cardId, charUid: chChar.uid, bid: 3, minBid: 3, maxBid: 10 });
    assert.equal(state.players[0].hand.length, before + 1, 'Patch draws for the announcer when challenged');
  });

  test('Market Day draws on the first announcement of the turn', async () => {
    const state = newGame();
    setSupply(state, 0, 10);
    setCity(state, ['mk_festival_grant', 'mk_supply_depot']);
    addLimitedEvent(state, 0, 'pp_market_day', 2);
    const s1 = addStack(state, 0, 'bb_clover_1', UPRIGHT);
    const s2 = addStack(state, 0, 'bb_mabel_1', UPRIGHT);
    begin(state, 0);
    const before = state.players[0].hand.length;
    await applyAction(state, 0, { type: 'announce', cardId: 'mk_festival_grant', charUid: s1.uid, bid: 2, minBid: 2, maxBid: 10 });
    assert.equal(state.players[0].hand.length, before + 1, 'first announcement draws a card');
    await applyAction(state, 0, { type: 'announce', cardId: 'mk_supply_depot', charUid: s2.uid, bid: 2, minBid: 2, maxBid: 10 });
    assert.equal(state.players[0].hand.length, before + 1, 'second announcement this turn does not draw again');
  });

  test('Civic Rally adds +1 to the first bid of the turn', async () => {
    const state = newGame();
    setSupply(state, 0, 10);
    setCity(state, ['mk_festival_grant']);
    addLimitedEvent(state, 0, 'pp_civic_rally', 2);
    const s = addStack(state, 0, 'bb_clover_1', UPRIGHT);
    begin(state, 0);
    await applyAction(state, 0, { type: 'announce', cardId: 'mk_festival_grant', charUid: s.uid, bid: 2, minBid: 2, maxBid: 10 });
    const pd = state.market.pending[0];
    assert.equal(pd.bonus, 1, 'the first bid this turn counts as 1 higher');
  });

  test("Hazel Market Vendor lowers the first announcement's minimum bid by 1 while upright", async () => {
    const state = newGame();
    setSupply(state, 0, 10);
    setCity(state, ['mk_festival_grant']); // cost 2
    addStack(state, 0, 'pp_hazel_1', UPRIGHT);
    const s = addStack(state, 0, 'bb_clover_1', UPRIGHT);
    begin(state, 0);
    const acts = legalActions(state, 0);
    const annAct = acts.find((a) => a.type === 'announce' && a.cardId === 'mk_festival_grant' && a.charUid === s.uid);
    assert.equal(annAct.minBid, 1, 'min bid reduced from 2 to 1');
    await applyAction(state, 0, { type: 'announce', cardId: 'mk_festival_grant', charUid: s.uid, bid: 1, minBid: 1, maxBid: 10 });
    assert.equal(state.players[0].supply, 9);
  });

  test('Hazel does not reduce the minimum bid while Busy', async () => {
    const state = newGame();
    setSupply(state, 0, 10);
    setCity(state, ['mk_festival_grant']);
    addStack(state, 0, 'pp_hazel_1', BUSY);
    const s = addStack(state, 0, 'bb_clover_1', UPRIGHT);
    begin(state, 0);
    const acts = legalActions(state, 0);
    const annAct = acts.find((a) => a.type === 'announce' && a.cardId === 'mk_festival_grant' && a.charUid === s.uid);
    assert.equal(annAct.minBid, 2, 'Hazel must be upright to grant the discount');
  });
});

describe('Capital City refresh and disposal', () => {
  test('the City tops back up to five cards as soon as a purchase resolves', async () => {
    const state = newGame();
    setCity(state, ['mk_festival_grant', 'mk_supply_depot']);
    state.market.deck = ['mk_town_bell', 'mk_town_clock', 'mk_courier_network', 'mk_library_annex'];
    setSupply(state, 0, 10);
    const s = addStack(state, 0, 'bb_clover_1', UPRIGHT);
    begin(state, 0);
    await applyAction(state, 0, { type: 'announce', cardId: 'mk_festival_grant', charUid: s.uid, bid: 2, minBid: 2, maxBid: 10 });
    const pd = state.market.pending[0];
    const logLen = state.log.length;
    await resolvePurchase(state, pd);
    assert.ok(!state.market.city.includes('mk_festival_grant'), 'the bought card left the display');
    assert.ok(state.market.cityDump.includes('mk_festival_grant'), 'and went to the City Dump');
    assert.equal(state.market.city[0], 'mk_supply_depot', 'the unsold card stays where it was');
    assert.equal(state.market.city.length, 5, 'the display is topped up: 1 remaining + 4 dealt');
    assert.equal(state.market.deck.length, 0, 'the Market Deck was drawn down to refill the display');
    assert.deepEqual(state.market.city.slice(1), ['mk_town_bell', 'mk_town_clock', 'mk_courier_network', 'mk_library_annex'], 'dealt in deck order');
    const refillLine = state.log.slice(logLen).find((l) => l.fx && l.fx.kind === 'refill');
    assert.ok(refillLine, 'the refill is logged with a structured fx event');
    assert.deepEqual(refillLine.fx.cardIds, ['mk_town_bell', 'mk_town_clock', 'mk_courier_network', 'mk_library_annex']);
  });

  test('a full display is not touched, and a 5-card deck fully restocks after a purchase', async () => {
    const state = newGame();
    assert.equal(state.market.city.length, 5);
    assert.equal(refillCity(state), false, 'nothing to deal when the display is full');
    setCity(state, ['mk_festival_grant', 'mk_supply_depot', 'mk_town_bell', 'mk_town_clock', 'mk_courier_network']);
    state.market.deck = ['mk_library_annex', 'mk_public_gardens'];
    setSupply(state, 0, 10);
    const s = addStack(state, 0, 'bb_clover_1', UPRIGHT);
    begin(state, 0);
    await applyAction(state, 0, { type: 'announce', cardId: 'mk_festival_grant', charUid: s.uid, bid: 2, minBid: 2, maxBid: 10 });
    await resolvePurchase(state, state.market.pending[0]);
    assert.equal(state.market.city.length, 5, 'back to five');
    assert.equal(state.market.deck.length, 1, 'exactly one card dealt');
    assert.equal(state.market.city[4], 'mk_library_annex');
  });

  test('the Market Deck reshuffles the City Dump mid-deal when it runs out while topping up', async () => {
    const state = newGame();
    setCity(state, ['mk_festival_grant', 'mk_supply_depot', 'mk_town_bell']);
    state.market.deck = ['mk_library_annex'];
    state.market.cityDump = ['mk_public_gardens', 'mk_town_clock'];
    setSupply(state, 0, 10);
    const s = addStack(state, 0, 'bb_clover_1', UPRIGHT);
    begin(state, 0);
    await applyAction(state, 0, { type: 'announce', cardId: 'mk_festival_grant', charUid: s.uid, bid: 2, minBid: 2, maxBid: 10 });
    await resolvePurchase(state, state.market.pending[0]);
    // 2 remaining + 1 from the deck + 2 needed: the deck is empty so the dump (2 old + festival grant) is reshuffled in.
    assert.equal(state.market.city.length, 5, 'topped back up to five');
    assert.equal(state.market.cityDump.length, 0, 'the City Dump was shuffled into the Market Deck');
    assert.equal(state.market.deck.length, 1, 'one reshuffled card is left in the deck');
    assert.ok(state.market.city.includes('mk_library_annex'));
  });

  test('the City Dump reshuffles into the Market Deck once the deck is empty, refilling the City', async () => {
    const state = newGame();
    setCity(state, ['mk_festival_grant']);
    state.market.deck = [];
    state.market.cityDump = ['mk_town_bell', 'mk_supply_depot', 'mk_courier_network', 'mk_town_clock'];
    setSupply(state, 0, 10);
    const s = addStack(state, 0, 'bb_clover_1', UPRIGHT);
    begin(state, 0);
    await applyAction(state, 0, { type: 'announce', cardId: 'mk_festival_grant', charUid: s.uid, bid: 2, minBid: 2, maxBid: 10 });
    const pd = state.market.pending[0];
    await resolvePurchase(state, pd); // City becomes empty -> refill triggers reshuffle
    assert.equal(state.market.cityDump.length, 0, 'City Dump emptied into the Market Deck');
    // The 4 pre-seeded City Dump cards plus the just-sold festival_grant (also cityDump-bound) is 5 -
    // exactly enough to refill the City in one go.
    assert.equal(state.market.city.length, 5, 'City refilled from the reshuffled Market Deck');
    assert.equal(state.market.deck.length, 0, 'Market Deck drained refilling the City');
  });

  test('Out of Play cards (Emergency Reserve, Town Archives) never return to the deck or City Dump', async () => {
    const state = newGame();
    setCity(state, ['mk_emergency_reserve']);
    state.market.deck = []; // isolate: only the explicitly placed card exists in the market for this test
    state.market.cityDump = [];
    setSupply(state, 0, 10);
    const s = addStack(state, 0, 'bb_clover_1', UPRIGHT);
    begin(state, 0);
    await applyAction(state, 0, { type: 'announce', cardId: 'mk_emergency_reserve', charUid: s.uid, bid: 2, minBid: 2, maxBid: 10 });
    const pd = state.market.pending[0];
    await resolvePurchase(state, pd);
    assert.ok(state.market.outOfPlay.includes('mk_emergency_reserve'));
    assert.ok(!state.market.cityDump.includes('mk_emergency_reserve'));
    assert.ok(!state.market.deck.includes('mk_emergency_reserve'));
    // Exhaust the market deck/city dump entirely and confirm the Out of Play card still never reappears.
    state.market.deck = [];
    state.market.cityDump = [];
    state.market.city = [];
    refillCity(state);
    assert.ok(!state.market.city.includes('mk_emergency_reserve'));
  });
});
