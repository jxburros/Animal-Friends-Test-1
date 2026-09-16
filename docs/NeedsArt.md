# NeedsArt

Cards that are **written, rated and playable, and not yet painted.** Every one of them shows
up in the game right now with a vector fallback where its illustration ought to be.

This file is generated — run `npm run needsart` after changing the `needsArt` block in
[`spec/maker_card_set.json`](../spec/maker_card_set.json). That block is the list the art tests
read: a card may go unpainted only while it is on it, so nothing is quietly forgotten. A card
leaves the list when a scene is commissioned — a bundled painting in `src/ui/painted-art.js`,
or an `art` block naming an atlas tile on the card itself.

Each entry gives the card, the rules it has to depict, and the character and story behind it.
The full backstory for every named animal is in the set's `characters` list and shows in the
Book's **Story** panel (`npm run serve` → Book).

**64 cards waiting.**

## Baby Mouse

*Mouse, they/them — Lore.*

The Lending Library's lower shelves are at Baby Mouse height, which is how the borough found out that the lower shelves had been reorganised. Nobody asked for it. It is, annoyingly, better.

**Voice.** Very quiet, and then a fact nobody knew.

**The arc.** A Baby Mouse counts for two when a Mouse is set over them: a season on the lower shelves is half of what any Mouse in this borough can find.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Baby Mouse**, Pup<br>[`mk_baby_mouse_pup_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_baby_mouse_pup_0) | 0 | Mouse · Lore | A very long shift: 3 turns, 1 Supply. Any Mouse costing more than 2 may be played over Baby Mouse as an upgrade, and pays as though Baby Mouse cost 2. | Lynnette found the missing year of Grain Exchange returns behind the atlases. Lynnette did not find them. A Baby Mouse found them and Lynnette carried them. |

## Badger Cub

*Badger, they/them — Crafts.*

A Badger Cub is put in the corner of the workshop with a block and a blunt gouge and is not spoken to for a fortnight. This is not neglect; it is the whole of the Badger method, and every Badger in the First Boroughs has been through it. You are given the block. The block is not explained.

**Voice.** Says almost nothing for a very long time, and then says exactly the thing.

**The arc.** The longest apprenticeship in the borough. A Badger Cub counts for two when any Badger is set over them, because half a Badger's training is already done in that corner.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Badger Cub**, Cub<br>[`mk_badger_cub_cub_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_badger_cub_cub_0) | 0 | Badger · Crafts | A very long shift: 3 turns, 1 Supply. Any Badger costing more than 2 may be played over Badger Cub as an upgrade, and pays as though Badger Cub cost 2. | Barrow's first block is still on the shelf above his bench. It is not a good block. He will not have it moved. |

## Bunny

*Rabbit, they/them — Agriculture.*

There is never one Bunny. There is a Bunny, and then there are five more of them coming round the end of the Allotment Strip, and the borough has long since given up counting. The warren's smallest are put on the light rows the moment they can carry a trug — not because anybody needs the help, but because a Rabbit who has not been given a row spends the afternoon in somebody else's.

**Voice.** All questions, none of them waiting for the answer.

**The arc.** A Bunny is the bottom of every Rabbit's ladder: no rank, no trade, and a post that any Rabbit in the borough may step into as an upgrade.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Bunny**, Kit<br>[`mk_bunny_kit_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_bunny_kit_0) | 0 | Rabbit · Agriculture | A very long shift: 3 turns, 1 Supply. Any Rabbit costing more than 1 may be played over Bunny as an upgrade, and pays as though Bunny cost 1. | Clover gave one a row of its own the summer the beds went in, and by August there were nine rows and no way of saying which Bunny had which. |

## Dirt

*Squirrel, he/him — Civics / Crafts.*

Dirt and Squirt are twins and they teach at the borough school, one room each, and the borough has never been certain which of them is in which. This is deliberate. They swap on Tuesdays for no reason, they swap in the middle of a lesson for a better one, and they have twice swapped during a ward meeting while a motion was being read.

**Voice.** Slow, dry, and leaves the gap open a beat too long on purpose.

