// Shared painted archetypes. Card identity and rules always come from the card set.
// Coordinates refer to the unmodified 4 × 4 atlases; new species keep their vector art. A card may
// name its painting with `art: { atlas: <bundled atlas name>, tile: 0..15 }`;
// otherwise the original species/theme selection applies. Only bundled atlases resolve.
import { fullArtFor } from './full-art.js';
import { resolveVersionKey, version as versionOf, versionArtUrl } from './versions.js';

export const PAINTED_ATLAS_URL = new URL('../../assets/art/boroughs-atlas.png', import.meta.url).href;
export const WHISKERWOOD_ATLAS_URL = new URL('../../assets/art/whiskerwood-atlas.png', import.meta.url).href;
export const NEIGHBORS_ATLAS_URL = new URL('../../assets/art/neighbors-atlas.png', import.meta.url).href;
export const MONUMENTS_ATLAS_URL = new URL('../../assets/art/monuments-atlas.png', import.meta.url).href;
export const TOWNLIFE_ATLAS_URL = new URL('../../assets/art/townlife-atlas.png', import.meta.url).href;
export const CAPITAL_ATLAS_URL = new URL('../../assets/art/capital-atlas.png', import.meta.url).href;
export const NIGHTWORKERS_ATLAS_URL = new URL('../../assets/art/nightworkers-atlas.png', import.meta.url).href;
export const NIGHTSKIES_ATLAS_URL = new URL('../../assets/art/nightskies-atlas.png', import.meta.url).href;
export const MAKER_BOROUGH_ATLAS_URL = new URL('../../assets/art/maker-borough-atlas.png', import.meta.url).href;
export const MAKER_FIELD_ATLAS_URL = new URL('../../assets/art/maker-field-atlas.png', import.meta.url).href;
export const MAKER_WOODLAND_ATLAS_URL = new URL('../../assets/art/maker-woodland-atlas.png', import.meta.url).href;
export const MAKER_NIGHT_ATLAS_URL = new URL('../../assets/art/maker-night-atlas.png', import.meta.url).href;
export const MAKER_CIVIC_ATLAS_URL = new URL('../../assets/art/maker-civic-atlas.png', import.meta.url).href;
export const MAKER_HARVEST_ATLAS_URL = new URL('../../assets/art/maker-harvest-atlas.png', import.meta.url).href;
export const MAKER_WORKSHOP_ATLAS_URL = new URL('../../assets/art/maker-workshop-atlas.png', import.meta.url).href;
export const MAKER_PLACES_ATLAS_URL = new URL('../../assets/art/maker-places-atlas.png', import.meta.url).href;
export const MAKER_TOKENS_ATLAS_URL = new URL('../../assets/art/maker-tokens-atlas.png', import.meta.url).href;
export const MAKER_BAKERY_LIBRARY_ATLAS_URL = new URL('../../assets/art/maker-bakery-library-atlas.png', import.meta.url).href;
export const MAKER_RECORDS_ROOTS_ATLAS_URL = new URL('../../assets/art/maker-records-roots-atlas.png', import.meta.url).href;
export const MAKER_ROLES_ATLAS_URL = new URL('../../assets/art/maker-roles-atlas.png', import.meta.url).href;
export const MAKER_LEDGERS_LAMPLIGHT_ATLAS_URL = new URL('../../assets/art/maker-ledgers-lamplight-atlas.png', import.meta.url).href;
export const MAKER_GARDENS_POST_ATLAS_URL = new URL('../../assets/art/maker-gardens-post-atlas.png', import.meta.url).href;
export const MAKER_MASKED_HANDS_ATLAS_URL = new URL('../../assets/art/maker-masked-hands-atlas.png', import.meta.url).href;
export const MAKER_STAGE_COUNTER_ATLAS_URL = new URL('../../assets/art/maker-stage-counter-atlas.png', import.meta.url).href;
export const MAKER_SPECIES_CORRECTIONS_ATLAS_URL = new URL('../../assets/art/maker-species-corrections-atlas.png', import.meta.url).href;
export const MAKER_WORKING_LIVES_ATLAS_URL = new URL('../../assets/art/maker-working-lives-atlas.png', import.meta.url).href;
export const MAKER_NIGHT_STORIES_ATLAS_URL = new URL('../../assets/art/maker-night-stories-atlas.png', import.meta.url).href;
export const MAKER_LANTERN_FIELD_ATLAS_URL = new URL('../../assets/art/maker-lantern-field-atlas.png', import.meta.url).href;
const SPECIES_TILE = { Rabbit: 0, Mouse: 1, Fox: 2, Raccoon: 3, Hedgehog: 4, Badger: 5, Otter: 6, Squirrel: 7 };
const ATLASES = {
  boroughs: () => PAINTED_ATLAS_URL,
  whiskerwood: () => WHISKERWOOD_ATLAS_URL,
  neighbors: () => NEIGHBORS_ATLAS_URL,
  monuments: () => MONUMENTS_ATLAS_URL,
  townlife: () => TOWNLIFE_ATLAS_URL,
  capital: () => CAPITAL_ATLAS_URL,
  nightworkers: () => NIGHTWORKERS_ATLAS_URL,
  nightskies: () => NIGHTSKIES_ATLAS_URL,
  makerborough: () => MAKER_BOROUGH_ATLAS_URL,
  makerfield: () => MAKER_FIELD_ATLAS_URL,
  makerwoodland: () => MAKER_WOODLAND_ATLAS_URL,
  makernight: () => MAKER_NIGHT_ATLAS_URL,
  makercivic: () => MAKER_CIVIC_ATLAS_URL,
  makerharvest: () => MAKER_HARVEST_ATLAS_URL,
  makerworkshop: () => MAKER_WORKSHOP_ATLAS_URL,
  makerplaces: () => MAKER_PLACES_ATLAS_URL,
  makertokens: () => MAKER_TOKENS_ATLAS_URL,
  makerbakerylibrary: () => MAKER_BAKERY_LIBRARY_ATLAS_URL,
  makerrecordsroots: () => MAKER_RECORDS_ROOTS_ATLAS_URL,
  makerroles: () => MAKER_ROLES_ATLAS_URL,
  makerledgerslamplight: () => MAKER_LEDGERS_LAMPLIGHT_ATLAS_URL,
  makergardenspost: () => MAKER_GARDENS_POST_ATLAS_URL,
  makermaskedhands: () => MAKER_MASKED_HANDS_ATLAS_URL,
  makerstagecounter: () => MAKER_STAGE_COUNTER_ATLAS_URL,
  makerspeciescorrections: () => MAKER_SPECIES_CORRECTIONS_ATLAS_URL,
  makerworkinglives: () => MAKER_WORKING_LIVES_ATLAS_URL,
  makernightstories: () => MAKER_NIGHT_STORIES_ATLAS_URL,
  makerlanternfield: () => MAKER_LANTERN_FIELD_ATLAS_URL,
};

