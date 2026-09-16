// The Book: a gallery of every card in the game, in every printing it exists in.
//
// The Book plays nothing and changes nothing. It reads the collection, shows each card's face at
// reading size, and lets a card be turned over to any printing it has — Regular, Alternate Art,
// Foil, Alternate Art Foil, Creative Foil or Full Card Art. A card shows a mark only for the
// printings it actually has: the shelf says what exists, and stays quiet about what does not.
//
// A card the Mayor does not own is greyed the same way, with its rarity still showing: the Book
// stays a map of the whole set — how big it is, and what is still out there — without giving away
// the rules of a card that has not been earned. Everything a Mayor does own is shown in full, in
// every printing they hold it in.
import { buildCardFace, setPreviewContext, raritySlug } from './render.js';
import { iconSVG } from './art.js';
import { VERSIONS, versionsOf, hasVersion, defaultVersionKey } from './versions.js';
import { characterOf } from '../engine/characters.js';
import { ownedCopies, ownsPrinting, collectionSize } from '../engine/profile.js';
import { RARITIES } from '../engine/power.js';

const PAGE = 48;

/** Does the reader own this card? A Book opened with no Mayor shows the whole set, as it always did. */
function ownsCard(cardId) {
  return !ctx.profile || ownedCopies(ctx.profile, cardId) > 0;
}
/** How many copies the reader holds, or null when the Book is not reading a collection. */
function heldCount(cardId) {
  return ctx.profile && !ctx.profile.sandbox ? ownedCopies(ctx.profile, cardId) : null;
}
/** Does the reader own this particular printing? */
function ownsThisPrinting(cardId, key) {
  return !ctx.profile || ownsPrinting(ctx.profile, cardId, key);
}

let host = null;
let ctx = null; // { rules, set, cards, shelf, onClose }
let filter = { type: 'all', species: null, study: null, rarity: null, version: 'any', text: '' };
let sort = 'type'; // 'type' | 'rarity' | 'name' | 'cost'
let shown = PAGE;
let filtersOpen = false; // the narrow-screen filter drawer
const chosenVersion = new Map(); // cardId -> version key the reader has turned it to

const SORTS = [
  ['type', 'Type'],
  ['rarity', 'Rarity'],
  ['name', 'Name'],
  ['cost', 'Cost'],
];

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
  return h('button', { class: `book-chip${active ? ' on' : ''}`, type: 'button', onclick: onClick, ...extra },
    iconName ? [icon(iconName), label] : [label]);
}

