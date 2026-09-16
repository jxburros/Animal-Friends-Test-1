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

test('the town decks are different towns, and every card in them is playable', () => {
  const byId = Object.fromEntries(SET.cards.map((c) => [c.id, c]));
  // Not a fixed count any more: the roster is built from a list of identities in
  // scripts/build-decks.mjs and grew from six to fifteen in one pass, so what is worth holding the
  // decks to is the properties below — every species and every study has a deck written for it, no
  // deck holds an Event it can never pay for, and they are not all the same forty cards.
  assert.ok(SET.decks.length >= 6, 'enough decks to choose between');
  const species = new Set();
  const studies = new Set();
  const everywhere = new Set();
  for (const deck of SET.decks) {
    const held = Object.entries(deck.list).map(([id, n]) => ({ card: byId[id], n }));
    for (const { card } of held) everywhere.add(card.id);
    for (const s of deck.species) species.add(s);
    for (const s of deck.studies) studies.add(s);
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
  assert.ok(everywhere.size > 40 * 2, 'the decks are not all the same forty cards');
});

test('a game plays through to a Statue victory', async () => {
  // Random play is already the slowest-converging case; Building upkeep stretches it further, so
  // this smoke test (does the engine reach a Statue win, not how fast) gets a taller cap than real
  // play needs.
  //
  // It is a rate across several seeds rather than two named ones. Two random agents can play each
  // other down to two empty decks and two empty towns, and a game that has run out of animals can
  // no longer announce, bid or buy the fifth monument — it simply plays out to the turn limit and
  // is decided on the tiebreak. That is a real property of random play and it happens on a seed or
  // two in ten; pinning the test to particular seeds made it a test of the shuffle, so that adding
  // or removing any card anywhere moved the deal and failed a seed for no reason anybody could act
  // on. What the collection actually has to be is playable, which is what a rate says.
  const seeds = [1, 3, 5, 7, 9, 11];
  const results = [];
  for (const seed of seeds) {
    const state = createGame(RULES, SET, { seed, decks: SET.decks.slice(0, 2).map((d) => d.id) });
    await playGame(state, [makeRandomAgent(seed), makeRandomAgent(seed + 1)], { maxTurnsPerPlayer: 150 });
    assert.notEqual(state.winner, null, `seed ${seed} ended with no winner at all`);
    results.push(state.result);
  }
  const statues = results.filter((r) => r === 'statues').length;
  assert.ok(statues >= seeds.length - 1,
    `only ${statues} of ${seeds.length} random games reached a Statue victory: ${results.join(', ')}`);
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
      // A fee is Supply handed over to use the ability, and only a Busy ability is ever used: a
      // trigger that fires on its own has nobody to ask for the money.
      if (ab.cost !== undefined) {
        assert.equal(ab.trigger, 'busy', `${card.id}: only a Busy ability may charge a fee`);
        assert.deepEqual(Object.keys(ab.cost), ['supply'], `${card.id}: a fee is paid in Supply and nothing else`);
        assert.ok(Number.isInteger(ab.cost.supply) && ab.cost.supply > 0, `${card.id}: a fee of ${ab.cost.supply} is not a price`);
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


/**
 * The vocabulary is a two-way contract. A name the engine interprets that no card ever says is a
 * verb built for nothing — the collection carried ten of them at once before the fifth round — and
 * it is exactly the kind of thing that goes unnoticed, because nothing fails when a card set simply
 * declines to use a feature. So: every effect, trigger, mod key, condition, passive and Capital City
 * rule the engine reads is spoken by at least one card here, and the newer ones by two, which is the
 * number that says a verb is a design space rather than a single card's private machinery.
 */
function vocabularySpoken() {
  const spoken = { effect: new Map(), trigger: new Map(), mod: new Map(), condition: new Map(), passive: new Map(), city: new Map() };
  const note = (kind, name, cardId) => {
    if (!name) return;
    if (!spoken[kind].has(name)) spoken[kind].set(name, new Set());
    spoken[kind].get(name).add(cardId);
  };
  const walk = (eff, cardId) => {
    if (!eff || typeof eff !== 'object') return;
    if (eff.do) {
      note('effect', eff.do, cardId);
      if (eff.do === 'addMod') note('mod', eff.key, cardId);
    }
    for (const value of Object.values(eff)) {
      if (Array.isArray(value)) value.forEach((v) => walk(v, cardId));
      else if (value && typeof value === 'object') walk(value, cardId);
    }
  };
  for (const card of SET.cards) {
    for (const key of ['effect', 'onGain', 'onReveal']) walk(card[key], card.id);
    for (const ab of card.abilities || []) {
      note('trigger', ab.trigger, card.id);
      if (ab.trigger === 'passive') note('passive', ab.key, card.id);
      if (ab.trigger === 'displayed') note('city', ab.key, card.id);
      for (const cond of Object.keys(ab.condition || {})) note('condition', cond, card.id);
      walk(ab.effect, card.id);
    }
  }
  return spoken;
}

test('every name the engine interprets is spoken by a card', () => {
  const spoken = vocabularySpoken();
  const unspoken = [];
  for (const [kind, vocabulary] of [['effect', EFFECTS], ['trigger', TRIGGERS], ['mod', MOD_KEYS],
    ['condition', CONDITIONS], ['passive', PASSIVE_KEYS], ['city', CITY_RULE_KEYS]]) {
    for (const name of vocabulary) if (!spoken[kind].has(name)) unspoken.push(`${kind}:${name}`);
  }
  assert.deepEqual(unspoken, [], 'a verb no card says is a verb built for nothing');
});

test('the Capital City rules and the newest verbs each have a design space, not one card', () => {
  const spoken = vocabularySpoken();
  // An Ordinance is the one card type that changes the rules of the room, so every rule it can
  // change is printed twice — once in each direction where the rule has one.
  for (const rule of CITY_RULE_KEYS) {
    assert.ok((spoken.city.get(rule) || new Set()).size >= 2,
      `${rule} is a Capital City rule printed on fewer than two Ordinances`);
  }
  for (const name of ['unchallengeable', 'skipNextAdvance']) {
    assert.ok((spoken.mod.get(name) || new Set()).size >= 2, `${name} is on fewer than two cards`);
  }
  for (const name of ['onlyUprightOfSpecies', 'buildingsAtLeast']) {
    assert.ok((spoken.condition.get(name) || new Set()).size >= 2, `${name} is on fewer than two cards`);
  }
  for (const name of ['onShiftStarted', 'onCharacterUnemployed']) {
    assert.ok((spoken.trigger.get(name) || new Set()).size >= 2, `${name} is on fewer than two cards`);
  }
  for (const name of ['rehireFromAnywhere', 'searchDeck', 'allCharactersToUnemployment']) {
    assert.ok((spoken.effect.get(name) || new Set()).size >= 2, `${name} is on fewer than two cards`);
  }
});
