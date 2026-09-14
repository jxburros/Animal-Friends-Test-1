import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { FOIL_MODES, normalizeFoil, resolveFoil, applyFoil } from '../src/ui/foil.js';
import { VERSIONS, version } from '../src/ui/versions.js';
import { SET } from './helpers.mjs';

const detail = { mode: 'details', mask: 'assets/art/foil/sample-details.svg' };
const maker = JSON.parse(readFileSync(new URL('../spec/maker_card_set.json', import.meta.url)));

test('all finishes work for every card and printing without changing definitions', () => {
  for (const card of [...SET.cards, ...maker.cards]) {
    const before = JSON.stringify(card);
    for (const printing of VERSIONS) {
      for (const mode of FOIL_MODES) {
        const result = resolveFoil(card, printing, mode === 'details' ? detail : mode);
        assert.equal(result.mode, mode, `${card.id}/${printing.key}/${mode}`);
      }
    }
    assert.equal(JSON.stringify(card), before);
  }
});

test('assignments are scoped to exact card and printing; explicit no foil wins', () => {
  const def = { id: 'example', foil: true };
  const assignments = { example: { regular: 'artwork', fullCardArt: false } };
  assert.equal(resolveFoil(def, version('regular'), undefined, assignments).mode, 'artwork');
  assert.equal(resolveFoil(def, version('fullCardArt'), undefined, assignments), null);
  assert.equal(resolveFoil(def, version('regular'), 'reverse', assignments).mode, 'reverse');
  assert.equal(resolveFoil(def, version('foil'), false, assignments), null);
  assert.equal(resolveFoil(def, version('foil'), null, assignments), null);
  assert.equal(resolveFoil({ id: 'toString' }, version('regular')), null);
  assert.equal(resolveFoil({ id: 'other' }, version('regular'), undefined, assignments), null);
});

test('legacy defaults remain compatible and full art can explicitly be matte', () => {
  assert.equal(normalizeFoil(true).mode, 'full');
  assert.equal(normalizeFoil('plain').mode, 'full');
  assert.equal(normalizeFoil('creative').mode, 'hexagon');
  assert.equal(resolveFoil({ id: 'x' }, version('fullCardArt')).mode, 'full');
  assert.equal(resolveFoil({ id: 'x', foil: false }, version('fullCardArt')), null);
});

test('invalid finishes and missing/unsafe detail masks fail closed', () => {
  for (const input of [undefined, null, false, 'unknown', 'toString', {}, [], 'details',
    { mode: 'details' }, { mode: 'details', mask: '' }, { mode: 'details', mask: 4 },
    { mode: 'details', mask: 'https://example.com/mask.svg' },
    { mode: 'details', mask: 'javascript:alert(1)' },
    { mode: 'details', mask: 'data:image/svg+xml,anything' },
    { mode: 'details', mask: '../outside.svg' }]) assert.equal(normalizeFoil(input), null);
  const finish = normalizeFoil(detail);
  assert.ok(existsSync(new URL(finish.mask)));
  assert.ok(Object.isFrozen(finish));
});

test('coverage is attached to the correct actual layout regions and is decorative', () => {
  const original = globalThis.document;
  function element() {
    return { children: [], attributes: {}, properties: {},
      appendChild(child) { this.children.push(child); },
      setAttribute(key, value) { this.attributes[key] = value; },
      style: { setProperty() {} },
    };
  }
  globalThis.document = { createElement: element };
  try {
    for (const fullArt of [false, true]) for (const mode of FOIL_MODES) {
      const face = element();
      const parts = Object.fromEntries(['.art', '.banner', '.card-subtitle', '.body', '.card-footer', '.frame'].map((key) => [key, element()]));
      face.querySelector = (selector) => parts[selector];
      applyFoil(face, normalizeFoil(mode === 'details' ? detail : mode), { fullArt });
      assert.equal(parts['.art'].children.length, ['artwork', 'details'].includes(mode) ? 1 : 0);
      assert.equal(face.children.length, ['full', 'hexagon'].includes(mode) || (mode === 'reverse' && !fullArt) ? 1 : 0);
      for (const key of ['.banner', '.card-subtitle', '.body', '.card-footer', '.frame']) {
        assert.equal(parts[key].children.length, mode === 'reverse' ? 1 : 0);
      }
      for (const parent of [face, ...Object.values(parts)]) for (const layer of parent.children) {
        assert.equal(layer.attributes['aria-hidden'], 'true');
      }
    }
  } finally { globalThis.document = original; }
});
