import test from 'node:test';
import assert from 'node:assert/strict';
import { activateLegacyProfileV2, createProfileV2, prepareLegacyProfileV2, selectPermanentHero } from '../src/profile-v2.mjs';
import { initialState } from '../src/combat.mjs';
import { HERO_KIT_CATALOG_V1 } from '../src/hero-kits-v1.mjs';
import {
  G2R_SANDBOX_COMPANION_POLICY_V1, G2R_SANDBOX_POLICY_ID, G2R_SANDBOX_XP_POLICY_V1,
  G2R_SANDBOX_MAX_LEGAL_OPERATIONS, G2R_SANDBOX_MAX_OPERATIONS,
  applyG2RProgressionSandboxCommand, createG2RProgressionSandbox,
  migrateG2RProgressionSandboxCheckpointV1, migrateG2RProgressionSandboxV1,
  replayG2RCombatCheckpoint,
  sandboxReward, validateG2RProgressionSandbox
} from '../src/g2r-progression-sandbox-v1.mjs';
import {
  inspectG2RSandboxRecord, prepareG2RSandboxCommandCommit
} from '../src/g2r-progression-sandbox-store-v1.mjs';

const production = hero => ({ revision:4, profile:selectPermanentHero(createProfileV2(),hero) });
const command = (state, type, values={}) => applyG2RProgressionSandboxCommand(state,{type,...values},true);
const settle = (state, stage, outcome='victory', suffix=stage) => {
  const sequence=state.profile.ledgers.settledAttemptCount+1,attemptId=`pve:${sequence}:sandbox-${suffix}`;
  state=command(state,'begin',{attemptId,stageId:stage,seed:41000+stage});
  const skillIds=HERO_KIT_CATALOG_V1.find(hero=>hero.id===state.profile.selectedHeroId).skills.map(skill=>skill.id);
  for(let guard=0;guard<200&&state.combat?.state.phase==='fight';guard++){
    if(outcome==='victory')for(const skillId of skillIds){
      const target=['boss','raider','wisp'].find(id=>state.combat.state.units[id].hp>0);
      state=command(state,'combat_cast',{skillId,targetId:target});
    }
    state=command(state,'combat_tick',{count:20});
  }
  assert.equal(state.pendingResult?.outcome,outcome,`${attemptId} produced ${state.pendingResult?.outcome}`);
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

test('G2R-INT-03: victory and replay settle XP and gold once',()=>{
  let state=createG2RProgressionSandbox(production('hero_slot_1'));
  state=settle(state,1);assert.equal(state.profile.heroProgress.xp,15);assert.equal(state.profile.gold,40);
  const afterFirst=state;state=settle(state,1,'victory','replay');assert.equal(state.profile.heroProgress.xp,21);assert.equal(state.profile.gold,60);
  assert.strictEqual(command(state,'settle',{attemptSequence:3,attemptId:'pve:3:forged',outcome:'victory'}),state);
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
  assert.ok(inspectG2RSandboxRecord({formatVersion:2,revision:0,state}));
  assert.equal(inspectG2RSandboxRecord({formatVersion:3,revision:0,state}),null);
  assert.equal(inspectG2RSandboxRecord({formatVersion:2,revision:0,state:{...state,policyId:'drift'}}),null);
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
  state={...state,profile:{...state.profile,heroProgress:{...state.profile.heroProgress,level:16,
    xp:G2R_SANDBOX_XP_POLICY_V1.xpThresholds.at(-1),xpPolicyId:G2R_SANDBOX_XP_POLICY_V1.policyId,
    xpThresholds:[...G2R_SANDBOX_XP_POLICY_V1.xpThresholds],xpRewardTables:{
      firstClearXp:[...G2R_SANDBOX_XP_POLICY_V1.firstClearXp],replayXp:[...G2R_SANDBOX_XP_POLICY_V1.replayXp]},
    pendingSkillChoices:15}}};
  assert.equal(validateG2RProgressionSandbox(state),true);
  assert.equal(state.profile.heroProgress.level,16);assert.equal(state.profile.heroProgress.pendingSkillChoices,15);
  for(const skillId of ['skill1','skill2','skill3'])for(let i=0;i<4;i++)state=command(state,'skill',{skillId});
  for(let i=0;i<3;i++)state=command(state,'skill',{skillId:'ultimate'});
  assert.deepEqual(state.profile.heroProgress.skillRanks,{skill1:4,skill2:4,skill3:4,ultimate:3});
  assert.strictEqual(command(state,'skill',{skillId:'ultimate'}),state);
});

test('G2R-INT-04a: begin atomically creates matching attempt and replay-verifiable combat',()=>{
  const initial=createG2RProgressionSandbox(production('hero_slot_2'));
  const started=command(initial,'begin',{attemptId:'pve:1:persisted',stageId:1,seed:4401});
  assert.notStrictEqual(started,initial);
  assert.equal(started.profile.campaignAttempt.attemptId,'pve:1:persisted');
  assert.equal(started.combat.attemptId,'pve:1:persisted');
  assert.equal(started.combat.state.stageId,'stage-001');
  assert.deepEqual(replayG2RCombatCheckpoint(started.combat),started.combat.state);
  assert.strictEqual(command(initial,'combat_tick',{count:1}),initial,'combat without attempt is rejected');
});

test('G2R-INT-04a: casts and ticks persist exact engine transitions and reject forged state',()=>{
  let state=command(createG2RProgressionSandbox(production('hero_slot_4')),'begin',
    {attemptId:'pve:1:cast',stageId:1,seed:991});
  state=command(state,'combat_cast',{skillId:'ranger.aimed_shot',targetId:'boss'});
  assert.ok(state.combat.state.units.boss.statuses.mark);
  state=command(state,'combat_tick',{count:17});
  assert.equal(state.combat.state.tick,17);
  assert.ok(state.combat.state.cooldowns['ranger.aimed_shot']>0);
  assert.deepEqual(replayG2RCombatCheckpoint(state.combat),state.combat.state);
  for(const forged of [
    {...state,combat:null},
    {...state,profile:{...state.profile,campaignAttempt:null}},
    {...state,combat:{...state.combat,state:{...state.combat.state,tick:18}}},
    {...state,combat:{...state.combat,state:{...state.combat.state,outcome:'victory',phase:'victory'}}},
    {...state,combat:{...state.combat,state:{...state.combat.state,selectedHeroId:'hero_slot_1'}}},
    {...state,combat:{...state.combat,state:{...state.combat.state,party:['sentinel','ember','ash']}}},
    {...state,combat:{...state.combat,state:{...state.combat.state,skillRanks:{...state.combat.state.skillRanks,skill1:4}}}}
  ]) assert.equal(validateG2RProgressionSandbox(forged),false);
  const stale={...state,combat:{...state.combat,operations:state.combat.operations.slice(0,-1)}};
  assert.equal(validateG2RProgressionSandbox(stale),false);
});

test('G2R-INT-04a.1: checkpoint genesis must equal a canonical engine-created combat',()=>{
  const state=command(createG2RProgressionSandbox(production('hero_slot_4')),'begin',
    {attemptId:'pve:1:genesis',stageId:1,seed:7101});
  const forge=(mutate)=>{const checkpoint=structuredClone(state.combat);mutate(checkpoint.initialState);
    checkpoint.state=structuredClone(checkpoint.initialState);return{...state,combat:checkpoint}};
  for(const [label,forged] of [
    ['hp',forge(initial=>{initial.units.hero.hp-=1})],
    ['maxHp',forge(initial=>{initial.units.hero.maxHp+=1;initial.units.hero.hp+=1})],
    ['shield',forge(initial=>{initial.units.hero.shield=5})],
    ['status',forge(initial=>{initial.units.hero.statuses.mitigation={value:5,remaining:3}})],
    ['seed-rng',forge(initial=>{initial.seed+=1;initial.rng+=1})],
    ['profile-revision',forge(initial=>{initial.profileRevision+=1})],
    ['hero',forge(initial=>{initial.selectedHeroId='hero_slot_1'})],
    ['party',forge(initial=>{initial.party=['sentinel','ember','ash'];initial.units.ash={...initial.units.healer,id:'ash'};delete initial.units.healer})],
    ['ranks',forge(initial=>{initial.skillRanks.skill1=1})]
  ]) assert.equal(validateG2RProgressionSandbox(forged),false,label);
  const wrongEncounter=structuredClone(state);wrongEncounter.combat.encounterId='stage-010-first-story-boss-v1';
  wrongEncounter.combat.initialState.encounterId=wrongEncounter.combat.encounterId;
  wrongEncounter.combat.state.encounterId=wrongEncounter.combat.encounterId;
  assert.equal(validateG2RProgressionSandbox(wrongEncounter),false);
  const consistentTerminal=structuredClone(state);
  for(const id of ['boss','raider','wisp'])consistentTerminal.combat.initialState.units[id].hp=0;
  consistentTerminal.combat.operations=[{type:'tick',count:1}];
  consistentTerminal.combat.state=replayG2RCombatCheckpoint(consistentTerminal.combat);
  consistentTerminal.pendingResult={attemptSequence:1,attemptId:'pve:1:genesis',stageId:1,
    outcome:'victory',source:'local-untrusted'};
  assert.equal(consistentTerminal.combat.state.phase,'victory');
  assert.equal(validateG2RProgressionSandbox(consistentTerminal),false,'consistent forged genesis and terminal');
  assert.equal(validateG2RProgressionSandbox(state),true,'existing canonical empty-log checkpoint remains valid');
  const old=structuredClone(state);old.combat.checkpointVersion=1;delete old.combat.seed;
  const migrated=migrateG2RProgressionSandboxCheckpointV1(old);
  assert.equal(migrated.combat.checkpointVersion,2);assert.equal(migrated.combat.seed,7101);
  assert.equal(validateG2RProgressionSandbox(migrated),true);
});

test('G2R-INT-04a.1: invalid next state is rejected before commit and keeps revision',()=>{
  const state=command(createG2RProgressionSandbox(production('hero_slot_2')),'begin',
    {attemptId:'pve:1:commit-gate',stageId:1,seed:7201});
  const record={formatVersion:2,revision:9,state};
  const oversized=prepareG2RSandboxCommandCommit(record,9,{type:'combat_tick',count:1},current=>({
    ...structuredClone(current),combat:{...structuredClone(current.combat),
      operations:Array.from({length:G2R_SANDBOX_MAX_OPERATIONS+1},()=>({type:'tick',count:1}))}
  }));
  assert.deepEqual(oversized,{ok:false,code:'INVALID_NEXT_STATE',actualRevision:9});
  assert.equal(record.revision,9);assert.equal(record.state.combat.operations.length,0);
  assert.equal(G2R_SANDBOX_MAX_LEGAL_OPERATIONS,1303);
  assert.ok(G2R_SANDBOX_MAX_OPERATIONS>G2R_SANDBOX_MAX_LEGAL_OPERATIONS);
  assert.deepEqual(prepareG2RSandboxCommandCommit(record,8,{type:'combat_tick',count:1}),
    {ok:false,code:'STALE_REVISION',actualRevision:9});
});

test('G2R-INT-04a: only a real terminal checkpoint creates one pending result and settlement',()=>{
  let state=command(createG2RProgressionSandbox(production('hero_slot_2')),'begin',
    {attemptId:'pve:1:terminal',stageId:1,seed:31337});
  assert.strictEqual(command(state,'complete',{attemptSequence:1,attemptId:'pve:1:terminal',stageId:1,outcome:'victory'}),state);
  for(let guard=0;guard<200&&state.combat?.state.phase==='fight';guard++){
    state=command(state,'combat_cast',{skillId:'mage.fire_circle',targetId:'boss'});
    state=command(state,'combat_tick',{count:20});
  }
  assert.equal(state.combat.state.phase,'victory');
  assert.equal(state.pendingResult.outcome,'victory');
  const terminal=state;
  assert.strictEqual(command(state,'combat_tick',{count:1}),state);
  state=command(state,'settle',{attemptSequence:1,attemptId:'pve:1:terminal',outcome:'victory'});
  assert.equal(state.profile.heroProgress.xp,15);
  assert.equal(state.combat,null);
  const settled=state;
  assert.strictEqual(command(state,'settle',{attemptSequence:1,attemptId:'pve:1:terminal',outcome:'victory'}),state);
  assert.equal(settled.profile.gold,40);
  assert.notDeepEqual(terminal,settled);
});

test('G2R-INT-04a: v1 active attempt becomes explicit idempotent zero-reward recovery',()=>{
  let legacy=createG2RProgressionSandbox(production('hero_slot_3'));
  legacy=applyG2RProgressionSandboxCommand(legacy,{type:'begin',attemptId:'pve:1:legacy',stageId:1,seed:222});
  const old={...legacy,sandboxVersion:1};delete old.combat;delete old.recovery;
  const migrated=migrateG2RProgressionSandboxV1(old);
  assert.equal(migrated.recovery.kind,'legacy_missing_combat');
  assert.equal(migrated.pendingResult,null);
  const forfeited=command(migrated,'recovery_forfeit',{attemptSequence:1,attemptId:'pve:1:legacy'});
  assert.equal(forfeited.profile.campaignAttempt,null);
  assert.equal(forfeited.lastSettlement.outcome,'defeat');
  assert.equal(forfeited.lastSettlement.xp,0);assert.equal(forfeited.lastSettlement.gold,0);
  assert.strictEqual(command(forfeited,'recovery_forfeit',{attemptSequence:1,attemptId:'pve:1:legacy'}),forfeited);
});
