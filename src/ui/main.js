// Bootstraps the menu, builds the game, and drives the turn loop. All rules logic lives in
// src/engine/*; this file only wires the menu, builds agents, and re-renders the screen.
import { createGame, playTurn, log, indexSet } from '../engine/index.js';
import { makeHumanAgent } from './humanAgent.js';
import {
  setGame, stopGame, isGameActive, scheduleRender, renderIfChanged, settle,
} from './render.js';
import { animalSVG } from './art.js';
import { openDeckBuilder, loadSavedDecks, saveDeck, deleteSavedDeck } from './deckbuilder.js';
import * as fx from './fx.js';

const RULES_URL = new URL('../../spec/game.json', import.meta.url);
const SET_URL = new URL('../../spec/starter_card_set.json', import.meta.url);

let rules = null;
let cardSet = null;
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
  const critters = $('menuCritters');
  critters.innerHTML = '';
  for (const kind of ['rabbit', 'mouse', 'raccoon', 'fox', 'hedgehog', 'badger', 'otter', 'squirrel']) {
    const wrap = document.createElement('div');
    wrap.innerHTML = animalSVG(kind);
    critters.appendChild(wrap.firstChild);
  }

  renderDeckChoice();
  renderMarketChoice();
  buildHowToPlay();
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

function buildHowToPlay() {
  $('howToPlayBody').innerHTML = `
    <h3>The goal</h3>
    <p>You are the Mayor of a town of animal Characters. Recruit workers, run shifts for
    <strong>Supply</strong>, play Events, and bid for cards in the shared <strong>Capital City</strong>.
    Win by controlling <strong>${rules.victory.statuesToWin} of the ${rules.victory.statueTotal} Statues</strong>.</p>

    <h3>Supply</h3>
    <p>Supply pays for recruiting, rehiring, market bids and card effects. Work shifts are the main
    source, plus your once-per-turn Resources choice: draw 1 card, or gain 2 Supply.</p>

    <h3>Orientation &amp; Busy</h3>
    <p>Cards show readiness by rotation instead of counters. <strong>Upright (0°)</strong> Characters
    can act. A <strong>Busy</strong> Character is rotated a quarter turn and cannot act until it advances
    back to upright at the start of your turn (180° → 270° → 0°).</p>

    <h3>Ranks and arrival delay</h3>
    <table>
      <tr><th>Rank</th><th>Cost</th><th>Enters</th></tr>
      <tr><td>Apprentice</td><td>0–1</td><td>Upright — acts immediately</td></tr>
      <tr><td>Journeyman</td><td>2–3</td><td>Busy — ready next turn</td></tr>
      <tr><td>Master</td><td>4–5</td><td>180° — ready in two turns</td></tr>
    </table>

    <h3>Turn phases</h3>
    <p><strong>Start</strong> (resolve your pending Capital City purchases) → <strong>Resources</strong>
    (draw 1 or gain 2 Supply) → <strong>Ready</strong> (advance orientation) → <strong>Actions</strong>
    (recruit, work, play Events, announce or outbid in the Capital City, rehire — as many as you like) →
    <strong>End</strong> (shifts tick down and pay out; Limited Events expire).</p>

    <h3>Shifts</h3>
    <p>Make an upright Character Busy to start a shift. After its listed delay, it pays out its Supply
    at End phase and becomes ready to advance again.</p>

    <h3>Events</h3>
    <p>Instant Events resolve immediately and go to your Town Dump. Limited Events stay in your town for
    their duration. Both can require upright Characters (by species/study) — those Characters become
    Busy to pay the cost.</p>

    <h3>Capital City: the bidding war</h3>
    <p>Make an upright Character Busy, pick a Capital City card, and bid at least its cost — that opens an
    auction. On their own turn your rival may <strong>outbid</strong> you by pledging an upright Character of
    their own and bidding higher; then you may answer, and so on for as many rounds as you can both afford.
    The required step grows as the bidding wears on. When you are still the high bidder at the start of your
    own turn, your rival has had their chance and the card is yours.</p>
    <p><strong>Bidding costs animals as well as Supply.</strong> Every Character you pledge stays Busy until
    the auction ends — it will not advance at Ready and nothing can wake it — so a long war leaves your town
    with nobody left to work. And a bid is a promise: the winner pays in full, and the <strong>loser forfeits
    half</strong> of everything they pledged. Bidding beyond your means is expensive even when you walk away.</p>

    <h3>Statues: a boon and a burden</h3>
    <p>Every Statue grants its Mayor a lasting gift and a lasting cost — cheaper rehires for your rival,
    dearer Events, a thinner Resources choice. Five of the nine still win the game, but collecting them
    taxes the town that is winning.</p>

    <h3>Disruptions</h3>
    <p>Some Market Decks hold <strong>Disruption</strong> cards. They are never bought: the moment one is
    dealt into the Capital City it strikes both towns at once — a Recession sends every animal to
    Unemployment, a Hard Winter abandons every shift in progress — and then it is discarded and another card
    is dealt in its place. Choose the <strong>Hard Times</strong> Capital City if you want to live with them.</p>

    <h3>Watching the story</h3>
    <p>Every card move is animated so you can follow what happened: cards fly between zones, Characters
    turn sideways when they become Busy and turn back when they are ready, Supply pops out of the wallet,
    and the Town Chronicle records each chapter. Hover a small card to read it at full size. Use the
    <strong>Pace</strong> control to slow things down (Storybook), speed them up (Brisk) or skip animations
    (Instant). Foil cards shimmer when you move the pointer across them.</p>

    <h3>Unemployment</h3>
    <p>Disruptive effects can send a Character to Unemployment. Rehire it for its full printed cost to
    return it upright. A freshly-played Character that hasn't yet been upright on your turn is protected
    from being targeted this way.</p>

    <h3>Build your own deck</h3>
    <p>The book holds far more cards than the four printed decks use. <strong>Build your own deck</strong>
    on the cover opens the Deck Workshop: pick any Characters and Events from the whole catalogue
    (${rules.deckbuilding.deckSize} cards, at most ${rules.deckbuilding.maxCopiesPerCard} copies of a card and at least
    ${rules.deckbuilding.minCharacters} Characters), name it, and it is saved in this browser for later games.
    Remember that Events need upright Characters of the right species or study to pay for them, so a deck
    wants Characters that match the Events you chose.</p>

    <h3>Statues &amp; victory</h3>
    <p>Statues won from the Capital City sit in your Victory Row and count toward victory. Control
    ${rules.victory.statuesToWin} of the ${rules.victory.statueTotal} Statues to win the game.</p>
  `;
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

async function makeAIAgent(seed) {
  let inner;
  try {
    const mod = await import('../ai/heuristic.js');
    if (typeof mod.makeHeuristicAgent !== 'function') throw new Error('no makeHeuristicAgent export');
    inner = mod.makeHeuristicAgent({ seed });
  } catch (e) {
    const { makeRandomAgent } = await import('../ai/random.js');
    inner = makeRandomAgent(seed);
  }
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
  quitRequested = false;

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

  showScreen('game'); // before setGame: the first render must measure a visible board
  setGame(state, 0);
  if (renderTicker) clearInterval(renderTicker);
  renderTicker = setInterval(() => { if (isGameActive()) renderIfChanged(); }, 150);

  runGame(state, [human, ai]);
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
  $('howToPlayBtn').addEventListener('click', () => $('howToPlayOverlay').classList.add('active'));
  $('howToPlayBtn2').addEventListener('click', () => $('howToPlayOverlay').classList.add('active'));
  $('closeHowToPlay').addEventListener('click', () => $('howToPlayOverlay').classList.remove('active'));
  $('paceSelect').addEventListener('change', (e) => applyPace(e.target.value));
  $('paceSelectMenu').addEventListener('change', (e) => applyPace(e.target.value));
  $('quitBtn').addEventListener('click', () => {
    quitRequested = true;
    stopGame();
    if (renderTicker) clearInterval(renderTicker);
    showScreen('menu');
  });
  $('playAgainBtn').addEventListener('click', () => {
    $('winOverlay').classList.remove('active');
    if (renderTicker) clearInterval(renderTicker);
    showScreen('menu');
  });
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

async function main() {
  const [loadedRules, loadedSet] = await Promise.all([
    loadSpec(RULES_URL, 'the rules (spec/game.json)'),
    loadSpec(SET_URL, 'the card set (spec/starter_card_set.json)'),
  ]);
  rules = loadedRules;
  if (!Array.isArray(loadedSet.cards) || !loadedSet.cards.length) throw new Error('The card set has no cards.');
  if (!Array.isArray(loadedSet.decks) || !loadedSet.decks.length) throw new Error('The card set has no town decks.');
  cardSet = indexSet(loadedSet);
  // One line saying exactly which set is on the table, so a stale file is obvious at a glance.
  // eslint-disable-next-line no-console
  console.info(`Animal Friends — ${cardSet.name || cardSet.setId}: ${cardSet.cards.length} cards, ${cardSet.decks.length} town decks, ${(cardSet.marketDecks || []).length} Market Decks.`);
  // Drop saved decks that no longer match the card set (a card was renamed or removed).
  customDecks = loadSavedDecks().filter((d) => Object.keys(d.list).every((id) => cardSet.cardsById[id]));
  chosenDeckId = cardSet.decks[0].id;
  buildMenu();
  wireMenu();
  loadPace();
  showScreen('menu');
}

main().catch((e) => {
  document.body.innerHTML = `<pre style="padding:20px;color:#b8434e;white-space:pre-wrap;font:14px/1.5 system-ui,sans-serif">Failed to start.\n\n${e.message}\n\n${e.stack || ''}</pre>`;
  // eslint-disable-next-line no-console
  console.error(e);
});
