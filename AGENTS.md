# Norkavel — project agent contract

workflow-for-agents: git=direct-main

## Canonical boundaries
1. Game requirements are in GDD.md, docs/GDD-1.0.md, docs/ACCEPTANCE.md and the current source.
2. Ludory is pinned as a Git submodule: vendor/ludory. Use its actual Core/Studio/Runtime/Connect/Release contracts, not invented APIs. Until provenance is established this is a Core-bound bootstrap, **not** a Studio-created trusted game.
3. WFA is pinned at vendor/workflow-for-agents. Its Skills are opt-in, installed project-scope only. Select game-docs, gameplay-design, game-content-qa and relevant QA/art Skills; never install all Skills automatically. Do not overwrite project or Ludory native Skills. WFA methodology never overrides game runtime facts or Ludory native owner constraints.
4. Initial release target: Yandex Games; do not invent live SDK readiness, online PvP availability, rights clearance or official moderation results.
5. Scope: 2D side-view autobattler; one chosen main hero and exactly three active companions; manual intervention in PvE; **asynchronous-only PvP** with no real-time peer sync.
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

Current stage: GDD 1.0 proposed, bootstrap only, no playable game.
