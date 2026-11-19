# Norkavel — единая очередь исполняемых задач

**Состояние:** 2026-11-19 · главный рабочий источник для команд «Продолжай».  
**Правило:** первый элемент с `READY`, выполненными зависимостями и минимальными неопределённостями. Задачи разбивать на **реальные проверяемые срезы**; запись DONE — только после проверки на exact SHA в `origin/main`.

**Текущая граница:** G2 legacy browser playable; **G2R-F01, F03, P01, E01 и C01 domain foundation проверены**, но G2-R runtime/UI, trusted combat-result producer и атомная запись v2 в browser storage ещё не реализованы. Economy Balance 0.1 проверен арифметически, но его **численные значения не утверждены окончательно**, G3 production art не принят. См. [Project Status](PROJECT_STATUS.md), [Acceptance](ACCEPTANCE.md) и [WFA agent routing](AGENT-EXECUTION-G2-R.md).

## Правила очереди

Статусы: `READY`, `IN_PROGRESS`, `AWAITING_CI`, `DONE_VERIFIED`, `BLOCKED_OWNER`, `BLOCKED_DEPENDENCY`. Не считать старые CI прототипа подтверждением нового G2-R. Если READY задача слишком крупная — сделать первый **внутренний функциональный срез**, с тестами и explicit remaining acceptance. Ветку/PR, если нужны, вести по WFA main-first; не переписывать другие репозитории без отдельной причины.

| Приоритет | ID | Задача | Зависимости | Текущий статус |
|---|---|---|---|---|
| 1 | G2R-F01 | Проверяемый foundation: модель профиля v2 и безопасная совместимость с G2 v1 | действующие GDD/DECISIONS и actual Ludory Core | **DONE_VERIFIED — `27be4dd`, CI 44526368550** |
| 2 | G2R-F02 | Постоянный выбор 1 из 4 героев + 3 уникальных обычных навыка/ульта каждому в UI и бою | G2R-F01; **идентичности и exact skill kits — OWNER_OPEN** | **BLOCKED_OWNER (content), independent persistence work permitted** |
| 3 | G2R-F03 | Roster 5, 3 активных/2 резервных, unlock stage3/10, безопасные first-clear claim receipts | G2R-F01 | **DONE_VERIFIED — `e384e5e`, CI 44531383856** |
| 4 | G2R-P01 | Отдельная прогрессия героя (lvl1–16, XP за победы, 15 player choices, ultimate lvl5) | G2R-F01; skill effects when moving to combat; economy values remain CANDIDATE | **DONE_VERIFIED — `85114c6`, CI 44535563965** |
| 5 | G2R-E01 | Ручная прокачка каждого спутника за золото, atomic purchase ledger, denied/double-purchase cases | G2R-F01 + G2R-F03; числа Economy 0.1 **CANDIDATE** | **DONE_VERIFIED — `4af6c6f`, CI 44537806684** |
| 6 | G2R-C01 | Доменная линейная кампания 5×10, 50 stage IDs, 5 chapter map IDs, маршруты/preview/explicit fight/replay | G2R-F01 + G2R-F03, недостающие stage details фиксировать как OPEN | **DONE_VERIFIED — `6813b98`, CI 44577561998** |
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

