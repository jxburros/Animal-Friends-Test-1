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
  MAKER_TOKENS_ATLAS_URL,
  MAKER_BAKERY_LIBRARY_ATLAS_URL,
  MAKER_RECORDS_ROOTS_ATLAS_URL,
  MAKER_ROLES_ATLAS_URL,
  MAKER_LEDGERS_LAMPLIGHT_ATLAS_URL,
  MAKER_GARDENS_POST_ATLAS_URL,
  MAKER_MASKED_HANDS_ATLAS_URL,
  MAKER_STAGE_COUNTER_ATLAS_URL,
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
  makertokens: MAKER_TOKENS_ATLAS_URL,
  makerbakerylibrary: MAKER_BAKERY_LIBRARY_ATLAS_URL,
  makerrecordsroots: MAKER_RECORDS_ROOTS_ATLAS_URL,
  makerroles: MAKER_ROLES_ATLAS_URL,
  makerledgerslamplight: MAKER_LEDGERS_LAMPLIGHT_ATLAS_URL,
  makergardenspost: MAKER_GARDENS_POST_ATLAS_URL,
  makermaskedhands: MAKER_MASKED_HANDS_ATLAS_URL,
  makerstagecounter: MAKER_STAGE_COUNTER_ATLAS_URL,
};

test('sixteen Maker atlases assign 256 existing cards to every tile exactly once', () => {
  const entries = Object.entries(MAKER_ART_TILES);
  assert.equal(entries.length, 256);

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

test('every Maker token has commissioned art and selected shared scenes are replaced', () => {
  const missingTokens = MAKER.cards.filter((card) => card.type === 'token' && !MAKER_ART_TILES[card.id]);
  assert.deepEqual(missingTokens, []);

  assert.equal(MAKER_ART_TILES.mk_tok_rabbit.atlas, 'makertokens');
  assert.equal(MAKER_ART_TILES.mk_tok_building.atlas, 'makerbakerylibrary');
  assert.equal(MAKER_ART_TILES.mk_marmalade_night_baker_0.atlas, 'makerbakerylibrary');
  assert.equal(MAKER_ART_TILES.mk_daniel_star_charter_3.atlas, 'makerrecordsroots');
  assert.equal(MAKER_ART_TILES.mk_brooke_balloonist_4.atlas, 'makerroles');
  assert.equal(MAKER_ART_TILES.mk_orien_survey_computer_4.atlas, 'makerledgerslamplight');
  assert.equal(MAKER_ART_TILES.mk_lindsay_moon_gardener_5.atlas, 'makergardenspost');
  assert.equal(MAKER_ART_TILES.mk_masked_otter_counter_hand_1.atlas, 'makermaskedhands');
  assert.equal(MAKER_ART_TILES.mk_gabe_whole_cast_5.atlas, 'makerstagecounter');
});

