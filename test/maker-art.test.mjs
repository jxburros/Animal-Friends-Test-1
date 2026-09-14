// Commissioned portraits for the Maker shelf (`spec/maker_card_set.json`). Separate from the
// curated twelve in full-art.test.mjs: these cards aren't part of that fixed collection or its
// "12" gallery/footer count, they just get the same full-art treatment once an illustration exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { MAKER_ART_CARDS, FULL_ART_CARDS, fullArtFor } from '../src/ui/full-art.js';
import { paintedArtSVG } from '../src/ui/painted-art.js';

const MAKER = JSON.parse(fs.readFileSync(new URL('../spec/maker_card_set.json', import.meta.url), 'utf8'));
const makerById = Object.fromEntries(MAKER.cards.map((c) => [c.id, c]));

test('maker art selects existing maker cards with unique portrait paintings', () => {
  const entries = Object.entries(MAKER_ART_CARDS);
  assert.ok(entries.length > 0);
  const hashes = new Set();
  for (const [id, art] of entries) {
    assert.ok(!Object.hasOwn(FULL_ART_CARDS, id), `${id} should not also be in the curated twelve`);
    const card = makerById[id];
    assert.ok(card, `${id} must exist in the maker set`);
    assert.equal(art.number, undefined, `${id} is not part of the "12" collection and needs no number`);
    const png = fs.readFileSync(new URL(art.url));
    assert.equal(png.subarray(1, 4).toString(), 'PNG', id);
    assert.ok(png.readUInt32BE(20) > png.readUInt32BE(16), id + ' is portrait');
    hashes.add(createHash('sha256').update(png).digest('hex'));
    const markup = paintedArtSVG(card, '<svg data-fallback="original"/>');
    assert.ok(markup.includes(art.url), id + ' resolves its own full art');
    assert.ok(markup.includes('data-fallback="original"'), id + ' retains the vector fallback');
    assert.equal(fullArtFor(card), art, id + ' resolves through the shared lookup');
  }
  assert.equal(hashes.size, entries.length, 'every maker portrait is a distinct image');
});

test('maker cards without commissioned art keep their original art treatment', () => {
  for (const card of MAKER.cards) {
    if (Object.hasOwn(MAKER_ART_CARDS, card.id)) continue;
    assert.equal(fullArtFor(card), null);
    const art = paintedArtSVG(card, '<svg/>');
    assert.ok(!art.includes('full-art-painting'), card.id);
  }
});
