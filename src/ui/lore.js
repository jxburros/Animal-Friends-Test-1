// The Lore Directory: the tale of the First Boroughs, the animals who live there, and the places
// they argue over — with every card each of them prints on.
//
// The Directory reads and changes nothing. It is handed the rules, the indexed collection, the raw
// shelf (for the character backstories), the Mayor whose collection is being read, and the lore
// text from spec/lore.json, and it renders three areas — Story, Characters, Settings — plus the
// pop-out modals they link to. A character link anywhere in the game (the Book included) opens
// `openCharacterModal(name)`; a place opens `openPlaceModal('capital:<id>')`; a chapter opens
// `openStoryModal(id)`.
//
// Nothing here knows how lore is earned. Every entry is passed through `isLoreUnlocked` before it
// is listed, linked or opened, so the day spec/lore.json starts carrying real `unlock` conditions
// the Directory locks itself with no further change: a locked entry becomes a darkened "?" with
// its kicker and nothing else — the story is what is still worth opening a pack for.
//
//   initLore({ rules, set, shelf, profile, lore })   remember the collection and the lore text
//   openLore(hostEl, { onClose, onBook })            render the Lore Directory screen into hostEl
//   openCharacterModal(name)                         pop out one character
//   openPlaceModal(ref)                              pop out one place: 'capital:<id>' | 'boroughs:<id>'
//   openStoryModal(id)                               pop out one story or history section by id
//   closeLore()                                      close whatever the Directory has open
//   isLoreUnlocked(entry, profile) / loreProgress(profile) / loreCounts() / emptyLore()
import {
  buildCardFace, setPreviewContext, raritySlug, openCardReader, effectText,
} from './render.js';
import { iconSVG } from './art.js';
import { characterOf, sortVersions, isCharacterCard } from '../engine/characters.js';
import { ownedCopies } from '../engine/profile.js';

let ctx = null; // { rules, set, shelf, profile, lore }
let host = null;
let onCloseFn = null;
let onBookFn = null;
let tab = 'story'; // 'story' | 'characters' | 'settings'
let search = '';
let speciesFilter = null;
let studyFilter = null;
let openDialog = null; // the one modal on screen, if any

const TABS = [
  ['story', 'Story', 'story'],
  ['characters', 'Characters', 'character'],
  ['settings', 'Settings', 'place'],
];

// ---------- little builders (the same shape the Book and the Mayors screen use) ----------
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
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}
function icon(name) { return h('i', { class: 'ico', html: iconSVG(name) }); }
function iconButton(name, label, onClick, extra = '') {
  return h('button', {
    type: 'button', class: `lore-icon-btn${extra ? ` ${extra}` : ''}`, title: label, 'aria-label': label,
    html: iconSVG(name), onclick: onClick,
  });
}
function chip(label, active, onClick, iconName, extra = {}) {
  return h('button', { class: `db-chip${active ? ' on' : ''}`, type: 'button', onclick: onClick, ...extra },
    iconName ? [icon(iconName), label] : [label]);
}
function paragraphs(list, cls = '') {
  return (Array.isArray(list) ? list : String(list || '').split('\n\n'))
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .map((p) => h('p', cls ? { class: cls } : {}, p));
}
/** The first sentence of a block of text — what a row in a list of chapters shows. */
function firstSentence(text) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  if (!flat) return '';
  const cut = flat.match(/^.{20,180}?[.!?](\s|$)/);
  return (cut ? cut[0] : flat.slice(0, 180)).trim();
}
function arr(v) { return Array.isArray(v) ? v : []; }

// ---------- the lore text ----------

/** The shape of spec/lore.json with nothing in it: what a failed fetch falls back to. */
export function emptyLore() {
  return {
    story: { title: 'The First Boroughs', tagline: '', sections: [] },
    settings: {
      capital: { id: 'capital', name: 'Capital City', tagline: '', history: [], places: [] },
      boroughs: { id: 'boroughs', name: 'The Boroughs', tagline: '', history: [], places: [] },
    },
    relationships: [],
    characterNotes: {},
    unlockRules: { default: 'open' },
  };
}

function sideOf(raw, fallback) {
  const s = (raw && typeof raw === 'object') ? raw : {};
  return {
    ...fallback, ...s,
    name: s.name || fallback.name,
    id: s.id || fallback.id,
    history: arr(s.history),
    places: arr(s.places),
  };
}

/** The lore, read defensively: the file is written by another hand and may be half-finished. */
function lore() {
  const base = emptyLore();
  const raw = (ctx && ctx.lore && typeof ctx.lore === 'object') ? ctx.lore : null;
  if (!raw) return base;
  const story = (raw.story && typeof raw.story === 'object') ? raw.story : {};
  return {
    ...base,
    ...raw,
    story: { ...base.story, ...story, sections: arr(story.sections) },
    settings: {
      capital: sideOf(raw.settings && raw.settings.capital, base.settings.capital),
      boroughs: sideOf(raw.settings && raw.settings.boroughs, base.settings.boroughs),
    },
    relationships: arr(raw.relationships),
    characterNotes: (raw.characterNotes && typeof raw.characterNotes === 'object') ? raw.characterNotes : {},
  };
}

