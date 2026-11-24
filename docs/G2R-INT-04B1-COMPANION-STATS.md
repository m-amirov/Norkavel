# G2R-INT-04b.1 — Companion stats candidate foundation

Date: 2026-11-24. Status: AWAITING_CI. Scope: isolated pure domain code; no change to current combat v1, existing checkpoints, production saves, UI, unlocks or reward policies. Full INT-04b remains incomplete.

## Candidate contract

`src/g2r-companion-stats-v1.mjs` provides `resolveG2RCompanionStats(id, level)` and `createG2RCompanionStatsSnapshot(profile)`. Policy ID is `g2r-companion-stats-engineering-candidate-v1`. Level range 1–100 matches the existing DEV purchase cap; neither that cap nor these numerical values are production-approved. The snapshot is a detached derived value for exactly three active unlocked companions, in party order. The caller must validate the complete Profile v2 and entitlement receipts before deriving a battle genesis.

Let n = level - 1. All companions gain HP; the four existing roles retain the current level-one numerical baseline. Candidate values:

| ID | Max HP | Specialization | Timing |
|---|---:|---|---|
| sentinel | 100 + 4n | shield 8 + floor(n/2) | every 18 ticks |
| ember | 100 + 2n | damage 7 + floor(n/2), burn 2 + floor(n/10) | 18 ticks; burn duration 12 |
| healer | 100 + 2n | heal 8 + floor(n/2) | every 18 ticks |
| ash | 100 + 2n | damage 9 + floor(n/2) | every 18 ticks |
| control | 100 + 2n | slow 20 + 10 floor(n/25); weaken 15 + floor(n/10) percent | slow duration 18 + floor(n/10), slow cooldown 72, weaken cooldown 120 |

Control's slowValue uses the existing engine's convention (10 units = one added interval tick). Weaken is a candidate for a single dangerous-attack reduction, with a future separate trigger, cooldown, boss resistance and no permanent weakening. The controller deliberately does not inherit the existing generic placeholder damage branch. Level increments always increase HP; specialization growth is stepped to avoid unbounded multiplicative scaling. These choices are engineering hypotheses only.

## Evidence

Locally executed Node v22.16.0:
- node --check src/g2r-companion-stats-v1.mjs — exit 0.
- node --test tests/g2r-companion-stats-v1.test.mjs — 5 tests, 5 pass, 0 fail. Includes all 500 role/level pairs, numerical bounds, deterministic snapshots, invalid IDs/levels, four slots, locked companions, duplicate/missing roster entries and sparse arrays.
- Tested Git blob IDs: source f8ed34acded9d4c4609ffdca91fb1ce22c817655; test e638db55dce232036c4757c86bdff6124cbe6499.

Local full repository checkout unavailable (network DNS failure); full npm check/Ludory/Chromium must be confirmed by exact-SHA CI. No independent reviewer run. The test suite uses the existing tests/*.test.mjs glob.

## Remaining acceptance / next slice

INT-04b.2: integrate stats into an explicitly new candidate combat-policy version, keep old policy-v1 behavior and replay byte-compatible, validate canonical level snapshots against full Profile v2, implement actual guard/damage/heal/slow/weaken with source-tagged events, single dangerous-attack weaken and bounded boss resistance. Do not silently re-run existing checkpoints under new rules. Test milestone access, real effects and old checkpoint compatibility.

INT-04b.3: use the new policy in the DEV sandbox, any of three slots, real Chromium recovery and all four heroes × ten parties × multiple seeds, compare levels, validate stage-10 first clear without controller and replay with it, measure full checkpoint and commit cost. No production settlement, economy approval, async PvP, G3 or release readiness implied.