// ---------- the Book's own line drawings ----------
// The Book is a gallery, not a form: a printing is a picture of itself, not the words "Alt Foil" in
// a box. These are drawn here rather than in art.js because nothing else in the game needs them.
const stroke = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" `
  + `stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

const CARD_OUTLINE = '<rect x="6.5" y="2.8" width="11" height="18.4" rx="2.2"/>';
const SPARK = '<path d="M17.4 2.6l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z"/>';

const GLYPHS = Object.freeze({
  // printings
  regular: stroke(`${CARD_OUTLINE}<path d="M9.4 7.2h5.2M9.4 11h5.2M9.4 14.8h3.2"/>`),
  alternateArt: stroke('<rect x="3.2" y="5.4" width="10" height="15.8" rx="2"/>'
    + '<path d="M8.6 5.4V4.6a1.8 1.8 0 0 1 1.8-1.8h8.4a1.8 1.8 0 0 1 1.8 1.8v11.6"/>'
    + '<path d="M3.6 16.6l3-3.4 2.6 2.8 1.7-2 2.3 2.6"/>'),
  foil: stroke(`${CARD_OUTLINE}<path d="M7 17.6L16.8 4.2M9.8 21L17.4 9.6"/>${SPARK}`),
  alternateArtFoil: stroke('<rect x="3.2" y="5.4" width="10" height="15.8" rx="2"/>'
    + '<path d="M8.6 5.4V4.6a1.8 1.8 0 0 1 1.8-1.8h8.4a1.8 1.8 0 0 1 1.8 1.8v11.6"/>'
    + '<path d="M4 18.4l7.6-10.6"/>' + SPARK),
  creativeFoil: stroke('<path d="M12 2.6l9.4 9.4-9.4 9.4L2.6 12z"/>'
    + '<path d="M12 7.2L16.8 12 12 16.8 7.2 12z"/><path d="M12 10.4l1.6 1.6-1.6 1.6-1.6-1.6z"/>'),
  fullCardArt: stroke('<rect x="3.4" y="2.8" width="17.2" height="18.4" rx="2.2"/>'
    + '<path d="M3.4 16.4l4.8-5.2 3.6 3.9 2.6-2.9 6.2 6.8"/><circle cx="8.6" cy="7.6" r="1.7"/>'),
  // actions
  story: stroke('<path d="M12 6.6S9.6 4.4 3.8 4.4v13.2c5.8 0 8.2 2 8.2 2s2.4-2 8.2-2V4.4c-5.8 0-8.2 2.2-8.2 2.2z"/>'
    + '<path d="M12 6.6v13"/>'),
  close: stroke('<path d="M6 6l12 12M18 6L6 18"/>'),
  search: stroke('<circle cx="10.6" cy="10.6" r="6.4"/><path d="M15.3 15.3L20.4 20.4"/>'),
  sliders: stroke('<path d="M4 7h16M4 12.6h16M4 18.2h16"/><circle cx="9" cy="7" r="2.1" fill="currentColor" stroke="none"/>'
    + '<circle cx="15.4" cy="12.6" r="2.1" fill="currentColor" stroke="none"/>'
    + '<circle cx="7.4" cy="18.2" r="2.1" fill="currentColor" stroke="none"/>'),
  broom: stroke('<path d="M12 3v9"/><path d="M7.4 12h9.2l1.4 8.4H6z"/><path d="M9.6 12v8.4M12 12v8.4M14.4 12v8.4"/>'),
  chevron: stroke('<path d="M6 9.4l6 6 6-6"/>'),
  lock: stroke('<rect x="4.6" y="10.2" width="14.8" height="10.4" rx="2.4"/><path d="M8 10.2V7.2a4 4 0 0 1 8 0v3"/>'),
});

function glyph(name) { return h('i', { class: 'ico', html: GLYPHS[name] || GLYPHS.regular }); }

/** A button that is only a picture. Every one carries the words in `label` for anyone not seeing it. */
function iconButton(glyphName, label, onClick, extra = {}) {
  return h('button', {
    class: 'book-icon-btn', type: 'button', title: label, 'aria-label': label, onclick: onClick, ...extra,
  }, [glyph(glyphName)]);
}

/** Every card the Book holds. */
function allCards() {
  return ctx.cards;
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

function rarityRank(card) {
  return RARITIES.indexOf(card.rarity || 'Common');
}

function results() {
  return allCards().filter(matches).sort((a, b) => {
    if (sort === 'rarity') return rarityRank(a) - rarityRank(b) || a.name.localeCompare(b.name);
    if (sort === 'name') return a.name.localeCompare(b.name) || (a.cost || 0) - (b.cost || 0);
    if (sort === 'cost') return (a.cost || 0) - (b.cost || 0) || a.name.localeCompare(b.name);
    return (a.type || '').localeCompare(b.type || '')
      || a.name.localeCompare(b.name)
      || (a.cost || 0) - (b.cost || 0);
  });
}

function listOf(key) {
  return [...new Set(ctx.set[key] || [])];
}

function characterEntry(name) {
  return ((ctx.shelf && ctx.shelf.characters) || []).find((c) => c.name === name) || null;
}

/**
 * The story panel: a character's backstory beside the flavor of every version of them. Card
 * faces clip long flavor and a backstory has nowhere to live on a card at all — this is where the
 * writing the cards came out of is actually read.
 */
function openStory(def) {
  const entry = characterEntry(def.name);
  // A town card belongs to nobody: a Building is not somebody's backstory. Rather than apologise for
  // a character entry it was never going to have, it tells its own story.
  const townCard = !entry && !def.species;
  const versions = (ctx.cards || [])
    .filter((c) => characterOf(c) === def.name)
    .sort((a, b) => (a.cost || 0) - (b.cost || 0));
  // tabindex: showModal() otherwise focuses the close button at the foot of a long story and
  // scrolls the panel past the character's name before it is ever read.
  const dialog = h('dialog', { class: 'db-story', tabindex: '-1', 'aria-label': `The story of ${def.name}` });
  // The way out sits at the top of the panel as well as the foot: a long story used to put its only
  // close button several screens down.
  const head = h('div', { class: 'db-story-head' }, [
    iconButton('close', 'Close the story', () => dialog.close(), { class: 'book-icon-btn db-story-close' }),
    h('h2', {}, def.name),
    h('p', { class: 'db-story-sub' }, entry
      ? [entry.species, (entry.studies || []).join(' · '), entry.pronouns].filter(Boolean).join(' — ')
      : townCard ? (def.title || 'A town card')
        : `${def.species || ''} ${def.study ? `· ${def.study}` : ''}`.trim()),
  ]);
  const body = h('div', { class: 'db-story-body' });
  if (entry) {
    for (const para of String(entry.backstory || '').split('\n\n')) {
      if (para.trim()) body.appendChild(h('p', {}, para.trim()));
    }
    if (entry.voice) body.appendChild(h('p', { class: 'db-story-note' }, [h('strong', {}, 'Voice. '), entry.voice]));
    if (entry.arc) body.appendChild(h('p', { class: 'db-story-note' }, [h('strong', {}, 'The arc. '), entry.arc]));
  } else if (townCard) {
    if (def.text) body.appendChild(h('p', { class: 'db-story-rules' }, def.text));
    if (def.flavor) body.appendChild(h('p', { class: 'db-story-flavor' }, def.flavor));
    body.appendChild(h('p', { class: 'db-story-note' }, [
      h('strong', {}, 'A town card. '),
      'It belongs to no character \u2014 a Building is not somebody\u2019s backstory.',
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

// ---------- one card on the shelf ----------
function buildEntry(card) {
  const owned = ownsCard(card.id);
  // Only the printings this card has actually been given. A card that exists in one printing says
  // nothing at all beneath it: an empty row of greyed buttons was six ways of saying "no".
  const printings = versionsOf(card);
  let chosen = chosenVersion.get(card.id) || (filter.version === 'any' ? defaultVersionKey(card) : filter.version);
  if (!printings.some((v) => v.key === chosen)) chosen = defaultVersionKey(card);

  const fig = h('figure', { class: `book-card${owned ? '' : ' locked'}` });

  const slot = h('div', { class: `card-slot${owned ? '' : ' locked'}` });
  slot.appendChild(buildCardFace(card, { large: true, interactive: owned, version: owned ? chosen : 'regular' }));
  if (!owned) {
    // A padlock, not a placard: the word "LOCKED" across a card covered the name of the thing the
    // Mayor is meant to want.
    slot.appendChild(h('span', {
      class: 'locked-flag', title: `${card.name} is not in your collection yet`,
    }, [glyph('lock'), h('span', { class: 'sr-only' }, 'Locked')]));
  } else {
    const held = heldCount(card.id);
    if (held) slot.appendChild(h('span', { class: 'owned-count', title: `You have ${held}` }, `\u00d7${held}`));
  }
  fig.appendChild(slot);

  const cap = h('figcaption', {}, [
    h('span', { class: `rarity-tag rar-${raritySlug(card)}` }, card.rarity || 'Common'),
    // The story is a picture of a book, not the word "Story" in a box.
    h('button', {
      class: 'book-icon-btn story',
      type: 'button',
      disabled: !owned,
      title: owned
        ? `Read ${card.name}'s backstory and the full flavor of every version`
        : 'Earn this card to read its story',
      'aria-label': owned ? `Read the story of ${card.name}` : `${card.name} is not in your collection yet`,
      onclick: (e) => { e.stopPropagation(); if (ownsCard(card.id)) openStory(card); },
    }, [glyph('story')]),
  ]);
  fig.appendChild(cap);

  if (printings.length > 1) {
    const row = h('div', { class: 'version-row', role: 'group', 'aria-label': `Printings of ${card.name}` });
    for (const v of printings) {
      const held = ownsThisPrinting(card.id, v.key);
      row.appendChild(h('button', {
        class: `version-chip${chosen === v.key && owned ? ' on' : ''}${held ? '' : ' unheld'}`,
        type: 'button',
        disabled: !held || !owned,
        title: held ? `${v.name} \u2014 ${v.blurb}` : `${v.name}: printed, but not in your collection`,
        'aria-label': v.name,
        'aria-pressed': chosen === v.key && owned ? 'true' : 'false',
        onclick: () => { chosenVersion.set(card.id, v.key); render(); },
      }, [glyph(v.key)]));
    }
    fig.appendChild(row);
  }
  return fig;
}

