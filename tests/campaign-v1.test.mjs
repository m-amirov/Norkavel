import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPAIGN_V1,
  arriveAtCampaignStage,
  beginPreviewedCampaignAttempt,
  cancelCampaignTravel,
  createCampaignNavigation,
  getCampaignNodeState,
  selectCampaignStage,
  validateCampaignCatalog,
  validateCampaignNavigation
} from '../src/campaign-v1.mjs';
import {
  createProfileV2,
  selectPermanentHero,
  settleVerifiedCampaignResult
} from '../src/profile-v2.mjs';

const TEST_XP_POLICY = Object.freeze({
  policyVersion: 1,
  policyId: 'campaign-test-xp-v1',
  xpThresholds: Object.freeze(Array.from({ length: 15 }, (_, index) =>
    (index + 1) * (index + 2) * 5 / 2)),
  firstClearXp: Object.freeze(Array.from({ length: 50 }, (_, index) => 12 + index)),
  replayXp: Object.freeze(Array.from({ length: 50 }, () => 3))
});

function selectedProfile() {
  return selectPermanentHero(createProfileV2(), 'hero_slot_1');
}

function win(profile) {
  const attempt = profile.campaignAttempt;
  return settleVerifiedCampaignResult(profile, {
    resultVersion: 1,
    attemptSequence: attempt.sequence,
    attemptId: attempt.attemptId,
    outcome: 'victory'
  }, TEST_XP_POLICY);
}

test('G2R-C01: catalog is exactly five linear chapters and fifty stable stages', () => {
  assert.equal(validateCampaignCatalog(CAMPAIGN_V1), true);
  assert.equal(CAMPAIGN_V1.campaignVersion, 1);
  assert.equal(CAMPAIGN_V1.chapters.length, 5);
  assert.equal(CAMPAIGN_V1.stages.length, 50);
  assert.deepEqual(CAMPAIGN_V1.chapters.map(chapter => chapter.mapId), [
    'map.chapter-01', 'map.chapter-02', 'map.chapter-03', 'map.chapter-04', 'map.chapter-05'
  ]);
  assert.deepEqual(CAMPAIGN_V1.stages.filter(stage => stage.isBoss).map(stage => stage.number),
    [10, 20, 30, 40, 50]);
  assert.equal(new Set(CAMPAIGN_V1.stages.map(stage => stage.id)).size, 50);
  assert.equal(new Set(CAMPAIGN_V1.stages.map(stage => stage.encounterId)).size, 50);
  assert.equal(new Set(CAMPAIGN_V1.stages.map(stage => stage.backgroundId)).size, 50);
  assert.equal(new Set(CAMPAIGN_V1.stages.map(stage => stage.firstClearClaimId)).size, 50);
  assert.deepEqual(CAMPAIGN_V1.chapters[1].stageIds,
    Array.from({ length: 10 }, (_, index) => `stage-${String(index + 11).padStart(3, '0')}`));
});

test('G2R-C01: catalog validator rejects gaps, branches, duplicate art and misplaced bosses', () => {
  const clone = structuredClone(CAMPAIGN_V1);
  const invalid = [
    { ...clone, stages: clone.stages.slice(0, 49) },
    { ...clone, stages: clone.stages.map(stage => stage.number === 11 ? { ...stage, previousStageId: 'stage-009' } : stage) },
    { ...clone, stages: clone.stages.map(stage => stage.number === 2 ? { ...stage, backgroundId: 'bg.stage-001' } : stage) },
    { ...clone, stages: clone.stages.map(stage => stage.number === 9 ? { ...stage, isBoss: true } : stage) }
  ];
  for (const value of invalid) assert.equal(validateCampaignCatalog(value), false);
});

