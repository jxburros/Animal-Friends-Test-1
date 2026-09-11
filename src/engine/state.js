// Game state construction and pure query helpers for Animal Friends TCG.
import { seedRng, shuffle } from './rng.js';

export const UPRIGHT = 0;
export const BUSY = 270;

export function indexSet(set) {
  const cardsById = Object.fromEntries(set.cards.map((c) => [c.id, c]));
  const decksById = Object.fromEntries(set.decks.map((d) => [d.id, d]));
  return { ...set, cardsById, decksById };
}

export function cardDef(state, cardId) {
  const c = state.set.cardsById[cardId];
  if (!c) throw new Error(`Unknown card id ${cardId}`);
  return c;
}

export function rankOf(rules, cost) {
  for (const [name, r] of Object.entries(rules.ranks)) {
    if (cost >= r.minCost && cost <= r.maxCost) return name;
  }
  return 'master';
}

export function entryOrientation(rules, cost) {
  return rules.ranks[rankOf(rules, cost)].entryOrientation;
}

let uidCounter = 0;
export function nextUid(state) {
  state.uidCounter = (state.uidCounter || 0) + 1;
  return state.uidCounter;
}

function makePlayer(state, index, name, deckId) {
  const deck = state.set.decksById[deckId];
  if (!deck) throw new Error(`Unknown deck ${deckId}`);
  const cards = [];
  for (const [cardId, count] of Object.entries(deck.list)) {
    for (let i = 0; i < count; i++) cards.push({ uid: nextUid(state), cardId });
  }
  shuffle(state, cards);
  return {
    index,
    name,
    deckId,
    deck: cards,
    hand: [],
    town: [], // character stacks
    events: [], // limited events in town: {uid, cardId, remaining}
    dump: [], // town dump: card instances
    unemployment: [], // card instances
    victoryRow: [], // statue card ids
    held: [], // market cards whose effect is still pending (for display)
    supply: 0,
    escrow: 0,
    mods: [], // {key, value, expires, consumable}
    turn: freshTurnCounters(),
    stats: { supplyEarned: 0, shiftsCompleted: 0, recruits: 0, eventsPlayed: 0, announcements: 0, challenges: 0, purchasesWon: 0 },
  };
}

export function freshTurnCounters() {
  return { eventsPlayed: 0, announcements: 0, bids: 0, recruits: 0, shiftsCompleted: 0, usedOnce: [], ingenuityUsed: false };
}

/**
 * Create a new game.
 * @param rules  parsed spec/game.json
 * @param set    parsed spec/starter_card_set.json (indexed or raw)
 * @param opts   { seed, decks:[deckId, deckId], names:[..] }
 */
export function createGame(rules, set, opts = {}) {
  const indexed = set.cardsById ? set : indexSet(set);
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  const state = {
    rules,
    set: indexed,
    seed,
    rng: seedRng(seed),
    uidCounter: 0,
    turnNumber: 0, // counts player turns played
    active: 0,
    phase: 'setup',
    players: [],
    market: { deck: [], city: [], cityDump: [], outOfPlay: [], pending: [] },
    log: [],
    winner: null,
    result: null,
    actionCount: 0,
  };
  const deckIds = opts.decks || [indexed.decks[0].id, indexed.decks[1 % indexed.decks.length].id];
  const names = opts.names || ['Mayor 1', 'Mayor 2'];
  state.players = [makePlayer(state, 0, names[0], deckIds[0]), makePlayer(state, 1, names[1], deckIds[1])];
  state.players.forEach((p, i) => {
    p.supply = rules.setup.startingSupply + (i === 1 ? rules.setup.secondPlayerBonusSupply : 0);
    for (let k = 0; k < rules.setup.startingHand; k++) {
      const c = p.deck.shift();
      if (c) p.hand.push(c);
    }
  });
  state.market.deck = shuffle(state, indexed.marketDeck.slice());
  refillCity(state);
  state.phase = 'start';
  log(state, null, `A new game of ${indexed.name} begins. ${names[0]} plays ${indexed.decksById[deckIds[0]].name}; ${names[1]} plays ${indexed.decksById[deckIds[1]].name}.`);
  return state;
}

