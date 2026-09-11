// Renders `state` into the DOM and resolves human decisions (choose(state, pi, request)).
// This module owns all DOM manipulation for the game screen; it never mutates rules state itself —
// it only builds Action/pick/order/confirm answers and hands them back to the engine via askHuman().
import {
  cardDef, topCard, canAct, findStack, eventReduction, assignmentCovers,
} from '../engine/index.js';
import { animalSVG, statueSVG, marketSVG, eventSVG } from './art.js';

export const SPECIES_TO_KIND = { Rabbit: 'rabbit', Mouse: 'mouse', Raccoon: 'raccoon', Fox: 'fox' };

// ---------- module state ----------
let state = null;
let humanIndex = 0;
let aiIndex = 1;
let pending = null; // { pi, request, rawResolve }
let wizard = null; // multi-step action selection in progress
let gameActive = false;
let renderScheduled = false;
let lastLogLen = -1;

export function setGame(s, hIdx) {
  state = s;
  humanIndex = hIdx;
  aiIndex = 1 - hIdx;
  pending = null;
  wizard = null;
  gameActive = true;
  lastLogLen = -1;
  lastSignature = null;
  hidePopoverUI();
  closeModal();
  document.getElementById('winOverlay').classList.remove('active');
  scheduleRender();
}

export function stopGame() {
  gameActive = false;
  pending = null;
  wizard = null;
  hidePopoverUI();
  closeModal();
  document.getElementById('winOverlay').classList.remove('active');
}

export function isGameActive() {
  return gameActive;
}

export function askHuman(pi, request) {
  return new Promise((resolve) => {
    pending = { pi, request, rawResolve: resolve };
    wizard = null;
    scheduleRender();
  });
}

function resolvePending(answer) {
  if (!pending) return;
  const { rawResolve } = pending;
  pending = null;
  wizard = null;
  hidePopoverUI();
  closeModal();
  rawResolve(answer);
  scheduleRender();
}

export function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    renderScheduled = false;
    if (gameActive) renderGame();
  });
}

// Cheap fingerprint of everything the screen depends on. Used by the periodic poll (main.js) so it
// only touches the DOM when something really changed, instead of rebuilding on every tick — rebuilding
// unconditionally would occasionally swap out a card element out from under an in-flight click.
let lastSignature = null;
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

// ---------- card art / faces ----------
function cardArtSVG(def) {
  if (def.type === 'character') return animalSVG(SPECIES_TO_KIND[def.species] || 'rabbit');
  if (def.type === 'statue') return statueSVG(def.virtue || def.name);
  if (def.type === 'market') return marketSVG(def.id);
  if (def.type === 'event') return eventSVG();
  return '';
}

function requirementSummary(def) {
  const reqs = def.requires || [];
  if (!reqs.length) return def.cost ? `Free · costs ${def.cost} Supply` : 'No requirement';
  return reqs.map((r) => `${r.count && r.count > 1 ? `${r.count}× ` : ''}${r.species || r.study}`).join(' + ');
}

function buildCardFace(def, { large = false } = {}) {
  const face = h('div', { class: `card-face t-${def.type}${large ? ' large' : ''}` });
  face.appendChild(h('div', { class: 'stripe' }, def.name));
  if (def.cost !== undefined) face.appendChild(h('div', { class: 'cost' }, String(def.cost)));
  face.appendChild(h('div', { class: 'art', html: cardArtSVG(def) }));
  const body = h('div', { class: 'body' });
  if (def.type === 'character') {
    body.appendChild(h('div', { class: 'name' }, def.title || ''));
    body.appendChild(h('div', { class: 'sub' }, `${def.species} · ${def.study}`));
    if (def.shift) body.appendChild(h('div', { class: 'shiftpill' }, `${def.shift.delay}→${def.shift.output} Supply`));
  } else if (def.type === 'event') {
    body.appendChild(h('div', { class: 'name' }, def.kind === 'limited' ? `Limited ${def.duration}` : 'Instant'));
    body.appendChild(h('div', { class: 'sub' }, requirementSummary(def)));
  } else if (def.type === 'statue') {
    body.appendChild(h('div', { class: 'name' }, def.virtue ? `Statue of ${def.virtue}` : def.name));
  } else if (def.type === 'market') {
    body.appendChild(h('div', { class: 'name' }, 'Capital City card'));
  }
  body.appendChild(h('div', { class: 'rules' }, def.text || ''));
  face.appendChild(body);
  return face;
}

