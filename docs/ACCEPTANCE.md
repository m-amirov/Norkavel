# Norkavel — Acceptance / Requirements Traceability

**Дата:** 2026-11-18. Источники требований: GDD.md, docs/GDD-1.0.md, owner decisions.  
**Правило:** SPECIFIED означает «написано», а не PASS. Никаких G2–G7 PASS без реальных доказательств.

| ID | Требование | Gate | Обязательное доказательство | Текущий статус |
|---|---|---|---|---|
| NKV-001 | Ludory Core metadata + lifecycle + snapshot | bootstrap | Node 22 smoke exact source SHA | PASS_BOOTSTRAP_CI |
| NKV-002 | WFA project Skill routing и activation | bootstrap | dry-run/installed receipts, positive/negative Codex calls | PARTIAL_CI_INSTALL; CODEX_ACTIVATION_NOT_RUN |
| NKV-003 | Один главный герой + 3 спутника участвуют в бою | G2 | runtime state + browser playback | SPECIFIED |
| NKV-004 | 2D бой с видом сбоку | G2/G3 | реальная запись экрана + independent pixel review | SPECIFIED |
| NKV-005 | Deterministic fixed-tick simulation и replay | G2 | seeded equality + 1000+ scenario tests | SPECIFIED |
| NKV-006 | PvE autoattack, click cap и 2 активных скилла | G2 | script input, cooldown cap tests | SPECIFIED |
| NKV-007 | Замена спутника/позиции/синергии влияет на исход | G2 | deterministic A/B outcome | SPECIFIED |
| NKV-008 | Boss telegraph, victory/defeat/retry | G2 | browser smoke обоих исходов | SPECIFIED |
| NKV-009 | Сохранение и корректное восстановление PvE | G2/G4 | valid/corrupt/old save tests | SPECIFIED |
| NKV-010 | Кампания: 5 глав, 50 этапов, 5 боссов | G4 | level coverage, reachable stages | SPECIFIED |
| NKV-011 | 4 стартовых класса героя и их навыки | G4 | combat balance + class coverage | SPECIFIED |
| NKV-012 | 12 спутников, 6 синергий, экипировка | G4 | manifest + use-site + tests | SPECIFIED |
| NKV-013 | Server-authoritative async PvP, replay и защиты | G4/G5 | adversarial request and replay test suite | BLOCKED |
| NKV-014 | Реальное PvP только асинхронное, без ручных кликов | G4 | multiplayer functional and input-blocking tests | SPECIFIED |
| NKV-015 | Лиги, leaderboard и 14-дневные сезоны | G4/G5 | server-ranked score, anti-double-claim, rollover | BLOCKED |
| NKV-016 | 5 ежедневных задач, 20 достижений | G4 | reset/reward/idempotency, reachability | SPECIFIED |
| NKV-017 | Idle income до 8 часов без накрутки | G4 | clock manipulation/rollback/duplicate claims | SPECIFIED |
| NKV-018 | Optional rewarded / cosmetics без PvP pay-to-win | G6 | trusted payment/ads integration evidence if enabled | BLOCKED |
| NKV-019 | Production 2D art, лицензии, анимации, адаптивность | G3/G6 | source/rights + visual reviews + device QA | BLOCKED |
| NKV-020 | Yandex local candidate / platform approval | G6/G7 | ZIP receipt, source hash, live SDK, real moderation, owner approval | BLOCKED |
| NKV-021 | Вся мобильная игра только landscape; portrait — экран поворота | G2/G3 | real browser orientation change tests, screen capture, no hidden inputs, state/reward invariants, fallback when orientation lock unavailable | SPECIFIED |

## Набор будущих тестов (ещё не выполнялись)
- Domain: damage, statuses, AI target priority, critical PRNG, seed replay determinism, save migration, cooldown, idle duplicate grants.
- Balance: 1000+ seeded team compositions; win-rate targets are hypotheses, not human enjoyment evidence.
- UI: альбомные мобильные размеры 640×360, 667×375, 844×390, 915×412; landscape планшет и desktop 1280×720/1440×900; портретные 360×640, 390×844, 768×1024 — **только** полноэкранный экран «Поверните устройство». Проверить portrait → landscape → portrait при активном бою, touch/keyboard, safe areas, отсутствие скрытых нажатий и двойных наград, pause/resume, background tab, reload, fallback без доступного orientation lock API.
- PvP: server authentication, anti-spoof, stale defense snapshot, double submission, clock skew, season rollover, leaderboard integrity.
- Human: novice player can explain hero role, companion synergy and cause of win/fail without prompting.

## G2 First Playable — exit contract
Игра обязана **реально** запуститься в браузере и пройти путь start → action → observed result → win/fail → retry. Действия игрока и смена спутника имеют измеримый эффект. Никакие фиктивные арты, mock SDK или обещанный backend не закрывают G3/G4/G7.

## Release gates
G5 actual browser/device/human evidence; G6 exact SHA and package receipt plus asset rights; G7 real Yandex approval and explicit owner authorization. Всегда releaseReady=false и publicationAllowed=false, пока gates фактически не закрыты.

## Проверенный bootstrap receipt
- [GitHub Actions success on 38d3a606](https://github.com/m-amirov/Norkavel/actions/runs/44368140239): clean checkout, pinned submodules, Node 22 tests/Core smoke, WFA project-scoped 11 Skills install, WFA manifest check. Установка ephemeral, не в пользовательском HOME.
