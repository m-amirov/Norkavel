# Norkavel — project agent contract

workflow-for-agents: git=direct-main

## Canonical boundaries
1. Canonical game requirements are in docs/GDD-1.1.md, GDD.md, docs/DECISIONS.md and docs/ACCEPTANCE.md. GDD 1.0 is historical; current source may be noncompliant.
2. Ludory is pinned as a Git submodule: vendor/ludory. Use its actual Core/Studio/Runtime/Connect/Release contracts, not invented APIs. Until provenance is established this is a Core-bound bootstrap, **not** a Studio-created trusted game.
3. WFA is pinned at vendor/workflow-for-agents. Its Skills are opt-in, installed project-scope only. Select game-docs, gameplay-design, game-content-qa and relevant QA/art Skills; never install all Skills automatically. Do not overwrite project or Ludory native Skills. WFA methodology never overrides game runtime facts or Ludory native owner constraints.
4. Initial release target: Yandex Games; do not invent live SDK readiness, online PvP availability, rights clearance or official moderation results.
5. Scope: 2D side-view autobattler; **4 distinct main hero choices, exactly one chosen ONCE per playthrough, permanently locked after explicit confirmation (NO hero switching)**, **5 progressively unlockable companions (exactly 3 active)**, **1+3=4 battle units**; manual intervention in PvE; **asynchronous-only PvP** with no real-time peer sync.
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
- User asked to work through the gameplay system before moving to further production; hero selection permanence IS owner CONFIRMED (variant B); do NOT introduce switching. Trial fights, fifth NAME/ART/EXACT SKILLS, first boss mechanics, currency sinks and migration details are PROPOSED until owner review. Fifth ice-controller ROLE (slow and dangerous-attack weakening) is OWNER CONFIRMED. **Fifth companion unlock after first STORY boss first victory is CONFIRMED**; avoid granting from the legacy technical G2 stage-2 boss. Implementing the new immutable hero profile still requires actual G2-R code, tests and migration acceptance.
- Existing legacy green G2 tests do not establish new G2-R implementation or owner approval; G3 remains BLOCKED.

## 2026-11-19 owner variant B
The active main hero is selected once and remains permanent for that playthrough. Free hero switching was REJECTED. See docs/GAMEPLAY-DESIGN-2.2.md. Never use the old Gameplay 2.0/2.1 free-switch proposal as requirements; never silently assign a permanent hero to legacy G2 saves.

## Owner decision 2026-11-19 — fifth companion gate
The fifth companion must unlock only on first **story-boss victory**, not before. Store a semantic `first_story_boss_first_clear` award and make it idempotent in future G2-R; first story boss is now CONFIRMED at chapter 1 stage 10; still do NOT reuse technical G2 stage-2 boss, and do NOT map legacy G2 stage-2 boss rewards automatically. Every permanent hero must be able to clear that boss with pre-boss companions. See docs/GDD-1.1.md and docs/GAMEPLAY-DESIGN-2.2.md.

## Owner decision 2026-11-19 — initial companion party
- For new profiles, exactly `sentinel` (Ard), `ember` (Mira), `healer` (Elira) unlocked and in three active slots after permanent hero selection. This is CONFIRMED. `ash` (Kair) and fifth start locked; Kair unlock after first successful stage-3 clear is OWNER CONFIRMED.
- Legacy G2 migration preserves prior Kair access and selected party; fifth remains story boss first-clear reward. Implement with deterministic save/restore and negative tests, not with ad-hoc UI-only disabled states. G2-R not implemented yet.

## Owner confirmation 2026-11-19 — Kair unlock
- Fourth companion Kair (`ash`) unlocks on first successful clear of PvE campaign stage 3, not on entry, loss, repeat or reload. Preserve `ash` entitlement for valid legacy G2 save migrations. All three active party slots remain unchanged until player chooses a swap outside combat; fifth remains first story-boss first-clear reward. G2-R runtime remains NOT IMPLEMENTED.

## Fifth-companion ice-control owner decision (19.11.2026)
- Companion #5 must have distinct role `ice_controller`: enemy slowdown and dangerous-attack weakening. It unlocks only after first story-boss first clear, **never as a requirement for beating that boss**. New official name, art, final skills, stacking/caps, numerical balance still OPEN. Provisional catalog ID `control` does not count as approved name.
- Consult docs/FIFTH-COMPANION-ICE-CONTROL-0.1.md; reject infinite freeze/boss lockdown, require deterministic event proof and G2-R browser regression. G3 art production is BLOCKED, not implemented by this decision.

