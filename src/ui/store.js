// Where a Mayor is kept. The only file in the game that reads or writes `localStorage` for
// progress: engine/profile.js decides what a Mayor is, this decides where they live.
//
// Two keys hold everything — `af-profiles`, one JSON array of Mayors, and `af-active-profile`, the
// id of the one in play. The browser preferences the game already stores (`af-pace`, `af-welcome`,
// `af-log-folded`) are left exactly where they are: they are settings, not progress, and they are
// shared by every Mayor on this machine.
//
// Storage is treated as a courtesy, never a requirement. A private window that refuses
// `localStorage` still plays a full session out of the in-memory copy below — it just does not
// remember it afterwards. That is the rule the rest of the codebase already follows.
import {
  createProfile, saveCustomDeck, PROFILE_VERSION,
} from '../engine/profile.js';

const PROFILES_KEY = 'af-profiles';
const ACTIVE_KEY = 'af-active-profile';
/** The Deck Workshop's old key, from before there were Mayors to own the decks. */
const LEGACY_DECKS_KEY = 'af-custom-decks-maker';

/** Everything, held in memory too, so a browser that refuses storage still plays a whole session. */
let cache = null;
let activeId = null;
let storageWorks = true;

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    storageWorks = false;
    return null;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    storageWorks = false;
    return false;
  }
}

/** False once a write has been refused: the app can say "this session will not be remembered". */
export function isRemembering() {
  return storageWorks;
}

/** A stored Mayor, patched up to the shape the engine expects of one. */
function reviveProfile(raw) {
  if (!raw || typeof raw !== 'object' || !raw.id) return null;
  return {
    version: PROFILE_VERSION,
    avatar: null,
    sandbox: false,
    starterDeckId: null,
    coins: 0,
    packs: 0,
    inventory: {},
    decks: [],
    customDecks: [],
    stats: { played: 0, won: 0, lost: 0, packsOpened: 0 },
    wonWith: [],
    history: [],
    games: [],
    ...raw,
    // A Sandbox Mayor's purse is Infinity, which JSON writes as null. Put it back.
    coins: raw.sandbox ? Infinity : (raw.coins ?? 0),
  };
}

function load() {
  if (cache) return cache;
  const raw = read(PROFILES_KEY);
  let parsed = [];
  try {
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) parsed = arr.map(reviveProfile).filter(Boolean);
  } catch (e) {
    parsed = []; // damaged storage: start clean rather than refuse to open the game
  }
  cache = parsed;
  activeId = read(ACTIVE_KEY);
  return cache;
}

function persist() {
  write(PROFILES_KEY, JSON.stringify(cache, (key, value) => (value === Infinity ? null : value)));
}

// ---------- the shelf of Mayors ----------

/** Every Mayor on this machine, oldest first. */
export function listProfiles() {
  return load().slice();
}

export function getProfile(id) {
  return load().find((p) => p.id === id) || null;
}

/** The Mayor in play, or null when nobody has been chosen yet. */
export function activeProfile() {
  load();
  return getProfile(activeId);
}

export function setActiveProfile(id) {
  load();
  activeId = id;
  write(ACTIVE_KEY, id || '');
  return getProfile(id);
}

/** Write a Mayor back. Everything that changes a Mayor ends with one of these. */
export function saveProfile(profile) {
  load();
  const at = cache.findIndex((p) => p.id === profile.id);
  if (at === -1) cache.push(profile); else cache[at] = profile;
  persist();
  return profile;
}

export function deleteProfile(id) {
  load();
  cache = cache.filter((p) => p.id !== id);
  if (activeId === id) setActiveProfile(cache[0] ? cache[0].id : null);
  persist();
  return cache.slice();
}

// ---------- making one ----------

/**
 * A new Mayor, saved and made active. The very first one also inherits whatever decks the Deck
 * Workshop had saved under its old key, so nobody who was already playing loses the decks they
 * built — see `migrateLegacyDecks`.
 */
export function createMayor({ name, starterDeckId, avatar = null }, set, progression) {
  const first = load().length === 0;
  const profile = createProfile({ name, starterDeckId, avatar }, set, progression);
  if (first) migrateLegacyDecks(profile, set);
  saveProfile(profile);
  setActiveProfile(profile.id);
  return profile;
}

/** The Sandbox Mayor: made once, found thereafter. */
export function sandboxMayor(set, progression) {
  const existing = load().find((p) => p.sandbox);
  if (existing) return existing;
  const profile = createProfile({ name: 'Sandbox', sandbox: true }, set, progression);
  saveProfile(profile);
  return profile;
}

/**
 * Bring the Workshop's old decks across, once, into the first Mayor created.
 *
 * Nothing is deleted: the old key is left where it is, so an older build of the game still finds
 * its decks. A brought-across deck may well ask for cards the new Mayor does not own yet — it is
 * kept anyway and the Workshop shows what is missing, because a deck someone built is worth more
 * than a tidy collection.
 */
export function migrateLegacyDecks(profile, set) {
  let decks = [];
  try {
    const raw = read(LEGACY_DECKS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) decks = arr.filter((d) => d && d.id && d.list);
  } catch (e) {
    return [];
  }
  // Build the lookup rather than trust the caller to have indexed the set, exactly as
  // deckbuilding.js and profile.js do — a raw spec off the shelf has no `cardsById`.
  const byId = set && (set.cardsById || Object.fromEntries(set.cards.map((c) => [c.id, c])));
  const known = (cardId) => !byId || !!byId[cardId];
  const kept = decks.filter((d) => Object.keys(d.list).every(known));
  for (const deck of kept) saveCustomDeck(profile, { ...deck, broughtAcross: true });
  return kept;
}

/** Are there decks under the old key waiting to be brought across? */
export function hasLegacyDecks() {
  try {
    const raw = read(LEGACY_DECKS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) && arr.length > 0;
  } catch (e) {
    return false;
  }
}

/** Forget everything, for a browser someone wants to hand back. Preferences are left alone. */
export function forgetEverything() {
  cache = [];
  activeId = null;
  write(PROFILES_KEY, '[]');
  write(ACTIVE_KEY, '');
}
