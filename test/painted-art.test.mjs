import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { explicitTile, paintedArtSVG, paintedTile } from '../src/ui/painted-art.js';
import { cardArtSVG } from '../src/ui/art.js';

const set = JSON.parse(fs.readFileSync(new URL('../spec/starter_card_set.json', import.meta.url)));

test('both additional sheets are bundled square PNGs with every tile assigned once', () => {
  for (const atlas of ['boroughs-characters', 'boroughs-scenes']) {
    const cards = set.cards.filter(c => c.art?.atlas === atlas);
    assert.deepEqual(cards.map(c => c.art.tile).sort((a, b) => a - b), Array.from({length: 16}, (_, i) => i));
    const png = fs.readFileSync(new URL(`../assets/art/${atlas}-atlas.png`, import.meta.url));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), png.readUInt32BE(20));
    for (const c of cards) {
      assert.equal(explicitTile(c), c.art.tile);
      const svg = cardArtSVG(c);
      assert.ok(svg.includes(`${atlas}-atlas.png`));
      assert.ok(svg.includes(`x="${-(c.art.tile % 4) * 100}" y="${-Math.floor(c.art.tile / 4) * 100}"`));
      assert.ok(paintedArtSVG(c, '<svg id="fallback"/>').includes('id="fallback"'));
    }
  }
});

test('original sheets remain in use and invalid assignments retain the species fallback', () => {
  for (const atlas of ['boroughs', 'whiskerwood']) {
    assert.ok(set.cards.some(c => c.art?.atlas === atlas));
  }
  assert.match(cardArtSVG(set.cards.find(c => c.id === 'st_kindness')), /boroughs-atlas\.png/);
  for (const art of [{atlas: 'toString', tile: 0}, {atlas: 'boroughs-scenes', tile: 16}, {atlas: 'boroughs-characters', tile: -1}]) {
    const def = {type: 'character', species: 'Fox', art};
    assert.equal(explicitTile(def), null);
    assert.equal(paintedTile(def), 2);
    assert.match(paintedArtSVG(def, '<svg/>'), /boroughs-atlas\.png/);
  }
});
