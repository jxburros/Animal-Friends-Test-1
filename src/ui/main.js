// Bootstraps the menu, builds the game, and drives the turn loop. All rules logic lives in
// src/engine/*; this file only wires the menu, builds agents, and re-renders the screen.
import {
  createGame, playTurn, mulliganPhase, log, indexSet,
} from '../engine/index.js';
import { makeHumanAgent } from './humanAgent.js';
import {
  setGame, stopGame, isGameActive, scheduleRender, renderIfChanged, settle,
} from './render.js';
import { openFullArtGallery } from './full-art-gallery.js';
import { fullArtCount } from './full-art.js';
import { VERSIONS } from './versions.js';
import { openDeckBuilder } from './deckbuilder.js';
import { openBook, closeBook } from './book.js';
import { initLore, openLore, loreCounts, emptyLore } from './lore.js';
import { buildHelp, openHelp, openWelcome, hasBeenWelcomed } from './help.js';
import { createTutorialSession, stopTutorial } from './tutorial.js';
import { openProfiles, chooseAvatar, avatarNode } from './profiles.js';
import { openShop } from './shop.js';
import { activeProfile, saveProfile, setActiveProfile } from './store.js';
import { snapshot, restore, isResumable } from '../engine/snapshot.js';
import {
  unlockedDecks, saveCustomDeck, deleteCustomDeck, recordResult, autoUnlockDecks,
  putSavedGame, dropSavedGame, sanePrintings,
} from '../engine/profile.js';
import { TUTORIAL_SEED } from '../tutorial/scenario.js';
import * as fx from './fx.js';
import { iconSVG } from './art.js';

const RULES_URL = new URL('../../spec/game.json', import.meta.url);
const SET_URL = new URL('../../spec/maker_card_set.json', import.meta.url);
const PACKAGE_URL = new URL('../../package.json', import.meta.url);
const PROGRESSION_URL = new URL('../../spec/progression.json', import.meta.url);
const LORE_URL = new URL('../../spec/lore.json', import.meta.url);

let rules = null;
// The collection, as read off the shelf. Kept raw — the character backstories live on it, and the
// Book reads them — beside the indexed copy the game is built from.
let shelf = { setId: 'AF-MAKER-01', name: 'Maker Cards', cards: [] };
// The same collection, indexed by card id: what createGame and the Deck Workshop are handed.
let collection = null;
let chosenDeckId = null;
let chosenMarketId = null;
let customDecks = [];
let renderTicker = null;
// The Mayor playing, and what winning pays them. Everything a Mayor owns is read through these.
let profile = null;
let progression = {};
// The town's own writing: the story, the places and the cross-links the Lore Directory reads.
// It is text, not rules — a missing file costs the Directory its contents, not the game its start.
let loreText = null;
// The game on the table: its id on the Mayor's shelf, the decks it was built from, and whether it
// is the tutorial — which is a lesson, not a game, so it is neither saved nor paid for.
let currentGameId = null;
let currentDecks = null;
let currentIsTutorial = false;
const PACE_KEY = 'af-pace';
const THINK_DELAY = { storybook: 900, brisk: 400, instant: 0 };

function $(id) { return document.getElementById(id); }

const SCREENS = {
  profiles: 'screen-profiles', home: 'screen-home', menu: 'screen-menu', deck: 'screen-deck',
  book: 'screen-book', shop: 'screen-shop', game: 'screen-game', lore: 'screen-lore',
};
function showScreen(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $(SCREENS[name] || SCREENS.game).classList.add('active');
}

/** The one collection the game is played with. */
function cardSet() {
  return collection;
}

/**
 * Every deck this Mayor can pick: the printed decks they have opened, then the ones they built.
 * A Mayor who owns one deck sees one deck — the rest of the shelf is in the Post Office.
 */
