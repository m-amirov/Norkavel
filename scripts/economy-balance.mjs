// Economy Balance 0.1: CANDIDATE DATA ONLY, not production game rules.
// All amounts/timings require owner and gameplay balance approval.
// Run: node scripts/economy-balance.mjs --json
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const VERSION = 'economy-balance-0.1-CANDIDATE';
export const HERO_LEVEL_CAP = 16;
export const STAGES = 50;
export const XP_REPLAY_RATIO = 0.40; // proposed, NOT owner-approved
export const GOLD_REPLAY_RATIO = 0.50; // proposed, NOT owner-approved
export const START_COMPANIONS = Object.freeze(['ard', 'mira', 'elira']);
export const ALL_COMPANIONS = Object.freeze(['ard', 'mira', 'elira', 'kair', 'ice']);

function positiveStage(stage) {
  if (!Number.isInteger(stage) || stage < 1 || stage > STAGES) throw new RangeError('stage must be 1..50');
}
function positiveCompanionLevel(level) {
  if (!Number.isInteger(level) || level < 1) throw new RangeError('companion level must be >=1');
}

export function xpToNextLevel(level) {
  if (!Number.isInteger(level) || level < 1 || level >= HERO_LEVEL_CAP) {
    throw new RangeError('XP next level is defined only for level 1..15');
  }
  const k = level - 1;
  return 40 + 6 * k + Math.ceil(13 * k * k / 4);
}
export const XP_TO_NEXT = Object.freeze(Array.from({ length: 15 }, (_, i) => xpToNextLevel(i + 1)));
export const XP_THRESHOLDS = Object.freeze(
  XP_TO_NEXT.reduce((arr, next) => [...arr, arr[arr.length - 1] + next], [0])
); // index 0 is level 1, index 15 is level 16.