// Presentation-only corrections for Maker shelf cards. Keeping these assignments here lets the
// Maker set remain an authoring document while the shared card renderer gives each selected card
// its commissioned scene. Tiles are zero-based and row-major.
export const MAKER_ART_TILES = Object.freeze({
  mk_peanut_ledger_0: { atlas: 'makerborough', tile: 0 },
  mk_peanut_accountant_2: { atlas: 'makerborough', tile: 1 },
  mk_peanut_cafe_manager_4: { atlas: 'makerborough', tile: 2 },
  mk_peanut_comptroller_5: { atlas: 'makerborough', tile: 3 },
  mk_peanuts_standing_round: { atlas: 'makerborough', tile: 4 },
  mk_oatmeal_ward_clerk_1: { atlas: 'makerborough', tile: 5 },
  mk_oatmeal_safety_inspector_2: { atlas: 'makerborough', tile: 6 },
  mk_oatmeal_town_warden_4: { atlas: 'makerborough', tile: 7 },
  mk_oatmeal_alderman_5: { atlas: 'makerborough', tile: 8 },
  mk_berry_tinker_0: { atlas: 'makerborough', tile: 9 },
  mk_berry_committee_2: { atlas: 'makerborough', tile: 10 },
  mk_berry_engineer_3: { atlas: 'makerborough', tile: 11 },
  mk_berry_workshop_elder_4: { atlas: 'makerborough', tile: 12 },
  mk_berry_guild_warden_5: { atlas: 'makerborough', tile: 13 },
  mk_fair_hearing: { atlas: 'makerborough', tile: 14 },
  mk_dx_tax_assessors: { atlas: 'makerborough', tile: 15 },

  mk_brooke_dock_hand_1: { atlas: 'makerfield', tile: 0 },
  mk_brooke_ferry_hand_2: { atlas: 'makerfield', tile: 1 },
  mk_brooke_regatta_caller_3: { atlas: 'makerfield', tile: 2 },
  mk_brooke_riverwright_5: { atlas: 'makerfield', tile: 3 },
  mk_betty_barn_sweeper_0: { atlas: 'makerfield', tile: 4 },
  mk_betty_whittler_1: { atlas: 'makerfield', tile: 5 },
  mk_betty_stump_blaster_2: { atlas: 'makerfield', tile: 6 },
  mk_betty_powder_chemist_4: { atlas: 'makerfield', tile: 7 },
  mk_betty_land_clearer_5: { atlas: 'makerfield', tile: 8 },
  mk_clover_seedling_helper_0: { atlas: 'makerfield', tile: 9 },
  mk_clover_market_gardener_2: { atlas: 'makerfield', tile: 10 },
  mk_clover_community_gardener_3: { atlas: 'makerfield', tile: 11 },
  mk_clover_master_botanist_5: { atlas: 'makerfield', tile: 12 },
  mk_slack_water: { atlas: 'makerfield', tile: 13 },
  mk_dx_open_hiring: { atlas: 'makerfield', tile: 14 },
  mk_tb_allotment_strip: { atlas: 'makerfield', tile: 15 },

  mk_copper_penny_counter_0: { atlas: 'makerwoodland', tile: 0 },
  mk_copper_scale_polisher_1: { atlas: 'makerwoodland', tile: 1 },
  mk_copper_weights_inspector_2: { atlas: 'makerwoodland', tile: 2 },
  mk_copper_arcade_merchant_3: { atlas: 'makerwoodland', tile: 3 },
  mk_copper_market_steward_5: { atlas: 'makerwoodland', tile: 4 },
  mk_rosabeth_herb_gatherer_0: { atlas: 'makerwoodland', tile: 5 },
  mk_rosabeth_tincture_maker_2: { atlas: 'makerwoodland', tile: 6 },
  mk_rosabeth_herbalist_physician_5: { atlas: 'makerwoodland', tile: 7 },
  mk_bella_forager_0: { atlas: 'makerwoodland', tile: 8 },
  mk_bella_field_scientist_1: { atlas: 'makerwoodland', tile: 9 },
  mk_bella_field_recorder_2: { atlas: 'makerwoodland', tile: 10 },
  mk_bella_wildlife_warden_3: { atlas: 'makerwoodland', tile: 11 },
  mk_bella_ecologist_5: { atlas: 'makerwoodland', tile: 12 },
  mk_tb_coppers_cellar: { atlas: 'makerwoodland', tile: 13 },
  mk_tb_rosabeths_gate: { atlas: 'makerwoodland', tile: 14 },
  mk_tb_berrys_bench: { atlas: 'makerwoodland', tile: 15 },

  mk_finn_auctioneers_boy_0: { atlas: 'makernight', tile: 0 },
  mk_finn_peddler_1: { atlas: 'makernight', tile: 1 },
  mk_finn_fair_warden_3: { atlas: 'makernight', tile: 2 },
  mk_finn_trade_broker_4: { atlas: 'makernight', tile: 3 },
  mk_hazel_barrow_hand_0: { atlas: 'makernight', tile: 4 },
  mk_hazel_night_market_vendor_1: { atlas: 'makernight', tile: 5 },
  mk_hazel_market_vendor_2: { atlas: 'makernight', tile: 6 },
  mk_hazel_guildmaster_3: { atlas: 'makernight', tile: 7 },
  mk_hazel_merchant_5: { atlas: 'makernight', tile: 8 },
  mk_inkwell_astronomer_4: { atlas: 'makernight', tile: 9 },
  mk_juniper_ward_councillor_3: { atlas: 'makernight', tile: 10 },
  mk_juniper_diplomat_4: { atlas: 'makernight', tile: 11 },
  mk_juniper_stargazer_5: { atlas: 'makernight', tile: 12 },
  mk_tb_open_mic_room: { atlas: 'makernight', tile: 13 },
  mk_tb_boat_shed: { atlas: 'makernight', tile: 14 },
  mk_tb_gate_hut: { atlas: 'makernight', tile: 15 },

  mk_peanut_barista_1: { atlas: 'makercivic', tile: 0 },
  mk_oatmeal_jazz_singer_3: { atlas: 'makercivic', tile: 1 },
  mk_biff_cadet_constable_0: { atlas: 'makercivic', tile: 2 },
  mk_copper_cellar_keeper_4: { atlas: 'makercivic', tile: 3 },
  mk_bella_science_hall_fellow_4: { atlas: 'makercivic', tile: 4 },
  mk_hazel_market_committee_chair_4: { atlas: 'makercivic', tile: 5 },
  mk_beck_ward_clerk_2: { atlas: 'makercivic', tile: 6 },
  mk_beck_keeper_of_the_ward_book_5: { atlas: 'makercivic', tile: 7 },
  mk_beck_candlelight_reader_4: { atlas: 'makercivic', tile: 8 },
  mk_ned_ward_recorder_3: { atlas: 'makercivic', tile: 9 },
  mk_cassadee_stage_hand_0: { atlas: 'makercivic', tile: 10 },
  mk_cassadee_hall_manager_3: { atlas: 'makercivic', tile: 11 },
  mk_andrew_night_copyist_0: { atlas: 'makercivic', tile: 12 },
  mk_andrew_keeper_of_the_late_desk_2: { atlas: 'makercivic', tile: 13 },
  mk_bean_proprietor_5: { atlas: 'makercivic', tile: 14 },
  mk_bld_long_room: { atlas: 'makercivic', tile: 15 },

  mk_brooke_mooring_hand_0: { atlas: 'makerharvest', tile: 0 },
  mk_clover_plot_sharer_1: { atlas: 'makerharvest', tile: 1 },
  mk_rosabeth_garden_hand_1: { atlas: 'makerharvest', tile: 2 },
  mk_maribel_seed_sorter_0: { atlas: 'makerharvest', tile: 3 },
  mk_maribel_horticulturist_4: { atlas: 'makerharvest', tile: 4 },
  mk_marmalade_oven_keeper_4: { atlas: 'makerharvest', tile: 5 },
  mk_morty_mill_kitchen_cook_1: { atlas: 'makerharvest', tile: 6 },
  mk_morty_grain_miller_2: { atlas: 'makerharvest', tile: 7 },
  mk_peter_hedge_cutter_0: { atlas: 'makerharvest', tile: 8 },
  mk_peter_hedgelayer_3: { atlas: 'makerharvest', tile: 9 },
  mk_liz_scale_hand_1: { atlas: 'makerharvest', tile: 10 },
  mk_liz_weighbridge_keeper_4: { atlas: 'makerharvest', tile: 11 },
  mk_taco_cart_cook_1: { atlas: 'makerharvest', tile: 12 },
  mk_taco_quayside_cook_3: { atlas: 'makerharvest', tile: 13 },
  mk_cookie_biscuit_maker_0: { atlas: 'makerharvest', tile: 14 },
  mk_cookie_winter_stores_cook_3: { atlas: 'makerharvest', tile: 15 },

  mk_betty_firework_maker_3: { atlas: 'makerworkshop', tile: 0 },
  mk_comet_bolt_sorter_0: { atlas: 'makerworkshop', tile: 1 },
  mk_lynnette_press_feeder_2: { atlas: 'makerworkshop', tile: 2 },
  mk_moss_toolsmith_2: { atlas: 'makerworkshop', tile: 3 },
  mk_moss_bridgewright_5: { atlas: 'makerworkshop', tile: 4 },
  mk_moss_timber_hand_0: { atlas: 'makerworkshop', tile: 5 },
  mk_daniel_chart_copier_1: { atlas: 'makerworkshop', tile: 6 },
  mk_osh_sharpener_s_boy_0: { atlas: 'makerworkshop', tile: 7 },
  mk_osh_edge_grinder_2: { atlas: 'makerworkshop', tile: 8 },
  mk_adam_road_mender_1: { atlas: 'makerworkshop', tile: 9 },
  mk_adam_surveyor_of_ways_4: { atlas: 'makerworkshop', tile: 10 },
  mk_annabelle_paper_sorter_0: { atlas: 'makerworkshop', tile: 11 },
  mk_annabelle_salvage_archivist_3: { atlas: 'makerworkshop', tile: 12 },
  mk_sota_lens_grinder_1: { atlas: 'makerworkshop', tile: 13 },
  mk_sota_telescope_fitter_3: { atlas: 'makerworkshop', tile: 14 },
  mk_bld_guild_hall: { atlas: 'makerworkshop', tile: 15 },

  mk_barrows_measure: { atlas: 'makerplaces', tile: 0 },
  mk_biffs_beat: { atlas: 'makerplaces', tile: 1 },
  mk_rosabeths_rounds: { atlas: 'makerplaces', tile: 2 },
  mk_oatmeals_benefit_night: { atlas: 'makerplaces', tile: 3 },
  mk_coppers_stocktake: { atlas: 'makerplaces', tile: 4 },
  mk_warren_muster: { atlas: 'makerplaces', tile: 5 },
  mk_night_round: { atlas: 'makerplaces', tile: 6 },
  mk_bins_at_dawn: { atlas: 'makerplaces', tile: 7 },
  mk_guild_night: { atlas: 'makerplaces', tile: 8 },
  mk_hall_lecture: { atlas: 'makerplaces', tile: 9 },
  mk_ledger_day: { atlas: 'makerplaces', tile: 10 },
  mk_tb_barrows_yard: { atlas: 'makerplaces', tile: 11 },
  mk_tb_the_warren: { atlas: 'makerplaces', tile: 12 },
  mk_tb_observatory_steps: { atlas: 'makerplaces', tile: 13 },
  mk_tb_counting_house: { atlas: 'makerplaces', tile: 14 },
  mk_tb_quill_wall: { atlas: 'makerplaces', tile: 15 },

  mk_tok_rabbit: { atlas: 'makertokens', tile: 0 },
  mk_tok_mouse: { atlas: 'makertokens', tile: 1 },
  mk_tok_hedgehog: { atlas: 'makertokens', tile: 2 },
  mk_tok_badger: { atlas: 'makertokens', tile: 3 },
  mk_tok_otter: { atlas: 'makertokens', tile: 4 },
  mk_tok_squirrel: { atlas: 'makertokens', tile: 5 },
  mk_tok_cat: { atlas: 'makertokens', tile: 6 },
  mk_tok_owl: { atlas: 'makertokens', tile: 7 },
  mk_tok_fox: { atlas: 'makertokens', tile: 8 },
  mk_tok_raccoon: { atlas: 'makertokens', tile: 9 },
  mk_tok_agriculture: { atlas: 'makertokens', tile: 10 },
  mk_tok_civics: { atlas: 'makertokens', tile: 11 },
  mk_tok_commerce: { atlas: 'makertokens', tile: 12 },
  mk_tok_crafts: { atlas: 'makertokens', tile: 13 },
  mk_tok_lore: { atlas: 'makertokens', tile: 14 },
  mk_tok_science: { atlas: 'makertokens', tile: 15 },

  mk_tok_food: { atlas: 'makerbakerylibrary', tile: 0 },
  mk_tok_entertainment: { atlas: 'makerbakerylibrary', tile: 1 },
  mk_tok_building: { atlas: 'makerbakerylibrary', tile: 2 },
  mk_marmalade_night_baker_0: { atlas: 'makerbakerylibrary', tile: 3 },
  mk_marmalade_dough_kneader_1: { atlas: 'makerbakerylibrary', tile: 4 },
  mk_marmalade_market_baker_2: { atlas: 'makerbakerylibrary', tile: 5 },
  mk_marmalade_neighborhood_baker_3: { atlas: 'makerbakerylibrary', tile: 6 },
  mk_marmalade_harvest_head_baker_5: { atlas: 'makerbakerylibrary', tile: 7 },
  mk_fresh_batch: { atlas: 'makerbakerylibrary', tile: 8 },
  mk_mkt_community_oven: { atlas: 'makerbakerylibrary', tile: 9 },
  mk_inkwell_bookmark_keeper_1: { atlas: 'makerbakerylibrary', tile: 10 },
  mk_inkwell_storyteller_2: { atlas: 'makerbakerylibrary', tile: 11 },
  mk_inkwell_night_librarian_3: { atlas: 'makerbakerylibrary', tile: 12 },
  mk_inkwell_keeper_of_stories_5: { atlas: 'makerbakerylibrary', tile: 13 },
  mk_inkwells_late_shift: { atlas: 'makerbakerylibrary', tile: 14 },
  mk_lynnette_night_printer_0: { atlas: 'makerbakerylibrary', tile: 15 },

  mk_lynnette_bookbinder_1: { atlas: 'makerrecordsroots', tile: 0 },
  mk_lynnette_lending_librarian_3: { atlas: 'makerrecordsroots', tile: 1 },
  mk_lynnette_master_printer_5: { atlas: 'makerrecordsroots', tile: 2 },
  mk_maribel_seed_keeper_1: { atlas: 'makerrecordsroots', tile: 3 },
  mk_maribel_seed_bank_clerk_2: { atlas: 'makerrecordsroots', tile: 4 },
  mk_maribel_seed_vault_scientist_3: { atlas: 'makerrecordsroots', tile: 5 },
  mk_maribel_seed_bank_director_5: { atlas: 'makerrecordsroots', tile: 6 },
  mk_daniel_ink_mixer_0: { atlas: 'makerrecordsroots', tile: 7 },
  mk_daniel_canal_cartographer_2: { atlas: 'makerrecordsroots', tile: 8 },
  mk_daniel_star_charter_3: { atlas: 'makerrecordsroots', tile: 9 },
  mk_daniel_master_cartographer_4: { atlas: 'makerrecordsroots', tile: 10 },
  mk_ned_page_runner_1: { atlas: 'makerrecordsroots', tile: 11 },
  mk_ned_night_archivist_2: { atlas: 'makerrecordsroots', tile: 12 },
  mk_ned_reference_librarian_4: { atlas: 'makerrecordsroots', tile: 13 },
  mk_ned_chancellor_of_records_5: { atlas: 'makerrecordsroots', tile: 14 },
  mk_daisy_petal_sweeper_0: { atlas: 'makerrecordsroots', tile: 15 },

  mk_daisy_bouquet_weaver_2: { atlas: 'makerroles', tile: 0 },
  mk_daisy_night_bloom_florist_3: { atlas: 'makerroles', tile: 1 },
  mk_daisy_festival_florist_4: { atlas: 'makerroles', tile: 2 },
  mk_bean_espresso_1: { atlas: 'makerroles', tile: 3 },
  mk_bean_barista_3: { atlas: 'makerroles', tile: 4 },
  mk_beans_coffee_break: { atlas: 'makerroles', tile: 5 },
  mk_biff_beat_constable_2: { atlas: 'makerroles', tile: 6 },
  mk_biff_chief_constable_4: { atlas: 'makerroles', tile: 7 },
  mk_bob_gate_attendant_4: { atlas: 'makerroles', tile: 8 },
  mk_clover_rocket_botanist_4: { atlas: 'makerroles', tile: 9 },
  mk_clovers_potato_experiment: { atlas: 'makerroles', tile: 10 },
  mk_comet_astronaut_5: { atlas: 'makerroles', tile: 11 },
  mk_one_small_step: { atlas: 'makerroles', tile: 12 },
  mk_juniper_messenger_1: { atlas: 'makerroles', tile: 13 },
  mk_juniper_courier_captain_2: { atlas: 'makerroles', tile: 14 },
  mk_brooke_balloonist_4: { atlas: 'makerroles', tile: 15 },

  mk_orien_tally_clerk_0: { atlas: 'makerledgerslamplight', tile: 0 },
  mk_orien_rate_checker_2: { atlas: 'makerledgerslamplight', tile: 1 },
  mk_orien_borough_actuary_3: { atlas: 'makerledgerslamplight', tile: 2 },
  mk_orien_survey_computer_4: { atlas: 'makerledgerslamplight', tile: 3 },
  mk_orien_town_planner_5: { atlas: 'makerledgerslamplight', tile: 4 },
  mk_roger_locksmith_1: { atlas: 'makerledgerslamplight', tile: 5 },
  mk_roger_records_clerk_2: { atlas: 'makerledgerslamplight', tile: 6 },
  mk_roger_circuit_judge_3: { atlas: 'makerledgerslamplight', tile: 7 },
  mk_roger_fair_broker_4: { atlas: 'makerledgerslamplight', tile: 8 },
  mk_roger_ombudsman_5: { atlas: 'makerledgerslamplight', tile: 9 },
  mk_quinn_meeting_scribe_1: { atlas: 'makerledgerslamplight', tile: 10 },
  mk_quinn_town_scrivener_3: { atlas: 'makerledgerslamplight', tile: 11 },
  mk_quinn_keeper_of_the_record_5: { atlas: 'makerledgerslamplight', tile: 12 },
  mk_beck_bylaw_reader_1: { atlas: 'makerledgerslamplight', tile: 13 },
  mk_beck_lamplighters_clerk_3: { atlas: 'makerledgerslamplight', tile: 14 },
  mk_berry_clockmaker_1: { atlas: 'makerledgerslamplight', tile: 15 },

  mk_lindsay_potting_helper_0: { atlas: 'makergardenspost', tile: 0 },
  mk_lindsay_glasshouse_hand_2: { atlas: 'makergardenspost', tile: 1 },
  mk_lindsay_herb_grower_3: { atlas: 'makergardenspost', tile: 2 },
  mk_lindsay_conservatory_keeper_4: { atlas: 'makergardenspost', tile: 3 },
  mk_lindsay_moon_gardener_5: { atlas: 'makergardenspost', tile: 4 },
  mk_hibiscus_post_runner_1: { atlas: 'makergardenspost', tile: 5 },
  mk_hibiscus_night_mail_2: { atlas: 'makergardenspost', tile: 6 },
  mk_hibiscus_round_walker_3: { atlas: 'makergardenspost', tile: 7 },
  mk_hibiscus_mail_coach_driver_4: { atlas: 'makergardenspost', tile: 8 },
  mk_hibiscus_postmaster_5: { atlas: 'makergardenspost', tile: 9 },
  mk_quill_orchard_hand_0: { atlas: 'makergardenspost', tile: 10 },
  mk_quill_orchard_keeper_2: { atlas: 'makergardenspost', tile: 11 },
  mk_quill_cider_maker_3: { atlas: 'makergardenspost', tile: 12 },
  mk_quill_orchard_scribe_4: { atlas: 'makergardenspost', tile: 13 },
  mk_quill_harvest_steward_5: { atlas: 'makergardenspost', tile: 14 },
  mk_willow_ferry_trader_1: { atlas: 'makergardenspost', tile: 15 },

  mk_masked_otter_counter_hand_1: { atlas: 'makermaskedhands', tile: 0 },
  mk_mysterious_raccoon_beds_hand_2: { atlas: 'makermaskedhands', tile: 1 },
  mk_hooded_rabbit_hatch_hand_0: { atlas: 'makermaskedhands', tile: 2 },
  mk_unsigned_mouse_shelves_hand_1: { atlas: 'makermaskedhands', tile: 3 },
  mk_shrouded_badger_bench_hand_2: { atlas: 'makermaskedhands', tile: 4 },
  mk_muffled_hedgehog_stall_hand_0: { atlas: 'makermaskedhands', tile: 5 },
  mk_shadowed_squirrel_hall_hand_1: { atlas: 'makermaskedhands', tile: 6 },
  mk_nameless_cat_glass_hand_2: { atlas: 'makermaskedhands', tile: 7 },
  mk_silhouetted_owl_scales_hand_0: { atlas: 'makermaskedhands', tile: 8 },
  mk_cowled_fox_far_field_hand_1: { atlas: 'makermaskedhands', tile: 9 },
  mk_unlisted_grower_2: { atlas: 'makermaskedhands', tile: 10 },
  mk_faceless_clerk_0: { atlas: 'makermaskedhands', tile: 11 },
  mk_cloaked_tradesman_1: { atlas: 'makermaskedhands', tile: 12 },
  mk_veiled_wright_0: { atlas: 'makermaskedhands', tile: 13 },
  mk_anonymous_scribe_2: { atlas: 'makermaskedhands', tile: 14 },
  mk_obscured_observer_1: { atlas: 'makermaskedhands', tile: 15 },

  mk_gwen_short_order_cook_1: { atlas: 'makerstagecounter', tile: 0 },
  mk_gwen_diner_keeper_3: { atlas: 'makerstagecounter', tile: 1 },
  mk_gwen_owner_of_the_diner_5: { atlas: 'makerstagecounter', tile: 2 },
  mk_liza_floor_singer_0: { atlas: 'makerstagecounter', tile: 3 },
  mk_liza_counter_singer_1: { atlas: 'makerstagecounter', tile: 4 },
  mk_liza_top_of_the_bill_3: { atlas: 'makerstagecounter', tile: 5 },
  mk_liza_headliner_5: { atlas: 'makerstagecounter', tile: 6 },
  mk_harrison_piano_boy_0: { atlas: 'makerstagecounter', tile: 7 },
  mk_harrison_house_pianist_2: { atlas: 'makerstagecounter', tile: 8 },
  mk_harrison_band_leader_4: { atlas: 'makerstagecounter', tile: 9 },
  mk_gabe_corner_show_0: { atlas: 'makerstagecounter', tile: 10 },
  mk_gabe_puppet_maker_2: { atlas: 'makerstagecounter', tile: 11 },
  mk_gabe_company_of_one_4: { atlas: 'makerstagecounter', tile: 12 },
  mk_gabe_whole_cast_5: { atlas: 'makerstagecounter', tile: 13 },
  mk_faustus_wardrobe_master_4: { atlas: 'makerstagecounter', tile: 14 },
  mk_roger_fair_day_judge_0: { atlas: 'makerstagecounter', tile: 15 },

  mk_unknown_cook_0: { atlas: 'makerspeciescorrections', tile: 0 },
  mk_curtained_performer_2: { atlas: 'makerspeciescorrections', tile: 1 },
  mk_cookie_rusk_baker_1: { atlas: 'makerspeciescorrections', tile: 2 },
  mk_liz_plate_clerk_0: { atlas: 'makerspeciescorrections', tile: 3 },
  mk_sota_the_same_bench_4: { atlas: 'makerspeciescorrections', tile: 4 },
  mk_thistle_at_the_back_0: { atlas: 'makerspeciescorrections', tile: 5 },
  mk_osh_fair_fiddler_3: { atlas: 'makerspeciescorrections', tile: 6 },
  mk_sage_frost_watch_2: { atlas: 'makerspeciescorrections', tile: 7 },
  mk_andrew_hand_copyist_3: { atlas: 'makerspeciescorrections', tile: 8 },
  mk_willow_the_harbour_office_0: { atlas: 'makerspeciescorrections', tile: 9 },
  mk_pockets_a_quiet_arrangement_5: { atlas: 'makerspeciescorrections', tile: 10 },
  mk_ned_the_ward_roll_0: { atlas: 'makerspeciescorrections', tile: 11 },
  mk_scott_the_index_1: { atlas: 'makerspeciescorrections', tile: 12 },
  mk_taco_the_four_oclock_cart_2: { atlas: 'makerspeciescorrections', tile: 13 },
  mk_annabelle_last_one_up_2: { atlas: 'makerspeciescorrections', tile: 14 },
  mk_peter_the_winters_length_2: { atlas: 'makerspeciescorrections', tile: 15 },

  mk_patch_salvage_sorter_2: { atlas: 'makerworkinglives', tile: 0 },
  mk_scott_natural_historian_4: { atlas: 'makerworkinglives', tile: 1 },
  mk_eric_row_farmer_3: { atlas: 'makerworkinglives', tile: 2 },
  mk_eric_row_boss_4: { atlas: 'makerworkinglives', tile: 3 },
  mk_eric_best_farmer_5: { atlas: 'makerworkinglives', tile: 4 },
  mk_kevin_counter_hand_2: { atlas: 'makerworkinglives', tile: 5 },
  mk_finn_griddle_hand_2: { atlas: 'makerworkinglives', tile: 6 },
  mk_comet_hatch_hand_2: { atlas: 'makerworkinglives', tile: 7 },
  mk_peter_washing_up_1: { atlas: 'makerworkinglives', tile: 8 },
  mk_adam_road_gang_2: { atlas: 'makerworkinglives', tile: 9 },
  mk_osh_round_sharpener_1: { atlas: 'makerworkinglives', tile: 10 },
  mk_bob_the_morning_they_share_1: { atlas: 'makerworkinglives', tile: 11 },
  mk_pockets_four_times_a_year_0: { atlas: 'makerworkinglives', tile: 12 },
  mk_hibiscus_the_sorting_bench_0: { atlas: 'makerworkinglives', tile: 13 },
  mk_oatmeal_sunday_table_0: { atlas: 'makerworkinglives', tile: 14 },
  mk_bob_gate_tolls_2: { atlas: 'makerworkinglives', tile: 15 },

  mk_beck_the_relief_roll_0: { atlas: 'makernightstories', tile: 0 },
  mk_patch_compost_yard_1: { atlas: 'makernightstories', tile: 1 },
  mk_gwen_anybodys_counter_2: { atlas: 'makernightstories', tile: 2 },
  mk_gwen_apron_on_the_hook_4: { atlas: 'makernightstories', tile: 3 },
  mk_liz_the_docket_3: { atlas: 'makernightstories', tile: 4 },
  mk_liz_chief_assessor_5: { atlas: 'makernightstories', tile: 5 },
  mk_sage_the_watch_list_4: { atlas: 'makernightstories', tile: 6 },
  mk_andrew_the_late_desk_4: { atlas: 'makernightstories', tile: 7 },
  mk_bean_the_early_shift_4: { atlas: 'makernightstories', tile: 8 },
  mk_jessica_the_night_school_3: { atlas: 'makernightstories', tile: 9 },
  mk_tuppence_sold_before_the_cart_4: { atlas: 'makernightstories', tile: 10 },
  mk_cassadee_the_only_one_at_the_back_1: { atlas: 'makernightstories', tile: 11 },
  mk_morty_the_boiler_test_0: { atlas: 'makernightstories', tile: 12 },
  mk_brett_counsel_5: { atlas: 'makernightstories', tile: 13 },
  mk_barnaby_night_auditor_4: { atlas: 'makernightstories', tile: 14 },
  mk_barrow_stonecutter_5: { atlas: 'makernightstories', tile: 15 },

  mk_benjamin_wick_trimmer_0: { atlas: 'makerlanternfield', tile: 0 },
  mk_benjamin_lantern_maker_2: { atlas: 'makerlanternfield', tile: 1 },
  mk_benjamin_town_historian_3: { atlas: 'makerlanternfield', tile: 2 },
  mk_benjamin_master_lantern_maker_4: { atlas: 'makerlanternfield', tile: 3 },
  mk_benjamin_keeper_of_the_light_5: { atlas: 'makerlanternfield', tile: 4 },
  mk_thistle_almanac_keeper_1: { atlas: 'makerlanternfield', tile: 5 },
  mk_thistle_field_hand_2: { atlas: 'makerlanternfield', tile: 6 },
  mk_thistle_grange_warden_3: { atlas: 'makerlanternfield', tile: 7 },
  mk_thistle_field_surveyor_4: { atlas: 'makerlanternfield', tile: 8 },
  mk_thistle_grange_elder_5: { atlas: 'makerlanternfield', tile: 9 },
  mk_earl_tea_boy_0: { atlas: 'makerlanternfield', tile: 10 },
  mk_earl_tea_trader_2: { atlas: 'makerlanternfield', tile: 11 },
  mk_earl_coffee_roaster_3: { atlas: 'makerlanternfield', tile: 12 },
  mk_earl_tea_house_keeper_4: { atlas: 'makerlanternfield', tile: 13 },
  mk_mandee_night_courier_1: { atlas: 'makerlanternfield', tile: 14 },
  mk_mittens_rooftop_cat_4: { atlas: 'makerlanternfield', tile: 15 },
});

