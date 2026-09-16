extends SceneTree

# Runs the same seed/operations as godot/tools/rng_reference.mjs through the
# ported Rng class, for a manual parity diff.
# Run headless from the godot/ project directory:
#   godot4 --headless --script res://tools/rng_check.gd

func _init() -> void:
	var state := {"rng": Rng.seed_rng(12345)}
	var values := []
	for i in range(20):
		values.append(Rng.rand(state))

	var arr := []
	for i in range(10):
		arr.append(i)
	Rng.shuffle(state, arr)

	print(JSON.stringify({"values": values, "shuffled": arr, "final_rng": state["rng"]}, "  "))
	quit()
