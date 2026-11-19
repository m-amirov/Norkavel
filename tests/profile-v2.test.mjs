import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../src/combat.mjs';
import {
  COMPANION_IDS,
  COMPANION_CATALOG,
  HERO_IDS,
  activateLegacyProfileV2,
  assignCompanionSlot,
  beginCampaignAttempt,
  createProfileV2,
  prepareLegacyProfileV2,
  selectPermanentHero,
  settleVerifiedCampaignResult,
  upgradeCompanion,
  upgradeHeroSkill,
  validateProfileV2
} from '../src/profile-v2.mjs';

const TEST_XP_POLICY = Object.freeze({
  policyVersion: 1,
  policyId: 'test-xp-policy-v1',
  xpThresholds: Object.freeze(Array.from({ length: 15 }, (_, index) =>
    (index + 1) * (index + 2) * 5 / 2)),
  firstClearXp: Object.freeze(Array.from({ length: 50 }, (_, index) => 12 + index)),
  replayXp: Object.freeze(Array.from({ length: 50 }, () => 3))
});
const TEST_COMPANION_POLICY = Object.freeze({
  policyVersion: 1,
  policyId: 'test-companion-cost-v1',
  maxLevel: 4,
  costs: Object.freeze([7, 11, 19])
});

function legacySnapshot(state = initialState()) {
  return {
    schemaVersion: 1,
    gameId: 'norkavel',
    gameVersion: '0.1.0',
    revision: 7,
    state
  };
}

test('G2R-F01: new v2 profile has provisional four-hero catalog and safe starter roster', () => {
  const profile = createProfileV2();
  assert.deepEqual(HERO_IDS, ['hero_slot_1', 'hero_slot_2', 'hero_slot_3', 'hero_slot_4']);
  assert.deepEqual(COMPANION_IDS, ['sentinel', 'ember', 'healer', 'ash', 'control']);
  assert.deepEqual(COMPANION_CATALOG.find(entry => entry.id === 'control'),
    { id: 'control', role: 'ice_controller' });
  assert.equal(profile.schema, 2);
  assert.equal(profile.phase, 'hero_selection');
  assert.equal(profile.selectedHeroId, null);
  assert.equal(profile.heroSelection.confirmedOnce, false);
  assert.equal(profile.heroSelection.selectionRequired, true);
  assert.equal(profile.heroProgress.level, 1);
  assert.equal(profile.heroProgress.xp, 0);
  assert.equal(profile.heroProgress.pendingSkillChoices, 0);
  assert.deepEqual(profile.unlockedCompanionIds, ['sentinel', 'ember', 'healer']);
  assert.deepEqual(profile.party, ['sentinel', 'ember', 'healer']);
  assert.equal(profile.companionProgress.length, 5);
  assert.equal(validateProfileV2(profile), true);
});

test('G2R-F01: permanent hero selection is one-time and idempotent only for the same hero', () => {
  const pending = createProfileV2();
  const selected = selectPermanentHero(pending, 'hero_slot_2');
  assert.notStrictEqual(selected, pending);
  assert.equal(selected.selectedHeroId, 'hero_slot_2');
  assert.equal(selected.phase, 'setup');
  assert.equal(selected.heroSelection.confirmedOnce, true);
  assert.equal(selected.heroSelection.selectionRequired, false);
  assert.strictEqual(selectPermanentHero(selected, 'hero_slot_2'), selected);
  assert.strictEqual(selectPermanentHero(selected, 'hero_slot_3'), selected);
  assert.strictEqual(selectPermanentHero(pending, 'unknown'), pending);
  assert.equal(validateProfileV2(selected), true);
});

test('G2R-F01: v2 validation rejects locked, duplicate and unknown party members', () => {
  const profile = createProfileV2();
  const invalid = [
    { ...profile, party: ['sentinel', 'ember', 'ash'] },
    { ...profile, party: ['sentinel', 'sentinel', 'healer'] },
    { ...profile, party: ['sentinel', 'ember', 'unknown'] },
    { ...profile, unlockedCompanionIds: ['sentinel', 'ember', 'healer', 'unknown'] },
    { ...profile, selectedHeroId: 'hero_slot_1' },
    { ...profile, heroProgress: { ...profile.heroProgress, level: 17 } },
    { ...profile, heroProgress: { ...profile.heroProgress, pendingSkillChoices: 1 } }
  ];
  for (const value of invalid) assert.equal(validateProfileV2(value), false);
});

