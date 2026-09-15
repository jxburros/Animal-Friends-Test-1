#!/usr/bin/env node
// Build the town decks and the Capital Cities from the current card set.
//
//   node scripts/build-decks.mjs [--check] [--only <deck-id>,<deck-id>] [--markets-only]
//
// `--only` rebuilds just the named town decks and leaves every other list exactly as it is, which is
// how an expansion adds its own decks without retuning the ones already playtested. `--markets-only`
// rebuilds the Capital Cities and leaves the town decks alone.
//
// Decks are not hand-listed: each one is a stated identity (two species, two studies) and this
// script fills it from the rated card set, strongest-for-its-cost first, inside the deck rules in
// spec/game.json — 40 cards, a curve that covers the whole pledge ladder, copies capped below.
//
// Two things this script is built to do, beyond making legal decks:
//
// **Show the collection.** The printed decks used to hold four copies of a Common and between them
// reached 46 of the 380 cards a deck may legally hold. A deck of four-ofs is a deck that plays the
// same game every time, and a collection of five hundred cards that prints two decks is a collection
// nobody meets. So copies are capped at two (one for a Super Rare, which is the rule anyway), the
// roster covers all ten species and all eight studies, and a card no earlier deck has taken wins
// every tie. Consistency is what a Mayor buys in the Deck Workshop with the ten cards over the
// minimum; the printed decks are the tour.
//
// **Put the Town Buildings in.** They are deck cards — `DECK_TYPES` has always said so — and no
// printed deck had ever held one, because this script only ever looked at Characters and Events.

import fs from 'node:fs';
import { deckProblems, deckRules, maxCopiesOf } from '../src/engine/deckbuilding.js';
import { TUTORIAL_DECK_CARDS } from '../src/tutorial/scenario.js';

const setUrl = new URL('../spec/maker_card_set.json', import.meta.url);
const set = JSON.parse(fs.readFileSync(setUrl, 'utf8'));
const rules = JSON.parse(fs.readFileSync(new URL('../spec/game.json', import.meta.url), 'utf8'));
const dr = deckRules(rules);
// A deck is built at the smallest legal size: it is a starting point, and the extra ten
// cards the Workshop now allows are a choice a Mayor makes for themselves.
const DECK_SIZE = dr.minDeckSize;

/** Characters wanted at each cost. Covers the whole pledge ladder, with the bulk in the middle. */
const CURVE = { 0: 2, 1: 4, 2: 5, 3: 5, 4: 3, 5: 2 };
const CHARACTER_TARGET = Object.values(CURVE).reduce((a, b) => a + b, 0);
/** Town Buildings per deck: a town holds few, and raising one is a round of the town's whole labour. */
const BUILDING_TARGET = 3;
const EVENT_TARGET = DECK_SIZE - CHARACTER_TARGET - BUILDING_TARGET;
/** Cards in a deck that must produce Supply or draw. Below this a deck simply cannot function. */
const ECONOMY_FLOOR = 22;
/**
 * Shift throughput a deck must reach: the sum of `output / delay` over every Character in it.
 *
 * The card-count floor above was the v0.6.0 answer to the same problem and it no longer bites — once
 * a shift counts as economy, almost every Character qualifies and the floor is met by accident. It
 * is kept because it still catches a deck with no Supply at all; this is the one that does the work.
 *
 * Measured over 1260 games of the fifteen identities, a deck's throughput predicts its win rate
 * better than anything else on the sheet (r = 0.78, against 0.70 for its Character count and -0.70
 * for its Events). The three decks below 32 won 19%, 21% and 35%; every deck above 40 won more than
 * half. All three of the weak ones were Owl decks, which is the Owl charter working exactly as
 * written — "an Owl town is wise, awake and poor" — and a species hole is a thing to build around,
 * not a thing to print a losing deck about. So a deck short of the floor hires earners, from outside
 * its two species if that is what it takes.
 */