export function heroLevelForXp(xp) {
  if (!Number.isSafeInteger(xp) || xp < 0) throw new RangeError('hero XP must be a nonnegative safe integer');
  let level = 1;
  while (level < HERO_LEVEL_CAP && xp >= XP_THRESHOLDS[level]) level++;
  return level;
}
export function stageFirstClearReward(stage) {
  positiveStage(stage);
  const chapterBoss = stage % 10 === 0 ? stage / 10 : 0;
  const baseXp = 12 + 3 * stage;
  const baseGold = 32 + 8 * stage;
  const bossBonusXp = chapterBoss ? 25 * chapterBoss : 0;
  const bossBonusGold = chapterBoss ? 80 * chapterBoss : 0;
  return Object.freeze({
    stage, isBoss: chapterBoss > 0, baseXp, baseGold,
    bossBonusXp, bossBonusGold,
    xp: baseXp + bossBonusXp, gold: baseGold + bossBonusGold
  });
}
export function stageReplayReward(stage) {
  positiveStage(stage);
  const first = stageFirstClearReward(stage);
  // Replay does NOT grant one-time boss/milestone bonuses, including companion unlocks.
  return Object.freeze({
    stage, xp: Math.max(1, Math.round(first.baseXp * XP_REPLAY_RATIO)),
    gold: Math.max(1, Math.round(first.baseGold * GOLD_REPLAY_RATIO)),
    firstClearMilestone: false
  });
}
// Pure reward policy for isolated arithmetic checks. Real firstClear entitlement,
// result provenance and exactly-once attempt receipts belong to G2-R runtime.
export function battleReward(stage, outcome, firstClear = false) {
  positiveStage(stage);
  if (['defeat', 'abandoned', 'invalid'].includes(outcome)) {
    return Object.freeze({ stage, outcome, xp: 0, gold: 0, firstClearMilestone: false });
  }
  if (outcome !== 'victory') throw new RangeError('Invalid battle outcome');
  if (typeof firstClear !== 'boolean') throw new TypeError('firstClear must be boolean');
  const reward = firstClear ? stageFirstClearReward(stage) : stageReplayReward(stage);
  return Object.freeze({
    stage, outcome, xp: reward.xp, gold: reward.gold,
    firstClearMilestone: firstClear
  });
}
export function companionUpgradeCost(fromLevel) {
  positiveCompanionLevel(fromLevel);
  return 45 + 12 * fromLevel + 3 * fromLevel * fromLevel;
}
export function companionCostToLevel(targetLevel) {
  positiveCompanionLevel(targetLevel);
  let sum = 0;
  for (let level = 1; level < targetLevel; level++) sum += companionUpgradeCost(level);
  return sum;
}
export function scenarioReplayCount(mode, stage) {
  positiveStage(stage);
  if (mode === 'normal') return 0;
  if (mode === 'moderate') return stage % 3 === 0 ? 1 : 0;
  if (mode === 'intensive') return 3;
  throw new RangeError('Unknown simulation mode');
}
export function simulateScenario(mode) {
  const rows = [];
  let lifetimeXp = 0, earnedGold = 0, wins = 0;
  let unlockUltimateAtStage = null, maxLevelAtStage = null;
  for (let stage = 1; stage <= STAGES; stage++) {
    const first = stageFirstClearReward(stage);
    const replay = stageReplayReward(stage);
    const repeats = scenarioReplayCount(mode, stage);
    lifetimeXp += first.xp + replay.xp * repeats;
    earnedGold += first.gold + replay.gold * repeats;
    wins += 1 + repeats;
    const heroLevel = heroLevelForXp(lifetimeXp);
    if (heroLevel >= 5 && unlockUltimateAtStage === null) unlockUltimateAtStage = stage;
    if (heroLevel === HERO_LEVEL_CAP && maxLevelAtStage === null) maxLevelAtStage = stage;
    rows.push({
      stage, chapter: Math.ceil(stage / 10), boss: first.isBoss,
      firstXp: first.xp, firstGold: first.gold,
      replayXp: replay.xp, replayGold: replay.gold, repeats,
      lifetimeXp, earnedGold, heroLevel, wins
    });
  }
  return {
    mode, totalFirstClears: STAGES, totalReplays: wins - STAGES,
    totalWins: wins, lifetimeXp, grossGold: earnedGold,
    ultimateUnlockedAtStage: unlockUltimateAtStage,
    maxHeroLevelAtStage: maxLevelAtStage, rows
  };
}
// Simulation-only player spending strategies. Actual game NEVER auto-upgrades companions.
export function simulateCompanionBudget(scenario, strategy = 'spreadFive') {
  if (!scenario || !Array.isArray(scenario.rows) || scenario.rows.length !== STAGES) {
    throw new TypeError('A complete scenario is required');
  }
  if (!['spreadFive', 'focusThree', 'save'].includes(strategy)) throw new RangeError('Invalid spending strategy');
  const levels = { ard: 1, mira: 1, elira: 1, kair: 0, ice: 0 }; // 0 = locked
  let balance = 0, purchases = 0, spent = 0;
  for (const row of scenario.rows) {
    balance += row.firstGold + row.repeats * row.replayGold;
    if (row.stage === 3) levels.kair = 1;
    if (row.stage === 10) levels.ice = 1;
    if (strategy === 'save') continue;
    const names = strategy === 'focusThree' ? START_COMPANIONS : ALL_COMPANIONS;
    while (true) {
      const options = names.filter(name => levels[name] > 0)
        .map(name => ({ name, cost: companionUpgradeCost(levels[name]) }))
        .sort((a, b) => a.cost - b.cost || names.indexOf(a.name) - names.indexOf(b.name));
      if (!options.length || options[0].cost > balance) break;
      const next = options[0];
      balance -= next.cost; spent += next.cost; purchases++;
      levels[next.name]++;
    }
  }
  return { strategy, levels, purchases, spentGold: spent, remainingGold: balance,
    accountedGold: spent + balance };
}
export function buildBalanceReport() {
  const scenarios = ['normal', 'moderate', 'intensive'].map(simulateScenario);
  return {
    status: 'PROPOSED_NUMBERS_NOT_APPROVED',
    version: VERSION,
    ownerConfirmed: {
      heroStartLevel: 1, heroMaxLevel: 16, ultimateUnlockLevel: 5,
      choices: 15, replayXpReduced: true, defeatXp: 0, companionXp: 0
    },
    thresholds: XP_TO_NEXT.map((toNext, i) => ({
      fromLevel: i + 1, toLevel: i + 2, xpToNext: toNext, totalXp: XP_THRESHOLDS[i + 1]
    })),
    totalHeroXpForLevel16: XP_THRESHOLDS[15],
    stageRewards: Array.from({ length: STAGES }, (_, i) => ({
      ...stageFirstClearReward(i + 1), replay: stageReplayReward(i + 1)
    })),
    companionUpgradeCosts: [2, 3, 5, 8, 10, 12, 14, 16].map(level => ({
      targetLevel: level, perCompanionGold: companionCostToLevel(level),
      threeCompanionsGold: 3 * companionCostToLevel(level),
      fiveCompanionsGold: 5 * companionCostToLevel(level)
    })),
    scenarios: scenarios.map(s => ({
      ...s,
      spendFocusThree: simulateCompanionBudget(s, 'focusThree'),
      spendSpreadFive: simulateCompanionBudget(s, 'spreadFive')
    }))
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildBalanceReport();
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    process.stdout.write('CANDIDATE economy only; NOT owner-approved or runtime-ready\n');
    process.stdout.write('Hero level 16 cumulative XP: ' + report.totalHeroXpForLevel16 + '\n');
    for (const s of report.scenarios) {
      process.stdout.write(
        s.mode + ': level5 stage ' + s.ultimateUnlockedAtStage
        + ', level16 stage ' + s.maxHeroLevelAtStage
        + ', wins ' + s.totalWins + ', XP ' + s.lifetimeXp
        + ', gross gold ' + s.grossGold + '\n'
      );
    }
  }
}
