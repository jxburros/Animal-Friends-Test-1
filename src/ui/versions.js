// Card versions: the different printings one card can exist in.
//
// A card is one set of rules and any number of printings of it. Six are recognised:
//
//   regular             the ordinary printing every card has
//   alternateArt        the same card with a different scene in the art window
//   foil                the ordinary art, printed on foil
//   alternateArtFoil    the alternate scene, printed on foil
//   creativeFoil        a foil with its own etched treatment (and, optionally, its own scene)
//   fullCardArt         the painting fills the whole card, frame and all
//
// Regular, Foil and Full Card Art printings are available. Foil finishes are assigned independently
// in foil.js; all five finishes belong to the ordinary `foil` printing.
//
// To bring another printing into the game:
//
//   1. drop the painting at  assets/art/versions/<cardId>/<slot>.png   (slot: alternateArt | creativeFoil)
//   2. add one line to PRINTINGS below:  mk_clover_master_botanist_5: { alternateArt: true, foil: true },
//
// `true` means "this printing exists, at the conventional path"; a string is an explicit URL for art
// that lives somewhere else. A `#tile=0..15` fragment selects a row-major tile from a 4 × 4 atlas.
// A printing with no art of its own (plain `foil`) only ever needs `true`.
import { fullArtFor } from './full-art.js';

/**
 * The six printings, in collection order.
 *
 * `art`   which painting the printing uses: null = the card's ordinary art.
 * `shape` how that painting sits: 'scene' fills the art window, 'full' fills the whole card.
 * `foil`  the finish: null, 'plain', or 'creative' (a foil with its own etched pattern).
 */
export const VERSIONS = Object.freeze([
  Object.freeze({
    key: 'regular', name: 'Regular', short: 'Regular', art: null, shape: null, foil: null, fullArt: false,
    blurb: 'The ordinary printing. Every card has one.',
  }),
  Object.freeze({
    key: 'alternateArt', name: 'Alternate Art', short: 'Alt Art', art: 'alternateArt', shape: 'scene', foil: null, fullArt: false,
    blurb: 'The same card, painted a second time. A different scene in the same frame.',
  }),
  Object.freeze({
    key: 'foil', name: 'Foil', short: 'Foil', art: null, shape: null, foil: 'plain', fullArt: false,
    blurb: 'The ordinary art with a foil finish: full-card, artwork, details, reverse or hexagons.',
  }),
  Object.freeze({
    key: 'alternateArtFoil', name: 'Alternate Art Foil', short: 'Alt Foil', art: 'alternateArt', shape: 'scene', foil: 'plain', fullArt: false,
    blurb: 'The second painting, on foil.',
  }),
  Object.freeze({
    key: 'creativeFoil', name: 'Creative Foil', short: 'Creative', art: 'creativeFoil', shape: 'scene', foil: 'creative', fullArt: false,
    blurb: 'A foil etched with a treatment of its own — the pattern is part of the printing.',
  }),
  Object.freeze({
    key: 'fullCardArt', name: 'Full Card Art', short: 'Full Art', art: 'fullCardArt', shape: 'full', foil: 'plain', fullArt: true,
    blurb: 'The painting fills the card, edge to edge, and the frame is drawn over it.',
  }),
]);

export const VERSION_KEYS = Object.freeze(VERSIONS.map((v) => v.key));
const BY_KEY = Object.freeze(Object.fromEntries(VERSIONS.map((v) => [v.key, v])));

const INK_ALT_ATLASES = Object.freeze({
  ambitions: new URL('../../assets/art/alternate-ink-ambitions-atlas.png', import.meta.url).href,
  kindness: new URL('../../assets/art/alternate-ink-kindness-atlas.png', import.meta.url).href,
});

const RETRO_ALT_ATLASES = Object.freeze({
  afterHours: new URL('../../assets/art/alternate-retro-after-hours-atlas.png', import.meta.url).href,
  quietTriumphs: new URL('../../assets/art/alternate-retro-quiet-triumphs-atlas.png', import.meta.url).href,
});

