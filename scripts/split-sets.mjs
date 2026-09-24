#!/usr/bin/env node
// Split the collection into three releases, build each release's decks, and write the list.
//
//   node scripts/split-sets.mjs [--games N] [--no-playtest]
//
// The collection is 656 cards and was never meant to arrive at once. This script deals it into
// three releases the way the maker asked for them:
//
//   Set 1 — Badger, Squirrel, Mouse and Owl decks; two market decks; a Badger & Owl pack, a
//           Mouse & Squirrel pack and a Town Square pack (the four together, with the Events and
//           Town Buildings). Most of those four species' cards, some held back.
//   Set 2 — Raccoon, Otter, Fox and Rabbit decks; two market decks; a Fox & Rabbit pack, an Otter &
//           Raccoon pack, and an all-eight-species pack made of what Set 1 held back plus some of
//           Set 2's own.
//   Set 3 — Cat and Hedgehog decks; one market deck; a Cat pack, a Squirrel/Mouse/Hedgehog/Fox pack,
//           a Badger/Owl/Raccoon/Otter/Rabbit pack and an anything-goes pack.
//
// Every card is printed in exactly one release and sits in exactly one pack, and every pack holds
// 50 to 60 different cards. A starter deck is a list drawn from its own release's packs, so any deck
// card can also be pulled from a pack (as an art or foil variant, say). Characters move as whole
// families by default (FAMILIES), and some Masters arrive a release or two after the rest of their
// animal (LATER_MASTERS). Any version can be recruited on its own at full price; the upgrade
// discount just needs a cheaper version of the same animal already in the collection, which is why
// a later Master always has one in an earlier release. Market-only versions live in the market
// decks. An Event that names an animal goes with that animal's early versions. The tables below are
// the whole decision; everything else is derived, and the script refuses a split that breaks a rule.
//
// Each release's starter decks are then built by scripts/build-decks.mjs out of that release's cards
// alone, and played against each other on that release's markets. Writes docs/SETS.md and
// docs/sets.csv. Nothing in spec/ is changed.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createGame, playGame } from '../src/engine/index.js';
import { makeHeuristicAgent } from '../src/ai/heuristic.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const set = JSON.parse(fs.readFileSync(path.join(root, 'spec/maker_card_set.json'), 'utf8'));
const rules = JSON.parse(fs.readFileSync(path.join(root, 'spec/game.json'), 'utf8'));
const byId = new Map(set.cards.map((c) => [c.id, c]));
const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
/** Games each release plays, spread evenly over every ordered deck pairing on every one of its markets. */
const GAMES = Number(flag('--games', 480));
const PLAYTEST = !args.includes('--no-playtest');

// ---------------------------------------------------------------- the releases
const RELEASES = [
  {
    n: 1,
    decks: ['mk-bench-bylaw', 'mk-cache-kitchen', 'mk-margin-pantry', 'mk-dome-dusk'],
    packs: [
      { id: 's1-badger-owl', name: 'Badger & Owl pack', species: ['Badger', 'Owl'] },
      { id: 's1-mouse-squirrel', name: 'Mouse & Squirrel pack', species: ['Mouse', 'Squirrel'] },
      { id: 's1-town-square', name: 'Town Square pack', species: ['Badger', 'Owl', 'Mouse', 'Squirrel'] },
    ],
    markets: [
      { id: 's1-open-hiring', name: 'The Open Hiring', minDisruptions: 2,
        blurb: 'Labour and roofs: the Set 1 market characters and Capital City Buildings.' },
      { id: 's1-guild-row', name: 'Guild Row', minDisruptions: 3,
        blurb: 'Counters, tins and tokens: the Set 1 Market cards.' },
    ],
  },
  {
    n: 2,
    decks: ['mk-bin-barter', 'mk-current-counter', 'mk-gavel-greasepaint', 'mk-furrow-warren'],
    packs: [
      { id: 's2-fox-rabbit', name: 'Fox & Rabbit pack', species: ['Fox', 'Rabbit'] },
      { id: 's2-otter-raccoon', name: 'Otter & Raccoon pack', species: ['Otter', 'Raccoon'] },
      { id: 's2-all-eight', name: 'All Eight pack', species: ['Badger', 'Squirrel', 'Mouse', 'Owl', 'Raccoon', 'Otter', 'Fox', 'Rabbit'] },
    ],
    markets: [
      { id: 's2-hard-frost', name: 'The Hard Frost', minDisruptions: 4,
        blurb: 'The harsh one: the heavy weather, the Ordinances that tax the monuments, and the lots that put animals out of work.' },
      { id: 's2-market-b', name: 'Market 2B (to be named)', minDisruptions: 2,
        blurb: 'The Set 2 market characters, the Commerce Buildings and the gentler Set 2 lots.' },
    ],
  },
  {
    n: 3,
    decks: ['mk-lens-lathe', 'mk-hedge-holiday'],
    packs: [
      { id: 's3-cat', name: 'Cat pack', species: ['Cat'] },
      { id: 's3-smhf', name: 'Squirrel, Mouse, Hedgehog & Fox pack', species: ['Squirrel', 'Mouse', 'Hedgehog', 'Fox'] },
      { id: 's3-borro', name: 'Badger, Owl, Raccoon, Otter & Rabbit pack', species: ['Badger', 'Owl', 'Raccoon', 'Otter', 'Rabbit'] },
      { id: 's3-anything', name: 'Anything Goes pack', species: set.species.slice() },
    ],
    markets: [
      { id: 's3-grand-exchange', name: 'The Grand Exchange', minDisruptions: 2,
        blurb: 'Set 3’s one Capital City: every Set 3 market card, and the loudest weather in the collection.' },
    ],
  },
];
const PACKS = new Map(RELEASES.flatMap((r) => r.packs.map((p) => [p.id, { ...p, release: r.n }])));
const MARKETS = new Map(RELEASES.flatMap((r) => r.markets.map((m) => [m.id, { ...m, release: r.n }])));
const productName = (id) => (PACKS.get(id) || MARKETS.get(id) || { name: id }).name;
const releaseOf = (product) => (PACKS.get(product) || MARKETS.get(product)).release;

