import { HERO_KIT_CATALOG_V1, resolveHeroSkillEffect, validateHeroKitPolicy } from './hero-kits-v1.mjs';
import { validateProfileV2 } from './profile-v2.mjs';
import { STAGE_010_ENCOUNTER_V1, validateStage010Encounter } from './stage-010-encounter-v1.mjs';

export const G2R_COMBAT_VERSION = 1;
const clone = value => structuredClone(value);
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const integer = (value, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(value) && value >= min && value <= max;
const COMPANIONS=['sentinel','ember','healer','ash','control'];

const skillValues = Object.freeze(Object.fromEntries(HERO_KIT_CATALOG_V1.flatMap(hero =>
  hero.skills.map((skill, index) => [skill.id, Object.freeze({
    primary: Object.freeze(Array.from({ length: skill.rankCap + 1 }, (_, rank) => 8 + index * 2 + rank * 3)),
    secondary: Object.freeze(Array.from({ length: skill.rankCap + 1 }, (_, rank) => 3 + rank * 2)),
    durationTicks: Object.freeze(Array.from({ length: skill.rankCap + 1 }, (_, rank) => 20 + rank * 5))
  })]))));

// Engineering fixture, deliberately versioned and labelled candidate. It proves mechanics,
// not production balance acceptance.
export const G2R_COMBAT_CANDIDATE_POLICY_V1 = Object.freeze({
  policyVersion: 1,
  policyId: 'g2r-combat-engineering-candidate-v1',
  maxTicks: 1200,
  bossStatusDurationPercent: 50,
  bossControlValueCap: 50,
  heroBaseHp: 180,
  companionBaseHp: 100,
  enemyBaseHp: 110,
  bossBaseHp: 260,
  allyAttackDamage: 5,
  enemyAttackDamage: 6,
  allyAttackInterval: 12,
  enemyAttackInterval: 16,
  burnInterval: 10,
  companionActionInterval: 18,
  cooldowns: Object.freeze(Object.fromEntries(HERO_KIT_CATALOG_V1.flatMap(hero =>
    hero.skills.map((skill, index) => [skill.id, index === 3 ? 90 : 34 + index * 8])))),
  heroKitPolicy: Object.freeze({ policyVersion: 1, policyId: 'g2r-kit-engineering-candidate-v1',
    maxValue: 500, maxDurationTicks: 120, skills: skillValues })
});

export function validateG2RCombatPolicy(policy) {
  const fields = ['policyVersion','policyId','maxTicks','bossStatusDurationPercent','bossControlValueCap',
    'heroBaseHp','companionBaseHp','enemyBaseHp','bossBaseHp','allyAttackDamage','enemyAttackDamage',
    'allyAttackInterval','enemyAttackInterval','burnInterval','companionActionInterval','cooldowns','heroKitPolicy'];
  if (!exact(policy, fields) || policy.policyVersion !== 1 || typeof policy.policyId !== 'string' ||
      !policy.policyId.includes('candidate') || !validateHeroKitPolicy(policy.heroKitPolicy)) return false;
  for (const key of fields.slice(2, -2)) if (!integer(policy[key], 1, 100000)) return false;
  const skills = HERO_KIT_CATALOG_V1.flatMap(hero => hero.skills.map(skill => skill.id));
  return exact(policy.cooldowns, skills) && skills.every(id => integer(policy.cooldowns[id], 1, 10000));
}

function unit(id, side, hp, isBoss = false) {
  return { id, side, hp, maxHp: hp, shield: 0, isBoss, statuses: {} };
}

function validStatusMap(statuses) {
  if (!statuses || typeof statuses !== 'object' || Array.isArray(statuses)) return false;
  return Object.entries(statuses).every(([id, value]) => typeof id === 'string' &&
    exact(value, ['value','remaining']) && integer(value.value, 0, 100000) && integer(value.remaining, 1, 100000));
}

export function validateG2RCombatState(state) {
  const fields = ['combatVersion','policyId','encounterId','stageId','profileRevision','selectedHeroId','heroLevel','skillRanks',
    'party','seed','rng','tick','phase','units','cooldowns','bossAction','commandSequence','events','outcome'];
  if (!exact(state, fields) || state.combatVersion !== 1 || typeof state.policyId !== 'string' ||
      state.encounterId !== STAGE_010_ENCOUNTER_V1.encounterId || state.stageId !== 'stage-010' ||
      !integer(state.profileRevision) || !HERO_KIT_CATALOG_V1.some(hero=>hero.id===state.selectedHeroId) || !integer(state.heroLevel,1,16) ||
      !exact(state.skillRanks,['skill1','skill2','skill3','ultimate']) ||
      !Array.isArray(state.party) || state.party.length !== 3 || new Set(state.party).size !== 3 ||
      !state.party.every(id => COMPANIONS.includes(id)) || !integer(state.seed,1) || !integer(state.rng,1) ||
      !integer(state.tick) || !['fight','victory','defeat'].includes(state.phase) ||
      !exact(state.bossAction,['phase','remaining','sequence']) || !['idle','telegraph'].includes(state.bossAction.phase) ||
      !integer(state.bossAction.remaining,0,STAGE_010_ENCOUNTER_V1.telegraphTicks) || !integer(state.bossAction.sequence) ||
      !integer(state.commandSequence) || !Array.isArray(state.events) || state.events.length > 200 ||
      ![null,'victory','defeat'].includes(state.outcome)) return false;
  if (!['skill1','skill2','skill3'].every(id => integer(state.skillRanks[id],0,4)) ||
      !integer(state.skillRanks.ultimate,0,3) || (state.heroLevel < 5 && state.skillRanks.ultimate !== 0) ||
      Object.values(state.skillRanks).reduce((a,b)=>a+b,0) > state.heroLevel-1) return false;
  if (!state.units || typeof state.units !== 'object' || Array.isArray(state.units) ||
      Object.keys(state.units).length !== 7) return false;
  if (!Object.values(state.units).every(entry => exact(entry,['id','side','hp','maxHp','shield','isBoss','statuses']) &&
      typeof entry.id === 'string' && ['ally','enemy'].includes(entry.side) && integer(entry.hp,0,100000) &&
      integer(entry.maxHp,1,100000) && entry.hp <= entry.maxHp && integer(entry.shield,0,100000) &&
      typeof entry.isBoss === 'boolean' && validStatusMap(entry.statuses))) return false;
  const expected = ['hero', ...state.party, 'boss', 'raider', 'wisp'];
  if (expected.some(id => !state.units[id] || state.units[id].id !== id) ||
      Object.keys(state.cooldowns).some(id => !integer(state.cooldowns[id]))) return false;
  const skillIds=HERO_KIT_CATALOG_V1.find(hero=>hero.id===state.selectedHeroId).skills.map(skill=>skill.id);
  if (Object.keys(state.cooldowns).some(id=>!skillIds.includes(id)) || state.events.some(entry=>
    !exact(entry,['sequence','tick','type','actorId','targetId','value']) || !integer(entry.sequence) ||
    !integer(entry.tick) || typeof entry.type!=='string' || typeof entry.actorId!=='string' ||
    typeof entry.targetId!=='string' || !integer(entry.value))) return false;
  return state.phase === 'fight' ? state.outcome === null : state.outcome === state.phase;
}

export function createG2RCombat(profile, profileRevision, seed, policy = G2R_COMBAT_CANDIDATE_POLICY_V1,
  encounter = STAGE_010_ENCOUNTER_V1) {
  if (!validateProfileV2(profile) || profile.selectedHeroId === null || profile.phase !== 'setup' ||
      profile.campaignAttempt !== null || (profile.legacyProgress && !profile.legacyProgress.activated) ||
      !integer(profileRevision) || !integer(seed,1) || !validateG2RCombatPolicy(policy) || !validateStage010Encounter(encounter) ||
      profile.party.length !== 3 || new Set(profile.party).size !== 3 ||
      profile.party.some(id => !profile.unlockedCompanionIds.includes(id))) return null;
  const units = Object.fromEntries([
    unit('hero','ally',policy.heroBaseHp),
    ...profile.party.map(id => unit(id,'ally',policy.companionBaseHp)),
    unit('boss','enemy',policy.bossBaseHp,true), unit('raider','enemy',policy.enemyBaseHp),
    unit('wisp','enemy',policy.enemyBaseHp)
  ].map(value => [value.id, value]));
  const state = { combatVersion:1, policyId:policy.policyId, encounterId:encounter.encounterId,
    stageId:encounter.stageId, profileRevision,
    selectedHeroId:profile.selectedHeroId, heroLevel:profile.heroProgress.level,
    skillRanks:clone(profile.heroProgress.skillRanks), party:[...profile.party], seed, rng:seed, tick:0,
    phase:'fight', units, cooldowns:{}, bossAction:{phase:'idle',remaining:0,sequence:0},
    commandSequence:0, events:[], outcome:null };
  return validateG2RCombatState(state) ? state : null;
}

const living = (state, side) => Object.values(state.units).filter(unit => unit.side === side && unit.hp > 0);
function event(state, type, actorId, targetId, value = 0) {
  state.events.push({ sequence: state.commandSequence, tick: state.tick, type, actorId, targetId, value });
  if (state.events.length > 200) state.events.shift();
}
function damage(state, target, amount, actorId, type = 'damage') {
  if (!target || target.hp === 0 || !integer(amount)) return;
  let value = amount;
  const mitigation = target.statuses.mitigation?.value ?? 0;
  value = Math.max(0, Math.floor(value * (100 - Math.min(80, mitigation)) / 100));
  const absorbed = Math.min(target.shield, value); target.shield -= absorbed; value -= absorbed;
  target.hp = Math.max(0, target.hp - value);
  event(state, type, actorId, target.id, value);
  if (value && target.statuses.retaliation && state.units[actorId]?.side !== target.side)
    damage(state, state.units[actorId], target.statuses.retaliation.value, target.id, 'retaliation');
}
function heal(state, target, amount, actorId) {
  if (!target || target.hp === 0 || !integer(amount)) return;
  const value=Math.min(amount,target.maxHp-target.hp); target.hp+=value;
  event(state,'heal',actorId,target.id,value);
}
function applyStatus(target, type, value, duration, policy) {
  if (!target || !duration) return;
  const control = ['slow','weaken','burn','mark'].includes(type);
  const adjustedDuration = target.isBoss && control
    ? Math.max(1, Math.floor(duration * policy.bossStatusDurationPercent / 100)) : duration;
  const adjustedValue = target.isBoss && ['slow','weaken'].includes(type)
    ? Math.min(value, policy.bossControlValueCap) : value;
  const previous = target.statuses[type];
  target.statuses[type] = { value: Math.max(previous?.value ?? 0, adjustedValue),
    remaining: Math.max(previous?.remaining ?? 0, adjustedDuration) };
}
function kitBattle(state) {
  return { battleVersion:1, allyIds:['hero',...state.party], enemies:living(state,'enemy').map(enemy => ({
    id:enemy.id,isBoss:enemy.isBoss,telegraphActive:enemy.id === 'boss' && state.bossAction.phase === 'telegraph',
    interruptible:true,statuses:{burn:Boolean(enemy.statuses.burn),bound:Boolean(enemy.statuses.slow),
      weakened:Boolean(enemy.statuses.weaken),marked:Boolean(enemy.statuses.mark)}
  })) };
}
function profileView(state) {
  const thresholds=Array.from({length:15},(_,index)=>5*(index+1)*(index+2));
  const hasPolicy=state.heroLevel>1;
  const hasAsh=state.party.includes('ash');
  return { schema:2, phase:'setup', selectedHeroId:state.selectedHeroId,
    heroSelection:{confirmedOnce:true,selectionRequired:false},
    heroProgress:{level:state.heroLevel,xp:hasPolicy?thresholds[state.heroLevel-2]:0,
      xpPolicyId:hasPolicy?'g2r-combat-profile-view-v1':null,xpThresholds:hasPolicy?thresholds:null,
      xpRewardTables:hasPolicy?{firstClearXp:Array(50).fill(10),replayXp:Array(50).fill(5)}:null,
      pendingSkillChoices:state.heroLevel-1-Object.values(state.skillRanks).reduce((a,b)=>a+b,0),skillRanks:clone(state.skillRanks)},
    companionProgress:['sentinel','ember','healer','ash','control'].map(id=>({id,level:1})),
    unlockedCompanionIds:[...new Set(['sentinel','ember','healer',...state.party])].sort((a,b)=>
      ['sentinel','ember','healer','ash','control'].indexOf(a)-['sentinel','ember','healer','ash','control'].indexOf(b)),
    party:[...state.party],gold:0,ledgers:{firstClearStageIds:hasAsh?['stage:1','stage:2','stage:3']:[],
      settledAttemptCount:hasAsh?3:0,settledPurchaseCount:0,unlockReceiptIds:hasAsh?['stage_3_first_clear']:[]},
    campaignAttempt:null,companionUpgradePolicy:null,legacyProgress:null,legacyCheckpoint:null };
}

export function castG2RHeroSkill(state, command, policy = G2R_COMBAT_CANDIDATE_POLICY_V1) {
  if (!validateG2RCombatState(state) || state.phase !== 'fight' || !validateG2RCombatPolicy(policy) ||
      state.policyId !== policy.policyId || !exact(command,['combatCommandVersion','skillId','targetId']) ||
      command.combatCommandVersion !== 1 || (state.cooldowns[command.skillId] ?? 0) > 0) return state;
  const kit = HERO_KIT_CATALOG_V1.find(hero => hero.id === state.selectedHeroId);
  const skill = kit?.skills.find(skill => skill.id === command.skillId);
  if (!skill || state.skillRanks[skill.slot] < 0 || (skill.slot === 'ultimate' && state.heroLevel < 5)) return state;
  const resolved = resolveHeroSkillEffect(profileView(state),
    { effectVersion:1, skillId:command.skillId, targetId:command.targetId }, kitBattle(state), policy.heroKitPolicy);
  if (!resolved) return state;
  const next = clone(state); next.commandSequence += 1;
  for (const effect of resolved.effects) for (const id of effect.targetIds) {
    const target = next.units[id];
    if (['damage','area_damage','chain_damage','combo_damage','multi_hit','separate_hit'].includes(effect.type))
      damage(next,target,effect.value,'hero',effect.type);
    else if (effect.type === 'shield') target.shield += effect.value;
    else if (effect.type === 'interrupt') applyStatus(target,'interrupted',effect.value,2,policy);
    else applyStatus(target,effect.type,effect.value,effect.durationTicks,policy);
  }
  next.cooldowns[command.skillId] = policy.cooldowns[command.skillId];
  finish(next); return validateG2RCombatState(next) ? next : state;
}

function finish(state) {
  if (!living(state,'enemy').length) { state.phase='victory'; state.outcome='victory'; }
  else if (!living(state,'ally').length) { state.phase='defeat'; state.outcome='defeat'; }
}
function nextRandom(state) {
  state.rng = (Math.imul(state.rng,1664525) + 1013904223) >>> 0 || 1; return state.rng;
}
export function stepG2RCombat(state, policy = G2R_COMBAT_CANDIDATE_POLICY_V1) {
  if (!validateG2RCombatState(state) || state.phase !== 'fight' || !validateG2RCombatPolicy(policy) ||
      state.policyId !== policy.policyId) return state;
  const next=clone(state); next.tick += 1;
  for (const id of Object.keys(next.cooldowns)) next.cooldowns[id] = Math.max(0,next.cooldowns[id]-1);
  for (const unit of Object.values(next.units)) for (const [name,status] of Object.entries(unit.statuses)) {
    status.remaining -= 1; if (status.remaining <= 0) delete unit.statuses[name];
  }
  if (next.tick % policy.burnInterval === 0) for (const enemy of living(next,'enemy'))
    if (enemy.statuses.burn) damage(next,enemy,enemy.statuses.burn.value,'hero','burn');
  if (next.tick % policy.allyAttackInterval === 0) for (const ally of living(next,'ally')) {
    if (ally.id !== 'hero') continue;
    const targets=living(next,'enemy'); if (targets.length) damage(next,targets[nextRandom(next)%targets.length],policy.allyAttackDamage,ally.id,'hero_auto');
  }
  for (const id of next.party) {
    const ally=next.units[id]; if (!ally || ally.hp===0) continue;
    const offset={sentinel:0,ember:4,healer:8,ash:12}[id]??0;
    if ((next.tick+offset)%policy.companionActionInterval!==0) continue;
    const enemies=living(next,'enemy'), allies=living(next,'ally'); if (!enemies.length) break;
    if(id==='sentinel') { const target=allies.toSorted((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp))[0]; target.shield+=8; event(next,'guard','sentinel',target.id,8); }
    else if(id==='healer') heal(next,allies.toSorted((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp))[0],8,'healer');
    else { const target=enemies[nextRandom(next)%enemies.length]; const value=id==='ash'?9:7; damage(next,target,value,id,id==='ash'?'ash_strike':'elemental'); if(id==='ember')applyStatus(target,'burn',2,12,policy); }
  }
  const boss=next.units.boss;
  if (boss.hp>0 && next.bossAction.phase==='idle' && next.tick>0 && next.tick%STAGE_010_ENCOUNTER_V1.dangerousAttackInterval===0) {
    next.bossAction={phase:'telegraph',remaining:STAGE_010_ENCOUNTER_V1.telegraphTicks,sequence:next.bossAction.sequence+1};
    event(next,'boss_telegraph','boss','party',next.bossAction.remaining);
  } else if (boss.hp>0 && next.bossAction.phase==='telegraph') {
    if (boss.statuses.interrupted) { next.bossAction={...next.bossAction,phase:'idle',remaining:0}; event(next,'boss_interrupted','hero','boss',0); }
    else if (--next.bossAction.remaining===0) {
      const weaken=boss.statuses.weaken?.value??0;
      for(const target of living(next,'ally')) {
        const raw=Math.max(1,Math.floor(STAGE_010_ENCOUNTER_V1.dangerousAttackDamage*(100-Math.min(80,weaken))/100));
        if(target.statuses.evade && nextRandom(next)%100<target.statuses.evade.value) {
          event(next,'evade',target.id,'boss',0);
          if(target.statuses.counter_ready){damage(next,boss,target.statuses.counter_ready.value,target.id,'counter');delete target.statuses.counter_ready;}
        } else damage(next,target,raw,'boss','boss_dangerous');
      }
      next.bossAction={...next.bossAction,phase:'idle',remaining:0};
    }
  }
  for (const enemy of living(next,'enemy')) {
    const slow=enemy.statuses.slow?.value??0; const interval=policy.enemyAttackInterval+Math.floor(slow/10);
    if (next.tick % interval !== 0 || enemy.statuses.interrupted) continue;
    const targets=living(next,'ally'); if (!targets.length) break;
    const target=targets[nextRandom(next)%targets.length];
    const weaken=enemy.statuses.weaken?.value??0;
    if (target.statuses.evade && nextRandom(next)%100 < target.statuses.evade.value) { event(next,'evade',target.id,enemy.id,0);
      if(target.statuses.counter_ready){damage(next,enemy,target.statuses.counter_ready.value,target.id,'counter');delete target.statuses.counter_ready;} }
    else damage(next,target,Math.max(1,Math.floor(policy.enemyAttackDamage*(100-Math.min(80,weaken))/100)),enemy.id,'enemy_auto');
  }
  if (next.tick >= policy.maxTicks && next.phase === 'fight') { next.phase='defeat'; next.outcome='defeat'; }
  finish(next); return validateG2RCombatState(next) ? next : state;
}
