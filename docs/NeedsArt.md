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

## Adam

*Badger, he/him — Civics.*

Adam mends roads. The lane down to the ferry steps, the long pull up to the county gate, the square's cobbles after festival week — all of it is his, and all of it is work nobody notices until it stops being done. He was out on the county road the year the bridge went, and stayed out on it for most of that spring getting carts round the long way.

**Voice.** Level and unhurried. Talks about a road the way other animals talk about a relative.

**The arc.** The lad with the barrow at 1 and the animal who decides where the road goes at 4. Both cards do nothing but work, because a road is nothing but work; the difference between them is how much of it is his.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Adam**, Road Construction<br>[`mk_adam_road_construction_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_adam_road_construction_5) | 5 | Badger · Civics | Upgrades Adam. A long shift: 2 turns, 5 Supply. When Adam finishes a shift, gain 2 Supply and take a Building token. At the start of your turn, Buildings cost you 2 less. | It stopped being mending somewhere around the third winter. Adam has the county road open from the ferry steps to the gate, a gang of eleven, and a line of stakes across ground nobody has ever carted over — and he still starts at one end and does not hurry. |

## Balto

*Owl, he/him — Crafts / Commerce.*

Balto has been making furniture longer than most of the Town Workshop's current bench has been standing, and he is still the one animal in it who can be woken at any hour of the night by a knock on the door and a wobbling table leg. He works the way Owls work — through the dark, unhurried, with everybody else's shift asleep around him — and by the time the borough is up he has usually already been round to see what needed doing.

**Voice.** Slow, dry, and kind without ever sounding like it is trying to be. Measures twice, says less.

**The arc.** The Bench Owl at 0 is a night visit with a bag of tools. The Cabinetmaker at 1 does the same, better. The Shopkeeper at 2 has started charging for some of it. The Furniture Craftsman at 3 is the name half the borough's good chairs go under. The Guild Furniture Broker at 5 sells what he cannot make fast enough and is generous with the credit either way — Owl and Badger alike leave his counter with something extra, because he has never once, in fifty years, sent a neighbor home short.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Balto**, Bench Owl<br>[`mk_balto_bench_owl_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_balto_bench_owl_0) | 0 | Owl · Crafts | When Balto is recruited, your Owl and Badger Characters' next shift each produces 1 extra Supply. | A knock at three in the morning and a wobbling table leg, and Balto is already out the door with the right chisel. |
| **Balto**, Cabinetmaker<br>[`mk_balto_cabinetmaker_1`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_balto_cabinetmaker_1) | 1 | Owl · Crafts | Upgrades Balto. Busy: your Owl and Badger Characters' next shift each produces 1 extra Supply. | Fifty years of dovetails, and he still will not say which joint he is proudest of, only that it is somewhere in the Open Mic Room and nobody has noticed it yet. |
| **Balto**, Shopkeeper<br>[`mk_balto_shopkeeper_2`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_balto_shopkeeper_2) | 2 | Owl · Commerce | Upgrades Balto. When Balto completes a shift, gain 2 Supply. | He found, to his mild surprise, that he could charge for some of it. He still gives half of it away first and charges for what is left. |
| **Balto**, Furniture Craftsman<br>[`mk_balto_furniture_craftsman_3`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_balto_furniture_craftsman_3) | 3 | Owl · Crafts | Upgrades Balto. Busy: your Owl and Badger Characters' next shift each produces 1 extra Supply. | Half the good chairs in either borough go under his name now, and none of them were ever formally sold — a neighbor mentioned a bad back, and a chair turned up. |
| **Balto**, Guild Furniture Broker<br>[`mk_balto_guild_furniture_broker_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_balto_guild_furniture_broker_5) | 5 | Owl · Commerce | Upgrades Balto. At the start of your turn, your Owl and Badger Characters' next shift each produces 2 extra Supply, and gain 2 Supply. | Fifty years in, and he still does the neighbor first and the counter second, in that order, every single night, whatever the guild's ledger would prefer. |

## Brooke

*Otter, she/her — Commerce / Lore / Entertainment / Science / Crafts.*

Brooke went onto the Dock rope gang at fourteen and has been working her way up the river trade ever since, which is the thing she would tell you if you asked. The ladder is a real one — dock hand, ferry hand, lighterman, wright — and at the top of it is the licence every otter on the water wants: River Otter, the rank that lets an animal take a loaded boat down the whole river alone, on its own word, with nobody sitting behind it. Brooke has been about two years off it for something like eight years.

**Voice.** Cheerful, fast, already halfway out the door. Answers a question with a better question. Says 'right — how does that work, then' more than anything else.

**The arc.** Five careers, one unfinished one. The Commerce card at 1 is the ladder she is actually on, and the tempo verb the Otter charter is built from — she hands the work along and it keeps moving. Lore at 2 is the ferry, where the shift itself changes paws. Entertainment at 3 is the regatta, the one job where her detours pay at once: she gets the whole river back on its feet. Science at 4 is the balloon, kept exactly as it was because it is the best thing she ever did by accident — from up there she can see what the Capital City is about to put up for sale. Crafts at 5 is the boat: four years, one hull, and the thing that finally makes an argument with her expensive. She still is not a River Otter. Added since: a Mooring Hand at 0 with no ability — the rope on the bollard, the bottom rung of the ladder to River Otter.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Brooke**, Aeronaut<br>[`mk_brooke_aeronaut_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_brooke_aeronaut_5) | 5 | Otter · Science | Upgrades Brooke. A long shift: 2 turns, 5 Supply. When Brooke becomes upright, look at the top two cards of the Market Deck and put them back in any order, draw 1 card, and move a shift from one of your Characters to another. | Two years off the River Otter licence for the eighth year running, and a basket over the estuary at first light instead. From up there she can see what is coming into the Capital City before the carts are off the bridge — and, she will tell you, exactly how the whole thing works. |

