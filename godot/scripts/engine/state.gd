extends RefCounted
class_name StateLib

## Game state construction and pure query helpers, ported line-for-line from
## src/engine/state.js. State is kept as a plain Dictionary (players: Array of
## Dictionaries, card refs as {"uid":.., "cardId":..}) rather than typed
## classes, on purpose: it keeps this port structurally comparable to the JS
## engine's serialize() output field-for-field, which is what the parity
## harness (godot/tools/state_check.gd vs state_reference.mjs) diffs against.
##
## Godot's JSON parser returns every JSON number as float, never int — the
## loader (card_set.gd) does not convert this, so code here calls int() at
## every point a count, index, or id needs integer semantics (mirroring a
## distinction JS doesn't have to make).

const UPRIGHT := 0
const BUSY := 270

static func index_set(cset: Dictionary) -> Dictionary:
	var cards_by_id := {}
	for c in cset.get("cards", []):
		cards_by_id[c["id"]] = c
	var decks_by_id := {}
	for d in cset.get("decks", []):
		decks_by_id[d["id"]] = d
	var indexed := cset.duplicate()
	indexed["cardsById"] = cards_by_id
	indexed["decksById"] = decks_by_id
	return indexed

static func card_def(state: Dictionary, card_id: String) -> Dictionary:
	var c = state["set"]["cardsById"].get(card_id)
	if c == null:
		push_error("Unknown card id %s" % card_id)
	return c

static func rank_of(rules: Dictionary, cost) -> String:
	var cost_i := int(cost)
	for rank_name in rules["ranks"].keys():
		var r = rules["ranks"][rank_name]
		if cost_i >= int(r["minCost"]) and cost_i <= int(r["maxCost"]):
			return rank_name
	return "master"

static func entry_orientation(rules: Dictionary, cost) -> int:
	return int(rules["ranks"][rank_of(rules, cost)]["entryOrientation"])

## What a Character's next shift actually pays (see shiftOutputFor in state.js
## for the decay rationale: a shift may pay less each time the animal works,
## down to a floor).
static func shift_output_for(def: Dictionary, stack: Dictionary):
	var shift: Dictionary = def.get("shift", {})
	var decay = shift.get("decay", 0)
	if not decay:
		return shift.get("output")
	var worked = stack.get("shiftsWorked", 0) if stack else 0
	return max(shift.get("minOutput", 0), shift["output"] - decay * worked)

static func next_uid(state: Dictionary) -> int:
	state["uidCounter"] = int(state.get("uidCounter", 0)) + 1
	return state["uidCounter"]

## Resolve a deck reference: either the id of a deck in the set, or a deck
## object {id?, name?, list: {cardId: count}} built in the deck builder.
static func resolve_deck(cset: Dictionary, ref) -> Dictionary:
	if ref is Dictionary:
		if not (ref.get("list") is Dictionary):
			push_error("Custom deck needs a card list")
		for card_id in ref["list"].keys():
			if not cset["cardsById"].has(card_id):
				push_error("Unknown card id %s in deck" % card_id)
		var out := ref.duplicate()
		out["id"] = ref.get("id", "custom")
		out["name"] = ref.get("name", "Custom Deck")
		return out
	var deck = cset["decksById"].get(ref)
	if deck == null:
		push_error("Unknown deck %s" % str(ref))
	return deck

## Resolve a Market Deck reference: an id from set.marketDecks, a deck object,
## or nothing (the first listed deck, falling back to the legacy single
## set.marketDeck field).
static func resolve_market_deck(cset: Dictionary, ref):
	var decks: Array = cset.get("marketDecks", [])
	if decks.is_empty() and cset.has("marketDeck"):
		decks = [cset["marketDeck"]]
	if ref is Dictionary:
		return ref
	if ref:
		for d in decks:
			if d["id"] == ref:
				return d
		push_error("Unknown market deck %s" % str(ref))
	if decks.is_empty():
		push_error("The card set defines no Market Deck")
	return decks[0]

