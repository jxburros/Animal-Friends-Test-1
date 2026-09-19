# Painted app surroundings

The non-card interface now shares the cards' painted borough setting, forest greens, parchment and antique gold. Card assets, card styling and game rules are unchanged.

## Assets
Generated with the built-in image-generation tool, then encoded as WebP (quality 86) without resizing:
- `assets/ui/borough-daylight.webp` — 1536 × 1024, 552,560 bytes. Menu cover, welcome screen and workshop header.
- `assets/ui/capital-twilight.webp` — 1536 × 1024, 458,062 bytes. Capital City banner and victory overlay.
- `assets/ui/open-storybook-table.png` — 1536 × 1024. A blank open storybook used behind the live, accessible Book, rules and welcome UI.

`src/ui/surroundings.css` owns only surrounding interface styles. Both images are local, decorative, and have solid-color fallbacks; no image contains functional text. The cover reserves its height before loading. Existing selection semantics, focus indicators and reduced-motion rules are preserved.

## Generation prompts

### Daylight borough
Use case: illustration-story. Asset type: wide landscape illustration for Animal Friends TCG main menu, 1536x1024. Primary request: a beautifully painted storybook animal borough, matching lush traditional gouache and watercolor trading card illustrations, fine warm ink details, botanical ornament, golden afternoon sunlight. View along a winding cobblestone path crossing a little stone bridge toward cozy timber shops, greenhouse, clock tower and distant hill village. Small clothed rabbit gardener and mouse carrying books in foreground at lower right, fox merchant near stall, believable charming proportions. Rich moss and sage green foliage, buttercream architecture, antique gold, muted terracotta rooftops; sophisticated illustrated picture book, intricate but calm. Composition: panoramic landscape with town centered, leafy branches framing upper corners, flowers at lower edges, generous clear sky in upper third; scene must crop well to a wide 3:1 banner. No text, lettering, logos, frames, card borders or interface. This is surrounding app artwork, not a card.

### Twilight capital
Use case: illustration-story. Asset type: wide landscape background banner for the Capital City area of Animal Friends TCG, 1536x1024. Paint a cozy woodland animal town square at blue hour, elegant storybook gouache and watercolor with delicate ink detail. A luminous ornate brass clock tower, ivy-covered timber shops, a small observatory dome, warm lit cafe windows and strings of tiny amber lanterns above cobblestones. A stone rabbit monument with flowers in the middle distance. A tiny owl astronomer and cat cafe keeper near the edges. Botanical leaves frame corners. Deep desaturated forest teal, indigo, antique gold, warm cream light, terracotta roofs. Rich handcrafted painting, atmospheric and gentle, matching collectible storybook cards. Composition: wide establishing view, main architectural detail arranged across middle horizontal third for a shallow banner crop, quiet lower foreground. No text, lettering, logos, card borders, frames or UI. Entire image is a single cohesive landscape.

### Open storybook table

Use case: stylized-concept. Asset type: reusable game UI background for an open-book overlay. A beautifully crafted open storybook viewed almost straight from above, resting on dark forest-green felt and a warm walnut tabletop. Two broad blank parchment pages with a subtle centre gutter, gently curled edges, stitched green leather binding, antique brass corners, tiny pressed leaves and acorns near the outside. Premium hand-painted gouache and watercolor with warm ink detail. Wide composition, clean spacious page interiors for live interface content. Warm amber lamplight; ivory, forest green, walnut and antique gold. No text, symbols, logos, characters, cards or watermark.

`src/ui/polish.css` adds the unified felt tabletop, tactile controls, literal open-book collection and dialogs, improved panel depth, responsive layouts and reduced-motion fallbacks. `src/ui/polish.js` supplies the lightweight pointer ripple used by controls; gameplay choreography remains in `fx.js` and `choreo.js`.

## One material: the card

Everything the interface is built out of is cut from the card's own stock, so a panel, a button and a
card read as the same object at three sizes. `src/ui/polish.css` names the material once, as custom
properties — `--ui-card-edge`, `--ui-card-trim`, `--ui-card-radius`, `--ui-card-frame`,
`--ui-card-paper` — and every box in the game (menu fields, mode cards, deck cards, dialogs, the
Mayors' shelf, the Post Office, the Lore Directory's rows and tiles) is drawn with them: a doubled
gold edge, an ivory frame inside it, printed paper, and corners that are round on one diagonal and
clipped on the other, exactly as `storybook.css` cuts a card face.

