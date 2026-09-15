# Maker card artwork atlases

Twenty-four 4 × 4 painted sheets add 384 card-specific scenes for the Maker shelf. The built-in image-generation tool produced the sheets using existing project atlases as style and layout references only. The second set of four covers every remaining non-token Maker card that had no explicit art. The third set gives every token commissioned art and replaces 45 older shared images with scenes specific to the card. The fourth set replaces 64 more generic or mismatched fallbacks with card-specific civic, garden, masked-worker, diner and stage scenes. The fifth set corrects every remaining known character-species mismatch, replaces generic place art on 28 characters, and gives 19 additional character roles distinct scenes. The sixth set gives all 20 newly added characters and six new fair cards commissioned scenes, then replaces 38 generic character images with occupation-specific story moments.

The generated sheets are bundled unchanged:

- `assets/art/maker-borough-atlas.png`
- `assets/art/maker-field-atlas.png`
- `assets/art/maker-woodland-atlas.png`
- `assets/art/maker-night-atlas.png`
- `assets/art/maker-civic-atlas.png`
- `assets/art/maker-harvest-atlas.png`
- `assets/art/maker-workshop-atlas.png`
- `assets/art/maker-places-atlas.png`
- `assets/art/maker-tokens-atlas.png`
- `assets/art/maker-bakery-library-atlas.png`
- `assets/art/maker-records-roots-atlas.png`
- `assets/art/maker-roles-atlas.png`
- `assets/art/maker-ledgers-lamplight-atlas.png`
- `assets/art/maker-gardens-post-atlas.png`
- `assets/art/maker-masked-hands-atlas.png`
- `assets/art/maker-stage-counter-atlas.png`
- `assets/art/maker-species-corrections-atlas.png`
- `assets/art/maker-working-lives-atlas.png`
- `assets/art/maker-night-stories-atlas.png`
- `assets/art/maker-lantern-field-atlas.png`
- `assets/art/maker-broadcast-stage-atlas.png`
- `assets/art/maker-fairs-kitchens-atlas.png`
- `assets/art/maker-craft-river-atlas.png`
- `assets/art/maker-books-school-atlas.png`

Tile indices are zero-based and row-major. The presentation-only assignments live in `src/ui/painted-art.js`; Maker rules and authoring data remain unchanged.

## Shared generation prompt

> Create one square production game-art atlas for Animal Friends TCG, divided into an exact seamless 4-column by 4-row grid of 16 equally sized square full-bleed paintings, read strictly row-major. No gutters, margins, borders, grid strokes, captions, text, letters, numbers, labels, signs, readable paperwork, logos, watermarks, card frames, or UI. Use richly detailed hand-painted watercolor and gouache with fine warm ink detail, tactile paper and brush texture, premium antique storybook trading-card illustration. Show cozy cottage-and-small-town life with lush floral and leafy accents, gentle modern flair, affectionate visual humor, and expressive but believable clothed woodland animals. Any technology is whimsical practical steampunk in brass, copper, dark wood, leather, glass, visible gears and pipes—never sleek modern plastic. Keep each named identifying animal, face, hands, and principal prop within the central 70% of its tile for portrait card cropping. Make species anatomy and occupations unmistakable. Fill every square edge to edge and maintain tile boundaries precisely. No humans.

The later waves used existing Maker atlases as visual references and the same shared prompt. The scene lists below are the complete per-tile prompt additions.

## Maker Civic

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_peanut_barista_1` | Red squirrel barista intercepts tired workers with three mugs at a copper café machine amid herbs and flowers. |
| 1 | `mk_oatmeal_jazz_singer_3` | Badger jazz singer, four badger siblings, fox pianist and brass microphone fill a tiny benefit-night stage. |
| 2 | `mk_biff_cadet_constable_0` | Young hedgehog cadet walks two paces behind a senior constable through a flower-lined market. |
| 3 | `mk_copper_cellar_keeper_4` | Tabby cellar keeper counts salt, lamp oil, candles, preserves and a modest coin shelf. |
| 4 | `mk_bella_science_hall_fellow_4` | Field mouse fellow speaks up in a cozy science-hall committee room beside wildlife recordings. |
| 5 | `mk_hazel_market_committee_chair_4` | Raccoon committee chair brings a shy night vendor to a daylight meeting, still in a rumpled night-market coat. |
| 6 | `mk_beck_ward_clerk_2` | Raccoon ward clerk patiently finds the exact old minute in a civic office. |
| 7 | `mk_beck_keeper_of_the_ward_book_5` | Older Beck rests both paws on an enormous ward book as a candlelit records room falls quiet. |
| 8 | `mk_beck_candlelight_reader_4` | Beck locates the needed water-stained volume in a precarious candlelit heap. |
| 9 | `mk_ned_ward_recorder_3` | Squirrel recorder produces the decisive hedgerow record from an immaculate archive. |
| 10 | `mk_cassadee_stage_hand_0` | Young hedgehog stage hand manages chairs, lamps and a blank running order behind the curtain. |
| 11 | `mk_cassadee_hall_manager_3` | Cassadee orchestrates a midnight hall cleanup from the wings without stepping onstage. |
| 12 | `mk_andrew_night_copyist_0` | Owl copyist makes an immaculate manuscript copy by oil lamp in a sleeping library. |
| 13 | `mk_andrew_keeper_of_the_late_desk_2` | Owl keeps the tiny after-hours library desk with a kettle and a mountain of useful work. |
| 14 | `mk_bean_proprietor_5` | Barn owl proprietor directs a bustling all-night café and serves dawn workers. |
| 15 | `mk_bld_long_room` | The Lending Library's warm upper room holds ribbons, tall shelves, ivy and lamps never all extinguished. |

## Maker Harvest

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_brooke_mooring_hand_0` | Young otter catches a ferry at a flower-edged quay with rope, bollard and fender. |
| 1 | `mk_clover_plot_sharer_1` | Cream rabbit shares seedlings and a key from a four-generation allotment. |
| 2 | `mk_rosabeth_garden_hand_1` | Singing brown mouse tends medicinal beds while a newcomer discovers useful work. |
| 3 | `mk_maribel_seed_sorter_0` | Mouse sorts one seed variety at a time with trays and tweezers at dusk. |
| 4 | `mk_maribel_horticulturist_4` | Maribel directs a seed-bank glasshouse with mature plants, seed drawers and brass botanical instruments. |
| 5 | `mk_marmalade_oven_keeper_4` | Ginger cat banks shared brick ovens overnight and serves kittens first at dawn. |
| 6 | `mk_morty_mill_kitchen_cook_1` | Badger cooks beside millstones and feeds animals arriving with grain. |
| 7 | `mk_morty_grain_miller_2` | Morty dresses a millstone as sacks arrive and flour leaves. |
| 8 | `mk_peter_hedge_cutter_0` | Young rabbit keeps pace with a billhook, leaving an unexpectedly neat hedge. |
| 9 | `mk_peter_hedgelayer_3` | Seasoned Peter cuts, bends and pegs a living country hedge. |
| 10 | `mk_liz_scale_hand_1` | Fox chocks Grain Exchange cart wheels and watches the weighbridge beam settle. |
| 11 | `mk_liz_weighbridge_keeper_4` | Liz commands the brass weighing platform, reading both gauge and carter. |
| 12 | `mk_taco_cart_cook_1` | Otter cooks one-pan food on a moving handcart as vegetables bounce. |
| 13 | `mk_taco_quayside_cook_3` | Taco serves lightermen before dawn from a mysteriously relocated riverside cart. |
| 14 | `mk_cookie_biscuit_maker_0` | Squirrel bakes tough twice-fired ship biscuits and tests one like a roof tile. |
| 15 | `mk_cookie_winter_stores_cook_3` | Cookie stacks durable food in winter stores while a mouse reaches for this year's batch. |

