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
  for (const id of selected) assert.ok(Object.hasOwn(FOIL_ASSIGNMENTS, id), id);
  for (const id of selected) assert.ok(Object.hasOwn(PRINTINGS, id), id);
  const counts = Object.fromEntries(FOIL_MODES.map(mode => [mode, 0]));
  for (const entry of release.selection) {
    const def = cards.find(card => card.id === entry.id);
    assert.ok(def, entry.id);
    assert.equal(PRINTINGS[def.id].foil, true);
    assert.deepEqual(Object.keys(FOIL_ASSIGNMENTS[def.id]), ['foil']);
    assert.equal(hasVersion(def, 'foil'), true);
    assert.equal(hasVersion(def, 'creativeFoil'), false);
    assert.equal(hasVersion(def, 'alternateArtFoil'), false);
    const finish = resolveFoil(def, version('foil'));
    assert.equal(finish.mode, entry.mode);
    counts[finish.mode]++;
    assert.equal(versionArtUrl(def, 'foil'), null, 'foil uses ordinary art');
    assert.equal(paintedArtSVG(def, '<svg/>', 'foil'), paintedArtSVG(def, '<svg/>', 'regular'));
    for (const key of ['regular', 'fullCardArt']) {
      assert.deepEqual(resolveFoil(def, version(key)), resolveFoil(def, version(key), undefined, {}));
    }
    if (finish.mode === 'details') {
      assert.ok(!finish.mask.includes('sample-details'));
      const svg = readFileSync(new URL(finish.mask), 'utf8');
      assert.match(svg, /viewBox="0 0 600 600"/);
      assert.match(svg, /<path/);
    }
  }
  assert.deepEqual(Object.values(counts), [3, 3, 3, 3, 3]);
  assert.equal(countInVersion(cards, 'creativeFoil'), 0);
});

test('hexagon Foil printings added after the first release use the ordinary artwork', () => {
  const drawn = new Set(release.selection.map(card => card.id));
  const added = Object.entries(PRINTINGS)
    .filter(([id, printings]) => printings.foil && !drawn.has(id))
    .map(([id]) => id);
  assert.equal(added.length, 14);
  for (const id of added) {
    const def = cards.find(card => card.id === id);
    assert.ok(def, id);
    assert.equal(PRINTINGS[id].foil, true);
    assert.deepEqual(Object.keys(FOIL_ASSIGNMENTS[id]), ['foil']);
    assert.equal(resolveFoil(def, version('foil')).mode, 'hexagon');
    assert.equal(hasVersion(def, 'foil'), true);
    assert.equal(hasVersion(def, 'creativeFoil'), false);
    assert.equal(hasVersion(def, 'alternateArtFoil'), false);
    // A new Foil printing needs no new painting, and leaves the other printings matte.
    assert.equal(versionArtUrl(def, 'foil'), null, 'foil uses ordinary art');
    assert.equal(paintedArtSVG(def, '<svg/>', 'foil'), paintedArtSVG(def, '<svg/>', 'regular'));
    for (const key of ['regular', 'fullCardArt']) {
      assert.deepEqual(resolveFoil(def, version(key)), resolveFoil(def, version(key), undefined, {}));
    }
  }
});

test('every Foil printing is either drawn or a later hexagon, and no card is foil by accident', () => {
  assert.equal(countInVersion(cards, 'foil'), 29);
  const foilPrintings = Object.entries(PRINTINGS)
    .filter(([, printings]) => printings.foil)
    .map(([id]) => id);
  assert.deepEqual(new Set(Object.keys(FOIL_ASSIGNMENTS)), new Set(foilPrintings));
  for (const card of cards.filter(card => !PRINTINGS[card.id]?.foil)) {
    assert.equal(hasVersion(card, 'foil'), false);
  }
});
