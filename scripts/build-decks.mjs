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
// nobody meets. So copies are capped at two (one for a Super Rare or a Legendary, which is the rule anyway), the
// roster covers all ten species and all eight studies, and a card no earlier deck has taken wins
// every tie. Consistency is what a Mayor buys in the Deck Workshop with the ten cards over the
// minimum; the printed decks are the tour.
//
// **Put the Town Buildings in.** They are deck cards — `DECK_TYPES` has always said so — and no
// printed deck had ever held one, because this script only ever looked at Characters and Events.

import fs from 'node:fs';
import { deckProblems, deckRules, maxCopiesOf } from '../src/engine/deckbuilding.js';

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
 * Marquee cards a deck may hold — Super Rare and Legendary together, since both are one-copy cards.
 * One copy each is the deck rule, so this is a count of distinct marquee cards rather than of copies
 * — which is why it is five now and was three before: three copies used to mean as few as one card,
 * and a deck with a single Super Rare in forty draws it about once in seven games.
 */
const TOP_RARITY_CAP = 5;

/**
 * The town decks: fifteen identities, every species in three of them and every study in three or
 * four. Between them they are meant to be a tour of the cast rather than a tuned metagame — the
 * Deck Workshop is where a Mayor builds the deck they actually want.
 *
 * The first six are the identities settled by playtest in the six-deck pass, unchanged in name,
 * species and studies. What changed under them is the builder, so their printed lists are not the
 * ones that pass measured. The nine after them widen the roster until every species has three decks
 * written for it, which is what the coverage in the header is bought with.
 */
