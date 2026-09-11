// Bootstraps the menu, builds the game, and drives the turn loop. All rules logic lives in
// src/engine/*; this file only wires the menu, builds agents, and re-renders the screen.
import { createGame, playTurn, log } from '../engine/index.js';
import { makeHumanAgent } from './humanAgent.js';
import {
  setGame, stopGame, isGameActive, scheduleRender, renderIfChanged,
} from './render.js';
import { animalSVG } from './art.js';

const RULES_URL = new URL('../../spec/game.json', import.meta.url);
const SET_URL = new URL('../../spec/starter_card_set.json', import.meta.url);

let rules = null;
let cardSet = null;
let chosenDeckId = null;
let fast = false;
let renderTicker = null;

function $(id) { return document.getElementById(id); }

function showScreen(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $(name === 'menu' ? 'screen-menu' : 'screen-game').classList.add('active');
}

// ---------- menu ----------
function buildMenu() {
  const critters = $('menuCritters');
  critters.innerHTML = '';
  for (const kind of ['rabbit', 'mouse', 'raccoon', 'fox']) {
    const wrap = document.createElement('div');
    wrap.innerHTML = animalSVG(kind);
    critters.appendChild(wrap.firstChild);
  }

  const choiceEl = $('deckChoice');
  choiceEl.innerHTML = '';
  chosenDeckId = cardSet.decks[0].id;
  for (const deck of cardSet.decks) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `deck-card${deck.id === chosenDeckId ? ' selected' : ''}`;
    card.setAttribute('aria-pressed', deck.id === chosenDeckId ? 'true' : 'false');
    card.innerHTML = `<h4>${deck.name}</h4><p>${deck.blurb}</p>`;
    card.addEventListener('click', () => {
      chosenDeckId = deck.id;
      choiceEl.querySelectorAll('.deck-card').forEach((c) => {
        c.classList.remove('selected');
        c.setAttribute('aria-pressed', 'false');
      });
      card.classList.add('selected');
      card.setAttribute('aria-pressed', 'true');
    });
    choiceEl.appendChild(card);
  }

  buildHowToPlay();
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
    (recruit, work, play Events, announce/challenge, rehire — as many as you like) →
    <strong>End</strong> (shifts tick down and pay out; Limited Events expire).</p>

    <h3>Shifts</h3>
    <p>Make an upright Character Busy to start a shift. After its listed delay, it pays out its Supply
    at End phase and becomes ready to advance again.</p>

    <h3>Events</h3>
    <p>Instant Events resolve immediately and go to your Town Dump. Limited Events stay in your town for
    their duration. Both can require upright Characters (by species/study) — those Characters become
    Busy to pay the cost.</p>

    <h3>Capital City: announce &amp; challenge</h3>
    <p>Make an upright Character Busy, pick a Capital City card, and bid at least its cost. It stays
    pending until your next turn. Your opponent may challenge once, on their turn, with a higher bid
    (ties go to the announcer). Only the winner pays; the loser is refunded.</p>

    <h3>Unemployment</h3>
    <p>Disruptive effects can send a Character to Unemployment. Rehire it for its full printed cost to
    return it upright. A freshly-played Character that hasn't yet been upright on your turn is protected
    from being targeted this way.</p>

    <h3>Statues &amp; victory</h3>
    <p>Statues won from the Capital City sit in your Victory Row and count toward victory. Control
    ${rules.victory.statuesToWin} of the ${rules.victory.statueTotal} Statues to win the game.</p>
  `;
}

// ---------- AI agent ----------
function getDelay() {
  return fast ? 0 : 250;
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
      const answer = await inner.choose(state, pi, req);
      const delay = getDelay();
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      return answer;
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
  const otherDeck = cardSet.decks.find((d) => d.id !== chosenDeckId);
  const seedText = $('seedInput').value.trim();
  const seed = seedText ? Number(seedText) : Math.floor(Math.random() * 2 ** 31);
  quitRequested = false;

  const state = createGame(rules, cardSet, {
    seed,
    decks: [chosenDeckId, otherDeck.id],
    names: ['Mayor Bramble', 'Mayor Sable'],
  });
  const human = makeHumanAgent('Mayor Bramble');
  const ai = await makeAIAgent(seed + 1);

  setGame(state, 0);
  showScreen('game');
  if (renderTicker) clearInterval(renderTicker);
  renderTicker = setInterval(() => { if (isGameActive()) renderIfChanged(); }, 150);

  runGame(state, [human, ai]);
}

// ---------- wiring ----------
function wireMenu() {
  $('startGameBtn').addEventListener('click', () => { startGame(); });
  $('howToPlayBtn').addEventListener('click', () => $('howToPlayOverlay').classList.add('active'));
  $('howToPlayBtn2').addEventListener('click', () => $('howToPlayOverlay').classList.add('active'));
  $('closeHowToPlay').addEventListener('click', () => $('howToPlayOverlay').classList.remove('active'));
  $('fastToggle').addEventListener('change', (e) => { fast = e.target.checked; });
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

async function main() {
  const [rulesResp, setResp] = await Promise.all([fetch(RULES_URL), fetch(SET_URL)]);
  rules = await rulesResp.json();
  cardSet = await setResp.json();
  buildMenu();
  wireMenu();
  showScreen('menu');
}

main().catch((e) => {
  document.body.innerHTML = `<pre style="padding:20px;color:#b8434e">Failed to start: ${e.stack || e.message}</pre>`;
  // eslint-disable-next-line no-console
  console.error(e);
});
