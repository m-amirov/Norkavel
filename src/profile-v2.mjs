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
export const COMPANION_CATALOG = Object.freeze([
  Object.freeze({ id: 'sentinel', role: 'defender' }),
  Object.freeze({ id: 'ember', role: 'mage' }),
  Object.freeze({ id: 'healer', role: 'support' }),
  Object.freeze({ id: 'ash', role: 'hunter' }),
  Object.freeze({ id: 'control', role: 'ice_controller' })
]);

const STARTER_COMPANIONS = Object.freeze(['sentinel', 'ember', 'healer']);
const LEGACY_COMPANIONS = Object.freeze(['sentinel', 'ember', 'healer', 'ash']);
const PROFILE_FIELDS = Object.freeze([
  'schema', 'phase', 'selectedHeroId', 'heroSelection', 'heroProgress',
  'companionProgress', 'unlockedCompanionIds', 'party', 'gold', 'ledgers',
  'campaignAttempt', 'legacyProgress', 'legacyCheckpoint'
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
    xpPolicyId: null,
    xpThresholds: null,
    pendingSkillChoices: 0,
    skillRanks: { skill1: 0, skill2: 0, skill3: 0, ultimate: 0 }
  };
}

function companionProgress() {
  return COMPANION_IDS.map(id => ({ id, level: 1 }));
}

function emptyLedgers() {
  return { firstClearStageIds: [], settledAttemptCount: 0, unlockReceiptIds: [] };
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
    campaignAttempt: null,
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
  if (!exactRecord(value, ['level', 'xp', 'xpPolicyId', 'xpThresholds', 'pendingSkillChoices', 'skillRanks']))
    return false;
  if (!boundedInt(value.level, 1, 16) || !boundedInt(value.xp, 0, Number.MAX_SAFE_INTEGER) ||
      !boundedInt(value.pendingSkillChoices, 0, 15)) return false;
  const noPolicy = value.xpPolicyId === null && value.xpThresholds === null;
  const hasPolicy = typeof value.xpPolicyId === 'string' && value.xpPolicyId.length > 0 &&
    value.xpPolicyId.length <= 64 && validXpThresholds(value.xpThresholds);
  if ((!noPolicy && !hasPolicy) || (noPolicy && (value.level !== 1 || value.xp !== 0))) return false;
  if (hasPolicy) {
    const expectedLevel = 1 + value.xpThresholds.filter(threshold => value.xp >= threshold).length;
    if (value.level !== expectedLevel) return false;
  }
  if (!exactRecord(value.skillRanks, ['skill1', 'skill2', 'skill3', 'ultimate'])) return false;
  const regular = ['skill1', 'skill2', 'skill3'];
  if (!regular.every(id => boundedInt(value.skillRanks[id], 0, 4)) ||
      !boundedInt(value.skillRanks.ultimate, 0, 3)) return false;
  if (value.level < 5 && value.skillRanks.ultimate !== 0) return false;
  const spent = regular.reduce((sum, id) => sum + value.skillRanks[id], 0) + value.skillRanks.ultimate;
  return spent + value.pendingSkillChoices === value.level - 1;
}

function validXpThresholds(value) {
  return Array.isArray(value) && value.length === 15 && value.every((threshold, index) =>
    boundedInt(threshold, 1, Number.MAX_SAFE_INTEGER) &&
    (index === 0 || (threshold > value[index - 1] &&
      threshold - value[index - 1] > value[index - 1] - (value[index - 2] ?? 0))));
}

function validProgressionPolicy(value) {
  if (!exactRecord(value, ['policyVersion', 'policyId', 'xpThresholds', 'firstClearXp', 'replayXp']) ||
      value.policyVersion !== 1 || typeof value.policyId !== 'string' || value.policyId.length < 1 ||
      value.policyId.length > 64 || !validXpThresholds(value.xpThresholds)) return false;
  return [value.firstClearXp, value.replayXp].every(rewards =>
    Array.isArray(rewards) && rewards.length === 50 &&
    rewards.every(xp => boundedInt(xp, 1, Number.MAX_SAFE_INTEGER))) &&
    value.replayXp.every((xp, index) => xp < value.firstClearXp[index]);
}