## Build the Market Deck. `spec` is either a plain array of card ids (fixed
## deck) or {always, statuePool, statueCount, pool, poolSize}: everything in
## `always`, a `statueCount` sample of `statuePool`, and a `poolSize` sample
## of `pool` — see game.json's market.$comment and state.js's buildMarketDeck
## for the full design rationale (kept short here to avoid duplicating it).
static func build_market_deck(state: Dictionary, spec) -> Array:
	if spec is Array:
		return spec.duplicate()
	var always: Array = spec.get("always", []).duplicate()
	var statue_pool: Array = spec.get("statuePool", []).duplicate()
	if not statue_pool.is_empty():
		var want: int
		if spec.has("statueCount"):
			want = int(spec["statueCount"])
		else:
			want = int(state.get("rules", {}).get("victory", {}).get("statueTotal", statue_pool.size()))
		var shuffled_statues: Array = Rng.shuffle(state, statue_pool)
		always.append_array(shuffled_statues.slice(0, min(want, statue_pool.size())))
	var pool: Array = Rng.shuffle(state, spec.get("pool", []).duplicate())
	var want_pool: int = pool.size() if not spec.has("poolSize") else min(int(spec["poolSize"]), pool.size())
	var picked: Array = pool.slice(0, want_pool)
	var min_disruptions := int(spec.get("minDisruptions", 0))
	if min_disruptions > 0 and state.has("set"):
		var is_reveal := func(id): return state["set"]["cardsById"].get(id, {}).get("type") == "disruption"
		var have := 0
		for id in picked:
			if is_reveal.call(id):
				have += 1
		if have < min_disruptions:
			var spare: Array = []
			for id in pool.slice(want_pool):
				if is_reveal.call(id):
					spare.append(id)
			var i := picked.size() - 1
			while i >= 0 and have < min_disruptions and not spare.is_empty():
				if not is_reveal.call(picked[i]):
					picked[i] = spare.pop_front()
					have += 1
				i -= 1
	return always + picked

static func _make_player(state: Dictionary, index: int, player_name: String, deck_ref) -> Dictionary:
	var deck := resolve_deck(state["set"], deck_ref)
	var cards := []
	for card_id in deck["list"].keys():
		var count := int(deck["list"][card_id])
		for i in range(count):
			cards.append({"uid": next_uid(state), "cardId": card_id})
	Rng.shuffle(state, cards)
	return {
		"index": index,
		"name": player_name,
		"deckId": deck["id"],
		"deckName": deck.get("name", deck["id"]),
		"deck": cards,
		"hand": [],
		"town": [],
		"events": [],
		"dump": [],
		"unemployment": [],
		"victoryRow": [],
		"buildings": [],
		"reshuffles": 0,
		"tokens": {},
		"held": [],
		"supply": 0,
		"escrow": 0,
		"mods": [],
		"turn": fresh_turn_counters(),
		"stats": {"supplyEarned": 0, "shiftsCompleted": 0, "recruits": 0, "eventsPlayed": 0, "announcements": 0, "challenges": 0, "purchasesWon": 0, "buildingsRaised": 0},
	}

static func fresh_turn_counters() -> Dictionary:
	return {"eventsPlayed": 0, "announcements": 0, "bids": 0, "recruits": 0, "shiftsCompleted": 0, "buildingsRaised": 0, "readied": 0, "usedOnce": [], "ingenuityUsed": false}

