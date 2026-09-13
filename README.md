# Animal Friends TCG - First Boroughs Prototype

A two-player town-building trading card game where each player is the **Mayor** of a town populated by cute animal workers. Recruit Characters, send them on work shifts to produce **Supply**, play Events, and fight bidding wars against your rival in the shared **Capital City**. Win by controlling 5 of the 9 **Statues** — each of which grants a boon and imposes a burden.

This repo replaced the earlier single-file "Critter Town" game (archived at `docs/legacy-critter-town.html`).

**New in v0.5.0:** the auction, the Statue race and species identity were rebuilt.

- **The pledge ladder.** A raise only has to beat the standing bid — the growing increment is gone.
  What ends an auction is that **your Nth pledge must cost at least N**, and cost-0 animals cannot bid
  at all. The longest auction seen fell from 36 bids to 11.
- **Pledged animals stand in the Capital City**, underneath the card they are bidding on, until it
  settles.
- **Statues cost 10 or 20**, depending on how many you already hold, so the fifth and winning one is
  always the dearest. Over half of all games used to end 5-0 or 5-1; **71% now end 5-3 or 5-4**.
- **No forfeiture.** A losing bidder is refunded in full; the ladder is the price of a bid you cannot
  finish.
- **40-card decks**, a free single mulligan, and six rebuilt starter decks.
- **Species are design spaces, not keywords** — nine charters with a centre of gravity, a hole and a
  signature, enforced by `npm run identity`. Mean similarity between species fell from 0.78 to 0.27.
- **The market sells Buildings, hires animals, and posts Ordinances**, and the display **ages** one
  card every round.
- **Botany was merged into Agriculture**; the set runs on five studies.

See the [playtest results and what is still open](docs/PLAYTEST_NOTES.md).

## Rules in brief

**Supply** is the core resource: pay Supply to recruit Characters, rehire from Unemployment, bid in the Capital City, and activate card effects. Work shifts generate Supply.

**Orientation** (not turn counters) controls when Characters act. Characters enter at different orientations by rank:
- Apprentice (cost 0-1): upright, act immediately
- Journeyman (cost 2-3): Busy (270°), ready next turn
- Master (cost 4-5): 180°, ready two turns later

At the start of your turn, non-upright Characters rotate clockwise: 180° → 270° → 0°.

**Turn phases:** Start / Resources (draw 1 card or gain 2 Supply) / Ready (advance orientations) / Actions (recruit, shift, Events, purchase) / End (complete shifts, expire Limited Events).

**Capital City** is a contested 5-card market, and buying from it is an auction. Announce a purchase with an upright Character and a bid ≥ cost. On their own turn your rival may **outbid** you by pledging another upright Character and bidding higher. A raise only has to beat the standing bid.

What ends an auction is the **pledge ladder**: **your Nth pledge in an auction must be a Character costing at least N**. Your opening bid needs a cost-1 animal, your second a cost-2, and so on — so nobody can bid more than five times, and only then if their town runs the whole curve. **Cost-0 Characters cannot bid at all.** Your deck's curve is your bidding range.

Every pledged Character **moves to the Capital City and stands beneath the card it is bidding on** until the auction ends; it does not advance at Ready and no effect can wake it. "Cannot bid any more" is usually literal — nobody left whose cost reaches the next rung. When you are still the high bidder at the start of your own turn the card is yours; ties stay with the standing bid. **The loser is refunded in full** — the animals were the price, not the Supply.

Whenever a card leaves the display, cards are dealt from the Market Deck until the display is back to five; if the Market Deck runs out, the City Dump is shuffled in. **The display also ages**: at the start of each round the oldest card nobody is bidding on is discarded and replaced, so the market always turns over and an interesting card is a decision now rather than forever.

