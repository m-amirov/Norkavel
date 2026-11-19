import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VERSION, HERO_LEVEL_CAP, STAGES, XP_TO_NEXT, XP_THRESHOLDS,
  xpToNextLevel, heroLevelForXp, stageFirstClearReward, stageReplayReward,
  companionUpgradeCost, companionCostToLevel, scenarioReplayCount,
  simulateScenario, simulateCompanionBudget, buildBalanceReport
} from '../scripts/economy-balance.mjs';

// These tests validate PROPOSED arithmetic only. They are NOT proof that the
// legacy G2 battle runtime implements 50 stages, XP, leveling, or purchases.
test('proposed XP curve is 15 increasing positive intervals and caps at level 16', () => {
  assert.match(VERSION, /CANDIDATE/);
  assert.equal(HERO_LEVEL_CAP, 16);
  assert.equal(XP_TO_NEXT.length, 15);
  assert.equal(XP_THRESHOLDS.length, 16);
  assert.equal(XP_THRESHOLDS[0], 0);
  for (let i = 0; i < 15; i++) {
    assert.equal(xpToNextLevel(i + 1), XP_TO_NEXT[i]);
    assert.ok(XP_TO_NEXT[i] > 0);
    assert.equal(XP_THRESHOLDS[i + 1], XP_THRESHOLDS[i] + XP_TO_NEXT[i]);
    if (i > 0) assert.ok(XP_TO_NEXT[i] > XP_TO_NEXT[i - 1]);
  }
  assert.equal(XP_THRESHOLDS[15], 4534);
  assert.throws(() => xpToNextLevel(0), RangeError);
  assert.throws(() => xpToNextLevel(16), RangeError);
});
test('new hero starts at 1; level thresholds and level-16 hard cap are deterministic', () => {
  assert.equal(heroLevelForXp(0), 1);
  assert.equal(heroLevelForXp(39), 1);
  assert.equal(heroLevelForXp(40), 2);
  assert.equal(heroLevelForXp(XP_THRESHOLDS[3] - 1), 3);
  assert.equal(heroLevelForXp(XP_THRESHOLDS[3]), 4);
  assert.equal(heroLevelForXp(XP_THRESHOLDS[15] - 1), 15);
  assert.equal(heroLevelForXp(XP_THRESHOLDS[15]), 16);
  assert.equal(heroLevelForXp(Number.MAX_SAFE_INTEGER), 16);
  assert.throws(() => heroLevelForXp(-1), RangeError);
  assert.throws(() => heroLevelForXp(1.5), RangeError);
});
test('all 50 stage rewards are positive; replay is smaller and excludes boss first-clear bonus', () => {
  assert.equal(STAGES, 50);
  for (let stage = 1; stage <= 50; stage++) {
    const full = stageFirstClearReward(stage);
    const replay = stageReplayReward(stage);
    assert.ok(full.xp > replay.xp && replay.xp > 0, 'XP stage ' + stage);
    assert.ok(full.gold > replay.gold && replay.gold > 0, 'gold stage ' + stage);
    assert.equal(full.isBoss, stage % 10 === 0);
    assert.equal(replay.firstClearMilestone, false);
    if (full.isBoss) {
      assert.equal(full.bossBonusXp, 25 * (stage / 10));
      assert.equal(full.bossBonusGold, 80 * (stage / 10));
      assert.ok(replay.xp < full.xp - full.bossBonusXp);
    } else {
      assert.equal(full.bossBonusXp, 0);
      assert.equal(full.bossBonusGold, 0);
    }
  }
  assert.deepEqual(
    { xp: stageFirstClearReward(10).xp, gold: stageFirstClearReward(10).gold },
    { xp: 67, gold: 192 }
  );
  assert.deepEqual(
    { xp: stageReplayReward(10).xp, gold: stageReplayReward(10).gold },
    { xp: 17, gold: 56 }
  );
  assert.throws(() => stageFirstClearReward(0), RangeError);
  assert.throws(() => stageReplayReward(51), RangeError);
});
test('companion level costs rise independently; no companion XP is modeled', () => {
  assert.equal(companionUpgradeCost(1), 60);
  assert.equal(companionUpgradeCost(2), 81);
  assert.equal(companionCostToLevel(1), 0);
  assert.equal(companionCostToLevel(3), 141);
  assert.equal(companionCostToLevel(10), 1800);
  for (let level = 2; level < 20; level++)
    assert.ok(companionUpgradeCost(level) > companionUpgradeCost(level - 1));
  assert.throws(() => companionUpgradeCost(0), RangeError);
  assert.throws(() => companionCostToLevel(1.5), RangeError);
});
test('three replay intensities use only valid previously cleared stages', () => {
  for (let stage = 1; stage <= 50; stage++) {
    assert.equal(scenarioReplayCount('normal', stage), 0);
    assert.equal(scenarioReplayCount('moderate', stage), stage % 3 === 0 ? 1 : 0);
    assert.equal(scenarioReplayCount('intensive', stage), 3);
  }
  assert.throws(() => scenarioReplayCount('unknown', 1), RangeError);
});
test('normal path has 50 first clears and reaches ultimate before stage 10', () => {
  const s = simulateScenario('normal');
  assert.equal(s.rows.length, 50);
  assert.equal(s.totalFirstClears, 50);
  assert.equal(s.totalReplays, 0);
  assert.equal(s.totalWins, 50);
  assert.equal(s.ultimateUnlockedAtStage, 9);
  assert.equal(s.maxHeroLevelAtStage, 50);
  assert.equal(s.lifetimeXp, 4800);
  assert.equal(s.grossGold, 13000);
  assert.equal(s.rows[9].heroLevel, 5);
  assert.equal(s.rows[19].heroLevel, 8);
  assert.equal(s.rows[29].heroLevel, 11);
  assert.equal(s.rows[39].heroLevel, 14);
  assert.equal(s.rows[49].heroLevel, 16);
});
test('moderate repeats bring cap to 46 with 66 real wins; intensive to 33 after far more battles', () => {
  const moderate = simulateScenario('moderate');
  const intensive = simulateScenario('intensive');
  assert.equal(moderate.totalReplays, 16);
  assert.equal(moderate.totalWins, 66);
  assert.equal(moderate.ultimateUnlockedAtStage, 9);
  assert.equal(moderate.maxHeroLevelAtStage, 46);
  assert.equal(moderate.lifetimeXp, 5366);
  assert.equal(moderate.grossGold, 14888);
  assert.equal(intensive.totalReplays, 150);
  assert.equal(intensive.totalWins, 200);
  assert.equal(intensive.ultimateUnlockedAtStage, 6);
  assert.equal(intensive.maxHeroLevelAtStage, 33);
  assert.equal(intensive.lifetimeXp, 10110);
  assert.equal(intensive.grossGold, 30700);
  for (const s of [moderate, intensive])
    assert.equal(s.rows[s.rows.length - 1].heroLevel, 16);
});
test('replay and boss grant are not silently available on defeat', () => {
  const full = stageFirstClearReward(50);
  const replay = stageReplayReward(50);
  assert.ok(replay.xp < full.baseXp);
  assert.ok(replay.gold < full.baseGold);
  // This read-only spreadsheet-like simulator intentionally has NO
  // defeat transaction: approved defeat rewards are 0 XP and no first-clear.
  // Runtime defeat behavior must be tested separately in G2-R.
});
test('gold budget is conserved under optional, simulated player spending', () => {
  for (const mode of ['normal', 'moderate', 'intensive']) {
    const s = simulateScenario(mode);
    const save = simulateCompanionBudget(s, 'save');
    const focused = simulateCompanionBudget(s, 'focusThree');
    const spread = simulateCompanionBudget(s, 'spreadFive');
    assert.equal(save.remainingGold, s.grossGold);
    assert.equal(save.spentGold, 0);
    assert.equal(save.purchases, 0);
    for (const budget of [focused, spread]) {
      assert.equal(budget.accountedGold, s.grossGold);
      assert.equal(budget.spentGold + budget.remainingGold, s.grossGold);
      assert.ok(budget.remainingGold >= 0);
      assert.ok(budget.purchases > 0);
      for (const level of Object.values(budget.levels)) assert.ok(Number.isInteger(level) && level >= 1);
    }
    assert.equal(focused.levels.kair, 1); // focusThree never buys reserve levels
    assert.equal(focused.levels.ice, 1);
  }
});
test('full report exposes 50 reward rows, 15 XP thresholds, and all 3 scenario paths', () => {
  const report = buildBalanceReport();
  assert.equal(report.status, 'PROPOSED_NUMBERS_NOT_APPROVED');
  assert.equal(report.thresholds.length, 15);
  assert.equal(report.stageRewards.length, 50);
  assert.equal(report.scenarios.length, 3);
  assert.deepEqual(report.scenarios.map(s => s.mode), ['normal', 'moderate', 'intensive']);
  assert.equal(report.totalHeroXpForLevel16, 4534);
  assert.equal(report.ownerConfirmed.defeatXp, 0);
  assert.equal(report.ownerConfirmed.companionXp, 0);
  assert.equal(report.ownerConfirmed.choices, 15);
});
