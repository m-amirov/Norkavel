import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../src/combat.mjs';
import { createProfileV2, prepareLegacyProfileV2, selectPermanentHero } from '../src/profile-v2.mjs';
import {
  cancelHeroConfirmation,
  commitHeroSelection,
  createHeroOnboardingState,
  previewHero,
  requestHeroConfirmation,
  resolveHeroSelectionCommit,
  resolveStaleHeroSelection
} from '../src/hero-onboarding-v1.mjs';

test('G2R-F02b: new and prepared legacy profiles begin pending without selecting a hero', () => {
  const legacy = prepareLegacyProfileV2({
    schemaVersion: 1, gameId: 'norkavel', gameVersion: '0.1.0', revision: 4,
    state: initialState()
  });
  for (const [source, profile] of [['new', createProfileV2()], ['legacy', legacy]]) {
    const state = createHeroOnboardingState({ profile, revision: null, source });
    assert.equal(state.status, 'selecting');
    assert.equal(state.previewHeroId, null);
    assert.equal(state.profile.selectedHeroId, null);
  }
});

test('G2R-F02b: preview and cancel are pure and never create a permanent choice', () => {
  const profile = createProfileV2();
  const initial = createHeroOnboardingState({ profile, revision: null, source: 'new' });
  const previewed = previewHero(initial, 'hero_slot_3');
  assert.equal(previewed.previewHeroId, 'hero_slot_3');
  assert.equal(previewed.profile.selectedHeroId, null);
  assert.equal(profile.selectedHeroId, null);
  const confirming = requestHeroConfirmation(previewed);
  assert.equal(confirming.status, 'confirming');
  assert.equal(confirming.confirmHeroId, 'hero_slot_3');
  const cancelled = cancelHeroConfirmation(confirming);
  assert.equal(cancelled.status, 'selecting');
  assert.equal(cancelled.previewHeroId, 'hero_slot_3');
  assert.equal(cancelled.profile.selectedHeroId, null);
});

test('G2R-F02b: explicit confirmation produces one CAS command and success locks the hero', () => {
  const initial = createHeroOnboardingState({ profile: createProfileV2(), revision: null, source: 'new' });
  const confirming = requestHeroConfirmation(previewHero(initial, 'hero_slot_2'));
  const { state: committing, command } = commitHeroSelection(confirming);
  assert.equal(committing.status, 'committing');
  assert.equal(command.expectedRevision, null);
  assert.equal(command.profile.selectedHeroId, 'hero_slot_2');
  assert.equal(command.profile.heroSelection.confirmedOnce, true);
  assert.equal(confirming.profile.selectedHeroId, null);
  const complete = resolveHeroSelectionCommit(committing, {
    ok: true, revision: 0, receipt: { revision: 0, commitId: 'commit-1' }
  });
  assert.equal(complete.status, 'complete');
  assert.equal(complete.source, 'save_v2');
  assert.equal(complete.revision, 0);
  assert.equal(complete.profile.selectedHeroId, 'hero_slot_2');
  assert.equal(complete.noticeCode, 'SELECTION_COMMITTED');
  assert.strictEqual(previewHero(complete, 'hero_slot_1'), complete);
});

test('G2R-F02b: stale commit resolves to the actual immutable winner without overwrite', () => {
  const initial = createHeroOnboardingState({ profile: createProfileV2(), revision: null, source: 'new' });
  const { state: committing } = commitHeroSelection(
    requestHeroConfirmation(previewHero(initial, 'hero_slot_1')));
  const stale = resolveHeroSelectionCommit(committing, {
    ok: false, code: 'STALE_REVISION', actualRevision: 0
  });
  assert.equal(stale.status, 'stale');
  const winner = selectPermanentHero(createProfileV2(), 'hero_slot_4');
  const resolved = resolveStaleHeroSelection(stale, { revision: 0, profile: winner });
  assert.equal(resolved.status, 'complete');
  assert.equal(resolved.source, 'save_v2');
  assert.equal(resolved.profile.selectedHeroId, 'hero_slot_4');
  assert.equal(resolved.noticeCode, 'SELECTION_COMMITTED_ELSEWHERE');
});

test('G2R-F02b: invalid hero, premature commit and malformed commit result fail closed', () => {
  const state = createHeroOnboardingState({ profile: createProfileV2(), revision: null, source: 'new' });
  assert.strictEqual(previewHero(state, 'unknown'), state);
  assert.strictEqual(requestHeroConfirmation(state), state);
  assert.equal(commitHeroSelection(state), null);
  const { state: committing } = commitHeroSelection(
    requestHeroConfirmation(previewHero(state, 'hero_slot_1')));
  assert.equal(resolveHeroSelectionCommit(committing, { ok: true, revision: -1 }), null);
  assert.equal(resolveStaleHeroSelection({ ...state, status: 'stale' }, null), null);
});
