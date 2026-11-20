# Norkavel — project status

**Codex handoff:** G2R-INT-04a combat persistence and recovery are implemented locally and await exact-SHA CI. Full G2R-INT, trusted settlement/rewards, 50 approved encounters and G3 remain OPEN/BLOCKED.


**Дата обновления:** 2026-11-20. Current boundary: **G2R-INT-04a AWAITING_CI / FULL G2R-INT BLOCKED / TRUSTED_SETTLEMENT_NOT_IMPLEMENTED / PRODUCTION BALANCE OPEN / G3 BLOCKED**.

## G2R-INT-04a combat persistence (2026-11-20; AWAITING_CI)
- Sandbox format v2 atomically binds campaign attempt and initial G2-R combat, then CAS-commits engine-derived casts/ticks and terminal pending result.
- Restore replays the bounded operation log and rejects schema-valid HP, tick, RNG, outcome, hero, ranks, party, stage or encounter drift.
- Format-v1 active attempts enter explicit `legacy_missing_combat` recovery; only a confirmed idempotent defeat with zero rewards can close them.
- Chromium recovery covers exact state comparison across reload, boss telegraph, stale tabs, tab close, transaction abort, defeat/retry/replay, portrait and production isolation. See [recovery report](G2R-INT-04A-COMBAT-RECOVERY.md).

