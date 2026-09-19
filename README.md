# Animal Friends TCG — First Boroughs

*A storybook in three parts. Part one is the story. Part two is how to play. Part three is npm
commands, which is not usually how storybooks end, but this one is also a repository.*

**Play online:** https://jxburros.github.io/Animal-Friends-Test-1/ — or skip to
[Part Three](#part-three-the-technicals) and run it yourself in about nine seconds.

---

## Part One: The Story

### Chapter 1, in which there are two towns and nobody is the villain

There is a town of animals. It is run by a Mayor, and the Mayor is you.

Somewhere across the fields there is a second town, run by a second Mayor, who is also doing their
best. Between the two sits the **Capital City**, which belongs to neither and sells to both. Almost
everything either town wants has to come across it. That is the entire geography, and it is enough.

Your animals are not heroes. Adam mends roads — the lane down to the ferry steps, the long pull up
to the county gate, the square's cobbles after a festival. Andrew keeps the late desk at the Lending
Library, the hours after the children's corner has emptied. Annabelle sorts the Salvage Yard,
because everything the borough throws out goes through the Yard and everything with words on it goes
through Annabelle. Abigail works the counter at Gwen's, on the corner opposite Bean's, and has since
the week she turned up needing a fortnight's work.

A Badger Cub is put in the corner of the workshop with a block and a blunt gouge and is not spoken
to for a fortnight. That is not a joke at the Badgers' expense. That is how Badgers do apprenticeship,
and it is also, if you look at it sideways, the rules text for why the cheapest animals in the game
arrive ready to work and can never win an auction. The borough tends to explain its own mechanics if
you let it talk long enough.

### Chapter 2, in which everyone has a job and a species, and only one of those can change

**Species** is what an animal *is*. There are ten, and each has a charter: Rabbits arrive in crowds.
Badgers shrug off shocks. Raccoons work the City Dump. Squirrels put Supply by. Cats act when they
should not be able to. Owls wake the town before dawn. Mice, Hedgehogs, Otters and Foxes have their
own centres of gravity and their own holes, which is the polite word for the thing each species is
bad at.

**Study** is what an animal *does*. Agriculture, Civics, Commerce, Crafts, Lore and Science are the
old six. **Food** was named when the café by the Hiring Hall became the place half the borough's
business got done. **Entertainment** was the last one the borough admitted it had, which is why its
token was struck last of the eight.

An animal can change what it does. It does not change what it is. The engine enforces this, and so,
more importantly, does the Town Bible.

### Chapter 3, in which nine virtues are carved and five of them end an argument

The Capital City has a quarry, and out of the quarry come **Statues** — monuments to virtues like
Community, Patience and Harmony. Fifteen virtues exist in the collection; any one game raises nine
of them, so the skyline changes between matches.

Control **five of the nine** and you win. But winning is not a scoreboard reading zero. It is an
**incorporation**: your rival's charter closes, their town goes on your books, their animals become
your animals, and **you name the borough that results**.

Nobody dies in this game. Somebody just ends up in charge of a bigger, stranger town with a new
name, and the Otter who works the counter at Gwen's keeps working the counter at Gwen's.

Every Statue also carries a **burden** alongside its boon, for as long as you hold it. Community
pays extra on work shifts and thins your Resources choice. Patience speeds your Masters and slows
your Apprentices. Harmony puts every bid you make one rung further up a ladder you will meet in a
moment. The monuments are not free, which is the most honest thing in the design.

---

## Part Two: How to Play

*The short version, for a reader who would like to sit down at the table. The complete rules text
lives in the in-game **How to play** book and in [README_FULL.md](docs/README_FULL.md), which is
long enough to have its own weather.*

### Supply pays for everything

Recruiting, rehiring, bidding, building, activating abilities. **Work shifts** produce it. It is at
once the town's money and its bidding power — the same coin pays a wage and wins a Building.

### Orientation, not turn counters

A card's angle on the table tells you when it may act, and rank sets the angle it arrives at:

| Rank | Cost | Arrives |
| --- | --- | --- |
| Apprentice | 0–1 | upright, acts immediately |
| Journeyman | 2–3 | Busy (270°), ready next turn |
| Master | 4–5 | 180°, ready two turns later |

At the start of your turn, everything not upright rotates one step clockwise: 180° → 270° →
upright. The good ones are already booked. That is the whole of the joke and the whole of the rule.

### A turn

**Start** → **Resources** (draw a card *or* take 2 Supply) → **Ready** (rotate) → **Actions**
(recruit, work, play Events, buy) → **End** (shifts complete, Limited Events expire).

### The Capital City is an auction, and the currency is your friends

Five cards on offer, contested by both Mayors. To bid you **pledge an upright Character**, who walks
to the Capital City and *stands beneath the card* until the auction ends. They do not rotate. No
effect wakes them.

The brake is the **pledge ladder**: your **Nth pledge must cost at least N**. Your first bid needs a
cost-1 animal, your second a cost-2, and so on — so nobody bids more than five times, and only then
if their town runs the whole curve. **Cost-0 animals cannot bid at all.** Your deck's curve is your
bidding range.

When you are still the high bidder at the start of your own turn, the card is yours. **The loser is
refunded in full** — the animals were the price, not the Supply.

And the display **ages**: once a round, the oldest card nobody is bidding on is discarded and
replaced. A good card is a decision *now*, not a decision eventually.

### Ten animals, eight Building places

**A town holds ten animals**, counting everyone: at work, pledged into an auction, and face down in
**Unemployment**. Rehiring and promoting move an animal between two zones that both count, so they
stay legal in a full town — only a genuinely new body is refused. This is why a *better* animal is
worth more than *another* animal, and why the question is never how many but which ten.

**Eight Building places** hold everything permanent: Capital City Buildings, your own deck's Town
Buildings, and your Statues. A Statue takes a place, so a Mayor closing on victory is also running
out of room to build. Buildings bill **upkeep** every turn; an unpaid bill knocks a Building on its
side until the owner can afford it, rather than forcing a sale.

**Statues cost 10, then 20, then 30** as you collect them, and the price is read **when the auction
resolves**, not when you announced it. If a fourth Statue arrived while your auction ran, you top up
at resolution or the purchase fizzles and your bid comes home. This is the main brake on a runaway,
and it is deliberately cruel.

### Rarity means "how many", not "how rare"

Every card is rated on what it gives against what it asks — `power^0.6 × efficiency^0.4` — and the
cut it must clear is read off **its own cost group**, so every cost from 0 to 5 has its own Commons
and its own marquee card. A cost-0 Rabbit with a good shift can out-rate a Master.

That rating caps **copies in a deck: 4 / 3 / 2 / 1 / 1**. Rarity here is a deckbuilding constraint
wearing a collector's vocabulary.

### What ships, and three ways in

**Ten 40-card decks**, one per species — Furrow & Warren, Margin & Pantry, Bench & Bylaw, Hedge &
Holiday, Bin & Barter, Gavel & Greasepaint, Current & Counter, Cache & Kitchen, Lens & Lathe, Dome &
Dusk. All ten are *built by a script* from their species charters rather than hand-listed, so what a
deck is written for is also its power level.

**Four Capital Cities**, and no two are the same place: **The Grand Exchange** (everything, the city
to meet the collection in), **The Hard Frost** (a bad year, assessors at the door), **The Open
Hiring** (labour, not weather) and **Guild Row** (slow, rich, nothing here hits you).

And **build your own** in the Deck Workshop: 40–50 cards, copies capped by rarity, saved in your
browser. There is no Character floor and no Event ceiling — the deck is yours to get wrong, and the
Workshop warns rather than refuses.

New Mayors have three doors, all on the cover:

- **Welcome** — a short introduction: who you are, what a turn is, how you win.
- **Tutorial** — a scripted seven-turn match against Mayor Sable, with a coach chip on every move
  saying what to do and why. The board only offers the right move; a wrong click gets a nudge;
  **Do it for me** plays it for you. It is tested headlessly, so a rules change that breaks the
  lesson fails the build.
- **How to play** — the book: Quick start, the full rules, and the twenty questions new Mayors
  actually ask, from "why can't my cost-0 animal bid?" to "why did a card vanish from the market?"

---

## Part Three: The Technicals

*Here the storybook stops pretending. No build step, no dependencies. Node 22+ is needed for the
scripts and tests only — the game itself is `index.html` and some ES modules, which browsers refuse
to load over `file://`, hence a server.*

### Run it

```
npm run serve                  # http://localhost:8080/
npm run serve -- --port 9000   # another port (or PORT=9000 npm run serve)
```

The server sends `Cache-Control: no-store`, so every reload plays what is on disk. It prints the
version it is serving, and the book cover prints the same line (version · cards · decks · Market
Decks). **If the two disagree, the browser is showing an old copy** — hard-reload once
(Ctrl+Shift+R / Cmd+Shift+R). `npm run serve:python` is a fallback that sets no cache headers.

`npm run serve` refuses to start while another server holds the port, and says so. An old server
left running in another terminal is the single most common way to test the wrong folder.

### Commands

```
npm test                                  # unit tests (node --test)
npm run smoke                             # print one full game log
npm run invariants                        # card conservation over many games
npm run playtest -- --games 200           # AI vs AI
npm run playtest -- --seed 42             # fixed seed, reproducible
npm run playtest -- --p0 random --p1 heuristic
npm run playtest -- --decks mm,ss --market hard-times
npm run playtest -- --games 1120 --decks all --market all   # the full cross product
npm run power                             # every card by power/cost, with its rarity
npm run power -- --type character         # ...or --rarity Legendary, --cost 3, --csv
npm run stamp                             # restamp rarity/rating across the set
npm run stamp -- --check                  # ...or fail if anything printed is stale
npm run identity                          # species/study profiles and the power-creep gate
npm run identity -- --check               # ...or fail if two species stop playing differently
npm run decks                             # rebuild decks and Capital Cities from current ratings
npm run decks -- --check                  # ...or just check the printed decks are legal
npm run characters                        # write the character spreadsheets into docs/
npm run characters:xlsx                   # ...and bind them into one workbook (needs openpyxl)
```

Most take `--check` or `--help`. [README_PREVIOUS.md](docs/README_PREVIOUS.md) and
[README_FULL.md](docs/README_FULL.md) list every flag.

### Project layout

| Path | What it is |
| --- | --- |
| `index.html` | the playable game |
| `src/engine/` | headless deterministic rules engine — see [ENGINE_API.md](docs/ENGINE_API.md) |
| `src/ai/` | agents: `random.js` (baseline), `heuristic.js` (the opponent) |
| `src/ui/` | board, Book, Lore Directory, Deck Workshop, art and animation |
| `src/tutorial/` | the scripted tutorial match, DOM-free so tests can play it |
| `spec/maker_card_set.json` | the collection — the only card set the game reads |
| `spec/game.json` | rules constants and the `assumptions` list of prototype decisions |
| `spec/species.json` | the ten species charters — the contract `npm run identity` checks |
| `spec/lore.json`, `spec/progression.json` | Lore Directory text; economy tuning |
| `scripts/` | server, playtest and card-model tooling |
| `test/` | unit tests |
| `docs/` | design reference, world bible, art direction, archived READMEs |

### Writing cards

`spec/maker_card_set.json` is the contract — it holds each character's backstory *alongside* their
cards, which is the reason the flavour and the mechanics agree as often as they do.

- [WRITING_A_CHARACTER.md](docs/WRITING_A_CHARACTER.md) — the process for one character's cards
- [TOWN_BIBLE.md](docs/TOWN_BIBLE.md) — the shared world every backstory must agree with
- [ANIMAL_FRIENDS_TCG_DESIGN_REFERENCE.md](docs/ANIMAL_FRIENDS_TCG_DESIGN_REFERENCE.md) — the
  design source of truth

After editing the set, run `npm run stamp`, `npm run identity -- --check` and `npm test`.

### Publishing

The Pages site is **not** updated automatically. Open the repository's **Actions** tab, pick
**Deploy game to GitHub Pages**, press **Run workflow** (leave *Run the engine tests* ticked so
`npm test` gates the deploy). It copies `index.html`, `src/`, `spec/`, `assets/` and `package.json`
to Pages. The version on the book cover tells you which build you are looking at.

---

*Longer readings: [README_FULL.md](docs/README_FULL.md) has the complete rules, every prototype
decision, the art notes and the full version history. [TOWN_BIBLE.md](docs/TOWN_BIBLE.md) has the
borough itself. [README_PREVIOUS.md](docs/README_PREVIOUS.md) is the previous README, filed away —
same facts, fewer chapters.*
