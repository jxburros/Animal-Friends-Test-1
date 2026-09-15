// The power/cost model and the rarity it assigns. These tests pin two things: that the rarity
// stamped on every card is the one src/engine/power.js computes from the card's own data (so the
// set file and the model can never drift apart), and that rarity actually governs deck building.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES, SET } from './helpers.mjs';
import {
  rateCard, cardPower, opportunityCost, powerRating, rarityForScore, rarityForCard, rateSet,
  relativeRating, effectPower, abilityPower, costBand, thresholdsForBand,
  RARITIES, RARITY_BANDS, COST_BANDS, COPY_LIMITS, DECK_TYPES,
} from '../src/engine/power.js';
import { deckRules, maxCopiesOf, deckProblems } from '../src/engine/index.js';

test('power model', async (t) => {
  await t.test('a bigger shift is worth more, and a shorter one is worth more again', () => {
    const at = (delay, output) => cardPower({ type: 'character', cost: 0, shift: { delay, output } });
    assert.ok(at(1, 2) > at(1, 1), 'more output is better');
    assert.ok(at(1, 3) > at(2, 3), 'the same output sooner is better');
    assert.ok(at(3, 6) > at(3, 3), 'a long shift is still rated by what it pays');
  });

  await t.test('a recurring ability is worth more than the same effect once', () => {
    const once = abilityPower({ trigger: 'onRecruit', effect: { do: 'gainSupply', amount: 1 } });
    const everyTurn = abilityPower({ trigger: 'onTurnStart', effect: { do: 'gainSupply', amount: 1 } });
    assert.ok(everyTurn > once);
    const conditional = abilityPower({ trigger: 'onTurnStart', effect: { do: 'gainSupply', amount: 1 }, condition: { handAtLeast: 7 } });
    assert.ok(conditional < everyTurn, 'a condition discounts an ability');
    const burden = abilityPower({ trigger: 'onTurnStart', burden: true, effect: { do: 'gainSupply', amount: 1 } });
    assert.ok(burden < 0, 'a burden subtracts');
  });

  await t.test('a shield printed with a sentinel value is not worth ninety-nine Supply', () => {
    const huge = effectPower({ do: 'addMod', key: 'lossShield', value: 99 });
    assert.ok(huge < 4, `a 99-Supply shield rated ${huge}`);
    assert.equal(effectPower({ do: 'addMod', key: 'unemploymentShield', value: 1 }),
      effectPower({ do: 'addMod', key: 'unemploymentShield', value: 99 }), 'flag mods ignore their value');
  });

  await t.test('opportunity cost counts Supply, the turns a Master waits, and what an Event asks for', () => {
    const apprentice = opportunityCost({ type: 'character', cost: 1 });
    const master = opportunityCost({ type: 'character', cost: 4 });
    assert.ok(master > apprentice + 3, 'a Master pays its cost and two turns of rotation');
    const plain = opportunityCost({ type: 'event', kind: 'instant', requires: [{ study: 'Lore' }] });
    const demanding = opportunityCost({ type: 'event', kind: 'instant', requires: [{ study: 'Lore', count: 3 }] });
    assert.ok(demanding > plain, 'more requirement pips cost more');
  });

  await t.test('efficiency breaks ties, but size still wins between equally efficient cards', () => {
    const small = { type: 'character', cost: 0, shift: { delay: 1, output: 1 } };
    const big = { type: 'character', cost: 5, shift: { delay: 2, output: 6 } };
    const cheapCopyOfBig = { type: 'character', cost: 0, shift: { delay: 2, output: 6 } };
    assert.ok(powerRating(cheapCopyOfBig) > powerRating(big), 'the same card for less rates higher');
    assert.ok(powerRating(big) > powerRating(small), 'a much bigger card still out-rates a tiny efficient one');
  });

  await t.test('rarityForScore reads the printed bands, cost group by cost group', () => {
    for (const band of COST_BANDS) {
      for (const [rarity, min] of thresholdsForBand(band)) assert.equal(rarityForScore(min, band), rarity, `cost ${band}`);
      assert.equal(rarityForScore(0, band), 'Common');
      assert.equal(rarityForScore(999, band), 'Legendary');
    }
  });

  await t.test('the same score is a different rarity at a different cost', () => {
    // 5.5 is a fine Master for its cost at 0 and unremarkable at 5. That is the whole point of
    // banding: rarity says "better than its peers", and a card's peers are the cards a Mayor was
    // choosing between when they spent that much Supply.
    assert.equal(rarityForScore(5.5, 0), 'Legendary');
    assert.equal(rarityForScore(5.5, 5), 'Uncommon');
    // ...and the ladder never inverts: at every cost, more is never a lesser rarity.
    for (const band of COST_BANDS) {
      const cuts = thresholdsForBand(band).map(([, min]) => min);
      for (let i = 1; i < cuts.length; i++) assert.ok(cuts[i] < cuts[i - 1], `cost ${band}: band cuts out of order`);
    }
  });

  await t.test('cost groups run 0-5, and anything dearer is judged with the Masters', () => {
    assert.equal(costBand({ cost: 0 }), 0);
    assert.equal(costBand({ cost: 5 }), 5);
    assert.equal(costBand({ cost: 10 }), 5, 'a Capital City Building is not in a band of its own');
    assert.equal(costBand({}), 0, 'no cost printed: the cheapest group');
  });

  await t.test('dear cost groups demand more of a card than cheap ones', () => {
    for (let band = 1; band <= 5; band++) {
      const cut = (b, r) => thresholdsForBand(b).find(([x]) => x === r)[1];
      for (const rarity of ['Uncommon', 'Rare', 'Super Rare', 'Legendary']) {
        assert.ok(cut(band, rarity) >= cut(band - 1, rarity), `${rarity}: cost ${band} asks less than cost ${band - 1}`);
      }
    }
  });

  await t.test('Legendary is a step above Super Rare, not a rounding of it', () => {
    for (const band of COST_BANDS) {
      const cut = (r) => thresholdsForBand(band).find(([x]) => x === r)[1];
      assert.ok(cut('Legendary') >= 1.15 * cut('Super Rare'), `cost ${band}: the Legendary cut is within noise of Super Rare`);
    }
  });

  await t.test('a card no deck may hold is printed Super Rare however well it rates', () => {
    assert.equal(rarityForCard({ type: 'character', cost: 5 }, 99), 'Legendary');
    assert.equal(rarityForCard({ type: 'statue', cost: 5 }, 99), 'Super Rare');
    assert.equal(rarityForCard({ type: 'disruption', cost: 0 }, 99), 'Super Rare');
  });
});

