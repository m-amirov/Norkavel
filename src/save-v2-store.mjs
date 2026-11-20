import { prepareLegacyProfileV2, validateProfileV2 } from './profile-v2.mjs';
import { validateG2RCombatState } from './g2r-combat-v1.mjs';
import { validateG2RCampaignSession, validateG2RCampaignSessionTransition } from './g2r-campaign-integration-v1.mjs';

export const SAVE_V2_FORMAT_VERSION = 1;
export const SAVE_V2_DATABASE = 'norkavel.g2r.save.v2';
export const SAVE_V2_RECORD_KEY = 'profile';
export const LEGACY_SAVE_KEY = 'norkavel.g2.save.v1';
export const SAVE_V2_COMBAT_KEY = 'combat';
export const SAVE_V2_INTEGRATION_KEY = 'g2r-int-01';

const RECORD_FIELDS = Object.freeze(['formatVersion', 'revision', 'commitId', 'profile']);

export class SaveV2StoreError extends Error {
  constructor(code, message, cause) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'SaveV2StoreError';
    this.code = code;
  }
}

const clone = value => structuredClone(value);

function exactRecord(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  const keys = Reflect.ownKeys(value);
  return keys.length === fields.length && keys.every(key => typeof key === 'string' && fields.includes(key)) &&
    fields.every(field => Object.prototype.propertyIsEnumerable.call(value, field));
}

export function inspectSaveV2Record(record) {
  if (!exactRecord(record, RECORD_FIELDS) || record.formatVersion !== SAVE_V2_FORMAT_VERSION ||
      !Number.isSafeInteger(record.revision) || record.revision < 0 ||
      typeof record.commitId !== 'string' || record.commitId.length < 1 || record.commitId.length > 128 ||
      !validateProfileV2(record.profile)) return null;
  return clone(record);
}

export function validateSaveV2Transition(currentProfile, nextProfile) {
  if (!validateProfileV2(nextProfile)) return false;
  if (currentProfile === null) return true;
  if (!validateProfileV2(currentProfile)) return false;
  return currentProfile.selectedHeroId === null ||
    nextProfile.selectedHeroId === currentProfile.selectedHeroId;
}

export function inspectSaveV2CombatRecord(record) {
  if (!exactRecord(record, ['formatVersion','revision','profileRevision','combat']) ||
      record.formatVersion !== SAVE_V2_FORMAT_VERSION || !Number.isSafeInteger(record.revision) || record.revision < 0 ||
      !Number.isSafeInteger(record.profileRevision) || record.profileRevision < 0 ||
      !validateG2RCombatState(record.combat) || record.combat.profileRevision !== record.profileRevision) return null;
  return clone(record);
}

export function inspectSaveV2IntegrationRecord(record) {
  if (!exactRecord(record, ['formatVersion','revision','profileRevision','session']) ||
      record.formatVersion !== SAVE_V2_FORMAT_VERSION || !Number.isSafeInteger(record.revision) || record.revision < 0 ||
      !Number.isSafeInteger(record.profileRevision) || record.profileRevision < 0 ||
      !validateG2RCampaignSession(record.session) || record.session.profileRevision !== record.profileRevision) return null;
  return clone(record);
}

function ownInteger(value, key) {
  if (!value || typeof value !== 'object') return null;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && Object.hasOwn(descriptor, 'value') && Number.isSafeInteger(descriptor.value)
    ? descriptor.value : null;
}

export function readLegacyProfileCandidate(storage = globalThis.localStorage) {
  let raw;
  try {
    if (!storage || typeof storage.getItem !== 'function') throw new TypeError('legacy storage unavailable');
    raw = storage.getItem(LEGACY_SAVE_KEY);
  } catch (error) {
    return { status: 'unavailable', profile: null, error: String(error?.message ?? error) };
  }
  if (raw === null) return { status: 'missing', profile: null, error: null };
  if (typeof raw !== 'string' || raw.length > 32000) return { status: 'corrupt', profile: null, error: null };
  let snapshot;
  try { snapshot = JSON.parse(raw); }
  catch { return { status: 'corrupt', profile: null, error: null }; }
  const schemaVersion = ownInteger(snapshot, 'schemaVersion');
  if (schemaVersion !== null && schemaVersion !== 1) {
    return { status: 'incompatible', profile: null, error: null };
  }
  const profile = prepareLegacyProfileV2(snapshot);
  return profile === null
    ? { status: 'corrupt', profile: null, error: null }
    : { status: 'prepared', profile, error: null };
}