## Maker Workshop

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_betty_firework_maker_3` | Hedgehog assembles bright rockets at a careful powder bench with oversized ear defenders. |
| 1 | `mk_comet_bolt_sorter_0` | Young calico sorts many kinds of bolt into tins on a brass rocket-hangar floor. |
| 2 | `mk_lynnette_press_feeder_2` | Rabbit feeds blank sheets through a hand-and-steam printing press. |
| 3 | `mk_moss_toolsmith_2` | Badger forges and fits a clever workshop bench jig amid safe sparks and flowers. |
| 4 | `mk_moss_bridgewright_5` | Moss inspects his elegant light bridge while rejected plans remain under one arm. |
| 5 | `mk_moss_timber_hand_0` | Young Moss stacks planks in an ingenious pattern that surprises older workers. |
| 6 | `mk_daniel_chart_copier_1` | Mouse traces a survey accurately onto four copies with brass dividers. |
| 7 | `mk_osh_sharpener_s_boy_0` | Tiny mouse heroically carries a grinding wheel almost as large as he is. |
| 8 | `mk_osh_edge_grinder_2` | Osh expertly sharpens a queue of shears and billhooks at a treadle wheel. |
| 9 | `mk_adam_road_mender_1` | Badger resets market cobbles before dawn with barrow, rake and steaming pot. |
| 10 | `mk_adam_surveyor_of_ways_4` | Adam surveys an efficient county-gate route with level, map and wagon. |
| 11 | `mk_annabelle_paper_sorter_0` | Young raccoon rescues and sorts rain-wet papers beneath a gate-side awning. |
| 12 | `mk_annabelle_salvage_archivist_3` | Annabelle flattens, dries and shelves rescued records, keeping one hopeless scrap. |
| 13 | `mk_sota_lens_grinder_1` | Calico polishes a single glass blank slowly enough for a nearby vine to grow. |
| 14 | `mk_sota_telescope_fitter_3` | Sota reseats a great brass telescope in an ivy-covered observatory workshop. |
| 15 | `mk_bld_guild_hall` | A timber-and-stone guild hall hosts a cutaway steam-engine course while a badger critiques the foundations. |

## Maker Places

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_barrows_measure` | Badger stonecutter measures a building lot alone before returning one decisive auction estimate. |
| 1 | `mk_biffs_beat` | Hedgehog constable ends a quarrel and kindly walks the rattled animals home. |
| 2 | `mk_rosabeths_rounds` | Rosabeth tends herb beds, then guides a newly confident worker toward another job. |
| 3 | `mk_oatmeals_benefit_night` | Badger benefit singer, siblings and fox pianist hand the evening's coin jar to a family. |
| 4 | `mk_coppers_stocktake` | Cheerful tabby weighs an entire cellar and sends useless odds to the yard. |
| 5 | `mk_warren_muster` | A conversation becomes a nine-rabbit work party outside the Lending Library. |
| 6 | `mk_night_round` | Three owls open the café, check doors and audit a ledger before dawn. |
| 7 | `mk_bins_at_dawn` | Hazel pulls the exact needed brass part from a cart of city salvage. |
| 8 | `mk_guild_night` | Craftsfolk pass a broken mechanism around until Berry quietly offers the tiny fix. |
| 9 | `mk_hall_lecture` | Curious calico Comet raises a paw twice during a packed science lecture. |
| 10 | `mk_ledger_day` | Peanut serves coffee while explaining borough accounts with coins and an abacus. |
| 11 | `mk_tb_barrows_yard` | Ordered stone yard, sand tarpaulin, carts and roofs surround an appraising badger. |
| 12 | `mk_tb_the_warren` | Ancient cozy rabbit tunnels link a family garden and a press beneath a cottage lane. |
| 13 | `mk_tb_observatory_steps` | Black cat librarian and calico engineer meet on moonflower-covered observatory steps before dawn. |
| 14 | `mk_tb_counting_house` | Copper weighs goods while Peanut values them at a long two-lamp desk. |
| 15 | `mk_tb_quill_wall` | A sleepy hedgehog guards a charmingly unimpressive, twice-mended ivy wall. |

