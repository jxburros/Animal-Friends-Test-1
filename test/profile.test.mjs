// A Mayor: what they start with, what they own, what a deck they cannot afford to build says, and
// what winning pays. Everything here is headless — profile.js never touches storage or the DOM.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RULES, SET } from './helpers.mjs';
import { deckProblems } from '../src/engine/deckbuilding.js';
import {
  createProfile, progressionRules, ownedCopies, owns, ownsPrinting, copiesOfPrinting,
  ownedPrintingsOf, collectionSize, grantCard, grantList, grantPack, availableCopies,
  collectionProblems, buildableCards, hasDeck, unlockedDecks, unlockDeck, deckCoverage,
  autoUnlockDecks, saveCustomDeck, deleteCustomDeck, sanePrintings, canAfford, addCoins,
  spendCoins, buyPack, buyDeck, takePack, recordResult, putSavedGame, dropSavedGame, savedGame,
  canBeAvatar, setAvatar, renameProfile,
} from '../src/engine/profile.js';

const PROGRESSION = JSON.parse(fs.readFileSync(new URL('../spec/progression.json', import.meta.url), 'utf8'));
const STARTER = 'mk-tin-tally';
const starterList = () => SET.decks.find((d) => d.id === STARTER).list;
const aStarterCard = () => Object.keys(starterList())[0];

function mayor(opts = {}) {
  return createProfile({ name: 'Wren', starterDeckId: STARTER, ...opts }, SET, PROGRESSION);
}

describe('a new Mayor', () => {
  test('starts with their chosen deck unlocked and its whole list in the collection', () => {
    const p = mayor();
    assert.ok(hasDeck(p, STARTER));
    for (const [cardId, count] of Object.entries(starterList())) {
      assert.equal(ownedCopies(p, cardId), count, `${cardId}: the deck's own count`);
    }
  });

  test('has nothing else: the other fourteen decks are shut', () => {
    const p = mayor();
    assert.deepEqual(unlockedDecks(SET, p).map((d) => d.id), [STARTER]);
    const outsider = SET.cards.find((c) => !(c.id in starterList()));
    assert.equal(owns(p, outsider.id), false);
    assert.ok(collectionSize(p) < SET.cards.length / 4, 'a starting collection is a small corner of the set');
  });

  test('starts with the coins and packs the progression spec says, and a name', () => {
    const p = mayor();
    const pr = progressionRules(PROGRESSION);
    assert.equal(p.coins, pr.startingCoins);
    assert.equal(p.packs, pr.startingPacks);
    assert.equal(p.name, 'Wren');
    assert.equal(p.sandbox, false);
  });

  test('an unnamed Mayor still gets a name rather than an empty one', () => {
    assert.equal(createProfile({ name: '   ' }).name, 'Mayor');
  });
});

describe('the collection counts printings separately, and copies together', () => {
  test('a foil and a regular are two copies of one card', () => {
    const p = mayor();
    const card = 'mk_comet_astronaut_5';
    grantCard(p, card, 'regular', 1);
    grantCard(p, card, 'foil', 1);
    assert.equal(copiesOfPrinting(p, card, 'regular'), 1);
    assert.equal(copiesOfPrinting(p, card, 'foil'), 1);
    assert.equal(ownedCopies(p, card), 2, 'for deck legality, a copy is a copy');
    assert.deepEqual(ownedPrintingsOf(p, card).sort(), ['foil', 'regular']);
  });

  test('owning a foil is not owning the regular printing', () => {
    const p = mayor();
    grantCard(p, 'mk_night_round', 'foil', 1);
    assert.equal(ownsPrinting(p, 'mk_night_round', 'foil'), true);
    assert.equal(ownsPrinting(p, 'mk_night_round', 'regular'), false);
    assert.equal(owns(p, 'mk_night_round'), true);
  });

  test('an opened pack lands in the collection and says which cards were new', () => {
    const p = mayor();
    const draws = [
      { cardId: 'mk_night_round', printing: 'foil' },
      { cardId: 'mk_night_round', printing: 'foil' },
    ];
    const seen = grantPack(p, draws);
    assert.deepEqual(seen.map((d) => d.isNew), [true, false], 'the second of a pair is not new');
    assert.equal(copiesOfPrinting(p, 'mk_night_round', 'foil'), 2);
    assert.equal(p.stats.packsOpened, 1);
  });
});

