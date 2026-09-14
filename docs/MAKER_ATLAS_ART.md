# Maker card artwork atlases

Four new 4 × 4 painted sheets add 64 card-specific scenes for the Maker shelf. The built-in image-generation tool produced the sheets using `boroughs-atlas.png`, `townlife-atlas.png`, and `nightworkers-atlas.png` as style and layout references only.

The generated sheets are bundled unchanged:

- `assets/art/maker-borough-atlas.png`
- `assets/art/maker-field-atlas.png`
- `assets/art/maker-woodland-atlas.png`
- `assets/art/maker-night-atlas.png`

Tile indices are zero-based and row-major. The presentation-only assignments live in `src/ui/painted-art.js`; Maker rules and authoring data remain unchanged.

## Shared generation prompt

> Create one square production game-art atlas for Animal Friends TCG, divided into an exact seamless 4-column by 4-row grid of 16 equally sized square full-bleed paintings, read strictly row-major. No gutters, margins, borders, grid strokes, captions, text, letters, numbers, labels, signs, readable paperwork, logos, watermarks, card frames, or UI. Use richly detailed hand-painted watercolor and gouache with fine warm ink detail, tactile paper and brush texture, premium antique storybook trading-card illustration. Show cozy cottage-and-small-town life with lush floral and leafy accents, gentle modern flair, affectionate visual humor, and expressive but believable clothed woodland animals. Any technology is whimsical practical steampunk in brass, copper, dark wood, leather, glass, visible gears and pipes—never sleek modern plastic. Keep each named identifying animal, face, hands, and principal prop within the central 70% of its tile for portrait card cropping. Make species anatomy and occupations unmistakable. Fill every square edge to edge and maintain tile boundaries precisely. No humans.

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

