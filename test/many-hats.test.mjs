// Many Hats (AF-HATS-01): every existing Character takes up a new trade or a new level, and cards may
// now name a specific Character — in an ability's condition ("if you control Pip") or in an Event's
// requirements ("Requires Clover"). These tests pin the expansion's shape and the new vocabulary.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SET, RULES, newGame, addStack, addToHand, addToUnemployment, setSupply, setCity, addLimitedEvent, UPRIGHT, BUSY } from './helpers.mjs';
import { legalActions, applyAction, fireHook, runEffect, buildMarketDeck, deckProblems, startPhase } from '../src/engine/index.js';
import { seedRng } from '../src/engine/rng.js';
import { paintedTile, paintedArtSVG, explicitTile } from '../src/ui/painted-art.js';

const EXP = 'AF-HATS-01';
const hats = SET.cards.filter((c) => c.expansion === EXP);
const older = SET.cards.filter((c) => c.expansion !== EXP);
function begin(s) { s.phase = 'actions'; s.active = 0; }
const pickFirst = { choose: async (s, pi, req) => (req.kind === 'pick' ? req.options.slice(0, req.min || 1).map((o) => o.uid) : req.kind === 'confirm' ? true : undefined) };

test('Many Hats adds 72 cards and gives every existing Character a new version', () => {
  assert.equal(hats.length, 72);
  assert.equal(SET.cards.length, 332);
  assert.deepEqual(['character', 'event', 'market'].map((t) => hats.filter((c) => c.type === t).length), [44, 18, 10]);
  assert.deepEqual(SET.expansions.find((e) => e.id === EXP), { id: EXP, name: 'Many Hats', cardCount: 72 });

  const names = new Set(older.filter((c) => c.type === 'character').map((c) => c.name));
  const newNames = new Set(hats.filter((c) => c.type === 'character').map((c) => c.name));
  assert.equal(names.size, 38, 'the set had 38 named Characters');
  for (const n of names) assert.ok(newNames.has(n), `${n} gets a new version`);
  for (const n of newNames) assert.ok(names.has(n), `${n} is an existing Character, not a newcomer`);

  // Every Character now has at least three versions, and most new versions move into a study that name had never studied.
  let retrained = 0;
  for (const n of names) {
    const versions = SET.cards.filter((c) => c.type === 'character' && c.name === n);
    assert.ok(versions.length >= 3, `${n} has ${versions.length} versions`);
    const earlierStudies = new Set(older.filter((c) => c.type === 'character' && c.name === n).map((c) => c.study));
    for (const v of versions.filter((c) => c.expansion === EXP)) if (!earlierStudies.has(v.study)) retrained++;
  }
  assert.ok(retrained >= 30, `${retrained} new versions take up a new area of study`);
  // ...and the new versions are spread across all three ranks.
  const costs = hats.filter((c) => c.type === 'character').map((c) => c.cost);
  assert.ok(costs.filter((k) => k <= 1).length >= 8, 'new Apprentices');
  assert.ok(costs.filter((k) => k >= 2 && k <= 3).length >= 12, 'new Journeymen');
  assert.ok(costs.filter((k) => k >= 4).length >= 12, 'new Masters');
});

test('every Many Hats card names a painting from one of the two bundled atlases', () => {
  for (const c of hats) {
    assert.ok(['boroughs', 'whiskerwood'].includes(c.art.atlas), `${c.id}: atlas ${c.art.atlas}`);
    assert.equal(explicitTile(c), c.art.tile);
    assert.equal(paintedTile(c), c.art.tile);
    assert.match(paintedArtSVG(c, '<svg/>'), c.art.atlas === 'boroughs' ? /boroughs-atlas\.png/ : /whiskerwood-atlas\.png/);
  }
  // A new version keeps its Character's portrait: the Whiskerwood cats and neighbors use their own tile.
  const nib = hats.find((c) => c.id === 'mh_nib_4');
  assert.deepEqual(nib.art, SET.cards.find((c) => c.id === 'ww_nib_1').art);
  // An unknown atlas or a tile off the sheet falls back to the theme rules rather than a broken image.
  assert.equal(explicitTile({ type: 'character', species: 'Fox', art: { atlas: 'elsewhere', tile: 3 } }), null);
  assert.equal(paintedTile({ type: 'character', species: 'Fox', art: { atlas: 'boroughs', tile: 16 } }), 2);
});

test('Nim, Chancellor of Records pays out only while Pip is in town, whichever Pip it is', async () => {
  const s = newGame(); setSupply(s, 0, 0);
  addStack(s, 0, 'mh_nim_5', UPRIGHT);
  const hand = s.players[0].hand.length;
  await fireHook(s, 'onTurnStart', { player: 0 });
  assert.equal(s.players[0].supply, 0);
  addStack(s, 0, 'rr_nim_1', UPRIGHT); // another Squirrel of Lore is not Pip
  await fireHook(s, 'onTurnStart', { player: 0 });
  assert.equal(s.players[0].supply, 0);
  addStack(s, 0, 'mh_pip_2', UPRIGHT); // Pip in his new hat still counts
  await fireHook(s, 'onTurnStart', { player: 0 });
  assert.equal(s.players[0].supply, 1);
  assert.equal(s.players[0].hand.length, hand + 1);
});

