import test from 'node:test';
import assert from 'node:assert/strict';
import {G3_ACTORS,readyG3Actors} from '../web/art-registry.mjs';
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../assets/art/manifest.json',import.meta.url),'utf8'));
const validHash='a'.repeat(64);

test('G3 actors do not load uncommitted concept sources in game',()=>{
  assert.equal(G3_ACTORS.length,4);
  assert.deepEqual(G3_ACTORS.map(a=>a.id),['sentinel','ember','healer','ash']);
  const matches=readyG3Actors(manifest);
  if(manifest.stagedG3?.status==='EXTERNAL_CONVERSATION_ART_PACK_NOT_IN_REPOSITORY')
    assert.deepEqual(matches,[]);
  else assert.equal(matches.length,4,'once imported all four images must be valid');
});
test('G3 manifest allows only matching reviewed paths, sizes and unique records',()=>{
  const sentinel=G3_ACTORS[0];
  const entry={id:sentinel.source,path:sentinel.path,size:sentinel.size,mode:'RGBA',
    sha256:validHash,status:'CANDIDATE_INTEGRATED'};
  const fixture={schema:1,images:[entry]};
  assert.equal(readyG3Actors(fixture).length,1);
  assert.equal(readyG3Actors(fixture)[0].url,'/'+sentinel.path);
  for(const bad of [
    {...entry,path:'assets/art/../../AGENTS.md'},
    {...entry,size:[1024,1024]},
    {...entry,sha256:'not-a-hash'},
    {...entry,status:'PENDING_OWNER_REVIEW'},
    {...entry,mode:'RGB'},
    {...entry,id:'boss-swap'}
  ])assert.deepEqual(readyG3Actors({schema:1,images:[bad]}),[]);
  assert.deepEqual(readyG3Actors({schema:1,images:[entry,entry]}),[]);
  assert.deepEqual(readyG3Actors({schema:99,images:[entry]}),[]);
  assert.deepEqual(readyG3Actors({schema:1,images:[null]}),[]);
  assert.deepEqual(readyG3Actors({schema:1,images:'broken'}),[]);
});
