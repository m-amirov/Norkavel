import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../src/combat.mjs';
import { activateLegacyProfileV2, createProfileV2, prepareLegacyProfileV2, selectPermanentHero } from '../src/profile-v2.mjs';
import { castG2RHeroSkill, createG2RCombat, stepG2RCombat } from '../src/g2r-combat-v1.mjs';
import { resolveG2REncounterV1 } from '../src/g2r-encounters-v1.mjs';
import {
  arriveG2RIntegrationStage, beginG2RIntegrationFight, cancelG2RIntegrationPreview, createG2RCampaignSession,
  getG2RIntegrationNodeState, returnG2RIntegrationToMap, selectG2RIntegrationStage,
  updateG2RIntegrationCombat, validateG2RCampaignSession, validateG2RCampaignSessionTransition
} from '../src/g2r-campaign-integration-v1.mjs';
import { inspectSaveV2IntegrationRecord } from '../src/save-v2-store.mjs';

const profile=()=>selectPermanentHero(createProfileV2(),'hero_slot_1');

test('G2R-INT-01: chapter shell exposes only next stage and rejects locked travel',()=>{
  const session=createG2RCampaignSession(profile(),3);
  assert.equal(getG2RIntegrationNodeState(session,'stage-001'),'AVAILABLE');
  assert.equal(getG2RIntegrationNodeState(session,'stage-002'),'LOCKED');
  assert.strictEqual(selectG2RIntegrationStage(session,'stage-002'),session);
  const travelling=selectG2RIntegrationStage(session,'stage-001');
  assert.equal(travelling.phase,'travelling');
  assert.equal(arriveG2RIntegrationStage(travelling).phase,'preview');
});

test('G2R-INT-01: attempt binds canonical stage, encounter, hero and 1+3 party through result',()=>{
  const selected=profile(),base=createG2RCampaignSession(selected,3);
  const preview=arriveG2RIntegrationStage(selectG2RIntegrationStage(base,'stage-001'));
  const encounter=resolveG2REncounterV1('stage-001');
  let combat=createG2RCombat(selected,3,24071,undefined,encounter);
  let session=beginG2RIntegrationFight(preview,'int:3:stage-001:one',combat);
  assert.equal(validateG2RCampaignSession(session),true);
  assert.deepEqual(session.party,selected.party);
  while(combat.phase==='fight')combat=stepG2RCombat(combat);
  session=updateG2RIntegrationCombat(session,combat);
  assert.equal(session.phase,'result');
  assert.deepEqual(session.localResult,{resultVersion:1,attemptId:'int:3:stage-001:one',outcome:combat.outcome,
    trust:'local-untrusted',profileSettlement:'none'});
  const returned=returnG2RIntegrationToMap(session);
  assert.equal(returned.phase,'map');
  assert.deepEqual(returned.qaClearedStageIds,combat.outcome==='victory'?['stage-001']:[]);
  assert.deepEqual(selected.ledgers.firstClearStageIds,[],'persistent profile is not settled');
});

test('G2R-INT-01: mismatched stage/encounter and tampered restore fail closed',()=>{
  const selected=profile(),preview=arriveG2RIntegrationStage(selectG2RIntegrationStage(createG2RCampaignSession(selected,5),'stage-001'));
  const wrong=createG2RCombat(selected,5,77,undefined,resolveG2REncounterV1('stage-002'));
  assert.strictEqual(beginG2RIntegrationFight(preview,'attempt-wrong',wrong),preview);
  const record={formatVersion:1,revision:0,profileRevision:5,session:preview};
  assert.deepEqual(inspectSaveV2IntegrationRecord(record),record);
  assert.equal(inspectSaveV2IntegrationRecord({...record,session:{...preview,party:['sentinel','sentinel','healer']}}),null);
});

test('G2R-INT-01: stage-010 resolves only to the real first story boss contract',()=>{
  assert.equal(resolveG2REncounterV1('stage-010').encounterId,'first-story-boss-v1');
  assert.equal(resolveG2REncounterV1('stage-010','engineering.stage-010.v1'),null);
});