test('G2R-F01: active companion slots preserve valid player-defined order', () => {
  const profile = createProfileV2();
  assert.equal(validateProfileV2({ ...profile, party: ['healer', 'sentinel', 'ember'] }), true);
});

test('G2R-F01: valid v1 snapshot is prepared read-only without silent hero binding or rewards', () => {
  const state = {
    ...initialState(),
    stage: 2,
    level: 8,
    gold: 155,
    claimed: [1, 2],
    party: ['sentinel', 'ember', 'ash']
  };
  const source = legacySnapshot(state);
  const prepared = prepareLegacyProfileV2(source);
  assert.equal(validateProfileV2(prepared), true);
  assert.equal(prepared.selectedHeroId, null);
  assert.equal(prepared.heroProgress.level, 1, 'legacy generic level must not mint hero progression');
  assert.equal(prepared.heroProgress.pendingSkillChoices, 0);
  assert.equal(prepared.gold, 155);
  assert.deepEqual(prepared.unlockedCompanionIds, ['sentinel', 'ember', 'healer', 'ash']);
  assert.deepEqual(prepared.party, ['sentinel', 'ember', 'ash']);
  assert.deepEqual(prepared.legacyProgress.claimedPrototypeStages, [1, 2]);
  assert.equal(prepared.legacyProgress.prototypeLevel, 8);
  assert.deepEqual(prepared.legacyCheckpoint, source);
  assert.deepEqual(source, legacySnapshot(state), 'readonly preparation must not mutate v1 data');
  assert.deepEqual(prepared.ledgers.firstClearStageIds, []);
  assert.equal(prepared.ledgers.settledAttemptCount, 0);
  assert.equal(prepared.campaignAttempt, null);
  assert.deepEqual(prepared.ledgers.unlockReceiptIds, []);
  assert.equal(prepared.unlockedCompanionIds.includes('control'), false);
});

test('G2R-F01: corrupt or incompatible v1 snapshots fail closed', () => {
  const valid = legacySnapshot();
  const invalid = [
    null,
    {},
    { ...valid, schemaVersion: 2 },
    { ...valid, gameId: 'other-game' },
    { ...valid, gameVersion: '9.9.9' },
    { ...valid, revision: -1 },
    { ...valid, state: { ...valid.state, gold: Infinity } },
    { ...valid, state: { ...valid.state, party: ['sentinel', 'sentinel', 'healer'] } },
    { ...valid, extra: true }
  ];
  for (const value of invalid) assert.equal(prepareLegacyProfileV2(value), null);
});

test('G2R-F01: v2 validator rejects forged unlocks and legacy value drift', () => {
  const fresh = createProfileV2();
  assert.equal(validateProfileV2({
    ...fresh,
    unlockedCompanionIds: ['sentinel', 'ember', 'healer', 'ash']
  }), false);

  const legacy = prepareLegacyProfileV2(legacySnapshot());
  assert.equal(validateProfileV2({ ...legacy, gold: legacy.gold + 1 }), false);
  assert.equal(validateProfileV2({ ...legacy, party: ['sentinel', 'ember', 'ash'] }), false);
  assert.equal(validateProfileV2({
    ...legacy,
    unlockedCompanionIds: [...legacy.unlockedCompanionIds, 'control']
  }), false);
});

test('G2R-F01: prepared migration is deterministic and isolated from caller mutation', () => {
  const source = legacySnapshot();
  const first = prepareLegacyProfileV2(source);
  const second = prepareLegacyProfileV2(source);
  assert.deepEqual(first, second);
  source.state.gold = 999999;
  assert.equal(first.gold, 0);
  assert.equal(first.legacyCheckpoint.state.gold, 0);
});

