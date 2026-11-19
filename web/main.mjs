import { defineGame, createGameSession } from '../vendor/ludory/packages/core/src/browser.mjs';
import { TICK_MS, ROSTER, initialState, validateState, startFight, stepCombat, nextStage, retryStage,
  chooseCompanion, changeFront, upgradeHero, setAutoCast, selectTarget } from '../src/combat.mjs';

const $ = (id) => document.getElementById(id);
const canvas = $('scene'), ctx = canvas.getContext('2d', {alpha:false});
const panel = $('panel'), hotbar = $('hotbar'), notice = $('notice');
const art = {
  hero: new Image(),
  background: new Image()
};
const artLoaded = image => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
art.hero.decoding = 'async';
art.background.decoding = 'async';
art.hero.src = '/assets/art/warrior-concept-01.png';
art.background.src = '/assets/art/arena-ruins-01.png';
const gate = $('turn-device'), pauseCurtain = $('pause-curtain');
const SAVE_KEY = 'norkavel.g2.save.v1';
const params = await fetch('/ludory.project.json').then(r => {if(!r.ok)throw new Error('manifest unavailable');return r.json();});
const definition = defineGame(params);
let inputs = [], savedCount = 0, active = true, orientationLocked = false;
let panelSignature = '', lastRenderTick = -1, lastEventId = 0;
let previewState = null, lastSaveTime = 0;
let lastFrame = performance.now(), accumulator = 0;
function queue(type, id) { if (!active || gate.hidden === false) return; if (inputs.length < 32) inputs.push({type,id}); }
function restoreSnapshot() {
  try {
    const text = localStorage.getItem(SAVE_KEY);
    if (!text || text.length > 32000) return null;
    const data = JSON.parse(text);
    if (!data || !data.state || !validateState(data.state)) return null;
    return data;
  } catch { return null; }
}
const saved = restoreSnapshot();
const session = createGameSession({
  definition, initialState: initialState(),
  onUpdate({state,setState}) {
    if (state.phase !== 'fight') {inputs=[];return;}
    const pending = inputs.splice(0, 8);
    const next=stepCombat(state,pending);
    setState(next);
    if(next.phase !== state.phase) persist();
  }
});
session.initialize();
if(saved) {
  try { session.restore(saved); savedCount++; } catch { /* fail closed on incompatible or corrupt save */ }
}
session.start();
function persist(){
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(session.snapshot())); } catch { /* storage may be disabled */ }
}
function isMobilePortrait() { return innerHeight > innerWidth; }
function reevaluatePause() {
  const portrait = isMobilePortrait();
  gate.hidden = !portrait;
  orientationLocked = portrait;
  if (portrait || document.hidden) {
    if (session.getStatus() === 'running') session.pause();
    active = false; inputs=[]; accumulator=0;
  } else if (active !== false || session.getStatus() === 'paused' && !$('pause-button').dataset.manual) {
    if (session.getStatus() === 'paused') session.resume();
    active = true; accumulator=0;
  }
  pauseCurtain.hidden = !(!portrait && $('pause-button').dataset.manual === 'yes');
}
function manualPause() {
  if (orientationLocked) return;
  const button=$('pause-button');
  if(button.dataset.manual === 'yes'){
    delete button.dataset.manual;
    active=true;
    if(session.getStatus()==='paused' && !document.hidden)session.resume();
  } else {
    button.dataset.manual='yes'; active=false;
    if(session.getStatus()==='running')session.pause();
  }
  accumulator=0;inputs=[];
  pauseCurtain.hidden=button.dataset.manual!=='yes';
  button.setAttribute('aria-label',button.dataset.manual==='yes'?'Продолжить':'Пауза');
}
$('pause-button').addEventListener('click',manualPause);
pauseCurtain.addEventListener('click', manualPause);
addEventListener('resize',()=>{reevaluatePause();draw(session.getState(),performance.now());});
document.addEventListener('visibilitychange',()=>{if(document.hidden){persist();}reevaluatePause();});
addEventListener('pagehide',persist);
$('skill-1').addEventListener('click',()=>queue('skill1'));
$('skill-2').addEventListener('click',()=>queue('skill2'));
$('auto-button').addEventListener('click',()=>{
  if(orientationLocked || !active) return;
  const s=session.getState(); if(s.phase==='fight'){session.setState(setAutoCast(s,!s.autoCast));persist();}
});
addEventListener('keydown',e=>{
  if(e.repeat || orientationLocked || !active || e.altKey || e.metaKey || e.ctrlKey)return;
  if(e.key==='1'){e.preventDefault();queue('skill1');}
  if(e.key==='2'){e.preventDefault();queue('skill2');}
  if(e.key===' '){e.preventDefault();queue('click');}
  if(e.key==='Escape'){e.preventDefault();manualPause();}
});
panel.addEventListener('click',e=>{
  if(orientationLocked || !active)return;
  const button=e.target.closest('button[data-action]');if(!button)return;
  const action=button.dataset.action, state=session.getState();
  let result=state;
  if(action==='choose')result=chooseCompanion(state,button.dataset.id);
  if(action==='front')result=changeFront(state);
  if(action==='upgrade')result=upgradeHero(state);
  if(action==='start')result=startFight(state, state.seed);
  if(action==='next')result=nextStage(state);
  if(action==='retry')result=retryStage(state);
  if(result!==state){session.setState(result);persist();renderUI(result);}
});
function positions(s) {
  const front=s.front==='sentinel' ? 'sentinel' : 'hero';
  const pos={hero:{x:front==='hero'?365:242,y:502},sentinel:{x:front==='sentinel'?370:240,y:509},
    ember:{x:132,y:517},healer:{x:455,y:529},ash:{x:455,y:525}};
  pos['boss-0']={x:981,y:500};
  pos['crawler-0']={x:813,y:536};
  pos['crawler-1']={x:853,y:536};
  pos['wisp-1']={x:1070,y:450};
  pos['raider-2']={x:987,y:522};
  pos['wisp-2']={x:1130,y:459};
  return pos;
}
function getVisualUnits(s) {
  if(s.units.length)return s.units;
  if(!previewState || previewState.stage!==s.stage || previewState.front!==s.front || previewState.party.join()!==s.party.join() || previewState.level!==s.level)previewState=startFight(s);
  return previewState.units;
}
canvas.addEventListener('pointerdown',e=>{
  if(orientationLocked || !active || session.getState().phase!=='fight')return;
  const rect=canvas.getBoundingClientRect();
  const px=(e.clientX-rect.left)/rect.width*1280,py=(e.clientY-rect.top)/rect.height*720;
  const state=session.getState(),pos=positions(state);
  const enemy=state.units.filter(u=>u.team==='enemy'&&u.hp>0)
    .map(u=>({u,p:pos[u.id]}))
    .filter(v=>v.p && Math.abs(px-v.p.x)<90 && Math.abs(py-v.p.y)<140)
    .sort((a,b)=>Math.hypot(px-a.p.x,py-a.p.y)-Math.hypot(px-b.p.x,py-b.p.y))[0];
  if(enemy){queue('target',enemy.u.id);queue('click');}
});
function message(t){ notice.textContent=t; setTimeout(()=>{if(notice.textContent===t)notice.textContent='';},1800); }
function button(label, action, attr=''){return '<button type="button" class="secondary" data-action="'+action+'" '+attr+'>'+label+'</button>';}
function panelHTML(s) {
  if(s.phase==='setup'){
    const choice=(id)=>'<button type="button" class="select" data-action="choose" data-id="'+id+'" aria-pressed="'+s.party.includes(id)+'">'+(id==='healer'?'Элира · Лечение':'Кайр · Пепел')+'</button>';
    return '<div class="eyebrow">Пограничье · глава I</div><h1>'+(s.stage===1?'Пепельный тракт':'Сердце разлома')+'</h1>'+
      '<p>'+(s.stage===1?'Зачистите тракт и откройте дорогу к Разлому.':'Хранитель Разлома готовит сокрушительный удар. Прервите его щитовым ударом или укройтесь барьером.')+'</p>'+
      '<div class="line"></div><div class="row"><strong>Ваш герой · Воин '+s.level+' ур.</strong><span>◈ '+s.gold+'</span></div>'+
      '<div class="row">Фронтовой боец <span>'+(s.front==='sentinel'?'Ард — Страж':'Главный герой')+'</span></div>'+
      button('Сменить переднюю позицию','front')+
      '<div class="row"><strong>Третий спутник</strong><span>Выберите</span></div>'+
      '<div class="squad">'+choice('healer')+choice('ash')+'</div>'+
      '<p>'+(s.party.includes('ash')?'✦ Синергия «Пламя + Пепел»: Кайр усиливает удары по горящим целям.':'✦ Элира лечит раненых союзников. Для уронной синергии замените её Кайром.')+'</p>'+
      button('Усилить героя · 40 ◈','upgrade',s.gold<40?'disabled':'')+
      '<button type="button" class="primary" data-action="start">В БОЙ  →</button>';
  }
  if(s.phase==='victory'){
    return '<div class="eyebrow">Разлом отступает</div><h1>Победа</h1><p>Отряд уцелел. Ваша тактика позволила одержать верх.</p><div class="line"></div>'+
      '<div class="row"><strong>Награда</strong><span>+'+s.reward+' ◈</span></div>'+
      '<div class="row">Сражение <span>'+Math.floor(s.tick*TICK_MS/1000)+' сек</span></div>'+
      '<div class="row">Сокровищница <span>'+s.gold+' ◈</span></div>'+
      (s.stage===1?'<button class="primary" type="button" data-action="next">К ХРАНИТЕЛЮ РАЗЛОМА →</button>':'<p>Первый играбельный маршрут завершён. Рейтинговая арена появится только после серверной реализации.</p>')+
      button('Вернуться к отряду','retry');
  }
  if(s.phase==='defeat'){
    return '<div class="eyebrow">Путь ещё не закончен</div><h1>Поражение</h1><p>Защитите тыл, смените третьего спутника или вовремя прервите удар Хранителя.</p>'+
      '<div class="line"></div><div class="row">Золото сохранено <span>'+s.gold+' ◈</span></div>'+
      '<button class="primary" type="button" data-action="retry">ПЕРЕСОБРАТЬ ОТРЯД →</button>';
  }
  return '';
}
function renderUI(s) {
  const sig=[s.phase,s.stage,s.level,s.gold,s.party.join(','),s.front,s.reward].join('|');
  if(sig!==panelSignature){panel.innerHTML=panelHTML(s);panelSignature=sig;}
  panel.hidden=s.phase==='fight';
  hotbar.hidden=s.phase!=='fight';
  $('chapter').textContent=(s.stage===1?'01 / Пепельный тракт':'02 / Сердце разлома');
  $('currency').textContent='◈ '+s.gold;
  $('synergy').textContent=s.party.includes('ash')?'✦ Пламя × Пепел — активно':'✦ Отряд · '+s.party.length+' спутника';
  if(s.phase==='fight'){
    const live=s.units.filter(u=>u.team==='enemy'&&u.hp>0).length;
    $('battle-readout').textContent='ПРОТИВНИКОВ '+live+'  ·  ЭТАП '+s.stage;
    $('seconds').textContent=String(Math.floor(s.tick*TICK_MS/60000)).padStart(2,'0')+':'+String(Math.floor(s.tick*TICK_MS/1000)%60).padStart(2,'0');
    for(let n=0;n<2;n++){
      $(n===0?'skill-1':'skill-2').disabled=s.skills[n]>0 || !s.units.some(u=>u.id==='hero'&&u.hp>0);
      $('cd-'+(n+1)).textContent=s.skills[n]>0?(s.skills[n]*TICK_MS/1000).toFixed(1)+' с':'ГОТОВО';
    }
    $('auto-button').setAttribute('aria-pressed',String(s.autoCast));
    $('auto-button').textContent=s.autoCast?'АВТО: ВКЛ':'АВТО: ВЫКЛ';
    if(s.eventId>lastEventId) {
      const events=s.events.filter(e=>e.id>lastEventId);
      if(events.some(e=>e.type==='warning'))message('ХРАНИТЕЛЬ ГОТОВИТ УДАР!');
      else if(events.some(e=>e.type==='interrupt'))message('УДАР ПРЕРВАН!');
      lastEventId=s.eventId;
    }
  } else {
    $('battle-readout').textContent='';
    lastEventId=0;
  }
}
function polygon(points,fill,stroke,lineWidth=1){
  ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();
  ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.lineWidth=lineWidth;ctx.strokeStyle=stroke;ctx.stroke();}
}
function ellipse(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function skyline(points,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,720);for(const p of points)ctx.lineTo(...p);ctx.lineTo(1280,720);ctx.closePath();ctx.fill();}
function drawWorld(time,s){
  if (artLoaded(art.background)) {
    ctx.drawImage(art.background,0,0,1280,720);
    const shade=ctx.createLinearGradient(0,0,0,720);
    shade.addColorStop(0,'#0c172311');
    shade.addColorStop(.72,'#12202b08');
    shade.addColorStop(1,'#08171f80');
    ctx.fillStyle=shade;
    ctx.fillRect(0,0,1280,720);
    return;
  }
  let g=ctx.createLinearGradient(0,0,0,720);
  g.addColorStop(0,'#112735');g.addColorStop(.48,'#2e4950');g.addColorStop(.72,'#696754');g.addColorStop(1,'#1b2826');
  ctx.fillStyle=g;ctx.fillRect(0,0,1280,720);
  g=ctx.createRadialGradient(900,223,20,900,223,465);g.addColorStop(0,'#c8b27d50');g.addColorStop(.5,'#80969e1d');g.addColorStop(1,'#1a253200');ctx.fillStyle=g;ctx.fillRect(0,0,1280,720);
  ellipse(903,164,46,46,'#eed4a367');ellipse(903,164,38,38,'#d0d3c78c');
  skyline([[0,390],[86,310],[188,356],[322,244],[464,333],[607,251],[763,364],[908,258],[1063,342],[1178,285],[1280,361]],'#263d46');
  skyline([[0,468],[112,394],[235,420],[351,357],[506,418],[621,376],[753,433],[869,338],[998,421],[1132,351],[1280,426]],'#26363a');
  skyline([[0,527],[125,489],[259,510],[377,471],[497,504],[639,447],[738,483],[870,453],[999,495],[1130,460],[1280,477]],'#273839');
  // Rift portal and its halo, visible but never a replacement for the boss telegraph.
  g=ctx.createRadialGradient(1007,408,3,1007,408,180);g.addColorStop(0,'#9ad0d055');g.addColorStop(.55,'#4c918c25');g.addColorStop(1,'#13212900');ctx.fillStyle=g;ctx.fillRect(802,220,411,360);
  ctx.save();ctx.translate(1018,417);ctx.scale(1.0,1.52);ctx.beginPath();ctx.arc(0,0,59,Math.PI,0);ctx.lineTo(59,55);ctx.quadraticCurveTo(0,94,-59,55);ctx.closePath();ctx.fillStyle='#0d242be0';ctx.fill();ctx.lineWidth=7;ctx.strokeStyle='#537c79aa';ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#c1be8d88';ctx.stroke();ctx.restore();
  for(let i=0;i<18;i++){const x=1012+Math.sin(i*2.37+time*.00015)*58;const y=360+((i*43+time*.013)%173);ellipse(x,y,2,2.4,'#9ac4b160');}
  // Distant trees.
  ctx.save();for(let i=0;i<22;i++){
    const x=i*64-35,y=470+(i%4)*11,r=36+(i%3)*10;
    polygon([[x,y-112-r*.25],[x-r*.57,y-18],[x-r*.28,y-19],[x-r*.8,y+6],[x+r*.8,y+6],[x+r*.24,y-22],[x+r*.51,y-19]],i%3?'#172f32bb':'#243639ab');
    ctx.fillStyle='#162a2b';ctx.fillRect(x-5,y+5,10,34);
  }ctx.restore();
  skyline([[0,555],[100,549],[243,560],[359,542],[478,551],[620,544],[722,552],[850,532],[1044,551],[1165,542],[1280,555]],'#3c4541');
  g=ctx.createLinearGradient(0,530,0,720);g.addColorStop(0,'#647166');g.addColorStop(.24,'#475548');g.addColorStop(1,'#172925');ctx.fillStyle=g;ctx.fillRect(0,552,1280,168);
  // Warm dusty footpath and small stone fragments.
  ellipse(668,624,690,76,'#ac9a7130');ellipse(681,628,560,59,'#b8a57a17');
  for(let i=0;i<48;i++){
    const x=(i*139)%1280,y=569+(i*47)%143;
    polygon([[x,y],[x+4+(i%6),y-3],[x+10+(i%4),y+2],[x+3,y+5]],i%3?'#b1a18124':'#172c2c5e');
  }
  // Rifted standing stones near the edge.
  for(const [x,y,sz] of [[79,515,49],[1163,512,67],[1212,525,33]]){
    polygon([[x-sz*.3,y],[x-sz*.28,y-sz],[x+sz*.06,y-sz*1.4],[x+sz*.32,y-sz*.7],[x+sz*.28,y]],'#364c4b','#a9ab8258',2);
    ctx.save();ctx.strokeStyle='#a1dac783';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-2,y-sz*.95);ctx.lineTo(x+8,y-sz*.62);ctx.lineTo(x,y-sz*.28);ctx.stroke();ctx.restore();
  }
}
function drawFigure(u,x,y,t,s) {
  if (u.id === 'hero' && artLoaded(art.hero)) {
    ctx.save();
    ctx.globalAlpha=u.hp>0?1:.26;
    ctx.shadowColor='#08141988';
    ctx.shadowBlur=12;
    // Production candidate image: real transparent source; no fake sprite-frame claims.
    const iw=240,ih=160;
    const bx=x-105,by=y-ih+20;
    ctx.drawImage(art.hero,bx,by,iw,ih);
    ctx.restore();
    const barY=y-ih-5,bw=80,bh=7;
    ctx.fillStyle='#102124df';ctx.fillRect(x-bw/2,barY,bw,bh);
    ctx.fillStyle='#94c9a6';ctx.fillRect(x-bw/2+1,barY+1,Math.max(0,(bw-2)*u.hp/u.maxHp),bh-2);
    ctx.strokeStyle='#d1cab47a';ctx.lineWidth=1;ctx.strokeRect(x-bw/2,barY,bw,bh);
    if(u.shield>0){ctx.strokeStyle='#a0d1d8';ctx.strokeRect(x-bw/2-2,barY-2,bw+4,bh+4);}
    ctx.save();ctx.font='bold 12px Arial';ctx.textAlign='center';
    ctx.fillStyle='#fff0d8';ctx.shadowColor='#071018';ctx.shadowBlur=5;
    ctx.fillText('Воин',x,barY-12);ctx.restore();
    return;
  }
  const isEnemy=u.team==='enemy',boss=u.id.startsWith('boss-');
  const kind=u.id.replace(/-\d+$/,'');
  const colors={hero:['#c3a06e','#3a525e','#f3dba2'],sentinel:['#798f97','#324655','#d5e1d4'],ember:['#b7645c','#482b53','#e8a570'],healer:['#d8ca9c','#4d7773','#edf1dc'],ash:['#7f839e','#2d4151','#c3bacb'],
    crawler:['#879079','#3c473c','#c6b89d'],wisp:['#87b2bb','#335d64','#a1eded'],raider:['#be9276','#513f46','#d9bca2'],boss:['#936876','#2a3442','#e8a19b']};
  const palette=colors[kind]||colors.crawler;
  const h=boss?151:isEnemy?84:(kind==='sentinel'?113:104),scale=boss?1.5:isEnemy?.92:1;
  const breathe=Math.sin(t*.0025+u.id.length)*2;
  ctx.save();ctx.translate(x,y);ctx.scale(isEnemy?-scale:scale,scale);
  ctx.globalAlpha=u.hp>0?1:.25;
  ellipse(0,13,56,13,'#061518a8');
  if(kind==='wisp'){const g=ctx.createRadialGradient(0,-65,10,0,-65,60);g.addColorStop(0,'#d6f2e6bc');g.addColorStop(1,'#58b7c300');ctx.fillStyle=g;ctx.fillRect(-70,-141,140,130);}
  // Mantle and cloaks are layered to avoid generic stick figures.
  polygon([[-23,-h*.57],[-39,-h*.12],[-29,3],[32,2],[41,-h*.17],[22,-h*.59]],palette[1],'#0c1d24c9',3);
  polygon([[-20,-h*.73],[-33,-h*.42],[-8,-h*.29],[17,-h*.3],[28,-h*.68],[9,-h*.82]],palette[0],'#131a2099',2);
  polygon([[-14,-h*.32],[-18,-5],[-4,-4],[4,-h*.34]],'#202e34');
  polygon([[8,-h*.35],[6,-6],[20,-4],[22,-h*.32]],'#28373d');
  ellipse(1,-h*.8+breathe,18,boss?19:17,palette[2]);
  polygon([[-23,-h*.97],[-13,-h*1.09],[1,-h*1.15],[18,-h*1.06],[22,-h*.96],[11,-h*.88],[-11,-h*.88]],palette[1],'#080e1bbb',2);
  polygon([[-31,-h*.73],[-17,-h*.82],[1,-h*.76],[20,-h*.83],[29,-h*.67],[13,-h*.57],[-17,-h*.56]],palette[0],'#d6ba8a77',1.5);
  ellipse(-8,-h*.79,2.5,2,'#f1dbb3');ellipse(9,-h*.79,2.5,2,'#f1dbb3');
  ctx.save();ctx.strokeStyle=palette[2];ctx.lineWidth=boss?5:3;ctx.lineCap='round';ctx.beginPath();
  if(kind==='ember'||kind==='healer'){ctx.moveTo(20,-h*.7);ctx.lineTo(39,-h*1.26);ctx.stroke();ellipse(40,-h*1.28,8,8,kind==='ember'?'#ff9a64':'#c4e6bd');}
  else if(kind==='sentinel'){ctx.moveTo(18,-h*.7);ctx.lineTo(33,-h*.40);ctx.stroke();ellipse(39,-h*.44,19,30,'#455f69');ellipse(39,-h*.44,10,19,'#adb2a3');}
  else if(kind==='boss'){ctx.moveTo(12,-h*.61);ctx.lineTo(51,-h*1.35);ctx.stroke();ellipse(50,-h*1.39,12,12,'#f3a0a0');}
  else{ctx.moveTo(14,-h*.7);ctx.lineTo(37,-h*1.19);ctx.stroke();ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(30,-h*1.15);ctx.lineTo(45,-h*1.22);ctx.stroke();}
  ctx.restore();
  if(boss){polygon([[-19,-h*1.11],[-42,-h*1.48],[-13,-h*1.30],[0,-h*1.18]],'#332936','#cf8a827e');polygon([[9,-h*1.17],[36,-h*1.55],[24,-h*1.20]],'#312936','#cf8a827e');}
  // Local bar position uses the already-scaled actor coordinates; do not multiply height twice.
  ctx.globalAlpha=1;
  const bw=boss?130:76,bh=7,barY=boss?-h*1.55-24:-h*1.23-22;
  ctx.fillStyle='#102124df';ctx.fillRect(-bw/2,barY,bw,bh);
  ctx.fillStyle=isEnemy?'#d7a07a':'#94c9a6';ctx.fillRect(-bw/2+1,barY+1,Math.max(0,(bw-2)*u.hp/u.maxHp),bh-2);
  ctx.strokeStyle='#d1cab47a';ctx.lineWidth=1;ctx.strokeRect(-bw/2,barY,bw,bh);
  if(u.shield>0){ctx.strokeStyle='#a0d1d8';ctx.lineWidth=1.5;ctx.strokeRect(-bw/2-2,barY-2,bw+4,bh+4);}
  if(u.burnTicks>0)ellipse(bw*.5,barY,5,5,'#fb8f4e');
  if(boss && u.windup>0){ctx.strokeStyle='#ff6666';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-h*.5,65+(20-u.windup)*2.4,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
  // Short battlefield labels avoid overlap; full names remain in squad/game data.
  const shortName={hero:'Воин',sentinel:'Ард',ember:'Мира',healer:'Элира',ash:'Кайр',
    crawler:'Скиталец',wisp:'Дух',raider:'Осквернитель',boss:'Хранитель Разлома'}[kind]||u.name;
  ctx.save();ctx.font=boss?'bold 14px Georgia':'bold 12px Arial';ctx.textAlign='center';
  ctx.fillStyle='#faf0d6';ctx.shadowColor='#061013';ctx.shadowBlur=5;
  ctx.fillText(shortName,x,y+barY*scale-14);ctx.restore();
}
function draw(s,time) {
  ctx.clearRect(0,0,1280,720);
  drawWorld(time,s);
  const units=getVisualUnits(s), pos=positions(s);
  for(const u of units.filter(u=>u.team==='enemy').reverse())if(pos[u.id])drawFigure(u,pos[u.id].x,pos[u.id].y,time,s);
  for(const u of units.filter(u=>u.team==='ally'))if(pos[u.id])drawFigure(u,pos[u.id].x,pos[u.id].y,time,s);
  const target=s.units.find(u=>u.id===s.target&&u.hp>0);
  if(target&&pos[target.id]){ctx.strokeStyle='#f3d28d';ctx.lineWidth=3;const p=pos[target.id];ctx.beginPath();ctx.ellipse(p.x,p.y+7,61,18,0,0,Math.PI*2);ctx.stroke();}
  // Subtle deterministic hit VFX; no rendered mockup image is claimed as production art.
  for(const ev of s.events.filter(e=>s.tick-e.tick<13)){
    if(ev.type!=='hit'&&ev.type!=='heal'&&ev.type!=='interrupt'&&ev.type!=='slam')continue;
    const p=pos[ev.target];if(!p)continue;
    const age=s.tick-ev.tick,alpha=Math.max(.1,1-age/13);
    ctx.save();ctx.globalAlpha=alpha;ctx.font='bold 18px Arial';ctx.textAlign='center';ctx.shadowBlur=12;ctx.shadowColor=ev.type==='heal'?'#a6ecba':'#f4b47d';
    ctx.fillStyle=ev.type==='heal'?'#b5ffcb':'#ffdbab';ctx.fillText(ev.type==='heal'?'+'+ev.amount:ev.type==='interrupt'?'ПРЕРВАНО':'−'+ev.amount,p.x,p.y-125-age*2);ctx.restore();
  }
  if(s.phase==='fight'){
    const boss=s.units.find(u=>u.id.startsWith('boss-')&&u.hp>0&&u.windup>0);
    if(boss){ctx.save();ctx.fillStyle='#cc403729';ctx.fillRect(0,0,1280,720);ctx.restore();}
  }
}
function frame(now) {
  const dt=Math.min(150,now-lastFrame);lastFrame=now;
  if(active && !orientationLocked && !document.hidden && session.getStatus()==='running'){
    accumulator=Math.min(accumulator+dt,300);
    let steps=0;while(accumulator>=TICK_MS && steps<6){session.tick(TICK_MS);accumulator-=TICK_MS;steps++;}
  }
  const s=session.getState();
  renderUI(s);
  draw(s,now);
  if(now-lastSaveTime>1800 && active){persist();lastSaveTime=now;}
  requestAnimationFrame(frame);
}
reevaluatePause();
renderUI(session.getState());
requestAnimationFrame(frame);
window.__norkavelDebug = Object.freeze({
  snapshot:()=>session.snapshot(),
  getOrientation:()=>({portrait:orientationLocked,active}),
  getStatus:()=>session.getStatus(),
  getArtStatus:()=>({
    hero:{loaded:artLoaded(art.hero),width:art.hero.naturalWidth,height:art.hero.naturalHeight},
    background:{loaded:artLoaded(art.background),width:art.background.naturalWidth,height:art.background.naturalHeight}
  })
});
