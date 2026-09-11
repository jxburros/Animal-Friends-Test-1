// Renders `state` into the DOM and resolves human decisions (choose(state, pi, request)).
// This module owns all DOM manipulation for the game screen; it never mutates rules state itself —
// it only builds Action/pick/order/confirm answers and hands them back to the engine via askHuman().
//
// Presentation flow: the engine appends log lines (some tagged with structured `fx` events) and the
// signature-based poll re-renders the board to the newest state. Every keyed element carries a
// data-key attribute; choreo.js compares the pre-render rectangles with the new DOM to fly cards
// around, and the engine is held at its next decision until those animations have played (settle()).
import {
  cardDef, topCard, canAct, findStack, eventReduction, assignmentCovers, rankOf,
} from '../engine/index.js';
import { cardArtSVG, cardBackSVG, iconSVG } from './art.js';
import * as fx from './fx.js';
import * as choreo from './choreo.js';

export const SPECIES_TO_KIND = { Rabbit: 'rabbit', Mouse: 'mouse', Raccoon: 'raccoon', Fox: 'fox' };
const PHASES = ['start', 'resources', 'ready', 'actions', 'end'];
const PHASE_LABEL = { start: 'Start', resources: 'Resources', ready: 'Ready', actions: 'Actions', end: 'End' };

// ---------- module state ----------
let state = null;
let humanIndex = 0;
let aiIndex = 1;
let pending = null; // { pi, request, rawResolve }
let wizard = null; // multi-step action selection in progress
let gameActive = false;
let renderScheduled = false;
let lastLogLen = -1;
let lastStagedLog = 0;
let lastSignature = null;

choreo.init({
  cardDef: (id) => cardDef(state, id),
  buildCardFace: (def, opts) => buildCardFace(def, { ...opts, interactive: false }),
  cardBack: () => buildCardBack(),
  humanIndex: () => humanIndex,
  state: () => state,
});

export function setGame(s, hIdx) {
  state = s;
  humanIndex = hIdx;
  aiIndex = 1 - hIdx;
  pending = null;
  wizard = null;
  gameActive = true;
  lastLogLen = -1;
  lastStagedLog = 0;
  lastSignature = null;
  fx.clear();
  hidePopoverUI();
  hidePeek();
  closeModal();
  document.getElementById('winOverlay').classList.remove('active');
  renderGame();
}

export function stopGame() {
  gameActive = false;
  pending = null;
  wizard = null;
  fx.clear();
  hidePopoverUI();
  hidePeek();
  closeModal();
  document.getElementById('winOverlay').classList.remove('active');
}

export function isGameActive() {
  return gameActive;
}

/** Render anything new, then wait for the animations it staged to finish playing. */
export function settle() {
  renderIfChanged();
  return fx.idle();
}

export function askHuman(pi, request) {
  return new Promise((resolve) => {
    settle().then(() => {
      if (!gameActive) return; // the game was quit while animations played; the old engine loop is abandoned
      pending = { pi, request, rawResolve: resolve };
      wizard = null;
      scheduleRender();
    });
  });
}

function resolvePending(answer) {
  if (!pending) return;
  const { rawResolve } = pending;
  pending = null;
  wizard = null;
  hidePopoverUI();
  hidePeek();
  closeModal();
  rawResolve(answer);
  scheduleRender();
}

export function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    renderScheduled = false;
    if (gameActive) renderIfChanged();
  });
}

// Cheap fingerprint of everything the screen depends on. Used by the periodic poll (main.js) so it
// only touches the DOM when something really changed, instead of rebuilding on every tick — rebuilding
// unconditionally would swap card elements out from under an in-flight click or animation.
function computeSignature() {
  if (!state) return '';
  const pend = state.market.pending.map((pd) => `${pd.id}:${pd.bid}:${pd.challenge ? pd.challenge.bid : ''}`).join(',');
  const p0 = state.players[0];
  const p1 = state.players[1];
  return [
    state.log.length, state.active, state.phase, state.winner, state.turnNumber,
    pending ? pending.request.kind : '', wizard ? `${wizard.kind}:${wizard.step}:${(wizard.selected || []).join('-')}` : '',
    p0.supply, p1.supply, p0.hand.length, p1.hand.length, p0.town.length, p1.town.length,
    p0.town.map((s) => `${s.uid}:${s.orientation}:${s.shift ? s.shift.remaining : ''}`).join(','),
    p1.town.map((s) => `${s.uid}:${s.orientation}:${s.shift ? s.shift.remaining : ''}`).join(','),
    state.market.city.join(','), pend,
  ].join('|');
}
export function renderIfChanged() {
  if (!gameActive || !state) return;
  if (computeSignature() === lastSignature) return;
  renderGame();
}

// ---------- tiny DOM helper ----------
function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v === false || v === undefined || v === null) { /* omit */ }
    else el.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}
function icon(name, cls = '') {
  return h('i', { class: `ico ${cls}`, html: iconSVG(name) });
}

// ---------- card faces ----------
function requirementParts(def) {
  const reqs = def.requires || [];
  if (!reqs.length) return [];
  return reqs.map((r) => ({ label: `${r.count && r.count > 1 ? `${r.count}× ` : ''}${r.species || r.study}`, icon: r.species || r.study }));
}
function typeIconName(def) {
  if (def.type === 'character') return def.study;
  if (def.type === 'event') return def.kind === 'limited' ? 'limited' : 'instant';
  if (def.type === 'statue') return 'statue';
  return 'market';
}
export function rankLabel(def) {
  if (def.type !== 'character' || !state) return '';
  const r = rankOf(state.rules, def.cost);
  return r.charAt(0).toUpperCase() + r.slice(1);
}

/**
 * Build a card face. `large` is the hand/spotlight size; `interactive` faces get the hover peek and foil
 * pointer tracking (turned off for animation clones).
 */