## G2R-INT-03 DEV progression sandbox (2026-11-20; DONE_VERIFIED)
- Separate DEV IndexedDB and command CAS hold a clean Profile v2 copy fixed to local-untrusted, engineering-candidate, noncompetitive and non-release metadata.
- Real G2-R combat can produce a pending local result, survive reload before claim, then apply candidate XP/gold exactly once. Defeat, retry and reduced replay are covered.
- Manual hero skill choices affect ranks in the next combat; manual companion purchases reuse the existing cost-policy and purchase ledger.
- Stage 3 and 10 milestones unlock Kair and the controller once. Production Profile v2 and legacy v1 remain unchanged.
- Chapter-01 arithmetic gives all four heroes level 5 / 310 XP / 840 gold after ten first clears; current companion levels are not yet consumed by combat stats. Implementation `7dee19c7d42ed48a13ebf0841134aaf1d9086729` passed 120/120 Node, Ludory, all browser and balance gates locally; evidence SHA `35d723465ce34b0da0b5cb7675b50f3901f91014` passed [exact-SHA CI](https://github.com/m-amirov/Norkavel/actions/runs/44773682787). See [sandbox report](G2R-INT-03-PROGRESSION-SANDBOX.md).

## G2R-INT-02 campaign integrity (2026-11-20; DONE_VERIFIED)
- Integration CAS now validates the proposed session against the previous committed state and rejects valid-schema but unreachable transitions, combat forgeries, immutable attempt drift and QA-ledger rollback.
- Campaign UI explicitly activates prepared legacy profiles through the existing domain function; no hidden activation, hero selection or rewards occur, and the v1 checkpoint remains unchanged.
- Error UX distinguishes stale profile/session, failed commit, corrupt/unsupported restore and unavailable storage without presenting an uncommitted victory/progress state.
- A sequential real-engine test clears stages 1–10 without direct ledger injection and verifies `stage-010` → `first-story-boss-v1`. Candidate XP arithmetic reaches level 5 at 243 XP before stage 10, while the QA runtime itself writes no XP.
- New Chromium integrity smoke covers portrait blocking in every phase, aborted persistence, legacy activation and storage recovery. Implementation `11feffd`, evidence `c062b76`: 112/112 Node tests, Ludory and every required browser gate passed locally and in [CI 44722998680](https://github.com/m-amirov/Norkavel/actions/runs/44722998680).

## G2R-INT-01 vertical integration slice (2026-11-20; DONE_VERIFIED)
- A separate chapter-01 QA shell links Campaign v1 stage IDs, a visible 10-node route, marker travel, preview confirmation, actual G2-R combat and local result/return flow.
- One profile-bound Save v2 integration CAS record atomically contains navigation, immutable hero/party binding, attempt identity, combat and local outcome. Reload resumes travel or combat; stale tabs converge instead of overwriting.
- Stages 1–9 use reward-free `engineering-fixture` encounters. `stage-010` resolves only to the existing `first-story-boss-v1`; technical legacy G2 stage 2 is not reused.
- The result is `local-untrusted`; only an isolated QA cleared-stage ledger advances. Profile v2 gold, XP, unlocks, achievements and first-clear ledger are unchanged. Trusted settlement is proposed separately and NOT_IMPLEMENTED.
- Stage-010 QA now compares every strategy with a baseline using the same party, applies a 3-tick reaction delay and 8-tick manual-command gap, and records per-unit HP. This is analysis of an engineering candidate, not production balance acceptance.
- Local `npm run check` passed 106/106 Node tests plus Ludory. Legacy, Save v2, onboarding, G2-R combat and campaign Chromium smokes pass; campaign evidence is bound to `c28d0b8`. Evidence `c7037e8`, [CI 44715870159](https://github.com/m-amirov/Norkavel/actions/runs/44715870159) SUCCESS.

## G2R-E01 companion purchase domain (2026-11-19)
- Exact implementation `4af6c6fb234dac7bfbf1aaecfe4fa2408e80ef3f` adds pure `upgradeCompanion`; legacy combat/UI/save key remain unchanged.
- A strict purchase v1 uses monotonic sequence/ID, expected current level and a complete persisted cost-policy snapshot. One success debits the exact policy cost and raises only one unlocked companion; all five and reserve upgrades are covered without party or hero changes.
- Locked/unknown companion, stale level, insufficient gold, duplicate/reload, cap and same-ID cost drift fail without mutation. Purchase cursor remains usable beyond 10 000 after JSON reload; readonly legacy migration cannot spend, while activated migration preserves original checkpoint/gold provenance.
- P01 reward identity was strengthened in the same slice: persisted 50-row first/replay tables reject same-ID reward drift after reload.
- [CI 44537806684](https://github.com/m-amirov/Norkavel/actions/runs/44537806684) SUCCESS on exact `4af6c6f`: 66/66 Node tests, Ludory Core smoke, project-scoped WFA bootstrap and headless Chrome legacy G2 smoke. Local Chromium remains unavailable.
- Remaining: approved production prices/cap/stats, legitimate runtime gold income, browser purchase UI and atomic storage/CAS. Domain policy rollover requires an explicit future migration. No economy balance or end-to-end runtime PASS is implied.

## G2R-P01 hero progression domain (2026-11-19)
- Exact implementation `85114c6886fae8cda80d1ed9efb6e1ae6d9d4e0f` extends pure `src/profile-v2.mjs`; legacy combat/UI/save key remain unchanged.
- Active campaign attempts now bind sequence, reachable stage and first-clear/replay class. A monotonic settled cursor replaces the 10 000-entry receipt array and remains idempotent after JSON reload. Early stage 10, mismatched, stale and duplicate results fail closed.
- Victory XP comes only from an injected policy v1 with 15 increasing cumulative thresholds and 50 positive first/replay pairs where replay is smaller. Policy identity and thresholds persist in the profile; no Economy Balance 0.1 numbers are embedded.
- Hero level remains 1–16; multi-level wins retain every pending choice, post-cap XP is preserved without level 17, and exactly 15 manual ranks fit 3×4 regular plus 3 ultimate with the existing level-5 gate.
- [CI 44535563965](https://github.com/m-amirov/Norkavel/actions/runs/44535563965) SUCCESS on exact `85114c6`: 60/60 Node tests, Ludory Core smoke, project-scoped WFA bootstrap and headless Chrome legacy G2 smoke. Local Chromium remains unavailable.
- Remaining: trusted combat-session producer for the outcome itself, approved production XP numbers, browser v2 persistence/UI and four real skill kits/effects. This is domain verification, not full G2-R runtime or balance PASS.

## G2R-F03 roster, unlock and migration activation (2026-11-19)
- Exact implementation `e384e5e` extends only pure `src/profile-v2.mjs`; legacy combat/UI/save key remain unchanged.
- Strict verified-result contract (`resultVersion`, immutable `attemptId`, `stageId`, victory/defeat) records each attempt once. First victory stage 3 grants Kair receipt once; first victory story-boss stage 10 grants provisional `control` with confirmed `ice_controller` role once. Defeat, replay, duplicate/conflicting attempt and technical G2 stage 2 grant neither unlock.
- All three companion slots support unlocked replacement/swap outside combat; unlock never rewrites the current party. Legacy activation retains the full recovery checkpoint and imported gold, party, prototype claims and Kair while permitting later v2 mutations and JSON restore.
- F01 corrections: ultimate upgrades fail closed below hero level 5; companion level validation has no invented gameplay cap 100 (only positive safe-integer serialization bounds).
- [CI 44531383856](https://github.com/m-amirov/Norkavel/actions/runs/44531383856) SUCCESS on exact `e384e5e`: 55/55 Node tests, Ludory Core smoke, project-scoped WFA bootstrap and headless Chrome legacy G2 smoke. Local Chromium remains unavailable.
- Remaining: browser v2 storage/onboarding/collection UI, campaign progression authority, actual ice slow/weaken combat effects and independent browser flow evidence. No G2-R runtime or balance PASS is implied.

## G2R-F01 profile v2 foundation (2026-11-19)
- Exact implementation `27be4dd`: separate pure `src/profile-v2.mjs`; current `src/combat.mjs`, `web/main.mjs` and `norkavel.g2.save.v1` remain unchanged.
- Schema 2 expresses four provisional hero slots, five companion records, three active unlocked slots, hero lvl1–16/pending choices, ledgers and intact legacy checkpoint. Hero confirmation is one-time and immutable; unknown/duplicate/locked/tampered values fail closed.
- Valid schema 1 Ludory snapshots prepare deterministic in-memory v2 candidates while preserving gold, prototype level/history, claims, party and Kair access. No hero is silently selected, no old level becomes XP/skill choices, no technical stage-2 boss grants the fifth companion, and no v2 key is written in F01.
- [CI 44526368550](https://github.com/m-amirov/Norkavel/actions/runs/44526368550) SUCCESS on exact `27be4dd`: 46/46 Node tests, Ludory Core smoke, project-scoped WFA bootstrap and headless Chrome legacy G2 smoke. Local Chromium was unavailable; browser evidence comes from CI.
- Remaining: atomic v2 persistence, migration/onboarding UI, real confirmed hero identities/kits, unlock event APIs and G2-R browser flows. This is not full NKV-031–034 or G2-R runtime PASS.

## Decisions and design
- G0 confirmed by owner: «Норкавель», Яндекс Игры, 2D side-view autobattler + clicker + Idle RPG, **4 distinct main heroes to choose from (exactly one selected), 5 progressively unlockable companions (3 active), 1+3=4 in combat**, async-only PvP, **landscape-only**. See [GDD 1.1](GDD-1.1.md).
- G1: [GDD 1.1](GDD-1.1.md) has owner-confirmed roster counts, choice and gradual unlock. Specific hero identities and fifth companion name/art/mechanics remain OPEN; **fifth ice-controller role CONFIRMED**, fourth-companion unlock CONFIRMED (Kair first-clear stage 3); **starter trio Ard/Mira/Elira CONFIRMED**; **permanent hero choice AND fifth-companion unlock after first story-boss victory are CONFIRMED**. GDD 1.0 is superseded.
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
| G0 | CONFIRMED | 4 hero choices; 5 unlockable companions; active party 1+3; PvP/orientation |
| G1 | ROSTER_COUNTS_CONFIRMED / CONTENT_OPEN | GDD 1.1 defines composition; characters/unlock timing not final |
| G2 | **LEGACY_BROWSER_PASS / OWNER_ROSTER_NOT_IMPLEMENTED** | Existing fixed hero and 4 companions do not implement selectable 4 heroes and 5 unlockable companions; previous boss results remain legacy evidence |
| G3 | BLOCKED_ART_PRODUCTION | replace temporary procedural actor geometry with production-quality characters, backgrounds, VFX and animations; rights/visual review |
| G4 | NOT_STARTED | full content and trusted server PvP |
| G5–G7 | NOT_STARTED | real users, SDK/platform, rights, release approval |

## Remaining work (ordered)
1. Close remaining G2 acceptance gaps: independent first-boss playtest, physical-device input/safe areas, human comprehension and readability at 640×360. Mechanical boss balance sample is PASS, not user acceptance.
2. G2-R: implement choosing 1 of 4 heroes, 5-companion collection/unlock, 3 active companion slots and explicit save migration. Then G3: produce/approve 4 different main hero masters + 5 companion masters (plus 3 enemies and boss), true animations and rights. Existing four candidate companions are not four hero choices.
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

## G3 Art Production 0.3 (2026-11-19)
- [Production report](G3-ART-PRODUCTION-0.3.md): a separate chat ZIP contains transparent, 512×512 static companion PNG and WebP masters for Ард, Мира, Элира and Кайр (four assets, 289 788 bytes of WebP total) plus source and SHA evidence.
- Runtime opt-in registry and drawing route committed; absent image binaries are not loaded or represented as integrated. The ZIP bytes **have not been committed to GitHub**. A validating `scripts/import-g3-art.mjs` is provided but has not been executed with the real ZIP in the repository.
- Mechanical importer/manifest/browser tests added. Check the exact SHA CI before making any PASS claim. Boss, enemies, true frame animation, depth-layer parallax, rights and human image review remain outstanding. G3 BLOCKED.

## Owner correction (19.11.2026) — precedence over historical G2/G3 reports
- [GDD 1.1](GDD-1.1.md) confirms **4 selectable main heroes**, **5 companions available through gradual unlock**, **1 hero + 3 companions active**. Existing G2 uses one fixed hero, a four-companion catalog and a third-slot switch, without hero selection or unlock logic. Therefore historical 28/28 green CI does NOT verify this new requirement.
- Current art includes **1 candidate hero master** and **4 candidate companion masters** (the latter still external conversation ZIP). Still missing **3 hero masters** and **the fifth companion**, plus 3 enemies, boss, animation and art review. G3 remains BLOCKED; do not relabel existing companion images as selectable heroes.
- Next implementation gate: G2-R roster + save migration + headless Chrome with both hero choice and unlock/party invariants; then revised G3 visual/animation production. First story boss stage ID is OWNER_CONFIRMED at 10; Kair after stage-3 first clear CONFIRMED; starter trio Ard/Mira/Elira CONFIRMED; **fifth unlock after first story-boss victory is CONFIRMED**.

- [G3 corrected production matrix 0.4](G3-ART-PRODUCTION-0.4.md): 4 main hero masters + 5 companion masters (4 active in battle: 1+3), plus 3 enemies and 1 boss. This plan is NOT art completion.

## G2-R gameplay design-first phase (2026-11-19)
- [Gameplay Design 2.0](GAMEPLAY-SYSTEM-2.0.md): a coherent **proposal**, not a confirmed final game, for hero roles, 5-companion unlock, 3-slot squads, combat, campaign, economy, idle, daily/achievements, PvP, monetization boundaries and landscape UI.
- [G2-R implementation contract](G2-R-CHARACTER-SYSTEM-0.1.md): source audit, target Save v2, legacy save protection and 14 required test scenarios. No runtime code changed in this design step.
- Gameplay choices not owner-approved: exact four hero kits, fifth companion name/art/skill details, economy/idle numbers (50-stage structure now owner-approved). **Fifth ice-controller ROLE IS OWNER_CONFIRMED.** **Hero switching is rejected by owner variant B**. The confirmed 4 hero choices / 5 companion collection / active 1+3 and portrait restriction remain mandatory.
- Prior G2 tests verify the old prototype only, not actual G2-R. Implementation NOT_STARTED; G3 BLOCKED; releaseReady=false, publicationAllowed=false.

## Gameplay Design 2.1 — 2026-11-19
- [Gameplay Design 2.1](GAMEPLAY-DESIGN-2.1.md) details 4 distinct proposed hero skill kits, 5 companion niches, front/back targeting, deterministic tick/status rules, first ten campaign stage beats, gold/progression, metrics and explicit design gates.
- **OWNER CONFIRMED MILESTONE / NOT_IMPLEMENTED.** Fifth companion unlocks after FIRST story-boss victory (first story boss confirmed at stage 10); technical G2 stage-2 boss is not proof. Earlier stage-7 unlock proposal is rejected.
- Hero-switching policy RESOLVED: owner confirms **variant B, one permanent selected main hero per playthrough**. Next owner review: campaign structure/first story boss stage, fifth companion exact abilities/identity; do not change G2-R engine/UI/save until gameplay scope is agreed.

## Gameplay 2.2 — owner-approved permanent hero (2026-11-19)
- [Gameplay Design 2.2](GAMEPLAY-DESIGN-2.2.md) states **CONFIRMED owner variant B:** one of four main heroes selected once, permanently for a playthrough; no paid/free switching or class swapping after confirmation.
- One-time warning/explicit commit and optional no-reward trial bout are design recommendations; legacy G2 must prompt for first actual permanent hero selection without auto-binding generic warrior. Independent profile/new-save option is OPEN.
- Starter trio Ard/Mira/Elira is **CONFIRMED**; fourth companion Kair after first-clear stage 3 is **CONFIRMED**, but **fifth after first story boss first victory is CONFIRMED**, with first boss on stage 10 CONFIRMED; fifth at 7 is REJECTED. New progression/hero-lock runtime functionality and save schema are NOT implemented. Legacy tests only prove old G2. G3/art and release remain BLOCKED.

## Owner decision — 2026-11-19 fifth companion milestone
- **OWNER CONFIRMED** fifth companion unlocks **after the player's first victory over the first story boss**, not before or on reaching the stage. If first boss is later assigned stage 10 in a 50-stage campaign, the award is at stage 10 by consequence, not because stage 10 itself was approved.
- Do not treat existing technical G2 stage 2 Rift Guardian as first story boss without explicit stage mapping and transition design. In schema v2, the fifth unlock is keyed to a semantic `first_story_boss_first_clear` milestone with once-only grant and no grant on defeat, repeat clear, reload, migration of `claimed:[2]` or stage entry.
- First story boss must be beatable by all 4 permanently chosen heroes using only companions available **before** its defeat. Starter three, fourth timing, fifth identity, first boss mechanics remain pending; campaign scale 5×10 and first boss stage 10 owner-approved.
- This is DESIGN CONFIRMED / RUNTIME NOT IMPLEMENTED; all prior 28/28 green CI receipts are legacy G2 only. G3 BLOCKED.

## Owner-approved starter trio — 2026-11-19
- **CONFIRMED** new game opens with Ard (`sentinel`), Mira (`ember`), Elira (`healer`) unlocked and all 3 in active companion slots after permanent hero confirmation. Kair/`ash` and fifth start locked; Kair after first-clear stage 3 CONFIRMED.
- Migrated G2 profiles preserve earlier available Kair access. No G2-R runtime/save code updated: success of previous legacy CI does not imply character progression implemented.

## Kair unlock owner approval — 2026-11-19
- Fourth companion Kair (`ash`) unlocks after **first successful clear of campaign stage 3**. This is CONFIRMED; first three Ard/Mira/Elira remain the default party and fifth unlocks after the first story-boss first clear. Legacy G2 entitlement to Kair must be preserved.
- G2-R implementation is still NOT_DONE. Earlier 28/28 tests verify legacy gameplay only; they do not prove unlocks, permanent hero choice or Save v2.

## Fifth companion role owner confirmation — 2026-11-19
- OWNER CONFIRMED: fifth companion is an **ice controller** specializing in enemy slowdown and dangerous-attack weakening. [Gameplay mechanic scope](FIFTH-COMPANION-ICE-CONTROL-0.1.md). G2-R must implement role-appropriate effects with bounded boss control only after precise skill design and tests.
- Companion #5 still unlocked after first story boss first victory, Kair after stage-3 first clear, starting Ard/Mira/Elira. No code/asset integration from these document changes. G2-R implementation NOT_DONE; G3 BLOCKED.

## Linear campaign-map approval — 2026-11-19
- Owner CONFIRMED **5 chapters × 10 stages = 50**, five **linear single-path maps** with ten nodes each; player travels between stage nodes, boss on 10/20/30/40/50. First story boss is **stage 10**. Fifth ice companion unlocked only after first victory there, Kair after first clear stage 3.
- Each of fifty stages has own unique original battle background, boss backgrounds included in 50, plus five chapter-map images: **55 distinct planned environment masters**. Descriptive inventory exists but actual originals, rights, runtime use-sites and art review are **MISSING**. No G3/G4 PASS.
- [Campaign Map 2.3](CAMPAIGN-MAP-2.3.md) [Art inventory](CAMPAIGN-ENVIRONMENT-ART-0.1.md) [WFA agent routing](AGENT-EXECUTION-G2-R.md). WFA roles are documented; **no subagent run occurred**, independent review NOT_RUN. The current ChatGPT connector can read/write GitHub but is not itself a multi-agent executor.
- Existing source still hard-codes technical G2 stage 1/2 (separate legacy boss). G2-R maps and Save v2 NOT_IMPLEMENTED; release flags false.

## Map-entry interaction approved — 2026-11-19
- OWNER CONFIRMED: click/tap available node → short travel along the linear route → stage preview → explicit «В бой». Do not start combat on node click or animation completion; same stable stage ID throughout.
- OWNER CONFIRMED: replay of CLEARED stages for reduced ordinary rewards. OPEN: amounts, duration/easing, camera-follow, skip. Double taps, portrait/background, save restore require regression before implementation can pass. No new map runtime or art implemented; independent WFA agent runs have NOT occurred.
- See [Campaign Map 2.3](CAMPAIGN-MAP-2.3.md) and [Acceptance](ACCEPTANCE.md).

## Repeatable CLEARED stages — approved 2026-11-19
- OWNER CONFIRMED: CLEARED stages can be selected on chapter maps and fought repeatedly for resources and leveling; each genuine repeat victory gives a reduced ordinary reward, first-clear/companion/chapter unlocks never repeat.
- G2-R requires separate per-attempt and first-clear idempotency, regression for reload/defeat/duplicate callbacks and exact balancing. The current legacy G2 yields 0 on repeats, so this is **DESIGN_CONFIRMED / NOT_IMPLEMENTED**. Economy quantities are OPEN.
- Separate WFA agents have NOT been executed; design changes are committed directly, not peer review evidence.

## Progression design approved 2026-11-19
- CONFIRMED: **no camp/squad level**; each of five companions levels separately with no companion skill upgrade trees. Only the selected permanent main hero has own level and **3 skills (4 upgrades each) + an upgradeable ultimate**; after **every hero level-up** player chooses which eligible ability to improve.
- OLD proposals of shared camp level and just 2 hero skills SUPERSEDED. **Companion levels purchased manually for gold CONFIRMED**; gold cost curve/limits/stats and **hero XP source from confirmed victories, reduced replay XP and loss 0 CONFIRMED**, as is **ultimate level 5 / 3 upgrades**; XP amounts and other balance OPEN. No companion/reserve XP. [Character Progression 2.4](CHARACTER-PROGRESSION-2.4.md).
- DESIGN_ONLY: no Save v2, updated 3+ult HUD, level-up choices, new character-level engine or regression have been run. Prior 28/28 legacy G2 tests only establish old runtime.

## Owner approval — companion gold leveling 2026-11-19
- **CONFIRMED:** each of five companions independently upgrades one level **manually via player-spent gold**. No companion XP or automated level-up, including reserve and idle. No companion skill trees; hero level-up/3+ultimate scheme remains separate.
- Cost, caps and stat curves OPEN; do not claim a single global gold-only economy or gold hero-level purchase. G2-R must perform atomic/idempotent `gold -= cost` and `companionLevel[id] += 1` per valid unlocked companion, reject insufficient gold/duplicates/corrupt save, and preserve old G2 gold, Kair access and relevant progress.
- **G2-R NOT_IMPLEMENTED**, new companion upgrade UI and domain tests NOT_RUN; only GDD/agent contract changed. [Progression 2.4](CHARACTER-PROGRESSION-2.4.md).

## Hero XP confirmation — 2026-11-19
- OWNER_CONFIRMED: permanent main hero earns XP from verified battle victories; when `heroXp` reaches a threshold, `heroLevel` advances and the player personally selects which of three skills (4 improvement ranks each) or eligible ultimate to upgrade. No auto distribution.
- Companions earn no XP; levels manually purchased with gold. Hero XP quantities/thresholds and **replay reduction factor**, PvP/idle XP, **ultimate unlock at hero level 5 and 3 upgrade steps are OWNER_CONFIRMED**, detailed effects OPEN. **Reduced XP for replay victory and 0 XP on defeat OWNER_CONFIRMED.**
- No G2-R skill allocation, new XP/reward logic, Save v2, event-based XP dedup or browser acceptance has been implemented; legacy G2 28/28 PASS does not cover them. [Progression 2.4](CHARACTER-PROGRESSION-2.4.md).

## Replay victory XP / defeat zero XP — owner confirmed 2026-11-19
- New legitimate replay victory over CLEARED stage pays **reduced positive hero XP** compared with that stage's first-clear XP, plus already-confirmed reduced ordinary gold. Losing, invalid or unfinished attempts grant **0 hero XP**. Companions gain no XP; they use manual gold upgrade.
- Levelup/upgrade choice accrual remains determined by earned XP; for a repeated callback of the same `attemptId`, no duplicate XP, heroLevel, skill points or rewards. XP amounts, ratio, level curve and PvP/idle remain OPEN.
- [Progression 2.4](CHARACTER-PROGRESSION-2.4.md) / [G2-R acceptance](ACCEPTANCE.md): **DESIGN_CONFIRMED / G2-R_NOT_IMPLEMENTED**; existing legacy G2 green CI cannot validate.

## Ultimate skill gate owner approval — 2026-11-19
- Hero ultimate unlocks at **heroLevel 5** and can be upgraded on **three separate user-selected improvement steps**; no automatic ultimate improvement at unlock. Ordinary hero abilities each permit four improvements; total hero improvements 12+3=**15**.
- G2-R must show skill locked at hero levels <5, reject casting/upgrading early, rank >3 and duplicate rank allocation; preserve level-up choices, unlock and upgrades in Save v2 and all four chosen hero kits. **Max hero level 16 OWNER_CONFIRMED**; post-cap XP accounting and exact level thresholds OPEN.
- Spec in [Character Progression 2.4](CHARACTER-PROGRESSION-2.4.md), acceptance in [ACCEPTANCE](ACCEPTANCE.md). No new runtime/QA tests. G2-R NOT_IMPLEMENTED.

## Max hero level 16 owner approved — 2026-11-19
- New profile heroLevel starts **1**, caps at **16**. 15 level-ups at hero levels 2–16 create exactly 15 user-selected upgrade choices (3 regular skills × 4 = 12 + 3 ultimate). Ultimate unlock on level 5 is free and does not auto-spend. Pending upgrades persist at cap; level 17 and 16th choice forbidden.
- Existing 50-stage replay and reduced gold rewards remain usable after hero reaches max. XP thresholds and storage/display at cap remain balance/UX OPEN; companion levels still bought with gold individually. This is documented contract, not production game behavior.
- [Character Progression 2.4](CHARACTER-PROGRESSION-2.4.md), [G2-R contract](G2-R-CHARACTER-SYSTEM-0.1.md). **G2-R NOT_IMPLEMENTED; no independent WFA agent test has run.**

## Rising hero XP curve approved — 2026-11-19
- **OWNER_CONFIRMED:** early hero levels gain faster, later levels require progressively more XP. Hero starts lvl1, capped lvl16, with 15 level-up choices across regular skills 3×4 + ultimate×3 (unlocks at lvl5). The exact XP table/function and replay XP multiplier remain OPEN.
- **G2-R balance gate:** tune against all 50 main stages plus low/medium/high replay-farming trajectories, not a simple isolated threshold; check that hero lvl16 isn't reached too early and stage10 boss requires no forced farm. First-clear XP usual, replay victories reduced, losses 0; companions never receive XP.
- [Hero XP Pacing 2.5](HERO-XP-PACING-2.5.md). This is **DOCUMENTED_DECISION**, not numeric balance PASS. No independent WFA agent has executed work; runtime G2-R and XP curves NOT_IMPLEMENTED.

## Economy Balance 0.1 — measured arithmetic model (2026-11-19)
- Created reproducible **candidate-only** [Economy Balance 0.1](ECONOMY-BALANCE-0.1.md), 15 proposed XP-to-next thresholds, full 50-stage per-stage XP/gold first-clear/replay schedule, boss first-clear bonus, individual companion gold-upgrade costs, normal/moderate/intensive replay simulation.
- **Candidate results:** XP total to hero lvl16 **4534**; normal 50 first wins → lvl5 at stage9, lvl16 at stage50, earned XP 4800, gold 13000; moderate 66 wins → lvl16 stage46, gold 14888; intensive 200 wins → lvl16 stage33, gold 30700. These are **numerical proposals not owner-approved balance**.
- [Simulator](../scripts/economy-balance.mjs), [10 regression tests](../tests/economy-balance.test.mjs), npm `balance:summary`, `balance:simulate`, `balance:test` commands. Node test suite on [exact model test commit `fd23421`, CI #44517075687](https://github.com/m-amirov/Norkavel/actions/runs/44517075687) **38/38 PASS**, including 10 new model arithmetic tests; Ludory Core and browser legacy G2 smoke PASS. This proves model arithmetic and old G2, **not** 4-hero combat balance or G2-R runtime.
- **No implemented XP economy, 50 real encounters, purchase logic, 4 unique skill kits, 5 maps/50 original backgrounds or independent WFA subagent runs.** G2-R remains NOT_IMPLEMENTED, G3/G4 blocked. Next gates: owner numeric review, combat model/seeded win rates for all 4 heroes and 50 stages, save+claim idempotency, device checks.

## Independent G2R-F03 review — 2026-11-19
- Domain F03 implementation confirmed on SHA `9242b03` and CI #44531993954 (55/55 Node and legacy G2 browser smoke PASS); G2-R runtime/UI not implemented.
- Pre-integration risks: structurally valid `stageId:10,victory` without fight provenance can grant fifth unlock; attempt receipt ledger silently stops advancing after 10,000 attempts. See [task queue review](TASK_QUEUE.md) and [acceptance review](ACCEPTANCE.md). Require regression before real XP/reward integration. No gameplay changes made by the review.

## G2R-P01 independent verification and next risk — 2026-11-19
- SHA `56ee069` [CI #44535832992](https://github.com/m-amirov/Norkavel/actions/runs/44535832992) SUCCESS, **60/60** Node tests and legacy G2 Chromium smoke. P01 **DOMAIN_PASS**, G2-R runtime and trusted combat outcome **NOT_IMPLEMENTED**. Current task queue: **G2R-E01 READY**, G2R-C01 also READY.
- Newly identified **XP_POLICY_REWARD_DRIFT**: policyId + thresholds are persisted, but 50 first/replay XP reward values are not bound to that identity. Add regression to reject changed reward tables under the same version/ID before live XP awards. See [TASK_QUEUE](TASK_QUEUE.md) and [ACCEPTANCE](ACCEPTANCE.md). No gameplay code was changed by this audit.

## G2R-E01 independent audit — 2026-11-19

- Domain work verified on `370dd43919ee6cce3669aad0c730bab1bd981e60`: [CI #44538317550](https://github.com/m-amirov/Norkavel/actions/runs/44538317550) SUCCESS, 66/66 Node PASS, Ludory Core and legacy Chromium smoke PASS. `upgradeCompanion` performs a pure in-memory atomic purchase, persistent policy snapshot and monotonic duplicate protection; XP reward-table identity correction also verified. **E01 DOMAIN_PASS**.
- Future integration risks: initial gold-cost policy must come from an authoritative config (domain accepts structurally valid caller-supplied policy) and multi-tab browser Save v2 must provide CAS/single-writer transaction semantics; independent copies can otherwise cause last-write-wins. Real win-gold source/UI and live purchase flow not implemented. See [acceptance](ACCEPTANCE.md) and [task queue](TASK_QUEUE.md). Next READY G2R-C01.

## G2R-C01 linear campaign domain — 2026-11-19

- `src/campaign-v1.mjs` defines and validates 5 linear chapters × 10 stages, stable `stage-001..050`, five maps, unique encounter/background/claim identities and boss nodes 10/20/30/40/50. Navigation is explicit `map → travel → preview → fight`; locked nodes and implicit fight starts fail closed, cleared stages remain replayable through the existing attempt ledger.
- Exact code SHA `6813b98a40bbddf47083f709e0e8443bded860e7`, [CI #44577561998](https://github.com/m-amirov/Norkavel/actions/runs/44577561998) SUCCESS: 72/72 Node, Ludory Core, WFA bootstrap and legacy Chromium smoke. **C01 DOMAIN_PASS**, not browser-map acceptance.
- Still missing: visible map/marker/travel UI, navigation persistence and multi-tab CAS, real mouse/touch/keyboard/portrait checks, trusted combat producer, production rewards/encounters, 50 battle backgrounds and 5 chapter-map artworks. G2R runtime/UI remains NOT_IMPLEMENTED; no independent READY task remains without owner content decisions or integration prerequisites.

## G2R-C01 verification and next independent task (2026-11-19)
- [CI #44578010597](https://github.com/m-amirov/Norkavel/actions/runs/44578010597) SUCCESS at `d88ed8a252ce90e0d825da240a8278638198227a`: 72/72 Node, Core smoke, legacy G2 headless Chromium smoke PASS. `src/campaign-v1.mjs` defines five chapters, 50 unique stage/encounter/background keys, boss stages 10/20/30/40/50 and valid map/travel/preview/explicit-fight domain semantics. Browser G2-R UI, travel animation, trusted combat proof and real 50 battles NOT_IMPLEMENTED.
- Former "no READY" state was too broad: **G2R-S01 (standalone versioned Save v2 persistence + stale/concurrent write protection) is independent of unapproved hero identities/art/XP cost numbers and has been added to [TASK_QUEUE](TASK_QUEUE.md)**. It must not silently replace `norkavel.g2.save.v1` or enable G2-R game mode. Cross-tab CAS/browser tests and migrated/invalid v1 recovery are required; selection UI and overall G2-R runtime remain separate.

## G2R-S01 transactional browser persistence — 2026-11-19

- `src/save-v2-store.mjs` implements a standalone IndexedDB Save v2 envelope and atomic compare-and-set transaction. Full rich profiles round-trip across reload; parallel same-revision contexts serialize to one commit/one stale rejection; aborted writes retain the previous record; corrupt/future formats fail closed without destructive overwrite. Legacy v1 preparation is read-only and preserves its exact checkpoint without implicit hero selection or rewards.
- Exact code SHA `5cb4700ba40f455b37efb16f47529466e33a1e39`, [CI #44580816549](https://github.com/m-amirov/Norkavel/actions/runs/44580816549) SUCCESS: 77/77 Node, Ludory Core, legacy G2 Chromium and dedicated two-context Save v2 Chromium smoke PASS. Adversarial review was degraded self-review because no independent agent executor was available; version-change connection cleanup and corrupt-record preservation were added and retested.
- This does **not** switch `web/main.mjs`, migrate users, provide cross-device/server consistency, authenticate battle/gold policy, or implement G2-R UI. F02 remains owner-blocked and G2R-INT dependency-blocked; no independent READY task remains.

## G2R-S01 independent verification and F02 owner gate (2026-11-19)
- [CI #44581276187](https://github.com/m-amirov/Norkavel/actions/runs/44581276187) SUCCESS on exact `fa2498dbbb23702fbecba191f00ff958bbb5307b`: **77/77** Node, Core, legacy G2 browser and standalone IndexedDB multi-page CAS smoke PASS. `compareAndSet` does read/compare/put within one `readwrite` transaction; competing revisions yield one commit and one `STALE_REVISION`; abort/corrupt/unsupported handling and readonly v1 candidate are verified. **STORE_PASS**, not full v2 onboarding or G2-R runtime.
- Next blocking **owner decision**, not another artificial domain-only task: [Hero Kits 0.1](HERO-KITS-REVIEW-0.1.md) proposes four 3+ultimate skill sets + candidate identities, but remains **NOT_APPROVED**. F02 remains BLOCKED_OWNER and G2R-INT blocked by actual gameplay implementation. No independent READY task at this boundary.

## G2R-F02 owner approval (2026-11-19)

- Owner explicitly approved four archetypes and skill kits from [Hero Kits 0.1](HERO-KITS-REVIEW-0.1.md) with fixed Save v2 mapping: `hero_slot_1` defender (Ровен, provisional), `hero_slot_2` elemental mage (Астера), `hero_slot_3` duelist (Сайрен), `hero_slot_4` ranger (Валис). Art, names, numerical balance remain OPEN.
- `G2R-F02` is now **READY** (F02a domain/test first); this commit changes documentation/decision gates only and cannot count as runtime/Save v2 browser onboarding/gameplay implementation.
- Existing [CI #44581276187](https://github.com/m-amirov/Norkavel/actions/runs/44581276187) 77/77 is S01 storage evidence; [CI #44584454244](https://github.com/m-amirov/Norkavel/actions/runs/44584454244) SUCCESS at Hero Kits review commit `c74e79187fa3b2ab478c8b3bdefe29c6f274a702` confirms only prior tests, not F02 implementation.
- G3 4+5 character art, 50 encounter content, full Save v2 UI and trusted battle reward producer remain incomplete; no publication.

## G2R-F02a hero-kit domain (2026-11-19)

- Новый изолированный `src/hero-kits-v1.mjs` связывает `hero_slot_1..4` с четырьмя подтверждёнными ролями и всеми 16 подтверждёнными навыками. Рабочие имена явно остаются `provisional`; production numbers не зашиты и поступают только через versioned injected policy.
- Resolver проверяет полный Profile v2, принадлежность навыка выбранному постоянному герою, level-5 gate ultimate, enemy target и exact battle/policy shape; возвращает детерминированные bounded records для damage, protection, control, combos, counters и marked priority. Invalid/non-finite/duplicate input возвращает `null` без мутации.
- Exact `6aedbfe3dbee5b0335603aedd069aac5c2c927a1`, [CI 44591621250](https://github.com/m-amirov/Norkavel/actions/runs/44591621250) SUCCESS: 82/82 Node, Ludory Core, WFA bootstrap, legacy G2 Chromium и Save v2 transactional Chromium PASS. Legacy combat/UI/save не изменены; F02b–F02d, production balance, boss viability и G2-R browser acceptance остаются NOT_IMPLEMENTED.

## G2R-F02b irreversible onboarding (2026-11-20; DONE_VERIFIED)

- Отдельный `/onboarding.html` использует чистый onboarding-controller и существующий IndexedDB Save v2 CAS: preview/cancel ничего не сохраняют, а permanent hero записывается только после явного предупреждения «Выбор останется навсегда». Повторное открытие показывает locked-профиль.
- Новый профиль и валидный prepared legacy v1 проходят один и тот же transactional flow; исходный v1 checkpoint и его сырые bytes остаются неизменными. Две вкладки с одной revision дают ровно один commit, stale-вкладка перечитывает победителя. Corrupt/future Save v2 fail closed и не перезаписывается.
- Реальный Chromium smoke покрывает 640×360 и 844×390 landscape, 390×844 и 1024×1366 portrait turn-device block, mouse/touch/keyboard, reload, race и отсутствие console/runtime errors. Локально PASS: 88/88 Node + Ludory Core, onboarding browser, legacy G2 browser и Save v2 browser.
- `web/main.mjs` и `src/combat.mjs` не импортируют onboarding и не переключены на незавершённый G2-R runtime. Production names/art/balance, actual 1+3 combat, trusted results/rewards и F02c/F02d остаются NOT_IMPLEMENTED. Проведён adversarial SELF_REVIEW; независимый reviewer в этой сессии недоступен.
- Exact implementation `48720875319d56750cdb7b870550e67fe14cdc3e`, [CI 44672516614](https://github.com/m-amirov/Norkavel/actions/runs/44672516614) SUCCESS: 88/88 Node, Ludory Core, WFA bootstrap, legacy G2 Chromium, Save v2 transactional Chromium и G2R-F02b onboarding Chromium PASS; hashed screenshot artifact загружен.

## G2R-F02c functional combat slice (2026-11-20; DONE_VERIFIED)

- `src/g2r-combat-v1.mjs` создаёт отдельный deterministic 1+3 бой из permanent hero и трёх active unlocked companions. Все 16 approved abilities применяют реальные damage/protection/control/combo mechanics; cooldown, timed statuses, boss resistance и level-5 ultimate gate задаются versioned policy, явно помеченной `engineering-candidate`.
- `/g2r-combat.html` — отдельный runtime/UI, не импортируемый legacy `web/main.mjs`. Mouse/touch/keyboard управляют навыками; portrait полностью останавливает simulation/input, landscape resume сохраняет state. Production art не заявлен.
- Save v2 хранит battle record отдельным CAS, связанным с profile revision, hero, ranks и party. Concurrent tabs сходятся к committed record; arbitrary valid profile CAS больше не может заменить или очистить `selectedHeroId`. Legacy profile обязан пройти explicit activation; recovery checkpoint остаётся неизменным.
- Exact implementation `530d18ec8c3fabe1a490790f753dba51526defdb`, [CI 44677521398](https://github.com/m-amirov/Norkavel/actions/runs/44677521398) SUCCESS: 98/98 Node + Ludory Core, WFA bootstrap, legacy G2, Save v2, onboarding и новый G2-R combat Chromium. Visual/runtime evidence: 844×390, 640×360, 390×844, hashed PNG artifact, console errors отсутствуют. SELF_REVIEW only.
- Граница: бой не подключён к campaign `begin/settle`, не начисляет XP/gold/unlocks и не является trusted result producer. Stage-10 boss viability/counterplays, 50 encounters, production balance/art, PvP/backend и release gates остаются открыты.

## G2R-F02d first story boss viability (2026-11-20; DONE_VERIFIED)

- `stage-010` имеет отдельный versioned encounter-контракт, телеграф и party-area dangerous attack; control resistance ограничивает длительность/силу, reward mode остаётся `none`. Legacy G2 boss stage 2 не используется.
- Исправлены kit-gap: aimed shot ставит mark для star barrage; Vanish даёт короткое evade с одноразовой counter readiness; Night of Blades создаёт четыре отдельных bounded hit event. Ard/Mira/Elira/Kair имеют измеримые guard/elemental/heal/offense действия.
- 32 фиксированных seed × 8 тактик дают 256 побед; 32 × 4 baseline дают 128 поражений. У каждого permanent hero две различающиеся тактики; `control` нигде не входит в party. Полная матрица и ограничения — [Stage-010 Balance 0.1](STAGE-010-BALANCE-0.1.md).
- Реальный Chromium проверил телеграф, victory/defeat, 844×390 и 640×360 landscape, 390×844 portrait block, mouse/touch/keyboard, reload, concurrent tab CAS, immutable hero и отсутствие наград. Exact implementation `bc8c4b2aafa9791cb1d1290f3d12f79f6873494a`, [CI 44705431274](https://github.com/m-amirov/Norkavel/actions/runs/44705431274) SUCCESS. Production balance, human playtest и independent reviewer остаются NOT_RUN.
