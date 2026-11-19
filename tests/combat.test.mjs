import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, chooseCompanion, changeFront, upgradeHero, startFight, nextEncounterSeed, nextStage, retryStage, setAutoCast, stepCombat, selectTarget, validateState, MAX_TICKS } from '../src/combat.mjs';

function run(initial, commands = () => [], count = MAX_TICKS) {
  let s=initial;
  for(let n=0;n<count && s.phase==='fight';n++)s=stepCombat(s,commands(n,s));
  return s;
}
test('G2: one main hero, three companions, three enemies',()=>{
  const s=startFight(initialState());
  assert.equal(s.phase,'fight');
  assert.equal(s.units.filter(u=>u.team==='ally').length,4);
  assert.equal(s.units.filter(u=>u.team==='enemy').length,3);
  assert.equal(s.units.filter(u=>u.id==='hero').length,1);
  assert.equal(validateState(s),true);
});
test('G2: fixed seed and commands produce identical results and event streams',()=>{
  const a=startFight(initialState(),342);
  const b=startFight(initialState(),342);
  const commands=(tick)=>tick%12===0?[{type:'click'}]:[];
  assert.deepEqual(run(a,commands),run(b,commands));
});
test('G2: auto combat completes an encounter with a decisive outcome',()=>{
  const state=run(startFight(initialState(),81));
  assert.ok(['victory','defeat'].includes(state.phase));
  assert.ok(state.tick>1);
  assert.equal(validateState(state),true);
});
test('G2: progress rewards are granted only once per stage, including retries',()=>{
  const result=run(startFight(initialState(),81));
  assert.equal(result.phase,'victory','stage 1 should be auto-playable');
  assert.equal(result.gold,45);
  assert.deepEqual(result.claimed,[1]);
  const replay=run(startFight(retryStage(result),81));
  assert.equal(replay.gold,45);
  assert.equal(replay.reward,0);
  assert.equal(nextStage(result).stage,2);
});
test('G2: changing companion roster, frontline and player actions affects combat',()=>{
  const base=initialState();
  const changed=changeFront(chooseCompanion(base,'ash'));
  assert.deepEqual(changed.party,['sentinel','ember','ash']);
  assert.equal(changed.front,'hero');
  const a=run(startFight(base,42));
  const b=run(startFight(changed,42));
  assert.notDeepEqual(a.units.map(u=>u.hp),b.units.map(u=>u.hp));
  let fight=startFight(base,42);
  const player=run(fight,t=>t%10===0?[{type:'click'}]:[]);
  assert.notDeepEqual(a.events,player.events);
});
test('G2: click spam cannot bypass cooldown and skills have cooldowns',()=>{
  let s=startFight(initialState(),8);
  s=stepCombat(s,Array.from({length:300},()=>({type:'click'})));
  assert.equal(s.events.filter(e=>e.detail==='click').length,1);
  s=stepCombat(s,[{type:'skill1'},{type:'skill1'},{type:'skill2'},{type:'skill2'}]);
  assert.equal(s.events.filter(e=>e.detail==='shield-bash').length,1);
  assert.equal(s.events.filter(e=>e.type==='barrier').length,1);
});
test('G2: boss has readable windup and shield bash interrupts',()=>{
  const state=nextStage(run(startFight(initialState(),51)));
  assert.equal(state.stage,2);
  let boss=startFight(state,51), warned=false;
  for(let n=0;n<500 && boss.phase==='fight';n++){
    boss=stepCombat(boss);
    if(boss.events.some(e=>e.type==='warning') && boss.units.some(u=>u.id.startsWith('boss-')&&u.windup>0)){warned=true;break;}
  }
  assert.equal(warned,true);
  const interrupted=stepCombat(boss,[{type:'skill1',},{type:'target',id:'boss-0'}]);
  assert.equal(interrupted.units.find(u=>u.id==='boss-0').windup,0);
  assert.equal(interrupted.events.some(e=>e.type==='interrupt'),true);
});
test('G2: invalid input is rejected, upgrade costs gold, nonfight commands do not mutate',()=>{
  const s=initialState();
  assert.strictEqual(chooseCompanion(s,'malicious'),s);
  assert.strictEqual(upgradeHero(s),s);
  assert.strictEqual(stepCombat(s,[{type:'click'}]),s);
  const fight=startFight(s);
  assert.strictEqual(selectTarget(fight,'__invalid__'),fight);
  assert.equal(validateState({...s,party:['sentinel','sentinel','healer']}),false);
});
test('G2: auto-cast is only an opt-in PvE control',()=>{
  const s=setAutoCast(startFight(initialState()),true);
  assert.equal(s.autoCast,true);
  const next=stepCombat(s);
  assert.equal(validateState(next),true);
  assert.equal(setAutoCast({...s,phase:'victory'},false).autoCast,true);
});

