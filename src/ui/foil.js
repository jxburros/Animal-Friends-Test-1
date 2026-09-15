// Presentation only: finishes never change a card's rules, rarity, identity or deck eligibility.
export const FOIL_MODES = Object.freeze(['full', 'artwork', 'details', 'reverse', 'hexagon']);
export const FOIL_LABELS = Object.freeze({
  full: 'Full-card foil', artwork: 'Artwork foil', details: 'Artwork detail foil',
  reverse: 'Reverse foil', hexagon: 'Hexagon foil',
});

// Opt in one card/printing at a time. The first draw assigns 15 ordinary Foil printings;
// the later hexagons and the second, chosen set are listed after it.
// Example: mk_clover_master_botanist_5: { regular: 'artwork', fullCardArt: false }
// Detail finish: { mode: 'details', mask: 'assets/art/foil-masks/<id>-regular.svg' }
// Mask paths are relative to the site root, including on GitHub Pages.
export const FOIL_ASSIGNMENTS = Object.freeze({
  mk_beck_bylaw_reader_1: Object.freeze({ foil: 'full' }),
  mk_clover_seedling_helper_0: Object.freeze({ foil: 'full' }),
  mk_earl_tea_trader_2: Object.freeze({ foil: 'full' }),
  mk_benjamin_lantern_maker_2: Object.freeze({ foil: 'artwork' }),
  mk_velvet_counter_clerk_1: Object.freeze({ foil: 'artwork' }),
  mk_moss_rehiring_day: Object.freeze({ foil: 'artwork' }),
  mk_comet_astronaut_5: Object.freeze({ foil: Object.freeze({ mode: 'details', mask: 'assets/art/foil-masks/mk_comet_astronaut_5-foil.svg' }) }),
  mk_finn_auctioneers_boy_0: Object.freeze({ foil: Object.freeze({ mode: 'details', mask: 'assets/art/foil-masks/mk_finn_auctioneers_boy_0-foil.svg' }) }),
  mk_earl_tea_house_keeper_4: Object.freeze({ foil: Object.freeze({ mode: 'details', mask: 'assets/art/foil-masks/mk_earl_tea_house_keeper_4-foil.svg' }) }),
  mk_night_round: Object.freeze({ foil: 'reverse' }),
  mk_willow_ferry_trader_1: Object.freeze({ foil: 'reverse' }),
  mk_faustus_costumier_2: Object.freeze({ foil: 'reverse' }),
  mk_dylan_river_otter_4: Object.freeze({ foil: 'hexagon' }),
  mk_willow_tide_reckoner_3: Object.freeze({ foil: 'hexagon' }),
  mk_rosabeth_herb_gatherer_0: Object.freeze({ foil: 'hexagon' }),

  // Hexagon Foil printings added after the first release. Each is opted into PRINTINGS too.
  mk_adam_road_mender_1: Object.freeze({ foil: 'hexagon' }),
  mk_bean_the_early_shift_4: Object.freeze({ foil: 'hexagon' }),
  mk_beck_ward_clerk_2: Object.freeze({ foil: 'hexagon' }),
  mk_benjamin_master_lantern_maker_4: Object.freeze({ foil: 'hexagon' }),
  mk_berry_clockmaker_1: Object.freeze({ foil: 'hexagon' }),
  mk_cassadee_hall_manager_3: Object.freeze({ foil: 'hexagon' }),
  mk_cookie_winter_stores_cook_3: Object.freeze({ foil: 'hexagon' }),
  mk_copper_cellar_keeper_4: Object.freeze({ foil: 'hexagon' }),
  mk_daniel_star_charter_3: Object.freeze({ foil: 'hexagon' }),
  mk_faustus_bolt_boy_0: Object.freeze({ foil: 'hexagon' }),
  mk_finn_peddler_1: Object.freeze({ foil: 'hexagon' }),
  mk_harrison_piano_boy_0: Object.freeze({ foil: 'hexagon' }),
  mk_hazel_guildmaster_3: Object.freeze({ foil: 'hexagon' }),
  mk_lindsay_potting_helper_0: Object.freeze({ foil: 'hexagon' }),

  // Ten of the cutest cards, artwork foil.
  mk_comet_bolt_sorter_0: Object.freeze({ foil: 'artwork' }),
  mk_osh_sharpener_s_boy_0: Object.freeze({ foil: 'artwork' }),
  mk_marmalade_dough_kneader_1: Object.freeze({ foil: 'artwork' }),
  mk_gabe_corner_show_0: Object.freeze({ foil: 'artwork' }),
  mk_jessica_song_leader_0: Object.freeze({ foil: 'artwork' }),
  mk_quill_orchard_hand_0: Object.freeze({ foil: 'artwork' }),
  mk_lindsay_herb_grower_3: Object.freeze({ foil: 'artwork' }),
  mk_rosabeth_garden_hand_1: Object.freeze({ foil: 'artwork' }),
  mk_clover_plot_sharer_1: Object.freeze({ foil: 'artwork' }),
  mk_cookie_biscuit_maker_0: Object.freeze({ foil: 'artwork' }),

  // Ten of the coolest cards, reverse foil.
  mk_brooke_balloonist_4: Object.freeze({ foil: 'reverse' }),
  mk_morty_steam_engineer_4: Object.freeze({ foil: 'reverse' }),
  mk_yellow_freshest_thing_4: Object.freeze({ foil: 'reverse' }),
  mk_dx_solar_eclipse: Object.freeze({ foil: 'reverse' }),
  mk_willow_harbour_admiral_5: Object.freeze({ foil: 'reverse' }),
  mk_biff_chief_constable_4: Object.freeze({ foil: 'reverse' }),
  mk_betty_firework_maker_3: Object.freeze({ foil: 'reverse' }),
  mk_tabitha_camerawoman_5: Object.freeze({ foil: 'reverse' }),
  mk_moss_rocketwright_4: Object.freeze({ foil: 'reverse' }),
  mk_patch_junkyard_diver_0: Object.freeze({ foil: 'reverse' }),

  // Ten of the most underrated cards, full-card foil.
  mk_cassadee_the_only_one_at_the_back_1: Object.freeze({ foil: 'full' }),
  mk_abigail_standing_slot_5: Object.freeze({ foil: 'full' }),
  mk_fred_backstage_crew_3: Object.freeze({ foil: 'full' }),
  mk_winter_turned_down_applicant_1: Object.freeze({ foil: 'full' }),
  mk_oatmeal_sunday_table_0: Object.freeze({ foil: 'full' }),
  mk_ned_the_ward_roll_0: Object.freeze({ foil: 'full' }),
  mk_kevin_counter_hand_2: Object.freeze({ foil: 'full' }),
  mk_hibiscus_the_sorting_bench_0: Object.freeze({ foil: 'full' }),
  mk_sota_the_same_bench_4: Object.freeze({ foil: 'full' }),
  mk_peter_washing_up_1: Object.freeze({ foil: 'full' }),

  // Five cards whose artwork has a detail worth shining.
  mk_sage_astronomer_3: Object.freeze({ foil: Object.freeze({ mode: 'details', mask: 'assets/art/foil-masks/mk_sage_astronomer_3-foil.svg' }) }),
  mk_bean_espresso_1: Object.freeze({ foil: Object.freeze({ mode: 'details', mask: 'assets/art/foil-masks/mk_bean_espresso_1-foil.svg' }) }),
  mk_liz_weighbridge_keeper_4: Object.freeze({ foil: Object.freeze({ mode: 'details', mask: 'assets/art/foil-masks/mk_liz_weighbridge_keeper_4-foil.svg' }) }),
  mk_copper_scale_polisher_1: Object.freeze({ foil: Object.freeze({ mode: 'details', mask: 'assets/art/foil-masks/mk_copper_scale_polisher_1-foil.svg' }) }),
  mk_mandee_weather_watcher_2: Object.freeze({ foil: Object.freeze({ mode: 'details', mask: 'assets/art/foil-masks/mk_mandee_weather_watcher_2-foil.svg' }) }),
});

