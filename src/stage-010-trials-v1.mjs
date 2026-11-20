import { createProfileV2, selectPermanentHero, validateProfileV2 } from './profile-v2.mjs';
import { HERO_KIT_CATALOG_V1 } from './hero-kits-v1.mjs';
import { castG2RHeroSkill, createG2RCombat, stepG2RCombat } from './g2r-combat-v1.mjs';

const RANKS=Object.freeze({skill1:2,skill2:2,skill3:2,ultimate:1});
const PARTY_A=Object.freeze(['sentinel','ember','healer']);
const PARTY_B=Object.freeze(['sentinel','healer','ash']);

export const STAGE_010_STRATEGIES_V1=Object.freeze([
  {id:'defender_interrupt',heroId:'hero_slot_1',party:PARTY_A,mode:'telegraph',skills:['defender.shield_break','defender.bastion_dome']},
  {id:'defender_survival',heroId:'hero_slot_1',party:PARTY_B,mode:'rotation',skills:['defender.bastion_dome','defender.steadfast_banner','defender.last_stand']},
  {id:'mage_weaken',heroId:'hero_slot_2',party:PARTY_A,mode:'telegraph',skills:['mage.binding','mage.fire_circle','mage.chain_lightning']},
  {id:'mage_controlled_damage',heroId:'hero_slot_2',party:PARTY_B,mode:'rotation',skills:['mage.fire_circle','mage.chain_lightning','mage.elemental_rift']},
  {id:'duelist_evade',heroId:'hero_slot_3',party:PARTY_A,mode:'telegraph',skills:['duelist.vanish','duelist.fatal_mark','duelist.shadow_dash']},
  {id:'duelist_focus',heroId:'hero_slot_3',party:PARTY_B,mode:'rotation',skills:['duelist.fatal_mark','duelist.shadow_dash','duelist.night_of_blades']},
  {id:'ranger_trap',heroId:'hero_slot_4',party:PARTY_A,mode:'telegraph',skills:['ranger.trap','ranger.arrow_rain','ranger.aimed_shot']},
  {id:'ranger_marked_range',heroId:'hero_slot_4',party:PARTY_B,mode:'rotation',skills:['ranger.aimed_shot','ranger.star_barrage','ranger.arrow_rain']}
]);

export function createStage010TrialProfile(heroId,party){
  const base=selectPermanentHero(createProfileV2(),heroId);
  const thresholds=Array.from({length:15},(_,index)=>5*(index+1)*(index+2));
  const profile={...base,party:[...party],unlockedCompanionIds:['sentinel','ember','healer','ash'],
    ledgers:{...base.ledgers,firstClearStageIds:['stage:1','stage:2','stage:3'],settledAttemptCount:3,
      unlockReceiptIds:['stage_3_first_clear']},
    heroProgress:{...base.heroProgress,level:8,xp:thresholds[6],xpPolicyId:'stage-010-trial-xp-v1',
      xpThresholds:thresholds,xpRewardTables:{firstClearXp:Array(50).fill(10),replayXp:Array(50).fill(5)},
      pendingSkillChoices:0,skillRanks:{...RANKS}}};
  if(!validateProfileV2(profile))throw new Error('invalid stage-010 trial profile');
  return profile;
}

function castFirst(state,strategy){
  const targetId=['boss','raider','wisp'].find(id=>state.units[id].hp>0);
  const ordered=strategy.mode==='telegraph'&&state.bossAction.phase==='telegraph'
    ? strategy.skills : strategy.mode==='telegraph' ? strategy.skills.slice(1) : strategy.skills;
  for(const skillId of ordered){
    const next=castG2RHeroSkill(state,{combatCommandVersion:1,skillId,targetId});
    if(next!==state)return next;
  }
  return state;
}

export function runStage010Trial(strategy,seed){
  let state=createG2RCombat(createStage010TrialProfile(strategy.heroId,strategy.party),0,seed);
  while(state.phase==='fight'){
    state=castFirst(state,strategy);
    state=stepG2RCombat(state);
  }
  const allies=['hero',...state.party].map(id=>state.units[id]);
  return {strategyId:strategy.id,heroId:strategy.heroId,seed,outcome:state.outcome,ticks:state.tick,
    remainingHp:allies.reduce((sum,unit)=>sum+unit.hp,0),party:[...state.party],
    telegraphs:state.events.filter(event=>event.type==='boss_telegraph').length,
    dangerousHits:state.events.filter(event=>event.type==='boss_dangerous').length,
    interrupts:state.events.filter(event=>event.type==='boss_interrupted').length,
    evades:state.events.filter(event=>event.type==='evade').length,
    statusEvents:Object.values(state.units.boss.statuses).length};
}

export function runStage010Baseline(heroId,seed){
  let state=createG2RCombat(createStage010TrialProfile(heroId,PARTY_A),0,seed);
  while(state.phase==='fight')state=stepG2RCombat(state);
  return {heroId,seed,outcome:state.outcome,ticks:state.tick,
    remainingHp:['hero',...state.party].reduce((sum,id)=>sum+state.units[id].hp,0)};
}

export function buildStage010Matrix(seeds=Array.from({length:32},(_,index)=>1001+index*97)){
  const rows=STAGE_010_STRATEGIES_V1.map(strategy=>{
    const trials=seeds.map(seed=>runStage010Trial(strategy,seed));
    return {strategyId:strategy.id,heroId:strategy.heroId,party:[...strategy.party],seeds:seeds.length,
      wins:trials.filter(row=>row.outcome==='victory').length,defeats:trials.filter(row=>row.outcome==='defeat').length,
      minTicks:Math.min(...trials.map(row=>row.ticks)),maxTicks:Math.max(...trials.map(row=>row.ticks)),
      minRemainingHp:Math.min(...trials.map(row=>row.remainingHp)),maxRemainingHp:Math.max(...trials.map(row=>row.remainingHp)),
      telegraphs:trials.reduce((sum,row)=>sum+row.telegraphs,0),dangerousHits:trials.reduce((sum,row)=>sum+row.dangerousHits,0),
      interrupts:trials.reduce((sum,row)=>sum+row.interrupts,0),evades:trials.reduce((sum,row)=>sum+row.evades,0)};
  });
  const baselines=HERO_KIT_CATALOG_V1.map(hero=>{
    const trials=seeds.map(seed=>runStage010Baseline(hero.id,seed));
    return {heroId:hero.id,seeds:seeds.length,wins:trials.filter(row=>row.outcome==='victory').length,
      defeats:trials.filter(row=>row.outcome==='defeat').length,minTicks:Math.min(...trials.map(row=>row.ticks)),
      maxTicks:Math.max(...trials.map(row=>row.ticks))};
  });
  return {schema:1,stageId:'stage-010',candidatePolicy:true,seeds,rows,baselines};
}
