// Shared painted archetypes. Card identity and rules always come from the card set.
// Coordinates refer to the unmodified 4 × 4 atlases; new species keep their vector art. A card may
// name its painting with `art: { atlas: <bundled atlas name>, tile: 0..15 }`;
// otherwise the original species/theme selection applies. Only bundled atlases resolve.
import { fullArtFor } from './full-art.js';

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

export function paintedArtSVG(def, fallback) {
  const standard = atlasArtSVG(def, fallback);
  const fullArt = fullArtFor(def);
  if (fullArt) {
    return `<svg class="painted-art full-art-painting" viewBox="0 0 100 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><svg width="100" height="160">${standard}</svg><image href="${fullArt.url}" width="100" height="160" preserveAspectRatio="xMidYMid slice"/></svg>`;
  }
  return standard;
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
