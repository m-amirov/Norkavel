import { validateState as validateLegacyStateV1 } from './combat.mjs';

// These hero identifiers reserve stable domain slots only. Character identities,
// names, art and combat kits remain owner-open and must not be inferred here.
export const HERO_IDS = Object.freeze([
  'hero_slot_1',
  'hero_slot_2',
  'hero_slot_3',
  'hero_slot_4'
]);

// `control` is a provisional technical ID for the confirmed ice-controller role.
export const COMPANION_IDS = Object.freeze([
  'sentinel',
  'ember',
  'healer',
  'ash',
  'control'
]);

const STARTER_COMPANIONS = Object.freeze(['sentinel', 'ember', 'healer']);
const LEGACY_COMPANIONS = Object.freeze(['sentinel', 'ember', 'healer', 'ash']);
const PROFILE_FIELDS = Object.freeze([
  'schema', 'phase', 'selectedHeroId', 'heroSelection', 'heroProgress',
  'companionProgress', 'unlockedCompanionIds', 'party', 'gold', 'ledgers',
  'legacyProgress', 'legacyCheckpoint'
]);
const LEGACY_SNAPSHOT_FIELDS = Object.freeze([
  'schemaVersion', 'gameId', 'gameVersion', 'revision', 'state'
]);
const LEGACY_STATE_FIELDS = Object.freeze([
  'schema', 'phase', 'stage', 'level', 'gold', 'claimed', 'party', 'front',
  'autoCast', 'seed', 'rng', 'tick', 'eventId', 'events', 'target', 'reward',
  'clickReady', 'skills', 'units'
]);

const clone = value => structuredClone(value);
const boundedInt = (value, min, max) =>
  Number.isSafeInteger(value) && value >= min && value <= max;

function exactRecord(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== fields.length || keys.some(key => typeof key !== 'string' || !fields.includes(key))) return false;
  return fields.every(field => {
    const descriptor = Object.getOwnPropertyDescriptor(value, field);
    return descriptor?.enumerable === true && Object.hasOwn(descriptor, 'value');
  });
}

function canonicalSubset(value, catalog, { exactLength } = {}) {
  return Array.isArray(value) && (exactLength === undefined || value.length === exactLength) &&
    value.every(id => typeof id === 'string' && catalog.includes(id)) &&
    new Set(value).size === value.length &&
    value.every((id, index) => catalog.indexOf(id) > (index === 0 ? -1 : catalog.indexOf(value[index - 1])));
}

function uniqueSubset(value, catalog, exactLength) {
  return Array.isArray(value) && value.length === exactLength &&
    value.every(id => typeof id === 'string' && catalog.includes(id)) &&
    new Set(value).size === value.length;
}

function emptyHeroProgress() {
  return {
    level: 1,
    xp: 0,
    pendingSkillChoices: 0,
    skillRanks: { skill1: 0, skill2: 0, skill3: 0, ultimate: 0 }
  };
}

function companionProgress() {
  return COMPANION_IDS.map(id => ({ id, level: 1 }));
}

function emptyLedgers() {
  return { firstClearStageIds: [], rewardReceiptIds: [], unlockReceiptIds: [] };
}

function baseProfile() {
  return {
    schema: 2,
    phase: 'hero_selection',
    selectedHeroId: null,
    heroSelection: { confirmedOnce: false, selectionRequired: true },
    heroProgress: emptyHeroProgress(),
    companionProgress: companionProgress(),
    unlockedCompanionIds: [...STARTER_COMPANIONS],
    party: [...STARTER_COMPANIONS],
    gold: 0,
    ledgers: emptyLedgers(),
    legacyProgress: null,
    legacyCheckpoint: null
  };
}

export function createProfileV2() {
  return baseProfile();
}

function validStringLedger(value, maxLength) {
  return Array.isArray(value) && value.length <= maxLength &&
    value.every(id => typeof id === 'string' && id.length > 0 && id.length <= 96) &&
    new Set(value).size === value.length;
}

function validHeroProgress(value) {
  if (!exactRecord(value, ['level', 'xp', 'pendingSkillChoices', 'skillRanks'])) return false;
  if (!boundedInt(value.level, 1, 16) || !boundedInt(value.xp, 0, Number.MAX_SAFE_INTEGER) ||
      !boundedInt(value.pendingSkillChoices, 0, 15)) return false;
  if (!exactRecord(value.skillRanks, ['skill1', 'skill2', 'skill3', 'ultimate'])) return false;
  const regular = ['skill1', 'skill2', 'skill3'];
  if (!regular.every(id => boundedInt(value.skillRanks[id], 0, 4)) ||
      !boundedInt(value.skillRanks.ultimate, 0, 3)) return false;
  const spent = regular.reduce((sum, id) => sum + value.skillRanks[id], 0) + value.skillRanks.ultimate;
  return spent + value.pendingSkillChoices === value.level - 1;
}

