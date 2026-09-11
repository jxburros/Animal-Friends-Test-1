# Animal Friends TCG - First Boroughs Prototype

A two-player town-building trading card game where each player is the **Mayor** of a town populated by cute animal workers. Recruit Characters, send them on work shifts to produce **Supply**, play Events, and bid against your rival in the shared **Capital City**. Win by controlling 5 of the 9 **Statues**.

This repo replaced the earlier single-file "Critter Town" game (archived at `docs/legacy-critter-town.html`).

## Rules in brief

**Supply** is the core resource: pay Supply to recruit Characters, rehire from Unemployment, bid in the Capital City, and activate card effects. Work shifts generate Supply.

**Orientation** (not turn counters) controls when Characters act. Characters enter at different orientations by rank:
- Apprentice (cost 0-1): upright, act immediately
- Journeyman (cost 2-3): Busy (270°), ready next turn
- Master (cost 4-5): 180°, ready two turns later

At the start of your turn, non-upright Characters rotate clockwise: 180° → 270° → 0°.

**Turn phases:** Start / Resources (draw 1 card or gain 2 Supply) / Ready (advance orientations) / Actions (recruit, shift, Events, purchase) / End (complete shifts, expire Limited Events).

**Capital City** is a contested 5-card market. Announce a purchase with an upright Character and a bid ≥ cost; the opponent may challenge once with a higher bid. Resolves at the start of the announcer's next turn; ties go to the announcer; only the winner pays.

**Unemployment** disrupts Characters. Rehire for the full printed cost to return upright.

**Upgrades** let higher-cost versions of the same Character replace lower ones; pay only the difference.

**Statues** are the victory cards. Control 5 of 9 to win.

## How to play

No build step or dependencies beyond Node 22+ (for scripts/tests only). ES modules require serving; browsers block file:// access.

**Serve** the folder:
```
npm run serve          # Python http.server on :8080
```
Then open http://localhost:8080/ in any modern browser.

Or use any static server (e.g., `python3 -m http.server 8080`).

## Project layout

- `docs/ANIMAL_FRIENDS_TCG_DESIGN_REFERENCE.md` - design reference and source of truth
- `spec/game.json` - rules constants and prototype decisions
- `spec/starter_card_set.json` - all cards: two 30-card decks ("Burrow & Bloom", "Paws & Papers") and 25-card Market Deck with 9 Statues
- `src/engine/` - headless deterministic rules engine (ES modules); documented in `docs/ENGINE_API.md`
- `src/ai/` - agents: `random.js` (baseline), `heuristic.js` (opponent)
- `src/ui/` - browser interface: `main.js`, `humanAgent.js`, `art.js`, `styles.css`
- `index.html` - playable game
- `scripts/` - test utilities: `smoke.mjs` (one game log), `invariants.mjs` (card conservation), `playtest.mjs` (AI vs AI)
- `test/` - unit tests (`node --test`)

## Commands

```
npm test                                   # Run unit tests
npm run smoke                              # Print one full game log
npm run invariants                         # Check card conservation over many games
npm run playtest -- --games 200            # Playtest 200 AI matches
npm run playtest -- --games 100 --seed 42 # Use fixed seed for reproducibility
npm run playtest -- --p0 random --p1 heuristic  # Choose agents
```

## Prototype decisions

The `assumptions` array in `spec/game.json` documents current prototype choices:
- Second player starts with +2 Supply and +1 card (first-player offset, tuned by playtest)
- Multiple pending purchases allowed simultaneously (one per Capital City card), each with at most one challenge
- Bids are escrowed when announced or challenged; refunded to loser
- Upgrading preserves stack orientation and re-triggers recruit abilities
- Readying a Character mid-shift completes the shift immediately
- Reactive abilities (shields) set on your turn and last until your next turn starts
- Deck reshuffle: when player deck empties, shuffle Town Dump in

## Design notes

Character cards in the design reference are examples. The authoritative card set lives in `spec/starter_card_set.json`. Use it as the contract for adding new cards.

The design reference (Section 1-9) is the source of truth for gameplay intent; `spec/game.json` codifies the rules and constants; the playtest implementation is the living rulebook.