## Cindy

*Fox, she/her — Civics.*

Cindy sits in the ward court, which is one room over the old assize office with a window that does not shut and a bench somebody made too high. She came up through it the long way — usher, clerk, magistrate — and she has heard every version of every story the First Boroughs has to tell, most of them twice, a good many of them from the same animal on two different days.

**Voice.** Level, unhurried, and comfortable with a silence other animals are not. Asks short questions. Says 'take your time' and means the opposite of what it sounds like.

**The arc.** Four rungs of one career, and the same animal at each of them. The Clerk at 1 only reads the room — the Fox charter's looking, done as a court's paperwork. The Magistrate at 2 does something about what she reads: the clever answer goes back to work. The Circuit Judge at 4 is the fairness printed as a rule — her challenges win ties, and a rival who challenges her pays her for the privilege of being heard. The Justice at 5 is all of it at once, plus the one thing only she does: she puts the ruling to the rival and lets them pick which way they would rather have it, which is what seeing both sides looks like from the other side of the bench.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Cindy**, Clerk of the Court<br>[`mk_cindy_court_clerk_1`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_cindy_court_clerk_1) | 1 | Fox · Civics | When Cindy is recruited, look at your opponent's hand. | Nobody told her the clerk was allowed to read the papers before the bench did. Nobody has told her since, either. |
| **Cindy**, Magistrate<br>[`mk_cindy_magistrate_2`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_cindy_magistrate_2) | 2 | Fox · Civics | Upgrades Cindy. When Cindy becomes upright, one of your opponent's Characters is put back to work. | The remark was made at nine and the yard was still waiting on it at half past. Cindy had not raised her voice once. |
| **Cindy**, Circuit Judge<br>[`mk_cindy_circuit_judge_4`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_cindy_circuit_judge_4) | 4 | Fox · Civics | Upgrades Cindy. Your challenge bids win ties. When an opponent challenges one of your purchases, gain 2 Supply and look at their hand. | Four wards, four benches, one window that shuts and three that do not. She hears the side she stopped believing in all the way to the end, every time, in every one of them. |
| **Cindy**, Justice of the Boroughs<br>[`mk_cindy_justice_of_the_boroughs_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_cindy_justice_of_the_boroughs_5) | 5 | Fox · Civics | Upgrades Cindy. Your challenge bids win ties. At the start of your turn, look at your opponent's hand, then your opponent chooses: one of their Characters is put back to work, or they lose 2 Supply. | Both boroughs bring it to her now, which neither of them enjoys. She gives the losing side the choice of how it loses, listens to the answer, and writes that down too. |

## Cynthia

*Otter, she/her — Science.*

Cynthia is fascinated by science the way some animals are fascinated by a fire — completely, and occasionally at some risk to the furniture. She keeps a bench at the back of the Science hall that the Observatory has quietly stopped asking her to tidy, and she is, by a wide margin, the most easily distracted animal to ever hold a post there.

**Voice.** Bright, rapid, and three subjects ahead of whoever she is talking to. Trails off mid-sentence when something more interesting happens nearby, which is often.

**The arc.** The Junior Lab Assistant at 0 starts the jar. The Paint-Drying Researcher at 1 — named, honestly, for the experiment that started the whole business with the desk — fills it faster. The Combustion Theorist at 3 has learned, the hard way, what the jar is actually for, and starts spending it. The Head of the Absorption Wing at 5 runs the whole operation, jar and all.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Cynthia**, Junior Lab Assistant<br>[`mk_cynthia_junior_lab_assistant_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_cynthia_junior_lab_assistant_0) | 0 | Otter · Science | When Cynthia completes a shift, take a Science token. | She starts the jar on her first day and has never once explained what the tokens are for, mostly because she has not decided yet. |
| **Cynthia**, Paint-Drying Researcher<br>[`mk_cynthia_paint_drying_researcher_1`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_cynthia_paint_drying_researcher_1) | 1 | Otter · Science | Upgrades Cynthia. When Cynthia completes a shift, take 2 Science tokens. | The desk caught fire three feet away and she did not notice, because the paint was the more interesting variable. The desk was replaced within the week; the story was not. |
| **Cynthia**, Combustion Theorist<br>[`mk_cynthia_combustion_theorist_3`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_cynthia_combustion_theorist_3) | 3 | Otter · Science | Upgrades Cynthia. Busy: spend 2 Science tokens to gain 3 Supply. | The desk fire taught her something after all, eventually, several open mic nights later: the jar is worth cashing in, not just keeping. |
| **Cynthia**, Head of the Absorption Wing<br>[`mk_cynthia_head_of_the_absorption_wing_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_cynthia_head_of_the_absorption_wing_5) | 5 | Otter · Science | Upgrades Cynthia. At the start of your turn, take a Science token. Busy: spend 3 Science tokens to gain 6 Supply. | Nobody at the Science hall has ever explained what the Absorption Wing studies. Cynthia has, several times, at length, and nobody has followed any of it. |

## Edwina

*Mouse, she/her — Food / Commerce.*

Edwina knows more about cheese than anybody has any right to, and holds forth on it at a length the Cheese Store's customers have learned to plan around. She keeps the cellar under the shop the way Copper keeps his own — stocked, labelled, and rotated on a schedule only she understands — and can identify anything on the counter blind, by smell, from across the room.

**Voice.** Delighted with herself, half a second before she pops out from somewhere she should not fit. Turns serious the instant the subject is actually cheese.

**The arc.** The Counter Girl at 0 minds the front. The Stall Keeper at 1 works the market day. The Cellar Keeper at 2 knows the whole stock and starts making a rival's day harder for it. The Merchant at 3 is the top of the ladder — the same trick, twice over, for the animal willing to pay for the second fright.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Edwina**, Cheese Counter Girl<br>[`mk_edwina_cheese_counter_girl_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_edwina_cheese_counter_girl_0) | 0 | Mouse · Food | Busy: your opponent discards a card. | She pops up from behind the till at exactly the moment a customer has forgotten she is small enough to be behind it. |
| **Edwina**, Cheese Stall Keeper<br>[`mk_edwina_cheese_stall_keeper_1`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_edwina_cheese_stall_keeper_1) | 1 | Mouse · Commerce | Upgrades Edwina. When Edwina is recruited, your opponent discards a card. | Market day, a full trestle, and Edwina somewhere underneath it, waiting for the one customer who has been rude about her prices. |
| **Edwina**, Cheese Cellar Keeper<br>[`mk_edwina_cheese_cellar_keeper_2`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_edwina_cheese_cellar_keeper_2) | 2 | Mouse · Food | Upgrades Edwina. Busy: your opponent discards a card; you may then pay 2 Supply to make them discard a second. | She knows the cellar's every shelf and every gap behind it, which is a lot of places for a Mouse who has decided today is your day to be waiting. |
| **Edwina**, Cheese Merchant<br>[`mk_edwina_cheese_merchant_3`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_edwina_cheese_merchant_3) | 3 | Mouse · Commerce | Upgrades Edwina. Busy: your opponent discards a card; you may then pay 2 Supply to make them discard 2 more. | She has opinions about the supplier and a memory for every short delivery, and the Counting House has learned to simply believe her the first time. |