function explicitArt(def) {
  const art = def && (MAKER_ART_TILES[def.id] || def.art);
  if (!art || !Object.hasOwn(ATLASES, art.atlas) || !Number.isInteger(art.tile) || art.tile < 0 || art.tile >= 16) return null;
  return art;
}

/** The explicit atlas tile a card asks for, or null when it leaves the choice to the theme rules. */
export function explicitTile(def) {
  return explicitArt(def)?.tile ?? null;
}

export function paintedTile(def) {
  if (!def) return null;
  const explicit = explicitTile(def);
  if (explicit !== null) return explicit;
  if (def.type === 'character') return SPECIES_TILE[def.species] ?? null;
  if (def.type === 'statue') return 15;
  const words = `${def.id || ''} ${def.name || ''}`.toLowerCase();
  if (def.type === 'disruption') return /winter|frost|storm|recession|landslide/.test(words) ? 11 : 13;
  if (def.type === 'event') {
    if (/harvest|patient|night|lantern/.test(words)) return 8;
    return /garden|seed|bloom|orchard|green|hedge|thatch/.test(words) ? 9 : 10;
  }
  if (def.type === 'market') {
    if (/clock|time|bell/.test(words)) return 12;
    return /garden|green|park|orchard|conservatory/.test(words) ? 14 : 13;
  }
  return null;
}

