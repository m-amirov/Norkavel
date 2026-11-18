# Norkavel — project status

**Дата:** 2026-11-18. Current boundary: **G2 TECHNICAL PLAYABLE / G3 ART NOT ACCEPTED**.

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
| G2 | **TECHNICAL_BROWSER_SMOKE_PASS / PARTIAL_ACCEPTANCE** | real first playable, but browser defeat path and additional landscape viewports/real-device coverage still to verify |
| G3 | BLOCKED_ART_PRODUCTION | replace temporary procedural actor geometry with production-quality characters, backgrounds, VFX and animations; rights/visual review |
| G4 | NOT_STARTED | full content and trusted server PvP |
| G5–G7 | NOT_STARTED | real users, SDK/platform, rights, release approval |

## Remaining work (ordered)
1. Close G2 acceptance gaps: browser defeat/retry, corrupt/old save recovery, more landscape viewports, touch input/console diagnostics, gameplay balance sampling and screenshot QA.
2. Art Direction owner approval, character bible and art production of 1 main hero, 3 companions, 3 enemies, 1 boss and 1 painted environment. No primitives can be accepted as G3 art.
3. Determine Ludory Studio trust/origin and host boundaries for non-narrative 2D runtime; Core alone is real, Studio/Connect is not authorized by a hand-written manifest.
4. Build an authenticated server-authoritative asynchronous PvP backend **only after** separate architecture decision; do not fake online arena.
5. Actual Codex activation test is NOT_RUN (CI installs WFA Skills but is not Codex runtime).

**Release flags:** releaseReady=false; publicationAllowed=false. No Yandex moderation, money/ads or official platform acceptance performed.