test('G2R-F01 regression: ultimate cannot be upgraded before hero level 5', () => {
  const selected = selectPermanentHero(createProfileV2(), 'hero_slot_1');
  const level4 = {
    ...selected,
    heroProgress: {
      ...selected.heroProgress,
      level: 4,
      xp: 30,
      xpPolicyId: 'test-level-gate-v1',
      xpThresholds: [...TEST_XP_POLICY.xpThresholds],
      xpRewardTables: {
        firstClearXp: [...TEST_XP_POLICY.firstClearXp],
        replayXp: [...TEST_XP_POLICY.replayXp]
      },
      pendingSkillChoices: 3
    }
  };
  assert.equal(validateProfileV2(level4), true);
  assert.strictEqual(upgradeHeroSkill(level4, 'ultimate'), level4);

  const level5 = {
    ...selected,
    heroProgress: {
      ...selected.heroProgress,
      level: 5,
      xp: 50,
      xpPolicyId: 'test-level-gate-v1',
      xpThresholds: [...TEST_XP_POLICY.xpThresholds],
      xpRewardTables: {
        firstClearXp: [...TEST_XP_POLICY.firstClearXp],
        replayXp: [...TEST_XP_POLICY.replayXp]
      },
      pendingSkillChoices: 4
    }
  };
  const upgraded = upgradeHeroSkill(level5, 'ultimate');
  assert.equal(upgraded.heroProgress.skillRanks.ultimate, 1);
  assert.equal(upgraded.heroProgress.pendingSkillChoices, 3);
  assert.equal(validateProfileV2(upgraded), true);
});

test('G2R-F01 regression: companion serialization has no unapproved gameplay cap of 100', () => {
  const profile = createProfileV2();
  const progress = profile.companionProgress.map(entry =>
    entry.id === 'sentinel' ? { ...entry, level: 101 } : entry);
  assert.equal(validateProfileV2({ ...profile, companionProgress: progress }), true);
});

function settleAttempt(profile, stageId, outcome = 'victory', nonce = `${stageId}-${outcome}`) {
  const sequence = profile.ledgers.settledAttemptCount + 1;
  const attemptId = `pve:${sequence}:${nonce}`;
  const begun = beginCampaignAttempt(profile, { attemptId, stageId });
  assert.notStrictEqual(begun, profile, `stage ${stageId} attempt should be authorized`);
  return settleVerifiedCampaignResult(begun, {
    resultVersion: 1,
    attemptSequence: sequence,
    attemptId,
    outcome
  }, outcome === 'victory' ? TEST_XP_POLICY : null);
}

function winThrough(profile, targetStage) {
  let next = profile;
  for (let stageId = next.ledgers.firstClearStageIds.length + 1; stageId <= targetStage; stageId++)
    next = settleAttempt(next, stageId, 'victory', `clear-${stageId}`);
  return next;
}

test('G2R-F03: prepared legacy profile activates without losing recovery or imported progress', () => {
  const state = {
    ...initialState(),
    level: 8,
    gold: 155,
    claimed: [1, 2],
    party: ['sentinel', 'ember', 'ash']
  };
  const prepared = prepareLegacyProfileV2(legacySnapshot(state));
  assert.equal(prepared.legacyProgress.activated, false);
  const active = activateLegacyProfileV2(prepared);
  assert.notStrictEqual(active, prepared);
  assert.equal(active.legacyProgress.activated, true);
  assert.equal(active.gold, 155);
  assert.deepEqual(active.party, ['sentinel', 'ember', 'ash']);
  assert.deepEqual(active.unlockedCompanionIds, ['sentinel', 'ember', 'healer', 'ash']);
  assert.deepEqual(active.legacyProgress.claimedPrototypeStages, [1, 2]);
  assert.deepEqual(active.legacyCheckpoint, legacySnapshot(state));
  assert.equal(validateProfileV2(active), true);

  const mutable = { ...active, gold: 200 };
  assert.equal(validateProfileV2(mutable), true, 'activated v2 values may advance independently');
  assert.strictEqual(activateLegacyProfileV2(active), active, 'activation is idempotent');

  let continued = selectPermanentHero(active, 'hero_slot_4');
  continued = winThrough(continued, 10);
  const restored = JSON.parse(JSON.stringify(continued));
  assert.equal(validateProfileV2(restored), true);
  assert.equal(restored.gold, 155);
  assert.deepEqual(restored.party, ['sentinel', 'ember', 'ash']);
  assert.deepEqual(restored.legacyProgress.claimedPrototypeStages, [1, 2]);
  assert.deepEqual(restored.legacyCheckpoint, legacySnapshot(state));
});

