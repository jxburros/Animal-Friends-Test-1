// Card printings: regular, alternate art, foil, alternate art foil, creative foil, full card art.
//
// Regular, ordinary Foil and Full Card Art exist, alongside a commissioned Alternate Art collection.
// Creative printings stay unavailable. Finish choices do not create different printing categories.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  VERSIONS, VERSION_KEYS, version, versionsOf, hasVersion, versionArtUrl,
  defaultVersionKey, resolveVersionKey, versionAssetUrl,
} from '../src/ui/versions.js';
import { FULL_ART_CARDS, fullArtFor } from '../src/ui/full-art.js';
import { paintedArtSVG } from '../src/ui/painted-art.js';
import { SET } from './helpers.mjs';

const allCards = SET.cards;
const ALTERNATE_ART_IDS = Object.freeze([
  'mk_brooke_balloonist_4', 'mk_clover_rocket_botanist_4', 'mk_comet_bolt_sorter_0',
  'mk_comet_astronaut_5', 'mk_inkwell_storyteller_2', 'mk_inkwells_star_chart',
  'mk_lindsay_moon_gardener_5', 'mk_daniel_star_charter_3', 'mk_betty_stump_blaster_2',
  'mk_betty_powder_chemist_4', 'mk_berry_tinker_0', 'mk_mortys_boiler_test',
  'mk_sota_lens_grinder_1', 'mk_moss_bridgewright_5', 'mk_hazels_night_market',
  'mk_one_small_step', 'mk_rosabeth_garden_hand_1', 'mk_rosabeth_apothecary_3',
  'mk_clover_seedling_helper_0', 'mk_marmalade_neighborhood_baker_3',
  'mk_peanuts_standing_round', 'mk_oatmeal_jazz_singer_3', 'mk_scotts_reading_hour',
  'mk_biff_chief_constable_4', 'mk_moss_rehiring_day', 'mk_bella_science_hall_fellow_4',
  'mk_peanut_comptroller_5', 'mk_andrew_keeper_of_the_late_desk_2',
  'mk_annabelle_salvage_archivist_3', 'mk_pebble_ferry_master_3',
  'mk_hibiscus_round_walker_3', 'mk_daisy_night_bloom_florist_3',
  'mk_liza_floor_singer_0', 'mk_harrison_piano_boy_0', 'mk_gabe_corner_show_0',
  'mk_cassadee_stage_hand_0', 'mk_tabitha_festival_photographer_0',
  'mk_yellow_open_mic_regular_1', 'mk_fred_wandered_onto_stage_0',
  'mk_oatmeal_sunday_table_0', 'mk_bean_the_early_shift_4', 'mk_barnaby_night_auditor_4',
  'mk_inkwell_night_librarian_3', 'mk_benjamin_keeper_of_the_light_5',
  'mk_willow_harbour_admiral_5', 'mk_unknown_cook_0',
  'mk_shadowed_squirrel_hall_hand_1', 'mk_unsigned_mouse_shelves_hand_1',
  'mk_berry_clockmaker_1', 'mk_clover_community_gardener_3',
  'mk_comet_rocket_mechanic_1', 'mk_betty_firework_maker_3', 'mk_brooke_riverwright_5',
  'mk_copper_cellar_keeper_4', 'mk_gwen_apron_on_the_hook_4', 'mk_gabe_puppet_maker_2',
  'mk_tabitha_camerawoman_5', 'mk_winter_turned_down_applicant_1',
  'mk_oatmeal_alderman_5', 'mk_bean_two_pairs_of_paws_2', 'mk_barrows_measure',
  'mk_unlisted_grower_2', 'mk_veiled_wright_0', 'mk_shrouded_badger_bench_hand_2',
  'mk_peanut_ledger_0', 'mk_oatmeal_town_warden_4', 'mk_brooke_ferry_hand_2',
  'mk_clover_plot_sharer_1', 'mk_rosabeth_herbalist_physician_5', 'mk_bella_forager_0',
  'mk_lynnette_bookbinder_1', 'mk_maribel_seed_vault_scientist_3',
  'mk_marmalade_night_baker_0', 'mk_morty_mill_kitchen_cook_1',
  'mk_daisy_festival_florist_4', 'mk_quill_cider_maker_3', 'mk_earl_tea_house_keeper_4',
  'mk_jessica_night_school_teacher_2', 'mk_mkt_long_table', 'mk_mkt_late_ferry',
  'mk_oatmeal_safety_inspector_2', 'mk_bean_espresso_1', 'mk_brooke_regatta_caller_3',
  'mk_clovers_seed_drive', 'mk_copper_market_steward_5', 'mk_bella_field_recorder_2',
  'mk_hazel_night_market_vendor_1', 'mk_juniper_stargazer_5', 'mk_lynnette_master_printer_5',
  'mk_daniel_canal_cartographer_2', 'mk_hibiscus_night_mail_2',
  'mk_benjamin_wick_trimmer_0', 'mk_sage_night_assistant_0',
  'mk_sota_telescope_fitter_3', 'mk_faustus_sailmaker_3', 'mk_bld_festival_green',
]);
const alternateArtIds = new Set(ALTERNATE_ART_IDS);

