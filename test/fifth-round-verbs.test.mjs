// The fifth round of wishes, and the verbs the Supply sinks are built out of.
//
// Four things are under test here. Gwen's door, which is the one hiring verb in the collection that
// does not read your own Unemployment and stop there. Oatmeal's awning, which is the one protection
// written from outside a single town — and which is now a shelter against Unemployment itself
// rather than a mere untargetability. The whole deck searched, which no card may do without paying
// for it. And the fee on an activated ability, which is the game's first Supply sink that is not a
// purchase: what it costs, when it is offered, and what happens when a Mayor cannot meet it.
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, addStack, addToDeckTop, addToUnemployment, defineCard, setCity, setSupply,
  makeScriptedAgent, UPRIGHT, BUSY,
} from './helpers.mjs';
import { runEffect, unemployStack, isProtected } from '../src/engine/effects.js';
import { applyAction, legalActions, cardCostFor, minBidFor, abilityFee } from '../src/engine/index.js';
import { effectPower, abilityPower } from '../src/engine/power.js';

function stage(opts = {}) {
  const state = newGame(opts);
  state.phase = 'actions';
  state.active = 0;
  state.players[0].hand = [];
  state.players[1].hand = [];
  return state;
}
/** Answer every pick with the first legal option and yes to every confirm. */
function takesFirst(state) {
  const agent = { choose: async (_s, _pi, req) => (req.kind === 'pick' ? req.options.slice(0, Math.max(1, req.min)).map((o) => o.uid) : true) };
  state.agents = [agent, agent];
}
/** Pick whichever option carries this card id. */
const picksCard = (cardId) => (_s, _pi, req) => [req.options.find((o) => o.cardId === cardId).uid];

const A_CHARACTER = 'mk_rosabeth_garden_hand_1';
const ANOTHER = 'mk_daniel_chart_copier_1';

// -------------------------------------------------- Gwen: the door that is open to everybody

describe('rehireFromAnywhere', () => {
  test('it reaches the rival’s Unemployment, and the animal changes hands rather than being copied', async () => {
    const state = stage();
    setSupply(state, 0, 10);
    const theirs = addToUnemployment(state, 1, A_CHARACTER);
    state.agents = [makeScriptedAgent([picksCard(A_CHARACTER)]), {}];
    await runEffect(state, 0, { do: 'rehireFromAnywhere' }, {});
    assert.equal(state.players[1].unemployment.length, 0, 'they are off the rival’s books');
    assert.equal(state.players[0].town.length, 1, 'and standing in this town');
    assert.equal(state.players[0].town[0].cards[0].uid, theirs.uid, 'the same card, not a second one');
    assert.equal(state.players[0].town[0].orientation, UPRIGHT, 'a shift starts now, not next turn');
  });

  test('`from` is what the card may reach: a counter that only reads its own books leaves the rival’s alone', async () => {
    const state = stage();
    setSupply(state, 0, 10);
    addToUnemployment(state, 1, A_CHARACTER);
    state.agents = [makeScriptedAgent([() => { throw new Error('nothing should be asked'); }]), {}];
    await runEffect(state, 0, { do: 'rehireFromAnywhere', from: ['unemployment'] }, {});
    assert.equal(state.players[1].unemployment.length, 1, 'the rival keeps them');
    assert.equal(state.players[0].town.length, 0, 'and nobody walked in');
  });

  test('hired help lying in the City Dump can be given a shift, and the Supply is actually paid', async () => {
    const state = stage();
    const hire = state.set.cards.find((c) => c.type === 'marketCharacter');
    setSupply(state, 0, hire.cost);
    state.market.cityDump.push(hire.id);
    takesFirst(state);
    await runEffect(state, 0, { do: 'rehireFromAnywhere', from: ['cityDump'], discount: 1 }, {});
    assert.equal(state.market.cityDump.includes(hire.id), false, 'they are out of the Dump');
    assert.equal(state.players[0].town.length, 1);
    assert.equal(state.players[0].supply, 1, 'cost less the discount, and no more');
  });

  test('a full town has no counter to put anybody behind, and a Mayor who cannot pay is offered nobody', async () => {
    const full = stage();
    setSupply(full, 0, 20);
    for (let i = 0; i < full.rules.town.maxCharacters; i++) addStack(full, 0, A_CHARACTER, UPRIGHT);
    addToUnemployment(full, 0, ANOTHER);
    full.agents = [makeScriptedAgent([() => { throw new Error('nothing should be asked'); }]), {}];
    await runEffect(full, 0, { do: 'rehireFromAnywhere' }, {});
    assert.equal(full.players[0].unemployment.length, 1, 'still out of work');

    const broke = stage();
    setSupply(broke, 0, 0);
    addToUnemployment(broke, 0, A_CHARACTER); // costs 1, and the till is empty
    broke.agents = [makeScriptedAgent([() => { throw new Error('nothing should be asked'); }]), {}];
    await runEffect(broke, 0, { do: 'rehireFromAnywhere' }, {});
    assert.equal(broke.players[0].town.length, 0);
  });
});