function openDatabase(indexedDB, databaseName) {
  if (!indexedDB || typeof indexedDB.open !== 'function') {
    return Promise.reject(new SaveV2StoreError('STORAGE_UNAVAILABLE', 'IndexedDB capability is unavailable'));
  }
  return new Promise((resolve, reject) => {
    let request;
    try { request = indexedDB.open(databaseName, 1); }
    catch (error) {
      reject(new SaveV2StoreError('STORAGE_UNAVAILABLE', 'IndexedDB open failed', error));
      return;
    }
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('saves')) database.createObjectStore('saves');
    };
    request.onblocked = () => reject(new SaveV2StoreError('STORAGE_BLOCKED', 'IndexedDB upgrade is blocked'));
    request.onerror = () => reject(new SaveV2StoreError(
      'STORAGE_UNAVAILABLE', 'IndexedDB open failed', request.error));
    request.onsuccess = () => resolve(request.result);
  });
}

function transactionError(transaction, code, message) {
  return new SaveV2StoreError(code, message, transaction.error);
}

function randomCommitId() {
  if (!globalThis.crypto || typeof globalThis.crypto.randomUUID !== 'function') {
    throw new SaveV2StoreError('STORAGE_UNAVAILABLE', 'Secure commit identity is unavailable');
  }
  return globalThis.crypto.randomUUID();
}