const SIDE_KEYS = ['capital', 'boroughs'];
function sideName(key) { return lore().settings[key] ? lore().settings[key].name : key; }

/** Every gated thing in the book, with the kicker its locked stand-in shows. */
function allEntries() {
  const L = lore();
  const out = [];
  for (const s of L.story.sections) out.push({ entry: s, kind: 'story', kicker: 'A chapter of the story' });
  for (const key of SIDE_KEYS) {
    const side = L.settings[key];
    for (const s of side.history) out.push({ entry: s, kind: 'history', side: key, kicker: `A page of ${side.name}’s history` });
    for (const p of side.places) out.push({ entry: p, kind: 'place', side: key, kicker: `A place in ${side.name}` });
  }
  for (const r of L.relationships) out.push({ entry: r, kind: 'relationship', kicker: 'A connection between friends' });
  return out;
}

function findSection(id) {
  if (!id) return null;
  return allEntries().find((e) => (e.kind === 'story' || e.kind === 'history') && e.entry && e.entry.id === id) || null;
}
function placeRef(sideKey, place) { return `${sideKey}:${place && place.id}`; }
function findPlace(ref) {
  const text = String(ref || '');
  const at = text.indexOf(':');
  if (at < 0) return null;
  const sideKey = text.slice(0, at);
  const id = text.slice(at + 1);
  const side = lore().settings[sideKey];
  if (!side) return null;
  const place = side.places.find((p) => p && p.id === id);
  return place ? { place, sideKey, side } : null;
}

// ---------- what a Mayor has found ----------

/**
 * Is this piece of lore revealed to this Mayor?
 *   no `unlock` at all          → open, the way everything is open today
 *   `{ anyOf: [cardId, …] }`    → revealed once they own any one of those cards
 *   `{ allOf: [cardId, …] }`    → revealed once they own all of them
 * No Mayor (the Book opened without one) and the sandbox Mayor see everything.
 */
export function isLoreUnlocked(entry, profile = ctx ? ctx.profile : null) {
  const unlock = entry && typeof entry === 'object' ? entry.unlock : null;
  if (!unlock || typeof unlock !== 'object') return true;
  if (!profile || profile.sandbox) return true;
  const anyOf = Array.isArray(unlock.anyOf) ? unlock.anyOf : null;
  const allOf = Array.isArray(unlock.allOf) ? unlock.allOf : null;
  if (anyOf) return anyOf.length === 0 || anyOf.some((id) => ownedCopies(profile, id) > 0);
  if (allOf) return allOf.length === 0 || allOf.every((id) => ownedCopies(profile, id) > 0);
  return true;
}
/**
 * Is this character's story revealed to this Mayor? Backstories live on the card set rather than in
 * lore.json, so they are gated by one rule for all of them: `unlockRules.characters` is 'open' (the
 * default — every backstory can be read) or 'anyCard' (a character's story opens with the first of
 * their cards the Mayor owns, which is what the Book used to do). No Mayor, or the sandbox, sees all.
 */
export function isCharacterUnlocked(name, profile = ctx ? ctx.profile : null) {
  if (!profile || profile.sandbox) return true;
  const rule = (lore().unlockRules || {}).characters || 'open';
  if (rule !== 'anyCard') return true;
  return cardsOf(name).some((c) => ownedCopies(profile, c.id) > 0);
}
/** Is this entry gated at all? An entry with no `unlock` is not counted as progress. */
function isGated(entry) {
  const unlock = entry && typeof entry === 'object' ? entry.unlock : null;
  return !!(unlock && typeof unlock === 'object' && (Array.isArray(unlock.anyOf) || Array.isArray(unlock.allOf)));
}

/** How much of the gated lore this Mayor has found. `total` counts only entries that are gated. */
export function loreProgress(profile = ctx ? ctx.profile : null) {
  let unlocked = 0;
  let total = 0;
  for (const { entry } of allEntries()) {
    if (!isGated(entry)) continue;
    total += 1;
    if (isLoreUnlocked(entry, profile)) unlocked += 1;
  }
  return { unlocked, total };
}

/** What the Directory holds, for the door on the cover. */
export function loreCounts() {
  const L = lore();
  const characters = arr(ctx && ctx.shelf && ctx.shelf.characters).length || characterNames().length;
  const places = SIDE_KEYS.reduce((n, k) => n + L.settings[k].places.length, 0);
  const chapters = L.story.sections.length + SIDE_KEYS.reduce((n, k) => n + L.settings[k].history.length, 0);
  return { characters, places, chapters };
}

