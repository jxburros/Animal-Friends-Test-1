#!/usr/bin/env node
// Regenerate docs/NeedsArt.md from spec/maker_card_set.json's `needsArt` list.
//
// The list in the spec is the machine-readable one — the art tests read it, and it is what lets a
// card be written and played before anybody has painted it. This file is the version an illustrator
// reads: every card that is waiting, what it is, and the character and the story behind it, so the
// scene can be painted from the writing rather than from the card name.
//
//   npm run needsart
import fs from 'node:fs';

const SET = JSON.parse(fs.readFileSync(new URL('../spec/maker_card_set.json', import.meta.url), 'utf8'));
const waiting = SET.needsArt?.cards || [];
const byId = new Map(SET.cards.map((c) => [c.id, c]));
const byName = new Map((SET.characters || []).map((e) => [e.name, e]));
const SPEC = 'https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json';
const link = (id) => `[\`${id}\`](${SPEC}#:~:text=${encodeURIComponent(id)})`;
const cell = (text) => String(text || '').replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();

const groups = new Map();
for (const row of waiting) {
  const card = byId.get(row.id);
  if (!card) throw new Error(`needsArt lists ${row.id}, which is not a card in this set`);
  const key = card.type === 'character' ? card.name : ({
    building: 'The Capital City', townBuilding: 'The Capital City',
  }[card.type] || 'Events and weather');
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(card);
}

const out = [];
out.push('# NeedsArt');
out.push('');
out.push('Cards that are **written, rated and playable, and not yet painted.** Every one of them shows');
out.push('up in the game right now with a vector fallback where its illustration ought to be.');
out.push('');
out.push('This file is generated — run `npm run needsart` after changing the `needsArt` block in');
out.push('[`spec/maker_card_set.json`](../spec/maker_card_set.json). That block is the list the art tests');
out.push('read: a card may go unpainted only while it is on it, so nothing is quietly forgotten. A card');
out.push('leaves the list when a scene is commissioned — a bundled painting in `src/ui/painted-art.js`,');
out.push('or an `art` block naming an atlas tile on the card itself.');
out.push('');
out.push('Each entry gives the card, the rules it has to depict, and the character and story behind it.');
out.push('The full backstory for every named animal is in the set\'s `characters` list and shows in the');
out.push('Book\'s **Story** panel (`npm run serve` → Book).');
out.push('');
out.push(`**${waiting.length} cards waiting.**`);
out.push('');

const order = [...groups.keys()].sort((a, b) => {
  const tail = (k) => (k === 'The Capital City' ? 1 : k === 'Events and weather' ? 2 : 0);
  return tail(a) - tail(b) || a.localeCompare(b);
});
for (const key of order) {
  const cards = groups.get(key).sort((a, b) => (a.cost || 0) - (b.cost || 0));
  const entry = byName.get(key);
  out.push(`## ${key}`);
  out.push('');
  if (entry) {
    out.push(`*${entry.species}, ${entry.pronouns} — ${entry.studies.join(' / ')}.*`);
    out.push('');
    out.push(entry.backstory.split('\n\n')[0]);
    out.push('');
    out.push(`**Voice.** ${entry.voice}`);
    out.push('');
    out.push(`**The arc.** ${entry.arc}`);
    out.push('');
  }
  out.push('| Card | Cost | Kind | What it does | The scene |');
  out.push('| --- | --- | --- | --- | --- |');
  for (const c of cards) {
    const what = c.title && c.title !== c.name ? `**${c.name}**, ${c.title}` : `**${c.name}**`;
    const kind = c.type === 'character' ? `${c.species} · ${c.study}`
      : c.type === 'building' ? 'Capital City Building'
        : c.type === 'townBuilding' ? 'Town Building'
          : c.type === 'disruption' ? 'Shared weather' : 'Event';
    out.push(`| ${what}<br>${link(c.id)} | ${c.cost} | ${kind} | ${cell(c.text)} | ${cell(c.flavor)} |`);
  }
  out.push('');
}

fs.writeFileSync(new URL('../docs/NeedsArt.md', import.meta.url), out.join('\n') + '\n');
console.log(`docs/NeedsArt.md: ${waiting.length} cards waiting on a painter.`);
