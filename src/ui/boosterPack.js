// Wires the pure pack-opening engine to the real printing catalogue: which non-Regular printings a
// given card actually has, per versions.js, so a pack never promises a printing nobody painted.
import { openPack as engineOpenPack, PACK_SLOTS, SPECIAL_CHANCE, PRINTING_WEIGHTS } from '../engine/boosterPack.js';
import { versionsOf } from './versions.js';

export { PACK_SLOTS, SPECIAL_CHANCE, PRINTING_WEIGHTS };

/** The non-Regular printing keys this card exists in, e.g. ['foil', 'fullCardArt']. */
export function availablePrintings(card) {
  return versionsOf(card).map((v) => v.key).filter((key) => key !== 'regular');
}

/** Open one pack from `cards` (card definitions carrying rarity). See engine/boosterPack.js. */
export function openPack(cards, opts) {
  return engineOpenPack(cards, availablePrintings, opts);
}
