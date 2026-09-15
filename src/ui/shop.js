// The Post Office: sealed packs, coins, and the decks still to be opened.
//
// Opening a pack is the one place a collection grows on purpose, so it is given a moment of its
// own: the twelve cards are laid out face down and turned over one at a time, and a card in a
// printing the Mayor has never held is marked as new. The draw itself is engine/boosterPack.js —
// pure, seeded and already tested — so nothing about what a pack contains is decided here.
import { openPack } from './boosterPack.js';
import {
  progressionRules, grantPack, autoUnlockDecks, buyPack, buyDeck, takePack, deckCoverage,
  hasDeck, ownedCopies, collectionSize, canAfford,
} from '../engine/profile.js';
import { saveProfile } from './store.js';
import { buildCardFace, setPreviewContext } from './render.js';
import { iconSVG } from './art.js';

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

let host = null;
let ctx = null; // { rules, set, progression, profile, onClose, onChange }
let opening = null; // the pack being turned over: { draws, turned }

function pr() {
  return progressionRules(ctx.progression);
}
function changed() {
  saveProfile(ctx.profile);
  if (ctx.onChange) ctx.onChange(ctx.profile);
}

// ---------- opening a pack ----------

/** Draw a pack, put it in the collection, and lay it out to be turned over. */
function openOne() {
  const profile = ctx.profile;
  if (!takePack(profile)) return;
  // Only cards a pack can actually contain: the deck-legal types, which is what the set's rarities
  // are printed on. Tokens and Capital City stock are not collected.
  const pool = ctx.set.cards.filter((c) => c.rarity && ['character', 'event', 'townBuilding'].includes(c.type));
  const draws = grantPack(profile, openPack(pool, { seed: Math.floor(Math.random() * 2 ** 31) }));
  const opened = autoUnlockDecks(profile, ctx.set, ctx.progression);
  opening = { draws, turned: new Set(), opened };
  changed();
  render();
}

function renderOpening() {
  const { draws, turned, opened } = opening;
  const box = h('div', { class: 'pack-open' });
  box.appendChild(h('div', { class: 'mayors-head' }, [
    h('h2', {}, 'A pack, opened'),
    h('p', { class: 'hint' }, turned.size < draws.length
      ? 'Turn them over.'
      : 'All twelve are yours. They are in the collection already — the Workshop and the Book have them now.'),
  ]));

  const grid = h('div', { class: 'pack-grid' });
  draws.forEach((draw, i) => {
    const def = ctx.set.cardsById[draw.cardId];
    const isTurned = turned.has(i);
    const slot = h('button', {
      type: 'button',
      class: `pack-slot${isTurned ? ' turned' : ''}${draw.isNew ? ' is-new' : ''}${i === draws.length - 1 ? ' hit' : ''}`,
      title: isTurned ? def.name : 'Turn it over',
      onclick: () => { turned.add(i); render(); },
    });
    if (isTurned) {
      slot.appendChild(buildCardFace(def, { interactive: false, foilInteractive: false, version: draw.printing }));
      if (draw.isNew) slot.appendChild(h('span', { class: 'new-flag' }, 'New'));
    } else {
      slot.appendChild(h('div', { class: 'pack-back' }, [h('span', {}, '❦')]));
    }
    grid.appendChild(slot);
  });
  box.appendChild(grid);

  const foot = h('div', { class: 'mayors-foot' });
  if (turned.size < draws.length) {
    foot.appendChild(h('button', {
      type: 'button',
      onclick: () => { draws.forEach((_, i) => turned.add(i)); render(); },
    }, 'Turn them all over'));
  }
  if (opened.length) {
    const names = opened.map((id) => ctx.set.decksById[id].name).join(', ');
    box.appendChild(h('p', { class: 'unlock-note' }, `That pack finished a deck: ${names} ${opened.length === 1 ? 'is' : 'are'} yours, and the rest of the list came with it.`));
  }
  foot.appendChild(h('button', {
    type: 'button',
    class: 'primary',
    onclick: () => { opening = null; render(); },
  }, 'Back to the Post Office'));
  box.appendChild(foot);
  return box;
}