**Фактический выход P01:** `beginCampaignAttempt` разрешает только replay уже пройденного или следующий последовательный stage и сохраняет active attempt с монотонным sequence; settlement больше не принимает stage из результата и заменяет ограниченный массив из 10 000 receipt IDs на сохраняемый cursor. Победа требует валидную внешнюю XP-policy v1: 15 cumulative thresholds со строго возрастающими XP-to-next интервалами, 50 положительных first/replay наград и replay < first; policy ID и threshold snapshot фиксируются в профиле. Defeat даёт 0 XP, multi-level начисляет все pending choices, lvl16 не становится lvl17, 3×4 regular + 3 ultimate расходуют ровно 15 ручных выборов. Production-чисел в коде нет; test policy не является Economy Balance 0.1. [CI 44535563965](https://github.com/m-amirov/Norkavel/actions/runs/44535563965) на exact `85114c6`: 60/60 Node, Ludory smoke, project WFA bootstrap и legacy Chromium smoke PASS. Реальный combat producer outcome, browser v2 flow и skill effects остаются NOT_IMPLEMENTED.

**Фактический выход E01:** `upgradeCompanion` принимает strict purchase v1 с монотонными `purchaseSequence`/`purchaseId`, `expectedLevel` и полным immutable snapshot внешней cost-policy. Успех атомарно списывает только policy cost, повышает ровно одного unlocked спутника и не меняет party/hero/остальные уровни; duplicate/reload, locked/unknown, stale level, insufficient gold, cap и policy drift возвращают исходный объект. Все пять спутников, включая резервных, покрыты; победы их автоматически не повышают; cursor проверен после 10 000 покупок. Попутно P01 теперь сохраняет обе 50-row XP reward tables и отвергает same-ID drift после reload. Production prices/cap не встроены. [CI 44537806684](https://github.com/m-amirov/Norkavel/actions/runs/44537806684) на exact `4af6c6f`: 66/66 Node, Ludory smoke, project WFA bootstrap и legacy Chromium smoke PASS. Browser UI/CAS/storage и легальный production gold source остаются NOT_IMPLEMENTED.

## Правило перехода к следующей задаче

После выполнения `G2R-F01` агент меняет её статус на `DONE_VERIFIED` с **SHA + тесты + CI URL**, изменяет зависимости и берёт следующую `READY`. Если по owner-OPEN заблокирована только визуальная часть F02, можно двигаться к F03/domain/progression engine, не реализуя неподтверждённый арт/боевые наборы.

**Никаких обязательных больших промтов от пользователя:** очередь и ссылки на источники делают задачу самодостаточной. Если агент самостоятельно выбрал другое задание, он обязан объяснить blocker/зависимости и доказать, что переход безопасен.

## Независимая проверка F03 — 2026-11-19 (вход в G2R-P01)

**Факт:** F03 доменная модель и 55/55 CI на `9242b034534e58f6574c729150a5d1e51df39415` / run `44531993954` подтверждены. **Два риска не закрыты существующими тестами:**

1. **RISK-G2R-01 / RESULT_PROVENANCE — DOMAIN_PARTIAL_FIXED at `85114c6`:** forged/early stage10, stale/out-of-order result и stage mismatch отклоняются; first-clear/replay выводятся только из активной канонической попытки и последовательного campaign ledger. **Остаётся runtime blocker:** trusted combat producer ещё не подключён, поэтому чистый модуль сам не доказывает, что `outcome:victory` получен из реального боя.
2. **RISK-G2R-02 / RECEIPT_EXHAUSTION — FIXED at `85114c6`:** монотонный `settledAttemptCount` + единственная сохраняемая active attempt заменили массив receipt IDs; 10 001-я попытка, reload и повтор старого результата покрыты regression test без повторной награды.

**Приоритет:** эти риски — блокирующие для подключения G2R-P01 к реальной кампании и сохранениям, **но не отменяют F03 DOMAIN_PASS**. Их можно исправить отдельным малым shared-domain срезом до XP-integration. Числа Economy Balance 0.1 остаются CANDIDATE; не внедрять без решения владельца. Отдельно сохранять доказательство, что `activateLegacyProfileV2` пока меняет **только объект в памяти**, а не браузерное хранилище.

**Следующий Codex prompt по штатной процедуре:** `Продолжай Norkavel.` Агент обязан прочитать эти замечания из TASK_QUEUE и обеспечить regression coverage прежде чем объявить G2R-P01 интегрированным.

## Проверка P01 по exact SHA — 2026-11-19

**DOMAIN_PASS:** [CI #44535832992](https://github.com/m-amirov/Norkavel/actions/runs/44535832992) SUCCESS на `56ee069396aa6e1eec521f8ce485afa7b5bd0663`, 60/60 Node PASS, Ludory Core и legacy G2 browser smoke PASS. Реализована отдельная модель XP: 15 возрастающих XP-интервалов, 50 first/replay pairs, lvl 1..16, до 15 pending skill choices, ultimate unlock lvl5, поражение XP 0, последовательные canonical attempts и cursor >10000 после JSON reload. **Это не runtime/UI G2-R PASS.**

**RISK-G2R-03 / XP_POLICY_REWARD_DRIFT — FIXED at `4af6c6f`:** профиль сохраняет immutable `xpRewardTables` вместе с ID/thresholds; same-ID drift любой first/replay row после JSON reload отклоняется без settlement. Version rollover остаётся только явной будущей миграцией, а не неявной сменой аргумента.

**Связь с G2R-E01:** gold costs и gold first/replay awards остаются owner-review; при manual companion purchases принимать цены из версионированной внешней policy с полной идентичностью и stale `purchaseId`/expectedLevel protection. Не включать численные кандидаты Economy Balance 0.1 как утверждённые. Нужен легальный источник золота до end-to-end UI acceptance; отдельно оставить решение о боевом producer, browser atomic storage и доверии к результату. Следующая READY задача **G2R-E01**, дополнительно READY **G2R-C01**.

## Аудит G2R-E01 на exact SHA — 2026-11-19

**Проверено:** `370dd43919ee6cce3669aad0c730bab1bd981e60`, [CI #44538317550](https://github.com/m-amirov/Norkavel/actions/runs/44538317550) SUCCESS: 66/66 Node PASS, Ludory Core PASS, legacy G2 browser smoke PASS. `upgradeCompanion` атомарно обновляет `gold`, `companionProgress[id].level` и `settledPurchaseCount` **в одном in-memory профиле**; сохранённая полная policy предотвращает same-ID price drift, последовательность/expectedLevel предотвращают повторное списание в последовательной обработке после JSON reload. Все пять, включая резервных, допускают покупку при разблокировке. XP reward table drift из P01 закрыт. **DOMAIN_PASS, не END-TO-END PURCHASE PASS.**

**Интеграционные гейты (не новые блокеры чистой доменной задачи):**
- **RISK-G2R-04 / TRUSTED_GOLD_COST_POLICY:** первая покупка принимает любую структурно допустимую внешнюю `companionUpgradePolicy` от caller; snapshot policy защищает будущие изменения, **но не аутентифицирует происхождение исходных цен**. Перед production UI покупками связать их с доверенной, утверждённой политикой приложения, с проверяемым version/content identity; отклонять подмену цен и защититься от client-side spoofing, особенно при async PvP/ranking. Не внедрять стоимость Economy Balance 0.1 как OWNER_CONFIRMED.
- **RISK-G2R-05 / MULTI_TAB_CAS:** при двух вкладках с одной исходной копией профиля и purchaseSequence=1 оба независимых in-memory вызова могут успешно вернуть разные профили, а простая last-write-wins запись потеряет один результат/состояние кошелька. При подключении `Save v2` нужна serializable persist/CAS (или обоснованная single-writer coordination) с revision, stale-write rejection, transaction retry и регрессией simultaneous purchases/reload. **Нет кросс-вкладочной транзакционности в текущем F01–E01.**
- На момент аудита E01 приоритетом был **G2R-C01 (5×10 карта/кампания)**; теперь его domain-срез завершён. Гейты RISK-G2R-04/05 должны закрываться на соответствующем этапе persistence/integration. Gold first/replay награды для нового runtime и UI ещё не внедрены.

## Фактический выход G2R-C01

`src/campaign-v1.mjs` добавляет валидируемый неизменяемый каталог из 5 глав, 50 последовательных `stage-001..050`, 5 уникальных `mapId`, 50 уникальных `encounterId`/`backgroundId`/`firstClearClaimId` и boss-флагов строго 10/20/30/40/50. Чистая navigation state machine реализует `chapter_map → travelling → stage_preview → explicit beginCampaignAttempt`, не запускает бой по tap/arrival, фиксирует первый быстрый tap, безопасно отменяет travel, запрещает locked stage и разрешает CLEARED replay через существующий canonical attempt ledger. [CI 44577561998](https://github.com/m-amirov/Norkavel/actions/runs/44577561998) на exact `6813b98`: 72/72 Node, Ludory Core, project WFA bootstrap и legacy Chromium smoke PASS.

**Граница:** это DOMAIN_PASS. Реальный chapter-map UI, видимая анимация/marker, mouse/touch/keyboard/portrait browser acceptance, navigation persistence/CAS, trusted combat outcome, production rewards, 50 encounters и 55 art assets не реализованы. Следующая интеграционная задача G2R-INT остаётся `BLOCKED_DEPENDENCY`; G2R-F02 content — `BLOCKED_OWNER`, поэтому новой независимой READY-задачи сейчас нет.
