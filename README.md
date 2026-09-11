# Critter Town

A single-file, browser-playable 2D trading-card game. Deploy cute animal villagers, gather
wood, stone and food, and race an AI rival to finish your town — while raccoons, storms and
hexes slow each other down.

**Play it:** open `index.html` in any modern browser. No build step, no network access needed.

## How it works

- **Win** by completing all 5 required structures (Well, Market, Bakery, Workshop, Town Hall)
  or by reaching a Town Score of 12★ from completed buildings.
- **Each turn** you receive Acorns (3 base, +1 from a Town Hall or Bear Foreman, max 6), your
  villagers gather, you draw a card, then you play cards or hammer unfinished buildings
  (1 acorn = +1 progress, +2 with a Workshop).
- **Card types:** Resource (villagers and supplies), Building (required and bonus structures
  with a resource cost and a 🔨 work requirement), Disruption (steal, discard, storm, termites,
  wolf scare, frost, skunk, crow, hibernation hex). A finished Sturdy Fence blocks one disruption.
- **Deck rules:** 20–30 cards, max 2 copies per card, rares limited to 1 copy.
- **Decks:** three balanced starter decks (Forest Builders, River Traders, Rowdy Rascals) or a
  custom deck from the built-in Deck Builder (saved in the browser).
- **AI:** scores every possible play each turn — it prioritises finishing its town, favours
  hammering over spreading foundations, and reaches for disruption cards as you get close to
  winning.

All 31 cards have generated SVG art drawn directly on the card face.