const IMPRESSIONIST_ALT_ATLASES = Object.freeze({
  slowDays: new URL('../../assets/art/alternate-impressionist-slow-days-atlas.png', import.meta.url).href,
  lightAcrossTown: new URL('../../assets/art/alternate-impressionist-light-across-town-atlas.png', import.meta.url).href,
});

const CUT_PAPER_ALT_ATLASES = Object.freeze({
  dayShift: new URL('../../assets/art/alternate-cut-paper-day-shift-atlas.png', import.meta.url).href,
  nightShift: new URL('../../assets/art/alternate-cut-paper-night-shift-atlas.png', import.meta.url).href,
});

const LINOCUT_ALT_ATLASES = Object.freeze({
  workingPaws: new URL('../../assets/art/alternate-linocut-working-paws-atlas.png', import.meta.url).href,
  boroughRituals: new URL('../../assets/art/alternate-linocut-borough-rituals-atlas.png', import.meta.url).href,
});

function inkAlternate(atlas, tile, other = {}) {
  return Object.freeze({ alternateArt: `${INK_ALT_ATLASES[atlas]}#tile=${tile}`, ...other });
}

function retroAlternate(atlas, tile, other = {}) {
  return Object.freeze({ alternateArt: `${RETRO_ALT_ATLASES[atlas]}#tile=${tile}`, ...other });
}

function impressionistAlternate(atlas, tile, other = {}) {
  return Object.freeze({ alternateArt: `${IMPRESSIONIST_ALT_ATLASES[atlas]}#tile=${tile}`, ...other });
}

function cutPaperAlternate(atlas, tile, other = {}) {
  return Object.freeze({ alternateArt: `${CUT_PAPER_ALT_ATLASES[atlas]}#tile=${tile}`, ...other });
}

function linocutAlternate(atlas, tile, other = {}) {
  return Object.freeze({ alternateArt: `${LINOCUT_ALT_ATLASES[atlas]}#tile=${tile}`, ...other });
}

/**
 * Which printings each card exists in, beyond the regular one and the Full Card Art collection.
 * The first random draw has 15 ordinary Foil printings (docs/FIRST_FOILS.md); 14 hexagons and a
 * second, chosen set of 35 (docs/SECOND_FOILS.md) follow it, for 64 in all.
 *
 *   mk_peanut_barista_1: { alternateArt: true, foil: true, alternateArtFoil: true },
 */
