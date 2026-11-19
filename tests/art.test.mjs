import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const manifest=JSON.parse(readFileSync(join(root,'assets/art/manifest.json'),'utf8'));
const allowedFiles=new Set(['assets/art/warrior-concept-01.png','assets/art/arena-ruins-01.png']);

test('Art Production 0.1 source manifest has real original PNG files and SHA-256 receipts',()=>{
  assert.equal(manifest.schema,1);
  assert.equal(manifest.images.length,2);
  assert.equal(new Set(manifest.images.map(x=>x.id)).size,2);
  for(const image of manifest.images){
    assert.ok(allowedFiles.has(image.path),image.path);
    const bytes=readFileSync(join(root,image.path));
    assert.ok(bytes.length>100000,'full original image expected: '+image.path);
    assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG magic');
    const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
    assert.deepEqual([width,height],image.size,image.path);
    const hash=createHash('sha256').update(bytes).digest('hex');
    assert.equal(hash,image.sha256,image.path);
  }
});
test('Art remains explicitly unapproved until human/rights/runtime QA',()=>{
  assert.equal(manifest.status,'ART_CANDIDATES_PENDING_REVIEW');
  assert.equal(manifest.gates.artistic,'PENDING_OWNER_APPROVAL');
  assert.equal(manifest.gates.rights,'NOT_VERIFIED');
  assert.equal(manifest.gates.animation,'MISSING');
});
