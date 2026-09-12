import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SET, newGame, addStack, addToHand, addToUnemployment, setSupply, addLimitedEvent } from './helpers.mjs';
import { legalActions, applyAction, UPRIGHT, BUSY, fireHook, endPhase, runEffect, buildMarketDeck } from '../src/engine/index.js';
import { seedRng } from '../src/engine/rng.js';
import { paintedTile, paintedArtSVG } from '../src/ui/painted-art.js';
import { SPECIES_KIND, animalSVG, iconSVG } from '../src/ui/art.js';
const expansion = SET.cards.filter(c => c.expansion === 'AF-WHISKER-01');
function begin(s) { s.phase='actions'; s.active=0; }

test('Whiskerwood adds 52 cards with six complete Cat upgrade families and usable art', () => {
  assert.equal(expansion.length,52);
  assert.ok(SET.cards.length>=260,'later expansions only add to the set');
  assert.deepEqual(['character','event','market'].map(t=>expansion.filter(c=>c.type===t).length),[24,18,10]);
  const cats=expansion.filter(c=>c.species==='Cat');
  assert.equal(cats.length,18);
  assert.equal(SET.species.filter(s=>s==='Cat').length,1);
  for(const name of new Set(cats.map(c=>c.name))) {
    const versions=cats.filter(c=>c.name===name);
    assert.equal(versions.length,3);
    assert.ok(versions.some(c=>c.cost<=1));
    assert.ok(versions.some(c=>c.cost>=2&&c.cost<=3));
    assert.ok(versions.some(c=>c.cost>=4));
  }
  assert.equal(new Set(expansion.map(c=>c.art.tile)).size,16);
  for(const c of expansion){
    assert.equal(c.art.atlas,'whiskerwood');
    assert.equal(paintedTile(c),c.art.tile);
    assert.match(paintedArtSVG(c,'<svg/>'),/whiskerwood-atlas\.png/);
  }
  const png=fs.readFileSync(new URL('../assets/art/whiskerwood-atlas.png',import.meta.url));
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(SPECIES_KIND.Cat,'cat');
  assert.match(animalSVG('cat'),/polygon/);
  assert.match(iconSVG('Cat'),/path/);
});

test('Cat-only Events reject other species and require distinct upright Cats', async () => {
  const s=newGame(); begin(s);
  addToHand(s,0,'ww_guild_open_day');
  addStack(s,0,'bb_clover_1',UPRIGHT);
  const action=()=>legalActions(s,0).find(a=>a.type==='playEvent'&&a.cardId==='ww_guild_open_day');
  assert.equal(action(),undefined);
  const first=addStack(s,0,'ww_pippa_1',UPRIGHT);
  assert.equal(action(),undefined);
  const second=addStack(s,0,'ww_thimble_1',BUSY);
  assert.equal(action(),undefined);
  second.orientation=UPRIGHT;
  const a=action(); assert.ok(a); assert.equal(new Set(a.characters).size,2);
  const before=s.players[0].supply;
  await applyAction(s,0,a);
  assert.equal(first.orientation,BUSY); assert.equal(second.orientation,BUSY);
  assert.equal(s.players[0].supply,before+3);
});

test('A Shared Book needs both a Cat and a Mouse', () => {
  const s=newGame(); begin(s); addToHand(s,0,'ww_shared_book');
  addStack(s,0,'ww_inkwell_1',UPRIGHT); addStack(s,0,'ww_velvet_1',UPRIGHT);
  const offered=()=>legalActions(s,0).some(a=>a.cardId==='ww_shared_book');
  assert.equal(offered(),false);
  addStack(s,0,'ww_nib_1',UPRIGHT);
  assert.equal(offered(),true);
});

test('Cat upgrades preserve orientation and charge only the cost difference', async () => {
  const s=newGame(); begin(s); setSupply(s,0,10);
  const stack=addStack(s,0,'ww_thimble_1',BUSY); addToHand(s,0,'ww_thimble_2');
  const a=legalActions(s,0).find(a=>a.type==='recruit'&&a.upgrade&&a.cardId==='ww_thimble_2');
  assert.ok(a); assert.equal(a.cost,2);
  await applyAction(s,0,a);
  assert.equal(stack.cards.length,2); assert.equal(stack.orientation,BUSY);
  assert.equal(s.players[0].supply,9,'cost 2 minus the on-recruit Supply reward');
});

