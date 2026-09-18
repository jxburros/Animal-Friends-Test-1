// The Book: every card in the game, laid out on the pages of an open storybook.
//
// The Book plays nothing and changes nothing. It reads the collection and sets the cards down on the
// two painted pages of assets/ui/open-storybook-table.png — which is the whole point of the screen.
// Because the painting is a fixed 1536 × 1024 picture of a book, the pages are laid out against a
// sheet of exactly that size and the whole sheet is then scaled to whatever room the window has. A
// card can therefore never wander off the paper: the paper and the grid share one coordinate system.
//
// Reading is by page turn rather than by scrolling. A spread holds a fixed number of cards, chosen by
// breakpoint so that a page always fits its half of the painting, and the brass buttons in the outer
// margins (and the arrow keys) turn to the next spread. On a phone there is only room for one page at
// a time, so the sheet is shifted sideways to show the left or the right page alone and a turn steps
// by a single page — which is how a book actually reads on something that narrow.
//
// A card the Mayor does not own is not shown greyed out: it is a dark slot with a question mark on
// it, its rarity still printed underneath. The Book stays a map of the whole set — how big it is, and
// what is still out there — without giving away a card that has not been earned yet. Under a card
// that is owned sit only the printings that card actually exists in; a printing that was never
// painted for it is simply not drawn, so the row reads as "these are the ways this card comes".
import { buildCardFace, setPreviewContext, raritySlug, effectText } from './render.js';
import { iconSVG } from './art.js';
import { VERSIONS, versionsOf, hasVersion, defaultVersionKey } from './versions.js';
import { openCharacterModal } from './lore.js';
import { characterOf } from '../engine/characters.js';
import { ownedCopies, ownsPrinting, collectionSize } from '../engine/profile.js';
import { RARITIES } from '../engine/power.js';

// The painting's own pixel size. Everything inside the book is laid out against these numbers and
// scaled once, at the end, so the pages and the cards on them can never drift apart.
const SHEET_W = 1536;
const SHEET_H = 1024;
// The gutter sits at ~49.8% of the painting, so half the sheet is the natural one-page crop.
const PAGE_SHIFT = SHEET_W / 2;
// The brass margin buttons, and the room the foot of the screen needs. Kept here because fitting the
// sheet has to subtract them before it knows how much space the paper has.
const TURN_COL = 54;
const STAGE_GAP = 10;
const FOOT_ROOM = 58;

let host = null;
let ctx = null; // { rules, set, cards, shelf, profile, onClose, onLore }
let filter = { type: 'all', species: null, study: null, rarity: null, version: 'any', text: '' };
let sort = 'type'; // 'type' | 'rarity' | 'name' | 'cost'
let pageIndex = 0; // the leftmost page on show
let filtersOpen = false;
let layout = { cols: 3, rows: 2, pagesPerView: 2, faceScale: 1.7 };
const chosenVersion = new Map(); // cardId -> version key the reader has turned it to
let keyHandler = null;
let resizeHandler = null;

/**
 * How many cards a page holds, and how big their faces are drawn on the sheet.
 * These are fixed per breakpoint rather than computed, because a spread that always holds the same
 * number of cards is what makes a page turn feel like a page turn. The face scale is chosen so that
 * a column of cards plus its printing row and rarity tag fits inside the painted page with room to
 * spare — see the page box percentages in book.css.
 */
function layoutFor(width) {
  if (width <= 700) return { cols: 2, rows: 2, pagesPerView: 1, faceScale: 1.8 };
  if (width < 960) return { cols: 2, rows: 2, pagesPerView: 2, faceScale: 1.8 };
  // From here up the page's own proportions decide: three columns of faces at 1.7 fill the painted
  // page nearly to its margins, where four smaller ones left the lower third of every page bare.
  return { cols: 3, rows: 2, pagesPerView: 2, faceScale: 1.7 };
}
function perPage() { return layout.cols * layout.rows; }

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

const SORTS = [
  ['type', 'Type', 'sortType'],
  ['rarity', 'Rarity', 'sortRarity'],
  ['name', 'Name', 'sortName'],
  ['cost', 'Cost', 'sortCost'],
];

