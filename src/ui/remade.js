// "Remade" bookkeeping for the slow rebuild of the collection.
//
// Every printed card in spec/starter_card_set.json can be ticked off once it has been remade as a
// Maker card. There are two ways a card counts as remade:
//   * a Maker card in spec/maker_card_set.json lists it in `remakes` — the durable record, and the
//     one that survives a rename, because it points at the old card's id and not its name;
//   * the reader ticked it by hand in the Deck Workshop — kept in localStorage for this browser.
// A hand tick stores the name and title the card had at the time, so a card renamed later can
// still be traced back to what was ticked.

const STORE_KEY = 'af-remade-cards';

export function loadRemade() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  } catch (e) {
    return {};
  }
}
function persist(marks) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(marks)); } catch (e) { /* private mode: this session only */ }
  return marks;
}

/** Tick or untick one printed card. Returns the new marks. */
export function setRemade(marks, def, on, extra = {}) {
  const next = { ...marks };
  if (on) {
    next[def.id] = {
      at: new Date().toISOString(),
      name: def.name,
      title: def.title || null,
      type: def.type,
      ...extra,
    };
  } else {
    delete next[def.id];
  }
  return persist(next);
}
export function clearRemade() {
  return persist({});
}

/** printedCardId -> the Maker card that claims to replace it. */
export function makerRemakesIndex(makerSet) {
  const index = {};
  for (const def of (makerSet && makerSet.cards) || []) {
    const claims = [].concat(def.remakes || []);
    for (const id of claims) if (id) index[id] = def;
  }
  return index;
}

/**
 * How a printed card stands: `null` when it has not been remade, otherwise
 * `{ by: 'maker' | 'hand', makerCard?, mark? }`.
 */
export function remadeStatus(marks, makerIndex, cardId) {
  if (makerIndex && makerIndex[cardId]) return { by: 'maker', makerCard: makerIndex[cardId] };
  if (marks && marks[cardId]) return { by: 'hand', mark: marks[cardId] };
  return null;
}

/** Remade / total over a list of card definitions. */
export function remadeProgress(marks, makerIndex, cards) {
  let done = 0;
  for (const def of cards) if (remadeStatus(marks, makerIndex, def.id)) done += 1;
  return { done, total: cards.length };
}

/**
 * The tick list as a portable JSON file: ids first, with the name each card had when it was
 * ticked, so the list still reads sensibly after cards are renamed.
 */
export function remadeExport(marks, makerIndex, set) {
  const byId = set.cardsById || Object.fromEntries(set.cards.map((c) => [c.id, c]));
  const rows = [];
  for (const def of set.cards) {
    const status = remadeStatus(marks, makerIndex, def.id);
    if (!status) continue;
    rows.push({
      id: def.id,
      name: def.name,
      title: def.title || null,
      type: def.type,
      by: status.by,
      at: status.by === 'hand' ? status.mark.at : null,
      nameWhenMarked: status.by === 'hand' ? status.mark.name : null,
      makerCardId: status.by === 'maker' ? status.makerCard.id : null,
      makerCardName: status.by === 'maker' ? status.makerCard.name : null,
    });
  }
  // Hand ticks for cards that are no longer in the set at all: keep them, they are the trail.
  for (const [id, mark] of Object.entries(marks)) {
    if (byId[id]) continue;
    rows.push({ id, name: mark.name, title: mark.title || null, type: mark.type || null, by: 'hand', at: mark.at, nameWhenMarked: mark.name, missingFromSet: true });
  }
  return { setId: set.setId, exportedAt: new Date().toISOString(), count: rows.length, cards: rows };
}

/** Offer the tick list as a download (and hand back the JSON text for anything else). */
export function downloadRemade(marks, makerIndex, set) {
  const text = JSON.stringify(remadeExport(marks, makerIndex, set), null, 1);
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `remade-${set.setId || 'cards'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) { /* the text is still returned */ }
  return text;
}

/** Merge a previously exported tick list back in. Returns the new marks. */
export function importRemade(marks, payload) {
  const rows = (payload && payload.cards) || [];
  const next = { ...marks };
  for (const row of rows) {
    if (!row || !row.id || row.by === 'maker') continue;
    next[row.id] = { at: row.at || new Date().toISOString(), name: row.nameWhenMarked || row.name || null, title: row.title || null, type: row.type || null };
  }
  return persist(next);
}
