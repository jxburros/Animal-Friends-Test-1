// Power/cost model: what a card is worth, what it asks for, and which rarity that makes it.
//
// Every number here is in "Supply-equivalents": one point is roughly one Supply gained on the turn
// you wanted it. A card's *power* is everything it gives you; its *opportunity cost* is everything
// it asks for — Supply, the turns a big Character spends rotating into work, the Characters an
// Event demands, the slot the card takes in a 30-card deck.
//
// Rarity is deliberately not raw power. A cost-0 Character that pays for itself twice over is a
// better card than a cost-5 Character that pays for itself once, but it is not a more *exciting*
// one, so the rating blends the two: score = power^0.6 * efficiency^0.4. Efficiency decides between
// cards of similar size; size decides between cards of similar efficiency.
//
// Pure data in, numbers out: nothing here reads game state, so the Deck Workshop, the tests and the
// balance scripts all rate a card the same way.

export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary'];

/** Copies of a card of each rarity that a 30-card town deck may hold. */
export const COPY_LIMITS = { Common: 3, Uncommon: 3, Rare: 2, 'Super Rare': 1, Legendary: 1 };

/** Score at or above which a card lands in each rarity. Tuned to a pyramid on the printed set. */
export const RARITY_THRESHOLDS = [
  ['Legendary', 5.4],
  ['Super Rare', 4.5],
  ['Rare', 3.6],
  ['Uncommon', 2.4],
  ['Common', 0],
];

/**
 * What a Statue is worth beyond its printed effect. Five of the nine win the game, so a Statue is a
 * fifth of a victory before it does anything at all — which is why every Statue also carries a
 * burden, and why no burden could make one not worth taking.
 */
export const STATUE_VICTORY = 9.0;

/** Taking an action costs a turn's tempo, whoever you are: recruiting, playing an Event, bidding. */
const ACTION = 0.8;

/**
 * Mods whose printed `value` is a sentinel rather than a quantity: a shield with value 99 prevents
 * everything, it is not ninety-nine times as good as one with value 1.
 */
const FLAG_MODS = new Set(['unemploymentShield', 'unchallengeable', 'cancelNextChallenge', 'skipNextAdvance', 'extraAdvance']);

// How much a point of benefit is worth once, in Supply-equivalents.
const DRAW = 1.5; // a card in hand is worth about a Supply and a half
const READY = 2.0; // standing a Character back up is most of a shift

const MOD_VALUE = {
  recruitDiscount: 1.0,
  challengeDiscount: 1.0,
  rehireDiscount: 1.0,
  shiftBonus: 1.2,
  extraAdvance: 1.5,
  lossShield: 0.8,
  unemploymentShield: 2.0,
  unchallengeable: 2.0,
  cancelNextChallenge: 2.2,
  eventCharReduction: 1.6,
  skipNextAdvance: -1.5,
};

const PASSIVE_VALUE = {
  blockOpponentBidRaise: 3.0,
  firstAnnounceMinBidMinus1: 1.6,
  firstBidPlus1: 1.6,
  winTiesAsChallenger: 1.8,
  masterDelayMinus1: 2.4,
  eventCharReductionPerTurn: 2.2,
  // Statue burdens: always a cost to their controller, so they are subtracted, not added.
  opponentRehireDiscount: 1.2,
  opponentFirstBidPlus1: 1.4,
  apprenticeEntersBusy: 1.6,
  eventCostPlus1: 1.6,
  resourceSupplyMinus1: 2.2,
  losingBidsPayFull: 1.4,
};

// How many times a trigger is expected to pay out over a game, relative to a one-shot.
const TRIGGER_WEIGHT = {
  passive: 3.0,
  onTurnStart: 2.6,
  onTurnEnd: 2.4,
  onReady: 2.2,
  busy: 2.0,
  onShiftCompleted: 1.8,
  onShiftStarted: 1.6,
  onEventPlayed: 1.5,
  onAnnounce: 1.5,
  onGainMarketCard: 1.3,
  onCharacterUnemployed: 1.2,
  onTiedBid: 1.0,
  onChallengedByOpponent: 1.2,
  onRecruit: 1.0, // fires once, when the Character arrives
};

