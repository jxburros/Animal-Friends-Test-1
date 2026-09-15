// Who is playing: the shelf of Mayors, making a new one, and the card a Mayor is known by.
//
// This screen owns no progress of its own. It reads Mayors out of ui/store.js, changes them through
// engine/profile.js, and hands the chosen one back through `onPlay`. The rules about what a Mayor
// may own live in the engine; everything here is presentation.
import {
  listProfiles, createMayor, deleteProfile, setActiveProfile, sandboxMayor, saveProfile,
  isRemembering, hasLegacyDecks,
} from './store.js';
import {
  ownedCopies, collectionSize, unlockedDecks, setAvatar, renameProfile, owns, ownedPrintingsOf,
} from '../engine/profile.js';
import { buildCardFace, setPreviewContext } from './render.js';
import { versionsOf } from './versions.js';
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
let ctx = null; // { rules, set, progression, onPlay }
let view = 'picker'; // 'picker' | 'new' | 'avatar'
let draft = { name: '', deckId: null };
let avatarFor = null;

/** The portrait a Mayor is known by: their chosen card, shrunk, or a plain monogram. */
export function avatarNode(profile, set) {
  const def = profile.avatar && set.cardsById[profile.avatar.cardId];
  if (!def) {
    const initial = (profile.name || '?').trim().charAt(0).toUpperCase();
    return h('div', { class: 'mayor-portrait empty' }, [h('span', { class: 'monogram' }, initial)]);
  }
  const face = buildCardFace(def, { interactive: false, foilInteractive: false, version: profile.avatar.printing });
  return h('div', { class: 'mayor-portrait', title: def.name }, [h('div', { class: 'portrait-scale' }, [face])]);
}

/** One line of what a Mayor has done so far. */
function recordLine(profile) {
  if (profile.sandbox) return 'Everything unlocked · for testing';
  const { played, won } = profile.stats;
  const games = played ? `${won} won of ${played}` : 'no games yet';
  return `${collectionSize(profile)} cards · ${unlockedDecks(ctx.set, profile).length} decks · ${games}`;
}

function purseLine(profile) {
  if (profile.sandbox) return null;
  const bits = [h('span', { class: 'purse-coin' }, [icon('supply'), `${profile.coins}`])];
  if (profile.packs > 0) bits.push(h('span', { class: 'purse-packs' }, `${profile.packs} sealed pack${profile.packs === 1 ? '' : 's'}`));
  const unfinished = (profile.games || []).length;
  if (unfinished) bits.push(h('span', { class: 'purse-games' }, `${unfinished} game${unfinished === 1 ? '' : 's'} to finish`));
  return h('p', { class: 'mayor-purse' }, bits);
}

// ---------- the picker ----------

function renderPicker() {
  const mayors = listProfiles().filter((p) => !p.sandbox);
  const box = h('div', { class: 'mayors' });

  box.appendChild(h('div', { class: 'mayors-head' }, [
    h('h2', {}, mayors.length ? 'Who is playing?' : 'Welcome to the First Boroughs'),
    h('p', { class: 'hint' }, mayors.length
      ? 'Every Mayor keeps their own collection, their own decks and their own unfinished games.'
      : 'Choose a name and a deck to begin with. The deck you pick is the collection you start from — everything else is earned.'),
  ]));

  const shelf = h('div', { class: 'mayor-shelf' });
  for (const profile of mayors) {
    const card = h('button', {
      type: 'button',
      class: 'mayor-card',
      onclick: () => play(profile),
    }, [
      avatarNode(profile, ctx.set),
      h('div', { class: 'mayor-text' }, [
        h('h4', {}, profile.name),
        h('p', { class: 'mayor-record' }, recordLine(profile)),
        purseLine(profile),
      ]),
    ]);
    const remove = h('button', {
      type: 'button',
      class: 'mayor-forget',
      title: `Forget ${profile.name}`,
      'aria-label': `Forget ${profile.name}`,
      onclick: (e) => {
        e.stopPropagation();
        // eslint-disable-next-line no-alert
        if (!window.confirm(`Forget ${profile.name}? Their collection, decks and unfinished games all go with them. This cannot be undone.`)) return;
        deleteProfile(profile.id);
        render();
      },
    }, '×');
    shelf.appendChild(h('div', { class: 'mayor-slot' }, [card, remove]));
  }

  shelf.appendChild(h('button', {
    type: 'button',
    class: 'mayor-card new',
    onclick: () => { view = 'new'; draft = { name: '', deckId: ctx.set.decks[0].id }; render(); },
  }, [
    h('div', { class: 'mayor-portrait empty' }, [h('span', { class: 'monogram' }, '+')]),
    h('div', { class: 'mayor-text' }, [
      h('h4', {}, 'A new Mayor'),
      h('p', { class: 'mayor-record' }, 'Pick a name and a deck to start from.'),
    ]),
  ]));
  box.appendChild(shelf);

  box.appendChild(h('div', { class: 'mayors-foot' }, [
    h('button', {
      type: 'button',
      class: 'sandbox-link',
      title: 'Every card, every printing, every deck — for trying things out',
      onclick: () => play(sandboxMayor(ctx.set, ctx.progression)),
    }, 'Play with everything unlocked'),
    !isRemembering() ? h('p', { class: 'menu-note' }, 'This browser will not let the game save anything. You can play, but nothing will be here when you come back.') : null,
    hasLegacyDecks() && !mayors.length ? h('p', { class: 'hint' }, 'The decks you have already built will be brought across to your first Mayor.') : null,
  ]));

  return box;
}

