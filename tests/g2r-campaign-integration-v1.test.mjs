import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileV2, selectPermanentHero } from '../src/profile-v2.mjs';
import { createG2RCombat, stepG2RCombat } from '../src/g2r-combat-v1.mjs';
import { resolveG2REncounterV1 } from '../src/g2r-encounters-v1.mjs';
import {
  arriveG2RIntegrationStage, beginG2RIntegrationFight, createG2RCampaignSession,
  getG2RIntegrationNodeState, returnG2RIntegrationToMap, selectG2RIntegrationStage,
  updateG2RIntegrationCombat, validateG2RCampaignSession
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