/** Where a species' cards go when nothing below says otherwise: its own release's pack. */
const HOME = {
  Badger: 's1-badger-owl', Owl: 's1-badger-owl', Mouse: 's1-mouse-squirrel', Squirrel: 's1-mouse-squirrel',
  Fox: 's2-fox-rabbit', Rabbit: 's2-fox-rabbit', Otter: 's2-otter-raccoon', Raccoon: 's2-otter-raccoon',
  Cat: 's3-cat', Hedgehog: 's3-smhf',
};

/** Every pack holds this many different cards, Events and Town Buildings included. */
const PACK_MIN = 50;
const PACK_MAX = 60;

/**
 * Whole animals that do not go to their species' home pack: every version of them goes to the pack
 * named here. Some only move sideways, to the mixed pack of their own release, so that no pack runs
 * past sixty cards. The rest wait for a later release: first animals in no printed deck, then late
 * additions to the cast, then animals whose studies sit off their species' two deck studies, so a
 * later pack brings a species into work it has not done before.
 */
const FAMILIES = {
  // Set 1, sideways into the Town Square pack: four species' worth of animals beside the Events and
  // Town Buildings, so neither species pack runs past sixty.
  Morty: ['s1-town-square', 'Four studies (Food/Crafts/Science/Agriculture): a Badger for any town.'],
  Orien: ['s1-town-square', 'Science/Commerce/Civics: the Badger town planner.'],
  Winter: ['s1-town-square', 'The TV scientist: an Owl the whole borough knows.'],
  Hoot: ['s1-town-square', 'The night porter, whose market version is in the Open Hiring.'],
  Teresa: ['s1-town-square', 'Food/Civics: a Mouse behind the counter.'],
  Osh: ['s1-town-square', 'Crafts/Entertainment, off-study for a Mouse.'],
  Dirt: ['s1-town-square', 'Civics/Crafts: a Squirrel on the parish bench.'],
  Maribel: ['s1-town-square', 'Agriculture/Science/Civics, off-study for a Mouse.'],
  // Set 1 species, waiting for Set 2's All Eight pack.
  Mildred: ['s2-all-eight', 'In no printed deck; a Commerce Badger, and Set 2 is the Commerce release.'],
  Andrew: ['s2-all-eight', 'Off-study for an Owl (Lore/Crafts), and already splashed into seven other species’ decks: the cross-town animal the All Eight pack is for.'],
  Edwina: ['s2-all-eight', 'A late addition to the cast; Food/Commerce, which Set 2’s Otter deck plays.'],
  Daisy: ['s2-all-eight', 'Off-study for a Squirrel (Agriculture/Commerce/Crafts against Civics/Food).'],
  Tuppence: ['s2-all-eight', 'Commerce, off-study for a Squirrel. Her market version stays in Set 1’s Open Hiring.'],
  // Set 2 species, sideways into their own All Eight pack.
  Annabelle: ['s2-all-eight', 'A small family (3) with one card in the printed deck.'],
  Reese: ['s2-all-eight', 'The charter pilot: Science, off-study for a Raccoon.'],
  Abigail: ['s2-all-eight', 'Splashed into four other species’ decks — an Otter everybody hires.'],
  Mandee: ['s2-all-eight', 'Lore/Science/Commerce: a Fox generalist, with Mandee’s Forecast.'],
  Mimi: ['s2-all-eight', 'Five different studies across five versions — the broadest Rabbit there is.'],
  // Waiting for Set 3's Badger/Owl/Raccoon/Otter/Rabbit pack.
  Thistle: ['s3-borro', 'In no printed deck; four studies; brings Thistle’s Grange Supper (Super Rare) as a Set 3 chase card.'],
  Fred: ['s3-borro', 'In no printed deck; the lowest-rated Owl family.'],
  Gabe: ['s3-borro', 'In no printed deck; Entertainment/Crafts, off-study for a Raccoon.'],
  Fingers: ['s3-borro', 'A late addition; Civics/Crafts/Agriculture, off-study for a Raccoon.'],
  Cynthia: ['s3-borro', 'A late addition in no printed deck; Science, off-study for an Otter.'],
  Pebble: ['s3-borro', 'A full Otter ladder (cost 0 to 5) for the Set 3 pack; two cards in the printed deck.'],
  Liza: ['s3-borro', 'Entertainment/Food, off-study for a Rabbit.'],
  Lynnette: ['s3-borro', 'Crafts/Lore, off-study for a Rabbit.'],
  // Waiting for Set 3's Squirrel/Mouse/Hedgehog/Fox pack.
  Cookie: ['s3-smhf', 'In no printed deck; the lowest-rated Squirrel family.'],
  Roger: ['s3-smhf', 'The lowest-rated Fox family; four studies.'],
  // Waiting for Set 3's Anything Goes pack. Taken first from the decks that won most in their release.
  JT: ['s3-anything', 'Science/Food; Otter was Set 2’s strongest deck.'],
  Taco: ['s3-anything', 'The cart cook: Food, and Otter was Set 2’s strongest deck.'],
  Juniper: ['s3-anything', 'Civics/Science, off-study for a Fox; Fox was one of Set 2’s strongest decks.'],
  Harrison: ['s3-anything', 'The piano boy: Entertainment, and Fox was one of Set 2’s strongest decks.'],
  Lindsay: ['s3-anything', 'Agriculture/Science: gives the Anything Goes pack a Cat.'],
  Kevin: ['s3-anything', 'The hired hand, splashed into three other decks; his Legendary Master is a Set 3 chase card. His market version stays in Set 2.'],
  Nancy: ['s3-anything', 'A late addition; Civics, off-study for a Raccoon.'],
  Elvira: ['s3-anything', 'Lore/Commerce, off-study for a Cat: the tea-leaf reader any town might hire.'],
};

/**
 * Masters who arrive after the rest of their animal. The earlier versions come out in the species'
 * own release, and the top of the ladder turns up a release or two later, so a returning animal is
 * news in a later pack and the upgrade discount has somebody already in the collection to land on.
 * Taken mostly from the decks that won most inside their own release (Badger, Squirrel, Otter, Fox),
 * so moving them also narrows the gap; the weakest decks (Mouse, Raccoon) keep theirs. No Master a
 * starter deck is written around (a deck's seed) moves.
 */