test('an Event that requires a named Character accepts any version of them and nobody else', async () => {
  const s = newGame(); begin(s); setSupply(s, 0, 0);
  addToHand(s, 0, 'mh_pips_reading_hour');
  const offered = () => legalActions(s, 0).find((a) => a.type === 'playEvent' && a.cardId === 'mh_pips_reading_hour');
  addStack(s, 0, 'rr_nim_1', UPRIGHT); // Squirrel, Lore — but not Pip
  assert.equal(offered(), undefined);
  const pip = addStack(s, 0, 'rr_pip_3', BUSY);
  assert.equal(offered(), undefined, 'Pip must be upright');
  pip.orientation = UPRIGHT;
  const a = offered();
  assert.ok(a);
  assert.deepEqual(a.characters, [pip.uid]);
  await applyAction(s, 0, a);
  assert.equal(pip.orientation, BUSY);
  assert.equal(s.players[0].events.length, 1, 'a Limited Event sits in town');
  const hand = s.players[0].hand.length;
  await fireHook(s, 'onTurnStart', { player: 0 });
  assert.equal(s.players[0].hand.length, hand + 1);
  assert.equal(s.players[0].knownMarketTop.length, 1);
});

test("Thistle's Grange Supper needs Thistle plus a second, different Agriculture worker", () => {
  const s = newGame(); begin(s); addToHand(s, 0, 'mh_thistles_grange_supper');
  const offered = () => legalActions(s, 0).some((a) => a.cardId === 'mh_thistles_grange_supper');
  addStack(s, 0, 'br_thistle_1', UPRIGHT); // Thistle is herself an Agriculture Character, but one body covers one pip
  assert.equal(offered(), false);
  addStack(s, 0, 'bb_sorrel_1', UPRIGHT);
  assert.equal(offered(), true);
});

test('Flint, Fair Warden rewards his own announcements, and draws as well when Juniper is about', async () => {
  const s = newGame(); begin(s); setSupply(s, 0, 10);
  setCity(s, ['mk_towpath', 'mk_dew_meadow', 'mk_pigeon_post', 'mk_penny_jar', 'mk_seed_exchange']);
  const flint = addStack(s, 0, 'mh_flint_3', UPRIGHT);
  const other = addStack(s, 0, 'pp_patch_1', UPRIGHT);
  const hand = s.players[0].hand.length;
  await applyAction(s, 0, { type: 'announce', cardId: 'mk_towpath', charUid: other.uid, bid: 1 });
  assert.equal(s.players[0].supply, 9, 'someone else announcing earns Flint nothing');
  await applyAction(s, 0, { type: 'announce', cardId: 'mk_dew_meadow', charUid: flint.uid, bid: 1 });
  assert.equal(s.players[0].supply, 9, 'bid 1, gained 1');
  assert.equal(s.players[0].hand.length, hand, 'no Juniper, no card');
  addStack(s, 0, 'pp_juniper_2', UPRIGHT);
  flint.orientation = UPRIGHT; flint.lockedBid = null;
  await applyAction(s, 0, { type: 'announce', cardId: 'mk_pigeon_post', charUid: flint.uid, bid: 1 });
  assert.equal(s.players[0].supply, 9);
  assert.equal(s.players[0].hand.length, hand + 1, 'with Juniper in town, Flint also draws');
});

test('Dill, Herbalist Surgeon rehires at a discount when she readies, and Fern makes her draw too', async () => {
  const s = newGame(); setSupply(s, 0, 0); s.agents = [pickFirst, {}];
  const dill = addStack(s, 0, 'mh_dill_5', BUSY);
  addToUnemployment(s, 0, 'bb_fern_1'); // cost 2, so free with the discount
  const hand = s.players[0].hand.length;
  await fireHook(s, 'onReady', { player: 0, stackUid: dill.uid, selfOnly: dill.uid });
  assert.equal(s.players[0].unemployment.length, 0);
  assert.ok(s.players[0].town.some((st) => st.cards[0].cardId === 'bb_fern_1'), 'Fern is back in town, upright');
  assert.equal(s.players[0].supply, 0, 'paid nothing');
  assert.equal(s.players[0].hand.length, hand + 1, 'Fern arrived in time for the second ability');
});

