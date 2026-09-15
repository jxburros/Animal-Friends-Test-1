# Full Art Collection

Thirty-eight existing cards get an intentionally distinct collectible presentation: individual 1024 × 1536
paintings extending across the entire face, deep translucent nameplates and rules panels, fine gold
corner work, and a soft pearlescent sheen. The restrained highlight follows the pointer and also
responds to keyboard focus. There is no continuous shimmer animation; reduced motion disables transitions.

All Legendary Maker cards now have that presentation. Berry, Guild Warden and Biff, Chief Constable
already had portraits; eight new paintings complete the Legendary set.

The first twelve are printed cards; the later entries are Maker shelf cards
(`spec/maker_card_set.json`) that were later given their own commissioned portrait.

Open **Explore the Full Art cards** on the book cover. Each gallery card has a **Read** button for
the complete rules, burden and flavor text. The same shared renderer covers the game table, hand,
Deck Workshop, previews and animation copies. Escape dismisses the reader or gallery and restores focus.

| No. | Card | Printed rarity | Art direction |
| --- | --- | --- | --- |
| 01 | Clover — Master Botanist | Super Rare | A flowering cutting in a sunlit greenhouse |
| 02 | Pip — Chief Archivist | Legendary | A spiral library carved inside an ancient tree |
| 03 | Bramble — Guild Warden | Super Rare | Brass keys at the carved guild door |
| 04 | Russet — Tea House Keeper | Rare | Tea pouring above an autumn canal |
| 05 | Willow — Harbour Admiral | Rare | A bright harbor, sailboats and a rolled chart |
| 06 | Mortar — Master Millwright | Rare | Brass gears in a working watermill |
| 07 | Marmalade — Harvest Head Baker | Rare | A golden harvest loaf beside a warm oven |
| 08 | Inkwell — Keeper of Stories | Uncommon | A book glowing with imagined constellations |
| 09 | Reading Lanterns | Common | Three friends reading by a lantern-lit pond |
| 10 | Glasshouse Walk | Common | Lush glass arches and sunlit mosaic paths |
| 11 | Statue of Curiosity | Legendary | A stone squirrel discovering a luminous butterfly |
| 12 | Hard Winter | Uncommon | Snowbound cottages and a frozen mill |
| 13 | Peanut — Barista | — | Pouring latte art at the café counter |
| 14 | Brooke — Balloonist | — | A hot air balloon rising over a river at sunrise |
| 15 | Oatmeal — Jazz Singer | — | Singing to a badger band under stage lights |
| 16 | Betty — Firework Maker | — | Holding a rocket at a lantern-lit fireworks stall |
| 17 | Comet — Astronaut | — | Floating in space above the earth, a comet overhead |
| 18 | Rosabeth — Apothecary | — | Mixing a tincture by moonlight in a herb shop |
| 19 | Copper — Market Steward | — | Weighing stock on brass scales at a busy market arch |
| 20 | Hazel — Merchant | — | A lantern-lit night stall of curios, keys and unlabeled bottles |
| 21 | Moss — Bridgewright | — | The finished arch over the river, rejected drawings under one arm |
| 22 | Maribel — Horticulturist | — | Seed trays and drawers in a sunlit glasshouse |
| 23 | Sota — Telescope Fitter | — | Seating a great lens by lamplight, back to the stars |
| 24 | Juniper — Stargazer | — | A brass orrery on a hill above town, post satchel beside them |
| 31 | Betty — Whittler | Legendary | Carving a woodland toy in a sunny nursery workshop |
| 32 | Betty — Land Clearer | Legendary | Standing proudly at a newly cleared spring meadow |
| 33 | Clover — Seedling Helper | Legendary | Sharing an oversized watering can in a dawn garden |
| 34 | The Quill Wall | Legendary | A humble, well-mended wall guarding the borough at dusk |
| 35 | Quill — Cider Maker | Legendary | Pouring cider in an apple-bright autumn barn |
| 36 | Quill — Harvest Steward | Legendary | Welcoming workers with baskets and ladders at harvest time |
| 37 | Gwen — The Apron on the Hook | Legendary | Paying a tired worker in the warm community kitchen |
| 38 | Annabelle — Last One Up | Legendary | Rescuing rain-damp papers at the silent Salvage Yard |