## Create a new game. `opts` mirrors createGame's in state.js:
## {seed, decks:[deckRef, deckRef], names:[..], market}.
static func create_game(rules: Dictionary, cset: Dictionary, opts: Dictionary = {}) -> Dictionary:
	var indexed: Dictionary = cset if cset.has("cardsById") else index_set(cset)
	var seed: int = int(opts.get("seed", randi() % (1 << 31)))
	var state := {
		"rules": rules,
		"set": indexed,
		"seed": seed,
		"rng": Rng.seed_rng(seed),
		"uidCounter": 0,
		"turnNumber": 0,
		"active": 0,
		"phase": "setup",
		"players": [],
		"market": {"deckId": null, "deckName": "", "deck": [], "city": [], "cityDump": [], "outOfPlay": [], "pending": [], "revealQueue": [], "clearing": {}, "turnsSinceGain": 0},
		"log": [],
		"winner": null,
		"result": null,
		"actionCount": 0,
	}
	var deck_ids = opts.get("decks", [indexed["decks"][0]["id"], indexed["decks"][1 % indexed["decks"].size()]["id"]])
	var names = opts.get("names", ["Mayor 1", "Mayor 2"])
	state["players"] = [_make_player(state, 0, names[0], deck_ids[0]), _make_player(state, 1, names[1], deck_ids[1])]
	var setup: Dictionary = rules["setup"]
	for i in range(state["players"].size()):
		var p = state["players"][i]
		p["supply"] = int(setup["startingSupply"]) + (int(setup.get("secondPlayerBonusSupply", 0)) if i == 1 else 0)
		var hand_size := int(setup["startingHand"]) + (int(setup.get("secondPlayerBonusCards", 0)) if i == 1 else 0)
		for k in range(hand_size):
			if not p["deck"].is_empty():
				p["hand"].append(p["deck"].pop_front())
	var market_deck := resolve_market_deck(indexed, opts.get("market"))
	state["market"]["deckId"] = market_deck.get("id", "market")
	state["market"]["deckName"] = market_deck.get("name", state["market"]["deckId"])
	state["market"]["deck"] = Rng.shuffle(state, build_market_deck(state, market_deck))
	refill_city(state)
	if rules.get("market", {}).get("disruptions", {}).get("skipDuringSetup", false):
		var set_aside: Array = state["market"]["revealQueue"].duplicate()
		state["market"]["revealQueue"].clear()
		state["market"]["cityDump"].append_array(set_aside)
	var start_tokens := int(rules.get("tokens", {}).get("startingTokens", 0))
	if start_tokens > 0:
		for p in state["players"]:
			for kind in token_kinds(indexed):
				add_tokens(p, kind["key"], start_tokens, rules.get("tokens", {}).get("cap"))
	state["phase"] = "start"
	log(state, null, "A new game of %s begins in the %s market. %s plays %s; %s plays %s." % [
		indexed.get("name", ""), state["market"]["deckName"],
		names[0], state["players"][0]["deckName"], names[1], state["players"][1]["deckName"],
	], {"kind": "gameStart", "market": state["market"]["deckId"]})
	return state

## The Capital City ages: at the start of each round one card nobody is
## bidding on leaves the display and is replaced, so the market keeps turning
## over rather than only sweeping once it has gone completely dead.
static func age_city(state: Dictionary) -> int:
	var m: Dictionary = state["market"]
	var aging: Dictionary = state["rules"].get("market", {}).get("aging", {})
	if not aging.get("enabled", false) or m["city"].is_empty():
		return 0
	var under_auction := {}
	for pd in m["pending"]:
		under_auction[pd["cardId"]] = true
	var aged := 0
	var cards_per_round := int(aging.get("cardsPerRound", 1))
	for n in range(cards_per_round):
		var idx := -1
		for i in range(m["city"].size()):
			var cid = m["city"][i]
			if aging.get("skipCardsUnderAuction", false) and under_auction.has(cid):
				continue
			idx = i
			break
		if idx < 0:
			break
		var card_id = m["city"][idx]
		m["city"].remove_at(idx)
		var def := card_def(state, card_id)
		m["clearing"].erase(card_id)
		if def["type"] == "statue" and aging.get("statuesReturnToDeck", true) != false:
			m["deck"].append(card_id)
		else:
			m["cityDump"].append(card_id)
		log(state, null, "%s has stood in the Capital City long enough and moves on." % def["name"], {"kind": "age", "cardId": card_id})
		aged += 1
	if aged > 0:
		refill_city(state)
	return aged

static func capital_city_size(state: Dictionary) -> int:
	return int(state["rules"]["setup"]["capitalCitySize"]) \
		+ passive_total(state, 0, "capitalCityExtraStalls") \
		+ passive_total(state, 1, "capitalCityExtraStalls")

## Deal the Capital City back up to full. A Disruption never takes a display
## slot: it is queued in market.revealQueue for a later flushReveals pass.
static func refill_city(state: Dictionary) -> bool:
	var m: Dictionary = state["market"]
	var target := capital_city_size(state)
	if m["city"].size() >= target:
		return false
	var added := []
	var guard := 0
	while m["city"].size() < target and guard < 200:
		guard += 1
		if m["deck"].is_empty():
			if m["cityDump"].is_empty():
				break
			m["deck"] = Rng.shuffle(state, m["cityDump"].duplicate())
			m["cityDump"].clear()
			log(state, null, "The City Dump is shuffled back into the Market Deck.", {"kind": "reshuffleMarket"})
		var id = m["deck"].pop_front()
		if card_def(state, id)["type"] == "disruption":
			m["revealQueue"].append(id)
			continue
		m["city"].append(id)
		added.append(id)
	if not added.is_empty():
		var names := []
		for id in added:
			names.append(card_def(state, id)["name"])
		log(state, null, "The Capital City is restocked: %s." % ", ".join(names), {"kind": "refill", "cardIds": added})
	return not added.is_empty()