test('G2R-F03: readonly legacy candidate cannot settle campaign progress before activation', () => {
  const prepared = prepareLegacyProfileV2(legacySnapshot());
  assert.strictEqual(beginCampaignAttempt(prepared, { attemptId: 'pve:1:legacy', stageId: 1 }), prepared);
});

test('G2R-F03: stage 3 first victory unlocks Kair once and preserves all active slots', () => {
  const profile = winThrough(selectPermanentHero(createProfileV2(), 'hero_slot_1'), 2);
  const first = settleAttempt(profile, 3, 'victory', 'stage-3-first');
  assert.deepEqual(first.unlockedCompanionIds, ['sentinel', 'ember', 'healer', 'ash']);
  assert.deepEqual(first.party, ['sentinel', 'ember', 'healer']);
  assert.deepEqual(first.ledgers.firstClearStageIds, ['stage:1', 'stage:2', 'stage:3']);
  assert.deepEqual(first.ledgers.unlockReceiptIds, ['stage_3_first_clear']);
  assert.equal(first.ledgers.settledAttemptCount, 3);
  assert.equal(validateProfileV2(first), true);

  assert.strictEqual(settleVerifiedCampaignResult(first, {
    resultVersion: 1,
    attemptSequence: 3,
    attemptId: 'pve:3:stage-3-first',
    outcome: 'victory'
  }), first, 'same attempt is idempotent');

  const replay = settleAttempt(first, 3, 'victory', 'stage-3-replay');
  assert.deepEqual(replay.unlockedCompanionIds, first.unlockedCompanionIds);
  assert.deepEqual(replay.ledgers.unlockReceiptIds, first.ledgers.unlockReceiptIds);
  assert.equal(replay.ledgers.settledAttemptCount, 4);
});

test('G2R-F03: stage 3 entry, defeat and unrelated stage never unlock Kair', () => {
  const profile = winThrough(selectPermanentHero(createProfileV2(), 'hero_slot_2'), 2);
  const defeated = settleAttempt(profile, 3, 'defeat', 'stage-3-loss');
  assert.deepEqual(defeated.unlockedCompanionIds, ['sentinel', 'ember', 'healer']);
  assert.deepEqual(defeated.ledgers.firstClearStageIds, ['stage:1', 'stage:2']);
  assert.equal(defeated.ledgers.settledAttemptCount, 3);

  const technicalBoss = settleAttempt(defeated, 2, 'victory', 'technical-stage-2');
  assert.equal(technicalBoss.unlockedCompanionIds.includes('ash'), false);
  assert.equal(technicalBoss.unlockedCompanionIds.includes('control'), false);
  assert.deepEqual(technicalBoss.ledgers.unlockReceiptIds, []);
});

test('G2R-F03: first story boss stage 10 victory unlocks controller once', () => {
  let profile = selectPermanentHero(createProfileV2(), 'hero_slot_3');
  profile = winThrough(profile, 9);
  const defeated = settleAttempt(profile, 10, 'defeat', 'story-boss-loss');
  assert.equal(defeated.unlockedCompanionIds.includes('control'), false);
  assert.equal(defeated.ledgers.firstClearStageIds.includes('stage:10'), false);
  profile = defeated;
  profile = settleAttempt(profile, 10, 'victory', 'story-boss-first');
  assert.deepEqual(profile.unlockedCompanionIds, COMPANION_IDS);
  assert.deepEqual(profile.party, ['sentinel', 'ember', 'healer']);
  assert.equal(profile.ledgers.firstClearStageIds.length, 10);
  assert.deepEqual(profile.ledgers.unlockReceiptIds,
    ['stage_3_first_clear', 'first_story_boss_first_clear']);
  assert.equal(validateProfileV2(profile), true);

  const replay = settleAttempt(profile, 10, 'victory', 'story-boss-replay');
  assert.deepEqual(replay.ledgers.unlockReceiptIds, profile.ledgers.unlockReceiptIds);
  assert.deepEqual(replay.unlockedCompanionIds, profile.unlockedCompanionIds);
});

