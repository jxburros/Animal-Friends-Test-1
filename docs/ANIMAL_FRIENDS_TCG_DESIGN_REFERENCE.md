# Animal Friends TCG — Current Design Reference

**Status:** living design reference and playable-prototype guide  
**Current prototype set:** *Animal Friends: First Boroughs* (`AF-STARTER-01`)  
**v0.3.0 expansion:** *Whiskerwood* (`AF-WHISKER-01`) adds 52 cards, Cats, two starter decks,
and a fifth Market Deck. **v0.4.0 expansion:** *Many Hats* (`AF-HATS-01`) adds 72 cards built on the existing
Characters: a new version of every named Character (new studies and new levels), Events and conditions that
name a specific Character, two starter decks and a sixth Market Deck. Current totals are 332 cards, nine
species, ten decks and six Market Decks. The earlier counts below describe the pre-expansion design; see
[WHISKERWOOD.md](WHISKERWOOD.md) and [MANY_HATS.md](MANY_HATS.md) for expansion content. The original
208 cards and the nine-Statue victory structure are unchanged.
**Authoritative implementation sources:** `spec/game.json` and `spec/starter_card_set.json`  
**Last consolidated:** September 11, 2026 (the power/cost model and rarity, a doubled card set, six printed decks and four Market Decks)

This document gathers the decisions, rules, design principles, and current prototype content for **Animal Friends TCG**. It distinguishes between rules implemented in the playtest, agreed design direction, and items still to be designed. It is not yet a final, player-facing rulebook.

## 1. The game at a glance

*Animal Friends TCG* is a competitive, two-player town-building trading card game. Each player is the **Mayor** of a rival town populated by cute animal workers. Mayors recruit Characters, send them on work shifts to create **Supply**, play Events, and compete over a shared market called the **Capital City**.

The core victory objective is visible and simple: gain a strict majority of the game's **Statues** (Victory cards). The current starter set has nine Statues, so a player wins by controlling five.

The intended feel is cute, whimsical, animal-centered, and lightly strange—visually in the neighborhood of *Twisted Cryptid*, Drew Brockington's work, and *Flamecraft*. Its strategic tension comes from deciding whether an available worker should work, help buy or bid for a Capital City card, satisfy an Event requirement, or use a Character ability.

## 2. Product and design pillars

The game is meant to be competitive without turning into a lockout experience.

- **Build a town, not a prison.** Player-deck cards should primarily improve their controller's town. Direct denial is limited.
- **Shared disruption is healthier.** Broad disruption should usually come from the shared Capital City and affect both players equally, rewarding preparation rather than repeatedly targeting one opponent.
- **No recurring lockouts.** Cards and loops must not prevent a player from meaningfully playing the game, especially by repeatedly sending freshly played Characters to Unemployment.
- **Every strong Character gets a chance.** A Character should normally have an opportunity to act at least once before an opponent can remove it.
- **Deep, but natural.** The board state should communicate the important information; the game should not depend on hidden scoring or heavy bookkeeping.
- **A loss should still be satisfying.** Building an appealing town and accomplishing a personal plan should feel worthwhile even when another Mayor wins the statues.

Animal identity should be easy to read and original. Broad traits are welcome when they create useful game play; **Big** is a proposed example for feats that require physical scale. Raccoons naturally support sly or thieving effects, while bears can suggest strength or carrying capacity. Do not build identities that resemble existing characters or intellectual property too closely.

## 3. Components and game areas

### Players and decks

The current rules specify exactly **two** players, each with a private player deck and a public town. The *First Boroughs* starter prototype gives each player a 30-card deck and starts each at 6 Supply with five cards in hand; the second player draws one extra card. The shared Market Deck is chosen from three (see Section 4), each nine Statues plus a sampled pool.

### Areas

| Area | Owner | Purpose |
| --- | --- | --- |
| Player Deck | Player | Private deck containing that player's Characters and Events. |
| Hand | Player | Cards available to recruit or play. |
| Your Town | Player | Active Characters, ongoing Events, and acquired Statues/effects. |
| Town Dump | Player | That player's discard pile, including discarded Events and removed layers of a Character stack. |
| Unemployment | Player | Public holding area for disrupted Characters; they are inactive until rehired. |
| Victory Row | Player | The public area for a player's acquired Statues. |
| Capital City | Shared | Five face-up Market cards contested by both players. |
| City Dump | Shared | Used Market cards, which can later be recycled into the market. |
| Out of Play | Shared | Market cards that explicitly remove themselves permanently. |

