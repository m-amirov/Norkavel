// Offline Chromium acceptance for the standalone IndexedDB Save v2 store.
import { spawn, execFileSync } from 'node:child_process';
import { createStaticServer } from './serve.mjs';
import { once } from 'node:events';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(callback, timeout = 10000, name = 'condition') {
  const began = Date.now();
  while (Date.now() - began < timeout) {
    try { const answer = await callback(); if (answer) return answer; } catch {}
    await delay(100);
  }
  throw new Error(`Timed out: ${name}`);
}
function chromeBinary() {
  const candidates = process.env.CHROME_BIN ? [process.env.CHROME_BIN] :
    ['google-chrome', 'chromium', 'chromium-browser'];
  for (const name of candidates) try {
    execFileSync(name, ['--version'], { stdio: 'ignore' });
    return name;
  } catch {}
  throw new Error('Chromium missing: Save v2 browser validation NOT_RUN');
}
async function connectPage(page) {
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let serial = 0;
  const requests = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (!message.id || !requests.has(message.id)) return;
    const pending = requests.get(message.id);
    requests.delete(message.id);
    message.error ? pending.reject(new Error(JSON.stringify(message.error))) : pending.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial;
    requests.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const js = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  };
  await send('Runtime.enable');
  return { socket, send, js };
}

