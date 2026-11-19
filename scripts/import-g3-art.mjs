// Validated, explicit import of the four separate concept poses from the
// conversation ZIP. It does not approve the art, rights, or animation.
// Usage: node scripts/import-g3-art.mjs /path/to/unzipped/Norkavel-G3-Companions-0.3 [--dry-run]
import {readFile, mkdir, writeFile, rename, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname, join, resolve} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const manifestPath=join(root,'assets/art/manifest.json');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

export function verifyWebp(bytes,expectedSize=[512,512]) {
  if(!Buffer.isBuffer(bytes) || bytes.length<30 || bytes.length>256*1024)
    return false;
  if(bytes.toString('ascii',0,4)!=='RIFF' || bytes.toString('ascii',8,12)!=='WEBP' ||
     bytes.toString('ascii',12,16)!=='VP8X')return false;
  if(bytes.readUInt32LE(4)!==bytes.length-8)return false;
  // Extended WebP: canvas size is stored as width-1/height-1 (24 bits each).
  const width=1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16);
  const height=1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16);
  return (bytes[20]&0x10)!==0 && width===expectedSize[0] && height===expectedSize[1];
}

export async function planG3Import(extractedDirectory){
  const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  const staged=manifest.stagedG3;
  if(manifest.schema!==1 || !staged || !Array.isArray(staged.files) || staged.files.length!==4)
    throw new Error('Missing staged G3 contract');
  if(new Set(staged.files.map(x=>x.id)).size!==4 ||
     ['sentinel','ember','healer','ash'].some(id=>!staged.files.some(x=>x.id===id)))
    throw new Error('Incomplete G3 character set');
  const files=[];
  for(const row of staged.files){
    if(row.path!==`assets/art/g3/${row.id}-master-0.3.webp` ||
       row.status!=='STAGED_NOT_COMMITTED' ||
       row.format!=='image/webp' ||
       !/^[0-9a-f]{64}$/.test(row.sha256))throw new Error('Invalid staged asset entry: '+row.id);
    const source=resolve(extractedDirectory,'sprites',`${row.id}-master-0.3.webp`);
    const bytes=await readFile(source);
    if(!verifyWebp(bytes,row.size)||sha256(bytes)!==row.sha256)
      throw new Error('Art bytes do not match staged image contract: '+row.id);
    const prior=manifest.images.find(x=>x.id===`companion-${row.id}-master-0.3` || x.path===row.path);
    if(prior)throw new Error('Asset is already registered, refusing double import: '+row.id);
    files.push({entry:row,bytes});
  }
  return {manifest,files};
}

export async function importG3(extractedDirectory,{dryRun=false}={}){
  const {manifest,files}=await planG3Import(extractedDirectory);
  if(dryRun)return {status:'VALIDATED_NO_WRITE',count:files.length};
  const dest=join(root,'assets/art/g3');
  await mkdir(dest,{recursive:true});
  const written=[];
  try{
    for(const {entry,bytes} of files){
      const target=join(root,entry.path);
      // Re-check all source hashes prior to any manifest change.
      await writeFile(target+'.importing',bytes,{flag:'wx'});
      await rename(target+'.importing',target);
      written.push(target);
      manifest.images.push({
        id:`companion-${entry.id}-master-0.3`,path:entry.path,
        purpose:`Companion ${entry.id} one-pose concept in 2D arena`,
        scene:'web/main.mjs:drawFigure',size:entry.size,mode:'RGBA',
        sha256:entry.sha256,source:'ChatGPT ImageGen 2026-11-19 / G3 concept sheet',
        transparent:true,status:'CANDIDATE_INTEGRATED',
        animation:'MISSING',rights:'NOT_VERIFIED'
      });
    }
    manifest.stagedG3.status='CANDIDATE_IMAGES_INTEGRATED';
    manifest.stagedG3.files=manifest.stagedG3.files.map(row=>({...row,status:'CANDIDATE_INTEGRATED'}));
    await writeFile(manifestPath+'.importing',JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
    await rename(manifestPath+'.importing',manifestPath);
  }catch(error){
    await Promise.allSettled(written.map(target=>rm(target,{force:true})));
    await rm(manifestPath+'.importing',{force:true}).catch(()=>{});
    throw error;
  }
  return {status:'CANDIDATE_IMAGES_INTEGRATED_NOT_ART_APPROVED',count:written.length};
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.length<1 || args.filter(v=>!v.startsWith('--')).length!==1 ||
      args.some(v=>v.startsWith('--') && v!=='--dry-run')){
    console.error('Usage: node scripts/import-g3-art.mjs <extracted-art-pack-dir> [--dry-run]');
    process.exitCode=2;
  }else{
    const input=args.find(v=>!v.startsWith('--'));
    importG3(input,{dryRun:args.includes('--dry-run')})
      .then(result=>console.log('G3_IMPORT '+JSON.stringify(result)))
      .catch(error=>{console.error('G3_IMPORT_FAIL',error.message);process.exitCode=1;});
  }
}