static func log(state: Dictionary, player, text: String, fx = null) -> void:
	var entry := {"turn": state["turnNumber"], "player": player, "text": text}
	if fx != null:
		entry["fx"] = fx
	state["log"].append(entry)

# ---------- queries ----------

static func opponent_of(pi: int) -> int:
	return 1 - pi

static func top_card(state: Dictionary, stack: Dictionary) -> Dictionary:
	return card_def(state, stack["cards"][0]["cardId"])

static func find_stack(state: Dictionary, pi: int, uid: int):
	for s in state["players"][pi]["town"]:
		if s["uid"] == uid:
			return s
	return null

static func is_upright(stack: Dictionary) -> bool:
	return int(stack["orientation"]) == UPRIGHT

static func can_act(stack: Dictionary) -> bool:
	return int(stack["orientation"]) == UPRIGHT and not stack.get("shift")

static func upright_stacks(state: Dictionary, pi: int) -> Array:
	return state["players"][pi]["town"].filter(can_act)

static func stack_rank(state: Dictionary, stack: Dictionary) -> String:
	return rank_of(state["rules"], top_card(state, stack)["cost"])

static func species_in_town(state: Dictionary, pi: int) -> Array:
	var out := {}
	for s in state["players"][pi]["town"]:
		out[top_card(state, s)["species"]] = true
	return out.keys()

static func statue_count(state: Dictionary, pi: int) -> int:
	return state["players"][pi]["victoryRow"].size()

# ---------- mods ----------

static func get_mod(player: Dictionary, key: String) -> float:
	var total := 0.0
	for m in player["mods"]:
		if m["key"] == key:
			total += m["value"]
	return total

## A mod may carry a `filter` naming what it applies to (study/species/type/
## maxCost/upgradesOwn); unfiltered matches everything.
static func mod_filter_matches(mod: Dictionary, def, ctx: Dictionary = {}) -> bool:
	var f = mod.get("filter")
	if not f:
		return true
	if not def:
		return false
	if f.has("study") and def.get("study") != f["study"]:
		return false
	if f.has("studyIn") and not f["studyIn"].has(def.get("study")):
		return false
	if f.has("species") and def.get("species") != f["species"]:
		return false
	if f.has("type") and def.get("type") != f["type"]:
		return false
	if f.has("maxCost") and float(def.get("cost", 0)) > float(f["maxCost"]):
		return false
	if f.get("upgradesOwn", false) and not ctx.get("upgrade", false):
		return false
	return true

static func get_mod_for(player: Dictionary, key: String, def, ctx: Dictionary = {}) -> float:
	var total := 0.0
	for m in player["mods"]:
		if m["key"] == key and mod_filter_matches(m, def, ctx):
			total += m["value"]
	return total

## Spend `amount` from mods of this key that apply to `def` (filtered ones included).
static func consume_mod_for(player: Dictionary, key: String, def, ctx: Dictionary = {}, amount: float = INF) -> float:
	var used := 0.0
	for m in player["mods"].duplicate():
		if m["key"] != key or not mod_filter_matches(m, def, ctx):
			continue
		var take: float = min(float(m["value"]), amount - used)
		used += take
		m["value"] = float(m["value"]) - take
		if m["value"] <= 0 or m.get("expires") == "untilUsed" or m.get("consumable", false):
			player["mods"].erase(m)
		if used >= amount:
			break
	return used

static func has_mod(player: Dictionary, key: String) -> bool:
	for m in player["mods"]:
		if m["key"] == key:
			return true
	return false

