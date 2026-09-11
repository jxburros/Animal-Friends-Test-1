// Deck legality: the rules a town deck must satisfy, shared by the Deck Workshop and the tests.
// Pure data in, sentences out — no DOM, no game state.
import { COPY_LIMITS } from './power.js';

/** The deck-building limits, with the prototype defaults filled in for an older spec/game.json. */
export function deckRules(rules) {
  const db = rules.deckbuilding || {};
  return {
    deckSize: db.deckSize || rules.setup.deckSize,
    maxCopies: db.maxCopiesPerCard || 3,
    copiesByRarity: db.maxCopiesByRarity || COPY_LIMITS,
    minCharacters: db.minCharacters || 12,
    maxEvents: db.maxEvents || rules.setup.deckSize,
  };
}

/**
 * How many copies of one card a deck may hold: its rarity's limit, never above the set-wide cap.
 * A card with no rarity printed on it is treated as Common, so an older card set still builds.
 */
export function maxCopiesOf(rules, card) {
  const dr = rules && rules.deckSize !== undefined ? rules : deckRules(rules);
  const byRarity = dr.copiesByRarity[(card && card.rarity) || 'Common'];
  return Math.min(dr.maxCopies, byRarity === undefined ? dr.maxCopies : byRarity);
}

/**
 * Every problem with a deck list `{ cardId: count }`, as player-facing sentences.
 * An empty array means the deck is legal and `createGame` will accept it.
 */
export function deckProblems(rules, set, list) {
  const dr = deckRules(rules);
  const byId = set.cardsById || Object.fromEntries(set.cards.map((c) => [c.id, c]));
  const entries = Object.entries(list).filter(([, n]) => n > 0);
  const total = entries.reduce((a, [, n]) => a + n, 0);
  let chars = 0;
  let events = 0;
  const problems = [];
  for (const [cardId, n] of entries) {
    const def = byId[cardId];
    if (!def) { problems.push(`Unknown card ${cardId}.`); continue; }
    if (def.type === 'character') chars += n;
    else if (def.type === 'event') events += n;
    else problems.push(`${def.name} cannot go in a town deck.`);
    const limit = maxCopiesOf(dr, def);
    if (n > limit) {
      const why = def.rarity && limit < dr.maxCopies ? ` — it is ${def.rarity}` : '';
      problems.push(`${def.name}: ${n} copies (at most ${limit}${why}).`);
    }
  }
  if (total !== dr.deckSize) problems.push(`${total} of ${dr.deckSize} cards.`);
  if (chars < dr.minCharacters) problems.push(`${chars} Characters (at least ${dr.minCharacters}).`);
  if (events > dr.maxEvents) problems.push(`${events} Events (at most ${dr.maxEvents}).`);
  return problems;
}
