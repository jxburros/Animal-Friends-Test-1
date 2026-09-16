// Prints a reference summary of createGame()'s output from the real
// src/engine/state.js, to diff against godot/tools/state_check.gd's output
// for parity on the state/RNG/deck-building port.
// Run: node godot/tools/state_reference.mjs
import { readFileSync } from 'node:fs';
import { createGame } from '../../src/engine/state.js';

const rules = JSON.parse(readFileSync(new URL('../../spec/game.json', import.meta.url)));
const set = JSON.parse(readFileSync(new URL('../../spec/maker_card_set.json', import.meta.url)));

const state = createGame(rules, set, {
  seed: 12345,
  decks: ['mk-furrow-warren', 'mk-margin-pantry'],
  names: ['Mayor 1', 'Mayor 2'],
});

function summarize(state) {
  return {
    seed: state.seed,
    rngAfterSetup: state.rng,
    uidCounter: state.uidCounter,
    phase: state.phase,
    players: state.players.map((p) => ({
      name: p.name,
      deckId: p.deckId,
      supply: p.supply,
      hand: p.hand.map((c) => c.cardId),
      deckSize: p.deck.length,
      deckTop5: p.deck.slice(0, 5).map((c) => c.cardId),
    })),
    marketDeckId: state.market.deckId,
    marketDeckSize: state.market.deck.length,
    marketDeckTop5: state.market.deck.slice(0, 5),
    city: state.market.city,
    cityDump: state.market.cityDump,
    logFirstLine: state.log[0].text,
  };
}

console.log(JSON.stringify(summarize(state), null, 2));
