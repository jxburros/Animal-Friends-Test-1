#!/usr/bin/env node
// Text-only interactive bridge: runs the engine directly (no browser, no rendering) and pauses
// whenever it's seat 0's turn to decide, exposing a tiny HTTP API so a human (or an agent) can make
// every decision while everything else (state summaries, legal options) stays compact plain text.
//
//   node scripts/interactive-engine.mjs [--port 7891]
//
// Endpoints (all JSON in/out):
//   POST /new    { seed, deck, rival, meFirst, market }  -> starts a game, returns first prompt
//   GET  /status                                          -> current prompt / game summary
//   POST /answer { value }                                -> resolves the pending decision
//
// "value" for /answer:
//   action   -> the integer index printed next to the option
//   resources-> "draw" | "supply"  (or the printed index)
//   pick     -> an array of the printed indices (respect min/max)
//   order    -> an array of the printed indices, in the order you want them (top first)
//   confirm  -> true | false
import fs from 'node:fs';
import http from 'node:http';
import { createGame, playGame, cardDef, topCard } from '../src/engine/index.js';
import { makeHeuristicAgent } from '../src/ai/heuristic.js';

const rules = JSON.parse(fs.readFileSync(new URL('../spec/game.json', import.meta.url)));
const set = JSON.parse(fs.readFileSync(new URL('../spec/maker_card_set.json', import.meta.url)));

const PORT = Number((process.argv.find((a) => a.startsWith('--port=')) || '').split('=')[1]) || 7891;

// ---------------------------------------------------------------- game session
let game = null; // { state, meIdx, pendingReq, resolvePending, notifyNext, finished, log }

function waitForNext() {
  if (!game || game.pendingReq || game.finished) return Promise.resolve();
  return new Promise((resolve) => { game.notifyNext = resolve; });
}

function fireNotify() {
  if (game && game.notifyNext) {
    const n = game.notifyNext;
    game.notifyNext = null;
    n();
  }
}

function makeBridgeAgent() {
  return {
    name: 'Me',
    choose(state, pi, req) {
      return new Promise((resolve) => {
        game.pendingReq = { req, resolve };
        fireNotify();
      });
    },
  };
}

function newGame({ seed, deck, rival, meFirst, market }) {
  const decks = meFirst ? [deck, rival] : [rival, deck];
  const names = meFirst ? ['Me', 'Heuristic AI'] : ['Heuristic AI', 'Me'];
  const state = createGame(rules, set, { seed, decks, names, market });
  const meIdx = meFirst ? 0 : 1;
  const bridge = makeBridgeAgent();
  const ai = makeHeuristicAgent({ seed: (seed || 1) + 1000 });
  const agents = meFirst ? [bridge, ai] : [ai, bridge];
  game = {
    state, meIdx, pendingReq: null, notifyNext: null, finished: false, winner: null,
  };
  playGame(state, agents, { maxTurnsPerPlayer: 250 }).then(() => {
    game.finished = true;
    game.winner = state.winner;
    fireNotify();
  });
}

// ---------------------------------------------------------------- compact rendering
function stackLine(state, s) {
  const name = `${topCard(state, s).name}, ${topCard(state, s).title}`;
  let status;
  if (s.orientation !== 0) status = 'busy';
  else if (s.shift) status = `working (${s.shift.remaining}t -> +${s.shift.output})`;
  else status = 'ready';
  return `${name} [${status}]`;
}

function handLine(state, c) {
  const d = cardDef(state, c.cardId);
  return `${d.name}${d.cost !== undefined ? ` (cost ${d.cost})` : ''}`;
}

function playerSummary(state, pi, { fullHand }) {
  const p = state.players[pi];
  const lines = [];
  lines.push(`${p.name}: Supply ${p.supply}${p.escrow ? `, escrow ${p.escrow}` : ''}, Statues ${p.victoryRow.length}/5, Buildings ${p.buildings.length}`);
  lines.push(`  Town (${p.town.length}): ${p.town.map((s) => stackLine(state, s)).join(' | ') || '(empty)'}`);
  if (p.unemployment.length) lines.push(`  Unemployed: ${p.unemployment.map((c) => cardDef(state, c.cardId).name).join(', ')}`);
  if (fullHand) lines.push(`  Hand (${p.hand.length}): ${p.hand.map((c) => handLine(state, c)).join(', ') || '(empty)'}`);
  else lines.push(`  Hand: ${p.hand.length} cards`);
  return lines.join('\n');
}

