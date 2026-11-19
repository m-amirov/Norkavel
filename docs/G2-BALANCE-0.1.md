# Norkavel — G2 deterministic balance sampling 0.1

**Date:** 2026-11-19. **Status:** ENGINE_INVARIANTS_PASS / GAMEPLAY_DIFFICULTY_OPEN.

## Reproducible evidence
- **Before tap tuning:** [CI 44458856801, `c8cae444`](https://github.com/m-amirov/Norkavel/actions/runs/44458856801), 1200 seeded first-stage encounters.
- **After multiplier 0.31 → 0.14:** [CI 44459100958, `cec8b4fc`](https://github.com/m-amirov/Norkavel/actions/runs/44459100958), 21/21 Node tests PASS, actual Chromium smoke PASS.
- **Boss sampling:** [CI 44459324594, `140a495e`](https://github.com/m-amirov/Norkavel/actions/runs/44459324594), 22/22 Node tests PASS, browser smoke PASS.
- All cases use the live `src/combat.mjs` simulation with fixed seed and bounded inputs; no backend, network or physics mock.

## Stage 1 — 1200 scenarios (400 seeds per strategy)

| Strategy | Wins | Defeats | Mean fixed ticks | Mean duration |
|---|---:|---:|---:|---:|
| Healer / no manual input | 400 | 0 | 102 | 5.10 s |
| Healer / max legal taps, **before** tuning | 400 | 0 | 61 | 3.05 s |
| Healer / max legal taps, **after** tuning | 400 | 0 | 80 | 4.00 s |
| Ash / no manual input | 400 | 0 | 80 | 4.00 s |

The before/after comparison runs the same 400 seeds; only the manual damage multiplier changed. Mean tap-enabled duration went from 61 to 80 ticks. No first-clear reward invariants failed.

200 additional seeded maximum-rate tap traces after tuning: `tapped=13064`, `alliedTotal=71164`, `fraction=0.184` (**18.4%** of logged allied damage). This is within the GDD's tentative 15–25% manual-input band for the tested stage/composition. It is not a guarantee across other stages, teams or upgrades.

## Stage 2 boss — 600 scenarios (200 seeds per strategy)

| Strategy | Wins | Defeats | Mean fixed ticks | Mean duration |
|---|---:|---:|---:|---:|
| Healer / idle | 200 | 0 | 203 | 10.15 s |
| Healer / timed interrupt + barrier | 200 | 0 | 182 | 9.10 s |
| Ash / idle | 200 | 0 | 147 | 7.35 s |

**Design concern:** 100% wins even without manual intervention or deliberate boss counterplay. The boss currently fails to create meaningful risk under these start conditions. Faster clears show that composition matters for throughput, **not** yet for survival or tactical decision-making. A controlled valid low-health browser defeat fixture is an integration regression test, not evidence that ordinary players will lose.

## Follow-up balance gate (not yet accepted)
1. Define intended difficulty for the first tutorial fight and first boss separately, including no-input win rates and desired time to first boss.
2. Sample candidate boss tuning combinations for HP, attack and AoE windup **without** changing the immutable base inputs prematurely. Include level-1 default, level-2 upgrade, healer, ash, timed interrupts and barriers.
3. Select a boss configuration with feasible counterplay but nontrivial risk, then enforce regressions for damage, reward idempotency and seed replay.
4. Verify human legibility: inexperienced players understand why they lost and how different companions/skills change outcome. Confirm on mobile landscape hardware, not only headless Chrome.

All numeric difficulty thresholds remain hypotheses pending design acceptance; no G3/G4/G7 release claims follow from these deterministic tests.