const TOWNS = [
  { id: 'mk-tin-tally', name: 'Tin & Tally', species: ['Squirrel', 'Otter'], studies: ['Commerce', 'Agriculture'],
    blurb: 'Squirrels and Otters of Commerce and Agriculture: the long shift is the whole plan. Every animal works, every shift is costed twice, and the tin behind the desk is fuller than the ledger admits.' },
  { id: 'mk-gavel-ribbon', name: 'Gavel & Ribbon', species: ['Fox', 'Raccoon'], studies: ['Civics', 'Crafts'],
    blurb: 'Foxes and Raccoons of Civics and Crafts: the town that turns up at the Auction House with something it made this morning. It pledges high, works the City Dump, and dares the other Mayor to keep raising.' },
  { id: 'mk-lamp-lens', name: 'Lamp & Lens', species: ['Owl', 'Fox'], studies: ['Science', 'Commerce'],
    blurb: 'Owls and Foxes of Science and Commerce: instruments, night work and a price for everything. It knows what the Capital City is about to put up before the other Mayor has looked at the board.' },
  { id: 'mk-larder-long-table', name: 'Larder & Long Table', species: ['Hedgehog', 'Mouse'], studies: ['Food', 'Crafts'],
    blurb: 'Hedgehogs and Mice of Food and Crafts: the kitchen and the bench, and a table long enough for everybody. Whatever the weather takes off the board is fed, mended and back at work by morning.' },
  { id: 'mk-bandstand-bell', name: 'Bandstand & Bell', species: ['Rabbit', 'Cat'], studies: ['Entertainment', 'Civics'],
    blurb: 'Rabbits and Cats of Entertainment and Civics: a town played at double time. Animals stand back up the turn they sat down, and the hall is open again before the rival has finished their Ready.' },
  { id: 'mk-ledger-legend', name: 'Ledger & Legend', species: ['Badger', 'Raccoon'], studies: ['Commerce', 'Lore'],
    blurb: 'Badgers and Raccoons of Commerce and Lore: the counting house and the long room in one town. It keeps the books, keeps the stories, and knows which of the two the borough will actually pay for.' },
  { id: 'mk-ledger-larder', name: 'Ledger & Larder', species: ['Squirrel', 'Mouse'], studies: ['Commerce', 'Food'],
    blurb: 'Squirrels and Mice of Commerce and Food: the books balance, the counter never closes, and everything the town eats has been costed twice.' },
  { id: 'mk-bench-bandstand', name: 'Bench & Bandstand', species: ['Badger', 'Cat'], studies: ['Crafts', 'Entertainment'],
    blurb: 'Badgers and Cats of Crafts and Entertainment: the bench turns out the work, the hall turns out the town, and neither of them stops for weather.' },
  { id: 'mk-hedgerow-hearth', name: 'Hedgerow & Hearth', species: ['Rabbit', 'Hedgehog'], studies: ['Agriculture', 'Food'],
    blurb: 'Rabbits and Hedgehogs of Agriculture and Food: a hedge takes a winter to lay and fifteen years to judge, and there is always something on for whoever turns up.' },
  { id: 'mk-dome-harbour', name: 'Dome & Harbour', species: ['Owl', 'Otter'], studies: ['Science', 'Civics'],
    blurb: 'Owls and Otters of Science and Civics: the watch list is kept to the minute and the river licence is granted out of one office, and both of them are awake at four to say so at the meeting.' },
  { id: 'mk-press-parlour', name: 'Press & Parlour', species: ['Mouse', 'Fox'], studies: ['Crafts', 'Lore'],
    blurb: 'Mice and Foxes of Crafts and Lore: the press runs all night and everything that comes off it has been across somebody’s shelves first, because a correction is dearer than a delay.' },
  { id: 'mk-galley-glass', name: 'Galley & Glass', species: ['Squirrel', 'Cat'], studies: ['Food', 'Science'],
    blurb: 'Squirrels and Cats of Food and Science: a lens ground to a tolerance nobody asked for, a tin of something put by for the year somebody needs it, and a very long night between them.' },
  { id: 'mk-quill-quarry', name: 'Quill & Quarry', species: ['Hedgehog', 'Badger'], studies: ['Civics', 'Lore'],
    blurb: 'Hedgehogs and Badgers of Civics and Lore: immovable at the meeting, unhurried in the record, and still there at the end of the day when everybody who came to watch has gone home.' },
  { id: 'mk-warren-watch', name: 'Warren & Watch', species: ['Rabbit', 'Owl'], studies: ['Agriculture', 'Science'],
    blurb: 'Rabbits and Owls of Agriculture and Science: a dome above the allotment strip and a forecast to the minute under it, and more of them arriving than leaving.' },
  { id: 'mk-towpath-bazaar', name: 'Towpath & Bazaar', species: ['Otter', 'Raccoon'], studies: ['Agriculture', 'Entertainment'],
    blurb: 'Otters and Raccoons of Agriculture and Entertainment: everything the borough throws out turns up on a trestle by the allotment gate, and by evening somebody is singing over it.' },
];

/**
 * What a Character earns per turn on shift, and 0 for anything that does not work.
 *
 * Every `support` below leans on this as well as on its own engine, and it is not decoration. A
 * support weight competes with the species and study bonuses, so a heavy one buys engine pieces with
 * card quality: the first cut of the Apron & Hook deck weighted every mention of `rehire` at 4, took
 * the borough's slowest Otters because their cards say the word, and won 21% of 240 games. The same
 * identity, its engine weighted at 2 and a town that can pay behind it, wins half.
 */
const worksFor = (c) => (c.type === 'character' && c.shift && c.shift.delay ? c.shift.output / c.shift.delay : 0);

/**
 * The legendary decks: one deck for each of the ten Legendary cards, written around that card.
 *
 * A town deck above is an identity — two species and two studies — and the builder fills it with
 * whatever fits. That is a fine way to print a tour of the collection and a poor way to meet a
 * Legendary: a one-copy card in a forty-card deck turns up in about a third of games, and when it
 * does it wants a town already arranged for what it does. So each deck here states an `anchor` (the
 * Legendary it is built around, seeded into the list before anything else) and a `support` function
 * that says what feeds it — the cards that make its ability worth the slot. `support` adds to
 * affinity, so it steers every pass of the builder rather than bolting a few cards on the end, and
 * it may go negative: Annabelle only pays out while she is the only Raccoon standing, so her deck is
 * written to keep her that way.
 *
 * The anchor's own species and studies are not automatically the deck's. Most of the time they are,
 * because the animals who work alongside her are the ones her ability reaches; where the card says
 * otherwise, the identity says otherwise too.
 */