function buildStackEl(stack, { clickable = false, selected = false, onClick = null } = {}) {
  const def = topCard(state, stack);
  const wrap = h('div', { class: `stack${clickable ? ' clickable' : ''}${selected ? ' selected' : ''}` });
  const flip = h('div', { class: `stack-flip orient-${stack.orientation}` });
  flip.appendChild(buildCardFace(def));
  wrap.appendChild(flip);
  const badges = h('div', { class: 'stack-badges' });
  if (stack.shift) badges.appendChild(h('div', { class: 'badge shift' }, `⏳${stack.shift.remaining} → ${stack.shift.output}`));
  if (stack.readyNextTurn) badges.appendChild(h('div', { class: 'badge ready' }, 'ready next turn'));
  wrap.appendChild(badges);
  if (clickable && onClick) wrap.addEventListener('click', onClick);
  return wrap;
}

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
  // Positioned after the popover is visible so popRect reflects its real (content-dependent) size.
  const pop = document.getElementById('popover');
  const rect = anchorEl.getBoundingClientRect();
  const popRect = pop.getBoundingClientRect();
  const margin = 8;
  let top = rect.bottom + margin;
  if (top + popRect.height > window.innerHeight - margin) top = rect.top - popRect.height - margin;
  top = Math.max(margin, Math.min(top, window.innerHeight - popRect.height - margin));
  let left = Math.max(margin, Math.min(rect.left, window.innerWidth - popRect.width - margin));
  pop.style.top = `${top}px`;
  pop.style.left = `${left}px`;
}
function showPopover(anchorEl, buildFn) {
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
        actions.appendChild(h('button', { onclick: () => resolvePending(o) }, `Upgrade ${targetDef ? targetDef.name : 'Character'} → ${def.title} (cost ${o.cost})`));
      } else {
        actions.appendChild(h('button', { class: 'primary', onclick: () => resolvePending(o) }, `Recruit new (cost ${o.cost})`));
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
    if (work) actions.appendChild(h('button', { onclick: () => resolvePending(work) }, `Work shift (${work.delay}→${work.output} Supply)`));
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
  if (state.winner !== null) {
    el.textContent = `Game over — ${state.players[state.winner] ? state.players[state.winner].name : 'Nobody'} wins!`;
    return;
  }
  const active = state.players[state.active];
  let extra = '';
  if (pending && pending.pi !== humanIndex) extra = ` — ${active.name} is deciding…`;
  else if (!pending && state.active !== humanIndex) extra = ` — ${active.name} is thinking…`;
  el.textContent = `Turn ${state.turnNumber} — ${active.name}'s turn (${state.phase})${extra}`;
}

// ---------- log ----------
function renderLog() {
  if (!state.log || state.log.length === lastLogLen) return;
  lastLogLen = state.log.length;
  const el = document.getElementById('gameLog');
  const wasAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
  el.innerHTML = '';
  for (const entry of state.log) {
    const cls = entry.player === null || entry.player === undefined ? 'sys' : `p${entry.player}`;
    el.appendChild(h('div', { class: cls }, `[T${entry.turn}] ${entry.text}`));
  }
  if (wasAtBottom) el.scrollTop = el.scrollHeight;
}