function allDecks() {
  return [...unlockedDecks(cardSet(), profile), ...customDecks.map((d) => ({ ...d, custom: true }))];
}
function deckById(id) {
  return allDecks().find((d) => d.id === id) || null;
}
function customBlurb(deck) {
  const set = cardSet();
  const chars = Object.entries(deck.list).reduce((a, [cardId, n]) => a + (set.cardsById[cardId].type === 'character' ? n : 0), 0);
  const species = new Set();
  const studies = new Set();
  for (const cardId of Object.keys(deck.list)) {
    const def = set.cardsById[cardId];
    if (def.species) species.add(def.species);
    if (def.study) studies.add(def.study);
  }
  const total = Object.values(deck.list).reduce((a, n) => a + n, 0);
  return `Your own deck: ${chars} Characters and ${total - chars} Events. ${[...species].join(', ') || 'No species'} · ${[...studies].join(', ') || 'No studies'}.`;
}

// ---------- the two doors ----------
/** The home screen: Play and the Book. */
function renderHome() {
  const el = $('modeChoice');
  if (!el) return;
  el.innerHTML = '';

  const play = document.createElement('button');
  play.type = 'button';
  play.className = 'mode-card';
  play.innerHTML = `<i class="ico mode-ico" aria-hidden="true">${iconSVG('hand')}</i>` + '<span class="mode-tagline">The game</span><span class="mode-name">Play</span>'
    + `<span class="mode-blurb">${collection.blurb || 'Build your town, work your animals, and fight the Capital City for the Statues.'}</span>`
    + `<span class="mode-stat">${collection.cards.length} cards · ${collection.decks.length} deck${collection.decks.length === 1 ? '' : 's'} · ${collection.marketDecks.length} Capital Cit${collection.marketDecks.length === 1 ? 'y' : 'ies'}</span>`;
  play.addEventListener('click', enterPlay);
  el.appendChild(play);

  const book = document.createElement('button');
  book.type = 'button';
  book.className = 'mode-card';
  book.innerHTML = `<i class="ico mode-ico" aria-hidden="true">${iconSVG('deck')}</i>` + '<span class="mode-tagline">The gallery</span><span class="mode-name">Book</span>'
    + '<span class="mode-blurb">Every card in the game, in every printing it exists in, with the story each character came out of. Nothing to play — everything to read.</span>'
    + `<span class="mode-stat">${collection.cards.length} cards · ${VERSIONS.length} printings</span>`;
  book.addEventListener('click', openTheBook);
  el.appendChild(book);

  // The third door: the writing the cards came out of — the tale, the cast and the places.
  const counts = loreCounts();
  const lore = document.createElement('button');
  lore.type = 'button';
  lore.className = 'mode-card';
  lore.innerHTML = `<i class="ico mode-ico" aria-hidden="true">${iconSVG('story')}</i>` + '<span class="mode-tagline">The story</span><span class="mode-name">Lore</span>'
    + '<span class="mode-blurb">The tale of the First Boroughs, everyone who lives in them, and the places they are argued over in \u2014 each of them linked to the cards it is printed on.</span>'
    + `<span class="mode-stat">${counts.characters} character${counts.characters === 1 ? '' : 's'} \u00b7 ${counts.places} place${counts.places === 1 ? '' : 's'} \u00b7 ${counts.chapters} chapter${counts.chapters === 1 ? '' : 's'}</span>`;
  lore.addEventListener('click', openTheLore);
  el.appendChild(lore);
}

function openTheBook() {
  showScreen('book');
  openBook($('bookHost'), {
    rules,
    set: collection,
    shelf,
    lore: loreText,
    profile,
    onClose: () => { closeBook(); goHome(); },
    onLore: () => { closeBook(); openTheLore(); },
  });
}

/** The Lore Directory: the story, the cast and the places, and the cards each of them prints on. */
function openTheLore() {
  showScreen('lore');
  initLore({ rules, set: collection, shelf, profile, lore: loreText });
  openLore($('loreHost'), { onClose: goHome, onBook: openTheBook });
}

function goHome() {
  renderHome();
  renderMayorStrip('homeMayorStrip');
  showScreen('home');
}

// ---------- the Mayor ----------

/** Open the shelf of Mayors. Nothing else on the page is usable until one is chosen. */
function openMayors() {
  showScreen('profiles');
  openProfiles($('profilesHost'), {
    rules,
    set: cardSet(),
    progression,
    onPlay: playAs,
  });
}

