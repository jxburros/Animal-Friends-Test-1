// Shared painted archetypes. Card identity and rules always come from the card set.
// Coordinates refer to the unmodified 4 × 4 atlas; new species keep their vector art.
export const PAINTED_ATLAS_URL = new URL('../../assets/art/boroughs-atlas.png', import.meta.url).href;
const SPECIES_TILE = { Rabbit: 0, Mouse: 1, Fox: 2, Raccoon: 3, Hedgehog: 4, Badger: 5, Otter: 6, Squirrel: 7 };

export function paintedTile(def) {
  if (!def) return null;
  if (def.type === 'character') return SPECIES_TILE[def.species] ?? null;
  if (def.type === 'statue') return 15;
  const words = `${def.id || ''} ${def.name || ''}`.toLowerCase();
  if (def.type === 'disruption') return /winter|frost|storm|recession|landslide/.test(words) ? 11 : 13;
  if (def.type === 'event') {
    if (/harvest|patient|night|lantern/.test(words)) return 8;
    return /garden|seed|bloom|orchard|green|hedge|thatch/.test(words) ? 9 : 10;
  }
  if (def.type === 'market') {
    if (/clock|time|bell/.test(words)) return 12;
    return /garden|green|park|orchard|conservatory/.test(words) ? 14 : 13;
  }
  return null;
}

export function paintedArtSVG(def, fallback) {
  const tile = paintedTile(def);
  if (tile === null) return fallback;
  const x = -(tile % 4) * 100;
  const y = -Math.floor(tile / 4) * 100;
  // A failed image request reveals the original per-card vector illustration underneath.
  return `<svg class="painted-art" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><svg width="100" height="100">${fallback}</svg><image href="${PAINTED_ATLAS_URL}" x="${x}" y="${y}" width="400" height="400" preserveAspectRatio="none"/></svg>`;
}

export function ornamentalFrameSVG() {
  const sprig = `<path d="M7 66 Q12 38 31 14 M10 48 Q2 40 6 31 Q16 33 10 48 M15 35 Q10 22 17 19 Q24 26 15 35 M22 24 Q21 12 30 11 Q33 20 22 24 M9 55 Q21 47 24 38 Q11 36 9 55 M19 32 Q31 31 35 23 Q24 20 19 32"/>`;
  return `<svg viewBox="0 0 240 400" preserveAspectRatio="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g fill="var(--leaf)" stroke="var(--trim)" stroke-width=".7"><g transform="translate(0 56) scale(.36 1)">${sprig}</g><g transform="translate(240 56) scale(-.36 1)">${sprig}</g><g transform="translate(0 380) scale(.36 -1)">${sprig}</g><g transform="translate(240 380) scale(-.36 -1)">${sprig}</g></g><g fill="none" stroke="var(--trim)" stroke-width="1"><rect x="4" y="4" width="232" height="392" rx="12"/><path d="M38 7 H202 M38 393 H202 M7 128 V310 M233 128 V310"/><path d="M85 394 Q100 383 120 391 Q140 383 155 394"/></g></svg>`;
}