## Maker Borough

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_peanut_ledger_0` | Peanut, a bright red squirrel Ledger Apprentice, using both paws on an oversized blank ledger at a sunny ward-office desk; savings tin, ivy and nasturtiums. |
| 1 | `mk_peanut_accountant_2` | Peanut as Accountant with coin stacks, abacus and brass adding machine, delighted by a tiny arithmetic mistake; café cups and trailing leaves. |
| 2 | `mk_peanut_cafe_manager_4` | Peanut as Café Manager behind a cozy counter, coordinating a hiring conversation while balancing a tray and accounts; copper espresso machine and hanging herbs. |
| 3 | `mk_peanut_comptroller_5` | Peanut as Town Comptroller presenting balanced accounts in a timber council chamber; brass counting apparatus, blank folders, ferns and window boxes. |
| 4 | `mk_peanuts_standing_round` | Peanut buys warm drinks for off-duty workers around a café table while quietly judging a small auction lot; playful conspiratorial expressions. |
| 5 | `mk_oatmeal_ward_clerk_1` | Oatmeal, a broad kindly badger Ward Clerk, counting visiting families at a civic desk with pigeonholes, blank forms and a kettle. |
| 6 | `mk_oatmeal_safety_inspector_2` | Oatmeal as Safety Inspector testing a comically tiny brass pressure valve while shielding two curious apprentices; flowers beside the machinery. |
| 7 | `mk_oatmeal_town_warden_4` | Oatmeal as Town Warden standing solidly in rain before a ward-office doorway with lantern and emergency satchel as townsfolk shelter behind him. |
| 8 | `mk_oatmeal_alderman_5` | Oatmeal as Borough Alderman listening patiently at a crowded neighborhood council table while a mouse gestures at a miniature bridge model. |
| 9 | `mk_berry_tinker_0` | Berry, an elderly hedgehog Retired Tinker, back at a cluttered cottage bench repairing a ridiculous clockwork watering can; forgotten teacup. |
| 10 | `mk_berry_committee_2` | Berry as Committee Volunteer squeezed among too many chairs, raising one paw at a guild meeting and carrying a toolbox because something broke. |
| 11 | `mk_berry_engineer_3` | Berry as Consulting Engineer examining a brass-and-wood town mechanism with ruler and magnifier; gears, a tiny steam puff and flowering vines. |
| 12 | `mk_berry_workshop_elder_4` | Berry as Workshop Elder teaching rabbit and mouse apprentices to repair an old hand-cranked machine at a sunlit timber bench. |
| 13 | `mk_berry_guild_warden_5` | Berry as Guild Warden holding an enormous ring of workshop keys in an ivy-covered guildhall, amused craftsfolk behind him. |
| 14 | `mk_fair_hearing` | A hedgehog constable gives a long account while badger counsel consults blank parchment; a relieved animal leaves with a work apron. |
| 15 | `mk_dx_tax_assessors` | Three overdressed Capital City animals arrive with blank clipboards and measuring tools while a fox hides a penny jar behind a flowerpot. |

## Maker Field

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_brooke_dock_hand_1` | Brooke, an energetic brown otter Dock Hand, hauling coiled rope across a flower-edged timber quay at dawn; cargo boat and brass winch. |
| 1 | `mk_brooke_ferry_hand_2` | Brooke as Ferry Hand guiding a little passenger ferry with a long pole beneath a stone bridge; baskets and cheerful commuters aboard. |
| 2 | `mk_brooke_regatta_caller_3` | Brooke as Regatta Caller blowing an oversized brass horn from a starting barge while tiny rowing crews swap seats at a buoy. |
| 3 | `mk_brooke_riverwright_5` | Brooke as Riverwright fitting the last curved plank to a hand-built hull in a riverside shed; copper rivets, shavings and willow leaves. |
| 4 | `mk_betty_barn_sweeper_0` | Betty, a determined hedgehog Barn Sweeper, almost hidden behind an absurdly large broom in a sunny timber barn. |
| 5 | `mk_betty_whittler_1` | Betty as Whittler carving a tiny wooden bird whistle at a stump workbench beneath roses, curls of wood around her. |
| 6 | `mk_betty_stump_blaster_2` | Betty as Stump Blaster safely behind a stone wall holding a long fuse as a distant stump makes a modest puff; improvised ear defenders. |
| 7 | `mk_betty_powder_chemist_4` | Betty as Powder Chemist weighing colorful minerals on brass scales in a careful cottage laboratory with copper hood and leafy window. |
| 8 | `mk_betty_land_clearer_5` | Betty as Land Clearer proudly surveying newly reclaimed fertile ground while birds immediately claim the fresh soil. |
| 9 | `mk_clover_seedling_helper_0` | Young cream rabbit Clover struggles with an oversized watering can while an even smaller mouse holds the other handle among seed trays. |
| 10 | `mk_clover_market_gardener_2` | Clover as Market Gardener arranging baskets of vegetables and flowers at a sunny stall, soil still on apron and paws. |
| 11 | `mk_clover_community_gardener_3` | Clover as Community Gardener handing out keys and seedlings among tiny allotment plots as neighbors happily dig. |
| 12 | `mk_clover_master_botanist_5` | Clover as Master Botanist studying rare luminous woodland flowers in a lush glasshouse with magnifier and botanical instruments. |
| 13 | `mk_slack_water` | An otter and squirrel hand a half-finished river job from one to the other between tides, balancing rope, basket and tiny barge. |
| 14 | `mk_dx_open_hiring` | Trestle tables on a flowered village green with a brisk queue of hopeful animal workers receiving aprons and tools. |
| 15 | `mk_tb_allotment_strip` | A cherished narrow family garden after rain, four generations of rabbits tending vegetables while Clover records weather in a blank notebook. |

## Maker Woodland

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_copper_penny_counter_0` | Clever tabby Copper sorts coins on fairweight scales while one coin rolls toward a patient mouse; floral market awning. |
| 1 | `mk_copper_scale_polisher_1` | Copper polishes ornate brass scales until they mirror his surprised whiskered face; tiny humorous sparkle and potted ivy. |
| 2 | `mk_copper_weights_inspector_2` | Copper as Weights Inspector tests a merchant's comically lumpy sack with calibration weights and a stern magnifying eyeglass. |
| 3 | `mk_copper_arcade_merchant_3` | Copper as Arcade Merchant welcomes shoppers beneath covered arcades with elegant scales, produce and hanging flowers. |
| 4 | `mk_copper_market_steward_5` | Copper as Market Steward calmly directs stalls and deliveries while three vendors ask questions at once. |
| 5 | `mk_rosabeth_herb_gatherer_0` | Rosabeth, a gentle brown mouse Herb Gatherer, collects medicinal leaves and roots in a sunrise hedgerow. |
| 6 | `mk_rosabeth_tincture_maker_2` | Rosabeth as Tincture Maker drips amber liquid into tiny bottles at an apothecary bench with copper still and hanging herbs. |
| 7 | `mk_rosabeth_herbalist_physician_5` | Rosabeth as Herbalist Physician warmly examines a tired young animal at a garden clinic among herbs and ceramic jars. |
| 8 | `mk_bella_forager_0` | Bella, a field mouse Forager, sits in leaf litter comparing mushrooms and berries beside a basket and blank notebook. |
| 9 | `mk_bella_field_scientist_1` | Bella as Field Scientist observes one square of woodland through a brass magnifier, with tiny measuring stakes and recorder box. |
| 10 | `mk_bella_field_recorder_2` | Bella as Field Recorder winds a brass-and-wood sound recorder while sketching bird calls in a blank field journal. |
| 11 | `mk_bella_wildlife_warden_3` | Bella as Wildlife Warden gently frees a hedgehog from tangled garden twine at a woodland boundary. |
| 12 | `mk_bella_ecologist_5` | Bella as Ecologist surveys a thriving pond-and-woodland edge where insects, birds, roots and streams interconnect. |
| 13 | `mk_tb_coppers_cellar` | An orderly underground pantry of salt, lamp oil, candles and hidden coins; Copper passes supplies through a side hatch. |
| 14 | `mk_tb_rosabeths_gate` | At a welcoming herb-garden gate, Rosabeth gives a weary unemployed animal simple work tending beds. |
| 15 | `mk_tb_berrys_bench` | Berry repairs a procession of hilariously broken household objects at an outdoor bench while embarrassed owners wait. |

## Maker Night

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_finn_auctioneers_boy_0` | Young red fox Finn stands on a crate enthusiastically raising a bidding paddle beside an elegant auction stall. |
| 1 | `mk_finn_peddler_1` | Finn as Peddler opens a many-drawered traveling case of useful oddities on a cottage lane. |
| 2 | `mk_finn_fair_warden_3` | Finn as Fair Warden inspects market weights with unexpectedly honest concentration amid ribbons, produce and flowers. |
| 3 | `mk_finn_trade_broker_4` | Finn as Trade Broker negotiates between a city buyer and village maker over a mysterious brass object. |
| 4 | `mk_hazel_barrow_hand_0` | Hazel, a raccoon Barrow Hand, pushes an overloaded cart of keys, bottles, unmarked star charts and peculiar salvage at twilight. |
| 5 | `mk_hazel_night_market_vendor_1` | Hazel as Night Market Vendor sells strange useful objects beneath amber lanterns, plum sky and hanging vines. |
| 6 | `mk_hazel_market_vendor_2` | Hazel as daylight Market Vendor reveals exactly the unlikely tool a surprised customer needs from a deep drawer. |
| 7 | `mk_hazel_guildmaster_3` | Hazel as Guildmaster arrives at a morning meeting still wearing the night-stall coat and makes one decisive gesture. |
| 8 | `mk_hazel_merchant_5` | Hazel as Merchant appraises a beautiful battered mechanical curiosity with a magnifier and moonstone charm. |
| 9 | `mk_inkwell_astronomer_4` | Black cat Inkwell stands on observatory steps with brass telescope, star globe, flask and moonflowers, delighted by the night sky. |
| 10 | `mk_juniper_ward_councillor_3` | Red fox Juniper chairs a crowded committee around a miniature town model, courier satchel over one shoulder. |
| 11 | `mk_juniper_diplomat_4` | Juniper as Diplomat bridges a polite disagreement between city owl and village badger in a conservatory alcove. |
| 12 | `mk_juniper_stargazer_5` | Juniper as Stargazer consults a brass orrery and the real night sky on a hill above town, post satchel beside them. |
| 13 | `mk_tb_open_mic_room` | A crowded cottage stage with a badger jazz singer and four animal siblings while a fox plays piano. |
| 14 | `mk_tb_boat_shed` | A secretive flower-framed riverside shed full of ropes, oars, half-built hull and brass winch; Brooke holds the key. |
| 15 | `mk_tb_gate_hut` | A tiny ivy-covered hut at dusk; a sleepy hedgehog attendant ignores an overdressed traveler beyond the barrier. |