/**
 * The art for one printing of a card. `versionKey` names the printing (see ./versions.js); left out,
 * it is the one the card is ordinarily shown in — its Full Card Art if it has one, its atlas tile
 * otherwise, which is exactly what the table showed before printings existed.
 *
 * A printing with a painting of its own is drawn over the ordinary art rather than instead of it, so
 * a failed image request falls back through the atlas tile to the vector scene underneath.
 */
export function paintedArtSVG(def, fallback, versionKey) {
  const standard = atlasArtSVG(def, fallback);
  const key = resolveVersionKey(def, versionKey);
  const url = versionArtUrl(def, key);
  if (!url) return standard;
  const shape = versionOf(key).shape === 'full' ? { w: 100, h: 160, cls: ' full-art-painting' } : { w: 100, h: 100, cls: ' alt-art-painting' };
  return `<svg class="painted-art${shape.cls}" viewBox="0 0 ${shape.w} ${shape.h}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><svg width="${shape.w}" height="${shape.h}">${standard}</svg><image href="${url}" width="${shape.w}" height="${shape.h}" preserveAspectRatio="xMidYMid slice"/></svg>`;
}

function atlasArtSVG(def, fallback) {
  const art = explicitArt(def);
  const tile = paintedTile(def);
  if (tile === null) return fallback;
  const x = -(tile % 4) * 100;
  const y = -Math.floor(tile / 4) * 100;
  const atlas = art ? ATLASES[art.atlas]() : PAINTED_ATLAS_URL;
  // A failed image request reveals the original per-card vector illustration underneath.
  return `<svg class="painted-art" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><svg width="100" height="100">${fallback}</svg><image href="${atlas}" x="${x}" y="${y}" width="400" height="400" preserveAspectRatio="none"/></svg>`;
}

export function ornamentalFrameSVG() {
  const sprig = `<path d="M7 66 Q12 38 31 14 M10 48 Q2 40 6 31 Q16 33 10 48 M15 35 Q10 22 17 19 Q24 26 15 35 M22 24 Q21 12 30 11 Q33 20 22 24 M9 55 Q21 47 24 38 Q11 36 9 55 M19 32 Q31 31 35 23 Q24 20 19 32"/>`;
  return `<svg viewBox="0 0 240 400" preserveAspectRatio="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g fill="var(--leaf)" stroke="var(--trim)" stroke-width=".7"><g transform="translate(0 56) scale(.36 1)">${sprig}</g><g transform="translate(240 56) scale(-.36 1)">${sprig}</g><g transform="translate(0 380) scale(.36 -1)">${sprig}</g><g transform="translate(240 380) scale(-.36 -1)">${sprig}</g></g><g fill="none" stroke="var(--trim)" stroke-width="1"><rect x="4" y="4" width="232" height="392" rx="12"/><path d="M38 7 H202 M38 393 H202 M7 128 V310 M233 128 V310"/><path d="M85 394 Q100 383 120 391 Q140 383 155 394"/></g></svg>`;
}
