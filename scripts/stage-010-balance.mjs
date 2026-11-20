import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { buildStage010Matrix } from '../src/stage-010-trials-v1.mjs';

const report={...buildStage010Matrix(),implementationSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  interpretation:'Engineering candidate only. No production win-rate threshold is approved.'};
await mkdir('artifacts/stage-010',{recursive:true});
await writeFile('artifacts/stage-010/balance-matrix.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
