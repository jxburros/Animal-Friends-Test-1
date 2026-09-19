# Animal Friends TCG - First Boroughs (previous README)

> Filed away on 2026-09-19. This is the short reference README as it stood at v0.14.0 —
> rules in one screen, project layout, commands. The [README](../README.md) at the root
> replaced it with a storybook telling; everything here is still true, just drier.
> The long-form archive is [README_FULL.md](README_FULL.md).

---

# Animal Friends TCG — First Boroughs

A two-player town-building trading card game, playable in the browser. Each player is the **Mayor**
of a town of animal workers: recruit Characters, send them on work shifts to produce **Supply**, play
Events, and bid against your rival for the cards on offer in the shared **Capital City**. Control
**5 of the 9 Statues** and you win — your rival's town is incorporated into yours, and you name the
borough that results.

The repo holds the game (`index.html` + `src/ui/`), a headless deterministic rules engine
(`src/engine/`), the card set (`spec/maker_card_set.json`) and the scripts that rate cards, build
decks and playtest them.

**Play online:** https://jxburros.github.io/Animal-Friends-Test-1/ — published from `main` by the
**Deploy game to GitHub Pages** workflow, run by hand from the Actions tab.

## Run it locally

No build step and no dependencies; Node 22+ is needed for the scripts and tests only. ES modules
have to be served — browsers block `file://`.

```
npm run serve                  # http://localhost:8080/
npm run serve -- --port 9000   # another port (or PORT=9000 npm run serve)
```

The server sends `Cache-Control: no-store`, so every reload plays what is on disk. It prints the
version it is serving, and the book cover shows the same line — if the two disagree, the browser is
showing an old copy. `npm run serve:python` is a fallback that does not set cache headers.

New players have three ways in, all on the cover: the **welcome** introduction, the **tutorial**
(a scripted seven-turn match with a coach chip on every move), and the **How to play** book
(quick start, full rules, and the twenty questions new Mayors ask most).

## The rules in one screen

- **Supply** pays for everything: recruiting, rehiring, bidding, building, activating abilities.
  Work shifts produce it.
- **Orientation**, not turn counters, says when an animal may act. Apprentices (cost 0–1) arrive
  upright; Journeymen (2–3) arrive Busy; Masters (4–5) arrive at 180°. Everything rotates one step
  clockwise at the start of your turn.
- **A turn** runs Start / Resources (draw a card or take 2 Supply) / Ready / Actions / End.
- **The Capital City** is a contested five-card market and buying is an auction. Each bid pledges an
  upright Character who stands under the card until the auction ends, and your Nth pledge must cost
  at least N — so cost-0 animals never bid and nobody bids more than five times. The loser is
  refunded in full. The display ages once a round, so a good card is a decision now.
- **A town holds ten animals and eight Building places.** Statues take Building places too, so a
  Mayor closing on victory is also running out of room. Buildings bill upkeep every turn.
- **Statues** cost 10, then 20, then 30 as you collect them, and each carries a burden as well as a
  boon. The price is read when the auction resolves, which is the main brake on a runaway.
- **Rarity** is computed from a card's power against its cost, and caps copies in a deck
  (4 / 3 / 2 / 1 / 1) rather than describing how hard it is to find.

Ten 40-card decks ship with the game, one per species, alongside four Capital Cities that each deal
a different kind of market. You can also build your own in the **Deck Workshop**.

The full rules text, every prototype decision, the art notes and the complete version history live in
**[README_FULL.md](README_FULL.md)**.

## Project layout

| Path | What it is |
| --- | --- |
| `index.html` | the playable game |
| `src/engine/` | headless deterministic rules engine — see [ENGINE_API.md](ENGINE_API.md) |
| `src/ai/` | agents: `random.js` (baseline), `heuristic.js` (the opponent) |
| `src/ui/` | browser interface: board, Book, Lore Directory, Deck Workshop, art and animation |
| `src/tutorial/` | the scripted tutorial match, DOM-free so the tests can play it |
| `spec/maker_card_set.json` | the collection — the only card set the game reads |
| `spec/game.json` | rules constants and the `assumptions` list of prototype decisions |
| `spec/species.json`, `spec/lore.json`, `spec/progression.json` | species charters, Lore Directory text, economy tuning |
| `scripts/` | server, playtest and card-model tooling |
| `test/` | unit tests (`node --test`) |
| `docs/` | design reference, world bible, art direction, archived README |

## Commands

```
npm test                    # unit tests
npm run smoke               # print one full game log
npm run invariants          # card conservation over many games
npm run playtest -- --games 200 [--seed 42] [--decks mm,ss] [--market hard-times]
npm run power               # every card sorted by power/cost, with its rarity
npm run stamp               # restamp rarity/rating across the set (--check to fail on stale)
npm run identity            # species/study profiles and power-creep gate (--check to enforce)
npm run decks               # rebuild the printed decks and Capital Cities from current ratings
npm run characters          # write the character spreadsheets into docs/
```

Most of these take `--check` or `--help`; the archived README lists every flag.

## Writing cards

`spec/maker_card_set.json` is the contract. [WRITING_A_CHARACTER.md](WRITING_A_CHARACTER.md) is
the process for writing one character's cards, [TOWN_BIBLE.md](TOWN_BIBLE.md) is the shared world
every backstory has to agree with, and
[ANIMAL_FRIENDS_TCG_DESIGN_REFERENCE.md](ANIMAL_FRIENDS_TCG_DESIGN_REFERENCE.md) is the design
source of truth. After editing the set, run `npm run stamp`, `npm run identity -- --check` and
`npm test`.