export function buildCardFace(def, { large = false, interactive = true } = {}) {
  const rank = def.type === 'character' && state ? rankOf(state.rules, def.cost) : null;
  const face = h('div', {
    class: `card-face t-${def.type}${large ? ' large' : ''}${def.foil ? ' foil' : ''}${rank ? ` rank-${rank}` : ''}`,
    'data-card': def.id,
    'data-peek': interactive && !large ? '1' : null,
  });
  const banner = h('div', { class: 'banner' });
  if (def.cost !== undefined) banner.appendChild(h('div', { class: 'cost', title: `Cost ${def.cost} Supply` }, String(def.cost)));
  banner.appendChild(h('div', { class: 'cname' }, def.type === 'statue' && def.virtue ? def.virtue : def.name));
  banner.appendChild(h('div', { class: 'ticon', html: iconSVG(typeIconName(def)) }));
  face.appendChild(banner);
  face.appendChild(h('div', { class: 'art', html: cardArtSVG(def) }));

  const body = h('div', { class: 'body' });
  const traits = h('div', { class: 'traits' });
  if (def.type === 'character') {
    body.appendChild(h('div', { class: 'title' }, def.title || ''));
    traits.appendChild(h('span', { class: 'trait' }, [icon(def.species), def.species]));
    traits.appendChild(h('span', { class: 'trait' }, [icon(def.study), def.study]));
    traits.appendChild(h('span', { class: `trait rank rank-${rank}`, title: `${rankLabel(def)}: ${rank === 'apprentice' ? 'acts at once' : rank === 'journeyman' ? 'ready next turn' : 'ready in two turns'}` }, [icon(rank), rankLabel(def)]));
    body.appendChild(traits);
    if (def.shift) {
      body.appendChild(h('div', { class: 'shiftpill', title: `Shift: Busy for ${def.shift.delay} turn${def.shift.delay === 1 ? '' : 's'}, then produces ${def.shift.output} Supply` }, [
        icon('shift'), `${def.shift.delay}`, h('span', { class: 'arrow' }, '→'), icon('supply'), `${def.shift.output}`,
      ]));
    }
  } else if (def.type === 'event') {
    body.appendChild(h('div', { class: 'title' }, def.kind === 'limited' ? `Limited Event · ${def.duration} turns` : 'Instant Event'));
    const parts = requirementParts(def);
    if (parts.length) for (const pt of parts) traits.appendChild(h('span', { class: 'trait' }, [icon(pt.icon), pt.label]));
    else traits.appendChild(h('span', { class: 'trait' }, 'No requirement'));
    body.appendChild(traits);
  } else if (def.type === 'statue') {
    body.appendChild(h('div', { class: 'title' }, 'Victory Statue'));
    traits.appendChild(h('span', { class: 'trait' }, [icon('statue'), `Virtue of ${def.virtue || def.name}`]));
    body.appendChild(traits);
  } else if (def.type === 'market') {
    body.appendChild(h('div', { class: 'title' }, 'Capital City card'));
    traits.appendChild(h('span', { class: 'trait' }, [icon(def.disposal === 'outOfPlay' ? 'dump' : 'market'), def.disposal === 'outOfPlay' ? 'Goes Out of Play' : 'Returns to the City Dump']));
    body.appendChild(traits);
  }
  body.appendChild(h('div', { class: 'rules' }, def.text || ''));
  if (def.flavor) body.appendChild(h('div', { class: 'flavor' }, def.flavor));
  face.appendChild(body);
  if (def.foil) {
    face.appendChild(h('div', { class: 'foil-sheen' }));
    face.appendChild(h('div', { class: 'foil-tag', title: 'Foil card', html: iconSVG('foil') }));
  }
  face.appendChild(h('div', { class: 'frame' }));
  return face;
}

export function buildCardBack({ mini = false } = {}) {
  return h('div', { class: `card-back${mini ? ' mini' : ''}`, html: cardBackSVG() });
}

function buildStackEl(stack, { clickable = false, selected = false, onClick = null } = {}) {
  const def = topCard(state, stack);
  const wrap = h('div', { class: `stack${clickable ? ' clickable' : ''}${selected ? ' selected' : ''}${stack.shift ? ' working' : ''}`, 'data-key': `stack:${stack.uid}` });
  const flip = h('div', { class: `stack-flip orient-${stack.orientation}` });
  flip.appendChild(buildCardFace(def));
  if (stack.cards.length > 1) flip.appendChild(h('div', { class: 'stack-under' }));
  wrap.appendChild(flip);
  const badges = h('div', { class: 'stack-badges' });
  if (stack.shift) badges.appendChild(h('div', { class: 'badge shift' }, [icon('shift'), `${stack.shift.remaining} → `, icon('supply'), `${stack.shift.output}`]));
  else if (stack.orientation === 270) badges.appendChild(h('div', { class: 'badge busy' }, 'Busy'));
  else if (stack.orientation === 180) badges.appendChild(h('div', { class: 'badge busy' }, 'Arriving'));
  if (stack.readyNextTurn) badges.appendChild(h('div', { class: 'badge ready' }, 'ready next turn'));
  if (clickable) badges.appendChild(h('div', { class: 'badge can-act' }, 'can act'));
  wrap.appendChild(badges);
  if (clickable && onClick) wrap.addEventListener('click', onClick);
  return wrap;
}

