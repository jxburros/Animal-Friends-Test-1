// Collector numbers: the number printed on a card, and the letter printed on a printing of it.
//
// Every card in the collection carries two marks that together name exactly one printed object:
//
//   a set number    A1 — Alpha 1, the first set. Every card in this collection is an A1 card.
//   a card number   1..N, unique inside the set, stamped into spec/maker_card_set.json.
//
// A printing adds a letter to the card number, so 22 and 22f are the same card and different cards
// to hold: 22 is the ordinary printing, 22f the foil of it. The letters are in VERSION_LETTERS.
//
// The numbers are not hand-written and are not arbitrary. `orderedCards` puts the whole collection
// in collector order — rarity, then card type, then (for the types that have one) species — and
// shuffles the cards inside each of those smallest groups before numbering them, so that two cards
// sitting next to each other in the Book are neighbours by rarity and kind rather than by the order
// somebody happened to write them in. The shuffle is seeded off the group's own name, so it is the
// same shuffle every time the numbers are stamped, and editing one group never renumbers another
// group's insides. Run `npm run number` after adding or removing cards.
import { RARITIES } from './power.js';
import { seedRng, shuffle } from './rng.js';

/** The set every card in this collection belongs to: Alpha 1. */
export const SET_NUMBER = 'A1';

/**
 * Card types in collector order. Characters lead the set, tokens close it — the same order the
 * Book's type chips are drawn in, so the chips read left to right as the book reads front to back.
 */
export const CARD_TYPE_ORDER = Object.freeze([
  'character',
  'event',
  'townBuilding',
  'building',
  'marketCharacter',
  'market',
  'statue',
  'disruption',
  'ordinance',
  'token',
]);

/**
 * The letter each printing adds to the card number. The regular printing adds nothing: it is the
 * card number itself, which is what makes 22 read as "the ordinary 22".
 */
export const VERSION_LETTERS = Object.freeze({
  regular: '',
  foil: 'f',
  alternateArt: 'a',
  alternateArtFoil: 's',
  creativeFoil: 'c',
  fullCardArt: 'x',
});

/** Where a value sits in a declared order; anything undeclared sorts after everything declared. */
function rankIn(order, value) {
  const at = order.indexOf(value);
  return at === -1 ? order.length : at;
}

/** FNV-1a, so a group's shuffle is decided by the group's own name and nothing else. */
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The smallest group a card is numbered inside: its rarity, its type, and its species where it has
 * one (Characters, City Hires and Tokens do; an Event does not).
 */
export function groupKeyOf(card) {
  return `${card.rarity || 'Common'}|${card.type || ''}|${card.species || ''}`;
}

/** Where a group sits in the book: rarity first, then type, then species. */
function groupRank(card, speciesOrder) {
  return [
    rankIn(RARITIES, card.rarity || 'Common'),
    rankIn(CARD_TYPE_ORDER, card.type),
    card.species ? rankIn(speciesOrder, card.species) : -1,
  ];
}

/**
 * The whole collection in collector order — the order the numbers are handed out in, and the order
 * the Book lays the cards down in. Returns a new array; the input is untouched.
 */
export function orderedCards(cards, speciesOrder = []) {
  const groups = new Map();
  for (const card of cards) {
    const key = groupKeyOf(card);
    if (!groups.has(key)) groups.set(key, { key, rank: groupRank(card, speciesOrder), cards: [] });
    groups.get(key).cards.push(card);
  }
  const ordered = [...groups.values()].sort((a, b) => (
    a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1] || a.rank[2] - b.rank[2] || a.key.localeCompare(b.key)
  ));
  const out = [];
  for (const group of ordered) {
    // Sorted by id first so the shuffle is fed the same list whatever order the file was written in.
    const inGroup = group.cards.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
    shuffle({ rng: seedRng(hash(group.key)) }, inGroup);
    out.push(...inGroup);
  }
  return out;
}

/** The numbers the collection should carry: card id -> 1..N, in collector order. */
export function numbering(cards, speciesOrder = []) {
  const numbers = new Map();
  orderedCards(cards, speciesOrder).forEach((card, i) => numbers.set(card.id, i + 1));
  return numbers;
}

/** The letter a printing adds; an unknown printing adds nothing. */
export function versionLetter(versionKey) {
  return Object.hasOwn(VERSION_LETTERS, versionKey) ? VERSION_LETTERS[versionKey] : '';
}

/** The number one printing of one card is known by: `22`, `22f`, `22x`. Null before it is stamped. */
export function collectorNumber(card, versionKey = 'regular') {
  if (!card || !card.number) return null;
  return `${card.number}${versionLetter(versionKey)}`;
}

/** The whole collector's mark, set and all: `A1 22f`. Null before the card is stamped. */
export function collectorCode(card, versionKey = 'regular') {
  const number = collectorNumber(card, versionKey);
  return number ? `${card.setNumber || SET_NUMBER} ${number}` : null;
}

/** Sort key for the Book: unstamped cards fall to the back rather than to the front. */
export function collectorRank(card) {
  return card && card.number ? card.number : Number.MAX_SAFE_INTEGER;
}