A button is a small card and behaves like one: it lifts, turns half a degree and opens a shadow
under itself when a hand comes near, and settles flat when it is pressed. Anything a Mayor can pick
up — a deck, a Mayor, an unfinished game, a character tile, a chapter — is picked up the same way.
`prefers-reduced-motion` drops every one of those transforms.

## The painted page rectangles

Three screens are laid out on the same painting, `assets/ui/open-storybook-table.png`: the Book, the
Lore Directory, and the Welcome and How-to-play spreads. `src/ui/book.css` publishes where the paper
actually is — `--page-l-x/y/w/h` and `--page-r-x/y/w/h`, measured off the painting — and the other
three read them instead of guessing a margin, so nothing ever prints on the spine, the gilt corners
or the table.

The Lore Directory is a real spread because of it: the left page carries the title, the tabs, the
search and the contents (the chapter list, the species and study filters, or the two settings), and
the right page is the reading page. Each scrolls inside its own paper and fades at the foot. Below
760px the two fold back into one column.

## The Book's card entry

Clicking a card in the Book opens it as a catalogue entry rather than an enlarged picture: the card
at reading size, its cost, species, study, rarity and printing, its rules text and its flavour, every
printing it was painted in (turning one over swaps the face where it stands, and the page agrees
afterwards), and doors into everything it is tied to — the character's entry in the Lore Directory,
every chapter or place that prints this card, and the other cards those name. Each door opens the
next entry in the same reader, so a Mayor can walk the collection without going back to the shelf.

## The finishing pass

**How to play is a spread.** The rules used to flow across both painted pages, so every line crossed
the spine. Now the left page is a contents page — the title, the three chapters as a numbered list
with a line about each, the door to the tutorial, and the Capital City at blue hour filling what paper
is left — and the right page is the chapter being read, scrolling inside its own paper with *Got it* at
the foot. It is laid out on the same `--page-*` rectangles as the Welcome and the Lore Directory, so
nothing prints on the spine, the gilt corners or the table.

**Phones get a sheet, not a book.** At phone widths the painted book does not fit: the title printed on
the leather and the last lines on the wood. Below 700px (760px for the Directory) the Welcome, How to
play and the Lore Directory are dealt on a sheet of the card's own stock instead — paper, a doubled
gold edge, the card's corners — with the chapter list pinned at the head, the text scrolling inside,
and the buttons pinned at the foot.

**The table under a full town.** A pick dialog drew its cards at the collection's size inside boxes cut
to a smaller number, so the cards spilled over each other; the boxes are now cut to the card. The note
that a town is full was squeezed into the heading column beside the shelf and pushed the whole table
off the screen; it is a line under the shelf now. *Your Move* and *The Card in Hand* fill the height of
the rival's half between them instead of being cut off at a share of the window with the card's feet
missing. An empty shelf says so in the middle of itself, on a faint dashed outline. On a phone the
sticky top bar is one line rather than three.

**The details.** Text fields and the pace lists are cut from the card stock like the buttons beside
them. Selections are inked in gold; scrollbars on paper are thin and gold. The cover's edition line
sits between two gold hairlines, the three doors carry their marks in the corner where a card carries
its gem, and the Mayors' shelf and the Post Office open under the same painted band as the Workshop.

## Validation
- 484 existing tests passed (`npm test`).
- Full-game smoke run completed (`npm run smoke`).
- Chromium at 1920 × 1080, 1440 × 900, 1366 × 768, 1024 × 700 and 390 × 844: the welcome, the Mayors'
  shelf, the cover, How to play (all three chapters), the Book and its card entry, the Lore Directory
  (story, characters, settings), the Post Office, the Deck Workshop, the opening hand, a game played
  ten turns on, the action popover, a pick dialog, the folded Chronicle, the win overlay and the
  tutorial's coach were all screenshotted before and after; no page errors, no failed requests and no
  horizontal overflow at any size.
- The finishing pass fixed what those screenshots showed: the rules crossing the spine, the phone
  overlays printing on the leather and the wood, a pick dialog's cards spilling over each other, the
  town-full note pushing the table off the screen, and the preview rail cutting its card off.
- Native screen-reader testing was not run.

![Menu](screenshots/surroundings-menu.webp)
![Game board](screenshots/surroundings-game.webp)