// ---------- the screen ----------
/** Is anything narrowing the shelf right now? Decides whether the "clear" broom is offered. */
function filtersActive() {
  return filter.type !== 'all' || filter.species || filter.study || filter.rarity
    || filter.version !== 'any' || !!filter.text;
}

function clearFilters() {
  filter = { type: 'all', species: null, study: null, rarity: null, version: 'any', text: '' };
  chosenVersion.clear();
  shown = PAGE;
  render();
}

/** One labelled line of chips. */
function chiprow(label, children) {
  return h('div', { class: 'book-chiprow' }, [
    label ? h('span', { class: 'book-chiplabel' }, label) : null,
    h('div', { class: 'book-chipscroll' }, children),
  ]);
}

function buildFilters() {
  const bar = h('div', { class: `book-filters${filtersOpen ? ' open' : ''}` });

  const search = h('input', {
    type: 'search', class: 'book-search-input', placeholder: 'Search names and rules text', value: filter.text,
    'aria-label': 'Search names and rules text',
  });
  search.addEventListener('input', () => {
    filter.text = search.value.trim().toLowerCase(); shown = PAGE; render({ keepFocus: 'search' });
  });

  bar.appendChild(h('div', { class: 'book-searchline' }, [
    h('div', { class: 'book-search' }, [glyph('search'), search]),
    // On a narrow screen the whole filter set folds away behind this one button; on a wide one the
    // rows are always out and this never appears.
    h('button', {
      class: `book-icon-btn wide filter-toggle${filtersOpen ? ' on' : ''}`,
      type: 'button',
      'aria-expanded': filtersOpen ? 'true' : 'false',
      title: filtersOpen ? 'Hide the filters' : 'Show the filters',
      onclick: () => { filtersOpen = !filtersOpen; render(); },
    }, [glyph('sliders'), h('span', { class: 'lbl' }, 'Filters'), glyph('chevron')]),
    filtersActive()
      ? iconButton('broom', 'Clear every filter', clearFilters, { class: 'book-icon-btn clear' })
      : null,
  ]));

  const rows = h('div', { class: 'book-filter-rows' });

  const typesPresent = new Set(allCards().map((c) => c.type));
  rows.appendChild(chiprow('Show', TYPE_LABELS
    .filter(([key]) => key === 'all' || typesPresent.has(key))
    .map(([key, label]) => chip(label, filter.type === key, () => { filter.type = key; shown = PAGE; render(); }))));

  rows.appendChild(chiprow('Sort', SORTS.map(([key, label]) => chip(label, sort === key, () => { sort = key; render(); }))));

  rows.appendChild(chiprow('Species', [
    chip('Any', !filter.species, () => { filter.species = null; shown = PAGE; render(); }),
    ...listOf('species').map((sp) => chip(sp, filter.species === sp, () => {
      filter.species = filter.species === sp ? null : sp; shown = PAGE; render();
    }, sp)),
  ]));
  rows.appendChild(chiprow('Study', [
    chip('Any', !filter.study, () => { filter.study = null; shown = PAGE; render(); }),
    ...listOf('studies').map((st) => chip(st, filter.study === st, () => {
      filter.study = filter.study === st ? null : st; shown = PAGE; render();
    }, st)),
  ]));
  rows.appendChild(chiprow('Rarity', [
    chip('Any', !filter.rarity, () => { filter.rarity = null; shown = PAGE; render(); }),
    ...RARITIES.map((r) => chip(r, filter.rarity === r, () => {
      filter.rarity = filter.rarity === r ? null : r; shown = PAGE; render();
    })),
  ]));

  // Printings: how many cards exist in each, against the whole Book rather than the current filter,
  // so the row reads as a tally of what has actually been painted. A printing nothing is painted in
  // is left out entirely rather than sitting there greyed.
  const everything = allCards();
  const printed = VERSIONS
    .map((v) => ({ v, n: everything.filter((c) => hasVersion(c, v.key)).length }))
    .filter(({ n }) => n > 0);
  rows.appendChild(chiprow('Printing', [
    h('button', {
      class: `book-chip${filter.version === 'any' ? ' on' : ''}`,
      type: 'button',
      onclick: () => { filter.version = 'any'; chosenVersion.clear(); shown = PAGE; render(); },
    }, 'Any'),
    ...printed.map(({ v, n }) => h('button', {
      class: `book-chip printing${filter.version === v.key ? ' on' : ''}`,
      type: 'button',
      title: `${v.name} \u2014 ${v.blurb}`,
      'aria-label': `${v.name}: ${n} cards`,
      onclick: () => {
        filter.version = filter.version === v.key ? 'any' : v.key;
        // A printing shelf opens on that printing; card chips can still compare other versions.
        chosenVersion.clear(); shown = PAGE; render();
      },
    }, [glyph(v.key), h('span', { class: 'lbl' }, v.short), h('span', { class: 'tally' }, String(n))])),
  ]));

  bar.appendChild(rows);
  return bar;
}