static func consume_mod(player: Dictionary, key: String, amount: float = INF) -> float:
	var used := 0.0
	for m in player["mods"].duplicate():
		if m["key"] != key:
			continue
		var take: float = min(float(m["value"]), amount - used)
		used += take
		m["value"] = float(m["value"]) - take
		if m["value"] <= 0 or m.get("expires") == "untilUsed" or m.get("consumable", false):
			player["mods"].erase(m)
		if used >= amount:
			break
	return used

static func expire_mods(player: Dictionary, when: String) -> void:
	player["mods"] = player["mods"].filter(func(m): return m.get("expires") != when)

# ---------- tokens ----------
## One token kind per species, one per field of study, and one for Buildings
## (see state.js's tokenKey for the full rationale). spec is
## {of:"species", species} | {of:"study", study} | {of:"building"}.

static func token_key(spec) -> Variant:
	if not spec or not spec.get("of"):
		return null
	if spec["of"] == "species":
		return ("species:%s" % spec["species"]) if spec.get("species") else null
	if spec["of"] == "study":
		return ("study:%s" % spec["study"]) if spec.get("study") else null
	if spec["of"] == "building":
		return "building"
	return null

static func token_key_of(def: Dictionary) -> Variant:
	return token_key(def.get("token")) if def.get("type") == "token" else null

static func token_kinds(cset: Dictionary) -> Array:
	var out := []
	for c in cset.get("cards", []):
		if c.get("type") == "token":
			var key = token_key_of(c)
			if key:
				out.append({"key": key, "def": c})
	return out

static func token_count(player: Dictionary, spec) -> int:
	var key = spec if spec is String else token_key(spec)
	return int(player.get("tokens", {}).get(key, 0)) if key else 0

static func add_tokens(player: Dictionary, spec, n: int = 1, cap = null) -> int:
	var key = spec if spec is String else token_key(spec)
	if not key or n <= 0:
		return token_count(player, key if key else "")
	if not player.has("tokens"):
		player["tokens"] = {}
	var total := int(player["tokens"].get(key, 0)) + n
	player["tokens"][key] = min(int(cap), total) if (cap != null) else total
	return player["tokens"][key]

## Spend up to `n` tokens; returns how many were actually spent (a cost that
## can't be met is not paid at all, so callers check the return, not assume it).
static func spend_tokens(player: Dictionary, spec, n: int = 1) -> int:
	var key = spec if spec is String else token_key(spec)
	var have := token_count(player, key if key else "")
	var take: int = max(0, min(n, have))
	if take == 0:
		return 0
	player["tokens"][key] = have - take
	if player["tokens"][key] == 0:
		player["tokens"].erase(key)
	return take

## Sources of abilities for a player: town character stacks (top card),
## limited events, statues, buildings.
static func ability_sources(state: Dictionary, pi: int) -> Array:
	var p = state["players"][pi]
	var out := []
	for s in p["town"]:
		var def = top_card(state, s)
		var abilities = def.get("abilities", [])
		for i in range(abilities.size()):
			out.append({"kind": "character", "stack": s, "def": def, "ability": abilities[i], "key": "c%d:%d" % [s["uid"], i]})
	for e in p["events"]:
		var def = card_def(state, e["cardId"])
		var abilities = def.get("abilities", [])
		for i in range(abilities.size()):
			out.append({"kind": "event", "event": e, "def": def, "ability": abilities[i], "key": "e%d:%d" % [e["uid"], i]})
	for j in range(p["victoryRow"].size()):
		var def = card_def(state, p["victoryRow"][j])
		var abilities = def.get("abilities", [])
		for i in range(abilities.size()):
			out.append({"kind": "statue", "def": def, "ability": abilities[i], "key": "s%d:%d" % [j, i]})
	var buildings: Array = p.get("buildings", [])
	for j in range(buildings.size()):
		var b = buildings[j]
		if b.get("inert", false):
			continue
		var def = card_def(state, b["cardId"])
		var abilities = def.get("abilities", [])
		for i in range(abilities.size()):
			out.append({"kind": "building", "def": def, "ability": abilities[i], "key": "b%d:%d" % [j, i]})
	return out

# ---------- the town cap ----------

