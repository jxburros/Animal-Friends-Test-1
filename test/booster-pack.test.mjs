// Booster pack opening: pack composition, the printing odds, and the guaranteed hit slot.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  openPack, rollPrinting, rollGuaranteedPrinting, PACK_SLOTS, SPECIAL_CHANCE, PRINTING_WEIGHTS,
} from '../src/engine/boosterPack.js';
import { seedRng } from '../src/engine/rng.js';
import { openPack as uiOpenPack, availablePrintings } from '../src/ui/boosterPack.js';
import { SET } from './helpers.mjs';

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary'];

/** A synthetic pool: plenty of cards per rarity, with a controlled slice carrying printings. */
function makePool() {
  const cards = [];
  for (const rarity of RARITIES) {
    for (let i = 0; i < 50; i++) cards.push({ id: `${rarity}-${i}`, rarity });
  }
  return cards;
}

test('pack composition matches the printed slot counts, in order, plus one guaranteed hit', () => {
  const cards = makePool();
  const printingsFor = () => ['foil'];
  const pack = openPack(cards, printingsFor, { seed: 1 });
  assert.equal(pack.length, 12);
  const ordinary = pack.slice(0, 11);
  const hit = pack[11];
  let i = 0;
  for (const slot of PACK_SLOTS) {
    for (let n = 0; n < slot.count; n++, i++) assert.equal(ordinary[i].rarity, slot.rarity);
  }
  assert.notEqual(hit.printing, 'regular');
});

test('opening the same seed twice draws the same pack', () => {
  const cards = makePool();
  const printingsFor = (c) => (c.rarity === 'Common' ? ['foil', 'alternateArt'] : ['foil']);
  const a = openPack(cards, printingsFor, { seed: 7 });
  const b = openPack(cards, printingsFor, { seed: 7 });
  assert.deepEqual(a, b);
  const c = openPack(cards, printingsFor, { seed: 8 });
  assert.notDeepEqual(a, c);
});

test('a card with only one alternate printing is a flat SPECIAL_CHANCE for it', () => {
  const rng = { rng: seedRng(123) };
  const n = 200000;
  let special = 0;
  for (let i = 0; i < n; i++) {
    const printing = rollPrinting(rng, ['foil']);
    if (printing === 'foil') special++;
    else assert.equal(printing, 'regular');
  }
  assert.ok(Math.abs(special / n - SPECIAL_CHANCE) < 0.01, `foil rate was ${special / n}`);
});

test('SPECIAL_CHANCE splits across available printings in proportion to their weights', () => {
  const rng = { rng: seedRng(321) };
  const available = ['foil', 'alternateArt', 'alternateArtFoil'];
  const n = 400000;
  const counts = { regular: 0, foil: 0, alternateArt: 0, alternateArtFoil: 0 };
  for (let i = 0; i < n; i++) counts[rollPrinting(rng, available)]++;

  const totalWeight = available.reduce((sum, k) => sum + PRINTING_WEIGHTS[k], 0);
  const expected = {
    regular: 1 - SPECIAL_CHANCE,
    foil: SPECIAL_CHANCE * (PRINTING_WEIGHTS.foil / totalWeight),
    alternateArt: SPECIAL_CHANCE * (PRINTING_WEIGHTS.alternateArt / totalWeight),
    alternateArtFoil: SPECIAL_CHANCE * (PRINTING_WEIGHTS.alternateArtFoil / totalWeight),
  };
  for (const key of Object.keys(expected)) {
    assert.ok(Math.abs(counts[key] / n - expected[key]) < 0.01, `${key}: ${counts[key] / n} vs ${expected[key]}`);
  }
  // Alternate Art outweighs Foil, which outweighs Alternate Art Foil, per PRINTING_WEIGHTS.
  assert.ok(expected.alternateArt > expected.foil);
  assert.ok(expected.foil > expected.alternateArtFoil);
});

test('a printing not available to a card is never rolled, regular or not', () => {
  const rng = { rng: seedRng(55) };
  for (let i = 0; i < 10000; i++) {
    assert.equal(rollPrinting(rng, []), 'regular');
  }
});

test('the guaranteed slot never lands on Regular, and only rolls printings the card has', () => {
  const rng = { rng: seedRng(99) };
  const available = ['foil', 'fullCardArt'];
  const seen = new Set();
  for (let i = 0; i < 5000; i++) {
    const printing = rollGuaranteedPrinting(rng, available);
    assert.notEqual(printing, 'regular');
    seen.add(printing);
  }
  assert.deepEqual([...seen].sort(), ['foil', 'fullCardArt']);
  assert.throws(() => rollGuaranteedPrinting(rng, []));
});

test('a rarity slot with no cards in the pool fails loudly rather than silently skipping', () => {
  const cards = makePool().filter((c) => c.rarity !== 'Legendary');
  assert.throws(() => openPack(cards, () => ['foil'], { seed: 1 }), /Legendary/);
});

test('a pool with no printed alternates anywhere cannot fill the guarantee', () => {
  const cards = makePool();
  assert.throws(() => openPack(cards, () => [], { seed: 1 }), /guarantee/);
});

test('wired to the real collection: every pack is legal and never promises unpainted art', () => {
  const cards = SET.cards.filter((c) => RARITIES.includes(c.rarity));
  for (const rarity of RARITIES) {
    assert.ok(cards.some((c) => c.rarity === rarity), `no ${rarity} cards in the set`);
  }
  for (let seed = 0; seed < 25; seed++) {
    const pack = uiOpenPack(cards, { seed });
    assert.equal(pack.length, 12);
    for (const { cardId, printing } of pack) {
      const card = SET.cards.find((c) => c.id === cardId);
      assert.ok(card, cardId);
      if (printing !== 'regular') {
        assert.ok(availablePrintings(card).includes(printing), `${cardId} has no ${printing}`);
      }
    }
    assert.notEqual(pack[11].printing, 'regular');
  }
});
