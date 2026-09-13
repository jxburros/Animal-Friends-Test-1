// Bootstraps the menu, builds the game, and drives the turn loop. All rules logic lives in
// src/engine/*; this file only wires the menu, builds agents, and re-renders the screen.
import { createGame, playTurn, mulliganPhase, log, indexSet } from '../engine/index.js';
import { makeHumanAgent } from './humanAgent.js';
import {
  setGame, stopGame, isGameActive, scheduleRender, renderIfChanged, settle,
} from './render.js';
import { openFullArtGallery } from './full-art-gallery.js';
import { openDeckBuilder, loadSavedDecks, saveDeck, deleteSavedDeck } from './deckbuilder.js';
import { buildHelp, openHelp, openWelcome, hasBeenWelcomed } from './help.js';
import { createTutorialSession, stopTutorial } from './tutorial.js';
import { TUTORIAL_SEED } from '../tutorial/scenario.js';
import * as fx from './fx.js';

const RULES_URL = new URL('../../spec/game.json', import.meta.url);
const SET_URL = new URL('../../spec/starter_card_set.json', import.meta.url);
const MAKER_SET_URL = new URL('../../spec/maker_card_set.json', import.meta.url);
const PACKAGE_URL = new URL('../../package.json', import.meta.url);

let rules = null;
let cardSet = null;
// The hand-remade collection. Shown on its own shelf in the Deck Workshop and never played: no deck
// draws from it, so a missing or broken file only empties that shelf.
let makerSet = { setId: 'AF-MAKER-01', name: 'Maker Cards', cards: [] };
let chosenDeckId = null;
let chosenMarketId = null;
let customDecks = [];
let renderTicker = null;
const PACE_KEY = 'af-pace';
const THINK_DELAY = { storybook: 900, brisk: 400, instant: 0 };

function $(id) { return document.getElementById(id); }

const SCREENS = { menu: 'screen-menu', deck: 'screen-deck', game: 'screen-game' };
function showScreen(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $(SCREENS[name] || SCREENS.game).classList.add('active');
}

/** Every deck a player can pick: the printed decks from the set, then their own. */
function allDecks() {
  return [...cardSet.decks, ...customDecks.map((d) => ({ ...d, custom: true }))];
}
function deckById(id) {
  return allDecks().find((d) => d.id === id) || null;
}
function customBlurb(deck) {
  const chars = Object.entries(deck.list).reduce((a, [cardId, n]) => a + (cardSet.cardsById[cardId].type === 'character' ? n : 0), 0);
  const species = new Set();
  const studies = new Set();
  for (const cardId of Object.keys(deck.list)) {
    const def = cardSet.cardsById[cardId];
    if (def.species) species.add(def.species);
    if (def.study) studies.add(def.study);
  }
  const total = Object.values(deck.list).reduce((a, n) => a + n, 0);
  return `Your own deck: ${chars} Characters and ${total - chars} Events. ${[...species].join(', ') || 'No species'} · ${[...studies].join(', ') || 'No studies'}.`;
}

// ---------- menu ----------
function buildMenu() {
  $('fullArtGalleryBtn').onclick = () => openFullArtGallery(rules, cardSet);
  renderDeckChoice();
  renderMarketChoice();
}

function renderDeckChoice() {
  const choiceEl = $('deckChoice');
  choiceEl.innerHTML = '';
  const decks = allDecks();
  if (!deckById(chosenDeckId)) chosenDeckId = decks[0].id;
  for (const deck of decks) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `deck-card${deck.id === chosenDeckId ? ' selected' : ''}${deck.custom ? ' custom' : ''}`;
    card.setAttribute('aria-pressed', deck.id === chosenDeckId ? 'true' : 'false');
    card.innerHTML = `<h4>${deck.name}</h4><p>${deck.blurb || customBlurb(deck)}</p>`;
    card.addEventListener('click', () => {
      chosenDeckId = deck.id;
      renderDeckChoice();
    });
    choiceEl.appendChild(card);
  }
  const chosen = deckById(chosenDeckId);
  $('editDeckBtn').hidden = !(chosen && chosen.custom);
  $('deleteDeckBtn').hidden = !(chosen && chosen.custom);
}

