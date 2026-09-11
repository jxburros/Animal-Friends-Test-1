// Content tests: every card in the set is well formed, every deck is legal, and every effect,
// trigger, condition and mod key a card uses is one the engine actually interprets. These catch
// a typo in spec/starter_card_set.json long before it shows up as a silent no-op in a game.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES, SET, newGame } from './helpers.mjs';
import { createGame, playGame, buildMarketDeck, resolveDeck, deckProblems, deckRules } from '../src/engine/index.js';
import { seedRng } from '../src/engine/rng.js';
import { makeRandomAgent } from '../src/ai/random.js';

const EFFECTS = new Set([
  'seq', 'gainSupply', 'opponentGainSupply', 'giveSupplyToOpponent', 'draw', 'discard', 'addMod',
  'readyCharacter', 'readyNextTurn', 'rehire', 'recruitFromHand', 'reorderDeckTop',
  'eventFromDumpToDeckBottom', 'eventFromDumpToHand', 'peekMarketDeck', 'opponentTopdeckFromHand',
  'unemployOpponentCharacter', 'raiseOwnBid',
  // shared shocks, used by Disruption cards
  'allCharactersToUnemployment', 'endAllShifts', 'everyoneLosesSupply', 'everyoneGainsSupply',
  'everyoneDraws', 'everyoneDiscardsDownTo', 'blockNextReady', 'everyoneRehiresFree',
]);
const TRIGGERS = new Set([
  'passive', 'busy', 'onRecruit', 'onTurnStart', 'onTurnEnd', 'onReady', 'onShiftStarted', 'onShiftCompleted',
  'onEventPlayed', 'onAnnounce', 'onChallengedByOpponent', 'onGainMarketCard', 'onCharacterUnemployed',
  'onTiedBid',
]);
const PASSIVE_KEYS = new Set([
  'blockOpponentBidRaise', 'firstAnnounceMinBidMinus1', 'firstBidPlus1', 'winTiesAsChallenger',
  'masterDelayMinus1', 'eventCharReductionPerTurn',
  // Statue burdens
  'opponentRehireDiscount', 'opponentFirstBidPlus1', 'apprenticeEntersBusy', 'eventCostPlus1',
  'resourceSupplyMinus1', 'losingBidsPayFull',
]);
const MOD_KEYS = new Set([
  'recruitDiscount', 'challengeDiscount', 'rehireDiscount', 'shiftBonus', 'extraAdvance', 'lossShield',
  'unemploymentShield', 'unchallengeable', 'cancelNextChallenge', 'eventCharReduction', 'skipNextAdvance',
]);
const CONDITIONS = new Set([
  'self', 'announcerIsSelf', 'onlyUprightOfSpecies', 'otherCharacterInTown', 'eventRequiresStudy',
  'nonStatue', 'statue', 'handAtLeast', 'unemploymentNotMoreThanOpponent', 'minSpeciesInTown',
]);

const byType = (t) => SET.cards.filter((c) => c.type === t);

function walkEffect(eff, where) {
  assert.ok(eff.do, `${where}: effect with no "do"`);
  assert.ok(EFFECTS.has(eff.do), `${where}: unknown effect "${eff.do}"`);
  if (eff.do === 'seq') {
    assert.ok(Array.isArray(eff.steps) && eff.steps.length, `${where}: seq with no steps`);
    eff.steps.forEach((st, i) => walkEffect(st, `${where}.steps[${i}]`));
  }
  if (eff.do === 'addMod') assert.ok(MOD_KEYS.has(eff.key), `${where}: unknown mod key "${eff.key}"`);
}

