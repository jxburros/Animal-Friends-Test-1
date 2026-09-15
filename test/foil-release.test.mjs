import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SET } from './helpers.mjs';
import { FOIL_ASSIGNMENTS, FOIL_MODES, resolveFoil } from '../src/ui/foil.js';
import { PRINTINGS, hasVersion, version, versionArtUrl, countInVersion } from '../src/ui/versions.js';
import { paintedArtSVG } from '../src/ui/painted-art.js';

const maker = JSON.parse(readFileSync(new URL('../spec/maker_card_set.json', import.meta.url)));
const release = JSON.parse(readFileSync(new URL('../docs/FOIL_SELECTION.json', import.meta.url)));
const cards = [...new Map([...SET.cards, ...maker.cards].map(card => [card.id, card])).values()];

test('the recorded random draw has fifteen distinct ordinary Foils and three of every finish', () => {
  const selected = new Set(release.selection.map(card => card.id));
  assert.equal(selected.size, 15);
  assert.deepEqual(new Set(Object.keys(PRINTINGS)), selected);
  for (const id of selected) assert.ok(Object.hasOwn(FOIL_ASSIGNMENTS, id), id);
  const counts = Object.fromEntries(FOIL_MODES.map(mode => [mode, 0]));
  for (const entry of release.selection) {
    const def = cards.find(card => card.id === entry.id);
    assert.ok(def, entry.id);
    assert.deepEqual(PRINTINGS[def.id], { foil: true });
    assert.deepEqual(Object.keys(FOIL_ASSIGNMENTS[def.id]).filter(key => key !== 'regular'), ['foil']);
    assert.equal(hasVersion(def, 'foil'), true);
    assert.equal(hasVersion(def, 'creativeFoil'), false);
    assert.equal(hasVersion(def, 'alternateArtFoil'), false);
    const finish = resolveFoil(def, version('foil'));
    assert.equal(finish.mode, entry.mode);
    counts[finish.mode]++;
    assert.equal(versionArtUrl(def, 'foil'), null, 'foil uses ordinary art');
    assert.equal(paintedArtSVG(def, '<svg/>', 'foil'), paintedArtSVG(def, '<svg/>', 'regular'));
    assert.deepEqual(resolveFoil(def, version('fullCardArt')), resolveFoil(def, version('fullCardArt'), undefined, {}));
    if (!Object.hasOwn(FOIL_ASSIGNMENTS[def.id], 'regular')) {
      assert.deepEqual(resolveFoil(def, version('regular')), resolveFoil(def, version('regular'), undefined, {}));
    }
    if (finish.mode === 'details') {
      assert.ok(!finish.mask.includes('sample-details'));
      const svg = readFileSync(new URL(finish.mask), 'utf8');
      assert.match(svg, /viewBox="0 0 600 600"/);
      assert.match(svg, /<path/);
    }
  }
  assert.deepEqual(Object.values(counts), [3, 3, 3, 3, 3]);
  assert.equal(countInVersion(cards, 'foil'), 15);
  assert.equal(countInVersion(cards, 'creativeFoil'), 0);
  for (const card of cards.filter(card => !selected.has(card.id))) assert.equal(hasVersion(card, 'foil'), false);
});

test('hexagon foil on ordinary printings decorates existing cards without adding printings', () => {
  const hexagons = Object.entries(FOIL_ASSIGNMENTS).filter(([, entry]) => Object.hasOwn(entry, 'regular'));
  assert.equal(hexagons.length, 14);
  for (const [id, entry] of hexagons) {
    const def = cards.find(card => card.id === id);
    assert.ok(def, id);
    assert.equal(entry.regular, 'hexagon');
    assert.equal(resolveFoil(def, version('regular')).mode, 'hexagon');
    // A finish decorates the ordinary printing; it never adds one to the Book.
    assert.equal(hasVersion(def, 'alternateArt'), false);
    assert.equal(hasVersion(def, 'creativeFoil'), false);
    assert.equal(versionArtUrl(def, 'regular'), null);
  }
});