// Every filter chip in the Book is an icon, so every card type needs a mark. Two of them share the
// market awning — a City Hire is a character sold in the Capital City market — so the hire chip
// carries a small badge to tell the pair apart, and both say plainly what they are in their tooltip.
const TYPE_CHIPS = [
  ['all', 'Everything', 'any', null],
  ['character', 'Characters', 'character', null],
  ['event', 'Events', 'event', null],
  ['townBuilding', 'Town Buildings', 'borough', null],
  ['building', 'City Buildings', 'capital', null],
  ['marketCharacter', 'City Hires', 'market', 'H'],
  ['market', 'City Cards', 'market', null],
  ['statue', 'Statues', 'statue', null],
  ['disruption', 'Disruptions', 'shift', null],
  ['ordinance', 'Ordinances', 'Civics', null],
  ['token', 'Tokens', 'supply', null],
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

/**
 * An icon button. The Book has no written labels left on its controls, so every one of these carries
 * the words it replaced in both `aria-label` and `title`: a screen reader hears the old label and a
 * hovering reader is told it. `pressed` writes `aria-pressed` for the ones that are toggles.
 */
function iconButton(iconName, label, onClick, { pressed = null, disabled = false, cls = '', badge = null, extra = null } = {}) {
  const attrs = {
    class: `book-ib${cls ? ` ${cls}` : ''}${pressed ? ' on' : ''}`,
    type: 'button',
    'aria-label': label,
    title: label,
    onclick: onClick,
  };
  if (pressed !== null) attrs['aria-pressed'] = pressed ? 'true' : 'false';
  if (disabled) attrs.disabled = true;
  return h('button', attrs, [
    icon(iconName),
    badge ? h('span', { class: 'ib-badge' }, badge) : null,
    extra,
  ]);
}

/** Every card the Book holds. */
function allCards() {
  return ctx.cards;
}

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

/**
 * The town-card story panel. A Building belongs to nobody — it is not somebody's backstory — so it
 * has nowhere in the Lore Directory to go and tells its own story here instead. Every card that does
 * belong to a Character is sent to the Lore Directory, which is where the writing lives now.
 */
function openTownStory(def) {
  // tabindex: showModal() otherwise focuses the close button at the foot of the panel and scrolls
  // the card's own name out of sight before it is ever read.
  const dialog = h('dialog', { class: 'db-story', tabindex: '-1', 'aria-label': `The story of ${def.name}` });
  const head = h('div', { class: 'db-story-head' }, [
    h('h2', {}, def.name),
    h('p', { class: 'db-story-sub' }, def.title || 'A town card'),
  ]);
  const body = h('div', { class: 'db-story-body' });
  if (effectText(def)) body.appendChild(h('p', { class: 'db-story-rules' }, effectText(def)));
  if (def.flavor) body.appendChild(h('p', { class: 'db-story-flavor' }, def.flavor));
  body.appendChild(h('p', { class: 'db-story-note' }, [
    h('strong', {}, 'A town card. '),
    'It belongs to no character — a Building is not somebody’s backstory.',
  ]));
  dialog.appendChild(head);
  dialog.appendChild(body);
  dialog.appendChild(h('button', { class: 'primary', type: 'button', onclick: () => dialog.close() }, 'Close the book'));
  dialog.addEventListener('close', () => dialog.remove());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  document.body.appendChild(dialog);
  dialog.showModal();
  dialog.scrollTop = 0;
}

/** Open whatever story a card has: its Character's entry in the Lore Directory, or its own panel. */
function openCardStory(card) {
  const who = characterOf(card);
  if (who) openCharacterModal(who);
  else openTownStory(card);
}

// ---------- one card on the page ----------

/** The printing a card opens on: the reader's own choice, then the filter, then one they hold. */
function printingFor(card) {
  const picked = chosenVersion.get(card.id);
  if (picked && hasVersion(card, picked)) return picked;
  if (filter.version !== 'any' && hasVersion(card, filter.version)) return filter.version;
  const fallback = defaultVersionKey(card);
  if (ownsThisPrinting(card.id, fallback)) return fallback;
  const held = versionsOf(card).find((v) => ownsThisPrinting(card.id, v.key));
  return held ? held.key : fallback;
}

function buildEntry(card) {
  const owned = ownsCard(card.id);
  const fig = h('figure', { class: `book-card${owned ? '' : ' locked'}` });
  const slot = h('div', { class: `card-slot${owned ? '' : ' locked'}` });

  if (owned) {
    slot.appendChild(h('div', { class: 'bc-face' }, [
      buildCardFace(card, { large: false, interactive: true, version: printingFor(card) }),
    ]));
    const held = heldCount(card.id);
    if (held) slot.appendChild(h('span', { class: 'owned-count', title: `You have ${held}` }, `×${held}`));
  } else {
    // Nothing of the card itself: a darkened space with a question mark on it, which is the thing
    // still worth opening a pack for.
    slot.setAttribute('title', 'Not in your collection yet');
    slot.setAttribute('aria-label', `A card you do not own yet — ${card.rarity || 'Common'}`);
    slot.appendChild(h('span', { class: 'book-unknown', 'aria-hidden': 'true' }, '?'));
  }
  fig.appendChild(slot);

  if (owned) {
    // Only the printings this card actually exists in. A printing it was never painted in is not
    // drawn at all, so the row reads as the ways this card comes rather than as a list of absences.
    const chosen = printingFor(card);
    const row = h('div', { class: 'version-row' });
    for (const v of versionsOf(card)) {
      const held = ownsThisPrinting(card.id, v.key);
      const label = held
        ? `${v.name} — ${v.blurb}`
        : `${v.name}: printed, but not in your collection`;
      row.appendChild(iconButton(v.key, label, () => { chosenVersion.set(card.id, v.key); render(); }, {
        cls: `version-chip${held ? '' : ' dim'}`,
        pressed: chosen === v.key,
        disabled: !held,
        extra: held ? null : h('i', { class: 'ico ib-lock', html: iconSVG('locked') }),
      }));
    }
    fig.appendChild(row);
  }

  const cap = h('figcaption', {}, [
    h('span', { class: `rarity-tag rar-${raritySlug(card)}`, title: card.rarity || 'Common' }),
    owned
      ? iconButton('story', characterOf(card)
        ? `Read ${characterOf(card)}'s entry in the Lore Directory`
        : `Read the story of ${card.name}`,
      (e) => { e.stopPropagation(); openCardStory(card); }, { cls: 'story-btn' })
      : null,
  ]);
  fig.appendChild(cap);
  return fig;
}

// ---------- the toolbar on the felt ----------

function buildBar(found) {
  const bar = h('div', { class: 'book-bar' });

  const search = h('input', {
    type: 'search', class: 'seed-input book-search', 'aria-label': 'Search names and rules text',
    placeholder: 'Search names and rules text', value: filter.text,
  });
  search.addEventListener('input', () => {
    filter.text = search.value.trim().toLowerCase();
    pageIndex = 0;
    render({ keepFocus: 'search' });
  });

  const held = ctx.profile && !ctx.profile.sandbox
    ? `${collectionSize(ctx.profile)} of ${allCards().length} cards`
    : `${allCards().length} cards`;

  bar.appendChild(h('div', { class: 'book-bar-main' }, [
    h('h2', {}, 'The Book'),
    h('span', { class: 'book-count' }, found.length
      ? `${held} · ${found.length} on show`
      : `${held} · nothing matches these filters`),
    h('span', { class: 'book-spacer' }),
    h('label', { class: 'book-searchbox' }, [icon('search'), search]),
    iconButton('any', filtersOpen
      ? 'Hide the species, study, rarity and printing filters'
      : 'More filters — species, study, rarity and printing',
    () => { filtersOpen = !filtersOpen; render(); }, { pressed: filtersOpen }),
    ctx.onLore ? iconButton('lore', 'Open the Lore Directory', () => ctx.onLore()) : null,
    iconButton('close', 'Close the book', () => ctx.onClose && ctx.onClose(), { cls: 'book-close' }),
  ]));

  const typesPresent = new Set(allCards().map((c) => c.type));
  bar.appendChild(h('div', { class: 'book-bar-row' }, [
    ...SORTS.map(([key, label, ico]) => iconButton(ico, `Sort by ${label.toLowerCase()}`, () => {
      sort = key; pageIndex = 0; render();
    }, { pressed: sort === key })),
    h('span', { class: 'book-bar-sep' }),
    ...TYPE_CHIPS
      .filter(([key]) => key === 'all' || typesPresent.has(key))
      .map(([key, label, ico, badge]) => iconButton(ico, label, () => {
        filter.type = key; pageIndex = 0; render();
      }, { pressed: filter.type === key, badge })),
  ]));

  if (filtersOpen) {
    const more = h('div', { class: 'book-bar-more' });

    more.appendChild(h('div', { class: 'book-bar-row' }, [
      iconButton('any', 'Any species', () => { filter.species = null; pageIndex = 0; render(); }, { pressed: !filter.species }),
      ...listOf('species').map((sp) => iconButton(sp, sp, () => {
        filter.species = filter.species === sp ? null : sp; pageIndex = 0; render();
      }, { pressed: filter.species === sp })),
    ]));

    more.appendChild(h('div', { class: 'book-bar-row' }, [
      iconButton('any', 'Any study', () => { filter.study = null; pageIndex = 0; render(); }, { pressed: !filter.study }),
      ...listOf('studies').map((st) => iconButton(st, st, () => {
        filter.study = filter.study === st ? null : st; pageIndex = 0; render();
      }, { pressed: filter.study === st })),
    ]));

    // Rarity is already drawn all over the game as a coloured diamond, so the chips are diamonds
    // rather than a second, written vocabulary for the same thing.
    more.appendChild(h('div', { class: 'book-bar-row' }, [
      iconButton('any', 'Any rarity', () => { filter.rarity = null; pageIndex = 0; render(); }, { pressed: !filter.rarity }),
      ...RARITIES.map((r) => {
        const slug = r.toLowerCase().replace(/\s+/g, '-');
        return h('button', {
          class: `book-ib rarity-chip${filter.rarity === r ? ' on' : ''}`,
          type: 'button',
          'aria-label': r,
          'aria-pressed': filter.rarity === r ? 'true' : 'false',
          title: r,
          onclick: () => { filter.rarity = filter.rarity === r ? null : r; pageIndex = 0; render(); },
        }, [h('span', { class: `rarity-tag rar-${slug}` })]);
      }),
    ]));

    // Printings: how many cards exist in each, counted against the whole Book rather than the
    // current filter, so the row reads as a tally of what has actually been painted.
    const everything = allCards();
    more.appendChild(h('div', { class: 'book-bar-row' }, [
      iconButton('any', 'Any printing', () => {
        filter.version = 'any'; chosenVersion.clear(); pageIndex = 0; render();
      }, { pressed: filter.version === 'any' }),
      ...VERSIONS.map((v) => {
        const n = everything.filter((c) => hasVersion(c, v.key)).length;
        return iconButton(v.key, n ? `${v.name} · ${n} cards — ${v.blurb}` : `${v.name} — none painted yet`, () => {
          filter.version = filter.version === v.key ? 'any' : v.key;
          // A printing shelf opens on that printing; a card's own chips can still turn it over.
          chosenVersion.clear(); pageIndex = 0; render();
        }, { pressed: filter.version === v.key, disabled: !n, badge: n ? String(n) : null });
      }),
    ]));
    bar.appendChild(more);
  }
  return bar;
}

// ---------- the open book ----------

function totalPages(found) {
  return Math.max(1, Math.ceil(found.length / perPage()));
}
/** Keep the spread inside the set of pages a filter has left, and on a spread boundary. */
function clampPage(pages) {
  const step = layout.pagesPerView;
  const last = Math.max(0, Math.floor((pages - 1) / step) * step);
  pageIndex = Math.min(Math.max(0, Math.floor(pageIndex / step) * step), last);
}

function buildPage(found, index, side, turn) {
  const page = h('div', {
    class: `book-page ${side}${turn ? ` turn-${turn}` : ''}`,
    'aria-label': `Page ${index + 1}`,
  });
  const grid = h('div', { class: 'book-page-grid' });
  const from = index * perPage();
  for (const card of found.slice(from, from + perPage())) grid.appendChild(buildEntry(card));
  page.appendChild(grid);
  return page;
}

function turnSide(side, found, pages) {
  const step = layout.pagesPerView;
  const atStart = pageIndex <= 0;
  const atEnd = pageIndex + step >= pages;
  if (side === 'left') {
    return h('div', { class: 'book-turnside left' }, [
      iconButton('firstPage', 'Back to the first page', () => turnTo(0, 'prev'), { disabled: atStart, cls: 'book-turn' }),
      iconButton('prevPage', 'Turn back a page', () => turnTo(pageIndex - step, 'prev'), { disabled: atStart, cls: 'book-turn big' }),
    ]);
  }
  return h('div', { class: 'book-turnside right' }, [
    iconButton('nextPage', 'Turn the page', () => turnTo(pageIndex + step, 'next'), { disabled: atEnd, cls: 'book-turn big' }),
    iconButton('lastPage', 'On to the last page', () => turnTo(Math.max(0, pages - step), 'next'), { disabled: atEnd, cls: 'book-turn' }),
  ]);
}

function turnTo(next, direction) {
  const found = results();
  const pages = totalPages(found);
  const step = layout.pagesPerView;
  const last = Math.max(0, Math.floor((pages - 1) / step) * step);
  const want = Math.min(Math.max(0, Math.floor(next / step) * step), last);
  if (want === pageIndex) return;
  pageIndex = want;
  render({ turn: direction });
}

function pageLabel(pages) {
  const step = layout.pagesPerView;
  const first = pageIndex + 1;
  const last = Math.min(pages, pageIndex + step);
  return first === last ? `Page ${first} of ${pages}` : `Pages ${first}–${last} of ${pages}`;
}

function buildStage(found, pages, turn) {
  const stage = h('div', { class: 'book-stage' });
  const onePage = layout.pagesPerView === 1;
  if (!onePage) stage.appendChild(turnSide('left', found, pages));

  const view = h('div', { class: 'book-viewport' });
  const sheet = h('div', { class: 'book-sheet', role: 'group', 'aria-label': pageLabel(pages) });
  if (onePage) {
    // One page at a time: the sheet is shifted so the crop lands on the left or the right page, and
    // the page itself is built into whichever side of the painting is on show.
    const side = pageIndex % 2 === 0 ? 'left' : 'right';
    sheet.appendChild(buildPage(found, pageIndex, side, turn));
  } else {
    sheet.appendChild(buildPage(found, pageIndex, 'left', turn));
    sheet.appendChild(buildPage(found, pageIndex + 1, 'right', turn));
  }
  view.appendChild(sheet);
  stage.appendChild(view);

  if (!onePage) stage.appendChild(turnSide('right', found, pages));
  return stage;
}

function buildFoot(found, pages) {
  const foot = h('div', { class: 'book-foot' });
  if (layout.pagesPerView === 1) {
    foot.appendChild(h('div', { class: 'book-turnrow' }, [
      ...turnSide('left', found, pages).childNodes,
      h('span', { class: 'book-pageno', 'aria-live': 'polite' }, pageLabel(pages)),
      ...turnSide('right', found, pages).childNodes,
    ]));
  } else {
    foot.appendChild(h('span', { class: 'book-pageno', 'aria-live': 'polite' }, pageLabel(pages)));
  }
  return foot;
}

/**
 * Scale the sheet to whatever room the window has left. The painting, the pages and the cards are
 * all one fixed-size drawing, so there is exactly one number to work out here and nothing inside the
 * book can be pushed past its edge by a long name or a wide screen.
 */
function fitSheet() {
  if (!host) return;
  const stage = host.querySelector('.book-stage');
  const view = host.querySelector('.book-viewport');
  if (!stage || !view) return;
  const sides = stage.querySelectorAll('.book-turnside').length;
  const availW = Math.max(240, stage.clientWidth - sides * (TURN_COL + STAGE_GAP));
  const availH = Math.max(320, window.innerHeight - stage.getBoundingClientRect().top - FOOT_ROOM);
  const visW = layout.pagesPerView === 1 ? PAGE_SHIFT : SHEET_W;
  const scale = Math.min(availW / visW, availH / SHEET_H);
  view.style.width = `${Math.round(visW * scale)}px`;
  view.style.height = `${Math.round(SHEET_H * scale)}px`;
  view.style.setProperty('--book-scale', String(scale));
  view.style.setProperty('--page-shift', layout.pagesPerView === 1 && pageIndex % 2 === 1 ? String(PAGE_SHIFT) : '0');
}

function render({ keepFocus = null, turn = null } = {}) {
  if (!host) return;
  const found = results();
  const pages = totalPages(found);
  clampPage(pages);

  host.innerHTML = '';
  host.style.setProperty('--book-cols', String(layout.cols));
  host.style.setProperty('--book-rows', String(layout.rows));
  host.style.setProperty('--face-scale', String(layout.faceScale));
  host.appendChild(buildBar(found));
  host.appendChild(buildStage(found, pages, turn));
  host.appendChild(buildFoot(found, pages));
  fitSheet();

  if (keepFocus === 'search') {
    const el = host.querySelector('.book-search');
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }
}

/** Arrow keys turn the page while the Book is the screen in front of the reader. */
function onKey(e) {
  if (!host || !host.isConnected || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
  const screen = host.closest('.screen');
  if (screen && !screen.classList.contains('active')) return;
  if (document.querySelector('dialog[open]')) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); turnTo(pageIndex - layout.pagesPerView, 'prev'); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); turnTo(pageIndex + layout.pagesPerView, 'next'); }
}

