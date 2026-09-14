// The two playable collections, and the one rule that joins them.
//
// Classic is the printed book: spec/starter_card_set.json, exactly as it has always been played,
// with the Maker shelf nowhere in sight. Maker is the remade collection: spec/maker_card_set.json,
// its own decks, its own Capital City, its own species and studies.
//
// A collection has to be complete to be playable, and the Maker shelf is not finished: it has no
// Statues of its own, and a game with no Statues has no way to be won. Rather than copy nine cards
// into it and pretend, the shelf names what it is missing under `borrowsFromPrinted` and those cards
// are read out of the printed set by id when the collection is built. Remaking one is then a matter
// of writing the Maker card and striking the id off that list.

/** The collection each mode plays, in the order the cover offers them. */
export const MODES = Object.freeze({
  classic: Object.freeze({
    id: 'classic',
    name: 'Classic',
    tagline: 'The printed book',
    blurb: 'The First Boroughs as published: eight town decks, seven Capital Cities and the whole printed collection. No Maker cards anywhere.',
  }),
  maker: Object.freeze({
    id: 'maker',
    name: 'Maker',
    tagline: 'The remade collection',
    blurb: 'The same game played entirely with the Maker cards: the remade cast, their own decks and their own Capital City.',
  }),
});

export const MODE_IDS = Object.freeze(['classic', 'maker']);

/**
 * The playable Maker collection: every card on the Maker shelf, plus the printed cards it says it
 * is borrowing. Borrowed cards keep their printed id — that is what makes the loan visible — and
 * carry `borrowed: true` so the Book can say where they came from.
 *
 * A borrowed id the printed set does not have is skipped rather than thrown: the Maker shelf is a
 * working document, and a typo in it should empty a shelf, never stop the game from starting.
 */
export function composeMakerSet(makerSet, printedSet) {
  const printedById = printedSet.cardsById
    || Object.fromEntries((printedSet.cards || []).map((c) => [c.id, c]));
  const makerCards = Array.isArray(makerSet.cards) ? makerSet.cards : [];
  const ownIds = new Set(makerCards.map((c) => c.id));
  const borrowed = [];
  for (const id of borrowedIds(makerSet)) {
    if (ownIds.has(id) || !printedById[id]) continue;
    borrowed.push({ ...printedById[id], borrowed: true });
  }
  return {
    ...makerSet,
    setId: makerSet.setId || 'AF-MAKER-01',
    name: makerSet.name || 'Maker Cards',
    species: makerSet.species || printedSet.species || [],
    studies: makerSet.studies || printedSet.studies || [],
    decks: makerSet.decks || [],
    marketDecks: makerSet.marketDecks || [],
    cards: [...makerCards, ...borrowed],
  };
}

/** The printed card ids the Maker shelf is borrowing, in the order it lists them. */
export function borrowedIds(makerSet) {
  const spec = makerSet && makerSet.borrowsFromPrinted;
  if (!spec) return [];
  return Array.isArray(spec) ? spec.slice() : (spec.cards || []).slice();
}

/** Whether a collection can actually be played: it needs cards, decks and a Capital City. */
export function isPlayableSet(set) {
  return !!(set
    && Array.isArray(set.cards) && set.cards.length
    && Array.isArray(set.decks) && set.decks.length
    && Array.isArray(set.marketDecks) && set.marketDecks.length);
}