async function main() {
  const temp = await mkdtemp(join(tmpdir(), 'norkavel-save-v2-'));
  const server = createStaticServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const gameUrl = `http://127.0.0.1:${server.address().port}/`;
  let chrome;
  const clients = [];
  try {
    const directory = join(temp, 'chrome');
    chrome = spawn(chromeBinary(), [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--remote-allow-origins=*', '--remote-debugging-port=0', `--user-data-dir=${directory}`, 'about:blank'
    ], { stdio: 'ignore' });
    chrome.on('error', () => {});
    const port = await until(async () => {
      try { return Number((await readFile(join(directory, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); }
      catch { return 0; }
    }, 15000, 'Chrome port');

    const newPage = async () => {
      const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(gameUrl)}`, { method: 'PUT' });
      if (!response.ok) throw new Error(`Cannot create browser context: ${response.status}`);
      const page = await response.json();
      const client = await connectPage(page);
      clients.push(client);
      await until(() => client.js('location.origin.startsWith("http://127.0.0.1:")'), 10000, 'page navigation');
      return client;
    };
    const [a, b] = await Promise.all([newPage(), newPage()]);
    const setup = `
      (async()=>{
        window.s01=await import('/src/save-v2-store.mjs');
        window.domain=await import('/src/profile-v2.mjs');
        window.makeProfile=()=>{
          const xp={policyVersion:1,policyId:'browser-xp-v1',
            xpThresholds:Array.from({length:15},(_,i)=>(i+1)*(i+2)*5/2),
            firstClearXp:Array.from({length:50},(_,i)=>12+i),replayXp:Array(50).fill(3)};
          const costs={policyVersion:1,policyId:'browser-cost-v1',maxLevel:4,costs:[7,11,19]};
          let p=domain.selectPermanentHero(domain.createProfileV2(),'hero_slot_2');
          p=domain.beginCampaignAttempt(p,{attemptId:'pve:1:first',stageId:1});
          p=domain.settleVerifiedCampaignResult(p,{resultVersion:1,attemptSequence:1,attemptId:'pve:1:first',outcome:'victory'},xp);
          p={...p,gold:100};
          p=domain.upgradeCompanion(p,{purchaseVersion:1,purchaseSequence:1,purchaseId:'companion:1:browser',companionId:'sentinel',expectedLevel:1},costs);
          return domain.beginCampaignAttempt(p,{attemptId:'pve:2:active-replay',stageId:1});
        };
        return true;
      })()`;
    assert.equal(await a.js(setup), true);
    assert.equal(await b.js(setup), true);

    await a.js(`new Promise(resolve=>{const r=indexedDB.deleteDatabase('norkavel.g2r.save.v2.smoke');r.onsuccess=()=>resolve(true);r.onerror=()=>resolve(false)})`);
    assert.equal(await a.js(`localStorage.setItem('norkavel.g2.save.v1',JSON.stringify(window.__norkavelDebug.snapshot()));
      (()=>{const before=localStorage.getItem('norkavel.g2.save.v1');const x=s01.readLegacyProfileCandidate(localStorage);
      return x.status==='prepared'&&x.profile.selectedHeroId===null&&x.profile.heroSelection.selectionRequired&&
        localStorage.getItem('norkavel.g2.save.v1')===before})()`), true, 'legacy preparation is read-only');

    assert.equal(await a.js(`s01.openSaveV2Store({databaseName:'norkavel.g2r.save.v2.smoke'}).then(x=>(window.store=x,true))`), true);
    assert.equal(await b.js(`s01.openSaveV2Store({databaseName:'norkavel.g2r.save.v2.smoke'}).then(x=>(window.store=x,true))`), true);
    assert.equal(await a.js('store.load().then(x=>x===null)'), true);

    const first = await Promise.all([
      a.js(`store.compareAndSet(null,makeProfile())`),
      b.js(`store.compareAndSet(null,makeProfile())`)
    ]);
    assert.equal(first.filter(result => result.ok).length, 1, 'exactly one first writer commits');
    assert.equal(first.filter(result => result.code === 'STALE_REVISION').length, 1, 'parallel loser is stale');
    const initial = await a.js('store.load()');
    assert.equal(initial.revision, 0);
    assert.equal(initial.profile.campaignAttempt.attemptId, 'pve:2:active-replay');
    assert.equal(initial.profile.companionUpgradePolicy.policyId, 'browser-cost-v1');
    assert.equal(initial.profile.heroProgress.xpPolicyId, 'browser-xp-v1');

    const competing = await Promise.all([
      a.js(`store.compareAndSet(0,{...makeProfile(),gold:101})`),
      b.js(`store.compareAndSet(0,{...makeProfile(),gold:102})`)
    ]);
    assert.equal(competing.filter(result => result.ok).length, 1, 'one concurrent update commits');
    assert.equal(competing.filter(result => result.code === 'STALE_REVISION').length, 1);
    const committed = await b.js('store.load()');
    assert.equal(committed.revision, 1);
    assert.ok([101, 102].includes(committed.profile.gold));
    assert.equal(await a.js(`store.compareAndSet(0,{...makeProfile(),gold:999}).then(x=>x.code)`), 'STALE_REVISION');
    assert.equal((await a.js('store.load()')).profile.gold, committed.profile.gold, 'stale retry cannot overwrite');

    assert.equal(await a.js(`new Promise((resolve,reject)=>{const o=indexedDB.open('norkavel.g2r.save.v2.smoke');o.onerror=()=>reject(o.error);o.onsuccess=()=>{
      const tx=o.result.transaction('saves','readwrite');tx.objectStore('saves').put({...${JSON.stringify(committed)},profile:{...${JSON.stringify(committed.profile)},gold:777}},'profile');
      tx.abort();tx.onabort=()=>{o.result.close();resolve(true)}}})`), true, 'aborted write observed');
    assert.equal((await b.js('store.load()')).profile.gold, committed.profile.gold, 'aborted transaction preserves last valid record');

    a.socket.close();
    const c = await newPage();
    assert.equal(await c.js(setup), true);
    assert.equal(await c.js(`s01.openSaveV2Store({databaseName:'norkavel.g2r.save.v2.smoke'}).then(x=>(window.store=x,true))`), true);
    assert.deepEqual(await c.js('store.load()'), committed, 'reload/new context restores the full detached profile');

    assert.equal(await c.js(`new Promise((resolve,reject)=>{const o=indexedDB.open('norkavel.g2r.save.v2.smoke');o.onerror=()=>reject(o.error);o.onsuccess=()=>{
      const tx=o.result.transaction('saves','readwrite');tx.objectStore('saves').put({formatVersion:2,revision:2,commitId:'future',profile:makeProfile()},'profile');
      tx.oncomplete=()=>{o.result.close();resolve(true)}}})`), true);
    assert.equal(await c.js(`store.load().then(()=>null,e=>e.code)`), 'RESTORE_UNSUPPORTED');
    assert.equal(await c.js(`store.compareAndSet(1,makeProfile()).then(()=>null,e=>e.code)`), 'RESTORE_UNSUPPORTED');
    assert.equal(await c.js(`new Promise((resolve,reject)=>{const o=indexedDB.open('norkavel.g2r.save.v2.smoke');o.onerror=()=>reject(o.error);o.onsuccess=()=>{const tx=o.result.transaction('saves');const g=tx.objectStore('saves').get('profile');g.onsuccess=()=>resolve(g.result.formatVersion)}})`), 2,
      'unsupported future record remains untouched');

    assert.equal(await c.js(`new Promise((resolve,reject)=>{const o=indexedDB.open('norkavel.g2r.save.v2.smoke');o.onerror=()=>reject(o.error);o.onsuccess=()=>{
      const tx=o.result.transaction('saves','readwrite');tx.objectStore('saves').put({formatVersion:1,revision:2,commitId:'corrupt',profile:{schema:999}},'profile');
      tx.oncomplete=()=>{o.result.close();resolve(true)}}})`), true);
    assert.equal(await c.js(`store.load().then(()=>null,e=>e.code)`), 'RESTORE_CORRUPT');
    assert.equal(await c.js(`store.compareAndSet(1,makeProfile()).then(()=>null,e=>e.code)`), 'RESTORE_CORRUPT');
    assert.equal(await c.js(`new Promise((resolve,reject)=>{const o=indexedDB.open('norkavel.g2r.save.v2.smoke');o.onerror=()=>reject(o.error);o.onsuccess=()=>{const tx=o.result.transaction('saves');const g=tx.objectStore('saves').get('profile');g.onsuccess=()=>resolve(g.result.profile.schema)}})`), 999,
      'corrupt record remains untouched for recovery');

    assert.equal(await c.js(`new Promise((resolve,reject)=>{const o=indexedDB.open('norkavel.g2r.save.v2.smoke',2);o.onupgradeneeded=()=>{};o.onerror=()=>reject(o.error);o.onsuccess=()=>{o.result.close();resolve(true)}})`), true,
      'database version upgrade is not blocked by stale store connections');
    assert.equal(await c.js(`store.load().then(()=>null,e=>e.code)`), 'STORAGE_CLOSED');

    console.log('G2R_S01_BROWSER_PASS: IndexedDB CAS, parallel contexts, stale rejection, abort recovery, reload, legacy read-only, corrupt/unsupported preservation, versionchange close');
  } finally {
    for (const client of clients) try { client.socket.close(); } catch {}
    if (chrome) {
      const closed = chrome.exitCode === null ? new Promise(resolve => chrome.once('close', resolve)) : Promise.resolve();
      chrome.kill('SIGKILL');
      await Promise.race([closed, delay(2000)]);
    }
    await new Promise(resolve => server.close(resolve));
    await rm(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
}

main().catch(error => {
  console.error('G2R_S01_BROWSER_FAIL', error);
  process.exitCode = 1;
});