## Elvira

*Cat, she/her — Lore / Commerce.*

Elvira reads futures. She started at the fairground with a card table and a cloth over it, and she is still at the fairground most weeks, though the booth has a roof now and a queue that starts before she does.

**Voice.** Warm, bright, and entirely unembarrassed. Delivers a catastrophe and a compliment in the same breath. 'Oh, that's a bad card, love — you'll be fine.'

**The arc.** Four windows and a coin. The Tea-Leaf Reader at 0 reads her own cards; the Fairground Booth at 2 reads the Capital City's, or the rival's, on the toss; the Fortune Teller at 3 is the half of the job she is actually good at — she pays out when the season has gone against you; the Reader of the Long Odds at 4 is all three windows at once and the Cat signature under it, because she gets up when she feels like getting up.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Elvira**, Tea-Leaf Reader<br>[`mk_elvira_tea_leaf_reader_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_elvira_tea_leaf_reader_0) | 0 | Cat · Lore | Busy: toss a coin. Heads, look at the top two cards of your deck and put any of them on the bottom; tails, look at the top card of your opponent's deck. | A cup, a saucer and whatever is left in the bottom of it. Elvira has never once said she could not see anything. |
| **Elvira**, Fairground Booth<br>[`mk_elvira_fairground_booth_2`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_elvira_fairground_booth_2) | 2 | Cat · Commerce | Upgrades Elvira. When Elvira becomes upright, toss a coin. Heads, look at the top two cards of the Market Deck; tails, look at the top two cards of your opponent's deck. | Sixpence a reading, a shilling if you want it written down, and a queue that starts before she does. |
| **Elvira**, Fortune Teller<br>[`mk_elvira_fortune_teller_3`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_elvira_fortune_teller_3) | 3 | Cat · Lore | Upgrades Elvira. Whenever Supply is taken from you, gain 2 Supply and draw 1 card. | She told the ferry office there was danger on the water for a fortnight. There was no danger on the water for a fortnight. She still sat with the two of them who could not sleep for it. |
| **Elvira**, Reader of the Long Odds<br>[`mk_elvira_reader_of_long_odds_4`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_elvira_reader_of_long_odds_4) | 4 | Cat · Commerce | Upgrades Elvira. At the start of your turn, toss a coin. Heads, look at the top two cards of the Market Deck and put them back in any order; tails, look at the top two cards of your opponent's deck. Busy, once per game: Elvira stands straight back up. | Water in the cellar on a Thursday, she said, and there was — three Thursdays later, which she counts and the cellar does not. |

## Fingers

*Raccoon, he/him — Civics / Crafts / Agriculture.*

Nobody in either borough can say for certain how Fingers gets where he gets. He has been seen coming down off the Observatory dome, coming up out of a cellar he had no key to, and standing in a queue that had not existed thirty seconds before — climbing, diving, picking a lock that everyone agrees should not have been pickable, or simply walking in the front door as if that had been an option the whole time. Ask him and he shrugs; the shrug has become, over the years, a kind of local weather report, understood by everybody and explained by nobody.

**Voice.** Short, amused, and never in a hurry despite always being somewhere else a moment later. Answers "how did you get in here" with a different true answer every time.

**The arc.** The Rooftop Runner at 0 is already gone before the job is finished being described. The Chimney Sweep at 1 and the Root-Cellar Diver at 2 are the same animal working two different holes into the town. The Master Locksmith at 3 goes looking for his own cousins in the deck. The One Who Gets In at 4 is the exception the whole family is built on: Fingers may swap freely between any of his own cards, cheaper or dearer, because for him alone the ladder runs both ways.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Fingers**, Rooftop Runner<br>[`mk_fingers_rooftop_runner_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_fingers_rooftop_runner_0) | 0 | Raccoon · Civics | When Fingers is recruited, draw 1 card. | He was sent for and was already there. Ask how and you get the shrug. |
| **Fingers**, Chimney Sweep<br>[`mk_fingers_chimney_sweep_1`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_fingers_chimney_sweep_1) | 1 | Raccoon · Crafts | Upgrades Fingers. Busy: look at the top card of the Market Deck. | Up one flue and down the next, and he comes out the other end with a fair idea of what the Capital City has coming before it has finished sweeping its own chimney. |
| **Fingers**, Root-Cellar Diver<br>[`mk_fingers_root_cellar_diver_2`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_fingers_root_cellar_diver_2) | 2 | Raccoon · Agriculture | Upgrades Fingers. Busy: take a card out of the City Dump. | Under the grange, past a door nobody left unlocked, and up again with exactly the thing that was wanted. The grange has stopped asking which door. |
| **Fingers**, Master Locksmith<br>[`mk_fingers_master_locksmith_3`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_fingers_master_locksmith_3) | 3 | Raccoon · Civics | Upgrades Fingers. Busy, pay 3 Supply: search your deck for a Fingers card, take it into your hand, then shuffle. | He picked the ward court's lock for practice once, put everything back exactly as it was, and left a note saying so. The note is still filed under Ned's unsigned column. |
| **Fingers**, The One Who Gets In<br>[`mk_fingers_the_one_who_gets_in_4`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_fingers_the_one_who_gets_in_4) | 4 | Raccoon · Crafts | Upgrades Fingers. Busy: you may recruit another Fingers card from your hand for free, cheaper or dearer than this one — for Fingers alone, the ladder runs both ways. | Every other animal in the First Boroughs can only ever move up. Fingers has never once seen why that should apply to him. |

