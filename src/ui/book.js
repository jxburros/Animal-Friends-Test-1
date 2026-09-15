// The Book: a gallery of every card in the game, in every printing it exists in.
//
// The Book plays nothing and changes nothing. It reads the collection, shows each card's face at
// reading size, and lets a card be turned over to any printing it has — Regular, Alternate Art,
// Foil, Alternate Art Foil, Creative Foil or Full Card Art. A printing the card has not been given
// yet is still shown, greyed, so the shelf says plainly what exists and what is still to come.
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

function results() {
  return allCards().filter(matches)
    .sort((a, b) => (a.type || '').localeCompare(b.type || '')
      || a.name.localeCompare(b.name)
      || (a.cost || 0) - (b.cost || 0));
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
  const head = h('div', { class: 'db-story-head' }, [
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
  const chosen = chosenVersion.get(card.id) || (filter.version === 'any' ? defaultVersionKey(card) : filter.version);
  const have = new Set(versionsOf(card).map((v) => v.key));
  const fig = h('figure', { class: `book-card${owned ? '' : ' locked'}` });

  const slot = h('div', { class: `card-slot${owned ? '' : ' locked'}` });
  slot.appendChild(buildCardFace(card, { large: true, interactive: owned, version: owned ? chosen : 'regular' }));
  if (!owned) {
    slot.appendChild(h('span', { class: 'locked-flag', title: 'Not in your collection yet' }, 'Locked'));
  } else {
    const held = heldCount(card.id);
    if (held) slot.appendChild(h('span', { class: 'owned-count', title: `You have ${held}` }, `×${held}`));
  }
  fig.appendChild(slot);

  const cap = h('figcaption', {}, [
    h('span', { class: `rarity-tag rar-${raritySlug(card)}` }, card.rarity || 'Common'),
  ]);
  fig.appendChild(cap);

  const row = h('div', { class: 'version-row' });
  for (const v of VERSIONS) {
    const exists = have.has(v.key);
    const held = exists && ownsThisPrinting(card.id, v.key);
    let title;
    if (!exists) title = `${v.name}: not printed yet for ${card.name}`;
    else if (!held) title = `${v.name}: printed, but not in your collection`;
    else title = `${v.name} — ${v.blurb}`;
    row.appendChild(h('button', {
      class: `version-chip${chosen === v.key && owned ? ' on' : ''}`,
      type: 'button',
      disabled: !exists || !held,
      title,
      onclick: () => { chosenVersion.set(card.id, v.key); render(); },
    }, v.short));
  }
  fig.appendChild(row);

  // A locked card keeps its story to itself. That is the thing still worth opening a pack for.
  fig.appendChild(h('button', {
    class: 'small', type: 'button',
    disabled: !owned,
    title: owned
      ? `Read ${card.name}'s backstory and the full flavor of every version`
      : 'Earn this card to read its story',
    onclick: (e) => { e.stopPropagation(); if (ownsCard(card.id)) openStory(card); },
  }, 'Story'));
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
    h('span', { class: 'db-chiplabel' }, ctx.profile && !ctx.profile.sandbox
      ? `${collectionSize(ctx.profile)} of ${allCards().length} cards:`
      : `${allCards().length} cards:`),
    search,
  ]));

  const typesPresent = new Set(allCards().map((c) => c.type));
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
  const everything = allCards();
  bar.appendChild(h('div', { class: 'db-chiprow' }, [
    h('span', { class: 'db-chiplabel' }, 'Printing:'),
    chip('Any', filter.version === 'any', () => { filter.version = 'any'; chosenVersion.clear(); shown = PAGE; render(); }),
    ...VERSIONS.map((v) => {
      const n = everything.filter((c) => hasVersion(c, v.key)).length;
      const b = chip(`${v.name} · ${n}`, filter.version === v.key, () => {
        filter.version = filter.version === v.key ? 'any' : v.key;
        // A printing shelf opens on that printing; card chips can still compare other versions.
        chosenVersion.clear(); shown = PAGE; render();
      }, null, { title: n ? v.blurb : `${v.blurb} — none painted yet`, disabled: !n });
      return b;
    }),
  ]));
  return bar;
}

function render({ keepFocus = null } = {}) {
  const found = results();
  host.innerHTML = '';

  host.appendChild(h('div', { class: 'book-head' }, [
    h('div', {}, [
      h('h2', {}, 'The Book'),
      h('p', { class: 'db-sub' }, 'Every card in the game, in every printing it exists in. Turn a card over with the chips beneath it; a greyed chip is a printing that has not been painted yet.'),
    ]),
    h('button', { type: 'button', class: 'primary', onclick: () => ctx.onClose() }, 'Close the book'),
  ]));
  host.appendChild(buildFilters());

  const count = h('div', { class: 'book-count' }, found.length
    ? `${found.length} card${found.length === 1 ? '' : 's'}${found.length > shown ? ` · showing the first ${shown}` : ''}`
    : 'No cards match these filters.');
  host.appendChild(count);

  const grid = h('div', { class: 'book-grid' });
  for (const card of found.slice(0, shown)) grid.appendChild(buildEntry(card));
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
  shown = PAGE;
  render();
}