test('G2R-P01 prerequisite: campaign result requires a canonical reachable active attempt', () => {
  const profile = selectPermanentHero(createProfileV2(), 'hero_slot_4');
  assert.strictEqual(beginCampaignAttempt(profile, { attemptId: 'pve:1:forged-10', stageId: 10 }), profile);
  assert.strictEqual(beginCampaignAttempt(profile, { attemptId: 'wrong', stageId: 1 }), profile);
  const invalid = [
    null,
    {},
    { resultVersion: 2, attemptSequence: 1, attemptId: 'pve:1:a', outcome: 'victory' },
    { resultVersion: 1, attemptSequence: 1, attemptId: '', outcome: 'victory' },
    { resultVersion: 1, attemptSequence: 0, attemptId: 'pve:1:a', outcome: 'victory' },
    { resultVersion: 1, attemptSequence: 1, attemptId: 'pve:1:a', outcome: 'abandoned' },
    { resultVersion: 1, attemptSequence: 1, attemptId: 'pve:1:a', outcome: 'victory', stageId: 10 }
  ];
  for (const event of invalid) assert.strictEqual(settleVerifiedCampaignResult(profile, event), profile);

  const begun = beginCampaignAttempt(profile, { attemptId: 'pve:1:immutable-attempt', stageId: 1 });
  assert.strictEqual(beginCampaignAttempt(begun, { attemptId: 'pve:1:second', stageId: 1 }), begun);
  assert.strictEqual(settleVerifiedCampaignResult(begun, {
    resultVersion: 1,
    attemptSequence: 1,
    attemptId: 'pve:1:other',
    outcome: 'victory'
  }), begun);
});

test('G2R-P01 prerequisite: monotonic receipt cursor works beyond 10000 and survives reload', () => {
  const profile = selectPermanentHero(createProfileV2(), 'hero_slot_1');
  const longRunning = {
    ...profile,
    ledgers: {
      ...profile.ledgers,
      settledAttemptCount: 10000
    }
  };
  assert.equal(validateProfileV2(longRunning), true);
  const begun = beginCampaignAttempt(longRunning, { attemptId: 'pve:10001:after-reload', stageId: 1 });
  const restored = JSON.parse(JSON.stringify(begun));
  const settled = settleVerifiedCampaignResult(restored, {
    resultVersion: 1,
    attemptSequence: 10001,
    attemptId: 'pve:10001:after-reload',
    outcome: 'defeat'
  });
  assert.equal(settled.ledgers.settledAttemptCount, 10001);
  assert.equal(settled.campaignAttempt, null);
  assert.equal(validateProfileV2(settled), true);
  assert.strictEqual(settleVerifiedCampaignResult(settled, {
    resultVersion: 1,
    attemptSequence: 10001,
    attemptId: 'pve:10001:after-reload',
    outcome: 'victory'
  }), settled);
});

test('G2R-P01: verified victories grant policy XP, replays grant less, and defeats grant zero', () => {
  let profile = selectPermanentHero(createProfileV2(), 'hero_slot_1');
  const defeated = settleAttempt(profile, 1, 'defeat', 'loss');
  assert.deepEqual(defeated.heroProgress, profile.heroProgress);
  profile = settleAttempt(defeated, 1, 'victory', 'first');
  assert.equal(profile.heroProgress.xp, TEST_XP_POLICY.firstClearXp[0]);
  assert.equal(profile.heroProgress.level, 2);
  assert.equal(profile.heroProgress.pendingSkillChoices, 1);
  assert.equal(profile.heroProgress.xpPolicyId, TEST_XP_POLICY.policyId);
  const replay = settleAttempt(profile, 1, 'victory', 'replay');
  assert.equal(replay.heroProgress.xp,
    TEST_XP_POLICY.firstClearXp[0] + TEST_XP_POLICY.replayXp[0]);
  assert.equal(replay.heroProgress.level, 3);
  assert.equal(replay.heroProgress.pendingSkillChoices, 2);
});

