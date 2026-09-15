// A Mayor: the save file behind a player. Name, the card that stands for them, the cards they own,
// the decks they have, the coins they have earned, and the games they have not finished.
//
// Pure data in, data out. Nothing here reads `localStorage`, touches the DOM or imports the ui
// layer, so every rule below is testable headlessly — ui/store.js is the only file that persists
// any of it. Functions that change a Mayor mutate and return it, which is how the engine already
// treats game state.
//
// Inventory is counted per printing, because collecting a foil is the point of opening a pack:
//
//   inventory: { mk_beck_bylaw_reader_1: { regular: 2, foil: 1 } }
//
// but for deck legality a copy is a copy — `ownedCopies` sums across printings, and a printing
// never changes a card's rules, rarity or legality (see engine/boosterPack.js, ui/versions.js).
//
// The Sandbox Mayor owns everything without materialising anything: `sandbox: true` makes
// `ownedCopies` answer Infinity and `hasDeck` answer true for every card and deck in the set.
import { deckRules, maxCopiesOf, DECK_TYPES } from './deckbuilding.js';

/** Bumped when a stored Mayor's shape changes in a way older data cannot be read as. */
export const PROFILE_VERSION = 1;

/** The printing every card has, and the one a granted deck list arrives in. */
export const REGULAR = 'regular';

/** Progression defaults, filled in for a spec/progression.json that predates a knob. */
export function progressionRules(spec = {}) {
  const rewards = spec.rewards || {};
  return {
    startingCoins: spec.startingCoins ?? 0,
    startingPacks: spec.startingPacks ?? 1,
    win: { coins: rewards.win?.coins ?? 60, packs: rewards.win?.packs ?? 1 },
    loss: { coins: rewards.loss?.coins ?? 20, packs: rewards.loss?.packs ?? 0 },
    firstWinWithDeck: { coins: rewards.firstWinWithDeck?.coins ?? 0, packs: rewards.firstWinWithDeck?.packs ?? 0 },
    packPrice: spec.packPrice ?? 100,
    deckPrice: spec.deckPrice ?? 500,
    deckCoverage: spec.deckCoverage ?? 0.7,
    maxSavedGames: spec.maxSavedGames ?? 5,
  };
}

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function deckListOf(set, deckId) {
  const byId = set.decksById || Object.fromEntries(set.decks.map((d) => [d.id, d]));
  const deck = byId[deckId];
  if (!deck) throw new Error(`Unknown deck ${deckId}`);
  return deck.list;
}

/**
 * A new Mayor. `starterDeckId` names the printed deck they begin with: its whole list lands in the
 * collection in Regular printings and the deck itself is unlocked, so the deck they chose is a deck
 * they can play and take apart. A Sandbox Mayor takes no starter deck — it owns the set.
 */
export function createProfile({ name, avatar = null, starterDeckId = null, sandbox = false } = {}, set = null, progression = {}) {
  const pr = progressionRules(progression);
  const profile = {
    version: PROFILE_VERSION,
    id: newId(sandbox ? 'sandbox' : 'mayor'),
    name: (name || '').trim() || (sandbox ? 'Sandbox' : 'Mayor'),
    avatar,
    sandbox: !!sandbox,
    createdAt: Date.now(),
    starterDeckId: sandbox ? null : starterDeckId,
    coins: sandbox ? Infinity : pr.startingCoins,
    packs: sandbox ? 0 : pr.startingPacks,
    inventory: {},
    decks: [],
    customDecks: [],
    stats: { played: 0, won: 0, lost: 0, packsOpened: 0 },
    wonWith: [],
    history: [],
    games: [],
  };
  if (!sandbox && starterDeckId && set) unlockDeck(profile, set, starterDeckId);
  return profile;
}

// ---------- the collection ----------

/** How many copies of a card the Mayor owns, across every printing. */
export function ownedCopies(profile, cardId) {
  if (profile.sandbox) return Infinity;
  const byPrinting = profile.inventory[cardId];
  if (!byPrinting) return 0;
  let total = 0;
  for (const n of Object.values(byPrinting)) total += n > 0 ? n : 0;
  return total;
}

/** Does the Mayor own this card at all, in any printing? */
export function owns(profile, cardId) {
  return ownedCopies(profile, cardId) > 0;
}

/** Does the Mayor own this card in this particular printing? */
export function ownsPrinting(profile, cardId, printing) {
  if (profile.sandbox) return true;
  return (profile.inventory[cardId]?.[printing] || 0) > 0;
}

/** How many of one printing the Mayor holds. */
export function copiesOfPrinting(profile, cardId, printing) {
  if (profile.sandbox) return Infinity;
  return profile.inventory[cardId]?.[printing] || 0;
}

/** Every printing key the Mayor owns this card in, in inventory order. */
export function ownedPrintingsOf(profile, cardId) {
  const byPrinting = profile.inventory[cardId] || {};
  return Object.keys(byPrinting).filter((key) => byPrinting[key] > 0);
}

