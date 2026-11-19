# Norkavel — Gameplay Design 2.2: постоянный главный герой и открытие спутников

**Дата:** 2026-11-19  
**Статус:** HERO_CHOICE_B_CONFIRMED / UNLOCKS_PROPOSED / G2-R_NOT_IMPLEMENTED  
**Приоритет:** выбранное владельцем постоянство главного героя имеет приоритет над предложениями свободной смены в Gameplay 2.0, Gameplay 2.1 и G2-R 0.1. Другие решения остаются проектными до согласования.

## 1. Подтверждено владельцем

- При начале прохождения игрок **однократно выбирает одного из четырёх разных главных героев**. После подтверждения изменить главного героя в этом прохождении **нельзя**.
- Всего **пять постепенно открываемых спутников**, в бою участвуют **три разных открытых спутника** и **один выбранный главный герой**. Остальные не сражаются.
- В PvE автобой с опциональными навыками/кликами; PvP исключительно асинхронное; мобильные экраны только landscape. Нельзя переименовывать четыре прежних арта спутников в четыре арта героев.
- **Другие профили или сброс прохождения** не являются частью решения Б и требуют самостоятельного согласования. Нельзя тайно заменить постоянного героя при нажатии «Новая игра», восстановлении или оплате.

## 2. Onboarding постоянного героя

**Рекомендуемый UX, требует утверждения деталей:** экран четырёх уникальных персонажей с именем, ролью, собственным артом, двумя способностями, пассивкой, сильной и слабой стороной. Предварительный выбор карточки не записывается в сохранение.

Дополнительная рекомендация: доступ к пробной мини-схватке каждым героем **до** подтверждения, без наград, first-clear, разблокировок или persistent save. Это знакомит игрока с необратимым стилем игры. Технически пробный бой должен использовать изолированное временное состояние, не переходить в настоящую кампанию.

Второй шаг — явная модальная проверка: «Это ваш главный герой на всё прохождение. После подтверждения изменить его нельзя». Действия: «Вернуться» и «Подтвердить героя». Подтверждение атомарно фиксирует выбранный heroId. При ошибке записи нельзя показывать успешное завершение. После него интерфейс не показывает кнопку смены; engine запрещает изменение heroId на всех стадиях. Постоянный выбор не является платной ловушкой.

## 3. Рост силы и баланс без переключения героя

- **OWNER CONFIRMED:** нет общего уровня лагеря; **каждый спутник прокачивает только свой уровень вручную за золото**, без XP, без деревьев навыков. Постоянный герой имеет отдельный уровень и 3 способности с 4 улучшениями у каждой + прокачиваемую ульту; hero XP за победы CONFIRMED; конкретные XP/пороги, повторы и поражения OPEN.
- Индивидуальная прокачка относится **только к выбранному главному герою**. Не нужно открывать или прокачивать три недоступных главных героя внутри этого прохождения.
- Все четыре варианта — полноценные направления игры, а не выбор неправильной сложности; ни один этап/босс не требует обязательной способности героя другого класса. В частности, shield-bash не может быть единственным способом пережить Хранителя Разлома.
- Для серьёзной угрозы минимум два реальных контрпути с доступными спутниками и/или навыками текущего героя. Расстановка и улучшения помогают, но не подменяют осмысленные тактические решения.
- Тесты 4 × C(5,3) = 40 возможных боевых составов запускаются на **раздельных тестовых профилях**, а не требуют смены героя на живом профиле.
- Achievement типа «победи за всех четырёх героев» в **одном** постоянном профиле невозможен; заменить его достижениями по мастерству выбранного персонажа. Соревнование PvP использует зафиксированный геройский ID и серверную проверку.
- Имя, образ и точные способности каждого героя всё ещё PROPOSED и должны быть согласованы перед выпуском дизайна и production art.

## 4. Открытие пяти спутников: схема для согласования, НЕ утверждена

Подтверждено: **5 всего / 3 активных / постепенно**, **стартовая тройка Ард/Мира/Элира** и пятый после первой победы над первым сюжетным боссом. Условие открытия Кайра теперь утверждено:

| Этап | Предлагаемое изменение | Результат |
|---|---|---|
| **Начало — CONFIRMED** | Открыты Ард (sentinel), Мира (ember), Элира (healer) | Сразу полный состав 1+3 с каждым постоянным героем |
| Первая победа этапа 3 | Открывается Кайр (ash) | Появляется первый выбор между лечением и дополнительным DPS; синергия burn × ash |
| **Первая победа над первым сюжетным боссом — CONFIRMED** | **Открывается пятый спутник** (личность пока OPEN) | Награда сразу после босса; номер этапа 10 только предложение |

**УТВЕРЖДЕНО ВЛАДЕЛЬЦЕМ:** открытие пятого спутника **только после первой победы над первым сюжетным боссом**; варианты этапа 7 и других прежних сроков отклонены. **Номер этапа первого босса 10 утверждён владельцем** в рамках пяти глав по десять этапов. Любой из четырёх постоянных главных героев должен побеждать его только доступными **до** этого боя спутниками, иначе softlock.

