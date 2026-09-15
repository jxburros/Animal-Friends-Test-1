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
  MAKER_SPECIES_CORRECTIONS_ATLAS_URL,
  MAKER_WORKING_LIVES_ATLAS_URL,
  MAKER_NIGHT_STORIES_ATLAS_URL,
  MAKER_LANTERN_FIELD_ATLAS_URL,
  MAKER_BROADCAST_STAGE_ATLAS_URL,
  MAKER_FAIRS_KITCHENS_ATLAS_URL,
  MAKER_CRAFT_RIVER_ATLAS_URL,
  MAKER_BOOKS_SCHOOL_ATLAS_URL,
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
  makerspeciescorrections: MAKER_SPECIES_CORRECTIONS_ATLAS_URL,
  makerworkinglives: MAKER_WORKING_LIVES_ATLAS_URL,
  makernightstories: MAKER_NIGHT_STORIES_ATLAS_URL,
  makerlanternfield: MAKER_LANTERN_FIELD_ATLAS_URL,
  makerbroadcaststage: MAKER_BROADCAST_STAGE_ATLAS_URL,
  makerfairskitchens: MAKER_FAIRS_KITCHENS_ATLAS_URL,
  makercraftriver: MAKER_CRAFT_RIVER_ATLAS_URL,
  makerbooksschool: MAKER_BOOKS_SCHOOL_ATLAS_URL,
};

test('twenty-four Maker atlases assign 384 existing cards to every tile exactly once', () => {
  const entries = Object.entries(MAKER_ART_TILES);
  assert.equal(entries.length, 384);

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
  assert.equal(MAKER_ART_TILES.mk_unknown_cook_0.atlas, 'makerspeciescorrections');
  assert.equal(MAKER_ART_TILES.mk_eric_best_farmer_5.atlas, 'makerworkinglives');
  assert.equal(MAKER_ART_TILES.mk_beck_the_relief_roll_0.atlas, 'makernightstories');
  assert.equal(MAKER_ART_TILES.mk_benjamin_keeper_of_the_light_5.atlas, 'makerlanternfield');
  assert.equal(MAKER_ART_TILES.mk_tabitha_camerawoman_5.atlas, 'makerbroadcaststage');
  assert.equal(MAKER_ART_TILES.mk_dx_lord_mayors_fair.atlas, 'makerfairskitchens');
  assert.equal(MAKER_ART_TILES.mk_pebble_harbour_warden_5.atlas, 'makercraftriver');
  assert.equal(MAKER_ART_TILES.mk_jessica_headmistress_4.atlas, 'makerbooksschool');
});

test('every newly added character and fair card has a commissioned scene', () => {
  const newCharacterPrefixes = ['mk_tabitha_', 'mk_abigail_', 'mk_winter_', 'mk_fred_', 'mk_yellow_'];
  const newFairIds = new Set([
    'mk_dx_small_fair',
    'mk_dx_county_fair',
    'mk_dx_assessors_round',
    'mk_dx_the_reckoning',
    'mk_dx_midsummer_fair',
    'mk_dx_lord_mayors_fair',
  ]);
  const newCards = MAKER.cards.filter((card) =>
    newCharacterPrefixes.some((prefix) => card.id.startsWith(prefix)) || newFairIds.has(card.id));

  assert.equal(newCards.length, 26);
  assert.deepEqual(newCards.filter((card) => !MAKER_ART_TILES[card.id]), []);
});

test('the sixth-wave character roster uses the species declared by the card set', () => {
  const expectedSpeciesByName = {
    Tabitha: 'Hedgehog',
    Winter: 'Owl',
    Fred: 'Owl',
    Yellow: 'Squirrel',
    Abigail: 'Otter',
    Comet: 'Cat',
    Morty: 'Badger',
    Rosabeth: 'Mouse',
    Moss: 'Badger',
    Patch: 'Raccoon',
    Pebble: 'Otter',
    Pockets: 'Raccoon',
    Daisy: 'Squirrel',
    Scott: 'Squirrel',
    Sage: 'Owl',
    Eric: 'Rabbit',
    Jessica: 'Owl',
    Faustus: 'Cat',
  };
  const sixthWaveAtlases = new Set([
    'makerbroadcaststage',
    'makerfairskitchens',
    'makercraftriver',
    'makerbooksschool',
  ]);
  const characters = MAKER.cards.filter((card) =>
    card.type === 'character' && sixthWaveAtlases.has(MAKER_ART_TILES[card.id]?.atlas));

  assert.equal(characters.length, 58);
  for (const card of characters) {
    assert.equal(card.species, expectedSpeciesByName[card.name], card.id);
  }
});

test('the remaining known character-species mismatches use corrected paintings', () => {
  const correctedSpecies = {
    mk_unknown_cook_0: 'Raccoon',
    mk_curtained_performer_2: 'Cat',
    mk_cookie_rusk_baker_1: 'Squirrel',
    mk_liz_plate_clerk_0: 'Fox',
    mk_sota_the_same_bench_4: 'Cat',
    mk_thistle_at_the_back_0: 'Badger',
    mk_osh_fair_fiddler_3: 'Mouse',
    mk_sage_frost_watch_2: 'Owl',
    mk_andrew_hand_copyist_3: 'Owl',
    mk_willow_the_harbour_office_0: 'Otter',
    mk_pockets_a_quiet_arrangement_5: 'Raccoon',
    mk_ned_the_ward_roll_0: 'Squirrel',
    mk_scott_the_index_1: 'Squirrel',
    mk_taco_the_four_oclock_cart_2: 'Otter',
    mk_annabelle_last_one_up_2: 'Raccoon',
    mk_peter_the_winters_length_2: 'Rabbit',
    mk_beck_the_relief_roll_0: 'Raccoon',
  };

  for (const [id, species] of Object.entries(correctedSpecies)) {
    assert.equal(cardsById[id].species, species, id);
    assert.ok(
      ['makerspeciescorrections', 'makernightstories'].includes(MAKER_ART_TILES[id].atlas),
      id,
    );
  }
});