// -------------------------------------------------- Oatmeal: the awning over the whole square

describe('the shared shelter', () => {
  test('`everyone` shelters one animal in each town, the rival’s included', async () => {
    const state = stage();
    const mine = addStack(state, 0, A_CHARACTER, UPRIGHT);
    const theirs = addStack(state, 1, ANOTHER, UPRIGHT);
    takesFirst(state);
    await runEffect(state, 0, { do: 'protectCharacter', everyone: true, turns: 2 }, {});
    assert.ok(isProtected(state, mine), 'the Mayor who played it');
    assert.ok(isProtected(state, theirs), 'and the Mayor who did not — that is the price of it');
  });

  test('a sheltered animal is out of reach of Unemployment itself, rival or weather', async () => {
    const state = stage();
    const mine = addStack(state, 0, A_CHARACTER, UPRIGHT);
    takesFirst(state);
    await runEffect(state, 0, { do: 'protectCharacter' }, {});

    assert.equal(await unemployStack(state, 0, mine, { byEffect: true, sourcePi: 1 }), false, 'a rival cannot');
    assert.equal(await unemployStack(state, 0, mine, { byEffect: true, sourcePi: null }), false, 'nor can the weather');
    assert.equal(state.players[0].town.length, 1);
    // Their own Mayor may still let them go: a shelter is not a contract.
    assert.equal(await unemployStack(state, 0, mine, { byEffect: true, sourcePi: 0 }), true);
    assert.equal(state.players[0].town.length, 0);
  });

  test('`turns` is how long the cover holds, counted in that Mayor’s own turns', async () => {
    const state = stage();
    const one = addStack(state, 0, A_CHARACTER, UPRIGHT);
    takesFirst(state);
    await runEffect(state, 0, { do: 'protectCharacter', turns: 2 }, {});
    state.turnNumber += 2;
    assert.ok(isProtected(state, one), 'still covered a turn later');
    state.turnNumber += 2;
    assert.equal(isProtected(state, one), false, 'and not two');
  });

  test('the model pays a shared shelter a fraction of a private one, because the rival gets one too', () => {
    const mine = effectPower({ do: 'protectCharacter', turns: 2 });
    const both = effectPower({ do: 'protectCharacter', everyone: true, turns: 2 });
    assert.ok(both > 0 && both < mine, 'worth having, and worth less than keeping it to yourself');
  });
});

// -------------------------------------------------- the whole deck, for a price

describe('searchDeck', () => {
  test('it finds the card the filter names, puts it in hand, and shuffles what is left', async () => {
    const state = stage();
    addToDeckTop(state, 0, A_CHARACTER);
    const before = state.players[0].deck.length;
    state.agents = [makeScriptedAgent([picksCard(A_CHARACTER)]), {}];
    await runEffect(state, 0, { do: 'searchDeck', count: 1, filter: { type: 'character' } }, {});
    assert.equal(state.players[0].hand.length, 1);
    assert.equal(state.players[0].hand[0].cardId, A_CHARACTER);
    assert.equal(state.players[0].deck.length, before - 1, 'one card out of the deck and no more');
  });

  test('a search that finds nothing still disturbs the deck and asks nobody anything', async () => {
    const state = stage();
    state.players[0].deck = [];
    addToDeckTop(state, 0, A_CHARACTER);
    state.agents = [makeScriptedAgent([() => { throw new Error('nothing should be asked'); }]), {}];
    await runEffect(state, 0, { do: 'searchDeck', count: 1, filter: { type: 'statue' } }, {});
    assert.equal(state.players[0].hand.length, 0);
    assert.equal(state.players[0].deck.length, 1);
  });

  test('`to: deckTop` puts the find on top of the deck rather than in hand', async () => {
    const state = stage();
    addToDeckTop(state, 0, A_CHARACTER);
    state.agents = [makeScriptedAgent([picksCard(A_CHARACTER)]), {}];
    await runEffect(state, 0, { do: 'searchDeck', count: 1, filter: { type: 'character' }, to: 'deckTop' }, {});
    assert.equal(state.players[0].hand.length, 0);
    assert.equal(state.players[0].deck[0].cardId, A_CHARACTER);
  });
});

