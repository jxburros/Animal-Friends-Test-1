// The Deck Workshop: build a legal 40-card deck out of the whole Character and Event catalogue.
//
// The builder owns its own screen and knows nothing about a running game: it hands a plain
// `{ id, name, list: { cardId: count } }` deck back through onSave, which is exactly what
// createGame accepts in place of a deck id (see engine/state.js resolveDeck).
//
// Two shelves stand side by side. "The printed book" is the published collection in
// spec/starter_card_set.json — the only cards a deck may hold. "Maker cards" is the hand-remade
// collection in spec/maker_card_set.json, shown for comparison and not playable yet. Each printed
// card can be ticked off as remade (see ./remade.js), so the rebuild can be tracked card by card.
import { deckRules, deckProblems, deckWarnings, maxCopiesOf, DECK_TYPES } from '../engine/deckbuilding.js';
import { RARITIES, powerRating } from '../engine/power.js';
import { groupByCharacter, characterOf } from '../engine/characters.js';
import { buildCardFace, setPreviewContext, raritySlug } from './render.js';
import { iconSVG } from './art.js';
import {
  loadRemade, setRemade, makerRemakesIndex, remadeStatus, remadeProgress, downloadRemade,
} from './remade.js';

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
export { deckRules, deckProblems, deckWarnings };

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
let ctx = null; // { rules, set, makerSet, list, name, id, marks, makerIndex, onSave, onCancel }
let filter = { type: 'all', species: null, study: null, rarity: null, remade: 'any' };
let sort = 'power'; // 'power' | 'character' | 'cost' | 'name'
let section = 'printed'; // 'printed' | 'maker'

const SORTS = [
  ['power', 'Power'],
  ['character', 'Character'],
  ['cost', 'Cost'],
  ['name', 'Name'],
];

function counts() {
  const byId = ctx.set.cardsById || Object.fromEntries(ctx.set.cards.map((c) => [c.id, c]));
  let total = 0; let chars = 0; let events = 0; let buildings = 0;
  for (const [id, n] of Object.entries(ctx.list)) {
    if (!n) continue;
    total += n;
    const t = byId[id] && byId[id].type;
    if (t === 'character') chars += n;
    if (t === 'event') events += n;
    if (t === 'townBuilding') buildings += n;
  }
  return { total, chars, events, buildings };
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
  if (total >= dr.maxDeckSize || copiesOf(cardId) >= limitFor(byId[cardId])) return;
  ctx.list[cardId] = copiesOf(cardId) + 1;
  render();
}
function removeCopy(cardId) {
  if (!copiesOf(cardId)) return;
  ctx.list[cardId] -= 1;
  if (!ctx.list[cardId]) delete ctx.list[cardId];
  render();
}

/**
 * Every card of the shelf being browsed, before filtering.
 * The printed shelf shows only what a deck may hold. The Maker shelf holds nothing deckable yet, so
 * it shows everything on it — including the Capital City hires (`marketCharacter`), which are part
 * of a remade character's set and would otherwise be invisible.
 */
function shelfCards() {
  if (section === 'maker') return ((ctx.makerSet && ctx.makerSet.cards) || []);
  return ctx.set.cards.filter((c) => DECK_TYPES.has(c.type));
}

function matchesFilters(c) {
  if (filter.type !== 'all' && c.type !== filter.type) return false;
  if (filter.species && !matchesSpecies(c, filter.species)) return false;
  if (filter.study && !matchesStudy(c, filter.study)) return false;
  if (filter.rarity && (c.rarity || 'Common') !== filter.rarity) return false;
  // "Remade" is a fact about a printed card; the Maker shelf is the remakes themselves.
  if (section === 'printed' && filter.remade !== 'any') {
    const done = !!statusOf(c.id);
    if (filter.remade === 'yes' && !done) return false;
    if (filter.remade === 'no' && done) return false;
  }
  return true;
}

