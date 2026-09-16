#!/usr/bin/env node
// Build the town decks and the Capital Cities from the current card set.
//
//   node scripts/build-decks.mjs [--check] [--only <deck-id>,<deck-id>] [--markets-only]
//
// `--only` rebuilds just the named town decks and leaves every other list exactly as it is, which is
// how an expansion adds its own decks without retuning the ones already playtested. `--markets-only`
// rebuilds the Capital Cities and leaves the town decks alone.
//
// Decks are not hand-listed: each one is a stated identity (a species and two studies) and this
// script fills it from the rated card set, strongest-for-its-cost first, inside the deck rules in
// spec/game.json — 40 cards, a curve that covers the whole pledge ladder, copies capped below.
//
// Two things this script is built to do, beyond making legal decks:
//
// **Show the collection.** The printed decks used to hold four copies of a Common and between them
// reached 46 of the cards a deck may legally hold. A deck of four-ofs is a deck that plays the same
// game every time, and a collection of six hundred cards that prints two decks is a collection
// nobody meets. So copies are capped by rarity below — two of a Common or an Uncommon, one of
// anything rarer, and two Legendaries to a town — the roster is one deck per species, and a card no
// earlier deck has taken wins every tie. Consistency is what a Mayor buys in the Deck Workshop with
// the ten cards over the minimum; the printed decks are the tour.
//
// **Put the Town Buildings in.** They are deck cards — `DECK_TYPES` has always said so — and no
// printed deck had ever held one, because this script only ever looked at Characters and Events.

import fs from 'node:fs';
import { deckProblems, deckRules, maxCopiesOf } from '../src/engine/deckbuilding.js';

const setUrl = new URL('../spec/maker_card_set.json', import.meta.url);
const set = JSON.parse(fs.readFileSync(setUrl, 'utf8'));
const rules = JSON.parse(fs.readFileSync(new URL('../spec/game.json', import.meta.url), 'utf8'));
// The species charters: what each species is the centre of gravity for. A town deck leans on its
// own species' charter rather than on a hand-written list of verbs, so the decks follow the charter
// when the charter changes.
const speciesSpec = JSON.parse(fs.readFileSync(new URL('../spec/species.json', import.meta.url), 'utf8'));
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
 * Copies of any one card a printed deck may hold, by rarity. The deck rules allow four of a Common,
 * three of an Uncommon and two of a Rare; a printed deck is tighter — two of a Common or an
 * Uncommon, one of anything rarer — so that forty cards are twenty-five-odd different ones and a
 * game of a deck is not the same four cards arriving in a different order. Where the deck rules are
 * tighter still they win, which is what keeps a Super Rare and a Legendary at the one copy they have
 * always been limited to.
 */
const COPY_CAP_BY_RARITY = { Common: 2, Uncommon: 2, Rare: 1, 'Super Rare': 1, Legendary: 1 };
/** What a printed deck may hold this card at: the cap above, never above the deck rules' own. */
const capOf = (card) => Math.min(COPY_CAP_BY_RARITY[card.rarity] ?? 2, maxCopiesOf(dr, card));
/**
 * Legendaries one deck may hold — two, and two different ones, which the one-copy rule already
 * guarantees. Ten cards in a collection of six hundred beat everything of their own cost by a clear
 * margin: a town with a couple of them has something to build towards, and a town made of them is
 * not a town anybody can answer.
 */
const LEGENDARY_CAP = 2;

/**
 * The town decks: ten identities, one for each species in the borough.
 *
 * A deck is not fenced in by its species — the builder hires whoever the town needs, and a deck
 * short of earners will take them from anywhere — but a species is the centre of gravity, and the
 * charter in spec/species.json is what the deck leans on: `lean` below reads that species' own
 * centre and signature out of the charter and weights every card that does one of those things. So
 * the Rabbit deck is a deck of Rabbits recruiting each other out of hand, the Squirrel deck puts
 * Supply by, the Owl deck wakes the town up early, and each of them is the shortest honest answer to
 * "what is this species for?".
 *
 * The two studies are chosen where that species is deepest, and between the ten every study is a
 * deck's study at least twice.
 */
