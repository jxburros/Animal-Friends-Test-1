// The Lore Directory's text (spec/lore.json): shape, cross-references and unlock scaffolding.
// Every fact in that file is meant to come from docs/TOWN_BIBLE.md or from the cards themselves,
// so these tests check the machine-checkable half of that: that every card id, character name and
// place ref it uses actually resolves, that every Building and Town Building the set prints is
// written up somewhere, and that each entry is a self-contained unit with a unique id and an
// explicit unlock rule.
import fs from 'node:fs';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SET } from './helpers.mjs';

const LORE = JSON.parse(fs.readFileSync(new URL('../spec/lore.json', import.meta.url), 'utf8'));

const CARD_IDS = new Set(SET.cards.map((c) => c.id));
const CHARACTER_NAMES = new Set(SET.characters.map((c) => c.name));

const SETTING_KEYS = ['capital', 'boroughs'];

/** The un-prefixed slug of a place id: 'capital.place.the-observatory' -> 'the-observatory'. */
function placeSlug(id) {
  return id.split('.').slice(2).join('.');
}

/** Every place ref that resolves, as 'capital:<slug>' / 'boroughs:<slug>'. */
const PLACE_REFS = new Set(
  SETTING_KEYS.flatMap((key) => LORE.settings[key].places.map((p) => `${key}:${placeSlug(p.id)}`)),
);

const STORY_IDS = new Set(LORE.story.sections.map((s) => s.id));

/** Every discrete unlockable entry, with the list it came from and the id prefix it must carry. */
function allEntries() {
  const out = LORE.story.sections.map((e) => ({ e, list: 'story.sections', prefix: 'story.' }));
  for (const key of SETTING_KEYS) {
    for (const e of LORE.settings[key].history) {
      out.push({ e, list: `settings.${key}.history`, prefix: `${key}.history.` });
    }
    for (const e of LORE.settings[key].places) {
      out.push({ e, list: `settings.${key}.places`, prefix: `${key}.place.` });
    }
  }
  for (const e of LORE.relationships) out.push({ e, list: 'relationships', prefix: 'relationship.' });
  return out;
}

const ENTRIES = allEntries();

describe('lore.json loads and has the expected shape', () => {
  test('the top-level keys are there', () => {
    for (const key of ['$comment', 'story', 'settings', 'relationships', 'characterNotes', 'unlockRules', 'suggestedUnlocks']) {
      assert.ok(key in LORE, `missing top-level key ${key}`);
    }
    assert.equal(typeof LORE.$comment, 'string');
    assert.ok(LORE.$comment.length > 200, 'the $comment should describe the file, its sources and its rules');
  });

  test('the story area has a title, a tagline and 6-10 sections', () => {
    assert.equal(typeof LORE.story.title, 'string');
    assert.equal(typeof LORE.story.tagline, 'string');
    assert.ok(Array.isArray(LORE.story.sections));
    assert.ok(LORE.story.sections.length >= 6 && LORE.story.sections.length <= 10,
      `expected 6-10 story sections, got ${LORE.story.sections.length}`);
    for (const s of LORE.story.sections) {
      assert.equal(typeof s.heading, 'string');
      assert.ok(s.paragraphs.length >= 1 && s.paragraphs.length <= 4,
        `${s.id}: expected 1-4 paragraphs, got ${s.paragraphs.length}`);
    }
  });

  test('each setting has a name, a tagline, 3-6 history sections and a list of places', () => {
    for (const key of SETTING_KEYS) {
      const s = LORE.settings[key];
      assert.equal(s.id, key);
      assert.equal(typeof s.name, 'string');
      assert.equal(typeof s.tagline, 'string');
      assert.ok(s.history.length >= 3 && s.history.length <= 6,
        `${key}: expected 3-6 history sections, got ${s.history.length}`);
      assert.ok(s.places.length > 0, `${key}: no places`);
    }
    assert.equal(LORE.settings.capital.name, 'Capital City');
    assert.equal(LORE.settings.boroughs.name, 'The Boroughs');
    assert.match(LORE.settings.boroughs.tagline, /First Boroughs/);
  });

  test('every entry carries the field shape the UI reads', () => {
    for (const { e, list } of ENTRIES) {
      assert.equal(typeof e.id, 'string', `${list}: entry without an id`);
      if (list === 'relationships') {
        assert.ok(Array.isArray(e.characters) && e.characters.length > 0, `${e.id}: no characters`);
        assert.equal(typeof e.text, 'string');
        assert.ok(e.text.length > 0, `${e.id}: empty text`);
        continue;
      }
      assert.ok(Array.isArray(e.paragraphs), `${e.id}: paragraphs is not an array`);
      for (const p of e.paragraphs) assert.equal(typeof p, 'string', `${e.id}: non-string paragraph`);
      for (const key of ['cards', 'characters', 'places']) {
        assert.ok(Array.isArray(e[key]), `${e.id}: ${key} is not an array`);
      }
      if (list.endsWith('places')) {
        assert.equal(typeof e.name, 'string', `${e.id}: no name`);
        assert.equal(typeof e.summary, 'string', `${e.id}: no summary`);
      } else {
        assert.equal(typeof e.heading, 'string', `${e.id}: no heading`);
      }
    }
  });
});

