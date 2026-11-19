# Norkavel — единая очередь исполняемых задач

**Состояние:** 2026-11-19 · главный рабочий источник для команд «Продолжай».  
**Правило:** первый элемент с `READY`, выполненными зависимостями и минимальными неопределённостями. Задачи разбивать на **реальные проверяемые срезы**; запись DONE — только после проверки на exact SHA в `origin/main`.

**Текущая граница:** G2 legacy browser playable; **G2R-F01 и G2R-F03 domain foundation проверены**, но G2-R runtime/UI и атомная запись v2 в browser storage ещё не реализованы. Economy Balance 0.1 проверен арифметически, но его **численные значения не утверждены окончательно**, G3 production art не принят. См. [Project Status](PROJECT_STATUS.md), [Acceptance](ACCEPTANCE.md) и [WFA agent routing](AGENT-EXECUTION-G2-R.md).

## Правила очереди

Статусы: `READY`, `IN_PROGRESS`, `AWAITING_CI`, `DONE_VERIFIED`, `BLOCKED_OWNER`, `BLOCKED_DEPENDENCY`. Не считать старые CI прототипа подтверждением нового G2-R. Если READY задача слишком крупная — сделать первый **внутренний функциональный срез**, с тестами и explicit remaining acceptance. Ветку/PR, если нужны, вести по WFA main-first; не переписывать другие репозитории без отдельной причины.

| Приоритет | ID | Задача | Зависимости | Текущий статус |
|---|---|---|---|---|
| 1 | G2R-F01 | Проверяемый foundation: модель профиля v2 и безопасная совместимость с G2 v1 | действующие GDD/DECISIONS и actual Ludory Core | **DONE_VERIFIED — `27be4dd`, CI 44526368550** |
| 2 | G2R-F02 | Постоянный выбор 1 из 4 героев + 3 уникальных обычных навыка/ульта каждому в UI и бою | G2R-F01; **идентичности и exact skill kits — OWNER_OPEN** | **BLOCKED_OWNER (content), independent persistence work permitted** |
| 3 | G2R-F03 | Roster 5, 3 активных/2 резервных, unlock stage3/10, безопасные first-clear claim receipts | G2R-F01 | **DONE_VERIFIED — `e384e5e`, CI 44531383856** |
| **NOW** | **G2R-P01** | **Отдельная прогрессия героя (lvl1–16, XP за победы, 15 player choices, ultimate lvl5)** | G2R-F01; skill effects when moving to combat; economy values remain CANDIDATE | **READY** |
| 5 | G2R-E01 | Ручная прокачка каждого спутника за золото, atomic purchase ledger, denied/double-purchase cases | G2R-F01 + G2R-F03; числа Economy 0.1 **CANDIDATE** | READY |
| 6 | G2R-C01 | Доменная линейная кампания 5×10, 50 stage IDs, 5 chapter map IDs, маршруты/preview/explicit fight/replay | G2R-F01 + G2R-F03, недостающие stage details фиксировать как OPEN | READY |
| 7 | G2R-INT | Сведение 4 hero kits / 50 encounter battle balance / все награды / browser UX landscape / migration | Предыдущие задачи + реальный контент и результаты | BLOCKED_DEPENDENCY |
| 8 | G3-ART | Production art 4 hero+5 companions+враги/боссы, 50 уникальных полей боя и 5 карт глав | Арт-решения, реальные source/rights assets, отдельная визуальная приёмка | BLOCKED_OWNER / ART_PRODUCTION |
| 9 | G4–G7 | Полный контент, серверный async PvP, QA и релизный кандидат Яндекс Игр | Настоящие G2-R/G3 gates и platform decisions | BLOCKED_DEPENDENCY |

## G2R-F01 — первая исполняемая задача

**Цель:** не строить весь 50-этапный проект за один раз, а создать безопасную основу дальнейшей реализации без порчи старого G2.

**Что сделать в этом срезе:**
- Исследовать фактический `src/combat.mjs`, `web/main.mjs`, текущий `schema:1`/`norkavel.g2.save.v1`, Ludory Core state/save APIs и existing tests. **Самостоятельно определить место кода**, а не предполагать конкретные файлы для новых модулей.
- Создать/подготовить изолированную **версионированную схему нового профиля**, которая умеет выражать `heroId` (неизменяемый **после явного выбора**, не установленный автоматически у прежнего игрока), `heroLevel` 1..16, XP, pending skill choices, индивидуальные уровни пяти спутников, unlock и 3 active slots, first-clear/reward ledgers. Там, где ID/skill-названия не подтверждены, использовать только явно документируемую совместимую модель/временный внутренний контракт, не объявлять его новым утверждённым героем или окончательным UI.
- Старое G2 v1 должно **сохраняться/восстанавливаться без потери исходных данных**. Если старая схема не содержит однозначного постоянного выбора героя, вернуть `selectionRequired` / миграционное ожидание явного решения, **не назначать hero_guard автоматически**. Не выдавать из технического старого boss stage2 ice-controller stage10 unlock.
- На первом срезе **не переключать текущий игровой runtime на неполный профиль**, не удалять старый ключ/snapshot и не добавлять моковую награду. Реальную миграцию записывать только при безопасной и проверенной политике сохранения gold/claimed/Kair. Поскольку conversion старого `level` в 15 skill choices OPEN, **не создавать очков или hero XP из воздуха**.
- Проверки: новый профиль валиден, readonly v1 parse, invalid/corrupt fail-closed, однажды выбранный герой immutable, 5 companion identities/3 active slots, невозможность locked characters в отряде; старые G2 tests/preview не сломаны. Если часть модели зависит от неутверждённых идентичностей/баланса, честно разделить **исполняемую** и **BLOCKED_OWNER** части и не притворяться, что новый G2-R интерфейс готов.
- Любой конфликт с Ludory/Core/WFA оформить с конкретным исходником; не делать масштабный рефакторинг `src/combat.mjs` без необходимости.