test('the card set matches the model', async (t) => {
  await t.test('every card carries a rarity the model agrees with', () => {
    for (const c of SET.cards) {
      assert.ok(RARITIES.includes(c.rarity), `${c.id}: rarity ${c.rarity}`);
      const rated = rateCard(c, RULES);
      assert.equal(c.rarity, rated.rarity, `${c.id}: printed ${c.rarity}, model says ${rated.rarity} (score ${rated.score})`);
      assert.ok(c.power && c.power.score === rated.score, `${c.id}: printed score is stale`);
    }
  });

  await t.test('the set is a pyramid: more Commons than Uncommons, more Uncommons than Rares', () => {
    const n = (r) => SET.cards.filter((c) => c.rarity === r).length;
    assert.ok(n('Common') > n('Uncommon'), 'Commons are the base of the set');
    assert.ok(n('Uncommon') > n('Rare'));
    assert.ok(n('Rare') > n('Super Rare'));
    assert.ok(n('Super Rare') > n('Legendary'), 'and the chase cards are rarer still');
    assert.ok(n('Legendary') >= 1, 'the set has something to chase');
  });

  // The goal these three pin is the one the maker asked for: rarity is a statement about a card's
  // peers at its own cost, so no cost group may be all one thing, and none may be missing a tier.
  await t.test('every cost group prints every rarity', () => {
    for (const band of COST_BANDS) {
      const group = SET.cards.filter((c) => DECK_TYPES.has(c.type) && costBand(c) === band);
      assert.ok(group.length >= 20, `cost ${band}: only ${group.length} deck-legal cards to sort`);
      for (const rarity of RARITIES) {
        assert.ok(group.some((c) => c.rarity === rarity), `cost ${band}: nothing is ${rarity}`);
      }
    }
  });

  await t.test('dear cards skew rarer and cheap ones commoner, without any group being uniform', () => {
    const share = (band, rarity) => {
      const group = SET.cards.filter((c) => DECK_TYPES.has(c.type) && costBand(c) === band);
      return group.filter((c) => c.rarity === rarity).length / group.length;
    };
    // Commons thin out as cards get dearer, all the way down the curve...
    for (let band = 1; band <= 5; band++) {
      assert.ok(share(band, 'Common') <= share(band - 1, 'Common') + 0.01, `cost ${band} is commoner than cost ${band - 1}`);
    }
    assert.ok(share(0, 'Common') > share(5, 'Common') + 0.1, 'the slide from cost 0 to cost 5 is worth printing');
    // ...and the marquee cards thicken. Not group by group — the maker asked for variety, and a
    // strictly monotonic table is the thing that made the old set read as a cost chart — but the
    // cheap half of the curve must hold fewer of them than the dear half.
    const top = (band) => share(band, 'Super Rare') + share(band, 'Legendary');
    const cheap = top(0) + top(1) + top(2);
    const dear = top(3) + top(4) + top(5);
    assert.ok(dear > cheap, `the dear half holds no more marquee cards than the cheap half (${dear} vs ${cheap})`);
    // No group is a one-note group: the biggest tier in it is never more than half of it.
    for (const band of COST_BANDS) {
      const biggest = Math.max(...RARITIES.map((r) => share(band, r)));
      assert.ok(biggest <= 0.5, `cost ${band} is ${Math.round(100 * biggest)}% one rarity`);
    }
  });

  await t.test('the ten Legendaries are the ten best cards in the catalogue, one at every cost', () => {
    const legendary = SET.cards.filter((c) => c.rarity === 'Legendary');
    assert.equal(legendary.length, 10, 'ten, and the count is the point of the tier');
    for (const band of COST_BANDS) {
      assert.ok(legendary.some((c) => costBand(c) === band), `no Legendary costs ${band}`);
    }
    // "Most powerful" across cost groups means most powerful *for its cost*: raw score only ever
    // ranks the Masters. rateSet orders on that, so the Legendaries are simply its first ten.
    const ranked = rateSet(SET, RULES).filter((r) => DECK_TYPES.has(r.type));
    const top10 = new Set(ranked.slice(0, 10).map((r) => r.id));
    assert.deepEqual(top10, new Set(legendary.map((c) => c.id)), 'the top ten and the Legendaries are not the same ten cards');
    // And a step clear of the best Super Rare at the same cost, rather than a rounding of it.
    for (const band of COST_BANDS) {
      const group = ranked.filter((r) => r.band === band);
      const bestSuper = Math.max(...group.filter((r) => r.rarity === 'Super Rare').map((r) => r.score));
      const weakestLegend = Math.min(...group.filter((r) => r.rarity === 'Legendary').map((r) => r.score));
      assert.ok(weakestLegend >= 1.08 * bestSuper, `cost ${band}: ${weakestLegend} is not a step above ${bestSuper}`);
    }
  });

  // The file is read a character at a time, so it is kept in writing order rather than sorted by
  // rating; rateSet is what puts the whole set in order when something needs it that way.
  await t.test('rateSet ranks the whole set, strongest for its cost first', () => {
    const ranked = rateSet(SET, RULES);
    assert.equal(ranked.length, SET.cards.length);
    for (let i = 1; i < ranked.length; i++) {
      assert.ok(ranked[i].relative <= ranked[i - 1].relative, `${ranked[i].id} is out of order`);
    }
    // Ordering on the raw score instead would be ordering on cost: check that the two really differ,
    // so this test keeps meaning something if `relative` is ever quietly dropped.
    assert.ok(ranked.some((r, i) => i > 0 && r.score > ranked[i - 1].score), 'nothing was reordered by cost group');
    const card = SET.cards.find((c) => c.id === ranked[0].id);
    assert.equal(ranked[0].relative, Math.round(100 * relativeRating(card, ranked[0].score)) / 100, 'relative is read off the printed score');
  });
});

