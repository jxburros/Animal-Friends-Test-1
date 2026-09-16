// Where a Mayor is kept: the two storage keys, bringing old Workshop decks across, and what
// happens in a browser that refuses to remember anything.
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SET } from './helpers.mjs';

/** A localStorage good enough to test against, installed before the store is ever imported. */
function fakeStorage({ refuse = false } = {}) {
  const map = new Map();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { if (refuse) throw new Error('storage refused'); map.set(k, String(v)); },
    removeItem: (k) => map.delete(k),
  };
}

globalThis.localStorage = fakeStorage();
const store = await import('../src/ui/store.js');
const { ownedCopies, hasDeck } = await import('../src/engine/profile.js');
const PROGRESSION = JSON.parse(fs.readFileSync(new URL('../spec/progression.json', import.meta.url), 'utf8'));
const STARTER = 'mk-cache-kitchen';

beforeEach(() => {
  globalThis.localStorage = fakeStorage();
  store.forgetEverything();
});

describe('the shelf of Mayors', () => {
  test('a Mayor made here is saved, made active, and found again', () => {
    const made = store.createMayor({ name: 'Wren', starterDeckId: STARTER }, SET, PROGRESSION);
    assert.equal(store.listProfiles().length, 1);
    assert.equal(store.activeProfile().id, made.id);
    assert.ok(hasDeck(store.getProfile(made.id), STARTER));
  });

  test('several Mayors live side by side, and switching between them changes nothing else', () => {
    const a = store.createMayor({ name: 'Wren', starterDeckId: STARTER }, SET, PROGRESSION);
    const b = store.createMayor({ name: 'Hazel', starterDeckId: 'mk-dome-dusk' }, SET, PROGRESSION);
    assert.equal(store.listProfiles().length, 2);
    assert.equal(store.activeProfile().id, b.id);
    store.setActiveProfile(a.id);
    assert.equal(store.activeProfile().name, 'Wren');
    assert.ok(hasDeck(store.getProfile(b.id), 'mk-dome-dusk'), "and Hazel's deck is still Hazel's");
    assert.equal(hasDeck(store.getProfile(a.id), 'mk-dome-dusk'), false);
  });

  test('deleting the Mayor in play hands play to another rather than to nobody', () => {
    const a = store.createMayor({ name: 'Wren', starterDeckId: STARTER }, SET, PROGRESSION);
    const b = store.createMayor({ name: 'Hazel', starterDeckId: STARTER }, SET, PROGRESSION);
    store.setActiveProfile(b.id);
    store.deleteProfile(b.id);
    assert.equal(store.listProfiles().length, 1);
    assert.equal(store.activeProfile().id, a.id);
  });
});

describe('what actually reaches storage', () => {
  test('progress is written under af-profiles, and the Mayor in play under af-active-profile', () => {
    const made = store.createMayor({ name: 'Wren', starterDeckId: STARTER }, SET, PROGRESSION);
    const raw = globalThis.localStorage.getItem('af-profiles');
    assert.ok(raw, 'the Mayors are written as one JSON array');
    assert.equal(JSON.parse(raw).length, 1);
    assert.equal(globalThis.localStorage.getItem('af-active-profile'), made.id);
  });

  test('a Mayor survives the browser closing: a fresh read finds them intact', async () => {
    const made = store.createMayor({ name: 'Wren', starterDeckId: STARTER }, SET, PROGRESSION);
    const card = Object.keys(SET.decks.find((d) => d.id === STARTER).list)[0];
    const held = ownedCopies(store.getProfile(made.id), card);

    // A new page load: the same storage, a store that has never read it.
    const saved = globalThis.localStorage.map;
    const fresh = await import(`../src/ui/store.js?reload=${Date.now()}`);
    globalThis.localStorage = { ...fakeStorage(), map: saved, getItem: (k) => (saved.has(k) ? saved.get(k) : null), setItem: (k, v) => saved.set(k, String(v)) };

    assert.equal(fresh.listProfiles().length, 1);
    assert.equal(fresh.activeProfile().name, 'Wren');
    assert.equal(ownedCopies(fresh.activeProfile(), card), held, 'and the collection came back with them');
  });

  test('damaged storage opens the game on an empty shelf rather than refusing to open at all', async () => {
    globalThis.localStorage.setItem('af-profiles', '{not json at all');
    const fresh = await import(`../src/ui/store.js?broken=${Date.now()}`);
    assert.deepEqual(fresh.listProfiles(), []);
  });
});

