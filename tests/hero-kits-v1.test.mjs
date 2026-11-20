import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileV2, selectPermanentHero } from '../src/profile-v2.mjs';
import {
  HERO_KIT_CATALOG_V1,
  resolveHeroSkillEffect,
  validateHeroKitCatalog,
  validateHeroKitPolicy
} from '../src/hero-kits-v1.mjs';

const TEST_POLICY = Object.freeze({
  policyVersion: 1,
  policyId: 'hero-kit-test-v1',
  maxValue: 500,
  maxDurationTicks: 120,
  skills: Object.freeze(Object.fromEntries(HERO_KIT_CATALOG_V1.flatMap(hero =>
    hero.skills.map(skill => [skill.id, Object.freeze({
      primary: Object.freeze(Array.from({ length: skill.rankCap + 1 }, (_, rank) => 10 + rank * 2)),
      secondary: Object.freeze(Array.from({ length: skill.rankCap + 1 }, (_, rank) => 2 + rank)),
      durationTicks: Object.freeze(Array.from({ length: skill.rankCap + 1 }, (_, rank) => 20 + rank * 3))
    })]))))
});

const BATTLE = Object.freeze({
  battleVersion: 1,
  allyIds: Object.freeze(['hero', 'sentinel', 'ember', 'healer']),
  enemies: Object.freeze([
    Object.freeze({
      id: 'boss', isBoss: true, telegraphActive: true, interruptible: true,
      statuses: Object.freeze({ burn: true, bound: true, weakened: true, marked: true })
    }),
    Object.freeze({
      id: 'raider', isBoss: false, telegraphActive: false, interruptible: true,
      statuses: Object.freeze({ burn: false, bound: false, weakened: false, marked: false })
    }),
    Object.freeze({
      id: 'wisp', isBoss: false, telegraphActive: false, interruptible: false,
      statuses: Object.freeze({ burn: true, bound: false, weakened: false, marked: false })
    })
  ])
});

function profileFor(heroId, skillSlot, rank = 1) {
  const selected = selectPermanentHero(createProfileV2(), heroId);
  const level = skillSlot === 'ultimate' ? Math.max(5, rank + 1) : rank + 1;
  const xpThresholds = Array.from({ length: 15 }, (_, index) => 5 * (index + 1) * (index + 2));
  return {
    ...selected,
    heroProgress: {
      ...selected.heroProgress,
      level,
      xp: xpThresholds[level - 2],
      xpPolicyId: 'hero-kit-profile-fixture-v1',
      xpThresholds,
      xpRewardTables: {
        firstClearXp: Array(50).fill(10),
        replayXp: Array(50).fill(5)
      },
      pendingSkillChoices: level - 1 - rank,
      skillRanks: {
        skill1: skillSlot === 'skill1' ? rank : 0,
        skill2: skillSlot === 'skill2' ? rank : 0,
        skill3: skillSlot === 'skill3' ? rank : 0,
        ultimate: skillSlot === 'ultimate' ? rank : 0
      }
    }
  };
}

test('G2R-F02a: catalog fixes four approved roles and sixteen unique 3+ultimate skills', () => {
  assert.equal(validateHeroKitCatalog(HERO_KIT_CATALOG_V1), true);
  assert.deepEqual(HERO_KIT_CATALOG_V1.map(hero => [hero.id, hero.role]), [
    ['hero_slot_1', 'defender'],
    ['hero_slot_2', 'elemental_mage'],
    ['hero_slot_3', 'shadow_duelist'],
    ['hero_slot_4', 'ranger']
  ]);
  assert.deepEqual(HERO_KIT_CATALOG_V1.map(hero => hero.skills.map(skill => skill.slot)),
    Array(4).fill(null).map(() => ['skill1', 'skill2', 'skill3', 'ultimate']));
  assert.equal(new Set(HERO_KIT_CATALOG_V1.flatMap(hero => hero.skills.map(skill => skill.id))).size, 16);
  for (const hero of HERO_KIT_CATALOG_V1) {
    assert.equal(hero.workingNameStatus, 'provisional');
    assert.deepEqual(hero.skills.map(skill => skill.rankCap), [4, 4, 4, 3]);
  }
});

test('G2R-F02a: injected balance policy is complete, finite and bounded', () => {
  assert.equal(validateHeroKitPolicy(TEST_POLICY), true);
  const invalid = [
    { ...TEST_POLICY, maxValue: Infinity },
    { ...TEST_POLICY, skills: { ...TEST_POLICY.skills, 'defender.shield_break': {
      ...TEST_POLICY.skills['defender.shield_break'], primary: [10, 12]
    } } },
    { ...TEST_POLICY, skills: { ...TEST_POLICY.skills, 'mage.fire_circle': {
      ...TEST_POLICY.skills['mage.fire_circle'], secondary: [2, 3, 4, 5, 999]
    } } },
    { ...TEST_POLICY, skills: { ...TEST_POLICY.skills, extra: TEST_POLICY.skills['ranger.aimed_shot'] } }
  ];
  for (const policy of invalid) assert.equal(validateHeroKitPolicy(policy), false);
});

