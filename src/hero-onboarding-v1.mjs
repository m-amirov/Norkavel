import { HERO_IDS, selectPermanentHero, validateProfileV2 } from './profile-v2.mjs';

export const HERO_ONBOARDING_VERSION = 1;
const SOURCES = Object.freeze(['new', 'legacy', 'save_v2']);
const clone = value => structuredClone(value);

function validRevision(value) {
  return value === null || Number.isSafeInteger(value) && value >= 0;
}

function stateWith(state, changes) {
  return Object.freeze({ ...state, ...changes });
}

function validBaseState(state) {
  return state?.onboardingVersion === HERO_ONBOARDING_VERSION &&
    SOURCES.includes(state.source) && validRevision(state.revision) &&
    (state.source === 'save_v2' ? state.revision !== null : state.revision === null) &&
    validateProfileV2(state.profile) &&
    (state.previewHeroId === null || HERO_IDS.includes(state.previewHeroId)) &&
    (state.confirmHeroId === null || HERO_IDS.includes(state.confirmHeroId));
}

export function createHeroOnboardingState({ profile, revision, source }) {
  if (!validateProfileV2(profile) || !validRevision(revision) || !SOURCES.includes(source) ||
      (source === 'save_v2' ? revision === null : revision !== null)) return null;
  const selected = profile.selectedHeroId;
  return Object.freeze({
    onboardingVersion: HERO_ONBOARDING_VERSION,
    status: selected === null ? 'selecting' : 'complete',
    source,
    revision,
    profile: clone(profile),
    previewHeroId: selected,
    confirmHeroId: null,
    pendingProfile: null,
    noticeCode: selected === null ? null : 'SELECTION_ALREADY_COMMITTED'
  });
}

export function previewHero(state, heroId) {
  if (!validBaseState(state) || state.status !== 'selecting' || !HERO_IDS.includes(heroId) ||
      state.profile.selectedHeroId !== null) return state;
  return stateWith(state, { previewHeroId: heroId, noticeCode: null });
}

export function requestHeroConfirmation(state) {
  if (!validBaseState(state) || state.status !== 'selecting' ||
      !HERO_IDS.includes(state.previewHeroId) || state.profile.selectedHeroId !== null) return state;
  return stateWith(state, {
    status: 'confirming', confirmHeroId: state.previewHeroId, noticeCode: null
  });
}

export function cancelHeroConfirmation(state) {
  if (!validBaseState(state) || state.status !== 'confirming' || state.profile.selectedHeroId !== null)
    return state;
  return stateWith(state, { status: 'selecting', confirmHeroId: null, noticeCode: null });
}

export function commitHeroSelection(state) {
  if (!validBaseState(state) || state.status !== 'confirming' ||
      !HERO_IDS.includes(state.confirmHeroId) || state.profile.selectedHeroId !== null) return null;
  const profile = selectPermanentHero(state.profile, state.confirmHeroId);
  if (!validateProfileV2(profile) || profile.selectedHeroId !== state.confirmHeroId) return null;
  return {
    state: stateWith(state, { status: 'committing', pendingProfile: profile, noticeCode: null }),
    command: Object.freeze({ expectedRevision: state.revision, profile: clone(profile) })
  };
}

export function resolveHeroSelectionCommit(state, result) {
  if (!validBaseState(state) || state.status !== 'committing' ||
      !validateProfileV2(state.pendingProfile) || state.pendingProfile.selectedHeroId !== state.confirmHeroId ||
      !result || typeof result !== 'object') return null;
  if (result.ok === false && result.code === 'STALE_REVISION' && validRevision(result.actualRevision)) {
    return stateWith(state, {
      status: 'stale', source: 'save_v2', revision: result.actualRevision, noticeCode: 'STALE_REVISION'
    });
  }
  if (result.ok !== true || !Number.isSafeInteger(result.revision) || result.revision < 0 ||
      !result.receipt || result.receipt.revision !== result.revision ||
      typeof result.receipt.commitId !== 'string' || result.receipt.commitId.length === 0) return null;
  return stateWith(state, {
    status: 'complete', source: 'save_v2', revision: result.revision, profile: clone(state.pendingProfile),
    previewHeroId: state.pendingProfile.selectedHeroId, confirmHeroId: null,
    pendingProfile: null, noticeCode: 'SELECTION_COMMITTED'
  });
}

export function resolveStaleHeroSelection(state, record) {
  if (!validBaseState(state) || state.status !== 'stale' || !record ||
      !Number.isSafeInteger(record.revision) || record.revision < 0 || !validateProfileV2(record.profile)) return null;
  if (record.profile.selectedHeroId === null) {
    return stateWith(state, {
      status: 'selecting', source: 'save_v2', revision: record.revision, profile: clone(record.profile),
      confirmHeroId: null, pendingProfile: null, noticeCode: 'STALE_RELOADED'
    });
  }
  return stateWith(state, {
    status: 'complete', source: 'save_v2', revision: record.revision, profile: clone(record.profile),
    previewHeroId: record.profile.selectedHeroId, confirmHeroId: null,
    pendingProfile: null, noticeCode: 'SELECTION_COMMITTED_ELSEWHERE'
  });
}