/** Every condition on an ability is a chance it does nothing, so it discounts the payout. */
function conditionFactor(condition) {
  const n = Object.keys(condition || {}).length;
  return n ? Math.max(0.6, 0.8 ** n) : 1;
}

/** What one effect is worth the single time it resolves. */
export function effectPower(eff) {
  if (!eff || !eff.do) return 0;
  const n = (v, d = 1) => (typeof v === 'number' ? v : d);
  switch (eff.do) {
    case 'seq':
      return (eff.steps || []).reduce((a, s) => a + effectPower(s), 0);
    case 'gainSupply':
      return n(eff.amount);
    case 'opponentGainSupply':
      return -0.6 * n(eff.amount);
    case 'giveSupplyToOpponent':
      return -1.4 * n(eff.amount);
    case 'draw':
      return DRAW * n(eff.count);
    case 'discard':
      return -0.9 * n(eff.count);
    case 'addMod': {
      const unit = MOD_VALUE[eff.key] ?? 1;
      if (FLAG_MODS.has(eff.key)) return unit;
      // A shield is worth what it can plausibly stop, not what it is printed to stop.
      const amount = eff.key === 'lossShield' ? Math.min(n(eff.value), 3) : n(eff.value);
      return unit * amount;
    }
    case 'readyCharacter':
      return READY * n(eff.count) * (eff.optional ? 0.95 : 1);
    case 'readyNextTurn':
      return 1.4;
    case 'rehire':
      return (eff.free ? 3.2 : 0.4 + n(eff.discount, 0)) + (eff.filter ? -0.4 : 0);
    case 'recruitFromHand':
      return 2.4 + 0.5 * n(eff.filter && eff.filter.maxCost, 0) + (eff.orientation === 0 ? 0.8 : 0);
    case 'reorderDeckTop':
      return 0.35 * n(eff.count);
    case 'eventFromDumpToHand':
      return 2.0;
    case 'eventFromDumpToDeckBottom':
      return 1.0;
    case 'peekMarketDeck':
      return 0.4 * n(eff.count);
    case 'opponentTopdeckFromHand':
      return 1.4;
    case 'unemployOpponentCharacter':
      return 4.0 + (eff.maxCost === undefined ? 1.0 : 0.3 * eff.maxCost) - 0.9 * n(eff.discardFirst, 0);
    case 'raiseOwnBid':
      return 0.6;
    // Shared shocks hit both towns, so they are rated by how much they move the table, not by
    // how much they hand one player. A Disruption is never owned; it is weather.
    case 'allCharactersToUnemployment':
      return 8.0;
    case 'endAllShifts':
      return 4.0;
    case 'everyoneLosesSupply':
      return 0.9 * n(eff.amount);
    case 'everyoneGainsSupply':
      return 0.9 * n(eff.amount);
    case 'everyoneDraws':
      return 0.9 * DRAW * n(eff.count);
    case 'everyoneDiscardsDownTo':
      return Math.max(0, 6 - n(eff.count)) * 0.7;
    case 'blockNextReady':
      return 2.4;
    case 'everyoneRehiresFree':
      return 2.6;
    default:
      return 0;
  }
}

/**
 * What one ability is worth across a game, trigger frequency and conditions included.
 * Pass `runs` to say exactly how many times it fires — a Limited Event's ability fires for its
 * printed duration and then the card is gone, so its trigger's usual lifetime does not apply.
 */
export function abilityPower(ab, runs) {
  if (!ab) return 0;
  const weight = runs ?? TRIGGER_WEIGHT[ab.trigger] ?? 1;
  const base = ab.trigger === 'passive' ? (PASSIVE_VALUE[ab.key] ?? 1.5) * (ab.value ?? 1) : effectPower(ab.effect) * weight;
  const value = base * conditionFactor(ab.condition);
  // A burden is the price of a Statue's boon, so it subtracts from the card's power.
  return ab.burden ? -Math.abs(value) : value;
}

