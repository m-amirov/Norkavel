import { HERO_KIT_CATALOG_V1 } from '/src/hero-kits-v1.mjs';
import { createProfileV2 } from '/src/profile-v2.mjs';
import { openSaveV2Store, readLegacyProfileCandidate } from '/src/save-v2-store.mjs';
import {
  cancelHeroConfirmation, commitHeroSelection, createHeroOnboardingState,
  previewHero, requestHeroConfirmation, resolveHeroSelectionCommit, resolveStaleHeroSelection
} from '/src/hero-onboarding-v1.mjs';

const $ = id => document.getElementById(id);
const names = Object.fromEntries(HERO_KIT_CATALOG_V1.map(hero => [hero.id, hero.workingName]));
let store = null;
let state = null;
let storageStatus = 'loading';
let portrait = false;

function showError(code, detail = '') {
  storageStatus = code;
  $('onboarding').inert = true;
  $('error-copy').textContent = `${detail || 'Выбор заблокирован, чтобы не перезаписать данные.'} Код: ${code}.`;
  $('error-screen').hidden = false;
}

function render() {
  if (!state) return;
  const selected = state.previewHeroId;
  for (const card of document.querySelectorAll('.hero-card')) {
    card.setAttribute('aria-pressed', String(card.dataset.heroId === selected));
    card.disabled = state.status !== 'selecting' || portrait;
  }
  $('continue-button').disabled = !selected || state.status !== 'selecting' || portrait;
  $('selection-summary').textContent = selected
    ? `${names[selected]} — предварительный выбор. Сохранение ещё не изменено.`
    : 'Выберите карточку, чтобы увидеть решение перед подтверждением.';
  $('save-state').textContent = state.source === 'legacy' ? 'Найден профиль G2 · оригинал сохранён' :
    state.source === 'save_v2' ? `Save v2 · revision ${state.revision}` : 'Новый профиль · ещё не сохранён';
  if (state.status === 'complete') {
    $('result-title').textContent = `${names[state.profile.selectedHeroId]} выбран`;
    $('result-copy').textContent = state.noticeCode === 'SELECTION_COMMITTED_ELSEWHERE'
      ? 'Другой экран уже зафиксировал постоянный выбор. Показан фактически сохранённый герой.'
      : 'Постоянный выбор записан в Save v2. Исходное сохранение G2 не изменено.';
    $('result-screen').hidden = false;
    $('onboarding').inert = true;
  }
}

function reevaluateOrientation() {
  portrait = innerHeight > innerWidth;
  $('turn-device').hidden = !portrait;
  if (portrait && $('confirm-dialog').open) {
    $('confirm-dialog').close('orientation');
    if (state?.status === 'confirming') state = cancelHeroConfirmation(state);
  }
  if (!$('result-screen').hidden || !$('error-screen').hidden) return;
  $('onboarding').inert = portrait;
  render();
}

async function persistSelection() {
  const prepared = commitHeroSelection(state);
  if (!prepared) return;
  state = prepared.state;
  render();
  try {
    const result = await store.compareAndSet(prepared.command.expectedRevision, prepared.command.profile);
    state = resolveHeroSelectionCommit(state, result);
    if (!state) throw new Error('INVALID_COMMIT_RECEIPT');
    if (state.status === 'stale') {
      const record = await store.load();
      state = resolveStaleHeroSelection(state, record);
      if (!state) throw new Error('INVALID_STALE_RECORD');
    }
    storageStatus = state.status;
    render();
  } catch (error) {
    showError(error?.code ?? 'COMMIT_FAILED', 'Запись не выполнена. Существующие данные оставлены без изменений.');
  }
}

for (const card of document.querySelectorAll('.hero-card')) card.addEventListener('click', () => {
  if (portrait || state?.status !== 'selecting') return;
  state = previewHero(state, card.dataset.heroId);
  render();
});

$('continue-button').addEventListener('click', () => {
  if (portrait) return;
  state = requestHeroConfirmation(state);
  if (state.status !== 'confirming') return;
  $('confirm-copy').textContent = `${names[state.confirmHeroId]} станет единственным главным героем этого прохождения. Отменить выбор после записи нельзя.`;
  $('confirm-dialog').showModal();
  render();
});

$('cancel-button').addEventListener('click', () => {
  $('confirm-dialog').close('cancel');
  if (state?.status === 'confirming') { state = cancelHeroConfirmation(state); render(); }
});

$('confirm-button').addEventListener('click', () => {
  if (portrait || state?.status !== 'confirming') return;
  $('confirm-dialog').close('confirm');
  persistSelection();
});

$('confirm-dialog').addEventListener('close', () => {
  if (state?.status === 'confirming') { state = cancelHeroConfirmation(state); render(); }
});

addEventListener('resize', reevaluateOrientation);
addEventListener('orientationchange', reevaluateOrientation);
screen.orientation?.lock?.('landscape').catch(() => {});

async function initialize() {
  try {
    store = await openSaveV2Store();
    const record = await store.load();
    if (record) state = createHeroOnboardingState({ profile: record.profile, revision: record.revision, source: 'save_v2' });
    else {
      const legacy = readLegacyProfileCandidate(localStorage);
      if (legacy.status === 'prepared') state = createHeroOnboardingState({ profile: legacy.profile, revision: null, source: 'legacy' });
      else if (legacy.status === 'missing') state = createHeroOnboardingState({ profile: createProfileV2(), revision: null, source: 'new' });
      else return showError(`LEGACY_${legacy.status.toUpperCase()}`, 'Старое сохранение не удалось безопасно подготовить.');
    }
    if (!state) return showError('INVALID_ONBOARDING_STATE');
    storageStatus = 'ready';
    render();
    reevaluateOrientation();
  } catch (error) {
    showError(error?.code ?? 'STORAGE_UNAVAILABLE');
    reevaluateOrientation();
  }
}

window.__norkavelOnboardingDebug = Object.freeze({
  getState: () => state ? structuredClone(state) : null,
  getStatus: () => storageStatus,
  getOrientation: () => ({ portrait }),
  getDialogOpen: () => $('confirm-dialog').open
});

initialize();
