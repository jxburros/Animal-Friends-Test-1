// Saving a game in progress: what a snapshot holds, what it refuses, and the thing that actually
// matters — that a restored game plays on exactly as the one it was taken from would have.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, RULES, SET } from './helpers.mjs';
import { playTurn, serialize } from '../src/engine/index.js';
import {
  snapshot, restore, snapshotProblem, isResumable, SNAPSHOT_VERSION,
} from '../src/engine/snapshot.js';
import { makeRandomAgent } from '../src/ai/random.js';

/** The game as JSON, with the live agents the app parks on the state left out of the comparison. */
// The state as data, not as a string: key order is not part of a game. `notifyingSupplyLoss` is set
// the first time Supply is taken off somebody, so whether it is written before or after `setId`
// depends on whether that happened before the save was taken — which is a fact about the shuffle
// and not a difference between the two games.
function gameOnly(state) {
  const { agents, ...rest } = JSON.parse(serialize(state));
  return rest;
}

describe('taking a snapshot', () => {
  test('a snapshot is plain JSON: it survives a round trip through a string', () => {
    const entry = snapshot(newGame());
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(entry)));
    assert.equal(entry.version, SNAPSHOT_VERSION);
    assert.equal(entry.setId, SET.setId);
    assert.ok(entry.id, 'a snapshot gets an id of its own');
  });

  test('the two shared specs are lifted out, so a snapshot is a game and not the whole collection', () => {
    const entry = snapshot(newGame());
    assert.equal(entry.game.rules, undefined);
    assert.equal(entry.game.set, undefined);
    assert.ok(JSON.stringify(entry).length < 400_000, 'a snapshot is small enough to keep several of');
  });

  test('live agents parked on the state are not written out', () => {
    const state = newGame();
    state.agents = [makeRandomAgent(1), makeRandomAgent(2)];
    assert.equal(snapshot(state).game.agents, undefined);
  });

  test('the meta line says enough to show the game on a shelf without restoring it', () => {
    const entry = snapshot(newGame());
    assert.equal(entry.meta.you, 'Tin & Tally');
    assert.equal(entry.meta.rival, 'Gavel & Ribbon');
    assert.ok(entry.meta.market, 'and which market it is being played in');
    assert.equal(typeof entry.meta.turnNumber, 'number');
  });

  test('the decks the game was built from are recorded alongside it', () => {
    const decks = [{ id: 'custom-1', name: 'My deck', list: { a: 1 } }, 'mk-gavel-ribbon'];
    assert.deepEqual(snapshot(newGame(), { decks }).decks, decks);
  });
});

describe('restoring', () => {
  test('a restored game serialises identically to the one the snapshot was taken from', () => {
    const state = newGame();
    const back = restore(snapshot(state), RULES, SET);
    assert.equal(serialize(back), serialize(state));
  });

  test('the loaded specs are re-attached, shared rather than copied into the save', () => {
    const back = restore(snapshot(newGame()), RULES, SET);
    assert.equal(back.rules, RULES, 'the rules object itself, not a copy of it');
    assert.equal(back.set.cards, SET.cards, 'and the collection, indexed for lookup but not duplicated');
    assert.equal(back.set.setId, SET.setId);
  });

  test('a restored game plays on identically: same seed, same agents, same log', async () => {
    const original = newGame({ seed: 77 });
    const agents = () => [makeRandomAgent(7), makeRandomAgent(11)];

    // Play three turns, then take the save.
    original.agents = agents();
    for (let i = 0; i < 3; i++) await playTurn(original);
    const entry = snapshot(original);

    // One copy plays on from memory; the other is put away and picked back up first.
    const resumed = restore(JSON.parse(JSON.stringify(entry)), RULES, SET);
    original.agents = agents();
    resumed.agents = agents();
    for (let i = 0; i < 6; i++) {
      if (original.winner === null) await playTurn(original);
      if (resumed.winner === null) await playTurn(resumed);
    }

    assert.deepEqual(resumed.log.map((l) => l.text), original.log.map((l) => l.text));
    assert.equal(resumed.turnNumber, original.turnNumber);
    assert.equal(resumed.winner, original.winner);
    assert.deepEqual(gameOnly(resumed), gameOnly(original), 'the whole state, not just the log');
  });
});

describe('refusing a snapshot rather than half-restoring it', () => {
  test('a snapshot from an older version is refused, and says so in words a player can read', () => {
    const entry = { ...snapshot(newGame()), version: SNAPSHOT_VERSION - 1 };
    assert.match(snapshotProblem(entry), /older version/);
    assert.throws(() => restore(entry, RULES, SET), /older version/);
  });

  test('a snapshot of a different collection is refused', () => {
    const entry = { ...snapshot(newGame()), setId: 'some-other-set' };
    assert.match(snapshotProblem(entry, SET), /different card collection/);
  });

  test('empty and damaged snapshots are refused', () => {
    assert.ok(snapshotProblem(null));
    assert.ok(snapshotProblem({ version: SNAPSHOT_VERSION, game: { players: [] } }));
  });

  test('a game already won is not offered as one to come back to', () => {
    const state = newGame();
    const open = snapshot(state);
    assert.ok(isResumable(open, SET));
    state.winner = 0;
    state.phase = 'over';
    assert.equal(isResumable(snapshot(state), SET), false);
  });
});
