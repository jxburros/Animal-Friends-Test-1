#!/usr/bin/env node
// Build the town decks from the current card set.
//
//   node scripts/build-decks.mjs [--check] [--only <deck-id>,<deck-id>]
//
// `--only` rebuilds just the named decks and leaves every other list exactly as it is, which is how
// an expansion adds its own decks without retuning the ones already playtested.
//
// Decks are not hand-listed any more: each one is a stated identity — two species, two studies and a
// theme, the verbs it wants to be built out of — and this script fills it from the rated card set
// inside the deck rules in spec/game.json: 40 cards, copies capped by rarity, nothing in a deck that
// cannot go in one.
//
// Three things matter more than card ratings, and all three are playtest findings.
//
//   1. The curve. Under the pledge ladder a Character's cost is its rank in an auction, so a deck
//      with nothing expensive cannot finish a bidding war however rich it is. Every deck covers the
//      whole ladder, and no later pass is allowed to pay for anything with the curve.
//   2. What the deck can pay. A deck is held to a floor of cards that make Supply or draw, a floor
//      of cards that make Supply in particular, and a Supply budget it may not exceed. The budget is
//      what makes six decks about six different things and still evenly matched: the theme decides
//      the shape of a deck's economy, the budget decides its size.
//   3. What the deck can play. An Event names the animal it needs, so an Event is only printed into
//      a deck that fields the bodies for it — and the last pass throws out anything the swaps above
//      have left unpayable. A dead card is worse than a weak one.
//
// The decks are built one after another, each steered away from the cards its predecessors took, so
// the six of them show four times as much of the collection as two decks of four-of-a-kind did.

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
/** A deck may state its own curve; a theme that needs more bodies on the board says so here. */
const curveTotal = (ident) => Object.values(ident.curve || CURVE).reduce((a, b) => a + b, 0);
/** Town Buildings a deck brings of its own: a place or two, not a building programme. */
const TOWN_BUILDING_TARGET = 2;
/** Cards in a deck that must produce Supply or draw. Below this a deck simply cannot function. */
const ECONOMY_FLOOR = 22;
/**
 * Cards in a deck that must produce Supply in particular. The economy floor counts a drawn card as
 * an engine, and it is one — but Statues are bought with Supply, and the first six-deck playtest
 * showed exactly what that leaves out: a deck built entirely out of foresight drew beautifully,
 * knew everything the Capital City was about to offer, and could not afford any of it. A deck may
 * be about anything; it still has to be able to pay.
 */
const SUPPLY_FLOOR = 18;
/**
 * The Supply a whole deck is allowed to have printed on it: every Supply its cards gain or put by,
 * plus everything its shifts pay if every animal works once. This is the number the first six-deck
 * playtest turned on. The six themes do not reach the Supply engine equally — the shift-and-store
 * deck came out on 119 and won four games in five, the foresight deck on 67 and won one in three —
 * so the builder now holds every deck inside one band and lets the theme decide what shape the
 * Supply takes rather than how much of it there is. Even decks are the point; different decks are
 * what the themes are for.
 */
const SUPPLY_BUDGET = { min: 94, max: 98 };
/**
 * Bodies a deck wants for an Event's requirement before it prints the Event. A requirement is
 * something you control, not something you spend, so one copy of the named animal in town plays the
 * Event every time it is drawn — two copies is the deck making sure it draws them in the same game.
 */
const EVENT_PLAYABILITY = 2;
/** Super Rare copies a deck may hold: a deck has a marquee card, not a marquee. */
const TOP_RARITY_CAP = 3;
/**
 * Copies of any one card a built deck takes. The collection is 355 cards a town deck may hold and
 * six decks of four-of-a-kind would show off forty of them, so a deck is built as singletons with a
 * second copy only of the card that leads each cost band and each half of the Event list. That is
 * still a deck you can pilot — the band, not the card, is what the curve promises — and it puts
 * roughly thirty distinct cards in every deck instead of twenty.
 */
const LEAD_COPIES = 2;
const REST_COPIES = 1;