**The arc.** Every version of him is the same trick from a different room: the post stays, the twin in it changes. The cheap ones swap; the dear ones swap and have a season's work put by.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Dirt**, Classroom Assistant<br>[`mk_dirt_classroom_assistant_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_dirt_classroom_assistant_0) | 0 | Squirrel · Civics | Busy: swap this card with Dirt or Squirt in your hand. The post is not lost and nothing is paid. | On his first morning he was introduced to the upper room as Squirt, said nothing, and taught the whole term under it. |
| **Dirt**, Schoolteacher, Upper Room<br>[`mk_dirt_schoolteacher_upper_room_2`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_dirt_schoolteacher_upper_room_2) | 2 | Squirrel · Civics | Upgrades Dirt. Busy: swap this card with Dirt or Squirt in your hand. The post is not lost and nothing is paid. | He lets the wrong answer sit there. The room cannot stand it. Somebody always fixes it themselves, which is the entire method and he has never written it down. |
| **Dirt**, Figurine Painter<br>[`mk_dirt_figurine_painter_3`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_dirt_figurine_painter_3) | 3 | Squirrel · Crafts | Upgrades Dirt. Busy: swap this card with Dirt or Squirt in your hand. The post is not lost and nothing is paid. When Dirt finishes a shift, put 2 Supply by on him. | An inch and a half tall, one a season, and the faces are right in a way that has made two animals in this borough quietly uncomfortable. |
| **Dirt**, Master Figuremaker<br>[`mk_dirt_master_figuremaker_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_dirt_master_figuremaker_5) | 5 | Squirrel · Crafts | Upgrades Dirt. Busy: swap this card with Dirt or Squirt in your hand. The post is not lost and nothing is paid. When Dirt finishes a shift, take every Supply your Characters have put by. | Eleven on Ned's shelf, and the twelfth is labelled DIRT and is unmistakably Squirt. Four years now. He has never corrected it and he never will. |

## Fox Cub

*Fox, they/them — Entertainment.*

Fox Cubs are not allowed inside the Auction House and every one of them knows what the big lots went for. They sit on the steps, they watch the animals coming out, and they read the faces — and a Fox Cub who has read the faces wrong twice does not read them wrong a third time.

**Voice.** Running commentary, pitched just loud enough to be overheard.

**The arc.** A Fox Cub counts for two when a Fox is set over them: the steps outside the room are half of what is ever taught about the room.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Fox Cub**, Cub<br>[`mk_fox_cub_cub_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_fox_cub_cub_0) | 0 | Fox · Entertainment | A very long shift: 3 turns, 1 Supply. Any Fox costing more than 2 may be played over Fox Cub as an upgrade, and pays as though Fox Cub cost 2. | A Cub on the steps called the timber lot four rungs before the room did, to nobody, and has been insufferable ever since. |

## Hoglet

*Hedgehog, they/them — Civics.*

Hoglets are put on the gate step, which is the safest place in the borough and also the one where you learn the most. Everybody comes past the gate. A Hoglet who has spent a season on the step knows every animal's name, their business, and which of them tells the gate a different story on the way back.

**Voice.** Polite, unhurried, and entirely unbudgeable.

**The arc.** A season on the gate step is where a Hedgehog learns the only thing Hedgehogs teach, and any Hedgehog in the borough may be played over a Hoglet afterwards.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Hoglet**<br>[`mk_hoglet_hoglet_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_hoglet_hoglet_0) | 0 | Hedgehog · Civics | A very long shift: 3 turns, 1 Supply. Any Hedgehog costing more than 1 may be played over Hoglet as an upgrade, and pays as though Hoglet cost 1. | Bristle let one hold the gate for an afternoon as a joke. Two carters and a Fox turned round and came back with their paperwork. |

## Hoot

*Owl, they/them — Civics / Food.*

Hoot came in on the night mail with one bag and a list of everybody's names, and had worked through most of the list by the end of the first week. The job is night porter: doors, lamps, deliveries, the ward's keys, and getting animals up who have asked to be got up. The knocking at four in the morning is neither a joke nor an accident — Hoot takes a request to be woken as seriously as anybody in the First Boroughs takes anything, and has never once been late with one.

**Voice.** Bright, polite, appallingly awake. Apologises for the hour, and then knocks again.

**The arc.** The porter's round and the night kitchen are the same round: doors, lamps, keys, and now breakfast. The dear versions wake the whole town before dawn and feed it.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Hoot**, Night Kitchen<br>[`mk_hoot_night_kitchen_1`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_hoot_night_kitchen_1) | 1 | Owl · Food | Busy: one of your other Characters turns one step toward upright. | If you are going to knock at four in the morning you had better have something with you, and Hoot worked that out in the first week. |
| **Hoot**, Breakfast Bell<br>[`mk_hoot_breakfast_bell_3`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_hoot_breakfast_bell_3) | 3 | Owl · Food | Upgrades Hoot. At the start of your turn, one of your Characters turns one step toward upright. | Doors, lamps, deliveries, the ward's keys, and now the bell — and the bell is the one nobody has ever complained about. |
| **Hoot**, Head of the Night Kitchen<br>[`mk_hoot_head_of_the_night_kitchen_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_hoot_head_of_the_night_kitchen_5) | 5 | Owl · Food | Upgrades Hoot. At the start of your turn, one of your Characters turns one step toward upright and you gain 1 Supply. | The list of everybody's names is still in the bag behind the door. It has what they take in the morning written next to it now, and Hoot has never had to look. |

