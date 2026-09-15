// The market side of the shelf: the nine Statues, the Capital City built out of the collection's
// own cards, and the cards that spend a token.
//
// The token cards are the point of the block in spec/maker_card_set.json → `tokens`: the counter was
// built before any card used it so that the first three would not each invent their own. These tests
// pin the bargain each of them strikes, and the rule that makes a spender safe to print — a price a
// town cannot meet is not paid at all, and the rest of the card still happens.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES, SET, addStack, addToHand, UPRIGHT } from './helpers.mjs';
import { createGame, gainMarketCard } from '../src/engine/index.js';
import { addTokens, tokenCount } from '../src/engine/state.js';

const MAKER = SET;

function makerGame(seed = 5) {
  const state = createGame(RULES, MAKER, { seed, decks: MAKER.decks.map((d) => d.id).slice(0, 2) });
  state.phase = 'actions';
  state.active = 0;
  state.agents = [{ choose: async (_s, _pi, req) => (req.kind === 'pick' ? req.options.slice(0, Math.max(1, req.min)).map((o) => o.uid) : true) }, {}];
  return state;
}

test('the shelf quarries more virtues than a game raises, and deals its Capital City from its own cards', () => {
  const statues = MAKER.cards.filter((c) => c.type === 'statue');
  // Nine Statues stand in any one game; each market's quarry holds more, so which nine is the
  // shuffle's call — and the two markets quarry different virtues, which is half of what makes them
  // different places to play. Between them they raise every virtue the collection carves.
  for (const spec of MAKER.marketDecks) {
    assert.equal(spec.statueCount, RULES.victory.statueTotal, `${spec.id} raises nine`);
    assert.ok(spec.statuePool.length > RULES.victory.statueTotal, `${spec.id}'s quarry is deeper than one game needs`);
  }
  assert.ok(statues.length > RULES.victory.statueTotal, 'the collection carves more than one game raises');
  const virtues = statues.map((c) => c.virtue);
  assert.equal(new Set(virtues).size, virtues.length, 'a virtue is carved once');
  for (const v of ['Community', 'Courage', 'Curiosity', 'Generosity', 'Harmony', 'Ingenuity', 'Joy', 'Kindness', 'Patience']) {
    assert.ok(virtues.includes(v), `${v} is no longer carved`);
  }
  // Every Statue carries a boon and a burden, which is the deal the rules make for all of them.
  for (const c of statues) {
    assert.ok(c.burden, `${c.id} has no burden`);
    assert.ok((c.abilities || []).some((a) => a.burden), `${c.id}'s burden is not on an ability`);
    assert.ok(c.onGain || (c.abilities || []).some((a) => !a.burden), `${c.id} has no boon`);
  }
  const own = new Set(MAKER.cards.map((c) => c.id));
  const quarried = new Set();
  for (const spec of MAKER.marketDecks) {
    for (const id of [...(spec.always || []), ...spec.statuePool, ...spec.pool]) assert.ok(own.has(id), `${id} is not a card in this set`);
    for (const id of spec.statuePool) quarried.add(id);
  }
  assert.deepEqual([...quarried].sort(), statues.map((c) => c.id).sort(), 'every Statue is quarried by some market');
  const [a, b] = MAKER.marketDecks.map((spec) => new Set(spec.statuePool));
  assert.ok([...a].some((id) => !b.has(id)) && [...b].some((id) => !a.has(id)), 'the two markets quarry different virtues');
});

test('the two Capital Cities are two different places', () => {
  const [fair, winter] = MAKER.marketDecks;
  assert.equal(MAKER.marketDecks.length, 2, 'two markets to choose between');
  const shared = fair.pool.filter((id) => winter.pool.includes(id));
  assert.deepEqual(shared, [], 'a market card belongs to one market or the other, never both');
  const isShock = (id) => MAKER.cards.find((c) => c.id === id)?.type === 'disruption';
  const weather = (spec) => spec.pool.filter(isShock).length;
  // The Fair is a good year and the Winter is a bad one: the weather is most of the difference.
  assert.ok(winter.minDisruptions > fair.minDisruptions, 'the Winter deals more shared weather than the Fair');
  for (const spec of MAKER.marketDecks) {
    assert.ok(weather(spec) >= spec.minDisruptions, `${spec.id} cannot meet its own weather floor`);
    assert.ok(spec.pool.length >= spec.poolSize, `${spec.id} cannot fill its own market`);
  }
});

