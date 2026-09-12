# Animal Friends TCG - First Boroughs Prototype

A two-player town-building trading card game where each player is the **Mayor** of a town populated by cute animal workers. Recruit Characters, send them on work shifts to produce **Supply**, play Events, and fight bidding wars against your rival in the shared **Capital City**. Win by controlling 5 of the 9 **Statues** — each of which grants a boon and imposes a burden.

This repo replaced the earlier single-file "Critter Town" game (archived at `docs/legacy-critter-town.html`).

## Rules in brief

**Supply** is the core resource: pay Supply to recruit Characters, rehire from Unemployment, bid in the Capital City, and activate card effects. Work shifts generate Supply.

**Orientation** (not turn counters) controls when Characters act. Characters enter at different orientations by rank:
- Apprentice (cost 0-1): upright, act immediately
- Journeyman (cost 2-3): Busy (270°), ready next turn
- Master (cost 4-5): 180°, ready two turns later

At the start of your turn, non-upright Characters rotate clockwise: 180° → 270° → 0°.

**Turn phases:** Start / Resources (draw 1 card or gain 2 Supply) / Ready (advance orientations) / Actions (recruit, shift, Events, purchase) / End (complete shifts, expire Limited Events).

**Capital City** is a contested 5-card market, and buying from it is an auction. Announce a purchase with an upright Character and a bid ≥ cost. On their own turn your rival may **outbid** you by pledging another upright Character and bidding higher; then you may answer, for as many rounds as you can both afford. The required step grows by 1 every two bids, so a war converges. When you are still the high bidder at the start of your own turn, your rival has had their chance and the card is yours; ties stay with the standing bid.

Bidding costs animals as well as Supply. **Every Character pledged to an auction stays Busy until that auction ends** — it does not advance at Ready and no effect can wake it — so a long war strips a town of its workforce, and "cannot bid any more" usually means "has nobody left to bid with". A bid is also a real promise: the winner pays in full and the **loser forfeits half (rounded up)** of everything they escrowed.

Whenever a card leaves the display, cards are dealt from the Market Deck until the display is back to five; if the Market Deck runs out, the City Dump is shuffled in. A stale-market safety valve (six turns with no purchase → sweep and redeal) exists but is rarely needed.

**Disruptions** are shared shocks that live in some Market Decks. They are never bought: the moment one is dealt into the Capital City it strikes both towns at once — Recession sends every Character in both towns to Unemployment, Hard Winter abandons every shift in progress — and then it goes to the City Dump and another card is dealt in its place.

**Unemployment** disrupts Characters. Rehire for the full printed cost to return upright.

**Upgrades** let higher-cost versions of the same Character replace lower ones; pay only the difference.

**Statues** are the victory cards. Control 5 of 9 to win. Each Statue carries a **boon and a burden**, both lasting as long as you hold it: the Statue of Community's extra shift Supply comes with a thinner Resources choice, the Statue of Patience speeds your Masters but slows your Apprentices, and the Statue of Harmony makes you pay losing bids in full. Collecting Statues taxes the town that is winning.

**Market Decks** — four shared markets to choose from at setup, all containing every Statue: **First Boroughs** (the classic mix, no shared shocks), **Boom Town** (prosperity and momentum; its shocks are mostly good news), **Hard Times** (recessions, hard winters and backlogs strike both towns alike) and **Founders' Fair** (auction tools, understudies and second chances, with fair weather and nothing that empties a town).

**Rarity** — every card is rated by what it gives you against what it asks for, and that rating sets its rarity: Common, Uncommon, Rare, Super Rare, Legendary. Rarity is not raw power. The model scores a card `power^0.6 × efficiency^0.4`, so of two cards that do the same thing the cheaper one rates higher, while of two equally efficient cards the bigger one does — a cost-0 Rabbit with a good shift can out-rate a Master. Rarity then caps how often a card may repeat in a deck: **3 / 3 / 2 / 1 / 1** copies. See `src/engine/power.js` and `npm run power`.

**Decks** — six printed 30-card decks (Burrow & Bloom, Paws & Papers, Bramble & Bristle, Ripple & Rune, Lantern & Ledger, Root & Rampart), or build your own in the **Deck Workshop** from the whole catalogue: 30 cards, at least 12 Characters, and copies capped by rarity. Custom decks are saved in the browser.

## How to play

No build step or dependencies beyond Node 22+ (for scripts/tests only). ES modules require serving; browsers block file:// access.

**Serve** the folder:
```
npm run serve                  # http://localhost:8080/
npm run serve -- --port 9000   # another port (or PORT=9000 npm run serve)
```
Then open http://localhost:8080/ in any modern browser. During play, use the **Pace** control (menu or bottom right) to choose animation speed: Storybook (slow, watch every card), Brisk (quicker), or Instant (no animations).

The server (`scripts/serve.mjs`, no dependencies) sends every file with `Cache-Control: no-store`, so each reload plays exactly what is on disk. When it starts it prints the version and the folder it is serving; the book cover shows the same version line (e.g. `v0.2.1 · Animal Friends: First Boroughs · 208 cards · 6 decks · 4 Market Decks`). If the two disagree, the browser is showing an old copy.

### Testing a fresh download

If you test by downloading the ZIP from GitHub and unzipping it:

