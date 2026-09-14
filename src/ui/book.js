// The Book: a gallery of every card in the game, Classic and Maker alike, in every printing it
// exists in.
//
// The Book plays nothing and changes nothing. It reads the two collections, shows each card's face
// at reading size, and lets a card be turned over to any printing it has — Regular, Alternate Art,
// Foil, Alternate Art Foil, Creative Foil or Full Card Art. A printing the card has not been given
// yet is still shown, greyed, so the shelf says plainly what exists and what is still to come.
import { buildCardFace, setPreviewContext, raritySlug } from './render.js';
import { iconSVG } from './art.js';
import { VERSIONS, versionsOf, hasVersion, defaultVersionKey } from './versions.js';
import { characterOf } from '../engine/characters.js';
import {
  loadRemade, setRemade, makerRemakesIndex, remadeStatus, remadeProgress, downloadRemade,
} from './remade.js';

const PAGE = 48;

let host = null;
let ctx = null; // { rules, shelves: [{id,name,set,cards}], makerSet, marks, makerIndex, onClose }
let filter = { shelf: 'all', type: 'all', species: null, study: null, rarity: null, version: 'any', text: '' };
let shown = PAGE;
const chosenVersion = new Map(); // cardId -> version key the reader has turned it to

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
function icon(name) { return h('i', { class: 'ico', html: iconSVG(name) }); }
function chip(label, active, onClick, iconName, extra = {}) {
  return h('button', { class: `db-chip${active ? ' on' : ''}`, type: 'button', onclick: onClick, ...extra },
    iconName ? [icon(iconName), label] : [label]);
}

/**
 * Every card the Book holds, each tagged with the shelf it was read from. A card the Maker shelf has
 * borrowed is the same card the printed book already showed, so it appears once here, under the
 * shelf it was printed in; the Maker shelf still shows its own copy when that shelf is chosen.
 */
function allEntries() {
  const seen = new Set();
  const out = [];
  for (const shelf of ctx.shelves) {
    for (const card of shelf.cards) {
      if (seen.has(card.id)) continue;
      seen.add(card.id);
      out.push({ card, shelf });
    }
  }
  return out;
}
function shelfEntries() {
  if (filter.shelf === 'all') return allEntries();
  const shelf = ctx.shelves.find((s) => s.id === filter.shelf);
  return shelf ? shelf.cards.map((card) => ({ card, shelf })) : [];
}

const TYPE_LABELS = [
  ['all', 'Everything'], ['character', 'Characters'], ['event', 'Events'],
  ['townBuilding', 'Town Buildings'], ['building', 'City Buildings'], ['marketCharacter', 'City Hires'],
  ['market', 'City Cards'], ['statue', 'Statues'], ['disruption', 'Disruptions'],
  ['ordinance', 'Ordinances'], ['token', 'Tokens'],
];

function matches(card) {
  if (filter.type !== 'all' && card.type !== filter.type) return false;
  if (filter.species && card.species !== filter.species) return false;
  if (filter.study && card.study !== filter.study) return false;
  if (filter.rarity && (card.rarity || 'Common') !== filter.rarity) return false;
  if (filter.version !== 'any' && !hasVersion(card, filter.version)) return false;
  if (filter.text) {
    const hay = `${card.name} ${card.title || ''} ${card.text || ''} ${card.flavor || ''}`.toLowerCase();
    if (!hay.includes(filter.text)) return false;
  }
  return true;
}

function results() {
  return shelfEntries().filter((e) => matches(e.card))
    .sort((a, b) => (a.card.type || '').localeCompare(b.card.type || '')
      || a.card.name.localeCompare(b.card.name)
      || (a.card.cost || 0) - (b.card.cost || 0));
}

function listOf(key) {
  const out = new Set();
  for (const shelf of ctx.shelves) for (const v of shelf.set[key] || []) out.add(v);
  return [...out];
}

// ---------- the rebuild, card by card ----------
// The Book is where the two collections are read side by side, so it is also where the slow rebuild
// is tracked: a printed card is ticked off once a Maker card replaces it. A Maker card's `remakes`
// link does that by itself and cannot be unticked here; a hand tick is this browser's own note.
function statusOf(cardId) {
  return remadeStatus(ctx.marks, ctx.makerIndex, cardId);
}
function toggleRemade(def) {
  const status = statusOf(def.id);
  if (status && status.by === 'maker') return; // a Maker card owns this tick
  ctx.marks = setRemade(ctx.marks, def, !status);
  render();
}

/** Is this card one of the printed ones the rebuild is working through? */
function isPrinted(entry) {
  return entry.shelf.id === 'classic';
}

function characterEntry(name) {
  return ((ctx.makerSet && ctx.makerSet.characters) || []).find((c) => c.name === name) || null;
}

/**
 * The story panel: a remade character's backstory beside the flavor of every version of them. Card
 * faces clip long flavor and a backstory has nowhere to live on a card at all — this is where the
 * writing the cards came out of is actually read.
 */