test('G2: boss can defeat the team; retry returns to a playable setup without rewards',()=>{
  const stage1=run(startFight(initialState(),81));
  assert.equal(stage1.phase,'victory');
  const stage2=nextStage(stage1);
  let fight=startFight(stage2,91);
  for(const ally of fight.units.filter(u=>u.team==='ally'))ally.hp=1;
  const boss=fight.units.find(u=>u.id==='boss-0');
  boss.windup=1; // deterministic setup of a lethal boss attack, not a false UI outcome
  fight=stepCombat(fight);
  assert.equal(fight.phase,'defeat');
  assert.equal(fight.reward,0);
  assert.equal(fight.gold,45);
  assert.deepEqual(fight.claimed,[1]);
  const prepared=retryStage(fight);
  assert.equal(prepared.phase,'setup');
  assert.equal(prepared.stage,2);
  assert.equal(startFight(prepared,91).phase,'fight');
});

test('G2: corrupted or legacy persisted snapshots fail closed without throwing',()=>{
  const setup=initialState();
  const fight=startFight(setup,81);
  const variants=[
    {...setup,schema:0},
    {...setup,party:['sentinel','ember','ember']},
    {...setup,party:['ember','sentinel','healer']},
    {...setup,units:[{id:'hero',hp:1,maxHp:205}]},
    {...setup,gold:Infinity},
    {...fight,units:[{id:'hero',hp:1,maxHp:205}]},
    {...fight,units:fight.units.map((u,i)=>i===0?{...u,atk:Infinity}:u)},
    {...fight,units:fight.units.map((u,i)=>i===1?{...u,shield:-500}:u)},
    {...fight,units:fight.units.map((u,i)=>i===2?{...u,windup:'20'}:u)},
    {...fight,units:fight.units.map((u,i)=>i===3?{...u,team:'enemy'}:u)},
    {...fight,units:fight.units.map((u,i)=>i===4?{...u,id:'hero'}:u)},
    {...fight,skills:[null,0]},
    {...fight,events:[{id:1,tick:0,type:'hit'}]},
    {...fight,target:'nonexistent-enemy'},
    {...fight,phase:'setup'}
  ];
  for(const snapshot of variants)assert.equal(validateState(snapshot),false,
    'tampered save must be rejected: '+JSON.stringify(snapshot).slice(0,160));
  assert.equal(validateState(setup),true);
  assert.equal(validateState(fight),true);
  assert.equal(validateState(stepCombat(fight,[{type:'click'},{type:'skill2'}])),true);
  assert.equal(validateState(run(fight,()=>[])),true);
});

test('G2: 120 reproducible seeds preserve validated save schema and rewards',()=>{
  for(let seed=0;seed<120;seed++){
    let s=startFight(initialState(),seed);
    assert.equal(validateState(s),true);
    let n=0;
    while(s.phase==='fight' && n<MAX_TICKS){
      s=stepCombat(s,n%11===0?[{type:'click'}]:[]);
      if(n%100===0)assert.equal(validateState(s),true,'seed '+seed+' tick '+n);
      n++;
    }
    assert.notEqual(s.phase,'fight','combat terminates for seed '+seed);
    assert.equal(validateState(s),true,'final snapshot validated for '+seed);
    if(s.phase==='victory'){
      assert.equal(s.gold,45);
      const repeated=run(startFight(retryStage(s),seed));
      assert.equal(repeated.gold,45,'no duplicate reward for seed '+seed);
    }
  }
});

