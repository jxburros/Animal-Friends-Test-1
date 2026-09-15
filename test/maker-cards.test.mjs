// The collection as a body of writing: every card stays inside the vocabulary the engine
// interprets, every named character has an entry behind them, and the Character index the Deck
// Workshop and the Book sort by gathers every version of a name into one run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES, SET } from './helpers.mjs';
import { createGame, playGame, deckProblems } from '../src/engine/index.js';
import { makeRandomAgent } from '../src/ai/random.js';
import { characterIndex, groupByCharacter, characterOf, isCharacterCard } from '../src/engine/characters.js';
import { EFFECTS, TRIGGERS, MOD_KEYS, MOD_FILTER_KEYS, CONDITIONS, PASSIVE_KEYS, CITY_RULE_KEYS } from './card-vocabulary.mjs';

const STUDIES = new Set(SET.studies);
const SPECIES = new Set(SET.species);

function walkEffect(eff, where) {
  assert.ok(eff && eff.do, `${where}: effect with no "do"`);
  assert.ok(EFFECTS.has(eff.do), `${where}: unknown effect "${eff.do}" — the engine does not interpret it`);
  if (eff.do === 'seq') {
    assert.ok(Array.isArray(eff.steps) && eff.steps.length, `${where}: seq with no steps`);
    eff.steps.forEach((st, i) => walkEffect(st, `${where}.steps[${i}]`));
  }
  if (eff.do === 'addMod') {
    assert.ok(MOD_KEYS.has(eff.key), `${where}: unknown mod key "${eff.key}"`);
    // A filter narrows what a mod applies to; a key the engine does not read is a mod that quietly
    // applies to everything, which is the opposite of what the card says.
    for (const key of Object.keys(eff.filter || {})) {
      assert.ok(MOD_FILTER_KEYS.has(key), `${where}: unknown mod filter key "${key}"`);
    }
  }
  // `then` is the rider a recruit arrives with; a typo in it is as broken as a typo anywhere else.
  if (eff.then) walkEffect(eff.then, `${where}.then`);
}

test('the collection is complete enough to be played', () => {
  assert.equal(SET.setId, 'AF-MAKER-01');
  assert.ok(SET.cards.length, 'cards to play with');
  assert.ok(SET.decks.length >= 2, 'at least two decks to play against each other');
  assert.ok(SET.marketDecks.length >= 1, 'a Capital City to fight over');
  const ids = new Set(SET.cards.map((c) => c.id));
  for (const deck of SET.decks) {
    assert.deepEqual(deckProblems(RULES, SET, deck.list), [], deck.id);
    for (const id of Object.keys(deck.list)) assert.ok(ids.has(id), `${deck.id} holds ${id}, which is not a card in this set`);
  }
});

test('the six town decks are six different towns, and every card in them is playable', () => {
  const byId = Object.fromEntries(SET.cards.map((c) => [c.id, c]));
  assert.equal(SET.decks.length, 6, 'six decks ship with the game');
  const species = new Set();
  const studies = new Set();
  const everywhere = new Set();
  for (const deck of SET.decks) {
    const held = Object.entries(deck.list).map(([id, n]) => ({ card: byId[id], n }));
    for (const { card } of held) everywhere.add(card.id);
    for (const s of deck.species) species.add(s);
    for (const s of deck.studies) studies.add(s);
    // A deck is built as singletons with a second copy of what leads each band, so a deck that has
    // collapsed back onto four-of-a-kind is a bug in scripts/build-decks.mjs, not a style choice.
    assert.ok(Object.keys(deck.list).length >= 24, `${deck.id} holds only ${Object.keys(deck.list).length} distinct cards`);
    // An Event names the animal it needs. A deck holding one it cannot field is holding a dead card.
    const bodies = (req) => held.reduce((a, { card, n }) => {
      if (card.type !== 'character') return a;
      if (req.name) return a + (card.name === req.name ? n : 0);
      if (req.species && card.species !== req.species) return a;
      if (req.study && card.study !== req.study) return a;
      return a + n;
    }, 0);
    for (const { card } of held) {
      for (const r of (card.type === 'event' && card.requires) || []) {
        assert.ok(bodies(r) >= (r.count || 1), `${deck.id} holds ${card.name}, which it can never pay for`);
      }
    }
  }
  assert.equal(species.size, SET.species.length, 'every species is somebody\'s deck');
  assert.equal(studies.size, SET.studies.length, 'every study is somebody\'s deck');
  // The point of building the six together: they are filled out of what the others left.
  assert.ok(everywhere.size >= 120, `the six decks show only ${everywhere.size} distinct cards`);
});

