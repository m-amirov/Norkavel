import {
  assignCompanionSlot, beginCampaignAttempt, createProfileV2, selectPermanentHero,
  settleVerifiedCampaignResult, upgradeCompanion, upgradeHeroSkill, validateProfileV2
} from './profile-v2.mjs';
import {
  G2R_COMBAT_CANDIDATE_POLICY_V1, castG2RHeroSkill, createG2RCombat,
  stepG2RCombat, validateG2RCombatState
} from './g2r-combat-v1.mjs';
import { HERO_KIT_CATALOG_V1 } from './hero-kits-v1.mjs';
import { resolveG2REncounterV1 } from './g2r-encounters-v1.mjs';
import { VERSION, XP_THRESHOLDS, battleReward, companionUpgradeCost, stageFirstClearReward, stageReplayReward } from './economy-candidate-v1.mjs';

export const G2R_SANDBOX_VERSION = 2;
export const G2R_SANDBOX_POLICY_ID = VERSION;
export const G2R_SANDBOX_SOURCE = 'local-untrusted';
export const G2R_SANDBOX_MAX_OPERATIONS = 2000;
export const G2R_SANDBOX_MAX_LEGAL_OPERATIONS = G2R_COMBAT_CANDIDATE_POLICY_V1.maxTicks +
  Math.max(...HERO_KIT_CATALOG_V1.map(hero=>hero.skills.reduce((total,skill)=>total+
    Math.ceil(G2R_COMBAT_CANDIDATE_POLICY_V1.maxTicks/G2R_COMBAT_CANDIDATE_POLICY_V1.cooldowns[skill.id]),0)));
const clone=value=>structuredClone(value);
const exact=(value,fields)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===fields.length&&fields.every(field=>Object.hasOwn(value,field));
const integer=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
const equal=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const canonicalStageId=stage=>`stage-${String(stage).padStart(3,'0')}`;

export const G2R_SANDBOX_XP_POLICY_V1=Object.freeze({policyVersion:1,policyId:G2R_SANDBOX_POLICY_ID,
  xpThresholds:Object.freeze(XP_THRESHOLDS.slice(1)),
  firstClearXp:Object.freeze(Array.from({length:50},(_,index)=>stageFirstClearReward(index+1).xp)),
  replayXp:Object.freeze(Array.from({length:50},(_,index)=>stageReplayReward(index+1).xp))});
export const G2R_SANDBOX_COMPANION_POLICY_V1=Object.freeze({policyVersion:1,policyId:G2R_SANDBOX_POLICY_ID,maxLevel:100,
  costs:Object.freeze(Array.from({length:99},(_,index)=>companionUpgradeCost(index+1)))});

export function sandboxReward(stage,rewardClass,outcome){
  if(!integer(stage,1,50)||!['first_clear','replay'].includes(rewardClass)||!['victory','defeat'].includes(outcome))return null;
  return battleReward(stage,outcome,rewardClass==='first_clear');
}
function validSettlement(value){if(value===null)return true;return exact(value,['receiptId','attemptId','stageId','outcome','rewardClass','xp','gold','source'])&&
  typeof value.receiptId==='string'&&value.receiptId.length>0&&value.receiptId.length<=128&&typeof value.attemptId==='string'&&
  [`dev:${value.attemptId}`,`dev-forfeit:${value.attemptId}`].includes(value.receiptId)&&integer(value.stageId,1,50)&&
  ['victory','defeat'].includes(value.outcome)&&['first_clear','replay'].includes(value.rewardClass)&&integer(value.xp)&&integer(value.gold)&&value.source===G2R_SANDBOX_SOURCE}
function validPending(value,attempt){return value===null||(attempt&&exact(value,['attemptSequence','attemptId','stageId','outcome','source'])&&
  integer(value.attemptSequence,1)&&typeof value.attemptId==='string'&&integer(value.stageId,1,50)&&['victory','defeat'].includes(value.outcome)&&
  value.source===G2R_SANDBOX_SOURCE&&value.attemptSequence===attempt.sequence&&value.attemptId===attempt.attemptId&&value.stageId===attempt.stageId)}

