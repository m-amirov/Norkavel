// Real Chromium acceptance for the isolated G2R-F02b onboarding shell.
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createStaticServer } from './serve.mjs';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(callback, timeout = 10000, name = 'condition') {
  const began = Date.now();
  while (Date.now() - began < timeout) {
    try { const value = await callback(); if (value) return value; } catch {}
    await delay(100);
  }
  throw new Error(`Timed out: ${name}`);
}
function chromeBinary() {
  const windows = [
    `${process.env.ProgramFiles ?? ''}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['ProgramFiles(x86)'] ?? ''}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA ?? ''}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.ProgramFiles ?? ''}\\Microsoft\\Edge\\Application\\msedge.exe`
  ];
  const candidates = process.env.CHROME_BIN ? [process.env.CHROME_BIN] :
    [...(process.platform === 'win32' ? windows : []), 'google-chrome', 'chromium', 'chromium-browser'];
  for (const candidate of candidates) try {
    execFileSync(candidate, ['--version'], { stdio: 'ignore' }); return candidate;
  } catch {}
  throw new Error('Chromium missing: onboarding browser validation NOT_RUN');
}

async function connectPage(page, errors) {
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let serial = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text);
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id); pending.delete(message.id);
    message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial; pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const js = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
    return response.result.value;
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
  return { socket, send, js };
}

