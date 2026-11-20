import {
  assignCompanionSlot, beginCampaignAttempt, createProfileV2, selectPermanentHero,
  settleVerifiedCampaignResult, upgradeCompanion, upgradeHeroSkill, validateProfileV2
} from './profile-v2.mjs';
import { VERSION, XP_THRESHOLDS, battleReward, companionUpgradeCost, stageFirstClearReward, stageReplayReward } from './economy-candidate-v1.mjs';

export const G2R_SANDBOX_VERSION = 1;
export const G2R_SANDBOX_POLICY_ID = VERSION;
export const G2R_SANDBOX_SOURCE = 'local-untrusted';

const clone = value => structuredClone(value);
const exact = (value, fields) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field));
const integer = (value, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(value) && value >= min && value <= max;

export const G2R_SANDBOX_XP_POLICY_V1 = Object.freeze({
  policyVersion: 1,
  policyId: G2R_SANDBOX_POLICY_ID,
  xpThresholds: Object.freeze(XP_THRESHOLDS.slice(1)),
  firstClearXp: Object.freeze(Array.from({ length: 50 }, (_, index) => stageFirstClearReward(index + 1).xp)),
  replayXp: Object.freeze(Array.from({ length: 50 }, (_, index) => stageReplayReward(index + 1).xp))
});

export const G2R_SANDBOX_COMPANION_POLICY_V1 = Object.freeze({
  policyVersion: 1,
  policyId: G2R_SANDBOX_POLICY_ID,
  maxLevel: 100,
  costs: Object.freeze(Array.from({ length: 99 }, (_, index) => {
    const level = index + 1;
    return companionUpgradeCost(level);
  }))
});

export function sandboxReward(stage, rewardClass, outcome) {
  if (!integer(stage, 1, 50) || !['first_clear', 'replay'].includes(rewardClass) ||
      !['victory', 'defeat'].includes(outcome)) return null;
  return battleReward(stage,outcome,rewardClass==='first_clear');
}

export function createG2RProgressionSandbox(productionRecord) {
  const production = productionRecord?.profile;
  if (!integer(productionRecord?.revision) || !validateProfileV2(production) ||
      production.selectedHeroId === null || (production.legacyProgress && !production.legacyProgress.activated)) return null;
  const profile = selectPermanentHero(createProfileV2(), production.selectedHeroId);
  return {
    sandboxVersion: G2R_SANDBOX_VERSION,
    source: G2R_SANDBOX_SOURCE,
    policyId: G2R_SANDBOX_POLICY_ID,
    competitiveEligible: false,
    releaseEligible: false,
    productionBinding: { revision: productionRecord.revision, selectedHeroId: production.selectedHeroId },
    profile, pendingResult: null,
    lastSettlement: null
  };
}

export function validateG2RProgressionSandbox(state) {
  if (!exact(state, ['sandboxVersion','source','policyId','competitiveEligible','releaseEligible',
    'productionBinding','profile','pendingResult','lastSettlement']) || state.sandboxVersion !== 1 ||
    state.source !== G2R_SANDBOX_SOURCE || state.policyId !== G2R_SANDBOX_POLICY_ID ||
    state.competitiveEligible !== false || state.releaseEligible !== false ||
    !exact(state.productionBinding, ['revision','selectedHeroId']) ||
    !integer(state.productionBinding.revision) || !validateProfileV2(state.profile) ||
    state.profile.selectedHeroId !== state.productionBinding.selectedHeroId ||
    state.profile.legacyProgress !== null || state.profile.legacyCheckpoint !== null) return false;
  if (state.pendingResult !== null && (!exact(state.pendingResult,['attemptSequence','attemptId','stageId','outcome','source']) ||
    !integer(state.pendingResult.attemptSequence,1) || typeof state.pendingResult.attemptId !== 'string' ||
    !integer(state.pendingResult.stageId,1,50) || !['victory','defeat'].includes(state.pendingResult.outcome) ||
    state.pendingResult.source !== G2R_SANDBOX_SOURCE || state.profile.campaignAttempt === null ||
    state.pendingResult.attemptSequence !== state.profile.campaignAttempt.sequence ||
    state.pendingResult.attemptId !== state.profile.campaignAttempt.attemptId ||
    state.pendingResult.stageId !== state.profile.campaignAttempt.stageId)) return false;
  if (state.lastSettlement === null) return true;
  return exact(state.lastSettlement, ['receiptId','attemptId','stageId','outcome','rewardClass','xp','gold','source']) &&
    typeof state.lastSettlement.receiptId === 'string' && state.lastSettlement.receiptId.length > 0 &&
    state.lastSettlement.receiptId.length <= 96 && typeof state.lastSettlement.attemptId === 'string' &&
    state.lastSettlement.receiptId === `dev:${state.lastSettlement.attemptId}` &&
    integer(state.lastSettlement.stageId, 1, 50) && ['victory','defeat'].includes(state.lastSettlement.outcome) &&
    ['first_clear','replay'].includes(state.lastSettlement.rewardClass) && integer(state.lastSettlement.xp) &&
    integer(state.lastSettlement.gold) && state.lastSettlement.source === G2R_SANDBOX_SOURCE;
}

export function applyG2RProgressionSandboxCommand(state, command) {
  if (!validateG2RProgressionSandbox(state) || !command || typeof command !== 'object') return state;
  let profile;
  if (command.type === 'begin') {
    if (!exact(command, ['type','attemptId','stageId'])) return state;
    profile = beginCampaignAttempt(state.profile, { attemptId: command.attemptId, stageId: command.stageId });
    return profile === state.profile ? state : { ...clone(state), profile, pendingResult:null, lastSettlement: null };
  }
  if (command.type === 'complete') {
    if (!exact(command,['type','attemptSequence','attemptId','stageId','outcome']) || state.pendingResult !== null ||
      state.profile.campaignAttempt === null || command.attemptSequence !== state.profile.campaignAttempt.sequence ||
      command.attemptId !== state.profile.campaignAttempt.attemptId || command.stageId !== state.profile.campaignAttempt.stageId ||
      !['victory','defeat'].includes(command.outcome)) return state;
    return { ...clone(state), pendingResult:{ attemptSequence:command.attemptSequence,attemptId:command.attemptId,
      stageId:command.stageId,outcome:command.outcome,source:G2R_SANDBOX_SOURCE } };
  }
  if (command.type === 'settle') {
    if (!exact(command, ['type','attemptSequence','attemptId','outcome']) || state.profile.campaignAttempt === null ||
      state.pendingResult === null || command.attemptSequence !== state.pendingResult.attemptSequence ||
      command.attemptId !== state.pendingResult.attemptId || command.outcome !== state.pendingResult.outcome) return state;
    const attempt = state.profile.campaignAttempt;
    const reward = sandboxReward(attempt.stageId, attempt.rewardClass, command.outcome);
    if (!reward) return state;
    profile = settleVerifiedCampaignResult(state.profile, {
      resultVersion: 1, attemptSequence: command.attemptSequence,
      attemptId: command.attemptId, outcome: command.outcome
    }, G2R_SANDBOX_XP_POLICY_V1);
    if (profile === state.profile) return state;
    if (!Number.isSafeInteger(profile.gold + reward.gold)) return state;
    profile = { ...profile, gold: profile.gold + reward.gold };
    if (!validateProfileV2(profile)) return state;
    return { ...clone(state), profile, pendingResult:null, lastSettlement: {
      receiptId: `dev:${command.attemptId}`, attemptId: command.attemptId,
      stageId: attempt.stageId, outcome: command.outcome, rewardClass: attempt.rewardClass,
      xp: reward.xp, gold: reward.gold, source: G2R_SANDBOX_SOURCE
    } };
  }
  if (command.type === 'skill') {
    if (!exact(command, ['type','skillId'])) return state;
    profile = upgradeHeroSkill(state.profile, command.skillId);
  } else if (command.type === 'purchase') {
    if (!exact(command, ['type','purchaseSequence','purchaseId','companionId','expectedLevel'])) return state;
    profile = upgradeCompanion(state.profile, {
      purchaseVersion: 1, purchaseSequence: command.purchaseSequence,
      purchaseId: command.purchaseId, companionId: command.companionId,
      expectedLevel: command.expectedLevel
    }, G2R_SANDBOX_COMPANION_POLICY_V1);
  } else if (command.type === 'party') {
    if (!exact(command, ['type','slotIndex','companionId'])) return state;
    profile = assignCompanionSlot(state.profile, command.slotIndex, command.companionId);
  } else return state;
  return profile === state.profile ? state : { ...clone(state), profile };
}
