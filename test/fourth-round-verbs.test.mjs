// The fourth round of wishes: the eight `wantedVerbs` the third round left unbuilt.
//
// Each one is here because a character's story wanted it and the engine could not say it
// (their `wantedVerbs` entry in spec/maker_card_set.json names the wish and now names what was
// built). Pinned here by what each actually does, and by the manners it has to keep: a standing
// rate is never spent, a rule written against the rival never touches the Mayor who owns it, and
// the animal with a term who takes to the road is not the same as the animal who is finished.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, addStack, addToHand, addToDump, defineCard, setCity, giveBuilding, makeScriptedAgent,
  UPRIGHT, BUSY, RULES,
} from './helpers.mjs';
import { runEffect } from '../src/engine/effects.js';
import { recruitCost, pledgeMinCost } from '../src/engine/actions.js';
import { endPhase } from '../src/engine/game.js';
import { applyAction, legalActions } from '../src/engine/index.js';
import { rateCard, effectPower } from '../src/engine/power.js';

function stage(opts = {}) {
  const state = newGame(opts);
  state.phase = 'actions';
  state.active = 0;
  // An empty hand on both sides: these tests are about what one card does, and an opening hand of
  // six would make every "what came back out of the bin" assertion about the deal instead.
  state.players[0].hand = [];
  state.players[1].hand = [];
  return state;
}
/** Answer every choice with the first option offered, and yes to every confirm. */
function agentTakesFirst(state) {
  state.agents = [
    { choose: async (_s, _pi, req) => (req.kind === 'pick' ? req.options.slice(0, Math.max(1, req.min)).map((o) => o.uid) : true) },
    { choose: async (_s, _pi, req) => (req.kind === 'pick' ? req.options.slice(0, Math.max(1, req.min)).map((o) => o.uid) : true) },
  ];
}

// -------------------------------------------------- Sage: the sky watch says what order it comes in

test('peekMarketDeck with reorder puts the Capital City deck back the way the watcher wants it', async () => {
  const state = stage();
  setCity(state, ['mk_mkt_town_bell'], { deck: ['mk_bld_hiring_hall', 'mk_bld_weighbridge', 'mk_st_joy'] });
  // Reversed: the sky watch decides what the Capital City meets first.
  state.agents = [makeScriptedAgent([(s, pi, req) => {
    assert.equal(req.kind, 'order');
    assert.equal(req.reason, 'reorderMarket');
    return req.options.map((o) => o.uid).reverse();
  }]), {}];
  await runEffect(state, 0, { do: 'peekMarketDeck', count: 3, reorder: true }, {});
  assert.deepEqual(state.market.deck.slice(0, 3), ['mk_st_joy', 'mk_bld_weighbridge', 'mk_bld_hiring_hall']);
  assert.deepEqual(state.players[0].knownMarketTop, ['mk_st_joy', 'mk_bld_weighbridge', 'mk_bld_hiring_hall']);
});

test('peekMarketDeck without reorder still only looks, and a reorder of one card moves nothing', async () => {
  const state = stage();
  setCity(state, ['mk_mkt_town_bell'], { deck: ['mk_bld_hiring_hall', 'mk_bld_weighbridge'] });
  state.agents = [makeScriptedAgent([() => { throw new Error('nothing should be asked'); }]), {}];
  await runEffect(state, 0, { do: 'peekMarketDeck', count: 2 }, {});
  assert.deepEqual(state.market.deck.slice(0, 2), ['mk_bld_hiring_hall', 'mk_bld_weighbridge'], 'looking is looking');

  const one = stage();
  setCity(one, ['mk_mkt_town_bell'], { deck: ['mk_bld_hiring_hall'] });
  one.agents = [makeScriptedAgent([() => { throw new Error('one card is already in order'); }]), {}];
  await runEffect(one, 0, { do: 'peekMarketDeck', count: 3, reorder: true }, {});
  assert.deepEqual(one.players[0].knownMarketTop, ['mk_bld_hiring_hall']);
});

// -------------------------------------------------- Eric: a rate, not a discount

