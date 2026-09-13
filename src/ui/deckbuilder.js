// The Deck Workshop: build a legal 40-card deck out of the whole Character and Event catalogue.
//
// The builder owns its own screen and knows nothing about a running game: it hands a plain
// `{ id, name, list: { cardId: count } }` deck back through onSave, which is exactly what
// createGame accepts in place of a deck id (see engine/state.js resolveDeck).
import { deckRules, deckProblems, maxCopiesOf } from '../engine/deckbuilding.js';
import { RARITIES, powerRating } from '../engine/power.js';
import { buildCardFace, setPreviewContext, raritySlug } from './render.js';
import { iconSVG } from './art.js';

const STORE_KEY = 'af-custom-decks';

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
function icon(name) {
  return h('i', { class: 'ico', html: iconSVG(name) });
}

// ---------- saved decks ----------
export { deckRules, deckProblems };

export function loadSavedDecks() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((d) => d && d.list) : [];
  } catch (e) {
    return [];
  }
}
export function saveDeck(deck) {
  const decks = loadSavedDecks().filter((d) => d.id !== deck.id);
  decks.push(deck);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(decks)); } catch (e) { /* private mode: the deck still plays this session */ }
  return decks;
}
export function deleteSavedDeck(id) {
  const decks = loadSavedDecks().filter((d) => d.id !== id);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(decks)); } catch (e) { /* ignore */ }
  return decks;
}

// ---------- the screen ----------
let host = null;
let ctx = null; // { rules, set, list, name, id, onSave, onCancel }
let filter = { type: 'all', species: null, study: null, rarity: null };

function counts() {
  const byId = ctx.set.cardsById || Object.fromEntries(ctx.set.cards.map((c) => [c.id, c]));
  let total = 0; let chars = 0; let events = 0;
  for (const [id, n] of Object.entries(ctx.list)) {
    if (!n) continue;
    total += n;
    const t = byId[id] && byId[id].type;
    if (t === 'character') chars += n;
    if (t === 'event') events += n;
  }
  return { total, chars, events };
}

function copiesOf(cardId) {
  return ctx.list[cardId] || 0;
}
/** The copy limit for one card: its rarity's, never above the set-wide cap. */
function limitFor(def) {
  return maxCopiesOf(ctx.rules, def);
}
function addCopy(cardId) {
  const dr = deckRules(ctx.rules);
  const byId = ctx.set.cardsById || Object.fromEntries(ctx.set.cards.map((c) => [c.id, c]));
  const { total } = counts();
  if (total >= dr.deckSize || copiesOf(cardId) >= limitFor(byId[cardId])) return;
  ctx.list[cardId] = copiesOf(cardId) + 1;
  render();
}
function removeCopy(cardId) {
  if (!copiesOf(cardId)) return;
  ctx.list[cardId] -= 1;
  if (!ctx.list[cardId]) delete ctx.list[cardId];
  render();
}

function poolCards() {
  return ctx.set.cards
    .filter((c) => {
      if (c.type !== 'character' && c.type !== 'event') return false;
      if (filter.type !== 'all' && c.type !== filter.type) return false;
      if (filter.species && !matchesSpecies(c, filter.species)) return false;
      if (filter.study && !matchesStudy(c, filter.study)) return false;
      if (filter.rarity && (c.rarity || 'Common') !== filter.rarity) return false;
      return true;
    })
    // Strongest for its cost first: the book is browsed down the power curve.
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}
function score(def) {
  return (def.power && def.power.score) || powerRating(def);
}
function matchesSpecies(c, species) {
  if (c.type === 'character') return c.species === species;
  return (c.requires || []).some((r) => r.species === species || (r.name && namedVersions(r.name).some((v) => v.species === species)));
}
function matchesStudy(c, study) {
  if (c.type === 'character') return c.study === study;
  return (c.requires || []).some((r) => r.study === study || (r.name && namedVersions(r.name).some((v) => v.study === study)));
}
/** Every printed version of a named Character: an Event that requires "Pip" belongs with Squirrels and with Lore. */
function namedVersions(name) {
  return ctx.set.cards.filter((c) => c.type === 'character' && c.name === name);
}