test('G2: 1200 seeded composition scenarios terminate with valid rewards and state',()=>{
  const variants=[
    ['healer-idle',base=>base,()=>[]],
    ['healer-click',base=>base,tick=>tick%5===0?[{type:'click'}]:[]],
    ['ash-idle',base=>chooseCompanion(base,'ash'),()=>[]]
  ];
  const stats={};
  for(const [name,compose,commands] of variants){
    let wins=0,defeats=0,totalTicks=0;
    for(let seed=0;seed<400;seed++){
      const state=run(startFight(compose(initialState()),seed),commands);
      assert.equal(validateState(state),true,name+' seed '+seed);
      assert.ok(['victory','defeat'].includes(state.phase),name+' unresolved seed '+seed);
      assert.ok(state.tick>=1 && state.tick<=MAX_TICKS,name+' invalid duration');
      if(state.phase==='victory'){
        wins++;
        assert.equal(state.gold,45,name+' should earn exactly one first-clear grant');
        assert.deepEqual(state.claimed,[1]);
      }else{
        defeats++;
        assert.equal(state.gold,0,name+' defeat should not award money');
        assert.deepEqual(state.claimed,[]);
      }
      totalTicks+=state.tick;
    }
    stats[name]={wins,defeats,meanTicks:Math.round(totalTicks/400)};
  }
  assert.equal(Object.values(stats).reduce((sum,variant)=>sum+variant.wins+variant.defeats,0),1200);
  console.log('NORKAVEL_G2_BALANCE_SAMPLE_1200 '+JSON.stringify(stats));
  // This is a deterministic engine/regression sample, NOT proof of fun or final DPS target.
});

test('G2: sampled active-click damage share stays bounded under maximum legal taps',()=>{
  let tapped=0,alliedTotal=0,scenarios=0;
  for(let seed=0;seed<200;seed++){
    let state=startFight(initialState(),seed),lastEventId=0;
    const enemies=new Set(state.units.filter(u=>u.team==='enemy').map(u=>u.id));
    let tick=0;
    while(state.phase==='fight' && tick<MAX_TICKS){
      state=stepCombat(state,tick%5===0?[{type:'click'}]:[]);
      for(const event of state.events.filter(e=>e.id>lastEventId)){
        if(enemies.has(event.target) && ['hit','dot'].includes(event.type) &&
            ['hero','sentinel','ember','healer'].includes(event.source)){
          alliedTotal+=event.amount;
          if(event.detail==='click')tapped+=event.amount;
        }
      }
      lastEventId=state.eventId;
      tick++;
    }
    assert.equal(validateState(state),true,'seed '+seed);
    scenarios++;
  }
  const fraction=Number((tapped/alliedTotal).toFixed(3));
  console.log('NORKAVEL_G2_TAP_DAMAGE_SAMPLE '+JSON.stringify({scenarios,tapped,alliedTotal,fraction}));
  // A soft engineering envelope around the proposed 15–25% GDD share, not human balance approval.
  assert.ok(fraction>=0.08 && fraction<=0.30,'manual input should be relevant but not dominant: '+fraction);
});