describe('a browser that will not remember', () => {
  test('the session still plays, and the game can say it will not be remembered', async () => {
    globalThis.localStorage = fakeStorage({ refuse: true });
    const fresh = await import(`../src/ui/store.js?private=${Date.now()}`);
    const made = fresh.createMayor({ name: 'Wren', starterDeckId: STARTER }, SET, PROGRESSION);
    assert.equal(fresh.activeProfile().id, made.id, 'the Mayor is live in memory');
    assert.ok(hasDeck(fresh.activeProfile(), STARTER), 'and has their deck');
    assert.equal(fresh.isRemembering(), false, 'but the game knows none of it is being written');
  });
});

describe('decks built before there were Mayors', () => {
  const legacy = [{ id: 'old-1', name: 'My first deck', list: { [Object.keys(SET.decks[0].list)[0]]: 2 } }];

  test('are brought across into the first Mayor, and the old key is left where it is', () => {
    globalThis.localStorage.setItem('af-custom-decks-maker', JSON.stringify(legacy));
    assert.ok(store.hasLegacyDecks());
    const made = store.createMayor({ name: 'Wren', starterDeckId: STARTER }, SET, PROGRESSION);
    assert.equal(made.customDecks.length, 1);
    assert.equal(made.customDecks[0].name, 'My first deck');
    assert.ok(made.customDecks[0].broughtAcross);
    assert.ok(globalThis.localStorage.getItem('af-custom-decks-maker'), 'an older build still finds its decks');
  });

  test('are brought across once, not into every Mayor made afterwards', () => {
    globalThis.localStorage.setItem('af-custom-decks-maker', JSON.stringify(legacy));
    store.createMayor({ name: 'Wren', starterDeckId: STARTER }, SET, PROGRESSION);
    const second = store.createMayor({ name: 'Hazel', starterDeckId: STARTER }, SET, PROGRESSION);
    assert.deepEqual(second.customDecks, []);
  });

  test('a deck naming cards this collection does not have is left behind', () => {
    globalThis.localStorage.setItem('af-custom-decks-maker', JSON.stringify([{ id: 'x', name: 'Stale', list: { not_a_card: 2 } }]));
    const made = store.createMayor({ name: 'Wren', starterDeckId: STARTER }, SET, PROGRESSION);
    assert.deepEqual(made.customDecks, []);
  });
});

describe('the Sandbox Mayor', () => {
  test('is made once and found thereafter, and never becomes a second one', () => {
    const first = store.sandboxMayor(SET, PROGRESSION);
    const again = store.sandboxMayor(SET, PROGRESSION);
    assert.equal(first.id, again.id);
    assert.equal(store.listProfiles().filter((p) => p.sandbox).length, 1);
  });

  test('comes back from storage still owning everything, purse and all', async () => {
    store.sandboxMayor(SET, PROGRESSION);
    const saved = globalThis.localStorage.map;
    const fresh = await import(`../src/ui/store.js?sandbox=${Date.now()}`);
    globalThis.localStorage = { ...fakeStorage(), map: saved, getItem: (k) => (saved.has(k) ? saved.get(k) : null), setItem: (k, v) => saved.set(k, String(v)) };
    const box = fresh.listProfiles().find((p) => p.sandbox);
    assert.ok(box);
    assert.equal(box.coins, Infinity, 'JSON writes Infinity as null; it is put back on the way in');
    assert.equal(ownedCopies(box, SET.cards[0].id), Infinity);
  });
});
