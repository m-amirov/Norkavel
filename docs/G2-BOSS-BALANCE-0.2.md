# Norkavel — First Boss Balance 0.2

**Date:** 2026-11-19. **Status:** ENGINE_BALANCE_SAMPLE_PASS / HUMAN_PLAYTEST_NOT_RUN / G2_PARTIAL.

## Change and root cause

The existing first boss (`boss` / Хранитель Разлома) posed no meaningful risk: all 600 sampled encounters had been won even when the player never used abilities. The fight's main progression was therefore driven by damage throughput rather than tactics. Additionally, the production browser always passed the same fixed PvE seed back into `startFight`, causing deterministic repeats on retries.

| Parameter | Before | Now |
|---|---:|---:|
| Boss HP | 490 | **780** |
| Boss ATK | 31 | **66** |
| Boss DEF | 21 | 21 |
| Base interval | 40 ticks | 40 ticks |
| Telegraph windup | 20 ticks (1.0 s) | 20 ticks (1.0 s) |
| Boss AoE damage multiplier | 1.05 | 1.05 |

No changes to other enemies, companion base statistics, manual-tap damage (0.14), stage-one rewards (45), stage-two first-clear reward (110), or platform/PvP contracts. Telegraph remains interruptible by the existing shield bash, and the barrier still reduces incoming damage.

### Seed progression

`nextEncounterSeed(state)` advances the 32-bit PRNG state once per **new PvE attempt** using the existing LCG recurrence. Browser action `start` stores that seed with the combat snapshot, so changing stage or retrying produces a different but reproducible encounter. Explicit seeds supplied to `startFight` still produce bit-for-bit repeatable state/event streams. No `Math.random` was added to the combat path.

**Known limitation:** current initial game state starts with seed `24071` for everyone. Subsequent attempts have different seeds, but the starting sequence is shared between new installs. This is a prototype seed policy, not a server-secure PvP randomness model.

## Measured outcomes — level-one boss

Source: [CI #44461330338, exact gameplay/test SHA `fcf3b4a`](https://github.com/m-amirov/Norkavel/actions/runs/44461330338), **SUCCESS**. 23/23 Node tests PASS, Ludory Core smoke PASS, Chromium browser smoke PASS. Six tactics × 300 fixed seeds = **1800** simulated boss encounters. Every case plays stage one first, carries the valid player state/rewards into stage two, and verifies no repeated reward claims when replaying victories.

| Tactic | Wins / 300 | Win rate | Mean ticks | Mean duration |
|---|---:|---:|---:|---:|
| Элира, idle | 118 | 39.3% | 262 | 13.10 s |
| Элира, timed shield interrupt | 300 | 100.0% | 256 | 12.80 s |
| Элира, timely barrier | 298 | 99.3% | 291 | 14.55 s |
| Элира, interrupt + barrier | 300 | 100.0% | 253 | 12.65 s |
| Кайр, idle | 247 | 82.3% | 266 | 13.30 s |
| Кайр, interrupt + barrier | 300 | 100.0% | 190 | 9.50 s |

The tested scenario is intentionally counterable: an idle healer formation sometimes loses, an optimized damage composition is viable for idle play, and active defensive skill timing sharply improves survival. A 100% rate for timed interrupts in this seed sample is not a guarantee against future balance/content changes.

The first-stage 1200-scenario regression still checks tutorial accessibility. The maximum-legal-click damage share remains **18.4%** for the sampled stage-one encounters, within the GDD's preliminary 15–25% band.

## Actual browser evidence

Chromium smoke tests defeat/retry from the real game runtime in two ways:
- Controlled valid wounded combat snapshot, to test the endpoint/UI mechanics.
- **Natural first-boss loss**: restore a valid stage-two setup at seed `10000`, press Start normally (advances to seed `479285039`), leave skills unused and let real combat produce Defeat. The team has not been injured, and no debug mutation API is used. Verify rewards remain at 45 and the Retry action returns to setup.

Also tested: new seed on stage transition and after retry, repeatable LCG derivation, in-browser touch/landscape, life-cycle save/reload, portrait blocking and no browser exceptions.

## Remaining gates

- No independently observed player sessions have verified that windup cues, punishments or companion synergies are understood without prompting. This is **MECHANICAL_SAMPLE_PASS**, not overall balance sign-off.
- Current stage-one first clear and boss stamina remain a small vertical slice. Class options, 50-stage campaign and server-authoritative async PvP are separate later deliverables.
- G3 art/animation/rights clearance is still blocked and the publisher release gates remain **releaseReady=false; publicationAllowed=false**.

Keep this report as historical evidence; do not overwrite the 0.1 report that records the failure that motivated tuning.