Besides one-shot Market cards and Statues, the Capital City sells **Buildings** (permanent, the most expensive cards in the game, three to a town, the design's Supply sink), **hires animals** (they join your town Busy whatever they cost), and posts **Ordinances** (never bought; while displayed they change the rules of every auction — moving the pledge ladder, taxing or discounting Statues, or closing the bidding).

**On-reveal cards** live in every Market Deck. They are never bought: the moment one is dealt it resolves and goes to the City Dump. Some are shared shocks (Recession empties both towns, Hard Winter abandons every shift), some pay the Mayor who is behind, and some just set the weather. A shock is the kind a Badger can brace against.

**Unemployment** disrupts Characters. Rehire for the full printed cost to return upright.

**Upgrades** let higher-cost versions of the same Character replace lower ones; pay only the difference.

**Statues** are the victory cards. Control 5 of 9 to win. **A Statue costs 10 while you hold fewer than two, and 20 once you hold two or more**, so the fifth and winning one is always the dearest thing you buy — this is the main brake on a runaway. Each Statue also carries a **boon and a burden** lasting as long as you hold it: Community's extra shift Supply comes with a thinner Resources choice, Patience speeds your Masters but slows your Apprentices, and Harmony puts every pledge you make one rung higher up the ladder.

**Market Decks** — six shared markets to choose from at setup, all containing every Statue: **First Boroughs** (the classic mix, no shared shocks), **Boom Town** (prosperity and momentum; its shocks are mostly good news), **Hard Times** (recessions, hard winters and backlogs strike both towns alike), **Founders' Fair** (auction tools, understudies and second chances, with fair weather and nothing that empties a town), **Whiskerwood Fair** (ten artisan shops with six familiar favorites and no shared shocks) and **Many Hats Fair** (a hiring fair of halls that ready, retrain and rehire Characters by rank; no shared shocks).

**Rarity** — every card is rated by what it gives you against what it asks for, and that rating sets its rarity: Common, Uncommon, Rare, Super Rare, Legendary. Rarity is not raw power. The model scores a card `power^0.6 × efficiency^0.4`, so of two cards that do the same thing the cheaper one rates higher, while of two equally efficient cards the bigger one does — a cost-0 Rabbit with a good shift can out-rate a Master. Rarity then caps how often a card may repeat in a deck: **3 / 3 / 2 / 1 / 1** copies. See `src/engine/power.js` and `npm run power`.

**Characters by name** — some cards ask for a particular friend: Nim, Chancellor of Records pays out while you control Pip (any version of him), and Pip's Reading Hour can only be played with an upright Pip. A named requirement or condition matches whichever version of that Character is on top of a stack.

**Species and study** — species is what a card *is*, study is what it *does*. Species is a design space, not a keyword: each of the nine owns a centre of gravity, a hole and a signature effect (Rabbits arrive in crowds; Badgers shrug off shocks; Raccoons work the City Dump; Squirrels put Supply by; Cats act when they should not be able to). The charters live in `spec/species.json` and `npm run identity` fails the build if two species stop playing differently. Studies — Agriculture, Civics, Commerce, Crafts, Lore — are the horizontal axis that cuts across species.

**Decks** — six printed 40-card decks (Burrow & Bloom, Paws & Papers, Bramble & Bastion, Ripple & Rune, Whisker & Willow, Root & Rampart), or build your own in the **Deck Workshop**: 40 cards, at least 16 Characters, at most 24 Events, and copies capped by rarity. Each Mayor may **mulligan once, free**. Custom decks are saved in the browser.

## Play it online

The game is published to GitHub Pages: **https://jxburros.github.io/Animal-Friends-Test-1/**

The site is not updated automatically. To push whatever is on `main` live, open the repository's
**Actions** tab, pick **Deploy game to GitHub Pages**, and press **Run workflow** (leave
*Run the engine tests* ticked to have `npm test` gate the deploy). The workflow copies
`index.html`, `src/`, `spec/`, `assets/` and `package.json` to Pages — the version stamped on the
book cover tells you which build you are looking at.

## How to play

No build step or dependencies beyond Node 22+ (for scripts/tests only). ES modules require serving; browsers block file:// access.

**Serve** the folder:
```
npm run serve                  # http://localhost:8080/
npm run serve -- --port 9000   # another port (or PORT=9000 npm run serve)
```
Then open http://localhost:8080/ in any modern browser. During play, use the **Pace** control (menu or bottom right) to choose animation speed: Storybook (slow, watch every card), Brisk (quicker), or Instant (no animations).

The server (`scripts/serve.mjs`, no dependencies) sends every file with `Cache-Control: no-store`, so each reload plays exactly what is on disk. When it starts it prints the version and the folder it is serving; the book cover shows the same version line (e.g. `v0.4.0 · Animal Friends: First Boroughs · 332 cards · 10 decks · 6 Market Decks`). If the two disagree, the browser is showing an old copy.

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
- `spec/species.json` - the nine species charters (centre of gravity, hole, signature); the contract `npm run identity` checks
- `spec/starter_card_set.json` - all 368 cards: 136 Characters, 88 Events, 9 Statues, 84 Market cards, 12 Buildings, 10 hired animals, 6 Ordinances and 23 on-reveal cards, plus six printed 40-card decks and six Market Decks. Every card carries its `rarity` and the `power` rating that earned it, and the file is ordered by that rating, strongest for its cost first. A Market Deck is dealt as all 9 Statues plus a random sample of its own pool, so it keeps one size while the display varies from game to game.
- `src/engine/` - headless deterministic rules engine (ES modules); documented in `docs/ENGINE_API.md`. `power.js` is the power/cost model that rates every card and assigns its rarity
- `src/ai/` - agents: `random.js` (baseline), `heuristic.js` (opponent)
- `src/ui/` - browser interface: `main.js`, `humanAgent.js`, `render.js`, `deckbuilder.js` (the Deck Workshop), `styles.css`, plus `art.js` (per-card illustrations), `fx.js` (animation queue/primitives), and `choreo.js` (maps engine events to animations)
- `index.html` - playable game
- `scripts/` - test utilities: `smoke.mjs` (one game log), `invariants.mjs` (card conservation), `playtest.mjs` (AI vs AI), `power.mjs` (the card set sorted by power/cost), `stamp.mjs` (restamp every card's rarity and rating after editing the set), `identity.mjs` (species/study identity and power-creep gate), `build-decks.mjs` (rebuild the printed decks from the ratings)
- `test/` - unit tests (`node --test`)

## Commands

```
npm test                                   # Run unit tests
npm run smoke                              # Print one full game log
npm run invariants                         # Check card conservation over many games
npm run power                               # Print every card sorted by power/cost, with its rarity
npm run power -- --type character           # ...one card type, or --rarity Legendary, or --csv
npm run stamp                               # Restamp rarity/power on every card and reorder the set file
npm run identity                            # Per-species and per-study effect profiles, similarity and power creep
npm run identity -- --check                 # ...or fail if two species play alike, a signature is unused, or a set has crept
npm run decks                               # Rebuild the six printed decks from the current ratings
npm run decks -- --check                    # ...or just check the printed decks are legal
npm run stamp -- --check                    # ...or just fail if any printed rarity or rating is stale
npm run playtest -- --games 200            # Playtest 200 AI matches
npm run playtest -- --games 100 --seed 42 # Use fixed seed for reproducibility
npm run playtest -- --p0 random --p1 heuristic  # Choose agents
npm run playtest -- --games 240 --decks all     # Rotate through every ordered deck pairing
npm run playtest -- --decks br,rr               # One matchup (bb, pp, br, rr, ll, rw, ww, vl, hh, tt or full deck ids)
npm run playtest -- --market hard-times          # Choose the shared Market Deck (or `all` to rotate)
```

## Prototype decisions

The `assumptions` array in `spec/game.json` documents current prototype choices:
- Second player starts with +1 card and no extra Supply
- Multiple auctions may run at once (one per Capital City card); each may be raised only on the raiser's own turn, and only by a player who is not already winning it
- A raise need only beat the standing bid; there is no growing increment
- The pledge ladder: your Nth pledge in an auction must be a Character costing at least N, so cost-0 Characters cannot bid and nobody bids more than five times
- Pledged Characters move to the Capital City beneath the card and stay there until the auction ends
- A losing bidder is refunded in full; there is no forfeit
- Statues cost 10 below two held and 20 at two or more, so the winning fifth is always the dearest
- Statues carry burdens as well as boons
- The Capital City ages: one card nobody is bidding on is discarded and replaced each round
- Buildings stay in their buyer's town, three to a town; a fourth demolishes one
- Hired Market animals enter Busy whatever they cost
- Ordinances are never bought and change every auction while displayed
- On-reveal Market cards resolve as they are dealt and are never purchasable
- Each Mayor may mulligan once, free
- An Event's Character requirement can be reduced by at most one, however many reductions you hold
- Upgrading preserves stack orientation and re-triggers recruit abilities
- Readying a Character mid-shift completes the shift immediately
- Reactive abilities (shields) set on your turn and last until your next turn starts
- Deck reshuffle: when player deck empties, shuffle Town Dump in
- Top-up refill: the Capital City is dealt back up to five cards as soon as a purchase resolves

## Card art

**Full Art Collection:** twelve selected cards now have their own portrait paintings, edge-to-edge
artwork, fine gold frames and subtle pointer-responsive foil. Choose **Explore the 12 Full Art cards**
on the book cover to browse the collection. The same treatment appears in play, the Deck Workshop
and card readers. Printed rarities and gameplay are unchanged. See the
[collection and validation notes](docs/FULL_ART_COLLECTION.md) and [all twelve rendered cards](docs/screenshots/full-art-collection.png).

The painted storybook edition uses three bundled atlases with 48 paintings, parchment nameplates,
botanical borders, and distinct type colors: forest-green Characters, midnight-blue Events,
vermilion Market cards, and antique-gold Statues. The cover, game, card previews and Deck Workshop
share this presentation. Select **Read** on any visible card to open its full artwork, rules and
burden in a keyboard- and touch-accessible reading view; Escape closes it.

`src/ui/painted-art.js` selects a painted scene by explicit atlas/tile when a card names one (`art: { atlas: "boroughs" | "whiskerwood" | "neighbors", tile }`), or by species
and theme for other cards. These are **48 paintings, not 332 unique illustrations**: related cards retain different printed names, jobs,
stats and effects while sharing art. The twelve Full Art selections override their shared painting
with an individual PNG from `assets/art/full-art/`, retaining the atlas and vector layers as fallbacks.
All three PNG atlases and the twelve portraits ship with the game; no image
service or external font request is needed to play. `src/ui/art.js` preserves the original per-card
vector illustrations underneath the painted layer as a fallback for missing art or unknown species.
`src/ui/storybook.css` owns the painted edition's presentation without changing rules or animation timing.

See [the art direction and validation notes](docs/PAINTED_EDITION.md) for scene coverage and the
generation prompt, and [the rendered card preview](docs/screenshots/painted-cards.png).

The user-supplied [Neighbors sheet](docs/NEIGHBORS_ART.md) adds 16 job-specific paintings assigned
to 71 Characters from the original set and Many Hats. See the [updated card preview](docs/screenshots/neighbors-cards.png).

## Design notes

Character cards in the design reference are examples. The authoritative card set lives in `spec/starter_card_set.json`. Use it as the contract for adding new cards.

The design reference (Section 1-9) is the source of truth for gameplay intent; `spec/game.json` codifies the rules and constants; the playtest implementation is the living rulebook.