function awardHeroXp(profile, attempt, policy) {
  if (!validProgressionPolicy(policy)) return null;
  const progress = profile.heroProgress;
  if (progress.xpPolicyId !== null && progress.xpPolicyId !== policy.policyId) return null;
  if (progress.xpThresholds !== null && !sameArray(progress.xpThresholds, policy.xpThresholds)) return null;
  const award = (attempt.rewardClass === 'first_clear' ? policy.firstClearXp : policy.replayXp)[attempt.stageId - 1];
  if (!Number.isSafeInteger(progress.xp + award)) return null;
  const next = clone(profile);
  const oldLevel = progress.level;
  next.heroProgress.xp += award;
  next.heroProgress.xpPolicyId = policy.policyId;
  next.heroProgress.xpThresholds = [...policy.xpThresholds];
  next.heroProgress.level = 1 + policy.xpThresholds.filter(threshold => next.heroProgress.xp >= threshold).length;
  next.heroProgress.pendingSkillChoices += next.heroProgress.level - oldLevel;
  return next;
}

function validCompanionProgress(value) {
  // This is a JSON/safe-integer boundary, not an approved gameplay level cap.
  return Array.isArray(value) && value.length === COMPANION_IDS.length &&
    value.every((entry, index) => exactRecord(entry, ['id', 'level']) &&
      entry.id === COMPANION_IDS[index] && boundedInt(entry.level, 1, Number.MAX_SAFE_INTEGER));
}

function validLegacySnapshot(value) {
  return exactRecord(value, LEGACY_SNAPSHOT_FIELDS) && value.schemaVersion === 1 &&
    value.gameId === 'norkavel' && value.gameVersion === '0.1.0' &&
    boundedInt(value.revision, 0, Number.MAX_SAFE_INTEGER) &&
    exactRecord(value.state, LEGACY_STATE_FIELDS) && validateLegacyStateV1(value.state);
}