test('G2R-P01: multi-level victory persists every choice and level 16 never becomes 17', () => {
  const fastPolicy = {
    ...TEST_XP_POLICY,
    policyId: 'test-fast-policy-v1',
    xpThresholds: Array.from({ length: 15 }, (_, index) => (index + 1) * (index + 2) / 2),
    firstClearXp: Array.from({ length: 50 }, () => 120),
    replayXp: Array.from({ length: 50 }, () => 1)
  };
  let profile = selectPermanentHero(createProfileV2(), 'hero_slot_2');
  let begun = beginCampaignAttempt(profile, { attemptId: 'pve:1:cap', stageId: 1 });
  profile = settleVerifiedCampaignResult(begun, {
    resultVersion: 1, attemptSequence: 1, attemptId: 'pve:1:cap', outcome: 'victory'
  }, fastPolicy);
  assert.equal(profile.heroProgress.level, 16);
  assert.equal(profile.heroProgress.pendingSkillChoices, 15);
  assert.equal(profile.heroProgress.xp, 120);

  begun = beginCampaignAttempt(profile, { attemptId: 'pve:2:post-cap', stageId: 1 });
  const postCap = settleVerifiedCampaignResult(begun, {
    resultVersion: 1, attemptSequence: 2, attemptId: 'pve:2:post-cap', outcome: 'victory'
  }, fastPolicy);
  assert.equal(postCap.heroProgress.level, 16);
  assert.equal(postCap.heroProgress.pendingSkillChoices, 15);
  assert.equal(postCap.heroProgress.xp, 121, 'lifetime XP remains lossless at cap');
  assert.equal(validateProfileV2(JSON.parse(JSON.stringify(postCap))), true);
});

test('G2R-P01: all 15 choices are manual, capped, and survive at level 16', () => {
  const progress = {
    level: 16,
    xp: 120,
    xpPolicyId: 'test-full-choice-v1',
    xpThresholds: Array.from({ length: 15 }, (_, index) => (index + 1) * (index + 2) / 2),
    xpRewardTables: {
      firstClearXp: [...TEST_XP_POLICY.firstClearXp],
      replayXp: [...TEST_XP_POLICY.replayXp]
    },
    pendingSkillChoices: 15,
    skillRanks: { skill1: 0, skill2: 0, skill3: 0, ultimate: 0 }
  };
  let profile = { ...selectPermanentHero(createProfileV2(), 'hero_slot_3'), heroProgress: progress };
  assert.equal(validateProfileV2(profile), true);
  for (const skillId of ['skill1', 'skill2', 'skill3'])
    for (let rank = 0; rank < 4; rank++) profile = upgradeHeroSkill(profile, skillId);
  for (let rank = 0; rank < 3; rank++) profile = upgradeHeroSkill(profile, 'ultimate');
  assert.deepEqual(profile.heroProgress.skillRanks,
    { skill1: 4, skill2: 4, skill3: 4, ultimate: 3 });
  assert.equal(profile.heroProgress.pendingSkillChoices, 0);
  assert.strictEqual(upgradeHeroSkill(profile, 'ultimate'), profile);
  assert.strictEqual(upgradeHeroSkill(profile, 'skill1'), profile);
  assert.equal(validateProfileV2(profile), true);
});

test('G2R-P01: invalid or changed XP policy cannot consume an active victory', () => {
  const profile = selectPermanentHero(createProfileV2(), 'hero_slot_4');
  const begun = beginCampaignAttempt(profile, { attemptId: 'pve:1:policy', stageId: 1 });
  const result = {
    resultVersion: 1, attemptSequence: 1, attemptId: 'pve:1:policy', outcome: 'victory'
  };
  assert.strictEqual(settleVerifiedCampaignResult(begun, result), begun);
  assert.strictEqual(settleVerifiedCampaignResult(begun, result, {
    ...TEST_XP_POLICY, replayXp: [...TEST_XP_POLICY.firstClearXp]
  }), begun);
  assert.strictEqual(settleVerifiedCampaignResult(begun, result, {
    ...TEST_XP_POLICY,
    xpThresholds: [1, 3, 4, ...TEST_XP_POLICY.xpThresholds.slice(3)]
  }), begun, 'cumulative thresholds must also have strictly increasing level intervals');
  const awarded = JSON.parse(JSON.stringify(
    settleVerifiedCampaignResult(begun, result, TEST_XP_POLICY)));
  const replayBegun = beginCampaignAttempt(awarded, { attemptId: 'pve:2:policy-change', stageId: 1 });
  const driftedRewards = {
    ...TEST_XP_POLICY,
    firstClearXp: TEST_XP_POLICY.firstClearXp.map((xp, index) => index === 0 ? xp + 1 : xp)
  };
  assert.strictEqual(settleVerifiedCampaignResult(replayBegun, {
    resultVersion: 1, attemptSequence: 2, attemptId: 'pve:2:policy-change', outcome: 'victory'
  }, driftedRewards), replayBegun, 'same policy ID cannot hide reward-table drift');
  assert.strictEqual(settleVerifiedCampaignResult(replayBegun, {
    resultVersion: 1, attemptSequence: 2, attemptId: 'pve:2:policy-change', outcome: 'victory'
  }, { ...TEST_XP_POLICY, policyId: 'different-policy' }), replayBegun);
});

