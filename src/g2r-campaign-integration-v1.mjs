import { CAMPAIGN_V1, createCampaignNavigation, validateCampaignNavigation } from './campaign-v1.mjs';
import { validateG2RCombatState } from './g2r-combat-v1.mjs';
import { resolveG2REncounterV1 } from './g2r-encounters-v1.mjs';
import { validateProfileV2 } from './profile-v2.mjs';

export const G2R_INT_01_VERSION = 1;
const clone = value => structuredClone(value);
const exact = (value, fields) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field));
const stageNumber = id => /^stage-\d{3}$/.test(id ?? '') ? Number(id.slice(6)) : NaN;

export function createG2RCampaignSession(profile, profileRevision) {
  if (!validateProfileV2(profile) || profile.selectedHeroId === null || !Number.isSafeInteger(profileRevision)) return null;
  return { integrationVersion:1, profileRevision, selectedHeroId:profile.selectedHeroId, party:[...profile.party],
    phase:'map', navigation:createCampaignNavigation(), qaClearedStageIds:[], attempt:null, combat:null, localResult:null };
}

export function getG2RIntegrationNodeState(session, stageId) {
  const number=stageNumber(stageId); if(!validateG2RCampaignSession(session)||number<1||number>10)return null;
  if(session.navigation.lastVisitedStageId===stageId)return 'CURRENT';
  if(session.qaClearedStageIds.includes(stageId))return 'CLEARED';
  return number===session.qaClearedStageIds.length+1?'AVAILABLE':'LOCKED';
}

export function selectG2RIntegrationStage(session, stageId) {
  const state=getG2RIntegrationNodeState(session,stageId);
  if(session.phase!=='map'||!['AVAILABLE','CLEARED','CURRENT'].includes(state))return session;
  const next=clone(session); next.phase='travelling'; next.navigation={navigationVersion:1,phase:'travelling',
    lastVisitedStageId:session.navigation.lastVisitedStageId,targetStageId:stageId,previewStageId:null}; return next;
}

export function arriveG2RIntegrationStage(session) {
  if(!validateG2RCampaignSession(session)||session.phase!=='travelling')return session;
  const next=clone(session),id=next.navigation.targetStageId; next.phase='preview';
  next.navigation={navigationVersion:1,phase:'stage_preview',lastVisitedStageId:id,targetStageId:null,previewStageId:id}; return next;
}

export function beginG2RIntegrationFight(session, attemptId, combat) {
  if(!validateG2RCampaignSession(session)||session.phase!=='preview'||typeof attemptId!=='string'||attemptId.length<8||
      !validateG2RCombatState(combat)||combat.stageId!==session.navigation.previewStageId||
      combat.profileRevision!==session.profileRevision||combat.selectedHeroId!==session.selectedHeroId||
      JSON.stringify(combat.party)!==JSON.stringify(session.party))return session;
  const encounter=resolveG2REncounterV1(combat.stageId,combat.encounterId); if(!encounter)return session;
  const next=clone(session); next.phase='fight'; next.attempt={attemptVersion:1,attemptId,stageId:combat.stageId,
    encounterId:combat.encounterId,trust:'local-untrusted'}; next.combat=clone(combat); return next;
}

export function updateG2RIntegrationCombat(session, combat) {
  if(!validateG2RCampaignSession(session)||session.phase!=='fight'||!validateG2RCombatState(combat)||
      combat.stageId!==session.attempt.stageId||combat.encounterId!==session.attempt.encounterId||
      combat.selectedHeroId!==session.selectedHeroId||JSON.stringify(combat.party)!==JSON.stringify(session.party))return session;
  const next=clone(session); next.combat=clone(combat);
  if(combat.phase!=='fight'){next.phase='result';next.localResult={resultVersion:1,attemptId:next.attempt.attemptId,
    outcome:combat.outcome,trust:'local-untrusted',profileSettlement:'none'};} return next;
}

export function returnG2RIntegrationToMap(session) {
  if(!validateG2RCampaignSession(session)||session.phase!=='result')return session;
  const next=clone(session),id=next.attempt.stageId;
  if(next.localResult.outcome==='victory'&&!next.qaClearedStageIds.includes(id))next.qaClearedStageIds.push(id);
  next.phase='map';next.navigation={navigationVersion:1,phase:'chapter_map',lastVisitedStageId:id,targetStageId:null,previewStageId:null};
  next.attempt=null;next.combat=null;next.localResult=null;return next;
}

export function validateG2RCampaignSession(session) {
  if(!exact(session,['integrationVersion','profileRevision','selectedHeroId','party','phase','navigation','qaClearedStageIds','attempt','combat','localResult'])||
    session.integrationVersion!==1||!Number.isSafeInteger(session.profileRevision)||session.profileRevision<0||
    typeof session.selectedHeroId!=='string'||!Array.isArray(session.party)||session.party.length!==3||new Set(session.party).size!==3||
    !['map','travelling','preview','fight','result'].includes(session.phase)||!validateCampaignNavigation(session.navigation)||
    !Array.isArray(session.qaClearedStageIds)||session.qaClearedStageIds.some((id,index)=>id!==`stage-${String(index+1).padStart(3,'0')}`)||session.qaClearedStageIds.length>10)return false;
  if(session.phase==='map'||session.phase==='travelling'||session.phase==='preview')return session.attempt===null&&session.combat===null&&session.localResult===null;
  if(!exact(session.attempt,['attemptVersion','attemptId','stageId','encounterId','trust'])||session.attempt.attemptVersion!==1||
    session.attempt.trust!=='local-untrusted'||!resolveG2REncounterV1(session.attempt.stageId,session.attempt.encounterId)||
    !validateG2RCombatState(session.combat)||session.combat.stageId!==session.attempt.stageId||session.combat.encounterId!==session.attempt.encounterId||
    session.combat.profileRevision!==session.profileRevision||session.combat.selectedHeroId!==session.selectedHeroId||JSON.stringify(session.combat.party)!==JSON.stringify(session.party))return false;
  if(session.phase==='fight')return session.combat.phase==='fight'&&session.localResult===null;
  return session.combat.phase!=='fight'&&exact(session.localResult,['resultVersion','attemptId','outcome','trust','profileSettlement'])&&
    session.localResult.resultVersion===1&&session.localResult.attemptId===session.attempt.attemptId&&session.localResult.outcome===session.combat.outcome&&
    session.localResult.trust==='local-untrusted'&&session.localResult.profileSettlement==='none';
}

export function integrationStage(stageId){return CAMPAIGN_V1.stages.find(stage=>stage.id===stageId)??null;}
