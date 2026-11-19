# Norkavel — Acceptance / Requirements Traceability

**Дата:** 2026-11-19. Требования: [GDD 1.1](GDD-1.1.md), GDD.md, owner decisions; GDD 1.0 is historical.  
**Правило:** SPECIFIED означает «написано», а не PASS. Никаких G2–G7 PASS без реальных доказательств.

| ID | Требование | Gate | Обязательное доказательство | Текущий статус |
|---|---|---|---|---|
| NKV-001 | Ludory Core metadata + lifecycle + snapshot | bootstrap | Node 22 smoke exact source SHA | PASS_BOOTSTRAP_CI |
| NKV-002 | WFA project Skill routing и activation | bootstrap | dry-run/installed receipts, positive/negative Codex calls | PARTIAL_CI_INSTALL; CODEX_ACTIVATION_NOT_RUN |
| NKV-003 | Один главный герой + 3 спутника участвуют в бою | G2 | runtime state + browser playback | PASS_G2_BROWSER |
| NKV-004 | 2D бой с видом сбоку | G2/G3 | реальная запись экрана + independent pixel review | G2_SIDEVIEW_PASS / G3_ART_BLOCKED |
| NKV-005 | Deterministic fixed-tick simulation и replay | G2 | seeded equality + 1000+ scenario tests | PARTIAL: 1800 SCENARIOS PASS, FIXED_SEED_INVARIANTS_PASS; REPLAY_FORMAT_NOT_IMPLEMENTED |
| NKV-006 | PvE autoattack, click cap и 2 активных скилла | G2 | script input, cooldown cap tests | PASS_G2_BROWSER_AND_UNIT |
| NKV-007 | Замена спутника/позиции/синергии влияет на исход | G2 | deterministic A/B outcome | PASS_G2_UNIT |
| NKV-008 | Boss telegraph, victory/defeat/retry | G2 | browser smoke обоих исходов | PASS_G2_BROWSER: real victory, controlled fixture AND natural seeded boss defeat/retry, interrupt |
| NKV-009 | Сохранение и корректное восстановление PvE | G2/G4 | valid/corrupt/old save tests | PASS_G2_BROWSER: valid/reload, invalid + legacy fail-closed |
| NKV-010 | Кампания: 5 глав, 50 этапов, 5 боссов | G4 | level coverage, reachable stages | SPECIFIED |
| NKV-011 | **4 selectable distinct main heroes, 1 chosen in a party** | G2-R/G3/G4 | choice, persistence, unique gameplay/art, browser+unit | CONFIRMED_SPEC; NOT_IMPLEMENTED |
| NKV-012 | **5 unlockable companions in collection, exactly 3 active from unlocked** | G2-R/G3/G4 | 5 unique IDs, unlock, 3 distinct slots, UI and save regression | CONFIRMED_SPEC; NOT_IMPLEMENTED |
| NKV-013 | Server-authoritative async PvP, replay и защиты | G4/G5 | adversarial request and replay test suite | BLOCKED |
| NKV-014 | Реальное PvP только асинхронное, без ручных кликов | G4 | multiplayer functional and input-blocking tests | SPECIFIED |
| NKV-015 | Лиги, leaderboard и 14-дневные сезоны | G4/G5 | server-ranked score, anti-double-claim, rollover | BLOCKED |
| NKV-016 | 5 ежедневных задач, 20 достижений | G4 | reset/reward/idempotency, reachability | SPECIFIED |
| NKV-017 | Idle income до 8 часов без накрутки | G4 | clock manipulation/rollback/duplicate claims | SPECIFIED |
| NKV-018 | Optional rewarded / cosmetics без PvP pay-to-win | G6 | trusted payment/ads integration evidence if enabled | BLOCKED |
| NKV-019 | Production 2D art, лицензии, анимации, адаптивность | G3/G6 | source/rights + visual reviews + device QA | BLOCKED |
| NKV-020 | Yandex local candidate / platform approval | G6/G7 | ZIP receipt, source hash, live SDK, real moderation, owner approval | BLOCKED |
| NKV-021 | Вся мобильная игра только landscape; portrait — экран поворота | G2/G3 | real browser orientation change tests, screen capture, no hidden inputs, state/reward invariants, fallback when orientation lock unavailable | PARTIAL: EXTENDED_CHROMIUM_PASS 360/390/768/1024 portrait, 640/667/844/915 landscape + touch; PHYSICAL_DEVICE_NOT_RUN |

