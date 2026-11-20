export const STAGE_010_ENCOUNTER_V1 = Object.freeze({
  contractVersion: 1,
  encounterId: 'first-story-boss-v1',
  stageId: 'stage-010',
  status: 'engineering-candidate',
  bossId: 'boss',
  telegraphTicks: 10,
  dangerousAttackInterval: 60,
  dangerousAttackDamage: 16,
  dangerousAttackKind: 'party_area',
  controlResistance: Object.freeze({ durationPercent: 50, valueCap: 50 }),
  rewardMode: 'none'
});

export function validateStage010Encounter(encounter) {
  return encounter?.contractVersion === 1 && encounter.encounterId === 'first-story-boss-v1' &&
    encounter.stageId === 'stage-010' && encounter.status === 'engineering-candidate' &&
    encounter.bossId === 'boss' && encounter.telegraphTicks === 10 &&
    encounter.dangerousAttackInterval === 60 && encounter.dangerousAttackDamage === 16 &&
    encounter.dangerousAttackKind === 'party_area' && encounter.rewardMode === 'none' &&
    encounter.controlResistance?.durationPercent === 50 && encounter.controlResistance?.valueCap === 50;
}
