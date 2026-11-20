import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_010_ENCOUNTER_V1, validateStage010Encounter } from '../src/stage-010-encounter-v1.mjs';
import { STAGE_010_STRATEGIES_V1, buildStage010Matrix, createStage010TrialProfile, runStage010Trial } from '../src/stage-010-trials-v1.mjs';
import { createG2RCombat, stepG2RCombat } from '../src/g2r-combat-v1.mjs';

test('G2R-F02d: stage-010 is a versioned reward-free story boss contract, separate from legacy stage 2',()=>{
  assert.equal(validateStage010Encounter(STAGE_010_ENCOUNTER_V1),true);
  assert.equal(STAGE_010_ENCOUNTER_V1.stageId,'stage-010');
  assert.equal(STAGE_010_ENCOUNTER_V1.encounterId,'first-story-boss-v1');
  assert.equal(STAGE_010_ENCOUNTER_V1.rewardMode,'none');
  assert.equal(STAGE_010_ENCOUNTER_V1.status,'engineering-candidate');
  assert.equal(validateStage010Encounter({...STAGE_010_ENCOUNTER_V1,stageId:'stage-002'}),false);
});

test('G2R-F02d: identical seed and commands reproduce the same real step simulation',()=>{
  for(const strategy of STAGE_010_STRATEGIES_V1){
    assert.deepEqual(runStage010Trial(strategy,24071),runStage010Trial(strategy,24071),strategy.id);
  }
});

test('G2R-F02d: four pre-boss companions make measurable distinct contributions',()=>{
  const eventTypes=new Set();
  for(const party of [['sentinel','ember','healer'],['sentinel','healer','ash']]){
    let state=createG2RCombat(createStage010TrialProfile('hero_slot_1',party),0,707);
    for(let tick=0;tick<120&&state.phase==='fight';tick++)state=stepG2RCombat(state);
    for(const entry of state.events)eventTypes.add(entry.type);
  }
  assert.equal(eventTypes.has('guard'),true,'Ard protects');
  assert.equal(eventTypes.has('elemental'),true,'Mira deals elemental damage');
  assert.equal(eventTypes.has('heal'),true,'Elira heals');
  assert.equal(eventTypes.has('ash_strike'),true,'Kair adds offense');
});

test('G2R-F02d: 32 fixed seeds prove two successful tactics per permanent hero and baseline losses',()=>{
  const matrix=buildStage010Matrix();
  assert.equal(matrix.seeds.length,32,'32 seeds is several dozen and samples deterministic target selection variance');
  assert.equal(matrix.rows.length,8);
  for(const row of matrix.rows){
    assert.equal(row.wins,32,row.strategyId);
    assert.equal(row.defeats,0,row.strategyId);
    assert.equal(row.party.includes('control'),false,'fifth companion is unavailable');
    assert.ok(row.telegraphs>0,row.strategyId);
    assert.ok(row.minTicks>0&&row.maxTicks<=1200,row.strategyId);
    assert.ok(row.minRemainingHp>0,row.strategyId);
  }
  for(const heroId of ['hero_slot_1','hero_slot_2','hero_slot_3','hero_slot_4']){
    assert.equal(matrix.rows.filter(row=>row.heroId===heroId).length,2);
    const baseline=matrix.baselines.find(row=>row.heroId===heroId);
    assert.equal(baseline.wins,0,heroId);
    assert.equal(baseline.defeats,32,heroId);
  }
  assert.ok(matrix.rows.find(row=>row.strategyId==='defender_interrupt').interrupts>0);
  assert.equal(matrix.rows.find(row=>row.strategyId==='defender_survival').interrupts,0);
  assert.ok(matrix.rows.find(row=>row.strategyId==='duelist_evade').evades>0);
});