function openStory(def) {
  const entry = characterEntry(def.name);
  // A town card belongs to nobody: a Building is not somebody's backstory. Rather than apologise for
  // a character entry it was never going to have, it tells its own story.
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
  if (entry && entry.renamedFrom) head.appendChild(h('p', { class: 'db-story-renamed' }, `Remade from ${entry.renamedFrom}.`));
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

/** The line under a card that says where it stands in the rebuild, if anywhere. */
function rebuildNote(entry) {
  const { card } = entry;
  if (isPrinted(entry)) {
    const status = statusOf(card.id);
    const byMaker = status && status.by === 'maker';
    return h('button', {
      class: `db-remade${status ? ' on' : ''}`,
      type: 'button',
      disabled: byMaker,
      title: byMaker
        ? `Remade as the Maker card ${status.makerCard.name} (${status.makerCard.id}) — the link lives in spec/maker_card_set.json`
        : `Tick ${card.name} (${card.id}) off once it has been remade`,
      onclick: (e) => { e.stopPropagation(); toggleRemade(card); },
    }, status ? `✓ Remade${byMaker ? ' (maker card)' : ''}` : 'Mark remade');
  }
  const remakes = [].concat(card.remakes || []);
  if (remakes.length) {
    const printed = ctx.shelves.find((sh) => sh.id === 'classic');
    const byId = printed ? Object.fromEntries(printed.cards.map((c) => [c.id, c])) : {};
    return h('div', { class: 'db-maker-note' },
      `Remakes ${remakes.map((id) => (byId[id] ? `${byId[id].name} (${id})` : id)).join(', ')}`);
  }
  if (card.addition) {
    return h('div', { class: 'db-maker-note added', title: card.addedBecause || '' },
      `Added — replaces nothing${card.addedBecause ? `: ${card.addedBecause}` : ''}`);
  }
  return null;
}

// ---------- one card on the shelf ----------
function buildEntry({ card, shelf }) {
  const chosen = chosenVersion.get(card.id) || defaultVersionKey(card);
  const have = new Set(versionsOf(card).map((v) => v.key));
  const fig = h('figure', { class: 'book-card' });
  fig.appendChild(buildCardFace(card, { large: true, interactive: true, version: chosen }));
  const cap = h('figcaption', {}, [
    h('span', { class: `rarity-tag rar-${raritySlug(card)}` }, card.rarity || 'Common'),
    h('span', { class: 'book-shelf-tag' }, shelf.name),
    card.borrowed ? h('span', { class: 'book-borrowed', title: `Borrowed from ${ctx.shelves[0].name} — the Maker shelf has no card of its own for this yet` }, 'borrowed') : null,
  ]);
  fig.appendChild(cap);
  const row = h('div', { class: 'version-row' });
  for (const v of VERSIONS) {
    const exists = have.has(v.key);
    row.appendChild(h('button', {
      class: `version-chip${chosen === v.key ? ' on' : ''}`,
      type: 'button',
      disabled: !exists,
      title: exists ? `${v.name} — ${v.blurb}` : `${v.name}: not printed yet for ${card.name}`,
      onclick: () => { chosenVersion.set(card.id, v.key); render(); },
    }, v.short));
  }
  fig.appendChild(row);
  const note = rebuildNote({ card, shelf });
  if (note) fig.appendChild(note);
  if (!isPrinted({ card, shelf })) {
    fig.appendChild(h('button', {
      class: 'small', type: 'button',
      title: `Read ${card.name}'s backstory and the full flavor of every version`,
      onclick: (e) => { e.stopPropagation(); openStory(card); },
    }, 'Story'));
  }
  return fig;
}

// ---------- the screen ----------
function buildFilters() {
  const bar = h('div', { class: 'db-filters' });

  const search = h('input', {
    type: 'search', class: 'seed-input book-search', placeholder: 'Search names and rules text', value: filter.text,
  });
  search.addEventListener('input', () => { filter.text = search.value.trim().toLowerCase(); shown = PAGE; render({ keepFocus: 'search' }); });

  bar.appendChild(h('div', { class: 'db-chiprow' }, [
    h('span', { class: 'db-chiplabel' }, 'Shelf:'),
    chip(`Everything · ${allEntries().length}`, filter.shelf === 'all', () => { filter.shelf = 'all'; shown = PAGE; render(); }),
    ...ctx.shelves.map((s) => chip(`${s.name} · ${s.cards.length}`, filter.shelf === s.id, () => { filter.shelf = s.id; shown = PAGE; render(); })),
    search,
  ]));

  const typesPresent = new Set(shelfEntries().map((e) => e.card.type));
  bar.appendChild(h('div', { class: 'db-chiprow' }, TYPE_LABELS
    .filter(([key]) => key === 'all' || typesPresent.has(key))
    .map(([key, label]) => chip(label, filter.type === key, () => { filter.type = key; shown = PAGE; render(); }))));

  bar.appendChild(h('div', { class: 'db-chiprow' }, [
    chip('Any species', !filter.species, () => { filter.species = null; shown = PAGE; render(); }),
    ...listOf('species').map((sp) => chip(sp, filter.species === sp, () => {
      filter.species = filter.species === sp ? null : sp; shown = PAGE; render();
    }, sp)),
  ]));
  bar.appendChild(h('div', { class: 'db-chiprow' }, [
    chip('Any study', !filter.study, () => { filter.study = null; shown = PAGE; render(); }),
    ...listOf('studies').map((st) => chip(st, filter.study === st, () => {
      filter.study = filter.study === st ? null : st; shown = PAGE; render();
    }, st)),
  ]));

  // Printings: how many cards exist in each, against the whole Book rather than the current filter,
  // so the row reads as a tally of what has actually been painted.
  const everything = allEntries().map((e) => e.card);
  bar.appendChild(h('div', { class: 'db-chiprow' }, [
    h('span', { class: 'db-chiplabel' }, 'Printing:'),
    chip('Any', filter.version === 'any', () => { filter.version = 'any'; shown = PAGE; render(); }),
    ...VERSIONS.map((v) => {
      const n = everything.filter((c) => hasVersion(c, v.key)).length;
      const b = chip(`${v.name} · ${n}`, filter.version === v.key, () => {
        filter.version = filter.version === v.key ? 'any' : v.key; shown = PAGE; render();
      }, null, { title: n ? v.blurb : `${v.blurb} — none painted yet`, disabled: !n });
      return b;
    }),
  ]));
  return bar;
}

/** How far the rebuild has got: printed cards remade, over printed cards there are. */
function buildProgress() {
  const printed = ctx.shelves.find((sh) => sh.id === 'classic');
  if (!printed || !ctx.makerSet) return null;
  const progress = remadeProgress(ctx.marks, ctx.makerIndex, printed.cards);
  return h('div', { class: 'db-progress' }, [
    h('span', {}, `Remade ${progress.done} of ${progress.total} cards in the printed collection.`),
    h('button', {
      class: 'small', type: 'button',
      title: 'Download the remade list as JSON — ids first, so it still reads after a rename',
      onclick: () => downloadRemade(ctx.marks, ctx.makerIndex, printed.set),
    }, 'Export remade list'),
  ]);
}

function render({ keepFocus = null } = {}) {
  const found = results();
  host.innerHTML = '';

  host.appendChild(h('div', { class: 'book-head' }, [
    h('div', {}, [
      h('h2', {}, 'The Book'),
      h('p', { class: 'db-sub' }, 'Every card in the game, Classic and Maker, in every printing it exists in. Turn a card over with the chips beneath it; a greyed chip is a printing that has not been painted yet.'),
      buildProgress(),
    ]),
    h('button', { type: 'button', class: 'primary', onclick: () => ctx.onClose() }, 'Close the book'),
  ]));
  host.appendChild(buildFilters());

  const count = h('div', { class: 'book-count' }, found.length
    ? `${found.length} card${found.length === 1 ? '' : 's'}${found.length > shown ? ` · showing the first ${shown}` : ''}`
    : 'No cards match these filters.');
  host.appendChild(count);

  const grid = h('div', { class: 'book-grid' });
  for (const entry of found.slice(0, shown)) grid.appendChild(buildEntry(entry));
  host.appendChild(grid);

  if (found.length > shown) {
    host.appendChild(h('div', { class: 'book-more' }, [
      h('button', { type: 'button', onclick: () => { shown += PAGE; render(); } }, `Show ${Math.min(PAGE, found.length - shown)} more`),
    ]));
  }
  if (keepFocus === 'search') {
    const el = host.querySelector('.book-search');
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }
}

/**
 * Open the Book in `hostEl`.
 * @param opts { rules, shelves: [{ id, name, set }], makerSet?, onClose() }
 *   A shelf is one collection: its `set` is an indexed or raw card set. Cards are read straight out
 *   of it, so whatever the game can play, the Book can show. `makerSet` is the raw Maker shelf, read
 *   for the character backstories and the remake links; without it the rebuild notes simply go away.
 */
export function openBook(hostEl, opts) {
  host = hostEl;
  ctx = {
    rules: opts.rules,
    shelves: opts.shelves.map((s) => ({ ...s, cards: (s.set.cards || []).slice() })),
    makerSet: opts.makerSet || null,
    marks: loadRemade(),
    makerIndex: makerRemakesIndex(opts.makerSet || { cards: [] }),
    onClose: opts.onClose,
  };
  // Card previews look cards up by id, so the preview index carries every shelf at once.
  const merged = {};
  for (const shelf of ctx.shelves) for (const card of shelf.cards) if (!merged[card.id]) merged[card.id] = card;
  setPreviewContext(opts.rules, { ...ctx.shelves[0].set, cardsById: merged });
  filter = { shelf: 'all', type: 'all', species: null, study: null, rarity: null, version: 'any', text: '' };
  shown = PAGE;
  render();
}