## 4. Card types and identities

### Characters

Characters are animal workers recruited from a player's own deck. A Character has a name, job, species, area of study, Supply cost (0–5), work-shift delay and output, plus possible abilities.

- **Species** and **area of study** are the main mechanical identity keys. Cards can reward, require, target, recruit, or disrupt them.
- **Job** is primarily flavor and worldbuilding.
- Some Characters have recruitment triggers, persistent effects, Busy abilities, or effects tied to the Capital City, Events, shifts, Unemployment, or Statues.

### Events

Events replaced the earlier Location and Action concepts. They live in player decks, never in the shared Market Deck.

- **Instant Events** resolve and then go to their owner's Town Dump.
- **Limited Events** remain in a player's town for their stated duration before going to the Town Dump.
- An Event can be free, cost Supply, or require one or more upright Characters. Supported requirement patterns include an upright Character, a trait count, species count, area-of-study count, and Supply.
- To meet a Character requirement, the selected upright Characters become Busy. This makes Events part of the same worker-allocation puzzle as shifts and bids.

### Market cards, Statues and Disruptions

The shared Market Deck contains ordinary **Market** cards, **Statues** and **Disruptions**. Market cards and Statues are gained through the auction system: ordinary Market cards provide effects and usually go to the City Dump after use; Statues remain in their controller's Victory Row and count toward victory.

**Disruptions** are never bought and never occupy a display slot. The moment one is dealt into the Capital City it resolves against **both** towns at once and goes to the City Dump, and another card is dealt in its place. They are the design's main instrument of shared disruption (Section 2): a Recession sends every Character in both towns to Unemployment, a Hard Winter abandons every shift in progress, a Boom Season pays both Mayors. A Disruption dealt while the market is first laid out is set aside unresolved, since there is no game state yet to disrupt.

### Market Decks

The shared market is chosen at setup from four Market Decks, each containing all nine Statues plus its own pool:

| Market Deck | Character |
| --- | --- |
| **First Boroughs** | The classic mix of growth, card flow and pointed disruption. No shared shocks. |
| **Boom Town** | Prosperity and momentum: Supply flows freely, direct disruption is rare, and the shared shocks are mostly good news. |
| **Hard Times** | Recessions, hard winters and backlogs strike both towns alike, and the cards that survive them are worth fighting over. |
| **Founders' Fair** | Auction tools, understudies and second chances, with fair weather and nothing that empties a town. |

### Rarity and the power/cost model

Every card in the set carries a **rarity** — Common, Uncommon, Rare, Super Rare or Legendary — and it is
derived, not hand-assigned. `src/engine/power.js` rates a card in *Supply-equivalents*:

- **Power** is everything the card gives you: a shift is rated by its throughput (`output / delay`) plus a
  little for the lump sum; an ability is rated by what it does times how often its trigger fires, discounted
  for every condition attached to it; a Statue adds the value of being a fifth of a victory; a Statue's burden
  subtracts.
- **Opportunity cost** is everything it asks for: the Supply, the action, the turns a Master spends rotating
  into work, the Characters an Event taps, the slot the card takes in a 30-card deck.
- **Rating** is `power^0.6 × efficiency^0.4`, where efficiency is power over opportunity cost.

That exponent split is the design decision. Rarity is *not* raw power: of two cards that give you the same,
the cheaper one rates higher, and a cost-0 Rabbit with a good shift can out-rate a Master. But efficiency alone
would make every cheap card legendary, so size still decides between two equally efficient cards. Bands are
set so the set reads as a pyramid (about 50% Common, 25% Uncommon, 18% Rare, 5% Super Rare, 3% Legendary).

Rarity then does real work at the table: it caps how many copies of a card a 30-card town deck may hold —
**3 / 3 / 2 / 1 / 1** — so the cards that carry a game are the ones you may least often repeat. The printed
decks are built to that shape: a base of Commons and Uncommons at three and two copies, a Rare or two at two,
and at most a single Super Rare or Legendary as the deck's one marquee card.

The model is also what the heuristic AI uses to value an unfamiliar card, so a new card is understood the day
it is printed rather than the day someone adds it to a table. `npm run power` prints the whole set in rating
order, and a test fails if the rarity printed on a card is no longer the one the model gives it.

## 5. Supply, readiness, and delayed availability

### Supply

Supply is the game's core resource. It pays for recruiting, rehiring from Unemployment, Capital City purchases and bids, and card effects. Work shifts are the main source, supplemented by card effects and the once-per-turn resource choice.