/** How many distinct cards the collection holds. */
export function collectionSize(profile) {
  return Object.keys(profile.inventory).filter((id) => ownedCopies(profile, id) > 0).length;
}

/** Add copies of one card in one printing. The Sandbox Mayor owns it already, so this is a no-op. */
export function grantCard(profile, cardId, printing = REGULAR, count = 1) {
  if (profile.sandbox || count <= 0) return profile;
  const byPrinting = profile.inventory[cardId] || (profile.inventory[cardId] = {});
  byPrinting[printing] = (byPrinting[printing] || 0) + count;
  return profile;
}

/** Add a whole `{ cardId: count }` list in one printing — how a deck arrives. */
export function grantList(profile, list, printing = REGULAR) {
  for (const [cardId, count] of Object.entries(list)) grantCard(profile, cardId, printing, count);
  return profile;
}

/**
 * Add an opened pack. `draws` is what `openPack` returns: `{ cardId, printing }` per card. Returns
 * the draws annotated with `isNew` — whether that printing was one the Mayor had never held — so
 * the reveal can say so, which is the whole feeling of opening a pack.
 */
export function grantPack(profile, draws) {
  const seen = draws.map((draw) => {
    const isNew = !profile.sandbox && copiesOfPrinting(profile, draw.cardId, draw.printing) === 0;
    grantCard(profile, draw.cardId, draw.printing, 1);
    return { ...draw, isNew };
  });
  profile.stats.packsOpened += 1;
  return seen;
}

// ---------- deck legality against the collection ----------

/**
 * The most copies of a card a deck may hold for this Mayor: the rarity limit the set already
 * imposes, capped by how many they actually own.
 */
export function availableCopies(rules, set, profile, cardId) {
  const byId = set.cardsById || Object.fromEntries(set.cards.map((c) => [c.id, c]));
  const def = byId[cardId];
  if (!def) return 0;
  const limit = maxCopiesOf(deckRules(rules), def);
  return Math.min(limit, ownedCopies(profile, cardId));
}

/**
 * Every way a deck list asks for cards this Mayor does not have, as player-facing sentences. This
 * sits alongside `deckProblems` rather than replacing it: the rarity limits still apply, and the
 * collection applies on top of them.
 */
export function collectionProblems(rules, set, list, profile) {
  if (profile.sandbox) return [];
  const byId = set.cardsById || Object.fromEntries(set.cards.map((c) => [c.id, c]));
  const problems = [];
  for (const [cardId, count] of Object.entries(list)) {
    if (!count) continue;
    const def = byId[cardId];
    if (!def) continue; // deckProblems already says this card does not exist
    const held = ownedCopies(profile, cardId);
    if (count > held) {
      problems.push(held === 0
        ? `${def.name}: you do not have this card.`
        : `${def.name}: ${count} copies, and you have ${held}.`);
    }
  }
  return problems;
}

/** Cards of the set this Mayor could legally build with right now. */
export function buildableCards(set, profile) {
  return set.cards.filter((c) => DECK_TYPES.has(c.type) && (profile.sandbox || ownedCopies(profile, c.id) > 0));
}

// ---------- decks ----------

export function hasDeck(profile, deckId) {
  return !!profile.sandbox || profile.decks.includes(deckId);
}

/** The printed decks this Mayor may play, in set order. */
export function unlockedDecks(set, profile) {
  return set.decks.filter((d) => hasDeck(profile, d.id));
}

/**
 * Open a printed deck and grant its whole list. A deck is a bundle of cards: a deck you own is
 * always a deck you can play and always a deck you can take apart in the Workshop. Granting only
 * the copies still missing means buying a deck twice is never a way to farm duplicates.
 */
export function unlockDeck(profile, set, deckId) {
  if (profile.sandbox) return profile;
  const list = deckListOf(set, deckId);
  for (const [cardId, count] of Object.entries(list)) {
    const short = count - ownedCopies(profile, cardId);
    if (short > 0) grantCard(profile, cardId, REGULAR, short);
  }
  if (!profile.decks.includes(deckId)) profile.decks.push(deckId);
  return profile;
}

/** How much of a printed deck's list the collection already covers, 0..1. */
export function deckCoverage(profile, set, deckId) {
  if (profile.sandbox) return 1;
  const list = deckListOf(set, deckId);
  let wanted = 0;
  let held = 0;
  for (const [cardId, count] of Object.entries(list)) {
    wanted += count;
    held += Math.min(count, ownedCopies(profile, cardId));
  }
  return wanted ? held / wanted : 1;
}

/**
 * Unlock every printed deck that packs have already very nearly filled. Chasing one card has a
 * second prize attached: cross `deckCoverage` of a deck's list and the rest is granted free.
 * Returns the deck ids newly opened, so the app can say which.
 */
export function autoUnlockDecks(profile, set, progression = {}) {
  if (profile.sandbox) return [];
  const threshold = progressionRules(progression).deckCoverage;
  const opened = [];
  for (const deck of set.decks) {
    if (hasDeck(profile, deck.id)) continue;
    if (deckCoverage(profile, set, deck.id) >= threshold) {
      unlockDeck(profile, set, deck.id);
      opened.push(deck.id);
    }
  }
  return opened;
}

