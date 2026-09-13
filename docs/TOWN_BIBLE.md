# The town bible

The shared, cumulative record of what is **true** in the First Boroughs. Every character remake reads
this before writing a backstory and appends what it establishes (see
[REMAKING_A_CHARACTER.md](REMAKING_A_CHARACTER.md) §7).

Two rules:

1. **A backstory may not contradict a fact recorded here.** If the maker's request does contradict
   one, the maker wins — then update this file and say so in the commit.
2. **Only facts other characters could trip over belong here.** A character's feelings, habits and
   private history stay in their own `backstory` in `spec/maker_card_set.json`. The bridge tolls that
   closed a stall belong here, because the next character may have paid them too.

Append one bullet per fact, with the character it came from in brackets — `[Acorn]`. Undated facts
are "always been true"; give a date or a season only when the timing matters to someone else.

---

## The setting

These are the premises of the game itself, and they are not up for revision by a backstory.

- The First Boroughs are a town of animals, run by a **Mayor** — the player. Two Mayors' towns sit
  either side of a shared **Capital City**.
- A town holds **ten animals** at a time: at work, pledged into an auction, or face down in
  **Unemployment**. That cap is why a better animal is worth more than another animal.
- Characters take **work shifts** to produce **Supply**, the town's money and its bidding power.
- The **Capital City** is the shared market: Buildings, hired animals, Ordinances and the nine
  **Statues** are won there in bidding wars. Holding five Statues wins the game; each grants a boon
  and imposes a burden.
- Work is organised by **study** — Agriculture, Civics, Commerce, Crafts, Lore, Science — which is
  what an animal *does*. **Species** is what an animal *is*, and each of the ten has its own charter
  in `spec/species.json`. Both are established; a remake works within them.
- The night is a real part of the town: an observatory, an all-night café, a night school, and Owls
  who work while the rest of the borough sleeps.

## Places

Established by the printed Buildings and Statues. A backstory may use any of these freely, and may
add to the list.

- **Buildings of the Capital City** — The Festival Green, the Apprentice School, The Observatory, the
  Grain Exchange, the Hiring Hall, the Salvage Yard, The Long Hall, The Old Wall, the Counting House,
  The Auction House, the Winter Stores, the Lending Library, the Town Workshop, The All-Night Café.
- **The nine Statues** — Kindness, Patience, Ingenuity, Curiosity, Generosity, Joy, Courage,
  Community, Harmony. They are the town's stated virtues; a backstory that touches one should mean it.
- **The City Dump** and **Unemployment** are where cards and animals go when work runs out. Both are
  ordinary parts of town life, not disgrace.

## History

*Nothing recorded yet beyond the setting above. The first remade characters will fill this in.*

## Relationships

*Nothing recorded yet. Record here only what both parties would agree happened.*

---

## The cast, as printed

The characters as the **printed set** has them — species, the studies and jobs their versions cover,
and how many versions exist. This is the starting state, not a constraint: each row is superseded
when that character is remade, except **species**, which is fixed unless the maker says otherwise.

Regenerate the underlying data with `npm run characters` (`docs/characters.csv`).