const LATER_MASTERS = {
  // -> Set 2's All Eight pack
  mk_robbie_editor_in_chief_5: ['s2-all-eight', 'Badger: the reporter’s last rung, a Super Rare for Set 2.'],
  mk_shay_chief_physician_5: ['s2-all-eight', 'Owl: the doctor’s top version.'],
  mk_squirt_club_captain_5: ['s2-all-eight', 'Squirrel: the captain’s top version.'],
  mk_scott_author_of_the_boroughs_5: ['s2-all-eight', 'Squirrel: the author’s Super Rare, a year after the reading hour.'],
  // -> Set 3's Badger/Owl/Raccoon/Otter/Rabbit pack
  mk_balto_guild_furniture_broker_5: ['s3-borro', 'Owl: a Legendary that pays Owls and Badgers, in the one Set 3 pack that holds both.'],
  mk_oatmeal_alderman_5: ['s3-borro', 'Badger: the alderman’s top version.'],
  mk_moss_bridgewright_5: ['s3-borro', 'Badger: the bridgewright’s top version.'],
  mk_benjamin_keeper_of_the_light_5: ['s3-borro', 'Otter: the lighthouse keeper’s top version.'],
  mk_brooke_riverwright_5: ['s3-borro', 'Otter: Brooke’s second Master (her Legendary Aeronaut stays with Set 2’s deck).'],
  mk_willow_harbour_admiral_5: ['s3-borro', 'Otter: the harbourmaster’s top version.'],
  mk_hibiscus_postmaster_5: ['s3-borro', 'Rabbit: the post runner’s top version.'],
  // -> Set 3's Squirrel/Mouse/Hedgehog/Fox pack
  mk_ned_chancellor_of_records_5: ['s3-smhf', 'Squirrel: the minute-taker’s top version.'],
  mk_cindy_justice_of_the_boroughs_5: ['s3-smhf', 'Fox: the court clerk’s Super Rare last rung.'],
  // -> Set 3's Anything Goes pack
  mk_adam_road_construction_5: ['s3-anything', 'Badger: a Legendary chase card for Set 3.'],
  mk_orien_town_planner_5: ['s3-anything', 'Badger: the town planner’s top version.'],
  mk_liz_chief_assessor_5: ['s3-anything', 'Fox: the assessor’s top version.'],
  mk_eric_best_farmer_5: ['s3-anything', 'Rabbit: the best farmer there ever was, a Rare for Set 3.'],
  mk_bean_proprietor_5: ['s3-anything', 'Owl: the caf\u00e9 proprietor, when Bean finally owns the place.'],
  mk_jessica_headmistress_4: ['s3-anything', 'Owl: the Headmistress, Jessica\u2019s second Master (her Legendary stays with Set 1\u2019s deck).'],
  mk_peanut_comptroller_5: ['s3-anything', 'Squirrel: the ledger apprentice\u2019s top version.'],
  mk_yellow_freshest_thing_4: ['s3-anything', 'Squirrel: Freshest Thing in a Small Town, the rapper\u2019s second Master (the Legendary stays with Set 1\u2019s deck).'],
  mk_earl_tea_house_keeper_4: ['s3-anything', 'Fox: the tea house keeper\u2019s top version.'],
  mk_henrietta_head_of_rabbit_recruitment_4: ['s3-borro', 'Rabbit: the recruiter\u2019s top version, a Super Rare.'],
  mk_brooke_balloonist_4: ['s3-borro', 'Otter: the Balloonist, Brooke\u2019s first Master rung.'],
  mk_moss_rocketwright_4: ['s3-borro', 'Badger: the Rocketwright, Moss\u2019s first Master rung, arriving with the Bridgewright.'],
};

/**
 * The obscured figures anchored on a *study* (any Crafts animal can turn out to be the Veiled Wright)
 * are the one kind of animal that belongs to no species' deck, so they wait for the pack that mixes
 * every species. The ones anchored on their own species stay with it: they are that species' cheap
 * start, and a first release needs them.
 */
const STUDY_FIGURES_TO = 's3-anything';

/** Market-only characters go to the first market of their species' release. */
const MARKET_CHARACTER_RELEASE = { Badger: 1, Owl: 1, Mouse: 1, Squirrel: 1, Raccoon: 2, Otter: 2, Fox: 2, Rabbit: 2, Cat: 3, Hedgehog: 3 };
const LABOUR_MARKET = { 1: 's1-open-hiring', 2: 's2-market-b', 3: 's3-grand-exchange' };
/** Eustace's Ball needs Eustace and boosts Cats and Badgers; both wait for Set 3. */
const MARKET_CHARACTER_OVERRIDE = { mk_eustace_socialite_3: 's3-grand-exchange' };

/**
 * Events no animal's name places: species pairs across packs, and the study Events. An Event that
 * names an animal goes with that animal's early versions (not with a Master that arrives later).
 */
const EVENTS = {
  // Two species from different packs: the first mixed pack that carries both.
  mk_cheese_festival: 's1-town-square', // Badger + Mouse
  mk_slack_water: 's2-all-eight', // Otter + Squirrel
  mk_hedge_apothecary: 's3-smhf', // Hedgehog + Mouse
  mk_friendship_festival: 's3-anything', // Cat + Mouse
  mk_eustaces_ball: 's3-anything', // Eustace (a Squirrel) + Cats + Badgers
  mk_barrows_measure: 's1-badger-owl', // Barrow is a market-only Badger in Set 1's Open Hiring
  // Study Events, to the pack whose decks do that work.
  mk_guild_night: 's1-town-square', // Crafts
  mk_ev_the_marks_are_struck: 's1-town-square', // Crafts + Civics
  mk_hall_lecture: 's1-town-square', // Science
  mk_futuretech_release_day: 's1-town-square', // Science, with the FutureTech Store and HQ
  mk_fresh_batch: 's1-town-square', // Food
  mk_the_long_night_at_earls: 's1-town-square', // Food
  mk_reading_lanterns: 's1-town-square', // Lore
  mk_community_bonfire: 's1-town-square', // Lore
  mk_a_word_beforehand: 's2-fox-rabbit', // Commerce
  mk_the_root_cellar: 's2-fox-rabbit', // Agriculture
  mk_ledger_day: 's2-all-eight', // Commerce
  mk_open_mic_night: 's2-all-eight', // Entertainment
  mk_fair_hearing: 's3-borro', // Civics
  mk_glut_of_squash: 's3-borro', // Agriculture
  mk_passing_comets: 's3-cat', // Science
  mk_ev_the_hat_goes_round: 's3-smhf', // Entertainment
  mk_tax_day: 's3-anything', // Commerce
};