export const PRINTINGS = Object.freeze({
  // Ink & Watercolor alternate-art collection. The two source atlases and their row-major map live
  // in docs/ALTERNATE_INK_WATERCOLOR.md; cards use conventional per-printing crops at runtime.
  mk_brooke_balloonist_4: inkAlternate('ambitions', 0, { foil: true }),
  mk_clover_rocket_botanist_4: inkAlternate('ambitions', 1),
  mk_comet_bolt_sorter_0: inkAlternate('ambitions', 2, { foil: true }),
  mk_inkwell_storyteller_2: inkAlternate('ambitions', 4),
  mk_inkwells_star_chart: inkAlternate('ambitions', 5),
  mk_lindsay_moon_gardener_5: inkAlternate('ambitions', 6),
  mk_betty_stump_blaster_2: inkAlternate('ambitions', 8),
  mk_betty_powder_chemist_4: inkAlternate('ambitions', 9),
  mk_berry_tinker_0: inkAlternate('ambitions', 10),
  mk_mortys_boiler_test: inkAlternate('ambitions', 11),
  mk_sota_lens_grinder_1: inkAlternate('ambitions', 12),
  mk_moss_bridgewright_5: inkAlternate('ambitions', 13),
  mk_hazels_night_market: inkAlternate('ambitions', 14),
  mk_one_small_step: inkAlternate('ambitions', 15),
  mk_rosabeth_garden_hand_1: inkAlternate('kindness', 0, { foil: true }),
  mk_rosabeth_apothecary_3: inkAlternate('kindness', 1),
  mk_marmalade_neighborhood_baker_3: inkAlternate('kindness', 3),
  mk_peanuts_standing_round: inkAlternate('kindness', 4),
  mk_oatmeal_jazz_singer_3: inkAlternate('kindness', 5),
  mk_scotts_reading_hour: inkAlternate('kindness', 6),
  mk_biff_chief_constable_4: inkAlternate('kindness', 7, { foil: true }),
  mk_bella_science_hall_fellow_4: inkAlternate('kindness', 9),
  mk_peanut_comptroller_5: inkAlternate('kindness', 10),
  mk_andrew_keeper_of_the_late_desk_2: inkAlternate('kindness', 11),
  mk_annabelle_salvage_archivist_3: inkAlternate('kindness', 12),
  mk_pebble_ferry_master_3: inkAlternate('kindness', 13),
  mk_hibiscus_round_walker_3: inkAlternate('kindness', 14),
  mk_daisy_night_bloom_florist_3: inkAlternate('kindness', 15),

  // Soft Retro Pop alternate-art collection. These scenes follow the cards' flavor and character
  // stories in a mid-century gouache-and-silkscreen idiom. See docs/ALTERNATE_RETRO_POP.md.
  mk_liza_floor_singer_0: retroAlternate('afterHours', 0),
  mk_harrison_piano_boy_0: retroAlternate('afterHours', 1, { foil: true }),
  mk_gabe_corner_show_0: retroAlternate('afterHours', 2, { foil: true }),
  mk_cassadee_stage_hand_0: retroAlternate('afterHours', 3),
  mk_tabitha_festival_photographer_0: retroAlternate('afterHours', 4),
  mk_yellow_open_mic_regular_1: retroAlternate('afterHours', 5),
  mk_fred_wandered_onto_stage_0: retroAlternate('afterHours', 6),
  mk_oatmeal_sunday_table_0: retroAlternate('afterHours', 7, { foil: true }),
  mk_bean_the_early_shift_4: retroAlternate('afterHours', 8, { foil: true }),
  mk_barnaby_night_auditor_4: retroAlternate('afterHours', 9),
  mk_inkwell_night_librarian_3: retroAlternate('afterHours', 10),
  mk_benjamin_keeper_of_the_light_5: retroAlternate('afterHours', 11),
  mk_willow_harbour_admiral_5: retroAlternate('afterHours', 12, { foil: true }),
  mk_unknown_cook_0: retroAlternate('afterHours', 13),
  mk_shadowed_squirrel_hall_hand_1: retroAlternate('afterHours', 14),
  mk_unsigned_mouse_shelves_hand_1: retroAlternate('afterHours', 15),

  mk_berry_clockmaker_1: retroAlternate('quietTriumphs', 0, { foil: true }),
  mk_clover_community_gardener_3: retroAlternate('quietTriumphs', 1),
  mk_comet_rocket_mechanic_1: retroAlternate('quietTriumphs', 2),
  mk_betty_firework_maker_3: retroAlternate('quietTriumphs', 3, { foil: true }),
  mk_brooke_riverwright_5: retroAlternate('quietTriumphs', 4),
  mk_copper_cellar_keeper_4: retroAlternate('quietTriumphs', 5, { foil: true }),
  mk_gwen_apron_on_the_hook_4: retroAlternate('quietTriumphs', 6),
  mk_gabe_puppet_maker_2: retroAlternate('quietTriumphs', 7),
  mk_tabitha_camerawoman_5: retroAlternate('quietTriumphs', 8, { foil: true }),
  mk_winter_turned_down_applicant_1: retroAlternate('quietTriumphs', 9, { foil: true }),
  mk_oatmeal_alderman_5: retroAlternate('quietTriumphs', 10),
  mk_bean_two_pairs_of_paws_2: retroAlternate('quietTriumphs', 11),
  mk_barrows_measure: retroAlternate('quietTriumphs', 12),
  mk_unlisted_grower_2: retroAlternate('quietTriumphs', 13),
  mk_veiled_wright_0: retroAlternate('quietTriumphs', 14),
  mk_shrouded_badger_bench_hand_2: retroAlternate('quietTriumphs', 15),

  // Relaxed Impressionist alternate-art collection. Loose brushwork and luminous atmosphere frame
  // small acts of work and care drawn directly from the cards' flavor. See
  // docs/ALTERNATE_IMPRESSIONIST.md for the two row-major atlas maps.
  mk_peanut_ledger_0: impressionistAlternate('slowDays', 0),
  mk_oatmeal_town_warden_4: impressionistAlternate('slowDays', 1),
  mk_brooke_ferry_hand_2: impressionistAlternate('slowDays', 2),
  mk_clover_plot_sharer_1: impressionistAlternate('slowDays', 3, { foil: true }),
  mk_rosabeth_herbalist_physician_5: impressionistAlternate('slowDays', 4),
  mk_bella_forager_0: impressionistAlternate('slowDays', 5),
  mk_lynnette_bookbinder_1: impressionistAlternate('slowDays', 6),
  mk_maribel_seed_vault_scientist_3: impressionistAlternate('slowDays', 7),
  mk_marmalade_night_baker_0: impressionistAlternate('slowDays', 8),
  mk_morty_mill_kitchen_cook_1: impressionistAlternate('slowDays', 9),
  mk_daisy_festival_florist_4: impressionistAlternate('slowDays', 10),
  mk_quill_cider_maker_3: impressionistAlternate('slowDays', 11),
  mk_earl_tea_house_keeper_4: impressionistAlternate('slowDays', 12, { foil: true }),
  mk_jessica_night_school_teacher_2: impressionistAlternate('slowDays', 13),
  mk_mkt_long_table: impressionistAlternate('slowDays', 14),
  mk_mkt_late_ferry: impressionistAlternate('slowDays', 15),

  mk_oatmeal_safety_inspector_2: impressionistAlternate('lightAcrossTown', 0),
  mk_bean_espresso_1: impressionistAlternate('lightAcrossTown', 1, { foil: true }),
  mk_brooke_regatta_caller_3: impressionistAlternate('lightAcrossTown', 2),
  mk_clovers_seed_drive: impressionistAlternate('lightAcrossTown', 3),
  mk_copper_market_steward_5: impressionistAlternate('lightAcrossTown', 4),
  mk_bella_field_recorder_2: impressionistAlternate('lightAcrossTown', 5),
  mk_hazel_night_market_vendor_1: impressionistAlternate('lightAcrossTown', 6),
  mk_juniper_stargazer_5: impressionistAlternate('lightAcrossTown', 7),
  mk_lynnette_master_printer_5: impressionistAlternate('lightAcrossTown', 8),
  mk_daniel_canal_cartographer_2: impressionistAlternate('lightAcrossTown', 9),
  mk_hibiscus_night_mail_2: impressionistAlternate('lightAcrossTown', 10),
  mk_benjamin_wick_trimmer_0: impressionistAlternate('lightAcrossTown', 11),
  mk_sage_night_assistant_0: impressionistAlternate('lightAcrossTown', 12),
  mk_sota_telescope_fitter_3: impressionistAlternate('lightAcrossTown', 13),
  mk_faustus_sailmaker_3: impressionistAlternate('lightAcrossTown', 14),
  mk_bld_festival_green: impressionistAlternate('lightAcrossTown', 15),

  // 1950s Cut-Paper alternate-art collection. Crisp geometric collage, deliberately offset
  // screenprint color and small visual jokes interpret the cards' flavor rather than their regular
  // compositions. See docs/ALTERNATE_CUT_PAPER.md for the row-major atlas maps.
  mk_peanut_accountant_2: cutPaperAlternate('dayShift', 0),
  mk_berry_engineer_3: cutPaperAlternate('dayShift', 1),
  mk_biff_cadet_constable_0: cutPaperAlternate('dayShift', 2),
  mk_brooke_dock_hand_1: cutPaperAlternate('dayShift', 3),
  mk_betty_whittler_1: cutPaperAlternate('dayShift', 4),
  mk_clover_market_gardener_2: cutPaperAlternate('dayShift', 5),
  mk_rosabeth_tincture_maker_2: cutPaperAlternate('dayShift', 6),
  mk_bella_field_scientist_1: cutPaperAlternate('dayShift', 7),
  mk_finn_peddler_1: cutPaperAlternate('dayShift', 8, { foil: true }),
  mk_hazel_market_vendor_2: cutPaperAlternate('dayShift', 9),
  mk_inkwell_bookmark_keeper_1: cutPaperAlternate('dayShift', 10),
  mk_juniper_messenger_1: cutPaperAlternate('dayShift', 11),
  mk_lynnette_lending_librarian_3: cutPaperAlternate('dayShift', 12),
  mk_taco_cart_cook_1: cutPaperAlternate('dayShift', 13),
  mk_quill_orchard_keeper_2: cutPaperAlternate('dayShift', 14),
  mk_eric_best_farmer_5: cutPaperAlternate('dayShift', 15),

  mk_bean_barista_3: cutPaperAlternate('nightShift', 0),
  mk_bean_proprietor_5: cutPaperAlternate('nightShift', 1),
  mk_comet_test_pilot_3: cutPaperAlternate('nightShift', 2),
  mk_copper_scale_polisher_1: cutPaperAlternate('nightShift', 3, { foil: true }),
  mk_inkwell_astronomer_4: cutPaperAlternate('nightShift', 4),
  mk_juniper_courier_captain_2: cutPaperAlternate('nightShift', 5),
  mk_lynnette_night_printer_0: cutPaperAlternate('nightShift', 6),
  mk_andrew_night_copyist_0: cutPaperAlternate('nightShift', 7),
  mk_orien_survey_computer_4: cutPaperAlternate('nightShift', 8),
  mk_patch_junkyard_diver_0: cutPaperAlternate('nightShift', 9, { foil: true }),
  mk_scott_story_collector_0: cutPaperAlternate('nightShift', 10),
  mk_lindsay_glasshouse_hand_2: cutPaperAlternate('nightShift', 11),
  mk_hibiscus_mail_coach_driver_4: cutPaperAlternate('nightShift', 12),
  mk_earl_coffee_roaster_3: cutPaperAlternate('nightShift', 13),
  mk_jessica_song_leader_0: cutPaperAlternate('nightShift', 14, { foil: true }),
  mk_benjamin_lantern_maker_2: cutPaperAlternate('nightShift', 15, { foil: true }),

  // Folk-art Linocut alternate-art collection. Chunky carved contours, rough paper grain and a
  // five-ink palette turn the cards' working lives and communal rituals into small block prints.
  // See docs/ALTERNATE_LINOCUT.md for the two row-major atlas maps.
  mk_peanut_barista_1: linocutAlternate('workingPaws', 0),
  mk_barrow_stonecutter_5: linocutAlternate('workingPaws', 1),
  mk_berry_guild_warden_5: linocutAlternate('workingPaws', 2),
  mk_brooke_mooring_hand_0: linocutAlternate('workingPaws', 3),
  mk_betty_barn_sweeper_0: linocutAlternate('workingPaws', 4),
  mk_rosabeth_herb_gatherer_0: linocutAlternate('workingPaws', 5, { foil: true }),
  mk_finn_auctioneers_boy_0: linocutAlternate('workingPaws', 6, { foil: true }),
  mk_hazel_barrow_hand_0: linocutAlternate('workingPaws', 7),
  mk_hoot_night_porter_2: linocutAlternate('workingPaws', 8),
  mk_lynnette_press_feeder_2: linocutAlternate('workingPaws', 9),
  mk_copper_penny_counter_0: linocutAlternate('workingPaws', 10),
  mk_bella_wildlife_warden_3: linocutAlternate('workingPaws', 11),
  mk_dylan_river_otter_4: linocutAlternate('workingPaws', 12, { foil: true }),
  mk_biff_beat_constable_2: linocutAlternate('workingPaws', 13),
  mk_mildred_counter_clerk_0: linocutAlternate('workingPaws', 14),
  mk_mimi_trolley_service_0: linocutAlternate('workingPaws', 15),

  mk_beans_coffee_break: linocutAlternate('boroughRituals', 0),
  mk_clovers_potato_experiment: linocutAlternate('boroughRituals', 1),
  mk_comets_countdown: linocutAlternate('boroughRituals', 2),
  mk_inkwells_late_shift: linocutAlternate('boroughRituals', 3),
  mk_open_mic_night: linocutAlternate('boroughRituals', 4),
  mk_hedge_apothecary: linocutAlternate('boroughRituals', 5),
  mk_fair_hearing: linocutAlternate('boroughRituals', 6),
  mk_dx_open_hiring: linocutAlternate('boroughRituals', 7),
  mk_oatmeals_benefit_night: linocutAlternate('boroughRituals', 8),
  mk_warren_muster: linocutAlternate('boroughRituals', 9),
  mk_night_round: linocutAlternate('boroughRituals', 10, { foil: true }),
  mk_guild_night: linocutAlternate('boroughRituals', 11),
  mk_sages_star_party: linocutAlternate('boroughRituals', 12),
  mk_the_cider_social: linocutAlternate('boroughRituals', 13),
  mk_reading_lanterns: linocutAlternate('boroughRituals', 14),
  mk_community_bonfire: linocutAlternate('boroughRituals', 15),

  mk_beck_bylaw_reader_1: Object.freeze({ foil: true }),
  mk_clover_seedling_helper_0: inkAlternate('kindness', 2, { foil: true }),
  mk_earl_tea_trader_2: Object.freeze({ foil: true }),
  mk_velvet_counter_clerk_1: Object.freeze({ foil: true }),
  mk_moss_rehiring_day: inkAlternate('kindness', 8, { foil: true }),
  mk_comet_astronaut_5: inkAlternate('ambitions', 3, { foil: true }),
  mk_willow_ferry_trader_1: Object.freeze({ foil: true }),
  mk_faustus_costumier_2: Object.freeze({ foil: true }),
  mk_willow_tide_reckoner_3: Object.freeze({ foil: true }),

  // Hexagon Foil printings added after the first release; all use the ordinary artwork.
  mk_adam_road_mender_1: Object.freeze({ foil: true }),
  mk_beck_ward_clerk_2: Object.freeze({ foil: true }),
  mk_benjamin_master_lantern_maker_4: Object.freeze({ foil: true }),
  mk_cassadee_hall_manager_3: Object.freeze({ foil: true }),
  mk_cookie_winter_stores_cook_3: Object.freeze({ foil: true }),
  mk_daniel_star_charter_3: inkAlternate('ambitions', 7, { foil: true }),
  mk_faustus_bolt_boy_0: Object.freeze({ foil: true }),
  mk_hazel_guildmaster_3: Object.freeze({ foil: true }),
  mk_lindsay_potting_helper_0: Object.freeze({ foil: true }),

  // The second, chosen set of 35 foils (docs/SECOND_FOILS.md). Cards from it that already had an
  // alternate-art entry carry their `foil: true` in the collections above instead of here.
  // Ten of the cutest cards, given artwork foil.
  mk_osh_sharpener_s_boy_0: Object.freeze({ foil: true }),
  mk_marmalade_dough_kneader_1: Object.freeze({ foil: true }),
  mk_quill_orchard_hand_0: Object.freeze({ foil: true }),
  mk_lindsay_herb_grower_3: Object.freeze({ foil: true }),
  mk_cookie_biscuit_maker_0: Object.freeze({ foil: true }),

  // Ten of the coolest cards, given reverse foil.
  mk_morty_steam_engineer_4: Object.freeze({ foil: true }),
  mk_yellow_freshest_thing_4: Object.freeze({ foil: true }),
  mk_dx_solar_eclipse: Object.freeze({ foil: true }),
  mk_moss_rocketwright_4: Object.freeze({ foil: true }),

  // Ten of the most underrated cards, given full-card foil.
  mk_cassadee_the_only_one_at_the_back_1: Object.freeze({ foil: true }),
  mk_abigail_standing_slot_5: Object.freeze({ foil: true }),
  mk_fred_backstage_crew_3: Object.freeze({ foil: true }),
  mk_ned_the_ward_roll_0: Object.freeze({ foil: true }),
  mk_kevin_counter_hand_2: Object.freeze({ foil: true }),
  mk_hibiscus_the_sorting_bench_0: Object.freeze({ foil: true }),
  mk_sota_the_same_bench_4: Object.freeze({ foil: true }),
  mk_peter_washing_up_1: Object.freeze({ foil: true }),

  // Five cards with a detail worth shining, given a masked detail foil.
  mk_sage_astronomer_3: Object.freeze({ foil: true }),
  mk_liz_weighbridge_keeper_4: Object.freeze({ foil: true }),
  mk_mandee_weather_watcher_2: Object.freeze({ foil: true }),
});