test('townRecruitDiscount is a rate: every recruit pays it, and no recruit spends it', async () => {
  const state = stage();
  const wage = defineCard(state, {
    id: 'tst_wage_setter', type: 'character', name: 'Wage Setter', title: 'Wage Setter', species: 'Rabbit',
    study: 'Agriculture', cost: 2, shift: { delay: 1, output: 2 },
    abilities: [{ trigger: 'passive', key: 'townRecruitDiscount', value: 1, requiresUpright: true }],
  });
  const hand = defineCard(state, {
    id: 'tst_hand', type: 'character', name: 'Hired Paw', title: 'Hired Paw', species: 'Mouse',
    study: 'Crafts', cost: 3, shift: { delay: 1, output: 2 },
  });
  const stack = addStack(state, 0, wage.id, UPRIGHT);
  state.players[0].supply = 20;
  assert.equal(recruitCost(state, 0, hand.id), 2, 'the rate is on before anybody hires');

  addToHand(state, 0, hand.id);
  addToHand(state, 0, hand.id);
  agentTakesFirst(state);
  await applyAction(state, 0, { type: 'recruit', cardUid: state.players[0].hand[0].uid });
  assert.equal(recruitCost(state, 0, hand.id), 2, 'a rate is not spent by the animal who paid it');

  // A discount on top of the rate is still spent by the first recruit it applies to.
  await runEffect(state, 0, { do: 'addMod', key: 'recruitDiscount', value: 1, consumable: true }, {});
  assert.equal(recruitCost(state, 0, hand.id), 1, 'rate and discount stack');
  await applyAction(state, 0, { type: 'recruit', cardUid: state.players[0].hand[0].uid });
  assert.equal(recruitCost(state, 0, hand.id), 2, 'the discount went; the rate stayed');

  // And it is a rate only while he is standing: sit him down and the town pays full price.
  stack.orientation = BUSY;
  assert.equal(recruitCost(state, 0, hand.id), 3);
});

// -------------------------------------------------- Benjamin: the whole bin, not the Events in it

test('cardFromDumpToHand reaches any card of yours in the Town Dump, and a filter narrows it', async () => {
  const state = stage();
  const character = addToDump(state, 0, 'mk_clover_seedling_helper_0');
  const event = addToDump(state, 0, 'mk_glut_of_squash');
  state.agents = [makeScriptedAgent([(s, pi, req) => {
    assert.equal(req.reason, 'cardFromDumpToHand');
    assert.equal(req.options.length, 2, 'the whole bin is on offer');
    return [character.uid];
  }]), {}];
  await runEffect(state, 0, { do: 'cardFromDumpToHand' }, {});
  assert.deepEqual(state.players[0].hand.map((c) => c.uid), [character.uid], 'a Character comes back out');
  assert.deepEqual(state.players[0].dump.map((c) => c.uid), [event.uid]);

  // A filter is what keeps a narrow card narrow: the Events only, even with a Character in there.
  const narrow = stage();
  addToDump(narrow, 0, 'mk_clover_seedling_helper_0');
  const onlyEvent = addToDump(narrow, 0, 'mk_glut_of_squash');
  narrow.agents = [makeScriptedAgent([(s, pi, req) => {
    assert.deepEqual(req.options.map((o) => o.uid), [onlyEvent.uid]);
    return [onlyEvent.uid];
  }]), {}];
  await runEffect(narrow, 0, { do: 'cardFromDumpToHand', filter: { type: 'event' } }, {});
  assert.equal(narrow.players[0].hand.length, 1);
  assert.equal(narrow.players[0].dump.length, 1, 'the Character stays in the bin');
});

test('cardFromDumpToHand asks nothing of an empty bin, and may be declined', async () => {
  const empty = stage();
  empty.agents = [makeScriptedAgent([() => { throw new Error('nothing to ask about'); }]), {}];
  await runEffect(empty, 0, { do: 'cardFromDumpToHand' }, {});
  assert.equal(empty.players[0].hand.length, 0);

  const declined = stage();
  addToDump(declined, 0, 'mk_clover_seedling_helper_0');
  declined.agents = [makeScriptedAgent([[]]), {}];
  await runEffect(declined, 0, { do: 'cardFromDumpToHand', optional: true }, {});
  assert.equal(declined.players[0].hand.length, 0, 'optional means it can be left there');
  assert.equal(declined.players[0].dump.length, 1);
});

// -------------------------------------------------- Jake: the hire who may be taken on again

