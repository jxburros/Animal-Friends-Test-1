#!/usr/bin/env node
// Stamp every card in spec/maker_card_set.json with its set number and its collector number.
// The file is not reordered: the numbers are written onto the cards where they already sit, so the
// cards of one character stay together in the file and the Book does the sorting. Run it after
// adding or removing cards:
//
//   node scripts/number.mjs            # rewrite the set file in place
//   node scripts/number.mjs --check    # exit 1 if anything would change, touching nothing
//
// The order the numbers are handed out in is src/engine/collector.js: rarity, then card type, then
// species, with the cards inside each smallest group shuffled off a seed taken from the group's own
// name. Rarity is stamped by scripts/stamp.mjs, so run that one first when a card has changed.
import fs from 'node:fs';
import { numbering, SET_NUMBER } from '../src/engine/collector.js';

const url = new URL('../spec/maker_card_set.json', import.meta.url);
const set = JSON.parse(fs.readFileSync(url, 'utf8'));
const check = process.argv.includes('--check');

const numbers = numbering(set.cards, set.species || []);

let changed = 0;
for (const card of set.cards) {
  const number = numbers.get(card.id);
  if (card.number === number && card.setNumber === SET_NUMBER) continue;
  changed++;
  if (!check) {
    card.setNumber = SET_NUMBER;
    card.number = number;
  }
}

if (check) {
  if (changed) {
    console.error(`${changed} card(s) carry a stale or missing collector number. Run: node scripts/number.mjs`);
    process.exit(1);
  }
  console.log(`Every card carries its ${SET_NUMBER} number.`);
} else {
  fs.writeFileSync(url, `${JSON.stringify(set, null, 1)}\n`);
  console.log(`${set.cards.length} cards numbered ${SET_NUMBER} 1–${set.cards.length}: ${changed} restamped.`);
}