// The six town decks. Each is a stated identity — two species, two studies — and a theme: the
// verbs it wants to be built out of. Between them they cover all ten species and all eight studies,
// and they are built one after another with a novelty bonus that steers each deck away from the
// cards its predecessors already took, so the six of them reach as far into the collection as the
// curve and the economy floor allow. The seventh way to play is still to build your own.
const IDENTITIES = [
  {
    id: 'mk-tin-tally', name: 'Tin & Tally', species: ['Squirrel', 'Otter'], studies: ['Commerce', 'Agriculture'],
    theme: ['storeSupply', 'takeStoredSupply', 'onShiftCompleted', 'moveShift'],
    supplyBudget: { min: 88, max: 92 },
    // The tutorial is played on this deck, and its lesson deals a known hand: see src/tutorial/scenario.js.
    must: ['mk_peanut_ledger_0', 'mk_peanut_barista_1', 'mk_daisy_bouquet_weaver_2', 'mk_ned_page_runner_1',
      'mk_clover_market_gardener_2', 'mk_fresh_batch', 'mk_ledger_day', 'mk_peanuts_standing_round'],
    blurb: 'Squirrels and Otters of Commerce and Agriculture: the long shift is the whole plan. Every animal works, every shift pays twice, and the tin behind the desk is fuller than the ledger admits.',
  },
  {
    id: 'mk-gavel-ribbon', name: 'Gavel & Ribbon', species: ['Fox', 'Cat'], studies: ['Civics', 'Crafts'],
    theme: ['raiseOwnBid', 'onTiedBid', 'onAnnounce', 'onChallengedByOpponent', '"bid', 'challenge'],
    // An auction deck pays for its identity twice — once to recruit the animal who raises the bid and
    // again in the pledge itself — so this is the one deck the band is widened for, by playtest.
    supplyBudget: { min: 126, max: 130 },
    // The rival in the tutorial plays this deck, to a fixed plan off a known hand.
    // Morty is in the list because the lesson deals his Boiler Test: an Event names the animal it
    // needs, and a deck that holds the Event without the animal holds a card it can never play.
    must: ['mk_comet_bolt_sorter_0', 'mk_comet_rocket_mechanic_1', 'mk_moss_toolsmith_2',
      'mk_inkwell_storyteller_2', 'mk_morty_watermill_mechanic_3', 'mk_guild_night',
      'mk_comets_countdown', 'mk_mortys_boiler_test'],
    blurb: 'Foxes and Cats of Civics and Crafts: a deck that goes to the Capital City to win auctions. It pledges higher than it can afford, takes the ties, and dares the other Mayor to keep raising.',
  },
  {
    id: 'mk-lamp-long-room', name: 'Lamp & Long Room', species: ['Owl', 'Mouse'], studies: ['Lore', 'Science'],
    theme: ['draw', 'scryDeck', 'reorderDeckTop', 'peekMarketDeck', 'eventFromDumpToHand'],
    supplyBudget: { min: 92, max: 96 },
    blurb: 'Owls and Mice of Lore and Science: the town that reads ahead. It knows what the Market Deck is about to offer, what its own deck holds, and it has already sent the wrong card away.',
  },
  {
    id: 'mk-larder-long-table', name: 'Larder & Long Table', species: ['Hedgehog', 'Raccoon'], studies: ['Food', 'Civics'],
    theme: ['rehire', 'giveToUnemployed', 'cardFromDumpToHand', 'takeFromCityDump', 'protectCharacter'],
    supplyBudget: { min: 88, max: 92 },
    curve: { 0: 3, 1: 5, 2: 6, 3: 5, 4: 3, 5: 2 },
    blurb: 'Hedgehogs and Raccoons of Food and Civics: nobody in this town stays out of work for long. Whatever the weather takes off the board is fed, rehired and standing at the counter by morning.',
  },
  {
    id: 'mk-bandstand-bell', name: 'Bandstand & Bell', species: ['Rabbit', 'Cat'], studies: ['Entertainment', 'Civics'],
    theme: ['selfReady', 'readyCharacter', 'advanceCharacter', 'readyNextTurn', 'makeBusy'],
    supplyBudget: { min: 92, max: 96 },
    blurb: 'Rabbits and Cats of Entertainment and Civics: a deck played at double time. Animals stand back up the turn they sat down, and the hall is open again before the rival town has finished its Ready.',
  },
  {
    id: 'mk-chit-cornerstone', name: 'Chit & Cornerstone', species: ['Badger', 'Raccoon'], studies: ['Crafts', 'Commerce'],
    theme: ['gainToken', 'spendToken', 'buildingDiscount', 'townBuilding', 'buildingsRaised'],
    supplyBudget: { min: 92, max: 96 },
    themeWeight: 1,
    curve: { 0: 3, 1: 5, 2: 6, 3: 5, 4: 3, 5: 2 },
    blurb: 'Badgers and Raccoons of Crafts and Commerce: chits in the tin and Buildings on the ground. It trades the small change of the ward for permanent places, and the places pay for the rest of the game.',
  },
];