## Maker Tokens

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_tok_rabbit` | Friendly cream rabbit gardener holding one carrot beside clover and roses. |
| 1 | `mk_tok_mouse` | Bright field mouse carrying one berry beside tiny daisies and fern curls. |
| 2 | `mk_tok_hedgehog` | Cheerful hedgehog with a comically oversized button in a cottage sewing nook. |
| 3 | `mk_tok_badger` | Sturdy kind badger with a small timber mallet among bluebells. |
| 4 | `mk_tok_otter` | Lively brown otter holding coiled rope on a willow-edged quay. |
| 5 | `mk_tok_squirrel` | Red squirrel balancing one acorn and a tiny ledger under flowering branches. |
| 6 | `mk_tok_cat` | Curious calico cat inspecting one brass gear beside ivy. |
| 7 | `mk_tok_owl` | Wise barn owl holding a lantern and closed book among moonflowers. |
| 8 | `mk_tok_fox` | Red fox courier with satchel and folded blank map on a flowered lane. |
| 9 | `mk_tok_raccoon` | Clever raccoon holding an unlikely brass key at a twilight market. |
| 10 | `mk_tok_agriculture` | Glowing wheat sheaf, hand trowel, watering can, seedlings and rich allotment soil. |
| 11 | `mk_tok_civics` | Warm timber town hall, brass bell, shared keys and welcoming open door framed by ivy. |
| 12 | `mk_tok_commerce` | Fairweight scales balance produce and coins at a floral market stall. |
| 13 | `mk_tok_crafts` | Crossed tools, wood shavings, brass gear and half-repaired clockwork watering can. |
| 14 | `mk_tok_lore` | Open blank storybook, ribbon bookmarks, candle and star globe in a vine-covered library. |
| 15 | `mk_tok_science` | Brass microscope, flask, field magnifier and specimen leaves on a botanical desk. |

## Maker Bakery & Library

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_tok_food` | Steaming cottage soup pot, bread, herbs and a comically impatient mouse at a communal table. |
| 1 | `mk_tok_entertainment` | Flower-decked bandstand with brass microphone, fiddle, drum and animals dancing at dusk. |
| 2 | `mk_tok_building` | Welcoming timber-and-stone guild hall miniature with brass hinges, roses and builder's mallet. |
| 3 | `mk_marmalade_night_baker_0` | Ginger cat shapes a lopsided hedgehog loaf at one in the morning beside banked ovens. |
| 4 | `mk_marmalade_dough_kneader_1` | Mischievous young ginger cat fiercely kneads an enormous bowl of dough. |
| 5 | `mk_marmalade_market_baker_2` | Warm ginger cat listens to every customer while a pastry queue tangles around the stall. |
| 6 | `mk_marmalade_neighborhood_baker_3` | Ginger cat passes the first tray to eager kittens before anyone can pay. |
| 7 | `mk_marmalade_harvest_head_baker_5` | Flour-dusted ginger cat commands three ovens and six recipes during harvest week. |
| 8 | `mk_fresh_batch` | Hot rolls arrive at dawn as a delighted squirrel reaches the counter. |
| 9 | `mk_mkt_community_oven` | Shared brick ovens open to neighbors carrying dough bowls, firewood and baskets. |
| 10 | `mk_inkwell_bookmark_keeper_1` | Black cat librarian tends four open books with four ribbons at a candlelit desk. |
| 11 | `mk_inkwell_storyteller_2` | Black cat tells an impossible tale to nine spellbound youngsters on the library floor. |
| 12 | `mk_inkwell_night_librarian_3` | Black cat reads behind a late desk while sleepy patrons remain in deep chairs. |
| 13 | `mk_inkwell_keeper_of_stories_5` | Dignified black cat guards fantastical maps and story volumes beside a brass globe. |
| 14 | `mk_inkwells_late_shift` | Black cat returns to a quiet chapter after the last sleeping youngster is carried home. |
| 15 | `mk_lynnette_night_printer_0` | Determined rabbit runs a hand-and-steam press at night beside stacks of fresh pages. |