// ---------- the shop ----------

function renderShop() {
  const profile = ctx.profile;
  const rules = pr();
  const box = h('div', { class: 'shop' });

  box.appendChild(h('div', { class: 'mayors-head' }, [
    h('h2', {}, 'The Post Office'),
    h('p', { class: 'hint' }, profile.sandbox
      ? 'The Sandbox Mayor owns the whole set already. Nothing here is needed — open a pack if you want to watch one open.'
      : 'Packs bring cards. Cards fill decks. A deck nearly filled opens by itself.'),
  ]));

  box.appendChild(h('div', { class: 'purse-bar' }, [
    h('span', { class: 'purse-coin big-coin' }, [icon('supply'), profile.sandbox ? '∞' : String(profile.coins)]),
    h('span', {}, `${profile.sandbox ? '∞' : profile.packs} sealed pack${profile.packs === 1 && !profile.sandbox ? '' : 's'}`),
    h('span', {}, `${collectionSize(profile)} of ${ctx.set.cards.length} cards`),
  ]));

  const buttons = h('div', { class: 'shop-actions' });
  const openBtn = h('button', { type: 'button', class: 'primary big', onclick: openOne }, 'Open a pack');
  openBtn.disabled = !profile.sandbox && profile.packs <= 0;
  buttons.appendChild(openBtn);
  const buyBtn = h('button', {
    type: 'button',
    onclick: () => { if (buyPack(profile, ctx.progression)) { changed(); render(); } },
  }, `Buy a pack — ${rules.packPrice}`);
  buyBtn.disabled = profile.sandbox || !canAfford(profile, rules.packPrice);
  buttons.appendChild(buyBtn);
  box.appendChild(buttons);

  box.appendChild(h('h3', { class: 'section-head' }, 'Decks'));
  box.appendChild(h('p', { class: 'hint' }, `A deck comes with its whole list. Buy one outright, or collect ${Math.round(rules.deckCoverage * 100)}% of it from packs and the rest is given to you.`));

  const decks = h('div', { class: 'deck-choice shop-decks' });
  for (const deck of ctx.set.decks) {
    const owned = hasDeck(profile, deck.id);
    const coverage = deckCoverage(profile, ctx.set, deck.id);
    const row = h('div', { class: `deck-card shop-deck${owned ? ' owned' : ''}` }, [
      h('h4', {}, deck.name),
      h('p', {}, deck.blurb || ''),
    ]);
    if (owned) {
      row.appendChild(h('p', { class: 'deck-stat owned-flag' }, 'Yours'));
    } else {
      const bar = h('div', { class: 'coverage', title: `${Math.round(coverage * 100)}% of this deck collected` }, [
        h('div', { class: 'coverage-fill', style: `width:${Math.round(coverage * 100)}%` }),
      ]);
      row.appendChild(bar);
      row.appendChild(h('p', { class: 'deck-stat' }, `${Math.round(coverage * 100)}% collected`));
      const buy = h('button', {
        type: 'button',
        onclick: () => { if (buyDeck(profile, ctx.set, deck.id, ctx.progression)) { changed(); render(); } },
      }, `Buy — ${rules.deckPrice}`);
      buy.disabled = !canAfford(profile, rules.deckPrice);
      row.appendChild(buy);
    }
    decks.appendChild(row);
  }
  box.appendChild(decks);

  box.appendChild(h('div', { class: 'mayors-foot' }, [
    h('button', { type: 'button', onclick: () => ctx.onClose() }, '← Back'),
  ]));
  return box;
}

function render() {
  host.innerHTML = '';
  setPreviewContext(ctx.rules, ctx.set);
  host.appendChild(opening ? renderOpening() : renderShop());
}

/** Open the Post Office for one Mayor. */
export function openShop(hostEl, options) {
  host = hostEl;
  ctx = options;
  opening = null;
  render();
}

export { ownedCopies };