### Orientation and Busy

The game uses card orientation—not generic turn counters—to display availability and arrival delay.

- An **upright** Character (0°) is ready and can act.
- A **Busy** Character is rotated clockwise to 270° and cannot act.
- At the start of its owner's turn, every non-upright Character rotates clockwise by one quarter turn: 180° → 270° → 0°.
- A Character must be upright to work, announce a purchase, challenge a purchase, activate a Busy ability, or satisfy an Event requirement.

This implementation supersedes older notes that used general turn counters. The exact physical card-rotation convention remains an open presentation decision, but the rules data use the orientation values above.

### Rank and arrival delay

| Rank | Supply cost | Entry orientation | Practical result |
| --- | ---: | --- | --- |
| Apprentice | 0–1 | Upright | Can act immediately. |
| Journeyman | 2–3 | Busy / 270° | Becomes ready at the start of its owner's next turn. |
| Master | 4–5 | 180° | Takes two owner-turn orientation advances to become ready. |

Rehired Characters return from Unemployment **upright** after their full Supply cost is paid. This is an explicit current rule.

## 6. Turn flow and actions

Each turn has five phases: **Start**, **Resources**, **Ready**, **Actions**, and **End**. In the prototype, resolving a pending Capital City purchase happens before the active player makes their resource choice; then their resource choice and ready advance lead into Actions.

1. **Start:** resolve a Capital City card that this player won from a pending purchase, if applicable.
2. **Resources:** choose one: draw one card, or gain two Supply.
3. **Ready:** advance all non-upright Characters one clockwise orientation step. Characters that reach upright become available.
4. **Actions:** recruit Characters, work shifts, play Events, announce a Capital City purchase, challenge an opponent's purchase, return a Character from Unemployment, and use applicable effects.
5. **End:** reduce the remaining time on the active player's work shifts and Limited Events. Completed shifts produce their Supply; expired Limited Events go to the Town Dump.

### Working shifts

All Characters can work. To start a shift, make an upright Character Busy. Its card defines a shift delay and Supply output. At the end of each of its owner's turns, the shift's remaining delay decreases; when it reaches zero, the Character produces its listed Supply. This creates a timing tradeoff: workers create money, but cannot simultaneously hold the Capital City or fuel an Event.

## 7. Recruiting, upgrades, transfers, and Unemployment

### Recruiting

Recruit a Character from hand by paying its Supply cost and putting it into town at the orientation dictated by its rank. Recruitment abilities may trigger when it enters. The current prototype also contains effects that reduce a recruitment cost or recruit a cost-0 Character exceptionally.

### Upgrades

Higher-cost versions of the same named Character can upgrade a lower-cost version in town.

- The new version must have the same name and a higher cost.
- Pay only the difference between the new cost and the current version's cost.
- Place the new card as the new top of that Character's stack.

This supports recurring residents progressing through their careers.

### Transfers

Characters with the same name and the same cost can be **Transferred**. This concept is retained, but its exact effect is still undefined and must not be treated as a complete rule.

### Unemployment

Effects can send a Character from town to Unemployment. A Character there cannot work, become Busy, go to the Capital City, or otherwise function as an active town Character.

To rehire one, pay its full printed Supply cost and return it to town upright. Effects can create specific discounts or exceptions.

If a stacked Character is sent to Unemployment:

1. The top card goes to its owner's Town Dump.
2. The card immediately beneath it goes to Unemployment.
3. Any further cards beneath that go to the Town Dump.

Thus, disruption knocks an upgraded resident down to the preceding version rather than preserving the entire stack.

## 8. Capital City: delayed purchases and bids

Five Market cards are displayed in the Capital City. It is deliberately a contested market, not a private shop.

### Announcing a purchase

During Actions, choose an upright Character, make it Busy, select an available Capital City card, and announce a bid at least equal to that card's listed cost. This opens an **auction** on that card; the card remains in the Capital City while the auction runs.

### Raising

On their own turn, a Mayor who is **not** the current high bidder may pledge another upright Character, making it Busy, and bid above the standing bid. There is no limit on rounds: the announcer may answer a raise, the rival may answer that, and so on for as long as both can pay. To keep a war from crawling upward one Supply at a time, the required step grows by one every two bids. Ties stay with the standing bid; a special effect can let a raiser take the lead on a tie.

