import test from 'node:test';
import assert from 'node:assert/strict';
import { G2R_COMPANION_IDS, G2R_COMPANION_STATS_POLICY_ID, G2R_COMPANION_STATS_LEVEL_CAP, resolveG2RCompanionStats, createG2RCompanionStatsSnapshot } from '../src/g2r-companion-stats-v1.mjs';

const profile = () => ({
  party:['sentinel','ember','healer'], unlockedCompanionIds:['sentinel','ember','healer'],
  companionProgress:G2R_COMPANION_IDS.map(id=>({id,level:1}))
});

test('companion candidate: preserve level-one base stats of four existing roles',()=>{
  const rows=G2R_COMPANION_IDS.slice(0,4).map(id=>resolveG2RCompanionStats(id,1));
  assert.ok(rows.every(row=>row.maxHp===100 && row.actionIntervalTicks===18));
  assert.deepEqual([rows[0].shield,rows[1].damage,rows[1].burnDamage,rows[1].burnDurationTicks,rows[2].healing,rows[3].damage],[8,7,2,12,8,9]);
  assert.equal(resolveG2RCompanionStats('control',1).role,'ice_controller');
  assert.equal(Object.hasOwn(resolveG2RCompanionStats('control',1),'damage'),false);
});

test('companion candidate: all 500 level/role pairs are finite, bounded and deterministic',()=>{
  for(const id of G2R_COMPANION_IDS){
    let previous=0;
    for(let level=1;level<=G2R_COMPANION_STATS_LEVEL_CAP;level++){
      const stats=resolveG2RCompanionStats(id,level);
      assert.deepEqual(stats,resolveG2RCompanionStats(id,level));
      assert.ok(Object.values(stats).filter(v=>typeof v==='number').every(v=>Number.isSafeInteger(v)&&v>0&&v<=500));
      assert.ok(stats.maxHp>previous); previous=stats.maxHp;
    }
  }
  for(const level of [0,-1,1.5,NaN,Infinity,101,'2',null,Number.MAX_SAFE_INTEGER]) assert.equal(resolveG2RCompanionStats('sentinel',level),null);
  for(const id of ['hero','missing','__proto__',null]) assert.equal(resolveG2RCompanionStats(id,1),null);
});

test('companion candidate: specialization grows independently, control remains bounded',()=>{
  for(const [id,key] of [['sentinel','shield'],['ember','damage'],['healer','healing'],['ash','damage'],['control','slowDurationTicks'],['control','weakenPercent']]){
    assert.ok(resolveG2RCompanionStats(id,100)[key]>resolveG2RCompanionStats(id,1)[key]);
  }
  for(let level=1;level<=100;level++){
    const c=resolveG2RCompanionStats('control',level);
    assert.ok(c.slowValue<=50 && c.slowDurationTicks<c.slowCooldownTicks && c.weakenPercent<=25);
    assert.equal(c.weakenCooldownTicks,120);
  }
});

test('companion candidate: snapshot binds exactly three active levels without mutating profile',()=>{
  const p=profile();const before=structuredClone(p);
  const snapshot=createG2RCompanionStatsSnapshot(p);
  assert.equal(snapshot.policyId,G2R_COMPANION_STATS_POLICY_ID);
  assert.deepEqual(snapshot.companions.map(c=>c.id),p.party);
  p.companionProgress[0].level=3;
  const next=createG2RCompanionStatsSnapshot(p);
  assert.ok(next.companions[0].shield>snapshot.companions[0].shield);
  assert.deepEqual(next.companions.slice(1),snapshot.companions.slice(1));
  assert.equal(snapshot.companions[0].level,1);
  p.companionProgress[0].level=1;
  assert.deepEqual(p,before);
});

test('companion candidate: reject locked, duplicate, unknown or out-of-range companions',()=>{
  const mutations=[
    p=>p.party.push('ash'),p=>p.party.pop(),p=>p.party[1]='sentinel',p=>p.party[2]='control',
    p=>p.party[2]='unknown',p=>p.companionProgress[0].level=101,p=>p.companionProgress[4].level=2,
    p=>p.companionProgress.pop(),p=>p.companionProgress[1].id='sentinel',p=>p.unlockedCompanionIds.push('sentinel'),
    p=>p.unlockedCompanionIds.push('unknown'),p=>p.companionProgress[1]=null,
    p=>delete p.party[2],p=>delete p.unlockedCompanionIds[2],p=>delete p.companionProgress[2]
  ];
  for(const mutate of mutations){const p=profile();mutate(p);assert.equal(createG2RCompanionStatsSnapshot(p),null)}
  assert.equal(createG2RCompanionStatsSnapshot(null),null);
  const p=profile();p.unlockedCompanionIds.push('ash','control');p.party=['control','ash','healer'];p.companionProgress[4].level=12;
  const s=createG2RCompanionStatsSnapshot(p);
  assert.deepEqual(s.companions.map(c=>[c.id,c.level]),[['control',12],['ash',1],['healer',1]]);
});