export function refillCity(state) {
  const m = state.market;
  if (m.city.length > 0) return false;
  if (m.deck.length === 0 && m.cityDump.length > 0) {
    m.deck = shuffle(state, m.cityDump.splice(0));
    log(state, null, 'The City Dump is shuffled back into the Market Deck.');
  }
  while (m.city.length < state.rules.setup.capitalCitySize && m.deck.length > 0) m.city.push(m.deck.shift());
  if (m.city.length) log(state, null, `The Capital City is restocked: ${m.city.map((id) => cardDef(state, id).name).join(', ')}.`);
  return true;
}

export function log(state, player, text) {
  state.log.push({ turn: state.turnNumber, player, text });
}

// ---------- queries ----------
export function opponentOf(pi) {
  return 1 - pi;
}
export function topCard(state, stack) {
  return cardDef(state, stack.cards[0].cardId);
}
export function findStack(state, pi, uid) {
  return state.players[pi].town.find((s) => s.uid === uid) || null;
}
export function isUpright(stack) {
  return stack.orientation === UPRIGHT;
}
export function canAct(stack) {
  return stack.orientation === UPRIGHT && !stack.shift;
}
export function uprightStacks(state, pi) {
  return state.players[pi].town.filter(canAct);
}
export function stackRank(state, stack) {
  return rankOf(state.rules, topCard(state, stack).cost);
}
export function speciesInTown(state, pi) {
  return new Set(state.players[pi].town.map((s) => topCard(state, s).species));
}
export function statueCount(state, pi) {
  return state.players[pi].victoryRow.length;
}

export function getMod(player, key) {
  return player.mods.filter((m) => m.key === key).reduce((a, m) => a + m.value, 0);
}
export function hasMod(player, key) {
  return player.mods.some((m) => m.key === key);
}
export function consumeMod(player, key, amount = Infinity) {
  // Consume up to `amount` from mods with this key (untilUsed / consumable mods are removed when spent).
  let used = 0;
  for (const m of player.mods.slice()) {
    if (m.key !== key) continue;
    const take = Math.min(m.value, amount - used);
    used += take;
    m.value -= take;
    if (m.value <= 0 || m.expires === 'untilUsed' || m.consumable) player.mods.splice(player.mods.indexOf(m), 1);
    if (used >= amount) break;
  }
  return used;
}
export function expireMods(player, when) {
  player.mods = player.mods.filter((m) => m.expires !== when);
}

// Sources of abilities for a player: town character stacks (top card), limited events, statues.
export function abilitySources(state, pi) {
  const p = state.players[pi];
  const out = [];
  for (const s of p.town) {
    const def = topCard(state, s);
    for (const [i, ab] of (def.abilities || []).entries()) out.push({ kind: 'character', stack: s, def, ability: ab, key: `c${s.uid}:${i}` });
  }
  for (const e of p.events) {
    const def = cardDef(state, e.cardId);
    for (const [i, ab] of (def.abilities || []).entries()) out.push({ kind: 'event', event: e, def, ability: ab, key: `e${e.uid}:${i}` });
  }
  for (const [j, id] of p.victoryRow.entries()) {
    const def = cardDef(state, id);
    for (const [i, ab] of (def.abilities || []).entries()) out.push({ kind: 'statue', def, ability: ab, key: `s${j}:${i}` });
  }
  return out;
}

export function hasPassive(state, pi, key) {
  return abilitySources(state, pi).some((src) => {
    const ab = src.ability;
    if (ab.trigger !== 'passive' || ab.key !== key) return false;
    if (ab.requiresUpright && src.kind === 'character' && !isUpright(src.stack)) return false;
    return true;
  });
}

// Serialisation helpers (the card set is data, not state).
export function serialize(state) {
  const { set, rules, ...rest } = state;
  return JSON.stringify({ ...rest, setId: set.setId });
}
export function deserialize(json, rules, set) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  return { ...data, rules, set: set.cardsById ? set : indexSet(set) };
}
export function cloneState(state) {
  return deserialize(serialize(state), state.rules, state.set);
}