## How many town places this Mayor is using (see state.js's townFootprint:
## kept in one place deliberately, since actions.js and effects.js both need
## the exact same count).
static func town_footprint(state: Dictionary, pi: int) -> int:
	var p = state["players"][pi]
	var t: Dictionary = state["rules"].get("town", {})
	var in_town: int
	if t.get("countsPledged", true) == false:
		in_town = p["town"].filter(func(s): return s.get("lockedBid") == null).size()
	else:
		in_town = p["town"].size()
	return in_town + (0 if t.get("countsUnemployment", true) == false else p["unemployment"].size())

static func town_cap(state: Dictionary) -> float:
	var n = state["rules"].get("town", {}).get("maxCharacters")
	return float(n) if (n is float or n is int) and n > 0 else INF

static func has_town_room(state: Dictionary, pi: int) -> bool:
	return town_footprint(state, pi) < town_cap(state)

# ---------- the Building places ----------

static func building_slots_used(state: Dictionary, pi: int) -> int:
	var p = state["players"][pi]
	var statues: int = 0 if state["rules"].get("buildings", {}).get("statuesOccupySlots", true) == false else p["victoryRow"].size()
	return p.get("buildings", []).size() + statues

static func building_cap(state: Dictionary) -> float:
	var n = state["rules"].get("buildings", {}).get("maxPerTown")
	return float(n) if (n is float or n is int) and n > 0 else INF

static func buildings_built(state: Dictionary, pi: int) -> int:
	return state["players"][pi].get("buildings", []).size()

static func has_building_room(state: Dictionary, pi: int) -> bool:
	return building_slots_used(state, pi) < building_cap(state)

static func can_demolish_for(state: Dictionary, pi: int) -> bool:
	return state["players"][pi].get("buildings", []).size() > 0

const DISPLAYED_RULE_TYPES := ["ordinance", "marketCharacter"]

## Card types whose `displayed` abilities change the rules of the Capital
## City while they sit in it (an Ordinance, or a hired-out market character).
static func city_rule(state: Dictionary, key: String) -> float:
	var total := 0.0
	for card_id in state["market"]["city"]:
		var def = state["set"]["cardsById"].get(card_id)
		if not def or not DISPLAYED_RULE_TYPES.has(def.get("type")):
			continue
		for ab in def.get("abilities", []):
			if ab.get("trigger") == "displayed" and ab.get("key") == key:
				total += ab["value"] if ab.has("value") else 1
	return total

## The total value of a standing rule this Mayor's cards carry (0 or more
## sources summed; hasPassive below answers only whether it's in force at all).
static func passive_total(state: Dictionary, pi: int, key: String) -> int:
	var total := 0
	for src in ability_sources(state, pi):
		var ab = src["ability"]
		if ab.get("trigger") != "passive" or ab.get("key") != key:
			continue
		if ab.get("requiresUpright", false) and src["kind"] == "character" and not is_upright(src["stack"]):
			continue
		total += int(ab["value"]) if (ab.get("value") is float or ab.get("value") is int) else 1
	return total

## What a partnership is worth to this Character's shift (read live off the
## partner, so it lapses on its own the moment either leaves the town).
static func pair_bonus_for(state: Dictionary, pi: int, stack: Dictionary) -> float:
	if not stack or not stack.get("pairedWith"):
		return 0
	var partner = find_stack(state, pi, stack["pairedWith"])
	if not partner or partner.get("pairedWith") != stack["uid"]:
		return 0
	return stack.get("pairBonus", 0)

static func has_passive(state: Dictionary, pi: int, key: String) -> bool:
	for src in ability_sources(state, pi):
		var ab = src["ability"]
		if ab.get("trigger") != "passive" or ab.get("key") != key:
			continue
		if ab.get("requiresUpright", false) and src["kind"] == "character" and not is_upright(src["stack"]):
			continue
		return true
	return false

# ---------- serialisation (the card set is data, not state) ----------

static func serialize(state: Dictionary) -> String:
	var rest := state.duplicate()
	rest.erase("set")
	rest.erase("rules")
	rest["setId"] = state["set"].get("setId")
	return JSON.stringify(rest)

static func deserialize(json, rules: Dictionary, cset: Dictionary) -> Dictionary:
	var data: Dictionary = JSON.parse_string(json) if json is String else json
	data["rules"] = rules
	data["set"] = cset if cset.has("cardsById") else index_set(cset)
	return data

static func clone_state(state: Dictionary) -> Dictionary:
	return deserialize(serialize(state), state["rules"], state["set"])