## JT

*Otter, he/him — Science / Food.*

JT is a nurse and he is very silly, and the borough worked out years ago that those are the same fact. The children's ward is his — he took it, nobody assigned it — and he takes it seriously enough to have a bit for every procedure in it, most of them terrible, all of them load-bearing. An animal who is laughing is an animal who is not bracing, and an animal who is not bracing is half a minute's work instead of ten.

**Voice.** Two voices: the one with the funny hat on, and the one that says 'now, the pears'.

**The arc.** The cheap JTs are the ward — a Supply saved, an apprentice back on their feet. The dear ones are the restaurant, and the restaurant only ever pours for the animals at the top of the bill.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **JT**, Ward Nurse<br>[`mk_jt_ward_nurse_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_jt_ward_nurse_0) | 0 | Otter · Science | Busy: rehire a Character costing 1 or less from your Unemployment. | He does the voice. It is not a good voice. The paw comes off the arm of the chair every single time. |
| **JT**, Children's Ward Nurse<br>[`mk_jt_children_s_ward_nurse_2`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_jt_children_s_ward_nurse_2) | 2 | Otter · Science | Upgrades JT. Busy: two of your Characters costing 1 or less each turn one step toward upright. | The whole front row at once, which is the trick: nobody wants to be the one who is still sitting down when the others have got up. |
| **JT**, Juice List<br>[`mk_jt_juice_list_3`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_jt_juice_list_3) | 3 | Otter · Food | Upgrades JT. Busy: one of your Characters hands their shift to another. | Clean shirt, three evenings a week. 'Now, the pears.' Nobody has yet escaped the pears. |
| **JT**, Juice Sommelier<br>[`mk_jt_juice_sommelier_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_jt_juice_sommelier_5) | 5 | Otter · Food | Upgrades JT. Busy: one of your Characters costing 4 or more is readied, and you gain 1 Supply. | He pours for the top of the bill and he pours for the child at the next table, and he gives them the same thirty seconds about the pears. The child gets the better version. |

## Kitten

*Cat, they/them — Entertainment.*

The night school's front row is Kittens, and Jessica has never set them any homework. They can name every constellation and cannot spell any of them, which is on the record in this borough as a complete success.

**Voice.** Wide awake at the wrong hour, and very pleased about it.

**The arc.** The first rung of every Cat's ladder — and any Cat in the borough may turn out to be the one who was standing there.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Kitten**<br>[`mk_kitten_kitten_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_kitten_kitten_0) | 0 | Cat · Entertainment | A very long shift: 3 turns, 1 Supply. Any Cat costing more than 1 may be played over Kitten as an upgrade, and pays as though Kitten cost 1. | Marmalade sends the front row home with buns. The buns do not reach the front row's homes and Marmalade has never asked about it. |

## Mildred

*Badger, she/her — Commerce.*

Mildred has been behind the counter at the Counting House for longer than most of the borough has been alive, and she is slow. She is slow on purpose. The queue knows it, the queue has always known it, and the queue forms anyway, because in forty-one years Mildred has not made a single error and the ward records say so — Ned has checked, twice, unasked.

**Voice.** Unhurried, courteous, and entirely final. 'I can do that for you tomorrow.'