An auction settles at the start of the **high bidder's** turn. Because the Mayors alternate turns, still holding the lead when your own turn comes round means your rival has had a turn and declined to answer.

- the high bidder wins and pays their bid in full;
- the loser **forfeits half** of everything they escrowed, rounded up, and is refunded the rest;
- the winner gains and resolves the card before their resource choice.

### The cost of bidding

A bid costs animals as much as Supply, and this is the mechanism that ends auctions.

- **Every Character pledged to an auction stays Busy until that auction ends.** It does not advance at Ready, and effects that would ready a Character cannot free it. A Mayor four rounds into a bidding war has four animals standing in the Capital City instead of working, satisfying Events, or bidding elsewhere.
- Because escrow is forfeit by half, entering a war you cannot finish is genuinely expensive: walking away costs real Supply, not just tempo.
- So "one Mayor can no longer bid" is usually literal — they have nobody upright left to pledge.

Cards and abilities can protect an announcement from raises, cancel a raise, modify bids, or respond to one. A player can also bid simply to deny an opponent a disruptive card, even if they do not plan to use it.

### Market refresh and disposal

Whenever a card leaves the Capital City (through a purchase or sweep), cards are dealt from the Market Deck until the display is back to five. If the Market Deck runs out mid-deal, the City Dump is shuffled into it first. Cards in use and cards Out of Play never return to circulation. Ordinary used Market cards normally enter the City Dump; cards that say they go Out of Play do not cycle back.

This top-up refill replaced the earlier refill-only-when-empty rule: playtests found that rule let a player free-ride on the opponent's cycling, creating deadlock when both players avoided undesirable cards. The current system keeps the Market Deck flowing continuously. A stale-market safety valve exists: if no Capital City card has been gained for six consecutive turns and nothing is pending, the display is swept (Statues return to the Market Deck, other cards go to City Dump) and redealt.

## 9. Statues, victory, theft, and the endgame

Statues are visible Victory cards that remain in the controller's Victory Row. The total number of Statues should always be odd so that the goal is obvious. The current starter set has nine; control of five is a strict majority and wins.

### Boons and burdens

Every Statue grants its controller a lasting **boon** and imposes a lasting **burden**, both active for as long as it sits in their Victory Row. The burden is not a drawback to be played around once — it is a standing tax on the town that is winning, which keeps a Statue lead from compounding into a runaway and gives the trailing Mayor something to work with.

| Statue | Boon | Burden |
| --- | --- | --- |
| Kindness | Supply at turn start when your Unemployment is no worse than your rival's | Your opponent's rehires cost 1 less |
| Curiosity | On gain, draw 2 then discard 1 | End your turn holding more than 6 cards and you discard 1 |
| Courage | Your next raise costs 1 less Supply to pay | Your opponent's first bid each turn is worth 1 more |
| Patience | Masters enter with one fewer orientation delay | Your Apprentices enter Busy instead of upright |
| Generosity | On gain, give 1 Supply and draw 2 | Every Statue you gain, this one included, pays your opponent 2 Supply |
| Ingenuity | Once per turn, an Event needs one fewer Character | Your Events cost 1 more Supply |
| Community | With three species, your first completed shift each turn gains 1 | Choosing Supply in Resources gives 1 less |
| Harmony | Ready a Character after a tied bid | You pay your losing bids in full instead of forfeiting half |
| Joy | On gain, ready up to two Apprentices | Give your opponent 1 Supply at the start of each of your turns |

Statues are not automatically safe. Expensive theft or return effects can interfere with Victory Rows, but must include a significant cost, requirement, restriction, or drawback. A player may **not** steal the final opponent Statue in a way that immediately gives them the winning majority. This boundary prevents the game ending purely through taking an opponent's last needed Statue.

## 10. Current starter set: First Boroughs