const score = (c) => (c.power && c.power.score) || 0;
const cards = set.cards;

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

/**
 * How much of the deck's theme is printed on the card. A species and a study say who the animal is;
 * the theme says what the deck does with them, which is the difference between six decks and six
 * colours of the same deck.
 */
function themeBonus(card, ident) {
  if (!ident.theme) return 0;
  const blob = JSON.stringify([card.type, card.abilities || [], card.effect || null, card.onGain || null]);
  let hits = 0;
  for (const key of ident.theme) if (blob.includes(key)) hits++;
  // Two a hit, three hits at most. A theme should colour a deck, not build it out of whatever
  // mentions the verb: at three a hit the rehire deck came out as twelve ways to feed an animal
  // back into work and no way to get ahead, and lost two games in three.
  return Math.min(hits, 3) * (ident.themeWeight ?? 2);
}

/**
 * The reason six decks show more of the collection than three of them would. `used` counts how many
 * of the built decks already hold a card; the ones nobody has taken sort ahead of the ones everybody
 * has, so each deck is filled out of what is left rather than out of the same best-rated forty.
 */
function novelty(card, used) {
  const seen = used.get(card.id) || 0;
  return seen === 0 ? 4 : -3 * Math.min(seen, 3);
}

/** Supply and cards a card makes by itself, off the shift loop: the thing the economy floor counts. */
function economyOf(card) {
  const blob = JSON.stringify([card.abilities || [], card.effect || null, card.onGain || null]);
  return (blob.match(/"gainSupply"/g) || []).length + (blob.match(/"draw"/g) || []).length;
}

/**
 * Every Supply printed on one card: what it gains, what it puts by, and what one full shift of it
 * pays. Supply put by counts double and a card that harvests the tin counts four, because that is
 * what the pair is worth: the borough's oldest engine is an animal who puts a Supply by every shift
 * and a second animal who takes the lot in one go, and a model that prices the tin at face value
 * reads the strongest deck in the game as one of the poorest.
 */
function printedSupplyOf(card) {
  const blob = JSON.stringify([card.abilities || [], card.effect || null, card.onGain || null]);
  let total = 0;
  for (const m of blob.matchAll(/"do":"gainSupply","amount":(\d+)/g)) total += Number(m[1]);
  for (const m of blob.matchAll(/"do":"storeSupply","amount":(\d+)/g)) total += 2 * Number(m[1]);
  total += 4 * (blob.match(/"takeStoredSupply"/g) || []).length;
  return total + ((card.shift && card.shift.output) || 0);
}

/** Supply, and only Supply: gained, put by, or paid by a shift worth standing an animal up for. */
function supplyOf(card) {
  const blob = JSON.stringify([card.abilities || [], card.effect || null, card.onGain || null]);
  return (blob.match(/"gainSupply"/g) || []).length + (blob.match(/"storeSupply"/g) || []).length
    + ((card.shift && card.shift.output >= 2) ? 1 : 0);
}

// The economy floor used to be met by a repair pass that tore Events back out of a finished deck. It
// is cheaper to want the engine in the first place, so paying for Supply or a card is worth as much
// to a deck as sharing its study.
const fitOf = (card, ident, used) => affinity(card, ident) + themeBonus(card, ident) + novelty(card, used)
  + (economyOf(card) ? 2 : 0);