test('the six printings are named, distinct and in collection order', () => {
  assert.deepEqual(VERSION_KEYS, [
    'regular', 'alternateArt', 'foil', 'alternateArtFoil', 'creativeFoil', 'fullCardArt',
  ]);
  const names = new Set(VERSIONS.map((v) => v.name));
  assert.equal(names.size, VERSIONS.length);
  for (const v of VERSIONS) {
    assert.ok(v.name && v.short && v.blurb, v.key);
    assert.equal(version(v.key), v);
  }
  // An unknown printing reads as the regular one rather than throwing: a stale bookmark or a typo in
  // a saved preference must never blank a card.
  assert.equal(version('no-such-printing').key, 'regular');
});

test('every card exists in the regular printing, and in Full Card Art only if it was painted', () => {
  for (const card of allCards) {
    assert.ok(hasVersion(card, 'regular'), card.id);
    // The question is "is there a painting for it", not "is it a registry key".
    assert.equal(hasVersion(card, 'fullCardArt'), !!fullArtFor(card), card.id);
    assert.equal(versionsOf(card)[0].key, 'regular');
  }
  assert.equal(hasVersion(null, 'regular'), false);
  assert.equal(hasVersion({ id: 'x' }, 'no-such-printing'), false);
  // Object.hasOwn, not `in`: a card called "toString" must not inherit a printing from the prototype.
  assert.equal(hasVersion({ id: 'toString' }, 'foil'), false);
});

test('the commissioned alternate-art cards are offered and point to bundled paintings', () => {
  for (const card of allCards) {
    const expected = alternateArtIds.has(card.id);
    assert.equal(hasVersion(card, 'alternateArt'), expected, card.id);
    const url = versionArtUrl(card, 'alternateArt');
    assert.equal(!!url, expected, card.id);
    if (expected) {
      const asset = new URL(url);
      assert.match(asset.hash, /^#tile=(?:[0-9]|1[0-5])$/, card.id);
      asset.hash = '';
      assert.ok(existsSync(fileURLToPath(asset)), card.id);
    }
    assert.equal(hasVersion(card, 'alternateArtFoil'), false, `${card.id} alternateArtFoil`);
    assert.equal(hasVersion(card, 'creativeFoil'), false, `${card.id} creativeFoil`);
  }
  assert.equal(alternateArtIds.size, 96);
  assert.ok(versionAssetUrl('mk_clover_master_botanist_5', 'alternateArt').endsWith('/assets/art/versions/mk_clover_master_botanist_5/alternateArt.png'));
});

test('a card is shown in its Full Card Art when it has one, and its regular printing otherwise', () => {
  const painted = Object.keys(FULL_ART_CARDS)[0];
  const plain = SET.cards.find((c) => !fullArtFor(c));
  assert.equal(defaultVersionKey({ id: painted }), 'fullCardArt');
  assert.equal(defaultVersionKey(plain), 'regular');
  // A printing the card has not got falls back rather than rendering nothing.
  assert.equal(resolveVersionKey(plain, 'creativeFoil'), 'regular');
  assert.equal(resolveVersionKey({ id: painted }, 'regular'), 'regular');
  assert.equal(resolveVersionKey({ id: painted }, null), 'fullCardArt');
});

test('asking for a printing changes the art, and asking for none changes nothing', () => {
  const id = 'mk_clover_master_botanist_5';
  const card = SET.cards.find((c) => c.id === id);
  const url = FULL_ART_CARDS[id].url;
  assert.equal(paintedArtSVG(card, '<svg/>'), paintedArtSVG(card, '<svg/>', 'fullCardArt'));
  assert.ok(paintedArtSVG(card, '<svg/>').includes(url));
  // The regular printing of a painted card is the atlas tile, with no painting over it.
  const regular = paintedArtSVG(card, '<svg data-fallback="original"/>', 'regular');
  assert.ok(!regular.includes(url), 'the regular printing drops the full-art painting');
  assert.ok(regular.includes('data-fallback="original"'), 'and still falls back to the vector scene');
  const before = JSON.stringify(card);
  paintedArtSVG(card, '<svg/>', 'creativeFoil');
  assert.equal(JSON.stringify(card), before, 'rendering never changes the definition');

  const alternate = SET.cards.find((c) => c.id === 'mk_brooke_balloonist_4');
  const alternateSvg = paintedArtSVG(alternate, '<svg data-fallback="alternate"/>', 'alternateArt');
  assert.match(alternateSvg, /alternate-ink-ambitions-atlas\.png/);
  assert.match(alternateSvg, /x="0" y="0" width="400" height="400"/);

  const retro = SET.cards.find((c) => c.id === 'mk_shrouded_badger_bench_hand_2');
  const retroSvg = paintedArtSVG(retro, '<svg data-fallback="retro"/>', 'alternateArt');
  assert.match(retroSvg, /alternate-retro-quiet-triumphs-atlas\.png/);
  assert.match(retroSvg, /x="-300" y="-300" width="400" height="400"/);

  const impressionist = SET.cards.find((c) => c.id === 'mk_bld_festival_green');
  const impressionistSvg = paintedArtSVG(
    impressionist, '<svg data-fallback="impressionist"/>', 'alternateArt',
  );
  assert.match(impressionistSvg, /alternate-impressionist-light-across-town-atlas\.png/);
  assert.match(impressionistSvg, /x="-300" y="-300" width="400" height="400"/);
});
