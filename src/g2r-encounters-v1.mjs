import { STAGE_010_ENCOUNTER_V1, validateStage010Encounter } from './stage-010-encounter-v1.mjs';

const fixture = number => Object.freeze({
  contractVersion: 1,
  encounterId: `engineering.stage-${String(number).padStart(3, '0')}.v1`,
  stageId: `stage-${String(number).padStart(3, '0')}`,
  status: 'engineering-fixture',
  bossId: 'boss',
  telegraphTicks: 8,
  dangerousAttackInterval: 72,
  dangerousAttackDamage: 10,
  dangerousAttackKind: 'party_area',
  controlResistance: Object.freeze({ durationPercent: 50, valueCap: 50 }),
  rewardMode: 'none'
});

export const G2R_CHAPTER_01_ENCOUNTERS_V1 = Object.freeze([
  ...Array.from({ length: 9 }, (_, index) => fixture(index + 1)),
  STAGE_010_ENCOUNTER_V1
]);

export function validateG2REncounterV1(encounter) {
  if (validateStage010Encounter(encounter)) return true;
  const expected = G2R_CHAPTER_01_ENCOUNTERS_V1.find(value => value.stageId === encounter?.stageId);
  return expected?.status === 'engineering-fixture' &&
    JSON.stringify(encounter) === JSON.stringify(expected);
}

export function resolveG2REncounterV1(stageId, encounterId = null) {
  const encounter = G2R_CHAPTER_01_ENCOUNTERS_V1.find(value => value.stageId === stageId) ?? null;
  return encounter && (encounterId === null || encounter.encounterId === encounterId) ? encounter : null;
}
