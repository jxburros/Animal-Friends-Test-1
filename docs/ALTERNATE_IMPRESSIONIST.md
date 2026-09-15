# Relaxed Impressionist alternate art

Two 4 × 4 atlases add 32 Alternate Art printings in a new, relaxed Impressionist language: loose
visible brushwork, broken color, luminous air and soft edges. Each scene begins with the card's own
flavor or character story rather than reproducing its regular atlas composition.

- `assets/art/alternate-impressionist-slow-days-atlas.png`
- `assets/art/alternate-impressionist-light-across-town-atlas.png`

The source atlases are preserved as square, indexed PNGs. `src/ui/versions.js` registers each scene
with a `#tile=0..15` fragment, and `src/ui/painted-art.js` crops that row-major tile into the card's
art window.

## Slow Days

Small acts of welcome, nourishment, repair and preparation across the borough.

| Tile | Card |
| ---: | --- |
| 0 | `mk_peanut_ledger_0` |
| 1 | `mk_oatmeal_town_warden_4` |
| 2 | `mk_brooke_ferry_hand_2` |
| 3 | `mk_clover_plot_sharer_1` |
| 4 | `mk_rosabeth_herbalist_physician_5` |
| 5 | `mk_bella_forager_0` |
| 6 | `mk_lynnette_bookbinder_1` |
| 7 | `mk_maribel_seed_vault_scientist_3` |
| 8 | `mk_marmalade_night_baker_0` |
| 9 | `mk_morty_mill_kitchen_cook_1` |
| 10 | `mk_daisy_festival_florist_4` |
| 11 | `mk_quill_cider_maker_3` |
| 12 | `mk_earl_tea_house_keeper_4` |
| 13 | `mk_jessica_night_school_teacher_2` |
| 14 | `mk_mkt_long_table` |
| 15 | `mk_mkt_late_ferry` |

## Light Across Town

The light that makes the borough legible: morning inspection, café glow, market lamps, moonlight,
pressroom dawn and the exact four-o'clock light Faustus was waiting for.

| Tile | Card |
| ---: | --- |
| 0 | `mk_oatmeal_safety_inspector_2` |
| 1 | `mk_bean_espresso_1` |
| 2 | `mk_brooke_regatta_caller_3` |
| 3 | `mk_clovers_seed_drive` |
| 4 | `mk_copper_market_steward_5` |
| 5 | `mk_bella_field_recorder_2` |
| 6 | `mk_hazel_night_market_vendor_1` |
| 7 | `mk_juniper_stargazer_5` |
| 8 | `mk_lynnette_master_printer_5` |
| 9 | `mk_daniel_canal_cartographer_2` |
| 10 | `mk_hibiscus_night_mail_2` |
| 11 | `mk_benjamin_wick_trimmer_0` |
| 12 | `mk_sage_night_assistant_0` |
| 13 | `mk_sota_telescope_fitter_3` |
| 14 | `mk_faustus_sailmaker_3` |
| 15 | `mk_bld_festival_green` |
