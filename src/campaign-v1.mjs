import { beginCampaignAttempt, validateProfileV2 } from './profile-v2.mjs';

const pad = number => String(number).padStart(2, '0');
const stageId = number => `stage-${String(number).padStart(3, '0')}`;

const stages = Array.from({ length: 50 }, (_, index) => {
  const number = index + 1;
  const chapterNumber = Math.ceil(number / 10);
  const chapterIndex = (number - 1) % 10 + 1;
  const isBoss = chapterIndex === 10;
  return Object.freeze({
    id: stageId(number),
    number,
    chapterId: `chapter-${pad(chapterNumber)}`,
    chapterIndex,
    encounterId: isBoss
      ? `enc.chapter-${pad(chapterNumber)}.boss`
      : `enc.chapter-${pad(chapterNumber)}.${pad(chapterIndex)}`,
    backgroundId: `bg.${stageId(number)}`,
    firstClearClaimId: `claim.${stageId(number)}.first-clear`,
    isBoss,
    previousStageId: number === 1 ? null : stageId(number - 1),
    nextStageId: number === 50 ? null : stageId(number + 1),
    firstClearMilestone: number === 3
      ? 'unlock.ash'
      : number === 10 ? 'first_story_boss_first_clear' : null
  });
});

const chapters = Array.from({ length: 5 }, (_, index) => {
  const number = index + 1;
  const first = index * 10 + 1;
  return Object.freeze({
    id: `chapter-${pad(number)}`,
    mapId: `map.chapter-${pad(number)}`,
    stageIds: Object.freeze(Array.from({ length: 10 }, (_, offset) => stageId(first + offset)))
  });
});

export const CAMPAIGN_V1 = Object.freeze({
  campaignVersion: 1,
  chapters: Object.freeze(chapters),
  stages: Object.freeze(stages)
});

const NAVIGATION_FIELDS = Object.freeze([
  'navigationVersion', 'phase', 'lastVisitedStageId', 'targetStageId', 'previewStageId'
]);

function exactRecord(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  const keys = Reflect.ownKeys(value);
  return keys.length === fields.length && keys.every(key => typeof key === 'string' && fields.includes(key)) &&
    fields.every(field => Object.prototype.propertyIsEnumerable.call(value, field));
}

function stageNumberFromId(id) {
  if (typeof id !== 'string' || !/^stage-\d{3}$/.test(id)) return null;
  const number = Number(id.slice(6));
  return number >= 1 && number <= 50 && stageId(number) === id ? number : null;
}

export function validateCampaignCatalog(campaign) {
  if (!exactRecord(campaign, ['campaignVersion', 'chapters', 'stages']) ||
      campaign.campaignVersion !== 1 || !Array.isArray(campaign.chapters) ||
      !Array.isArray(campaign.stages) || campaign.chapters.length !== 5 || campaign.stages.length !== 50)
    return false;
  const chapterIds = new Set();
  const mapIds = new Set();
  const allChapterStageIds = [];
  for (let chapterIndex = 0; chapterIndex < 5; chapterIndex++) {
    const chapter = campaign.chapters[chapterIndex];
    const chapterNumber = chapterIndex + 1;
    if (!exactRecord(chapter, ['id', 'mapId', 'stageIds']) ||
        chapter.id !== `chapter-${pad(chapterNumber)}` ||
        chapter.mapId !== `map.chapter-${pad(chapterNumber)}` ||
        !Array.isArray(chapter.stageIds) || chapter.stageIds.length !== 10) return false;
    const expected = Array.from({ length: 10 }, (_, offset) => stageId(chapterIndex * 10 + offset + 1));
    if (chapter.stageIds.some((id, index) => id !== expected[index])) return false;
    chapterIds.add(chapter.id);
    mapIds.add(chapter.mapId);
    allChapterStageIds.push(...chapter.stageIds);
  }
  if (chapterIds.size !== 5 || mapIds.size !== 5 || new Set(allChapterStageIds).size !== 50) return false;

  const stageIds = new Set();
  const encounterIds = new Set();
  const backgroundIds = new Set();
  const firstClearClaimIds = new Set();
  for (let index = 0; index < 50; index++) {
    const stage = campaign.stages[index];
    const number = index + 1;
    const chapterNumber = Math.ceil(number / 10);
    const chapterIndex = (number - 1) % 10 + 1;
    const isBoss = chapterIndex === 10;
    if (!exactRecord(stage, [
      'id', 'number', 'chapterId', 'chapterIndex', 'encounterId', 'backgroundId', 'firstClearClaimId', 'isBoss',
      'previousStageId', 'nextStageId', 'firstClearMilestone'
    ]) || stage.id !== stageId(number) || stage.number !== number ||
        stage.chapterId !== `chapter-${pad(chapterNumber)}` || stage.chapterIndex !== chapterIndex ||
        stage.encounterId !== (isBoss ? `enc.chapter-${pad(chapterNumber)}.boss` :
          `enc.chapter-${pad(chapterNumber)}.${pad(chapterIndex)}`) ||
        stage.backgroundId !== `bg.${stageId(number)}` ||
        stage.firstClearClaimId !== `claim.${stageId(number)}.first-clear` || stage.isBoss !== isBoss ||
        stage.previousStageId !== (number === 1 ? null : stageId(number - 1)) ||
        stage.nextStageId !== (number === 50 ? null : stageId(number + 1)) ||
        stage.firstClearMilestone !== (number === 3 ? 'unlock.ash' :
          number === 10 ? 'first_story_boss_first_clear' : null)) return false;
    stageIds.add(stage.id);
    encounterIds.add(stage.encounterId);
    backgroundIds.add(stage.backgroundId);
    firstClearClaimIds.add(stage.firstClearClaimId);
  }
  return stageIds.size === 50 && encounterIds.size === 50 && backgroundIds.size === 50 &&
    firstClearClaimIds.size === 50 &&
    allChapterStageIds.every((id, index) => id === campaign.stages[index].id);
}