// ---------- the collection ----------
function cards() { return arr(ctx && ctx.set && ctx.set.cards); }
function cardById(id) {
  if (!id || !ctx || !ctx.set) return null;
  if (ctx.set.cardsById && ctx.set.cardsById[id]) return ctx.set.cardsById[id];
  return cards().find((c) => c.id === id) || null;
}
/** Every card that belongs to a character: their own printings, and the Events that name them. */
function cardsOf(name) {
  return sortVersions(cards().filter((c) => characterOf(c) === name));
}
function characterNames() {
  return [...new Set(cards().map(characterOf).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
function shelfEntry(name) {
  return arr(ctx && ctx.shelf && ctx.shelf.characters).find((c) => c && c.name === name) || null;
}
/** Everyone the Directory lists: the written cast, and anyone printed who is somehow missing from it. */
function cast() {
  const entries = new Map();
  for (const e of arr(ctx && ctx.shelf && ctx.shelf.characters)) if (e && e.name) entries.set(e.name, e);
  for (const name of characterNames()) if (!entries.has(name)) entries.set(name, { name, studies: [] });
  return [...entries.values()].sort((a, b) => a.name.localeCompare(b.name));
}
/** A character's species and studies, from the shelf where it is written and the cards where it is not. */
function traitsOf(entry) {
  const mine = cardsOf(entry.name);
  const species = entry.species || (mine.find((c) => c.species) || {}).species || null;
  const studies = arr(entry.studies).length
    ? arr(entry.studies)
    : [...new Set(mine.map((c) => c.study).filter(Boolean))];
  return { species, studies };
}
function ownsCard(id) { return !ctx || !ctx.profile || ownedCopies(ctx.profile, id) > 0; }

function preview() {
  if (ctx && ctx.rules && ctx.set) setPreviewContext(ctx.rules, ctx.set);
}

// ---------- the API ----------

export function initLore(next) { ctx = { ...(ctx || {}), ...next }; }
export function loreContext() { return ctx; }

/** Close whatever the Directory has open. The screen itself is closed by its own button. */
export function closeLore() {
  if (openDialog && openDialog.open) openDialog.close();
  openDialog = null;
}

// ---------- locked stand-ins ----------
function lockedTile(kicker) {
  const label = `${kicker} · not yet found`;
  return h('div', { class: 'lore-tile locked', title: label, 'aria-label': label }, [
    h('span', { class: 'lore-q', 'aria-hidden': 'true' }, '?'),
    h('span', { class: 'lore-tile-kicker' }, label),
  ]);
}
function lockedRow(kicker) {
  const label = `${kicker} · not yet found`;
  return h('div', { class: 'lore-row locked', title: label, 'aria-label': label }, [
    h('span', { class: 'lore-q', 'aria-hidden': 'true' }, '?'),
    h('span', { class: 'lore-row-kicker' }, label),
  ]);
}
function lockedChip(kicker) {
  const label = `${kicker} · not yet found`;
  return h('span', { class: 'db-chip lore-chip locked', title: label, 'aria-label': label }, [icon('locked'), '?']);
}
function lockedBlock(kicker) {
  const label = `${kicker} · not yet found`;
  return h('div', { class: 'lore-block locked', title: label }, [
    h('span', { class: 'lore-q', 'aria-hidden': 'true' }, '?'),
    h('p', { class: 'lore-block-kicker' }, label),
  ]);
}

// ---------- one card, as the Directory shows it ----------
/**
 * A card face with its caption, and — when the reader owns it — the rules and flavor printed on it.
 * A card that is not in the collection is a darkened "?" with its rarity: the Book's locked slot,
 * so a locked card keeps its story here too.
 */
function cardBlock(def, { withText = false } = {}) {
  if (!def) return null;
  const owned = ownsCard(def.id);
  const fig = h('figure', { class: `lore-card${owned ? '' : ' locked'}` });
  if (owned) {
    const btn = h('button', {
      type: 'button', class: 'lore-card-btn', title: `Read ${def.name}`, 'aria-label': `Read ${def.name}`,
      onclick: () => openCardReader(def),
    });
    btn.appendChild(buildCardFace(def, { large: false, interactive: false }));
    fig.appendChild(h('div', { class: 'card-slot' }, [btn]));
  } else {
    fig.appendChild(h('div', { class: 'card-slot locked', title: 'Not in your collection yet' }, [
      h('span', { class: 'lore-q', 'aria-hidden': 'true' }, '?'),
      h('span', { class: 'locked-flag' }, 'Locked'),
    ]));
  }
  // The caption and the printed text live in one column beside the card, so a card with rules
  // reads as an entry rather than as a caption that has come adrift from its picture.
  const text = h('div', { class: 'lore-card-text' });
  const cap = h('figcaption', {}, owned
    ? [
      h('span', { class: 'db-row-cost' }, String(def.cost ?? 0)),
      h('span', { class: 'lore-card-name' }, def.type === 'character' && def.title ? `${def.name}, ${def.title}` : def.name),
      h('span', { class: `rarity-tag rar-${raritySlug(def)}` }, def.rarity || 'Common'),
    ]
    : [h('span', { class: `rarity-tag rar-${raritySlug(def)}` }, def.rarity || 'Common')]);
  text.appendChild(cap);
  if (withText && owned) {
    if (effectText(def)) text.appendChild(h('p', { class: 'db-story-rules' }, effectText(def)));
    if (def.flavor) text.appendChild(h('p', { class: 'db-story-flavor' }, def.flavor));
  }
  fig.appendChild(text);
  return fig;
}

function cardRow(list, { withText = false } = {}) {
  const grid = h('div', { class: `lore-cards${withText ? ' with-text' : ''}` });
  for (const def of list) {
    const block = cardBlock(def, { withText });
    if (block) grid.appendChild(block);
  }
  return grid;
}

// ---------- link chips ----------
function characterChip(name) {
  const entry = shelfEntry(name) || { name, studies: [] };
  const { species } = traitsOf(entry);
  return h('button', {
    type: 'button', class: 'db-chip lore-chip', title: `Read about ${name}`, 'aria-label': `Read about ${name}`,
    onclick: () => openCharacterModal(name),
  }, [species ? icon(species) : icon('character'), name]);
}
function placeChip(ref) {
  const found = findPlace(ref);
  if (!found) return null;
  if (!isLoreUnlocked(found.place)) return lockedChip(`A place in ${found.side.name}`);
  return h('button', {
    type: 'button', class: 'db-chip lore-chip', title: `${found.place.name} — ${found.side.name}`,
    'aria-label': `${found.place.name}, in ${found.side.name}`,
    onclick: () => openPlaceModal(ref),
  }, [icon(found.sideKey === 'capital' ? 'capital' : 'borough'), found.place.name]);
}
function sectionChip(id) {
  const found = findSection(id);
  if (!found) return null;
  if (!isLoreUnlocked(found.entry)) return lockedChip(found.kicker);
  return h('button', {
    type: 'button', class: 'db-chip lore-chip', title: `Read “${found.entry.heading || id}”`,
    'aria-label': `Read ${found.entry.heading || id}`,
    onclick: () => openStoryModal(id),
  }, [icon(found.kind === 'history' ? 'history' : 'story'), found.entry.heading || id]);
}
function chipRow(label, chips) {
  const kept = chips.filter(Boolean);
  if (!kept.length) return null;
  return h('div', { class: 'db-chiprow lore-chiprow' }, [h('span', { class: 'db-chiplabel' }, label), ...kept]);
}

/**
 * The cards, characters and places a section or a place names. Every link is passed through the
 * unlock gate on the way out, so a cross-link to something unfound reads as a "?" like anything else.
 */
function linkRows(entry, body, { cardsLabel = 'On the cards' } = {}) {
  const cardList = arr(entry.cards).map(cardById).filter(Boolean);
  if (cardList.length) {
    body.appendChild(h('h3', { class: 'db-story-h3' }, cardsLabel));
    body.appendChild(cardRow(cardList));
  }
  const rows = [
    chipRow('Who is there:', arr(entry.characters).map(characterChip)),
    chipRow('Places:', arr(entry.places).map(placeChip)),
    chipRow('Chapters:', arr(entry.story).map(sectionChip)),
  ].filter(Boolean);
  if (rows.length) {
    body.appendChild(h('h3', { class: 'db-story-h3' }, 'Elsewhere in the book'));
    for (const r of rows) body.appendChild(r);
  }
}

// ---------- the modals ----------
/**
 * One pop-out. Modals open other modals — a character links to a place, a place back to a
 * character — and the one on screen is closed first so the reader is never buried under a stack.
 * `tabindex: -1` on the dialog: showModal() otherwise focuses the first control and scrolls a long
 * entry past its own heading before it is ever read.
 */
function openModal({ kicker, title, sub, aria }) {
  closeLore();
  preview();
  const previous = document.activeElement;
  const dialog = h('dialog', { class: 'db-story lore-modal', tabindex: '-1', 'aria-label': aria || title });
  const head = h('div', { class: 'db-story-head lore-modal-head' }, [
    h('div', { class: 'lore-modal-titles' }, [
      kicker ? h('p', { class: 'lore-kicker' }, kicker) : null,
      h('h2', {}, title),
      sub ? h('p', { class: 'db-story-sub' }, sub) : null,
    ]),
    iconButton('close', 'Close', () => dialog.close()),
  ]);
  const body = h('div', { class: 'db-story-body lore-modal-body' });
  dialog.append(head, body);
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (openDialog === dialog) openDialog = null;
    if (previous && previous.isConnected && typeof previous.focus === 'function') previous.focus();
  });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  document.body.appendChild(dialog);
  openDialog = dialog;
  dialog.showModal();
  dialog.scrollTop = 0;
  return body;
}

function openNothingModal(title, line) {
  const body = openModal({ title, kicker: 'The Lore Directory' });
  body.appendChild(h('p', { class: 'db-empty' }, line));
}

/**
 * One section of writing — a chapter of the story, or a page of a place's history.
 * `kicker` is what the heading is filed under; `lockedKicker` is what a reader who has not found it
 * is told instead, which says what kind of thing is missing without naming it.
 */
function openSectionModal(section, { kicker = 'The story', lockedKicker = 'A chapter of the story' } = {}) {
  if (!section) { openNothingModal('Not written yet', 'There is no chapter here yet.'); return; }
  if (!isLoreUnlocked(section)) {
    const body = openModal({ kicker, title: '?' });
    body.appendChild(lockedBlock(lockedKicker));
    return;
  }
  const body = openModal({ kicker, title: section.heading || 'The story', aria: section.heading });
  for (const p of paragraphs(section.paragraphs)) body.appendChild(p);
  linkRows(section, body);
}

/** One chapter, by its globally unique id. */
export function openStoryModal(id) {
  const found = findSection(id);
  if (!found) { openNothingModal('Not written yet', 'No chapter with that name is written yet.'); return; }
  const kicker = found.kind === 'history' ? `${sideName(found.side)} · history` : lore().story.title || 'The story';
  openSectionModal(found.entry, { kicker, lockedKicker: found.kicker });
}

/** One place: 'capital:<id>' or 'boroughs:<id>'. */
export function openPlaceModal(ref) {
  const found = findPlace(ref);
  if (!found) { openNothingModal('Not written yet', 'No place with that name is written yet.'); return; }
  const { place, side, sideKey } = found;
  if (!isLoreUnlocked(place)) {
    const body = openModal({ kicker: side.name, title: '?' });
    body.appendChild(lockedBlock(`A place in ${side.name}`));
    return;
  }
  const body = openModal({ kicker: side.name, title: place.name, sub: place.summary || '', aria: `${place.name}, in ${side.name}` });
  for (const p of paragraphs(place.paragraphs)) body.appendChild(p);
  // Anyone whose own notes point here counts as being here, even if the place does not name them.
  const named = new Set(arr(place.characters));
  for (const [name, note] of Object.entries(lore().characterNotes)) {
    if (arr(note && note.places).includes(placeRef(sideKey, place))) named.add(name);
  }
  // `place.places` are the places next door; linkRows draws them as the same chips as everywhere else.
  linkRows({ ...place, characters: [...named] }, body, { cardsLabel: 'On the cards' });
}

/** One character: their story, their cards, and everything they are tied to. */
export function openCharacterModal(name) {
  const entry = shelfEntry(name);
  const mine = cardsOf(name);
  if (!entry && !mine.length) {
    openNothingModal(name || 'Unknown', `No entry for ${name || 'that name'} is written yet.`);
    return;
  }
  const { species, studies } = traitsOf(entry || { name, studies: [] });
  const sub = [species, studies.join(' · '), entry && entry.pronouns].filter(Boolean).join(' — ');
  const body = openModal({ kicker: 'Characters', title: name, sub, aria: `The story of ${name}` });

  // A story still shut keeps everything but the name and the cards' outlines: that is the thing
  // still worth opening a pack for.
  if (!isCharacterUnlocked(name)) {
    body.appendChild(lockedRow(`${name}'s story · not yet found — own one of their cards to read it`));
    if (mine.length) {
      body.appendChild(h('h3', { class: 'db-story-h3' }, 'The cards'));
      body.appendChild(cardRow(mine, { withText: false }));
    }
    return;
  }

  if (entry && entry.backstory) for (const p of paragraphs(entry.backstory)) body.appendChild(p);
  else body.appendChild(h('p', { class: 'db-empty' }, 'No backstory written for this character yet.'));
  if (entry && entry.voice) body.appendChild(h('p', { class: 'db-story-note' }, [h('strong', {}, 'Voice. '), entry.voice]));
  if (entry && entry.arc) body.appendChild(h('p', { class: 'db-story-note' }, [h('strong', {}, 'The arc. '), entry.arc]));

  if (mine.length) {
    body.appendChild(h('h3', { class: 'db-story-h3' }, 'The cards'));
    body.appendChild(cardRow(mine, { withText: true }));
  }

  // Connections: every relationship this name is part of, and the way through to the others.
  const links = lore().relationships.filter((r) => arr(r.characters).includes(name));
  if (links.length) {
    body.appendChild(h('h3', { class: 'db-story-h3' }, 'Connections'));
    for (const rel of links) {
      if (!isLoreUnlocked(rel)) { body.appendChild(lockedRow('A connection between friends')); continue; }
      const others = arr(rel.characters).filter((n) => n !== name);
      body.appendChild(h('div', { class: 'lore-connection' }, [
        h('p', {}, rel.text || ''),
        h('div', { class: 'db-chiprow lore-chiprow' }, others.map(characterChip)),
      ]));
    }
  }

  // Where to find them: their own notes, plus any place that names them.
  const note = lore().characterNotes[name] || {};
  const refs = new Set(arr(note.places));
  for (const key of SIDE_KEYS) {
    for (const p of lore().settings[key].places) {
      if (arr(p.characters).includes(name)) refs.add(placeRef(key, p));
    }
  }
  const placeChips = [...refs].map(placeChip).filter(Boolean);
  if (placeChips.length) {
    body.appendChild(h('h3', { class: 'db-story-h3' }, 'Where to find them'));
    body.appendChild(h('div', { class: 'db-chiprow lore-chiprow' }, placeChips));
  }
  const storyChips = arr(note.story).map(sectionChip).filter(Boolean);
  if (storyChips.length) {
    body.appendChild(h('h3', { class: 'db-story-h3' }, 'In the story'));
    body.appendChild(h('div', { class: 'db-chiprow lore-chiprow' }, storyChips));
  }
}

// ---------- the screen ----------
function matchesSearch(hay) {
  if (!search) return true;
  return String(hay).toLowerCase().includes(search);
}

function storyArea() {
  const L = lore();
  const wrap = h('div', { class: 'lore-area' });
  const sections = L.story.sections;
  if (!sections.length) {
    wrap.appendChild(h('p', { class: 'db-empty' }, 'The story is not written yet.'));
    return wrap;
  }
  const [first, ...rest] = sections;
  const intro = h('section', { class: 'lore-intro' });
  if (isLoreUnlocked(first)) {
    intro.appendChild(h('h3', { class: 'lore-h3' }, first.heading || L.story.title || 'The story'));
    for (const p of paragraphs(first.paragraphs)) intro.appendChild(p);
    intro.appendChild(h('div', { class: 'lore-intro-foot' }, [
      h('button', {
        type: 'button', class: 'small', onclick: () => openStoryModal(first.id),
        title: `Open “${first.heading || 'the first chapter'}” on its own`,
      }, 'Read this on its own'),
    ]));
  } else {
    intro.appendChild(lockedBlock('A chapter of the story'));
  }
  wrap.appendChild(intro);

  // The first chapter is already read in full above, so a one-chapter story needs no list at all.
  if (!rest.length) return wrap;
  wrap.appendChild(h('h3', { class: 'lore-h3' }, 'The rest of the tale'));
  const list = h('div', { class: 'lore-rows' });
  for (const s of rest) {
    if (!isLoreUnlocked(s)) { list.appendChild(lockedRow('A chapter of the story')); continue; }
    list.appendChild(h('button', {
      type: 'button', class: 'lore-row', onclick: () => openStoryModal(s.id),
      title: `Read “${s.heading || 'this chapter'}”`,
    }, [
      h('span', { class: 'lore-row-icon', html: iconSVG('story') }),
      h('span', { class: 'lore-row-text' }, [
        h('span', { class: 'lore-row-head' }, s.heading || 'A chapter'),
        h('span', { class: 'lore-row-sub' }, firstSentence(arr(s.paragraphs)[0])),
      ]),
    ]));
  }
  wrap.appendChild(list);
  return wrap;
}

function charactersArea() {
  const wrap = h('div', { class: 'lore-area' });
  const everyone = cast();
  const species = [...new Set(everyone.map((e) => traitsOf(e).species).filter(Boolean))].sort();
  const studies = [...new Set(everyone.flatMap((e) => traitsOf(e).studies))].sort();

  wrap.appendChild(h('div', { class: 'db-chiprow lore-chiprow' }, [
    chip('Any species', !speciesFilter, () => { speciesFilter = null; render(); }, 'any',
      { title: 'Every species', 'aria-label': 'Every species' }),
    ...species.map((sp) => chip(sp, speciesFilter === sp, () => {
      speciesFilter = speciesFilter === sp ? null : sp; render();
    }, sp, { title: sp, 'aria-label': sp })),
  ]));
  wrap.appendChild(h('div', { class: 'db-chiprow lore-chiprow' }, [
    chip('Any study', !studyFilter, () => { studyFilter = null; render(); }, 'any',
      { title: 'Every study', 'aria-label': 'Every study' }),
    ...studies.map((st) => chip(st, studyFilter === st, () => {
      studyFilter = studyFilter === st ? null : st; render();
    }, st, { title: st, 'aria-label': st })),
  ]));

  const found = everyone.filter((e) => {
    const { species: sp, studies: sts } = traitsOf(e);
    if (speciesFilter && sp !== speciesFilter) return false;
    if (studyFilter && !sts.includes(studyFilter)) return false;
    return matchesSearch(`${e.name} ${sp || ''} ${sts.join(' ')} ${e.backstory || ''} ${e.voice || ''}`);
  });
  wrap.appendChild(h('p', { class: 'lore-count' }, found.length
    ? `${found.length} of ${everyone.length} character${everyone.length === 1 ? '' : 's'}`
    : 'Nobody here goes by that.'));

  const grid = h('div', { class: 'lore-grid characters' });
  for (const e of found) {
    const { species: sp, studies: sts } = traitsOf(e);
    const mine = cardsOf(e.name);
    // A portrait is one of their own printings where there is one — a City Hire counts, an Event
    // that merely names them does not, because that card is not a picture of them.
    // ...and it is drawn only from cards the Mayor owns: the Book hides an unearned card behind a
    // question mark, and the cast list must not hand its rules out through the back door.
    const owned = mine.filter((c) => ownsCard(c.id));
    const portrait = owned.find(isCharacterCard) || owned[0] || null;
    const unlocked = isCharacterUnlocked(e.name);
    const tile = h('button', {
      type: 'button', class: 'lore-tile character', title: `Read about ${e.name}`,
      'aria-label': `Read about ${e.name}`,
      onclick: () => openCharacterModal(e.name),
    });
    const frame = h('div', { class: `lore-portrait${portrait && unlocked ? '' : ' locked'}` });
    if (portrait && unlocked) frame.appendChild(buildCardFace(portrait, { large: false, interactive: false }));
    else frame.appendChild(h('span', { class: 'lore-q', 'aria-hidden': 'true' }, '?'));
    if (!unlocked) tile.classList.add('story-locked');
    tile.appendChild(frame);
    tile.appendChild(h('span', { class: 'lore-tile-name' }, e.name));
    const tags = h('span', { class: 'lore-tile-tags db-row-tags' });
    if (sp) tags.appendChild(h('span', { class: 'lore-tag', title: sp, 'aria-label': sp }, [icon(sp)]));
    for (const st of sts) tags.appendChild(h('span', { class: 'lore-tag', title: st, 'aria-label': st }, [icon(st)]));
    tile.appendChild(tags);
    tile.appendChild(h('span', { class: 'lore-tile-stat' }, `${mine.length} card${mine.length === 1 ? '' : 's'}`));
    grid.appendChild(tile);
  }
  wrap.appendChild(grid);
  return wrap;
}

/** What a place tile says about itself under its name: its cards, or who is there, or nothing. */
function placeStat(place, linked) {
  const names = arr(place.characters).length;
  if (linked) return h('span', { class: 'lore-tile-stat' }, `${linked} card${linked === 1 ? '' : 's'}`);
  if (names) return h('span', { class: 'lore-tile-stat' }, `${names} name${names === 1 ? '' : 's'}`);
  return null;
}

function settingSection(sideKey) {
  const side = lore().settings[sideKey];
  const box = h('section', { class: `lore-setting ${sideKey}` });
  box.appendChild(h('div', { class: 'lore-setting-head' }, [
    h('span', { class: 'lore-setting-icon', html: iconSVG(sideKey === 'capital' ? 'capital' : 'borough') }),
    h('div', {}, [
      h('h3', { class: 'lore-h2' }, side.name),
      side.tagline ? h('p', { class: 'db-sub' }, side.tagline) : null,
    ]),
  ]));

  if (side.history.length) {
    box.appendChild(h('h4', { class: 'lore-h3' }, 'History'));
    for (const s of side.history) {
      if (!isLoreUnlocked(s)) { box.appendChild(lockedBlock(`A page of ${side.name}’s history`)); continue; }
      const block = h('article', { class: 'lore-block' });
      block.appendChild(h('button', {
        type: 'button', class: 'lore-block-head', title: `Open “${s.heading || 'this page'}” on its own`,
        onclick: () => openSectionModal(s, { kicker: `${side.name} · history`, lockedKicker: `A page of ${side.name}\u2019s history` }),
      }, [h('span', {}, s.heading || 'A page of history'), h('span', { class: 'lore-block-open', html: iconSVG('link') })]));
      for (const p of paragraphs(s.paragraphs)) block.appendChild(p);
      box.appendChild(block);
    }
  }

  box.appendChild(h('h4', { class: 'lore-h3' }, 'Notable places'));
  const found = side.places.filter((p) => matchesSearch(`${p.name || ''} ${p.summary || ''} ${arr(p.paragraphs).join(' ')} ${arr(p.characters).join(' ')}`));
  if (!found.length) {
    box.appendChild(h('p', { class: 'db-empty' }, side.places.length ? 'No place here goes by that.' : 'No places are written here yet.'));
    return box;
  }
  const grid = h('div', { class: 'lore-grid places' });
  for (const place of found) {
    if (!isLoreUnlocked(place)) { grid.appendChild(lockedTile(`A place in ${side.name}`)); continue; }
    const linked = arr(place.cards).map(cardById).filter(Boolean).length;
    grid.appendChild(h('button', {
      type: 'button', class: 'lore-tile place', title: `Read about ${place.name}`,
      'aria-label': `Read about ${place.name}, in ${side.name}`,
      onclick: () => openPlaceModal(placeRef(sideKey, place)),
    }, [
      h('span', { class: 'lore-tile-icon', html: iconSVG('place') }),
      h('span', { class: 'lore-tile-name' }, place.name || 'A place'),
      h('span', { class: 'lore-tile-sub' }, place.summary || firstSentence(arr(place.paragraphs)[0])),
      placeStat(place, linked),
    ]));
  }
  box.appendChild(grid);
  return box;
}

function settingsArea() {
  const wrap = h('div', { class: 'lore-area' });
  for (const key of SIDE_KEYS) wrap.appendChild(settingSection(key));
  return wrap;
}

function render({ keepFocus = false } = {}) {
  if (!host) return;
  const L = lore();
  host.innerHTML = '';

  const spread = h('div', { class: 'lore-spread' });
  const leftPage = h('section', { class: 'lore-page lore-page-left', 'aria-label': 'Lore directory navigation' });
  const rightPage = h('section', { class: 'lore-page lore-page-right' });

  const progress = loreProgress();
  const head = h('header', { class: 'lore-head' }, [
    h('div', { class: 'lore-head-text' }, [
      h('h2', {}, 'The Lore Directory'),
      h('p', { class: 'db-sub' }, L.story.tagline || 'The tale of the First Boroughs, the animals who live in them, and the places they are argued over in.'),
      progress.total
        ? h('p', { class: 'lore-progress' }, `${progress.unlocked} of ${progress.total} entries found`)
        : null,
    ]),
    h('div', { class: 'lore-head-tools' }, [
      onBookFn ? h('button', { type: 'button', class: 'small', onclick: () => onBookFn() }, 'The Book') : null,
      iconButton('close', 'Close the Lore Directory', () => { closeLore(); if (onCloseFn) onCloseFn(); }, 'lore-close'),
    ]),
  ]);
  leftPage.appendChild(head);

  const strip = h('div', { class: 'lore-tabs help-tabs', role: 'tablist', 'aria-label': 'The Lore Directory' });
  for (const [key, label, iconName] of TABS) {
    strip.appendChild(h('button', {
      type: 'button', class: `help-tab lore-tab${tab === key ? ' on' : ''}`, role: 'tab',
      'aria-selected': tab === key ? 'true' : 'false', 'aria-controls': 'loreBody',
      onclick: () => { tab = key; render(); },
    }, [icon(iconName), label]));
  }
  leftPage.appendChild(strip);

  if (tab !== 'story') {
    const box = h('div', { class: 'lore-searchrow' });
    const input = h('input', {
      type: 'search', class: 'seed-input lore-search', value: search,
      placeholder: tab === 'characters' ? 'Search by name, species or study' : 'Search the places',
      'aria-label': tab === 'characters' ? 'Search the characters' : 'Search the places',
    });
    input.addEventListener('input', () => { search = input.value.trim().toLowerCase(); render({ keepFocus: true }); });
    box.appendChild(h('span', { class: 'lore-search-icon', html: iconSVG('search'), 'aria-hidden': 'true' }));
    box.appendChild(input);
    leftPage.appendChild(box);
  }

  const body = h('div', { class: 'lore-body', id: 'loreBody', role: 'tabpanel' });
  body.appendChild(tab === 'story' ? storyArea() : tab === 'characters' ? charactersArea() : settingsArea());
  rightPage.appendChild(body);
  spread.append(leftPage, rightPage);
  host.appendChild(spread);

  if (keepFocus) {
    const el = host.querySelector('.lore-search');
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }
}

/**
 * Open the Lore Directory in `hostEl`.
 * @param opts { onClose(), onBook?() } — the close button and, optionally, a way through to the Book.
 */
export function openLore(hostEl, { onClose, onBook } = {}) {
  host = hostEl;
  onCloseFn = onClose || null;
  onBookFn = onBook || null;
  preview();
  tab = 'story';
  search = '';
  speciesFilter = null;
  studyFilter = null;
  render();
}
