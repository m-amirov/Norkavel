import { HERO_IDS, validateProfileV2 } from './profile-v2.mjs';

const skill = (slot, id, label, rankCap, mechanic) =>
  Object.freeze({ slot, id, label, rankCap, mechanic });

const hero = (id, role, workingName, skills) => Object.freeze({
  id, role, workingName, workingNameStatus: 'provisional', skills: Object.freeze(skills)
});

export const HERO_KIT_CATALOG_V1 = Object.freeze([
  hero('hero_slot_1', 'defender', 'Ровен', [
    skill('skill1', 'defender.shield_break', 'Разлом щита', 4, 'impact_interrupt'),
    skill('skill2', 'defender.bastion_dome', 'Купол бастиона', 4, 'party_shield'),
    skill('skill3', 'defender.steadfast_banner', 'Знамя стойкости', 4, 'party_mitigation'),
    skill('ultimate', 'defender.last_stand', 'Последний рубеж', 3, 'party_retaliation')
  ]),
  hero('hero_slot_2', 'elemental_mage', 'Астера', [
    skill('skill1', 'mage.fire_circle', 'Огненный круг', 4, 'area_burn'),
    skill('skill2', 'mage.binding', 'Сковывание', 4, 'slow_weaken'),
    skill('skill3', 'mage.chain_lightning', 'Цепь искр', 4, 'chain_combo'),
    skill('ultimate', 'mage.elemental_rift', 'Стихийный разлом', 3, 'area_combo')
  ]),
  hero('hero_slot_3', 'shadow_duelist', 'Сайрен', [
    skill('skill1', 'duelist.shadow_dash', 'Теневой рывок', 4, 'dash_combo'),
    skill('skill2', 'duelist.vanish', 'Исчезновение', 4, 'self_evade'),
    skill('skill3', 'duelist.fatal_mark', 'Роковая метка', 4, 'mark'),
    skill('ultimate', 'duelist.night_of_blades', 'Ночь клинков', 3, 'multi_hit')
  ]),
  hero('hero_slot_4', 'ranger', 'Валис', [
    skill('skill1', 'ranger.aimed_shot', 'Прицельный выстрел', 4, 'focused_damage'),
    skill('skill2', 'ranger.trap', 'Капкан', 4, 'slow_weaken'),
    skill('skill3', 'ranger.arrow_rain', 'Град стрел', 4, 'area_damage'),
    skill('ultimate', 'ranger.star_barrage', 'Звёздный залп', 3, 'marked_priority')
  ])
]);

const ownKeys = (value, keys) => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && Object.keys(value).length === keys.length &&
  keys.every(key => Object.hasOwn(value, key));
const boundedInt = (value, maximum) => Number.isSafeInteger(value) && value >= 0 && value <= maximum;
const allSkills = () => HERO_KIT_CATALOG_V1.flatMap(item => item.skills);

export function validateHeroKitCatalog(catalog) {
  if (!Array.isArray(catalog) || catalog.length !== 4) return false;
  const roles = ['defender', 'elemental_mage', 'shadow_duelist', 'ranger'];
  const ids = new Set();
  return catalog.every((item, heroIndex) => {
    if (!ownKeys(item, ['id', 'role', 'workingName', 'workingNameStatus', 'skills']) ||
        item.id !== HERO_IDS[heroIndex] || item.role !== roles[heroIndex] ||
        typeof item.workingName !== 'string' || item.workingName.length === 0 ||
        item.workingNameStatus !== 'provisional' || !Array.isArray(item.skills) || item.skills.length !== 4) return false;
    return item.skills.every((entry, skillIndex) => {
      const slots = ['skill1', 'skill2', 'skill3', 'ultimate'];
      const caps = [4, 4, 4, 3];
      if (!ownKeys(entry, ['slot', 'id', 'label', 'rankCap', 'mechanic']) ||
          entry.slot !== slots[skillIndex] || entry.rankCap !== caps[skillIndex] ||
          !entry.id.startsWith(`${item.role === 'elemental_mage' ? 'mage' : item.role === 'shadow_duelist' ? 'duelist' : item.role}.`) ||
          typeof entry.label !== 'string' || entry.label.length === 0 ||
          typeof entry.mechanic !== 'string' || entry.mechanic.length === 0 || ids.has(entry.id)) return false;
      ids.add(entry.id);
      return true;
    });
  }) && ids.size === 16;
}

export function validateHeroKitPolicy(policy) {
  if (!validateHeroKitCatalog(HERO_KIT_CATALOG_V1) ||
      !ownKeys(policy, ['policyVersion', 'policyId', 'maxValue', 'maxDurationTicks', 'skills']) ||
      policy.policyVersion !== 1 || typeof policy.policyId !== 'string' || policy.policyId.length === 0 ||
      !boundedInt(policy.maxValue, 100000) || policy.maxValue === 0 ||
      !boundedInt(policy.maxDurationTicks, 100000) || policy.maxDurationTicks === 0 ||
      !ownKeys(policy.skills, allSkills().map(entry => entry.id))) return false;
  return allSkills().every(entry => {
    const values = policy.skills[entry.id];
    if (!ownKeys(values, ['primary', 'secondary', 'durationTicks'])) return false;
    return [['primary', policy.maxValue], ['secondary', policy.maxValue], ['durationTicks', policy.maxDurationTicks]]
      .every(([field, maximum]) => Array.isArray(values[field]) && values[field].length === entry.rankCap + 1 &&
        values[field].every(value => boundedInt(value, maximum)));
  });
}