## Maker Records & Roots

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_lynnette_bookbinder_1` | Rabbit repairs a worn book spine with thread, glue and a small brass press. |
| 1 | `mk_lynnette_lending_librarian_3` | Rabbit performs every voice while reading to a crowded floor of young animals. |
| 2 | `mk_lynnette_master_printer_5` | Confident rabbit oversees a great brass-and-wood press through the night. |
| 3 | `mk_maribel_seed_keeper_1` | Tiny brown mouse protects a young oak while older committee animals argue beyond it. |
| 4 | `mk_maribel_seed_bank_clerk_2` | Meticulous mouse refiles rescued seed packets into wooden drawers after a storm. |
| 5 | `mk_maribel_seed_vault_scientist_3` | Mouse scientist inspects seed jars and cool stone vault drawers with a magnifier. |
| 6 | `mk_maribel_seed_bank_director_5` | Mouse presents stored seeds and an old blank petition with proof growing nearby. |
| 7 | `mk_daniel_ink_mixer_0` | Mouse grinds oak gall into deep ink for a careful blank canal map. |
| 8 | `mk_daniel_canal_cartographer_2` | Mouse charts a canal from a lighterman's directions using dividers and a long map. |
| 9 | `mk_daniel_star_charter_3` | Mouse maps constellations from a closed observatory window with brass instruments. |
| 10 | `mk_daniel_master_cartographer_4` | Master mouse equips a nervous rabbit apprentice with a route map and satchel. |
| 11 | `mk_ned_page_runner_1` | Brisk squirrel carries a dated bundle of records through a hedge-lined civic corridor. |
| 12 | `mk_ned_night_archivist_2` | Exacting squirrel corrects one misplaced record in an empty midnight archive. |
| 13 | `mk_ned_reference_librarian_4` | Squirrel presents the exact open book and page to a surprised visitor. |
| 14 | `mk_ned_chancellor_of_records_5` | Formal squirrel reveals an orderly sequence of records to a stunned committee. |
| 15 | `mk_daisy_petal_sweeper_0` | Thrifty squirrel sweeps fallen petals and hangs them over a flower-shop door. |

## Maker Roles

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_daisy_bouquet_weaver_2` | Squirrel florist braids a meaningful posy while reading a shy customer's expression. |
| 1 | `mk_daisy_night_bloom_florist_3` | Squirrel cuts luminous wedding flowers at two in the morning. |
| 2 | `mk_daisy_festival_florist_4` | Determined squirrel hangs the final enormous garland across the town square. |
| 3 | `mk_bean_espresso_1` | Anxious barn owl works a copper espresso machine while a travel postcard rests nearby. |
| 4 | `mk_bean_barista_3` | Barn owl serves three orders at once with controlled panic. |
| 5 | `mk_beans_coffee_break` | Gentle barn owl firmly sets tea and pastry before an exhausted worker. |
| 6 | `mk_biff_beat_constable_2` | Hedgehog constable walks a lane as every bystander finds respectable work. |
| 7 | `mk_biff_chief_constable_4` | Senior hedgehog settles a quarrel, escorts both animals home and offers an apron. |
| 8 | `mk_bob_gate_attendant_4` | Sleepy hedgehog naps against a lowered gate while a patient cart waits. |
| 9 | `mk_clover_rocket_botanist_4` | Cream rabbit studies vigorous potatoes in a brass-and-glass rocket greenhouse. |
| 10 | `mk_clovers_potato_experiment` | Rabbit compares two potato beds while a newcomer holds an overflowing sack. |
| 11 | `mk_comet_astronaut_5` | Brave calico cat in brass-and-canvas space suit floats above a tiny town. |
| 12 | `mk_one_small_step` | Calico astronaut makes one proud bootprint while craft tools tumble behind her. |
| 13 | `mk_juniper_messenger_1` | Swift red fox courier runs a rain-swept flowered lane with sealed satchel. |
| 14 | `mk_juniper_courier_captain_2` | Red fox directs eleven couriers around a route board with a brass star clock. |
| 15 | `mk_brooke_balloonist_4` | Brown otter pilots a patchwork hot-air balloon above the winding river. |

## Maker Ledgers & Lamplight

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_orien_tally_clerk_0` | Badger tally clerk makes a meticulous four-color price table among coins and geraniums. |
| 1 | `mk_orien_rate_checker_2` | Orien studies five auction lots with calculator, magnifier, rule and precise coin margin. |
| 2 | `mk_orien_borough_actuary_3` | Orien predicts a building auction with an abacus and miniature town model. |
| 3 | `mk_orien_survey_computer_4` | Orien tends a clicking homemade calculator rebuilt from observatory parts. |
| 4 | `mk_orien_town_planner_5` | Orien places one decisive number before eleven silent committee animals. |
| 5 | `mk_roger_locksmith_1` | Fox locksmith cuts a key while juggling a lease, rota and arguing carters. |
| 6 | `mk_roger_records_clerk_2` | Roger catches wrong figures as a cozy records room turns toward him. |
| 7 | `mk_roger_circuit_judge_3` | Roger weighs two balanced arguments beneath a leafy courthouse window. |
| 8 | `mk_roger_fair_broker_4` | Roger watches another animal toss his worn halfpenny above two bidders. |
| 9 | `mk_roger_ombudsman_5` | Roger settles a boundary dispute with the halfpenny beside a miniature bandstand. |
| 10 | `mk_quinn_meeting_scribe_1` | Mouse scribe writes faster than a crowded ward meeting can speak. |
| 11 | `mk_quinn_town_scrivener_3` | Quinn dashes between fair, regatta and Hiring Hall with a wheeled writing desk. |
| 12 | `mk_quinn_keeper_of_the_record_5` | Quinn finds a forgotten worker in the archive and hands over the decisive slip. |
| 13 | `mk_beck_bylaw_reader_1` | Reserved raccoon sits behind civic volumes with ivy marking the right page. |
| 14 | `mk_beck_lamplighters_clerk_3` | Beck finishes the lamp ledger and walks home with a water-stained novel. |
| 15 | `mk_berry_clockmaker_1` | Elderly hedgehog arranges tiny gears inside an elaborate flower-shaped clock. |

## Maker Gardens & Post

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_lindsay_potting_helper_0` | Dreamy calico waters a perfect seedling row while gazing beyond the glasshouse. |
| 1 | `mk_lindsay_glasshouse_hand_2` | Lindsay tends overflowing benches while sketching a lunar glasshouse. |
| 2 | `mk_lindsay_herb_grower_3` | Lindsay cuts exceptional rosemary for a waiting ginger baker. |
| 3 | `mk_lindsay_conservatory_keeper_4` | Lindsay stands amid impossibly productive beds while a badger's abacus gives up. |
| 4 | `mk_lindsay_moon_gardener_5` | Lindsay cultivates moonflowers inside a brass lunar glasshouse. |
| 5 | `mk_hibiscus_post_runner_1` | Cream rabbit receives a mailbag at a flower-covered dawn sorting bench. |
| 6 | `mk_hibiscus_night_mail_2` | Hibiscus delivers night mail while waving to every lit cottage window. |
| 7 | `mk_hibiscus_round_walker_3` | Hibiscus is cheerfully trapped in a long doorstep conversation. |
| 8 | `mk_hibiscus_mail_coach_driver_4` | Hibiscus drives a punctual brass-trimmed coach as late passengers chase it. |
| 9 | `mk_hibiscus_postmaster_5` | Hibiscus walks a lane full of neighbors, parcels and ferry opinions. |
| 10 | `mk_quill_orchard_hand_0` | Hedgehog orchard hand receives windfalls from rabbits hidden in long grass. |
| 11 | `mk_quill_orchard_keeper_2` | Quill gives baskets and paid work to a surprised Saturday work party. |
| 12 | `mk_quill_cider_maker_3` | Quill hosts a warm barn social with apple press, cider vessel and bonfire. |
| 13 | `mk_quill_orchard_scribe_4` | Quill records three generations of harvests beneath an ancient apple tree. |
| 14 | `mk_quill_harvest_steward_5` | Quill hands baskets and ladders to new workers beside a steaming kettle. |
| 15 | `mk_willow_ferry_trader_1` | Confident otter takes possession of a charmingly unreliable little ferry. |

