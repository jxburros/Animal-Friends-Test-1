// Presentation only: finishes never change a card's rules, rarity, identity or deck eligibility.
export const FOIL_MODES = Object.freeze(['full', 'artwork', 'details', 'reverse', 'hexagon']);
export const FOIL_LABELS = Object.freeze({
  full: 'Full-card foil', artwork: 'Artwork foil', details: 'Artwork detail foil',
  reverse: 'Reverse foil', hexagon: 'Hexagon foil',
});

// Opt in one card/printing at a time. The first draw assigns 15 ordinary Foil printings.
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