**The arc.** The rungs are how far the counter reaches. The clerk keeps her own books; the Branch Manager keeps everybody's, and the other town feels it on every shift it finishes.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Mildred**, Counter Clerk<br>[`mk_mildred_counter_clerk_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_mildred_counter_clerk_0) | 0 | Badger · Commerce | A steady shift: 2 turns, 2 Supply. | Forty-one years and not one error. The queue forms anyway. The queue has always formed anyway. |
| **Mildred**, Teller<br>[`mk_mildred_teller_2`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_mildred_teller_2) | 2 | Badger · Commerce | Upgrades Mildred. Every shift your opponent finishes pays 1 Supply less while Mildred is standing. | Nothing is taken and nothing is refused. There is a form, the form is correct, and the form takes a while. |
| **Mildred**, Chief Teller<br>[`mk_mildred_chief_teller_3`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_mildred_chief_teller_3) | 3 | Badger · Commerce | Upgrades Mildred. Every shift your opponent finishes pays 1 Supply less while Mildred is standing. | She will tell you, kindly, what you could bring in tomorrow that would let her say yes. Animals bring it. That is the part the borough forgets to mention. |
| **Mildred**, Branch Manager<br>[`mk_mildred_branch_manager_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_mildred_branch_manager_5) | 5 | Badger · Commerce | Upgrades Mildred. Every shift your opponent finishes pays 2 Supply less while Mildred is standing. Busy: rehire a Character from your Unemployment for 1 less Supply. | She says no to a Mayor exactly as she says it to anybody else. It is the most expensive habit in the First Boroughs and it is why the borough's money has never once gone missing. |

## Mimi

*Rabbit, she/her — Food / Civics / Science / Entertainment / Commerce.*

Mimi works the cabin, which is five jobs in a uniform designed to look like one. She is the safety demonstration and the trolley and the pressure check and the welcome at the front step and the animal who settles the bill at the far end, and she moves between all five so smoothly that most passengers come off the aircraft believing they have been looked after by one extremely calm rabbit and not by a small institution.

**Voice.** Warm, level, already solving it. 'Of course — give me one moment.'

**The arc.** She does not climb; she changes hats, and the whole point of her is that the hat can change mid-shift and the post does not. The dear version is the one who is running the whole cabin and can still put another body out of the door with her.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Mimi**, Trolley Service<br>[`mk_mimi_trolley_service_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_mimi_trolley_service_0) | 0 | Rabbit · Food | Busy: swap this card with any other Mimi in your hand. | Two hundred cups down a gangway eleven inches wider than the trolley, and not one of them has ever gone over. |
| **Mimi**, Safety Demonstration<br>[`mk_mimi_safety_demonstration_1`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_mimi_safety_demonstration_1) | 1 | Rabbit · Civics | Busy: swap this card with any other Mimi in your hand. | Nobody watches it. She does it exactly the same every time anyway, which is the difference between her and everybody who has ever said nobody watches it. |
| **Mimi**, Cabin Pressure Check<br>[`mk_mimi_cabin_pressure_check_2`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_mimi_cabin_pressure_check_2) | 2 | Rabbit · Science | Upgrades Mimi. Busy: swap this card with any other Mimi in your hand. | The checklist is Reese's responsibility and the checklist is done by Mimi, and the two of them have never once discussed this arrangement. |
| **Mimi**, Seat 1A Welcome<br>[`mk_mimi_seat_1a_welcome_3`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_mimi_seat_1a_welcome_3) | 3 | Rabbit · Entertainment | Upgrades Mimi. Busy: swap this card with any other Mimi in your hand. When Mimi finishes a shift, draw a card. | A diverted landing, a broken latch, a passenger with strong feelings about the seat numbering: same smile, same sentence, already fixing it. |
| **Mimi**, Purser<br>[`mk_mimi_purser_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_mimi_purser_5) | 5 | Rabbit · Commerce | Upgrades Mimi. Busy: swap this card with any other Mimi in your hand. Then, if you control another Rabbit, recruit a Character costing 1 or less from your hand for free. | Five jobs in a uniform designed to look like one, and the bill settled at the far end. Ask her about the beets and you will get the smile and nothing else. |

## Otter Pup

*Otter, they/them — Food.*

There is an Otter Pup under the counter at the All-Night Café most nights and Bean has never once asked whose. They come in off the ferry steps with the lightermen, they are handed something warm, and they are put to work carrying it two tables over, which takes an extremely long time and involves the entire room.

**Voice.** Breathless, sideways, already halfway to the next thing.

**The arc.** The one slow rung on the fastest ladder in the borough, and a post any Otter may be found standing in afterwards.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Otter Pup**, Pup<br>[`mk_otter_pup_pup_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_otter_pup_pup_0) | 0 | Otter · Food | A very long shift: 3 turns, 1 Supply. Any Otter costing more than 1 may be played over Otter Pup as an upgrade, and pays as though Otter Pup cost 1. | Dylan carried one across the counter on a tray and both of them behaved as though that were the ordinary way to cross a room. |

## Owlet

*Owl, they/them — Lore.*

Owlets are awake, which in the First Boroughs is a qualification. They are taken on the night round at an age the day borough would find alarming, carried where the lamps are lit, and told what each thing is once. Owls are told things once.

**Voice.** Enormous, unblinking, and a question you were not ready for.

