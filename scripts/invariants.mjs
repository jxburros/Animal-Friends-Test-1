import fs from 'node:fs';
import { createGame, playTurn, cardDef } from '../src/engine/index.js';
import { makeRandomAgent } from '../src/ai/random.js';
const rules = JSON.parse(fs.readFileSync(new URL('../spec/game.json', import.meta.url)));
const set = JSON.parse(fs.readFileSync(new URL('../spec/starter_card_set.json', import.meta.url)));
function check(state, seed) {
  const m = state.market;
  const total = m.deck.length + m.city.length + m.cityDump.length + m.outOfPlay.length + state.players.reduce((a, p) => a + p.victoryRow.length, 0);
  if (total !== 25) throw new Error(`seed ${seed} turn ${state.turnNumber}: market card count ${total}`);
  for (const p of state.players) {
    const n = p.deck.length + p.hand.length + p.dump.length + p.unemployment.length + p.events.length + p.town.reduce((a, s) => a + s.cards.length, 0);
    if (n !== 30) throw new Error(`seed ${seed} turn ${state.turnNumber}: ${p.name} has ${n} deck cards`);
    if (p.supply < 0) throw new Error(`seed ${seed}: negative supply ${p.supply}`);
    if (p.escrow < 0) throw new Error(`seed ${seed}: negative escrow`);
    const esc = m.pending.reduce((a, pd) => a + (pd.announcer === p.index ? pd.bid : 0) + (pd.challenge && pd.challenge.player === p.index ? pd.challenge.paid : 0), 0);
    if (esc !== p.escrow) throw new Error(`seed ${seed} turn ${state.turnNumber}: escrow mismatch ${esc} vs ${p.escrow}`);
    for (const s of p.town) if (![0, 180, 270].includes(s.orientation)) throw new Error('bad orientation');
  }
  for (const pd of m.pending) if (!m.city.includes(pd.cardId)) throw new Error('pending card not in city');
}
let results = { 0: 0, 1: 0, null: 0 }, turns = 0, N = Number(process.argv[2] || 50);
for (let seed = 1; seed <= N; seed++) {
  const state = createGame(rules, set, { seed, decks: seed % 2 ? ['burrow-bloom', 'paws-papers'] : ['paws-papers', 'burrow-bloom'] });
  state.agents = [makeRandomAgent(seed * 7), makeRandomAgent(seed * 13)];
  const cap = rules.simulation.maxTurnsPerPlayer * 2;
  while (state.winner === null && state.turnNumber < cap) {
    await playTurn(state);
    check(state, seed);
  }
  results[state.winner]++;
  turns += state.turnNumber;
}
console.log('random vs random', results, 'avg turns', turns / N);