1. **Stop the old server first.** `npm run serve` refuses to start while another server holds port 8080 and says so; an old server left running in another terminal keeps serving the old folder.
2. Run `npm run serve` **inside the new folder** and check the `Serving …` line it prints.
3. The first time you switch from the old Python server, **hard-reload once** (Ctrl+Shift+R, or Cmd+Shift+R on a Mac) to throw away the files it let the browser cache. After that a normal reload is always fresh.
4. Saved decks and the Pace setting live in the browser's localStorage, not in the folder, so they carry over between downloads. A saved deck that names a card the new set no longer has is dropped automatically.

`npm run serve:python` is the old `python3 -m http.server` and is kept only as a fallback; it sends no cache headers, so browsers may keep serving a previous version until a hard reload.

## Project layout

- `docs/ANIMAL_FRIENDS_TCG_DESIGN_REFERENCE.md` - design reference and source of truth
- `spec/game.json` - rules constants and prototype decisions
- `spec/starter_card_set.json` - all 208 cards: 68 Characters, 52 Events, 9 Statues, a 64-card Capital City pool and 15 Disruptions, plus six printed 30-card decks and four Market Decks. Every card carries its `rarity` and the `power` rating that earned it, and the file is ordered by that rating, strongest for its cost first. A Market Deck is dealt as all 9 Statues plus a random sample of its own pool, so it keeps one size while the display varies from game to game.
- `src/engine/` - headless deterministic rules engine (ES modules); documented in `docs/ENGINE_API.md`. `power.js` is the power/cost model that rates every card and assigns its rarity
- `src/ai/` - agents: `random.js` (baseline), `heuristic.js` (opponent)
- `src/ui/` - browser interface: `main.js`, `humanAgent.js`, `render.js`, `deckbuilder.js` (the Deck Workshop), `styles.css`, plus `art.js` (per-card illustrations), `fx.js` (animation queue/primitives), and `choreo.js` (maps engine events to animations)
- `index.html` - playable game
- `scripts/` - test utilities: `smoke.mjs` (one game log), `invariants.mjs` (card conservation), `playtest.mjs` (AI vs AI), `power.mjs` (the card set sorted by power/cost)
- `test/` - unit tests (`node --test`)

## Commands

```
npm test                                   # Run unit tests
npm run smoke                              # Print one full game log
npm run invariants                         # Check card conservation over many games
npm run power                               # Print every card sorted by power/cost, with its rarity
npm run power -- --type character           # ...one card type, or --rarity Legendary, or --csv
npm run playtest -- --games 200            # Playtest 200 AI matches
npm run playtest -- --games 100 --seed 42 # Use fixed seed for reproducibility
npm run playtest -- --p0 random --p1 heuristic  # Choose agents
npm run playtest -- --games 240 --decks all     # Rotate through every ordered deck pairing
npm run playtest -- --decks br,rr               # One matchup (bb, pp, br, rr, ll, rw or full deck ids)
npm run playtest -- --market hard-times          # Choose the shared Market Deck (or `all` to rotate)
```

## Prototype decisions

The `assumptions` array in `spec/game.json` documents current prototype choices:
- Second player starts with +1 card and no extra Supply (first-player offset, tuned by playtest; the old +2 Supply became a large head start once Supply was auction ammunition)
- Multiple auctions may run at once (one per Capital City card); each may be raised any number of times, but only on the raiser's own turn and only by a player who is not already winning it
- Bids are escrowed as they are made; the winner pays in full and the loser forfeits half (rounded up)
- Characters pledged to an auction stay Busy until it ends
- Statues carry burdens as well as boons
- Disruptions resolve on reveal against both towns and are never purchasable; one dealt during setup is set aside unresolved
- Upgrading preserves stack orientation and re-triggers recruit abilities
- Readying a Character mid-shift completes the shift immediately
- Reactive abilities (shields) set on your turn and last until your next turn starts
- Deck reshuffle: when player deck empties, shuffle Town Dump in
- Top-up refill: the Capital City is dealt back up to five cards as soon as a purchase resolves, so the Market Deck keeps flowing
- Stale market: if no Capital City card has been gained for six consecutive turns, the display is swept and redealt (safety valve, rarely needed)

## Card art

The painted storybook edition uses a bundled 16-scene illustration atlas, parchment nameplates,
botanical borders, and distinct type colors: forest-green Characters, midnight-blue Events,
vermilion Market cards, and antique-gold Statues. The cover, game, card previews and Deck Workshop
share this presentation. Select **Read** on any visible card to open its full artwork, rules and
burden in a keyboard- and touch-accessible reading view; Escape closes it.

`src/ui/painted-art.js` selects a shared painted archetype by species or scene theme. This is **16
shared scenes, not 208 unique illustrations**: related cards retain different printed names, jobs,
stats and effects while sharing art. `assets/art/boroughs-atlas.png` ships with the game; no image
service or external font request is needed to play. `src/ui/art.js` preserves the original per-card
vector illustrations underneath the painted layer as a fallback for missing art or unknown species.
`src/ui/storybook.css` owns the painted edition's presentation without changing rules or animation timing.

See [the art direction and validation notes](docs/PAINTED_EDITION.md) for scene coverage and the
generation prompt, and [the rendered card preview](docs/screenshots/painted-cards.png).

## Design notes

Character cards in the design reference are examples. The authoritative card set lives in `spec/starter_card_set.json`. Use it as the contract for adding new cards.

The design reference (Section 1-9) is the source of truth for gameplay intent; `spec/game.json` codifies the rules and constants; the playtest implementation is the living rulebook.