test('Mabel, Seed Bank Director waives one requirement pip per turn, like the Statue of Ingenuity', async () => {
  const s = newGame(); begin(s); setSupply(s, 0, 0);
  addStack(s, 0, 'mh_mabel_5', UPRIGHT); // Civics: cannot pay an Agriculture pip herself
  addStack(s, 0, 'bb_mabel_1', UPRIGHT);
  addStack(s, 0, 'bb_sorrel_1', UPRIGHT);
  addToHand(s, 0, 'bb_glut_of_squash'); // two Agriculture pips
  addToHand(s, 0, 'bb_glut_of_squash');
  const offered = () => legalActions(s, 0).find((a) => a.type === 'playEvent' && a.cardId === 'bb_glut_of_squash');
  const first = offered();
  assert.ok(first);
  assert.equal(first.characters.length, 1, 'one worker plus the waived pip');
  s.agents = [pickFirst, {}];
  await applyAction(s, 0, first);
  assert.equal(s.players[0].turn.ingenuityUsed, true);
  const second = offered();
  assert.equal(second, undefined, 'the second Glut this turn would need two upright Agriculture workers');
});

test('Juniper, Border Warden goes Busy to shield the town from Unemployment until next turn', async () => {
  const s = newGame(); begin(s);
  const juniper = addStack(s, 0, 'mh_juniper_3', UPRIGHT);
  const worker = addStack(s, 0, 'pp_patch_1', UPRIGHT, { hasBeenUpright: true });
  const ability = legalActions(s, 0).find((a) => a.type === 'ability' && a.charUid === juniper.uid);
  assert.ok(ability);
  await applyAction(s, 0, ability);
  assert.equal(juniper.orientation, BUSY);
  s.agents = [{}, pickFirst];
  await runEffect(s, 1, { do: 'unemployOpponentCharacter' }, { sourceCardId: 'mk_poachers_pardon' });
  assert.ok(s.players[0].town.includes(worker), 'the shield held');
  assert.equal(s.players[0].unemployment.length, 0);
});

test('Sorrel, Harvest Caller pays for the first shift each turn only with Clover in the fields', async () => {
  const s = newGame(); begin(s); setSupply(s, 0, 0);
  const sorrel = addStack(s, 0, 'mh_sorrel_2', UPRIGHT);
  const hand1 = addStack(s, 0, 'bb_mabel_1', UPRIGHT);
  await applyAction(s, 0, { type: 'work', charUid: hand1.uid });
  assert.equal(s.players[0].supply, 0, 'no Clover, no bonus');
  addStack(s, 0, 'bb_clover_3', UPRIGHT); // Clover in her Master's hat still counts
  await applyAction(s, 0, { type: 'work', charUid: sorrel.uid });
  assert.equal(s.players[0].supply, 1, 'the first shift started while Clover is in town pays');
  const again = addStack(s, 0, 'bb_dill_1', UPRIGHT);
  await applyAction(s, 0, { type: 'work', charUid: again.uid });
  assert.equal(s.players[0].supply, 1, 'once per turn');
});

test('Town Census pays only while three species live in town', async () => {
  const s = newGame(); setSupply(s, 0, 0); addLimitedEvent(s, 0, 'mh_town_census', 2);
  addStack(s, 0, 'bb_clover_1', UPRIGHT); addStack(s, 0, 'bb_dill_1', UPRIGHT);
  await fireHook(s, 'onTurnStart', { player: 0 });
  assert.equal(s.players[0].supply, 0);
  addStack(s, 0, 'ww_thimble_1', UPRIGHT);
  await fireHook(s, 'onTurnStart', { player: 0 });
  assert.equal(s.players[0].supply, 2);
});

test('Many Hats Fair deals all ten new halls with the nine Statues, and the new decks are legal', () => {
  const market = SET.marketDecks.find((d) => d.id === 'many-hats-fair');
  const deck = buildMarketDeck({ rng: seedRng(23) }, market);
  assert.equal(deck.length, 25);
  assert.equal(deck.filter((id) => id.startsWith('st_')).length, 9);
  for (const c of hats.filter((c) => c.type === 'market')) assert.ok(deck.includes(c.id), `${c.id} is in the fair`);
  for (const id of ['hedge-harvest', 'tales-tolls']) {
    const d = SET.decks.find((x) => x.id === id);
    assert.ok(d, `${id} is printed`);
    assert.deepEqual(deckProblems(RULES, SET, d.list), []);
    assert.ok(Object.keys(d.list).some((cardId) => SET.cards.find((c) => c.id === cardId).expansion === EXP), `${id} plays Many Hats cards`);
  }
});

test('a game between the two Many Hats decks runs its opening turn in the new market', async () => {
  const s = newGame({ decks: ['hedge-harvest', 'tales-tolls'], market: 'many-hats-fair', seed: 4 });
  assert.equal(s.market.deckId, 'many-hats-fair');
  s.agents = [pickFirst, pickFirst];
  await startPhase(s, 0);
  assert.equal(s.turnNumber, 1);
});
