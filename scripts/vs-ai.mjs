#!/usr/bin/env node
// Headless "me vs the heuristic AI" match runner — no browser, no graphics, just the engine.
//
//   node scripts/vs-ai.mjs [--games N] [--seed S] [--deck <id>] [--rival <id>] [--verbose]
//
// Plays N full games with makeMyAgent (see my-agent.mjs) as seat 0 against the tuned
// makeHeuristicAgent as seat 1, alternating who goes first, and prints a scoreboard.
import fs from 'node:fs';
import { createGame, playGame } from '../src/engine/index.js';
import { makeHeuristicAgent } from '../src/ai/heuristic.js';
import { makeMyAgent } from './my-agent.mjs';

const rules = JSON.parse(fs.readFileSync(new URL('../spec/game.json', import.meta.url)));
const set = JSON.parse(fs.readFileSync(new URL('../spec/maker_card_set.json', import.meta.url)));

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? def : process.argv[i + 1];
}
const GAMES = parseInt(arg('games', '20'), 10);
const SEED0 = parseInt(arg('seed', '1'), 10);
const VERBOSE = process.argv.includes('--verbose');
const DECK_A = arg('deck', 'mk-tin-tally');
const DECK_B = arg('rival', 'mk-gavel-ribbon');

let myWins = 0;
let aiWins = 0;
let draws = 0;
const turnCounts = [];

for (let g = 0; g < GAMES; g++) {
  const seed = SEED0 + g;
  const meFirst = g % 2 === 0;
  const decks = meFirst ? [DECK_A, DECK_B] : [DECK_B, DECK_A];
  const names = meFirst ? ['Me', 'Heuristic AI'] : ['Heuristic AI', 'Me'];
  const state = createGame(rules, set, { seed, decks, names });

  const mine = makeMyAgent('Me');
  const ai = makeHeuristicAgent({ seed: seed + 1000, debug: false });
  const agents = meFirst ? [mine, ai] : [ai, mine];

  await playGame(state, agents, { maxTurnsPerPlayer: 250 });

  const myIdx = meFirst ? 0 : 1;
  const aiIdx = 1 - myIdx;
  const winner = state.winner;
  let outcome;
  if (winner === null) { draws++; outcome = 'draw (turn cap)'; }
  else if (winner === myIdx) { myWins++; outcome = 'I win'; }
  else { aiWins++; outcome = 'AI wins'; }
  turnCounts.push(state.turnNumber);

  const myStatues = state.players[myIdx].victoryRow?.length ?? 0;
  const aiStatues = state.players[aiIdx].victoryRow?.length ?? 0;
  console.log(
    `Game ${String(g + 1).padStart(2)}: seed=${seed} ${meFirst ? '(I go first)' : '(AI goes first)'} `
    + `turns=${state.turnNumber} statues Me=${myStatues} AI=${aiStatues} -> ${outcome}`,
  );
  if (VERBOSE) {
    for (const entry of state.log.slice(-15)) console.log('   ', entry.text);
  }
}

console.log('');
console.log('===== Scoreboard =====');
console.log(`Games played : ${GAMES}`);
console.log(`I won        : ${myWins} (${((100 * myWins) / GAMES).toFixed(1)}%)`);
console.log(`AI won       : ${aiWins} (${((100 * aiWins) / GAMES).toFixed(1)}%)`);
console.log(`Draws (cap)  : ${draws}`);
const avgTurns = turnCounts.reduce((a, b) => a + b, 0) / turnCounts.length;
console.log(`Avg turns    : ${avgTurns.toFixed(1)}`);
