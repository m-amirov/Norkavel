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
- **NKV-031:** User chooses one of exactly **4 distinct main heroes**. Selection persists through setup, fight, save/reload and future async PvP snapshot; never field a second main hero. **CONFIRMED / NOT_IMPLEMENTED**.
- **NKV-032:** Exactly **5 distinct companions** exist in the unlockable collection; unlock occurs gradually through gameplay, and locked companions cannot be put in the team. Specific unlock milestones remain OPEN. **CONFIRMED / NOT_IMPLEMENTED**.
- **NKV-033:** Active party has **4 units = 1 hero + 3 distinct unlocked companions**, with 2 reserve companions when all five are unlocked; all three companion slots configurable outside fights. **LEGACY_PARTY_SIZE_PASS / CORRECT_COLLECTION_AND_SLOTS_NOT_IMPLEMENTED**.
- **NKV-034:** Explicit compatibility/migration for schema:1 / local save with one fixed hero and missing unlock data, preserving existing progress without accidental retroactive permanent hero selection. **NOT_IMPLEMENTED**.
- **NKV-035:** G3 includes **4 separate hero masters + 5 companion masters**, not four renamed candidate companion PNGs. Prior Art 0.3 generated four *companions* only. **BLOCKED_ART**.
- **NKV-036:** Names/classes/visual personalities of four selectable heroes, fifth companion and schedule of unlocks need content specification. **OPEN_DETAILS / COUNTS_CONFIRMED**.
- Historical G2 boss, browser and G3 art tests do **not** prove NKV-031–035. Any new PASS requires direct validation on the new code and exact commit SHA.
