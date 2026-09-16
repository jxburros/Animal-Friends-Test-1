// "My" agent: a simple, legible strategy (not the tuned heuristic) meant to represent how a
// reasonably careful human would play, based on manual playtesting:
//   1. Free rehires first (no cost).
//   2. Recruit the cheapest affordable characters to fill the town.
//   3. Play any free event on offer.
//   4. Chase Statues (the only win condition), ahead of working shifts, since a shift consumes
//      the same upright animal an announce/raise needs: keep raising a bid already in progress as
//      long as it stays affordable, or open one cheaply relative to our Supply.
//   5. Work shifts with remaining ready characters (highest supply/turn rate first).
//   6. Raise a building only once there's slack (no cheap recruit/work left) and we don't already
//      have plenty of buildings.
//   7. Otherwise end the turn.
// For non-action decisions (mulligan, target picks, deck reordering) it uses simple, deterministic
// defaults: keep the opening hand, take the first legal option(s), keep any list in its given order.

import { cardDef } from '../src/engine/index.js';

export function makeMyAgent(name = 'MyAgent') {
  return {
    name,
    choose(state, pi, req) {
      switch (req.kind) {
        case 'resources': {
          const p = state.players[pi];
          return p.supply < 4 ? 'supply' : 'draw';
        }
        case 'action': {
          const opts = req.options;
          const rehire = opts.find((a) => a.type === 'rehire' && a.cost === 0);
          if (rehire) return rehire;

          const recruits = opts.filter((a) => a.type === 'recruit').sort((a, b) => a.cost - b.cost);
          if (recruits.length) return recruits[0];

          const event = opts.find((a) => a.type === 'playEvent' || a.type === 'playHeld');
          if (event) return event;

          // Statues are the only win condition, so chase them before spending upright animals on
          // shifts: keep raising a bid already in progress as long as it stays affordable, or open
          // one cheaply relative to our Supply.
          const p = state.players[pi];
          const raises = opts.filter((a) => a.type === 'raise' && a.bid <= p.supply)
            .sort((a, b) => a.bid - b.bid);
          if (raises.length) return raises[0];

          const statueAnnounces = opts
            .filter((a) => a.type === 'announce' && cardDef(state, a.cardId)?.type === 'statue')
            .filter((a) => a.bid <= Math.max(2, Math.floor(p.supply * 0.6)))
            .sort((a, b) => a.bid - b.bid);
          if (statueAnnounces.length) return statueAnnounces[0];

          const works = opts.filter((a) => a.type === 'work');
          if (works.length) {
            works.sort((a, b) => (b.output / Math.max(1, b.delay)) - (a.output / Math.max(1, a.delay)));
            return works[0];
          }

          const buildings = opts.filter((a) => a.type === 'build');
          if (buildings.length) return buildings[0];

          const abilities = opts.filter((a) => a.type === 'ability');
          if (abilities.length) return abilities[0];

          return { type: 'endTurn' };
        }
        case 'pick': {
          const n = req.min || 0;
          return req.options.slice(0, n).map((o) => o.uid);
        }
        case 'order':
          return req.options.map((o) => o.uid);
        case 'confirm':
          if (req.reason === 'mulligan') return false; // keep the opening hand
          return req.default ?? false;
        default:
          return undefined;
      }
    },
  };
}

export default makeMyAgent;