## Набор оставшихся проверок (выполненное отделено от плана)
- Domain: damage, statuses, AI target priority, critical PRNG, seed replay determinism, save migration, cooldown, idle duplicate grants.
- Balance: historical 1800 pre-tune seeded scenarios exposed trivial boss. The follow-up [0.2 retune](G2-BOSS-BALANCE-0.2.md) ran 1800 boss scenarios across 6 tactics and demonstrates meaningful survival differences. Win-rate targets remain provisional hypotheses, not human enjoyment evidence.
- UI: альбомные мобильные размеры 640×360, 667×375, 844×390, 915×412; landscape планшет и desktop 1280×720/1440×900; портретные 360×640, 390×844, 768×1024, 1024×1366 — **только** полноэкранный экран «Поверните устройство». Проверить portrait → landscape → portrait при активном бою, touch/keyboard, safe areas, отсутствие скрытых нажатий и двойных наград, pause/resume, background tab, reload, fallback без доступного orientation lock API.
- PvP: server authentication, anti-spoof, stale defense snapshot, double submission, clock skew, season rollover, leaderboard integrity.
- Human: novice player can explain hero role, companion synergy and cause of win/fail without prompting.

## G2 First Playable — exit contract
Игра обязана **реально** запуститься в браузере и пройти путь start → action → observed result → win/fail → retry. Действия игрока и смена спутника имеют измеримый эффект. Никакие фиктивные арты, mock SDK или обещанный backend не закрывают G3/G4/G7.

## Release gates
G5 actual browser/device/human evidence; G6 exact SHA and package receipt plus asset rights; G7 real Yandex approval and explicit owner authorization. Всегда releaseReady=false и publicationAllowed=false, пока gates фактически не закрыты.

