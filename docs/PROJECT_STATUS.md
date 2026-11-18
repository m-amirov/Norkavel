# Norkavel — current status

Date: 2026-11-18.

- **G0 concept**: decisions confirmed in owner conversation (2D side view; one selectable main hero and 3 active companions; auto combat + clicker; asynchronous-only PvP; Yandex Games target; **mobile landscape-only on every screen, portrait rotation gate**). Brief written.
- **G1 design / GDD 1.0**: authored draft, **PENDING_OWNER_REVIEW**. Numerical balance, lore, user experience and technical details remain hypotheses.
- **Ludory**: source pinned; Node 22 Core metadata/session/save-restore smoke verified by clean GitHub Actions checkout on 38d3a606ee56eacacb8ddfa92b1c97e1d7f4b910; Studio origin is NOT established.
- **WFA**: source pinned; selected project-scoped Skills successfully installed in **ephemeral GitHub Actions** on 38d3a606ee56eacacb8ddfa92b1c97e1d7f4b910. Local user installation and real Codex positive/negative activation are NOT_RUN.
- **G2**: NOT_STARTED. No playable combat, art, backend or Yandex SDK.
- **G3–G7**: NOT_STARTED. publicationAllowed=false; releaseReady=false.

No runtime/CI/asset-rights claims are made until exact revision evidence is available.

## Current blockers / next steps

1. Review GDD 1.0 and settle proposed mechanics/visual direction.
2. On a real checked-out project: init submodules, install selected WFA Skills, run Node 22 tests/smoke and check Codex activation.
3. Complete Ludory Studio provenance/compatibility decision for a non-narrative real-time 2D action autobattler.
4. G2 first playable: deterministic battle, main hero, 3 companions, enemy waves, first boss, PvE skill activation, retry, real 2D battle rendering; browser smoke.
5. PvP backend design before any claims of functioning online arena.

## Verified vs unverified
Verified from repositories: Ludory Core game definition/session and versions; WFA project-scope installer, source G0–G7 pipeline and Ludory compatibility constraints.
Verified in CI on pinned source: submodule resolution, Core smoke, WFA project-scoped Skills installation and manifest. Unverified: local user install and Codex activation, Studio-origin, playable runtime, official Yandex integration, backend/PvP, art rights, release.

## Current technical evidence
- [Bootstrap CI success (Ludory Core + WFA install), exact code SHA 38d3a606](https://github.com/m-amirov/Norkavel/actions/runs/44368140239). Это не G2 и не реальный платформенный smoke.