const THROUGHPUT_FLOOR = 42;
/** Events a deck may hold. A deck that is half Events is a deck that cannot pay for them. */
const EVENT_CAP = 12;
/**
 * Copies of any one card a printed deck may hold. The deck rules allow four of a Common; a printed
 * deck takes two, so that forty cards are twenty-odd different ones and a game of it is not the same
 * four cards arriving in a different order.
 */
const COPY_CAP = 2;
/**
 * Super Rare cards a deck may hold. One copy each is the deck rule, so this is a count of distinct
 * marquee cards rather than of copies — which is why it is five now and was three before: three
 * copies used to mean as few as one card, and a deck with a single Super Rare in forty draws it
 * about once in seven games.
 */
const TOP_RARITY_CAP = 5;

/**
 * The town decks: ten identities, every species in two of them and every study in two or three.
 * Between them they are meant to be a tour of the cast rather than a tuned metagame — the Deck
 * Workshop is where a Mayor builds the deck they actually want.
 */
const IDENTITIES = [
  { id: 'mk-ledger-larder', name: 'Ledger & Larder', species: ['Squirrel', 'Mouse'], studies: ['Commerce', 'Food'],
    blurb: 'Squirrels and Mice of Commerce and Food: the books balance, the counter never closes, and everything the town eats has been costed twice.' },
  { id: 'mk-bench-bandstand', name: 'Bench & Bandstand', species: ['Badger', 'Cat'], studies: ['Crafts', 'Entertainment'],
    blurb: 'Badgers and Cats of Crafts and Entertainment: the bench turns out the work, the hall turns out the town, and neither of them stops for weather.' },
  { id: 'mk-hedgerow-hearth', name: 'Hedgerow & Hearth', species: ['Rabbit', 'Hedgehog'], studies: ['Agriculture', 'Food'],
    blurb: 'Rabbits and Hedgehogs of Agriculture and Food: a hedge takes a winter to lay and fifteen years to judge, and there is always something on for whoever turns up.' },
  { id: 'mk-dome-harbour', name: 'Dome & Harbour', species: ['Owl', 'Otter'], studies: ['Science', 'Commerce'],
    blurb: 'Owls and Otters of Science and Commerce: the watch list is kept to the minute, the river trade is signed for by the mile, and both of them are awake at four.' },
  { id: 'mk-den-docket', name: 'Den & Docket', species: ['Fox', 'Raccoon'], studies: ['Lore', 'Commerce'],
    blurb: 'Foxes and Raccoons of Lore and Commerce: everything the borough throws out has words on it, a price, or both, and these two can tell you which.' },
  { id: 'mk-ward-almanac', name: 'Ward & Almanac', species: ['Mouse', 'Raccoon'], studies: ['Civics', 'Lore'],
    blurb: 'Mice and Raccoons of Civics and Lore: the ward book is right, the split almanac off the Dump is readable again, and somebody was at the back of that meeting writing.' },
  { id: 'mk-lens-limelight', name: 'Lens & Limelight', species: ['Cat', 'Fox'], studies: ['Science', 'Entertainment'],
    blurb: 'Cats and Foxes of Science and Entertainment: the lens is ground to a tolerance nobody asked for and the room is full by nine, and it is the same animals both times.' },
  { id: 'mk-quill-quarry', name: 'Quill & Quarry', species: ['Hedgehog', 'Badger'], studies: ['Crafts', 'Civics'],
    blurb: 'Hedgehogs and Badgers of Crafts and Civics: immovable at the wall, unhurried at the bench, and still there at the end of the day when everybody who came to watch has gone home.' },
  { id: 'mk-towpath-tally', name: 'Towpath & Tally', species: ['Otter', 'Squirrel'], studies: ['Agriculture', 'Lore'],
    blurb: 'Otters and Squirrels of Agriculture and Lore: what grows on the bank, what was put by against the year it does not, and the record of every year it did not.' },
  { id: 'mk-warren-watch', name: 'Warren & Watch', species: ['Rabbit', 'Owl'], studies: ['Civics', 'Agriculture'],
    blurb: 'Rabbits and Owls of Civics and Agriculture: a hillside with a dozen doors in it, a dome above the allotment strip, and more of them arriving than leaving.' },
  { id: 'mk-galley-glass', name: 'Galley & Glass', species: ['Squirrel', 'Cat'], studies: ['Food', 'Science'],
    blurb: 'Squirrels and Cats of Food and Science: a lens ground to a tolerance nobody asked for, a tin of something put by for the year somebody needs it, and a very long night between them.' },
  { id: 'mk-press-parlour', name: 'Press & Parlour', species: ['Mouse', 'Fox'], studies: ['Crafts', 'Entertainment'],
    blurb: 'Mice and Foxes of Crafts and Entertainment: the press runs, the room fills, and nobody has ever had to be asked twice to come out on a Tuesday.' },
  { id: 'mk-mill-mooring', name: 'Mill & Mooring', species: ['Badger', 'Otter'], studies: ['Food', 'Crafts'],
    blurb: 'Badgers and Otters of Food and Crafts: it is ground at the mill, it is cooked at the mill, and whatever is left goes down the river before the tide turns.' },
  { id: 'mk-wall-window', name: 'Wall & Window', species: ['Hedgehog', 'Owl'], studies: ['Science', 'Lore'],
    blurb: 'Hedgehogs and Owls of Science and Lore: nothing gets over the wall and nothing gets past the window, and both of them will be there in the morning to tell you so.' },
  { id: 'mk-burrow-bazaar', name: 'Burrow & Bazaar', species: ['Rabbit', 'Raccoon'], studies: ['Entertainment', 'Agriculture'],
    blurb: 'Rabbits and Raccoons of Entertainment and Agriculture: everything the borough throws out turns up on a trestle by the allotment gate, and by evening somebody is singing over it.' },
];