test('G2R-INT-02: valid snapshots cannot skip phases, stages, roll back QA clears or duplicate results',()=>{
  const selected=profile(),map=createG2RCampaignSession(selected,3);
  const travel=selectG2RIntegrationStage(map,'stage-001'),preview=arriveG2RIntegrationStage(travel);
  assert.equal(validateG2RCampaignSessionTransition(map,preview,selected),false,'map cannot jump to preview');
  assert.equal(validateG2RCampaignSessionTransition(map,{...travel,navigation:{...travel.navigation,targetStageId:'stage-002'}},selected),false);
  const cancelled=cancelG2RIntegrationPreview(preview);
  assert.equal(validateG2RCampaignSessionTransition(preview,cancelled,selected),true,'explicit preview cancel is allowed');
  assert.equal(cancelled.navigation.lastVisitedStageId,'stage-001');
  const cleared={...map,qaClearedStageIds:['stage-001']};
  assert.equal(validateG2RCampaignSession(cleared),true);
  assert.equal(validateG2RCampaignSessionTransition(cleared,map,selected),false,'QA ledger cannot roll back');
});

test('G2R-INT-02: forged HP/outcome/ranks/tick and active-attempt identity are rejected',()=>{
  const selected=profile(),preview=arriveG2RIntegrationStage(selectG2RIntegrationStage(createG2RCampaignSession(selected,4),'stage-001'));
  const combat=createG2RCombat(selected,4,91,undefined,resolveG2REncounterV1('stage-001'));
  const fight=beginG2RIntegrationFight(preview,'attempt-integrity-001',combat);
  const forgeries=[
    {...fight,combat:{...combat,tick:9}},
    {...fight,combat:{...combat,units:{...combat.units,boss:{...combat.units.boss,hp:1}}}},
    {...fight,combat:{...combat,skillRanks:{...combat.skillRanks,skill1:1}}},
    {...fight,attempt:{...fight.attempt,attemptId:'attempt-replaced-001'}},
    {...fight,attempt:{...fight.attempt,encounterId:'engineering.stage-002.v1'}}
  ];
  for(const [index,forged] of forgeries.entries()){
    if([0,1,3].includes(index))assert.equal(validateG2RCampaignSession(forged),true);
    assert.equal(validateG2RCampaignSessionTransition(fight,forged,selected),false);
  }
  const forgedOutcome={...fight,phase:'result',combat:{...combat,phase:'victory',outcome:'victory'},
    localResult:{resultVersion:1,attemptId:fight.attempt.attemptId,outcome:'victory',trust:'local-untrusted',profileSettlement:'none'}};
  assert.equal(validateG2RCampaignSession(forgedOutcome),true);
  assert.equal(validateG2RCampaignSessionTransition(fight,forgedOutcome,selected),false);
});

test('G2R-INT-02: only reproducible combat commands/ticks reach result and result is consumed once',()=>{
  const selected=profile();let session=arriveG2RIntegrationStage(selectG2RIntegrationStage(createG2RCampaignSession(selected,2),'stage-001'));
  let combat=createG2RCombat(selected,2,101,undefined,resolveG2REncounterV1('stage-001'));
  let next=beginG2RIntegrationFight(session,'attempt-result-once',combat);
  assert.equal(validateG2RCampaignSessionTransition(session,next,selected),true);session=next;
  while(session.phase==='fight'){
    combat=stepG2RCombat(session.combat);next=updateG2RIntegrationCombat(session,combat);
    assert.equal(validateG2RCampaignSessionTransition(session,next,selected),true);session=next;
  }
  const map=returnG2RIntegrationToMap(session);
  assert.equal(validateG2RCampaignSessionTransition(session,map,selected),true);
  assert.equal(validateG2RCampaignSessionTransition(session,session,selected),false,'duplicate result commit rejected');
});

test('G2R-INT-02: prepared legacy requires explicit activation and preserves checkpoint/progression',()=>{
  const legacy={schemaVersion:1,gameId:'norkavel',gameVersion:'0.1.0',revision:1,state:{...initialState(),gold:77}};
  const prepared=prepareLegacyProfileV2(legacy);
  if(prepared===null)return assert.fail('legacy fixture must be valid');
  const selected=selectPermanentHero(prepared,'hero_slot_2'),checkpoint=structuredClone(selected.legacyCheckpoint);
  assert.equal(createG2RCampaignSession(selected,1),null);
  const activated=activateLegacyProfileV2(selected);
  assert.deepEqual(activated.legacyCheckpoint,checkpoint);
  assert.equal(activated.gold,77);
  assert.deepEqual(activated.ledgers,selected.ledgers);
  assert.ok(createG2RCampaignSession(activated,2));
});