test('G2: first Rift Guardian requires meaningful tactics but remains idle-solvable',()=>{
  // 300 fixed seeds per approach on the real stage-two simulation. Level-one
  // tutorial rewards/party are carried into the boss, never forged by a fixture.
  const interrupt=(tick,state)=>{
    const boss=state.units.find(u=>u.id==='boss-0');
    return boss?.windup>0 && state.skills[0]===0
      ? [{type:'target',id:'boss-0'},{type:'skill1'}] : [];
  };
  const barrier=(tick,state)=>state.skills[1]===0?[{type:'skill2'}]:[];
  const both=(tick,state)=>[...interrupt(tick,state),...barrier(tick,state)];
  const tactics=[
    ['healer-idle',base=>base,()=>[]],
    ['healer-interrupt',base=>base,interrupt],
    ['healer-barrier',base=>base,barrier],
    ['healer-skills',base=>base,both],
    ['ash-idle',base=>chooseCompanion(base,'ash'),()=>[]],
    ['ash-skills',base=>chooseCompanion(base,'ash'),both]
  ];
  const metrics={};
  for(const [name,compose,commands] of tactics){
    let wins=0,defeats=0,totalTicks=0;
    for(let seed=0;seed<300;seed++){
      const stageOne=run(startFight(compose(initialState()),seed));
      assert.equal(stageOne.phase,'victory','stage 1 prerequisite seed '+seed);
      const initialBoss=startFight(nextStage(stageOne),seed+10000);
      assert.equal(initialBoss.units.find(u=>u.id==='boss-0').maxHp,780);
      assert.equal(initialBoss.units.find(u=>u.id==='boss-0').atk,66);
      const second=run(initialBoss,commands);
      assert.equal(validateState(second),true,name+' seed '+seed);
      assert.ok(['victory','defeat'].includes(second.phase),'boss fight must terminate');
      assert.ok(second.tick>=1 && second.tick<=MAX_TICKS,'boss fight must terminate within budget');
      if(second.phase==='victory'){
        wins++;
        assert.equal(second.gold,155,'boss victory adds exactly 110 once');
        assert.deepEqual(second.claimed,[1,2]);
        const repeated=run(startFight(retryStage(second),seed+10000),commands);
        assert.equal(repeated.gold,155,'boss reward never doubles on replay');
      }else{
        defeats++;
        assert.equal(second.gold,45,'boss defeat grants nothing');
        assert.deepEqual(second.claimed,[1]);
      }
      totalTicks+=second.tick;
    }
    metrics[name]={wins,defeats,meanTicks:Math.round(totalTicks/300)};
  }
  console.log('NORKAVEL_G2_BOSS_SAMPLE_1800 '+JSON.stringify(metrics));
  // Regression envelope: player choices must influence survival probability;
  // no specific fixed seed is hard-coded as the desired outcome.
  assert.ok(metrics['healer-idle'].wins>=60 && metrics['healer-idle'].wins<=195,
    'default idle should have meaningful danger, not be impossible');
  assert.ok(metrics['ash-idle'].wins>=180,
    'a viable damage-focused auto build should still clear the boss');
  assert.ok(metrics['healer-interrupt'].wins>=255,
    'skillful interrupts should materially increase survival');
  assert.ok(metrics['healer-barrier'].wins>=255,
    'barrier mitigation should materially increase survival');
  assert.ok(metrics['healer-skills'].wins>=270,
    'combining boss counterplay should be highly reliable');
  assert.ok(metrics['ash-idle'].wins>=metrics['healer-idle'].wins+45,
    'companion choice should change the outcome, not only fight length');
  assert.ok(metrics['healer-skills'].wins>=metrics['healer-idle'].wins+70,
    'player timing must matter');
});

test('G2: deterministic seed advances on each PvE start without breaking replay',()=>{
  const setup=initialState();
  const firstSeed=nextEncounterSeed(setup);
  const nextSeed=nextEncounterSeed({seed:firstSeed});
  assert.notEqual(firstSeed,setup.seed);
  assert.notEqual(firstSeed,nextSeed);
  assert.equal(firstSeed,nextEncounterSeed(structuredClone(setup)));
  assert.throws(()=>nextEncounterSeed({seed:NaN}),TypeError);
  const first=run(startFight(setup,firstSeed));
  assert.equal(first.phase,'victory');
  const retry=retryStage(first);
  assert.equal(nextEncounterSeed(retry),nextSeed,'persisted state carries next attempt seed');
  const repeated=run(startFight(retry,nextSeed));
  assert.equal(repeated.gold,45,'retry with fresh seed cannot duplicate reward');
  assert.equal(repeated.seed,nextSeed);
  const a=run(startFight(retry,firstSeed));
  const b=run(startFight(retry,firstSeed));
  assert.deepEqual(a,b,'explicit fixed seed is exactly replayable');
});