const TOWN_BUILDINGS = {
  mk_tb_barrows_yard: 's1-badger-owl', mk_tb_observatory_steps: 's1-badger-owl',
  mk_tb_rosabeths_gate: 's1-mouse-squirrel', mk_tb_gwens_counter: 's1-mouse-squirrel',
  mk_tb_puppet_booth: 's1-town-square', mk_bld_juice_store: 's1-town-square', mk_tb_futuretech_store: 's1-town-square',
  mk_tb_open_mic_room: 's1-town-square', mk_tb_farmers_market: 's1-town-square', mk_bld_bookstore: 's1-town-square',
  mk_tb_grocery_store: 's1-town-square',
  mk_tb_allotment_strip: 's2-fox-rabbit', mk_tb_the_warren: 's2-fox-rabbit', mk_bld_gas_station: 's2-fox-rabbit',
  mk_tb_starfish_coffee: 's2-fox-rabbit',
  mk_tb_boat_shed: 's2-otter-raccoon', mk_tb_chit_press: 's2-otter-raccoon', mk_bld_game_store: 's2-otter-raccoon',
  mk_tb_counting_house: 's2-all-eight', mk_tb_the_builders_rest: 's2-all-eight', mk_bld_cheese_store: 's2-all-eight', // Cheese Store: Mouse + Raccoon
  mk_tb_coppers_cellar: 's3-cat', mk_tb_ice_cream_shop: 's3-cat', mk_tb_science_lab: 's3-cat',
  mk_tb_berrys_bench: 's3-smhf', mk_tb_quill_wall: 's3-smhf', mk_tb_the_long_awning: 's3-smhf', mk_tb_clinic: 's3-smhf',
  mk_tb_the_muster_bell: 's3-anything', mk_tb_gate_hut: 's3-anything',
};

/**
 * The Capital City side. The maker is redoing these cards, so this is a placeholder deal rather than
 * a design: roughly two fifths each to Sets 1 and 2 (two markets apiece) and one fifth to Set 3 (one
 * market), the gentler weather first and the hardest last.
 */
const MARKET_LOTS = {
  's1-open-hiring': [
    'mk_bld_weighbridge', 'mk_bld_guild_hall', 'mk_bld_long_room', 'mk_bld_all_night_cafe', 'mk_bld_owlery',
    'mk_bld_town_workshop', 'mk_bld_futuretech_hq',
    'mk_dx_open_hiring', 'mk_dx_meteor_shower', 'mk_dx_six_weeks_shut', 'mk_dx_solar_eclipse', 'mk_dx_mayors_conference',
    'mk_ord_the_masons_rate', 'mk_ord_the_building_grant',
  ],
  's1-guild-row': [
    'mk_mkt_community_oven', 'mk_mkt_bandstand', 'mk_mkt_ovens_account', 'mk_mkt_harvest_fair', 'mk_mkt_understudys_shelf',
    'mk_mkt_owl_post', 'mk_mkt_telescope_hire', 'mk_mkt_chit_tin', 'mk_mkt_surveyors_table', 'mk_mkt_town_bell',
    'mk_mkt_penny_jar', 'mk_mkt_second_founding', 'mk_mkt_apprentice_fair', 'mk_mkt_guild_intake', 'mk_mkt_watermill',
    'mk_mkt_emergency_reserve',
    'mk_dx_full_moon', 'mk_dx_midges', 'mk_dx_tax_assessors', 'mk_dx_bridge_goes', 'mk_dx_small_fair',
    'mk_ord_the_sealed_bid',
  ],
  's2-hard-frost': [
    'mk_mkt_toll_gate', 'mk_mkt_the_redundancy_notice', 'mk_mkt_the_last_round', 'mk_mkt_scrap_yard',
    'mk_mkt_ironwood_palisade', 'mk_mkt_long_table', 'mk_mkt_second_chances', 'mk_mkt_old_friends_reunion',
    'mk_bld_winter_stores', 'mk_bld_physic_garden', 'mk_bld_car_dealership',
    'mk_dx_hard_winter', 'mk_dx_lean_season', 'mk_dx_the_short_week', 'mk_dx_the_hiring_freeze', 'mk_dx_the_great_frost',
    'mk_dx_the_reckoning',
    'mk_ord_monument_tax', 'mk_ord_the_timber_levy', 'mk_ord_works_in_the_square',
  ],
  's2-market-b': [
    'mk_mkt_seed_bank_open_day', 'mk_mkt_warren_muster', 'mk_mkt_late_ferry', 'mk_mkt_bin_round', 'mk_mkt_night_market',
    'mk_mkt_ledger_audit', 'mk_mkt_market_committee', 'mk_mkt_the_fitting',
    'mk_bld_hiring_hall', 'mk_bld_counting_house', 'mk_bld_bank',
    'mk_dx_the_yards_go_quiet', 'mk_dx_county_fair', 'mk_dx_assessors_round',
  ],
  's3-grand-exchange': [
    'mk_mkt_hapenny', 'mk_mkt_mended_mangle', 'mk_mkt_lucky_horseshoe', 'mk_mkt_courier_network', 'mk_mkt_town_archives',
    'mk_mkt_double_shift_horn', 'mk_mkt_town_clock', 'mk_mkt_founders_grant', 'mk_mkt_spare_room',
    'mk_bld_airport', 'mk_bld_hospital', 'mk_bld_fast_food_joint', 'mk_bld_festival_green',
    'mk_dx_the_year_it_stopped', 'mk_dx_landslide', 'mk_dx_midsummer_fair', 'mk_dx_lord_mayors_fair', 'mk_dx_casino_fundraiser',
    'mk_ord_the_quarry_road', 'mk_ord_a_word_with_the_steward',
  ],
};

/**
 * Statues: which release carves each virtue first. Nine are raised in every game, so every market
 * deck has to carry at least nine on its own — the later markets reprint earlier virtues alongside
 * their new ones (listed per market below), which is the one place a card appears in two releases.
 */