test('G2R-F02a: every approved skill resolves deterministic bounded effect records', () => {
  for (const hero of HERO_KIT_CATALOG_V1) {
    for (const skill of hero.skills) {
      const profile = profileFor(hero.id, skill.slot);
      const command = { effectVersion: 1, skillId: skill.id, targetId: 'boss' };
      const first = resolveHeroSkillEffect(profile, command, BATTLE, TEST_POLICY);
      const second = resolveHeroSkillEffect(profile, command, BATTLE, TEST_POLICY);
      assert.deepEqual(first, second, skill.id);
      assert.equal(first.heroId, hero.id);
      assert.equal(first.skillId, skill.id);
      assert.equal(first.rank, 1);
      assert.ok(first.effects.length >= 1, skill.id);
      for (const effect of first.effects) {
        assert.ok(effect.value === null || Number.isSafeInteger(effect.value));
        assert.ok(effect.durationTicks === null ||
          Number.isSafeInteger(effect.durationTicks) && effect.durationTicks <= TEST_POLICY.maxDurationTicks);
        assert.ok(effect.targetIds.every(id => BATTLE.allyIds.includes(id) || BATTLE.enemies.some(enemy => enemy.id === id)));
      }
    }
  }
});

test('G2R-F02a: conditional counters and combos are observable but bounded', () => {
  const defender = profileFor('hero_slot_1', 'skill1');
  const interrupt = resolveHeroSkillEffect(defender,
    { effectVersion: 1, skillId: 'defender.shield_break', targetId: 'boss' }, BATTLE, TEST_POLICY);
  assert.equal(interrupt.effects.some(effect => effect.type === 'interrupt'), true);
  const noWindow = { ...BATTLE, enemies: BATTLE.enemies.map(enemy =>
    enemy.id === 'boss' ? { ...enemy, telegraphActive: false } : enemy) };
  assert.equal(resolveHeroSkillEffect(defender,
    { effectVersion: 1, skillId: 'defender.shield_break', targetId: 'boss' }, noWindow, TEST_POLICY)
    .effects.some(effect => effect.type === 'interrupt'), false);

  const mage = resolveHeroSkillEffect(profileFor('hero_slot_2', 'skill3'),
    { effectVersion: 1, skillId: 'mage.chain_lightning', targetId: 'boss' }, BATTLE, TEST_POLICY);
  assert.equal(mage.effects.some(effect => effect.type === 'combo_damage'), true);
  assert.ok(mage.effects.filter(effect => effect.type.includes('damage')).length <= BATTLE.enemies.length + 1);

  const duelist = resolveHeroSkillEffect(profileFor('hero_slot_3', 'ultimate'),
    { effectVersion: 1, skillId: 'duelist.night_of_blades', targetId: 'boss' }, BATTLE, TEST_POLICY);
  assert.equal(duelist.effects.filter(effect => effect.type === 'separate_hit').length, 4,
    'night of blades is four bounded hit events');

  const vanish = resolveHeroSkillEffect(profileFor('hero_slot_3', 'skill2'),
    { effectVersion: 1, skillId: 'duelist.vanish', targetId: 'boss' }, BATTLE, TEST_POLICY);
  assert.deepEqual(vanish.effects.map(effect => effect.type), ['evade', 'counter_ready']);

  const aimed = resolveHeroSkillEffect(profileFor('hero_slot_4', 'skill1'),
    { effectVersion: 1, skillId: 'ranger.aimed_shot', targetId: 'raider' }, BATTLE, TEST_POLICY);
  assert.deepEqual(aimed.effects.map(effect => effect.type), ['damage', 'mark']);

  const ranger = resolveHeroSkillEffect(profileFor('hero_slot_4', 'ultimate'),
    { effectVersion: 1, skillId: 'ranger.star_barrage', targetId: 'raider' }, BATTLE, TEST_POLICY);
  assert.deepEqual(ranger.effects.find(effect => effect.type === 'multi_hit').targetIds, ['boss'],
    'marked enemy has deterministic priority');
});

test('G2R-F02a: invalid hero, mismatched skill, rank, early ultimate, target and policy fail closed', () => {
  const profile = profileFor('hero_slot_1', 'skill1');
  const valid = { effectVersion: 1, skillId: 'defender.shield_break', targetId: 'boss' };
  const earlyUltimate = selectPermanentHero(createProfileV2(), 'hero_slot_1');
  const cases = [
    [profile, { ...valid, skillId: 'mage.fire_circle' }, BATTLE, TEST_POLICY],
    [profile, { ...valid, targetId: 'missing' }, BATTLE, TEST_POLICY],
    [profile, { ...valid, extra: true }, BATTLE, TEST_POLICY],
    [{ ...profile, selectedHeroId: 'unknown' }, valid, BATTLE, TEST_POLICY],
    [earlyUltimate, { effectVersion: 1, skillId: 'defender.last_stand', targetId: 'boss' }, BATTLE, TEST_POLICY],
    [profile, valid, { ...BATTLE, enemies: [...BATTLE.enemies, BATTLE.enemies[0]] }, TEST_POLICY],
    [profile, valid, BATTLE, { ...TEST_POLICY, policyId: '' }]
  ];
  for (const args of cases) assert.equal(resolveHeroSkillEffect(...args), null);
});