// ---------- Capital City ----------
function renderCapitalCity() {
  const el = document.getElementById('capitalCity');
  el.innerHTML = '';
  const title = h('div', { class: 'cc-title' });
  title.appendChild(h('div', {}, '🏛 Capital City'));
  const piles = h('div', { class: 'cc-piles' });
  piles.appendChild(h('div', {}, `Market Deck: ${state.market.deck.length}`));
  piles.appendChild(h('div', {}, `City Dump: ${state.market.cityDump.length}`));
  piles.appendChild(h('div', {}, `Out of Play: ${state.market.outOfPlay.length}`));
  title.appendChild(piles);
  el.appendChild(title);

  const slots = h('div', { class: 'cc-slots' });
  if (!state.market.city.length) slots.appendChild(h('div', { class: 'modal-sub' }, 'The Capital City is empty.'));
  for (const cardId of state.market.city) {
    const def = cardDef(state, cardId);
    const slot = h('div', { class: 'cc-slot' });
    const face = buildCardFace(def);
    if (wizard && wizard.step === 'chooseMarketCard') {
      const opt = wizard.options.find((o) => o.cardId === cardId);
      if (opt) {
        face.classList.add('clickable');
        face.addEventListener('click', (e) => { e.stopPropagation(); openBidPopover(opt, 'Announce', e.currentTarget); });
      }
    }
    slot.appendChild(face);
    const pd = state.market.pending.find((x) => x.cardId === cardId);
    if (pd) {
      const ann = state.players[pd.announcer];
      const info = h('div', { class: 'pending-info' });
      info.appendChild(h('div', { class: 'pi-line' }, `${ann.name} bids ${pd.bid}${pd.bonus ? ` +${pd.bonus}` : ''}`));
      if (pd.challenge) {
        const ch = state.players[pd.challenge.player];
        info.appendChild(h('div', { class: 'pi-line' }, `Challenge: ${ch.name} bids ${pd.challenge.bid}${pd.challenge.bonus ? ` +${pd.challenge.bonus}` : ''}`));
      } else if (pd.unchallengeable) {
        info.appendChild(h('div', { class: 'pi-line' }, 'Cannot be challenged'));
      } else {
        info.appendChild(h('div', { class: 'pi-line' }, `Resolves on ${ann.name}'s next turn`));
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
  if (wizard && wizard.kind === 'playEvent') {
    const bar = h('div', { class: 'action-bar' });
    const selectedStacks = wizard.selected.map((uid) => findStack(state, humanIndex, uid)).filter(Boolean);
    const waive = eventReduction(state, humanIndex);
    const covered = assignmentCovers(state, wizard.def, selectedStacks, waive);
    bar.appendChild(h('div', {}, `Selected: ${selectedStacks.length ? selectedStacks.map((s) => topCard(state, s).name).join(', ') : 'none yet'}`));
    bar.appendChild(h('button', { class: 'primary', disabled: covered < 0, onclick: () => resolvePending({ ...wizard.option, characters: wizard.selected }) }, 'Confirm characters'));
    bar.appendChild(h('button', { onclick: () => { wizard = null; scheduleRender(); } }, 'Cancel'));
    return bar;
  }
  if (wizard && (wizard.kind === 'announce' || wizard.kind === 'challenge')) {
    const bar = h('div', { class: 'action-bar' });
    bar.appendChild(h('div', {}, wizard.kind === 'announce' ? 'Click a Capital City card to announce your purchase…' : 'Click a pending purchase above to challenge it…'));
    bar.appendChild(h('button', { onclick: () => { wizard = null; scheduleRender(); } }, 'Cancel'));
    return bar;
  }
  const bar = h('div', { class: 'action-bar' });
  if (actionGroups) bar.appendChild(h('button', { class: 'primary end-turn-btn', onclick: () => resolvePending(actionGroups.endTurn || { type: 'endTurn' }) }, 'End Turn'));
  return bar;
}

// ---------- hand ----------
function renderHandPanel(actionGroups) {
  const wrap = h('div', { class: 'hand-panel' });
  wrap.appendChild(h('div', { class: 'town-sub-title' }, 'Your Hand'));
  const row = h('div', { class: 'hand-row' });
  const p = state.players[humanIndex];
  for (const c of p.hand) {
    const def = cardDef(state, c.cardId);
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
    row.appendChild(face);
  }
  wrap.appendChild(row);
  wrap.appendChild(renderActionBar(actionGroups));
  return wrap;
}

// ---------- town panel (shared by opponent + you) ----------
function renderTownPanel(pi, elId) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  const p = state.players[pi];
  const isHuman = pi === humanIndex;
  el.classList.toggle('active-turn', state.active === pi);

  const head = h('div', { class: 'town-head' });
  head.appendChild(h('div', { class: 'pname' }, `${isHuman ? 'You' : p.name}${state.active === pi ? ' 🏛' : ''}`));
  const stats = h('div', { class: 'statbar' });
  stats.appendChild(h('div', { class: 'statchip supply' }, `💰 ${p.supply} Supply`));
  if (p.escrow) stats.appendChild(h('div', { class: 'statchip escrow' }, `🔒 ${p.escrow} escrow`));
  stats.appendChild(h('div', { class: 'statchip statues' }, `🏆 ${p.victoryRow.length}/${state.rules.victory.statuesToWin}`));
  stats.appendChild(h('div', { class: 'statchip' }, `🃏 ${p.hand.length} hand`));
  stats.appendChild(h('div', { class: 'statchip' }, `📚 ${p.deck.length} deck`));
  head.appendChild(stats);
  el.appendChild(head);

  const actionGroups = isHuman ? currentActionGroups() : null;

  if (isHuman && pending && pending.pi === humanIndex && pending.request.kind === 'resources') {
    const resBar = h('div', { class: 'action-bar' });
    resBar.appendChild(h('div', {}, 'Choose your resource:'));
    resBar.appendChild(h('button', { class: 'primary', onclick: () => resolvePending('draw') }, 'Draw 1 card'));
    resBar.appendChild(h('button', { class: 'primary', onclick: () => resolvePending('supply') }, 'Gain 2 Supply'));
    el.appendChild(resBar);
  }

  const row = h('div', { class: 'town-row' });

  // Town (character stacks)
  const townSub = h('div', { class: 'town-sub' });
  townSub.appendChild(h('div', { class: 'town-sub-title' }, 'Town'));
  const stackRow = h('div', { class: 'stack-row' });
  if (!p.town.length) stackRow.appendChild(h('div', { class: 'modal-sub' }, 'No Characters yet.'));
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
  evSub.appendChild(h('div', { class: 'town-sub-title' }, 'Limited Events'));
  const evRow = h('div', { class: 'mini-row' });
  if (!p.events.length) evRow.appendChild(h('div', { class: 'modal-sub' }, 'None active.'));
  for (const e of p.events) {
    const def = cardDef(state, e.cardId);
    const box = h('div', {});
    box.appendChild(buildCardFace(def));
    box.appendChild(h('div', { class: 'badge' }, `${e.remaining} turn${e.remaining === 1 ? '' : 's'} left`));
    evRow.appendChild(box);
  }
  evSub.appendChild(evRow);
  row.appendChild(evSub);

  // Victory Row
  const stSub = h('div', { class: 'town-sub' });
  stSub.appendChild(h('div', { class: 'town-sub-title' }, 'Victory Row (Statues)'));
  const stRow = h('div', { class: 'mini-row' });
  if (!p.victoryRow.length) stRow.appendChild(h('div', { class: 'modal-sub' }, 'None yet.'));
  for (const cardId of p.victoryRow) stRow.appendChild(buildCardFace(cardDef(state, cardId)));
  stSub.appendChild(stRow);
  row.appendChild(stSub);

  // Unemployment
  const unSub = h('div', { class: 'town-sub' });
  unSub.appendChild(h('div', { class: 'town-sub-title' }, 'Unemployment'));
  const unRow = h('div', { class: 'mini-row' });
  if (!p.unemployment.length) unRow.appendChild(h('div', { class: 'modal-sub' }, 'Empty.'));
  for (const c of p.unemployment) {
    const def = cardDef(state, c.cardId);
    const box = h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:3px' });
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
  } else {
    const handWrap = h('div', { class: 'town-sub' });
    handWrap.appendChild(h('div', { class: 'town-sub-title' }, `Hand (${p.hand.length} cards, hidden)`));
    const backs = h('div', { class: 'hand-backs' });
    for (let i = 0; i < p.hand.length; i++) backs.appendChild(h('div', { class: 'card-back-mini' }));
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
  box.appendChild(h('div', { class: 'modal-sub' }, req.min === req.max ? `Choose ${req.min}` : `Choose ${req.min}-${req.max}`));
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
  let order = req.options.map((o) => o.uid);
  const list = h('ul', { class: 'order-list' });
  function renderList() {
    list.innerHTML = '';
    order.forEach((uid, i) => {
      const o = req.options.find((x) => x.uid === uid);
      const def = cardDef(state, o.cardId);
      const item = h('li', { class: 'order-item' });
      item.appendChild(h('div', { class: 'oi-name' }, `${i === 0 ? '(top) ' : ''}${def.name}`));
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
    title.textContent = 'Draw';
    body.textContent = 'The turn limit was reached and neither Mayor held the edge.';
  } else {
    const won = state.winner === humanIndex;
    title.textContent = won ? 'Victory!' : 'Defeat';
    const [a, b] = state.players;
    body.textContent = `${state.players[state.winner].name} wins${state.result === 'statues' ? ' by controlling a majority of the Statues' : ' on tiebreak'}. Final Statues — ${a.name}: ${a.victoryRow.length}, ${b.name}: ${b.victoryRow.length}.`;
  }
  overlay.classList.add('active');
  gameActive = false;
}

// ---------- top-level render ----------
export function renderGame() {
  if (!state) return;
  lastSignature = computeSignature();
  try {
    renderTurnBanner();
    renderTownPanel(aiIndex, 'oppTown');
    renderCapitalCity();
    renderLog();
    renderTownPanel(humanIndex, 'yourTown');
    renderModal();
    if (state.winner !== null) showWinOverlay();
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
}
