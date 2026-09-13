#!/usr/bin/env node
// The character spreadsheet: every named Character in the game and every version it has.
//
//   node scripts/characters.mjs            # write the CSVs into docs/
//   node scripts/characters.mjs --stdout   # print the versions table instead
//
// Two tables come out of it, both written to docs/:
//   * characters.csv        — one row per Character: species, studies, jobs, how many versions,
//                             the cost curve, the rarities, and how many are remade so far.
//   * character_versions.csv — one row per printed version of a Character, in reading order.
//
// The Maker set (spec/maker_card_set.json) is folded in: a maker card that lists a printed id in
// `remakes` fills the "Remade by" columns, so the sheet doubles as the rebuild's progress board.
// scripts/characters_xlsx.py turns the two CSVs into a single .xlsx workbook.

import fs from 'node:fs';
import { characterIndex, isCharacterCard } from '../src/engine/characters.js';

const SET_URL = new URL('../spec/starter_card_set.json', import.meta.url);
const MAKER_URL = new URL('../spec/maker_card_set.json', import.meta.url);
const OUT_DIR = new URL('../docs/', import.meta.url);

const args = process.argv.slice(2);
const STDOUT = args.includes('--stdout');

const set = JSON.parse(fs.readFileSync(SET_URL));
const makerSet = fs.existsSync(MAKER_URL) ? JSON.parse(fs.readFileSync(MAKER_URL)) : { cards: [] };

/** printedCardId -> the maker card that replaces it. */
const remadeBy = {};
for (const card of makerSet.cards || []) {
  for (const id of [].concat(card.remakes || [])) if (id) remadeBy[id] = card;
}

const characters = characterIndex(set);
// Maker cards for Characters that have no printed version yet still deserve a line in the sheet.
const makerOnly = characterIndex({ cards: (makerSet.cards || []).filter(isCharacterCard) })
  .filter((c) => !characters.some((p) => p.name === c.name));

function csv(rows) {
  const cell = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `${rows.map((r) => r.map(cell).join(',')).join('\n')}\n`;
}

// ------------------------------------------------------------ one row per version
const VERSION_HEADER = [
  'Character', 'Species', 'Study', 'Job / Title', 'Card id', 'Card type', 'Set',
  'Cost', 'Rarity', 'Expansion', 'Shift delay', 'Shift output', 'Power score',
  'Remade', 'Remade by (maker card id)', 'Remade by (maker card name)', 'Rules text',
];
const versionRows = [VERSION_HEADER];
for (const entry of characters) {
  for (const def of entry.versions) {
    const maker = remadeBy[def.id] || null;
    versionRows.push([
      entry.name,
      def.species || '',
      def.study || '',
      def.title || def.job || '',
      def.id,
      def.type,
      set.setId,
      def.cost ?? '',
      def.rarity || 'Common',
      def.expansion || set.setId,
      def.shift ? def.shift.delay : '',
      def.shift ? def.shift.output : '',
      def.power && def.power.score !== undefined ? def.power.score : '',
      maker ? 'yes' : 'no',
      maker ? maker.id : '',
      maker ? maker.name : '',
      def.text || '',
    ]);
  }
}
for (const entry of makerOnly) {
  for (const def of entry.versions) {
    versionRows.push([
      entry.name, def.species || '', def.study || '', def.title || def.job || '', def.id, def.type,
      makerSet.setId || 'AF-MAKER-01', def.cost ?? '', def.rarity || 'Common', def.expansion || makerSet.setId || '',
      def.shift ? def.shift.delay : '', def.shift ? def.shift.output : '',
      def.power && def.power.score !== undefined ? def.power.score : '',
      'n/a (maker card)', '', '', def.text || '',
    ]);
  }
}

// ------------------------------------------------------------ one row per character
const CHARACTER_HEADER = [
  'Character', 'Species', 'Studies', 'Jobs', 'Versions', 'Costs', 'Rarities',
  'Expansions', 'Events naming them', 'Versions remade', 'Remade', 'Card ids',
];
const characterRows = [CHARACTER_HEADER];
const uniq = (xs) => [...new Set(xs.filter(Boolean))];
for (const entry of [...characters, ...makerOnly].sort((a, b) => a.name.localeCompare(b.name))) {
  const done = entry.versions.filter((d) => remadeBy[d.id]).length;
  characterRows.push([
    entry.name,
    entry.species || '',
    entry.studies.join(' / '),
    entry.jobs.join(' / '),
    entry.versions.length,
    entry.versions.map((d) => d.cost ?? '?').join(' / '),
    uniq(entry.versions.map((d) => d.rarity || 'Common')).join(' / '),
    uniq(entry.versions.map((d) => d.expansion || set.setId)).join(' / '),
    entry.events.length,
    done,
    done === entry.versions.length ? (done ? 'all' : 'none') : `${done} of ${entry.versions.length}`,
    entry.versions.map((d) => d.id).join(' '),
  ]);
}

if (STDOUT) {
  process.stdout.write(csv(versionRows));
} else {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(new URL('characters.csv', OUT_DIR), csv(characterRows));
  fs.writeFileSync(new URL('character_versions.csv', OUT_DIR), csv(versionRows));
  const remade = Object.keys(remadeBy).length;
  process.stdout.write(
    `docs/characters.csv — ${characterRows.length - 1} Characters\n`
    + `docs/character_versions.csv — ${versionRows.length - 1} versions\n`
    + `${remade} printed card${remade === 1 ? '' : 's'} remade by a maker card.\n`,
  );
}