## Henrietta

*Rabbit, she/her — Civics.*

Henrietta runs the front desk at the Hiring Hall, which means she runs the board, the queue and, by her own account, most of what anybody in the borough knows about anybody else. She took the desk over from nobody in particular — it was simply there, and she was better at it than whoever had it before — and she has not stopped talking since, in the friendliest possible way, to every animal who has ever stood in that queue.

**Voice.** Fast, warm, and unable to finish a sentence about the weather without mentioning three animals by name. Never malicious, never quite on topic.

**The arc.** The Front Desk Clerk at 0 does what the desk is actually for — a name on the board, a small nudge. The Placement Officer at 2 works a room for an afternoon. The Head of Rabbit Recruitment at 4 has stopped pretending it is only paperwork: she gets on the warren telegraph and does not stop until the best Rabbit in three wards is standing in your town.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Henrietta**, Front Desk Clerk<br>[`mk_henrietta_front_desk_clerk_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_henrietta_front_desk_clerk_0) | 0 | Rabbit · Civics | When Henrietta is recruited, you may recruit a Rabbit costing 1 or less from your hand for free; if you do, gain 1 Supply. | She has the board updated before the ink on the posting is dry, and a full account of the posting animal's cousins before anybody has asked for one. |
| **Henrietta**, Placement Officer<br>[`mk_henrietta_placement_officer_2`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_henrietta_placement_officer_2) | 2 | Rabbit · Civics | Upgrades Henrietta. Busy: you may recruit a Rabbit costing 3 or less from your hand for free; if you do, gain 2 Supply. | She works the whole room for a good posting — the warren, the cousins, the animal who is definitely ready to move on from the Gate Hut — and never once mentions that she is working it. |
| **Henrietta**, Head of Rabbit Recruitment<br>[`mk_henrietta_head_of_rabbit_recruitment_4`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_henrietta_head_of_rabbit_recruitment_4) | 4 | Rabbit · Civics | Upgrades Henrietta. Busy: you may recruit a Rabbit from your hand for free; if you do, gain 3 Supply. | The title is new and she gave it to herself, and nobody has argued, because when the good Rabbits are worth having Henrietta is on the warren telegraph until they are standing in your town, several stories the richer for the trip. |

## Jessica

*Owl, she/her — Entertainment / Civics / Lore.*

Jessica teaches the little ones, and she has never in her life set homework. The borough's parents raised this with her once, some years ago, in a meeting; Jessica agreed that homework was a very good idea and said she would think about it, and then went back and taught them the constellations as a round with actions. The kittens can name every one of them. Not one of them can spell any of them. The parents have stopped bringing it up.

**Voice.** Delighted, fast, and slightly out of breath. Everything is an activity. Ends explanations with "— right, everybody up".

**The arc.** Four rungs and no homework. The Song and Game Leader at 0 is the Owl signature done literally: everybody up, on their feet, now. The Infant Teacher at 1 and the Night School Teacher at 2 start paying for the next rung — a promotion in your own town costs less. The Headmistress at 4 hands that rate out every morning, at double, which is what ten years of the night school actually amounts to.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Jessica**, Teacher of the Boroughs<br>[`mk_jessica_teacher_of_the_boroughs_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_jessica_teacher_of_the_boroughs_5) | 5 | Owl · Lore | Upgrades Jessica. A long shift: 2 turns, 5 Supply. At the start of your turn, one of your Characters turns one step toward upright, draw 1 card, and your recruits that upgrade a Character you control cost 1 less this turn. | Both boroughs send their little ones to her now and she has still never set homework. The constellations are a round with actions, the ward bylaws are a round with actions, and there is a generation of this town that can sing the drainage schedule and cannot spell it. |

