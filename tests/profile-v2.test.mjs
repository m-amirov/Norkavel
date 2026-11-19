import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../src/combat.mjs';
import {
  COMPANION_IDS,
  HERO_IDS,
  createProfileV2,
  prepareLegacyProfileV2,
  selectPermanentHero,
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