/**
 * The Capital Cities. A market deck is a quarry of Statues and a pool of lots to deal a sample from,
 * so what is on the board changes from game to game; a market's *identity* is what its pool leans
 * towards. `weigh` scores a card for that leaning and the pool is filled best-first, but every
 * market-side card in the collection lands in at least one pool — the First Workings takes the whole
 * catalogue, which is what makes it the one to play if you want to meet everything.
 *
 * `poolSize` is how many lots are dealt from the pool for one game, so a bigger pool is more variety
 * between games rather than a longer game.
 */
const MARKETS = [
  {
    id: 'mk-first-workings',
    name: 'The First Workings',
    blurb: 'The whole catalogue in one quarry: every lot the borough has ever put up, every Ordinance the Capital City can post, and fifteen virtues to raise nine of — so no two games put the same market, or the same monuments, in front of you.',
    poolSize: 26,
    poolDepth: Infinity, // the whole catalogue: this is the market to play to meet everything
    minDisruptions: 3,
    weigh: () => 1, // everything, equally
  },
  {
    id: 'mk-hard-times',
    name: 'Hard Times',
    blurb: 'The winter the Grain Exchange shut, the year the bridge went, the assessors at the door and the works in the square: a Capital City that takes animals off your board and then makes the monuments dearer.',
    poolSize: 26,
    poolDepth: 45,
    minDisruptions: 6,
    weigh: (c, mentions) => (c.type === 'disruption' ? 6 : 0)
      + (c.type === 'ordinance' ? 5 : 0)
      + (mentions(/Unemploy|unemploy|LosesSupply|blockNextReady|endAllShifts/) ? 4 : 0),
  },
  {
    id: 'mk-hiring-fair',
    name: 'The Hiring Fair',
    blurb: 'The board is full, the hall is open and everything is for hire: a Capital City of animals to take on and roofs to put up, where the bidding is over labour rather than weather.',
    poolSize: 26,
    poolDepth: 45,
    minDisruptions: 2,
    weigh: (c, mentions) => (c.type === 'marketCharacter' ? 6 : 0)
      + (c.type === 'building' ? 5 : 0)
      + (mentions(/rehire|recruitFromHand|readyCharacter|advanceCharacter|gainSupply/) ? 3 : 0)
      - (c.type === 'disruption' ? 3 : 0),
  },
];