// ---------- custom decks ----------

export function saveCustomDeck(profile, deck) {
  profile.customDecks = profile.customDecks.filter((d) => d.id !== deck.id);
  profile.customDecks.push(deck);
  return profile;
}

export function deleteCustomDeck(profile, deckId) {
  profile.customDecks = profile.customDecks.filter((d) => d.id !== deckId);
  return profile;
}

/**
 * Drop printing choices the Mayor no longer owns, so a deck built around a foil still plays when
 * that foil is gone. Which printing a deck shows is cosmetic; losing it never costs a card.
 */
export function sanePrintings(profile, deck) {
  const chosen = deck.printings || {};
  const kept = {};
  for (const [cardId, printing] of Object.entries(chosen)) {
    if (printing !== REGULAR && ownsPrinting(profile, cardId, printing)) kept[cardId] = printing;
  }
  return kept;
}

// ---------- coins and the shop ----------

export function canAfford(profile, price) {
  return profile.sandbox || profile.coins >= price;
}

export function addCoins(profile, n) {
  if (!profile.sandbox) profile.coins += n;
  return profile;
}

export function spendCoins(profile, price) {
  if (profile.sandbox) return true;
  if (profile.coins < price) return false;
  profile.coins -= price;
  return true;
}

/** Buy one sealed pack. It goes on the shelf; opening it is its own moment. */
export function buyPack(profile, progression = {}) {
  const pr = progressionRules(progression);
  if (profile.sandbox) return true;
  if (!spendCoins(profile, pr.packPrice)) return false;
  profile.packs += 1;
  return true;
}

/** Buy a printed deck outright, at `deckPrice`. */
export function buyDeck(profile, set, deckId, progression = {}) {
  const pr = progressionRules(progression);
  if (profile.sandbox || hasDeck(profile, deckId)) return false;
  if (!spendCoins(profile, pr.deckPrice)) return false;
  unlockDeck(profile, set, deckId);
  return true;
}

/** Take a sealed pack off the shelf, if there is one. */
export function takePack(profile) {
  if (profile.sandbox) return true;
  if (profile.packs <= 0) return false;
  profile.packs -= 1;
  return true;
}

// ---------- results ----------

/**
 * Record a finished game and pay for it. A win pays a pack and coins, a loss pays coins alone so a
 * bad run still moves forward, and the first win with a given deck pays a bonus. Returns the reward
 * that was paid, for the screen that has to announce it. The Sandbox Mayor is a testing tool: it
 * plays games and keeps no record of them.
 */
export function recordResult(profile, result, progression = {}) {
  const pr = progressionRules(progression);
  if (profile.sandbox) return { coins: 0, packs: 0, firstWin: false };
  const won = !!result.won;
  profile.stats.played += 1;
  if (won) profile.stats.won += 1; else profile.stats.lost += 1;

  const base = won ? pr.win : pr.loss;
  const firstWin = won && result.deckId && !profile.wonWith.includes(result.deckId);
  if (firstWin) profile.wonWith.push(result.deckId);
  const reward = {
    coins: base.coins + (firstWin ? pr.firstWinWithDeck.coins : 0),
    packs: base.packs + (firstWin ? pr.firstWinWithDeck.packs : 0),
    firstWin: !!firstWin,
  };
  addCoins(profile, reward.coins);
  profile.packs += reward.packs;
  profile.history.unshift({
    at: Date.now(),
    won,
    deckId: result.deckId || null,
    deckName: result.deckName || null,
    opponentDeckId: result.opponentDeckId || null,
    opponentDeckName: result.opponentDeckName || null,
    marketId: result.marketId || null,
    turns: result.turns ?? null,
    seed: result.seed ?? null,
  });
  return reward;
}

// ---------- unfinished games ----------

/** Put a game on the shelf, replacing any earlier save of the same game. Newest first. */
export function putSavedGame(profile, entry, progression = {}) {
  const max = progressionRules(progression).maxSavedGames;
  profile.games = profile.games.filter((g) => g.id !== entry.id);
  profile.games.unshift(entry);
  if (profile.games.length > max) profile.games.length = max;
  return profile;
}

export function dropSavedGame(profile, id) {
  profile.games = profile.games.filter((g) => g.id !== id);
  return profile;
}

export function savedGame(profile, id) {
  return profile.games.find((g) => g.id === id) || null;
}

// ---------- the Mayor themselves ----------

/** The card that stands for a Mayor. It has to be a card they own — a portrait is a thing earned. */
export function canBeAvatar(profile, cardId, printing = REGULAR) {
  return profile.sandbox || ownsPrinting(profile, cardId, printing);
}

export function setAvatar(profile, cardId, printing = REGULAR) {
  if (!canBeAvatar(profile, cardId, printing)) return false;
  profile.avatar = { cardId, printing };
  return true;
}

export function renameProfile(profile, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return false;
  profile.name = trimmed;
  return true;
}