**The arc.** An Owlet counts for two when an Owl is set over them: the night round is half of what any Owl in this borough knows.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Owlet**<br>[`mk_owlet_owlet_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_owlet_owlet_0) | 0 | Owl · Lore | A very long shift: 3 turns, 1 Supply. Any Owl costing more than 2 may be played over Owlet as an upgrade, and pays as though Owlet cost 2. | Mandee carries the lanterns and lets an Owlet hold the pole. The Owlet has never once dropped it, and has been told so exactly once. |

## Raccoon Kit

*Raccoon, they/them — Commerce.*

The Salvage Yard has a shelf at knee height that nobody stocks and that is never empty. That is the Kits' shelf. What is on it has been carried in from the City Dump one piece at a time by animals too small to carry two, and Pockets prices it exactly as seriously as anything else in the yard.

**Voice.** Delighted, in detail, about something that was in a bin.

**The arc.** A Raccoon Kit counts for two when a Raccoon is set over them: a season on the City Dump road is half of what any Raccoon in this borough knows.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Raccoon Kit**, Kit<br>[`mk_raccoon_kit_kit_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_raccoon_kit_kit_0) | 0 | Raccoon · Commerce | A very long shift: 3 turns, 1 Supply. Any Raccoon costing more than 2 may be played over Raccoon Kit as an upgrade, and pays as though Raccoon Kit cost 2. | Pockets gave one a ha'penny for a doorknob with no door. It is still on the shelf. It is still, Pockets maintains, worth a ha'penny. |

## Reese

*Raccoon, he/him — Science.*

Reese flies, and Reese is aware that Reese flies. The sunglasses are worn indoors. The yellow pleather coat is worn in August. He walks into the Hiring Hall the way other animals walk into a room they have just bought, and the infuriating thing — the thing that has kept the borough from ever quite getting a word in — is that he is exactly as good as he says he is.

**Voice.** Unbothered, three-quarters of a beat slow, and never takes the glasses off.

**The arc.** The cheap Reese is still scavenging; the dear ones are the animal who fetches out of the shared bin and then goes and flies, which is the whole species in one coat.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Reese**, Crop Duster<br>[`mk_reese_crop_duster_1`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_reese_crop_duster_1) | 1 | Raccoon · Science | Busy: take a Market card from the City Dump into your hand. | Low over the far field at six in the morning, and Maribel has stopped waving because he has stopped being surprised by it. |
| **Reese**, Charter Pilot<br>[`mk_reese_charter_pilot_3`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_reese_charter_pilot_3) | 3 | Raccoon · Science | Upgrades Reese. Busy: draw 2 cards, then discard 1 card. | The coat is yellow, it is August, and the passenger has not asked because the passenger has worked out that asking is the point. |
| **Reese**, Chief Pilot<br>[`mk_reese_chief_pilot_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_reese_chief_pilot_5) | 5 | Raccoon · Science | Upgrades Reese. Busy: take a Market card from the City Dump into your hand, then draw a card. | He goes when the weather has shut the ferry and he tells it afterwards as though it were a short walk. He also read the freight notes out of the bin first, and that part he tells nobody. |

## Shay

*Owl, she/her — Science / Entertainment.*

Shay is the borough's doctor, and she is the reason the Science hall and Rosabeth's garden are on speaking terms. She reads everything — the county papers, the Capital City's returns, the three medical journals that come up on the late ferry and are addressed to nobody in particular — and she reads them the night they arrive, because she is an Owl and the night is when the reading gets done. Whatever is new, Shay has already read about it, and has usually already written to somebody about it.

**Voice.** Brisk, kind, and already three steps into the explanation. Never says 'rest'; says 'sit down for me a minute'.

**The arc.** The paintings are where she starts and the surgery is where she ends. The cheap versions are one animal woken up; the dear ones are the round she actually walks, both sides of the ward boundary, and the reading she does afterwards.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Shay**, Sunday Painter<br>[`mk_shay_sunday_painter_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_shay_sunday_painter_0) | 0 | Owl · Entertainment | A short shift: 1 turn, 1 Supply. | Green, mostly. She is aware it is mostly green. The trestle goes up at eight and the price card says what it says. |
| **Shay**, Ward Doctor<br>[`mk_shay_ward_doctor_1`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_shay_ward_doctor_1) | 1 | Owl · Science | Busy: one of your Characters turns one step toward upright. | Two doors from the Physic Garden, a bell on a string, and a light on at the hours nobody else keeps a light on. |
| **Shay**, Borough Physician<br>[`mk_shay_borough_physician_2`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_shay_borough_physician_2) | 2 | Owl · Science | Upgrades Shay. Busy: one of your Characters and one of your opponent's Characters each turn one step toward upright. | She does the round twice and the second round crosses the ward boundary. It has been raised at three meetings. It has never once been stopped. |
| **Shay**, Market-Stall Painter<br>[`mk_shay_market_stall_painter_3`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_shay_market_stall_painter_3) | 3 | Owl · Entertainment | Upgrades Shay. When Shay finishes a shift, draw a card. | Everything off the trestle by noon, and everything off the trestle turns into whatever came up on the late ferry addressed to nobody in particular. |
| **Shay**, Chief Physician<br>[`mk_shay_chief_physician_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_shay_chief_physician_5) | 5 | Owl · Science | Upgrades Shay. Busy: one of your Characters and one of your opponent's Characters each turn one step toward upright, then draw a card. | Whatever is new, Shay read it the night it came. Whoever is unwell, Shay is already on the step. The borough has never worked out when she sleeps and has stopped asking in case she answers. |

## Sota

*Cat, they/them — Science / Civics.*

Sota grinds glass. Every lens in the Observatory's smaller instruments came off their bench, and the two big ones have been re-seated by them twice. It is months of work to take a blank down to a figure that will hold a star still, and the last of it is done by hand, by feel, at about the speed of a plant growing.

**Voice.** Soft, unhurried, entirely uninterested in the sky.

**The arc.** Glass at one end and the touchline at the other, and the same animal doing both at the same speed: the cheap versions stand next to Teresa, the dear ones are the bench the Observatory cannot replace.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Sota**, Touchline Assistant<br>[`mk_sota_touchline_assistant_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_sota_touchline_assistant_0) | 0 | Cat · Civics | At the start of your turn, if you control Teresa, gain 1 Supply. | They took the job because the light is better on the touchline than over a blank, and have never offered the borough a second reason. |
| **Sota**, Assistant Coach<br>[`mk_sota_assistant_coach_2`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_sota_assistant_coach_2) | 2 | Cat · Civics | Upgrades Sota. Busy: Sota stands up, once per game, even from the wrong side of upright. | Teresa can be heard from the allotments. Sota moves two paces up the line and the whole back four moves with them, and nobody has ever seen the signal. |