test('Pippa rewards only the first Botany Event each turn', async () => {
  const s=newGame(); setSupply(s,0,0); addStack(s,0,'ww_pippa_3',UPRIGHT);
  const event=id=>SET.cards.find(c=>c.id===id);
  await fireHook(s,'onEventPlayed',{player:0,eventDef:event('ww_fresh_batch')});
  assert.equal(s.players[0].supply,0);
  await fireHook(s,'onEventPlayed',{player:0,eventDef:event('ww_garden_helpers')});
  await fireHook(s,'onEventPlayed',{player:0,eventDef:event('ww_blossom_week')});
  assert.equal(s.players[0].supply,1);
});

test('Marmalade rewards her own completed shift, not a neighboring worker', async () => {
  const s=newGame(); setSupply(s,0,0);
  const cat=addStack(s,0,'ww_marmalade_3',UPRIGHT);
  const other=addStack(s,0,'ww_pippa_1',UPRIGHT);
  await fireHook(s,'onShiftCompleted',{player:0,stackUid:other.uid});
  assert.equal(s.players[0].supply,0);
  await fireHook(s,'onShiftCompleted',{player:0,stackUid:cat.uid});
  await fireHook(s,'onShiftCompleted',{player:0,stackUid:cat.uid});
  assert.equal(s.players[0].supply,1);
});

test('Rooftop Supper pays only once per turn and expires after two owner End phases', async () => {
  const s=newGame(); setSupply(s,0,0); addLimitedEvent(s,0,'ww_rooftop_supper',2);
  await fireHook(s,'onShiftCompleted',{player:0});
  await fireHook(s,'onShiftCompleted',{player:0});
  assert.equal(s.players[0].supply,1);
  await endPhase(s,0); assert.equal(s.players[0].events.length,1);
  await endPhase(s,0); assert.equal(s.players[0].events.length,0);
  assert.ok(s.players[0].dump.some(c=>c.cardId==='ww_rooftop_supper'));
});

test('Whiskerwood Fair includes all ten new Market cards and preserves nine Statues', () => {
  const market=SET.marketDecks.find(d=>d.id==='whiskerwood-fair');
  const deck=buildMarketDeck({rng:seedRng(17)},market);
  assert.equal(deck.length,25);
  assert.equal(deck.filter(id=>id.startsWith('st_')).length,9);
  for(const c of expansion.filter(c=>c.type==='market'))assert.ok(deck.includes(c.id));
});

test('Fairweight Scales discounts one recruit and one rehire, independently', async () => {
  const s=newGame(); begin(s); setSupply(s,0,10);
  const def=SET.cards.find(c=>c.id==='mk_fairweight_scales');
  await runEffect(s,0,def.onGain,{sourceCardId:def.id});
  addToHand(s,0,'ww_marmalade_1');
  const recruit=legalActions(s,0).find(a=>a.type==='recruit'&&a.cardId==='ww_marmalade_1');
  assert.equal(recruit.cost,0); await applyAction(s,0,recruit);
  assert.ok(!s.players[0].mods.some(m=>m.key==='recruitDiscount'));
  assert.ok(s.players[0].mods.some(m=>m.key==='rehireDiscount'));
  addToHand(s,0,'ww_copper_1');
  assert.equal(legalActions(s,0).find(a=>a.type==='recruit'&&a.cardId==='ww_copper_1').cost,1);
  addToUnemployment(s,0,'ww_inkwell_2');
  const rehire=legalActions(s,0).find(a=>a.type==='rehire'&&a.cardId==='ww_inkwell_2');
  assert.equal(rehire.cost,2); await applyAction(s,0,rehire);
  assert.ok(!s.players[0].mods.some(m=>m.key==='rehireDiscount'));
});