function renderMarketChoice() {
  const el = $('marketChoice');
  if (!el) return;
  el.innerHTML = '';
  // Same fallback the engine makes (state.js resolveMarketDeck): an older card set had one Market
  // Deck under `marketDeck` rather than a list.
  const decks = (cardSet.marketDecks && cardSet.marketDecks.length)
    ? cardSet.marketDecks
    : (cardSet.marketDeck ? [cardSet.marketDeck] : []);
  if (!decks.length) {
    const note = document.createElement('p');
    note.className = 'menu-note';
    note.textContent = 'This card set defines no Market Decks. The page may be serving an old spec/starter_card_set.json — reload, and check the server is running from the project root.';
    el.appendChild(note);
    chosenMarketId = undefined;
    return;
  }
  if (!decks.some((d) => d.id === chosenMarketId)) chosenMarketId = decks[0] && decks[0].id;
  for (const deck of decks) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `deck-card${deck.id === chosenMarketId ? ' selected' : ''}`;
    card.setAttribute('aria-pressed', deck.id === chosenMarketId ? 'true' : 'false');
    card.innerHTML = `<h4>${deck.name}</h4><p>${deck.blurb || ''}</p>`;
    card.addEventListener('click', () => {
      chosenMarketId = deck.id;
      renderMarketChoice();
    });
    el.appendChild(card);
  }
}

function openWorkshop(deck) {
  showScreen('deck');
  openDeckBuilder($('deckBuilder'), {
    rules,
    set: cardSet,
    makerSet,
    deck,
    onSave: (saved) => {
      customDecks = saveDeck(saved).map((d) => ({ ...d }));
      chosenDeckId = saved.id;
      renderDeckChoice();
      showScreen('menu');
    },
    onCancel: () => showScreen('menu'),
  });
}

// ---------- pace ----------
function applyPace(name) {
  const pace = ['storybook', 'brisk', 'instant'].includes(name) ? name : 'storybook';
  fx.setPace(pace);
  for (const id of ['paceSelect', 'paceSelectMenu']) {
    const el = $(id);
    if (el && el.value !== pace) el.value = pace;
  }
  try { localStorage.setItem(PACE_KEY, pace); } catch (e) { /* private mode */ }
}
function loadPace() {
  let saved = null;
  try { saved = localStorage.getItem(PACE_KEY); } catch (e) { /* ignore */ }
  applyPace(saved || 'storybook');
}

// ---------- AI agent ----------
function getDelay() {
  return THINK_DELAY[fx.getPace()] ?? 900;
}

/** The computer Mayor's brain, with no pacing: the heuristic agent, or the random one if it fails to load. */
async function loadRivalBrain(seed) {
  try {
    const mod = await import('../ai/heuristic.js');
    if (typeof mod.makeHeuristicAgent !== 'function') throw new Error('no makeHeuristicAgent export');
    return mod.makeHeuristicAgent({ seed });
  } catch (e) {
    const { makeRandomAgent } = await import('../ai/random.js');
    return makeRandomAgent(seed);
  }
}

async function makeAIAgent(seed) {
  const inner = await loadRivalBrain(seed);
  return {
    name: inner.name || 'Rival',
    async choose(state, pi, req) {
      // Let the player watch what just happened before the rival acts again.
      await settle();
      const delay = getDelay();
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      return inner.choose(state, pi, req);
    },
  };
}

// ---------- game loop ----------
let quitRequested = false;

async function runGame(state, agents) {
  state.agents = agents;
  await mulliganPhase(state);
  scheduleRender();
  const cap = rules.simulation.maxTurnsPerPlayer * 2;
  while (state.winner === null && state.turnNumber < cap && !quitRequested) {
    // eslint-disable-next-line no-await-in-loop
    await playTurn(state);
    scheduleRender();
  }
  if (!quitRequested && state.winner === null) {
    const [a, b] = state.players;
    if (a.victoryRow.length !== b.victoryRow.length) state.winner = a.victoryRow.length > b.victoryRow.length ? 0 : 1;
    else if (a.supply !== b.supply) state.winner = a.supply > b.supply ? 0 : 1;
    state.result = 'turnLimit';
    log(state, null, `Turn limit reached. ${state.winner === null ? 'The game is a draw.' : `${state.players[state.winner].name} leads on tiebreak.`}`);
  }
  scheduleRender();
}