test('G2R-C01: locked nodes cannot travel and available node arrives at matching preview without fight', () => {
  const profile = selectedProfile();
  const navigation = createCampaignNavigation();
  assert.equal(validateCampaignNavigation(navigation), true);
  assert.equal(getCampaignNodeState(profile, navigation, 'stage-001'), 'AVAILABLE');
  assert.equal(getCampaignNodeState(profile, navigation, 'stage-002'), 'LOCKED');
  assert.strictEqual(selectCampaignStage(navigation, profile, 'stage-002'), navigation);

  const travelling = selectCampaignStage(navigation, profile, 'stage-001');
  assert.equal(travelling.phase, 'travelling');
  assert.equal(travelling.targetStageId, 'stage-001');
  assert.equal(profile.campaignAttempt, null);
  const preview = arriveAtCampaignStage(travelling);
  assert.equal(preview.phase, 'stage_preview');
  assert.equal(preview.previewStageId, 'stage-001');
  assert.equal(preview.lastVisitedStageId, 'stage-001');
  assert.equal(profile.campaignAttempt, null, 'arrival must never start combat');
});

test('G2R-C01: rapid taps have one target and cancelled travel cannot advance progress', () => {
  const profile = selectedProfile();
  const map = createCampaignNavigation();
  const travelling = selectCampaignStage(map, profile, 'stage-001');
  assert.strictEqual(selectCampaignStage(travelling, profile, 'stage-001'), travelling);
  assert.strictEqual(selectCampaignStage(travelling, profile, 'stage-002'), travelling);
  const cancelled = cancelCampaignTravel(travelling);
  assert.equal(cancelled.phase, 'chapter_map');
  assert.equal(cancelled.targetStageId, null);
  assert.equal(cancelled.previewStageId, null);
  assert.deepEqual(profile.ledgers.firstClearStageIds, []);
  assert.equal(profile.campaignAttempt, null);
});

test('G2R-C01: explicit fight uses preview stage and replay never bypasses next locked stage', () => {
  let profile = selectedProfile();
  let navigation = arriveAtCampaignStage(selectCampaignStage(createCampaignNavigation(), profile, 'stage-001'));
  profile = beginPreviewedCampaignAttempt(navigation, profile, 'pve:1:first');
  assert.equal(profile.campaignAttempt.stageId, 1);
  assert.equal(profile.campaignAttempt.rewardClass, 'first_clear');
  profile = win(profile);

  navigation = arriveAtCampaignStage(selectCampaignStage(navigation, profile, 'stage-001'));
  const replay = beginPreviewedCampaignAttempt(navigation, profile, 'pve:2:replay');
  assert.equal(replay.campaignAttempt.stageId, 1);
  assert.equal(replay.campaignAttempt.rewardClass, 'replay');
  assert.equal(getCampaignNodeState(profile, navigation, 'stage-001'), 'CURRENT');
  assert.equal(getCampaignNodeState(profile, navigation, 'stage-002'), 'AVAILABLE');
  assert.equal(getCampaignNodeState(profile, navigation, 'stage-003'), 'LOCKED');

  assert.strictEqual(beginPreviewedCampaignAttempt(
    { ...navigation, previewStageId: 'stage-003' }, profile, 'pve:2:forged'), profile);
});

test('G2R-C01: chapter access follows boss first clears and stage 50 closes progression', () => {
  let profile = selectedProfile();
  let navigation = createCampaignNavigation();
  for (let number = 1; number <= 50; number++) {
    const stageId = `stage-${String(number).padStart(3, '0')}`;
    navigation = arriveAtCampaignStage(selectCampaignStage(navigation, profile, stageId));
    profile = beginPreviewedCampaignAttempt(navigation, profile, `pve:${number}:clear`);
    profile = win(profile);
    if (number === 10) {
      assert.equal(getCampaignNodeState(profile, navigation, 'stage-011'), 'AVAILABLE');
      assert.equal(CAMPAIGN_V1.stages[10].chapterId, 'chapter-02');
    }
  }
  assert.equal(profile.ledgers.firstClearStageIds.length, 50);
  assert.equal(getCampaignNodeState(profile, navigation, 'stage-050'), 'CURRENT');
  assert.equal(CAMPAIGN_V1.stages.at(-1).nextStageId, null);
});
