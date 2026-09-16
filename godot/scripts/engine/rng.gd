extends RefCounted
class_name Rng

## Deterministic PRNG (mulberry32), ported bit-for-bit from src/engine/rng.js.
##
## Mirrors the JS module's design: RNG state is a single 32-bit integer stored
## inline on the game state Dictionary (key "rng"), mutated in place, so games
## are replayable from an integer seed alone. Every intermediate value is kept
## masked to [0, 0xFFFFFFFF] rather than converted to Godot's signed 64-bit
## int, since mulberry32 only depends on 32-bit bit patterns (XOR, shifts,
## and the low 32 bits of each multiply) and never on signedness.
##
## Do not swap this for Godot's built-in RandomNumberGenerator: it uses a
## different algorithm and won't reproduce replays recorded by the JS engine.

const MASK := 0xFFFFFFFF

static func seed_rng(seed: int) -> int:
	var s := seed & MASK
	return s if s != 0 else 0x9e3779b9

static func _imul32(x: int, y: int) -> int:
	return (x * y) & MASK

## Mutates state["rng"] and returns the next float in [0, 1).
static func rand(state: Dictionary) -> float:
	var a: int = (int(state.get("rng", 0)) + 0x6d2b79f5) & MASK
	state["rng"] = a
	var t := _imul32(a ^ (a >> 15), 1 | a)
	var sum := (t + _imul32(t ^ (t >> 7), 61 | t)) & MASK
	t = sum ^ t
	return float((t ^ (t >> 14)) & MASK) / 4294967296.0

static func rand_int(state: Dictionary, n: int) -> int:
	return int(floor(rand(state) * n))

static func shuffle(state: Dictionary, arr: Array) -> Array:
	for i in range(arr.size() - 1, 0, -1):
		var j := rand_int(state, i + 1)
		var tmp = arr[i]
		arr[i] = arr[j]
		arr[j] = tmp
	return arr