describe('building a deck out of what you own', () => {
  test('a deck asking for more copies than you have is refused, by name', () => {
    const p = mayor();
    const card = aStarterCard();
    const have = ownedCopies(p, card);
    const problems = collectionProblems(RULES, SET, { [card]: have + 1 }, p);
    assert.equal(problems.length, 1);
    assert.match(problems[0], new RegExp(`${have + 1} copies, and you have ${have}`));
  });

  test('a card you have never seen says so in plainer words', () => {
    const p = mayor();
    const outsider = SET.cards.find((c) => c.type === 'character' && !(c.id in starterList()));
    assert.match(collectionProblems(RULES, SET, { [outsider.id]: 1 }, p)[0], /do not have this card/);
  });

  test('the starter deck itself is buildable: its own list raises no complaint', () => {
    const p = mayor();
    assert.deepEqual(collectionProblems(RULES, SET, starterList(), p), []);
    assert.deepEqual(deckProblems(RULES, SET, starterList()), [], 'and is still legal by the set rules');
  });

  test('availableCopies is the rarity limit and the collection, whichever bites first', () => {
    const p = mayor();
    const card = aStarterCard();
    assert.equal(availableCopies(RULES, SET, p, card), ownedCopies(p, card));
    grantCard(p, card, 'regular', 20);
    const def = SET.cards.find((c) => c.id === card);
    assert.ok(availableCopies(RULES, SET, p, card) < 20, `owning twenty ${def.name} does not beat the copy limit`);
  });

  test('the Workshop is offered only cards the Mayor owns', () => {
    const p = mayor();
    const buildable = buildableCards(SET, p);
    assert.ok(buildable.length > 0);
    assert.ok(buildable.every((c) => owns(p, c.id)));
    assert.ok(buildable.length < SET.cards.length);
  });

  test('a printing choice the Mayor no longer owns is quietly dropped, never the card', () => {
    const p = mayor();
    const card = aStarterCard();
    grantCard(p, card, 'foil', 1);
    const deck = { id: 'd1', name: 'D', list: { [card]: 1 }, printings: { [card]: 'foil', other: 'creativeFoil' } };
    assert.deepEqual(sanePrintings(p, deck), { [card]: 'foil' });
  });
});

describe('opening more decks', () => {
  test('unlocking a deck grants its list, so a deck you own is a deck you can play', () => {
    const p = mayor();
    const other = 'mk-lamp-lens';
    unlockDeck(p, SET, other);
    assert.ok(hasDeck(p, other));
    assert.deepEqual(collectionProblems(RULES, SET, SET.decks.find((d) => d.id === other).list, p), []);
  });

  test('unlocking a deck twice is not a way to farm duplicates', () => {
    const p = mayor();
    const card = aStarterCard();
    const before = ownedCopies(p, card);
    unlockDeck(p, SET, STARTER);
    assert.equal(ownedCopies(p, card), before);
    assert.equal(p.decks.filter((d) => d === STARTER).length, 1);
  });

  test('coverage from packs opens a deck and grants the remainder', () => {
    const p = mayor();
    const other = SET.decks.find((d) => d.id === 'mk-quill-quarry');
    assert.equal(hasDeck(p, other.id), false);
    // Open enough of the deck's list to cross the threshold, one card at a time.
    for (const [cardId, count] of Object.entries(other.list)) {
      if (deckCoverage(p, SET, other.id) >= progressionRules(PROGRESSION).deckCoverage) break;
      grantCard(p, cardId, 'regular', count);
    }
    const opened = autoUnlockDecks(p, SET, PROGRESSION);
    assert.ok(opened.includes(other.id), 'the deck packs nearly filled opens by itself');
    assert.equal(deckCoverage(p, SET, other.id), 1, 'and the rest of the list is granted');
  });

  test('a deck nowhere near covered stays shut', () => {
    const p = mayor();
    assert.deepEqual(autoUnlockDecks(p, SET, PROGRESSION), []);
  });

  test('a deck can be bought outright, and not without the coins', () => {
    const p = mayor();
    const pr = progressionRules(PROGRESSION);
    assert.equal(buyDeck(p, SET, 'mk-lamp-lens', PROGRESSION), false, 'a Mayor with no coins buys nothing');
    addCoins(p, pr.deckPrice);
    assert.equal(buyDeck(p, SET, 'mk-lamp-lens', PROGRESSION), true);
    assert.equal(p.coins, 0);
    assert.ok(hasDeck(p, 'mk-lamp-lens'));
    assert.equal(buyDeck(p, SET, 'mk-lamp-lens', PROGRESSION), false, 'and cannot buy it twice');
  });
});