## Maker Masked Hands

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_masked_otter_counter_hand_1` | Scarfed otter balances three anonymous harbor ledgers that agree exactly. |
| 1 | `mk_mysterious_raccoon_beds_hand_2` | Hooded raccoon quietly tends medicinal beds at Rosabeth's gate. |
| 2 | `mk_hooded_rabbit_hatch_hand_0` | Hooded rabbit works the hatch of an ownerless communal oven. |
| 3 | `mk_unsigned_mouse_shelves_hand_1` | Mouse completes a shelf of manuscript copies overnight, face behind books. |
| 4 | `mk_shrouded_badger_bench_hand_2` | Badger repairs neighbors' broken objects after dark at Berry's bench. |
| 5 | `mk_muffled_hedgehog_stall_hand_0` | Scarfed hedgehog tends an eccentric twilight salvage stall. |
| 6 | `mk_shadowed_squirrel_hall_hand_1` | Squirrel stacks chairs, douses lamps and sweeps an empty hall. |
| 7 | `mk_nameless_cat_glass_hand_2` | Calico secretly reseats an observatory lens, face hidden by starlight. |
| 8 | `mk_silhouetted_owl_scales_hand_0` | Owl balances flawless night accounts with one halfpenny on the scales. |
| 9 | `mk_cowled_fox_far_field_hand_1` | Cowled fox works alone in a distant wheat-and-poppy field. |
| 10 | `mk_unlisted_grower_2` | Hidden otter protects seed packets while a ledger line remains blank. |
| 11 | `mk_faceless_clerk_0` | Squirrel reconciles civic records behind a wall of blank folders. |
| 12 | `mk_cloaked_tradesman_1` | Cloaked mouse exchanges a mysterious brass box outside the Counting House. |
| 13 | `mk_veiled_wright_0` | Veiled owl leaves an ingenious repair between two baffled craftsfolk. |
| 14 | `mk_anonymous_scribe_2` | Badger prepares certified chronicles with face hidden by parchment. |
| 15 | `mk_obscured_observer_1` | Hooded fox studies midges and medicinal leaves beside a pond. |

## Maker Stage & Counter

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_gwen_short_order_cook_1` | Mouse cook works a copper griddle as a worker takes the waiting apron. |
| 1 | `mk_gwen_diner_keeper_3` | Gwen runs her warm counter opposite an empty city café. |
| 2 | `mk_gwen_owner_of_the_diner_5` | Gwen vanishes through the hatch while officials hold unused forms. |
| 3 | `mk_liza_floor_singer_0` | Rabbit singer holds a small tavern still with nothing in her paws. |
| 4 | `mk_liza_counter_singer_1` | Liza serves plates through a busy hatch while singing through the rush. |
| 5 | `mk_liza_top_of_the_bill_3` | Liza performs late on the bill as a hedgehog manager watches proudly. |
| 6 | `mk_liza_headliner_5` | Liza fills an intimate music room while declining the vast festival stage. |
| 7 | `mk_harrison_piano_boy_0` | Young fox finds the melody at an upright piano beneath trailing ivy. |
| 8 | `mk_harrison_house_pianist_2` | Harrison anticipates a rabbit singer's next note by half a step. |
| 9 | `mk_harrison_band_leader_4` | Harrison guides an ensemble and a market negotiation from his piano. |
| 10 | `mk_gabe_corner_show_0` | Raccoon performs tiny animal puppets for spellbound kittens. |
| 11 | `mk_gabe_puppet_maker_2` | Gabe turns salvage scraps into three hilarious puppets. |
| 12 | `mk_gabe_company_of_one_4` | Gabe plays every role in a late-night miniature theater. |
| 13 | `mk_gabe_whole_cast_5` | Gabe reveals an exuberant many-character puppet finale. |
| 14 | `mk_faustus_wardrobe_master_4` | Calico wardrobe master fits elaborate practical open-mic costumes. |
| 15 | `mk_roger_fair_day_judge_0` | Roger lets another animal toss his halfpenny to settle the best fair pitch. |

## Maker Species Corrections

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_unknown_cook_0` | Mysterious raccoon serves hot food from a stationary riverside cart. |
| 1 | `mk_curtained_performer_2` | Calico performer waits behind a red stage curtain beside the penciled running sheet. |
| 2 | `mk_cookie_rusk_baker_1` | Red squirrel baker stores twice-baked bread and tests a roof-tile-hard biscuit. |
| 3 | `mk_liz_plate_clerk_0` | Red fox clerk records loaded carts crossing the brass weighbridge. |
| 4 | `mk_sota_the_same_bench_4` | Calico lens grinder and owl astronomer share one observatory bench. |
| 5 | `mk_thistle_at_the_back_0` | Badger listens at the back of the music room with coat still on. |
| 6 | `mk_osh_fair_fiddler_3` | Tiny mouse opens a fiddle case beside the traveling sharpening cart. |
| 7 | `mk_sage_frost_watch_2` | Barn owl checks weather instruments and warns glasshouse farmers before frost. |
| 8 | `mk_andrew_hand_copyist_3` | Barn owl copies and binds pages after midnight in the library. |
| 9 | `mk_willow_the_harbour_office_0` | Brown otter runs a harbor office and sells a ferry contract. |
| 10 | `mk_pockets_a_quiet_arrangement_5` | Raccoon makes a dubious quiet arrangement over a closed satchel. |
| 11 | `mk_ned_the_ward_roll_0` | Red squirrel cross-references immaculate ward rolls. |
| 12 | `mk_scott_the_index_1` | Red squirrel finds a dispute, an uncle and a joke in three archive volumes. |
| 13 | `mk_taco_the_four_oclock_cart_2` | Brown otter serves hot food to lightermen at four in the morning. |
| 14 | `mk_annabelle_last_one_up_2` | Raccoon rescues and dries rain-wet records before dawn. |
| 15 | `mk_peter_the_winters_length_2` | Cream rabbit lays a living hedge through winter. |

## Maker Working Lives

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_patch_salvage_sorter_2` | Raccoon repairs a discarded mangle and sells it back to its former owner. |
| 1 | `mk_scott_natural_historian_4` | Squirrel natural historian chases an unwritten discovery through ferns. |
| 2 | `mk_eric_row_farmer_3` | Rabbit row farmer announces generous wages to relieved field workers. |
| 3 | `mk_eric_row_boss_4` | Eric recalls the entire planting schedule from memory. |
| 4 | `mk_eric_best_farmer_5` | Eric holds a giant rosette while lawyers cling to the other end. |
| 5 | `mk_kevin_counter_hand_2` | Fox counter hand does two animals' work during Gwen's rush. |
| 6 | `mk_finn_griddle_hand_2` | Fox griddle hand flips breakfast while watching the weighbridge. |
| 7 | `mk_comet_hatch_hand_2` | Calico hatch hand studies rocket plans between orders. |
| 8 | `mk_peter_washing_up_1` | Rabbit washes a winter's enormous stack of dishes. |
| 9 | `mk_adam_road_gang_2` | Badger road planner directs the shorter route to the county gate. |
| 10 | `mk_osh_round_sharpener_1` | Mouse pushes a wheeled grindstone along the eleven-day round. |
| 11 | `mk_bob_the_morning_they_share_1` | Sleepy hedgehog shares a rare tea with energetic twin Betty. |
| 12 | `mk_pockets_four_times_a_year_0` | Raccoon visits the salvage yard, eats and leaves with a mystery object. |
| 13 | `mk_hibiscus_the_sorting_bench_0` | Rabbit and fox couriers exchange the dawn mailbag. |
| 14 | `mk_oatmeal_sunday_table_0` | Badger cooks Sunday dinner for nine family members. |
| 15 | `mk_bob_gate_tolls_2` | Hedgehog closes the county gate while an important traveler protests. |