const STATUE_DEBUT = {
  1: ['mk_st_kindness', 'mk_st_curiosity', 'mk_st_courage', 'mk_st_patience', 'mk_st_generosity', 'mk_st_ingenuity',
    'mk_st_community', 'mk_st_diligence', 'mk_st_joy', 'mk_st_vigilance'],
  2: ['mk_st_harmony', 'mk_st_hospitality', 'mk_st_thrift'],
  3: ['mk_st_wonder', 'mk_st_mercy'],
};
const QUARRY = {
  's1-open-hiring': STATUE_DEBUT[1],
  's1-guild-row': STATUE_DEBUT[1],
  's2-hard-frost': [...STATUE_DEBUT[2], ...STATUE_DEBUT[1].slice(0, 9)],
  's2-market-b': [...STATUE_DEBUT[2], ...STATUE_DEBUT[1].slice(1)],
  's3-grand-exchange': [...STATUE_DEBUT[3], ...STATUE_DEBUT[2], ...STATUE_DEBUT[1].filter((_, i) => i % 3 !== 0)],
};
/** Tokens: study tokens and the Building token come with Set 1; a species' token with its species. */
const TOKEN_RELEASE = (c) => (c.species ? MARKET_CHARACTER_RELEASE[c.species] : 1);

// ---------------------------------------------------------------- placing every card
const placement = new Map(); // card id -> { product, release, why }
const problems = [];
const place = (c, product, why = '') => {
  if (placement.has(c.id)) problems.push(`${c.id} placed twice`);
  if (!PACKS.has(product) && !MARKETS.has(product) && !product.startsWith('tokens-') && !product.startsWith('statues-')) problems.push(`${c.id}: unknown product ${product}`);
  const release = product.startsWith('tokens-') || product.startsWith('statues-') ? Number(product.split('-')[1]) : releaseOf(product);
  placement.set(c.id, { product, release, why });
};

const characters = set.cards.filter((c) => c.type === 'character');
const familyProduct = new Map(); // animal name -> pack its regular versions go to
for (const ch of set.characters) {
  const versions = characters.filter((c) => c.name === ch.name);
  if (!versions.length) continue; // market-only animals
  const studyFigure = versions.length === 1 && versions[0].anchor && versions[0].anchor.study;
  const [product] = FAMILIES[ch.name] || (studyFigure ? [STUDY_FIGURES_TO] : [HOME[ch.species]]);
  familyProduct.set(ch.name, product);
}
for (const name of Object.keys(FAMILIES)) if (!familyProduct.has(name)) problems.push(`FAMILIES names ${name}, who has no regular cards`);
for (const c of characters) place(c, LATER_MASTERS[c.id] ? LATER_MASTERS[c.id][0] : familyProduct.get(c.name));
for (const [id, [product]] of Object.entries(LATER_MASTERS)) {
  const c = byId.get(id);
  if (!c || c.type !== 'character') { problems.push(`LATER_MASTERS names ${id}, which is not a Character`); continue; }
  if (releaseOf(product) <= releaseOf(familyProduct.get(c.name))) problems.push(`${c.name}, ${c.title} is meant to arrive after the rest of ${c.name}, but does not`);
  if (!characters.some((x) => x.name === c.name && x.cost < c.cost && !LATER_MASTERS[x.id])) problems.push(`${c.name}, ${c.title} arrives with no cheaper version before it`);
}

for (const c of set.cards.filter((x) => x.type === 'marketCharacter')) {
  place(c, MARKET_CHARACTER_OVERRIDE[c.id] || LABOUR_MARKET[MARKET_CHARACTER_RELEASE[c.species]]);
}

for (const c of set.cards.filter((x) => x.type === 'event')) {
  if (EVENTS[c.id]) { place(c, EVENTS[c.id]); continue; }
  const req = c.requires || [];
  const named = req.find((r) => r.name);
  const species = [...new Set(req.filter((r) => r.species).map((r) => r.species))];
  if (named && familyProduct.has(named.name)) place(c, familyProduct.get(named.name));
  else if (species.length === 1) place(c, HOME[species[0]]);
  else problems.push(`event ${c.id} has no placement`);
}
for (const c of set.cards.filter((x) => x.type === 'townBuilding')) {
  if (TOWN_BUILDINGS[c.id]) place(c, TOWN_BUILDINGS[c.id]); else problems.push(`town building ${c.id} has no placement`);
}
for (const [market, ids] of Object.entries(MARKET_LOTS)) {
  for (const id of ids) { if (!byId.has(id)) problems.push(`no card ${id}`); else place(byId.get(id), market); }
}
for (const [release, ids] of Object.entries(STATUE_DEBUT)) for (const id of ids) place(byId.get(id), `statues-${release}`);
for (const c of set.cards.filter((x) => x.type === 'token')) place(c, `tokens-${TOKEN_RELEASE(c)}`);

// ---------------------------------------------------------------- checks
for (const c of set.cards) if (!placement.has(c.id)) problems.push(`${c.id} (${c.type}) is in no release`);
const firstRelease = (pred) => Math.min(...set.cards.filter(pred).map((c) => placement.get(c.id)?.release ?? 9));
for (const c of set.cards.filter((x) => x.type === 'event')) {
  const at = placement.get(c.id)?.release;
  for (const r of c.requires || []) {
    const need = r.name ? firstRelease((x) => x.name === r.name && (x.type === 'character' || x.type === 'marketCharacter'))
      : r.species ? firstRelease((x) => x.species === r.species && x.type === 'character') : 1;
    if (need > at) problems.push(`${c.name} (Set ${at}) needs ${JSON.stringify(r)}, first printed in Set ${need}`);
  }
}
const packSize = (p) => set.cards.filter((c) => placement.get(c.id)?.product === p).length;
for (const p of PACKS.keys()) {
  const n = packSize(p);
  if (n < PACK_MIN || n > PACK_MAX) problems.push(`${productName(p)} holds ${n} different cards, outside ${PACK_MIN}\u2013${PACK_MAX}`);
}
if (args.includes('--sizes')) for (const p of PACKS.keys()) console.log(`${String(packSize(p)).padStart(3)}  ${productName(p)}`);
for (const [market, ids] of Object.entries(QUARRY)) {
  const rel = MARKETS.get(market).release;
  if (ids.length < rules.victory.statueTotal) problems.push(`${market} quarries ${ids.length} Statues, fewer than the ${rules.victory.statueTotal} a game raises`);
  for (const id of ids) if (placement.get(id).release > rel) problems.push(`${market} quarries ${id} before it is carved`);
}
if (problems.length) {
  console.error(problems.map((p) => `PROBLEM: ${p}`).join('\n'));
  process.exit(1);
}