## Проверенный bootstrap receipt
- [GitHub Actions success on 38d3a606](https://github.com/m-amirov/Norkavel/actions/runs/44368140239): clean checkout, pinned submodules, Node 22 tests/Core smoke, WFA project-scoped 11 Skills install, WFA manifest check. Установка ephemeral, не в пользовательском HOME.

## G2 Browser receipt (actual)
- [GitHub Actions 44374853507, commit ac1cdf2](https://github.com/m-amirov/Norkavel/actions/runs/44374853507): Chromium mouse click, two active skill wiring, manual pause, portrait-block/resume including 1024×1366 tablet, first clear, real Core snapshot reload, duplicate reward prevention, retry, boss warning+interrupt. Screenshot artifact uploaded.
- [G2 visual audit](qa/G2-visual-audit-2026-11-18.md): placeholder art is not accepted as production art.

## Art Production 0.1 additions
- NKV-022: Real PNG image source for hero and location, registered SHA-256, dimensions, and runtime scene mapping. Mechanical tests and actual browser decode/capture are required; artistic/rights do not inherit mechanical PASS.
- NKV-023: Full candidate production library **4 main heroes + 5 companions**, with **1+3 active**, plus enemies/boss; full animation and rights acceptance. NOT_READY.

### Verified Art Production 0.1 evidence
- **NKV-022 mechanical PASS**: Source SHA-256 and PNG dimension contract in CI [44455017226](https://github.com/m-amirov/Norkavel/actions/runs/44455017226).
- **NKV-022 runtime PASS (bounded)**: Image decode, current browser gameplay and viewport capture in CI [44455353856](https://github.com/m-amirov/Norkavel/actions/runs/44455353856). Three landscape viewport screenshots (640, 667, 915) checked for structural overflow.
- **NKV-023 still BLOCKED**: no illustrated full roster, true animation sheets, independent art review or rights certificate. No G3 closure.

## 2026-11-19 — Extended G2 receipts
- [CI 44458525616 on `a2d1d5d`: SUCCESS](https://github.com/m-amirov/Norkavel/actions/runs/44458525616); 19/19 Node tests, Core smoke, real Chromium mouse/touch/portrait/landscape, victory and controlled defeat/retry, validation of invalid/legacy saves, console diagnostics.
- NKV-009 validation **rejects structurally incomplete unit payloads**, malformed events and impossible party composition before restoring into the session. This is crash/integrity hardening, **not** anti-cheat for client-controlled currency or PvP.
- NKV-024 Art Production 0.2: companion lineup candidate was generated and provided outside source control; `docs/ART_PRODUCTION-0.2.md` registers SHA/visual brief but no runtime or CI asset proof. STATUS CONCEPT_ONLY / ART_GATE_BLOCKED.
- Pending before G2 owner acceptance: human difficulty/counterplay playtest, physical devices and touch safe areas, independent usability test. The boss 0.2 mechanical gate is PASS; G3 full roster animation/rights remains BLOCKED. Release flags remain false.

### Balance sampling receipt (2026-11-19)
- [CI 44459324594 at `140a495e`: SUCCESS](https://github.com/m-amirov/Norkavel/actions/runs/44459324594), 22/22 Node tests PASS + Chromium browser smoke PASS.
- [Measured balance evidence](G2-BALANCE-0.1.md): 1200 PvE first-stage + 600 boss seeded scenarios, 200 more maximum-legal-tap damage samples (18.4% damage share).
- NKV-025 manual click cap balance within provisional GDD share for sampled team/stage: **MECHANICAL_SAMPLE_PASS**, not global balance proof.
- NKV-026 first boss survival/counterplay: historical 0.1 DESIGN_GATE_OPEN (0 losses / 600 samples), superseded by [0.2 measured gate](G2-BOSS-BALANCE-0.2.md): **PROVISIONAL_MECHANICAL_PASS**, healer-idle 118/300 wins vs timed interrupts 300/300, ash-idle 247/300. Independent human acceptance NOT_RUN.

### First-boss 0.2 regression / seed variety receipt (2026-11-19)
- [CI 44461330338 / `fcf3b4a`: SUCCESS](https://github.com/m-amirov/Norkavel/actions/runs/44461330338): 23/23 Node tests PASS including 1800 boss tactics, 200 click damage observations, seeded replay equality, reward idempotency and Core smoke; Chromium natural boss defeat on selected valid stage-two setup, not just a wounded fixture.
- NKV-027 consecutive PvE attempts use deterministic advancing seeds: **UNIT + BROWSER PASS**; per-player initial entropy is not implemented, production PvP seeds remain server-authoritative by design (not implemented).
- NKV-026 preliminary engineered balance targets PASS on sampled seeds, final targets and human difficulty sign-off remain OPEN.

### G3 Art Production 0.3 candidate gate
- **NKV-028** Four individual static companion concept masters generated in the conversation with transparent PNG/WebP and SHA manifest: `SOURCE_PACK_PREPARED_NOT_COMMITTED`.
- **NKV-029** Strict optional asset registration/Canvas render and deterministic WebP import tooling: `CODE_COMMITTED; ACTUAL_G3_BINARY_IMPORT_NOT_RUN`. Test evidence only after exact SHA workflow success; no false loaded art claims.
- **NKV-030** Boss, enemies, production pose animations, independent pixel review and usage rights: `BLOCKED`.
- See [G3 Art Production 0.3](G3-ART-PRODUCTION-0.3.md); do not treat screenshot concept boards as integrated game art.

### 2026-11-19 — Owner-confirmed roster correction (GDD 1.1)
- **NKV-031:** User chooses one of exactly **4 distinct main heroes**. Selection persists through setup, fight, save/reload and future async PvP snapshot; never field a second main hero. **DOMAIN FOUNDATION PASS at `27be4dd`: four provisional slots + immutable one-time selection; UI/combat/save write NOT_IMPLEMENTED**.
- **NKV-032:** Exactly **5 distinct companions** exist in the unlockable collection; unlock occurs gradually through gameplay, and locked companions cannot be put in the team. **DOMAIN PASS at `e384e5e`: strict stage 3/10 first-clear receipts, locked rejection and idempotency; UI/runtime integration NOT_IMPLEMENTED.**
- **NKV-033:** Active party has **4 units = 1 hero + 3 distinct unlocked companions**, with 2 reserve companions when all five are unlocked; all three companion slots configurable outside fights. **DOMAIN PASS at `e384e5e`: all three slots replace/swap unlocked IDs outside combat; browser collection UI NOT_IMPLEMENTED**.
- **NKV-034:** Explicit compatibility/migration for schema:1 / local save with one fixed hero and missing unlock data, preserving existing progress without accidental retroactive permanent hero selection. **READONLY PREPARATION PASS at `27be4dd`; atomic v2 persistence/browser onboarding NOT_IMPLEMENTED**.
- **NKV-035:** G3 includes **4 separate hero masters + 5 companion masters**, not four renamed candidate companion PNGs. Prior Art 0.3 generated four *companions* only. **BLOCKED_ART**.
- **NKV-036:** Names/classes/visual personalities of four selectable heroes, fifth companion **name/art/skill details** and first-story-boss stage **10 OWNER_CONFIRMED**; exact hero/companion names and skill details still need specification; fifth **ice-controller role is OWNER_CONFIRMED**; Kair after first-clear stage 3 CONFIRMED; fifth's **boss-clear trigger** is CONFIRMED. **OPEN_DETAILS / COUNTS_AND_FIFTH_TRIGGER_CONFIRMED**.
- Historical G2 boss, browser and G3 art tests do **not** prove NKV-031–035. Any new PASS requires direct validation on the new code and exact commit SHA.

- Current [G3 scope correction 0.4](G3-ART-PRODUCTION-0.4.md) is **PLAN_ONLY**, not a proof of actual nine ally masters or animations.

### 2026-11-19 — G2-R design-first records
- [Gameplay Design 2.0](GAMEPLAY-SYSTEM-2.0.md) supplies a complete high-level game-system proposal. **DESIGN_DRAFT / OWNER_REVIEW_REQUIRED**, not gameplay implementation.
- [G2-R Character System 0.1](G2-R-CHARACTER-SYSTEM-0.1.md) specifies Save v2, v1 migration and G2R-01..G2R-14 verifiable acceptance criteria. **F01 DOMAIN FOUNDATION VERIFIED / END-TO-END G2-R NOT_IMPLEMENTED**.
- Already approved: permanent hero choice (no swapping), starter companions Ard/Mira/Elira, Kair stage-3 first-clear, fifth after first story-boss first-clear, fifth role **ice controller**. Approval still needed for hero/companion identities, exact skill kits, first story boss stage ID, campaign length and economy. Confirmed roster quantities are not pending.
- Historical 28/28 test PASS must not be counted as proof that player can select 4 distinct heroes or unlock 5 companions.

### Gameplay Design 2.1 — scope clarification
- [Gameplay 2.1](GAMEPLAY-DESIGN-2.1.md): 4 hero proposed skill kits, 5 companion role niches, line formation/AI, status rules, first ten stages, proposed economy and gate questions. **DESIGN_DRAFT / NOT_IMPLEMENTED / NOT_TESTED**.
- Confirmed 4 main heroes, five unlockable companions, battle team 1+3, landscape-only and async-only PvP unchanged. Fifth companion stage-10 unlock is a **proposal** competing with previous stage-7 proposal, not an approved reward.
- G2-R, G3 and release gates remain blocked pending owner design review and implementation evidence.

### Hero permanence — owner decision B (2026-11-19)
- **NKV-037: CONFIRMED_SPEC / NOT_IMPLEMENTED:** 1 of 4 different main heroes chosen **once** per playthrough with explicit confirmation and cannot be changed afterwards; no menu, free swap or premium swap. [Gameplay Design 2.2](GAMEPLAY-DESIGN-2.2.md).
- **NKV-038: DESIGN_PROPOSAL / NOT_IMPLEMENTED:** optional pre-confirmation test fight must not mutate real save, gold, first-clear, unlocks or committed hero ID.
- **NKV-039: G2-R_NOT_IMPLEMENTED:** four individual hero profiles must independently complete the campaign, including bosses, with their permanently selected hero and only available companion counters. Do not demand all heroes in one player profile.
- **NKV-040: MUTABLE_V2_ACTIVATION_DOMAIN_PASS / ATOMIC_WRITE_NOT_IMPLEMENTED:** `prepareLegacyProfileV2` keeps the generic hero unselected; `activateLegacyProfileV2` permits later v2 mutations while retaining the intact checkpoint and imported gold/level/claimed/party/Kair provenance. Runtime onboarding and writing the new key remain open.
- **NKV-041: UNLOCK_DESIGN_OPEN:** **starter triple Ard/Mira/Elira CONFIRMED**; Kair stage-3 first-clear CONFIRMED; **fifth after first STORY boss first victory is CONFIRMED by owner** (stage 10 OWNER_CONFIRMED). No runtime PASS claim.
- GitHub CI verifying document changes does not prove permanent hero runtime implementation; G2-R and G3 remain blocked.

### Boss-first-clear unlock decision — owner confirmed 2026-11-19
- **NKV-042 CONFIRMED_REQUIREMENT / NOT_IMPLEMENTED:** fifth companion unlocked once and only once **AFTER first victory over first story boss**. Not at stage entry; not on defeat, repeat victory or speculative stage 7; no premium gate. Validate atomic boss first-clear + unlock on exact SHA.
- **NKV-043 REQUIREMENT / NOT_IMPLEMENTED:** semantic `first_story_boss_first_clear` event, independent of provisional stage index 10 and existing *technical* G2 boss stage 2; v1 `claimed:[2]` cannot silently grant fifth on migration.
- **NKV-044 REQUIRED_BALANCE / NOT_TESTED:** all four permanent main heroes must be able to defeat the first story boss using only the first four unlockable companions (three active), without needing the fifth.
- **OPEN:** fifth's name/appearance and numerical skill tuning (ice controller role is CONFIRMED), plus first story boss stage 10 (owner-approved). [Gameplay 2.2](GAMEPLAY-DESIGN-2.2.md) and [G2-R Contract](G2-R-CHARACTER-SYSTEM-0.1.md).

### Starter companions confirmed — 2026-11-19
- **NKV-045 DOMAIN_PASS / RUNTIME_NOT_IMPLEMENTED**: new schema-2 profile starts with Ard/sentinel, Mira/ember, Elira/healer unlocked and active; Kair and fifth remain locked until validated stage 3/10 first victories.
- **NKV-046 ACTIVATION_AND_JSON_RESTORE_PASS / BROWSER_PERSISTENCE_NOT_IMPLEMENTED**: valid v1 activation preserves Kair/ash access, exact party, gold and prototype claims while retaining the recovery checkpoint; no browser v2 write occurs yet.
- Fourth's trigger (Kair after first-clear stage 3) CONFIRMED; fifth after first story boss first victory is CONFIRMED. Existing G2 tests cannot prove these new state rules.

### Kair stage 3 — owner confirmed 2026-11-19
- **NKV-047 DOMAIN_PASS at `e384e5e` / UI_NOT_IMPLEMENTED:** Kair (`ash`) unlocks once on first verified stage-3 victory; defeat, unrelated stage, replay and duplicate attempt do not regrant it, and party stays unchanged.
- **NKV-048 DOMAIN_MIGRATION_PASS / BROWSER_NOT_IMPLEMENTED:** activated legacy profiles retain Kair without stage-3 receipt, then can progress to 5/5 and survive JSON restore without losing imported values.

### Fifth companion ice-controller role — 2026-11-19
- **NKV-049 CATALOG_AND_UNLOCK_DOMAIN_PASS / COMBAT_NOT_IMPLEMENTED:** companion #5 uses provisional `control` with `role=ice_controller` and unlocks once on first verified stage-10 story-boss victory. Slow/weaken effects, name, ability rules, cooldowns and numbers remain OPEN. [Design brief](FIFTH-COMPANION-ICE-CONTROL-0.1.md).
- **NKV-050 DESIGN+BALANCE_PENDING:** cap slow/weaken, prevent boss stunlock; prove observable impact and first-story-boss clear by each permanent main hero without fifth. No new unit/browser receipts yet; older 28/28 PASS tests are legacy and do not prove ice-control abilities.

### Linear campaign map and unique backgrounds — owner confirmed 2026-11-19
- **NKV-051 / NKV-CMP-01:** exactly five chapters × ten ordered stage nodes (1–50), boss flag on 10,20,30,40,50, with deterministic contiguous progression. **CONFIRMED_SPEC / NOT_IMPLEMENTED**.
- **NKV-052 / NKV-CMP-02-03:** 5 illustrated maps with linear, non-branching linked nodes and visible player marker traversal; locked nodes cannot be entered, CLEARED nodes are replayable (OWNER_CONFIRMED), ordinary reward reduced, stage preview follows correct node. **CONFIRMED_SPEC / CODE_AND_BROWSER_NOT_RUN**.
- **NKV-053 / NKV-CMP-04,09:** each of 50 stage IDs has its own original battle backdrop, plus 5 unique maps (55 environment masters; 5 boss arenas included in 50). Check actual files, SHA, stage mapping, rights, visual uniqueness, mobile cropping/decode budgets. **CONFIRMED_ASSET_SCOPE / 55_ORIGINALS_NOT_GENERATED / G3_BLOCKED**.
- **NKV-054 / NKV-CMP-05-08:** first-clear stage 3 Kair; stage 10 first story boss ice controller, map travel and post-clear chapter opening idempotent; save reload/legacy G2 migration, mouse/touch/portrait. **REQUIRED / G2-R_NOT_IMPLEMENTED**.
- **WFA agent audit status:** [plan and role routing](AGENT-EXECUTION-G2-R.md) PREPARED, **independent agent runs NOT_STARTED**, no Reviewer/QA agent PASS. CI checks old G2 only.

### Map travel UX owner approved — 2026-11-19
- **NKV-055 / NKV-CMP-03 CONFIRMED_SPEC / NOT_IMPLEMENTED:** click/tap an available chapter-map node → short visible marker travel along the single route → show the corresponding stage card **after arrival** → battle starts **only on the «В бой» button**, not on node tap or arrival.
- **NKV-056 / G2R-23 NOT_TESTED:** fast taps, invalid stage selection, pause/background/reload, portrait, touch/mouse must not start hidden fights, advance milestones or mint first-clear rewards; map preview and battle must use the same canonical stage ID.
- **UX_CONFIRMED:** replay of CLEARED stages for reduced ordinary rewards; **UX_OPEN:** animation skip, camera motion, travel timing/easing. Legacy G2 browser PASS is not navigation evidence.

### Cleared-stage replay & farming — owner confirmed 2026-11-19
- **NKV-057 CONFIRMED_SPEC / G2-R_NOT_IMPLEMENTED:** any cleared stage remains replayable by travelling to its chapter-map node → stage card → explicit «В бой», for resources/upgrades. Cannot use replay to enter locked stages.
- **NKV-058 NOT_TESTED:** every new verified replay win earns a reduced ordinary reward (below first clear) exactly once per `attemptId`. Duplicate callback/reload/defeat/invalid snapshot yields no duplicate win reward. Replaying stage 3 or 10 does not duplicate Kair/ice-controller/chapter grants.
- **NKV-059 BALANCE_OPEN:** reward amounts, resources, caps and anti-farm/idle balance; legacy G2 0-replay economy is not proof.

### Owner-approved individual progression (19.11.2026)
- **NKV-060 / NKV-PRG-01 CONFIRMED_SPEC / NOT_IMPLEMENTED:** no shared camp level. All five companions each have an independent level (persisted even in reserve), no companion skill improvement trees.
- **NKV-061 / NKV-PRG-02 CONFIRMED_SPEC / NOT_IMPLEMENTED:** permanently chosen main hero has own level, three different skills with **four upgrade steps each**, plus upgradeable ultimate. Four selectable main heroes need distinct 3+ultimate kits.
- **NKV-062 / NKV-PRG-03 CONFIRMED_SPEC / NOT_IMPLEMENTED:** after each hero level-up, player personally chooses what to improve, no auto assignment. Reject an upgrade beyond 4/4 of regular skill, duplicate choices, stale snapshots. Companion level-up is not a hero improvement choice.
- **NKV-063 / NKV-PRG-04 OWNER_REVIEW:** hero XP from winning battles CONFIRMED; numerical amounts/thresholds and replay XP multiplier (replay-reduced / defeat-zero CONFIRMED), skill effects, ult cap/unlock, **hero level cap 16 CONFIRMED**, companion cap and gold cost curve, stat growth and old v1 `level` mapping. Companion XP is REJECTED. [Character Progression 2.4](CHARACTER-PROGRESSION-2.4.md); previous G2 2-ability runtime is not proof.

### Manual gold upgrades for companions — owner confirmed 2026-11-19
- **NKV-064 / NKV-PRG-07 CONFIRMED_SPEC / NOT_IMPLEMENTED:** each **unlocked** companion has its own level, and player **manually buys a single next level with gold**. No companion XP auto-levels or skill upgrade tree. Show current level and next-level gold cost; reserve companions can retain and manually advance their own level.
- **NKV-065 / NKV-PRG-08 REQUIRED / NOT_TESTED:** valid purchase atomically debits gold and increments **only** selected companion level once; locked Kair/fifth, insufficient gold, duplicate `purchaseId`, stale `expectedLevel`, cap overflow and invalid save cannot debit/award. Browser and unit tests must demonstrate reload and rapid double-click idempotence.
- **NKV-066 BALANCE_OPEN:** price curve, level cap, stat scaling, initial Kair/fifth levels and affordability, especially stage-3 / first-boss pacing. Schema validation intentionally has no gameplay cap `100`; its positive safe-integer bound is serialization safety only. Hero XP values, replay coefficient and skill tuning remain OPEN. No G2-R runtime or independent QA PASS.

### XP from victorious battles — owner confirmed 2026-11-19
- **NKV-067 / NKV-PRG-09 DOMAIN_PASS at `85114c6` / RUNTIME_NOT_IMPLEMENTED:** an authorized domain victory grants policy-derived XP only to the selected hero; threshold crossings create manual pending choices and never modify companion levels. Real combat producer/browser integration remains open.
- **NKV-068 / NKV-PRG-10 DOMAIN_PASS:** monotonic attempt sequence rejects duplicate/stale callbacks after JSON reload; multi-level victory persists every unspent choice, and legacy preparation still mints no XP/levels/points. Browser save-v2 write remains unimplemented.
- **NKV-069 BALANCE_OPEN:** numerical XP/pacing, replay XP multiplier, PvP/idle and ultimate skill effects (ultimate unlock level 5 and 3 upgrades CONFIRMED); **replay victory XP reduced and defeat XP zero are OWNER_CONFIRMED**. Existing green G2 tests do **not** establish new XP/skill-choice system.

### Hero XP on replay wins and defeats — owner confirmed 2026-11-19
- **NKV-070 / NKV-PRG-11 DOMAIN_PASS:** policy validation requires positive first-clear and replay XP for all 50 stages with replay strictly smaller; defeat grants zero and cannot level or create a choice. Test policy is not production balance.
- **NKV-071 / NKV-PRG-12 DOMAIN_PASS / COMBAT_PRODUCER_OPEN:** distinct authorized replays advance the cursor and award once; the same/stale result after reload cannot re-award XP, levels, choices or milestones. Actual browser navigation and trusted battle outcome remain untested.
- **NKV-072 OWNER_REVIEW / BALANCE_OPEN:** XP stage schedule, reduced-XP ratio/rounding, thresholds/caps and PvP/idle XP remain undecided. No G2-R system code or independent QA has been executed.

### Ultimate progression — owner approval 2026-11-19
- **NKV-073 / NKV-PRG-13 DOMAIN_GATE_PASS / COMBAT_NOT_IMPLEMENTED:** schema and `upgradeHeroSkill` reject ultimate rank before hero level 5; at level 5 a pending player choice can raise rank 0→1 without an automatic/free rank. Full hero progression remains G2R-P01.
- **NKV-074 / NKV-PRG-14 DOMAIN_PROGRESSION_PASS / COMBAT_NOT_IMPLEMENTED:** early upgrade and rank 4 are rejected; multi-level XP settlement and JSON reload are covered. Casting and four unique ultimate effects remain unimplemented.
- **NKV-075 BALANCE_OPEN:** hero level cap 16 CONFIRMED, XP thresholds/skill effects, ultimate cooldown, post-cap XP accounting OPEN. Legacy G2 with 2 skills does not establish G2-R pass.

### Maximum hero level 16 — OWNER CONFIRMED 2026-11-19
- **NKV-076 / NKV-PRG-15 DOMAIN_PASS:** hero starts at level 1, accumulates exactly 15 manual choices through level 16, and 3×4 regular plus 3 ultimate ranks consume them without automatic ultimate rank.
- **NKV-077 / NKV-PRG-16 DOMAIN_PASS / BROWSER_OPEN:** validator and settlement reject level 17/extra rank, preserve pending choices and lifetime XP at cap, enforce rank caps and deduplicate after JSON reload. Legacy gold/party/Kair/checkpoint remain preserved; browser persistence is still open.
- **NKV-078 XP_BALANCE_OPEN:** exact XP thresholds 2..16 and display/accounting after cap (no promise of lvl17), economic pacing of 50 stages and replays. Old G2 green smoke tests do not satisfy these new criteria.

### Nonlinear XP curve — owner confirmation 2026-11-19
- **NKV-079 / NKV-PRG-17 DOMAIN_POLICY_PASS / NUMBERS_OPEN:** policy contract stores 15 strictly increasing positive cumulative thresholds, derives level 1–16 and forbids a 16th choice. Exact production thresholds remain owner-open.
- **NKV-080 / NKV-PRG-18 BALANCE_NOT_RUN:** simulate 50 ordered stages for no-farm, moderate-farm and intensive replay; compare actual hero level curve and timing, ensure first story boss remains achievable without forced grind and player doesn't cap too soon. Replay positive but reduced XP; defeat 0.
- **NKV-081 NUMBERS_OPEN:** actual per-level XP thresholds and stage XP, replay multiplier, rounding, desired level milestones, post-cap XP accounting. Require versioned config and exact-head tests; prior G2 CI proves none of this. [Hero XP Pacing 2.5](HERO-XP-PACING-2.5.md).

### Economy Balance 0.1 — candidate numerical model (2026-11-19)
- **NKV-082 / EB-01: MODEL_COMPLETENESS / PASS_ARITHMETIC:** 15 positive strictly increasing XP deltas to lvl16, 50 first-clear stage XP/gold values and repeat values, 5 one-time boss bonuses, independent companion cost curve (still **CANDIDATE**, not owner-approved numbers).
- **NKV-083 / EB-02: CI MODEL PASS:** [CI #44517075687 at exact `fd23421`](https://github.com/m-amirov/Norkavel/actions/runs/44517075687) **38/38 Node tests PASS** including 10 new model tests; old Ludory Core and browser G2 smoke PASS. Later changes must get own exact-HEAD receipt before PASS claim. Arithmetic tests do NOT validate new gameplay runtime.
- **NKV-084 / EB-03: OWNER_NUMBERS_REVIEW:** proposed XP curve cumulative 4534, base stage XP/gold, boss bonuses, replay 40% XP/50% gold and companion gold upgrade formula **NOT OWNER_CONFIRMED**. Current green tests do not convert proposals to accepted economy.
- **NKV-085 / EB-04: ARITHMETIC_SCENARIOS_RUN / REAL_BATTLE_NOT_RUN:** normal cap lvl16 stage50 (50 wins); moderate stage46 (66 wins); intensive stage33 (200 wins). No 4-class encounter win-rate, boss counterplay, manual skill kit, AFK and duration evidence for 50-stage campaign.
- **NKV-086 / EB-05: DOMAIN_XP_PASS / RUNTIME_BLOCKED:** policy-bound XP, scalable per-attempt idempotency, 15 choices and cap are implemented in the isolated v2 domain. Manual companion purchases, approved production values, Save v2 and actual UI/browser flow remain NOT_IMPLEMENTED.
- Full formulas, scenarios, costs and complete 50-row table: [Economy Balance 0.1](ECONOMY-BALANCE-0.1.md). Never call this RELEASE_PASS.

### Независимая code review проверка G2R-F03 — 2026-11-19

- **F03 domain tests confirmed:** exact `9242b034534e58f6574c729150a5d1e51df39415`, [CI #44531993954](https://github.com/m-amirov/Norkavel/actions/runs/44531993954) **55/55 Node PASS**, Ludory Core smoke PASS, legacy headless Chromium smoke PASS. Реальная игра не использует v2 UI/сохранение; F03 acceptance ограничена изолированной моделью.
- **NKV-087 / DOMAIN_PROVENANCE_PARTIAL_PASS / RUNTIME_BLOCKER:** `beginCampaignAttempt` запрещает недостижимый stage10, выводит first-clear/replay из последовательного ledger и связывает result с единственной active attempt; mismatched/stale/out-of-order result не меняет профиль. Trusted combat producer, доказывающий реальный `outcome`, ещё не подключён.
- **NKV-088 / LONG_SESSION_DOMAIN_PASS:** ограниченный `rewardReceiptIds` удалён; monotonic `settledAttemptCount` принимает 10 001-ю попытку после JSON reload и блокирует повтор старого sequence без повторной награды.
- **NKV-089 / STORAGE_NOT_IMPLEMENTED:** `activateLegacyProfileV2` только переводит in-memory checkpoint в режим изменяемого профиля и сохраняет источник; атомная browser-storage запись/восстановление ещё отсутствует. Legacy green browser smoke не подтверждает её.
- Дополнительный gate перед рабочей XP/award интеграцией: негативные тесты forged/early boss stage10, duplicate race, reward ledger exhaustion, restore и failure atomicity; real browser G2-R checks на exact SHA. Не приписывать эти проверки текущему 55/55 PASS.
