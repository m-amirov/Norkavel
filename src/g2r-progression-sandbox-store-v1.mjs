import {
  applyG2RProgressionSandboxCommand, createG2RProgressionSandbox,
  migrateG2RProgressionSandboxV1, validateG2RProgressionSandbox
} from './g2r-progression-sandbox-v1.mjs';

export const G2R_SANDBOX_DATABASE = 'norkavel.g2r.progression-sandbox.v1';
export const G2R_SANDBOX_RECORD_KEY = 'dev-progression';
const clone = value => structuredClone(value);

export class G2RSandboxStoreError extends Error {
  constructor(code, message, cause) { super(message, { cause }); this.name='G2RSandboxStoreError'; this.code=code; }
}

export function inspectG2RSandboxRecord(value) {
  return value && value.formatVersion === 2 && Number.isSafeInteger(value.revision) && value.revision >= 0 &&
    validateG2RProgressionSandbox(value.state)
    ? { formatVersion:2, revision:value.revision, state:clone(value.state) } : null;
}

function migrateRecord(value) {
  if (!value || value.formatVersion !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 0) return null;
  const state=migrateG2RProgressionSandboxV1(value.state);
  return state ? {formatVersion:2,revision:value.revision+1,state} : null;
}

function openDb(indexedDB, name) {
  return new Promise((resolve,reject)=>{let request;try{request=indexedDB.open(name,1)}catch(error){reject(new G2RSandboxStoreError('STORAGE_UNAVAILABLE','Sandbox storage unavailable',error));return}
    request.onupgradeneeded=()=>request.result.createObjectStore('sandbox');
    request.onerror=()=>reject(new G2RSandboxStoreError('STORAGE_UNAVAILABLE','Sandbox database open failed',request.error));
    request.onsuccess=()=>resolve(request.result);
  });
}

export async function openG2RProgressionSandboxStore({ indexedDB=globalThis.indexedDB,
  databaseName=G2R_SANDBOX_DATABASE }={}) {
  if (!indexedDB?.open) throw new G2RSandboxStoreError('STORAGE_UNAVAILABLE','IndexedDB is required');
  const db=await openDb(indexedDB,databaseName);let closed=false;db.onversionchange=()=>{db.close();closed=true};
  const transaction=(mode,body)=>new Promise((resolve,reject)=>{if(closed){reject(new G2RSandboxStoreError('STORAGE_CLOSED','Sandbox store closed'));return}let tx;
    try{tx=db.transaction('sandbox',mode)}catch(error){reject(new G2RSandboxStoreError('STORAGE_UNAVAILABLE','Sandbox transaction failed',error));return}
    let outcome;body(tx.objectStore('sandbox'),value=>{outcome=value});tx.onerror=()=>{};
    tx.onabort=()=>reject(new G2RSandboxStoreError('STORAGE_UNAVAILABLE','Sandbox transaction aborted',tx.error));
    tx.oncomplete=()=>outcome instanceof Error?reject(outcome):resolve(outcome);
  });
  return Object.freeze({
    load:()=>transaction('readwrite',(store,done)=>{const r=store.get(G2R_SANDBOX_RECORD_KEY);r.onsuccess=()=>{if(r.result===undefined){done(null);return}const current=inspectG2RSandboxRecord(r.result);if(current){done(current);return}const migrated=migrateRecord(r.result);if(migrated){const p=store.put(migrated,G2R_SANDBOX_RECORD_KEY);p.onsuccess=()=>done(clone(migrated));p.onerror=()=>done(new G2RSandboxStoreError('STORAGE_UNAVAILABLE','Sandbox migration failed',p.error));return}if(![1,2].includes(r.result?.formatVersion))done(new G2RSandboxStoreError('RESTORE_UNSUPPORTED','Sandbox format unsupported'));else done(new G2RSandboxStoreError('RESTORE_CORRUPT','Sandbox record corrupt'))};r.onerror=()=>done(new G2RSandboxStoreError('STORAGE_UNAVAILABLE','Sandbox read failed',r.error))}),
    initialize:(productionRecord)=>transaction('readwrite',(store,done)=>{const r=store.get(G2R_SANDBOX_RECORD_KEY);r.onsuccess=()=>{if(r.result!==undefined){const current=inspectG2RSandboxRecord(r.result);done(current?{ok:false,code:'ALREADY_EXISTS',actualRevision:current.revision}:new G2RSandboxStoreError('RESTORE_CORRUPT','Sandbox record cannot be replaced'));return}const state=createG2RProgressionSandbox(productionRecord);if(!state){done({ok:false,code:'INVALID_BINDING'});return}const record={formatVersion:2,revision:0,state};const p=store.put(record,G2R_SANDBOX_RECORD_KEY);p.onsuccess=()=>done({ok:true,revision:0,state:clone(state)});p.onerror=()=>done(new G2RSandboxStoreError('STORAGE_UNAVAILABLE','Sandbox initialize failed',p.error))};r.onerror=()=>done(new G2RSandboxStoreError('STORAGE_UNAVAILABLE','Sandbox compare failed',r.error))}),
    command:(expectedRevision,command)=>transaction('readwrite',(store,done)=>{const r=store.get(G2R_SANDBOX_RECORD_KEY);r.onsuccess=()=>{const current=inspectG2RSandboxRecord(r.result);if(!current){done(new G2RSandboxStoreError('RESTORE_CORRUPT','Sandbox record invalid'));return}if(current.revision!==expectedRevision){done({ok:false,code:'STALE_REVISION',actualRevision:current.revision});return}const state=applyG2RProgressionSandboxCommand(current.state,command,true);if(state===current.state){done({ok:false,code:'COMMAND_REJECTED',actualRevision:current.revision});return}const revision=current.revision+1,p=store.put({formatVersion:2,revision,state},G2R_SANDBOX_RECORD_KEY);p.onsuccess=()=>done({ok:true,revision,state:clone(state)});p.onerror=()=>done(new G2RSandboxStoreError('STORAGE_UNAVAILABLE','Sandbox commit failed',p.error))};r.onerror=()=>done(new G2RSandboxStoreError('STORAGE_UNAVAILABLE','Sandbox compare failed',r.error))}),
    close(){if(!closed)db.close();closed=true}
  });
}