test('a game plays through to a Statue victory', async () => {
  for (const seed of [3, 11]) {
    const state = createGame(RULES, SET, { seed, decks: SET.decks.slice(0, 2).map((d) => d.id) });
    await playGame(state, [makeRandomAgent(seed), makeRandomAgent(seed + 1)]);
    assert.notEqual(state.winner, null, `seed ${seed} ended with no winner`);
    assert.equal(state.result, 'statues', `seed ${seed} did not end on Statues`);
  }
});

test('every card stays inside the vocabulary the engine interprets', () => {
  for (const card of SET.cards) {
    assert.ok(card.id && card.name && card.type, `a card needs id, name and type: ${JSON.stringify(card)}`);
    if (card.species) assert.ok(SPECIES.has(card.species), `${card.id}: undeclared species ${card.species}`);
    if (card.study) assert.ok(STUDIES.has(card.study), `${card.id}: undeclared study ${card.study}`);
    if (card.type === 'character') {
      assert.ok(card.shift && card.shift.delay >= 1 && card.shift.output >= 0, `${card.id}: a Character needs a shift`);
      assert.ok(card.cost >= 0 && card.cost <= 5, `${card.id}: cost ${card.cost} is outside 0-5`);
    }
    for (const r of card.requires || []) {
      if (r.study) assert.ok(STUDIES.has(r.study), `${card.id}: requires undeclared study ${r.study}`);
      if (r.species) assert.ok(SPECIES.has(r.species), `${card.id}: requires undeclared species ${r.species}`);
    }
    for (const ab of card.abilities || []) {
      assert.ok(TRIGGERS.has(ab.trigger), `${card.id}: unknown trigger "${ab.trigger}"`);
      for (const key of Object.keys(ab.condition || {})) {
        assert.ok(CONDITIONS.has(key), `${card.id}: unknown condition "${key}"`);
      }
      // A passive is a standing rule named by `key`, not an effect that runs; a `displayed` ability
      // is a rule the Capital City applies while the card sits in the display, named the same way.
      if (ab.trigger === 'passive') {
        assert.ok(PASSIVE_KEYS.has(ab.key), `${card.id}: unknown passive key "${ab.key}"`);
        continue;
      }
      if (ab.trigger === 'displayed') {
        assert.ok(CITY_RULE_KEYS.has(ab.key), `${card.id}: unknown Capital City rule "${ab.key}"`);
        assert.ok(['ordinance', 'marketCharacter'].includes(card.type), `${card.id}: a ${card.type} is never displayed, so its displayed ability would be read by nothing`);
        continue;
      }
      walkEffect(ab.effect, `${card.id}.abilities`);
    }
    if (card.effect) walkEffect(card.effect, `${card.id}.effect`);
    assert.ok(card.flavor, `${card.id}: every card carries flavor that references the backstory`);
  }
});

test('every named character has an entry, and every entry has cards', () => {
  const entries = SET.characters || [];
  assert.ok(Array.isArray(entries) && entries.length, 'the set needs a characters list');
  const names = entries.map((c) => c.name);
  assert.equal(new Set(names).size, names.length, 'a character is written once');
  for (const entry of entries) {
    for (const field of ['name', 'species', 'pronouns', 'backstory', 'voice', 'arc']) {
      assert.ok(entry[field], `character entry ${entry.name || '?'} needs ${field}`);
    }
    const cards = SET.cards.filter((c) => isCharacterCard(c) && c.name === entry.name);
    assert.ok(cards.length, `${entry.name} has an entry but no cards`);
    // Species is fixed: every version of a character is the same animal.
    for (const def of cards) assert.equal(def.species, entry.species, `${def.id} is a ${def.species}, ${entry.name} is a ${entry.species}`);
  }
  // And the other way round: a Character card with nobody behind it has no story to read in the Book.
  const written = new Set(names);
  for (const def of SET.cards.filter(isCharacterCard)) {
    assert.ok(written.has(def.name), `${def.id} is a card for ${def.name}, who has no character entry`);
  }
});

test('characterIndex gathers every version of a named Character', () => {
  const index = characterIndex(SET);
  assert.ok(index.length > 0);
  const byName = Object.fromEntries(index.map((c) => [c.name, c]));
  const characters = SET.cards.filter(isCharacterCard);
  const counted = index.reduce((a, c) => a + c.versions.length, 0);
  assert.equal(counted, characters.length, 'every Character card belongs to exactly one Character');
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