function applyCombatOperation(combatState,operation){
  if(operation.type==='cast')return castG2RHeroSkill(combatState,{combatCommandVersion:1,skillId:operation.skillId,targetId:operation.targetId});
  if(operation.type==='tick'){let next=combatState;for(let index=0;index<operation.count&&next.phase==='fight';index++)next=stepG2RCombat(next);return next}
  return combatState;
}
export function replayG2RCombatCheckpoint(checkpoint){
  if(!checkpoint||!validateG2RCombatState(checkpoint.initialState)||!Array.isArray(checkpoint.operations)||checkpoint.operations.length>G2R_SANDBOX_MAX_OPERATIONS)return null;
  let state=clone(checkpoint.initialState);
  for(const operation of checkpoint.operations){const validCast=exact(operation,['type','skillId','targetId'])&&operation.type==='cast'&&typeof operation.skillId==='string'&&typeof operation.targetId==='string';
    const validTick=exact(operation,['type','count'])&&operation.type==='tick'&&integer(operation.count,1,20);
    if((!validCast&&!validTick)||state.phase!=='fight')return null;const next=applyCombatOperation(state,operation);if(next===state)return null;state=next}
  return state;
}
function canonicalCombatGenesis(checkpoint,profile,profileRevision){
  const encounter=resolveG2REncounterV1(canonicalStageId(checkpoint?.stageId),checkpoint?.encounterId);
  if(!encounter||!integer(profileRevision))return null;
  const preCombatProfile={...clone(profile),campaignAttempt:null};
  if(!validateProfileV2(preCombatProfile))return null;
  return createG2RCombat(preCombatProfile,profileRevision,checkpoint.seed,
    G2R_COMBAT_CANDIDATE_POLICY_V1,encounter);
}
function validCombatCheckpoint(checkpoint,profile,profileRevision){const attempt=profile.campaignAttempt;if(!attempt||!exact(checkpoint,['checkpointVersion','attemptSequence','attemptId','stageId','encounterId','seed','initialState','operations','state'])||checkpoint.checkpointVersion!==2||
  checkpoint.attemptSequence!==attempt.sequence||checkpoint.attemptId!==attempt.attemptId||checkpoint.stageId!==attempt.stageId||checkpoint.state.stageId!==canonicalStageId(attempt.stageId)||
  !integer(checkpoint.seed,1)||checkpoint.initialState.seed!==checkpoint.seed||
  checkpoint.encounterId!==checkpoint.state.encounterId||checkpoint.initialState.stageId!==checkpoint.state.stageId||checkpoint.initialState.encounterId!==checkpoint.encounterId||
  !validateG2RCombatState(checkpoint.state)||checkpoint.state.selectedHeroId!==profile.selectedHeroId||checkpoint.state.heroLevel!==profile.heroProgress.level||
  !equal(checkpoint.state.skillRanks,profile.heroProgress.skillRanks)||!equal(checkpoint.state.party,profile.party))return false;
  const genesis=canonicalCombatGenesis(checkpoint,profile,profileRevision);
  if(genesis===null||!equal(genesis,checkpoint.initialState))return false;
  const replayed=replayG2RCombatCheckpoint(checkpoint);return replayed!==null&&equal(replayed,checkpoint.state)}
function validRecovery(recovery,profile){const attempt=profile.campaignAttempt;return recovery!==null&&attempt&&exact(recovery,['recoveryVersion','kind','attemptSequence','attemptId','stageId'])&&
  recovery.recoveryVersion===1&&recovery.kind==='legacy_missing_combat'&&recovery.attemptSequence===attempt.sequence&&recovery.attemptId===attempt.attemptId&&recovery.stageId===attempt.stageId}

export function createG2RProgressionSandbox(productionRecord){const production=productionRecord?.profile;if(!integer(productionRecord?.revision)||!validateProfileV2(production)||production.selectedHeroId===null||(production.legacyProgress&&!production.legacyProgress.activated))return null;
  const profile=selectPermanentHero(createProfileV2(),production.selectedHeroId);return{sandboxVersion:G2R_SANDBOX_VERSION,source:G2R_SANDBOX_SOURCE,policyId:G2R_SANDBOX_POLICY_ID,
    competitiveEligible:false,releaseEligible:false,productionBinding:{revision:productionRecord.revision,selectedHeroId:production.selectedHeroId},profile,combat:null,pendingResult:null,recovery:null,lastSettlement:null}}