function validCompanionProgress(value) {
  return Array.isArray(value) && value.length === COMPANION_IDS.length &&
    value.every((entry, index) => exactRecord(entry, ['id', 'level']) &&
      entry.id === COMPANION_IDS[index] && boundedInt(entry.level, 1, 100));
}

function validLegacySnapshot(value) {
  return exactRecord(value, LEGACY_SNAPSHOT_FIELDS) && value.schemaVersion === 1 &&
    value.gameId === 'norkavel' && value.gameVersion === '0.1.0' &&
    boundedInt(value.revision, 0, Number.MAX_SAFE_INTEGER) &&
    exactRecord(value.state, LEGACY_STATE_FIELDS) && validateLegacyStateV1(value.state);
}

function validLegacyProgress(value) {
  if (value === null) return true;
  return exactRecord(value, ['sourceSchema', 'prototypeLevel', 'claimedPrototypeStages']) &&
    value.sourceSchema === 1 && boundedInt(value.prototypeLevel, 1, 100) &&
    Array.isArray(value.claimedPrototypeStages) && value.claimedPrototypeStages.length <= 2 &&
    value.claimedPrototypeStages.every(stage => [1, 2].includes(stage)) &&
    new Set(value.claimedPrototypeStages).size === value.claimedPrototypeStages.length;
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function validateProfileV2(profile) {
  if (!exactRecord(profile, PROFILE_FIELDS) || profile.schema !== 2 ||
      !['hero_selection', 'setup'].includes(profile.phase)) return false;
  if (!exactRecord(profile.heroSelection, ['confirmedOnce', 'selectionRequired']) ||
      typeof profile.heroSelection.confirmedOnce !== 'boolean' ||
      typeof profile.heroSelection.selectionRequired !== 'boolean') return false;
  const pendingSelection = profile.selectedHeroId === null;
  if (pendingSelection !== profile.heroSelection.selectionRequired ||
      pendingSelection === profile.heroSelection.confirmedOnce ||
      (pendingSelection ? profile.phase !== 'hero_selection' :
        !HERO_IDS.includes(profile.selectedHeroId) || profile.phase !== 'setup')) return false;
  if (!validHeroProgress(profile.heroProgress) || !validCompanionProgress(profile.companionProgress) ||
      !boundedInt(profile.gold, 0, Number.MAX_SAFE_INTEGER)) return false;
  if (!canonicalSubset(profile.unlockedCompanionIds, COMPANION_IDS) ||
      !uniqueSubset(profile.party, COMPANION_IDS, 3) ||
      !profile.party.every(id => profile.unlockedCompanionIds.includes(id))) return false;
  if (!exactRecord(profile.ledgers, ['firstClearStageIds', 'rewardReceiptIds', 'unlockReceiptIds']) ||
      !validStringLedger(profile.ledgers.firstClearStageIds, 50) ||
      !validStringLedger(profile.ledgers.rewardReceiptIds, 10000) ||
      !validStringLedger(profile.ledgers.unlockReceiptIds, 10)) return false;
  if (!validLegacyProgress(profile.legacyProgress)) return false;
  if ((profile.legacyCheckpoint === null) !== (profile.legacyProgress === null)) return false;
  if (profile.legacyCheckpoint === null) {
    return sameArray(profile.unlockedCompanionIds, STARTER_COMPANIONS);
  }
  if (!validLegacySnapshot(profile.legacyCheckpoint)) return false;
  const legacy = profile.legacyCheckpoint.state;
  return profile.gold === legacy.gold &&
    sameArray(profile.party, legacy.party) &&
    sameArray(profile.unlockedCompanionIds, LEGACY_COMPANIONS) &&
    profile.legacyProgress.prototypeLevel === legacy.level &&
    sameArray(profile.legacyProgress.claimedPrototypeStages, legacy.claimed);
}

export function selectPermanentHero(profile, heroId) {
  if (!validateProfileV2(profile) || !HERO_IDS.includes(heroId)) return profile;
  if (profile.selectedHeroId !== null) return profile;
  const next = clone(profile);
  next.selectedHeroId = heroId;
  next.phase = 'setup';
  next.heroSelection = { confirmedOnce: true, selectionRequired: false };
  return next;
}

// Produces an in-memory migration candidate only. The caller remains responsible
// for atomic persistence under a future v2 key; the v1 checkpoint is retained intact.
export function prepareLegacyProfileV2(snapshot) {
  if (!validLegacySnapshot(snapshot)) return null;
  const source = clone(snapshot);
  const profile = baseProfile();
  profile.gold = source.state.gold;
  profile.unlockedCompanionIds = [...LEGACY_COMPANIONS];
  profile.party = [...source.state.party];
  profile.legacyProgress = {
    sourceSchema: 1,
    prototypeLevel: source.state.level,
    claimedPrototypeStages: [...source.state.claimed]
  };
  profile.legacyCheckpoint = source;
  return validateProfileV2(profile) ? profile : null;
}