test('rarity governs deck building', async (t) => {
  const byId = Object.fromEntries(SET.cards.map((c) => [c.id, c]));

  await t.test('the rules print a copy limit for every rarity, and rarer means fewer', () => {
    const dr = deckRules(RULES);
    for (const r of RARITIES) assert.ok(dr.copiesByRarity[r] >= 1, `${r}: no copy limit`);
    for (let i = 1; i < RARITIES.length; i++) {
      assert.ok(dr.copiesByRarity[RARITIES[i]] <= dr.copiesByRarity[RARITIES[i - 1]], `${RARITIES[i]} allows more copies than ${RARITIES[i - 1]}`);
    }
    assert.equal(dr.copiesByRarity['Super Rare'], 1, 'a Super Rare is a one-of');
    assert.equal(dr.copiesByRarity.Legendary, 1, 'and so is a Legendary — there is nothing below one');
    assert.equal(dr.copiesByRarity.Common, 4, 'a Common may be repeated four times');
    assert.deepEqual(dr.copiesByRarity, COPY_LIMITS, 'spec/game.json and the model agree on the limits');
  });

  await t.test('maxCopiesOf follows the card, and an unrated card is treated as Common', () => {
    const dr = deckRules(RULES);
    assert.equal(maxCopiesOf(RULES, { rarity: 'Common' }), dr.copiesByRarity.Common);
    assert.equal(maxCopiesOf(RULES, { rarity: 'Super Rare' }), 1);
    assert.equal(maxCopiesOf(RULES, {}), dr.copiesByRarity.Common, 'no rarity printed: Common');
  });

  await t.test('a second Super Rare copy is rejected, and the reason names the rarity', () => {
    const superRare = SET.cards.find((c) => c.rarity === 'Super Rare' && (c.type === 'character' || c.type === 'event'));
    assert.ok(superRare, 'the set has a deck-legal Super Rare');
    const problems = deckProblems(RULES, SET, { [superRare.id]: 2 });
    const copyProblem = problems.find((p) => p.includes('copies'));
    assert.ok(copyProblem, 'two copies of a Super Rare is a problem');
    assert.ok(copyProblem.includes('Super Rare'), `the message should explain why: ${copyProblem}`);
  });

  await t.test('every deck respects the rarity limits', () => {
    for (const deck of SET.decks) {
      for (const [id, n] of Object.entries(deck.list)) {
        assert.ok(n <= maxCopiesOf(RULES, byId[id]), `${deck.id}: ${n} copies of ${id} (${byId[id].rarity})`);
      }
      assert.deepEqual(deckProblems(RULES, SET, deck.list), [], `${deck.id} should be legal`);
    }
  });

  await t.test('the decks lean on Commons and are sparing with the rest', () => {
    for (const deck of SET.decks) {
      const copies = (r) => Object.entries(deck.list).reduce((a, [id, n]) => a + (byId[id].rarity === r ? n : 0), 0);
      // A printed deck holds at most one copy of any Super Rare (the deck rule) and at most five of
      // them in all. Five rather than the old three because copies and cards are no longer the same
      // count: a printed deck now takes two of anything at most, so three Super Rare *copies* used
      // to be as few as one card, and the point of the cap was never to make the deck dull.
      const top = copies('Super Rare') + copies('Legendary');
      assert.ok(top <= 5, `${deck.id}: ${top} copies of Super Rare or Legendary cards`);
      assert.ok(copies('Common') + copies('Uncommon') >= 15, `${deck.id} should be built on its commons`);
    }
  });
});
