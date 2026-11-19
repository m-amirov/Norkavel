# Norkavel — WFA Agent Routing for G1 Campaign / G2-R

**Дата:** 2026-11-19  
**Статус:** AGENT_PLAN_PREPARED / AGENT_RUN_NOT_STARTED / INDEPENDENT_REVIEW_NOT_RUN.  
**Scope:** approved five linear chapter maps × ten stages, 50 distinct stage backgrounds, permanent main hero, five-companion unlock contract; do not implement the game while the user is finalizing gameplay design.

## 1. What WFA actually is

Source: pinned \`vendor/workflow-for-agents\`, its \`AGENTS.md\`, \`playbooks/game-production.md\`, \`agents/{designer,researcher,developer,reviewer,qa-engineer}.md\` and \`skills/core/task-planning/SKILL.md\`.

- WFA **defines role boundaries, supporting Skills, evidence gates and handoffs**. It is NOT a scheduler, hosted multi-agent executor, paid image generator, background worker or automatic Codex CLI process.
- A WFA git submodule and a green GitHub CI job **do not prove a single agent was launched**. The game repo currently has no proven autonomous agent runtime or agent-run receipt.
- In the current ChatGPT GitHub connector workflow, documents can be read/edited directly, but an authenticated, independent Codex subagent executor has **not** been invoked. Do not claim otherwise.
- WFA Skills are project opt-in and require path existence and compatible activation; never install 78+ game Skills globally as a side effect. Genuine Ludory ownership/provenance and native game rules take precedence.

## 2. Task classification

| Property | Value |
|---|---|
| TYPE | CHANGE / DESIGN + future FEATURE |
| SIZE | LARGE for G2-R / new campaign map and 55 asset use sites |
| RISK | HIGH for irreversible hero choice, legacy save migration, milestone rewards and production art scope |
| DOCS IMPACT | SIGNIFICANT; authoritative GDD + acceptance + asset register + status |
| Target repo | \`m-amirov/Norkavel\`, GitHub \`main\` |
| Runtime owner | **Current inspected source** uses Ludory Core and Canvas side-view G2 prototype; studio-owned/production game provenance NOT PROVEN solely by pinned submodule |
| Release | NONE; G2-R NOT_IMPLEMENTED, G3 BLOCKED, G7 NOT_AUTHORIZED |
| Main-first | Edit \`main\` if writable and tests allow; no force push, no unapproved publishing |

## 3. Recommended agent role breakdown — not execution receipts

| Agent role | Inputs / narrowly selected WFA Skills | Concrete deliverables | Gate |
|---|---|---|---|
| **Game designer** | owner GDD; \`skills/domain/gameplay-design/SKILL.md\`, \`skills/gamedev/disciplines/level-design/SKILL.md\` | 5×10 one-path map interactions, action/feedback state machine, level beats, boss counterplay, encounter matrix | OWNER_REVIEW for proposed UX/enemy beats |
| **Game-docs custodian** | \`skills/gamedev/workflows/game-docs/SKILL.md\`; current GDD/DECISIONS | consistency of stable stage IDs/5 bosses, owner-confirmed vs proposed labels, avoid duplicated contradictory facts | DOCUMENT_COVERAGE |
| **Designer / Art director** | WFA \`agents/designer.md\`, \`skills/domain/production-art/SKILL.md\`, \`skills/domain/character-design/SKILL.md\` as eligible | 5 maps + 50 **different** stage background briefs, source/rights/manifest and landmark consistency; actual images only after authorized art production | G3 BLOCKED until real sources, rights and human art review |
| **Developer (future implementation)** | \`agents/developer.md\`; \`skills/core/task-planning/SKILL.md\`; game \`AGENTS.md\`; actual Ludory Core APIs | versioned chapter/stage registry, map travel UI, save v2 migration, scene-to-background mapping, conditional Kair/ice-controller unlock, unit/browser tests | G2-R only after design rules frozen |
| **QA Engineer (future implementation)** | \`agents/qa-engineer.md\`, \`skills/testing/regression-testing/SKILL.md\`, \`skills/testing/browser-qa/SKILL.md\` | 50-stage reachability; locked/cleared/replay map movement; 5 boss milestones; save/restore/touch/portrait; evidence from exact HEAD | TEST_RUN_NOT_STARTED |
| **Reviewer (independent)** | \`agents/reviewer.md\`, \`skills/domain/game-content-qa/SKILL.md\` when implemented | requirement→source→test→artifact diff review; unimplemented 55 assets caught, missing level nodes flagged, contradictions found with file/line severity | INDEPENDENT_REVIEW_NOT_RUN |
| **Researcher (on demand)** | \`agents/researcher.md\`; current policy if needed | evidence-backed platform/performance/asset-rights questions, not invented player-retention metrics | Only when external research materially needed |

Role assignment is **not** evidence of a spawned subagent, completed peer review, independent art validation or a human playtest. If the only available actor is this assistant, mark activity **SELF_REVIEW**, not REVIEWER_PASS.

## 4. Immediate design handoff

**Approved baseline (do not reinterpret):**
- Four separate main heroes, choose one permanently, one in active squad.
- Five companions in roster, three active; Ard/Mira/Elira at start; Kair after first clear of stage 3; fifth ice controller after first story boss first clear.
- Fifty stages split 5×10; **boss at 10,20,30,40,50**; five chapter maps with **linear routes only**; user physically/visually moves through nodes; **50 unique authored combat backgrounds**.
- Landscape only, side-view 2D, async PvP only. No changing hero class, premium route skip, or unlocking fifth before stage 10.

**Pending design approvals:**
- Theme/lore/name of each chapter and actual unique environment composition, not the fact of uniqueness.
- Proposed map movement affordances (tap an unlocked node, marker follows route, preview then battle, replay prior nodes).
- Four main hero identities/skills; fifth ice controller's detailed abilities and identity; first boss name/counterplay; economy.
- Asset generation, rights, production integration, save migration code and exact tests are separate future stages.

**Read-only source checks already possible:** manually review \`docs/CAMPAIGN-MAP-2.3.md\`, \`docs/CAMPAIGN-ENVIRONMENT-ART-0.1.md\`, GDD 1.1 and DECISIONS for contradictory counts. A manual self-review is **not** separate agent execution.

## 5. Exact required evidence when actual agents are used

Each executed role must produce a receipt:
- \`role\`, \`actor/run_id\`, \`date\`, pinned \`source_SHA\`, \`WFA_SHA\`, project \`AGENTS.md\` reviewed;
- actual files and diff, unresolved assumptions/owner decisions, risk/severity findings;
- actual commands/test output, exit codes and browsers/viewports when run, explicit SKIP/NOT_RUN otherwise;
- independent reviewer identity/run different from author for \`REVIEWER_PASS\`, with concrete blocking findings and their resolution.
- developer must not claim completion from the old G2 test suite; add G2-R-specific tests.

**Never:** record a synthetic agent_run_id, call a text checklist a real multiplayer agent, call CI an agent, use a staged 55-slot manifest as 55 artworks, or publish to Yandex without separate explicit owner approval.

## 6. Suggested execution order once gameplay contracts accepted

1. Game designer + docs role → freeze exact campaign/hero/boss gameplay data and owner open questions.
2. Independent reviewer role → resolve 5x10 map and unlock contradictions before coding.
3. Developer agent → implement one smallest G2-R vertical gameplay slice, save v2 and first chapter map data, add runtime regression.
4. QA agent → verify exact source, 4 permanent hero profiles, 10-node route, milestone unlock, accessibility, landscape and save migration.
5. Art direction + production art (separate gate) → create 5 actual maps + 50 original battle backdrops with source hashes, rights and staged visual review; no placeholder-based G3 PASS.
6. Content QA → reconcile all 50 nodes and real use sites against baseline; only then consider G4 content completeness.

**Status 2026-11-19:** this file is a usable agent brief and routing plan. **NO independent agent was actually launched from this chat.** No claims of G2-R or G3 completion.

## Progression scope update — 2026-11-19
- Owner confirmed: no camp level; every companion has only an individual character level, and one permanent hero has own level with **three skills (four upgrade steps each) plus upgradeable ultimate**. Player personally chooses improvement after every hero level-up. Old 2-hero-skill and camp-level proposals are superseded.
- Before G2-R Developer agent coding, Designer must clarify **hero** XP/level method, companion next-level **gold cost** curve/stat scaling and ultimate cap/unlock (companion XP is REJECTED); Reviewer must verify hero choice/upgrade persistence and save v1 migration, QA must validate 4 hero kits + 5 companion level independence and no duplicated skill choices. [Character Progression 2.4](CHARACTER-PROGRESSION-2.4.md).
- This is updated agent work allocation only, NOT actual agent execution, no WFA independent review receipt or implementation PASS.

## Companion gold upgrade scope confirmed — 2026-11-19
- Owner confirmed player manually spends **gold** to raise the **individual level of an unlocked companion**. Companions earn **no XP** or automatic levels; there are no companion skill trees and no shared camp level. Existing active/reserve levels remain persistent. Distinct hero level acquisition still OPEN.
- **Designer:** propose affordable gold-cost curve for five characters unlocked in stages 0/3/10, level caps and stat scaling with 50-stage + repeat-farming economy simulations, avoiding premature hardcoding.
- **Developer (later):** separate atomic purchase command with unlock validation, cost snapshot, gold balance, purchaseId/retry dedup, save v2 and legacy migration.
- **QA + Reviewer (later):** verify exact balance spend, no double charge/no duplicated levels under reload/fast taps, no upgrade locked characters, no auto XP, preserve reserve levels; don't mark these roles PASS without separate execution evidence.
- Status: **AGENT_PLAN_ONLY / G2-R_NOT_IMPLEMENTED**, [Progression 2.4](CHARACTER-PROGRESSION-2.4.md).
