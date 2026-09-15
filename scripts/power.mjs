#!/usr/bin/env node
// Print the card set sorted by power/cost rating, with the rarity each rating earns.
//
//   node scripts/power.mjs [--type character|event|market|statue|disruption] [--rarity Rare]
//                          [--cost 3] [--csv]
//
// The rating is src/engine/power.js: power^0.6 x efficiency^0.4, in Supply-equivalents. Rarity is
// read off the card's own *cost group* (RARITY_BANDS), so the list is ordered by `rel` — the score
// as a multiple of what a Super Rare of that cost has to reach — and not by raw score, which only
// ever ranks the Masters. Run this after editing a card to see where it lands against its peers.
import fs from 'node:fs';
import { rateSet, RARITIES, RARITY_BANDS, COPY_LIMITS, COST_BANDS, DECK_TYPES } from '../src/engine/power.js';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const set = JSON.parse(fs.readFileSync(new URL('../spec/maker_card_set.json', import.meta.url)));
// The rules are half the rating: the town cap, the Building places and the Statue tiers are all
// priced out of spec/game.json. Rating the set without them quietly scores every card wrong.
const rules = JSON.parse(fs.readFileSync(new URL('../spec/game.json', import.meta.url)));
const byId = new Map(set.cards.map((c) => [c.id, c]));

const all = rateSet(set, rules);
let rows = all;
if (flag('--type')) rows = rows.filter((r) => r.type === flag('--type'));
if (flag('--rarity')) rows = rows.filter((r) => r.rarity === flag('--rarity'));
if (flag('--cost')) rows = rows.filter((r) => String(byId.get(r.id).cost ?? '') === flag('--cost'));

if (args.includes('--csv')) {
  console.log('id,name,type,cost,band,power,opportunityCost,ratio,score,relative,rarity');
  for (const r of rows) console.log([r.id, JSON.stringify(byId.get(r.id).name), r.type, byId.get(r.id).cost ?? '', r.band, r.power, r.cost, r.ratio, r.score, r.relative, r.rarity].join(','));
  process.exit(0);
}

console.log(`${set.name} — ${rows.length} cards, strongest for their cost first\n`);
console.log(`${'rel'.padStart(5)}  ${'score'.padStart(6)}  ${'rarity'.padEnd(11)} ${'type'.padEnd(10)} ${'power'.padStart(6)} ${'cost'.padStart(5)} ${'ratio'.padStart(5)}  card`);
for (const r of rows) {
  const c = byId.get(r.id);
  const name = c.type === 'character' ? `${c.name}, ${c.title}` : c.name;
  const warn = c.rarity !== r.rarity ? `  <-- printed as ${c.rarity}` : '';
  console.log(`${String(r.relative).padStart(5)}  ${String(r.score).padStart(6)}  ${r.rarity.padEnd(11)} ${r.type.padEnd(10)} ${String(r.power).padStart(6)} ${String(r.cost).padStart(5)} ${String(r.ratio).padStart(5)}  ${name}${warn}`);
}

// Rarity is a deck-building limit, so the mix that matters is the mix across the cards a deck may
// actually hold: Characters, Events and Town Buildings, cost group by cost group.
const deck = all.filter((r) => DECK_TYPES.has(r.type));
console.log('\nthe deck-legal catalogue, cost group by cost group (score to reach, cards, share):');
for (const band of COST_BANDS) {
  const group = deck.filter((r) => r.band === band);
  const mix = RARITIES.slice().reverse().map((rarity) => {
    const n = group.filter((r) => r.rarity === rarity).length;
    const min = (RARITY_BANDS[band].find(([x]) => x === rarity) || [, 0])[1];
    return `${rarity} >=${min} ${String(n).padStart(2)} (${String(Math.round(100 * n / group.length)).padStart(2)}%)`;
  });
  console.log(`  cost ${band}  n=${String(group.length).padStart(3)}  ${mix.join('  ')}`);
}

const legendary = all.filter((r) => r.rarity === 'Legendary');
console.log(`\n${legendary.length} Legendary cards, one or more at every cost (copies allowed in a town deck: ${COPY_LIMITS.Legendary}):`);
for (const r of legendary) {
  const c = byId.get(r.id);
  console.log(`  cost ${r.band}  rel ${String(r.relative).padStart(4)}  score ${String(r.score).padStart(5)}  ${c.type === 'character' ? `${c.name}, ${c.title}` : c.name}`);
}
