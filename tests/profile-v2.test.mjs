import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../src/combat.mjs';
import {
  COMPANION_IDS,
  COMPANION_CATALOG,
  HERO_IDS,
  activateLegacyProfileV2,
  assignCompanionSlot,
  createProfileV2,
  prepareLegacyProfileV2,
  selectPermanentHero,
  settleVerifiedCampaignResult,
  upgradeHeroSkill,
  validateProfileV2
} from '../src/profile-v2.mjs';

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
  assert.deepEqual(prepared.ledgers.rewardReceiptIds, []);
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
  continued = settleVerifiedCampaignResult(continued, {
    resultVersion: 1,
    attemptId: 'legacy-story-boss-first',
    stageId: 10,
    outcome: 'victory'
  });
  const restored = JSON.parse(JSON.stringify(continued));
  assert.equal(validateProfileV2(restored), true);
  assert.equal(restored.gold, 155);
  assert.deepEqual(restored.party, ['sentinel', 'ember', 'ash']);
  assert.deepEqual(restored.legacyProgress.claimedPrototypeStages, [1, 2]);
  assert.deepEqual(restored.legacyCheckpoint, legacySnapshot(state));
});

test('G2R-F03: readonly legacy candidate cannot settle campaign progress before activation', () => {
  const prepared = prepareLegacyProfileV2(legacySnapshot());
  const event = { resultVersion: 1, attemptId: 'legacy-stage-3', stageId: 3, outcome: 'victory' };
  assert.strictEqual(settleVerifiedCampaignResult(prepared, event), prepared);
});

test('G2R-F03: stage 3 first victory unlocks Kair once and preserves all active slots', () => {
  const profile = selectPermanentHero(createProfileV2(), 'hero_slot_1');
  const first = settleVerifiedCampaignResult(profile, {
    resultVersion: 1,
    attemptId: 'stage-3-first',
    stageId: 3,
    outcome: 'victory'
  });
  assert.deepEqual(first.unlockedCompanionIds, ['sentinel', 'ember', 'healer', 'ash']);
  assert.deepEqual(first.party, ['sentinel', 'ember', 'healer']);
  assert.deepEqual(first.ledgers.firstClearStageIds, ['stage:3']);
  assert.deepEqual(first.ledgers.unlockReceiptIds, ['stage_3_first_clear']);
  assert.deepEqual(first.ledgers.rewardReceiptIds, ['stage-3-first']);
  assert.equal(validateProfileV2(first), true);

  assert.strictEqual(settleVerifiedCampaignResult(first, {
    resultVersion: 1,
    attemptId: 'stage-3-first',
    stageId: 3,
    outcome: 'victory'
  }), first, 'same attempt is idempotent');

  const replay = settleVerifiedCampaignResult(first, {
    resultVersion: 1,
    attemptId: 'stage-3-replay',
    stageId: 3,
    outcome: 'victory'
  });
  assert.deepEqual(replay.unlockedCompanionIds, first.unlockedCompanionIds);
  assert.deepEqual(replay.ledgers.unlockReceiptIds, first.ledgers.unlockReceiptIds);
  assert.deepEqual(replay.ledgers.rewardReceiptIds, ['stage-3-first', 'stage-3-replay']);
});

test('G2R-F03: stage 3 entry, defeat and unrelated stage never unlock Kair', () => {
  const profile = selectPermanentHero(createProfileV2(), 'hero_slot_2');
  const defeated = settleVerifiedCampaignResult(profile, {
    resultVersion: 1,
    attemptId: 'stage-3-loss',
    stageId: 3,
    outcome: 'defeat'
  });
  assert.deepEqual(defeated.unlockedCompanionIds, ['sentinel', 'ember', 'healer']);
  assert.deepEqual(defeated.ledgers.firstClearStageIds, []);
  assert.deepEqual(defeated.ledgers.rewardReceiptIds, ['stage-3-loss']);

  const technicalBoss = settleVerifiedCampaignResult(defeated, {
    resultVersion: 1,
    attemptId: 'technical-stage-2',
    stageId: 2,
    outcome: 'victory'
  });
  assert.equal(technicalBoss.unlockedCompanionIds.includes('ash'), false);
  assert.equal(technicalBoss.unlockedCompanionIds.includes('control'), false);
  assert.deepEqual(technicalBoss.ledgers.unlockReceiptIds, []);
});