The set holds **208 cards**: 68 Characters, 52 Events, 9 Statues, a 64-card Capital City pool and 15
Disruptions. A game uses two 30-card player decks and a 25-card Capital City deck (nine Statues and sixteen
other cards sampled from the chosen Market Deck's pool).

Six printed decks are provided: **Burrow & Bloom** (Rabbit/Mouse, Agriculture/Botany), **Paws & Papers**
(Raccoon/Fox, Commerce/Civics), **Bramble & Bristle** (Hedgehog/Badger, Crafts/Agriculture), **Ripple & Rune**
(Otter/Squirrel, Lore/Commerce), **Lantern & Ledger** (Fox/Otter, Lore/Commerce) and **Root & Rampart**
(Badger/Rabbit, Civics/Crafts).

The tables below are the two founding decks, kept as worked examples of the card shapes; every other card
lives in `spec/starter_card_set.json`, which is the contract. Most Characters now have a third version — a
further promotion or a sideways retraining into another study — so an upgrade line can branch.

### Burrow & Bloom

**Identity:** Rabbits and Mice; Agriculture and Botany. Its cards lean toward efficient shifts, recruiting, growth, recovery, and Event synergy.

| Character | Cost | Job / study | Shift | Notable effect |
| --- | ---: | --- | --- | --- |
| Clover, Seedling Helper | 0 | Rabbit; Agriculture | 1 → 1 Supply | On recruit, with another Agriculture Character: draw 1, discard 1. |
| Clover, Community Gardener | 3 | Rabbit; Botany | 2 → 3 | Upgrade Clover; helps another Agriculture Character ready next turn. |
| Mabel, Seed Keeper | 1 | Mouse; Agriculture | 1 → 1 | First Agriculture-requiring Event each turn gains 1 Supply. |
| Mabel, Horticulturist | 4 | Mouse; Botany | 2 → 4 | Upgrade Mabel; Busy to reduce the next Event requirement by one Character. |
| Poppy, Postmaster | 1 | Rabbit; Civics | 2 → 2 | Rewards a market announcement made with Poppy as the only ready Rabbit. |
| Poppy, Civic Planner | 5 | Rabbit; Civics | 3 → 5 | Upgrade Poppy; tied market bids can win as though announced. |
| Fern, Forager | 2 | Mouse; Botany | 1 → 2 | On ready, may put an Event from Town Dump on deck bottom. |
| Fern, Ecologist | 5 | Mouse; Botany | 2 → 5 | Upgrade Fern; first global Event each turn also gives 1 Supply. |

Its Events are **Community Garden** (Agriculture → gain 3 Supply), **Seed Swap** (Rabbit + Mouse → draw 2, discard 1), **Patient Harvest** (Botany, Limited 2: first shift each turn +1 Supply), **Neighborhood Watch** (Civics → rehire at a discount), **Blooming Confidence** (two Rabbits → ready one Character and draw), and **Welcome Wagon** (Mouse → recruit a cost-0 Character from hand Busy).

### Paws & Papers

**Identity:** Raccoons and Foxes; Commerce and Civics. Its cards lean toward market contests, card flow, and controlled disruption.

| Character | Cost | Job / study | Shift | Notable effect |
| --- | ---: | --- | --- | --- |
| Patch, Recycling Scout | 0 | Raccoon; Commerce | 1 → 1 Supply | On recruit, reorder the top two deck cards. |
| Patch, Town Auditor | 3 | Raccoon; Civics | 2 → 3 | Upgrade Patch; draw when an opponent challenges your purchase. |
| Juniper, Messenger | 1 | Fox; Civics | 1 → 2 | When working, can move 1 Supply into an open bid. |
| Juniper, Diplomat | 4 | Fox; Civics | 2 → 4 | Upgrade Juniper; blocks an opponent increasing a pending bid that turn. |
| Hazel, Market Vendor | 2 | Raccoon; Commerce | 1 → 2 | First market announcement each turn is easier to fund while upright. |
| Hazel, Merchant | 5 | Raccoon; Commerce | 2 → 6 | Upgrade Hazel; draw when gaining a non-Statue Market card. |
| Rowan, Records Clerk | 2 | Fox; Commerce | 2 → 3 | Gains Supply when an Event sends a Character to Unemployment. |
| Rowan, Ombudsperson | 5 | Fox; Civics | 3 → 6 | Upgrade Rowan; Busy to prevent a global Unemployment effect. |

Its Events are **Open Ledger** (Commerce → gain 2 Supply and inspect the Market Deck top card), **Paper Trail** (Raccoon + Fox → draw 2; opponent puts a hand card on deck top), **Civic Rally** (Civics, Limited 2: first market bid each turn is +1), **Rumor Control** (Fox → cancel a global discard or Supply-loss effect), **Fair Hearing** (two Civics → free rehire; opponent gains 2 Supply), and **Market Day** (Commerce, Limited 2: first purchase announcement each turn draws 1).

### Statues

| Statue | Cost | Current prototype effect |
| --- | ---: | --- |
| Kindness | 2 | If you have the fewest Characters in Unemployment, gain 1 Supply. |
| Curiosity | 2 | On gain, draw 2 then discard 1. |
| Courage | 3 | First challenge bid each game costs 1 less. |
| Patience | 3 | Masters enter with one fewer orientation delay. |
| Generosity | 4 | On gain, give opponent 1 Supply to draw 2. |
| Ingenuity | 4 | Once per turn, reduce an Event's Character requirement by one. |
| Community | 5 | With at least three species, first completed shift each turn gains +1 Supply. |
| Harmony | 5 | On a tied bid, ready one Character at the start of your next turn. |
| Joy | 5 | On gain, ready up to two Apprentices. |

### Other Capital City cards

| Card | Cost | Current prototype effect |
| --- | ---: | --- |
| Town Charter | 1 | First recruited Character before your next turn costs 1 less. |
| Festival Grant | 2 | Gain 4 Supply; goes to City Dump. |
| Emergency Reserve | 2 | Prevent up to 3 Supply loss; goes Out of Play. |
| Mayor's Seal | 3 | Next purchase announcement cannot be challenged. |
| Library Annex | 3 | Draw 3, discard 1. |
| Quiet Mediation | 4 | Cancel a pending challenge; announcer's bid stays open. |
| Poacher's Pardon | 5 | Send an opponent Character to Unemployment; discard two cards. |
| Town Bell | 1 | Ready an Apprentice. |
| Supply Depot | 2 | Gain 3 Supply. |
| Public Gardens | 2 | Next completed shift gains +2 Supply. |
| Courier Network | 3 | Reorder the top five cards of your deck. |
| Community Kitchen | 3 | Rehire a cost-1 Character upright. |
| Appeal Board | 4 | Rehire one Character for 2 less Supply. |
| Scrap Yard | 4 | Discard a card to send a cost-2-or-less opponent Character to Unemployment. |
| Town Archives | 5 | Return an Event from Town Dump to hand; goes Out of Play. |
| Town Clock | 5 | Advance all your Characters one orientation step next turn. |

## 11. Digital achievements

Digital achievements are a future companion-app or player-profile feature, **not match scoring**. They can celebrate collection and town-building goals—such as fielding five Raccoons (*Five Finger Mafia*, working name) or completing a culinary profession cluster—and encourage experimenting with deck combinations. Do not make a large, hidden achievement list part of winning a tabletop match. If achievements ever influence a match, the list must remain small, public, and simple.

## 12. Still open or deliberately draft

These details need decisions before this can become a finished rulebook:

- The exact physical rotation convention and player-facing explanation of orientation, including how a table shows that a Character is pledged to an open auction rather than merely Busy.
- Whether an auction should have a hard round cap for tournament play, or whether running out of upright animals is limit enough.
- The exact Transfer effect.
- Card schema details for shift outputs/delays and Limited Event duration as the broader card pool grows.
- Starting-deck composition, starting hand, and Market Deck composition outside the current prototype.
- The permanent Statue total for the retail game (it must remain odd).
- The full definition and presentation of **Big** and any other broad traits; whether cards show both broad and specific animal labels.
- A complete card-design guardrail for disruption of newly played Characters.
- Further prototypes for free Events, animal-combination Events, global shared-market Events, and high-cost theft.
- Any final rules for Statue theft, return, protection, and edge cases beyond the final-statue restriction.

## 13. Terminology

| Term | Meaning |
| --- | --- |
| **Mayor** | A player, controller of one town. |
| **Supply** | The core resource used for recruiting, rehiring, bids, and effects. |
| **Busy** | A Character rotated clockwise to show it cannot currently act. |
| **Ready / upright** | A Character at 0° orientation that may act. |
| **Apprentice / Journeyman / Master** | Cost-based Character ranks: 0–1 / 2–3 / 4–5 Supply. |
| **Work shift** | A Busy action that produces Supply after the Character's listed delay. |
| **Capital City** | The shared five-card contested market. |
| **Town Dump / City Dump** | A player's discard pile / the shared discard pile for used Market cards. |
| **Unemployment** | Public inactive zone for disrupted Characters. |
| **Statue** | A Victory card; a strict majority wins. |
| **Transfer** | Same-name, same-cost Character interaction; exact effect is still draft. |

## 14. Source and precedence notes

The project contains earlier documentation that used generic turn counters and described some rules more broadly. The current structured rules explicitly reject generic counters in favor of orientation-only delays, confirm ready return from Unemployment, set a two-player model, and codify the anti-lockout policy. When sources conflict, use the current structured specification and executable playtest behavior as the stronger source; treat older prose as historical design context.