// ---------- hover peek (enlarged card preview) ----------
let peekTimer = null;
let peekFor = null;
function hidePeek() {
  clearTimeout(peekTimer);
  peekTimer = null;
  peekFor = null;
  const el = document.getElementById('cardPeek');
  if (el) {
    el.hidden = true;
    el.innerHTML = '';
  }
}
function showPeek(faceEl) {
  if (!state) return;
  const def = state.set.cardsById[faceEl.dataset.card];
  if (!def) return;
  const el = document.getElementById('cardPeek');
  el.innerHTML = '';
  el.appendChild(buildCardFace(def, { large: true, interactive: false }));
  el.hidden = false;
  const r = faceEl.getBoundingClientRect();
  const pr = el.getBoundingClientRect();
  const m = 10;
  let left = r.right + m;
  if (left + pr.width > window.innerWidth - m) left = r.left - pr.width - m;
  if (left < m) left = Math.max(m, Math.min(window.innerWidth - pr.width - m, r.left));
  let top = r.top + r.height / 2 - pr.height / 2;
  top = Math.max(m, Math.min(window.innerHeight - pr.height - m, top));
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}
function wirePeek() {
  document.addEventListener('mouseover', (e) => {
    const face = e.target.closest && e.target.closest('.card-face[data-peek]');
    if (!face || face === peekFor) return;
    if (matchMedia('(hover: none)').matches) return;
    hidePeek();
    peekFor = face;
    peekTimer = setTimeout(() => { if (peekFor === face && document.body.contains(face)) showPeek(face); }, 380);
  });
  document.addEventListener('mouseout', (e) => {
    const face = e.target.closest && e.target.closest('.card-face[data-peek]');
    if (!face) return;
    const to = e.relatedTarget;
    if (to && face.contains(to)) return;
    hidePeek();
  });
  document.addEventListener('mousedown', hidePeek, true);
  document.addEventListener('scroll', hidePeek, true);
  // Foil sheen follows the pointer.
  document.addEventListener('pointermove', (e) => {
    const face = e.target.closest && e.target.closest('.card-face.foil');
    if (!face) return;
    const r = face.getBoundingClientRect();
    face.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    face.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  }, { passive: true });
}
wirePeek();

// ---------- action-option grouping (for the human's 'action' requests) ----------
function pushMulti(map, key, val) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(val);
}
function groupActionOptions(options) {
  const g = {
    byHandRecruit: new Map(), byCharWork: new Map(), byCharAbility: new Map(),
    byCharAnnounce: new Map(), byCharChallenge: new Map(), byEventCard: new Map(),
    byUnemploymentCard: new Map(), endTurn: null,
  };
  for (const o of options) {
    switch (o.type) {
      case 'endTurn': g.endTurn = o; break;
      case 'recruit': pushMulti(g.byHandRecruit, o.cardUid, o); break;
      case 'work': g.byCharWork.set(o.charUid, o); break;
      case 'ability': g.byCharAbility.set(o.charUid, o); break;
      case 'announce': pushMulti(g.byCharAnnounce, o.charUid, o); break;
      case 'challenge': pushMulti(g.byCharChallenge, o.charUid, o); break;
      case 'playEvent': pushMulti(g.byEventCard, o.cardUid, o); break;
      case 'rehire': g.byUnemploymentCard.set(o.cardUid, o); break;
      default: break;
    }
  }
  return g;
}
function currentActionGroups() {
  if (pending && pending.pi === humanIndex && pending.request.kind === 'action') return groupActionOptions(pending.request.options);
  return null;
}

// ---------- popover (character/hand/bid wizard) ----------
function ensureBackdrop() {
  let backdrop = document.getElementById('popoverBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'popoverBackdrop';
    backdrop.className = 'overlay-backdrop-click';
    backdrop.hidden = true;
    document.body.appendChild(backdrop);
  }
  return backdrop;
}
function positionPopover(anchorEl) {
  // .popover is position:fixed, so coordinates are viewport-relative — no scrollX/scrollY offset.
  const pop = document.getElementById('popover');
  const rect = anchorEl.getBoundingClientRect();
  const popRect = pop.getBoundingClientRect();
  const margin = 8;
  let top = rect.bottom + margin;
  if (top + popRect.height > window.innerHeight - margin) top = rect.top - popRect.height - margin;
  top = Math.max(margin, Math.min(top, window.innerHeight - popRect.height - margin));
  const left = Math.max(margin, Math.min(rect.left, window.innerWidth - popRect.width - margin));
  pop.style.top = `${top}px`;
  pop.style.left = `${left}px`;
}
function showPopover(anchorEl, buildFn) {
  hidePeek();
  const backdrop = ensureBackdrop();
  backdrop.hidden = false;
  backdrop.onclick = () => { hidePopoverUI(); wizard = null; scheduleRender(); };
  const pop = document.getElementById('popover');
  pop.innerHTML = '';
  buildFn(pop);
  pop.hidden = false;
  pop.onclick = (e) => e.stopPropagation();
  positionPopover(anchorEl);
}
function hidePopoverUI() {
  const pop = document.getElementById('popover');
  pop.hidden = true;
  pop.innerHTML = '';
  const backdrop = document.getElementById('popoverBackdrop');
  if (backdrop) backdrop.hidden = true;
}

function openRecruitPopover(handCard, options, anchorEl) {
  const def = cardDef(state, handCard.cardId);
  showPopover(anchorEl, (pop) => {
    pop.appendChild(h('h4', {}, `${def.name}, ${def.title}`));
    const actions = h('div', { class: 'po-actions' });
    for (const o of options) {
      if (o.upgrade) {
        const targetStack = findStack(state, humanIndex, o.targetUid);
        const targetDef = targetStack ? topCard(state, targetStack) : null;
        actions.appendChild(h('button', { onclick: () => resolvePending(o) }, `Upgrade ${targetDef ? targetDef.title : 'Character'} → ${def.title} (cost ${o.cost})`));
      } else {
        actions.appendChild(h('button', { class: 'primary', onclick: () => resolvePending(o) }, `Recruit (cost ${o.cost})`));
      }
    }
    pop.appendChild(actions);
  });
}