test('G2R-E01: one purchase atomically debits policy cost and upgrades only the selected companion', () => {
  const selected = selectPermanentHero(createProfileV2(), 'hero_slot_1');
  const profile = { ...selected, gold: 20 };
  const purchased = upgradeCompanion(profile, {
    purchaseVersion: 1,
    purchaseSequence: 1,
    purchaseId: 'companion:1:first',
    companionId: 'sentinel',
    expectedLevel: 1
  }, TEST_COMPANION_POLICY);
  assert.equal(purchased.gold, 13);
  assert.deepEqual(purchased.companionProgress.map(entry => entry.level), [2, 1, 1, 1, 1]);
  assert.equal(purchased.ledgers.settledPurchaseCount, 1);
  assert.deepEqual(purchased.companionUpgradePolicy, TEST_COMPANION_POLICY);
  assert.deepEqual(purchased.party, profile.party);
  assert.deepEqual(purchased.heroProgress, profile.heroProgress);
  assert.equal(validateProfileV2(purchased), true);
});

test('G2R-E01: duplicate purchase and JSON reload cannot double charge or upgrade', () => {
  const selected = { ...selectPermanentHero(createProfileV2(), 'hero_slot_2'), gold: 30 };
  const command = {
    purchaseVersion: 1,
    purchaseSequence: 1,
    purchaseId: 'companion:1:double-click',
    companionId: 'ember',
    expectedLevel: 1
  };
  const purchased = upgradeCompanion(selected, command, TEST_COMPANION_POLICY);
  const restored = JSON.parse(JSON.stringify(purchased));
  assert.strictEqual(upgradeCompanion(restored, command, TEST_COMPANION_POLICY), restored);
  assert.equal(restored.gold, 23);
  assert.equal(restored.companionProgress[1].level, 2);
});

test('G2R-E01: invalid, locked, stale, insufficient and cap purchases fail without mutation', () => {
  let profile = { ...selectPermanentHero(createProfileV2(), 'hero_slot_3'), gold: 6 };
  const base = {
    purchaseVersion: 1,
    purchaseSequence: 1,
    purchaseId: 'companion:1:denied',
    companionId: 'sentinel',
    expectedLevel: 1
  };
  assert.strictEqual(upgradeCompanion(profile, base, TEST_COMPANION_POLICY), profile);
  profile = { ...profile, gold: 100 };
  assert.strictEqual(upgradeCompanion(profile, { ...base, companionId: 'ash' },
    TEST_COMPANION_POLICY), profile);
  for (const command of [
    { ...base, companionId: 'unknown' },
    { ...base, expectedLevel: 2 },
    { ...base, purchaseSequence: 2, purchaseId: 'companion:2:gap' },
    { ...base, purchaseId: 'wrong' },
    { ...base, extra: true }
  ]) assert.strictEqual(upgradeCompanion(profile, command, TEST_COMPANION_POLICY), profile);

  const cappedProgress = profile.companionProgress.map(entry =>
    entry.id === 'sentinel' ? { ...entry, level: 4 } : entry);
  const capped = { ...profile, companionProgress: cappedProgress };
  assert.equal(validateProfileV2(capped), true);
  assert.strictEqual(upgradeCompanion(capped, { ...base, expectedLevel: 4 }, TEST_COMPANION_POLICY), capped);
});