// -------------------------------------------------- a lot sunk out of the Capital City

test('peekMarketDeck with toBottom takes a lot off the table before anybody can bid on it', async () => {
  const state = stage();
  setCity(state, ['mk_mkt_town_bell'], { deck: ['mk_bld_hiring_hall', 'mk_st_joy', 'mk_mkt_penny_jar'] });
  state.agents = [makeScriptedAgent([picksCard('mk_st_joy')]), {}];
  await runEffect(state, 0, { do: 'peekMarketDeck', count: 2, toBottom: true }, {});
  assert.deepEqual(state.market.deck, ['mk_bld_hiring_hall', 'mk_mkt_penny_jar', 'mk_st_joy']);
  assert.deepEqual(state.players[0].knownMarketTop, ['mk_bld_hiring_hall'], 'what is sunk is no longer what is coming');
});

// -------------------------------------------------- the fee on an activated ability

describe('a Busy ability with a price', () => {
  const SINK = 'tst_sink';
  function withSink(fee, effect = { do: 'gainSupply', amount: 1 }) {
    const state = stage();
    defineCard(state, {
      id: SINK, type: 'character', name: 'Test', title: 'Counter Hand', species: 'Mouse', study: 'Food',
      cost: 1, shift: { delay: 1, output: 1 }, text: 'test', flavor: 'test',
      abilities: [{ trigger: 'busy', cost: { supply: fee }, effect }],
    });
    return state;
  }

  test('the fee is read off the card, and is charged when the ability is used', async () => {
    const state = withSink(4);
    const s = addStack(state, 0, SINK, UPRIGHT);
    setSupply(state, 0, 10);
    assert.equal(abilityFee({ cost: { supply: 4 } }), 4);
    await applyAction(state, 0, { type: 'ability', charUid: s.uid, cardId: SINK });
    assert.equal(state.players[0].supply, 7, '10, less the 4 it cost, plus the 1 it paid');
    assert.equal(s.orientation, BUSY, 'and the animal still goes Busy for it');
  });

  test('a fee the Mayor cannot meet takes the ability off the table — but never the shift', () => {
    const state = withSink(9);
    const s = addStack(state, 0, SINK, UPRIGHT);
    setSupply(state, 0, 8);
    const acts = legalActions(state, 0);
    assert.equal(acts.some((a) => a.type === 'ability' && a.charUid === s.uid), false, 'not offered');
    assert.ok(acts.some((a) => a.type === 'work' && a.charUid === s.uid), 'they can still work');
    setSupply(state, 0, 9);
    const rich = legalActions(state, 0).find((a) => a.type === 'ability' && a.charUid === s.uid);
    assert.ok(rich, 'offered the moment it can be paid for');
    assert.equal(rich.cost, 9, 'and the action says what it costs');
  });

  test('a forged action that cannot be paid for is refused', async () => {
    const state = withSink(9);
    const s = addStack(state, 0, SINK, UPRIGHT);
    setSupply(state, 0, 2);
    await assert.rejects(() => applyAction(state, 0, { type: 'ability', charUid: s.uid, cardId: SINK }),
      /Cannot afford/);
    assert.equal(state.players[0].supply, 2, 'and nothing was taken on the way out');
  });

  test('the model charges the fee against what surplus Supply is worth, not its face value', () => {
    const free = abilityPower({ trigger: 'busy', effect: { do: 'gainSupply', amount: 4 } });
    const paid = abilityPower({ trigger: 'busy', cost: { supply: 4 }, effect: { do: 'gainSupply', amount: 4 } });
    assert.ok(paid < free, 'a price is still a price');
    assert.ok(paid > free - 4 * 2, 'and not the face value of every use the trigger would allow');
  });
});

// -------------------------------------------------- the assessor's mark-down