const score = (c) => (c.power && c.power.score) || 0;
const cards = set.cards;

/**
 * Cards an earlier deck in this run has already taken. Decks are built in order and a card nobody
 * has printed yet wins every tie, which is what turns ten decks into a tour of the collection rather
 * than ten variations on the forty best-rated cards in it. It only ever breaks ties: a deck never
 * takes a worse card for its identity to be first with it.
 */
const alreadyPrinted = new Set();
const fresh = (c) => (alreadyPrinted.has(c.id) ? 0 : 1);
/** The order every pool in this script is read in: fit first, then novelty, then rating. */
const pick = (ident) => (a, b) => affinity(b, ident) - affinity(a, ident)
  || fresh(b) - fresh(a)
  || score(b) - score(a)
  || a.id.localeCompare(b.id);

/** How well a card fits an identity: its own species and studies first, then anything playable. */
function affinity(card, ident) {
  let a = 0;
  if (ident.species.includes(card.species)) a += 3;
  if (ident.studies.includes(card.study)) a += 2;
  for (const r of card.requires || []) {
    if (ident.species.includes(r.species)) a += 2;
    if (ident.studies.includes(r.study)) a += 2;
    if (r.name) a += cards.some((c) => c.name === r.name && ident.species.includes(c.species)) ? 2 : -3;
  }
  return a;
}

