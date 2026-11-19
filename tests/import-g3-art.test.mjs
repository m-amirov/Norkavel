import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {verifyWebp,planG3Import,importG3} from '../scripts/import-g3-art.mjs';

function syntheticWebp(width=512,height=512,alpha=true){
  const bytes=Buffer.alloc(30);
  bytes.write('RIFF',0,'ascii');bytes.writeUInt32LE(bytes.length-8,4);
  bytes.write('WEBPVP8X',8,'ascii');
  bytes.writeUInt32LE(10,16);
  bytes[20]=alpha?0x10:0;
  for(const [offset,value] of [[24,width-1],[27,height-1]]){
    bytes[offset]=value&0xff;bytes[offset+1]=(value>>>8)&0xff;bytes[offset+2]=(value>>>16)&0xff;
  }
  return bytes;
}
test('G3 import recognizes strict transparent 512 WebP headers and rejects invalid data',()=>{
  assert.equal(verifyWebp(syntheticWebp()),true);
  assert.equal(verifyWebp(syntheticWebp(1024,512)),false);
  assert.equal(verifyWebp(syntheticWebp(512,512,false)),false);
  assert.equal(verifyWebp(Buffer.from('fake')),false);
  const corrupt=syntheticWebp();corrupt[0]=0;
  assert.equal(verifyWebp(corrupt),false);
});
test('G3 import is fail-closed: invalid source pack causes no repo writes',async(t)=>{
  const tmp=await mkdtemp(join(tmpdir(),'nkv-g3-negative-'));
  t.after(()=>rm(tmp,{recursive:true,force:true}));
  await mkdir(join(tmp,'sprites'));
  for(const id of ['sentinel','ember','healer','ash'])
    await writeFile(join(tmp,'sprites',id+'-master-0.3.webp'),syntheticWebp());
  await assert.rejects(planG3Import(tmp),/do not match staged image contract/);
  await assert.rejects(importG3(tmp),/do not match staged image contract/);
});