## Jim

*Raccoon, he/him — Science / Lore / Commerce.*

Jim writes a blog nobody asked for about a company nobody in the First Boroughs had heard of until he started. It is called the same thing it has always been called, it goes out whenever he finishes it, and the borough reads it — partly because he is a genuinely good explainer of how a thing works, and partly to find out what he has bought this week.

**Voice.** Fast, delighted, and forty words past the point. Opens with 'okay so'. Has a strong view on a thing he has owned for four hours.

**The arc.** Every rung of Jim turns Supply into cards, because that is what he does with money. The Blogger at 0 and the Programmer at 2 buy a card or two at the counter. The Early Adopter at 4 pays the launch-day price for the privilege of having it first. The Fanboy at 5 queues all night and is not in a fit state to work afterwards — he draws more cards for the price than anything else in the collection, and then he goes to Unemployment, which is the joke the borough has been making about him for years and is finally printed.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Jim**, Gadget Blogger<br>[`mk_jim_gadget_blogger_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_jim_gadget_blogger_0) | 0 | Raccoon · Lore | Busy: pay 1 Supply to draw 1 card. | Eleven hundred words on a shutter mechanism, posted at four in the morning, and the borough read all of it. |
| **Jim**, Hobby Programmer<br>[`mk_jim_hobby_programmer_2`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_jim_hobby_programmer_2) | 2 | Raccoon · Science | Upgrades Jim. Busy: pay 2 Supply to draw 2 cards. | Built out of what was in the bin behind the works, and better than the thing it was copying. He will tell you that too. |
| **Jim**, Early Adopter<br>[`mk_jim_early_adopter_4`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_jim_early_adopter_4) | 4 | Raccoon · Commerce | Upgrades Jim. At the start of your turn, you may pay 4 Supply to draw 2 cards. | Launch day, second in the queue, and the patch of pale fur on the left of his head is from the last one. He is not embarrassed about the candle. |
| **Jim**, FutureTech Fanboy<br>[`mk_jim_futuretech_fanboy_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_jim_futuretech_fanboy_5) | 5 | Raccoon · Science | Upgrades Jim. Busy: pay 2 Supply to draw 4 cards, then Jim goes to your Unemployment. | Two nights on the pavement outside the FutureTech store for a thing he already owns a working version of. He is not at the yard on Thursday and everybody knew he would not be. |

## Kevin

*Fox, he/him — Civics / Food / Crafts.*

Kevin came out from the Capital City at seventeen because somebody told him there was work, and there was. He is the easiest hire in the First Boroughs: he says yes before you have finished the sentence, he is at the yard before the animal who hired him, and for about a fortnight he is worth two of anybody. Then the fortnight ends. Kevin goes flat all at once, sleeps through a morning, apologises far more than anyone wants him to, and is on to the next thing by the end of the week.

**Voice.** Eager, loud, slightly out of breath. Says 'yeah — yeah, no, I can do that', and means it, right up until he cannot.

**The arc.** One card, hired out of the Capital City and built the way the maker described him. He arrives with money in his paw and works flat out for three Supply — then two, then one, because that is how Kevin works and always has — throws Supply onto an auction you are winning, and after three of your turns he is gone back to the city. Get the first shift out of him; that is the one you are paying for.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Kevin**, Construction<br>[`mk_kevin_construction_4`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_kevin_construction_4) | 4 | Fox · Crafts | Upgrades Kevin. A flat-out shift: 1 turn, 7 Supply, and each shift Kevin works pays 1 less Supply than the last, down to 1. When Kevin is recruited, take 2 Building tokens and Buildings cost you 2 less this turn. Busy: raise one of your open bids by 2. | Twelfth job, and the best fortnight anybody has had out of him: he is up the scaffold before the yard is unlocked and the roof is on by the time the fortnight ends. Then it ends. The borough has learned to plan the whole build around Kevin's first two weeks. |

