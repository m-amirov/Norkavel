// Isolated DEV candidate. Never reinterpret combat policy v1 using these values.
export const G2R_COMPANION_STATS_POLICY_ID = 'g2r-companion-stats-engineering-candidate-v1';
export const G2R_COMPANION_STATS_LEVEL_CAP = 100; // Matches the DEV sandbox purchase policy, not production approval.
export const G2R_COMPANION_IDS = Object.freeze(['sentinel','ember','healer','ash','control']);
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const known = id => G2R_COMPANION_IDS.includes(id);

// Values in the existing engine's units: slowValue / 10 adds whole attack-interval
// ticks; weakenPercent is percentage damage reduction of one dangerous attack.
// Control requires a separate, bounded trigger in the future combat-policy integration.
export function resolveG2RCompanionStats(id, level) {
  if (!known(id) || !integer(level,1,G2R_COMPANION_STATS_LEVEL_CAP)) return null;
  const n = level - 1;
  const common = { id, level, maxHp:100 + (id === 'sentinel' ? 4 : 2) * n };
  switch (id) {
    case 'sentinel': return { ...common, role:'guard', shield:8 + Math.floor(n/2), actionIntervalTicks:18 };
    case 'ember': return { ...common, role:'damage_burn', damage:7 + Math.floor(n/2), burnDamage:2 + Math.floor(n/10), burnDurationTicks:12, actionIntervalTicks:18 };
    case 'healer': return { ...common, role:'heal', healing:8 + Math.floor(n/2), actionIntervalTicks:18 };
    case 'ash': return { ...common, role:'damage', damage:9 + Math.floor(n/2), actionIntervalTicks:18 };
    case 'control': return { ...common, role:'ice_controller', slowValue:20 + 10*Math.floor(n/25), slowDurationTicks:18 + Math.floor(n/10), slowCooldownTicks:72, weakenPercent:15 + Math.floor(n/10), weakenCooldownTicks:120 };
    default: return null;
  }
}

// Caller must also validate the complete Profile v2 (including milestone receipts).
// This boundary rejects invalid active sets and level/entitlement combinations without
// duplicating the profile ledger or using untrusted precomputed combat stats.
export function createG2RCompanionStatsSnapshot(profile) {
  const { party, companionProgress, unlockedCompanionIds } = profile ?? {};
  if (!Array.isArray(party) || party.length !== 3 || new Set(party).size !== 3 ||
      !Array.isArray(companionProgress) || companionProgress.length !== G2R_COMPANION_IDS.length ||
      !Array.isArray(unlockedCompanionIds) || new Set(unlockedCompanionIds).size !== unlockedCompanionIds.length ||
      !Array.from(unlockedCompanionIds).every(known) || !Array.from(party).every(id => known(id) && unlockedCompanionIds.includes(id))) return null;
  const levels = new Map();
  for (const entry of companionProgress) {
    if (!entry || !known(entry.id) || levels.has(entry.id) || !integer(entry.level,1,G2R_COMPANION_STATS_LEVEL_CAP) ||
        (!unlockedCompanionIds.includes(entry.id) && entry.level !== 1)) return null;
    levels.set(entry.id,entry.level);
  }
  return {
    policyId:G2R_COMPANION_STATS_POLICY_ID,
    companions:party.map(id => resolveG2RCompanionStats(id,levels.get(id)))
  };
}