## Squirrel Kit

*Squirrel, they/them — Science.*

A Squirrel Kit is given a tin. That is the entire ceremony. What goes in the tin is the Kit's business and nobody else's, and a Squirrel who has not learned by the end of the first winter that a tin put by in October is worth four times a tin spent in October has not learned the only thing Squirrels teach.

**Voice.** Counting under their breath, and not telling you the number.

**The arc.** The tin is the whole of the trade and the trade takes a lifetime, so the ward credits the first winter with nothing at all. Any Squirrel may be played over a Kit.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Squirrel Kit**, Kit<br>[`mk_squirrel_kit_kit_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_squirrel_kit_kit_0) | 0 | Squirrel · Science | A very long shift: 3 turns, 1 Supply. Any Squirrel costing more than 1 may be played over Squirrel Kit as an upgrade, and pays as though Squirrel Kit cost 1. | Peanut's first tin is in the café office with the year scratched on the lid. It has four acorns in it. It has had four acorns in it since. |

## Squirt

*Squirrel, he/him — Civics.*

Squirt has the lower room, the shorter fuse and the better legs, and he is out of the door at the bell because the borough side trains at five. He is a genuinely good player — left wing, twenty years of it — and he is the reason the school's afternoon is organised the way it is, which the school has never formally admitted.

**Voice.** Fast, cheerful, and gone before the end of your sentence.

**The arc.** The school rungs are the swap on its own; the borough-side rungs are the swap plus a team that gets back up when he does.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Squirt**, Playground Monitor<br>[`mk_squirt_playground_monitor_1`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_squirt_playground_monitor_1) | 1 | Squirrel · Civics | Busy: swap this card with Dirt or Squirt in your hand. The post is not lost and nothing is paid. | Ten minutes into anything he has decided is boring, he starts it. Dirt has never once refused and has never once looked surprised. |
| **Squirt**, Schoolteacher, Lower Room<br>[`mk_squirt_schoolteacher_lower_room_2`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_squirt_schoolteacher_lower_room_2) | 2 | Squirrel · Civics | Upgrades Squirt. Busy: swap this card with Dirt or Squirt in your hand. The post is not lost and nothing is paid. | The lower room's afternoon is arranged around a five o'clock kick-off. The school has never formally admitted this and has never once changed it. |
| **Squirt**, Borough Eleven, Left Wing<br>[`mk_squirt_borough_eleven_left_wing_4`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_squirt_borough_eleven_left_wing_4) | 4 | Squirrel · Civics | Upgrades Squirt. Busy: swap this card with Dirt or Squirt in your hand. The post is not lost and nothing is paid. When Squirt finishes a shift, one of your other Characters is readied. | Twenty years on that wing. He stops being funny the moment he crosses the line, which is the thing about him that surprises the ward meetings. |
| **Squirt**, Club Captain<br>[`mk_squirt_club_captain_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_squirt_club_captain_5) | 5 | Squirrel · Civics | Upgrades Squirt. Busy: swap this card with Dirt or Squirt in your hand. The post is not lost and nothing is paid. When Squirt finishes a shift, one of your other Characters turns one step toward upright. | Teresa shouts and he does what she says. Sota says nothing and he does what they say. Asked how he tells them apart, he said: one of them is loud. |