test('a game raises exactly nine Statues, and a different nine from game to game', () => {
  const nine = (seed) => {
    const state = makerGame(seed);
    const everywhere = [...state.market.deck, ...state.market.city, ...state.market.cityDump];
    return everywhere.filter((id) => MAKER.cards.find((c) => c.id === id)?.type === 'statue');
  };
  const a = nine(5);
  assert.equal(a.length, RULES.victory.statueTotal, 'nine monuments, whatever the quarry holds');
  assert.equal(new Set(a).size, a.length, 'and no virtue twice');
  const varies = [11, 23, 41, 77].some((seed) => {
    const b = nine(seed);
    return b.some((id) => !a.includes(id));
  });
  assert.ok(varies, 'the line-up changes with the shuffle');
});

test('Warren Muster takes a Rabbit chit, and spends three for a free upright recruit', async () => {
  const state = makerGame();
  const p = state.players[0];
  addToHand(state, 0, 'mk_clover_plot_sharer_1');
  const before = p.town.length;

  // One chit in the tin and one from the card is two, and two is not three: the price is not
  // part-paid, so nothing is spent and nobody is recruited.
  addTokens(p, 'species:Rabbit', 1);
  await gainMarketCard(state, 0, 'mk_mkt_warren_muster', 'test');
  assert.equal(tokenCount(p, 'species:Rabbit'), 2, 'the muster hands out its own chit and spends none');
  assert.equal(p.town.length, before, 'nobody came');

  // Now the card's own chit makes three, so the second muster pays.
  await gainMarketCard(state, 0, 'mk_mkt_warren_muster', 'test');
  assert.equal(tokenCount(p, 'species:Rabbit'), 0, 'three taken in over two cards, three spent');
  assert.equal(p.town.length, before + 1, 'a rabbit turns up');
  assert.equal(p.town.at(-1).orientation, UPRIGHT, 'and turns up ready to work');
});

test("the Ovens' Account pays whether or not the Food chits are there", async () => {
  const short = makerGame();
  short.players[0].supply = 0;
  await gainMarketCard(short, 0, 'mk_mkt_ovens_account', 'test');
  assert.equal(short.players[0].supply, 2, 'the Supply half happens with an empty tin');

  const paid = makerGame();
  paid.players[0].supply = 0;
  addTokens(paid.players[0], 'study:Food', 2);
  addStack(paid, 0, 'mk_marmalade_night_baker_0', 270); // a Food Character to stand back up
  await gainMarketCard(paid, 0, 'mk_mkt_ovens_account', 'test');
  assert.equal(tokenCount(paid.players[0], 'study:Food'), 0);
  assert.equal(paid.players[0].supply, 4);
  assert.equal(paid.players[0].town[0].orientation, UPRIGHT);
});

test("the Surveyor's Table turns two Building chits into a cheap Building", async () => {
  const state = makerGame();
  addTokens(state.players[0], 'building', 2);
  await gainMarketCard(state, 0, 'mk_mkt_surveyors_table', 'test');
  assert.equal(tokenCount(state.players[0], 'building'), 0);
  const mod = state.players[0].mods.find((m) => m.key === 'buildingDiscount');
  assert.ok(mod && mod.value === 3, 'the rate is on the Buildings and nothing else');
});

test('the shelf hands out the chits its spenders ask for', () => {
  const gives = (key) => MAKER.cards.filter((c) => JSON.stringify(c).includes(`"do":"gainToken"`) && JSON.stringify(c).includes(key));
  assert.ok(gives('"of":"building"').length >= 3, 'Building chits come from somewhere');
  assert.ok(gives('"study":"Food"').length >= 1, 'Food chits come from somewhere');
  assert.ok(gives('"species":"Rabbit"').length >= 1, 'Rabbit chits come from somewhere');
});
