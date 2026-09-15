// The night side of the collection: the Owls, the Science study, the wake-up call, the deck scry,
// and the Cat's self-ready used from the wrong side of upright.
//
// This pins the rules these cards brought with them rather than particular numbers on particular
// cards, so a balance pass does not have to rewrite it.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, SET, newGame, addStack, addToDeckTop, addToHand, setSupply, UPRIGHT, BUSY } from './helpers.mjs';
import { createGame, playTurn, applyAction, legalActions, runEffect, topCard, cardDef } from '../src/engine/index.js';
import { verbsOf } from '../scripts/identity.mjs';
import { paintedArtSVG } from '../src/ui/painted-art.js';
import { cardArtSVG, iconSVG, SPECIES_KIND } from '../src/ui/art.js';

const byId = (id) => SET.cards.find((c) => c.id === id);
const owlsAndScience = SET.cards.filter((c) => c.species === 'Owl' || c.study === 'Science');

describe('the Owls and the Science of the stars', () => {
  test('the Owls are a species and Science a study, and both are well stocked', () => {
    assert.ok(SET.species.includes('Owl'));
    assert.ok(SET.studies.includes('Science'));
    const owls = SET.cards.filter((c) => c.species === 'Owl');
    assert.ok(owls.length >= 9, `${owls.length} Owl cards`);
    assert.ok(owls.some((c) => c.type === 'marketCharacter'), 'an Owl can be hired from the Capital City');
    const science = SET.cards.filter((c) => c.study === 'Science');
    assert.ok(science.length >= 20, `${science.length} Science Characters`);
    assert.ok(new Set(science.map((c) => c.species)).size >= 6, 'Science cuts across the species');
    // The barista, and at least one Cat astronaut.
    assert.ok(SET.cards.some((c) => c.type === 'character' && /barista/i.test(c.title || '')), 'somebody is the barista');
    const astronaut = SET.cards.find((c) => c.type === 'character' && /astronaut/i.test(c.title || ''));
    assert.ok(astronaut && astronaut.species === 'Cat', 'a Cat is the astronaut');
  });

  test('Owls carry their signature, the wake-up call, and the charter is in the species file', () => {
    const owls = SET.cards.filter((c) => c.species === 'Owl' && (c.type === 'character' || c.type === 'marketCharacter'));
    const callers = owls.filter((c) => verbsOf(c).has('advanceCharacter'));
    assert.ok(callers.length >= 2, `${callers.length} Owls make the wake-up call`);
    assert.ok(!owls.some((c) => verbsOf(c).has('raiseOwnBid')), 'an Owl does not bid: that is the hole');
  });
});

describe('the wake-up call (advanceCharacter)', () => {
  test('a Busy Character stands up, a Master at 180° becomes Busy, and work in progress is left alone', async () => {
    const state = newGame();
    state.phase = 'actions';
    state.active = 0;
    const busy = addStack(state, 0, 'mk_lynnette_press_feeder_2', BUSY);
    const master = addStack(state, 0, 'mk_clover_master_botanist_5', 180);
    const working = addStack(state, 0, 'mk_maribel_seed_keeper_1', BUSY, { shift: { remaining: 1, output: 1 } });
    const upright = addStack(state, 0, 'mk_eric_smallholder_1', UPRIGHT);
    let offered = null;
    state.agents = [{ choose: async (s, pi, req) => { if (req.kind === 'pick') { offered = req; return [busy.uid]; } return undefined; } }, {}];
    await runEffect(state, 0, { do: 'advanceCharacter' }, { sourceCardId: 'mk_bean_espresso_1' });
    assert.equal(offered.reason, 'advance');
    const uids = offered.options.map((o) => o.uid);
    assert.ok(uids.includes(busy.uid) && uids.includes(master.uid), 'the sleepers are offered');
    assert.ok(!uids.includes(working.uid), 'a Character mid-shift is not');
    assert.ok(!uids.includes(upright.uid), 'nor one already upright');
    assert.equal(busy.orientation, UPRIGHT, 'Busy → upright');
    assert.ok(working.shift, 'the shift is untouched');

    state.agents = [{ choose: async (s, pi, req) => (req.kind === 'pick' ? [master.uid] : undefined) }, {}];
    await runEffect(state, 0, { do: 'advanceCharacter' }, { sourceCardId: 'mk_bean_espresso_1' });
    assert.equal(master.orientation, BUSY, '180° → Busy, one step only');
  });

  test('it never frees a Character pledged into an auction', async () => {
    const state = newGame();
    const pledged = addStack(state, 0, 'mk_lynnette_press_feeder_2', BUSY);
    pledged.lockedBid = 'x';
    let asked = false;
    state.agents = [{ choose: async () => { asked = true; return []; } }, {}];
    await runEffect(state, 0, { do: 'advanceCharacter' }, {});
    assert.ok(!asked, 'nothing to offer');
    assert.equal(pledged.orientation, BUSY);
  });
});

describe('the deck scry (scryDeck)', () => {
  test('shows the top cards, sends the chosen ones to the bottom and keeps the rest in order', async () => {
    const state = newGame();
    const p = state.players[0];
    const c = addToDeckTop(state, 0, 'mk_hedge_apothecary');
    const b = addToDeckTop(state, 0, 'mk_lynnette_press_feeder_2');
    const a = addToDeckTop(state, 0, 'mk_clover_seedling_helper_0');
    state.agents = [{ choose: async (s, pi, req) => (req.kind === 'pick' && req.reason === 'scry' ? [b.uid] : undefined) }, {}];
    await runEffect(state, 0, { do: 'scryDeck', count: 3 }, { sourceCardId: 'mk_sage_night_assistant_0' });
    assert.equal(p.deck[0].uid, a.uid);
    assert.equal(p.deck[1].uid, c.uid, 'the kept cards close up in order');
    assert.equal(p.deck[p.deck.length - 1].uid, b.uid, 'the binned card is on the bottom');
    const total = p.deck.length;
    // An empty answer keeps everything.
    state.agents = [{ choose: async () => [] }, {}];
    await runEffect(state, 0, { do: 'scryDeck', count: 2 }, {});
    assert.equal(p.deck[0].uid, a.uid);
    assert.equal(p.deck.length, total);
  });
});

