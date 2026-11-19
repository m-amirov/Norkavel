import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, chooseCompanion, changeFront, upgradeHero, startFight, nextStage, retryStage, setAutoCast, stepCombat, selectTarget, validateState, MAX_TICKS } from '../src/combat.mjs';

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
