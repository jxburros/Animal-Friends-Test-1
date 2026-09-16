extends RefCounted
class_name CardSetLoader

## Dev-time loader for spec/game.json and spec/maker_card_set.json, read
## straight off disk from outside the Godot project (repo_root/spec/, one
## level above repo_root/godot/). This is a stopgap for the porting phase —
## once the port is further along, decide whether the spec JSON ships as
## res:// data (copied/imported into the project) or stays an external
## dependency for a build step to embed.

static func repo_spec_dir() -> String:
	return ProjectSettings.globalize_path("res://").path_join("../spec")

static func _read_json(path: String) -> Dictionary:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		push_error("Could not open %s (error %d)" % [path, FileAccess.get_open_error()])
		return {}
	var text := f.get_as_text()
	f.close()
	return JSON.parse_string(text)

## Returns {"rules": <parsed game.json>, "set": <indexed maker_card_set.json>}.
static func load_default() -> Dictionary:
	var dir := repo_spec_dir()
	var rules := _read_json(dir.path_join("game.json"))
	var raw_set := _read_json(dir.path_join("maker_card_set.json"))
	return {"rules": rules, "set": StateLib.index_set(raw_set)}