/** Take up a Mayor: their decks, their collection, their unfinished games. */
function playAs(chosen) {
  profile = chosen;
  setActiveProfile(chosen.id);
  initLore({ profile });
  customDecks = ownDecks();
  chosenDeckId = null;
  goHome();
}

/** This Mayor's own decks, dropped to the cards the collection actually holds. */
function ownDecks() {
  const set = cardSet();
  return (profile.customDecks || [])
    .filter((d) => Object.keys(d.list).every((cardId) => set.cardsById[cardId]))
    .map((d) => ({ ...d, printings: sanePrintings(profile, d) }));
}

/** Who is playing, what they are carrying, and the ways out: the Post Office, or another Mayor. */
function renderMayorStrip(id) {
  const el = $(id);
  if (!el || !profile) return;
  el.hidden = false;
  el.innerHTML = '';
  el.appendChild(avatarNode(profile, cardSet()));
  const who = document.createElement('span');
  who.className = 'who';
  who.textContent = profile.name;
  el.appendChild(who);
  const carrying = document.createElement('span');
  carrying.className = 'mayor-record';
  carrying.textContent = profile.sandbox
    ? 'everything unlocked'
    : `${profile.coins} coins · ${profile.packs} sealed pack${profile.packs === 1 ? '' : 's'}`;
  el.appendChild(carrying);
  el.appendChild(Object.assign(document.createElement('span'), { className: 'spacer' }));

  const post = document.createElement('button');
  post.type = 'button';
  post.textContent = 'The Post Office';
  post.title = 'Packs, coins and the decks still to be opened';
  post.addEventListener('click', openPostOffice);
  el.appendChild(post);

  const portrait = document.createElement('button');
  portrait.type = 'button';
  portrait.textContent = 'Portrait';
  portrait.title = 'Choose the card you are known by';
  portrait.addEventListener('click', () => {
    showScreen('profiles');
    chooseAvatar($('profilesHost'), { rules, set: cardSet(), progression, onPlay: playAs }, profile);
  });
  el.appendChild(portrait);

  const switcher = document.createElement('button');
  switcher.type = 'button';
  switcher.textContent = 'Switch Mayor';
  switcher.addEventListener('click', openMayors);
  el.appendChild(switcher);
}

/** Packs, coins and the decks still to be opened. */
function openPostOffice() {
  showScreen('shop');
  openShop($('shopHost'), {
    rules,
    set: cardSet(),
    progression,
    profile,
    onChange: () => { renderMayorStrip('homeMayorStrip'); renderMayorStrip('menuMayorStrip'); },
    onClose: () => {
      // A pack may have opened a deck, and the Workshop may now have cards it did not have.
      customDecks = ownDecks();
      renderDeckChoice();
      goHome();
    },
  });
}

/** Open the cover: the decks, the Capital Cities, the decks you built yourself. */
function enterPlay() {
  customDecks = ownDecks();
  const decks = allDecks();
  chosenDeckId = decks[0] ? decks[0].id : null;
  chosenMarketId = null;
  buildMenu();
  showScreen('menu');
}

// ---------- menu ----------
function buildMenu() {
  const set = cardSet();
  const note = $('expansionNote');
  if (note) note.textContent = set.blurb || '';
  $('edition').textContent = editionLine(set);
  $('fullArtGalleryBtn').textContent = `Explore the ${fullArtCount(set)} Full Art cards`;
  $('fullArtGalleryBtn').onclick = () => openFullArtGallery(rules, set);
  renderMayorStrip('menuMayorStrip');
  renderResumeShelf();
  renderDeckChoice();
  renderMarketChoice();
}

// ---------- games left unfinished ----------

/**
 * The games this Mayor walked away from. A save is taken at the end of every turn, so what is
 * offered here is the game as it stood when they last put it down — not the start of it.
 */
