# Norkavel — project agent contract

workflow-for-agents: git=direct-main

## Canonical boundaries
1. Canonical game requirements are in docs/GDD-1.1.md, GDD.md, docs/DECISIONS.md and docs/ACCEPTANCE.md. GDD 1.0 is historical; current source may be noncompliant.
2. Ludory is pinned as a Git submodule: vendor/ludory. Use its actual Core/Studio/Runtime/Connect/Release contracts, not invented APIs. Until provenance is established this is a Core-bound bootstrap, **not** a Studio-created trusted game.
3. WFA is pinned at vendor/workflow-for-agents. Its Skills are opt-in, installed project-scope only. Select game-docs, gameplay-design, game-content-qa and relevant QA/art Skills; never install all Skills automatically. Do not overwrite project or Ludory native Skills. WFA methodology never overrides game runtime facts or Ludory native owner constraints.
4. Initial release target: Yandex Games; do not invent live SDK readiness, online PvP availability, rights clearance or official moderation results.
5. Scope: 2D side-view autobattler; **4 distinct selectable main heroes (exactly 1 selected)**, **5 progressively unlockable companions (exactly 3 active)**, **1+3=4 battle units**; manual intervention in PvE; **asynchronous-only PvP** with no real-time peer sync.
5a. **Owner-confirmed mobile orientation: landscape-only across the entire game**. Portrait must show a turn-device screen, no playable portrait layout, no hidden actionable combat; orientation lock API is best-effort and must have fallback. Verify viewport/orientation changes and state/reward integrity.
6. Record approved requirements vs assumptions vs open questions. No gameplay/rendering implementation may silently change confirmed decisions.

## Development rules
- Prefer changes directly in main when writable and not protected; if branch protection requires a PR, merge only after actual required checks. No fake check claims or unnecessary branches.
- Investigate the root cause and add regression coverage on fixes.
- No external services, paid APIs or secrets may be enabled by assumption.
- G0–G7 are evidence-gated. A static GDD is not G2. No G5/G6/G7 PASS without real test and exact SHA evidence. No publishing without explicit owner authorization.
- Asset originals, usage mapping, licenses/rights evidence and distinct visual QA are mandatory before release. Do not accept primitives/placeholders as production art.
- Client-side rewards/PvP wins are never authoritative. Until backed by a verified server design and validation, real ranking/competitive rewards remain blocked.
- No forced offline-start requirement, Docker or Windows-specific CI gates. Powershell bootstrap is optional convenience for local Codex on Windows.
- Keep docs/PROJECT_STATUS.md and acceptance mapping up to date. Do not extrapolate source status from prior conversations.

## Running locally
1. git submodule update --init --recursive
2. node scripts/smoke-ludory.mjs
3. node --test tests/*.test.mjs
4. For optional project Skills run scripts/bootstrap.ps1 -ApplySkills after dry-run and inspecting changes.

Current stage: G2 browser-playable legacy slice; G2-R needed for new owner-confirmed 4 selectable heroes + 5 progressively unlocked companions + 3-slot selection and save migration. G3 art BLOCKED; async PvP/backend/Yandex Connect not implemented. Four old companion art candidates must not be relabeled as selectable main heroes.

## G2-R design-first boundary (2026-11-19)
- Confirmed roster quantities remain in GDD 1.1. Full gameplay mechanics are proposed, NOT owner-approved, in docs/GAMEPLAY-SYSTEM-2.0.md; technical implementation design in docs/G2-R-CHARACTER-SYSTEM-0.1.md.
- User asked to work through the gameplay system before moving to further production; do NOT implement irreversible hero selection, unlock milestones, currency sinks, or schema migration from unapproved proposal values.
- Existing legacy green G2 tests do not establish new G2-R implementation or owner approval; G3 remains BLOCKED.