function render({ keepFocus = null } = {}) {
  const found = results();
  host.innerHTML = '';

  const total = allCards().length;
  const held = ctx.profile && !ctx.profile.sandbox ? collectionSize(ctx.profile) : null;

  host.appendChild(h('div', { class: 'book-head' }, [
    h('div', { class: 'book-title' }, [
      h('h2', {}, 'The Book'),
      h('p', { class: 'book-sub' }, 'Every card in the game, in every printing it exists in. '
        + 'Turn a card over with the marks beneath it.'),
    ]),
    h('div', { class: 'book-tally' }, [
      h('span', { class: 'book-tally-n' }, held === null ? String(total) : `${held}/${total}`),
      h('span', { class: 'book-tally-l' }, held === null ? 'cards' : 'collected'),
    ]),
    iconButton('close', 'Close the book', () => ctx.onClose(), { class: 'book-icon-btn close' }),
  ]));
  host.appendChild(buildFilters());

  host.appendChild(h('div', { class: 'book-count' }, found.length
    ? `${found.length} card${found.length === 1 ? '' : 's'}${found.length > shown ? ` \u00b7 showing the first ${shown}` : ''}`
    : 'No cards match these filters.'));

  if (!found.length) {
    host.appendChild(h('div', { class: 'book-empty' }, [
      h('p', {}, 'Nothing on the shelf answers to that.'),
      h('button', { class: 'book-chip', type: 'button', onclick: clearFilters }, 'Clear every filter'),
    ]));
  }

  const grid = h('div', { class: 'book-grid' });
  for (const card of found.slice(0, shown)) grid.appendChild(buildEntry(card));
  host.appendChild(grid);

  if (found.length > shown) {
    host.appendChild(h('div', { class: 'book-more' }, [
      h('button', { class: 'book-more-btn', type: 'button', onclick: () => { shown += PAGE; render(); } }, [
        `Show ${Math.min(PAGE, found.length - shown)} more`, glyph('chevron'),
      ]),
    ]));
  }
  if (keepFocus === 'search') {
    const el = host.querySelector('.book-search-input');
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }
}

/**
 * Open the Book in `hostEl`.
 * @param opts { rules, set, shelf?, onClose() }
 *   `set` is the collection, indexed or raw: cards are read straight out of it, so whatever the
 *   game can play, the Book can show. `shelf` is the same collection as it is written on disk, read
 *   for the character backstories; without it the Story panel simply has nothing to say.
 */
export function openBook(hostEl, opts) {
  host = hostEl;
  ctx = {
    rules: opts.rules,
    set: opts.set,
    cards: (opts.set.cards || []).slice(),
    shelf: opts.shelf || opts.set,
    // The Mayor whose collection is being read. Without one the Book shows the whole set unlocked,
    // which is what it did before there were Mayors and what the Full Art gallery still wants.
    profile: opts.profile || null,
    onClose: opts.onClose,
  };
  setPreviewContext(opts.rules, opts.set);
  filter = { type: 'all', species: null, study: null, rarity: null, version: 'any', text: '' };
  filtersOpen = false;
  shown = PAGE;
  render();
}