## Teresa

*Mouse, she/her — Civics / Food.*

Teresa coaches the borough side and Teresa has no inside voice. What confuses animals who have not met her is that almost everything she bellows is encouraging. WONDERFUL. THAT IS THE IDEA. GOOD LAD. It arrives at the volume of a complaint and it is, without exception, praise, and new players spend about a fortnight braced for a criticism that is never coming.

**Voice.** CAPITALS, and kind. The volume is not an opinion; it is just the volume.

**The arc.** Every rung of the coaching track works the other town harder and works her harder still. The peppers are the quiet rungs in between, and they are where the Mouse paperwork lives.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Teresa**, Pepper Grower<br>[`mk_teresa_pepper_grower_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_teresa_pepper_grower_0) | 0 | Mouse · Food | A short shift: 1 turn, 1 Supply. | Far end of the Allotment Strip, an unreasonable number of varieties, and a hand-written card for each that nobody can read from the path. |
| **Teresa**, Touchline Coach<br>[`mk_teresa_touchline_coach_1`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_teresa_touchline_coach_1) | 1 | Mouse · Civics | Busy: one of your opponent's Characters is put back to work — and so is Teresa, again. | WONDERFUL. THAT IS THE IDEA. GOOD LAD. The allotments can hear it and the allotments have stopped looking up. |
| **Teresa**, Pepper Stall<br>[`mk_teresa_pepper_stall_2`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_teresa_pepper_stall_2) | 2 | Mouse · Food | Upgrades Teresa. Busy: take an Event from your Town Dump into your hand. | She is quieter at the market. Not quiet. Quieter. The trestle is next to Shay's and the two of them have never once agreed about the pricing. |
| **Teresa**, Head Coach<br>[`mk_teresa_head_coach_3`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_teresa_head_coach_3) | 3 | Mouse · Civics | Upgrades Teresa. Busy: two of your opponent's Characters are put back to work, and Teresa is put back to work twice over. | If she has asked more of you this week than last week that is not an accident, and she has asked more of herself than of any of you, which also is not. |
| **Teresa**, Coach of the Borough Eleven<br>[`mk_teresa_coach_of_the_borough_eleven_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_teresa_coach_of_the_borough_eleven_5) | 5 | Mouse · Civics | Upgrades Teresa. Busy: two of your opponent's Characters are put back to work and you draw a card. Teresa is put back to work twice over. | The appeal against the ferry-day postponement ran to nine pages and was won on the second. Whatever she takes out of the side in a season she puts back twice, and she has never once said so out loud. |