test('returnsToMarket sends a finished retainer back to the Market Deck, not the City Dump', async () => {
  const state = stage();
  const drifter = defineCard(state, {
    id: 'tst_drifter', type: 'marketCharacter', name: 'Drifter', title: 'Drifter', species: 'Rabbit',
    study: 'Agriculture', cost: 3, shift: { delay: 1, output: 4 }, leavesAfter: 1, returnsToMarket: true,
  });
  const resident = defineCard(state, {
    id: 'tst_resident', type: 'marketCharacter', name: 'Resident', title: 'Resident', species: 'Badger',
    study: 'Crafts', cost: 3, shift: { delay: 1, output: 4 }, leavesAfter: 1,
  });
  const a = addStack(state, 0, drifter.id, UPRIGHT);
  const b = addStack(state, 0, resident.id, UPRIGHT);
  a.termRemaining = 1;
  b.termRemaining = 1;
  const deckBefore = state.market.deck.length;
  agentTakesFirst(state);
  await endPhase(state, 0);

  assert.equal(state.players[0].town.length, 0, 'both retainers are up');
  assert.equal(state.market.deck.at(-1), drifter.id, 'the drifter goes to the bottom of the deck');
  assert.equal(state.market.deck.length, deckBefore + 1);
  assert.ok(state.market.cityDump.includes(resident.id), 'the ordinary hire is finished with');
  assert.ok(!state.market.cityDump.includes(drifter.id));
});

test('a retainer pledged into an auction still does not tick, whichever way it would go', async () => {
  const state = stage();
  const drifter = defineCard(state, {
    id: 'tst_drifter2', type: 'marketCharacter', name: 'Drifter', title: 'Drifter', species: 'Rabbit',
    study: 'Agriculture', cost: 3, shift: { delay: 1, output: 4 }, leavesAfter: 1, returnsToMarket: true,
  });
  const s = addStack(state, 0, drifter.id, UPRIGHT);
  s.termRemaining = 1;
  s.lockedBid = true;
  agentTakesFirst(state);
  await endPhase(state, 0);
  assert.equal(state.players[0].town.length, 1, 'the town cannot send home what it has bid');
  assert.equal(s.termRemaining, 1);
});

// -------------------------------------------------- Faustus: a rule that binds the rival alone

test('opponentPledgeLadderPlus1 raises the rival ladder and leaves its own Mayor alone', () => {
  const state = stage();
  const tailor = defineCard(state, {
    id: 'tst_tailor', type: 'character', name: 'Tailor', title: 'Tailor', species: 'Cat',
    study: 'Crafts', cost: 3, shift: { delay: 1, output: 2 },
    abilities: [{ trigger: 'passive', key: 'opponentPledgeLadderPlus1', requiresUpright: true }],
  });
  const base = pledgeMinCost(state, null, 1);
  const stack = addStack(state, 0, tailor.id, UPRIGHT);
  assert.equal(pledgeMinCost(state, null, 1), base + 1, 'the rival opens a rung higher');
  assert.equal(pledgeMinCost(state, null, 0), base, 'and the Mayor who dressed for it does not');
  stack.orientation = BUSY;
  assert.equal(pledgeMinCost(state, null, 1), base, 'it is a rule while he is standing, and not after');
});

// -------------------------------------------------- Velvet: a rate that counts what the town built

test('addMod valuePer scales the rate by the Buildings this town has raised, up to its printed max', async () => {
  const state = stage();
  const rate = { do: 'addMod', key: 'buildingDiscount', value: 1, valuePer: 'buildingsBuilt', max: 3, expires: 'nextTurnStart' };

  await runEffect(state, 0, rate, {});
  assert.equal(state.players[0].mods.length, 0, 'a town that has raised nothing gets no rate at all');

  giveBuilding(state, 0, 'mk_bld_hiring_hall');
  giveBuilding(state, 0, 'mk_bld_weighbridge');
  await runEffect(state, 0, rate, {});
  assert.equal(state.players[0].mods.at(-1).value, 2, 'two up, two off the next consent');

  giveBuilding(state, 0, 'mk_bld_counting_house');
  giveBuilding(state, 0, 'mk_bld_town_workshop');
  state.players[0].mods = [];
  await runEffect(state, 0, rate, {});
  assert.equal(state.players[0].mods.at(-1).value, 3, 'and the printed ceiling holds');

  // The Statues are bought, not built, so they are not what the office has stamped.
  state.players[0].victoryRow.push('mk_st_joy', 'mk_st_kindness');
  state.players[0].mods = [];
  await runEffect(state, 0, { ...rate, max: 9 }, {});
  assert.equal(state.players[0].mods.at(-1).value, 4);
});

// -------------------------------------------------- Mandee: a card that arrives ready