function compare(a, b) {
  if (sort === 'cost') return (a.cost || 0) - (b.cost || 0) || a.name.localeCompare(b.name);
  if (sort === 'name') return a.name.localeCompare(b.name) || (a.cost || 0) - (b.cost || 0);
  // Strongest for its cost first: the book is browsed down the power curve.
  return score(b) - score(a) || a.name.localeCompare(b.name);
}

function poolCards() {
  return shelfCards().filter(matchesFilters).sort(compare);
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
/**
 * Every version of a named Character, on either shelf: an Event that requires "Pip" belongs with
 * Squirrels and with Lore. A Maker event requiring a remade name finds its versions on the Maker
 * shelf, where the printed set has none.
 */
function namedVersions(name) {
  const maker = (ctx.makerSet && ctx.makerSet.cards) || [];
  return [...ctx.set.cards, ...maker].filter((c) => c.type === 'character' && c.name === name);
}

// ---------- remade ticks ----------
function statusOf(cardId) {
  return remadeStatus(ctx.marks, ctx.makerIndex, cardId);
}
function toggleRemade(def) {
  const status = statusOf(def.id);
  if (status && status.by === 'maker') return; // a Maker card owns this tick; untick it there
  ctx.marks = setRemade(ctx.marks, def, !status);
  render();
}

/**
 * The story panel: a remade character's backstory beside the flavor of every version of them.
 * Card faces clip long flavor, and a backstory has nowhere to live on a card at all — this is where
 * the writing the cards came out of is actually read.
 */
function characterEntry(name) {
  return ((ctx.makerSet && ctx.makerSet.characters) || []).find((c) => c.name === name) || null;
}
function openStory(def) {
  const entry = characterEntry(def.name);
  // A town card belongs to nobody: a Building is not somebody's backstory. Rather than apologise for
  // a character entry it was never going to have, it tells its own story — why it exists, and the
  // flavor that places it in the town.
  const townCard = !entry && !def.species;
  const versions = ((ctx.makerSet && ctx.makerSet.cards) || [])
    .filter((c) => characterOf(c) === def.name)
    .sort((a, b) => (a.cost || 0) - (b.cost || 0));
  // tabindex: showModal() otherwise focuses the close button at the foot of a long story and
  // scrolls the panel past the character's name before it is ever read.
  const dialog = h('dialog', { class: 'db-story', tabindex: '-1', 'aria-label': `The story of ${def.name}` });
  const head = h('div', { class: 'db-story-head' }, [
    h('h2', {}, def.name),
    h('p', { class: 'db-story-sub' }, entry
      ? [entry.species, (entry.studies || []).join(' · '), entry.pronouns].filter(Boolean).join(' — ')
      : townCard ? (def.title || 'A town card')
        : `${def.species || ''} ${def.study ? `· ${def.study}` : ''}`.trim()),
  ]);
  if (entry && entry.renamedFrom) {
    head.appendChild(h('p', { class: 'db-story-renamed' }, `Remade from ${entry.renamedFrom}.`));
  }
  const body = h('div', { class: 'db-story-body' });
  if (entry) {
    for (const para of String(entry.backstory || '').split('\n\n')) {
      if (para.trim()) body.appendChild(h('p', {}, para.trim()));
    }
    if (entry.voice) body.appendChild(h('p', { class: 'db-story-note' }, [h('strong', {}, 'Voice. '), entry.voice]));
    if (entry.arc) body.appendChild(h('p', { class: 'db-story-note' }, [h('strong', {}, 'The arc. '), entry.arc]));
  } else if (townCard) {
    if (def.addedBecause) body.appendChild(h('p', {}, def.addedBecause));
    if (def.text) body.appendChild(h('p', { class: 'db-story-rules' }, def.text));
    if (def.flavor) body.appendChild(h('p', { class: 'db-story-flavor' }, def.flavor));
    body.appendChild(h('p', { class: 'db-story-note' }, [
      h('strong', {}, 'A town card. '),
      'It belongs to no character — a Building is not somebody\u2019s backstory. Why each batch of them exists is recorded under townCards in spec/maker_card_set.json.',
    ]));
  } else {
    body.appendChild(h('p', { class: 'db-empty' }, 'No backstory written for this character yet.'));
  }
  if (versions.length) {
    body.appendChild(h('h3', { class: 'db-story-h3' }, 'The cards, and what they say'));
    for (const v of versions) {
      body.appendChild(h('div', { class: `db-story-card${v.id === def.id ? ' current' : ''}` }, [
        h('div', { class: 'db-story-card-head' }, [
          h('span', { class: 'db-row-cost' }, String(v.cost ?? 0)),
          h('span', { class: 'db-story-card-name' }, v.type === 'character' ? `${v.name}, ${v.title}` : v.name),
          h('span', { class: `rarity-tag rar-${raritySlug(v)}` }, v.rarity || 'Common'),
        ]),
        h('p', { class: 'db-story-rules' }, v.text || ''),
        h('p', { class: 'db-story-flavor' }, v.flavor || ''),
      ]));
    }
  }
  dialog.appendChild(head);
  dialog.appendChild(body);
  dialog.appendChild(h('button', { class: 'primary', type: 'button', onclick: () => dialog.close() }, 'Close the book'));
  dialog.addEventListener('close', () => dialog.remove());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  document.body.appendChild(dialog);
  dialog.showModal();
  dialog.scrollTop = 0;
}

function chip(label, active, onClick, iconName) {
  return h('button', { class: `db-chip${active ? ' on' : ''}`, type: 'button', onclick: onClick },
    iconName ? [icon(iconName), label] : [label]);
}

function buildShelfBar() {
  const printedCount = ctx.set.cards.filter((c) => DECK_TYPES.has(c.type)).length;
  const makerCount = ((ctx.makerSet && ctx.makerSet.cards) || []).length;
  const progress = remadeProgress(ctx.marks, ctx.makerIndex, ctx.set.cards);
  const bar = h('div', { class: 'db-shelfbar' }, [
    h('div', { class: 'db-chiprow' }, [
      h('span', { class: 'db-chiplabel' }, 'Shelf:'),
      chip(`The printed book · ${printedCount}`, section === 'printed', () => { section = 'printed'; render(); }),
      chip(`Maker cards · ${makerCount}`, section === 'maker', () => { section = 'maker'; render(); }),
    ]),
    h('div', { class: 'db-progress' }, [
      h('span', {}, `Remade ${progress.done} of ${progress.total} cards in the printed collection.`),
      h('button', {
        class: 'small',
        type: 'button',
        title: 'Download the remade list as JSON — ids first, so it still reads after a rename',
        onclick: () => downloadRemade(ctx.marks, ctx.makerIndex, ctx.set),
      }, 'Export remade list'),
    ]),
  ]);
  return bar;
}

function buildFilters() {
  const bar = h('div', { class: 'db-filters' });
  const typeRow = h('div', { class: 'db-chiprow' }, [
    chip('All cards', filter.type === 'all', () => { filter.type = 'all'; render(); }),
    chip('Characters', filter.type === 'character', () => { filter.type = 'character'; render(); }),
    chip('Events', filter.type === 'event', () => { filter.type = 'event'; render(); }),
    chip('Town Buildings', filter.type === 'townBuilding', () => { filter.type = 'townBuilding'; render(); }),
  ]);
  const sortRow = h('div', { class: 'db-chiprow' }, [
    h('span', { class: 'db-chiplabel' }, 'Sort by:'),
    ...SORTS.map(([key, label]) => chip(label, sort === key, () => { sort = key; render(); })),
  ]);
  const speciesRow = h('div', { class: 'db-chiprow' }, [
    chip('Any species', !filter.species, () => { filter.species = null; render(); }),
    ...speciesList().map((sp) => chip(sp, filter.species === sp, () => {
      filter.species = filter.species === sp ? null : sp;
      render();
    }, sp)),
  ]);
  const studyRow = h('div', { class: 'db-chiprow' }, [
    chip('Any study', !filter.study, () => { filter.study = null; render(); }),
    ...studyList().map((st) => chip(st, filter.study === st, () => {
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
  bar.appendChild(sortRow);
  bar.appendChild(speciesRow);
  bar.appendChild(studyRow);
  bar.appendChild(rarityRow);
  if (section === 'printed') {
    bar.appendChild(h('div', { class: 'db-chiprow' }, [
      h('span', { class: 'db-chiplabel' }, 'Remade:'),
      chip('Any', filter.remade === 'any', () => { filter.remade = 'any'; render(); }),
      chip('Remade', filter.remade === 'yes', () => { filter.remade = 'yes'; render(); }),
      chip('Not yet', filter.remade === 'no', () => { filter.remade = 'no'; render(); }),
    ]));
  }
  return bar;
}
/**
 * The species and studies to offer as filters: the printed set's, plus any the Maker set adds.
 * A remade character may open a study the printed collection never had (Food, on Peanut's cards),
 * and it has to be filterable the moment it exists or the cards using it are unreachable.
 */
function speciesList() {
  return union(ctx.set.species, ctx.makerSet && ctx.makerSet.species);
}
function studyList() {
  return union(ctx.set.studies, ctx.makerSet && ctx.makerSet.studies);
}
function union(a, b) {
  return [...new Set([...(a || []), ...(b || [])])];
}

function buildSlot(def) {
  const status = statusOf(def.id);
  const isMaker = section === 'maker';
  const n = isMaker ? 0 : copiesOf(def.id);
  const slot = h('div', { class: `db-slot${n ? ' in-deck' : ''}${status && !isMaker ? ' remade' : ''}${isMaker ? ' maker' : ''}` });
  const face = buildCardFace(def, { interactive: true });
  slot.appendChild(face);
  if (isMaker) {
    const remade = [].concat(def.remakes || []);
    const olds = remade.map((id) => (ctx.set.cardsById && ctx.set.cardsById[id]) || null);
    slot.appendChild(h('div', { class: 'db-slot-controls maker' }, [
      h('span', { class: 'db-maker-tag', title: 'Maker cards cannot go in a deck yet' }, 'Not playable yet'),
      h('button', {
        class: 'small',
        type: 'button',
        title: `Read ${def.name}'s backstory and the full flavor of every version`,
        onclick: (e) => { e.stopPropagation(); openStory(def); },
      }, 'Story'),
    ]));
    if (remade.length) {
      slot.appendChild(h('div', { class: 'db-maker-note' },
        `Remakes ${remade.map((id, i) => (olds[i] ? `${olds[i].name} (${id})` : id)).join(', ')}`));
    } else if (def.addition) {
      // An addition replaces nothing, and says why. Without this the shelf showed it exactly like a
      // remake whose link had been forgotten, which is the one thing the tick list must not do.
      slot.appendChild(h('div', { class: 'db-maker-note added', title: def.addedBecause || '' },
        `Added — replaces nothing${def.addedBecause ? `: ${def.addedBecause}` : ''}`));
    }
    return slot;
  }
  face.classList.add('clickable');
  const limit = limitFor(def);
  slot.appendChild(h('div', { class: 'db-slot-controls' }, [
    h('button', { class: 'small', type: 'button', title: 'Remove a copy', disabled: !n, onclick: (e) => { e.stopPropagation(); removeCopy(def.id); } }, '−'),
    h('span', { class: 'db-count', title: `${def.rarity || 'Common'}: at most ${limit} in a deck` }, `${n}/${limit}`),
    h('button', { class: 'small', type: 'button', title: 'Add a copy', disabled: n >= limit, onclick: (e) => { e.stopPropagation(); addCopy(def.id); } }, '+'),
  ]));
  const byMaker = status && status.by === 'maker';
  slot.appendChild(h('button', {
    class: `db-remade${status ? ' on' : ''}`,
    type: 'button',
    disabled: byMaker,
    title: byMaker
      ? `Remade as the Maker card ${status.makerCard.name} (${status.makerCard.id}) — the link lives in spec/maker_card_set.json`
      : `Tick ${def.name} (${def.id}) off once it has been remade`,
    onclick: (e) => { e.stopPropagation(); toggleRemade(def); },
  }, status ? `✓ Remade${byMaker ? ' (maker card)' : ''}` : 'Mark remade'));
  slot.addEventListener('click', () => addCopy(def.id));
  return slot;
}

function buildPool() {
  const cards = poolCards();
  if (!cards.length) return h('div', { class: 'db-pool-wrap' }, [emptyNote()]);
  if (sort !== 'character') {
    const grid = h('div', { class: 'db-pool' });
    for (const def of cards) grid.appendChild(buildSlot(def));
    return grid;
  }
  // By Character: every version of a name together, in one run, cheapest first.
  const wrap = h('div', { class: 'db-pool-wrap' });
  for (const group of groupByCharacter(cards)) {
    const heading = group.name || 'No named Character';
    const chars = group.cards.filter((c) => c.type === 'character').length;
    wrap.appendChild(h('div', { class: 'db-group-title' }, [
      h('span', { class: 'db-group-name' }, heading),
      h('span', { class: 'db-group-count' }, group.name
        ? `${chars} version${chars === 1 ? '' : 's'}${group.cards.length > chars ? ` · ${group.cards.length - chars} Event${group.cards.length - chars === 1 ? '' : 's'}` : ''}`
        : `${group.cards.length} card${group.cards.length === 1 ? '' : 's'}`),
    ]));
    const grid = h('div', { class: 'db-pool' });
    for (const def of group.cards) grid.appendChild(buildSlot(def));
    wrap.appendChild(grid);
  }
  return wrap;
}

function emptyNote() {
  if (section !== 'maker') return h('p', { class: 'db-empty' }, 'No cards match these filters.');
  const total = ((ctx.makerSet && ctx.makerSet.cards) || []).length;
  if (total) return h('p', { class: 'db-empty' }, 'No maker cards match these filters.');
  return h('div', { class: 'db-maker-empty' }, [
    h('h3', {}, 'No maker cards yet.'),
    h('p', {}, 'This shelf holds the collection as it is remade, card by card, so a new version can be read beside the printed one. It is empty until the first card is written.'),
    h('p', {}, 'Add cards to spec/maker_card_set.json using the same fields as the printed set, plus one of two labels. A card that replaces a printed one carries "remakes": the id (or a list of ids) it replaces — that link ticks the old card off here even after the new card is renamed. A card that replaces nothing carries "addition": true and an "addedBecause" line saying why it is new.'),
    h('p', { class: 'db-empty' }, 'Maker cards cannot be put in a deck yet; the Workshop shows them for comparison only.'),
  ]);
}

function buildDeckList() {
  const byId = ctx.set.cardsById || Object.fromEntries(ctx.set.cards.map((c) => [c.id, c]));
  const wrap = h('div', { class: 'db-list' });
  const groups = [['character', 'Characters'], ['event', 'Events']];
  for (const [type, label] of groups) {
    const rows = Object.entries(ctx.list)
      .filter(([id, n]) => n > 0 && byId[id] && byId[id].type === type)
      .sort((a, b) => deckRowOrder(byId[a[0]], byId[b[0]]));
    const n = rows.reduce((a, [, c]) => a + c, 0);
    wrap.appendChild(h('div', { class: 'db-list-title' }, `${label} · ${n}`));
    if (!rows.length) wrap.appendChild(h('div', { class: 'db-empty' }, `No ${label.toLowerCase()} yet.`));
    let lastHeading = null;
    for (const [id, copies] of rows) {
      const def = byId[id];
      if (sort === 'character') {
        const heading = characterOf(def) || 'No named Character';
        if (heading !== lastHeading) {
          wrap.appendChild(h('div', { class: 'db-list-sub' }, heading));
          lastHeading = heading;
        }
      }
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
/** The deck list follows the pool's sort, so a Character's versions sit together there too. */
function deckRowOrder(a, b) {
  if (sort === 'character') {
    const an = characterOf(a) || '￿';
    const bn = characterOf(b) || '￿';
    if (an !== bn) return an.localeCompare(bn);
  }
  return (a.cost || 0) - (b.cost || 0) || a.name.localeCompare(b.name);
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
  const { total, chars, events, buildings } = counts();
  const problems = deckProblems(ctx.rules, ctx.set, ctx.list);
  // Advice sits beside the rules, not among them: a thin deck is legal, and the Workshop says so
  // plainly rather than refusing to build it.
  const warnings = deckWarnings(ctx.rules, ctx.set, ctx.list);
  host.innerHTML = '';

  const nameInput = h('input', { type: 'text', id: 'dbName', class: 'seed-input', value: ctx.name, maxlength: '40', placeholder: 'Name your deck' });
  nameInput.addEventListener('input', () => { ctx.name = nameInput.value; });

  const head = h('div', { class: 'db-head' }, [
    h('div', { class: 'db-head-main' }, [
      h('h2', {}, 'The Deck Workshop'),
      h('p', { class: 'db-sub' }, `Build a town deck of ${dr.minDeckSize} to ${dr.maxDeckSize} cards from any Characters, Events and Town Buildings in the book. There is no floor on animals and no ceiling on Events — the deck is yours to get wrong — and copies are capped by rarity: ${RARITIES.map((r) => `${r} ${dr.copiesByRarity[r]}`).join(', ')}.`),
    ]),
    h('div', { class: 'db-head-side' }, [
      h('label', { class: 'menu-label', for: 'dbName' }, 'Deck name'),
      nameInput,
    ]),
  ]);

  const counter = h('div', { class: `db-counter${problems.length ? '' : ' ok'}` }, [
    h('div', { class: 'db-big' }, `${total} / ${dr.minDeckSize}–${dr.maxDeckSize}`),
    h('div', { class: 'db-counter-sub' }, `${chars} Characters · ${events} Events${buildings ? ` · ${buildings} Town Buildings` : ''}`),
    problems.length
      ? h('ul', { class: 'db-problems' }, problems.map((t) => h('li', {}, t)))
      : h('div', { class: 'db-ok' }, 'This deck is ready to play.'),
    warnings.length ? h('ul', { class: 'db-warnings' }, warnings.map((t) => h('li', {}, t))) : null,
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
    h('div', { class: 'db-left page' }, [buildShelfBar(), section === 'printed' ? starters : null, buildFilters(), buildPool()]),
    h('div', { class: 'db-right page' }, [counter, buildDeckList(), actions]),
  ]));
}

/**
 * Open the builder in `hostEl`.
 * @param opts { rules, set, makerSet?, deck?, onSave(deck), onCancel() }
 */
export function openDeckBuilder(hostEl, opts) {
  host = hostEl;
  const makerSet = opts.makerSet || { setId: 'AF-MAKER-01', name: 'Maker Cards', cards: [] };
  // Card previews look cards up by id, so the preview index carries both shelves: a Maker card is
  // read on hover exactly like a printed one. Printed ids win — nothing here changes the game.
  const printedById = opts.set.cardsById || Object.fromEntries(opts.set.cards.map((c) => [c.id, c]));
  setPreviewContext(opts.rules, {
    ...opts.set,
    cardsById: { ...Object.fromEntries((makerSet.cards || []).map((c) => [c.id, c])), ...printedById },
  });
  ctx = {
    rules: opts.rules,
    set: opts.set,
    makerSet,
    marks: loadRemade(),
    makerIndex: makerRemakesIndex(makerSet),
    id: (opts.deck && opts.deck.id) || `custom-${Date.now().toString(36)}`,
    name: (opts.deck && opts.deck.name) || 'My Town',
    list: { ...((opts.deck && opts.deck.list) || {}) },
    onSave: opts.onSave,
    onCancel: opts.onCancel,
  };
  filter = { type: 'all', species: null, study: null, rarity: null, remade: 'any' };
  sort = 'power';
  section = 'printed';
  render();
}
