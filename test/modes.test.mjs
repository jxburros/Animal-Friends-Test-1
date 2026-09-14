// The three doors: Classic, Maker and the Book.
//
// Classic and Maker are two whole collections, played with the same rules and never mixed. The
// promises tested here are the ones a player would notice if they broke: Classic has no Maker card
// anywhere in it, Maker is complete enough to actually be played through to a Statue victory, and
// what the Maker shelf borrows from the printed book is exactly what it says it borrows.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createGame, playGame, indexSet, composeMakerSet, borrowedIds, isPlayableSet,
  buildMarketDeck, resolveMarketDeck, deckProblems, MODES, MODE_IDS,
} from '../src/engine/index.js';
import { makeRandomAgent } from '../src/ai/random.js';
import { RULES, SET } from './helpers.mjs';

const MAKER = JSON.parse(fs.readFileSync(new URL('../spec/maker_card_set.json', import.meta.url), 'utf8'));
const printed = indexSet(SET);
const maker = indexSet(composeMakerSet(MAKER, printed));

test('both modes name a complete, playable collection', () => {
  assert.deepEqual(MODE_IDS, ['classic', 'maker']);
  for (const id of MODE_IDS) assert.ok(MODES[id].name && MODES[id].blurb, id);
  assert.ok(isPlayableSet(printed), 'Classic is playable');
  assert.ok(isPlayableSet(maker), 'Maker is playable');
});

test('Classic holds no maker card, and the Maker collection no printed card it did not borrow', () => {
  const makerIds = new Set(MAKER.cards.map((c) => c.id));
  for (const card of SET.cards) assert.ok(!makerIds.has(card.id), `${card.id} is on both shelves`);

  const borrowed = new Set(borrowedIds(MAKER));
  for (const card of maker.cards) {
    if (makerIds.has(card.id)) continue;
    assert.ok(borrowed.has(card.id), `${card.id} is in the Maker collection but not borrowed on purpose`);
    assert.equal(card.borrowed, true, `${card.id} must be marked as borrowed`);
  }
  // The shelf borrows nothing now: its nine Statues are its own, which is what finished it. A game
  // with no Statues cannot be won, so the count is still checked — against the Maker cards this time.
  assert.deepEqual(borrowedIds(MAKER), [], 'the Maker shelf stands on its own cards');
  const statues = maker.cards.filter((c) => c.type === 'statue');
  assert.equal(statues.length, RULES.victory.statueTotal);
  for (const c of statues) {
    assert.ok(makerIds.has(c.id), `${c.id} is a Statue the Maker shelf does not own`);
    assert.ok(!c.borrowed, `${c.id} is still marked borrowed`);
  }
});

test('every Maker deck is legal, and built out of maker cards alone', () => {
  assert.ok(MAKER.decks.length >= 2, 'two decks to start with');
  const makerIds = new Set(MAKER.cards.map((c) => c.id));
  for (const deck of MAKER.decks) {
    assert.deepEqual(deckProblems(RULES, maker, deck.list), [], deck.id);
    for (const id of Object.keys(deck.list)) assert.ok(makerIds.has(id), `${deck.id}: ${id}`);
  }
});

test("the Maker Capital City deals the printed number of cards, Statues and weather included", () => {
  assert.equal(MAKER.marketDecks.length, 1, 'one Capital City for now');
  const spec = resolveMarketDeck(maker, 'mk-first-workings');
  const ids = new Set(maker.cards.map((c) => c.id));
  for (const id of [...spec.always, ...spec.pool]) assert.ok(ids.has(id), `unknown card ${id}`);
  for (const seed of [7, 99, 1234, 5150]) {
    const state = createGame(RULES, maker, { seed, decks: MAKER.decks.map((d) => d.id) });
    const total = state.market.deck.length + state.market.city.length + state.market.cityDump.length;
    assert.equal(total, RULES.setup.marketDeckSize, `seed ${seed}: Market Deck size`);
    const built = buildMarketDeck({ rng: state.rng, set: maker }, spec);
    const reveals = built.filter((id) => maker.cardsById[id].type === 'disruption').length;
    assert.ok(reveals >= spec.minDisruptions, `seed ${seed}: ${reveals} on-reveal cards`);
  }
});

test('a Maker game plays through to a winner', async () => {
  for (const seed of [3, 11]) {
    const state = createGame(RULES, maker, { seed, decks: ['mk-ledger-larder', 'mk-bench-bandstand'] });
    await playGame(state, [makeRandomAgent(seed), makeRandomAgent(seed + 1)]);
    assert.notEqual(state.winner, null, `seed ${seed} ended with no winner`);
    assert.equal(state.result, 'statues', `seed ${seed} did not end on Statues`);
  }
});

test('a broken borrow list empties a shelf rather than stopping the game', () => {
  const composed = composeMakerSet({ ...MAKER, borrowsFromPrinted: ['no_such_card'] }, printed);
  assert.equal(composed.cards.length, MAKER.cards.length);
  assert.deepEqual(borrowedIds({}), []);
  assert.deepEqual(borrowedIds({ borrowsFromPrinted: ['a', 'b'] }), ['a', 'b']);
});