async function startGame() {
  const seedText = $('seedInput').value.trim();
  const seed = seedText ? Number(seedText) : Math.floor(Math.random() * 2 ** 31);

  // The rival always plays one of the printed decks — a different one where possible.
  const rivals = cardSet.decks.filter((d) => d.id !== chosenDeckId);
  const rivalDeck = rivals[Math.floor(Math.random() * rivals.length)] || cardSet.decks[0];
  const mine = deckById(chosenDeckId);
  const myDeckRef = mine && mine.custom ? { id: mine.id, name: mine.name, list: mine.list } : chosenDeckId;

  const state = createGame(rules, cardSet, {
    seed,
    decks: [myDeckRef, rivalDeck.id],
    market: chosenMarketId,
    names: ['Mayor Bramble', 'Mayor Sable'],
  });
  const human = makeHumanAgent('Mayor Bramble');
  const ai = await makeAIAgent(seed + 1);
  launch(state, [human, ai]);
}

/** Put a built game on screen and start its turn loop. Shared by an ordinary game and the tutorial. */
function launch(state, agents) {
  quitRequested = false;
  showScreen('game'); // before setGame: the first render must measure a visible board
  setGame(state, 0);
  if (renderTicker) clearInterval(renderTicker);
  renderTicker = setInterval(() => { if (isGameActive()) renderIfChanged(); }, 150);
  runGame(state, agents);
}

/**
 * The tutorial: the same game loop, with the arranged match and the coached agents from
 * src/ui/tutorial.js. Once the lesson is over the rival plays on with its usual brain.
 */
async function startTutorial() {
  const brain = await loadRivalBrain(TUTORIAL_SEED + 1);
  const { state, agents } = createTutorialSession({
    rules, cardSet, fallbackRival: brain, thinkDelay: getDelay, onLeave: leaveGame,
  });
  launch(state, agents);
}

/** Close the book: abandon the running game (and the coach, if any) and return to the cover. */
function leaveGame() {
  quitRequested = true;
  stopGame();
  stopTutorial();
  if (renderTicker) clearInterval(renderTicker);
  $('winOverlay').classList.remove('active');
  showScreen('menu');
}

// ---------- wiring ----------
function wireMenu() {
  $('startGameBtn').addEventListener('click', () => { startGame(); });
  $('buildDeckBtn').addEventListener('click', () => openWorkshop(null));
  $('editDeckBtn').addEventListener('click', () => {
    const deck = deckById(chosenDeckId);
    if (deck && deck.custom) openWorkshop(deck);
  });
  $('deleteDeckBtn').addEventListener('click', () => {
    const deck = deckById(chosenDeckId);
    if (!deck || !deck.custom) return;
    customDecks = deleteSavedDeck(deck.id).map((d) => ({ ...d }));
    chosenDeckId = cardSet.decks[0].id;
    renderDeckChoice();
  });
  $('tutorialBtn').addEventListener('click', () => { startTutorial(); });
  $('welcomeBtn').addEventListener('click', () => openWelcome());
  $('howToPlayBtn').addEventListener('click', () => openHelp('quick'));
  $('howToPlayBtn2').addEventListener('click', () => openHelp('quick'));
  $('paceSelect').addEventListener('change', (e) => applyPace(e.target.value));
  $('paceSelectMenu').addEventListener('change', (e) => applyPace(e.target.value));
  // The Chronicle folds away to a spine when the table wants the width. It starts open: the story
  // of the game is half of what the Chronicle is for, and a reader should have to close it on purpose.
  $('logToggle').addEventListener('click', () => {
    const table = document.getElementById('board');
    const folded = table.classList.toggle('log-folded');
    const btn = $('logToggle');
    btn.setAttribute('aria-expanded', folded ? 'false' : 'true');
    btn.title = folded ? 'Open the Chronicle' : 'Fold the Chronicle away';
    try { localStorage.setItem('af-log-folded', folded ? '1' : '0'); } catch { /* private window: no memory, no harm */ }
  });
  try {
    if (localStorage.getItem('af-log-folded') === '1') $('logToggle').click();
  } catch { /* no stored preference */ }

  $('quitBtn').addEventListener('click', leaveGame);
  $('playAgainBtn').addEventListener('click', leaveGame);
  buildHelp(rules, { onTutorial: () => { startTutorial(); } });
}

