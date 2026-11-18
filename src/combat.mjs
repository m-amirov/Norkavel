// Norkavel G2 deterministic PvE rules. No DOM, clock, network, platform SDK or Math.random.
export const TICK_MS = 50;
export const MAX_TICKS = 1800;
export const ROSTER = Object.freeze({
  sentinel: { name: 'Ард — Страж', role: 'Защитник', hp: 245, atk: 22, def: 31, interval: 23, front: true, tag: 'guard' },
  ember: { name: 'Мира — Искра', role: 'Маг', hp: 118, atk: 34, def: 9, interval: 26, front: false, tag: 'flame' },
  healer: { name: 'Элира — Свет', role: 'Поддержка', hp: 126, atk: 14, def: 12, interval: 29, front: false, tag: 'light' },
  ash: { name: 'Кайр — Пепел', role: 'Охотник', hp: 145, atk: 28, def: 14, interval: 20, front: false, tag: 'ash' }
});
const ENEMIES = Object.freeze({
  crawler: { name: 'Скиталец', hp: 102, atk: 16, def: 10, interval: 28 },
  wisp: { name: 'Дух разлома', hp: 88, atk: 19, def: 7, interval: 31 },
  raider: { name: 'Осквернитель', hp: 125, atk: 24, def: 13, interval: 32 },
  boss: { name: 'Хранитель Разлома', hp: 490, atk: 31, def: 21, interval: 40 }
});
const clone = (value) => structuredClone(value);
const alive = (unit) => unit.hp > 0;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const rewardAmount = (stage) => stage === 1 ? 45 : 110;
function nextRandom(state) {
  state.rng = (Math.imul(1664525, state.rng) + 1013904223) >>> 0;
  return state.rng / 4294967296;
}
function record(s, type, source, target, amount = 0, detail = '') {
  s.eventId += 1;
  s.events.push({ id: s.eventId, tick: s.tick, type, source, target, amount, detail });
  if (s.events.length > 16) s.events.splice(0, s.events.length - 16);
}
function unit(id, team, properties) {
  return { id, team, name: properties.name, maxHp: properties.hp, hp: properties.hp, atk: properties.atk, def: properties.def, interval: properties.interval,
    nextAttack: properties.interval, front: Boolean(properties.front), shield: 0, shieldTicks: 0, burn: 0, burnTicks: 0, windup: 0 };
}
function doDamage(s, source, target, multiplier = 1, detail = '') {
  if (!source || !target || !alive(source) || !alive(target)) return 0;
  const crit = nextRandom(s) < 0.05 ? 1.5 : 1;
  const bonus = source.id === 'ash' && target.burnTicks > 0 && s.party.includes('ember') ? 1.6 : 1;
  const amount = Math.max(1, Math.round(source.atk * multiplier * 100 / (100 + target.def) * crit * bonus));
  const absorbed = Math.min(amount, target.shield);
  target.shield -= absorbed;
  const dealt = amount - absorbed;
  target.hp = Math.max(0, target.hp - dealt);
  record(s, 'hit', source.id, target.id, dealt, detail || (crit > 1 ? 'crit' : ''));
  if (target.hp === 0) record(s, 'death', source.id, target.id);
  return dealt;
}
function targetEnemy(s) {
  const enemies = s.units.filter(u => u.team === 'enemy' && alive(u));
  return enemies.find(u => u.id === s.target) || enemies[0];
}
function targetAlly(s, preferBack = false) {
  const allies = s.units.filter(u => u.team === 'ally' && alive(u));
  if (!allies.length) return null;
  const eligible = preferBack ? allies.filter(u => !u.front) : allies.filter(u => u.front);
  return (eligible.length ? eligible : allies).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.id.localeCompare(b.id))[0];
}
function finish(s) {
  if (s.phase !== 'fight') return;
  const enemiesAlive = s.units.some(u => u.team === 'enemy' && alive(u));
  const alliesAlive = s.units.some(u => u.team === 'ally' && alive(u));
  if (!enemiesAlive && alliesAlive) {
    s.phase = 'victory';
    const claimed = s.claimed.includes(s.stage);
    s.reward = claimed ? 0 : rewardAmount(s.stage);
    if (!claimed) { s.claimed.push(s.stage); s.gold += s.reward; }
    record(s, 'victory', 'game', 'player', s.reward);
  } else if (!alliesAlive || s.tick >= MAX_TICKS) {
    s.phase = 'defeat';
    s.reward = 0;
    record(s, 'defeat', 'game', 'player');
  }
}
export function initialState() {
  return { schema: 1, phase: 'setup', stage: 1, level: 1, gold: 0, claimed: [], party: ['sentinel', 'ember', 'healer'],
    front: 'sentinel', autoCast: false, seed: 24071, rng: 24071, tick: 0, eventId: 0, events: [], target: '', reward: 0, clickReady: 0, skills: [0, 0], units: [] };
}
export function validateState(s) {
  return s && s.schema === 1 && ['setup','fight','victory','defeat'].includes(s.phase) &&
    [1,2].includes(s.stage) && Number.isSafeInteger(s.gold) && s.gold >= 0 && s.gold <= 1000000 &&
    Number.isSafeInteger(s.level) && s.level >= 1 && s.level <= 100 &&
    Array.isArray(s.claimed) && s.claimed.every(n => [1,2].includes(n)) && new Set(s.claimed).size === s.claimed.length &&
    Array.isArray(s.party) && s.party.length === 3 && new Set(s.party).size === 3 &&
    s.party.every(p => Object.hasOwn(ROSTER, p)) && (s.front === 'hero' || s.front === 'sentinel') &&
    typeof s.autoCast === 'boolean' && Number.isInteger(s.tick) && s.tick >= 0 && s.tick <= MAX_TICKS &&
    Number.isInteger(s.rng) && s.rng >= 0 && s.rng <= 0xffffffff &&
    Number.isInteger(s.seed) && s.seed >= 0 && s.seed <= 0xffffffff &&
    Number.isInteger(s.eventId) && s.eventId >= 0 && Array.isArray(s.events) && s.events.length <= 16 &&
    Array.isArray(s.skills) && s.skills.length === 2 && s.skills.every(n => Number.isInteger(n) && n >= 0 && n <= 300) &&
    Number.isInteger(s.clickReady) && s.clickReady >= 0 && s.clickReady <= 10 &&
    Array.isArray(s.units) && s.units.length <= 7 && s.units.every(u => typeof u.id === 'string' &&
      Number.isFinite(u.hp) && u.hp >= 0 && Number.isFinite(u.maxHp) && u.hp <= u.maxHp);
}
export function chooseCompanion(state, companion) {
  if (state.phase !== 'setup' || !Object.hasOwn(ROSTER, companion)) return state;
  if (state.party.includes(companion)) return state;
  const s = clone(state);
  s.party[2] = companion;
  return s;
}
export function changeFront(state) {
  if (state.phase !== 'setup') return state;
  const s = clone(state);
  s.front = s.front === 'hero' ? 'sentinel' : 'hero';
  return s;
}
export function upgradeHero(state) {
  if (state.phase !== 'setup' || state.gold < 40 || state.level >= 100) return state;
  const s = clone(state); s.gold -= 40; s.level += 1; return s;
}
export function setAutoCast(state, value) {
  if (state.phase !== 'fight' && state.phase !== 'setup') return state;
  const s = clone(state); s.autoCast = Boolean(value); return s;
}
export function startFight(state, seed = state.seed) {
  if (!['setup','defeat','victory'].includes(state.phase) || !Number.isSafeInteger(seed)) return state;
  const s = clone(state);
  s.phase = 'fight'; s.tick = 0; s.eventId = 0; s.events = []; s.reward = 0; s.rng = seed >>> 0;
  s.seed = seed >>> 0; s.clickReady = 0; s.skills = [0,0]; s.target = '';
  const hero = unit('hero', 'ally', {name:'Главный герой',hp:205+25*(s.level-1),atk:32+6*(s.level-1),def:18,interval:20,front:s.front==='hero'});
  s.units = [hero,...s.party.map(id => unit(id,'ally',{...ROSTER[id],front:id===s.front}))];
  const opponents = s.stage === 1 ? ['crawler','wisp','raider'] : ['boss','crawler','wisp'];
  s.units.push(...opponents.map((id,i) => unit(id + '-' + i,'enemy',ENEMIES[id])));
  record(s,'start','game','stage'+s.stage);
  return s;
}
export function nextStage(state) {
  if (state.phase !== 'victory' || state.stage >= 2) return state;
  const s = clone(state); s.stage += 1; s.phase = 'setup'; s.units = []; s.events=[];s.target='';return s;
}
export function retryStage(state) {
  if (!['victory','defeat'].includes(state.phase)) return state;
  const s = clone(state); s.phase='setup';s.units=[];s.events=[];s.target='';return s;
}
export function selectTarget(state, id) {
  if (state.phase !== 'fight' || !state.units.some(u => u.team === 'enemy' && alive(u) && u.id === id)) return state;
  const s = clone(state); s.target = id; return s;
}
function useSkill(s, skillIndex) {
  const hero=s.units.find(u=>u.id==='hero');
  if (!hero || !alive(hero) || s.skills[skillIndex] > 0) return;
  if (skillIndex === 0) {
    const enemy=targetEnemy(s);
    if (!enemy) return;
    doDamage(s,hero,enemy,1.8,'shield-bash');
    if (enemy.id.startsWith('boss-') && enemy.windup>0) {
      enemy.windup=0;enemy.nextAttack=65;
      record(s,'interrupt','hero',enemy.id,0,'shield-bash');
    }
    s.skills[0]=95;
  } else {
    for(const ally of s.units.filter(u=>u.team==='ally' && alive(u))) {
      ally.shield+=26+4*(s.level-1);ally.shieldTicks=75;
    }
    record(s,'barrier','hero','party',26+4*(s.level-1));
    s.skills[1]=160;
  }
}
function useClick(s) {
  const hero=s.units.find(u=>u.id==='hero');
  const enemy=targetEnemy(s);
  if (!hero || !alive(hero) || !enemy || s.clickReady>0) return;
  doDamage(s,hero,enemy,0.31,'click');
  s.clickReady=5;
}
function allyAction(s,u) {
  if (u.id==='healer') {
    const friends=s.units.filter(v=>v.team==='ally' && alive(v)).sort((a,b) => a.hp/a.maxHp - b.hp/b.maxHp);
    const target=friends[0];
    if(target && target.hp/target.maxHp<0.92) {
      const heal=Math.min(target.maxHp-target.hp,26);
      target.hp+=heal;record(s,'heal',u.id,target.id,heal);return;
    }
  }
  const enemy=targetEnemy(s);
  if(!enemy)return;
  doDamage(s,u,enemy,1,u.id==='ash'?'ash':'auto');
  if(u.id==='ember' && alive(enemy)){
    enemy.burnTicks=50; enemy.burn=3;
    record(s,'burn',u.id,enemy.id,3);
  }
}
function enemyAction(s,u) {
  if(u.id.startsWith('boss-')) {
    if(u.windup===0) {
      u.windup=20;
      record(s,'warning',u.id,'party',0,'Rift shockwave');
    }
    return;
  }
  const target=targetAlly(s);
  if(target) doDamage(s,u,target,1,'enemy-auto');
}
export function stepCombat(state, commands = []) {
  if(state.phase!=='fight')return state;
  const s=clone(state);
  s.tick+=1;
  s.clickReady=Math.max(0,s.clickReady-1);
  s.skills=s.skills.map(v=>Math.max(0,v-1));
  for(const u of s.units){
    if(!alive(u))continue;
    if(u.shieldTicks>0 && --u.shieldTicks===0)u.shield=0;
    if(u.burnTicks>0){
      u.burnTicks--;
      if(s.tick%10===0 && u.burn>0) {
        u.hp=Math.max(0,u.hp-u.burn);
        record(s,'dot','ember',u.id,u.burn);
        if(u.hp===0)record(s,'death','ember',u.id);
      }
    }
  }
  finish(s);if(s.phase!=='fight')return s;
  for(const command of commands.slice(0,8)){
    if(command.type==='target') {if(s.units.some(u=>u.team==='enemy'&&alive(u)&&u.id===command.id))s.target=command.id;}
    if(command.type==='click')useClick(s);
    if(command.type==='skill1')useSkill(s,0);
    if(command.type==='skill2')useSkill(s,1);
  }
  if(s.autoCast && s.tick%6===0){
    if(s.units.some(u=>u.id.startsWith('boss-')&&u.windup>0))useSkill(s,0);
    else useSkill(s,1);
  }
  finish(s);if(s.phase!=='fight')return s;
  for(const u of s.units){
    if(!alive(u))continue;
    if(u.windup>0){
      u.windup--;
      if(u.windup===0 && u.id.startsWith('boss-')){
        for(const target of s.units.filter(v=>v.team==='ally'&&alive(v)))doDamage(s,u,target,1.05,'boss-wave');
        record(s,'slam',u.id,'party',0,'Rift shockwave');
        u.nextAttack=65;
      }
      continue;
    }
    u.nextAttack--;
    if(u.nextAttack>0)continue;
    u.nextAttack=u.interval;
    if(u.team==='ally')allyAction(s,u);else enemyAction(s,u);
  }
  finish(s);
  return s;
}