function openEventPopover(def, options, anchorEl) {
  const canonical = options[0];
  const requiresChars = (def.requires || []).some((r) => r.species || r.study);
  showPopover(anchorEl, (pop) => {
    pop.appendChild(h('h4', {}, def.name));
    const actions = h('div', { class: 'po-actions' });
    const names = (canonical.characters || []).map((uid) => {
      const s = findStack(state, humanIndex, uid);
      return s ? topCard(state, s).name : '?';
    });
    actions.appendChild(h('button', { class: 'primary', onclick: () => resolvePending(canonical) }, names.length ? `Play (using ${names.join(', ')})` : 'Play Event'));
    if (requiresChars) {
      actions.appendChild(h('button', {
        onclick: () => {
          hidePopoverUI();
          wizard = { step: 'chooseEventChars', kind: 'playEvent', option: canonical, def, selected: [] };
          scheduleRender();
        },
      }, 'Choose characters…'));
    }
    pop.appendChild(actions);
  });
}

function openCharacterPopover(stack, groups, anchorEl) {
  const def = topCard(state, stack);
  showPopover(anchorEl, (pop) => {
    pop.appendChild(h('h4', {}, `${def.name}, ${def.title}`));
    const actions = h('div', { class: 'po-actions' });
    const work = groups.byCharWork.get(stack.uid);
    if (work) actions.appendChild(h('button', { onclick: () => resolvePending(work) }, `Work a shift (${work.delay} turn${work.delay === 1 ? '' : 's'} → ${work.output} Supply)`));
    const ability = groups.byCharAbility.get(stack.uid);
    if (ability) actions.appendChild(h('button', { onclick: () => resolvePending(ability) }, 'Use Busy ability'));
    const announceOpts = groups.byCharAnnounce.get(stack.uid);
    if (announceOpts && announceOpts.length) {
      actions.appendChild(h('button', {
        onclick: () => {
          hidePopoverUI();
          wizard = { step: 'chooseMarketCard', kind: 'announce', charUid: stack.uid, options: announceOpts };
          scheduleRender();
        },
      }, 'Announce a purchase…'));
    }
    const challengeOpts = groups.byCharChallenge.get(stack.uid);
    if (challengeOpts && challengeOpts.length) {
      actions.appendChild(h('button', {
        onclick: () => {
          hidePopoverUI();
          wizard = { step: 'choosePending', kind: 'challenge', charUid: stack.uid, options: challengeOpts };
          scheduleRender();
        },
      }, 'Challenge a pending purchase…'));
    }
    if (!work && !ability && !announceOpts && !challengeOpts) actions.appendChild(h('div', { class: 'modal-sub' }, 'Nothing to do right now.'));
    pop.appendChild(actions);
  });
}

function openBidPopover(option, label, anchorEl) {
  showPopover(anchorEl, (pop) => {
    const def = cardDef(state, option.cardId);
    pop.appendChild(h('h4', {}, `${label}: ${def.name}`));
    pop.appendChild(h('div', { class: 'modal-sub' }, `Bid between ${option.minBid} and ${option.maxBid} Supply.`));
    const row = h('div', { class: 'bid-row' });
    const range = h('input', { type: 'range', min: String(option.minBid), max: String(option.maxBid), value: String(option.minBid) });
    const out = h('output', {}, String(option.minBid));
    range.addEventListener('input', () => { out.textContent = range.value; });
    row.appendChild(range);
    row.appendChild(out);
    pop.appendChild(row);
    pop.appendChild(h('button', { class: 'primary', onclick: () => resolvePending({ ...option, bid: Number(range.value) }) }, `Confirm bid (${label})`));
  });
}

function toggleWizardChar(uid) {
  if (!wizard || wizard.step !== 'chooseEventChars') return;
  const idx = wizard.selected.indexOf(uid);
  if (idx >= 0) wizard.selected.splice(idx, 1);
  else wizard.selected.push(uid);
  scheduleRender();
}

// ---------- turn banner ----------
function renderTurnBanner() {
  const el = document.getElementById('turnBanner');
  el.innerHTML = '';
  if (state.winner !== null) {
    el.appendChild(h('div', { class: 'tb-main' }, `The End — ${state.players[state.winner] ? state.players[state.winner].name : 'Nobody'} wins!`));
    return;
  }
  const active = state.players[state.active];
  const mine = state.active === humanIndex;
  let status = '';
  if (pending && pending.pi === humanIndex) status = pending.request.kind === 'action' ? 'Your move' : 'Your choice';
  else if (fx.isBusy()) status = 'Watch…';
  else if (pending && pending.pi !== humanIndex) status = `${active.name} is deciding…`;
  else if (!mine) status = `${active.name} is thinking…`;
  el.appendChild(h('div', { class: 'tb-main' }, [
    h('span', { class: 'tb-chapter' }, `Chapter ${state.turnNumber}`),
    h('span', { class: `tb-who ${mine ? 'you' : 'rival'}` }, mine ? 'Your turn' : `${active.name}'s turn`),
    status ? h('span', { class: 'tb-status' }, status) : null,
  ]));
  const phases = h('div', { class: 'tb-phases' });
  for (const ph of PHASES) {
    phases.appendChild(h('span', { class: `tb-phase${ph === state.phase ? ' on' : ''}${PHASES.indexOf(ph) < PHASES.indexOf(state.phase) ? ' done' : ''}` }, PHASE_LABEL[ph]));
  }
  el.appendChild(phases);
}