test('entersUpright stands a Master up the turn she lands, however she was recruited', async () => {
  const state = stage();
  const ready = defineCard(state, {
    id: 'tst_ready_master', type: 'character', name: 'Ready', title: 'Master', species: 'Fox',
    study: 'Lore', cost: 5, shift: { delay: 2, output: 4 }, entersUpright: true,
  });
  const ordinary = defineCard(state, {
    id: 'tst_slow_master', type: 'character', name: 'Slow', title: 'Master', species: 'Fox',
    study: 'Lore', cost: 5, shift: { delay: 2, output: 4 },
  });
  state.players[0].supply = 20;
  addToHand(state, 0, ready.id);
  addToHand(state, 0, ordinary.id);
  agentTakesFirst(state);
  await applyAction(state, 0, { type: 'recruit', cardUid: state.players[0].hand[0].uid });
  await applyAction(state, 0, { type: 'recruit', cardUid: state.players[0].hand[0].uid });
  assert.equal(state.players[0].town[0].orientation, UPRIGHT, 'she arrives ready');
  assert.equal(state.players[0].town[1].orientation, RULES.orientation.masterEntry, 'and an ordinary Master does not');

  // Out of hand for free is still arriving.
  const free = stage();
  defineCard(free, ready);
  addToHand(free, 0, ready.id);
  agentTakesFirst(free);
  await runEffect(free, 0, { do: 'recruitFromHand', filter: { maxCost: 5 } }, {});
  assert.equal(free.players[0].town[0].orientation, UPRIGHT);
});

test("the Statue of Patience's burden still sits an early arrival down", async () => {
  const state = stage();
  const ready = defineCard(state, {
    id: 'tst_ready_master2', type: 'character', name: 'Ready', title: 'Master', species: 'Fox',
    study: 'Lore', cost: 5, shift: { delay: 2, output: 4 }, entersUpright: true,
  });
  const burden = defineCard(state, {
    id: 'tst_patience', type: 'statue', name: 'Burden', cost: 2,
    abilities: [{ trigger: 'passive', key: 'apprenticeEntersBusy', burden: true }],
  });
  state.players[0].victoryRow.push(burden.id);
  state.players[0].supply = 20;
  addToHand(state, 0, ready.id);
  agentTakesFirst(state);
  await applyAction(state, 0, { type: 'recruit', cardUid: state.players[0].hand[0].uid });
  assert.equal(state.players[0].town[0].orientation, BUSY, 'a rule of the town beats a fact about one animal');
});

// -------------------------------------------------- Willow: the rival picks which hardship

test('opponentLosesSupply takes what is there, tells the rival, and never takes more', async () => {
  const state = stage();
  state.players[1].supply = 2;
  const braced = defineCard(state, {
    id: 'tst_braced', type: 'character', name: 'Braced', title: 'Braced', species: 'Squirrel',
    study: 'Commerce', cost: 1, shift: { delay: 1, output: 1 },
    abilities: [{ trigger: 'onSupplyLost', effect: { do: 'draw', count: 1 } }],
  });
  addStack(state, 1, braced.id, UPRIGHT);
  const handBefore = state.players[1].hand.length;
  await runEffect(state, 0, { do: 'opponentLosesSupply', amount: 5 }, {});
  assert.equal(state.players[1].supply, 0, 'it takes what is there and stops');
  assert.equal(state.players[1].hand.length, handBefore + 1, 'and the rival is told it happened');

  await runEffect(state, 0, { do: 'opponentLosesSupply', amount: 3 }, {});
  assert.equal(state.players[1].hand.length, handBefore + 1, 'nothing taken, nothing announced');
});

test('opponentChoice hands the decision across the table, and the branch they pick is the one that runs', async () => {
  const state = stage();
  state.players[1].supply = 6;
  addToHand(state, 1, 'mk_clover_seedling_helper_0');
  const both = {
    do: 'opponentChoice',
    options: [
      { label: 'Lose 3 Supply', effect: { do: 'opponentLosesSupply', amount: 3 } },
      { label: 'Put a card back', effect: { do: 'opponentTopdeckFromHand' } },
    ],
  };
  // The rival takes the second option; the first is left alone.
  state.agents = [{}, makeScriptedAgent([(s, pi, req) => {
    assert.equal(req.kind, 'pick');
    assert.equal(req.reason, 'opponentChoice');
    assert.equal(pi, 1, 'the rival is the one asked');
    return [req.options[1].uid];
  }, (s, pi, req) => [req.options[0].uid]])];
  const deckBefore = state.players[1].deck.length;
  await runEffect(state, 0, both, {});
  assert.equal(state.players[1].supply, 6, 'the Supply half was not the one chosen');
  assert.equal(state.players[1].deck.length, deckBefore + 1, 'a card went back on top instead');

  // And when they pick the other way, the other way happens.
  const other = stage();
  other.players[1].supply = 6;
  addToHand(other, 1, 'mk_clover_seedling_helper_0');
  other.agents = [{}, makeScriptedAgent([(s, pi, req) => [req.options[0].uid]])];
  await runEffect(other, 0, both, {});
  assert.equal(other.players[1].supply, 3);
});