/** A shift is worth its throughput plus a little for the lump sum it arrives in. */
export function shiftPower(shift) {
  if (!shift) return 0;
  return (shift.output / shift.delay) * 2.5 + shift.output * 0.3;
}

/** Turns a Character spends rotating into work before its first shift, by rank. */
function entryTurns(cost) {
  if (cost <= 1) return 0; // Apprentices enter upright
  if (cost <= 3) return 1; // Journeymen enter Busy
  return 2; // Masters enter at 180 and take two Readys to stand up
}

/** Requirement "pips": an Event that needs two Civics Characters is asking for two. */
function requirePips(card) {
  return (card.requires || []).reduce((a, r) => a + (r.count || 1), 0);
}

/** Everything a card asks of you, in the same Supply-equivalents as its power. */
export function opportunityCost(card) {
  const slot = 1.0; // any card in a 30-card deck costs a draw you could have spent elsewhere
  switch (card.type) {
    case 'character':
      return slot + ACTION + card.cost + 1.2 * entryTurns(card.cost);
    case 'event':
      // Events cost no Supply; their requirements are the whole price, and a Limited Event has to
      // survive on the table to pay out at all.
      return slot + ACTION + 0.9 * requirePips(card) + (card.kind === 'limited' ? 0.6 : 0);
    case 'market':
    case 'statue':
      // Bought at auction: announcing costs an action and makes one of your Characters Busy until
      // the auction ends. The printed cost is the minimum bid, so it already carries the Supply.
      return card.cost + ACTION + 0.6 + (card.disposal === 'outOfPlay' ? 0.4 : 0);
    case 'disruption':
      return 2.0; // never bought; rated purely by how hard it hits the table
    default:
      return slot + (card.cost || 0);
  }
}

/** Everything a card gives you, in Supply-equivalents. */
export function cardPower(card) {
  let power = 0;
  if (card.type === 'character') power += shiftPower(card.shift);
  if (card.type === 'statue') power += STATUE_VICTORY;
  power += effectPower(card.effect);
  power += effectPower(card.onGain);
  power += effectPower(card.onReveal);
  const limited = card.type === 'event' && card.kind === 'limited';
  for (const ab of card.abilities || []) power += abilityPower(ab, limited ? card.duration || 1 : undefined);
  return power;
}

/**
 * The card's rating: power tempered by efficiency.
 * `score = power^0.6 * (power / opportunityCost)^0.4` — of two cards that give you the same, the
 * cheaper one rates higher; of two equally efficient cards, the bigger one rates higher.
 */
export function powerRating(card) {
  const power = cardPower(card);
  const cost = opportunityCost(card);
  const efficiency = power / cost;
  if (power <= 0 || efficiency <= 0) return 0;
  return power ** 0.6 * efficiency ** 0.4;
}

/** The rarity a rating earns. */
export function rarityForScore(score) {
  for (const [rarity, min] of RARITY_THRESHOLDS) if (score >= min) return rarity;
  return 'Common';
}

/** The full rating of a card: power, what it asked for, the ratio, the score and the rarity. */
export function rateCard(card) {
  const power = round(cardPower(card));
  const cost = round(opportunityCost(card));
  const score = round(powerRating(card));
  return { id: card.id, type: card.type, power, cost, ratio: round(power / cost), score, rarity: rarityForScore(score) };
}

/** How many copies of a card a town deck may hold, from its rarity. */
export function copyLimit(card, limits = COPY_LIMITS) {
  return limits[card.rarity] ?? limits.Common;
}

/** Every card in a set, rated and sorted from most to least powerful for its cost. */
export function rateSet(set) {
  return set.cards.map(rateCard).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

function round(n) {
  return Math.round(n * 100) / 100;
}
