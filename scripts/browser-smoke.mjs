// Headless Chromium CDP acceptance smoke using Node 22 built-ins.
import {spawn,execFileSync} from 'node:child_process';
import {createStaticServer} from './serve.mjs';
import {once} from 'node:events';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(callback,timeout=10000,name='condition'){
  const began=Date.now(),errors=[];
  while(Date.now()-began<timeout){
    try{const answer=await callback();if(answer)return answer;}catch(e){errors.push(String(e));}
    await delay(120);
  }
  throw new Error('Timed out: '+name+(errors.length?' ('+errors.at(-1)+')':''));
}
function chromeBinary(){
  const candidates=process.env.CHROME_BIN?[process.env.CHROME_BIN]:['google-chrome','chromium','chromium-browser'];
  for(const name of candidates)try{execFileSync(name,['--version'],{stdio:'ignore'});return name;}catch{}
  throw new Error('Chromium missing: browser validation NOT_RUN');
}
async function main(){
  const temp=await mkdtemp(join(tmpdir(),'norkavel-ci-')),out=join(process.cwd(),'artifacts/g2-browser');
  await mkdir(out,{recursive:true});
  const server=createStaticServer();server.listen(0,'127.0.0.1');await once(server,'listening');
  const gameUrl='http://127.0.0.1:'+server.address().port+'/';
  let chrome,socket;
  try{
    const dir=join(temp,'chrome');
    chrome=spawn(chromeBinary(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
      '--disable-background-timer-throttling','--disable-renderer-backgrounding',
      '--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+dir,'about:blank'],{stdio:'ignore'});
    chrome.on('error',()=>{});
    const port=await until(async()=>{try{return Number((await readFile(join(dir,'DevToolsActivePort'),'utf8')).split('\n')[0]);}catch{return 0;}},15000,'chrome port');
    const page=await until(async()=>{const res=await fetch('http://127.0.0.1:'+port+'/json/list');return (await res.json()).find(x=>x.type==='page'&&x.webSocketDebuggerUrl);},9000,'debugger');
    socket=new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    let serial=0;const requests=new Map(),errors=[],consoleErrors=[];
    socket.addEventListener('message',e=>{
      const m=JSON.parse(e.data);
      if(m.id && requests.has(m.id)){const pair=requests.get(m.id);requests.delete(m.id);m.error?pair.reject(new Error(JSON.stringify(m.error))):pair.resolve(m.result);}
      if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);
      if(m.method==='Log.entryAdded' && m.params.entry.level==='error')consoleErrors.push(m.params.entry.text);
    });
    const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;requests.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
    const js=async expression=>{
      const value=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
      if(value.exceptionDetails)throw new Error(value.exceptionDetails.text);
      return value.result.value;
    };
    const screenshot=async name=>{
      const x=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      await writeFile(join(out,name+'.png'),Buffer.from(x.data,'base64'));
    };
    await send('Page.enable');await send('Runtime.enable');await send('Log.enable');
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false,screenOrientation:{type:'landscapePrimary',angle:90}});
    await send('Page.navigate',{url:gameUrl});
    await until(()=>js('Boolean(window.__norkavelDebug && document.querySelector("[data-action=start]"))'),12000,'game boot');
    await until(()=>js('window.__norkavelDebug.getArtStatus().hero.loaded && window.__norkavelDebug.getArtStatus().background.loaded'),12000,'both real art images decoded');
    assert.deepEqual(await js('window.__norkavelDebug.getArtStatus()'),
      {hero:{loaded:true,width:1536,height:1024},background:{loaded:true,width:1672,height:941}});
    const spriteManifest=await js('fetch("/assets/art/manifest.json").then(r=>r.json())');
    if(spriteManifest.stagedG3?.status==='CANDIDATE_IMAGES_INTEGRATED'){
      await until(()=>js('Object.values(window.__norkavelDebug.getG3ActorArtStatus()).every(x=>x.decoded)'),12000,
        'all four G3 assets decoded when explicitly present');
    }
    const spriteStatus=await js('window.__norkavelDebug.getG3ActorArtStatus()');
    assert.deepEqual(Object.keys(spriteStatus),['sentinel','ember','healer','ash']);
    for(const info of Object.values(spriteStatus)){
      if(spriteManifest.stagedG3?.status==='CANDIDATE_IMAGES_INTEGRATED')
        assert.deepEqual(info,{registered:true,decoded:true,dimensions:[512,512]});
      else assert.deepEqual(info,{registered:false,decoded:false,dimensions:null},
        'G3 concept pack must not masquerade as integrated/decoded sprites');
    }
    assert.equal(await js('window.__norkavelDebug.getStatus()'),'running');
    await screenshot('01-setup');
    assert.equal(await js('document.querySelector("[data-action=choose][data-id=ash]").click();window.__norkavelDebug.snapshot().state.party.includes("ash")'),true);
    assert.equal(await js('document.querySelector("[data-action=choose][data-id=healer]").click();window.__norkavelDebug.snapshot().state.party.includes("healer")'),true);
    await js('document.querySelector("[data-action=start]").click()');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.phase'),'fight');
    const firstSeed=await js('window.__norkavelDebug.snapshot().state.seed');
    assert.notEqual(firstSeed,24071,'first PvE start must advance seed');
    await js('document.getElementById("skill-2").click()');
    await until(()=>js('window.__norkavelDebug.snapshot().state.events.some(e=>e.type==="barrier")'),4000,'skill activation');
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:807,y:530,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:807,y:530,button:'left',clickCount:1});
    await until(()=>js('window.__norkavelDebug.snapshot().state.events.some(e=>e.detail==="click")'),5000,'manual click damage');
    await screenshot('02-battle');
    await js('document.getElementById("pause-button").click()');
    await until(()=>js('window.__norkavelDebug.getStatus()==="paused"'),2000,'manual pause');
    const manualTick=await js('window.__norkavelDebug.snapshot().state.tick');
    await delay(250);
    assert.equal(await js('window.__norkavelDebug.snapshot().state.tick'),manualTick,'manual pause freezes combat');
    await js('document.getElementById("pause-curtain").click()');
    await until(()=>js('window.__norkavelDebug.getStatus()==="running"'),2000,'manual resume');
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true,screenOrientation:{type:'portraitPrimary',angle:0}});
    await until(()=>js('document.getElementById("turn-device").hidden===false && window.__norkavelDebug.getStatus()==="paused"'),5000,'portrait gate');
    const tick=await js('window.__norkavelDebug.snapshot().state.tick');
    await screenshot('03-portrait');
    await delay(400);
    assert.equal(await js('window.__norkavelDebug.snapshot().state.tick'),tick,'simulation must be paused in portrait');
    // Portrait input is inert: overlay plus paused simulation, not a scaled-down combat UI.
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:310,y:740}]});
    await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'1',code:'Digit1',windowsVirtualKeyCode:49});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'1',code:'Digit1',windowsVirtualKeyCode:49});
    assert.equal(await js('window.__norkavelDebug.snapshot().state.tick'),tick,'portrait cannot process action');
    for(const [width,height] of [[360,640],[768,1024]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true,
        screenOrientation:{type:'portraitPrimary',angle:0}});
      await until(()=>js('document.getElementById("turn-device").hidden===false'),4000,'portrait blocked '+width);
      assert.equal(await js('window.__norkavelDebug.snapshot().state.tick'),tick);
    }
    // Large portrait tablets must also be blocked; width=1024 must not bypass the rule.
    await send('Emulation.setDeviceMetricsOverride',{width:1024,height:1366,deviceScaleFactor:1,mobile:true,screenOrientation:{type:'portraitPrimary',angle:0}});
    await until(()=>js('document.getElementById("turn-device").hidden===false && window.__norkavelDebug.getStatus()==="paused"'),5000,'tablet portrait gate');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.tick'),tick);
    await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true,screenOrientation:{type:'landscapePrimary',angle:90}});
    await until(()=>js('document.getElementById("turn-device").hidden===true && window.__norkavelDebug.getStatus()==="running"'),6000,'landscape resume');
    await screenshot('04-landscape');
    // Real emulated touch event on a landscape skill button; do not substitute .click() for touch coverage.
    const skillRect=await js('document.getElementById("skill-1").getBoundingClientRect().toJSON()');
    const touchPoint={x:Math.round(skillRect.left+skillRect.width/2),y:Math.round(skillRect.top+skillRect.height/2)};
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touchPoint]});
    await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await until(()=>js('window.__norkavelDebug.snapshot().state.events.some(e=>e.detail==="shield-bash")'),5000,'landscape touch skill activation');
    await until(()=>js('window.__norkavelDebug.snapshot().state.phase==="victory"'),45000,'stage one victory');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.gold'),45);
    // Reload from an actual Core snapshot; the already-claimed reward must not be granted twice.
    await send('Page.reload',{ignoreCache:true});
    await until(()=>js('Boolean(window.__norkavelDebug) && window.__norkavelDebug.snapshot().state.phase==="victory"'),12000,'saved victory after reload');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.gold'),45);
    await js('document.querySelector("[data-action=retry]").click()');
    await until(()=>js('Boolean(document.querySelector("[data-action=start]"))'),3000,'retry setup');
    await js('document.querySelector("[data-action=start]").click()');
    const secondSeed=await js('window.__norkavelDebug.snapshot().state.seed');
    assert.equal(secondSeed,(Math.imul(firstSeed,1664525)+1013904223)>>>0,
      'retry advances seed reproducibly');
    await until(()=>js('window.__norkavelDebug.snapshot().state.phase==="victory"'),45000,'retry victory');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.gold'),45,'reward idempotency after reload/retry');
    await js('document.querySelector("[data-action=next]").click()');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.stage'),2);
    const stageTwoSetup=await js('window.__norkavelDebug.snapshot()');
    assert.equal(stageTwoSetup.state.phase,'setup');
    await js('document.querySelector("[data-action=start]").click()');
    const stageTwoFixture=await js('window.__norkavelDebug.snapshot()');
    assert.equal(stageTwoFixture.state.seed,(Math.imul(secondSeed,1664525)+1013904223)>>>0,
      'new stage advances the deterministic PvE seed');
    assert.equal(stageTwoFixture.state.stage,2);
    assert.equal(stageTwoFixture.state.phase,'fight');
    await until(()=>js('window.__norkavelDebug.snapshot().state.events.some(e=>e.type==="warning")'),19000,'boss warning');
    await screenshot('05-boss');
    // Multi-size mobile landscape acceptance checks. Actual pixels are uploaded as receipts.
    for(const [width,height] of [[640,360],[667,375],[915,412]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true,
        screenOrientation:{type:'landscapePrimary',angle:90}});
      await until(()=>js('document.getElementById("turn-device").hidden===true'),3000,'landscape viewport '+width);
      assert.equal(await js('window.__norkavelDebug.getOrientation().portrait'),false);
      const geometry=await js('({w:innerWidth,h:innerHeight,overflowX:document.documentElement.scrollWidth>innerWidth+1,overflowY:document.documentElement.scrollHeight>innerHeight+1,bar:document.getElementById("hotbar").getBoundingClientRect().toJSON()})');
      assert.equal(geometry.overflowX,false,'horizontal overflow '+width);
      assert.equal(geometry.overflowY,false,'vertical overflow '+width);
      assert.ok(geometry.bar.left>=0 && geometry.bar.right<=geometry.w+1,'action bar inside '+width);
      await screenshot('06-landscape-'+width);
    }

    await js('document.getElementById("skill-1").click()');
    await until(()=>js('window.__norkavelDebug.snapshot().state.events.some(e=>e.type==="interrupt")'),4500,'boss windup interrupt');
    // A controlled, valid near-defeat combat fixture is restored through real localStorage/Core.
    // This tests browser defeat/retry without creating a debug mutation API in the shipped game.
    const wounded=structuredClone(stageTwoFixture);
    for(const unit of wounded.state.units){
      if(unit.team==='ally'){unit.hp=1;unit.shield=0;unit.shieldTicks=0;}
      if(unit.id==='boss-0'){unit.windup=1;unit.nextAttack=1;}
    }
    async function launchWithSavedState(value,label) {
      const source='localStorage.setItem('+JSON.stringify('norkavel.g2.save.v1')+','+JSON.stringify(JSON.stringify(value))+');';
      const preload=await send('Page.addScriptToEvaluateOnNewDocument',{source});
      try{
        await send('Page.reload',{ignoreCache:true});
        await until(()=>js('Boolean(window.__norkavelDebug) && window.__norkavelDebug.snapshot().state.phase'),12000,label+' boot');
      }finally{await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:preload.identifier});}
    }
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false,
      screenOrientation:{type:'landscapePrimary',angle:90}});
    await launchWithSavedState(wounded,'wounded save');
    await until(()=>js('window.__norkavelDebug.snapshot().state.phase==="defeat"'),5000,'browser defeat');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.gold'),45,'defeat cannot award currency');
    await screenshot('07-defeat');
    await js('document.querySelector("[data-action=retry]").click()');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.phase'),'setup','retry from real defeat');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.stage'),2,'retry preserves stage');
    // Real level-one boss loss without artificial HP damage. Restore a valid
    // stage-two setup, select a documented seed and start through the UI.
    const naturalBossSetup=structuredClone(stageTwoSetup);
    naturalBossSetup.state.seed=10000;
    naturalBossSetup.state.rng=10000;
    await launchWithSavedState(naturalBossSetup,'natural boss setup');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.phase'),'setup');
    await js('document.querySelector("[data-action=start]").click()');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.seed'),479285039,
      'natural boss defeat seed is deterministic');
    await until(()=>js('window.__norkavelDebug.snapshot().state.phase==="defeat"'),28000,'organic boss defeat without skills');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.gold'),45,'organic boss defeat grants no currency');
    assert.deepEqual(await js('window.__norkavelDebug.snapshot().state.claimed'),[1],
      'organic boss defeat cannot claim stage two');
    await screenshot('08-natural-boss-defeat');
    await js('document.querySelector("[data-action=retry]").click()');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.phase'),'setup','natural defeat permits retry');
    await launchWithSavedState({state:{schema:0}},'legacy save');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.phase'),'setup','old save starts clean');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.gold'),0);
    await launchWithSavedState({state:{schema:1,phase:'fight',stage:2,gold:999999,party:['sentinel','ember','healer'],units:[{id:'hero',hp:1,maxHp:205}]}},'corrupt save');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.phase'),'setup','corrupt payload discarded');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.gold'),0,'corrupt payload cannot mint gold');
    assert.deepEqual(errors,[],'unexpected browser exceptions');
    assert.deepEqual(consoleErrors,[],'browser console errors');
    console.log('G2_BROWSER_SMOKE_PASS: gameplay, mouse and touch, skills, pause, portrait gates, landscape, saves, invalid/legacy recovery, no duplicate awards, boss, natural defeat/retry, seeded attempts');
  }finally{
    try{socket?.close();}catch{}
    if(chrome){
      const closed=(chrome.exitCode===null && chrome.signalCode===null)
        ? new Promise(resolve=>chrome.once('close',resolve)) : Promise.resolve();
      chrome.kill('SIGKILL');
      await Promise.race([closed,delay(2000)]);
    }
    await new Promise(resolve=>server.close(resolve));
    await rm(temp,{recursive:true,force:true,maxRetries:10,retryDelay:150});
  }
}
main().catch(error=>{console.error('G2_BROWSER_SMOKE_FAIL',error);process.exitCode=1;});
