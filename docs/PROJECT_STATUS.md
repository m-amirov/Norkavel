# Norkavel — project status

**Codex handoff:** для короткого «Продолжай Norkavel» действуют [Agent Workflow](AGENT-WORKFLOW.md) и [Task Queue](TASK_QUEUE.md). **NEXT READY = G2R-F01 (profile v2 / safe legacy compatibility)**. Это не доказательство запуска агента или реализации задачи. Не путать проверенную арифметику Economy Balance 0.1 с утверждённым игровым балансом. Текущий G2-R runtime NOT_IMPLEMENTED.


**Дата обновления:** 2026-11-19. Current boundary: **G2-R DESIGN_DRAFT / FUNCTIONAL_G2-R_NOT_IMPLEMENTED / G3 BLOCKED**.

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