async function main() {
  const temp = await mkdtemp(join(tmpdir(), 'norkavel-f02b-'));
  const out = join(process.cwd(), 'artifacts/g2r-f02b-browser');
  await mkdir(out, { recursive: true });
  const servers = [];
  const origins = [];
  for (let index = 0; index < 5; index++) {
    const server = createStaticServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
    servers.push(server); origins.push(`http://127.0.0.1:${server.address().port}`);
  }
  let chrome;
  const clients = [];
  const errors = [];
  const receipts = [];
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

    const newPage = async (url, width = 844, height = 390) => {
      const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
      assert.equal(response.ok, true);
      const client = await connectPage(await response.json(), errors);
      clients.push(client);
      await client.send('Emulation.setDeviceMetricsOverride', {
        width, height, deviceScaleFactor: 1, mobile: true,
        screenOrientation: { type: width > height ? 'landscapePrimary' : 'portraitPrimary', angle: width > height ? 90 : 0 }
      });
      await until(() => client.js(`location.href.startsWith(${JSON.stringify(url)})`), 10000, 'navigation');
      return client;
    };
    const mouse = async (client, selector) => {
      const rect = await client.js(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`);
      const x = Math.round(rect.left + rect.width / 2), y = Math.round(rect.top + rect.height / 2);
      await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    };
    const touch = async (client, selector) => {
      const rect = await client.js(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`);
      const point = { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    const key = async (client, keyName, code, virtualCode) => {
      await client.send('Input.dispatchKeyEvent', {
        type: keyName === ' ' ? 'keyDown' : 'rawKeyDown', key: keyName, code,
        text: keyName === ' ' ? ' ' : undefined, windowsVirtualKeyCode: virtualCode
      });
      if (keyName === 'Enter')
        await client.send('Input.dispatchKeyEvent', { type: 'char', key: keyName, code, text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: virtualCode });
      await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code, windowsVirtualKeyCode: virtualCode });
    };
    const screenshot = async (client, name, width, height, state) => {
      const capture = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const bytes = Buffer.from(capture.data, 'base64');
      await writeFile(join(out, `${name}.png`), bytes);
      receipts.push({ name, width, height, state, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    };
    const assertGeometry = async (client, width, height) => {
      const geometry = await client.js(`({
        width:innerWidth,height:innerHeight,
        overflowX:document.documentElement.scrollWidth>innerWidth+1,
        overflowY:document.documentElement.scrollHeight>innerHeight+1,
        cards:[...document.querySelectorAll('.hero-card')].map(x=>x.getBoundingClientRect().toJSON()),
        action:document.getElementById('continue-button').getBoundingClientRect().toJSON()
      })`);
      assert.equal(geometry.width, width); assert.equal(geometry.height, height);
      assert.equal(geometry.overflowX, false); assert.equal(geometry.overflowY, false);
      for (const rect of [...geometry.cards, geometry.action]) {
        assert.ok(rect.left >= -1 && rect.top >= -1 && rect.right <= width + 1 && rect.bottom <= height + 1);
      }
    };

    // New profile: portrait is inert; landscape supports touch, mouse cancel, and keyboard confirmation.
    const first = await newPage(`${origins[0]}/onboarding.html`, 390, 844);
    await until(() => first.js('Boolean(window.__norkavelOnboardingDebug)'), 10000, 'onboarding boot');
    await until(() => first.js('window.__norkavelOnboardingDebug.getStatus()==="ready"'), 10000, 'new profile ready');
    assert.equal(await first.js('window.__norkavelOnboardingDebug.getOrientation().portrait'), true);
    const beforePortrait = await first.js('window.__norkavelOnboardingDebug.getState()');
    await touch(first, '[data-hero-id="hero_slot_2"]');
    assert.deepEqual(await first.js('window.__norkavelOnboardingDebug.getState()'), beforePortrait, 'portrait touch is inert');
    await screenshot(first, '01-portrait-390x844', 390, 844, 'portrait-block');
    await first.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: 'landscapePrimary', angle: 90 } });
    await until(() => first.js('window.__norkavelOnboardingDebug.getOrientation().portrait===false'), 5000, 'landscape resume');
    await assertGeometry(first, 844, 390);
    await first.send('Emulation.setDeviceMetricsOverride', { width: 640, height: 360, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: 'landscapePrimary', angle: 90 } });
    await until(() => first.js('innerWidth===640 && window.__norkavelOnboardingDebug.getOrientation().portrait===false'), 3000, 'small landscape');
    await assertGeometry(first, 640, 360);
    await screenshot(first, '02-selection-640x360', 640, 360, 'new-profile-selection');
    await first.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: 'landscapePrimary', angle: 90 } });
    await until(() => first.js('innerWidth===844'), 3000, 'wide landscape restored');
    await touch(first, '[data-hero-id="hero_slot_2"]');
    await until(() => first.js('window.__norkavelOnboardingDebug.getState().previewHeroId==="hero_slot_2"'), 3000, 'touch selection');
    await mouse(first, '#continue-button');
    await until(() => first.js('window.__norkavelOnboardingDebug.getDialogOpen()'), 3000, 'confirmation dialog');
    assert.equal(await first.js('window.__norkavelOnboardingDebug.getState().profile.selectedHeroId'), null, 'dialog does not persist');
    await first.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: 'portraitPrimary', angle: 0 } });
    await until(() => first.js('window.__norkavelOnboardingDebug.getOrientation().portrait'), 3000, 'portrait during confirmation');
    assert.equal(await first.js('window.__norkavelOnboardingDebug.getDialogOpen()'), false, 'portrait closes confirmation');
    assert.equal(await first.js('window.__norkavelOnboardingDebug.getState().status'), 'selecting');
    await first.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: 'landscapePrimary', angle: 90 } });
    await until(() => first.js('window.__norkavelOnboardingDebug.getOrientation().portrait===false'), 3000, 'landscape after modal rotation');
    await mouse(first, '#continue-button');
    await until(() => first.js('window.__norkavelOnboardingDebug.getDialogOpen()'), 3000, 'confirmation after rotation');
    await mouse(first, '#cancel-button');
    await until(() => first.js('window.__norkavelOnboardingDebug.getState().status==="selecting"'), 3000, 'cancel');
    await first.send('Page.reload', { ignoreCache: true });
    await until(() => first.js('window.__norkavelOnboardingDebug?.getStatus()==="ready"'), 10000, 'unsaved preview reload');
    await first.send('Page.bringToFront');
    await key(first, 'Tab', 'Tab', 9);
    assert.equal(await first.js('document.activeElement.dataset.heroId'), 'hero_slot_1');
    await key(first, 'Enter', 'Enter', 13);
    await until(() => first.js('window.__norkavelOnboardingDebug.getState().previewHeroId==="hero_slot_1"'), 3000, 'keyboard hero selection');
    await mouse(first, '#continue-button');
    await until(() => first.js('window.__norkavelOnboardingDebug.getDialogOpen()'), 3000, 'dialog reopened');
    await mouse(first, '#confirm-button');
    await until(() => first.js('window.__norkavelOnboardingDebug.getState().status==="complete"'), 6000, 'permanent commit');
    assert.equal(await first.js('window.__norkavelOnboardingDebug.getState().profile.selectedHeroId'), 'hero_slot_1');
    await screenshot(first, '03-locked-844x390', 844, 390, 'hero_slot_1-locked');
    await first.send('Page.reload', { ignoreCache: true });
    await until(() => first.js('window.__norkavelOnboardingDebug?.getState()?.status==="complete"'), 10000, 'reload locked profile');
    assert.equal(await first.js('window.__norkavelOnboardingDebug.getState().profile.selectedHeroId'), 'hero_slot_1');

    // Two tabs choose different heroes from the same revision: exactly one CAS commit wins.
    const [raceA, raceB] = await Promise.all([
      newPage(`${origins[1]}/onboarding.html`), newPage(`${origins[1]}/onboarding.html`)
    ]);
    await until(() => raceA.js('window.__norkavelOnboardingDebug?.getStatus()==="ready"'), 10000, 'race A ready');
    await until(() => raceB.js('window.__norkavelOnboardingDebug?.getStatus()==="ready"'), 10000, 'race B ready');
    await mouse(raceA, '[data-hero-id="hero_slot_1"]'); await mouse(raceA, '#continue-button');
    await mouse(raceB, '[data-hero-id="hero_slot_4"]'); await mouse(raceB, '#continue-button');
    await until(() => raceA.js('window.__norkavelOnboardingDebug.getDialogOpen()'), 3000, 'race A dialog');
    await until(() => raceB.js('window.__norkavelOnboardingDebug.getDialogOpen()'), 3000, 'race B dialog');
    await Promise.all([mouse(raceA, '#confirm-button'), mouse(raceB, '#confirm-button')]);
    await until(() => raceA.js('window.__norkavelOnboardingDebug?.getState()?.status==="complete" || !document.getElementById("error-screen").hidden'), 6000, 'race A resolved');
    await until(() => raceB.js('window.__norkavelOnboardingDebug?.getState()?.status==="complete" || !document.getElementById("error-screen").hidden'), 6000, 'race B resolved');
    assert.equal(await raceA.js('window.__norkavelOnboardingDebug.getState().status'), 'complete');
    assert.equal(await raceB.js('window.__norkavelOnboardingDebug.getState().status'), 'complete');
    const raceIds = await Promise.all([
      raceA.js('window.__norkavelOnboardingDebug.getState().profile.selectedHeroId'),
      raceB.js('window.__norkavelOnboardingDebug.getState().profile.selectedHeroId')
    ]);
    assert.equal(new Set(raceIds).size, 1, 'both tabs converge to the immutable winner');

    // Valid legacy data remains byte-identical while its prepared profile is committed to Save v2.
    // Seed from a same-origin inert resource so the legacy G2 boot cannot race
    // and overwrite the fixture before onboarding reads it (observable on Linux CI).
    const legacy = await newPage(`${origins[2]}/onboarding.css`, 844, 390);
    await delay(150);
    assert.ok(errors.every(message => message.includes('404')), 'inert fixture produced an unexpected browser error');
    errors.length = 0;
    const legacyRaw = await legacy.js(`import('/src/combat.mjs').then(m=>{const raw=JSON.stringify({schemaVersion:1,gameId:'norkavel',gameVersion:'0.1.0',revision:7,state:{...m.initialState(),gold:155,level:8,party:['sentinel','ember','ash'],claimed:[1,2]}});localStorage.setItem('norkavel.g2.save.v1',raw);return raw})`);
    await legacy.send('Page.navigate', { url: `${origins[2]}/onboarding.html` });
    await until(() => legacy.js('window.__norkavelOnboardingDebug?.getStatus()==="ready"'), 10000, 'legacy candidate ready');
    assert.equal(await legacy.js('window.__norkavelOnboardingDebug.getState().source'), 'legacy');
    await mouse(legacy, '[data-hero-id="hero_slot_3"]'); await mouse(legacy, '#continue-button'); await mouse(legacy, '#confirm-button');
    await until(() => legacy.js('window.__norkavelOnboardingDebug.getState().status==="complete"'), 6000, 'legacy selected');
    assert.equal(await legacy.js('localStorage.getItem("norkavel.g2.save.v1")'), legacyRaw);
    const legacyProfile = await legacy.js('window.__norkavelOnboardingDebug.getState().profile');
    assert.equal(legacyProfile.selectedHeroId, 'hero_slot_3'); assert.equal(legacyProfile.gold, 155);
    assert.deepEqual(legacyProfile.party, ['sentinel', 'ember', 'ash']);

    // Corrupt Save v2 is not overwritten and blocks every card.
    const corrupt = await newPage(`${origins[3]}/`, 844, 390);
    await corrupt.js(`new Promise((resolve,reject)=>{const o=indexedDB.open('norkavel.g2r.save.v2',1);o.onupgradeneeded=()=>o.result.createObjectStore('saves');o.onerror=()=>reject(o.error);o.onsuccess=()=>{const tx=o.result.transaction('saves','readwrite');tx.objectStore('saves').put({formatVersion:1,revision:0,commitId:'corrupt',profile:{schema:999}},'profile');tx.oncomplete=()=>{o.result.close();resolve(true)}}})`);
    await corrupt.send('Page.navigate', { url: `${origins[3]}/onboarding.html` });
    await until(() => corrupt.js('window.__norkavelOnboardingDebug?.getStatus()==="RESTORE_CORRUPT"'), 10000, 'corrupt blocked');
    assert.equal(await corrupt.js('document.getElementById("error-screen").hidden'), false);
    await screenshot(corrupt, '04-corrupt-844x390', 844, 390, 'restore-corrupt');
    assert.equal(await corrupt.js(`new Promise((resolve,reject)=>{const o=indexedDB.open('norkavel.g2r.save.v2');o.onerror=()=>reject(o.error);o.onsuccess=()=>{const tx=o.result.transaction('saves');const g=tx.objectStore('saves').get('profile');g.onsuccess=()=>resolve(g.result.profile.schema)}})`), 999);

    // Large portrait remains fully blocked and is captured independently.
    await corrupt.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 1366, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: 'portraitPrimary', angle: 0 } });
    await until(() => corrupt.js('window.__norkavelOnboardingDebug.getOrientation().portrait'), 3000, 'tablet portrait');
    await screenshot(corrupt, '05-portrait-1024x1366', 1024, 1366, 'portrait-block-corrupt');

    // A future Save v2 version is also surfaced and preserved instead of treated as a new profile.
    const future = await newPage(`${origins[4]}/`, 844, 390);
    await future.js(`new Promise((resolve,reject)=>{const o=indexedDB.open('norkavel.g2r.save.v2',1);o.onupgradeneeded=()=>o.result.createObjectStore('saves');o.onerror=()=>reject(o.error);o.onsuccess=()=>{const tx=o.result.transaction('saves','readwrite');tx.objectStore('saves').put({formatVersion:2,revision:9,commitId:'future',profile:{}},'profile');tx.oncomplete=()=>{o.result.close();resolve(true)}}})`);
    await future.send('Page.navigate', { url: `${origins[4]}/onboarding.html` });
    await until(() => future.js('window.__norkavelOnboardingDebug?.getStatus()==="RESTORE_UNSUPPORTED"'), 10000, 'future version blocked');
    assert.equal(await future.js(`new Promise((resolve,reject)=>{const o=indexedDB.open('norkavel.g2r.save.v2');o.onerror=()=>reject(o.error);o.onsuccess=()=>{const tx=o.result.transaction('saves');const g=tx.objectStore('saves').get('profile');g.onsuccess=()=>resolve(g.result.formatVersion)}})`), 2);

    const manifest = {
      schema: 1,
      implementationSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      generatedAt: new Date().toISOString(),
      browser: execFileSync(chromeBinary(), ['--version'], { encoding: 'utf8' }).trim(),
      receipts
    };
    await writeFile(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    assert.deepEqual(errors, [], 'browser console/runtime errors');
    console.log('G2R_F02B_BROWSER_PASS: new/legacy onboarding, explicit confirm, mouse/touch/keyboard, reload, two-tab CAS, corrupt preservation, landscape/portrait, screenshot SHA receipts');
  } finally {
    for (const client of clients) try { client.socket.close(); } catch {}
    if (chrome) {
      const closed = chrome.exitCode === null ? new Promise(resolve => chrome.once('close', resolve)) : Promise.resolve();
      chrome.kill('SIGKILL'); await Promise.race([closed, delay(2000)]);
    }
    for (const server of servers) await new Promise(resolve => server.close(resolve));
    await rm(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
}

main().catch(error => { console.error('G2R_F02B_BROWSER_FAIL', error); process.exitCode = 1; });
