import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MAKER_ART_TILES,
  MAKER_BOROUGH_ATLAS_URL,
  MAKER_FIELD_ATLAS_URL,
  MAKER_WOODLAND_ATLAS_URL,
  MAKER_NIGHT_ATLAS_URL,
  MAKER_CIVIC_ATLAS_URL,
  MAKER_HARVEST_ATLAS_URL,
  MAKER_WORKSHOP_ATLAS_URL,
  MAKER_PLACES_ATLAS_URL,
  paintedArtSVG,
} from '../src/ui/painted-art.js';

const MAKER = JSON.parse(readFileSync(new URL('../spec/maker_card_set.json', import.meta.url), 'utf8'));
const cardsById = Object.fromEntries(MAKER.cards.map((card) => [card.id, card]));
const atlasUrls = {
  makerborough: MAKER_BOROUGH_ATLAS_URL,
  makerfield: MAKER_FIELD_ATLAS_URL,
  makerwoodland: MAKER_WOODLAND_ATLAS_URL,
  makernight: MAKER_NIGHT_ATLAS_URL,
  makercivic: MAKER_CIVIC_ATLAS_URL,
  makerharvest: MAKER_HARVEST_ATLAS_URL,
  makerworkshop: MAKER_WORKSHOP_ATLAS_URL,
  makerplaces: MAKER_PLACES_ATLAS_URL,
};

test('eight Maker atlases assign 128 existing cards to every tile exactly once', () => {
  const entries = Object.entries(MAKER_ART_TILES);
  assert.equal(entries.length, 128);

  for (const [atlas, url] of Object.entries(atlasUrls)) {
    const assignments = entries.filter(([, art]) => art.atlas === atlas);
    assert.equal(assignments.length, 16, atlas);
    assert.deepEqual(assignments.map(([, art]) => art.tile).sort((a, b) => a - b), [...Array(16).keys()], atlas);

    const png = readFileSync(new URL(url));
    assert.equal(png.subarray(1, 4).toString(), 'PNG', atlas);
    assert.equal(png.readUInt32BE(16), png.readUInt32BE(20), atlas + ' is square');
  }

  for (const [id, art] of entries) {
    const card = cardsById[id];
    assert.ok(card, id);
    const before = JSON.stringify(card);
    const markup = paintedArtSVG(card, '<svg data-fallback="original"/>');
    assert.ok(markup.includes(atlasUrls[art.atlas]), id);
    assert.ok(markup.includes('data-fallback="original"'), id);
    assert.equal(JSON.stringify(card), before, id + ' remains presentation-only');
  }
});

test('every non-token Maker card without authored art now has a commissioned scene', () => {
  const missing = MAKER.cards.filter((card) => card.type !== 'token' && !card.art && !MAKER_ART_TILES[card.id]);
  assert.deepEqual(missing, []);

  assert.equal(MAKER_ART_TILES.mk_bean_proprietor_5.atlas, 'makercivic');
  assert.equal(MAKER_ART_TILES.mk_maribel_horticulturist_4.atlas, 'makerharvest');
});

