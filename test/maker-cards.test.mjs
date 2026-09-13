// The remade collection: the Maker card set and the Character index the Deck Workshop sorts by.
//
// Two promises are tested here. The Maker set stays a well-formed, separate shelf that the game
// never draws from, and a Maker card's `remakes` link keeps pointing at a printed card's id — the
// tie that survives a rename.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SET } from './helpers.mjs';
import { characterIndex, groupByCharacter, characterOf, isCharacterCard } from '../src/engine/characters.js';

const MAKER = JSON.parse(fs.readFileSync(new URL('../spec/maker_card_set.json', import.meta.url), 'utf8'));
const printedById = Object.fromEntries(SET.cards.map((c) => [c.id, c]));

test('the maker set is a separate, non-playable shelf', () => {
  assert.equal(MAKER.setId, 'AF-MAKER-01');
  assert.equal(MAKER.playable, false);
  assert.ok(Array.isArray(MAKER.cards), 'maker cards must be a list');
  assert.deepEqual(MAKER.decks, [], 'no deck may be built out of maker cards yet');
  // No maker card may share an id with a printed one: ids are how a remake points at its original.
  for (const card of MAKER.cards) {
    assert.ok(!printedById[card.id], `maker card ${card.id} collides with a printed card id`);
  }
});

test('every maker card remakes printed cards that exist', () => {
  for (const card of MAKER.cards) {
    assert.ok(card.id && card.name && card.type, `maker card needs id, name and type: ${JSON.stringify(card)}`);
    const claims = [].concat(card.remakes || []);
    for (const id of claims) {
      assert.ok(printedById[id], `maker card ${card.id} remakes unknown printed card ${id}`);
    }
    // One printed card is remade once: two maker cards claiming the same original would make
    // the tick list ambiguous.
    const others = MAKER.cards.filter((c) => c !== card);
    for (const id of claims) {
      const clash = others.find((c) => [].concat(c.remakes || []).includes(id));
      assert.ok(!clash, `${card.id} and ${clash && clash.id} both remake ${id}`);
    }
  }
});

test('every remade character is well formed and accounts for its printed versions', () => {
  const entries = MAKER.characters || [];
  assert.ok(Array.isArray(entries), 'the maker set needs a characters list');
  const names = entries.map((c) => c.name);
  assert.equal(new Set(names).size, names.length, 'a character is remade once');
  for (const entry of entries) {
    for (const field of ['name', 'species', 'backstory']) {
      assert.ok(entry[field], `character entry ${entry.name || '?'} needs ${field}`);
    }
    // Species is fixed: a remade character keeps the species its printed versions had.
    const printed = SET.cards.filter((c) => c.name === entry.name && (c.type === 'character' || c.type === 'marketCharacter'));
    if (printed.length) {
      assert.equal(entry.species, printed[0].species, `${entry.name} changed species`);
    }
    const retired = (entry.retires || []).map((r) => (typeof r === 'string' ? r : r.id));
    for (const r of entry.retires || []) {
      if (typeof r !== 'string') assert.ok(r.why, `${entry.name} retires ${r.id} with no reason`);
    }
    for (const id of retired) {
      assert.ok(printedById[id], `${entry.name} retires unknown printed card ${id}`);
      const claim = MAKER.cards.find((c) => [].concat(c.remakes || []).includes(id));
      assert.ok(!claim, `${entry.name} retires ${id}, but ${claim && claim.id} also remakes it`);
    }
    // The promise of the process: once a character is remade, no printed version is left silent.
    const claimed = new Set(MAKER.cards.flatMap((c) => [].concat(c.remakes || [])));
    for (const def of printed) {
      assert.ok(
        claimed.has(def.id) || retired.includes(def.id),
        `${entry.name} is remade but printed version ${def.id} is neither remade nor retired`,
      );
    }
  }
});

test('the printed set is unaffected by the maker shelf', () => {
  // The game's own decks still resolve entirely out of the printed set.
  for (const deck of SET.decks) {
    for (const id of Object.keys(deck.list)) assert.ok(printedById[id], `deck ${deck.id} names ${id}`);
  }
});

test('characterIndex gathers every version of a named Character', () => {
  const index = characterIndex(SET);
  assert.ok(index.length > 0);
  const byName = Object.fromEntries(index.map((c) => [c.name, c]));
  const printedCharacters = SET.cards.filter(isCharacterCard);
  const counted = index.reduce((a, c) => a + c.versions.length, 0);
  assert.equal(counted, printedCharacters.length, 'every Character card belongs to exactly one Character');
  for (const entry of index) {
    // Versions read cheapest first, and all share the Character's name.
    const costs = entry.versions.map((v) => v.cost || 0);
    assert.deepEqual(costs, [...costs].sort((a, b) => a - b));
    for (const v of entry.versions) assert.equal(v.name, entry.name);
  }
  // An Event that names a Character files with them (spec: requires: [{ name }]).
  const clover = byName.Clover;
  assert.ok(clover && clover.versions.length > 1, 'Clover has several versions');
  assert.ok(clover.events.some((e) => characterOf(e) === 'Clover'));
});

test('groupByCharacter puts a Character’s versions in one run', () => {
  const pool = SET.cards.filter((c) => c.type === 'character' || c.type === 'event');
  const groups = groupByCharacter(pool);
  const names = groups.map((g) => g.name);
  assert.deepEqual(names.filter(Boolean), [...names.filter(Boolean)].sort((a, b) => a.localeCompare(b)));
  assert.equal(new Set(names).size, names.length, 'a Character gets exactly one group');
  const total = groups.reduce((a, g) => a + g.cards.length, 0);
  assert.equal(total, pool.length, 'no card is lost or duplicated by grouping');
  // Events with no named Character land in the final, unnamed group.
  const last = groups[groups.length - 1];
  if (last.name === null) for (const def of last.cards) assert.equal(characterOf(def), null);
});