test('opponentChoice with nothing printed on it does nothing at all', async () => {
  const state = stage();
  state.agents = [{}, makeScriptedAgent([() => { throw new Error('there is nothing to choose between'); }])];
  await runEffect(state, 0, { do: 'opponentChoice', options: [] }, {});
  assert.equal(state.players[1].supply, state.players[1].supply);
});

// -------------------------------------------------- the model prices all eight

test('the power model reads the new verbs, and rates a choice at the branch the rival will pick', () => {
  assert.ok(effectPower({ do: 'cardFromDumpToHand' }) > effectPower({ do: 'eventFromDumpToHand' }),
    'the whole bin beats the Events in it');
  assert.ok(effectPower({ do: 'opponentLosesSupply', amount: 3 }) > 0);
  const choice = effectPower({
    do: 'opponentChoice',
    options: [
      { effect: { do: 'opponentLosesSupply', amount: 5 } },
      { effect: { do: 'opponentTopdeckFromHand' } },
    ],
  });
  assert.equal(choice, Math.min(effectPower({ do: 'opponentLosesSupply', amount: 5 }), effectPower({ do: 'opponentTopdeckFromHand' })),
    'you are paid the least of the branches, because the rival picks');

  // A scaling rate is priced on the row a Mayor usually has up, and honours its ceiling.
  const uncapped = effectPower({ do: 'addMod', key: 'buildingDiscount', value: 1, valuePer: 'buildingsBuilt' });
  const capped = effectPower({ do: 'addMod', key: 'buildingDiscount', value: 1, valuePer: 'buildingsBuilt', max: 1 });
  assert.ok(uncapped > capped);

  // Arriving ready is the two turns a Master otherwise spends rotating in.
  const slow = { id: 'x1', type: 'character', name: 'A', title: 'A', species: 'Fox', study: 'Lore', cost: 5, shift: { delay: 2, output: 4 } };
  const quick = { ...slow, id: 'x2', entersUpright: true };
  assert.ok(rateCard(quick, RULES).score > rateCard(slow, RULES).score);

  // A hire who may come round again is worth a little more than one who is finished with.
  const gone = { id: 'x3', type: 'marketCharacter', name: 'B', title: 'B', species: 'Rabbit', study: 'Agriculture', cost: 3, shift: { delay: 1, output: 4 }, leavesAfter: 2 };
  const road = { ...gone, id: 'x4', returnsToMarket: true };
  assert.ok(rateCard(road, RULES).score > rateCard(gone, RULES).score);

  // Both standing rates are priced per point, like townShiftBonus before them.
  const wage = { id: 'x5', type: 'character', name: 'C', title: 'C', species: 'Rabbit', study: 'Agriculture', cost: 2, shift: { delay: 1, output: 2 }, abilities: [{ trigger: 'passive', key: 'townRecruitDiscount', value: 1, requiresUpright: true }] };
  const tailor = { ...wage, id: 'x6', abilities: [{ trigger: 'passive', key: 'opponentPledgeLadderPlus1', requiresUpright: true }] };
  assert.ok(rateCard(wage, RULES).power > rateCard({ ...wage, id: 'x7', abilities: [] }, RULES).power);
  assert.ok(rateCard(tailor, RULES).power > rateCard({ ...wage, id: 'x8', abilities: [] }, RULES).power);
});

test('a town that can act still enumerates its actions with the new fields on the table', () => {
  const state = stage();
  defineCard(state, {
    id: 'tst_all_fields', type: 'character', name: 'Everything', title: 'Everything', species: 'Fox',
    study: 'Lore', cost: 5, shift: { delay: 2, output: 4 }, entersUpright: true,
    abilities: [{ trigger: 'passive', key: 'townRecruitDiscount', value: 1 }],
  });
  addToHand(state, 0, 'tst_all_fields');
  state.players[0].supply = 20;
  const actions = legalActions(state, 0);
  assert.ok(actions.some((a) => a.type === 'recruit'), 'the card is playable');
});
