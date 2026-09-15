#!/usr/bin/env node
// Temporary mono-identity decks, built and playtested in memory only.
//
//   node scripts/mono-playtest.mjs [--games N] [--seed S] [--market <id>] [--kind species|study|both]
//
// Question this answers: does any one species, or any one field of study, simply have better cards
// than the others? Fifteen printed towns each mix two species and two studies, so a weak card pool
// is always shared out and hard to see. These decks isolate one variable at a time: a "mono" deck
// takes every Character, Event and Town Building it can from a *single* species (studies left open)
// or a single study (species left open), built by the same best-fit-then-best-rated logic
// `build-decks.mjs` uses for the printed towns, with no novelty tie-break — each one is simply the
// strongest deck obtainable for that one species or study.
//
// Nothing here is written to spec/maker_card_set.json. The decks are plain `{ id, name, list }`
// objects, which `createGame`/`resolveDeck` accept directly (see src/engine/state.js), so this script
// never touches the printed collection or the Deck Workshop.
//
// Every mono deck of one kind (species, or study) plays every other of the same kind, both seats,
// on one Capital City (The Founders' Fair by default — the market that weighs its whole catalogue
// evenly, so no market's own leaning favours one species or study over another).

import fs from 'node:fs';
import { createGame, playGame } from '../src/engine/index.js';
import { makeHeuristicAgent } from '../src/ai/heuristic.js';
import { deckProblems, deckRules, maxCopiesOf } from '../src/engine/deckbuilding.js';

const rules = JSON.parse(fs.readFileSync(new URL('../spec/game.json', import.meta.url)));
const set = JSON.parse(fs.readFileSync(new URL('../spec/maker_card_set.json', import.meta.url)));
const cards = set.cards;
const dr = deckRules(rules);
const DECK_SIZE = dr.minDeckSize;

// ---------------------------------------------------------------- the builder (see build-decks.mjs)
const CURVE = { 0: 2, 1: 4, 2: 5, 3: 5, 4: 3, 5: 2 };
const CHARACTER_TARGET = Object.values(CURVE).reduce((a, b) => a + b, 0);
const BUILDING_TARGET = 3;
const EVENT_TARGET = DECK_SIZE - CHARACTER_TARGET - BUILDING_TARGET;
const ECONOMY_FLOOR = 22;
const THROUGHPUT_FLOOR = 42;
const EVENT_CAP = 12;
const COPY_CAP = 2;
const TOP_RARITY_CAP = 5;

const score = (c) => (c.power && c.power.score) || 0;
// No novelty tie-break here: unlike the printed towns, each mono deck is built independently, as the
// strongest deck obtainable for its one species or study, not as one stop on a tour of the collection.
const pick = (ident) => (a, b) => affinity(b, ident) - affinity(a, ident)
  || score(b) - score(a)
  || a.id.localeCompare(b.id);

const mentionsOf = (c) => {
  const blob = JSON.stringify([c.abilities || [], c.effect || null, c.onGain || null, c.onReveal || null]);
  return (re) => re.test(blob);
};

function affinity(card, ident) {
  let a = 0;
  if (ident.species.includes(card.species)) a += 3;
  if (ident.studies.includes(card.study)) a += 2;
  for (const r of card.requires || []) {
    if (ident.species.includes(r.species)) a += 2;
    if (ident.studies.includes(r.study)) a += 2;
    if (r.name) a += cards.some((c) => c.name === r.name && ident.species.includes(c.species)) ? 2 : -3;
  }
  return a;
}

