# 1950s Cut-Paper alternate art

Two 4 × 4 atlases add 32 Alternate Art printings in a playful mid-century editorial language:
crisp geometric paper shapes, occasional torn edges, sparse ink texture and slightly misregistered
screenprint color. Every scene starts from the card's flavor text rather than copying its regular
composition. The restricted coral, turquoise, lemon, charcoal, pale-pink and ivory palette ties the
two sheets together.

- `assets/art/alternate-cut-paper-day-shift-atlas.png`
- `assets/art/alternate-cut-paper-night-shift-atlas.png`

The source atlases are preserved as square, indexed PNGs. `src/ui/versions.js` registers each scene
with a `#tile=0..15` fragment, and `src/ui/painted-art.js` crops that row-major tile into the card's
art window.

## Day Shift

The town at its busiest: ledgers, boilers, docks, market stalls, field notes, stories and harvest.

| Tile | Card |
| ---: | --- |
| 0 | `mk_peanut_accountant_2` |
| 1 | `mk_berry_engineer_3` |
| 2 | `mk_biff_cadet_constable_0` |
| 3 | `mk_brooke_dock_hand_1` |
| 4 | `mk_betty_whittler_1` |
| 5 | `mk_clover_market_gardener_2` |
| 6 | `mk_rosabeth_tincture_maker_2` |
| 7 | `mk_bella_field_scientist_1` |
| 8 | `mk_finn_peddler_1` |
| 9 | `mk_hazel_market_vendor_2` |
| 10 | `mk_inkwell_bookmark_keeper_1` |
| 11 | `mk_juniper_messenger_1` |
| 12 | `mk_lynnette_lending_librarian_3` |
| 13 | `mk_taco_cart_cook_1` |
| 14 | `mk_quill_orchard_keeper_2` |
| 15 | `mk_eric_best_farmer_5` |

## Night Shift

The after-hours town: coffee, rockets, constellations, presses, salvage, coaches and lantern light.

| Tile | Card |
| ---: | --- |
| 0 | `mk_bean_barista_3` |
| 1 | `mk_bean_proprietor_5` |
| 2 | `mk_comet_test_pilot_3` |
| 3 | `mk_copper_scale_polisher_1` |
| 4 | `mk_inkwell_astronomer_4` |
| 5 | `mk_juniper_courier_captain_2` |
| 6 | `mk_lynnette_night_printer_0` |
| 7 | `mk_andrew_night_copyist_0` |
| 8 | `mk_orien_survey_computer_4` |
| 9 | `mk_patch_junkyard_diver_0` |
| 10 | `mk_scott_story_collector_0` |
| 11 | `mk_lindsay_glasshouse_hand_2` |
| 12 | `mk_hibiscus_mail_coach_driver_4` |
| 13 | `mk_earl_coffee_roaster_3` |
| 14 | `mk_jessica_song_leader_0` |
| 15 | `mk_benjamin_lantern_maker_2` |