test('G2R-INT-02: sequential real engine route reaches stage-010 without ledger injection',()=>{
  const selected=selectPermanentHero(createProfileV2(),'hero_slot_2');let session=createG2RCampaignSession(selected,7);
  for(let number=1;number<=10;number++){
    const stageId=`stage-${String(number).padStart(3,'0')}`;
    assert.equal(getG2RIntegrationNodeState(session,stageId),'AVAILABLE');
    assert.equal(getG2RIntegrationNodeState(session,`stage-${String(Math.min(10,number+1)).padStart(3,'0')}`),number===10?'AVAILABLE':'LOCKED');
    session=arriveG2RIntegrationStage(selectG2RIntegrationStage(session,stageId));
    const encounter=resolveG2REncounterV1(stageId),combat=createG2RCombat(selected,7,700+number,undefined,encounter);
    session=beginG2RIntegrationFight(session,`sequential-attempt-${number}`,combat);
    while(session.phase==='fight'){
      let nextCombat=session.combat;
      const kit=['mage.fire_circle','mage.binding','mage.chain_lightning'];
      for(const skillId of kit){const targetId=['boss','raider','wisp'].find(id=>nextCombat.units[id].hp>0);const cast=castG2RHeroSkill(nextCombat,{combatCommandVersion:1,skillId,targetId});if(cast!==nextCombat){nextCombat=cast;break;}}
      if(nextCombat===session.combat)nextCombat=stepG2RCombat(nextCombat);
      session=updateG2RIntegrationCombat(session,nextCombat);
    }
    assert.equal(session.localResult.outcome,'victory',stageId);
    if(number===10)assert.equal(session.attempt.encounterId,'first-story-boss-v1');
    session=returnG2RIntegrationToMap(session);
    assert.equal(session.qaClearedStageIds.length,number);
  }
  assert.deepEqual(selected.ledgers.firstClearStageIds,[],'QA route never settles production profile');
});

test('G2R-INT-02: campaign defeat allows retry and cleared stage allows real replay without duplicate QA clear',()=>{
  const selected=selectPermanentHero(createProfileV2(),'hero_slot_2');let session=createG2RCampaignSession(selected,9);
  const start=(stageId,attemptId)=>{
    session=arriveG2RIntegrationStage(selectG2RIntegrationStage(session,stageId));
    session=beginG2RIntegrationFight(session,attemptId,createG2RCombat(selected,9,909,undefined,resolveG2REncounterV1(stageId)));
  };
  const win=(stageId,attemptId)=>{start(stageId,attemptId);while(session.phase==='fight'){
    let combat=session.combat;
    for(const skillId of ['mage.fire_circle','mage.binding','mage.chain_lightning']){
      const targetId=['boss','raider','wisp'].find(id=>combat.units[id].hp>0),cast=castG2RHeroSkill(combat,{combatCommandVersion:1,skillId,targetId});
      if(cast!==combat){combat=cast;break;}
    }
    if(combat===session.combat)combat=stepG2RCombat(combat);session=updateG2RIntegrationCombat(session,combat);
  }assert.equal(session.localResult.outcome,'victory');session=returnG2RIntegrationToMap(session);};
  for(let number=1;number<10;number++)win(`stage-${String(number).padStart(3,'0')}`,`setup-attempt-${number}`);
  start('stage-010','defeat-attempt-010');while(session.phase==='fight')session=updateG2RIntegrationCombat(session,stepG2RCombat(session.combat));
  assert.equal(session.localResult.outcome,'defeat');session=returnG2RIntegrationToMap(session);
  assert.equal(session.qaClearedStageIds.length,9);assert.equal(getG2RIntegrationNodeState(session,'stage-010'),'CURRENT');
  win('stage-010','retry-attempt-010');assert.equal(session.qaClearedStageIds.length,10);
  win('stage-010','replay-attempt-010');assert.equal(session.qaClearedStageIds.length,10);
  assert.deepEqual(selected.ledgers.firstClearStageIds,[]);
});