function build(ident) {
  const list = {};
  const count = () => Object.values(list).reduce((a, b) => a + b, 0);
  const topCopies = () => Object.entries(list).reduce((a, [id, n]) => {
    const r = cards.find((c) => c.id === id).rarity;
    return a + (r === 'Super Rare' || r === 'Legendary' ? n : 0);
  }, 0);
  const take = (card, n) => {
    // Two of anything, and the deck rules' own limit on top — which is one for a Super Rare.
    const limit = Math.min(COPY_CAP, maxCopiesOf(dr, card));
    let room = Math.min(n, limit - (list[card.id] || 0), DECK_SIZE - count());
    // One copy each is the rule; this is the other half of it — a deck has a few marquee cards
    // rather than a deck made of them.
    if (card.rarity === 'Super Rare' || card.rarity === 'Legendary') {
      room = Math.min(room, TOP_RARITY_CAP - topCopies());
    }
    if (room > 0) {
      list[card.id] = (list[card.id] || 0) + room;
      alreadyPrinted.add(card.id);
    }
    return Math.max(0, room);
  };

  /**
   * How far below its share of the curve a cost band is, counting whatever is already in the deck.
   *
   * The bands above fill the curve exactly; everything after them — the economy floor, the top-ups —
   * used to take whatever fitted the identity best, which with a two-copy cap meant reaching further
   * down the affinity list and filling the deck with whatever happened to be there. That is how a
   * deck ends up running eight cost-5 animals: not a decision, a side effect. So every later pass
   * reads the shape of CURVE rather than its counts, and takes from whichever band is furthest
   * behind, however many Characters the deck turns out to want.
   */
  const curveShare = (cost) => CURVE[cost] / CHARACTER_TARGET;
  const charCount = () => Object.entries(list).reduce((a, [id, n]) => a + (cards.find((c) => c.id === id).type === 'character' ? n : 0), 0);
  const atCost = (cost) => Object.entries(list).reduce((a, [id, n]) => {
    const c = cards.find((x) => x.id === id);
    return a + (c.type === 'character' && c.cost === cost ? n : 0);
  }, 0);
  const shortfall = (card) => (card.type !== 'character' ? 0 : curveShare(card.cost) * Math.max(charCount(), CHARACTER_TARGET) - atCost(card.cost));
  /** Whichever band is furthest behind the curve first, then the ordinary order. */
  const byCurveThen = (ident2) => (a, b) => shortfall(b) - shortfall(a) || pick(ident2)(a, b);

  // The tutorial is played with the real printed decks, so the cards its arranged match needs are
  // seeded before anything else. They are read from the scenario itself rather than listed here, so
  // a change to the lesson cannot quietly leave a deck without the card it teaches.
  for (const id of TUTORIAL_DECK_CARDS[ident.id] || []) {
    const card = cards.find((c) => c.id === id);
    if (card) take(card, 1);
  }

  // Characters, cost band by cost band, best fit then best rated.
  let chars = 0;
  for (const [cost, want] of Object.entries(CURVE)) {
    const band = cards
      .filter((c) => c.type === 'character' && c.cost === Number(cost) && affinity(c, ident) > 0)
      .sort(pick(ident));
    let got = 0;
    for (const c of band) {
      if (got >= want) break;
      got += take(c, Math.min(want - got, maxCopiesOf(dr, c)));
    }
    chars += got;
  }
  // Anything the curve could not fill from the identity, fill from the whole catalogue.
  if (chars < CHARACTER_TARGET) {
    const rest = cards.filter((c) => c.type === 'character' && !list[c.id])
      .sort(pick(ident));
    for (const c of rest) {
      if (chars >= CHARACTER_TARGET) break;
      chars += take(c, Math.min(2, CHARACTER_TARGET - chars));
    }
  }

  // Town Buildings. They are deck cards and always were, and until this pass no printed deck held
  // one — this script only ever looked at Characters and Events. A Building is raised by putting
  // animals to work, so a deck takes a few and leans on the town it has already built.
  const buildings = cards.filter((c) => c.type === 'townBuilding').sort(pick(ident));
  let blds = 0;
  for (const c of buildings) {
    if (blds >= BUILDING_TARGET) break;
    blds += take(c, Math.min(COPY_CAP, BUILDING_TARGET - blds));
  }

  // Events this deck can actually pay for. Affinity is not enough: an Event whose requirement no
  // Character in this deck satisfies is a dead card, and a deck full of dead Events simply loses.
  // So every requirement unit is checked against the Characters already chosen, and an Event is only
  // taken if the deck fields enough matching bodies to play it more than once.
  const chosenChars = Object.entries(list)
    .map(([id, n]) => ({ card: cards.find((c) => c.id === id), n }))
    .filter((e) => e.card.type === 'character');
  const bodiesMatching = (req) => chosenChars.reduce((a, e) => {
    const c = e.card;
    if (req.name) return a + (c.name === req.name ? e.n : 0);
    if (req.species && c.species !== req.species) return a;
    if (req.study && c.study !== req.study) return a;
    return a + e.n;
  }, 0);
  const playability = (ev) => {
    let worst = Infinity;
    for (const r of ev.requires || []) {
      const need = r.count || 1;
      worst = Math.min(worst, bodiesMatching(r) / need);
    }
    return worst === Infinity ? 6 : worst;
  };
  /**
   * Bodies a deck needs before an Event is worth printing.
   *
   * Three, as a rule: a card you can play once in three games is a dead card. An Event that names a
   * Character is the exception, and the two-copy cap is what made it one — "Requires Inkwell" is
   * satisfied by any version of Inkwell, so a deck that runs two of her is a deck that draws her,
   * and asking for three bodies of one animal when no card may be printed more than twice quietly
   * cut every named Event in the collection out of every deck.
   */
  const eventFloor = (ev) => ((ev.requires || []).some((r) => r.name) ? 2 : 3);
  const events = cards.filter((c) => c.type === 'event' && playability(c) >= eventFloor(c))
    .sort((a, b) => playability(b) - playability(a) || pick(ident)(a, b));
  let evs = 0;
  for (const c of events) {
    if (evs >= Math.min(EVENT_TARGET, EVENT_CAP) || count() >= DECK_SIZE) break;
    evs += take(c, Math.min(COPY_CAP, Math.min(EVENT_TARGET, EVENT_CAP) - evs));
  }
  // Every deck needs an engine. Playtests found the decks that lost were not the ones with weaker
  // cards — by the power model they often had the strongest — but the ones starved of Supply and
  // cards: a town that cannot pay cannot recruit, cannot work, and cannot bid. So each deck is held
  // to a floor of cards that produce Supply or draw, filled from whatever fits its identity best.
  const economyOf = (card) => {
    // A shift is the town's economy — it is where almost all of the game's Supply comes from — and
    // reading only the printed abilities missed that entirely. It mattered little while a deck could
    // hold four copies of one card; with a two-copy cap the floor had to reach much further down the
    // list to be met, and what it reached were the dear animals that happen to carry a `gainSupply`.
    // That is how a deck ends up running eight cost-5s, and it is why the curve kept slipping.
    const working = card.shift && card.shift.output > 0 ? 1 : 0;
    const blob = JSON.stringify([card.abilities || [], card.effect || null, card.onGain || null]);
    return working + (blob.match(/"gainSupply"/g) || []).length + (blob.match(/"draw"/g) || []).length;
  };
  const economyCount = () => Object.entries(list).reduce((a, [id, n]) => a + (economyOf(cards.find((c) => c.id === id)) ? n : 0), 0);
  if (economyCount() < ECONOMY_FLOOR) {
    const engines = cards
      .filter((c) => (c.type === 'character' || c.type === 'event') && economyOf(c) > 0 && (list[c.id] || 0) < maxCopiesOf(dr, c))
      .filter((c) => c.type !== 'event' || playability(c) >= eventFloor(c))
      .sort(byCurveThen(ident));
    // Make room by dropping the least useful non-engine cards we took.
    const droppable = Object.keys(list)
      .map((id) => cards.find((c) => c.id === id))
      .filter((c) => !economyOf(c))
      .sort((a, b) => pick(ident)(b, a));
    let di = 0;
    for (const c of engines) {
      if (economyCount() >= ECONOMY_FLOOR) break;
      while (count() >= DECK_SIZE && di < droppable.length) {
        const drop = droppable[di];
        if (list[drop.id]) { list[drop.id]--; if (!list[drop.id]) delete list[drop.id]; }
        di++;
      }
      take(c, 1);
    }
  }

  // The throughput floor. A deck below it is a town that cannot pay, and a town that cannot pay
  // cannot recruit, work or bid — so it trades its least useful Events for the best earners it can
  // still reach. Identity is a centre of gravity, not a fence: an Owl deck that has to hire a Badger
  // to keep the lamps on is an Owl deck that gets to play its Owls.
  const rateOf = (c) => (c.type === 'character' && c.shift && c.shift.delay ? c.shift.output / c.shift.delay : 0);
  const throughput = () => Object.entries(list).reduce((a, [id, n]) => a + rateOf(cards.find((c) => c.id === id)) * n, 0);
  if (throughput() < THROUGHPUT_FLOOR) {
    const spare = () => Object.keys(list)
      .map((id) => cards.find((c) => c.id === id))
      .filter((c) => c.type === 'event')
      .sort((a, b) => pick(ident)(b, a))[0];
    let guard = 0;
    while (throughput() < THROUGHPUT_FLOOR && guard++ < DECK_SIZE) {
      const earner = cards.filter((c) => c.type === 'character'
        && (list[c.id] || 0) < Math.min(COPY_CAP, maxCopiesOf(dr, c)))
        .sort((a, b) => rateOf(b) - rateOf(a) || shortfall(b) - shortfall(a) || pick(ident)(a, b))[0];
      if (!earner) break;
      if (count() >= DECK_SIZE) {
        const drop = spare();
        if (!drop) break;
        list[drop.id]--;
        if (!list[drop.id]) delete list[drop.id];
      }
      if (!take(earner, 1)) break;
    }
  }

  // If the identity simply has not got enough payable Events, take Characters instead of dead cards.
  if (count() < DECK_SIZE) {
    const moreChars = cards.filter((c) => c.type === 'character')
      .sort(byCurveThen(ident));
    for (const c of moreChars) {
      if (count() >= DECK_SIZE) break;
      take(c, 1);
    }
  }
  // Top up to exactly 40 with whatever still has room, Characters first.
  for (const pool of [cards.filter((c) => c.type === 'character'), cards.filter((c) => c.type === 'event')]) {
    // Re-sorted each time round: taking a cost-3 animal changes which band is furthest behind.
    while (count() < DECK_SIZE) {
      const next = pool.filter((c) => (list[c.id] || 0) < Math.min(COPY_CAP, maxCopiesOf(dr, c)))
        .sort(byCurveThen(ident))[0];
      if (!next || !take(next, 1)) break;
    }
  }
  return list;
}

