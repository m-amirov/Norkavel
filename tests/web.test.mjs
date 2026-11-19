import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createStaticServer } from '../scripts/serve.mjs';

test('G2 preview serves real gameplay modules and hides private files', async (t) => {
  const server=createStaticServer();
  t.after(()=>server.close());
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  const root='http://127.0.0.1:'+server.address().port;
  for(const [route, expected] of [
    ['/','text/html'],['/style.css','text/css'],['/main.mjs','text/javascript'],
    ['/src/combat.mjs','text/javascript'],
    ['/assets/art/warrior-concept-01.png','image/png'],
    ['/assets/art/arena-ruins-01.png','image/png'],
    ['/vendor/ludory/packages/core/src/browser.mjs','text/javascript'],
    ['/vendor/ludory/packages/core/src/session.mjs','text/javascript'],
    ['/ludory.project.json','application/json']
  ]) {
    const res=await fetch(root+route);
    assert.equal(res.status,200,route);
    assert.ok(res.headers.get('content-type').includes(expected));
    assert.ok((await res.text()).length>10,route);
  }
  for(const blocked of ['/AGENTS.md','/.git/config','/vendor/workflow-for-agents/README.md',
    '/vendor/ludory/AGENTS.md','/scripts/serve.mjs','/src/../AGENTS.md']) {
    const res=await fetch(root+blocked);
    assert.equal(res.status,404,blocked);
  }
});
test('G2 orientation policy exists in markup, script, and CSS', async (t) => {
  const server=createStaticServer();
  t.after(()=>server.close());
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  const url='http://127.0.0.1:'+server.address().port;
  const html=await (await fetch(url+'/')).text();
  const js=await (await fetch(url+'/main.mjs')).text();
  const css=await (await fetch(url+'/style.css')).text();
  assert.match(html,/id="turn-device"/);
  assert.match(html,/Поверните устройство/);
  assert.match(js,/innerHeight > innerWidth/);
  assert.match(js,/session.pause\(\)/);
  assert.match(css,/turn-device/);
});