function optionLine(state, a, i) {
  const named = (id) => cardDef(state, id)?.name || id;
  switch (a.type) {
    case 'recruit': return `${i}: recruit ${named(a.cardId)}${a.upgrade ? ' (upgrade)' : ''} (cost ${a.cost})`;
    case 'work': return `${i}: work ${named(a.cardId)} (${a.delay}t -> +${a.output})`;
    case 'build': return `${i}: build ${named(a.cardId)} (cost ${a.cost}, crew ${a.needed})`;
    case 'rehire': return `${i}: rehire ${named(a.cardId)} (cost ${a.cost})`;
    case 'layOff': return `${i}: lay off ${named(a.cardId)}`;
    case 'ability': return `${i}: ability of ${named(a.cardId)} (fee ${a.cost || 0})`;
    case 'playEvent': return `${i}: play event ${named(a.cardId)} (cost ${a.cost || 0})`;
    case 'playHeld': return `${i}: play held ${named(a.cardId)}`;
    case 'announce': return `${i}: announce bid on ${named(a.cardId)} (min ${a.minBid}, max ${a.maxBid})`;
    case 'raise': return `${i}: raise bid on ${named(a.cardId)} (min ${a.minBid}, max ${a.maxBid})`;
    case 'clearOrdinance': return `${i}: clear ordinance ${named(a.cardId)} (needed ${a.needed})`;
    case 'demolish': return `${i}: demolish ${named(a.cardId)} (cost ${a.cost})`;
    case 'endTurn': return `${i}: end turn`;
    default: return `${i}: ${a.type} ${JSON.stringify(a)}`;
  }
}

function renderPrompt() {
  if (!game) return { done: true, message: 'no game in progress' };
  if (game.finished) {
    const state = game.state;
    const meIdx = game.meIdx;
    return {
      done: true,
      winner: game.winner === null ? 'draw' : (game.winner === meIdx ? 'me' : 'ai'),
      turns: state.turnNumber,
      me: playerSummary(state, meIdx, { fullHand: false }),
      ai: playerSummary(state, 1 - meIdx, { fullHand: false }),
      log: state.log.slice(-10).map((e) => e.text),
    };
  }
  const { req } = game.pendingReq;
  const state = game.state;
  const meIdx = game.meIdx;
  const out = {
    done: false,
    turn: state.turnNumber,
    phase: state.phase,
    kind: req.kind,
    me: playerSummary(state, meIdx, { fullHand: true }),
    ai: playerSummary(state, 1 - meIdx, { fullHand: false }),
    log: state.log.slice(-6).map((e) => e.text),
  };
  switch (req.kind) {
    case 'resources':
      out.question = 'Resources phase: 0 = draw 1 card, 1 = gain 2 Supply';
      out.options = ['draw', 'supply'];
      break;
    case 'action':
      out.question = 'Choose an action:';
      out.options = req.options.map((a, i) => optionLine(state, a, i));
      break;
    case 'pick':
      out.question = `Pick ${req.min === req.max ? req.min : `${req.min}-${req.max}`} from ${req.from} (${req.reason}):`;
      out.options = req.options.map((o, i) => `${i}: ${o.name || o.cardId}`);
      break;
    case 'order':
      out.question = `Reorder these (${req.reason}), top first — answer with indices in your chosen order:`;
      out.options = req.options.map((o, i) => `${i}: ${o.name || o.cardId}`);
      break;
    case 'confirm':
      out.question = `Confirm? (${req.reason}) default=${req.default}`;
      out.options = ['0: no / false', '1: yes / true'];
      break;
    default:
      out.question = `Unknown request kind ${req.kind}`;
      out.options = [];
  }
  return out;
}

function answerPending(value) {
  const { req, resolve } = game.pendingReq;
  game.pendingReq = null;
  let answer;
  const opts = req.options;
  if (req.kind === 'resources') {
    answer = typeof value === 'number' ? opts[value] : value;
  } else if (req.kind === 'action') {
    answer = opts[Number(value)];
  } else if (req.kind === 'pick') {
    const idxs = Array.isArray(value) ? value : [value];
    answer = idxs.map((i) => opts[Number(i)].uid);
  } else if (req.kind === 'order') {
    const idxs = Array.isArray(value) ? value : opts.map((_, i) => i);
    answer = idxs.map((i) => opts[Number(i)].uid);
  } else if (req.kind === 'confirm') {
    answer = value === true || value === 1 || value === '1' || value === 'true';
  } else {
    answer = value;
  }
  resolve(answer);
}

// ---------------------------------------------------------------- HTTP server
const server = http.createServer(async (req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', async () => {
    try {
      const payload = body ? JSON.parse(body) : {};
      let out;
      if (req.method === 'POST' && req.url === '/new') {
        newGame(payload);
        await waitForNext();
        out = renderPrompt();
      } else if (req.method === 'GET' && req.url === '/status') {
        out = renderPrompt();
      } else if (req.method === 'POST' && req.url === '/answer') {
        if (!game || !game.pendingReq) { out = { error: 'no pending decision' }; }
        else {
          answerPending(payload.value);
          await waitForNext();
          out = renderPrompt();
        }
      } else {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(out));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message, stack: e.stack }));
    }
  });
});
server.listen(PORT, () => console.log(`interactive-engine listening on ${PORT}`));