function build(ident, used) {
  const list = {};
  const fit = (c) => fitOf(c, ident, used);
  const byFit = (a, b) => fit(b) - fit(a) || score(b) - score(a);
  const count = () => Object.values(list).reduce((a, b) => a + b, 0);
  const topCopies = () => Object.entries(list).reduce((a, [id, n]) => {
    const r = cards.find((c) => c.id === id).rarity;
    return a + (r === 'Super Rare' || r === 'Legendary' ? n : 0);
  }, 0);
  const take = (card, n) => {
    const limit = maxCopiesOf(dr, card);
    let room = Math.min(n, limit - (list[card.id] || 0), DECK_SIZE - count());
    // A printed deck leans on its commons: at most TOP_RARITY_CAP of the rarest cards in total.
    if (card.rarity === 'Super Rare' || card.rarity === 'Legendary') {
      room = Math.min(room, TOP_RARITY_CAP - topCopies());
    }
    if (room > 0) list[card.id] = (list[card.id] || 0) + room;
    return Math.max(0, room);
  };

  // Cards the deck is required to hold, whatever the ratings say. Only the two tutorial decks name
  // any: the lesson deals a scripted opening hand, so those cards have to be in the deck to be dealt.
  const must = (ident.must || []).map((id) => {
    const card = cards.find((c) => c.id === id);
    if (!card) throw new Error(`${ident.id} requires ${id}, which is not a card in this set`);
    return card;
  });
  for (const c of must) take(c, 1);

  // Characters, cost band by cost band, best fit then best rated. The card that leads its band goes
  // in twice — that is the one the deck is allowed to count on — and everything under it once, so a
  // band of five is five animals rather than two.
  let chars = must.filter((c) => c.type === 'character').length;
  for (const [cost, want] of Object.entries(ident.curve || CURVE)) {
    const band = cards
      .filter((c) => c.type === 'character' && c.cost === Number(cost) && affinity(c, ident) > 0)
      .sort(byFit);
    let got = must.filter((c) => c.type === 'character' && c.cost === Number(cost)).length;
    for (const [i, c] of band.entries()) {
      if (got >= want) break;
      got += take(c, Math.min(want - got, i === 0 ? LEAD_COPIES : REST_COPIES));
    }
    chars += got - must.filter((c) => c.type === 'character' && c.cost === Number(cost)).length;
  }
  // Anything the curve could not fill from the identity, fill from the whole catalogue.
  const charTarget = curveTotal(ident);
  if (chars < charTarget) {
    const rest = cards.filter((c) => c.type === 'character' && !list[c.id]).sort(byFit);
    for (const c of rest) {
      if (chars >= charTarget) break;
      chars += take(c, Math.min(REST_COPIES, charTarget - chars));
    }
  }

  // Events this deck can actually pay for. Affinity is not enough: an Event whose requirement no
  // Character in this deck satisfies is a dead card, and a deck full of dead Events simply loses. So
  // every requirement unit is checked against the Characters in the list — read off the list as it
  // stands, not a snapshot, because the passes below swap Characters in and out and an Event whose
  // animal has since left the deck is exactly the dead card this check exists to stop.
  const chosenChars = () => Object.entries(list)
    .map(([id, n]) => ({ card: cards.find((c) => c.id === id), n }))
    .filter((e) => e.card.type === 'character');
  const bodiesMatching = (req) => chosenChars().reduce((a, e) => {
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
  const events = cards.filter((c) => c.type === 'event' && playability(c) >= EVENT_PLAYABILITY)
    .sort((a, b) => playability(b) - playability(a) || byFit(a, b));
  const eventTarget = DECK_SIZE - charTarget - TOWN_BUILDING_TARGET;
  let evs = 0;
  for (const [i, c] of events.entries()) {
    if (evs >= eventTarget || count() >= DECK_SIZE) break;
    evs += take(c, Math.min(i === 0 ? LEAD_COPIES : REST_COPIES, eventTarget - evs));
  }

  // A place or two of the town's own, taken on theme. Town Buildings are the third thing a deck may
  // hold and no printed deck used to hold any, which is forty cards of the collection nobody saw.
  const places = cards.filter((c) => c.type === 'townBuilding').sort(byFit);
  let builds = 0;
  for (const c of places) {
    if (builds >= TOWN_BUILDING_TARGET || count() >= DECK_SIZE) break;
    builds += take(c, 1);
  }

  // Every deck needs an engine. Playtests found the decks that lost were not the ones with weaker
  // cards — by the power model they often had the strongest — but the ones starved of Supply and
  // cards: a town that cannot pay cannot recruit, cannot work, and cannot bid. Both floors are
  // filled the same way: count what the deck has, and while it is short, swap the least useful card
  // that does not help for the cheapest card that does.
  const copiesWhere = (fn) => Object.entries(list).reduce((a, [id, n]) => a + (fn(cards.find((c) => c.id === id)) ? n : 0), 0);
  const fillFloor = (counts, floor) => {
    if (copiesWhere(counts) >= floor) return;
    const engines = cards
      .filter((c) => (c.type === 'character' || c.type === 'event') && counts(c) > 0 && (list[c.id] || 0) < maxCopiesOf(dr, c))
      .filter((c) => c.type !== 'event' || playability(c) >= EVENT_PLAYABILITY)
      // Cheap engines first. A floor is about being able to pay at all, and an engine that has to be
      // recruited for five is not an answer to a town that has run out of Supply.
      .sort((a, b) => Math.min(a.cost || 0, 4) - Math.min(b.cost || 0, 4) || byFit(a, b));
    // Make room by dropping the least useful cards that do not help this floor. A town's own places
    // are not droppable — two of them is the deck's whole building programme — and neither is a card
    // the identity requires.
    const droppable = Object.keys(list)
      .map((id) => cards.find((c) => c.id === id))
      .filter((c) => !counts(c) && c.type !== 'townBuilding' && !must.includes(c))
      .sort((a, b) => fit(a) - fit(b) || score(a) - score(b));
    let di = 0;
    for (const c of engines) {
      if (copiesWhere(counts) >= floor) break;
      while (count() >= DECK_SIZE && di < droppable.length) {
        const drop = droppable[di];
        if (list[drop.id]) { list[drop.id]--; if (!list[drop.id]) delete list[drop.id]; }
        di++;
      }
      take(c, 1);
    }
  };
  // Supply first, because a deck that cannot pay loses whatever else it does, then the wider floor.
  fillFloor(supplyOf, ident.supplyFloor ?? SUPPLY_FLOOR);
  fillFloor(economyOf, ECONOMY_FLOOR);

  // Whatever is still short is made up by deepening the deck rather than widening it: second and
  // third copies of the cheap and mid cards already chosen, cheapest first. A deck of forty animals
  // met once each looks generous and plays like a shuffle, and the curve is the promise that matters
  // — so the last few slots buy consistency, not another expensive body the ladder did not ask for.
  const deepen = () => {
    const chosen = Object.keys(list).map((id) => cards.find((c) => c.id === id))
      .filter((c) => c.type !== 'townBuilding')
      .sort((a, b) => (a.cost || 0) - (b.cost || 0) || fit(b) - fit(a));
    for (let round = 0; round < 3 && count() < DECK_SIZE; round++) {
      for (const c of chosen) {
        if (count() >= DECK_SIZE) break;
        if ((list[c.id] || 0) > round + 1) continue;
        take(c, 1);
      }
    }
  };
  deepen();
  // And if even that could not fill the deck — a rarity-capped identity — take the best fits left.
  for (const pool of [cards.filter((c) => c.type === 'character'), cards.filter((c) => c.type === 'event')]) {
    const sorted = pool.slice().sort(byFit);
    for (const c of sorted) {
      if (count() >= DECK_SIZE) break;
      take(c, 1);
    }
  }
  // Now hold the deck inside the Supply band. A deck over the ceiling gives up its dearest Supply
  // for the best card that pays less; a deck under the floor does the reverse. Either way the cards
  // swapped in are the ones the identity wanted anyway, so a deck brought down to the band is still
  // the deck it was — it simply is not also the richest town on the table.
  const printedSupply = () => Object.entries(list)
    .reduce((a, [id, n]) => a + printedSupplyOf(cards.find((c) => c.id === id)) * n, 0);
  // A card is swappable if losing or taking a copy of it cannot leave the deck holding a card it
  // cannot pay for: an Event needs bodies of its own, and the last body an Event depends on is not
  // spare change. Without this the Supply band was paid for in dead Events — two copies of Morty's
  // Boiler Test in a deck with no Morty in it.
  const neededByEvent = (c) => c.type === 'character' && Object.keys(list).some((id) => {
    const ev = cards.find((x) => x.id === id);
    if (ev.type !== 'event') return false;
    return (ev.requires || []).some((r) => {
      const matches = r.name ? c.name === r.name
        : (!r.species || c.species === r.species) && (!r.study || c.study === r.study);
      return matches && bodiesMatching(r) - 1 < (r.count || 1);
    });
  });
  const swappable = (c) => c.type !== 'townBuilding' && !must.includes(c)
    && (c.type !== 'event' || playability(c) >= EVENT_PLAYABILITY) && !neededByEvent(c);
  const held = () => Object.keys(list).map((id) => cards.find((c) => c.id === id)).filter(swappable);
  // A swap is like for like: same type, same cost. Otherwise the band pays for the budget — the
  // first version of this pass balanced the foresight deck by turning its Events into cost-0 animals
  // and left it with three Events and sixteen Apprentices.
  // A swap never takes a third copy of anything: the pass is there to move the Supply total, and a
  // deck that reaches its band by printing the same Event four times has paid for it in dead draws.
  const SWAP_COPY_CAP = 2;
  const spare = (out) => cards.filter((c) => c.type === out.type && (c.cost || 0) === (out.cost || 0)
    && swappable(c) && (list[c.id] || 0) < Math.min(maxCopiesOf(dr, c), SWAP_COPY_CAP));
  const swap = (out, inn) => {
    list[out.id]--;
    if (!list[out.id]) delete list[out.id];
    if (take(inn, 1) > 0) return true;
    take(out, 1); // the replacement would not fit (a rarity cap): put the card back and stop
    return false;
  };
  const budget = ident.supplyBudget || SUPPLY_BUDGET;
  // `stuck` remembers the cards a swap has already failed on — a rarity cap can refuse the
  // replacement — so the pass moves on to the next candidate instead of giving up on the band.
  const stuck = new Set();
  const trade = (want, pick) => {
    for (let guard = 0; guard < 120; guard++) {
      if (want()) return;
      const out = held().filter((c) => !stuck.has(c.id))
        .sort((a, b) => pick.order(a, b))
        .find((c) => spare(c).some((x) => pick.better(x, c)));
      if (!out) return;
      const inn = spare(out).filter((c) => pick.better(c, out)).sort(pick.best)[0];
      if (!swap(out, inn)) stuck.add(out.id);
    }
  };
  trade(() => printedSupply() <= budget.max, {
    order: (a, b) => printedSupplyOf(b) - printedSupplyOf(a) || fit(a) - fit(b),
    better: (cand, out) => printedSupplyOf(cand) < printedSupplyOf(out),
    best: byFit,
  });
  trade(() => printedSupply() >= budget.min, {
    order: (a, b) => printedSupplyOf(a) - printedSupplyOf(b) || fit(a) - fit(b),
    better: (cand, out) => printedSupplyOf(cand) > printedSupplyOf(out),
    // The smallest raise that helps, so a deck lands on its band rather than sailing past it.
    best: (a, b) => printedSupplyOf(a) - printedSupplyOf(b) || byFit(a, b),
  });

  // Last of all, throw out anything the deck cannot pay for. The passes above move cards in and out
  // and the animal an Event named may have left with one of them, so this is the check that the deck
  // as printed holds no card it can never play: a dead Event is worse than a weak one.
  for (let guard = 0; guard < 20; guard++) {
    const dead = Object.keys(list).map((id) => cards.find((c) => c.id === id))
      .find((c) => c.type === 'event' && playability(c) < 1 && !must.includes(c));
    if (!dead) break;
    const n = list[dead.id];
    delete list[dead.id];
    for (const pool of [
      cards.filter((c) => c.type === 'event' && (c.cost || 0) === (dead.cost || 0) && playability(c) >= EVENT_PLAYABILITY),
      cards.filter((c) => c.type === 'character'),
    ]) {
      for (const c of pool.slice().sort(byFit)) {
        if (count() >= DECK_SIZE) break;
        take(c, Math.min(n, REST_COPIES + 1));
      }
      if (count() >= DECK_SIZE) break;
    }
  }

  return list;
}

const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg >= 0 && process.argv[onlyArg + 1] ? new Set(process.argv[onlyArg + 1].split(',')) : null;
for (const id of ONLY || []) {
  if (!IDENTITIES.some((i) => i.id === id)) { console.error(`Unknown deck ${id}`); process.exit(1); }
}

// One tally of what the decks built so far have taken, so each deck reaches past them. A `--only`
// rebuild starts the tally from the printed lists of the decks it is not rebuilding, so a retune of
// one deck still steers away from the cards the others are already made of.
const used = new Map();
const noteUsed = (list) => {
  for (const [id, n] of Object.entries(list)) used.set(id, (used.get(id) || 0) + (n > 0 ? 1 : 0));
};

for (const deck of set.decks || []) {
  if (ONLY && !ONLY.has(deck.id) && IDENTITIES.some((i) => i.id === deck.id)) noteUsed(deck.list);
}

const built = [];
for (const ident of IDENTITIES) {
  if (ONLY && !ONLY.has(ident.id)) continue;
  const list = build(ident, used);
  noteUsed(list);
  built.push({
    id: ident.id,
    name: ident.name,
    species: ident.species,
    studies: ident.studies,
    blurb: ident.blurb,
    theme: ident.theme,
    list,
  });
}

let bad = 0;
for (const deck of built) {
  const problems = deckProblems(rules, set, deck.list);
  const chars = Object.entries(deck.list).reduce((a, [id, n]) => a + (cards.find((c) => c.id === id).type === 'character' ? n : 0), 0);
  const curve = {};
  for (const [id, n] of Object.entries(deck.list)) {
    const c = cards.find((x) => x.id === id);
    if (c.type === 'character') curve[c.cost] = (curve[c.cost] || 0) + n;
  }
  const total = Object.values(deck.list).reduce((a, b) => a + b, 0);
  const countType = (t) => Object.entries(deck.list).reduce((a, [id, n]) => a + (cards.find((c) => c.id === id).type === t ? n : 0), 0);
  console.log(`${deck.name.padEnd(20)} ${total} cards, ${chars} Characters, ${countType('event')} Events, ${countType('townBuilding')} places, curve ${[0, 1, 2, 3, 4, 5].map((k) => curve[k] || 0).join('/')}, ${Object.keys(deck.list).length} distinct`);
  if (problems.length) { bad++; console.log(`  PROBLEMS: ${problems.join(' ')}`); }
}

// How far the six of them reach into the collection, which is the point of building them together.
const reach = new Set(built.flatMap((d) => Object.keys(d.list)));
const playable = cards.filter((c) => ['character', 'event', 'townBuilding'].includes(c.type)).length;
console.log(`\n${reach.size} distinct cards across ${built.length} decks, out of ${playable} a town deck may hold.`);

if (process.argv.includes('--check')) {
  process.exit(bad ? 1 : 0);
} else if (!bad) {
  if (ONLY) {
    // Replace or append only the decks asked for, keeping the others' printed lists untouched.
    for (const deck of built) {
      const i = set.decks.findIndex((d) => d.id === deck.id);
      if (i >= 0) set.decks[i] = deck; else set.decks.push(deck);
    }
  } else {
    set.decks = built;
  }
  fs.writeFileSync(setUrl, `${JSON.stringify(set, null, 1)}\n`);
  console.log(`\nWrote ${built.length} deck${built.length === 1 ? '' : 's'} to spec/maker_card_set.json.`);
} else {
  console.error('\nNot written: some decks are illegal.');
  process.exit(1);
}