function chip(label, active, onClick, iconName) {
  return h('button', { class: `db-chip${active ? ' on' : ''}`, type: 'button', onclick: onClick },
    iconName ? [icon(iconName), label] : [label]);
}

function buildFilters() {
  const bar = h('div', { class: 'db-filters' });
  const typeRow = h('div', { class: 'db-chiprow' }, [
    chip('All cards', filter.type === 'all', () => { filter.type = 'all'; render(); }),
    chip('Characters', filter.type === 'character', () => { filter.type = 'character'; render(); }),
    chip('Events', filter.type === 'event', () => { filter.type = 'event'; render(); }),
  ]);
  const speciesRow = h('div', { class: 'db-chiprow' }, [
    chip('Any species', !filter.species, () => { filter.species = null; render(); }),
    ...ctx.set.species.map((sp) => chip(sp, filter.species === sp, () => {
      filter.species = filter.species === sp ? null : sp;
      render();
    }, sp)),
  ]);
  const studyRow = h('div', { class: 'db-chiprow' }, [
    chip('Any study', !filter.study, () => { filter.study = null; render(); }),
    ...ctx.set.studies.map((st) => chip(st, filter.study === st, () => {
      filter.study = filter.study === st ? null : st;
      render();
    }, st)),
  ]);
  const rarityRow = h('div', { class: 'db-chiprow' }, [
    chip('Any rarity', !filter.rarity, () => { filter.rarity = null; render(); }),
    ...RARITIES.map((r) => chip(r, filter.rarity === r, () => {
      filter.rarity = filter.rarity === r ? null : r;
      render();
    })),
  ]);
  bar.appendChild(typeRow);
  bar.appendChild(speciesRow);
  bar.appendChild(studyRow);
  bar.appendChild(rarityRow);
  return bar;
}

function buildPool() {
  const dr = deckRules(ctx.rules);
  const grid = h('div', { class: 'db-pool' });
  for (const def of poolCards()) {
    const n = copiesOf(def.id);
    const slot = h('div', { class: `db-slot${n ? ' in-deck' : ''}` });
    const face = buildCardFace(def, { interactive: true });
    face.classList.add('clickable');
    slot.appendChild(face);
    const limit = limitFor(def);
    slot.appendChild(h('div', { class: 'db-slot-controls' }, [
      h('button', { class: 'small', type: 'button', title: 'Remove a copy', disabled: !n, onclick: (e) => { e.stopPropagation(); removeCopy(def.id); } }, '−'),
      h('span', { class: 'db-count', title: `${def.rarity || 'Common'}: at most ${limit} in a deck` }, `${n}/${limit}`),
      h('button', { class: 'small', type: 'button', title: 'Add a copy', disabled: n >= limit, onclick: (e) => { e.stopPropagation(); addCopy(def.id); } }, '+'),
    ]));
    slot.addEventListener('click', () => addCopy(def.id));
    grid.appendChild(slot);
  }
  if (!grid.childNodes.length) grid.appendChild(h('p', { class: 'db-empty' }, 'No cards match these filters.'));
  return grid;
}

function buildDeckList() {
  const byId = ctx.set.cardsById || Object.fromEntries(ctx.set.cards.map((c) => [c.id, c]));
  const wrap = h('div', { class: 'db-list' });
  const groups = [['character', 'Characters'], ['event', 'Events']];
  for (const [type, label] of groups) {
    const rows = Object.entries(ctx.list)
      .filter(([id, n]) => n > 0 && byId[id] && byId[id].type === type)
      .sort((a, b) => (byId[a[0]].cost || 0) - (byId[b[0]].cost || 0) || byId[a[0]].name.localeCompare(byId[b[0]].name));
    const n = rows.reduce((a, [, c]) => a + c, 0);
    wrap.appendChild(h('div', { class: 'db-list-title' }, `${label} · ${n}`));
    if (!rows.length) wrap.appendChild(h('div', { class: 'db-empty' }, `No ${label.toLowerCase()} yet.`));
    for (const [id, copies] of rows) {
      const def = byId[id];
      wrap.appendChild(h('div', { class: 'db-row' }, [
        h('span', { class: 'db-row-n' }, `${copies}×`),
        h('span', { class: 'db-row-cost', title: `Cost ${def.cost}` }, String(def.cost || 0)),
        h('span', { class: 'db-row-name' }, def.type === 'character' ? `${def.name}, ${def.title}` : def.name),
        h('span', { class: 'db-row-tags' }, def.type === 'character' ? [icon(def.species), icon(def.study)] : [icon(def.kind === 'limited' ? 'limited' : 'instant')]),
        h('span', { class: `rarity-tag rar-${raritySlug(def)}`, title: `${def.rarity || 'Common'}: at most ${limitFor(def)} in a deck` }, def.rarity || 'Common'),
        h('button', { class: 'small', type: 'button', title: 'Remove a copy', onclick: () => removeCopy(id) }, '−'),
      ]));
    }
  }
  return wrap;
}