// ---------------------------------------------------------------- per-release card sets, decks, markets
const inRelease = (n) => set.cards.filter((c) => placement.get(c.id).release === n);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'af-sets-'));
const releaseSets = new Map();
for (const r of RELEASES) {
  const own = inRelease(r.n);
  const statues = [...new Set(r.markets.flatMap((m) => QUARRY[m.id]))];
  const ids = new Set([...own.map((c) => c.id), ...statues, ...set.cards.filter((c) => c.type === 'token').map((c) => c.id)]);
  const marketDecks = r.markets.map((m) => ({
    id: m.id,
    name: m.name,
    blurb: m.blurb,
    statuePool: QUARRY[m.id],
    statueCount: rules.victory.statueTotal,
    pool: MARKET_LOTS[m.id].concat(set.cards.filter((c) => c.type === 'marketCharacter' && placement.get(c.id).product === m.id).map((c) => c.id)),
    poolSize: 26,
    minDisruptions: m.minDisruptions,
  }));
  const rs = { ...set, cards: set.cards.filter((c) => ids.has(c.id)), decks: [], marketDecks };
  const file = path.join(tmp, `set${r.n}.json`);
  fs.writeFileSync(file, JSON.stringify(rs));
  const out = execFileSync(process.execPath, [path.join(root, 'scripts/build-decks.mjs'), '--set', file, '--only', r.decks.join(',')], { encoding: 'utf8' });
  const built = JSON.parse(fs.readFileSync(file, 'utf8'));
  rs.decks = built.decks;
  rs.builderLog = out.split('\n').filter((l) => /cards,/.test(l) || /PROBLEM/.test(l));
  releaseSets.set(r.n, rs);
  for (const d of rs.decks) {
    for (const id of Object.keys(d.list)) if (placement.get(id).release !== r.n) problems.push(`${d.name} holds ${id}, not a Set ${r.n} card`);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

// ---------------------------------------------------------------- playtest each release against itself
async function playtest(r) {
  const rs = releaseSets.get(r.n);
  const decks = rs.decks.map((d) => d.id);
  const wins = Object.fromEntries(decks.map((d) => [d, 0]));
  const games = Object.fromEntries(decks.map((d) => [d, 0]));
  let g = 0; let turns = 0;
  const rounds = Math.max(1, Math.round(GAMES / (decks.length * (decks.length - 1) * rs.marketDecks.length)));
  for (let round = 0; round < rounds; round++) {
    for (const market of rs.marketDecks) {
      for (const a of decks) {
        for (const b of decks) {
          if (a === b) continue;
          const seed = 1000 * r.n + g + 1;
          const state = createGame(rules, rs, { seed, decks: [a, b], market: market.id, names: ['P0', 'P1'] });
          await playGame(state, [makeHeuristicAgent({ seed: seed * 7 + 1 }), makeHeuristicAgent({ seed: seed * 13 + 3 })]);
          games[a]++; games[b]++; g++; turns += state.turnNumber;
          if (state.winner !== null) wins[[a, b][state.winner]]++;
        }
      }
    }
  }
  return { games: g, turns: turns / (g || 1), rows: decks.map((d) => ({ id: d, wins: wins[d], games: games[d] })).sort((x, y) => y.wins / y.games - x.wins / x.games) };
}
const results = new Map();
if (PLAYTEST) for (const r of RELEASES) { results.set(r.n, await playtest(r)); process.stderr.write(`Set ${r.n} playtested\n`); }

// ---------------------------------------------------------------- the list
const TYPE_LABEL = { character: 'Character', marketCharacter: 'Market Character', event: 'Event', townBuilding: 'Town Building',
  market: 'Market card', building: 'Capital City Building', disruption: 'Disruption', ordinance: 'Ordinance', statue: 'Statue', token: 'Token' };
const label = (c) => (c.title && (c.type === 'character' || c.type === 'marketCharacter') ? `${c.name}, ${c.title}` : c.name);
const rar = (c) => ({ Common: 'C', Uncommon: 'U', Rare: 'R', 'Super Rare': 'SR', Legendary: 'L' }[c.rarity] || c.rarity);
const tally = (cards, key) => {
  const m = {};
  for (const c of cards) { const k = key(c); if (k) m[k] = (m[k] || 0) + 1; }
  return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};
const fmtTally = (t) => t.map(([k, n]) => `${k} ${n}`).join(' · ');
const inProduct = (p) => set.cards.filter((c) => placement.get(c.id).product === p);
const deckCopies = new Map(); // id -> [deck name xN]
for (const rs of releaseSets.values()) for (const d of rs.decks) for (const [id, n] of Object.entries(d.list)) {
  if (!deckCopies.has(id)) deckCopies.set(id, []);
  deckCopies.get(id).push(`${d.name} ×${n}`);
}
const md = [];
const out = (s = '') => md.push(s);
out('# The Three Releases');
out();
out('*Generated by `node scripts/split-sets.mjs` — edit the tables at the top of that script, not this file.*');
out();
out('The 656 cards split into three releases, with ten packs between them. Every card is printed in exactly one release. The one exception is Statues: each market deck needs nine to play on its own, so later market decks reprint earlier ones.');
out();
out(`- **Packs.** Every pack holds ${PACK_MIN}–${PACK_MAX} different cards: Characters, plus the Events and Town Buildings that go with them. Each card is in exactly one pack. Set 1 got a third pack (the Town Square pack) because its Events and Town Buildings didn’t fit in two.`);
out('- **Starter decks.** Each deck is a fixed 40-card list built from its own release’s pack cards. Every deck card can also be pulled from that release’s packs, so art and foil variants of deck cards can go in packs.');
out('- **Masters.** Some animals arrive in their species’ release with their early versions, and their top Master arrives a release or two later. Any version can be recruited on its own at full printed cost. The upgrade discount (pay only the difference) applies once you own a cheaper version of the same animal.');
out('- **Events.** An Event that needs a named animal goes with that animal’s early versions.');
out();
out('## At a glance');
out();
out('| Release | Starter decks | Market decks | Packs (different cards in each) | Cards |');
out('| --- | --- | --- | --- | --- |');
for (const r of RELEASES) {
  const rs = releaseSets.get(r.n);
  out(`| **Set ${r.n}** | ${rs.decks.map((d) => `${d.name} (${d.species[0]})`).join(', ')} | ${r.markets.map((m) => m.name).join(', ')} | ${r.packs.map((p) => `${p.name} (${inProduct(p.id).length})`).join(', ')} | ${inRelease(r.n).length} |`);
}
out();
out('## Where each species goes');
out();
out('Character cards (including market-only versions) by product. **Bold** is the species’ first release.');
out();
const productCols = [...PACKS.keys(), 'market'];
out(`| Species | ${[...PACKS.values()].map((p) => `S${p.release} ${p.name.replace(/ pack$/, '')}`).join(' | ')} | Market decks | Total |`);
out(`| --- | ${productCols.map(() => '---:').join(' | ')} | ---: |`);
for (const sp of set.species) {
  const cs = set.cards.filter((c) => c.species === sp && (c.type === 'character' || c.type === 'marketCharacter'));
  const home = HOME[sp];
  const cells = productCols.map((p) => {
    const n = p === 'market' ? cs.filter((c) => MARKETS.has(placement.get(c.id).product)).length : cs.filter((c) => placement.get(c.id).product === p).length;
    return n ? (p === home ? `**${n}**` : String(n)) : '';
  });
  out(`| ${sp} | ${cells.join(' | ')} | ${cs.length} |`);
}
out();
out('## Animals that move');
out();
out('These animals move with every version to a pack other than their species’ home pack. Some move to the mixed pack of their own release so no pack goes over sixty cards. The rest wait for a later release, chosen in this order: animals in no printed deck, then late additions to the cast, then animals working outside their species’ two deck studies.');
out();
out('| Animal | Species | Cards | Home pack | Goes to | Why |');
out('| --- | --- | ---: | --- | --- | --- |');
for (const [name, [to, why]] of Object.entries(FAMILIES)) {
  const vs = characters.filter((c) => c.name === name && !LATER_MASTERS[c.id]);
  const home = HOME[vs[0].species];
  out(`| ${name} | ${vs[0].species} | ${vs.length} | S${releaseOf(home)} ${productName(home)} | S${releaseOf(to)} ${productName(to)} | ${why} |`);
}
const figures = characters.filter((c) => c.anchor && c.anchor.study && placement.get(c.id).product === STUDY_FIGURES_TO);
out(`| ${figures.map((c) => c.name).join(', ')} | various | ${figures.length} | their species’ pack | S${releaseOf(STUDY_FIGURES_TO)} ${productName(STUDY_FIGURES_TO)} | Obscured figures anchored on a study: any animal of that study can turn out to be them, so they belong in the pack that mixes every species. The figures anchored on their own species stay with it. |`);
out();
out('## Masters that arrive later');
out();
out(`${Object.keys(LATER_MASTERS).length} Masters arrive after the rest of their animal. They come mostly from the decks that won most inside their own release (Badger, Squirrel, Otter, Fox), which narrows those gaps. The weakest decks (Mouse, Raccoon) keep all their Masters. No Master that a starter deck is built around moves.`);
out();
out('| Master | Species | Cost | Rarity | Rest of the animal | Arrives in | Why |');
out('| --- | --- | ---: | --- | --- | --- | --- |');
for (const [id, [to, why]] of Object.entries(LATER_MASTERS)) {
  const c = byId.get(id);
  const rest = familyProduct.get(c.name);
  out(`| ${label(c)} | ${c.species} | ${c.cost} | ${c.rarity} | S${releaseOf(rest)} ${productName(rest)} | S${releaseOf(to)} ${productName(to)} | ${why} |`);
}
out();

const cardLine = (c) => {
  const bits = [c.type === 'character' || c.type === 'marketCharacter' ? `${c.species}, ${c.study}` : null, c.type === 'statue' || c.type === 'token' ? null : `cost ${c.cost}`, rar(c), c.setNumber].filter(Boolean);
  const decks = deckCopies.get(c.id);
  const later = LATER_MASTERS[c.id] ? ` · **arriving Master** (the rest of ${c.name} is in Set ${releaseOf(familyProduct.get(c.name))})` : '';
  return `- ${label(c)} — ${bits.join(', ')}${later}${decks ? ` · *in ${decks.join(', ')}*` : ''}`;
};
const listCards = (cards) => {
  const bySpecies = new Map();
  const chars = cards.filter((c) => c.type === 'character');
  for (const c of chars) { if (!bySpecies.has(c.species)) bySpecies.set(c.species, []); bySpecies.get(c.species).push(c); }
  for (const [sp, cs] of [...bySpecies].sort((a, b) => a[0].localeCompare(b[0]))) {
    out(`**${sp}** (${cs.length})`);
    out();
    for (const c of cs.slice().sort((a, b) => a.name.localeCompare(b.name) || a.cost - b.cost)) out(cardLine(c));
    out();
  }
  for (const type of ['event', 'townBuilding']) {
    const cs = cards.filter((c) => c.type === type);
    if (!cs.length) continue;
    out(`**${TYPE_LABEL[type]}s** (${cs.length})`);
    out();
    for (const c of cs.slice().sort((a, b) => a.name.localeCompare(b.name))) out(cardLine(c));
    out();
  }
};

for (const r of RELEASES) {
  const rs = releaseSets.get(r.n);
  const own = inRelease(r.n);
  const playable = own.filter((c) => c.type !== 'token');
  out(`## Set ${r.n}`);
  out();
  out(`${own.length} cards: ${fmtTally(tally(own, (c) => TYPE_LABEL[c.type]))}.`);
  out();
  out(`- **By species** (characters, market-only versions included): ${fmtTally(tally(playable, (c) => c.species))}`);
  out(`- **By study:** ${fmtTally(tally(playable, (c) => c.study))}`);
  out();
  out(`### Set ${r.n} starter decks`);
  out();
  for (const d of rs.decks) {
    const entries = Object.entries(d.list).map(([id, n]) => ({ c: byId.get(id), n }));
    const chars = entries.filter((e) => e.c.type === 'character');
    const ownSp = chars.filter((e) => e.c.species === d.species[0]).reduce((a, e) => a + e.n, 0);
    const allChars = chars.reduce((a, e) => a + e.n, 0);
    const n = (t) => entries.filter((e) => e.c.type === t).reduce((a, e) => a + e.n, 0);
    out(`**${d.name}** — ${d.species[0]}, ${d.studies.join(' & ')}. ${allChars} Characters (${ownSp} ${d.species[0]}), ${n('event')} Events, ${n('townBuilding')} Town Buildings.`);
    out();
    for (const e of entries.sort((a, b) => (a.c.type === 'character' ? 0 : a.c.type === 'event' ? 1 : 2) - (b.c.type === 'character' ? 0 : b.c.type === 'event' ? 1 : 2) || (a.c.cost - b.c.cost) || label(a.c).localeCompare(label(b.c)))) {
      out(`- ${e.n}× ${label(e.c)}${e.c.type === 'character' ? ` (${e.c.species}, cost ${e.c.cost})` : ` (${TYPE_LABEL[e.c.type]})`}`);
    }
    out();
  }
  const res = results.get(r.n);
  if (res) {
    out(`**Playtest (starter deck against starter deck).** ${res.games} heuristic-AI games covering every pairing on every Set ${r.n} market, averaging ${res.turns.toFixed(1)} turns:`);
    out();
    for (const row of res.rows) {
      const d = rs.decks.find((x) => x.id === row.id);
      out(`- ${d.name} (${d.species[0]}): ${(100 * row.wins / row.games).toFixed(1)}% (${row.wins}/${row.games})`);
    }
    out();
  }
  for (const p of r.packs) {
    const cs = inProduct(p.id);
    out(`### ${p.name} — ${cs.length} cards`);
    out();
    out(`${fmtTally(tally(cs, (c) => TYPE_LABEL[c.type]))}. Species: ${fmtTally(tally(cs, (c) => c.species))}.`);
    out();
    listCards(cs);
  }
  for (const m of rs.marketDecks) {
    const lots = m.pool.map((id) => byId.get(id));
    out(`### ${m.name} (market deck) — ${lots.length} lots and a quarry of ${m.statuePool.length} Statues`);
    out();
    out(`${MARKETS.get(m.id).blurb} ${fmtTally(tally(lots, (c) => TYPE_LABEL[c.type]))}.`);
    out();
    out(`- **Statues:** ${m.statuePool.map((id) => { const s = byId.get(id); const deb = placement.get(id).release; return deb < r.n ? `${s.name} *(reprint from Set ${deb})*` : s.name; }).join(', ')}`);
    for (const type of ['marketCharacter', 'building', 'market', 'disruption', 'ordinance']) {
      const cs = lots.filter((c) => c.type === type);
      if (cs.length) out(`- **${TYPE_LABEL[type]}s:** ${cs.map((c) => label(c)).join(', ')}`);
    }
    out();
  }
  const toks = own.filter((c) => c.type === 'token');
  out(`### Set ${r.n} tokens`);
  out();
  out(`${toks.map((c) => c.name).join(', ')}. Later releases include earlier tokens again wherever their cards need them.`);
  out();
}

out('## Counts across the three releases');
out();
const allPlayable = set.cards.filter((c) => c.type !== 'token');
const grid = (title, keys, key, show = (k) => k) => {
  out(`| ${title} | Set 1 | Set 2 | Set 3 | Total |`);
  out('| --- | ---: | ---: | ---: | ---: |');
  for (const k of keys) {
    const n = [1, 2, 3].map((rel) => allPlayable.filter((c) => key(c) === k && placement.get(c.id).release === rel).length);
    out(`| ${show(k)} | ${n.join(' | ')} | ${n.reduce((a, b) => a + b, 0)} |`);
  }
  out();
};
grid('Species', set.species, (c) => c.species);
grid('Study', set.studies, (c) => c.study);
grid('Card type', Object.keys(TYPE_LABEL).filter((t) => t !== 'token'), (c) => c.type, (t) => TYPE_LABEL[t]);
out('Tokens are components, not cards, and are left out of the counts above.');
out();
out('## Checks this list passes');
out();
out('- All 656 cards are placed exactly once.');
out(`- Every pack holds ${PACK_MIN}\u2013${PACK_MAX} different cards.`);
out('- Every Master that arrives later has a cheaper version of the same animal in an earlier release.');
out('- No Event is printed before the animal or species it requires.');
out('- Every market deck can raise nine Statues on its own.');
out('- Every starter deck is legal under the deck rules and uses only cards from its own release.');
out();

fs.writeFileSync(path.join(root, 'docs/SETS.md'), md.join('\n'));

const csv = [['release', 'product', 'type', 'species', 'study', 'name', 'title', 'cost', 'rarity', 'set_number', 'number', 'id', 'in_starter_decks'].join(',')];
const q = (v) => (v === undefined || v === null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const order = [...PACKS.keys(), ...MARKETS.keys()];
const sorted = set.cards.slice().sort((a, b) => placement.get(a.id).release - placement.get(b.id).release
  || order.indexOf(placement.get(a.id).product) - order.indexOf(placement.get(b.id).product)
  || String(a.type).localeCompare(b.type) || String(a.species || '').localeCompare(b.species || '') || a.name.localeCompare(b.name) || a.cost - b.cost);
for (const c of sorted) {
  const pl = placement.get(c.id);
  const product = pl.product.startsWith('tokens-') ? 'Tokens' : pl.product.startsWith('statues-') ? 'Statues (market decks)' : productName(pl.product);
  csv.push([`Set ${pl.release}`, product, TYPE_LABEL[c.type], c.species, c.study, c.name, c.title, c.cost, c.rarity, c.setNumber, c.number, c.id, (deckCopies.get(c.id) || []).join('; ')].map(q).join(','));
}
fs.writeFileSync(path.join(root, 'docs/sets.csv'), `${csv.join('\n')}\n`);

for (const r of RELEASES) {
  console.log(`Set ${r.n}: ${inRelease(r.n).length} cards`);
  for (const l of releaseSets.get(r.n).builderLog) console.log(`  ${l.trim()}`);
  const res = results.get(r.n);
  if (res) for (const row of res.rows) console.log(`    ${row.id.padEnd(22)} ${(100 * row.wins / row.games).toFixed(1)}%  (${row.wins}/${row.games})`);
}
console.log('Wrote docs/SETS.md and docs/sets.csv.');