// ---------- making one ----------

function renderNew() {
  const box = h('div', { class: 'mayors' });
  box.appendChild(h('div', { class: 'mayors-head' }, [
    h('h2', {}, 'A new Mayor'),
    h('p', { class: 'hint' }, 'Your name, and the deck you begin with. That deck’s cards are the whole of your collection to start — the rest of the set is earned by winning games and opening packs.'),
  ]));

  const nameField = h('input', {
    type: 'text',
    id: 'mayorName',
    class: 'seed-input mayor-name',
    maxlength: '24',
    placeholder: 'Your name',
    autocomplete: 'off',
    value: draft.name,
    oninput: (e) => { draft.name = e.target.value; begin.disabled = !e.target.value.trim(); },
  });
  box.appendChild(h('div', { class: 'menu-row' }, [h('label', { for: 'mayorName' }, 'Mayor'), nameField]));

  box.appendChild(h('h3', { class: 'section-head' }, 'The deck you start with'));
  const decks = h('div', { class: 'deck-choice' });
  for (const deck of ctx.set.decks) {
    const total = Object.values(deck.list).reduce((a, n) => a + n, 0);
    const card = h('button', {
      type: 'button',
      class: `deck-card${deck.id === draft.deckId ? ' selected' : ''}`,
      'aria-pressed': deck.id === draft.deckId ? 'true' : 'false',
      onclick: () => { draft.deckId = deck.id; render(); },
    }, [
      h('h4', {}, deck.name),
      h('p', {}, deck.blurb || ''),
      h('p', { class: 'deck-stat' }, `${total} cards · ${Object.keys(deck.list).length} different`),
    ]);
    decks.appendChild(card);
  }
  box.appendChild(decks);

  const begin = h('button', {
    type: 'button',
    class: 'primary big',
    onclick: () => {
      const profile = createMayor({ name: draft.name, starterDeckId: draft.deckId }, ctx.set, ctx.progression);
      view = 'picker';
      play(profile);
    },
  }, 'Begin');
  begin.disabled = !draft.name.trim();

  box.appendChild(h('div', { class: 'mayors-foot' }, [
    h('button', { type: 'button', onclick: () => { view = 'picker'; render(); } }, '← Back'),
    begin,
  ]));
  return box;
}

// ---------- the card a Mayor is known by ----------

/**
 * Choosing a portrait. Only cards the Mayor owns are offered, in only the printings they own them
 * in: a portrait is a thing earned, and a foil you pulled is worth showing off.
 */
function renderAvatar() {
  const profile = avatarFor;
  const box = h('div', { class: 'mayors' });
  box.appendChild(h('div', { class: 'mayors-head' }, [
    h('h2', {}, 'The card you are known by'),
    h('p', { class: 'hint' }, 'Any card in your collection, in any printing you have it in.'),
  ]));

  const grid = h('div', { class: 'avatar-grid' });
  // Tokens declare that a kind of token exists; nobody's portrait is one of those.
  const cards = ctx.set.cards
    .filter((c) => c.type !== 'token')
    .filter((c) => profile.sandbox || owns(profile, c.id));
  for (const def of cards) {
    const printings = profile.sandbox
      ? versionsOf(def).map((v) => v.key)
      : ownedPrintingsOf(profile, def.id).filter((key) => versionsOf(def).some((v) => v.key === key));
    for (const printing of (printings.length ? printings : ['regular'])) {
      const chosen = profile.avatar && profile.avatar.cardId === def.id && profile.avatar.printing === printing;
      grid.appendChild(h('button', {
        type: 'button',
        class: `avatar-pick${chosen ? ' selected' : ''}`,
        title: `${def.name} — ${printing}`,
        onclick: () => {
          setAvatar(profile, def.id, printing);
          saveProfile(profile);
          render();
        },
      }, [buildCardFace(def, { interactive: false, foilInteractive: false, version: printing })]));
    }
  }
  box.appendChild(grid);
  box.appendChild(h('div', { class: 'mayors-foot' }, [
    h('button', { type: 'button', onclick: () => { view = 'picker'; avatarFor = null; render(); } }, '← Done'),
  ]));
  return box;
}

/** Open the portrait chooser for one Mayor. */
export function chooseAvatar(hostEl, options, profile) {
  avatarFor = profile;
  view = 'avatar';
  openProfiles(hostEl, options);
}

// ---------- wiring ----------

function play(profile) {
  setActiveProfile(profile.id);
  ctx.onPlay(profile);
}

function render() {
  host.innerHTML = '';
  setPreviewContext(ctx.rules, ctx.set);
  if (view === 'new') host.appendChild(renderNew());
  else if (view === 'avatar' && avatarFor) host.appendChild(renderAvatar());
  else host.appendChild(renderPicker());
}

/** Open the shelf of Mayors. `onPlay(profile)` is called with whoever is chosen. */
export function openProfiles(hostEl, options) {
  host = hostEl;
  ctx = options;
  if (view !== 'avatar') view = 'picker';
  render();
}

/** Rename a Mayor in place, from wherever the app offers it. */
export function renameMayor(profile, name) {
  if (!renameProfile(profile, name)) return false;
  saveProfile(profile);
  return true;
}

/** How many copies of a card a Mayor holds — re-exported so the app has one import for the shelf. */
export { ownedCopies };