/** The conventional home of a printing's painting: assets/art/versions/<cardId>/<slot>.png */
export function versionAssetUrl(cardId, slot) {
  return new URL(`../../assets/art/versions/${cardId}/${slot}.png`, import.meta.url).href;
}

export function version(key) {
  return BY_KEY[key] || BY_KEY.regular;
}

/** The painting a printing of this card uses, or null when it uses the card's ordinary art. */
export function versionArtUrl(def, key) {
  const v = version(key);
  if (!def || !v.art) return null;
  if (v.art === 'fullCardArt') return fullArtFor(def)?.url || null;
  const declared = Object.hasOwn(PRINTINGS, def.id) ? PRINTINGS[def.id][v.art] : undefined;
  if (declared === undefined || declared === false) return null;
  return typeof declared === 'string' ? declared : versionAssetUrl(def.id, v.art);
}

/** Does this card exist in this printing? */
export function hasVersion(def, key) {
  const v = BY_KEY[key];
  if (!def || !v) return false;
  if (key === 'regular') return true;
  if (key === 'fullCardArt') return !!fullArtFor(def);
  const printed = Object.hasOwn(PRINTINGS, def.id) ? PRINTINGS[def.id] : null;
  if (!printed || !printed[key]) return false;
  // A printing that needs a painting of its own is not real until the painting is there.
  return !v.art || !!versionArtUrl(def, key);
}

/** Every printing this card exists in, in collection order. Never empty: `regular` is always there. */
export function versionsOf(def) {
  return VERSIONS.filter((v) => hasVersion(def, v.key));
}

/**
 * The printing a card is shown in when nothing asks for one in particular: its Full Card Art if it
 * has one, and the regular printing otherwise. This is what the table has always shown, so the game
 * itself is unchanged by any of this.
 */
export function defaultVersionKey(def) {
  return def && fullArtFor(def) ? 'fullCardArt' : 'regular';
}

/** Resolve a requested printing down to one this card actually has. */
export function resolveVersionKey(def, key) {
  if (key && hasVersion(def, key)) return key;
  return defaultVersionKey(def);
}

/** How many cards exist in a given printing — what the Book counts on its printing chips. */
export function countInVersion(cards, key) {
  // Counted by the painting rather than by the registry key: a card is in the Full Card Art
  // printing when there is a painting for it, whatever the registry says about other printings.
  if (key === 'fullCardArt') return cards.filter((c) => !!fullArtFor(c)).length;
  return cards.filter((c) => hasVersion(c, key)).length;
}