export function validateG2RProgressionSandbox(state){if(!exact(state,['sandboxVersion','source','policyId','competitiveEligible','releaseEligible','productionBinding','profile','combat','pendingResult','recovery','lastSettlement'])||
  state.sandboxVersion!==G2R_SANDBOX_VERSION||state.source!==G2R_SANDBOX_SOURCE||state.policyId!==G2R_SANDBOX_POLICY_ID||state.competitiveEligible!==false||state.releaseEligible!==false||
  !exact(state.productionBinding,['revision','selectedHeroId'])||!integer(state.productionBinding.revision)||!validateProfileV2(state.profile)||state.profile.selectedHeroId!==state.productionBinding.selectedHeroId||
  state.profile.legacyProgress!==null||state.profile.legacyCheckpoint!==null||!validPending(state.pendingResult,state.profile.campaignAttempt)||!validSettlement(state.lastSettlement))return false;
  const attempt=state.profile.campaignAttempt;if(!attempt)return state.combat===null&&state.pendingResult===null&&state.recovery===null;
  if(state.recovery!==null)return state.combat===null&&state.pendingResult===null&&validRecovery(state.recovery,state.profile);
  if(!validCombatCheckpoint(state.combat,state.profile,state.productionBinding.revision))return false;return state.combat.state.phase==='fight'?state.pendingResult===null:state.pendingResult!==null&&state.pendingResult.outcome===state.combat.state.outcome}

function legacyV1Shape(state){return state&&state.sandboxVersion===1&&state.source===G2R_SANDBOX_SOURCE&&state.policyId===G2R_SANDBOX_POLICY_ID&&state.competitiveEligible===false&&state.releaseEligible===false&&
  exact(state.productionBinding,['revision','selectedHeroId'])&&integer(state.productionBinding.revision)&&validateProfileV2(state.profile)&&state.profile.selectedHeroId===state.productionBinding.selectedHeroId&&
  state.profile.legacyProgress===null&&state.profile.legacyCheckpoint===null&&validPending(state.pendingResult,state.profile.campaignAttempt)&&validSettlement(state.lastSettlement)}
export function migrateG2RProgressionSandboxV1(state){if(!legacyV1Shape(state))return null;const next={...clone(state),sandboxVersion:G2R_SANDBOX_VERSION,combat:null,pendingResult:null,recovery:null};const attempt=next.profile.campaignAttempt;
  if(attempt)next.recovery={recoveryVersion:1,kind:'legacy_missing_combat',attemptSequence:attempt.sequence,attemptId:attempt.attemptId,stageId:attempt.stageId};return validateG2RProgressionSandbox(next)?next:null}
export function migrateG2RProgressionSandboxCheckpointV1(state){
  if(!state||state.sandboxVersion!==G2R_SANDBOX_VERSION||!state.combat||state.combat.checkpointVersion!==1||
    !exact(state.combat,['checkpointVersion','attemptSequence','attemptId','stageId','encounterId','initialState','operations','state'])||
    !validateG2RCombatState(state.combat.initialState)||!Array.isArray(state.combat.operations)||
    state.combat.operations.length>G2R_SANDBOX_MAX_OPERATIONS||
    !equal(replayG2RCombatCheckpoint(state.combat),state.combat.state))return null;
  const next=clone(state);next.combat={...next.combat,checkpointVersion:2,seed:next.combat.initialState.seed};
  return validateG2RProgressionSandbox(next)?next:null;
}
function finishCombatTransition(state,checkpoint){const next={...clone(state),combat:checkpoint};if(checkpoint.state.phase!=='fight'){const attempt=next.profile.campaignAttempt;next.pendingResult={attemptSequence:attempt.sequence,attemptId:attempt.attemptId,stageId:attempt.stageId,outcome:checkpoint.state.outcome,source:G2R_SANDBOX_SOURCE}}
  return next}

