# First foil printings

Fifteen distinct cards were randomly drawn from the 827 unique cards in the combined Classic and
Maker collections. Each of the five finishes appears exactly three times. Every selection is an
ordinary **Foil** printing (`foil`), including hexagons and masked details; none is Creative Foil
or Alternate Art Foil. Regular and Full Card Art printings keep their existing appearance.

| Card | Card ID | Foil finish |
| --- | --- | --- |
| Beck — Bylaw Reader | `mk_beck_bylaw_reader_1` | Full card |
| Clover — Seedling Helper | `bb_clover_1` | Full card |
| Earl — Tea Trader | `mk_earl_tea_trader_2` | Full card |
| Benjamin — Lantern Maker | `mk_benjamin_lantern_maker_2` | Artwork only |
| Velvet — Counter Clerk | `mk_velvet_counter_clerk_1` | Artwork only |
| Toolbox Trade | `br_toolbox_trade` | Artwork only |
| Comet — Astronaut | `mk_comet_astronaut_5` | Artwork details |
| Flint — Auctioneer’s Boy | `ns_flint_0` | Artwork details |
| Earl — Tea House Keeper | `mk_earl_tea_house_keeper_4` | Artwork details |
| Hoot and Holler | `ns_hoot_and_holler` | Reverse |
| Willow — Ferry Trader | `mk_willow_ferry_trader_1` | Reverse |
| Faustus — Costumier | `mk_faustus_costumier_2` | Reverse |
| Dabble — River Pilot | `mkt_dabble` | Hexagon pattern |
| Willow — Tide Reckoner | `mk_willow_tide_reckoner_3` | Hexagon pattern |
| Rosabeth — Herb Gatherer | `mk_rosabeth_herb_gatherer_0` | Hexagon pattern |

The draw used a randomly generated 32-bit seed, **3461026837**, and a Fisher–Yates shuffle
with Mulberry32 over the unique IDs sorted alphabetically. The first 15 draws were assigned in
groups of three to full, artwork, details, reverse and hexagon. The draw is recorded in
[FOIL_SELECTION.json](FOIL_SELECTION.json); it is fixed at authoring time, never rerolled in-game.

## Detail masks

Each mask is traced to the ordinary printing's square artwork, not its full-art portrait:

- **Comet — Astronaut:** brass helmet rim, chest gauge and the comet in the sky.
- **Flint — Auctioneer’s Boy:** gilded gavel and the two candle flames.
- **Earl — Tea House Keeper:** porcelain teapot and the cup rims.

The transparent SVG masks live in `assets/art/foil-masks/`. The original paintings are unchanged.
If one of these ordinary paintings is replaced later, retrace its mask to the new details.

Open **The Book**, select **Foil**, and keep the shelf filter on **Everything** to see all 15.
Every card also retains its Regular printing. The [finish preview](../src/ui/foil-preview.html)
can compare effects, while the Book shows the actual assigned finish.

![All fifteen ordinary Foil printings in the Book](screenshots/first-foils.png)