const LEGENDS = [
  {
    id: 'mk-warden-bench', name: 'Warden & Bench', anchor: 'mk_berry_guild_warden_5',
    species: ['Hedgehog', 'Badger'], studies: ['Civics', 'Crafts'],
    blurb: 'Hedgehogs and Badgers of Civics and Crafts, built around Berry, Guild Warden: the town that hires its own back. Berry stands up, somebody out of work is behind the bench again three Supply cheaper, and whoever the rival was about to reach for is out of reach.',
    support: (c, m) => (m(/rehire|nemploy/) ? 2 : 0) + (c.type === 'character' && c.cost >= 3 ? 1 : 0)
      + (worksFor(c) >= 1.5 ? 2 : 0),
  },
  {
    id: 'mk-whistle-lamp', name: 'Whistle & Lamp', anchor: 'mk_biff_chief_constable_4',
    species: ['Hedgehog', 'Fox'], studies: ['Civics', 'Lore'],
    blurb: 'Hedgehogs and Foxes of Civics and Lore, built around Biff, Chief Constable: two of theirs put back to work and one of yours found something to do, every time he stands up. A town that wins the turn rather than the card.',
    support: (c, m) => (m(/makeBusy|endShift|endAllShifts|blockNextReady/) ? 2 : 0) + (m(/rehire/) ? 1 : 0)
      + (worksFor(c) >= 1.5 ? 2 : 0),
  },
  {
    id: 'mk-knife-kindling', name: 'Knife & Kindling', anchor: 'mk_betty_whittler_1',
    species: ['Hedgehog', 'Mouse'], studies: ['Crafts', 'Commerce'],
    blurb: 'Hedgehogs and Mice of Crafts and Commerce, built around Betty, Whittler: a Supply back on the turn she arrives and nothing the rival can do about her. The cheapest animal in the borough, in the deck that plays four of its friends behind her.',
    support: (c, m) => (c.type === 'character' && c.cost <= 2 ? 2 : 0)
      + (c.type === 'character' && c.cost >= 4 ? -1 : 0)
      + (m(/onRecruit|recruitFromHand/) ? 2 : 0)
      + (worksFor(c) >= 1.5 ? 2 : 0),
  },
  {
    id: 'mk-hedge-horizon', name: 'Hedge & Horizon', anchor: 'mk_betty_land_clearer_5',
    species: ['Hedgehog', 'Rabbit'], studies: ['Agriculture', 'Civics'],
    blurb: 'Hedgehogs and Rabbits of Agriculture and Civics, built around Betty, Land Clearer: four seasons of noise on the far hedgerow and the best ground in the borough at the end of it. The deck exists to get her upright early and then again sooner than she ought to be.',
    support: (c, m) => (m(/advanceCharacter|readyCharacter/) ? 2 : 0) + (m(/gainSupply/) ? 1 : 0)
      + (worksFor(c) >= 1.5 ? 2 : 0),
  },
  {
    id: 'mk-can-row', name: 'Can & Row', anchor: 'mk_clover_seedling_helper_0',
    species: ['Rabbit', 'Mouse'], studies: ['Agriculture', 'Entertainment'],
    blurb: 'Rabbits and Mice of Agriculture and Entertainment, built around Clover, Seedling Helper: free, and brings somebody smaller still along by the other handle. Every animal in this town is one Clover can pull out of your hand for nothing.',
    support: (c, m) => (c.type === 'character' && c.cost <= 2 ? 3 : 0)
      + (c.type === 'character' && c.cost >= 4 ? -2 : 0)
      + (m(/onRecruit/) ? 1 : 0)
      + (worksFor(c) >= 1.5 ? 2 : 0),
  },
  {
    id: 'mk-gate-wall', name: 'Gate & Wall', anchor: 'mk_tb_quill_wall',
    species: ['Hedgehog', 'Otter'], studies: ['Crafts', 'Civics'],
    blurb: 'Hedgehogs and Otters of Crafts and Civics, built around The Quill Wall: four animals to raise it and, from then on, nobody of yours goes to Unemployment by anybody else\u2019s doing. It is not much of a wall. Nothing has ever got over it.',
    support: (c, m) => (c.type === 'townBuilding' ? 4 : 0)
      + (c.type === 'character' && c.cost <= 2 ? 1 : 0)
      + (m(/unemploymentShield|protectCharacter/) ? 1 : 0)
      + (worksFor(c) >= 1.5 ? 2 : 0),
  },
  {
    id: 'mk-barrel-bonfire', name: 'Barrel & Bonfire', anchor: 'mk_quill_cider_maker_3',
    species: ['Hedgehog', 'Mouse'], studies: ['Food', 'Lore'],
    blurb: 'Hedgehogs and Mice of Food and Lore, built around Quill, Cider Maker: the social runs in the barn from September to February and the bonfires happen whenever she can invent a reason. A Supply and a shielded neighbour every time she comes upright, so the town is arranged to make that happen twice a round.',
    support: (c, m) => (m(/advanceCharacter|readyCharacter/) ? 2 : 0) + (m(/"onReady"/) ? 1 : 0)
      + (worksFor(c) >= 1.5 ? 2 : 0),
  },
  {
    id: 'mk-basket-ladder', name: 'Basket & Ladder', anchor: 'mk_quill_harvest_steward_5',
    species: ['Hedgehog', 'Badger'], studies: ['Agriculture', 'Commerce'],
    blurb: 'Hedgehogs and Badgers of Agriculture and Commerce, built around Quill, Harvest Steward: seven Supply off one shift, a neighbour nobody can touch, and not one animal of yours sent to Unemployment while she is up. The long shifts behind her are the whole point of keeping them safe.',
    support: (c, m) => (c.type === 'character' && c.shift && c.shift.output >= 4 ? 2 : 0)
      + (m(/unemploymentShield|protectCharacter/) ? 2 : 0)
      + (worksFor(c) >= 1.5 ? 2 : 0),
  },
  {
    id: 'mk-apron-hook', name: 'Apron & Hook', anchor: 'mk_gwen_apron_on_the_hook_4',
    species: ['Mouse', 'Otter'], studies: ['Food', 'Commerce'],
    blurb: 'Mice and Otters of Food and Commerce, built around Gwen, The Apron on the Hook: she works while she is Busy, and what she does with the hour is put somebody on \u2014 out of either town\u2019s Unemployment, or off the floor of the City Dump, two Supply cheaper and upright on arrival. It has never mattered to her whose books you were on.',
    support: (c, m) => (m(/rehire|nemploy/) ? 2 : 0) + (m(/"busy"/) ? 2 : 0)
      + (worksFor(c) >= 1.5 ? 2 : 0),
  },
  {
    id: 'mk-paper-lamplight', name: 'Paper & Lamplight', anchor: 'mk_annabelle_last_one_up_2',
    species: ['Owl', 'Cat'], studies: ['Lore', 'Science'],
    blurb: 'Owls and Cats of Lore and Science, built around Annabelle, Last One Up: two Supply and a card every turn she is the only Raccoon standing \u2014 so this is a town with exactly one Raccoon in it, and everybody else is awake at that hour anyway.',
    support: (c, m) => (c.species === 'Raccoon' ? -8 : 0) + (m(/"draw"/) ? 2 : 0) + (m(/protectCharacter/) ? 1 : 0)
      + (worksFor(c) >= 1.5 ? 2 : 0),
  },
];