## Marmalade

*Cat, he/him — Food / Commerce.*

Marmalade was a horrible kitten. He shoved, he took things, he was walked home by Biff more times than anyone has the heart to count, and the borough had more or less decided what he was going to be. Then somebody put him in front of a bowl of dough to keep his paws busy, and he was quiet for the first time in his life.

**Voice.** Warm, distractible, covered in flour. Starts sentences with 'right, so listen' and ends them with a bun in your paw.

**The arc.** Every rung of Marmalade gets the town up and moving earlier, because that is what the bread does. The Night Baker (0) works the long patient shift and has everyone a step further along by the Ready. The Dough Kneader (1) and the Market Baker (2) do it at the door, the moment he is hired, and the Market Baker takes a coin at the counter for it. The Neighborhood Baker (3) hands the tray round and puts one of your animals back on its feet outright. The Harvest Head Baker (5) is the whole bakery: the first shift each turn pays extra, and once a game Marmalade is simply up before the rest of the town, which is the Cat's own trick and his oldest habit. Added since: an Oven Keeper at 4 who is paid every morning the town has another Cat in it — the kittens, served first, paying him back.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Marmalade**, Baker to the Guilds<br>[`mk_marmalade_guild_baker_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_marmalade_guild_baker_5) | 5 | Cat · Commerce | Upgrades Marmalade. A long shift: 2 turns, 5 Supply. At the start of your turn, one of your Characters turns one step toward upright, your Characters advance an extra step at your next Ready, and gain 1 Supply. | Six counters take his bread now and the guilds settle quarterly, which means Marmalade keeps books — badly, and at four in the morning, in flour, on the back of an order sheet. The whole borough is up earlier than it means to be because of what comes out of that oven. |

## Nancy

*Raccoon, she/her — Civics.*

Nancy runs the Hiring Hall's temp board, which is a smaller, louder operation than Henrietta's front desk and entirely Nancy's own: short jobs, fast turnaround, an animal in Unemployment on Monday and back on their feet by Wednesday if Nancy has anything to say about it, which she always does.

**Voice.** Loud, fast, no patience for a sob story that could be a two-sentence job order instead. Softens the instant somebody actually needs the help.

**The arc.** The Temp Agency Runner at 0 does the small, fast version. The Temp Agency Manager at 2 runs the whole board and gets the better rate doing it.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Nancy**, Temp Agency Runner<br>[`mk_nancy_temp_agency_runner_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_nancy_temp_agency_runner_0) | 0 | Raccoon · Civics | When Nancy is recruited, you may rehire a Character from your Unemployment for 1 less Supply. | She has somebody on their feet again before the ink on the Unemployment slip is dry, nails clicking on the counter the whole time she is doing it. |
| **Nancy**, Temp Agency Manager<br>[`mk_nancy_temp_agency_manager_2`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_nancy_temp_agency_manager_2) | 2 | Raccoon · Civics | Upgrades Nancy. Busy: you may rehire a Character from your Unemployment for 2 less Supply. | She runs the whole board herself now, and the Hiring Hall's longer-serving clerks have learned better than to argue with her about the rate twice. |

## Robbie

*Badger, he/him — Lore / Civics.*

Robbie reports for the borough paper, which is four sheets and a Thursday, and he has never filed a clean headline in his life. The drainage review was DOWN THE PLUGHOLE. The bridge inquiry was A SPAN OF ATTENTION. He laughed at both of them in the office, alone, for some time.

**Voice.** Cheerful, punning, and unbothered by silence after a joke. Says 'you'll like this one' and is always wrong about that.

**The arc.** Five rungs of the same notebook, and the market gets easier to read at each one. The Cub Reporter at 0 only looks at what is coming; the Columnist at 1 puts it back in the order he wants it in; the Features Writer at 2 does it off a Busy shift, which is the paper coming out whether or not he stood up. The Editor at 3 is the Badger signature in print — the shared shock that lands on both towns goes in the spike and does not land on his. The Editor-in-Chief at 5 reads three deep, sinks a lot to the bottom of the Market Deck where nobody bids on it this year, and still spikes the weather.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Robbie**, Cub Reporter<br>[`mk_robbie_cub_reporter_0`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_robbie_cub_reporter_0) | 0 | Badger · Lore | When Robbie is recruited, look at the top two cards of the Market Deck. | DOWN THE PLUGHOLE, on the drainage review. He laughed in the office for some time, alone. |
| **Robbie**, Columnist<br>[`mk_robbie_columnist_1`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_robbie_columnist_1) | 1 | Badger · Civics | Upgrades Robbie. When Robbie becomes upright, look at the top two cards of the Market Deck and put them back in any order. | A SPAN OF ATTENTION, on the bridge inquiry. Four sheets and a Thursday, and the ward hall reads every one of them. |
| **Robbie**, Features Writer<br>[`mk_robbie_features_writer_2`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_robbie_features_writer_2) | 2 | Badger · Lore | Upgrades Robbie. Busy: look at the top two cards of the Market Deck and put them back in any order. | The suit that week had a repeating pheasant on it. Asked where it came from, he said it was off the peg — and then, after a pause nobody filled, off the peg-asant. |
| **Robbie**, Editor<br>[`mk_robbie_editor_3`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_robbie_editor_3) | 3 | Badger · Civics | Upgrades Robbie. At the start of your turn, the next card revealed in the Capital City does not affect you, and look at the top two cards of the Market Deck. | He is at the back of the hall at half past eleven with the notebook out, and the story runs whether or not anybody rang back. |
| **Robbie**, Editor-in-Chief<br>[`mk_robbie_editor_in_chief_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_robbie_editor_in_chief_5) | 5 | Badger · Lore | Upgrades Robbie. A patient shift: 2 turns, 3 Supply. At the start of your turn, look at the top two cards of the Market Deck, put one of them to the bottom, and the next card revealed in the Capital City does not affect you. | The paper is six sheets now and still comes out on a Thursday. Whatever the Capital City had lined up for the front of the display, Robbie has seen it, moved it, and made a joke about it that only he enjoyed. |