// ---------- chronicle (log) ----------
function renderLog() {
  if (!state.log || state.log.length === lastLogLen) return;
  lastLogLen = state.log.length;
  const el = document.getElementById('gameLog');
  const wasAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 12;
  el.innerHTML = '';
  let chapter = null;
  const startChapter = (title, sub) => {
    chapter = h('section', { class: 'chapter' });
    chapter.appendChild(h('div', { class: 'chapter-head' }, [h('span', { class: 'ch-orn' }, '❦'), h('span', { class: 'ch-title' }, title), sub ? h('span', { class: 'ch-sub' }, sub) : null]));
    el.appendChild(chapter);
  };
  startChapter('Prologue', 'The story begins');
  for (const entry of state.log) {
    if (entry.fx && entry.fx.kind === 'turnStart') {
      const who = state.players[entry.fx.player];
      startChapter(`Chapter ${entry.fx.turn}`, `${entry.fx.player === humanIndex ? 'Your' : `${who.name}'s`} turn`);
      continue;
    }
    const cls = entry.player === null || entry.player === undefined ? 'sys' : (entry.player === humanIndex ? 'you' : 'rival');
    const kind = entry.fx ? ` k-${entry.fx.kind}` : '';
    chapter.appendChild(h('p', { class: `line ${cls}${kind}` }, entry.text));
  }
  if (wasAtBottom) el.scrollTop = el.scrollHeight;
}

// ---------- Capital City ----------
function pileChip(key, label, count, cls = '') {
  const chip = h('div', { class: `pile-chip ${cls}`, 'data-key': key, title: label });
  chip.appendChild(buildCardBack({ mini: true }));
  chip.appendChild(h('div', { class: 'pile-text' }, [h('div', { class: 'pile-count' }, String(count)), h('div', { class: 'pile-label' }, label)]));
  return chip;
}
function renderCapitalCity() {
  const el = document.getElementById('capitalCity');
  el.innerHTML = '';
  const head = h('div', { class: 'cc-head' });
  head.appendChild(h('div', { class: 'cc-title' }, [icon('market'), 'The Capital City']));
  head.appendChild(h('div', { class: 'cc-sub' }, 'A contested market: announce with an upright Character, and your rival may challenge once.'));
  const piles = h('div', { class: 'cc-piles' });
  piles.appendChild(pileChip('marketdeck', 'Market Deck', state.market.deck.length));
  piles.appendChild(pileChip('citydump', 'City Dump', state.market.cityDump.length, 'dump'));
  piles.appendChild(pileChip('outofplay', 'Out of Play', state.market.outOfPlay.length, 'out'));
  head.appendChild(piles);
  el.appendChild(head);

  const slots = h('div', { class: 'cc-slots' });
  if (!state.market.city.length) slots.appendChild(h('div', { class: 'empty-note' }, 'The market square is empty.'));
  for (const cardId of state.market.city) {
    const def = cardDef(state, cardId);
    const pd = state.market.pending.find((x) => x.cardId === cardId);
    const slot = h('div', { class: `cc-slot${pd ? ' has-pending' : ''}`, 'data-key': `city:${cardId}` });
    const face = buildCardFace(def);
    if (wizard && wizard.step === 'chooseMarketCard') {
      const opt = wizard.options.find((o) => o.cardId === cardId);
      if (opt) {
        face.classList.add('clickable');
        face.addEventListener('click', (e) => { e.stopPropagation(); openBidPopover(opt, 'Announce', e.currentTarget); });
      } else face.classList.add('dimmed');
    }
    slot.appendChild(face);
    if (pd) {
      const ann = state.players[pd.announcer];
      const mine = pd.announcer === humanIndex;
      const info = h('div', { class: `pending-info ${mine ? 'you' : 'rival'}`, 'data-key': `pend:${cardId}` });
      info.appendChild(h('div', { class: 'pi-line pi-bid' }, [icon('supply'), `${mine ? 'You bid' : `${ann.name} bids`} ${pd.bid}${pd.bonus ? ` +${pd.bonus}` : ''}`]));
      if (pd.challenge) {
        const ch = state.players[pd.challenge.player];
        info.appendChild(h('div', { class: 'pi-line pi-challenge' }, `Challenged: ${pd.challenge.player === humanIndex ? 'you bid' : `${ch.name} bids`} ${pd.challenge.bid}${pd.challenge.bonus ? ` +${pd.challenge.bonus}` : ''}`));
      } else if (pd.unchallengeable) {
        info.appendChild(h('div', { class: 'pi-line' }, 'Cannot be challenged'));
      } else {
        info.appendChild(h('div', { class: 'pi-line' }, `Resolves on ${mine ? 'your' : `${ann.name}'s`} next turn`));
      }
      if (wizard && wizard.step === 'choosePending') {
        const opt = wizard.options.find((o) => o.pendingId === pd.id);
        if (opt) {
          info.classList.add('clickable');
          info.addEventListener('click', (e) => { e.stopPropagation(); openBidPopover(opt, 'Challenge', e.currentTarget); });
        }
      }
      slot.appendChild(info);
    }
    slots.appendChild(slot);
  }
  el.appendChild(slots);
}

// ---------- action bar (bottom of your town) ----------
function renderActionBar(actionGroups) {
  const bar = h('div', { class: 'action-bar' });
  if (wizard && wizard.kind === 'playEvent') {
    const selectedStacks = wizard.selected.map((uid) => findStack(state, humanIndex, uid)).filter(Boolean);
    const waive = eventReduction(state, humanIndex);
    const covered = assignmentCovers(state, wizard.def, selectedStacks, waive);
    bar.appendChild(h('div', { class: 'ab-text' }, `Choose Characters for ${wizard.def.name} — selected: ${selectedStacks.length ? selectedStacks.map((s) => topCard(state, s).name).join(', ') : 'none yet'}`));
    bar.appendChild(h('button', { class: 'primary', disabled: covered < 0, onclick: () => resolvePending({ ...wizard.option, characters: wizard.selected }) }, 'Confirm characters'));
    bar.appendChild(h('button', { onclick: () => { wizard = null; scheduleRender(); } }, 'Cancel'));
    return bar;
  }
  if (wizard && (wizard.kind === 'announce' || wizard.kind === 'challenge')) {
    bar.appendChild(h('div', { class: 'ab-text' }, wizard.kind === 'announce' ? 'Click a Capital City card to announce your purchase…' : 'Click a pending purchase in the Capital City to challenge it…'));
    bar.appendChild(h('button', { onclick: () => { wizard = null; scheduleRender(); } }, 'Cancel'));
    return bar;
  }
  if (actionGroups) {
    bar.appendChild(h('div', { class: 'ab-text' }, 'Click a glowing card to act: recruit from your hand, work a shift, play an Event, bid in the Capital City.'));
    bar.appendChild(h('button', { class: 'primary end-turn-btn', onclick: () => resolvePending(actionGroups.endTurn || { type: 'endTurn' }) }, 'End Turn'));
  } else if (pending && pending.pi === humanIndex) {
    bar.appendChild(h('div', { class: 'ab-text' }, 'Make your choice above…'));
  } else if (state.active === humanIndex && state.winner === null) {
    bar.appendChild(h('div', { class: 'ab-text quiet' }, 'The story unfolds…'));
  } else if (state.winner === null) {
    bar.appendChild(h('div', { class: 'ab-text quiet' }, `${state.players[aiIndex].name} is taking their turn…`));
  }
  return bar;
}

// ---------- hand ----------
function renderHandPanel(actionGroups) {
  const wrap = h('div', { class: 'hand-panel' });
  wrap.appendChild(h('div', { class: 'town-sub-title' }, [icon('hand'), 'Your Hand']));
  const row = h('div', { class: 'hand-row' });
  const p = state.players[humanIndex];
  const n = p.hand.length;
  p.hand.forEach((c, i) => {
    const def = cardDef(state, c.cardId);
    const slot = h('div', { class: 'hand-slot', 'data-key': `hand:${c.uid}` });
    const spread = n > 1 ? (i - (n - 1) / 2) : 0;
    slot.style.setProperty('--fan-rot', `${spread * 2.2}deg`);
    slot.style.setProperty('--fan-y', `${Math.abs(spread) * 3}px`);
    const face = buildCardFace(def, { large: true });
    if (!wizard && actionGroups) {
      if (def.type === 'character' && actionGroups.byHandRecruit.has(c.uid)) {
        face.classList.add('clickable');
        face.addEventListener('click', (e) => { e.stopPropagation(); openRecruitPopover(c, actionGroups.byHandRecruit.get(c.uid), e.currentTarget); });
      } else if (def.type === 'event' && actionGroups.byEventCard.has(c.uid)) {
        face.classList.add('clickable');
        face.addEventListener('click', (e) => { e.stopPropagation(); openEventPopover(def, actionGroups.byEventCard.get(c.uid), e.currentTarget); });
      }
    }
    slot.appendChild(face);
    row.appendChild(slot);
  });
  if (!n) row.appendChild(h('div', { class: 'empty-note' }, 'Your hand is empty.'));
  wrap.appendChild(row);
  return wrap;
}

// ---------- town panel (shared by opponent + you) ----------
function statChip(key, iconName, text, cls = '', title = '') {
  return h('div', { class: `statchip ${cls}`, 'data-key': key, title }, [icon(iconName), text]);
}
function renderTownPanel(pi, elId) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  const p = state.players[pi];
  const isHuman = pi === humanIndex;
  el.classList.toggle('active-turn', state.active === pi);
  el.dataset.key = `town:${pi}`;

  const head = h('div', { class: 'town-head' });
  const deckName = state.set.decksById[p.deckId] ? state.set.decksById[p.deckId].name : '';
  head.appendChild(h('div', { class: 'pname', 'data-key': `pname:${pi}` }, [
    h('span', { class: 'pname-main' }, isHuman ? `You · ${p.name}` : p.name),
    h('span', { class: 'pname-deck' }, deckName),
  ]));
  const stats = h('div', { class: 'statbar' });
  stats.appendChild(statChip(`supply:${pi}`, 'supply', `${p.supply} Supply`, 'supply', 'Supply in the wallet'));
  if (p.escrow) stats.appendChild(statChip(`escrow:${pi}`, 'escrow', `${p.escrow} in escrow`, 'escrow', 'Supply committed to open bids'));
  stats.appendChild(statChip(`statues:${pi}`, 'statue', `${p.victoryRow.length} / ${state.rules.victory.statuesToWin} Statues`, 'statues', 'Statues held; control a majority to win'));
  stats.appendChild(statChip(`hand:${pi}`, 'hand', `${p.hand.length} in hand`, '', 'Cards in hand'));
  stats.appendChild(statChip(`deck:${pi}`, 'deck', `${p.deck.length} in deck`, '', 'Cards left in the deck'));
  stats.appendChild(statChip(`dump:${pi}`, 'dump', `${p.dump.length} in dump`, '', 'Cards in the Town Dump'));
  head.appendChild(stats);
  el.appendChild(head);

  const actionGroups = isHuman ? currentActionGroups() : null;

  if (isHuman && pending && pending.pi === humanIndex && pending.request.kind === 'resources') {
    const resBar = h('div', { class: 'action-bar resources-bar' });
    resBar.appendChild(h('div', { class: 'ab-text' }, 'Resources phase — choose one:'));
    resBar.appendChild(h('button', { class: 'primary', onclick: () => resolvePending('draw') }, [icon('deck'), ' Draw 1 card']));
    resBar.appendChild(h('button', { class: 'primary', onclick: () => resolvePending('supply') }, [icon('supply'), ' Gain 2 Supply']));
    el.appendChild(resBar);
  }

  const row = h('div', { class: 'town-row' });

  // Town (character stacks)
  const townSub = h('div', { class: 'town-sub town-main' });
  townSub.appendChild(h('div', { class: 'town-sub-title' }, [icon('Civics'), 'Town']));
  const stackRow = h('div', { class: 'stack-row' });
  if (!p.town.length) stackRow.appendChild(h('div', { class: 'empty-note' }, 'No Characters have moved in yet.'));
  for (const s of p.town) {
    let clickable = false;
    let selected = false;
    let onClick = null;
    if (isHuman && wizard && wizard.step === 'chooseEventChars') {
      if (canAct(s)) {
        clickable = true;
        selected = wizard.selected.includes(s.uid);
        onClick = (e) => { e.stopPropagation(); toggleWizardChar(s.uid); };
      }
    } else if (isHuman && !wizard && actionGroups) {
      const hasOpt = actionGroups.byCharWork.has(s.uid) || actionGroups.byCharAbility.has(s.uid)
        || actionGroups.byCharAnnounce.has(s.uid) || actionGroups.byCharChallenge.has(s.uid);
      if (hasOpt) {
        clickable = true;
        onClick = (e) => { e.stopPropagation(); openCharacterPopover(s, actionGroups, e.currentTarget); };
      }
    }
    stackRow.appendChild(buildStackEl(s, { clickable, selected, onClick }));
  }
  townSub.appendChild(stackRow);
  row.appendChild(townSub);

  // Limited Events
  const evSub = h('div', { class: 'town-sub' });
  evSub.appendChild(h('div', { class: 'town-sub-title' }, [icon('limited'), 'Limited Events']));
  const evRow = h('div', { class: 'mini-row' });
  if (!p.events.length) evRow.appendChild(h('div', { class: 'empty-note' }, 'None active.'));
  for (const e of p.events) {
    const def = cardDef(state, e.cardId);
    const box = h('div', { class: 'mini-card', 'data-key': `event:${e.uid}`, 'data-card': def.id });
    box.appendChild(buildCardFace(def));
    box.appendChild(h('div', { class: 'badge' }, `${e.remaining} turn${e.remaining === 1 ? '' : 's'} left`));
    evRow.appendChild(box);
  }
  evSub.appendChild(evRow);
  row.appendChild(evSub);

  // Victory Row
  const stSub = h('div', { class: 'town-sub' });
  stSub.appendChild(h('div', { class: 'town-sub-title' }, [icon('statue'), 'Victory Row']));
  const stRow = h('div', { class: 'mini-row' });
  if (!p.victoryRow.length) stRow.appendChild(h('div', { class: 'empty-note' }, 'No Statues yet.'));
  for (const cardId of p.victoryRow) {
    const box = h('div', { class: 'mini-card statue-slot', 'data-key': `statue:${pi}:${cardId}` });
    box.appendChild(buildCardFace(cardDef(state, cardId)));
    stRow.appendChild(box);
  }
  stSub.appendChild(stRow);
  row.appendChild(stSub);

  // Unemployment
  const unSub = h('div', { class: 'town-sub' });
  unSub.appendChild(h('div', { class: 'town-sub-title' }, [icon('busy'), 'Unemployment']));
  const unRow = h('div', { class: 'mini-row' });
  if (!p.unemployment.length) unRow.appendChild(h('div', { class: 'empty-note' }, 'Everyone is employed.'));
  for (const c of p.unemployment) {
    const def = cardDef(state, c.cardId);
    const box = h('div', { class: 'mini-card unemployed', 'data-key': `unemp:${c.uid}` });
    box.appendChild(buildCardFace(def));
    if (isHuman && !wizard && actionGroups && actionGroups.byUnemploymentCard.has(c.uid)) {
      const opt = actionGroups.byUnemploymentCard.get(c.uid);
      box.appendChild(h('button', { class: 'small primary', onclick: () => resolvePending(opt) }, `Rehire (${opt.cost})`));
    }
    unRow.appendChild(box);
  }
  unSub.appendChild(unRow);
  row.appendChild(unSub);

  el.appendChild(row);

  if (isHuman) {
    el.appendChild(renderHandPanel(actionGroups));
    el.appendChild(renderActionBar(actionGroups));
  } else {
    const handWrap = h('div', { class: 'town-sub opp-hand' });
    handWrap.appendChild(h('div', { class: 'town-sub-title' }, [icon('hand'), `Hand · ${p.hand.length} card${p.hand.length === 1 ? '' : 's'}`]));
    const backs = h('div', { class: 'hand-backs', 'data-key': `handbacks:${pi}` });
    for (let i = 0; i < p.hand.length; i++) backs.appendChild(buildCardBack({ mini: true }));
    handWrap.appendChild(backs);
    el.appendChild(handWrap);
  }
}

// ---------- pick / order / confirm modal ----------
const PICK_REASON_TEXT = {
  discard: 'Discard cards',
  ready: 'Ready a Character',
  readyNextTurn: 'Choose a Character to be ready next turn',
  rehire: 'Rehire a Character from Unemployment',
  recruitFree: 'Recruit a free Character',
  eventFromDumpToDeckBottom: 'Put an Event on the bottom of your deck',
  eventFromDumpToHand: 'Return an Event to your hand',
  topdeck: 'Put a card from your hand on top of your deck',
  unemployOpponent: "Send an opponent's Character to Unemployment (or skip)",
  raiseBidTarget: 'Choose which pending bid to raise',
};

function optionFace(o) {
  if (o.cardId && state.set.cardsById[o.cardId]) return buildCardFace(cardDef(state, o.cardId));
  return h('div', { class: 'modal-sub' }, o.name || '');
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.remove('active');
  document.getElementById('modalBox').innerHTML = '';
}

function buildPickModal(box, req) {
  box.appendChild(h('div', { class: 'modal-title' }, PICK_REASON_TEXT[req.reason] || 'Choose'));
  box.appendChild(h('div', { class: 'modal-sub' }, req.min === req.max ? `Choose ${req.min}` : `Choose ${req.min}–${req.max}`));
  const selected = new Set();
  const list = h('div', { class: 'modal-list' });
  const count = h('div', { class: 'modal-count' });
  let confirmBtn;
  function updateCount() {
    count.textContent = `${selected.size} selected`;
    if (confirmBtn) confirmBtn.disabled = selected.size < req.min || selected.size > req.max;
  }
  for (const o of req.options) {
    const choice = h('div', { class: 'modal-choice' });
    choice.appendChild(optionFace(o));
    choice.appendChild(h('div', { class: 'mc-name' }, o.name || ''));
    choice.addEventListener('click', () => {
      if (selected.has(o.uid)) {
        selected.delete(o.uid);
      } else {
        if (selected.size >= req.max) {
          if (req.max === 1) {
            selected.clear();
            list.querySelectorAll('.modal-choice.picked').forEach((n) => n.classList.remove('picked'));
          } else return;
        }
        selected.add(o.uid);
      }
      choice.classList.toggle('picked', selected.has(o.uid));
      updateCount();
    });
    list.appendChild(choice);
  }
  box.appendChild(list);
  box.appendChild(count);
  const actions = h('div', { class: 'modal-actions' });
  confirmBtn = h('button', { class: 'primary', onclick: () => resolvePending([...selected]) }, 'Confirm');
  actions.appendChild(confirmBtn);
  if (req.min === 0) actions.appendChild(h('button', { onclick: () => resolvePending([]) }, 'Skip'));
  box.appendChild(actions);
  updateCount();
}

function buildOrderModal(box, req) {
  box.appendChild(h('div', { class: 'modal-title' }, 'Reorder the top of your deck'));
  box.appendChild(h('div', { class: 'modal-sub' }, 'Top card first — use the arrows to reorder.'));
  const order = req.options.map((o) => o.uid);
  const list = h('ul', { class: 'order-list' });
  function renderList() {
    list.innerHTML = '';
    order.forEach((uid, i) => {
      const o = req.options.find((x) => x.uid === uid);
      const def = cardDef(state, o.cardId);
      const item = h('li', { class: 'order-item' });
      item.appendChild(h('div', { class: 'oi-name' }, `${i === 0 ? '(top) ' : ''}${def.name}${def.title ? `, ${def.title}` : ''}`));
      const btns = h('div', { class: 'oi-btns' });
      btns.appendChild(h('button', { class: 'small', disabled: i === 0, onclick: () => { [order[i - 1], order[i]] = [order[i], order[i - 1]]; renderList(); } }, '↑'));
      btns.appendChild(h('button', { class: 'small', disabled: i === order.length - 1, onclick: () => { [order[i + 1], order[i]] = [order[i], order[i + 1]]; renderList(); } }, '↓'));
      item.appendChild(btns);
      list.appendChild(item);
    });
  }
  renderList();
  box.appendChild(list);
  const actions = h('div', { class: 'modal-actions' });
  actions.appendChild(h('button', { class: 'primary', onclick: () => resolvePending(order) }, 'Confirm order'));
  box.appendChild(actions);
}

function buildConfirmModal(box, req) {
  box.appendChild(h('div', { class: 'modal-title' }, req.reason === 'raiseBid' ? 'Raise a pending bid?' : 'Confirm'));
  if (req.options && req.options.length) {
    box.appendChild(h('div', { class: 'modal-sub' }, `Affects: ${req.options.map((o) => cardDef(state, o.cardId).name).join(', ')}`));
  }
  const actions = h('div', { class: 'modal-actions' });
  actions.appendChild(h('button', { class: 'primary', onclick: () => resolvePending(true) }, 'Yes'));
  actions.appendChild(h('button', { onclick: () => resolvePending(false) }, 'No'));
  box.appendChild(actions);
}

function renderModal() {
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  if (!pending || pending.pi !== humanIndex || !['pick', 'order', 'confirm'].includes(pending.request.kind)) {
    if (overlay.classList.contains('active')) closeModal();
    return;
  }
  box.innerHTML = '';
  overlay.classList.add('active');
  const req = pending.request;
  if (req.kind === 'confirm') buildConfirmModal(box, req);
  else if (req.kind === 'pick') buildPickModal(box, req);
  else if (req.kind === 'order') buildOrderModal(box, req);
}

// ---------- win overlay ----------
function showWinOverlay() {
  const overlay = document.getElementById('winOverlay');
  if (overlay.classList.contains('active')) return;
  const title = document.getElementById('winTitle');
  const body = document.getElementById('winBody');
  if (state.winner === null) {
    title.textContent = 'A Draw';
    body.textContent = 'The turn limit was reached and neither Mayor held the edge.';
  } else {
    const won = state.winner === humanIndex;
    title.textContent = won ? 'Happily Ever After' : 'The Rival Prevails';
    const [a, b] = state.players;
    body.textContent = `${state.players[state.winner].name} wins${state.result === 'statues' ? ' by controlling a majority of the Statues' : ' on tiebreak'}. Final Statues — ${a.name}: ${a.victoryRow.length}, ${b.name}: ${b.victoryRow.length}.`;
  }
  overlay.classList.add('active');
  gameActive = false;
}

// ---------- top-level render ----------
export function renderGame() {
  if (!state) return;
  const prev = fx.captureRects();
  lastSignature = computeSignature();
  hidePeek();
  try {
    renderTurnBanner();
    renderTownPanel(aiIndex, 'oppTown');
    renderCapitalCity();
    renderLog();
    renderTownPanel(humanIndex, 'yourTown');
    renderModal();
  } catch (e) {
    // A render bug should never strand the player with no way to act (e.g. a half-built town panel
    // missing its End Turn button). Surface it and fall back to a minimal, always-safe action bar.
    // eslint-disable-next-line no-console
    console.error('renderGame failed:', e);
    const el = document.getElementById('yourTown');
    if (el) {
      const bar = document.createElement('div');
      bar.className = 'action-bar';
      bar.innerHTML = '<div>Something went wrong rendering the town. You can still end your turn.</div>';
      const btn = document.createElement('button');
      btn.className = 'primary';
      btn.textContent = 'End Turn';
      btn.onclick = () => resolvePending({ type: 'endTurn' });
      bar.appendChild(btn);
      el.appendChild(bar);
    }
  }
  // Re-hide anything a still-playing animation has not introduced yet, then stage the new events.
  fx.applyHidden();
  const entries = state.log.slice(lastStagedLog);
  lastStagedLog = state.log.length;
  choreo.stage(entries, prev);
  if (state.winner !== null) {
    const s = state;
    fx.idle().then(() => { if (state === s && gameActive) showWinOverlay(); });
  }
}