const MARKETS_ONLY = process.argv.includes('--markets-only');
const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg >= 0 && process.argv[onlyArg + 1] ? new Set(process.argv[onlyArg + 1].split(',')) : null;
for (const id of ONLY || []) {
  if (!IDENTITIES.some((i) => i.id === id)) { console.error(`Unknown deck ${id}`); process.exit(1); }
}

// With `--only`, the decks that are not being rebuilt have still printed what they hold, so their
// cards are already spoken for as far as the novelty tie-break is concerned.
if (ONLY) {
  for (const deck of set.decks || []) {
    if (!ONLY.has(deck.id)) for (const id of Object.keys(deck.list || {})) alreadyPrinted.add(id);
  }
}

const built = (MARKETS_ONLY ? [] : IDENTITIES.filter((ident) => !ONLY || ONLY.has(ident.id))).map((ident) => ({
  id: ident.id,
  name: ident.name,
  species: ident.species,
  studies: ident.studies,
  blurb: ident.blurb,
  list: build(ident),
}));

/** Card types the Capital City deals from its pool; the Statues are its quarry and sit apart. */
const MARKET_TYPES = new Set(['market', 'building', 'marketCharacter', 'disruption', 'ordinance']);

function buildMarket(ident) {
  const lots = cards.filter((c) => MARKET_TYPES.has(c.type));
  const mentionsOf = (c) => {
    const blob = JSON.stringify([c.abilities || [], c.effect || null, c.onGain || null, c.onReveal || null]);
    return (re) => re.test(blob);
  };
  const weight = (c) => ident.weigh(c, mentionsOf(c));
  // Everything the market leans towards, then the rest of the catalogue behind it. The First
  // Workings weighs everything the same, so it simply takes the lot.
  // `poolDepth` is how deep into that order the market's quarry goes. It is not the same as
  // `poolSize`: a pool barely bigger than the sample deals almost the same market every game, which
  // is the one thing a Capital City must never do.
  const ordered = lots.slice()
    .sort((a, b) => weight(b) - weight(a) || score(b) - score(a) || a.id.localeCompare(b.id));
  const depth = ident.poolDepth === undefined ? ordered.length : ident.poolDepth;
  const pool = ordered.slice(0, depth);
  // Weather falls on a fair too. A market that promises a floor of on-reveal cards has to have
  // enough of them in the quarry to meet it whatever the shuffle does, and a market whose leaning is
  // *away* from shocks will not have taken any: the Hiring Fair's weighting ranks them last on
  // purpose, and without this it would promise two and deal none.
  const shocks = pool.filter((c) => c.type === 'disruption').length;
  const want = (ident.minDisruptions || 0) * 3;
  if (shocks < want) {
    const spare = ordered.slice(depth).filter((c) => c.type === 'disruption').slice(0, want - shocks);
    for (const c of spare) {
      // Drop the least-wanted non-shock to make room, keeping the quarry the size it was printed at.
      const drop = pool.map((x, i) => [x, i]).reverse().find(([x]) => x.type !== 'disruption');
      if (!drop) break;
      pool.splice(drop[1], 1, c);
    }
  }
  const poolIds = pool.map((c) => c.id);
  return {
    id: ident.id,
    name: ident.name,
    blurb: ident.blurb,
    statuePool: cards.filter((c) => c.type === 'statue').map((c) => c.id),
    statueCount: rules.victory.statueTotal,
    pool: poolIds,
    poolSize: Math.min(ident.poolSize, poolIds.length),
    minDisruptions: ident.minDisruptions,
  };
}

