#!/usr/bin/env node
// Batch playtest runner for Animal Friends TCG.
//
//   node scripts/playtest.mjs [--games N] [--seed S] [--p0 heuristic|random] [--p1 heuristic|random]
//                             [--decks bb,pp|pp,bb|alternate] [--verbose] [--aggression A]
//
// Also exports runPlaytest(opts) -> stats object, for use from tests.

import fs from 'node:fs';
import { createGame, playGame } from '../src/engine/index.js';
import { makeRandomAgent } from '../src/ai/random.js';
import { makeHeuristicAgent } from '../src/ai/heuristic.js';

const rules = JSON.parse(fs.readFileSync(new URL('../spec/game.json', import.meta.url)));
const set = JSON.parse(fs.readFileSync(new URL('../spec/starter_card_set.json', import.meta.url)));

const DECK_ALIAS = { bb: 'burrow-bloom', pp: 'paws-papers', 'burrow-bloom': 'burrow-bloom', 'paws-papers': 'paws-papers' };
const DECK_SHORT = { 'burrow-bloom': 'bb', 'paws-papers': 'pp' };
const MARKET_NAMES = new Map(set.marketDeck.map((id) => [set.cards.find((c) => c.id === id).name, id]));
const CARD_BY_ID = new Map(set.cards.map((c) => [c.id, c]));
const DECK_CARD_IDS = new Map(set.decks.map((d) => [d.id, Object.keys(d.list)]));

// ---------------------------------------------------------------- helpers
function makeAgent(kind, seed, opts = {}) {
  if (kind === 'random') return makeRandomAgent(seed);
  return makeHeuristicAgent({ seed, aggression: opts.aggression, debug: opts.debug });
}

/** Wrap an agent so we can count the actions it actually submits. */
function recording(agent, sink) {
  return {
    name: agent.name,
    choose(state, pi, request) {
      const answer = agent.choose(state, pi, request);
      if (request.kind === 'action' && answer && typeof answer === 'object' && answer.type) {
        sink(pi, answer);
      }
      return answer;
    },
  };
}

function median(xs) {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (n, d) => (d ? ((100 * n) / d).toFixed(1) + '%' : '—');

// ---------------------------------------------------------------- log mining
function mineLog(state, stats, decks) {
  const names = [state.players[0].name, state.players[1].name];
  for (const entry of state.log) {
    const text = entry.text;
    // "<name> gains <Card Name> (why)."
    for (let pi = 0; pi < 2; pi++) {
      const prefix = `${names[pi]} gains `;
      if (!text.startsWith(prefix)) continue;
      let rest = text.slice(prefix.length).replace(/\.$/, '');
      rest = rest.replace(/\s*\([^)]*\)$/, '');
      const cardId = MARKET_NAMES.get(rest);
      if (!cardId) continue;
      const rec = stats.gains.get(cardId) || { total: 0, byDeck: { bb: 0, pp: 0 } };
      rec.total++;
      rec.byDeck[DECK_SHORT[decks[pi]]]++;
      stats.gains.set(cardId, rec);
    }
    // "Purchase of <Card> resolves: <ann> bid N, <ch> bid M[ (tie)]. <winner> wins."
    const m = text.match(/^Purchase of .+ resolves: (\S+) bid (\d+), (\S+) bid (\d+)(?: \(tie\))?\. (\S+) wins\.$/);
    if (m) {
      stats.contested++;
      if (m[5] !== m[1]) stats.challengerWins++;
    }
  }
}