describe("the Cat's self-ready, used from the wrong side of upright", () => {
  test('is offered only while the Cat is not upright, once, and cashes a shift in progress', async () => {
    const state = newGame();
    state.phase = 'actions';
    state.active = 0;
    state.agents = [{ choose: async () => [] }, {}];
    const comet = addStack(state, 0, 'mk_comet_test_pilot_3', BUSY, { shift: { remaining: 2, output: 3 } });
    const before = state.players[0].supply;
    const offer = legalActions(state, 0).find((a) => a.type === 'ability' && a.charUid === comet.uid);
    assert.ok(offer && offer.selfReady, 'offered from Busy');
    assert.ok(!legalActions(state, 0).some((a) => a.type === 'work' && a.charUid === comet.uid), 'a Busy Cat cannot work');
    await applyAction(state, 0, offer);
    assert.equal(comet.orientation, UPRIGHT);
    assert.equal(comet.shift, null, 'the shift completed at once');
    assert.equal(state.players[0].supply, before + 3);
    assert.ok(comet.selfReadyUsed);
    assert.ok(!legalActions(state, 0).some((a) => a.type === 'ability' && a.charUid === comet.uid), 'never from upright, and never twice');
    comet.orientation = 180;
    assert.ok(!legalActions(state, 0).some((a) => a.type === 'ability' && a.charUid === comet.uid), 'spent for the game');
  });

  test('an ordinary Busy ability is still used from upright only', () => {
    const state = newGame();
    state.phase = 'actions';
    state.active = 0;
    const bean = addStack(state, 0, 'mk_bean_espresso_1', UPRIGHT);
    addStack(state, 0, 'mk_lynnette_press_feeder_2', BUSY);
    assert.ok(legalActions(state, 0).some((a) => a.type === 'ability' && a.charUid === bean.uid && !a.selfReady));
    bean.orientation = BUSY;
    assert.ok(!legalActions(state, 0).some((a) => a.type === 'ability' && a.charUid === bean.uid));
  });
});

describe('the night cards in play', () => {
  test("Bean's Busy wakes a friend, and Comet the Astronaut reads the Market Deck on standing up", async () => {
    const state = newGame();
    state.phase = 'actions';
    state.active = 0;
    const bean = addStack(state, 0, 'mk_bean_espresso_1', UPRIGHT);
    const sleeper = addStack(state, 0, 'mk_lynnette_press_feeder_2', BUSY);
    state.agents = [{ choose: async (s, pi, req) => (req.kind === 'pick' ? [sleeper.uid] : undefined) }, {}];
    await applyAction(state, 0, { type: 'ability', charUid: bean.uid, cardId: 'mk_bean_espresso_1' });
    assert.equal(bean.orientation, BUSY, 'Bean goes Busy pulling the shot');
    assert.equal(sleeper.orientation, UPRIGHT, 'and the friend is up');

    const comet = addStack(state, 0, 'mk_comet_astronaut_5', BUSY);
    const supply = state.players[0].supply;
    state.players[0].knownMarketTop = [];
    await runEffect(state, 0, byId('mk_comet_astronaut_5').abilities[0].effect, { sourceCardId: 'mk_comet_astronaut_5', sourceStackUid: comet.uid });
    assert.equal(state.players[0].supply, supply + 1);
    assert.equal(state.players[0].knownMarketTop.length, Math.min(3, state.market.deck.length));
  });

  test('an upgrade into a dearer version pays the difference and keeps the orientation', async () => {
    const state = newGame();
    setSupply(state, 0, 20);
    const stack = addStack(state, 0, 'mk_lindsay_potting_helper_0', BUSY);
    const card = addToHand(state, 0, 'mk_lindsay_moon_gardener_5');
    state.phase = 'actions';
    state.active = 0;
    state.agents = [{ choose: async () => [] }, {}];
    const up = legalActions(state, 0).find((a) => a.type === 'recruit' && a.upgrade && a.cardUid === card.uid);
    assert.ok(up, 'the Moon Gardener upgrades the Potting Helper');
    assert.equal(up.cost, 5 - 0);
    await applyAction(state, 0, up);
    assert.equal(topCard(state, stack).id, 'mk_lindsay_moon_gardener_5');
    assert.equal(stack.orientation, BUSY);
  });

});

describe('the night cards\u2019 art', () => {
  test('every Owl and Science card resolves a bundled painting, and both have their own icons and scene', () => {
    for (const c of owlsAndScience) {
      const svg = paintedArtSVG(c, '<svg data-fallback="original"/>');
      assert.ok(svg.includes('painted-art') && svg.includes('atlas.png'), `${c.id} names a bundled atlas`);
      assert.ok(svg.includes('data-fallback="original"'), `${c.id} keeps the vector fallback`);
    }
    assert.equal(SPECIES_KIND.Owl, 'owl');
    assert.ok(iconSVG('Owl').includes('<svg') && iconSVG('Owl') !== iconSVG('nope'), 'the Owl has an icon');
    assert.ok(iconSVG('Science') !== iconSVG('nope'), 'Science has an icon');
    const sage = byId('mk_sage_astronomer_3');
    const scene = cardArtSVG(sage);
    assert.ok(scene.includes('<svg') && scene.length > 500, 'an Owl scientist has a vector scene of their own');
  });
});
