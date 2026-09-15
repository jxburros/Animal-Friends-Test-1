// Saving a game in progress, and picking it back up.
//
// Game state was built to be saveable and nobody had needed it yet: `state.rng` is an integer the
// RNG advances in place (see rng.js), every card in play is a `{ uid, cardId }` reference rather
// than a card object, and `state.js` already has `serialize`/`deserialize` for lifting the two
// shared specs out and putting them back. A snapshot is that, with a lid on it: the version it was
// written at, enough of a label to show it on a shelf, and the decks it was built from.
//
// What is deliberately not here is migration. A snapshot written by an older build is refused
// rather than repaired: a half-restored game, with rules that have moved under it, is worse than a
// game that is honestly gone.
import { serialize, deserialize } from './state.js';

/** Bumped whenever a change to game state makes older snapshots unsafe to restore. */
export const SNAPSHOT_VERSION = 1;

/** Live objects parked on the state by the app, which are not game state and must not be written. */
const TRANSIENT = ['agents', 'coach', 'tutorial'];

/**
 * A snapshot of a game in progress, as plain JSON-safe data.
 *
 * `meta` is what the shelf can show without restoring the whole game. `decks` records what the game
 * was built from, so a game played with a custom deck still says what that deck was after the deck
 * has been edited or deleted.
 */
export function snapshot(state, { id = null, meta = {}, decks = null } = {}) {
  const game = JSON.parse(serialize(state));
  for (const key of TRANSIENT) delete game[key];
  return {
    version: SNAPSHOT_VERSION,
    id: id || `game-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    savedAt: Date.now(),
    setId: state.set?.setId || null,
    decks,
    meta: {
      turnNumber: state.turnNumber,
      phase: state.phase,
      you: state.players[0]?.deckName || null,
      rival: state.players[1]?.deckName || null,
      market: state.market?.deckName || null,
      ...meta,
    },
    game,
  };
}

/** Can this snapshot be restored against the specs now loaded? Returns null, or the reason not. */
export function snapshotProblem(entry, set = null) {
  if (!entry || typeof entry !== 'object' || !entry.game) return 'That saved game is empty.';
  if (entry.version !== SNAPSHOT_VERSION) {
    return 'That game was saved by an older version of Animal Friends and cannot be picked back up.';
  }
  if (!Array.isArray(entry.game.players) || entry.game.players.length !== 2) {
    return 'That saved game is damaged.';
  }
  if (set && entry.setId && set.setId && entry.setId !== set.setId) {
    return 'That game was played with a different card collection.';
  }
  return null;
}

/** True when a saved game is worth offering: restorable, and not already over. */
export function isResumable(entry, set = null) {
  if (snapshotProblem(entry, set)) return false;
  return entry.game.winner === null && entry.game.phase !== 'over';
}

/**
 * Put a snapshot back together: the saved game with the loaded `rules` and `set` re-attached. The
 * result is an ordinary game state — `legalActions` and `applyAction` cannot tell it apart from one
 * `createGame` just made, which is the whole point.
 */
export function restore(entry, rules, set) {
  const problem = snapshotProblem(entry, set);
  if (problem) throw new Error(problem);
  return deserialize(entry.game, rules, set);
}