function suggestFrom(deckId) {
  const preset = ctx.set.decks.find((d) => d.id === deckId);
  if (!preset) return;
  ctx.list = { ...preset.list };
  if (!ctx.name || ctx.name === 'My Town') ctx.name = `${preset.name} (copy)`;
  render();
}

function render() {
  const dr = deckRules(ctx.rules);
  const { total, chars, events } = counts();
  const problems = deckProblems(ctx.rules, ctx.set, ctx.list);
  host.innerHTML = '';

  const nameInput = h('input', { type: 'text', id: 'dbName', class: 'seed-input', value: ctx.name, maxlength: '40', placeholder: 'Name your deck' });
  nameInput.addEventListener('input', () => { ctx.name = nameInput.value; });

  const head = h('div', { class: 'db-head' }, [
    h('div', { class: 'db-head-main' }, [
      h('h2', {}, 'The Deck Workshop'),
      h('p', { class: 'db-sub' }, `Build a ${dr.deckSize}-card town deck from any Characters and Events in the book — at least ${dr.minCharacters} Characters, and copies capped by rarity: ${RARITIES.map((r) => `${r} ${dr.copiesByRarity[r]}`).join(', ')}.`),
    ]),
    h('div', { class: 'db-head-side' }, [
      h('label', { class: 'menu-label', for: 'dbName' }, 'Deck name'),
      nameInput,
    ]),
  ]);

  const counter = h('div', { class: `db-counter${problems.length ? '' : ' ok'}` }, [
    h('div', { class: 'db-big' }, `${total} / ${dr.deckSize}`),
    h('div', { class: 'db-counter-sub' }, `${chars} Characters · ${events} Events`),
    problems.length
      ? h('ul', { class: 'db-problems' }, problems.map((t) => h('li', {}, t)))
      : h('div', { class: 'db-ok' }, 'This deck is ready to play.'),
  ]);

  const starters = h('div', { class: 'db-chiprow' }, [
    h('span', { class: 'db-chiplabel' }, 'Start from:'),
    ...ctx.set.decks.map((d) => chip(d.name, false, () => suggestFrom(d.id))),
    chip('Empty', false, () => { ctx.list = {}; render(); }),
  ]);

  const actions = h('div', { class: 'db-actions' }, [
    h('button', { type: 'button', onclick: () => ctx.onCancel() }, 'Back to the cover'),
    h('button', { class: 'primary', type: 'button', disabled: problems.length > 0, onclick: () => ctx.onSave({ id: ctx.id, name: ctx.name.trim() || 'My Town', list: { ...ctx.list } }) }, 'Save & play this deck'),
  ]);

  host.appendChild(head);
  host.appendChild(h('div', { class: 'db-body' }, [
    h('div', { class: 'db-left page' }, [starters, buildFilters(), buildPool()]),
    h('div', { class: 'db-right page' }, [counter, buildDeckList(), actions]),
  ]));
}

/**
 * Open the builder in `hostEl`.
 * @param opts { rules, set, deck?, onSave(deck), onCancel() }
 */
export function openDeckBuilder(hostEl, opts) {
  setPreviewContext(opts.rules, opts.set);
  host = hostEl;
  ctx = {
    rules: opts.rules,
    set: opts.set,
    id: (opts.deck && opts.deck.id) || `custom-${Date.now().toString(36)}`,
    name: (opts.deck && opts.deck.name) || 'My Town',
    list: { ...((opts.deck && opts.deck.list) || {}) },
    onSave: opts.onSave,
    onCancel: opts.onCancel,
  };
  filter = { type: 'all', species: null, study: null, rarity: null };
  render();
}