**Exit gate F01:** новый доменный код с unit и негативными regression tests; безопасный legacy read/restore без silent irreversible migration; `npm run check` и применимые Ludory/браузерные проверки **реально выполнены**; exact HEAD в `origin/main` и CI receipt. Только после этого поставить `DONE_VERIFIED`, обновить acceptance/status и открыть F03/F02-domain.

**Не делать в F01:** фальшивые четыре полностью готовых героя, 55 временных картинок как production art, имитацию серверного PvP, неподтверждённую раздачу ресурсов по формулам Economy 0.1, новые рекламные/монетизационные зависимости.

**Фактический выход F01:** `src/profile-v2.mjs` вводит отдельную schema 2 с provisional `hero_slot_1..4`, подтверждёнными пятью companion slots (пятый technical ID `control`), starter/legacy invariants, одноразовым immutable hero selection и readonly `prepareLegacyProfileV2`. Старый runtime/key не переключён и v1 checkpoint сохраняется целиком; old `level` остаётся только legacy history и не создаёт XP/skill choices. [CI 44526368550](https://github.com/m-amirov/Norkavel/actions/runs/44526368550) на exact `27be4dd`: 46/46 Node, Ludory smoke, project WFA bootstrap и Chromium legacy smoke PASS. Atomic v2 persistence/onboarding UI остаются следующими срезами.

**Фактический выход F03:** `activateLegacyProfileV2` отделяет изменяемое v2-состояние от неизменного recovery checkpoint с сохранением gold/party/prototype claims/Kair; `settleVerifiedCampaignResult` принимает строгий result v1, дедуплицирует `attemptId`, выводит first-clear из ledger и атомарно открывает `ash` на stage 3 и provisional `control`/`ice_controller` на stage 10. `assignCompanionSlot` меняет любой из трёх слотов только вне боя и только на unlocked ID. Исправления F01: ultimate rank запрещён до heroLevel 5; companion-level validator использует только safe-integer boundary, а не неутверждённый gameplay cap 100. [CI 44531383856](https://github.com/m-amirov/Norkavel/actions/runs/44531383856) на exact `e384e5e`: 55/55 Node, Ludory smoke, project WFA bootstrap и Chromium legacy smoke PASS. UI/browser v2 flow и запись нового save key остаются NOT_IMPLEMENTED.

## Правило перехода к следующей задаче

После выполнения `G2R-F01` агент меняет её статус на `DONE_VERIFIED` с **SHA + тесты + CI URL**, изменяет зависимости и берёт следующую `READY`. Если по owner-OPEN заблокирована только визуальная часть F02, можно двигаться к F03/domain/progression engine, не реализуя неподтверждённый арт/боевые наборы.

**Никаких обязательных больших промтов от пользователя:** очередь и ссылки на источники делают задачу самодостаточной. Если агент самостоятельно выбрал другое задание, он обязан объяснить blocker/зависимости и доказать, что переход безопасен.

## Независимая проверка F03 — 2026-11-19 (вход в G2R-P01)

**Факт:** F03 доменная модель и 55/55 CI на `9242b034534e58f6574c729150a5d1e51df39415` / run `44531993954` подтверждены. **Два риска не закрыты существующими тестами:**

1. **RISK-G2R-01 / RESULT_PROVENANCE:** в `src/profile-v2.mjs` `validCampaignResult` (строки 251–256 на проверенном SHA) проверяет только типы и диапазоны `stageId`, `attemptId` и `outcome`. Вызов `settleVerifiedCampaignResult` с формально корректной победой на stage10 может разблокировать ледяного спутника **без доказанного сыгранного боя, пройденных этапов 1–9 или подтверждённого сюжетного босса**. Тесты F03 намеренно допускают stage3/10 без всей кампании. Это допустимо только для изолированного доменного тестирования, **недопустимо для фактической выдачи из UI/сохранения/боевого runtime**. До начисления XP/золота привязать результат к проверяемому реальному боевому сеансу и достигнутому stageId, validate first-clear vs replay, boss provenance и канонический переход карты. Reject forged/stale/out-of-order result без изменения ledgers/ростера, негативные тесты.
2. **RISK-G2R-02 / RECEIPT_EXHAUSTION:** `validStringLedger(rewardReceiptIds, 10000)` + `settleVerifiedCampaignResult` образуют **тихий отказ дальнейших результатов** при 10 000 записанных попыток: при добавлении 10 001-й `validateProfileV2` отвергает новый профиль, settle возвращает старый. Повторный PvE фарм утверждён владельцем и не должен навсегда блокироваться технической длиной ledger. Принять безопасную сохраняемую политику масштабирования/компактизации receipts без повторного начисления, не удалять информацию о дублях необдуманно. Тест при границе и после неё, после reload и повторного receipt.

**Приоритет:** эти риски — блокирующие для подключения G2R-P01 к реальной кампании и сохранениям, **но не отменяют F03 DOMAIN_PASS**. Их можно исправить отдельным малым shared-domain срезом до XP-integration. Числа Economy Balance 0.1 остаются CANDIDATE; не внедрять без решения владельца. Отдельно сохранять доказательство, что `activateLegacyProfileV2` пока меняет **только объект в памяти**, а не браузерное хранилище.

**Следующий Codex prompt по штатной процедуре:** `Продолжай Norkavel.` Агент обязан прочитать эти замечания из TASK_QUEUE и обеспечить regression coverage прежде чем объявить G2R-P01 интегрированным.