**Продуктовый риск:** при утверждённых 5×10 этапах первый сюжетный босс находится на этапе 10 и открывает пятого, последнего спутника. Следующие **40 этапов** не дают новых спутников. Для удержания нужны развитие навыков, экипировка, тактические испытания, главы и уникальные боссы — нельзя обещать шестого спутника сверх утверждённой пятёрки.

После открытия спутник не исчезает при поражении, перезагрузке, смене состава или повышении сложности. Награда-открытие идемпотентна по first-clear milestone. В отряде ровно три разных unlocked ID, вне боя можно заменять любого из трёх. Не вводить требования платить или смотреть рекламу для полного набора пяти.

## 5. Безопасная миграция старого G2

В сохранении schema 1 есть generic-герой, ранее четыре доступных кандидата спутников, золото и победы; **нет** подтверждённого выбора одного из четырёх главных героев.

- До миграции валидировать v1. Перенести gold/level/claimed/party/progression и provenance так, чтобы старые награды не начислялись повторно.
- Не назначать permanent hero автоматически как воина. Для бывшего G2 предложить однократный экран **выбора и подтверждения** нового постоянного героя; временно не продолжать скрытый бой и не выдавать награды из миграции.
- Уже доступные sentinel, ember, healer, ash остаются открытыми как LEGACY_ACCESS; новый пятый спутник открывается по принятому milestone с корректной обработкой уже пройденных этапов.
- Записать schema 2 атомарно в новый ключ; не удалять прежний v1 до проверенного восстановления. При повторной миграции не менять подтверждённого героя, не дублировать unlock/first-clear/gold.
- Повторное подтверждение **того же** heroId идемпотентно; запрос другого heroId не меняет сохранённого состояния, даже если пришёл напрямую в domain API.
- Клиентская блокировка выбора — UX/локальный инвариант, а не защита от злонамеренного редактирования browser storage. При облачной синхронизации и рейтинговой игре постоянство должно проверяться доверенным профилем, конфликтующие одновременные подтверждения разных устройств нельзя тихо объединять.

## 6. G2-R acceptance contract

- Выбрать можно любой из 4 героев, но только **один раз**; позже нет кнопки смены, отклоняется повторный выбор другого героя (setup/fight/victory/retry/reload).
- Незавершённый выбор не сохраняется навсегда и не даёт наград; подтверждение явно предупреждает о необратимости.
- Четыре постоянных героя имеют уникальные боевые способности и визуальные идентификаторы, но в каждом конкретном бою только один главный.
- Для каждого героя первый бой проходим с первоначальной тройкой; первый босс допускает допустимые альтернативные counterplay без обязательной смены класса.
- Пять каталоговых спутников, три активных, закрытых/дубликатов в отряде нет. Открытия не дублируются.
- Миграция v1 требует явного выбора постоянного героя и не теряет ранее доступного четвёртого спутника.
- После сохранения, перезагрузки, повреждённого snapshot и попыток подмены состояние остаётся валидным или fail closed.
- Экономика/достижения/задания не требуют смены персонажа; async PvP использует неизменяемый выбранный heroId.
- Все проверки должны действительно выполняться на новом exact SHA CI; старые G2 PASS — не доказательство G2-R.

## 7. Статусы решений

**CONFIRMED:** 4 главных героя на выбор, 1 постоянный герой на прохождение без смены, 5 постепенно открываемых спутников, 3 активных спутника, партия 1+3, landscape-only, async-only PvP.

**PROPOSED/OPEN:** пробная схватка до подтверждения; личности и способности четырёх героев; **стартовые Ард/Мира/Элира CONFIRMED**; открытие Кайра после первой победы этапа 3 CONFIRMED; пятый — **ледяной контролёр (OWNER CONFIRMED)**, **веха после первой победы над первым сюжетным боссом CONFIRMED**; **5×10=50 этапов теперь CONFIRMED**; общая/индивидуальная экономика; создание отдельного нового профиля.

**IMPLEMENTATION:** G2-R NOT_STARTED; G3 BLOCKED; G4 PvP NOT_STARTED; releaseReady=false, publicationAllowed=false.

## Owner approval 2026-11-19 — first story boss reward
- **Confirmed:** the fifth companion is granted on the **first clear of the first story boss**; it cannot be required to beat that boss and must never be unlocked merely by reaching the stage.
- The first boss `stageId` is OPEN. The 2nd battle in legacy G2 is a technical demo, not a confirmed first story boss; migration must not silently grant #5 from its `claimed:[2]`.
- Award/achievement/unlock is idempotent and persists across reload, retries and profile migration. Fifth companion name/art remain OPEN; ice-controller role, Kair stage-3 milestone and fifth stage-10 first-clear milestone CONFIRMED.

