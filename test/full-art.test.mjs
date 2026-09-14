import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { FULL_ART_CARDS, fullArtFor, fullArtIds } from '../src/ui/full-art.js';
import { paintedArtSVG } from '../src/ui/painted-art.js';
import { SET } from './helpers.mjs';

const MAKER = JSON.parse(readFileSync(new URL('../spec/maker_card_set.json', import.meta.url), 'utf8'));
// The collection draws from both shelves: printed cards from SET, and Maker shelf cards that have
// since been given their own commissioned portrait — same lookup the game itself builds (see
// src/ui/deckbuilder.js) so a card's id resolves to its definition regardless of which set it lives in.
const cardsById = {
  ...Object.fromEntries(MAKER.cards.map((c) => [c.id, c])),
  ...Object.fromEntries(SET.cards.map((c) => [c.id, c])),
};

test('full art selects existing cards with unique portrait paintings, numbered in order', () => {
  const entries = Object.entries(FULL_ART_CARDS);
  assert.ok(entries.length > 0);
  const hashes = new Set();
  const types = new Set();
  for (const [index, [id, art]] of entries.entries()) {
    const card = cardsById[id];
    assert.ok(card, id);
    types.add(card.type);
    assert.equal(art.number, String(index + 1).padStart(2, '0'));
    const png = readFileSync(new URL(art.url));
    assert.equal(png.subarray(1, 4).toString(), 'PNG', id);
    assert.ok(png.readUInt32BE(20) > png.readUInt32BE(16), id + ' is portrait');
    hashes.add(createHash('sha256').update(png).digest('hex'));
    const markup = paintedArtSVG(card, '<svg data-fallback="original"/>');
    assert.ok(markup.includes(art.url), id + ' resolves its own full art');
    assert.ok(markup.includes('data-fallback="original"'), id + ' retains the vector fallback');
    assert.equal(fullArtFor(card), art);
  }
  assert.equal(hashes.size, entries.length, 'every portrait is a distinct image');
  assert.ok(types.size > 1, 'the collection spans more than one card type');
});

test('other versions and unselected cards keep their original art treatment', () => {
  for (const card of SET.cards) {
    const before = JSON.stringify(card);
    const art = paintedArtSVG(card, '<svg/>');
    if (!Object.hasOwn(FULL_ART_CARDS, card.id)) {
      assert.equal(fullArtFor(card), null);
      assert.ok(!art.includes('full-art-painting'), card.id);
    }
    assert.equal(JSON.stringify(card), before, 'rendering never changes the definition');
  }
  const inherited = new Set(Object.values(FULL_ART_CARDS).map((a) => a.remadeAs).filter(Boolean));
  for (const card of MAKER.cards) {
    if (!Object.hasOwn(FULL_ART_CARDS, card.id) && !inherited.has(card.id)) {
      assert.equal(fullArtFor(card), null);
      assert.ok(!paintedArtSVG(card, '<svg/>').includes('full-art-painting'), card.id);
    }
  }
  assert.equal(fullArtFor(null), null);
  assert.equal(fullArtFor({ id: 'toString' }), null);
  assert.equal(fullArtFor({ id: 'bb_clover_1' }), null);
});

test('a painting carries over to the Maker card that remade its printed card', () => {
  const printedById = Object.fromEntries(SET.cards.map((c) => [c.id, c]));
  const makerById = Object.fromEntries(MAKER.cards.map((c) => [c.id, c]));
  let carried = 0;
  for (const [id, art] of Object.entries(FULL_ART_CARDS)) {
    if (!art.remadeAs) continue;
    carried++;
    const printed = printedById[id];
    const remake = makerById[art.remadeAs];
    assert.ok(remake, `${art.remadeAs} is not a Maker card`);
    // The link is the remake's own `remakes`, not a second list kept in the UI: a painting follows
    // the card it was commissioned for, so the registry may only point at the card that claims it.
    assert.ok([].concat(remake.remakes || []).includes(id), `${remake.id} does not remake ${id}`);
    // And the scene still has to fit. The animal in the painting is not negotiable — a painting of a
    // ginger cat cannot be inherited by an otter. A remake may carry a different name, which is what
    // `renamedFrom` is for and what Bramble's Guild Warden becoming Berry's looks like. A different
    // job title or a different study has to be accounted for in `remadeNote`, so that nothing
    // inherits a painting of somebody else's work by accident.
    if (printed.type === 'character') {
      assert.equal(remake.species, printed.species, `${remake.id} is not the animal in the painting`);
      const sameWork = remake.title === printed.title && remake.study === printed.study;
      assert.ok(sameWork || art.remadeNote,
        `${remake.id} changed the work and says nothing about why the painting still fits`);
    }
    // One painting, one collection number, on whichever shelf the reader is standing at.
    assert.equal(fullArtFor(remake), art);
    assert.equal(fullArtFor(printed), art);
    assert.deepEqual(fullArtIds(id), [id, art.remadeAs]);
    assert.ok(paintedArtSVG(remake, '<svg data-fallback="original"/>').includes(art.url), remake.id);
  }
  assert.ok(carried >= 10, 'the paintings whose remakes still fit them are carried over');
  // A remake that is a different animal or a different job inherits nothing.
  assert.equal(fullArtFor({ id: 'mk_peanut_ledger_0' }), null);
});