function renderResumeShelf() {
  const field = $('resumeField');
  const shelf = $('resumeShelf');
  if (!field || !shelf) return;
  const set = cardSet();
  const games = (profile.games || []).filter((g) => isResumable(g, set));
  field.hidden = games.length === 0;
  shelf.innerHTML = '';
  for (const entry of games) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'resume-card';
    const turn = Math.floor((entry.meta.turnNumber || 0) / 2) + 1;
    card.innerHTML = `<h4>${entry.meta.you} vs ${entry.meta.rival}</h4>`
      + `<p>Round ${turn} · ${entry.meta.market || 'the Capital City'} · left ${whenLeft(entry.savedAt)}</p>`;
    card.addEventListener('click', () => resumeGame(entry));
    const forget = document.createElement('button');
    forget.type = 'button';
    forget.className = 'resume-forget';
    forget.title = 'Forget this game';
    forget.setAttribute('aria-label', 'Forget this game');
    forget.textContent = '×';
    forget.addEventListener('click', (e) => {
      e.stopPropagation();
      dropSavedGame(profile, entry.id);
      saveProfile(profile);
      renderResumeShelf();
    });
    const slot = document.createElement('div');
    slot.className = 'resume-slot';
    slot.append(card, forget);
    shelf.appendChild(slot);
  }
}