test('G2R-F03: first story boss stage 10 victory unlocks controller once', () => {
  let profile = selectPermanentHero(createProfileV2(), 'hero_slot_3');
  profile = settleVerifiedCampaignResult(profile, {
    resultVersion: 1,
    attemptId: 'stage-3-first',
    stageId: 3,
    outcome: 'victory'
  });
  const defeated = settleVerifiedCampaignResult(profile, {
    resultVersion: 1,
    attemptId: 'story-boss-loss',
    stageId: 10,
    outcome: 'defeat'
  });
  assert.equal(defeated.unlockedCompanionIds.includes('control'), false);
  assert.equal(defeated.ledgers.firstClearStageIds.includes('stage:10'), false);
  profile = defeated;
  profile = settleVerifiedCampaignResult(profile, {
    resultVersion: 1,
    attemptId: 'story-boss-first',
    stageId: 10,
    outcome: 'victory'
  });
  assert.deepEqual(profile.unlockedCompanionIds, COMPANION_IDS);
  assert.deepEqual(profile.party, ['sentinel', 'ember', 'healer']);
  assert.deepEqual(profile.ledgers.firstClearStageIds, ['stage:3', 'stage:10']);
  assert.deepEqual(profile.ledgers.unlockReceiptIds,
    ['stage_3_first_clear', 'first_story_boss_first_clear']);
  assert.equal(validateProfileV2(profile), true);

  const replay = settleVerifiedCampaignResult(profile, {
    resultVersion: 1,
    attemptId: 'story-boss-replay',
    stageId: 10,
    outcome: 'victory'
  });
  assert.deepEqual(replay.ledgers.unlockReceiptIds, profile.ledgers.unlockReceiptIds);
  assert.deepEqual(replay.unlockedCompanionIds, profile.unlockedCompanionIds);
});

test('G2R-F03: result contract rejects malformed, stale and conflicting attempts', () => {
  const profile = selectPermanentHero(createProfileV2(), 'hero_slot_4');
  const invalid = [
    null,
    {},
    { resultVersion: 2, attemptId: 'a', stageId: 3, outcome: 'victory' },
    { resultVersion: 1, attemptId: '', stageId: 3, outcome: 'victory' },
    { resultVersion: 1, attemptId: 'a', stageId: 0, outcome: 'victory' },
    { resultVersion: 1, attemptId: 'a', stageId: 51, outcome: 'victory' },
    { resultVersion: 1, attemptId: 'a', stageId: 3, outcome: 'abandoned' },
    { resultVersion: 1, attemptId: 'a', stageId: 3, outcome: 'victory', milestone: 'forged' }
  ];
  for (const event of invalid) assert.strictEqual(settleVerifiedCampaignResult(profile, event), profile);

  const loss = settleVerifiedCampaignResult(profile, {
    resultVersion: 1,
    attemptId: 'immutable-attempt',
    stageId: 3,
    outcome: 'defeat'
  });
  assert.strictEqual(settleVerifiedCampaignResult(loss, {
    resultVersion: 1,
    attemptId: 'immutable-attempt',
    stageId: 3,
    outcome: 'victory'
  }), loss);

  const fullLedger = {
    ...profile,
    ledgers: {
      ...profile.ledgers,
      rewardReceiptIds: Array.from({ length: 10000 }, (_, index) => `attempt-${index}`)
    }
  };
  assert.equal(validateProfileV2(fullLedger), true);
  assert.strictEqual(settleVerifiedCampaignResult(fullLedger, {
    resultVersion: 1,
    attemptId: 'overflow-attempt',
    stageId: 3,
    outcome: 'defeat'
  }), fullLedger);
});

test('G2R-F03: all three companion slots accept unlocked units and reject locked or fight changes', () => {
  let profile = selectPermanentHero(createProfileV2(), 'hero_slot_1');
  profile = settleVerifiedCampaignResult(profile, {
    resultVersion: 1,
    attemptId: 'stage-3-first',
    stageId: 3,
    outcome: 'victory'
  });
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