## Yellow

*Squirrel, he/him — Entertainment.*

Yellow came up from the suburbs at the edge of the Capital City telling anyone who'd listen exactly how fresh his rhymes were, and arrived in the First Boroughs to find a town with an open mic list, a booker who does not care where you're from, and absolutely no street to speak of. He has not let either fact slow him down. His whole catalogue is built out of what the borough actually has to offer — a verse about the seed bank's open day, four bars about Marmalade's ovens, an entire closing number about peanut butter and pecan pie that has nothing to do with anything and that Cassadee has stopped trying to cut from his set.

**Voice.** Loud, proud, entirely unbothered by the gap between the persona and the postcode. Works 'suburbs' and 'pecan pie' into everything, unironically.

**The arc.** Priced differently for what they actually promise: the cheap one shelters him the week he arrives, the way any protected animal is sheltered, until your next turn. The dear one doesn't need the shelter renewed, because he simply does not go to Unemployment, full stop.

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Yellow**, Rapper<br>[`mk_yellow_rapper_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_yellow_rapper_5) | 5 | Squirrel · Entertainment | Upgrades Yellow. A long shift: 2 turns, 5 Supply. Yellow cannot be sent to Unemployment. When Yellow is recruited, another Character you control cannot be targeted by an opponent until your turn after next. At the start of your turn, draw 1 card and gain 1 Supply. | The suburbs record is finished, it is forty minutes long, and side two is entirely about the seed bank. Cassadee has stopped trying to cut anything from the set and the hall sells out anyway, which Yellow has been saying would happen since the week he arrived. |

## The Capital City

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **The Grocery Store**, Town Building<br>[`mk_tb_grocery_store`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_tb_grocery_store) | 2 | Town Building | At the start of your turn, gain 2 Supply. | Nothing about it is remarkable, which is rather the point: bread, milk, a till that adds up, and a queue that never once talks about the Capital City. |
| **Starfish Coffee**, Town Building<br>[`mk_tb_starfish_coffee`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_tb_starfish_coffee) | 3 | Town Building | At the start of your turn, one of your Characters turns one step toward upright. | The land's coffee chain, the borough's branch, and not an animal behind the counter: three automatons, a menu board that changes itself, and a FutureTech name on the receipt in very small print. The queue moves faster than anywhere else in town. |
| **The Ice Cream Shop**, Town Building<br>[`mk_tb_ice_cream_shop`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_tb_ice_cream_shop) | 3 | Town Building | At the start of your turn, one of your opponent's Characters is put back to work. This does not happen again until your turn after next. | Owned by an old Raccoon who retired to the arctic and never quite got round to selling it, and run to the inch by four teenagers who have never met him. Half the other town is in the queue on a warm afternoon and none of them are at work. |
| **The Clinic**, Town Building<br>[`mk_tb_clinic`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_tb_clinic) | 3 | Town Building | At the start of your turn, your recruits that upgrade a Character you control cost 2 less this turn. | Two rooms, a scrubbed floor and a coral tank in the waiting office that the babies of both boroughs will sit in front of for an hour. Whatever an animal came in unable to do, they generally go out able to do it. |
| **The Science Lab**, Town Building<br>[`mk_tb_science_lab`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_tb_science_lab) | 3 | Town Building | At the start of your turn, you may recruit a Science Character costing 2 or less from your hand for free. | FutureTech funds it quietly, a floor below the Hospital's books and two above where anybody is allowed to ask questions, and the borough's own Science hall has stopped minding where the money comes from. |
| **The FutureTech Store**, Town Building<br>[`mk_tb_futuretech_store`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_tb_futuretech_store) | 4 | Town Building | At the start of your turn, gain 1 Supply for each Building you have raised, up to 4. | Everything in the window is a month old and everything behind the counter is a fortnight. Jim is in the queue on launch day whatever it is, and the whole street is richer for the queue. |
| **The Hospital**, Capital City Building<br>[`mk_bld_hospital`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_bld_hospital) | 7 | Capital City Building | At the start of your turn, you may rehire a Character from your Unemployment for 3 less Supply, and they come back upright. | Pristine, quiet, and owned since the spring by FutureTech, which repainted the wards and kept every one of the staff. An animal who stops getting up goes in through those doors and comes out fit for a shift, which is more than the borough could say a year ago. |
| **FutureTech HQ**, Capital City Building<br>[`mk_bld_futuretech_hq`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_bld_futuretech_hq) | 10 | Capital City Building | At the start of your turn, every one of your Characters who is not upright stands up. | Glass to the fourth floor, a lobby you may walk through and two floors you may not, and a company that posts a record quarter in a year the bridge went. Cornelius will show you everything. He will show you the second floor last, and then the tour will be over. |

## Events and weather

| Card | Cost | Kind | What it does | The scene |
| --- | --- | --- | --- | --- |
| **Tax Day**<br>[`mk_tax_day`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_tax_day) | 0 | Event | Requires a Commerce Character. Gain 1 Supply for each Character in your town, up to 8. | One morning a year the whole borough queues at the assize office with a tin and a grievance, and one morning a year the ward is solvent. Peanut has the desk. Cindy has the room next door, for the grievances. |
| **FutureTech Release Day**<br>[`mk_futuretech_release_day`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_futuretech_release_day) | 0 | Event | Requires a Science Character. Pay 2 Supply: search your deck for a card that says FutureTech, take it into your hand, and shuffle. | The line starts at the store and goes past the coffee bar, which is FutureTech's too, and round to the HQ steps, which are FutureTech's as well. Jim is second. Jim is always second, and has never once explained who is first. |
| **Otter Time!**<br>[`mk_otter_time`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_otter_time) | 0 | Event | Requires an Otter. Recruit any number of Otters from your hand for free, then pay 2 Supply to search your deck for an Otter, take it into your hand, and shuffle. | It is not on any calendar and it is not anybody's idea. Somebody goes in off the ferry steps, and within the hour there is no otter in either borough doing the thing they were doing. |
| **The Casino Fundraiser**<br>[`mk_dx_casino_fundraiser`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_dx_casino_fundraiser) | 0 | Shared weather | On reveal: both Mayors lose half their Supply, then both Mayors gain 4 Supply. Goes to the City Dump. | Table games in the Long Hall for one night, run for both boroughs by whoever the Capital City sends out, and the till comes out even by morning whatever went in. |
| **Raccoon Family Reunion**<br>[`mk_raccoon_family_reunion`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_raccoon_family_reunion) | 0 | Event | Requires a Raccoon. Search your deck for any number of Raccoons and recruit any number of Raccoons from your hand and deck, as many as your town has room for, then every animal in your town becomes unemployed. | Every cousin Fingers ever vouched for, and several nobody can place, in one town on one afternoon. By evening the board is bare, the Hiring Hall has no idea what happened, and nobody minds even slightly. |
| **Friendship Festival**<br>[`mk_friendship_festival`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_friendship_festival) | 0 | Event | Requires a Cat and a Mouse. Recruit any number of Cats and Mice from your hand for free, matched pair for pair, then pay 2 Supply to search your deck for one Cat and one Mouse, take them into your hand, and shuffle. | The borough decided some years ago that a Cat and a Mouse ought to have one day a year they are told to get along, and has been quietly pleased ever since at how often it works. |
| **Eustace's Ball**<br>[`mk_eustaces_ball`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_eustaces_ball) | 0 | Event | Requires Eustace. Your Cats and Badgers advance an extra step at your next Ready. | Eustace throws one for no occasion anybody can name, the Cats leave early because they please and the Badgers leave early because for once nothing needs finishing, and both are back at work sooner than the evening should have allowed. |
| **The Mayor's Conference**<br>[`mk_dx_mayors_conference`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_dx_mayors_conference) | 0 | Shared weather | On reveal: both Mayors search their deck for a Character and hire them, entering Busy, and nobody's Characters advance at the next Ready. Goes to the City Dump. | Both Mayors are called to the Capital City on the same short notice, and both come home with somebody new and no time yet to put them properly to work. |
| **Eustace**, Socialite<br>[`mk_eustace_socialite_3`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_eustace_socialite_3) | 3 | Event | Hired from the Capital City; enters Busy. When Eustace is recruited, your Characters advance an extra step at your next Ready. | He does nothing you could point to and somehow the whole afternoon is over before you meant it to be, and everybody in the room is charmed rather than annoyed about it. |
| **Cornelius**, FutureTech CEO<br>[`mk_cornelius_futuretech_ceo_5`](https://github.com/jxburros/Animal-Friends-Test-1/blob/main/spec/maker_card_set.json#:~:text=mk_cornelius_futuretech_ceo_5) | 5 | Event | Hired from the Capital City; enters Busy, and goes back to the city after three of your turns, where he may be hired again. At the start of your turn, Buildings cost you 3 less. When Cornelius becomes upright, every lot in the Capital City with a roof on it costs you 2 less. | Forty minutes, three automatons and a folder. The schedule works, the roof went up for nothing, and the ward cannot now find the bit it agreed to in writing. |