/** Invalid/unfinished detail configurations fail closed, never flashing the entire artwork. */
export function normalizeFoil(value) {
  if (value === true || value === 'plain') value = 'full';
  if (value === 'creative') value = 'hexagon';
  const config = typeof value === 'string' ? { mode: value } : value;
  if (!config || !FOIL_MODES.includes(config.mode)) return null;
  let mask = null;
  if (config.mode === 'details') {
    if (typeof config.mask !== 'string' || !config.mask.trim()) return null;
    try {
      const base = new URL('../../', import.meta.url);
      const url = new URL(config.mask, base);
      // Bundled masks only; no arbitrary remote fetches or script/data URLs.
      if (url.origin !== base.origin || url.protocol !== base.protocol || !url.href.startsWith(base.href)) return null;
      mask = url.href;
    } catch { return null; }
  }
  return Object.freeze({ mode: config.mode, mask });
}

/** Explicit preview > exact card/printing assignment > legacy card flag > printing default. */
export function resolveFoil(def, printing, override, assignments = FOIL_ASSIGNMENTS) {
  if (override !== undefined) return normalizeFoil(override);
  const assigned = Object.hasOwn(assignments, def.id) ? assignments[def.id] : null;
  if (assigned && Object.hasOwn(assigned, printing.key)) return normalizeFoil(assigned[printing.key]);
  if (def.foil !== undefined) return normalizeFoil(def.foil);
  return normalizeFoil(printing.foil);
}

/** Attach layers to actual layout regions, so readers and differently sized cards stay aligned. */
export function applyFoil(face, finish, { fullArt = false } = {}) {
  if (!finish) return;
  const layer = (parent, extra = '') => {
    const el = document.createElement('div');
    el.className = `foil-sheen${extra ? ` ${extra}` : ''}`;
    el.setAttribute('aria-hidden', 'true');
    if (finish.mask) el.style.setProperty('--foil-detail-mask', `url(${JSON.stringify(finish.mask)})`);
    parent.appendChild(el);
  };
  if (finish.mode === 'artwork' || finish.mode === 'details') {
    layer(face.querySelector('.art'));
  } else if (finish.mode === 'reverse') {
    // Ordinary art is opaque and sits over the stock layer. Full art fills the stock, so only
    // its printed panels and border receive reverse foil. No measured rectangles or observers.
    if (!fullArt) layer(face, 'foil-stock');
    for (const part of ['.banner', '.card-subtitle', '.body', '.card-footer']) layer(face.querySelector(part));
    layer(face.querySelector('.frame'), 'foil-rim');
  } else {
    layer(face);
  }
}
