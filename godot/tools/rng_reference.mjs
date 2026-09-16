// Prints a reference RNG sequence from the real src/engine/rng.js so it can be
// diffed against godot/tools/rng_check.gd's output for bit-for-bit parity.
// Run: node godot/tools/rng_reference.mjs
import { seedRng, rand, shuffle } from '../../src/engine/rng.js';

const state = { rng: seedRng(12345) };
const values = [];
for (let i = 0; i < 20; i++) values.push(rand(state));

const arr = Array.from({ length: 10 }, (_, i) => i);
shuffle(state, arr);

console.log(JSON.stringify({ values, shuffled: arr, final_rng: state.rng }, null, 2));