describe('coins and packs', () => {
  test('a pack is bought at the printed price and sits sealed until it is opened', () => {
    const p = mayor();
    const pr = progressionRules(PROGRESSION);
    const sealed = p.packs;
    addCoins(p, pr.packPrice);
    assert.ok(buyPack(p, PROGRESSION));
    assert.equal(p.packs, sealed + 1);
    assert.equal(p.coins, 0);
    assert.equal(buyPack(p, PROGRESSION), false, 'and not on credit');
  });

  test('taking a pack off the shelf needs a pack on the shelf', () => {
    const p = mayor();
    p.packs = 1;
    assert.ok(takePack(p));
    assert.equal(p.packs, 0);
    assert.equal(takePack(p), false);
  });

  test('spending never goes below nothing', () => {
    const p = mayor();
    addCoins(p, 10);
    assert.equal(spendCoins(p, 40), false);
    assert.equal(p.coins, 10);
    assert.equal(canAfford(p, 40), false);
  });
});

describe('what a finished game pays', () => {
  test('a win pays a pack and coins, and the first win with a deck pays a bonus on top', () => {
    const p = mayor();
    const pr = progressionRules(PROGRESSION);
    const first = recordResult(p, { won: true, deckId: STARTER }, PROGRESSION);
    assert.equal(first.firstWin, true);
    assert.equal(first.coins, pr.win.coins + pr.firstWinWithDeck.coins);
    assert.equal(p.coins, first.coins);
    assert.equal(p.packs, pr.startingPacks + first.packs);

    const second = recordResult(p, { won: true, deckId: STARTER }, PROGRESSION);
    assert.equal(second.firstWin, false);
    assert.equal(second.coins, pr.win.coins, 'the bonus is paid once per deck');
  });

  test('a loss still pays, so a bad run moves forward', () => {
    const p = mayor();
    const reward = recordResult(p, { won: false, deckId: STARTER }, PROGRESSION);
    assert.equal(reward.coins, progressionRules(PROGRESSION).loss.coins);
    assert.equal(reward.packs, 0);
    assert.equal(p.stats.lost, 1);
    assert.equal(p.stats.won, 0);
  });

  test('every finished game is written into the history, newest first', () => {
    const p = mayor();
    recordResult(p, { won: true, deckId: STARTER, deckName: 'Tin & Tally', turns: 12, seed: 5 }, PROGRESSION);
    recordResult(p, { won: false, deckId: STARTER }, PROGRESSION);
    assert.equal(p.history.length, 2);
    assert.equal(p.history[0].won, false, 'the newest game is the one at the front');
    assert.equal(p.history[1].turns, 12);
    assert.equal(p.stats.played, 2);
  });
});

describe('games left unfinished', () => {
  test('a saved game goes on the shelf newest first and can be found again', () => {
    const p = mayor();
    putSavedGame(p, { id: 'g1', savedAt: 1 }, PROGRESSION);
    putSavedGame(p, { id: 'g2', savedAt: 2 }, PROGRESSION);
    assert.deepEqual(p.games.map((g) => g.id), ['g2', 'g1']);
    assert.equal(savedGame(p, 'g1').savedAt, 1);
  });

  test('saving the same game again replaces it rather than stacking copies up', () => {
    const p = mayor();
    putSavedGame(p, { id: 'g1', turn: 1 }, PROGRESSION);
    putSavedGame(p, { id: 'g1', turn: 9 }, PROGRESSION);
    assert.equal(p.games.length, 1);
    assert.equal(p.games[0].turn, 9);
  });

  test('the shelf holds only so many, and the oldest falls off', () => {
    const p = mayor();
    const max = progressionRules(PROGRESSION).maxSavedGames;
    for (let i = 0; i <= max; i++) putSavedGame(p, { id: `g${i}` }, PROGRESSION);
    assert.equal(p.games.length, max);
    assert.equal(savedGame(p, 'g0'), null, 'the first one saved is the first one dropped');
  });

  test('a finished game is taken off the shelf', () => {
    const p = mayor();
    putSavedGame(p, { id: 'g1' }, PROGRESSION);
    dropSavedGame(p, 'g1');
    assert.deepEqual(p.games, []);
  });
});