export function createCampaignNavigation() {
  return {
    navigationVersion: 1,
    phase: 'chapter_map',
    lastVisitedStageId: null,
    targetStageId: null,
    previewStageId: null
  };
}

export function validateCampaignNavigation(navigation) {
  if (!exactRecord(navigation, NAVIGATION_FIELDS) || navigation.navigationVersion !== 1 ||
      !['chapter_map', 'travelling', 'stage_preview'].includes(navigation.phase)) return false;
  const lastVisited = navigation.lastVisitedStageId === null ||
    stageNumberFromId(navigation.lastVisitedStageId) !== null;
  if (!lastVisited) return false;
  if (navigation.phase === 'chapter_map')
    return navigation.targetStageId === null && navigation.previewStageId === null;
  if (navigation.phase === 'travelling')
    return stageNumberFromId(navigation.targetStageId) !== null && navigation.previewStageId === null;
  return navigation.targetStageId === null && navigation.previewStageId !== null &&
    navigation.previewStageId === navigation.lastVisitedStageId &&
    stageNumberFromId(navigation.previewStageId) !== null;
}

function firstClearCount(profile) {
  return profile.ledgers.firstClearStageIds.length;
}

export function getCampaignNodeState(profile, navigation, id) {
  if (!validateProfileV2(profile) || !validateCampaignNavigation(navigation)) return null;
  const number = stageNumberFromId(id);
  if (number === null) return null;
  if (navigation.lastVisitedStageId === id) return 'CURRENT';
  if (number <= firstClearCount(profile)) return 'CLEARED';
  if (number === firstClearCount(profile) + 1) return 'AVAILABLE';
  return 'LOCKED';
}

export function selectCampaignStage(navigation, profile, id) {
  if (!validateCampaignNavigation(navigation) || navigation.phase === 'travelling') return navigation;
  const state = getCampaignNodeState(profile, navigation, id);
  if (!['AVAILABLE', 'CLEARED', 'CURRENT'].includes(state)) return navigation;
  return {
    navigationVersion: 1,
    phase: 'travelling',
    lastVisitedStageId: navigation.lastVisitedStageId,
    targetStageId: id,
    previewStageId: null
  };
}

export function arriveAtCampaignStage(navigation) {
  if (!validateCampaignNavigation(navigation) || navigation.phase !== 'travelling') return navigation;
  return {
    navigationVersion: 1,
    phase: 'stage_preview',
    lastVisitedStageId: navigation.targetStageId,
    targetStageId: null,
    previewStageId: navigation.targetStageId
  };
}

export function cancelCampaignTravel(navigation) {
  if (!validateCampaignNavigation(navigation) || navigation.phase !== 'travelling') return navigation;
  return {
    navigationVersion: 1,
    phase: 'chapter_map',
    lastVisitedStageId: navigation.lastVisitedStageId,
    targetStageId: null,
    previewStageId: null
  };
}

export function beginPreviewedCampaignAttempt(navigation, profile, attemptId) {
  if (!validateCampaignNavigation(navigation) || navigation.phase !== 'stage_preview' ||
      getCampaignNodeState(profile, navigation, navigation.previewStageId) === 'LOCKED') return profile;
  return beginCampaignAttempt(profile, {
    attemptId,
    stageId: stageNumberFromId(navigation.previewStageId)
  });
}