function validLegacyProgress(value) {
  if (value === null) return true;
  return exactRecord(value, [
    'sourceSchema', 'sourceRevision', 'prototypeLevel', 'claimedPrototypeStages',
    'importedGold', 'importedParty', 'activated'
  ]) && value.sourceSchema === 1 && boundedInt(value.sourceRevision, 0, Number.MAX_SAFE_INTEGER) &&
    boundedInt(value.prototypeLevel, 1, 100) && boundedInt(value.importedGold, 0, Number.MAX_SAFE_INTEGER) &&
    Array.isArray(value.claimedPrototypeStages) && value.claimedPrototypeStages.length <= 2 &&
    value.claimedPrototypeStages.every(stage => [1, 2].includes(stage)) &&
    new Set(value.claimedPrototypeStages).size === value.claimedPrototypeStages.length &&
    uniqueSubset(value.importedParty, LEGACY_COMPANIONS, 3) && typeof value.activated === 'boolean';
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function validFirstClearLedger(value) {
  return validStringLedger(value, 50) && value.every((id, index) => {
    const match = /^stage:(\d+)$/.exec(id);
    return match && Number(match[1]) === index + 1;
  });
}

function validCampaignAttempt(value, settledAttemptCount, firstClearCount) {
  if (value === null) return true;
  if (!exactRecord(value, ['attemptVersion', 'sequence', 'attemptId', 'stageId', 'rewardClass'])) return false;
  const expectedSequence = settledAttemptCount + 1;
  const expectedPrefix = `pve:${expectedSequence}:`;
  if (value.attemptVersion !== 1 || value.sequence !== expectedSequence ||
      typeof value.attemptId !== 'string' || !value.attemptId.startsWith(expectedPrefix) ||
      value.attemptId.length <= expectedPrefix.length || value.attemptId.length > 96 ||
      !boundedInt(value.stageId, 1, 50) ||
      !['first_clear', 'replay'].includes(value.rewardClass)) return false;
  return value.rewardClass === 'first_clear'
    ? value.stageId === firstClearCount + 1
    : value.stageId <= firstClearCount;
}

function expectedUnlockedCompanions(profile) {
  const expected = profile.legacyProgress === null ? [...STARTER_COMPANIONS] : [...LEGACY_COMPANIONS];
  if (profile.ledgers.unlockReceiptIds.includes('stage_3_first_clear') && !expected.includes('ash'))
    expected.push('ash');
  if (profile.ledgers.unlockReceiptIds.includes('first_story_boss_first_clear')) expected.push('control');
  return expected;
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
  if (!exactRecord(profile.ledgers, ['firstClearStageIds', 'settledAttemptCount', 'unlockReceiptIds']) ||
      !validFirstClearLedger(profile.ledgers.firstClearStageIds) ||
      !boundedInt(profile.ledgers.settledAttemptCount, 0, Number.MAX_SAFE_INTEGER) ||
      !validStringLedger(profile.ledgers.unlockReceiptIds, 2) ||
      profile.ledgers.unlockReceiptIds.some(id =>
        !['stage_3_first_clear', 'first_story_boss_first_clear'].includes(id))) return false;
  if (!validCampaignAttempt(profile.campaignAttempt, profile.ledgers.settledAttemptCount,
      profile.ledgers.firstClearStageIds.length)) return false;
  const stage3Cleared = profile.ledgers.firstClearStageIds.includes('stage:3');
  const stage10Cleared = profile.ledgers.firstClearStageIds.includes('stage:10');
  if (profile.ledgers.unlockReceiptIds.includes('stage_3_first_clear') !== stage3Cleared ||
      profile.ledgers.unlockReceiptIds.includes('first_story_boss_first_clear') !== stage10Cleared ||
      !sameArray(profile.unlockedCompanionIds, expectedUnlockedCompanions(profile))) return false;
  if (!validLegacyProgress(profile.legacyProgress)) return false;
  if ((profile.legacyCheckpoint === null) !== (profile.legacyProgress === null)) return false;
  if (profile.legacyCheckpoint === null) {
    return true;
  }
  if (!validLegacySnapshot(profile.legacyCheckpoint)) return false;
  const legacy = profile.legacyCheckpoint.state;
  if (profile.legacyProgress.sourceRevision !== profile.legacyCheckpoint.revision ||
      profile.legacyProgress.importedGold !== legacy.gold ||
      !sameArray(profile.legacyProgress.importedParty, legacy.party) ||
      profile.legacyProgress.prototypeLevel !== legacy.level ||
      !sameArray(profile.legacyProgress.claimedPrototypeStages, legacy.claimed)) return false;
  return profile.legacyProgress.activated || (profile.gold === legacy.gold &&
    sameArray(profile.party, legacy.party) &&
    profile.legacyProgress.prototypeLevel === legacy.level &&
    sameArray(profile.legacyProgress.claimedPrototypeStages, legacy.claimed));
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

export function upgradeHeroSkill(profile, skillId) {
  if (!validateProfileV2(profile) || profile.phase !== 'setup' ||
      !['skill1', 'skill2', 'skill3', 'ultimate'].includes(skillId) ||
      profile.heroProgress.pendingSkillChoices < 1) return profile;
  if (skillId === 'ultimate' && profile.heroProgress.level < 5) return profile;
  const cap = skillId === 'ultimate' ? 3 : 4;
  if (profile.heroProgress.skillRanks[skillId] >= cap) return profile;
  const next = clone(profile);
  next.heroProgress.skillRanks[skillId] += 1;
  next.heroProgress.pendingSkillChoices -= 1;
  return next;
}

export function activateLegacyProfileV2(profile) {
  if (!validateProfileV2(profile) || profile.legacyProgress === null) return profile;
  if (profile.legacyProgress.activated) return profile;
  const next = clone(profile);
  next.legacyProgress.activated = true;
  return next;
}

function validCampaignResult(result) {
  return exactRecord(result, ['resultVersion', 'attemptSequence', 'attemptId', 'outcome']) &&
    result.resultVersion === 1 && typeof result.attemptId === 'string' &&
    result.attemptId.length > 0 && result.attemptId.length <= 96 &&
    boundedInt(result.attemptSequence, 1, Number.MAX_SAFE_INTEGER) &&
    ['victory', 'defeat'].includes(result.outcome);
}

export function beginCampaignAttempt(profile, command) {
  if (!validateProfileV2(profile) || profile.phase !== 'setup' || profile.campaignAttempt !== null ||
      (profile.legacyProgress !== null && !profile.legacyProgress.activated) ||
      !exactRecord(command, ['attemptId', 'stageId']) ||
      typeof command.attemptId !== 'string' || !boundedInt(command.stageId, 1, 50)) return profile;
  const firstClearCount = profile.ledgers.firstClearStageIds.length;
  if (command.stageId > firstClearCount + 1) return profile;
  const sequence = profile.ledgers.settledAttemptCount + 1;
  const expectedPrefix = `pve:${sequence}:`;
  if (!command.attemptId.startsWith(expectedPrefix) || command.attemptId.length <= expectedPrefix.length ||
      command.attemptId.length > 96) return profile;
  const next = clone(profile);
  next.campaignAttempt = {
    attemptVersion: 1,
    sequence,
    attemptId: command.attemptId,
    stageId: command.stageId,
    rewardClass: command.stageId <= firstClearCount ? 'replay' : 'first_clear'
  };
  return validateProfileV2(next) ? next : profile;
}

export function settleVerifiedCampaignResult(profile, result, progressionPolicy = null) {
  if (!validateProfileV2(profile) || profile.phase !== 'setup' || !validCampaignResult(result) ||
      (profile.legacyProgress !== null && !profile.legacyProgress.activated) ||
      profile.campaignAttempt === null ||
      result.attemptSequence !== profile.campaignAttempt.sequence ||
      result.attemptId !== profile.campaignAttempt.attemptId) return profile;
  let next = clone(profile);
  const attempt = next.campaignAttempt;
  if (result.outcome === 'victory') {
    next = awardHeroXp(next, attempt, progressionPolicy);
    if (next === null) return profile;
  }
  next.campaignAttempt = null;
  next.ledgers.settledAttemptCount = attempt.sequence;
  if (result.outcome !== 'victory') return validateProfileV2(next) ? next : profile;
  if (attempt.rewardClass === 'replay') return validateProfileV2(next) ? next : profile;
  const stageReceipt = `stage:${attempt.stageId}`;
  next.ledgers.firstClearStageIds.push(stageReceipt);
  if (attempt.stageId === 3) {
    next.ledgers.unlockReceiptIds.push('stage_3_first_clear');
    if (!next.unlockedCompanionIds.includes('ash')) next.unlockedCompanionIds.push('ash');
  }
  if (attempt.stageId === 10) {
    next.ledgers.unlockReceiptIds.push('first_story_boss_first_clear');
    next.unlockedCompanionIds.push('control');
  }
  return validateProfileV2(next) ? next : profile;
}

export function assignCompanionSlot(profile, slotIndex, companionId) {
  if (!validateProfileV2(profile) || profile.phase !== 'setup' ||
      !boundedInt(slotIndex, 0, 2) || !profile.unlockedCompanionIds.includes(companionId)) return profile;
  const currentIndex = profile.party.indexOf(companionId);
  if (currentIndex === slotIndex) return profile;
  const next = clone(profile);
  if (currentIndex >= 0) {
    [next.party[slotIndex], next.party[currentIndex]] = [next.party[currentIndex], next.party[slotIndex]];
  } else {
    next.party[slotIndex] = companionId;
  }
  return validateProfileV2(next) ? next : profile;
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
    sourceRevision: source.revision,
    prototypeLevel: source.state.level,
    claimedPrototypeStages: [...source.state.claimed],
    importedGold: source.state.gold,
    importedParty: [...source.state.party],
    activated: false
  };
  profile.legacyCheckpoint = source;
  return validateProfileV2(profile) ? profile : null;
}
