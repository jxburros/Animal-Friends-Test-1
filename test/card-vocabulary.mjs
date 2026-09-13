// The vocabulary a card may use: the effects, triggers, passive and mod keys, city-rule keys and
// conditions the engine actually interprets. Printed cards (test/cardset.test.mjs) and maker cards
// (test/maker-cards.test.mjs) are both held to it, so a card written on either shelf is playable.
//
// Adding a name here is not enough to make it work: the engine must interpret it too
// (src/engine/effects.js, game.js, actions.js). A card remake never adds one — see
// docs/REMAKING_A_CHARACTER.md, which logs the wish in `wantedVerbs` instead.
export const EFFECTS = new Set([
  'seq', 'gainSupply', 'opponentGainSupply', 'giveSupplyToOpponent', 'draw', 'discard', 'addMod',
  'readyCharacter', 'readyNextTurn', 'rehire', 'recruitFromHand', 'reorderDeckTop',
  'eventFromDumpToDeckBottom', 'eventFromDumpToHand', 'peekMarketDeck', 'opponentTopdeckFromHand',
  'unemployOpponentCharacter', 'raiseOwnBid',
  // the constable's verb: turn an opponent's Character one step back toward Busy
  'makeBusy',
  // species signature verbs (spec/species.json)
  'storeSupply', 'takeStoredSupply', 'takeFromCityDump', 'protectCharacter', 'moveShift',
  'selfReady', 'cancelReveal', 'advanceCharacter',
  // the astronomers' verb (Night Shift): look at your own deck top and bin what you do not want
  'scryDeck',
  // on-reveal catch-up
  'behindPlayerGains', 'behindPlayerReadies',
  // shared shocks, used by Disruption cards
  'allCharactersToUnemployment', 'endAllShifts', 'everyoneLosesSupply', 'everyoneGainsSupply',
  'everyoneDraws', 'everyoneDiscardsDownTo', 'blockNextReady', 'everyoneRehiresFree',
  'everyoneUnemploys',
]);
export const TRIGGERS = new Set([
  'passive', 'busy', 'onRecruit', 'onTurnStart', 'onTurnEnd', 'onReady', 'onShiftStarted', 'onShiftCompleted',
  'onEventPlayed', 'onAnnounce', 'onChallengedByOpponent', 'onGainMarketCard', 'onCharacterUnemployed',
  'onTiedBid',
  // the cautious animal's trigger: Supply has just been taken off you, by a rival or by the weather
  'onSupplyLost',
  // an Ordinance changes the rules while it sits in the Capital City
  'displayed',
]);
export const PASSIVE_KEYS = new Set([
  'blockOpponentBidRaise', 'firstAnnounceMinBidMinus1', 'firstBidPlus1', 'winTiesAsChallenger',
  'masterDelayMinus1', 'eventCharReductionPerTurn',
  // Statue burdens
  'opponentRehireDiscount', 'opponentFirstBidPlus1', 'apprenticeEntersBusy', 'eventCostPlus1',
  'resourceSupplyMinus1', 'losingBidsPayFull', 'pledgeLadderPlus1',
]);
export const MOD_KEYS = new Set([
  'recruitDiscount', 'challengeDiscount', 'rehireDiscount', 'shiftBonus', 'extraAdvance', 'lossShield',
  'unemploymentShield', 'unchallengeable', 'cancelNextChallenge', 'eventCharReduction', 'skipNextAdvance',
  'cancelNextReveal',
  // a Building bought cheaper: the one Capital City card a Character may discount
  'buildingDiscount',
]);
/** Keys an Ordinance may change while it is displayed; read by cityRule() in the engine. */
export const CITY_RULE_KEYS = new Set(['pledgeLadderDelta', 'statueCostDelta', 'buildingCostDelta', 'noRaises',
  'blockStatuePurchase',
]);
export const CONDITIONS = new Set([
  'self', 'announcerIsSelf', 'onlyUprightOfSpecies', 'otherCharacterInTown', 'eventRequiresStudy',
  'nonStatue', 'statue', 'handAtLeast', 'unemploymentNotMoreThanOpponent', 'minSpeciesInTown',
]);