function build(ident) {
  const list = {};
  const count = () => Object.values(list).reduce((a, b) => a + b, 0);
  const topCopies = () => Object.entries(list).reduce((a, [id, n]) => {
    const r = cards.find((c) => c.id === id).rarity;
    return a + (r === 'Super Rare' || r === 'Legendary' ? n : 0);
  }, 0);
  const hasRoomFor = (card) => (list[card.id] || 0) < Math.min(COPY_CAP, maxCopiesOf(dr, card))
    && !((card.rarity === 'Super Rare' || card.rarity === 'Legendary') && topCopies() >= TOP_RARITY_CAP);
  const take = (card, n) => {
    const limit = Math.min(COPY_CAP, maxCopiesOf(dr, card));
    let room = Math.min(n, limit - (list[card.id] || 0), DECK_SIZE - count());
    if (card.rarity === 'Super Rare' || card.rarity === 'Legendary') {
      room = Math.min(room, TOP_RARITY_CAP - topCopies());
    }
    if (room > 0) list[card.id] = (list[card.id] || 0) + room;
    return Math.max(0, room);
  };

  const curveShare = (cost) => CURVE[cost] / CHARACTER_TARGET;
  const charCount = () => Object.entries(list).reduce((a, [id, n]) => a + (cards.find((c) => c.id === id).type === 'character' ? n : 0), 0);
  const atCost = (cost) => Object.entries(list).reduce((a, [id, n]) => {
    const c = cards.find((x) => x.id === id);
    return a + (c.type === 'character' && c.cost === cost ? n : 0);
  }, 0);
  const shortfall = (card) => (card.type !== 'character' ? 0 : curveShare(card.cost) * Math.max(charCount(), CHARACTER_TARGET) - atCost(card.cost));
  const byCurveThen = (ident2) => (a, b) => shortfall(b) - shortfall(a) || pick(ident2)(a, b);

  for (const [cost, want] of Object.entries(CURVE)) {
    const band = cards
      .filter((c) => c.type === 'character' && c.cost === Number(cost) && affinity(c, ident) > 0)
      .sort(pick(ident));
    let got = atCost(Number(cost));
    for (const c of band) {
      if (got >= want) break;
      got += take(c, Math.min(want - got, maxCopiesOf(dr, c)));
    }
  }
  let chars = charCount();
  if (chars < CHARACTER_TARGET) {
    const rest = cards.filter((c) => c.type === 'character' && !list[c.id]).sort(pick(ident));
    for (const c of rest) {
      if (chars >= CHARACTER_TARGET) break;
      chars += take(c, Math.min(2, CHARACTER_TARGET - chars));
    }
  }

  const buildings = cards.filter((c) => c.type === 'townBuilding').sort(pick(ident));
  let blds = 0;
  for (const c of buildings) {
    if (blds >= BUILDING_TARGET) break;
    blds += take(c, Math.min(COPY_CAP, BUILDING_TARGET - blds));
  }

  const chosenChars = Object.entries(list)
    .map(([id, n]) => ({ card: cards.find((c) => c.id === id), n }))
    .filter((e) => e.card.type === 'character');
  const bodiesMatching = (req) => chosenChars.reduce((a, e) => {
    const c = e.card;
    if (req.name) return a + (c.name === req.name ? e.n : 0);
    if (req.species && c.species !== req.species) return a;
    if (req.study && c.study !== req.study) return a;
    return a + e.n;
  }, 0);
  const playability = (ev) => {
    let worst = Infinity;
    for (const r of ev.requires || []) {
      const need = r.count || 1;
      worst = Math.min(worst, bodiesMatching(r) / need);
    }
    return worst === Infinity ? 6 : worst;
  };
  const eventFloor = (ev) => ((ev.requires || []).some((r) => r.name) ? 2 : 3);
  const events = cards.filter((c) => c.type === 'event' && playability(c) >= eventFloor(c))
    .sort((a, b) => playability(b) - playability(a) || pick(ident)(a, b));
  let evs = 0;
  for (const c of events) {
    if (evs >= Math.min(EVENT_TARGET, EVENT_CAP) || count() >= DECK_SIZE) break;
    evs += take(c, Math.min(COPY_CAP, Math.min(EVENT_TARGET, EVENT_CAP) - evs));
  }

  const economyOf = (card) => {
    const working = card.shift && card.shift.output > 0 ? 1 : 0;
    const blob = JSON.stringify([card.abilities || [], card.effect || null, card.onGain || null]);
    return working + (blob.match(/"gainSupply"/g) || []).length + (blob.match(/"draw"/g) || []).length;
  };
  const economyCount = () => Object.entries(list).reduce((a, [id, n]) => a + (economyOf(cards.find((c) => c.id === id)) ? n : 0), 0);
  if (economyCount() < ECONOMY_FLOOR) {
    const engines = cards
      .filter((c) => (c.type === 'character' || c.type === 'event') && economyOf(c) > 0 && (list[c.id] || 0) < maxCopiesOf(dr, c))
      .filter((c) => c.type !== 'event' || playability(c) >= eventFloor(c))
      .sort(byCurveThen(ident));
    const droppable = Object.keys(list)
      .map((id) => cards.find((c) => c.id === id))
      .filter((c) => !economyOf(c))
      .sort((a, b) => pick(ident)(b, a));
    let di = 0;
    for (const c of engines) {
      if (economyCount() >= ECONOMY_FLOOR) break;
      while (count() >= DECK_SIZE && di < droppable.length) {
        const drop = droppable[di];
        if (list[drop.id]) { list[drop.id]--; if (!list[drop.id]) delete list[drop.id]; }
        di++;
      }
      take(c, 1);
    }
  }

  const rateOf = (c) => (c.type === 'character' && c.shift && c.shift.delay ? c.shift.output / c.shift.delay : 0);
  const throughput = () => Object.entries(list).reduce((a, [id, n]) => a + rateOf(cards.find((c) => c.id === id)) * n, 0);
  if (throughput() < THROUGHPUT_FLOOR) {
    const spare = () => Object.keys(list)
      .map((id) => cards.find((c) => c.id === id))
      .filter((c) => c.type === 'event')
      .sort((a, b) => pick(ident)(b, a))[0];
    let guard = 0;
    while (throughput() < THROUGHPUT_FLOOR && guard++ < DECK_SIZE) {
      const hirable = cards.filter((c) => c.type === 'character' && hasRoomFor(c));
      const room = hirable.filter((c) => shortfall(c) > 0);
      const earner = (room.length ? room : hirable)
        .sort((a, b) => Math.round(rateOf(b)) - Math.round(rateOf(a))
          || shortfall(b) - shortfall(a) || pick(ident)(a, b))[0];
      if (!earner) break;
      if (count() >= DECK_SIZE) {
        const drop = spare();
        if (!drop) break;
        list[drop.id]--;
        if (!list[drop.id]) delete list[drop.id];
      }
      if (!take(earner, 1)) break;
    }
  }

  if (count() < DECK_SIZE) {
    while (count() < DECK_SIZE) {
      const next = cards.filter((c) => c.type === 'character' && hasRoomFor(c)).sort(byCurveThen(ident))[0];
      if (!next || !take(next, 1)) break;
    }
  }
  for (const pool of [cards.filter((c) => c.type === 'character'), cards.filter((c) => c.type === 'event')]) {
    while (count() < DECK_SIZE) {
      const next = pool.filter(hasRoomFor).sort(byCurveThen(ident))[0];
      if (!next || !take(next, 1)) break;
    }
  }
  return list;
}

