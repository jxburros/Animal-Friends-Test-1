import { buildCardFace, setPreviewContext } from './render.js';
import { FOIL_MODES, FOIL_LABELS } from './foil.js';
import { versionsOf } from './versions.js';
import { setPace } from './fx.js';

const select = document.querySelector('#card');
const printing = document.querySelector('#printing');
const size = document.querySelector('#size');
const mask = document.querySelector('#mask');
const status = document.querySelector('#status');
try {
  const [rules, set] = await Promise.all(['game', 'maker_card_set'].map(async (file) => {
    const response = await fetch(`../../spec/${file}.json`);
    if (!response.ok) throw new Error(`Cannot load ${file}`);
    return response.json();
  }));
  const cards = set.cards;
  const cardsById = Object.fromEntries(cards.map((card) => [card.id, card]));
  setPreviewContext(rules, { ...set, cardsById });
  for (const card of cards) select.add(new Option(`${card.name}${card.title ? ` · ${card.title}` : ''} (${card.id})`, card.id));
  function render() {
    const def = cardsById[select.value];
    const grid = document.querySelector('#cards');
    grid.replaceChildren();
    for (const mode of [null, ...FOIL_MODES]) {
      const figure = document.createElement('figure');
      const caption = document.createElement('figcaption');
      caption.textContent = mode ? FOIL_LABELS[mode] : 'No foil';
      const foil = mode === 'details' ? { mode, mask: mask.value.trim() || 'assets/art/foil/sample-details.svg' } : mode;
      figure.append(caption, buildCardFace(def, { large: size.value === 'large', version: printing.value, foil }));
      grid.append(figure);
    }
    status.textContent = `Six previews of ${def.name}. Use Read to inspect a finish.`;
  }
  function chooseCard() {
    const previous = printing.value;
    printing.replaceChildren();
    for (const version of versionsOf(cardsById[select.value])) printing.add(new Option(version.name, version.key));
    if ([...printing.options].some((option) => option.value === previous)) printing.value = previous;
    render();
  }
  select.addEventListener('change', chooseCard);
  printing.addEventListener('change', render);
  size.addEventListener('change', render);
  mask.addEventListener('change', render);
  document.querySelector('#motion').addEventListener('change', (event) => setPace(event.target.value));
  chooseCard();
} catch (error) { status.textContent = `Preview unavailable: ${error.message}`; }
