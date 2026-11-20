import test from 'node:test';
import assert from 'node:assert/strict';
import { activateLegacyProfileV2, createProfileV2, prepareLegacyProfileV2, selectPermanentHero } from '../src/profile-v2.mjs';
import { initialState } from '../src/combat.mjs';
import {
  G2R_SANDBOX_COMPANION_POLICY_V1, G2R_SANDBOX_POLICY_ID,
  applyG2RProgressionSandboxCommand, createG2RProgressionSandbox,
  sandboxReward, validateG2RProgressionSandbox
} from '../src/g2r-progression-sandbox-v1.mjs';
import { inspectG2RSandboxRecord } from '../src/g2r-progression-sandbox-store-v1.mjs';

const production = hero => ({ revision:4, profile:selectPermanentHero(createProfileV2(),hero) });
const command = (state, type, values={}) => applyG2RProgressionSandboxCommand(state,{type,...values});
const settle = (state, stage, outcome='victory', suffix=stage) => {
  const sequence=state.profile.ledgers.settledAttemptCount+1,attemptId=`pve:${sequence}:sandbox-${suffix}`;
  state=command(state,'begin',{attemptId,stageId:stage});
  state=command(state,'complete',{attemptSequence:sequence,attemptId,stageId:stage,outcome});
  return command(state,'settle',{attemptSequence:sequence,attemptId,outcome});
};

test('G2R-INT-03: sandbox is isolated and explicitly untrusted/candidate/noncompetitive',()=>{
  const source=production('hero_slot_2'),state=createG2RProgressionSandbox(source);
  assert.equal(validateG2RProgressionSandbox(state),true);
  assert.equal(state.source,'local-untrusted');assert.equal(state.policyId,G2R_SANDBOX_POLICY_ID);
  assert.equal(state.competitiveEligible,false);assert.equal(state.releaseEligible,false);
  assert.notStrictEqual(state.profile,source.profile);assert.equal(source.profile.gold,0);
  assert.equal(state.profile.legacyCheckpoint,null);
});

test('G2R-INT-03: victory/replay/defeat settle XP and gold once with milestones',()=>{
  let state=createG2RProgressionSandbox(production('hero_slot_1'));
  state=settle(state,1);assert.equal(state.profile.heroProgress.xp,15);assert.equal(state.profile.gold,40);
  const afterFirst=state;state=settle(state,1,'victory','replay');assert.equal(state.profile.heroProgress.xp,21);assert.equal(state.profile.gold,60);
  state=settle(state,2,'defeat','loss');assert.equal(state.profile.heroProgress.xp,21);assert.equal(state.profile.gold,60);
  assert.strictEqual(command(state,'settle',{attemptSequence:3,attemptId:'pve:3:sandbox-loss',outcome:'victory'}),state);
  assert.deepEqual(afterFirst.profile.ledgers.firstClearStageIds,['stage:1']);
});

test('G2R-INT-03: chapter one reaches level 5, unlocks Kair then controller only on first clear',()=>{
  for(const heroId of ['hero_slot_1','hero_slot_2','hero_slot_3','hero_slot_4']){
    let state=createG2RProgressionSandbox(production(heroId));
    for(let stage=1;stage<=10;stage++)state=settle(state,stage,'victory',`${heroId}-${stage}`);
    assert.equal(state.profile.heroProgress.level,5);assert.equal(state.profile.heroProgress.xp,310);
    assert.deepEqual(state.profile.ledgers.unlockReceiptIds,['stage_3_first_clear','first_story_boss_first_clear']);
    assert.deepEqual(state.profile.unlockedCompanionIds,['sentinel','ember','healer','ash','control']);
    const receipts=[...state.profile.ledgers.unlockReceiptIds];state=settle(state,10,'victory',`${heroId}-boss-replay`);
    assert.deepEqual(state.profile.ledgers.unlockReceiptIds,receipts);
  }
});

test('G2R-INT-03: skill choice and companion purchases reuse Profile v2 gates',()=>{
  let state=createG2RProgressionSandbox(production('hero_slot_4'));
  for(let stage=1;stage<=3;stage++)state=settle(state,stage,'victory',stage);
  assert.equal(state.profile.heroProgress.level,2);assert.equal(state.profile.heroProgress.pendingSkillChoices,1);
  state=command(state,'skill',{skillId:'skill1'});assert.equal(state.profile.heroProgress.skillRanks.skill1,1);
  const beforeUltimate=state;assert.strictEqual(command(state,'skill',{skillId:'ultimate'}),state);
  const level=state.profile.companionProgress[3].level,sequence=state.profile.ledgers.settledPurchaseCount+1;
  state=command(state,'purchase',{purchaseSequence:sequence,purchaseId:`companion:${sequence}:kair`,companionId:'ash',expectedLevel:level});
  assert.equal(state.profile.companionProgress[3].level,2);assert.equal(state.profile.gold,84);
  assert.equal(G2R_SANDBOX_COMPANION_POLICY_V1.costs[0],60);assert.notStrictEqual(state,beforeUltimate);
});

test('G2R-INT-03: insufficient, locked, stale and policy/corrupt records fail closed',()=>{
  let state=createG2RProgressionSandbox(production('hero_slot_3'));
  const buy=(companionId,expectedLevel=1)=>command(state,'purchase',{purchaseSequence:1,purchaseId:'companion:1:denied',companionId,expectedLevel});
  assert.strictEqual(buy('sentinel'),state);assert.strictEqual(buy('ash'),state);assert.strictEqual(buy('sentinel',2),state);
  assert.ok(inspectG2RSandboxRecord({formatVersion:1,revision:0,state}));
  assert.equal(inspectG2RSandboxRecord({formatVersion:2,revision:0,state}),null);
  assert.equal(inspectG2RSandboxRecord({formatVersion:1,revision:0,state:{...state,policyId:'drift'}}),null);
  assert.equal(sandboxReward(1,'first_clear','defeat').xp,0);
});

test('G2R-INT-03: activated legacy binds hero but never imports legacy economy into sandbox',()=>{
  const legacy={schemaVersion:1,gameId:'norkavel',gameVersion:'0.1.0',revision:8,
    state:{...initialState(),gold:777,claimed:[1,2]}};
  const active=selectPermanentHero(activateLegacyProfileV2(prepareLegacyProfileV2(legacy)),'hero_slot_1');
  const state=createG2RProgressionSandbox({revision:9,profile:active});
  assert.equal(state.profile.gold,0);assert.deepEqual(state.profile.ledgers.firstClearStageIds,[]);
  assert.equal(state.profile.legacyCheckpoint,null);assert.equal(state.productionBinding.selectedHeroId,'hero_slot_1');
});

test('G2R-INT-03: level 16 and rank caps remain Profile v2 invariants in sandbox',()=>{
  let state=createG2RProgressionSandbox(production('hero_slot_4'));
  for(let stage=1;stage<=50;stage++)state=settle(state,stage,'victory',`cap-${stage}`);
  assert.equal(state.profile.heroProgress.level,16);assert.equal(state.profile.heroProgress.pendingSkillChoices,15);
  for(const skillId of ['skill1','skill2','skill3'])for(let i=0;i<4;i++)state=command(state,'skill',{skillId});
  for(let i=0;i<3;i++)state=command(state,'skill',{skillId:'ultimate'});
  assert.deepEqual(state.profile.heroProgress.skillRanks,{skill1:4,skill2:4,skill3:4,ultimate:3});
  assert.strictEqual(command(state,'skill',{skillId:'ultimate'}),state);
});
