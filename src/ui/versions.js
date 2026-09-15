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
// that lives somewhere else. A printing with no art of its own (plain `foil`) only ever needs `true`.
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

/**
 * Which printings each card exists in, beyond the regular one and the Full Card Art collection.
 * The first random draw has 15 ordinary Foil printings. See docs/FIRST_FOILS.md.
 *
 *   mk_peanut_barista_1: { alternateArt: true, foil: true, alternateArtFoil: true },
 */
export const PRINTINGS = Object.freeze({
  mk_beck_bylaw_reader_1: Object.freeze({ foil: true }),
  mk_clover_seedling_helper_0: Object.freeze({ foil: true }),
  mk_earl_tea_trader_2: Object.freeze({ foil: true }),
  mk_benjamin_lantern_maker_2: Object.freeze({ foil: true }),
  mk_velvet_counter_clerk_1: Object.freeze({ foil: true }),
  mk_moss_rehiring_day: Object.freeze({ foil: true }),
  mk_comet_astronaut_5: Object.freeze({ foil: true }),
  mk_finn_auctioneers_boy_0: Object.freeze({ foil: true }),
  mk_earl_tea_house_keeper_4: Object.freeze({ foil: true }),
  mk_night_round: Object.freeze({ foil: true }),
  mk_willow_ferry_trader_1: Object.freeze({ foil: true }),
  mk_faustus_costumier_2: Object.freeze({ foil: true }),
  mk_dylan_river_otter_4: Object.freeze({ foil: true }),
  mk_willow_tide_reckoner_3: Object.freeze({ foil: true }),
  mk_rosabeth_herb_gatherer_0: Object.freeze({ foil: true }),
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