describe('ids', () => {
  test('every entry id is globally unique across every list', () => {
    const seen = new Map();
    for (const { e, list } of ENTRIES) {
      assert.ok(!seen.has(e.id), `id ${e.id} appears in both ${seen.get(e.id)} and ${list}`);
      seen.set(e.id, list);
    }
    assert.equal(seen.size, ENTRIES.length);
  });

  test('every entry id carries its list prefix', () => {
    for (const { e, prefix } of ENTRIES) {
      assert.ok(e.id.startsWith(prefix), `${e.id} should start with ${prefix}`);
      assert.ok(e.id.length > prefix.length, `${e.id} has no slug after its prefix`);
    }
  });

  test('place slugs are kebab-case and unique within their setting', () => {
    for (const key of SETTING_KEYS) {
      const slugs = LORE.settings[key].places.map((p) => placeSlug(p.id));
      assert.equal(new Set(slugs).size, slugs.length, `${key}: duplicate place slug`);
      for (const slug of slugs) assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${key}: bad slug ${slug}`);
    }
  });
});

describe('unlocks', () => {
  test('unlockRules gives the UI one place to read the policy', () => {
    assert.equal(LORE.unlockRules.default, 'open');
    assert.equal(typeof LORE.unlockRules.note, 'string');
    assert.ok(LORE.unlockRules.note.length > 0);
  });

  test('every entry has an unlock key that is null or anyOf/allOf arrays of real card ids', () => {
    for (const { e } of ENTRIES) {
      assert.ok('unlock' in e, `${e.id}: no unlock key`);
      if (e.unlock === null) continue;
      assert.equal(typeof e.unlock, 'object', `${e.id}: unlock is neither null nor an object`);
      const keys = Object.keys(e.unlock);
      assert.ok(keys.length > 0, `${e.id}: empty unlock object`);
      for (const key of keys) {
        assert.ok(key === 'anyOf' || key === 'allOf', `${e.id}: unknown unlock key ${key}`);
        assert.ok(Array.isArray(e.unlock[key]) && e.unlock[key].length > 0, `${e.id}: ${key} must be a non-empty array`);
        for (const id of e.unlock[key]) assert.ok(CARD_IDS.has(id), `${e.id}: unlock ${key} names unknown card ${id}`);
      }
    }
  });

  test('nothing is gated yet', () => {
    for (const { e } of ENTRIES) assert.equal(e.unlock, null, `${e.id} is gated; the Lore Directory is still open by default`);
  });

  test('every suggestedUnlocks key is an entry id and every value is a list of real card ids', () => {
    const ids = new Set(ENTRIES.map(({ e }) => e.id));
    for (const [entryId, cards] of Object.entries(LORE.suggestedUnlocks)) {
      assert.ok(ids.has(entryId), `suggestedUnlocks names unknown entry ${entryId}`);
      assert.ok(Array.isArray(cards) && cards.length > 0, `suggestedUnlocks[${entryId}] must be a non-empty array`);
      for (const id of cards) assert.ok(CARD_IDS.has(id), `suggestedUnlocks[${entryId}] names unknown card ${id}`);
    }
  });
});

describe('cross-references', () => {
  test('every card id resolves to a card in the set', () => {
    for (const { e } of ENTRIES) {
      for (const id of e.cards || []) assert.ok(CARD_IDS.has(id), `${e.id}: unknown card ${id}`);
    }
  });

  test('no card is listed twice in the same entry', () => {
    for (const { e } of ENTRIES) {
      const ids = e.cards || [];
      assert.equal(new Set(ids).size, ids.length, `${e.id}: repeats a card id`);
    }
  });

  test('every character name resolves to a character in the set', () => {
    for (const { e } of ENTRIES) {
      for (const n of e.characters || []) assert.ok(CHARACTER_NAMES.has(n), `${e.id}: unknown character ${n}`);
    }
  });

  test('every place ref is capital:<slug> or boroughs:<slug> and resolves', () => {
    for (const { e } of ENTRIES) {
      for (const ref of e.places || []) {
        assert.match(ref, /^(capital|boroughs):[a-z0-9-]+$/, `${e.id}: malformed place ref ${ref}`);
        assert.ok(PLACE_REFS.has(ref), `${e.id}: unresolved place ref ${ref}`);
      }
    }
  });

  test('no place refs itself', () => {
    for (const key of SETTING_KEYS) {
      for (const p of LORE.settings[key].places) {
        assert.ok(!p.places.includes(`${key}:${placeSlug(p.id)}`), `${p.id}: refers to itself`);
      }
    }
  });
});

describe('coverage', () => {
  test('every Building and Town Building card is written up in at least one place entry', () => {
    const linked = new Set();
    for (const key of SETTING_KEYS) {
      for (const p of LORE.settings[key].places) for (const id of p.cards) linked.add(id);
    }
    const missing = SET.cards
      .filter((c) => (c.type === 'building' || c.type === 'townBuilding') && !linked.has(c.id))
      .map((c) => `${c.id} (${c.name})`);
    assert.deepEqual(missing, [], `unwritten buildings: ${missing.join(', ')}`);
  });

  test('every Statue card is linked from the Statues entry', () => {
    const entry = LORE.settings.capital.places.find((p) => p.id === 'capital.place.the-statues-and-the-quarry');
    assert.ok(entry, 'no Statues entry in the Capital City');
    const statues = SET.cards.filter((c) => c.type === 'statue').map((c) => c.id);
    assert.ok(statues.length > 0);
    for (const id of statues) assert.ok(entry.cards.includes(id), `Statues entry is missing ${id}`);
  });

  test('every place entry has at least one paragraph, and none of them is a placeholder', () => {
    for (const key of SETTING_KEYS) {
      for (const p of LORE.settings[key].places) {
        assert.ok(p.paragraphs.length >= 1, `${p.id}: no paragraphs`);
        assert.ok(p.summary.trim().length > 0, `${p.id}: empty summary`);
      }
    }
  });

  test('no paragraph, summary or relationship text says PLACEHOLDER', () => {
    for (const { e } of ENTRIES) {
      for (const text of [...(e.paragraphs || []), e.summary, e.text, e.heading, e.name].filter(Boolean)) {
        assert.ok(!text.includes('PLACEHOLDER'), `${e.id}: still contains PLACEHOLDER`);
      }
    }
    assert.ok(!LORE.$comment.includes('PLACEHOLDER'));
    for (const key of SETTING_KEYS) assert.ok(!LORE.settings[key].tagline.includes('PLACEHOLDER'));
  });
});

describe('relationships', () => {
  test('there is one entry per relationship and every animal in it exists', () => {
    assert.ok(LORE.relationships.length >= 15, `expected at least 15 relationships, got ${LORE.relationships.length}`);
    for (const r of LORE.relationships) {
      for (const n of r.characters) assert.ok(CHARACTER_NAMES.has(n), `${r.id}: unknown character ${n}`);
      assert.equal(new Set(r.characters).size, r.characters.length, `${r.id}: repeats a character`);
    }
  });
});

describe('characterNotes', () => {
  test('every key is a character in the set', () => {
    for (const name of Object.keys(LORE.characterNotes)) {
      assert.ok(CHARACTER_NAMES.has(name), `characterNotes: unknown character ${name}`);
    }
  });

  test('every place ref and story id in the notes resolves', () => {
    for (const [name, notes] of Object.entries(LORE.characterNotes)) {
      assert.ok(Array.isArray(notes.places), `${name}: places is not an array`);
      assert.ok(Array.isArray(notes.story), `${name}: story is not an array`);
      for (const ref of notes.places) assert.ok(PLACE_REFS.has(ref), `characterNotes ${name}: unresolved place ${ref}`);
      for (const id of notes.story) assert.ok(STORY_IDS.has(id), `characterNotes ${name}: unresolved story section ${id}`);
      assert.ok(notes.places.length + notes.story.length > 0, `${name}: listed with no mentions at all`);
    }
  });

  test('the notes agree with the entries they were drawn from', () => {
    // Recompute from the source of truth and compare.
    const expected = new Map();
    const bucket = (name) => {
      if (!expected.has(name)) expected.set(name, { places: new Set(), story: new Set() });
      return expected.get(name);
    };
    for (const s of LORE.story.sections) for (const n of s.characters) bucket(n).story.add(s.id);
    for (const key of SETTING_KEYS) {
      for (const p of LORE.settings[key].places) {
        for (const n of p.characters) bucket(n).places.add(`${key}:${placeSlug(p.id)}`);
      }
    }
    for (const [name, { places, story }] of expected) {
      const notes = LORE.characterNotes[name];
      assert.ok(notes, `characterNotes is missing ${name}, who is mentioned in a place or story section`);
      assert.deepEqual(new Set(notes.places), places, `characterNotes ${name}: places do not match`);
      assert.deepEqual(new Set(notes.story), story, `characterNotes ${name}: story sections do not match`);
    }
  });
});