describe('custom decks belong to a Mayor', () => {
  test('saving replaces by id, and deleting removes', () => {
    const p = mayor();
    saveCustomDeck(p, { id: 'c1', name: 'First', list: {} });
    saveCustomDeck(p, { id: 'c1', name: 'Renamed', list: {} });
    assert.equal(p.customDecks.length, 1);
    assert.equal(p.customDecks[0].name, 'Renamed');
    deleteCustomDeck(p, 'c1');
    assert.deepEqual(p.customDecks, []);
  });
});

describe('the card that stands for a Mayor', () => {
  test('has to be a card they own, in the printing they own', () => {
    const p = mayor();
    const card = aStarterCard();
    assert.ok(setAvatar(p, card, 'regular'));
    assert.deepEqual(p.avatar, { cardId: card, printing: 'regular' });
    assert.equal(canBeAvatar(p, card, 'creativeFoil'), false);
    assert.equal(setAvatar(p, card, 'creativeFoil'), false);
    assert.deepEqual(p.avatar, { cardId: card, printing: 'regular' }, 'a refused choice changes nothing');
  });

  test('renaming needs an actual name', () => {
    const p = mayor();
    assert.equal(renameProfile(p, '  '), false);
    assert.equal(p.name, 'Wren');
    assert.ok(renameProfile(p, ' Mayor Hazel '));
    assert.equal(p.name, 'Mayor Hazel');
  });
});

describe('the Sandbox Mayor', () => {
  const sandbox = () => createProfile({ name: 'Sandbox', sandbox: true }, SET, PROGRESSION);

  test('owns every card in every printing without a single entry in the inventory', () => {
    const s = sandbox();
    assert.deepEqual(s.inventory, {}, 'nothing is materialised');
    for (const card of SET.cards.slice(0, 50)) {
      assert.equal(ownedCopies(s, card.id), Infinity);
      assert.ok(ownsPrinting(s, card.id, 'creativeFoil'));
      assert.ok(canBeAvatar(s, card.id, 'fullCardArt'));
    }
  });

  test('has every deck, and every deck list builds', () => {
    const s = sandbox();
    assert.equal(unlockedDecks(SET, s).length, SET.decks.length);
    for (const deck of SET.decks) assert.deepEqual(collectionProblems(RULES, SET, deck.list, s), []);
  });

  test('has the whole set to build with, and the rarity limits still apply', () => {
    const s = sandbox();
    const legal = new Set(['character', 'event', 'townBuilding']);
    assert.equal(buildableCards(SET, s).length, SET.cards.filter((c) => legal.has(c.type)).length);
    const legendary = SET.cards.find((c) => c.rarity === 'Legendary');
    assert.equal(availableCopies(RULES, SET, s, legendary.id), 1, 'a Legendary is still a one-of');
  });

  test('is a testing tool: it plays games and keeps no record of them', () => {
    const s = sandbox();
    const reward = recordResult(s, { won: true, deckId: STARTER }, PROGRESSION);
    assert.deepEqual(reward, { coins: 0, packs: 0, firstWin: false });
    assert.deepEqual(s.history, []);
    assert.equal(s.stats.played, 0);
  });

  test('cannot be made poorer, and buys nothing because it needs nothing', () => {
    const s = sandbox();
    spendCoins(s, 1e9);
    assert.equal(s.coins, Infinity);
    assert.ok(canAfford(s, 1e9));
    assert.equal(buyDeck(s, SET, 'mk-lamp-lens', PROGRESSION), false, 'it has the deck already');
  });
});