/** A narrower window may mean fewer cards to a page, which is a re-layout rather than a re-fit. */
function onResize() {
  const next = layoutFor(window.innerWidth);
  if (next.cols !== layout.cols || next.rows !== layout.rows || next.pagesPerView !== layout.pagesPerView) {
    layout = next;
    render();
  } else {
    fitSheet();
  }
}

/**
 * Open the Book in `hostEl`.
 * @param opts { rules, set, shelf?, profile?, onClose(), onLore?() }
 *   `set` is the collection, indexed or raw: cards are read straight out of it, so whatever the
 *   game can play, the Book can show. `shelf` is the same collection as it is written on disk.
 *   `onLore`, when the caller has a Lore Directory to open, puts a button for it in the toolbar.
 */
export function openBook(hostEl, opts) {
  closeBook();
  host = hostEl;
  ctx = {
    rules: opts.rules,
    set: opts.set,
    cards: (opts.set.cards || []).slice(),
    shelf: opts.shelf || opts.set,
    // The Mayor whose collection is being read. Without one the Book shows the whole set unlocked,
    // which is what it did before there were Mayors and what the Full Art gallery still wants.
    profile: opts.profile || null,
    onClose: () => { closeBook(); if (opts.onClose) opts.onClose(); },
    onLore: typeof opts.onLore === 'function' ? opts.onLore : null,
  };
  setPreviewContext(opts.rules, opts.set);
  filter = { type: 'all', species: null, study: null, rarity: null, version: 'any', text: '' };
  sort = 'type';
  pageIndex = 0;
  filtersOpen = false;
  chosenVersion.clear();
  layout = layoutFor(window.innerWidth);
  keyHandler = onKey;
  resizeHandler = onResize;
  window.addEventListener('keydown', keyHandler);
  window.addEventListener('resize', resizeHandler);
  render();
}

/** Shut the Book: the page-turn keys and the sheet-fitting belong to it and go with it. */
export function closeBook() {
  if (keyHandler) window.removeEventListener('keydown', keyHandler);
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  keyHandler = null;
  resizeHandler = null;
}