describe('lotDiscount', () => {
  test('it moves what a lot costs this Mayor, and leaves the rival’s price alone', () => {
    const state = stage();
    setCity(state, ['mk_mkt_community_oven']);
    const list = cardCostFor(state, 1, 'mk_mkt_community_oven');
    state.players[0].mods.push({ key: 'lotDiscount', value: 2, expires: 'turnEnd' });
    assert.equal(cardCostFor(state, 0, 'mk_mkt_community_oven'), Math.max(0, list - 2));
    assert.equal(cardCostFor(state, 1, 'mk_mkt_community_oven'), list, 'the rival reads the printed price');
    assert.equal(minBidFor(state, 0, 'mk_mkt_community_oven'), Math.max(0, list - 2), 'the minimum bid moves with it');
  });

  test('a filter narrows it to one kind of lot', () => {
    const state = stage();
    setCity(state, ['mk_mkt_community_oven', 'mk_st_joy']);
    const oven = cardCostFor(state, 0, 'mk_mkt_community_oven');
    const statue = cardCostFor(state, 0, 'mk_st_joy');
    state.players[0].mods.push({ key: 'lotDiscount', value: 5, expires: 'turnEnd', filter: { type: 'statue' } });
    assert.equal(cardCostFor(state, 0, 'mk_mkt_community_oven'), oven, 'the oven is the oven');
    assert.equal(cardCostFor(state, 0, 'mk_st_joy'), statue - 5);
  });

  test('a lot is never priced below nothing', () => {
    const state = stage();
    setCity(state, ['mk_mkt_community_oven']);
    state.players[0].mods.push({ key: 'lotDiscount', value: 99, expires: 'turnEnd' });
    assert.equal(cardCostFor(state, 0, 'mk_mkt_community_oven'), 0);
  });
});

// -------------------------------------------------- the agent walks up to the counter, or does not

test('the heuristic pays a fee when the Supply is surplus and leaves it alone when it is not', async () => {
  const { makeHeuristicAgent } = await import('../src/ai/heuristic.js');
  const SINK = 'tst_paid_removal';
  async function wouldPay(supply) {
    const state = stage();
    defineCard(state, {
      id: SINK, type: 'character', name: 'Test', title: 'Bailiff', species: 'Badger', study: 'Civics',
      // A middling shift on purpose: the choice under test is between working and paying, and an
      // animal who earns nothing would pay at any price while one who earns well never would.
      cost: 3, shift: { delay: 2, output: 1 }, text: 'test', flavor: 'test',
      abilities: [{ trigger: 'busy', cost: { supply: 10 }, effect: { do: 'unemployOpponentCharacter', optional: true } }],
    });
    // Nothing in the display anybody may bid on: with a Statue on the board the right play is to buy
    // the Statue, and what is under test here is what a Mayor does with Supply they cannot spend.
    setCity(state, ['mk_ord_monument_tax']);
    const s = addStack(state, 0, SINK, UPRIGHT);
    addStack(state, 1, A_CHARACTER, UPRIGHT).hasBeenUpright = true;
    setSupply(state, 0, supply);
    const agent = makeHeuristicAgent(1);
    const chosen = await agent.choose(state, 0, { kind: 'action', options: legalActions(state, 0) });
    return chosen && chosen.type === 'ability' && chosen.charUid === s.uid;
  }
  assert.equal(await wouldPay(60), true, 'sixty Supply and nothing to buy: the counter is worth walking up to');
  assert.equal(await wouldPay(15), false, 'fifteen Supply is a turn, not a surplus, so the shift is worth more');
});

test('a paid ability whose verb would find nothing is never taken', async () => {
  const { makeHeuristicAgent } = await import('../src/ai/heuristic.js');
  const SINK = 'tst_empty_removal';
  const state = stage();
  defineCard(state, {
    id: SINK, type: 'character', name: 'Test', title: 'Bailiff', species: 'Badger', study: 'Civics',
    cost: 3, shift: { delay: 2, output: 2 }, text: 'test', flavor: 'test',
    abilities: [{ trigger: 'busy', cost: { supply: 10 }, effect: { do: 'unemployOpponentCharacter', optional: true } }],
  });
  setCity(state, ['mk_ord_monument_tax']);
  const s = addStack(state, 0, SINK, UPRIGHT); // and the rival's town is empty
  setSupply(state, 0, 60);
  const chosen = await makeHeuristicAgent(1).choose(state, 0, { kind: 'action', options: legalActions(state, 0) });
  assert.notEqual(chosen && chosen.type === 'ability' && chosen.charUid === s.uid, true,
    'nobody pays ten Supply to remove an animal from an empty town');
});