// ---------------------------------------------------------------- main runner
export async function runPlaytest(opts = {}) {
  const games = opts.games ?? 100;
  const baseSeed = opts.seed ?? 1;
  const p0Kind = opts.p0 ?? 'heuristic';
  const p1Kind = opts.p1 ?? 'heuristic';
  const deckMode = opts.decks ?? 'alternate';
  const aggression = opts.aggression;

  const stats = {
    config: { games, seed: baseSeed, p0: p0Kind, p1: p1Kind, decks: deckMode },
    winsBySlot: [0, 0],
    draws: 0,
    winsByDeck: { bb: 0, pp: 0 },
    gamesByDeckSlot: { bb: [0, 0], pp: [0, 0] }, // deck -> games played in slot 0/1
    winsByDeckSlot: { bb: [0, 0], pp: [0, 0] },
    turns: [],
    turnCapGames: 0,
    statueGames: 0,
    statuesPerGame: [],
    statueDist: {}, // final statue count -> number of player-games
    supplyEarned: [],
    perGame: { recruits: [], events: [], announcements: [], challenges: [] },
    gains: new Map(),
    contested: 0,
    challengerWins: 0,
    plays: new Map(),
    firstGameLog: null,
    elapsedMs: 0,
  };
  for (const ids of DECK_CARD_IDS.values()) for (const id of ids) if (!stats.plays.has(id)) stats.plays.set(id, 0);

  const t0 = Date.now();
  for (let g = 0; g < games; g++) {
    let decks;
    if (deckMode === 'alternate') decks = g % 2 === 0 ? ['burrow-bloom', 'paws-papers'] : ['paws-papers', 'burrow-bloom'];
    else {
      const parts = String(deckMode).split(',').map((s) => DECK_ALIAS[s.trim()]).filter(Boolean);
      decks = parts.length === 2 ? parts : ['burrow-bloom', 'paws-papers'];
    }
    const seed = baseSeed + g;
    const state = createGame(rules, set, { seed, decks, names: ['P0', 'P1'] });
    const sink = (pi, action) => {
      if (action.type === 'recruit' || action.type === 'playEvent') {
        stats.plays.set(action.cardId, (stats.plays.get(action.cardId) || 0) + 1);
      }
    };
    const a0 = recording(makeAgent(p0Kind, seed * 7 + 1, { aggression }), sink);
    const a1 = recording(makeAgent(p1Kind, seed * 13 + 3, { aggression }), sink);
    await playGame(state, [a0, a1]);

    if (g === 0) stats.firstGameLog = state.log.map((l) => `[${l.turn}] ${l.text}`);

    if (state.winner === null) stats.draws++;
    else {
      stats.winsBySlot[state.winner]++;
      stats.winsByDeck[DECK_SHORT[decks[state.winner]]]++;
      stats.winsByDeckSlot[DECK_SHORT[decks[state.winner]]][state.winner]++;
    }
    for (let pi = 0; pi < 2; pi++) stats.gamesByDeckSlot[DECK_SHORT[decks[pi]]][pi]++;

    stats.turns.push(state.turnNumber);
    if (state.result === 'turnLimit') stats.turnCapGames++;
    if (state.result === 'statues') stats.statueGames++;

    let totalStatues = 0;
    for (const p of state.players) {
      const n = p.victoryRow.length;
      totalStatues += n;
      stats.statueDist[n] = (stats.statueDist[n] || 0) + 1;
      stats.supplyEarned.push(p.stats.supplyEarned);
      stats.perGame.recruits.push(p.stats.recruits);
      stats.perGame.events.push(p.stats.eventsPlayed);
      stats.perGame.announcements.push(p.stats.announcements);
      stats.perGame.challenges.push(p.stats.challenges);
    }
    stats.statuesPerGame.push(totalStatues);
    mineLog(state, stats, decks);
  }
  stats.elapsedMs = Date.now() - t0;

  stats.summary = {
    games,
    winRateSlot0: stats.winsBySlot[0] / games,
    winRateSlot1: stats.winsBySlot[1] / games,
    drawRate: stats.draws / games,
    winRateBB: stats.winsByDeck.bb / games,
    winRatePP: stats.winsByDeck.pp / games,
    avgTurns: mean(stats.turns),
    medianTurns: median(stats.turns),
    turnCapRate: stats.turnCapGames / games,
    statueWinRate: stats.statueGames / games,
    avgStatuesPerGame: mean(stats.statuesPerGame),
    avgSupplyEarned: mean(stats.supplyEarned),
    avgRecruits: mean(stats.perGame.recruits),
    avgEvents: mean(stats.perGame.events),
    avgAnnouncements: mean(stats.perGame.announcements),
    avgChallenges: mean(stats.perGame.challenges),
    challengerWinRate: stats.contested ? stats.challengerWins / stats.contested : 0,
  };
  return stats;
}