function validateBattle(battle) {
  if (!ownKeys(battle, ['battleVersion', 'allyIds', 'enemies']) || battle.battleVersion !== 1 ||
      !Array.isArray(battle.allyIds) || battle.allyIds.length === 0 ||
      !battle.allyIds.every(id => typeof id === 'string' && id.length > 0) ||
      new Set(battle.allyIds).size !== battle.allyIds.length ||
      !Array.isArray(battle.enemies) || battle.enemies.length === 0 || battle.enemies.length > 16) return false;
  const enemyIds = new Set();
  return battle.enemies.every(enemy => {
    if (!ownKeys(enemy, ['id', 'isBoss', 'telegraphActive', 'interruptible', 'statuses']) ||
        typeof enemy.id !== 'string' || enemy.id.length === 0 || enemyIds.has(enemy.id) ||
        !['isBoss', 'telegraphActive', 'interruptible'].every(field => typeof enemy[field] === 'boolean') ||
        !ownKeys(enemy.statuses, ['burn', 'bound', 'weakened', 'marked']) ||
        !Object.values(enemy.statuses).every(value => typeof value === 'boolean')) return false;
    enemyIds.add(enemy.id);
    return !battle.allyIds.includes(enemy.id);
  });
}

const effect = (type, targetIds, value = null, durationTicks = null) =>
  ({ type, targetIds: [...targetIds], value, durationTicks });

function buildEffects(skillId, target, battle, values, rank) {
  const primary = values.primary[rank];
  const secondary = values.secondary[rank];
  const duration = values.durationTicks[rank];
  const enemyIds = battle.enemies.map(enemy => enemy.id);
  const allies = battle.allyIds;
  const affected = battle.enemies.filter(enemy => enemy.statuses.burn || enemy.statuses.bound).map(enemy => enemy.id);
  switch (skillId) {
    case 'defender.shield_break': return [effect('damage', [target.id], primary),
      ...(target.telegraphActive && target.interruptible ? [effect('interrupt', [target.id], 1)] : [])];
    case 'defender.bastion_dome': return [effect('shield', allies, primary, duration)];
    case 'defender.steadfast_banner': return [effect('mitigation', allies, primary, duration)];
    case 'defender.last_stand': return [effect('mitigation', allies, primary, duration), effect('retaliation', allies, secondary, duration)];
    case 'mage.fire_circle': return [effect('area_damage', enemyIds, primary), effect('burn', enemyIds, secondary, duration)];
    case 'mage.binding': return [effect('slow', [target.id], primary, duration), effect('weaken', [target.id], secondary, duration)];
    case 'mage.chain_lightning': return [
      ...battle.enemies.map(enemy => effect('chain_damage', [enemy.id], primary)),
      ...((target.statuses.burn || target.statuses.bound) ? [effect('combo_damage', [target.id], secondary)] : [])
    ];
    case 'mage.elemental_rift': return [effect('area_damage', enemyIds, primary), ...(affected.length ? [effect('combo_damage', affected, secondary)] : [])];
    case 'duelist.shadow_dash': return [effect('damage', [target.id], primary), ...(target.statuses.weakened ? [effect('combo_damage', [target.id], secondary)] : [])];
    case 'duelist.vanish': return [effect('evade', ['hero'], primary, duration)];
    case 'duelist.fatal_mark': return [effect('mark', [target.id], primary, duration)];
    case 'duelist.night_of_blades': return [effect('multi_hit', [target.id], primary)];
    case 'ranger.aimed_shot': return [effect('damage', [target.id], primary)];
    case 'ranger.trap': return [effect('slow', [target.id], primary, duration), effect('weaken', [target.id], secondary, duration)];
    case 'ranger.arrow_rain': return [effect('area_damage', enemyIds, primary)];
    case 'ranger.star_barrage': {
      const marked = battle.enemies.find(enemy => enemy.statuses.marked);
      return [effect('multi_hit', [marked?.id ?? target.id], primary)];
    }
    default: return null;
  }
}

export function resolveHeroSkillEffect(profile, command, battle, policy) {
  if (!validateProfileV2(profile) || !validateHeroKitPolicy(policy) || !validateBattle(battle) ||
      !ownKeys(command, ['effectVersion', 'skillId', 'targetId']) || command.effectVersion !== 1 ||
      typeof command.skillId !== 'string' || typeof command.targetId !== 'string') return null;
  const kit = HERO_KIT_CATALOG_V1.find(item => item.id === profile.selectedHeroId);
  const selectedSkill = kit?.skills.find(entry => entry.id === command.skillId);
  const target = battle.enemies.find(enemy => enemy.id === command.targetId);
  if (!kit || !selectedSkill || !target || (selectedSkill.slot === 'ultimate' && profile.heroProgress.level < 5)) return null;
  const rank = profile.heroProgress.skillRanks[selectedSkill.slot];
  if (!Number.isSafeInteger(rank) || rank < 0 || rank > selectedSkill.rankCap) return null;
  const effects = buildEffects(selectedSkill.id, target, battle, policy.skills[selectedSkill.id], rank);
  if (!effects?.length || effects.some(item => !ownKeys(item, ['type', 'targetIds', 'value', 'durationTicks']) ||
      typeof item.type !== 'string' || item.targetIds.length === 0 ||
      (item.value !== null && !boundedInt(item.value, policy.maxValue)) ||
      (item.durationTicks !== null && !boundedInt(item.durationTicks, policy.maxDurationTicks)))) return null;
  return { effectVersion: 1, policyId: policy.policyId, heroId: kit.id, skillId: selectedSkill.id, rank, effects };
}