// ---------------------------------------------------------------- build the mono decks
const SPECIES = [...new Set(cards.filter((c) => c.type === 'character').map((c) => c.species))].sort();
const STUDIES = [...new Set(cards.filter((c) => c.type === 'character').map((c) => c.study))].sort();

function monoDecks(kind) {
  const names = kind === 'species' ? SPECIES : STUDIES;
  return names.map((name) => {
    const ident = kind === 'species' ? { species: [name], studies: [] } : { species: [], studies: [name] };
    const list = build(ident);
    return { id: `tmp-${kind}-${name.toLowerCase()}`, name: `${name} Mono`, kind, key: name, list };
  });
}

// ---------------------------------------------------------------- playtest a round robin
async function roundRobin(decks, { games, baseSeed, market }) {
  const winsByKey = Object.fromEntries(decks.map((d) => [d.key, 0]));
  const playedByKey = Object.fromEntries(decks.map((d) => [d.key, 0]));
  const pairs = decks.flatMap((a) => decks.filter((b) => b !== a).map((b) => [a, b]));
  let g = 0;
  for (const [a, b] of pairs) {
    for (let i = 0; i < games; i++) {
      const seed = baseSeed + g;
      const state = createGame(rules, set, { seed, decks: [a, b], market, names: [a.name, b.name] });
      const p0 = makeHeuristicAgent({ seed: seed * 7 + 1 });
      const p1 = makeHeuristicAgent({ seed: seed * 13 + 3 });
      await playGame(state, [p0, p1]);
      playedByKey[a.key]++;
      playedByKey[b.key]++;
      if (state.winner === 0) winsByKey[a.key]++;
      else if (state.winner === 1) winsByKey[b.key]++;
      g++;
    }
  }
  return decks.map((d) => ({ key: d.key, games: playedByKey[d.key], wins: winsByKey[d.key], winRate: winsByKey[d.key] / playedByKey[d.key] }))
    .sort((x, y) => y.winRate - x.winRate);
}

// ---------------------------------------------------------------- CLI
function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const v = argv[i + 1];
    i++;
    if (key === 'games' || key === 'seed') o[key] = Number(v);
    else o[key] = v;
  }
  return o;
}

const opts = parseArgs(process.argv.slice(2));
const games = opts.games ?? 12;
const baseSeed = opts.seed ?? 1;
const market = opts.market ?? 'mk-founders-fair';
const kind = opts.kind ?? 'both';

const runs = [];
if (kind === 'species' || kind === 'both') runs.push(['species', monoDecks('species')]);
if (kind === 'study' || kind === 'both') runs.push(['study', monoDecks('study')]);

for (const [k, decks] of runs) {
  console.log(`\n=== ${k.toUpperCase()} MONO DECKS ===`);
  for (const d of decks) {
    const problems = deckProblems(rules, set, d.list);
    const total = Object.values(d.list).reduce((a, b) => a + b, 0);
    console.log(`  ${d.name.padEnd(20)} ${total} cards, ${Object.keys(d.list).length} distinct`
      + (problems.length ? `  PROBLEMS: ${problems.join(' ')}` : ''));
  }
}

for (const [k, decks] of runs) {
  const t0 = Date.now();
  const table = await roundRobin(decks, { games, baseSeed, market });
  const ms = Date.now() - t0;
  console.log(`\n=== ${k.toUpperCase()} WIN RATES (${games} games/pairing, ${decks.length} decks, market ${market}, ${(ms / 1000).toFixed(1)}s) ===`);
  for (const r of table) {
    console.log(`  ${r.key.padEnd(16)} ${(100 * r.winRate).toFixed(1)}%  (${r.wins}/${r.games})`);
  }
  const spread = 100 * (table[0].winRate - table[table.length - 1].winRate);
  console.log(`  spread: ${spread.toFixed(1)} points (${table[0].key} best, ${table[table.length - 1].key} worst)`);
}