## Paintings the Maker shelf inherited

A painting was commissioned for a card, not for a card id. When the Maker shelf remade a painted
printed card and the scene still fitted — the same animal, doing the same work — the remake shows the
same painting rather than falling back to a shared atlas tile. It stays one painting with one
collection number, shown on whichever shelf the reader is standing in front of; the gallery still
lists twenty-four.

| No. | Printed card | Maker remake |
| --- | --- | --- |
| 01 | Clover — Master Botanist | Clover, Master Botanist (`mk_clover_master_botanist_5`) |
| 02 | Pip — Chief Archivist | Scott, Author of the Boroughs (`mk_scott_author_of_the_boroughs_5`) |
| 03 | Bramble — Guild Warden | Berry, Guild Warden (`mk_berry_guild_warden_5`) |
| 04 | Russet — Tea House Keeper | Earl, Tea House Keeper (`mk_earl_tea_house_keeper_4`) |
| 05 | Willow — Harbour Admiral | Willow, Harbour Admiral (`mk_willow_harbour_admiral_5`) |
| 06 | Mortar — Master Millwright | Morty, Master Millwright (`mk_morty_master_millwright_5`) |
| 07 | Marmalade — Harvest Head Baker | Marmalade, Harvest Head Baker (`mk_marmalade_harvest_head_baker_5`) |
| 08 | Inkwell — Keeper of Stories | Inkwell, Keeper of Stories (`mk_inkwell_keeper_of_stories_5`) |
| 09 | Reading Lanterns | Reading Lanterns (`mk_reading_lanterns`) |
| 11 | Statue of Curiosity | Statue of Curiosity (`mk_st_curiosity`) |
| 12 | Hard Winter | A Hard Winter (`mk_dx_hard_winter`) |

Four of the eleven are renames — Pip became Scott, Bramble became Berry, Russet became Earl, Mortar
became Morty — which is what `renamedFrom` is for and which the painting does not mind: it is the
same red squirrel in the same hollow-tree library. The link is `remadeAs` on the registry entry, and
a test holds it honest: the remake must be the card that actually claims the printed one in its
`remakes`, and must be the same species. Where a remake changed the job title or the study — Scott
is the Author rather than the Chief Archivist, and Marmalade's study moved to Food when Food was
declared — the entry carries a `remadeNote` saying why the scene still fits, so that nothing
inherits a painting of somebody else's work by accident. The painting of Glasshouse Walk (10) is a
Maker card already, and the twelve Maker portraits (13–24) were commissioned for Maker cards.

These subjects were selected for recognizable characters, expressive occupations, varied environments,
and strong lighting opportunities. Their printed rarities, card IDs, costs, abilities, deck limits and
rules are unchanged. Other versions of the same named Character keep their regular art. This is a fixed
presentation selection, not a new rarity or random reward system.

## Assets and implementation

- `src/ui/full-art.js` owns the full-art registry, collection numbers and bundled image URLs — printed
  cards and Maker shelf cards alike, keyed by card id. `remadeAs` on an entry names the Maker card
  that inherited the painting, `remadeNote` accounts for a changed job or study, `fullArtFor(def)`
  resolves either id to the one entry, and `fullArtIds(id)` lists both.
- `src/ui/full-art.css` styles only opted-in faces plus the collection gallery.
- `src/ui/full-art-gallery.js` builds the gallery from the existing card definitions (printed set plus
  Maker set) and the shared renderer.
- `assets/art/full-art/<card-id>.png` contains every portrait in the registry.
- Original atlas art and per-card vector art remain underneath each new painting as failure fallbacks.
- [Exact generation prompts](FULL_ART_PROMPTS.md); created with the built-in image generation tool.

## Validation

- Automated tests cover unique assets, correct card resolution (both shelves) and unchanged definitions.
- Full-game smoke run completed with a winner.
- Deck Workshop shows the Maker cards with their own full-art treatment alongside the regular catalogue;
  its reader works and a seeded game starts successfully.
- Visually inspected every painting, the rendered collection and the phone-sized Statue reader.
- Native screen-reader testing was not run.

![The full-art cards](screenshots/full-art-collection.png)