## Maker Night Stories

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_beck_the_relief_roll_0` | Raccoon clerk keeps the relief roll in his own paw. |
| 1 | `mk_patch_compost_yard_1` | Raccoon tends the one unpriced compost corner of his salvage yard. |
| 2 | `mk_gwen_anybodys_counter_2` | Mouse gives an apron and immediate work to anyone who asks. |
| 3 | `mk_gwen_apron_on_the_hook_4` | Gwen pays a returning worker at the end of the diner shift. |
| 4 | `mk_liz_the_docket_3` | Fox records a weighbridge reading while studying the carter's face. |
| 5 | `mk_liz_chief_assessor_5` | Liz gives the quarry's final measure beside precision weights. |
| 6 | `mk_sage_the_watch_list_4` | Barn owl maintains a celestial watch list beside a star clock. |
| 7 | `mk_andrew_the_late_desk_4` | Barn owl hand-copies pages into a hidden drawer at two in the morning. |
| 8 | `mk_bean_the_early_shift_4` | Barn owl opens the café before dawn as night workers arrive. |
| 9 | `mk_jessica_the_night_school_3` | Barn owl teaches working adults about the coming auction. |
| 10 | `mk_tuppence_sold_before_the_cart_4` | Squirrel buys strange brass fittings before their use is understood. |
| 11 | `mk_cassadee_the_only_one_at_the_back_1` | Hedgehog runs every backstage job alone at midnight. |
| 12 | `mk_morty_the_boiler_test_0` | Badger conducts a faultless boiler test before a disappointed crowd. |
| 13 | `mk_brett_counsel_5` | Badger counsel works through exactly three days of briefs. |
| 14 | `mk_barnaby_night_auditor_4` | Barn owl avoids ledger questions by discussing serial stories. |
| 15 | `mk_barrow_stonecutter_5` | Badger prices a building lot from the pavement with perfect accuracy. |

## Maker Lantern & Field

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_benjamin_wick_trimmer_0` | Brown otter trims every river-path lantern himself. |
| 1 | `mk_benjamin_lantern_maker_2` | Benjamin studies the blue base of a flame at his workshop bench. |
| 2 | `mk_benjamin_town_historian_3` | Benjamin holds a lamp to an old beam and recalls its rebuilding. |
| 3 | `mk_benjamin_master_lantern_maker_4` | Benjamin fills polished brass lamps while Mandee waits. |
| 4 | `mk_benjamin_keeper_of_the_light_5` | Benjamin studies fire records beside rebuilt river cottages. |
| 5 | `mk_thistle_almanac_keeper_1` | Badger checks the same frost forecast for the eleventh year. |
| 6 | `mk_thistle_field_hand_2` | Thistle works a crop row from lantern-light to moonrise. |
| 7 | `mk_thistle_grange_warden_3` | Thistle teaches new harvesters while one fox causes chaos. |
| 8 | `mk_thistle_field_surveyor_4` | Thistle measures acreage with long strides and a survey chain. |
| 9 | `mk_thistle_grange_elder_5` | Thistle sets the exact pace for a whole harvest crew. |
| 10 | `mk_earl_tea_boy_0` | Fox carries an overloaded tea tray and gives unsolicited advice. |
| 11 | `mk_earl_tea_trader_2` | Earl offers a spare cup with a hidden price in advice. |
| 12 | `mk_earl_coffee_roaster_3` | Earl roasts coffee at four in the morning with too many plans. |
| 13 | `mk_earl_tea_house_keeper_4` | Earl hosts a two-hour afternoon conversation beneath hanging herbs. |
| 14 | `mk_mandee_night_courier_1` | Fox courier waits at the sorting bench with Benjamin's lantern. |
| 15 | `mk_mittens_rooftop_cat_4` | Tuxedo cat points out one faulty hinge from a moonlit roof. |