const TOWNS = [
  { id: 'mk-furrow-warren', name: 'Furrow & Warren', species: ['Rabbit'], studies: ['Agriculture', 'Civics'], support: lean('Rabbit'),
    seeds: ['mk_tb_starfish_coffee'],
    blurb: 'Rabbits of Agriculture and Civics: the allotment strip, the parish meeting and more of them arriving than leaving. No one Rabbit is much; the sixth one out of your hand is the whole town.' },
  { id: 'mk-margin-pantry', name: 'Margin & Pantry', species: ['Mouse'], studies: ['Lore', 'Food'], support: lean('Mouse'),
    seeds: ['mk_tb_rosabeths_gate', 'mk_tb_open_mic_room', 'mk_tax_day'],
    blurb: 'Mice of Lore and Food: the reading room over the kitchen. Every Event the borough has ever filed is played once, fished back out of the dump and played again, and there is always something on the stove.' },
  { id: 'mk-bench-bylaw', name: 'Bench & Bylaw', species: ['Badger'], studies: ['Crafts', 'Civics'], support: lean('Badger'),
    seeds: ['mk_robbie_cub_reporter_0', 'mk_robbie_columnist_1', 'mk_robbie_features_writer_2', 'mk_robbie_editor_in_chief_5', 'mk_tb_futuretech_store'],
    blurb: 'Badgers of Crafts and Civics: the bench and the bylaw, and neither of them moves. Whatever the Capital City posts this morning, the work goes on and somebody is put back on the books by lunch.' },
  { id: 'mk-hedge-holiday', name: 'Hedge & Holiday', species: ['Hedgehog'], studies: ['Agriculture', 'Entertainment'], support: lean('Hedgehog'),
    seeds: ['mk_tb_clinic'],
    blurb: 'Hedgehogs of Agriculture and Entertainment: a hedge laid to last fifteen years and a bank holiday declared on the strength of it. Nothing the rival does reaches anybody in this town.' },
  { id: 'mk-bin-barter', name: 'Bin & Barter', species: ['Raccoon'], studies: ['Commerce', 'Lore'], support: lean('Raccoon'),
    seeds: ['mk_community_bonfire', 'mk_reading_lanterns', 'mk_tb_the_warren', 'mk_tb_chit_press'],
    blurb: 'Raccoons of Commerce and Lore: the City Dump is this town\u2019s second hand and its archive. What the other Mayor threw out on Tuesday is on a trestle with a price on it by Thursday.' },
  { id: 'mk-gavel-greasepaint', name: 'Gavel & Greasepaint', species: ['Fox'], studies: ['Commerce', 'Entertainment'], support: lean('Fox'),
    seeds: ['mk_cindy_court_clerk_1', 'mk_cindy_magistrate_2', 'mk_cindy_circuit_judge_4', 'mk_cindy_justice_of_the_boroughs_5', 'mk_kevin_construction_4'],
    blurb: 'Foxes of Commerce and Entertainment: they know what the Capital City is about to put up, what it is worth, and how to look like they do not want it. The bid changes after the bidding has opened.' },
  { id: 'mk-current-counter', name: 'Current & Counter', species: ['Otter'], studies: ['Food', 'Commerce'], support: lean('Otter'),
    seeds: ['mk_brooke_aeronaut_5'],
    blurb: 'Otters of Food and Commerce: the counter by the water, open all hours. Work slides from paw to paw, nobody in this town sits down for long, and the round is finished before the rival has finished their Ready.' },
  { id: 'mk-cache-kitchen', name: 'Cache & Kitchen', species: ['Squirrel'], studies: ['Civics', 'Food'], support: lean('Squirrel'),
    seeds: ['mk_yellow_rapper_5'],
    blurb: 'Squirrels of Civics and Food: a town that is poor all game and rich exactly once, on the turn it has been saving for. Everything is put by, minuted, and spent at the auction nobody expected them at.' },
  { id: 'mk-lens-lathe', name: 'Lens & Lathe', species: ['Cat'], studies: ['Science', 'Crafts'], support: lean('Cat'),
    seeds: ['mk_elvira_tea_leaf_reader_0', 'mk_elvira_fairground_booth_2', 'mk_elvira_fortune_teller_3', 'mk_tb_ice_cream_shop'],
    blurb: 'Cats of Science and Crafts: a lens ground to a tolerance nobody asked for, by somebody who was not supposed to be up. This town acts on the turn it feels like acting, and the rival\u2019s Ready can wait.' },
  { id: 'mk-dome-dusk', name: 'Dome & Dusk', species: ['Owl'], studies: ['Science', 'Entertainment'], support: lean('Owl'),
    seeds: ['mk_jessica_teacher_of_the_boroughs_5'],
    blurb: 'Owls of Science and Entertainment: the dome, the late hall and a forecast to the minute. An Owl town is wise, awake and poor — so it reads the deck, wakes the shift up early, and is three turns ahead by dawn.' },
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
 * How strongly a species deck leans on its own charter.
 *
 * `lean` reads the species' `centre` and `signature` straight out of spec/species.json — the verbs
 * that species is supposed to get a disproportionate share of — and weights any card whose rules
 * say one of them. It adds to affinity, so it steers every pass of the builder rather than bolting a
 * few themed cards on the end, and it is deliberately light: a support weight competes with the
 * species and study bonuses, and a heavy one buys engine pieces with card quality. The second term
 * is the other half of a playable town — an animal who actually earns. A deck that leans hard on
 * its charter and cannot pay for it loses to a deck that simply works.
 */
function lean(species) {
  const charter = speciesSpec.species[species] || {};
  const verbs = [...new Set([...(charter.centre || []), charter.signature].filter(Boolean))];
  const re = new RegExp(verbs.join('|'));
  return (c, m) => (m(re) ? 2 : 0) + (worksFor(c) >= 1.5 ? 2 : 0);
}

/** Every printed deck: one town for each of the ten species. */
const IDENTITIES = TOWNS;

/**
 * The Capital Cities. A market deck is a quarry of Statues and a pool of lots to deal a sample from,
 * so what is on the board changes from game to game; a market's *identity* is what its pool leans
 * towards. `weigh` scores a card for that leaning and the pool is filled best-first, but every
 * market-side card in the collection lands in at least one pool.
 *
 * `quarry` picks the virtues this market carves from. Nine Statues are raised in any one game and the
 * collection carves fifteen, so a market that took the lot would make the choice of Capital City a
 * choice of pool size and nothing else. A dozen each, overlapping but not equal, makes which
 * monuments are on the table part of where you chose to play; between them the four quarry all
 * fifteen.
 *
 * `poolSize` is how many lots are dealt from the pool for one game, so a bigger pool is more variety
 * between games rather than a longer game.
 */
const MARKETS = [
  {
    id: 'mk-grand-exchange',
    name: 'The Grand Exchange',
    blurb: 'The whole catalogue under one roof: every lot the borough has ever put up, every Ordinance the Capital City can post, every kind of weather, and a dozen virtues to raise nine of. The market to play to meet the collection — no two games deal the same city.',
    poolSize: 26,
    poolDepth: Infinity, // the whole catalogue: this is the market that can deal anything
    minDisruptions: 3,
    quarry: (statues) => statues.slice(0, 12),
    weigh: () => 1, // everything, equally
  },
  {
    id: 'mk-hard-frost',
    name: 'The Hard Frost',
    blurb: 'The winter the Grain Exchange shut and the assessors came round anyway: a Capital City that takes animals off your board, posts an Ordinance about it, and then puts the monuments up by a third.',
    poolSize: 26,
    poolDepth: 45,
    minDisruptions: 6,
    quarry: (statues) => statues.slice(-12),
    weigh: (c, mentions) => (c.type === 'disruption' ? 6 : 0)
      + (c.type === 'ordinance' ? 5 : 0)
      + (mentions(/Unemploy|unemploy|LosesSupply|blockNextReady|endAllShifts|discard/) ? 4 : 0),
  },
  {
    id: 'mk-open-hiring',
    name: 'The Open Hiring',
    blurb: 'The board is full, the hall is open and everything on it is somebody looking for work or a roof looking for a crew. The bidding here is over labour rather than weather, and a town that can pay leaves with a bigger town.',
    poolSize: 26,
    poolDepth: 45,
    minDisruptions: 2,
    quarry: (statues) => statues.filter((_, i) => i % 5 !== 0).slice(0, 12),
    weigh: (c, mentions) => (c.type === 'marketCharacter' ? 6 : 0)
      + (c.type === 'building' ? 5 : 0)
      + (mentions(/rehire|recruitFromHand|readyCharacter|advanceCharacter/) ? 3 : 0)
      - (c.type === 'disruption' ? 3 : 0),
  },
  {
    id: 'mk-guild-row',
    name: 'Guild Row',
    blurb: 'A street of counters, tins and subscriptions: chits handed out by the guild, Supply put by for the year you need it, and a discount for anyone who turns up early. The slow, rich Capital City — nothing here hits you, and everything here compounds.',
    poolSize: 26,
    poolDepth: 45,
    minDisruptions: 3,
    quarry: (statues) => statues.filter((_, i) => i % 4 !== 2).slice(0, 12),
    weigh: (c, mentions) => (c.type === 'market' ? 6 : 0)
      + (c.type === 'ordinance' ? 2 : 0)
      + (mentions(/gainToken|storeSupply|gainSupply|Discount|draw|scryDeck|peekMarketDeck/) ? 4 : 0)
      - (c.type === 'marketCharacter' ? 2 : 0),
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
  // One species per deck now, so the species bonus is the deck's whole centre of gravity and is
  // weighted above a study. It is still a lean rather than a fence: nothing here stops the builder
  // hiring outside the species, and the throughput floor below regularly makes it do exactly that.
  if (ident.species.includes(card.species)) a += 4;
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
  /** Distinct Legendaries in the list. One copy each is the rule, so this counts cards and copies alike. */
  const legendaries = () => Object.entries(list)
    .filter(([id, n]) => n > 0 && cards.find((c) => c.id === id).rarity === 'Legendary').length;
  /** Whether a card can still go in: copies left, and room under the Legendary cap for a Legendary. */
  const hasRoomFor = (card) => (list[card.id] || 0) < capOf(card)
    && !(card.rarity === 'Legendary' && !list[card.id] && legendaries() >= LEGENDARY_CAP);
  const take = (card, n) => {
    // Two of a Common or an Uncommon, one of anything rarer, and the deck rules' own limit on top.
    let room = Math.min(n, capOf(card) - (list[card.id] || 0), DECK_SIZE - count());
    // Two Legendaries to a town, and two different ones — the one-copy rule sees to the second half.
    if (card.rarity === 'Legendary' && !list[card.id] && legendaries() >= LEGENDARY_CAP) room = 0;
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

  // Seeds: cards this identity is written to hold, taken before anything else the builder chooses.
  // Affinity is a good way to fill a deck and a poor way to make sure the borough's newest animals
  // are ever met — a Fox judge whose study is not one of the Fox deck's two studies will never be
  // reached for, however good her cards are. So each identity may name a handful of cards that are
  // simply in it, and the passes below build around them. Everything else about them is normal: the
  // copy caps, the Legendary cap and the curve all read them like any other card in the list.
  for (const id of ident.seeds || []) {
    const seed = cards.find((c) => c.id === id);
    if (!seed) throw new Error(`${ident.id}: no card ${id} to seed`);
    take(seed, 1);
  }

  // Characters, cost band by cost band, best fit then best rated. A Legendary is not seeded unless
  // the identity names it: otherwise it has to earn its slot off the same affinity everything else
  // is read on, and at most two of them do.
  for (const [cost, want] of Object.entries(CURVE)) {
    const band = cards
      .filter((c) => c.type === 'character' && c.cost === Number(cost) && affinity(c, ident) > 0)
      .sort(pick(ident));
    let got = atCost(Number(cost));
    for (const c of band) {
      if (got >= want) break;
      got += take(c, Math.min(want - got, capOf(c)));
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
  let blds = Object.entries(list).reduce((a, [id, n]) => a + (cards.find((c) => c.id === id).type === 'townBuilding' ? n : 0), 0);
  for (const c of buildings) {
    if (blds >= BUILDING_TARGET) break;
    blds += take(c, Math.min(capOf(c), BUILDING_TARGET - blds));
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
    evs += take(c, Math.min(capOf(c), Math.min(EVENT_TARGET, EVENT_CAP) - evs));
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
      .filter((c) => (c.type === 'character' || c.type === 'event') && economyOf(c) > 0 && hasRoomFor(c))
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
      // A card the deck has no room left for is not a candidate: it used to be picked as the best
      // earner, `take` would refuse it, and the loop broke with the deck still under the floor.
      // Legendaries are not hired here at all. The best-rated animal in the borough is a Legendary by
      // definition, so a floor that reaches for raw output reaches for the same one every time: the
      // first cut of these ten decks put Quill, Harvest Steward in nine of them, none of which was
      // written for her. A Legendary goes in a deck on affinity, where a deck of her own species and
      // studies will find her, or it does not go in.
      const hirable = cards.filter((c) => c.type === 'character' && c.rarity !== 'Legendary' && hasRoomFor(c));
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