/** "left this morning", near enough. A saved game does not need a timestamp to the second. */
function whenLeft(at) {
  const mins = Math.round((Date.now() - at) / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** Pick a game back up exactly where it was put down. */
async function resumeGame(entry) {
  let state;
  try {
    state = restore(entry, rules, cardSet());
  } catch (e) {
    dropSavedGame(profile, entry.id);
    saveProfile(profile);
    renderResumeShelf();
    // eslint-disable-next-line no-alert
    window.alert(e.message);
    return;
  }
  currentGameId = entry.id;
  currentDecks = entry.decks;
  currentIsTutorial = false;
  const human = makeHumanAgent(state.players[0].name);
  const ai = await makeAIAgent((state.seed || 0) + 1);
  launch(state, [human, ai], { resumed: true });
}

/** Put the game on the table onto the Mayor's shelf, as it stands. */
function saveInProgress(state) {
  if (currentIsTutorial || !profile || state.winner !== null) return;
  putSavedGame(profile, snapshot(state, { id: currentGameId, decks: currentDecks }), progression);
  saveProfile(profile);
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
  const set = cardSet();
  const decks = (set.marketDecks && set.marketDecks.length)
    ? set.marketDecks
    : (set.marketDeck ? [set.marketDeck] : []);
  if (!decks.length) {
    const note = document.createElement('p');
    note.className = 'menu-note';
    note.textContent = `${set.name} defines no Market Decks. The page may be serving an old spec file — reload, and check the server is running from the project root.`;
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
    set: cardSet(),
    profile,
    deck,
    onSave: (saved) => {
      saveCustomDeck(profile, saved);
      saveProfile(profile);
      customDecks = ownDecks();
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
    // The save is taken between turns, when the game is at rest: a Mayor who closes the tab
    // mid-thought comes back to the start of the turn they were thinking about.
    saveInProgress(state);
    scheduleRender();
  }
  if (!quitRequested && state.winner === null) {
    const [a, b] = state.players;
    if (a.victoryRow.length !== b.victoryRow.length) state.winner = a.victoryRow.length > b.victoryRow.length ? 0 : 1;
    else if (a.supply !== b.supply) state.winner = a.supply > b.supply ? 0 : 1;
    state.result = 'turnLimit';
    log(state, null, `Turn limit reached. ${state.winner === null ? 'The game is a draw.' : `${state.players[state.winner].name} leads on tiebreak.`}`);
  }
  if (!quitRequested && state.winner !== null) settleUp(state);
  scheduleRender();
}

/**
 * The end of a game: take it off the shelf, write it into the Mayor's record, and pay for it. A win
 * pays a pack and coins, a loss pays coins alone, and a collection that has quietly crossed a
 * deck's coverage opens that deck here rather than waiting for the next pack.
 */
function settleUp(state) {
  if (currentIsTutorial || !profile) return;
  dropSavedGame(profile, currentGameId);
  const mine = state.players[0];
  const theirs = state.players[1];
  const reward = recordResult(profile, {
    won: state.winner === 0,
    deckId: mine.deckId,
    deckName: mine.deckName,
    opponentDeckId: theirs.deckId,
    opponentDeckName: theirs.deckName,
    marketId: state.market.deckId,
    turns: state.turnNumber,
    seed: state.seed,
  }, progression);
  const opened = autoUnlockDecks(profile, cardSet(), progression);
  saveProfile(profile);
  announceReward(reward, opened);
}

/** Say what the game paid, on the overlay that says who won. */
function announceReward(reward, opened) {
  const el = $('winReward');
  if (!el) return;
  if (profile.sandbox) { el.hidden = true; return; }
  const parts = [];
  if (reward.coins) parts.push(`${reward.coins} coins`);
  if (reward.packs) parts.push(`${reward.packs} booster pack${reward.packs === 1 ? '' : 's'}`);
  const lines = [];
  if (parts.length) lines.push(`The borough settles up: ${parts.join(' and ')}.`);
  if (reward.firstWin) lines.push('First win with that deck.');
  if (opened.length) {
    const names = opened.map((id) => cardSet().decksById[id].name).join(', ');
    lines.push(`Your collection has opened a deck: ${names}.`);
  }
  el.textContent = lines.join(' ');
  el.hidden = lines.length === 0;
}

async function startGame() {
  const seedText = $('seedInput').value.trim();
  const seed = seedText ? Number(seedText) : Math.floor(Math.random() * 2 ** 31);

  // The rival plays one of the collection's own decks — any of them, whether or not the Mayor has
  // opened it. What you have to beat is not limited to what you own.
  const set = cardSet();
  const rivals = set.decks.filter((d) => d.id !== chosenDeckId);
  const rivalDeck = rivals[Math.floor(Math.random() * rivals.length)] || set.decks[0];
  const mine = deckById(chosenDeckId);
  if (!mine) return;
  const myDeckRef = mine.custom ? { id: mine.id, name: mine.name, list: mine.list } : chosenDeckId;

  const state = createGame(rules, set, {
    seed,
    decks: [myDeckRef, rivalDeck.id],
    market: chosenMarketId,
    names: [profile.name || 'Mayor Bramble', 'Mayor Sable'],
  });
  currentGameId = null; // the first save names it
  currentDecks = [myDeckRef, rivalDeck.id];
  currentIsTutorial = false;
  const human = makeHumanAgent(state.players[0].name);
  const ai = await makeAIAgent(seed + 1);
  launch(state, [human, ai]);
}

/** Put a built game on screen and start its turn loop. Shared by an ordinary game and the tutorial. */
function launch(state, agents, { resumed = false } = {}) {
  quitRequested = false;
  if (!resumed && !currentIsTutorial) {
    currentGameId = `game-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  }
  const reward = $('winReward');
  if (reward) reward.hidden = true;
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
  // The lesson can be started from the welcome, before the cover has ever been opened. Build the
  // cover first, so closing the book afterwards lands on a screen that has been filled in.
  if (!chosenDeckId) enterPlay();
  const brain = await loadRivalBrain(TUTORIAL_SEED + 1);
  currentIsTutorial = true;
  const { state, agents } = createTutorialSession({
    rules, cardSet: cardSet(), fallbackRival: brain, thinkDelay: getDelay, onLeave: leaveGame,
  });
  launch(state, agents);
}

/** Close the book: abandon the running game (and the coach, if any) and return to the cover. */
function leaveGame() {
  quitRequested = true;
  stopGame();
  stopTutorial();
  currentIsTutorial = false;
  if (renderTicker) clearInterval(renderTicker);
  $('winOverlay').classList.remove('active');
  // The game that was on the table is already on the shelf: a save is taken at the end of every
  // turn, so walking away needs no save of its own and an unfinished game is never lost.
  buildMenu();
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
    deleteCustomDeck(profile, deck.id);
    saveProfile(profile);
    customDecks = ownDecks();
    const left = allDecks();
    chosenDeckId = left[0] ? left[0].id : null;
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

  $('backToHomeBtn').addEventListener('click', goHome);
  $('homeHowToPlayBtn').addEventListener('click', () => openHelp('quick'));
  $('homeWelcomeBtn').addEventListener('click', () => openWelcome());
  $('quitBtn').addEventListener('click', leaveGame);
  $('playAgainBtn').addEventListener('click', leaveGame);
  buildHelp(rules, { onTutorial: () => { startTutorial(); } });
}

/**
 * Load one spec file.
 *
 * `cache: 'no-cache'` makes the browser revalidate with the server on every load instead of serving
 * a heuristically cached copy: edit spec/maker_card_set.json and the next reload always sees it,
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

/** One line describing exactly what a collection holds. */
function editionLine(set) {
  return [
    version ? `v${version}` : 'unknown version',
    set.name || set.setId,
    `${set.cards.length} cards`,
    `${set.decks.length} deck${set.decks.length === 1 ? '' : 's'}`,
    `${(set.marketDecks || []).length} Market Deck${(set.marketDecks || []).length === 1 ? '' : 's'}`,
  ].join(' · ');
}

/**
 * Stamp the home screen with exactly what is loaded: the game version and the collection. If the
 * line does not match the package.json of the folder being served, the browser is still showing an
 * old copy — hard-reload (Ctrl+Shift+R / Cmd+Shift+R) or check which server is on the port.
 */
function stampEdition() {
  const line = [
    version ? `v${version}` : 'unknown version',
    `${collection.cards.length} cards`,
    `${collection.decks.length} decks`,
    `${collection.marketDecks.length} Capital Cit${collection.marketDecks.length === 1 ? 'y' : 'ies'}`,
  ].join(' · ');
  const el = $('homeEdition');
  if (el) el.textContent = line;
  // The same line in the console, so a stale load is obvious there too.
  // eslint-disable-next-line no-console
  console.info(`Animal Friends — ${line}`);
}

let version = null;

async function main() {
  const [loadedRules, loadedSet, loadedVersion, loadedProgression, loadedLore] = await Promise.all([
    loadSpec(RULES_URL, 'the rules (spec/game.json)'),
    loadSpec(SET_URL, 'the card set (spec/maker_card_set.json)'),
    loadVersion(),
    // What winning pays is tuning, not rules: a missing file falls back to the defaults in
    // engine/profile.js rather than stopping the game from opening.
    loadSpec(PROGRESSION_URL, 'the progression (spec/progression.json)').catch(() => ({})),
    // The town's writing is text, not rules: if it cannot be read the Directory opens empty and
    // says so, rather than the game refusing to start over a missing story.
    loadSpec(LORE_URL, 'the lore (spec/lore.json)').catch((e) => {
      // eslint-disable-next-line no-console
      console.warn(`The Lore Directory has nothing to read: ${e.message}`);
      return emptyLore();
    }),
  ]);
  rules = loadedRules;
  version = loadedVersion;
  progression = loadedProgression || {};
  loreText = loadedLore || emptyLore();
  // One collection, and the game cannot start without all of it: cards to play, town decks to play
  // them out of, and a Capital City to fight over.
  if (!Array.isArray(loadedSet.cards) || !loadedSet.cards.length) throw new Error('The card set has no cards.');
  if (!Array.isArray(loadedSet.decks) || !loadedSet.decks.length) throw new Error('The card set has no town decks.');
  if (!Array.isArray(loadedSet.marketDecks) || !loadedSet.marketDecks.length) throw new Error('The card set has no Capital City.');
  shelf = loadedSet;
  collection = indexSet(loadedSet);
  // The Directory is wired up before any screen opens: the Book links characters straight into it,
  // so openCharacterModal has to work without the Directory itself ever having been visited.
  initLore({ rules, set: collection, shelf, profile, lore: loreText });
  stampEdition();
  wireMenu();
  loadPace();
  // Who is playing comes first: the cover, the Workshop and the Book all read a Mayor's collection,
  // and there is nothing sensible to show before one is chosen. A Mayor already in play is taken
  // straight to the cover.
  profile = activeProfile();
  if (profile) playAs(profile); else openMayors();
  // A first visit opens on the welcome, which offers the tutorial before the cover.
  if (!hasBeenWelcomed()) openWelcome();
}

main().catch((e) => {
  document.body.innerHTML = `<pre style="padding:20px;color:#b8434e;white-space:pre-wrap;font:14px/1.5 system-ui,sans-serif">Failed to start.\n\n${e.message}\n\n${e.stack || ''}</pre>`;
  // eslint-disable-next-line no-console
  console.error(e);
});
