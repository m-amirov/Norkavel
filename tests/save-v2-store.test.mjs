import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../src/combat.mjs';
import { createProfileV2, selectPermanentHero } from '../src/profile-v2.mjs';
import {
  SAVE_V2_FORMAT_VERSION,
  inspectSaveV2Record,
  validateSaveV2Transition,
  openSaveV2Store,
  readLegacyProfileCandidate
} from '../src/save-v2-store.mjs';

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    dump(key) { return values.get(key); }
  };
}

function legacySnapshot(overrides = {}) {
  return {
    schemaVersion: 1,
    gameId: 'norkavel',
    gameVersion: '0.1.0',
    revision: 4,
    state: { ...initialState(), ...overrides }
  };
}

test('G2R-S01: Save v2 record requires exact version, revision, commit identity and full valid profile', () => {
  const profile = selectPermanentHero(createProfileV2(), 'hero_slot_2');
  const record = {
    formatVersion: SAVE_V2_FORMAT_VERSION,
    revision: 7,
    commitId: 'commit-00000007-test',
    profile
  };
  const inspected = inspectSaveV2Record(record);
  assert.deepEqual(inspected, record);
  assert.notStrictEqual(inspected, record);
  assert.notStrictEqual(inspected.profile, profile);

  const invalid = [
    { ...record, formatVersion: 2 },
    { ...record, revision: -1 },
    { ...record, revision: Number.MAX_SAFE_INTEGER + 1 },
    { ...record, commitId: '' },
    { ...record, profile: { ...profile, schema: 3 } },
    { ...record, extra: true }
  ];
  for (const value of invalid) assert.equal(inspectSaveV2Record(value), null);
});

test('G2R-F02c regression: Save v2 transition cannot replace or clear a permanent hero', () => {
  const selected = selectPermanentHero(createProfileV2(), 'hero_slot_2');
  assert.equal(validateSaveV2Transition(selected, structuredClone(selected)), true);
  assert.equal(validateSaveV2Transition(selected, { ...selected, selectedHeroId: 'hero_slot_3' }), false);
  assert.equal(validateSaveV2Transition(selected, {
    ...createProfileV2(), gold: selected.gold
  }), false);
  assert.equal(validateSaveV2Transition(null, selected), true, 'first committed selection remains allowed');
});

test('G2R-S01: valid legacy v1 is prepared read-only without selecting hero or minting progression', () => {
  const source = legacySnapshot({
    gold: 155,
    level: 8,
    claimed: [1, 2],
    party: ['sentinel', 'ember', 'ash']
  });
  const raw = JSON.stringify(source);
  const storage = memoryStorage({ 'norkavel.g2.save.v1': raw });
  const result = readLegacyProfileCandidate(storage);
  assert.equal(result.status, 'prepared');
  assert.equal(result.profile.selectedHeroId, null);
  assert.equal(result.profile.heroSelection.selectionRequired, true);
  assert.equal(result.profile.gold, 155);
  assert.equal(result.profile.heroProgress.level, 1);
  assert.equal(result.profile.heroProgress.xp, 0);
  assert.equal(result.profile.heroProgress.pendingSkillChoices, 0);
  assert.deepEqual(result.profile.unlockedCompanionIds, ['sentinel', 'ember', 'healer', 'ash']);
  assert.deepEqual(result.profile.ledgers.firstClearStageIds, []);
  assert.equal(storage.dump('norkavel.g2.save.v1'), raw, 'legacy bytes remain untouched');
});

test('G2R-S01: missing, malformed, oversized and incompatible legacy data fail closed without writes', () => {
  const cases = [
    [memoryStorage(), 'missing'],
    [memoryStorage({ 'norkavel.g2.save.v1': '{' }), 'corrupt'],
    [memoryStorage({ 'norkavel.g2.save.v1': 'x'.repeat(32001) }), 'corrupt'],
    [memoryStorage({ 'norkavel.g2.save.v1': JSON.stringify({ ...legacySnapshot(), schemaVersion: 2 }) }), 'incompatible']
  ];
  for (const [storage, status] of cases) {
    const before = storage.dump('norkavel.g2.save.v1');
    assert.equal(readLegacyProfileCandidate(storage).status, status);
    assert.equal(storage.dump('norkavel.g2.save.v1'), before);
  }
});

test('G2R-S01: denied legacy storage is observable and never treated as missing', () => {
  const denied = { getItem() { throw new Error('denied'); } };
  const result = readLegacyProfileCandidate(denied);
  assert.equal(result.status, 'unavailable');
  assert.match(result.error, /denied/i);
});

test('G2R-S01: missing IndexedDB rejects instead of falling back to unsafe storage', async () => {
  await assert.rejects(openSaveV2Store({ indexedDB: null }), error =>
    error?.code === 'STORAGE_UNAVAILABLE');
});
