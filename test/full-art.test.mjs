import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { FULL_ART_CARDS, fullArtFor } from '../src/ui/full-art.js';
import { paintedArtSVG } from '../src/ui/painted-art.js';
import { SET } from './helpers.mjs';

test('full art selects exactly twelve existing cards with twelve unique portrait paintings', () => {
  const entries = Object.entries(FULL_ART_CARDS);
  assert.equal(entries.length, 12);
  const hashes = new Set();
  const types = new Set();
  for (const [index, [id, art]] of entries.entries()) {
    const card = SET.cards.find(c => c.id === id);
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
  }
  assert.equal(hashes.size, 12);
  assert.equal(types.size, 5);
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
  assert.equal(fullArtFor(null), null);
  assert.equal(fullArtFor({ id: 'toString' }), null);
  assert.equal(fullArtFor({ id: 'bb_clover_1' }), null);
});
