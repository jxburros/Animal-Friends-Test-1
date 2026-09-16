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

**0 cards waiting.**

