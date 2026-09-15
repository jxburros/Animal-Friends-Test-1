import fs from 'node:fs';
import { createGame, playTurn, cardDef } from '../src/engine/index.js';
import { makeRandomAgent } from '../src/ai/random.js';
const rules = JSON.parse(fs.readFileSync(new URL('../spec/game.json', import.meta.url)));
const set = JSON.parse(fs.readFileSync(new URL('../spec/maker_card_set.json', import.meta.url)));
/**
 * Market cards that have come to rest in a player's own zones (hired animals).
 *
 * `deck` is in this list because a hired animal can reach it: laid off or knocked down into the Town
 * Dump, it is shuffled back into the player deck when that deck runs out (rules.deckOut). Leaving the
 * deck out of the census made such an animal look like a market card that had vanished.
 */
function hiredIn(state, p) {
  const isHired = (c) => (cardDef(state, c.cardId) || {}).type === 'marketCharacter';
  return p.town.reduce((a, s) => a + s.cards.filter(isHired).length, 0)
    + p.dump.filter(isHired).length + p.unemployment.filter(isHired).length
    + p.hand.filter(isHired).length + p.deck.filter(isHired).length;
}

function check(state, seed, marketSize, deckSizes) {
  const m = state.market;
  // Market cards now also come to rest as Buildings in a town and as hired animals in it. A town's
  // Building places hold both kinds — a Capital City Building bought out of the market and a Town
  // Building raised out of the Mayor's own deck — so only the market's own are counted here.
  const marketBuildings = (p) => (p.buildings || []).filter((b) => b.source !== 'deck').length;
  const total = m.deck.length + m.city.length + m.cityDump.length + m.outOfPlay.length + m.revealQueue.length
    + state.players.reduce((a, p) => a + p.victoryRow.length + marketBuildings(p) + hiredIn(state, p), 0);
  if (total !== marketSize) throw new Error(`seed ${seed} turn ${state.turnNumber}: market card count ${total} (expected ${marketSize})`);
  // Deck cards are counted across both towns rather than one at a time. A deck may be any legal
  // size, so the invariant is that no deck card is ever created or lost — and cards do change hands:
  // The Bin Round lifts an Event straight out of the other Mayor's Town Dump. Town Buildings
  // standing in a town are still its own deck's cards.
  const ownCards = (p) => p.deck.length + p.hand.length + p.dump.length + p.unemployment.length
    + p.events.length + p.town.reduce((a, s) => a + s.cards.length, 0) - hiredIn(state, p)
    + (p.buildings || []).filter((b) => b.source === 'deck').length;
  const held = state.players.reduce((a, p) => a + ownCards(p), 0);
  const dealt = deckSizes.reduce((a, n) => a + n, 0);
  if (held !== dealt) throw new Error(`seed ${seed} turn ${state.turnNumber}: ${held} deck cards between the two towns (${dealt} were dealt)`);
  for (const p of state.players) {
    if (p.supply < 0) throw new Error(`seed ${seed}: negative supply ${p.supply}`);
    if (p.escrow < 0) throw new Error(`seed ${seed}: negative escrow`);
    const esc = m.pending.reduce((a, pd) => a + pd.committed[p.index], 0);
    if (esc !== p.escrow) throw new Error(`seed ${seed} turn ${state.turnNumber}: escrow mismatch ${esc} vs ${p.escrow}`);
    for (const s of p.town) if (![0, 180, 270].includes(s.orientation)) throw new Error('bad orientation');
  }
  for (const pd of m.pending) if (!m.city.includes(pd.cardId)) throw new Error('pending card not in city');
}
let results = { 0: 0, 1: 0, null: 0 }, turns = 0, N = Number(process.argv[2] || 50);
const markets = set.marketDecks.map((d) => d.id);
const deckIds = set.decks.map((d) => d.id);
const pairs = deckIds.flatMap(a => deckIds.filter(b => a !== b).map(b => [a,b]));
for (let seed = 1; seed <= N; seed++) {
  const market = markets[seed % markets.length];
  const state = createGame(rules, set, { seed, market, decks: pairs[(seed - 1) % pairs.length] });
  state.agents = [makeRandomAgent(seed * 7), makeRandomAgent(seed * 13)];
  const marketSize = state.market.deck.length + state.market.city.length + state.market.cityDump.length;
  // Each Mayor's own card count, taken at the start: a deck may be any legal size, so what has to
  // hold is that no card of theirs is ever created or lost, not that both decks match one number.
  const deckSizes = state.players.map((p) => p.deck.length + p.hand.length);
  const cap = rules.simulation.maxTurnsPerPlayer * 2;
  while (state.winner === null && state.turnNumber < cap) {
    await playTurn(state);
    check(state, seed, marketSize, deckSizes);
  }
  results[state.winner]++;
  turns += state.turnNumber;
}
console.log('random vs random', results, 'avg turns', turns / N, `over ${markets.length} market decks and ${pairs.length} ordered deck pairings`);