## The Capital City

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Farmer's Market**, Town Building<br>[`mk_tb_farmers_market`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_tb_farmers_market) | 4 | Town Building | At the start of your turn, gain 1 Supply for each of your upright Characters, up to 3. | Trestles on the square from six, down by one. Teresa's peppers are at the far end next to Shay's paintings and the two of them have never agreed about the pricing. It pays what the borough brought, which on a thin week is nothing much and on a full one is the best morning of the month. |
| **The Bookstore**, Capital City Building<br>[`mk_bld_bookstore`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_bld_bookstore) | 5 | Capital City Building | At the start of your turn, draw 1 card, then discard 1 card. | Ned's overflow, priced by somebody else and sold by nobody in particular. You never leave with nothing and you never leave with room in the bag, which is why the shelf by the door is for what you have decided against on the way out. |
| **The Game Store**, Capital City Building<br>[`mk_bld_game_store`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_bld_game_store) | 6 | Capital City Building | At the start of your turn, you may pay 3 Supply to draw 2 cards. | Dice, boards, painted figures an inch and a half tall that are not Dirt's and are sold as though they were. Supply goes in over the counter and comes back out as something to do on a Tuesday, which the borough has decided is a fair rate. |
| **The Juice Store**, Capital City Building<br>[`mk_bld_juice_store`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_bld_juice_store) | 7 | Capital City Building | At the start of your turn, gain 2 Supply, then toss a coin: heads, a Character of your opponent's is put back to work at random; tails, one of yours is. | JT drew up the list and then went back to the restaurant, and the counter has been run ever since by whoever is nearest. Somebody is always back behind it. It is not always somebody who meant to be. |
| **The Gas Station**, Capital City Building<br>[`mk_bld_gas_station`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_bld_gas_station) | 7 | Capital City Building | At the start of your turn, your opponent discards 1 card. | Two pumps, a bell on the forecourt cable and a bin that is emptied hourly. Whatever the other town came in holding, some of it goes in that bin before they leave, and nobody has ever been able to say quite how. |
| **The Bank**, Capital City Building<br>[`mk_bld_bank`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_bld_bank) | 8 | Capital City Building | At the start of your turn, you may put 2 tokens of any kind across the counter to gain 4 Supply. | Mildred's counter, and the only place in the First Boroughs that does not care what kind of chit you have brought it. Two is two. She will count them in front of you, slowly, and she will be right. |
| **The Fast Food Joint**, Capital City Building<br>[`mk_bld_fast_food_joint`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_bld_fast_food_joint) | 8 | Capital City Building | Your Masters are ready a turn sooner. At the start of your turn, one of your Characters turns one step toward upright and you gain 1 Supply. Whenever one of your Characters finishes a shift, toss a coin: tails, a Character of yours costing 1 or less goes to Unemployment. | Open at all hours, out in under a minute, and the whole town suddenly has time it did not have. Nobody has worked a full season in it and nobody can say in advance whose last week it is. Marmalade has never said a word against the place, which from Marmalade is the loudest thing anybody has said about it. |
| **The Car Dealership**, Capital City Building<br>[`mk_bld_car_dealership`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_bld_car_dealership) | 8 | Capital City Building | At the start of your turn, gain 1 Supply and your opponent loses 4 Supply; your opponent may then recruit a Character costing 2 or less from their hand for free. | Bunting, a brass bell and a Fox on the forecourt. Nobody has ever walked off this lot poorer and emptier-pawed at the same time, which is the whole art of it: you are four Supply down and you are driving something home and you cannot decide how you feel. |
| **The Owlery**, Capital City Building<br>[`mk_bld_owlery`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_bld_owlery) | 9 | Capital City Building | At the start of your turn, if you control an Owl, you may recruit an Owl from your hand for free. | Brick, tall, and warm at the top, and the Capital City built it as a post house. The Owls moved in the first winter and the post has been a side effect ever since. There has to be one of them up there already or the rest do not come: Hoot keeps the list, and Hoot has never had to look at it. |
| **The Cheese Store**, Capital City Building<br>[`mk_bld_cheese_store`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_bld_cheese_store) | 9 | Capital City Building | At the start of your turn, if you control a Mouse, gain 2 Supply. At the start of your turn, if you control a Raccoon, draw 1 card. | A cold room, a marble slab and a queue of two species. The Mice buy it. The Raccoons are here for the rind bin round the back, which the shop has stopped pretending is not the main trade. |
| **The Airport**, Capital City Building<br>[`mk_bld_airport`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_bld_airport) | 9 | Capital City Building | At the start of your turn, you may recruit a Character from your hand for free; they enter upright, cannot be pledged in an auction, and go to Unemployment at the end of your turn. | Reese's field, one strip and a windsock, and Mimi runs the whole of the rest of it. An animal off the morning aircraft is standing in your town by nine and gone by supper, and the borough has decided that a day is a day. |

## Events and weather

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **The Car Show**<br>[`mk_car_show`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_car_show) | 0 | Event | Requires a Fox and a Commerce Character. Each Mayor may recruit up to 2 Characters from their hand for free. | Bunting across the square, the dealership's brass bell going all afternoon, and both boroughs walking home with something. It is the Fox on the forecourt who opens it and the ledger animals who make it add up, and nobody remembers agreeing to hold it on the same day as the market — but the other town turns out in numbers, every year, and that is rather the point of it. |
| **Passing Comets**<br>[`mk_passing_comets`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_passing_comets) | 0 | Event | Requires a Science Character. Each Mayor searches their deck for up to 2 cards, shows them, takes them into hand and shuffles. | Somebody with a chart says when, and by ten the whole square is out on its back looking up — which means everybody is also, quietly, going and fetching the one card they have been waiting on. Sage counts them aloud. Nobody has ever pretended not to have seen what the other town came back with, and half the borough's best trades have been agreed lying on the cobbles. |
| **The Community Bonfire**<br>[`mk_community_bonfire`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_community_bonfire) | 0 | Event | Requires a Lore Character. Each Mayor draws 1 card. Then draw 1 more for each Lore Character in your town, up to 3. | One night a year the borough burns the year's broken pallets on the far field and the animals who keep the records do the talking, because a bonfire is where this town has always done its remembering. Ned brings the ward book. Lynnette brings the water-stained novels nobody has wanted since the bridge went. The other town walks over the hill for it and is handed a chair, and everybody goes home knowing something they did not. |
| **Cheese Festival**<br>[`mk_cheese_festival`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_cheese_festival) | 0 | Event | Requires a Badger and a Mouse. Gain 4 Supply and take an Event from your Town Dump into your hand. | The cold room is emptied onto trestles for one weekend and the two species who actually care about it run the whole thing between them: the Badgers carry and the Mice do the paperwork, and the paperwork is why it has happened every year without fail since anybody can remember. |

