// Booster pack opening: what fills a pack, and which printing each card is stamped in.
//
// Two independent draws. First, which cards fill the pack — one draw per rarity slot, with
// replacement, plus a dedicated "hit" slot that is not itself a rarity and draws from the whole
// pool. Second, once a card is chosen, which printing it takes — a printing is presentation only
// (see ui/versions.js) and never changes which card was drawn, its rarity, or deck legality.
//
// Every ordinary card gets the same flat SPECIAL_CHANCE of coming in something other than Regular,
// whatever printings it happens to have. That chance is then split across whichever printings the
// card actually has, by PRINTING_WEIGHTS — so a card with only a Foil printing is 10% Foil / 90%
// Regular, while a card with Foil, Alternate Art and Alternate Art Foil splits that same 10% three
// ways in proportion to their weights. The hit slot never lands on Regular: its card's available
// printings are renormalized to sum to 100%.
//
// Pure data in, numbers out: nothing here reads game state or touches the engine's live RNG, so a
// pack is reproducible from a seed alone and testable without a running game.

import { seedRng, rand } from './rng.js';

/** The five rarity slots a pack draws, in pack order. Draws are with replacement: a pack can hold
 * two copies of the same Common. */
export const PACK_SLOTS = Object.freeze([
  Object.freeze({ rarity: 'Common', count: 4 }),
  Object.freeze({ rarity: 'Uncommon', count: 3 }),
  Object.freeze({ rarity: 'Rare', count: 2 }),
  Object.freeze({ rarity: 'Super Rare', count: 1 }),
  Object.freeze({ rarity: 'Legendary', count: 1 }),
]);

/** The chance any one ordinary slot's card comes in something other than its Regular printing. */
export const SPECIAL_CHANCE = 0.1;

/** Relative rarity of each non-Regular printing, used to split SPECIAL_CHANCE across whatever a
 * card actually has. Higher is more common. */
export const PRINTING_WEIGHTS = Object.freeze({
  foil: 8,
  alternateArt: 16,
  alternateArtFoil: 6,
  creativeFoil: 3,
  fullCardArt: 1,
});

function sumWeights(keys, weights) {
  return keys.reduce((total, key) => total + (weights[key] || 0), 0);
}

/** Which printing an ordinary slot's card takes: Regular unless the roll lands inside
 * specialChance, in which case one of `available` is picked in proportion to its weight. */
export function rollPrinting(rngState, available, weights = PRINTING_WEIGHTS, specialChance = SPECIAL_CHANCE) {
  const totalWeight = sumWeights(available, weights);
  if (!available.length || totalWeight <= 0) return 'regular';
  const r = rand(rngState);
  if (r >= specialChance) return 'regular';
  let target = (r / specialChance) * totalWeight;
  for (const key of available) {
    target -= weights[key] || 0;
    if (target < 0) return key;
  }
  return available[available.length - 1];
}

/** Which printing the guaranteed hit slot's card takes: always one of `available`, never Regular. */
export function rollGuaranteedPrinting(rngState, available, weights = PRINTING_WEIGHTS) {
  const totalWeight = sumWeights(available, weights);
  if (!available.length || totalWeight <= 0) {
    throw new Error('rollGuaranteedPrinting: no available printing to guarantee');
  }
  let target = rand(rngState) * totalWeight;
  for (const key of available) {
    target -= weights[key] || 0;
    if (target < 0) return key;
  }
  return available[available.length - 1];
}

/**
 * Open one pack from `cards` (definitions carrying `id` and `rarity`).
 *
 * `printingsFor(card)` returns the non-Regular printing keys that card actually has — callers wire
 * this to the real catalogue (see ui/boosterPack.js); it is injected rather than imported so this
 * module stays free of the ui layer.
 *
 * Returns 11 ordinary cards (in PACK_SLOTS order) followed by 1 guaranteed hit card, each as
 * `{ cardId, rarity, printing }`.
 */
export function openPack(cards, printingsFor, { seed, slots = PACK_SLOTS, weights = PRINTING_WEIGHTS, specialChance = SPECIAL_CHANCE } = {}) {
  const rngState = { rng: seedRng(seed ?? Date.now()) };
  const byRarity = new Map();
  for (const card of cards) {
    if (!byRarity.has(card.rarity)) byRarity.set(card.rarity, []);
    byRarity.get(card.rarity).push(card);
  }

  const draws = [];
  for (const slot of slots) {
    const pool = byRarity.get(slot.rarity) || [];
    if (!pool.length) throw new Error(`openPack: no cards of rarity "${slot.rarity}"`);
    for (let i = 0; i < slot.count; i++) {
      const card = pool[Math.floor(rand(rngState) * pool.length)];
      const printing = rollPrinting(rngState, printingsFor(card), weights, specialChance);
      draws.push({ cardId: card.id, rarity: card.rarity, printing });
    }
  }

  const hittable = cards.filter((card) => printingsFor(card).length);
  if (!hittable.length) throw new Error('openPack: no card in the pool has an alternate printing to guarantee');
  const hitCard = hittable[Math.floor(rand(rngState) * hittable.length)];
  const hitPrinting = rollGuaranteedPrinting(rngState, printingsFor(hitCard), weights);
  draws.push({ cardId: hitCard.id, rarity: hitCard.rarity, printing: hitPrinting });

  return draws;
}