export async function openSaveV2Store({
  indexedDB = globalThis.indexedDB,
  databaseName = SAVE_V2_DATABASE,
  recordKey = SAVE_V2_RECORD_KEY
} = {}) {
  if (typeof databaseName !== 'string' || !databaseName.trim() ||
      typeof recordKey !== 'string' || !recordKey.trim()) {
    throw new TypeError('databaseName and recordKey must be non-empty strings');
  }
  const database = await openDatabase(indexedDB, databaseName);
  let closed = false;
  database.onversionchange = () => {
    database.close();
    closed = true;
  };
  const requireOpen = () => {
    if (closed) throw new SaveV2StoreError('STORAGE_CLOSED', 'Save v2 store is closed');
  };

  return Object.freeze({
    async load() {
      requireOpen();
      return new Promise((resolve, reject) => {
        let transaction;
        try { transaction = database.transaction('saves', 'readonly'); }
        catch (error) {
          reject(new SaveV2StoreError('STORAGE_UNAVAILABLE', 'Save v2 read transaction failed', error));
          return;
        }
        const request = transaction.objectStore('saves').get(recordKey);
        let outcome;
        request.onsuccess = () => {
          if (request.result === undefined) outcome = null;
          else if (ownInteger(request.result, 'formatVersion') !== SAVE_V2_FORMAT_VERSION) {
            outcome = new SaveV2StoreError('RESTORE_UNSUPPORTED', 'Save v2 format is unsupported');
          } else {
            outcome = inspectSaveV2Record(request.result) ??
              new SaveV2StoreError('RESTORE_CORRUPT', 'Save v2 record is corrupt');
          }
        };
        request.onerror = () => { outcome = new SaveV2StoreError('STORAGE_UNAVAILABLE', 'Save v2 read failed', request.error); };
        transaction.onabort = () => reject(transactionError(transaction, 'STORAGE_UNAVAILABLE', 'Save v2 read aborted'));
        transaction.onerror = () => {};
        transaction.oncomplete = () => outcome instanceof Error ? reject(outcome) : resolve(outcome);
      });
    },

    async compareAndSet(expectedRevision, profile) {
      requireOpen();
      if (expectedRevision !== null &&
          (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 ||
           expectedRevision >= Number.MAX_SAFE_INTEGER)) throw new TypeError('expectedRevision is invalid');
      if (!validateProfileV2(profile)) throw new TypeError('profile v2 is invalid');
      const detachedProfile = clone(profile);
      const commitId = randomCommitId();
      return new Promise((resolve, reject) => {
        let transaction;
        try { transaction = database.transaction('saves', 'readwrite'); }
        catch (error) {
          reject(new SaveV2StoreError('STORAGE_UNAVAILABLE', 'Save v2 write transaction failed', error));
          return;
        }
        const store = transaction.objectStore('saves');
        const request = store.get(recordKey);
        let outcome;
        request.onsuccess = () => {
          const current = request.result;
          if (current !== undefined) {
            const valid = inspectSaveV2Record(current);
            if (valid === null) {
              outcome = new SaveV2StoreError(
                ownInteger(current, 'formatVersion') === SAVE_V2_FORMAT_VERSION
                  ? 'RESTORE_CORRUPT' : 'RESTORE_UNSUPPORTED',
                'Existing Save v2 record cannot be overwritten');
              return;
            }
            if (expectedRevision !== valid.revision) {
              outcome = { ok: false, code: 'STALE_REVISION', actualRevision: valid.revision };
              return;
            }
            if (!validateSaveV2Transition(valid.profile, detachedProfile)) {
              outcome = new SaveV2StoreError('IMMUTABLE_HERO', 'Permanent hero selection cannot change');
              return;
            }
          } else if (expectedRevision !== null) {
            outcome = { ok: false, code: 'STALE_REVISION', actualRevision: null };
            return;
          }
          if (current === undefined && !validateSaveV2Transition(null, detachedProfile)) {
            outcome = new SaveV2StoreError('INVALID_TRANSITION', 'Save v2 transition is invalid');
            return;
          }
          const revision = expectedRevision === null ? 0 : expectedRevision + 1;
          const record = {
            formatVersion: SAVE_V2_FORMAT_VERSION,
            revision,
            commitId,
            profile: detachedProfile
          };
          const put = store.put(record, recordKey);
          put.onsuccess = () => {
            outcome = { ok: true, revision, receipt: { commitId, revision } };
          };
          put.onerror = () => {
            outcome = new SaveV2StoreError('STORAGE_UNAVAILABLE', 'Save v2 write failed', put.error);
          };
        };
        request.onerror = () => {
          outcome = new SaveV2StoreError('STORAGE_UNAVAILABLE', 'Save v2 compare failed', request.error);
        };
        transaction.onabort = () => reject(transactionError(transaction, 'STORAGE_UNAVAILABLE', 'Save v2 write aborted'));
        transaction.onerror = () => {};
        transaction.oncomplete = () => outcome instanceof Error ? reject(outcome) : resolve(outcome);
      });
    },

    async loadCombat() {
      requireOpen();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction('saves', 'readonly');
        const request = transaction.objectStore('saves').get(SAVE_V2_COMBAT_KEY);
        let outcome;
        request.onsuccess = () => outcome = request.result === undefined ? null :
          inspectSaveV2CombatRecord(request.result) ?? new SaveV2StoreError('RESTORE_CORRUPT','Combat save is corrupt');
        request.onerror = () => outcome = new SaveV2StoreError('STORAGE_UNAVAILABLE','Combat read failed',request.error);
        transaction.onabort = () => reject(transactionError(transaction,'STORAGE_UNAVAILABLE','Combat read aborted'));
        transaction.onerror = () => {};
        transaction.oncomplete = () => outcome instanceof Error ? reject(outcome) : resolve(outcome);
      });
    },

    async compareAndSetCombat(expectedRevision, profileRevision, combat) {
      requireOpen();
      if (expectedRevision !== null && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0))
        throw new TypeError('expected combat revision is invalid');
      if (!Number.isSafeInteger(profileRevision) || profileRevision < 0 || !validateG2RCombatState(combat) ||
          combat.profileRevision !== profileRevision) throw new TypeError('combat state is invalid');
      const detached = clone(combat);
      return new Promise((resolve,reject) => {
        const transaction=database.transaction('saves','readwrite'); const store=transaction.objectStore('saves');
        const profileRequest=store.get(recordKey); let outcome;
        profileRequest.onsuccess=()=>{
          const profileRecord=inspectSaveV2Record(profileRequest.result);
          if (!profileRecord || profileRecord.revision !== profileRevision ||
              profileRecord.profile.selectedHeroId !== detached.selectedHeroId ||
              JSON.stringify(profileRecord.profile.heroProgress.skillRanks) !== JSON.stringify(detached.skillRanks) ||
              JSON.stringify(profileRecord.profile.party) !== JSON.stringify(detached.party)) {
            outcome={ok:false,code:'STALE_PROFILE',actualRevision:profileRecord?.revision??null}; return;
          }
          const combatRequest=store.get(SAVE_V2_COMBAT_KEY);
          combatRequest.onsuccess=()=>{
            const current=combatRequest.result===undefined?null:inspectSaveV2CombatRecord(combatRequest.result);
            if (combatRequest.result!==undefined && !current) { outcome=new SaveV2StoreError('RESTORE_CORRUPT','Combat save cannot be overwritten'); return; }
            if ((current?.revision??null)!==expectedRevision) { outcome={ok:false,code:'STALE_REVISION',actualRevision:current?.revision??null}; return; }
            const revision=expectedRevision===null?0:expectedRevision+1;
            const put=store.put({formatVersion:SAVE_V2_FORMAT_VERSION,revision,profileRevision,combat:detached},SAVE_V2_COMBAT_KEY);
            put.onsuccess=()=>outcome={ok:true,revision};
            put.onerror=()=>outcome=new SaveV2StoreError('STORAGE_UNAVAILABLE','Combat write failed',put.error);
          };
          combatRequest.onerror=()=>outcome=new SaveV2StoreError('STORAGE_UNAVAILABLE','Combat compare failed',combatRequest.error);
        };
        profileRequest.onerror=()=>outcome=new SaveV2StoreError('STORAGE_UNAVAILABLE','Profile binding read failed',profileRequest.error);
        transaction.onabort=()=>reject(transactionError(transaction,'STORAGE_UNAVAILABLE','Combat write aborted'));
        transaction.onerror=()=>{};
        transaction.oncomplete=()=>outcome instanceof Error?reject(outcome):resolve(outcome);
      });
    },

    async loadIntegration() {
      requireOpen();
      return new Promise((resolve,reject)=>{
        const transaction=database.transaction('saves','readonly');
        const request=transaction.objectStore('saves').get(SAVE_V2_INTEGRATION_KEY); let outcome;
        request.onsuccess=()=>{
          if(request.result===undefined)outcome=null;
          else if(ownInteger(request.result,'formatVersion')!==SAVE_V2_FORMAT_VERSION)
            outcome=new SaveV2StoreError('RESTORE_UNSUPPORTED','Integration save format is unsupported');
          else outcome=inspectSaveV2IntegrationRecord(request.result)??new SaveV2StoreError('RESTORE_CORRUPT','Integration save is corrupt');
        };
        request.onerror=()=>outcome=new SaveV2StoreError('STORAGE_UNAVAILABLE','Integration read failed',request.error);
        transaction.onabort=()=>reject(transactionError(transaction,'STORAGE_UNAVAILABLE','Integration read aborted'));
        transaction.onerror=()=>{};transaction.oncomplete=()=>outcome instanceof Error?reject(outcome):resolve(outcome);
      });
    },

    async compareAndSetIntegration(expectedRevision, profileRevision, session) {
      requireOpen();
      if(expectedRevision!==null&&(!Number.isSafeInteger(expectedRevision)||expectedRevision<0))throw new TypeError('expected integration revision is invalid');
      if(!Number.isSafeInteger(profileRevision)||profileRevision<0||!validateG2RCampaignSession(session)||session.profileRevision!==profileRevision)
        throw new TypeError('integration session is invalid');
      const detached=clone(session);
      return new Promise((resolve,reject)=>{
        const transaction=database.transaction('saves','readwrite'),store=transaction.objectStore('saves');let outcome;
        const profileRequest=store.get(recordKey);
        profileRequest.onsuccess=()=>{
          const profileRecord=inspectSaveV2Record(profileRequest.result);
          if(!profileRecord||profileRecord.revision!==profileRevision||profileRecord.profile.selectedHeroId!==detached.selectedHeroId||
            JSON.stringify(profileRecord.profile.party)!==JSON.stringify(detached.party)){
            outcome={ok:false,code:'STALE_PROFILE',actualRevision:profileRecord?.revision??null};return;
          }
          const request=store.get(SAVE_V2_INTEGRATION_KEY);
          request.onsuccess=()=>{
            const current=request.result===undefined?null:inspectSaveV2IntegrationRecord(request.result);
            if(request.result!==undefined&&!current){outcome=new SaveV2StoreError('RESTORE_CORRUPT','Integration save cannot be overwritten');return;}
            if((current?.revision??null)!==expectedRevision){outcome={ok:false,code:'STALE_REVISION',actualRevision:current?.revision??null};return;}
            if(!validateG2RCampaignSessionTransition(current?.session??null,detached,profileRecord.profile)){
              outcome={ok:false,code:'INVALID_TRANSITION',actualRevision:current?.revision??null};return;
            }
            const revision=expectedRevision===null?0:expectedRevision+1;
            const put=store.put({formatVersion:SAVE_V2_FORMAT_VERSION,revision,profileRevision,session:detached},SAVE_V2_INTEGRATION_KEY);
            put.onsuccess=()=>outcome={ok:true,revision};put.onerror=()=>outcome=new SaveV2StoreError('STORAGE_UNAVAILABLE','Integration write failed',put.error);
          };
          request.onerror=()=>outcome=new SaveV2StoreError('STORAGE_UNAVAILABLE','Integration compare failed',request.error);
        };
        profileRequest.onerror=()=>outcome=new SaveV2StoreError('STORAGE_UNAVAILABLE','Profile binding read failed',profileRequest.error);
        transaction.onabort=()=>reject(transactionError(transaction,'STORAGE_UNAVAILABLE','Integration write aborted'));
        transaction.onerror=()=>{};transaction.oncomplete=()=>outcome instanceof Error?reject(outcome):resolve(outcome);
      });
    },

    close() {
      if (!closed) database.close();
      closed = true;
    }
  });
}
