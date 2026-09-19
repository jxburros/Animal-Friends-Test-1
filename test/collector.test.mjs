// Collector numbers: every card carries a unique A1 number, the numbers run in collector order
// (rarity, then card type, then species), and every printing of a card is named by that number plus
// its own letter — 22 regular, 22f foil, 22a alternate art, 22s alternate art foil, 22c creative
// foil, 22x full art. The numbers in spec/maker_card_set.json are stamped by scripts/number.mjs and
// these tests are what keep a hand-edit or a forgotten restamp from going unnoticed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SET_NUMBER, CARD_TYPE_ORDER, VERSION_LETTERS, orderedCards, numbering,
  collectorNumber, collectorCode, collectorRank, versionLetter, groupKeyOf,
} from '../src/engine/collector.js';
import { RARITIES } from '../src/engine/power.js';
import { VERSIONS, VERSION_KEYS } from '../src/ui/versions.js';
import { SET } from './helpers.mjs';

const cards = SET.cards;

test('collector numbers', async (t) => {
  await t.test('every card is stamped A1 with a unique number', () => {
    const seen = new Set();
    for (const card of cards) {
      assert.equal(card.setNumber, SET_NUMBER, `${card.id}: set number is ${card.setNumber}`);
      assert.ok(Number.isInteger(card.number) && card.number >= 1, `${card.id}: no collector number`);
      assert.ok(!seen.has(card.number), `${card.id}: number ${card.number} is used twice`);
      seen.add(card.number);
    }
    assert.equal(seen.size, cards.length);
  });

  await t.test('the numbers run 1..N with no gaps', () => {
    const numbers = cards.map((c) => c.number).sort((a, b) => a - b);
    assert.deepEqual(numbers, cards.map((_, i) => i + 1));
  });

  await t.test('the stamped numbers are the ones the model hands out', () => {
    const expected = numbering(cards, SET.species);
    for (const card of cards) {
      assert.equal(card.number, expected.get(card.id), `${card.id}: stale number — run npm run number`);
    }
  });

  await t.test('numbering is deterministic', () => {
    const once = numbering(cards, SET.species);
    const again = numbering(cards.slice().reverse(), SET.species);
    for (const card of cards) assert.equal(once.get(card.id), again.get(card.id), `${card.id}`);
  });

  await t.test('the order is rarity, then card type, then species', () => {
    const keyOf = (card) => [
      RARITIES.indexOf(card.rarity || 'Common'),
      CARD_TYPE_ORDER.indexOf(card.type),
      card.species ? SET.species.indexOf(card.species) : -1,
    ];
    const ordered = orderedCards(cards, SET.species);
    for (let i = 1; i < ordered.length; i++) {
      const before = keyOf(ordered[i - 1]);
      const now = keyOf(ordered[i]);
      const rank = before[0] !== now[0] ? 0 : before[1] !== now[1] ? 1 : 2;
      assert.ok(before[rank] <= now[rank],
        `${ordered[i - 1].id} (${before}) sorts after ${ordered[i].id} (${now})`);
    }
  });

  await t.test('a group holds the cards of one rarity, type and species, and holds them together', () => {
    const ordered = orderedCards(cards, SET.species);
    const runs = new Map();
    let previous = null;
    for (const card of ordered) {
      const key = groupKeyOf(card);
      if (key !== previous) {
        assert.ok(!runs.has(key), `group ${key} is split across the set`);
        runs.set(key, 0);
        previous = key;
      }
      runs.set(key, runs.get(key) + 1);
    }
    for (const card of cards) assert.ok(runs.has(groupKeyOf(card)), `${card.id}: no group`);
  });

  await t.test('cards inside a group are shuffled, not left in file order', () => {
    // The largest group is big enough that an unshuffled numbering would be a vanishing coincidence.
    const groups = new Map();
    for (const card of cards) {
      const key = groupKeyOf(card);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(card);
    }
    const biggest = [...groups.values()].sort((a, b) => b.length - a.length)[0];
    assert.ok(biggest.length > 10, 'expected at least one sizeable group');
    const fileOrder = biggest.map((c) => c.number);
    const sorted = fileOrder.slice().sort((a, b) => a - b);
    assert.notDeepEqual(fileOrder, sorted, 'the biggest group was numbered in file order');
  });
});

test('printing letters', async (t) => {
  await t.test('every printing has the letter the collection uses', () => {
    assert.deepEqual(VERSION_LETTERS, {
      regular: '', foil: 'f', alternateArt: 'a', alternateArtFoil: 's', creativeFoil: 'c', fullCardArt: 'x',
    });
    assert.deepEqual([...VERSION_KEYS].sort(), Object.keys(VERSION_LETTERS).sort());
    for (const v of VERSIONS) assert.equal(v.letter, VERSION_LETTERS[v.key], `${v.key}`);
  });

  await t.test('the letters are unique, so no two printings share a number', () => {
    const letters = Object.values(VERSION_LETTERS);
    assert.equal(new Set(letters).size, letters.length);
  });

  await t.test('a printing is the card number plus its letter', () => {
    const card = cards.find((c) => c.number === 22);
    assert.ok(card, 'no card 22');
    assert.equal(collectorNumber(card, 'regular'), '22');
    assert.equal(collectorNumber(card, 'foil'), '22f');
    assert.equal(collectorNumber(card, 'alternateArt'), '22a');
    assert.equal(collectorNumber(card, 'alternateArtFoil'), '22s');
    assert.equal(collectorNumber(card, 'creativeFoil'), '22c');
    assert.equal(collectorNumber(card, 'fullCardArt'), '22x');
    assert.equal(collectorCode(card, 'foil'), 'A1 22f');
    assert.equal(collectorNumber(card), '22', 'the regular printing is the default');
  });

  await t.test('an unstamped card has no number and sorts to the back', () => {
    assert.equal(collectorNumber({ id: 'x' }, 'foil'), null);
    assert.equal(collectorCode({ id: 'x' }), null);
    assert.equal(collectorNumber(null), null);
    assert.ok(collectorRank({ id: 'x' }) > collectorRank(cards[0]));
    assert.equal(versionLetter('nosuchprinting'), '');
  });
});
