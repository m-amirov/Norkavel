import { applyG2RProgressionSandboxCommand, createG2RProgressionSandbox } from '../src/g2r-progression-sandbox-v1.mjs';
import { createProfileV2, selectPermanentHero } from '../src/profile-v2.mjs';
import { HERO_KIT_CATALOG_V1 } from '../src/hero-kits-v1.mjs';
import { runStage010Trial, STAGE_010_STRATEGIES_V1 } from '../src/stage-010-trials-v1.mjs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const heroes=['hero_slot_1','hero_slot_2','hero_slot_3','hero_slot_4'];
function settle(state,stage,suffix){const sequence=state.profile.ledgers.settledAttemptCount+1,attemptId=`pve:${sequence}:balance-${suffix}`;
  state=applyG2RProgressionSandboxCommand(state,{type:'begin',attemptId,stageId:stage,seed:51000+stage},true);
  const skillIds=HERO_KIT_CATALOG_V1.find(hero=>hero.id===state.profile.selectedHeroId).skills.map(skill=>skill.id);
  for(let guard=0;guard<220&&state.combat?.state.phase==='fight';guard++){
    for(const skillId of skillIds){const target=['boss','raider','wisp'].find(id=>state.combat.state.units[id].hp>0);state=applyG2RProgressionSandboxCommand(state,{type:'combat_cast',skillId,targetId:target},true)}
    if(state.combat.state.phase==='fight')state=applyG2RProgressionSandboxCommand(state,{type:'combat_tick',count:20},true);
  }
  if(state.pendingResult?.outcome!=='victory')throw new Error(`Balance route did not win ${attemptId}`);
  return applyG2RProgressionSandboxCommand(state,{type:'settle',attemptSequence:sequence,attemptId,outcome:'victory'},true);
}
export function buildG2RProgressionBalanceReport(){return {schema:1,status:'ENGINEERING_CANDIDATE_NOT_PRODUCTION_BALANCE',chapter:'chapter-01',rows:heroes.map((heroId,index)=>{
  let state=createG2RProgressionSandbox({revision:0,profile:selectPermanentHero(createProfileV2(),heroId)});
  const checkpoints=[];for(let stage=1;stage<=10;stage++){state=settle(state,stage,`${heroId}-${stage}`);checkpoints.push({stage,level:state.profile.heroProgress.level,xp:state.profile.heroProgress.xp,gold:state.profile.gold,unlocked:[...state.profile.unlockedCompanionIds]})}
  const normal={level:state.profile.heroProgress.level,xp:state.profile.heroProgress.xp,gold:state.profile.gold,pendingChoices:state.profile.heroProgress.pendingSkillChoices};
  state=settle(state,10,`${heroId}-replay`);const replay={level:state.profile.heroProgress.level,xp:state.profile.heroProgress.xp,gold:state.profile.gold};
  const strategy=STAGE_010_STRATEGIES_V1.find(x=>x.heroId===heroId),trial=runStage010Trial(strategy,4101+index,{reactionDelayTicks:3,manualCommandGapTicks:8});
  return {heroId,normal,replay,kairAtStage:checkpoints.find(x=>x.unlocked.includes('ash'))?.stage??null,controllerAtStage:checkpoints.find(x=>x.unlocked.includes('control'))?.stage??null,stage10:{strategyId:strategy.id,outcome:trial.outcome,party:trial.party,usesController:trial.party.includes('control'),ticks:trial.ticks,remainingHp:trial.remainingHp},companionLevelEffect:'NOT_IMPLEMENTED_IN_COMBAT_RUNTIME'};})};}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))
  console.log(JSON.stringify(buildG2RProgressionBalanceReport(),null,2));
