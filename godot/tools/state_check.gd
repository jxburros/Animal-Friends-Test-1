extends SceneTree

# Runs the same createGame() call as godot/tools/state_reference.mjs through
# the ported StateLib/CardSetLoader, for a manual parity diff.
# Run headless from the godot/ project directory:
#   godot4 --headless --script res://tools/state_check.gd

func _summarize(state: Dictionary) -> Dictionary:
	var players := []
	for p in state["players"]:
		var hand := []
		for c in p["hand"]:
			hand.append(c["cardId"])
		var deck_top5 := []
		for c in p["deck"].slice(0, 5):
			deck_top5.append(c["cardId"])
		players.append({
			"name": p["name"],
			"deckId": p["deckId"],
			"supply": p["supply"],
			"hand": hand,
			"deckSize": p["deck"].size(),
			"deckTop5": deck_top5,
		})
	return {
		"seed": state["seed"],
		"rngAfterSetup": state["rng"],
		"uidCounter": state["uidCounter"],
		"phase": state["phase"],
		"players": players,
		"marketDeckId": state["market"]["deckId"],
		"marketDeckSize": state["market"]["deck"].size(),
		"marketDeckTop5": state["market"]["deck"].slice(0, 5),
		"city": state["market"]["city"],
		"cityDump": state["market"]["cityDump"],
		"logFirstLine": state["log"][0]["text"],
	}

func _init() -> void:
	var loaded := CardSetLoader.load_default()
	var state := StateLib.create_game(loaded["rules"], loaded["set"], {
		"seed": 12345,
		"decks": ["mk-furrow-warren", "mk-margin-pantry"],
		"names": ["Mayor 1", "Mayor 2"],
	})
	print(JSON.stringify(_summarize(state), "  "))
	quit()