export function applyG2RProgressionSandboxCommand(state,command,validated=false){if((!validated&&!validateG2RProgressionSandbox(state))||!command||typeof command!=='object')return state;let profile;
  if(command.type==='begin'){const withSeed=exact(command,['type','attemptId','stageId','seed']);if((!withSeed&&!exact(command,['type','attemptId','stageId']))||!integer(command.stageId,1,50))return state;const seed=withSeed?command.seed:31000+command.stageId;if(!integer(seed,1))return state;
    const encounter=resolveG2REncounterV1(canonicalStageId(command.stageId)),initialState=encounter&&createG2RCombat(state.profile,state.productionBinding.revision,seed,undefined,encounter);if(!initialState)return state;
    profile=beginCampaignAttempt(state.profile,{attemptId:command.attemptId,stageId:command.stageId});if(profile===state.profile)return state;const attempt=profile.campaignAttempt;
    const combat={checkpointVersion:2,attemptSequence:attempt.sequence,attemptId:attempt.attemptId,stageId:attempt.stageId,encounterId:initialState.encounterId,seed,initialState,operations:[],state:clone(initialState)};
    return {...clone(state),profile,combat,pendingResult:null,recovery:null,lastSettlement:null}}
  if(command.type==='combat_cast'){if(!exact(command,['type','skillId','targetId'])||state.combat?.state.phase!=='fight')return state;const operation={type:'cast',skillId:command.skillId,targetId:command.targetId},nextState=applyCombatOperation(state.combat.state,operation);if(nextState===state.combat.state)return state;
    return finishCombatTransition(state,{...clone(state.combat),operations:[...state.combat.operations,operation],state:nextState})}
  if(command.type==='combat_tick'){if(!exact(command,['type','count'])||!integer(command.count,1,20)||state.combat?.state.phase!=='fight')return state;const operation={type:'tick',count:command.count},nextState=applyCombatOperation(state.combat.state,operation);if(nextState===state.combat.state)return state;
    return finishCombatTransition(state,{...clone(state.combat),operations:[...state.combat.operations,operation],state:nextState})}
  if(command.type==='complete')return state;
  if(command.type==='settle'){if(!exact(command,['type','attemptSequence','attemptId','outcome'])||state.profile.campaignAttempt===null||state.pendingResult===null||state.combat?.state.phase==='fight'||command.attemptSequence!==state.pendingResult.attemptSequence||command.attemptId!==state.pendingResult.attemptId||command.outcome!==state.pendingResult.outcome||command.outcome!==state.combat.state.outcome)return state;
    const attempt=state.profile.campaignAttempt,reward=sandboxReward(attempt.stageId,attempt.rewardClass,command.outcome);if(!reward)return state;profile=settleVerifiedCampaignResult(state.profile,{resultVersion:1,attemptSequence:command.attemptSequence,attemptId:command.attemptId,outcome:command.outcome},G2R_SANDBOX_XP_POLICY_V1);
    if(profile===state.profile||!Number.isSafeInteger(profile.gold+reward.gold))return state;profile={...profile,gold:profile.gold+reward.gold};if(!validateProfileV2(profile))return state;return{...clone(state),profile,combat:null,pendingResult:null,recovery:null,lastSettlement:{receiptId:`dev:${command.attemptId}`,attemptId:command.attemptId,stageId:attempt.stageId,outcome:command.outcome,rewardClass:attempt.rewardClass,xp:reward.xp,gold:reward.gold,source:G2R_SANDBOX_SOURCE}}}
  if(command.type==='recovery_forfeit'){if(!exact(command,['type','attemptSequence','attemptId'])||!state.recovery||command.attemptSequence!==state.recovery.attemptSequence||command.attemptId!==state.recovery.attemptId)return state;const attempt=state.profile.campaignAttempt;
    profile=settleVerifiedCampaignResult(state.profile,{resultVersion:1,attemptSequence:attempt.sequence,attemptId:attempt.attemptId,outcome:'defeat'},G2R_SANDBOX_XP_POLICY_V1);if(profile===state.profile)return state;return{...clone(state),profile,combat:null,pendingResult:null,recovery:null,lastSettlement:{receiptId:`dev-forfeit:${attempt.attemptId}`,attemptId:attempt.attemptId,stageId:attempt.stageId,outcome:'defeat',rewardClass:attempt.rewardClass,xp:0,gold:0,source:G2R_SANDBOX_SOURCE}}}
  if(state.profile.campaignAttempt!==null||state.combat!==null||state.pendingResult!==null||state.recovery!==null)return state;
  if(command.type==='skill'){if(!exact(command,['type','skillId']))return state;profile=upgradeHeroSkill(state.profile,command.skillId)}else if(command.type==='purchase'){if(!exact(command,['type','purchaseSequence','purchaseId','companionId','expectedLevel']))return state;profile=upgradeCompanion(state.profile,{purchaseVersion:1,purchaseSequence:command.purchaseSequence,purchaseId:command.purchaseId,companionId:command.companionId,expectedLevel:command.expectedLevel},G2R_SANDBOX_COMPANION_POLICY_V1)}else if(command.type==='party'){if(!exact(command,['type','slotIndex','companionId']))return state;profile=assignCompanionSlot(state.profile,command.slotIndex,command.companionId)}else return state;
  return profile===state.profile?state:{...clone(state),profile}}