const markets = MARKETS.map(buildMarket);
const inSomePool = new Set(markets.flatMap((m) => m.pool));
const orphaned = cards.filter((c) => MARKET_TYPES.has(c.type) && !inSomePool.has(c.id));

let bad = 0;
for (const m of markets) {
  const kinds = {};
  for (const id of m.pool) {
    const t = cards.find((c) => c.id === id).type;
    kinds[t] = (kinds[t] || 0) + 1;
  }
  console.log(`${m.name.padEnd(20)} pool ${String(m.pool.length).padStart(3)} (deal ${m.poolSize}), ${Object.entries(kinds).map(([t, n]) => `${n} ${t}`).join(', ')}`);
}
if (orphaned.length) {
  bad++;
  console.log(`  PROBLEM: ${orphaned.length} market card(s) in no Capital City: ${orphaned.map((c) => c.id).join(', ')}`);
}
console.log('');

for (const deck of built) {
  const problems = deckProblems(rules, set, deck.list);
  const tally = (type) => Object.entries(deck.list).reduce((a, [id, n]) => a + (cards.find((c) => c.id === id).type === type ? n : 0), 0);
  const chars = tally('character');
  const curve = {};
  for (const [id, n] of Object.entries(deck.list)) {
    const c = cards.find((x) => x.id === id);
    if (c.type === 'character') curve[c.cost] = (curve[c.cost] || 0) + n;
  }
  const total = Object.values(deck.list).reduce((a, b) => a + b, 0);
  console.log(`${deck.name.padEnd(20)} ${total} cards, ${chars}C/${tally('event')}E/${tally('townBuilding')}B, curve ${[0, 1, 2, 3, 4, 5].map((k) => curve[k] || 0).join('/')}, ${Object.keys(deck.list).length} distinct`);
  if (problems.length) { bad++; console.log(`  PROBLEMS: ${problems.join(' ')}`); }
}

if (process.argv.includes('--check')) {
  process.exit(bad ? 1 : 0);
} else if (!bad) {
  if (ONLY) {
    // Replace or append only the decks asked for, keeping the others' printed lists untouched.
    for (const deck of built) {
      const i = set.decks.findIndex((d) => d.id === deck.id);
      if (i >= 0) set.decks[i] = deck; else set.decks.push(deck);
    }
  } else if (!MARKETS_ONLY) {
    set.decks = built;
  }
  // `--only` names town decks, so it leaves the Capital Cities alone as well as the other decks.
  if (!ONLY) set.marketDecks = markets;
  fs.writeFileSync(setUrl, `${JSON.stringify(set, null, 1)}\n`);
  const wrote = [
    built.length ? `${built.length} deck${built.length === 1 ? '' : 's'}` : null,
    ONLY ? null : `${markets.length} Capital Cities`,
  ].filter(Boolean).join(' and ');
  console.log(`\nWrote ${wrote} to spec/maker_card_set.json.`);
} else {
  console.error('\nNot written: some decks are illegal.');
  process.exit(1);
}