test('card set', async (t) => {
  await t.test('card ids are unique and typed', () => {
    const seen = new Set();
    for (const c of SET.cards) {
      assert.ok(!seen.has(c.id), `duplicate card id ${c.id}`);
      seen.add(c.id);
      assert.ok(['character', 'event', 'statue', 'market', 'disruption'].includes(c.type), `${c.id}: bad type ${c.type}`);
      assert.ok(c.name, `${c.id}: no name`);
      assert.ok(c.text, `${c.id}: no rules text`);
    }
  });

  await t.test('Characters use declared species and studies and have a shift', () => {
    for (const c of byType('character')) {
      assert.ok(SET.species.includes(c.species), `${c.id}: undeclared species ${c.species}`);
      assert.ok(SET.studies.includes(c.study), `${c.id}: undeclared study ${c.study}`);
      assert.ok(c.title, `${c.id}: no title`);
      assert.ok(c.shift && c.shift.delay >= 1 && c.shift.output >= 1, `${c.id}: bad shift`);
      assert.ok(c.cost >= 0 && c.cost <= 5, `${c.id}: cost ${c.cost} outside 0-5`);
    }
  });

  await t.test('Events declare their requirements against declared species and studies', () => {
    for (const c of byType('event')) {
      assert.ok(['instant', 'limited'].includes(c.kind), `${c.id}: bad kind ${c.kind}`);
      if (c.kind === 'limited') assert.ok(c.duration >= 1, `${c.id}: limited with no duration`);
      for (const r of c.requires || []) {
        if (r.species) assert.ok(SET.species.includes(r.species), `${c.id}: undeclared species ${r.species}`);
        if (r.study) assert.ok(SET.studies.includes(r.study), `${c.id}: undeclared study ${r.study}`);
        assert.ok(r.species || r.study, `${c.id}: requirement with neither species nor study`);
      }
      assert.ok(c.effect || c.abilities, `${c.id}: Event does nothing`);
    }
  });

  await t.test('every effect, trigger, condition and mod key is one the engine interprets', () => {
    for (const c of SET.cards) {
      if (c.effect) walkEffect(c.effect, `${c.id}.effect`);
      if (c.onGain) walkEffect(c.onGain, `${c.id}.onGain`);
      if (c.onReveal) walkEffect(c.onReveal, `${c.id}.onReveal`);
      for (const [i, ab] of (c.abilities || []).entries()) {
        const where = `${c.id}.abilities[${i}]`;
        assert.ok(TRIGGERS.has(ab.trigger), `${where}: unknown trigger "${ab.trigger}"`);
        if (ab.trigger === 'passive') assert.ok(PASSIVE_KEYS.has(ab.key), `${where}: unknown passive key "${ab.key}"`);
        else walkEffect(ab.effect, `${where}.effect`);
        for (const k of Object.keys(ab.condition || {})) assert.ok(CONDITIONS.has(k), `${where}: unknown condition "${k}"`);
      }
    }
  });

  await t.test('upgrades cost more than the Character they upgrade', () => {
    const byName = new Map();
    for (const c of byType('character')) {
      if (!byName.has(c.name)) byName.set(c.name, []);
      byName.get(c.name).push(c);
    }
    for (const [name, versions] of byName) {
      const costs = versions.map((v) => v.cost);
      assert.equal(new Set(costs).size, costs.length, `${name}: two versions share a cost, so neither can upgrade the other`);
    }
  });

  await t.test('every Market Deck holds all nine Statues and a pool of its printed size', () => {
    const ids = new Set(SET.cards.map((c) => c.id));
    const statues = byType('statue').map((c) => c.id);
    assert.ok(SET.marketDecks.length >= 3, 'three Market Decks to choose from');
    for (const spec of SET.marketDecks) {
      for (const id of [...spec.always, ...spec.pool]) assert.ok(ids.has(id), `${spec.id} references unknown card ${id}`);
      assert.equal(new Set(spec.pool).size, spec.pool.length, `${spec.id}: a card appears twice in the pool`);
      const deck = buildMarketDeck({ rng: seedRng(7) }, spec);
      assert.equal(deck.length, statues.length + spec.poolSize, `${spec.id}: Market Deck size`);
      for (const id of statues) assert.ok(deck.includes(id), `${spec.id}: Statue ${id} must always be in the Market Deck`);
      assert.equal(buildMarketDeck({ rng: seedRng(99) }, spec).length, deck.length);
    }
  });

  await t.test('Disruptions resolve on reveal and are never bought', () => {
    for (const c of byType('disruption')) {
      assert.ok(c.onReveal, `${c.id}: a Disruption needs an onReveal effect`);
      assert.ok(!c.onGain, `${c.id}: a Disruption is never gained`);
    }
    assert.ok(byType('disruption').length >= 1, 'the set defines Disruption cards');
  });

  await t.test('every Statue carries a boon and a burden', () => {
    for (const c of byType('statue')) {
      assert.ok(c.burden, `${c.id}: no burden`);
      assert.ok(c.onGain || (c.abilities || []).some((ab) => !ab.burden), `${c.id}: no boon`);
      assert.ok((c.abilities || []).some((ab) => ab.burden), `${c.id}: burden text with nothing enforcing it`);
    }
  });
});

test('decks', async (t) => {
  await t.test('every printed deck is the printed size, with legal copy counts', () => {
    for (const deck of SET.decks) {
      const entries = Object.entries(deck.list);
      const total = entries.reduce((a, [, n]) => a + n, 0);
      assert.equal(total, RULES.setup.deckSize, `${deck.id}: ${total} cards`);
      for (const [cardId, n] of entries) {
        const def = SET.cards.find((c) => c.id === cardId);
        assert.ok(def, `${deck.id}: unknown card ${cardId}`);
        assert.ok(['character', 'event'].includes(def.type), `${deck.id}: ${cardId} is a ${def.type}`);
        assert.ok(n <= RULES.deckbuilding.maxCopiesPerCard, `${deck.id}: ${n} copies of ${cardId}`);
      }
      const chars = entries.reduce((a, [id, n]) => a + (SET.cards.find((c) => c.id === id).type === 'character' ? n : 0), 0);
      assert.ok(chars >= RULES.deckbuilding.minCharacters, `${deck.id}: only ${chars} Characters`);
    }
  });

  await t.test('every deck can play a full game against every other', async () => {
    for (const a of SET.decks) {
      for (const b of SET.decks) {
        if (a.id === b.id) continue;
        const state = createGame(RULES, SET, { seed: 5, decks: [a.id, b.id] });
        await playGame(state, [makeRandomAgent(11), makeRandomAgent(13)]);
        assert.ok(state.winner === 0 || state.winner === 1 || state.result === 'turnLimit', `${a.id} vs ${b.id} ended badly`);
      }
    }
  });
});

