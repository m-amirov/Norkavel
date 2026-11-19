# Norkavel — project status

**Дата обновления:** 2026-11-19. Current boundary: **G2 EXTENDED BROWSER SMOKE PASS / ART 0.2 CONCEPT / G3 NOT ACCEPTED**.

## Decisions and design
- G0 confirmed by owner: «Норкавель», Яндекс Игры, 2D side-view autobattler + clicker + Idle RPG, one chosen main hero + three companions, async-only PvP, **landscape-only** across mobile game.
- G1: [GDD 1.0](GDD-1.0.md) drafted; class swapping, art atmosphere, PvP backend, monetization and numeric content scope remain proposals or OPEN. **PENDING_OWNER_REVIEW**.
- Ludory Core pinned at `933c73b195eaf3bfffd12a31ab1cbadb27989eea`; WFA pinned at `6c8d80d15155cd8ccfbd245fce9450f61b5133f3`.

## Verified implementation
- Deterministic fixed-tick local PvE simulation, initial warrior + 3 companions, third-slot swap, frontline switch, 2 hero skills, manual click cap, companion fire/ash synergy.
- Two linked battles (wave and boss), boss windup + interrupt, victory/defeat/retry, no repeated first-clear reward.
- Real Canvas side-view prototype, active HUD, local development HTTP preview, browser-safe Ludory Core lifecycle/save and save/reload.
- Portrait overlay suspends simulation; returning to mobile landscape resumes correctly.
- GitHub Actions Node 22 runs Core+game tests, WFA ephemeral project-scoped Skill installation, and headless Chromium CDP browser checks.
- [CI **SUCCESS** at `ac1cdf2`](https://github.com/m-amirov/Norkavel/actions/runs/44374853507): mouse click, hero skill, manual pause/resume, portrait/landscape gate (including 1024×1366 portrait tablet), stage-1 win, save/reload, reward idempotency, repeat clear, stage-2 boss telegraph and interrupt.
- [Screenshot artifact at final run](https://github.com/m-amirov/Norkavel/actions/runs/44374853507): setup, fight, portrait, landscape, boss. Reviewed source/screenshots are not independent human playtest evidence.

## Gate status
| Gate | Status | Boundary |
|---|---|---|
| G0 | CONFIRMED | genre/party/PvP/orientation |
| G1 | DESIGN_DRAFT | pending owner acceptance |
| G2 | **BOSS_BALANCE_SAMPLE_PASS / EXTENDED_BROWSER_SMOKE_PASS / PARTIAL_ACCEPTANCE** | retuned boss 1800 seeded fights + real browser natural defeat PASS; human balance and physical-device acceptance remain open |
| G3 | BLOCKED_ART_PRODUCTION | replace temporary procedural actor geometry with production-quality characters, backgrounds, VFX and animations; rights/visual review |
| G4 | NOT_STARTED | full content and trusted server PvP |
| G5–G7 | NOT_STARTED | real users, SDK/platform, rights, release approval |

## Remaining work (ordered)
1. Close remaining G2 acceptance gaps: independent first-boss playtest, physical-device input/safe areas, human comprehension and readability at 640×360. Mechanical boss balance sample is PASS, not user acceptance.
2. Art Direction owner approval; create individual transparent masters, animation sheets and rights evidence for 3 active companions + alternate, 3 enemies and 1 boss. Art 0.2 concept lineup is conversation-only, not committed or runtime-integrated. No primitives can be accepted as G3 art.
3. Determine Ludory Studio trust/origin and host boundaries for non-narrative 2D runtime; Core alone is real, Studio/Connect is not authorized by a hand-written manifest.
4. Build an authenticated server-authoritative asynchronous PvP backend **only after** separate architecture decision; do not fake online arena.
5. Actual Codex activation test is NOT_RUN (CI installs WFA Skills but is not Codex runtime).

**Release flags:** releaseReady=false; publicationAllowed=false. No Yandex moderation, money/ads or official platform acceptance performed.

## Art Production 0.1 (2026-11-19)
- Source-bound candidates: transparent warrior master 1536×1024 and clean landscape battlefield background 1672×941. Original PNG bytes are committed under `assets/art/` with SHA-256/provenance in `assets/art/manifest.json`.
- Browser now preloads the two real assets; canvas renderer uses actual images when decoded. Geometric fallback and other seven temporary units remain, so not an art-complete slice.
- See [production register](ART_PRODUCTION-0.1.md). Mechanical/runtime checks must run against latest commit; rights and independent artistic review remain NOT_RUN.

## Verified art and mobile viewport follow-up
- [Art integration + browser smoke run 44454437539](https://github.com/m-amirov/Norkavel/actions/runs/44454437539): hero and arena images actually load as decoded PNG and are displayed in the Canvas battle.
- [SHA-256 and PNG dimension tests run 44455017226](https://github.com/m-amirov/Norkavel/actions/runs/44455017226): both original files match the source-bound manifest.
- [Landscape browser checks run 44455353856](https://github.com/m-amirov/Norkavel/actions/runs/44455353856): 640×360, 667×375 and 915×412 screenshots with no viewport overflow or offscreen action bar; 390×844 portrait remains blocked.
- Screenshot review: painted environment and transparent hero improve the scene, but companions, enemies and boss remain geometry placeholders. Small text at 640×360 requires follow-up. **No independent artistic PASS.**

## G2 extended browser coverage (2026-11-19)
- [Exact HEAD `a2d1d5d` — CI SUCCESS, run 44458525616](https://github.com/m-amirov/Norkavel/actions/runs/44458525616).
- Node 22 at the historical a2d1d5d receipt: **19/19 tests PASS**, including malformed/legacy snapshots and 120 reproducible combat seeds. Later exact CI receipts supersede this test count, see balance section below.
- Chromium CDP: mouse + true emulated touch, skill activation, pause, portrait blocking at 360×640, 390×844, 768×1024, 1024×1366; mobile landscape 640×360, 667×375, 844×390, 915×412; victory, retry, no duplicate rewards, boss warning and interruption, **controlled valid browser defeat fixture**, browser defeat/retry; corrupted/legacy save recovery and browser console diagnostics.
- Corrected teardown race of Chromium's temporary profile and missing favicon 404 noise. These were actual failed CI checks first, then repaired and rerun; no inference from code alone.
- Scope: Chrome emulation and source tests, **not** physical touch devices, independent playtesting, artistic sign-off or live Yandex platform acceptance.

## Art Production 0.2 scope
- [Companion concept and art gate](ART_PRODUCTION-0.2.md): original transparent art lineup of Ард, Мира, Элира; source file and candidate crops were packaged as a downloadable chat artifact, **not present in this repository**.
- Кайр, враги и босс, frame-based animations and parallax asset separation remain not produced/integrated; Art Production 0.2 is NOT_COMPLETE, G3 remains BLOCKED.

## G2 deterministic balance follow-up (2026-11-19)
- [Exact source `140a495e`, CI 44459324594 SUCCESS](https://github.com/m-amirov/Norkavel/actions/runs/44459324594): **22/22 Node tests PASS**, full Chromium browser PASS.
- [Measured report](G2-BALANCE-0.1.md): 1200 seeded first-stage + 600 seeded boss results; additional 200 seed tap-damage observations.
- Manual tap multiplier tuned 0.31 → 0.14. Post-tune sampled contribution is **18.4%** of allied damage, within the GDD's provisional 15–25% range for the observed slice.
- Historical pre-retune result: first stage 100% sampled clears; old boss 100% idle clears over 600 scenarios. The subsequent **0.2 boss retune** resolves the measured lack of loss probability, documented below; human difficulty remains OPEN.
- No server PvP or release readiness implied.

## G2 First Boss Balance 0.2 (2026-11-19)
- **Exact source `fcf3b4a`**: [GitHub Actions CI 44461330338 SUCCESS](https://github.com/m-amirov/Norkavel/actions/runs/44461330338), 23/23 Node tests PASS, complete Chromium browser smoke PASS including an actual natural boss defeat/retry without injured-party injection.
- [Full 0.2 evidence and design rationale](G2-BOSS-BALANCE-0.2.md). Only Rift Guardian HP 490→780 and ATK 31→66 were tuned; boss interval 40 ticks, windup 20 ticks, other enemies unchanged. Original telegraph/interrupt remains.
- 1800 fixed-seed stage-two samples (300 each of 6 tactics): healer idle 118/300 wins, healer interrupt 300/300, healer barrier 298/300, healer both 300/300, ash idle 247/300, ash skills 300/300. First-stage sample and ~18.4% manual-tap damage share remain unchanged by boss-only tuning.
- **Root cause fixed:** browser PvE previously restarted with a single static seed; each playable start now advances and persists a deterministic LCG seed, so retries vary while explicit-seed simulation/replay remains deterministic. The initial state still uses the fixed 24071 seed for the current prototype; per-player initial entropy is not implemented.
- Mechanical balance is **PROVISIONAL_SAMPLE_PASS**. Human enjoyment, physical touch devices, complete art, async PvP and release remain not verified.
