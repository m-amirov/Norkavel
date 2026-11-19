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
    let serial=0;const requests=new Map(),errors=[];
    socket.addEventListener('message',e=>{
      const m=JSON.parse(e.data);
      if(m.id && requests.has(m.id)){const pair=requests.get(m.id);requests.delete(m.id);m.error?pair.reject(new Error(JSON.stringify(m.error))):pair.resolve(m.result);}
      if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);
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
    await send('Page.enable');await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false,screenOrientation:{type:'landscapePrimary',angle:90}});
    await send('Page.navigate',{url:gameUrl});
    await until(()=>js('Boolean(window.__norkavelDebug && document.querySelector("[data-action=start]"))'),12000,'game boot');
    await until(()=>js('window.__norkavelDebug.getArtStatus().hero.loaded && window.__norkavelDebug.getArtStatus().background.loaded'),12000,'both real art images decoded');
    assert.deepEqual(await js('window.__norkavelDebug.getArtStatus()'),
      {hero:{loaded:true,width:1536,height:1024},background:{loaded:true,width:1672,height:941}});
    assert.equal(await js('window.__norkavelDebug.getStatus()'),'running');
    await screenshot('01-setup');
    assert.equal(await js('document.querySelector("[data-action=choose][data-id=ash]").click();window.__norkavelDebug.snapshot().state.party.includes("ash")'),true);
    assert.equal(await js('document.querySelector("[data-action=choose][data-id=healer]").click();window.__norkavelDebug.snapshot().state.party.includes("healer")'),true);
    await js('document.querySelector("[data-action=start]").click()');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.phase'),'fight');
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
    // Large portrait tablets must also be blocked; width=1024 must not bypass the rule.
    await send('Emulation.setDeviceMetricsOverride',{width:1024,height:1366,deviceScaleFactor:1,mobile:true,screenOrientation:{type:'portraitPrimary',angle:0}});
    await until(()=>js('document.getElementById("turn-device").hidden===false && window.__norkavelDebug.getStatus()==="paused"'),5000,'tablet portrait gate');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.tick'),tick);
    await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true,screenOrientation:{type:'landscapePrimary',angle:90}});
    await until(()=>js('document.getElementById("turn-device").hidden===true && window.__norkavelDebug.getStatus()==="running"'),6000,'landscape resume');
    await screenshot('04-landscape');
    await until(()=>js('window.__norkavelDebug.snapshot().state.phase==="victory"'),45000,'stage one victory');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.gold'),45);
    // Reload from an actual Core snapshot; the already-claimed reward must not be granted twice.
    await send('Page.reload',{ignoreCache:true});
    await until(()=>js('Boolean(window.__norkavelDebug) && window.__norkavelDebug.snapshot().state.phase==="victory"'),12000,'saved victory after reload');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.gold'),45);
    await js('document.querySelector("[data-action=retry]").click()');
    await until(()=>js('Boolean(document.querySelector("[data-action=start]"))'),3000,'retry setup');
    await js('document.querySelector("[data-action=start]").click()');
    await until(()=>js('window.__norkavelDebug.snapshot().state.phase==="victory"'),45000,'retry victory');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.gold'),45,'reward idempotency after reload/retry');
    await js('document.querySelector("[data-action=next]").click()');
    assert.equal(await js('window.__norkavelDebug.snapshot().state.stage'),2);
    await js('document.querySelector("[data-action=start]").click()');
    await until(()=>js('window.__norkavelDebug.snapshot().state.events.some(e=>e.type==="warning")'),19000,'boss warning');
    await screenshot('05-boss');
    await js('document.getElementById("skill-1").click()');
    await until(()=>js('window.__norkavelDebug.snapshot().state.events.some(e=>e.type==="interrupt")'),4500,'boss windup interrupt');
    assert.deepEqual(errors,[],'unexpected browser exceptions');
    console.log('G2_BROWSER_SMOKE_PASS: gameplay, click, skills, manual pause, rotate/recover, save/reload, reward idempotency, retry, boss telegraph/interrupt');
  }finally{
    try{socket?.close();}catch{}
    chrome?.kill('SIGKILL');
    await new Promise(resolve=>server.close(resolve));
    await rm(temp,{recursive:true,force:true});
  }
}
main().catch(error=>{console.error('G2_BROWSER_SMOKE_FAIL',error);process.exitCode=1;});