// ---------------------------------------------------------------- report
function report(stats, { verbose = false } = {}) {
  const s = stats.summary;
  const g = stats.config.games;
  const L = [];
  L.push(`Animal Friends TCG playtest — ${g} games, seed ${stats.config.seed}, P0=${stats.config.p0}, P1=${stats.config.p1}, decks=${stats.config.decks}`);
  L.push(`ran in ${(stats.elapsedMs / 1000).toFixed(2)}s (${(stats.elapsedMs / g).toFixed(1)} ms/game)`);
  L.push('');
  L.push('WIN RATES');
  L.push(`  P0 (${stats.config.p0}): ${stats.winsBySlot[0]}/${g}  ${pct(stats.winsBySlot[0], g)}`);
  L.push(`  P1 (${stats.config.p1}): ${stats.winsBySlot[1]}/${g}  ${pct(stats.winsBySlot[1], g)}`);
  L.push(`  draws:              ${stats.draws}  ${pct(stats.draws, g)}`);
  for (const d of ['bb', 'pp']) {
    const played = stats.gamesByDeckSlot[d][0] + stats.gamesByDeckSlot[d][1];
    L.push(`  deck ${d}: ${stats.winsByDeck[d]}/${played}  ${pct(stats.winsByDeck[d], played)}`
      + `  (as P0 ${stats.winsByDeckSlot[d][0]}/${stats.gamesByDeckSlot[d][0]}, as P1 ${stats.winsByDeckSlot[d][1]}/${stats.gamesByDeckSlot[d][1]})`);
  }
  L.push('');
  L.push('GAME LENGTH');
  L.push(`  average turns: ${s.avgTurns.toFixed(1)}   median: ${s.medianTurns}   min/max: ${Math.min(...stats.turns)}/${Math.max(...stats.turns)}`);
  L.push(`  ended by Statues: ${stats.statueGames} (${pct(stats.statueGames, g)})   hit turn cap: ${stats.turnCapGames} (${pct(stats.turnCapGames, g)})`);
  L.push('');
  L.push('STATUES');
  L.push(`  average Statues gained per game (both players): ${s.avgStatuesPerGame.toFixed(2)} of 9`);
  const dist = Object.keys(stats.statueDist).map(Number).sort((a, b) => a - b);
  L.push(`  final statue-count distribution (per player-game): ${dist.map((k) => `${k}:${stats.statueDist[k]}`).join('  ')}`);
  L.push('');
  L.push('ECONOMY / ACTIVITY (per player-game)');
  L.push(`  supply earned: ${s.avgSupplyEarned.toFixed(1)}   recruits: ${s.avgRecruits.toFixed(1)}   events: ${s.avgEvents.toFixed(1)}`
    + `   announcements: ${s.avgAnnouncements.toFixed(1)}   challenges: ${s.avgChallenges.toFixed(1)}`);
  L.push(`  contested purchases: ${stats.contested} (${(stats.contested / g).toFixed(2)}/game); challenger won ${pct(stats.challengerWins, stats.contested)}`);
  L.push('');
  L.push('MARKET CARDS GAINED (count, bb/pp)');
  const gainRows = set.marketDeck.map((id) => {
    const rec = stats.gains.get(id) || { total: 0, byDeck: { bb: 0, pp: 0 } };
    return { id, name: CARD_BY_ID.get(id).name, type: CARD_BY_ID.get(id).type, ...rec };
  });
  for (const kind of ['statue', 'market']) {
    L.push(`  -- ${kind === 'statue' ? 'Statues' : 'Other Market cards'} --`);
    for (const r of gainRows.filter((r) => r.type === kind).sort((a, b) => b.total - a.total)) {
      L.push(`    ${r.name.padEnd(22)} ${String(r.total).padStart(4)}  (${(r.total / g).toFixed(2)}/game)  bb ${r.byDeck.bb} / pp ${r.byDeck.pp}`);
    }
  }
  L.push('');
  const plays = [...stats.plays.entries()].map(([id, n]) => ({ id, n, name: CARD_BY_ID.get(id)?.name || id, title: CARD_BY_ID.get(id)?.title || '' }));
  plays.sort((a, b) => b.n - a.n || a.id.localeCompare(b.id));
  L.push('PLAYER-DECK CARDS PLAYED (recruited or played as an Event)');
  L.push('  most played:');
  for (const p of plays.slice(0, 5)) L.push(`    ${(p.name + (p.title ? `, ${p.title}` : '')).padEnd(30)} ${(p.n / g).toFixed(2)}/game  (${p.n})`);
  L.push('  least played:');
  for (const p of plays.slice(-5).reverse()) L.push(`    ${(p.name + (p.title ? `, ${p.title}` : '')).padEnd(30)} ${(p.n / g).toFixed(2)}/game  (${p.n})`);

  if (verbose && stats.firstGameLog) {
    L.push('');
    L.push('FULL LOG OF GAME 1');
    L.push(...stats.firstGameLog);
  }
  return L.join('\n');
}

// ---------------------------------------------------------------- CLI
function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    if (key === 'verbose') { o.verbose = true; continue; }
    const v = argv[i + 1];
    i++;
    if (key === 'games' || key === 'seed') o[key] = Number(v);
    else if (key === 'aggression') o[key] = Number(v);
    else o[key] = v;
  }
  return o;
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const opts = parseArgs(process.argv.slice(2));
  const stats = await runPlaytest(opts);
  console.log(report(stats, { verbose: !!opts.verbose }));
}

export { report };