## Campaign maps & WFA agent routing (owner 2026-11-19)
- Campaign: **5 chapters × 10 stages**, linear **single path** per chapter, boss on stages 10/20/30/40/50, user moves between connected nodes. Exactly **50 different original battle backgrounds** (including 5 boss backgrounds) plus **5 separate chapter map artworks**. See docs/CAMPAIGN-MAP-2.3.md and docs/CAMPAIGN-ENVIRONMENT-ART-0.1.md; neither is a generated art proof.
- When an actual agent orchestrator (e.g. a Codex session capable of independent delegation) is available, route work using docs/AGENT-EXECUTION-G2-R.md and pinned WFA playbooks + minimal `gameplay-design`, `level-design`, `game-docs`, `production-art`, `browser-qa` and `game-content-qa` skills as appropriate. WFA submodule ≠ running agents; NEVER report an agent review or skills activation unless actual run evidence exists. Current session has **NO agent executor / NO independent agent run**.
- A staged design or CI on the old G2 does not meet new G2-R/50-background/G3 acceptance. No publication or irreversible save migration without owner/gate review.

## Approved map navigation contract — 2026-11-19
- Owner-confirmed sequence: click/tap AVAILABLE node → short hero-marker movement along a single linear path → matching stage card only after arrival → explicit «В бой» starts fight. No implicit combat on tap/travel end; locked nodes cannot bypass progression. Keep same stable stage ID through selection/preview/combat.
- Replay of CLEARED stages for reduced ordinary rewards is OWNER_CONFIRMED; animation skip, timing and camera-follow remain OPEN. This is a design-only owner approval. No verified separate WFA agent runs yet.

## Owner approval 2026-11-19 — cleared-stage replay
- Every cleared PvE stage may be replayed from linear map; each new valid replay win yields a reduced ordinary progression reward. Never reissue first-clear bonus, Kair/fifth unlock, chapter access or one-time achievement. Each attemptId can award once only; separate first-clear and repeat claim namespaces. Old G2 with zero repeat-win payout is not a new G2-R PASS.
- Exact reward economy, caps and resource types remain OPEN; no changes to gameplay code or save migration have been implemented.

## Owner progression requirement (2026-11-19)
- **NO general camp/party level**. Each of five companions has an independent level only, without skill upgrade trees, retained in reserve. One permanently chosen main hero has separate level, **3 abilities with 4 upgrade steps each + upgradeable ultimate**. Every hero level-up requires a **player-selected** improvement. No auto-distribution; no fifth upgrade on ordinary skill.
- The G2 legacy 2-hero-skills HUD, former camp-level proposals and any assumption that ultimate also has four ranks are NOT approved. Companion XP is excluded; companions level **only by manual gold purchase (OWNER CONFIRMED)**. Hero level source **XP from victories is OWNER_CONFIRMED**; numerical XP/thresholds/replay/defeat/PvP/idle, ultimate cap/unlock, companion gold costs/level caps and respec still OPEN. Saved choices require atomic idempotency and legacy migration without fabricated upgrade points. [Progression 2.4](docs/CHARACTER-PROGRESSION-2.4.md). G2-R not implemented.

## Companion manual gold upgrades — owner confirmed 2026-11-19
- Each of 5 unlocked companions upgrades **only its own level** when the player deliberately pays gold. No companion XP, auto-leveling in battle/idle/reserve, shared camp level or companion skill upgrades. The main hero's level acquisition remains OPEN, with 3 skills×4 upgrades and upgradeable ultimate after player-chosen hero level-ups.
- G2-R must validate unlock rights, available gold, nonnegative gold, configured next-level cost/cap and purchase idempotency; gold debit and exactly-one-companion level increment must commit atomically, fail-closed on invalid/replay/duplicate/corrupt purchase. Don't hardcode unapproved cost numbers or mint levels on legacy migration.
- WFA agent roles are still only routed in docs. No independent agent run receipt. [Character Progression 2.4](docs/CHARACTER-PROGRESSION-2.4.md).

## Hero XP and level-up choice — owner confirmed 2026-11-19
- Permanent main hero receives XP for **verified victories** and levels at configurable XP thresholds. Every hero level gained creates a persistent player-controlled upgrade choice of one of three regular skills (four upgrade steps each) or eligible ultimate. No automatic skill assignment or coin-based companion XP. No shared camp level.
- Avoid inferring XP for replay, defeat, PvP or idle; numerical XP/thresholds/caps and ultimate unlocking still OWNER_OPEN. Prevent duplicate XP and skill points on same attemptId or reload, preserve multiple levelup choice opportunities.
- WFA routing is only guidance; no independent agents executed. [Character Progression 2.4](docs/CHARACTER-PROGRESSION-2.4.md).