| Character | Species | Studies (printed) | Jobs (printed) | Versions |
| --- | --- | --- | --- | --- |
| Acorn | Squirrel | Commerce / Crafts / Agriculture | Stall Runner / Guild Broker / Trade Envoy / Coffee Cart / Nut Runner | 5 |
| Barley | Badger | Civics / Science / Lore | Town Recorder / Ledger Boy / Geologist / Warren Surveyor | 4 |
| Barnaby | Owl | Commerce | Night Auditor | 1 |
| Barrow | Badger | Crafts | Stonecutter | 1 |
| Bean | Owl | Commerce | Café Proprietor / Barista / Espresso Puller | 3 |
| Bram | Badger | Crafts | Journeyman Carter | 1 |
| Bramble | Hedgehog | Civics / Crafts / Science | Guild Warden / Guild Apprentice Master / Master Joiner / Clockmaker / Tinker | 5 |
| Bristle | Hedgehog | Civics | Gate Hedgehog | 1 |
| Brook | Otter | Crafts / Science / Lore / Commerce | Riverwright / Balloonist / Ferry Hand / Canal Pilot | 4 |
| Burr | Hedgehog | Crafts / Science / Agriculture | Whittler / Kite Tester / Cabinetmaker / Barn Sweeper | 4 |
| Clover | Rabbit | Agriculture / Science / Commerce | Master Botanist / Community Gardener / Rocket Botanist / Seedling Helper / Market Gardener | 5 |
| Comet | Cat | Science / Crafts | Astronaut / Test Pilot / Rocket Mechanic | 3 |
| Copper | Cat | Commerce / Civics | Scale Polisher / Weights Inspector / Market Steward / Arcade Merchant / Penny Counter | 5 |
| Dabble | Otter | Commerce | River Pilot | 1 |
| Dill | Mouse | Lore / Civics / Science / Agriculture | Herbalist Surgeon / Apothecary / Research Chemist / Herb Girl | 4 |
| Fern | Mouse | Agriculture / Lore / Science | Ecologist / Wildlife Warden / Forager / Field Recorder / Field Scientist | 5 |
| Flint | Fox | Commerce / Civics | Peddler / Trade Broker / Fair Warden / Auctioneer’s Boy | 4 |
| Hazel | Raccoon | Commerce / Crafts | Merchant / Guildmaster / Market Vendor / Night Market Vendor / Barrow Girl | 5 |
| Hoot | Owl | Civics | Night Porter | 1 |
| Inkwell | Cat | Lore / Commerce / Science | Night Librarian / Ledger Scribe / Bookmark Keeper / Astronomer / Keeper of Stories | 5 |
| Juniper | Fox | Civics / Science / Lore / Crafts | Diplomat / Messenger / Stargazer / Courier Captain / Border Warden | 5 |
| Kestrel | Fox | Civics | City Fox | 1 |
| Linnet | Rabbit | Crafts / Lore | Master Printer / Lending Librarian / Night Printer / Bookbinder | 4 |
| Mabel | Mouse | Civics / Agriculture / Science | Seed Bank Director / Seed Bank Clerk / Horticulturist / Seed Vault Scientist / Seed Keeper | 5 |
| Marlow | Raccoon | Civics / Lore | Registrar General / Lamplighter’s Clerk / Ward Clerk / Bylaw Reader | 4 |
| Marmalade | Cat | Agriculture / Commerce | Dough Kneader / Harvest Head Baker / Market Baker / Neighborhood Baker / Night Baker | 5 |
| Mittens | Cat | Lore | Rooftop Cat | 1 |
| Mortar | Badger | Crafts / Science / Agriculture | Watermill Mechanic / Master Millwright / Steam Engineer / Grain Miller | 4 |
| Moss | Badger | Crafts / Agriculture | Bridgewright / Guild Architect / Rocketwright / Toolsmith / Ploughwright | 5 |
| Nib | Mouse | Lore / Science | Master Cartographer / Star Charter / Canal Cartographer / Ink Mixer | 4 |
| Nim | Squirrel | Lore / Civics | Page Runner / Reference Librarian / Chancellor of Records / Night Archivist | 4 |
| Nutmeg | Squirrel | Commerce / Agriculture | Festival Florist / Bouquet Weaver / Night-Bloom Florist / Petal Sweeper | 4 |
| Oakley | Badger | Crafts / Civics / Science / Lore | Stonemason / Town Planner / Bridge Engineer / Boundary Surveyor | 4 |
| Patch | Raccoon | Civics / Commerce / Crafts / Science | Town Auditor / Guild Investigator / Salvage Foreman / Junkyard Inventor / Recycling Scout | 5 |
| Pebble | Otter | Civics / Commerce | Harbour Warden / Ferry Master / Night Ferry / Bridge Courier | 4 |
| Pip | Squirrel | Lore / Commerce / Science | Chief Archivist / Travelling Storyteller / Natural Philosopher / Archivist / Story Collector | 5 |
| Pippa | Cat | Science / Agriculture | Moon Gardener / Conservatory Keeper / Herb Cook / Glasshouse Curator / Potting Helper | 5 |
| Pockets | Raccoon | Commerce | Salvage Raccoon | 1 |
| Poppy | Rabbit | Commerce / Civics | Mail Coach Driver / Civic Planner / Ward Alderman / Night Mail / Postmaster | 5 |
| Quill | Mouse | Lore / Agriculture | Town Scrivener / Harvest Steward / Orchard Keeper / Orchard Scribe / Seed Vault Keeper / Night Gardener | 6 |
| Rowan | Fox | Civics / Commerce / Crafts | Ombudsperson / Records Clerk / Locksmith / Circuit Judge / Night Magistrate | 5 |
| Russet | Fox | Commerce / Civics | Coffee Roaster / Tea House Keeper / Tea Trader / Tea Boy | 4 |
| Sage | Owl | Science | Royal Astronomer / Astronomer / Telescope Polisher | 3 |
| Sorrel | Rabbit | Agriculture / Civics | Night Harvester / Sprout Tender / Harvest Caller / Row Boss | 4 |
| Tansy | Otter | Civics / Lore / Crafts | Town Historian / Lamplighter / Loremaster / Lantern Maker / Observatory Keeper | 5 |
| Tawny | Owl | Lore / Civics | Headmistress / Night School Teacher / Night Watch | 3 |
| Thimble | Rabbit | Agriculture / Crafts / Commerce / Science | Warren Runner / Quilt Maker / Master of Mending / Sailmaker / Spacesuit Seamstress / Thread Sorter | 6 |
| Thistle | Badger | Agriculture / Lore / Civics | Grange Elder / Almanac Keeper / Grange Warden / Field Surveyor / Field Hand | 5 |
| Tuppence | Squirrel | Commerce | Market Squirrel | 1 |
| Velvet | Cat | Civics / Lore / Science | Petition Runner / Notary / Registrar of Stars / Guild Speaker / Neighborhood Registrar | 5 |
| Vesper | Fox | Science / Lore / Commerce | Weather Watcher / Keeper of Tales / Moonlight Trader / Night Courier | 4 |
| Willow | Otter | Civics / Science / Commerce | Harbour Admiral / Tide Reckoner / Toll Keeper / Harbourmaster / Ferry Trader | 5 |
