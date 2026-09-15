# First foil printings

Fifteen distinct cards carry a foil printing. Each of the five finishes appears exactly three times.
Every selection is an
ordinary **Foil** printing (`foil`), including hexagons and masked details; none is Creative Foil
or Alternate Art Foil. Regular and Full Card Art printings keep their existing appearance.

| Card | Card ID | Foil finish |
| --- | --- | --- |
| Beck — Bylaw Reader | `mk_beck_bylaw_reader_1` | Full card |
| Clover — Seedling Helper | `mk_clover_seedling_helper_0` | Full card |
| Earl — Tea Trader | `mk_earl_tea_trader_2` | Full card |
| Benjamin — Lantern Maker | `mk_benjamin_lantern_maker_2` | Artwork only |
| Velvet — Counter Clerk | `mk_velvet_counter_clerk_1` | Artwork only |
| Moss's Rehiring Day | `mk_moss_rehiring_day` | Artwork only |
| Comet — Astronaut | `mk_comet_astronaut_5` | Artwork details |
| Finn — Auctioneer’s Boy | `mk_finn_auctioneers_boy_0` | Artwork details |
| Earl — Tea House Keeper | `mk_earl_tea_house_keeper_4` | Artwork details |
| The Night Round | `mk_night_round` | Reverse |
| Willow — Ferry Trader | `mk_willow_ferry_trader_1` | Reverse |
| Faustus — Costumier | `mk_faustus_costumier_2` | Reverse |
| Dylan — River Otter | `mk_dylan_river_otter_4` | Hexagon pattern |
| Willow — Tide Reckoner | `mk_willow_tide_reckoner_3` | Hexagon pattern |
| Rosabeth — Herb Gatherer | `mk_rosabeth_herb_gatherer_0` | Hexagon pattern |

The finishes were drawn with a randomly generated 32-bit seed, **3461026837**, and a Fisher–Yates
shuffle with Mulberry32 over the unique IDs sorted alphabetically; the first 15 draws were assigned in
groups of three to full, artwork, details, reverse and hexagon. Five of those fifteen named cards the
collection has since replaced, and in each case the foil stayed with the card that took its place, so
the finish counts and the masks are unchanged. The list is recorded in
[FOIL_SELECTION.json](FOIL_SELECTION.json); it is fixed at authoring time, never rerolled in-game.

## Detail masks

Each mask is traced to the ordinary printing's square artwork, not its full-art portrait:

- **Comet — Astronaut:** brass helmet rim, chest gauge and the comet in the sky.
- **Finn — Auctioneer’s Boy:** gilded gavel and the two candle flames.
- **Earl — Tea House Keeper:** porcelain teapot and the cup rims.

The transparent SVG masks live in `assets/art/foil-masks/`. The original paintings are unchanged.
If one of these ordinary paintings is replaced later, retrace its mask to the new details.

Open **The Book** and select the **Foil** printing to see all 15.
Every card also retains its Regular printing. The [finish preview](../src/ui/foil-preview.html)
can compare effects, while the Book shows the actual assigned finish.

![All fifteen ordinary Foil printings in the Book](screenshots/first-foils.png)
