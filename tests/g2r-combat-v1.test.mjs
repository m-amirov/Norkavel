import test from 'node:test';
import assert from 'node:assert/strict';
import { activateLegacyProfileV2, createProfileV2, prepareLegacyProfileV2, selectPermanentHero, validateProfileV2 } from '../src/profile-v2.mjs';
import { initialState } from '../src/combat.mjs';
import { HERO_KIT_CATALOG_V1 } from '../src/hero-kits-v1.mjs';
import {
  G2R_COMBAT_CANDIDATE_POLICY_V1, castG2RHeroSkill, createG2RCombat,
  stepG2RCombat, validateG2RCombatState
} from '../src/g2r-combat-v1.mjs';

function profile(heroId, { level=1, ranks={skill1:0,skill2:0,skill3:0,ultimate:0} }={}) {
  const base=selectPermanentHero(createProfileV2(),heroId);
  if (level===1) return base;
  const thresholds=Array.from({length:15},(_,index)=>5*(index+1)*(index+2));
  const next={...base,heroProgress:{...base.heroProgress,level,xp:thresholds[level-2],
    xpPolicyId:'g2r-combat-test-xp-v1',xpThresholds:thresholds,
    xpRewardTables:{firstClearXp:Array(50).fill(10),replayXp:Array(50).fill(5)},
    pendingSkillChoices:level-1-Object.values(ranks).reduce((a,b)=>a+b,0),skillRanks:{...ranks}}};
  assert.equal(validateProfileV2(next),true); return next;
}

test('G2R-F02c: all four selected heroes create exactly 1+3 and produce distinct real mechanics',()=>{
  const signatures=[];
  const slots=[1,0,1,1];
  for (const [hero,index] of HERO_KIT_CATALOG_V1.map((hero,index)=>[hero,index])) {
    const state=createG2RCombat(profile(hero.id),4,12345);
    assert.equal(validateG2RCombatState(state),true);
    assert.deepEqual(Object.values(state.units).filter(x=>x.side==='ally').map(x=>x.id),
      ['hero','sentinel','ember','healer']);
    const cast=castG2RHeroSkill(state,{combatCommandVersion:1,skillId:hero.skills[slots[index]].id,targetId:'boss'});
    assert.notStrictEqual(cast,state,hero.id);
    signatures.push(JSON.stringify({boss:cast.units.boss,statuses:cast.units.boss.statuses,
      allies:Object.values(cast.units).filter(x=>x.side==='ally').map(x=>[x.shield,x.statuses])}));
  }
  assert.equal(new Set(signatures).size,4);
});

test('G2R-F02c: every approved 3+ultimate ability mutates real combat state',()=>{
  const ranks={skill1:4,skill2:4,skill3:4,ultimate:3};
  for(const hero of HERO_KIT_CATALOG_V1) for(const skill of hero.skills){
    const state=createG2RCombat(profile(hero.id,{level:16,ranks}),0,404);
    const cast=castG2RHeroSkill(state,{combatCommandVersion:1,skillId:skill.id,targetId:'boss'});
    assert.notStrictEqual(cast,state,skill.id);
    assert.notDeepEqual(cast.units,state.units,skill.id);
    assert.equal(cast.cooldowns[skill.id],G2R_COMBAT_CANDIDATE_POLICY_V1.cooldowns[skill.id]);
  }
});

test('G2R-F02c: seed, initial state and command sequence are deterministic',()=>{
  const start=createG2RCombat(profile('hero_slot_2'),2,9981);
  const run=()=>{
    let state=structuredClone(start);
    state=castG2RHeroSkill(state,{combatCommandVersion:1,skillId:'mage.fire_circle',targetId:'boss'});
    for(let i=0;i<80;i++) state=stepG2RCombat(state);
    state=castG2RHeroSkill(state,{combatCommandVersion:1,skillId:'mage.chain_lightning',targetId:'raider'});
    for(let i=0;i<60;i++) state=stepG2RCombat(state);
    return state;
  };
  assert.deepEqual(run(),run());
});

test('G2R-F02c: invalid hero, skill, target, cooldown and rank fail without mutation',()=>{
  const state=createG2RCombat(profile('hero_slot_1'),0,77);
  const valid={combatCommandVersion:1,skillId:'defender.shield_break',targetId:'boss'};
  for(const command of [{...valid,skillId:'mage.fire_circle'},{...valid,targetId:'none'},{...valid,extra:true}])
    assert.strictEqual(castG2RHeroSkill(state,command),state);
  const cast=castG2RHeroSkill(state,valid);
  assert.strictEqual(castG2RHeroSkill(cast,valid),cast,'cooldown rejects duplicate cast');
  assert.equal(validateG2RCombatState({...state,selectedHeroId:'unknown'}),false);
  assert.equal(validateG2RCombatState({...state,skillRanks:{...state.skillRanks,skill1:5}}),false);
});

test('G2R-F02c: ultimate is unavailable before level 5 and applies at an earned rank',()=>{
  const early=createG2RCombat(profile('hero_slot_3'),0,91);
  const command={combatCommandVersion:1,skillId:'duelist.night_of_blades',targetId:'boss'};
  assert.strictEqual(castG2RHeroSkill(early,command),early);
  const ready=createG2RCombat(profile('hero_slot_3',{level:5,ranks:{skill1:1,skill2:1,skill3:1,ultimate:1}}),0,91);
  const cast=castG2RHeroSkill(ready,command);
  assert.ok(cast.units.boss.hp<ready.units.boss.hp);
});

test('G2R-F02c: locked or duplicate companions and inactive legacy migration cannot start',()=>{
  const base=profile('hero_slot_4');
  assert.equal(createG2RCombat({...base,party:['sentinel','ember','ember']},0,1),null);
  assert.equal(createG2RCombat({...base,party:['sentinel','ember','ash']},0,1),null);
});

test('G2R-F02c: migrated legacy profile requires activation and preserves its exact checkpoint',()=>{
  const snapshot={schemaVersion:1,gameId:'norkavel',gameVersion:'0.1.0',revision:9,
    state:{...initialState(),gold:77,party:['sentinel','ember','ash'],claimed:[1,2]}};
  const prepared=selectPermanentHero(prepareLegacyProfileV2(snapshot),'hero_slot_1');
  assert.equal(createG2RCombat(prepared,0,123),null);
  const active=activateLegacyProfileV2(prepared);
  assert.deepEqual(active.legacyCheckpoint,snapshot);
  assert.notEqual(createG2RCombat(active,1,123),null);
});

test('G2R-F02c: boss control resistance shortens statuses and state survives JSON reload',()=>{
  const state=createG2RCombat(profile('hero_slot_4'),3,123);
  const cast=castG2RHeroSkill(state,{combatCommandVersion:1,skillId:'ranger.trap',targetId:'boss'},G2R_COMBAT_CANDIDATE_POLICY_V1);
  assert.ok(cast.units.boss.statuses.slow.remaining < G2R_COMBAT_CANDIDATE_POLICY_V1.heroKitPolicy.skills['ranger.trap'].durationTicks[0]);
  assert.equal(validateG2RCombatState(JSON.parse(JSON.stringify(cast))),true);
});
