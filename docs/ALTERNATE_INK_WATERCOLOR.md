# Ink & Watercolor alternate art

Two 4 × 4 atlases add 32 Alternate Art printings in a deliberately spare visual language: broken
sepia linework, translucent watercolor pools and visible cold-press paper. The scenes are drawn from
the cards' own flavor and backstories rather than their ordinary atlas compositions.

- `assets/art/alternate-ink-ambitions-atlas.png`
- `assets/art/alternate-ink-kindness-atlas.png`

The source atlases are preserved unchanged. `src/ui/versions.js` registers each painting with a
`#tile=0..15` atlas fragment, which `src/ui/painted-art.js` crops inside the SVG card window. Tile
indices below are zero-based and row-major.

## Ambitions atlas

| Tile | Card |
| ---: | --- |
| 0 | `mk_brooke_balloonist_4` |
| 1 | `mk_clover_rocket_botanist_4` |
| 2 | `mk_comet_bolt_sorter_0` |
| 3 | `mk_comet_astronaut_5` |
| 4 | `mk_inkwell_storyteller_2` |
| 5 | `mk_inkwells_star_chart` |
| 6 | `mk_lindsay_moon_gardener_5` |
| 7 | `mk_daniel_star_charter_3` |
| 8 | `mk_betty_stump_blaster_2` |
| 9 | `mk_betty_powder_chemist_4` |
| 10 | `mk_berry_tinker_0` |
| 11 | `mk_mortys_boiler_test` |
| 12 | `mk_sota_lens_grinder_1` |
| 13 | `mk_moss_bridgewright_5` |
| 14 | `mk_hazels_night_market` |
| 15 | `mk_one_small_step` |

## Kindness atlas

| Tile | Card |
| ---: | --- |
| 0 | `mk_rosabeth_garden_hand_1` |
| 1 | `mk_rosabeth_apothecary_3` |
| 2 | `mk_clover_seedling_helper_0` |
| 3 | `mk_marmalade_neighborhood_baker_3` |
| 4 | `mk_peanuts_standing_round` |
| 5 | `mk_oatmeal_jazz_singer_3` |
| 6 | `mk_scotts_reading_hour` |
| 7 | `mk_biff_chief_constable_4` |
| 8 | `mk_moss_rehiring_day` |
| 9 | `mk_bella_science_hall_fellow_4` |
| 10 | `mk_peanut_comptroller_5` |
| 11 | `mk_andrew_keeper_of_the_late_desk_2` |
| 12 | `mk_annabelle_salvage_archivist_3` |
| 13 | `mk_pebble_ferry_master_3` |
| 14 | `mk_hibiscus_round_walker_3` |
| 15 | `mk_daisy_night_bloom_florist_3` |