## Owner approval 2026-11-19 — initial trio
- New profile unlocked set equals `sentinel`, `ember`, `healer`. All three fill active companion slots once hero selected; `ash` and fifth are locked for new profiles.
- Kair first-clear stage-3 unlock is OWNER CONFIRMED; fifth story-boss-first-clear milestone remains CONFIRMED. Legacy v1 preserves Kair access.

**Owner confirmation (19.11.2026):** Кайр открывается на first-clear этапа 3; стартовые Ард/Мира/Элира и пятый после первого сюжетного босса также CONFIRMED. У старых G2 профилей доступ к Кайру сохраняется. Это не равно G2-R implementation PASS.

## Пятый спутник: owner approval 19.11.2026
- **Ледяной контролёр** — утверждённый боевой архетип пятого спутника: slow на врагах и ослабление опасных ударов. Он открывается только после первого сюжетного босса, поэтому не является контрмерой для его прохождения.
- Для текущего G2-R можно использовать стабильный временный ID `control`, однако имя, облик, точные параметры, анимации и конкретный skill kit нельзя считать окончательными без дальнейшего design review.
- См. [дизайн механики и её ограничения](FIFTH-COMPANION-ICE-CONTROL-0.1.md).

## Owner approved campaign maps — 19.11.2026
- Five linear maps × ten nodes: bosses 10/20/30/40/50, 50 distinct battle backgrounds + 5 separate chapter map illustrations = 55 environment masters. Story boss stage 10 first clear unlocks ice controller. No forks, map node traversal required.
- Themes and exact art composition are PROPOSED. See [Campaign Map 2.3](CAMPAIGN-MAP-2.3.md) and [Art inventory](CAMPAIGN-ENVIRONMENT-ART-0.1.md). Runtime assets not produced; WFA agents not launched.

## Superseding progression model — owner confirmed 19.11.2026
- No camp level, no companion skill upgrade trees: each of 5 companions simply has an independent level. Selected permanent main hero has own level, three ordinary abilities with 4 upgrade steps each and an upgradeable ultimate; player chooses what to improve after every hero level-up.
- Source of truth [Character Progression 2.4](CHARACTER-PROGRESSION-2.4.md). Numerical XP, ultimate skill effects/names and balance OPEN; ultimate unlock at heroLevel 5 and 3 upgrades CONFIRMED. Older shared-camp and two-ability text elsewhere is not owner-approved.

## 2026-11-19 — companion gold-leveling owner decision
- Each of five companions upgrades its own level **manually by the player's explicit gold purchase**; do not grant companion XP from active fights, reserve, idle or any automated service. UI shows per-unit level and next gold cost; no companion ability/talent skill tree.
- Cost curve and cap OPEN. One purchase must be an atomic **gold debit and one-unit level increment**, fail-closed on insufficient gold, locked unit, stale expected level, duplicate purchase ID or invalid save; preserve purchases across reload/party swap.
- This does **not** decide whether the main hero earns XP for battles or purchases own levels for gold. [Character Progression 2.4](CHARACTER-PROGRESSION-2.4.md) authoritative; no G2-R implementation.

## Owner decision: hero XP on battle victory — 2026-11-19
- Героический уровень повышается **за XP, полученный при победе**, не за покупку уровней спутников. Каждый геройский level-up даёт **осознанный выбор** улучшения 3 скиллов или доступной ульты. Все пять спутников повышаются **только вручную за золото**, без автоопыта.
- XP thresholds, **reduced reward XP for replay victories and zero XP for losses confirmed**, amounts/ratio and PvP/idle XP and ultimate effect balance remain OPEN; **ultimate unlock at heroLevel 5 and three upgrades CONFIRMED**. One battle result cannot grant XP or upgrade choice twice. [Character Progression 2.4](CHARACTER-PROGRESSION-2.4.md).

## XP farming: owner decision 2026-11-19
- Replay wins award **reduced positive XP** to the permanent hero compared with first-clear of the same stage. Defeats award **0 hero XP**. Companion XP does not exist; gold purchases are the only companion-level path. Exactly-once reward per verified `attemptId`; repeated valid victories may farm XP.
- XP numerical curve/replay ratio and PvP/idle policy OPEN; [Character Progression 2.4](CHARACTER-PROGRESSION-2.4.md). G2-R NOT_IMPLEMENTED.

## Ultimate: owner approval 2026-11-19
- The single chosen permanent hero unlocks an ultimate **at heroLevel 5** and can invest **three player-directed upgrades**, rather than receiving automatic ranks. Before level 5 neither cast nor upgrade is allowed. Along with ordinary skills (3×4) there are **15 total improvement steps**; max hero level and surplus-choice policy remain OPEN.
- Companions continue manual individual gold upgrades only. [Character Progression 2.4](CHARACTER-PROGRESSION-2.4.md). DESIGN ONLY; G2-R NOT_IMPLEMENTED.