/** Every printed deck: the fifteen town identities, then one deck for each Legendary. */
const IDENTITIES = [...TOWNS, ...LEGENDS];

/**
 * The Capital Cities. A market deck is a quarry of Statues and a pool of lots to deal a sample from,
 * so what is on the board changes from game to game; a market's *identity* is what its pool leans
 * towards. `weigh` scores a card for that leaning and the pool is filled best-first, but every
 * market-side card in the collection lands in at least one pool.
 *
 * `quarry` picks the virtues this market carves from. Nine Statues are raised in any one game and the
 * collection carves fifteen, so a market that took the lot would make the choice of Capital City a
 * choice of pool size and nothing else. Twelve each, overlapping but not equal, makes which monuments
 * are on the table part of where you chose to play; between them the three quarry all fifteen.
 *
 * `poolSize` is how many lots are dealt from the pool for one game, so a bigger pool is more variety
 * between games rather than a longer game.
 */
const MARKETS = [
  {
    id: 'mk-founders-fair',
    name: "The Founders' Fair",
    blurb: 'The whole catalogue in one quarry: every lot the borough has ever put up, every Ordinance the Capital City can post, and a dozen virtues to raise nine of \u2014 so no two games put the same market, or the same monuments, in front of you.',
    poolSize: 26,
    poolDepth: Infinity, // the whole catalogue: this is the market to play to meet everything
    minDisruptions: 3,
    quarry: (statues) => statues.slice(0, 12),
    weigh: () => 1, // everything, equally
  },
  {
    id: 'mk-lean-winter',
    name: 'The Lean Winter',
    blurb: 'The winter the Grain Exchange shut, the year the bridge went, the assessors at the door and the works in the square: a Capital City that takes animals off your board and then makes the monuments dearer.',
    poolSize: 26,
    poolDepth: 45,
    minDisruptions: 6,
    quarry: (statues) => statues.slice(-12),
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
    quarry: (statues) => statues.filter((_, i) => i % 5 !== 0).slice(0, 12),
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

/**
 * A tester for what a card's rules actually say: `mentionsOf(card)(/rehire/)` is true if `rehire`
 * appears anywhere in its triggers or effects. Used by the Legendary decks' `support` functions and
 * by the Capital Cities' `weigh`, which is where it started.
 */
const mentionsOf = (c) => {
  const blob = JSON.stringify([c.abilities || [], c.effect || null, c.onGain || null, c.onReveal || null]);
  return (re) => re.test(blob);
};

/**
 * How well a card fits an identity: its own species and studies first, then anything playable, and
 * then — for a deck written around a Legendary — whatever that card's engine runs on.
 */
function affinity(card, ident) {
  let a = 0;
  if (ident.species.includes(card.species)) a += 3;
  if (ident.studies.includes(card.study)) a += 2;
  for (const r of card.requires || []) {
    if (ident.species.includes(r.species)) a += 2;
    if (ident.studies.includes(r.study)) a += 2;
    if (r.name) a += cards.some((c) => c.name === r.name && ident.species.includes(c.species)) ? 2 : -3;
  }
  if (ident.support) a += ident.support(card, mentionsOf(card));
  return a;
}

function build(ident) {
  const list = {};
  const count = () => Object.values(list).reduce((a, b) => a + b, 0);
  const topCopies = () => Object.entries(list).reduce((a, [id, n]) => {
    const r = cards.find((c) => c.id === id).rarity;
    return a + (r === 'Super Rare' || r === 'Legendary' ? n : 0);
  }, 0);
  /** Whether a card can still go in: copies left, and room under the marquee cap for a marquee card. */
  const hasRoomFor = (card) => (list[card.id] || 0) < Math.min(COPY_CAP, maxCopiesOf(dr, card))
    && !((card.rarity === 'Super Rare' || card.rarity === 'Legendary') && topCopies() >= TOP_RARITY_CAP);
  const take = (card, n) => {
    // Two of anything, and the deck rules' own limit on top — one for a Super Rare or a Legendary.
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

  // Nothing is seeded for the tutorial here. The lesson arranges its own decks at play time
  // (`lessonDeck` in src/tutorial/scenario.js), swapping the cards its script deals into whichever
  // list the builder printed — which is the better place for it, because it holds however the decks
  // are rebuilt and costs the builder no freedom at all.

  // The Legendary this deck is written around goes in before anything else, so that every pass
  // below builds around a card that is already in the list rather than hoping to reach it. One copy
  // is the rule for a Legendary and one copy is the point: this is the card the deck is about.
  const anchor = ident.anchor ? cards.find((c) => c.id === ident.anchor) : null;
  if (ident.anchor && !anchor) throw new Error(`${ident.id}: no card ${ident.anchor} to build around`);
  if (anchor) take(anchor, maxCopiesOf(dr, anchor));

  // Characters, cost band by cost band, best fit then best rated. The anchor, if it is a Character,
  // is already standing in its own band and counts against what that band still wants — otherwise a
  // deck written around a cost-5 Legendary prints three cost-5 animals and calls it a curve.
  for (const [cost, want] of Object.entries(CURVE)) {
    const band = cards
      .filter((c) => c.type === 'character' && c.cost === Number(cost) && affinity(c, ident) > 0)
      .sort(pick(ident));
    let got = atCost(Number(cost));
    for (const c of band) {
      if (got >= want) break;
      got += take(c, Math.min(want - got, maxCopiesOf(dr, c)));
    }
  }
  let chars = charCount();
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
  // A deck anchored on a Town Building has already raised one of its three.
  let blds = Object.entries(list).reduce((a, [id, n]) => a + (cards.find((c) => c.id === id).type === 'townBuilding' ? n : 0), 0);
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
      .filter((c) => !economyOf(c) && c !== anchor)
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
      .filter((c) => c.type === 'event' && c !== anchor)
      .sort((a, b) => pick(ident)(b, a))[0];
    let guard = 0;
    while (throughput() < THROUGHPUT_FLOOR && guard++ < DECK_SIZE) {
      // A marquee card the deck has no room left for is not a candidate: it used to be picked as the
      // best earner, `take` would refuse it, and the loop broke with the deck still under the floor.
      // A marquee card the deck has no room left for is not a candidate: it used to be picked as the
      // best earner, `take` would refuse it, and the loop broke with the deck still under the floor.
      const hirable = cards.filter((c) => c.type === 'character' && hasRoomFor(c));
      // Hire into a band that is still short of the curve while any is, so that a town which has to
      // hire its way up to the floor does not end up with thirteen animals on the same rung.
      const room = hirable.filter((c) => shortfall(c) > 0);
      const earner = (room.length ? room : hirable)
        // Rate to the nearest whole Supply a turn, then the curve, then fit. Sorting on the raw rate
        // hires the same half-dozen best earners in the collection into every deck that is short,
        // which is how a deck written around a cost-0 Legendary ends up with no cheap animals in it.
        .sort((a, b) => Math.round(rateOf(b)) - Math.round(rateOf(a))
          || shortfall(b) - shortfall(a) || pick(ident)(a, b))[0];
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
    // Re-picked each time round rather than sorted once: hiring a cost-3 animal changes which band
    // is furthest behind, and a list sorted once takes the whole of the band that was behind when
    // the sort ran — which is how a deck short of payable Events ends up with thirteen cost-3s.
    while (count() < DECK_SIZE) {
      const next = cards.filter((c) => c.type === 'character' && hasRoomFor(c))
        .sort(byCurveThen(ident))[0];
      if (!next || !take(next, 1)) break;
    }
  }
  // Top up to exactly 40 with whatever still has room, Characters first.
  for (const pool of [cards.filter((c) => c.type === 'character'), cards.filter((c) => c.type === 'event')]) {
    // Re-sorted each time round: taking a cost-3 animal changes which band is furthest behind.
    while (count() < DECK_SIZE) {
      const next = pool.filter(hasRoomFor)
        .sort(byCurveThen(ident))[0];
      if (!next || !take(next, 1)) break;
    }
  }
  // The one thing this deck is not allowed to come out without.
  if (anchor && !list[anchor.id]) throw new Error(`${ident.id} lost ${anchor.id}, the card it is built around`);
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
    statuePool: ident.quarry(cards.filter((c) => c.type === 'statue').map((c) => c.id)),
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