test('G2R-E01: cost-policy drift and readonly legacy migration fail closed', () => {
  const prepared = prepareLegacyProfileV2(legacySnapshot({ ...initialState(), gold: 100 }));
  const command = {
    purchaseVersion: 1,
    purchaseSequence: 1,
    purchaseId: 'companion:1:legacy',
    companionId: 'ash',
    expectedLevel: 1
  };
  assert.strictEqual(upgradeCompanion(prepared, command, TEST_COMPANION_POLICY), prepared);
  let active = selectPermanentHero(activateLegacyProfileV2(prepared), 'hero_slot_4');
  active = upgradeCompanion(active, command, TEST_COMPANION_POLICY);
  assert.equal(active.gold, 93);
  assert.equal(active.companionProgress[3].level, 2);
  const nextCommand = {
    ...command,
    purchaseSequence: 2,
    purchaseId: 'companion:2:drift',
    expectedLevel: 2
  };
  assert.strictEqual(upgradeCompanion(active, nextCommand, {
    ...TEST_COMPANION_POLICY,
    costs: [7, 12, 19]
  }), active);
  assert.equal(active.legacyCheckpoint.state.gold, 100);
  assert.equal(active.legacyProgress.importedGold, 100);
});

test('G2R-E01: all five unlocked companions can be upgraded manually without changing the party', () => {
  let profile = winThrough(selectPermanentHero(createProfileV2(), 'hero_slot_1'), 10);
  assert.deepEqual(profile.companionProgress.map(entry => entry.level), [1, 1, 1, 1, 1],
    'campaign victories never auto-level companions');
  profile = { ...profile, gold: 100 };
  const originalParty = [...profile.party];
  for (const [index, companionId] of COMPANION_IDS.entries()) {
    profile = upgradeCompanion(profile, {
      purchaseVersion: 1,
      purchaseSequence: index + 1,
      purchaseId: `companion:${index + 1}:all-five`,
      companionId,
      expectedLevel: 1
    }, TEST_COMPANION_POLICY);
  }
  assert.deepEqual(profile.companionProgress.map(entry => entry.level), [2, 2, 2, 2, 2]);
  assert.deepEqual(profile.party, originalParty);
  assert.equal(profile.gold, 65);
});

test('G2R-E01: purchase cursor continues beyond 10000 after JSON reload', () => {
  const selected = selectPermanentHero(createProfileV2(), 'hero_slot_2');
  const longRunning = JSON.parse(JSON.stringify({
    ...selected,
    gold: 20,
    ledgers: { ...selected.ledgers, settledPurchaseCount: 10000 }
  }));
  const purchased = upgradeCompanion(longRunning, {
    purchaseVersion: 1,
    purchaseSequence: 10001,
    purchaseId: 'companion:10001:long-session',
    companionId: 'healer',
    expectedLevel: 1
  }, TEST_COMPANION_POLICY);
  assert.equal(purchased.ledgers.settledPurchaseCount, 10001);
  assert.equal(purchased.companionProgress[2].level, 2);
  assert.equal(purchased.gold, 13);
  assert.equal(validateProfileV2(purchased), true);
});

test('G2R-F03: all three companion slots accept unlocked units and reject locked or fight changes', () => {
  let profile = selectPermanentHero(createProfileV2(), 'hero_slot_1');
  profile = winThrough(profile, 3);
  const replaced = assignCompanionSlot(profile, 0, 'ash');
  assert.deepEqual(replaced.party, ['ash', 'ember', 'healer']);
  const swapped = assignCompanionSlot(replaced, 2, 'ash');
  assert.deepEqual(swapped.party, ['healer', 'ember', 'ash']);
  assert.strictEqual(assignCompanionSlot(swapped, 1, 'control'), swapped);
  assert.strictEqual(assignCompanionSlot(swapped, 3, 'sentinel'), swapped);
  const fighting = { ...swapped, phase: 'fight' };
  assert.strictEqual(assignCompanionSlot(fighting, 0, 'sentinel'), fighting);
  assert.equal(validateProfileV2(swapped), true);
});