/**
 * Load one spec file.
 *
 * `cache: 'no-cache'` makes the browser revalidate with the server on every load instead of serving
 * a heuristically cached copy: edit spec/starter_card_set.json and the next reload always sees it,
 * while an unchanged file still costs only a 304. Without this an old spec can sit in the cache and
 * the game quietly plays yesterday's card set — new cards, decks and Market Decks simply missing.
 */
async function loadSpec(url, label) {
  let resp;
  try {
    resp = await fetch(url, { cache: 'no-cache' });
  } catch (e) {
    throw new Error(`Could not fetch ${label} (${url}). Serve the project over http (npm run serve) — browsers block file:// module and fetch access. [${e.message}]`);
  }
  if (!resp.ok) throw new Error(`Could not load ${label}: ${resp.status} ${resp.statusText} for ${url}. Is the server running from the project root?`);
  try {
    return await resp.json();
  } catch (e) {
    throw new Error(`${label} (${url}) is not valid JSON: ${e.message}`);
  }
}

/**
 * The maker card set: the collection as it is being remade, card by card. It is optional — the game
 * plays without it — so a missing or unreadable file leaves an empty shelf rather than failing to
 * start. Cards in it cannot go in a deck yet.
 */
async function loadMakerSet() {
  const empty = { setId: 'AF-MAKER-01', name: 'Maker Cards', playable: false, cards: [] };
  try {
    const set = await loadSpec(MAKER_SET_URL, 'the maker card set (spec/maker_card_set.json)');
    return { ...empty, ...set, cards: Array.isArray(set.cards) ? set.cards : [] };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`Maker cards not loaded: ${e.message}`);
    return empty;
  }
}

/** The version from package.json, or null when it cannot be read (some hosts do not serve it). */
async function loadVersion() {
  try {
    const resp = await fetch(PACKAGE_URL, { cache: 'no-cache' });
    if (!resp.ok) return null;
    const pkg = await resp.json();
    return typeof pkg.version === 'string' ? pkg.version : null;
  } catch (e) {
    return null;
  }
}

/**
 * Stamp the cover with exactly what is loaded: the game version, the card set and its size. If the
 * line does not match the package.json of the folder being served, the browser is still showing an
 * old copy — hard-reload (Ctrl+Shift+R / Cmd+Shift+R) or check which server is on the port.
 */
function stampEdition(version) {
  const parts = [
    version ? `v${version}` : 'unknown version',
    cardSet.name || cardSet.setId,
    `${cardSet.cards.length} cards`,
    `${cardSet.decks.length} decks`,
    `${(cardSet.marketDecks || []).length} Market Decks`,
    `${(makerSet.cards || []).length} maker cards`,
  ];
  const line = parts.join(' · ');
  const el = $('edition');
  if (el) el.textContent = line;
  // The same line in the console, so a stale load is obvious there too.
  // eslint-disable-next-line no-console
  console.info(`Animal Friends — ${line}`);
}

async function main() {
  const [loadedRules, loadedSet, loadedMaker, version] = await Promise.all([
    loadSpec(RULES_URL, 'the rules (spec/game.json)'),
    loadSpec(SET_URL, 'the card set (spec/starter_card_set.json)'),
    loadMakerSet(),
    loadVersion(),
  ]);
  rules = loadedRules;
  if (!Array.isArray(loadedSet.cards) || !loadedSet.cards.length) throw new Error('The card set has no cards.');
  if (!Array.isArray(loadedSet.decks) || !loadedSet.decks.length) throw new Error('The card set has no town decks.');
  cardSet = indexSet(loadedSet);
  makerSet = loadedMaker;
  stampEdition(version);
  // Drop saved decks that no longer match the card set (a card was renamed or removed).
  customDecks = loadSavedDecks().filter((d) => Object.keys(d.list).every((id) => cardSet.cardsById[id]));
  chosenDeckId = cardSet.decks[0].id;
  buildMenu();
  wireMenu();
  loadPace();
  showScreen('menu');
  // A first visit opens on the welcome, which offers the tutorial before the cover.
  if (!hasBeenWelcomed()) openWelcome();
}

main().catch((e) => {
  document.body.innerHTML = `<pre style="padding:20px;color:#b8434e;white-space:pre-wrap;font:14px/1.5 system-ui,sans-serif">Failed to start.\n\n${e.message}\n\n${e.stack || ''}</pre>`;
  // eslint-disable-next-line no-console
  console.error(e);
});