test('custom decks', async (t) => {
  const customList = () => {
    const list = {};
    for (const [id, n] of Object.entries(SET.decks[0].list)) list[id] = n;
    return list;
  };

  await t.test('resolveDeck accepts a deck object and rejects unknown cards', () => {
    const set = newGame().set;
    const deck = resolveDeck(set, { name: 'Mixed Town', list: customList() });
    assert.equal(deck.name, 'Mixed Town');
    assert.throws(() => resolveDeck(set, { list: { nope_not_a_card: 1 } }), /Unknown card/);
    assert.throws(() => resolveDeck(set, { name: 'No list' }), /card list/);
    assert.throws(() => resolveDeck(set, 'no-such-deck'), /Unknown deck/);
  });

  await t.test('a custom deck built from several boroughs plays a full game', async () => {
    // Two species, two studies, drawn from two different printed decks plus new cards.
    const list = {
      bb_clover_1: 3, bb_mabel_1: 3, br_bramble_1: 3, br_thistle_1: 2, rr_pip_1: 2, rr_willow_1: 2,
      pp_hazel_1: 2, rr_acorn_1: 2, br_moss_2: 1, bb_community_garden: 2, rr_river_market: 2,
      br_tool_lending: 2, bb_blooming_confidence: 2, rr_acorn_cache: 2,
    };
    assert.equal(Object.values(list).reduce((a, n) => a + n, 0), RULES.setup.deckSize);
    const state = createGame(RULES, SET, { seed: 3, decks: [{ id: 'custom-test', name: 'Six Boroughs', list }, 'paws-papers'] });
    assert.equal(state.players[0].deckName, 'Six Boroughs');
    assert.equal(state.players[0].deck.length + state.players[0].hand.length, RULES.setup.deckSize);
    await playGame(state, [makeRandomAgent(21), makeRandomAgent(23)]);
    assert.ok(state.winner !== undefined);
  });
});

test('deck legality', async (t) => {
  const legal = { ...SET.decks[0].list };

  await t.test('a printed deck has no problems', () => {
    assert.deepEqual(deckProblems(RULES, SET, legal), []);
  });

  await t.test('the wrong size, too many copies, too few Characters and stray cards are all reported', () => {
    const dr = deckRules(RULES);
    const short = { ...legal };
    delete short[Object.keys(short)[0]];
    assert.ok(deckProblems(RULES, SET, short).some((p) => p.includes(`of ${dr.deckSize} cards`)));

    const tooMany = { bb_clover_1: 4, bb_mabel_1: 3, br_bramble_1: 3, rr_pip_1: 3, bb_poppy_1: 3, br_thistle_1: 3, rr_willow_1: 3, pp_patch_1: 3, pp_juniper_1: 3, rr_acorn_1: 2 };
    assert.ok(deckProblems(RULES, SET, tooMany).some((p) => p.includes('4 copies')));

    const eventHeavy = { bb_community_garden: 3, bb_seed_swap: 3, bb_patient_harvest: 3, bb_neighborhood_watch: 3, bb_blooming_confidence: 3, bb_welcome_wagon: 3, pp_open_ledger: 3, pp_paper_trail: 3, rr_river_market: 3, br_barn_raising: 3 };
    assert.ok(deckProblems(RULES, SET, eventHeavy).some((p) => p.includes('Characters (at least')));

    const withStatue = { ...legal, st_kindness: 1 };
    assert.ok(deckProblems(RULES, SET, withStatue).some((p) => p.includes('cannot go in a town deck')));

    assert.ok(deckProblems(RULES, SET, { not_a_card: 30 }).some((p) => p.includes('Unknown card')));
  });

  await t.test('a deck the builder calls legal is one createGame accepts', async () => {
    assert.deepEqual(deckProblems(RULES, SET, legal), []);
    const state = createGame(RULES, SET, { seed: 9, decks: [{ id: 'ok', name: 'Legal Town', list: legal }, 'ripple-rune'] });
    await playGame(state, [makeRandomAgent(2), makeRandomAgent(4)]);
    assert.ok(state.result);
  });
});