## Maker Broadcast & Stage

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_tabitha_festival_photographer_0` | Hedgehog proudly works a borrowed bellows camera on the festival green. |
| 1 | `mk_tabitha_lens_apprentice_1` | Hedgehog peers through the wrong end of a brass lens while a squirrel mentor points to the eyepiece. |
| 2 | `mk_tabitha_videographer_2` | Hedgehog swings a hand-cranked motion camera toward a surprised unwilling subject. |
| 3 | `mk_tabitha_optics_scientist_4` | Hedgehog repairs a jammed camera among prisms, lenses and tiny gears. |
| 4 | `mk_tabitha_camerawoman_5` | Accomplished hedgehog composes the decisive festival photograph beneath a floral camera hood. |
| 5 | `mk_winter_segment_runner_0` | Owl hurries backstage with scrolls and rearranges a brass running-order board. |
| 6 | `mk_winter_turned_down_applicant_1` | Determined owl studies science beside two rejection letters by moonlight. |
| 7 | `mk_winter_science_show_host_2` | Owl presents a lively tabletop experiment to a market audience. |
| 8 | `mk_winter_head_science_producer_4` | Owl producer manages launch-window charts, manifests and brass clocks at a new desk. |
| 9 | `mk_winter_tv_scientist_5` | Beloved owl scientist opens a tiny Capital City broadcast stall. |
| 10 | `mk_fred_wandered_onto_stage_0` | Owl who was looking for the toilets freezes in a spotlight among confused actors. |
| 11 | `mk_fred_held_the_ladder_wrong_2` | Owl holds a backstage ladder the wrong way while a worried rabbit balances above. |
| 12 | `mk_fred_backstage_crew_3` | Unbothered owl carries scenery for a show whose name he never asked. |
| 13 | `mk_fred_crew_doesnt_ask_5` | Veteran owl stagehand tosses a coin beside a smoking brass prop machine. |
| 14 | `mk_yellow_open_mic_regular_1` | Red squirrel arrives with a wheeled valise to perform fresh rhymes at a brass microphone. |
| 15 | `mk_yellow_freshest_thing_4` | Fluffy-tailed squirrel local celebrity lounges confidently at the open mic. |

## Maker Fairs & Kitchens

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_abigail_counter_girl_1` | Otter counter girl balances a whole café order of teacups and plates. |
| 1 | `mk_abigail_five_minutes_2` | Otter waitress performs an unexpected five-minute song during a slow night. |
| 2 | `mk_abigail_best_waitress_4` | Celebrated otter waitress serves briskly beside her portrait-marked tip jar. |
| 3 | `mk_abigail_standing_slot_5` | Tired but brave otter takes the standing performance slot after a full shift. |
| 4 | `mk_dx_small_fair` | Three tiny stalls and a rope show-ring surround a modest toll gate. |
| 5 | `mk_dx_county_fair` | A sprawling fair has every stall occupied and every vendor asking for payment. |
| 6 | `mk_dx_assessors_round` | Assessors move stall to stall with clipboards and copper collection boxes. |
| 7 | `mk_dx_the_reckoning` | A formidable badger opens a copper ledger as wealthy stallholders reach for purses. |
| 8 | `mk_dx_midsummer_fair` | The longest-day sunlight falls on an extremely long queue at a flowered fair gate. |
| 9 | `mk_dx_lord_mayors_fair` | A spectacular civic fair draws every townsfolk to place a coin in the gate box. |
| 10 | `mk_comet_rocket_mechanic_1` | Calico cat tightens a bolt beneath an acorn-shaped brass steam rocket. |
| 11 | `mk_comet_test_pilot_3` | Goggled calico cat sits confidently in a patched leather-and-copper rocket cockpit. |
| 12 | `mk_morty_watermill_mechanic_3` | Badger repairs wooden paddles and brass bearings beside a mossy millrace. |
| 13 | `mk_morty_steam_engineer_4` | Badger tends a compact copper boiler whose gauges wobble humorously. |
| 14 | `mk_morty_master_millwright_5` | Master badger inspects an immense waterwheel and elegant wooden gears. |
| 15 | `mk_rosabeth_apothecary_3` | Brown mouse mixes an herbal remedy among copper alembics, drying flowers and medicinal leaves. |

## Maker Craft & River

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_moss_ploughwright_1` | Badger shapes a polished wooden ploughshare in a rose-covered open forge. |
| 1 | `mk_moss_guild_architect_3` | Badger oversees carpenters raising a leafy timber hall from diagrammatic plans. |
| 2 | `mk_moss_rocketwright_4` | Badger assembles a flower-finned brass cottage rocket. |
| 3 | `mk_patch_junkyard_diver_0` | Raccoon emerges from curious salvage with one perfect brass cog. |
| 4 | `mk_patch_valuer_3` | Raccoon examines a clockwork teapot through a jeweler's loupe. |
| 5 | `mk_patch_yard_foreman_4` | Raccoon directs a reclamation yard sorting salvaged wood, copper and wheels. |
| 6 | `mk_patch_reclamation_merchant_5` | Raccoon presents restored oddments in a booth made from mismatched doors. |
| 7 | `mk_pebble_crossing_hand_0` | Brown otter guides a rope ferry through river reeds. |
| 8 | `mk_pebble_bridge_courier_1` | Brown otter races across a timber bridge as ducks scatter. |
| 9 | `mk_pebble_ferry_master_3` | Brown otter steers a hand-cranked ferry crowded with baskets and bicycles. |
| 10 | `mk_pebble_towpath_warden_4` | Brown otter checks canal mooring ropes with lantern and hook. |
| 11 | `mk_pebble_harbour_warden_5` | Brown otter surveys steam launches and sailboats from a flower-covered dock. |
| 12 | `mk_pockets_kerbside_dealer_1` | Raccoon opens a coat lined with harmless buttons, gears and spoons. |
| 13 | `mk_pockets_odd_lot_dealer_3` | Raccoon presides over unmatched teacups, single gloves and brass oddments. |
| 14 | `mk_rosabeth_tincture_counter_4` | Brown mouse dispenses jewel-toned herbal drops with pipettes amid blossoms. |
| 15 | `mk_daisy_garland_cutter_1` | Red squirrel snips daisy-and-greenery chains while nearly buried in flowers. |

## Maker Books & School

| Tile | Card | Scene prompt |
| ---: | --- | --- |
| 0 | `mk_scott_story_collector_0` | Red squirrel listens to an elderly mouse beside a hearth and sketches picture symbols. |
| 1 | `mk_scott_pamphleteer_2` | Red squirrel operates a hand press as illustrated leaflets flutter through a flower-filled shop. |
| 2 | `mk_scott_town_chronicler_3` | Red squirrel records a lively town-square event from an ivy-covered balcony desk. |
| 3 | `mk_scott_author_of_the_boroughs_5` | Renowned red squirrel welcomes readers among books and maps in a cozy grand library. |
| 4 | `mk_sage_night_assistant_0` | Owl carries lantern, star charts and tea up moonlit observatory stairs. |
| 5 | `mk_sage_astronomer_3` | Owl peers through an enormous brass telescope beneath a floral-framed dome. |
| 6 | `mk_sage_royal_astronomer_5` | Royal owl presents a clockwork planetary model to a woodland court. |
| 7 | `mk_eric_smallholder_1` | Cream rabbit tends vegetables, hens and beehives behind a stone cottage. |
| 8 | `mk_eric_fair_steward_2` | Cream rabbit measures a show-ring rope as prize vegetables and entrants wait. |
| 9 | `mk_jessica_song_leader_0` | Barn owl conducts a cheerful mixed-animal choir beneath a flowering arbor. |
| 10 | `mk_jessica_infant_teacher_1` | Barn owl leads tiny woodland children in a cottage-classroom circle game. |
| 11 | `mk_jessica_night_school_teacher_2` | Barn owl teaches adult workers beneath pinned brass constellations. |
| 12 | `mk_jessica_headmistress_4` | Dignified barn owl greets students at a leafy little schoolhouse. |
| 13 | `mk_faustus_bolt_boy_0` | Calico cat sorts stage bolts and hardware while trying not to drop an armful. |
| 14 | `mk_faustus_costumier_2` | Calico cat fits an overdecorated cape on a bashful badger amid sewing tools. |
| 15 | `mk_faustus_sailmaker_3` | Calico cat stitches a vast cream sail across a riverside loft. |

