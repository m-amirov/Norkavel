# Norkavel — реестр решений

| ID | Решение | Статус |
|---|---|---|
| D-001 | Название Норкавель / Norkavel | CONFIRMED |
| D-002 | Яндекс Игры — целевая платформа | CONFIRMED |
| D-003 | Жанр 2D Auto Battler + Clicker + Idle RPG | CONFIRMED |
| D-004 | Бой с видом сбоку, качественная 2D-графика | CONFIRMED |
| D-005 | **Ровно 4 разных главных героя на выбор; в бою один выбранный герой + 3 спутника** | CONFIRMED 19.11.2026 |
| D-006 | PvP исключительно асинхронное | CONFIRMED |
| D-007 | Подключить Ludory и WFA, соблюдать их контракты | CONFIRMED |
| D-008 | Идентичности/классы четырёх главных героев и 50 PvE этапов | PROPOSED; детализация OPEN |
| D-009 | Ручные PvE клики и 2 активных навыка, авто-режим | PROPOSED |
| D-010 | PvP авторитетная детерминированная симуляция на backend | PROPOSED |
| D-011 | Только альбомная (landscape) ориентация во всей мобильной игре; портретная показывает запрос поворота без доступного игрового процесса | CONFIRMED |
| D-012 | Idle доход до 8 часов | PROPOSED |
| D-013 | Rewarded для PvE; косметика; без pay-to-win в PvP | PROPOSED |
| D-014 | Мир после древнего Раскола | ASSUMPTION |
| D-015 | **Смена выбранного главного героя после подтверждения запрещена** | CONFIRMED 19.11.2026 (вариант Б) |
| D-016 | Phaser renderer с Ludory Core | PROPOSED; NOT_INTEGRATED |
| D-017 | Размещение, защита и стоимость backend PvP | OPEN |
| D-018 | Реальное синхронное PvP, WebSocket-дуэли | EXCLUDED |
| D-019 | Гильдии в первой версии | DEFERRED |
| D-020 | Источники лицензированного production art | OPEN |
| D-021 | **Всего ровно 5 спутников, открываются постепенно** | CONFIRMED 19.11.2026 |
| D-022 | **В бою ровно 3 открытых разных спутника, после полного открытия 2 в резерве** | CONFIRMED 19.11.2026 |
| D-023 | Стартовая тройка Ард/Мира/Элира CONFIRMED; время открытия четвёртого и этап первого босса OPEN | PARTIAL_CONFIRMED 19.11.2026 |
| D-024 | Имена/личности 4 главных героев и 5-го спутника | OPEN |
| D-025 | Четыре рисунка спутников из G3 0.3 — не четыре выбираемых главных героя | CONFIRMED 19.11.2026 |

CONFIRMED нельзя изменять без владельца. PROPOSED и ASSUMPTION проверяются на G2/G3 и утверждаются отдельно.

## 2026-11-19 — Gameplay 2.0 design proposals (NOT owner-confirmed)
| ID | Предложение | Статус |
|---|---|---|
| D-026 | Архетипы четырёх главных героев: защитник, стихийный маг, дуэлянт, следопыт | PROPOSED |
| D-027 | Бесплатная смена главного героя между боями | REJECTED / SUPERSEDED by owner variant B |
| D-028 | Ард/Мира/Элира на старте CONFIRMED; Кайр после этапа 3 PROPOSED | PARTIAL_CONFIRMED 19.11.2026 |
| D-029 | Пятый спутник в роли контролёра/льда | PROPOSED / OWNER_REVIEW |
| D-030 | 5 глав × 10 этапов, главный босс на каждом десятом | PROPOSED / OWNER_REVIEW |
| D-031 | MVP экономика золота, first-clear/repeatable rewards, PvE idle-cap до 8 часов | PROPOSED / OWNER_REVIEW |
| D-032 | Не менять runtime и существующие сохранения, пока не согласован gameplay contract | DESIGN-FIRST WORKFLOW (OWNER REQUEST) |

См. [Gameplay Design 2.0](GAMEPLAY-SYSTEM-2.0.md) и [G2-R implementation contract](G2-R-CHARACTER-SYSTEM-0.1.md).

## Gameplay Design 2.1 — additional proposal
| ID | Предложение | Статус |
|---|---|---|
| D-033 | Разные hero-specific навыки, passives и способы counterplay первого босса | PROPOSED / GAMEPLAY 2.1 |
| D-034 | **Пятый спутник открывается только после первой победы над первым сюжетным боссом** | **CONFIRMED / OWNER 19.11.2026**; номер этапа (например 10) OPEN |
| D-035 | Общий уровень лагеря и отдельное мастерство каждого персонажа; одна основная валюта — золото | PROPOSED / OWNER_REVIEW |
| D-036 | Детерминированные статусы Burn/Slow/Mark/Shield/Dodge/Interrupt/Heal и front/back AI | DESIGN_DRAFT / NOT_IMPLEMENTED |

[Detailed Gameplay 2.1](GAMEPLAY-DESIGN-2.1.md) is not an owner-approved implementation contract.

## 2026-11-19 — permanent hero choice
| ID | Решение | Статус |
|---|---|---|
| D-037 | **На одном прохождении игрок однократно выбирает одного из 4 главных героев; после подтверждения выбор постоянен, смены нет** | CONFIRMED / OWNER VARIANT B |
| D-038 | Пробный бой каждым героем ДО необратимого выбора без сохранений и наград | PROPOSED / OWNER_REVIEW |
| D-039 | Создание отдельного нового профиля ради другого героя | OPEN / не включено в вариант Б |

[Gameplay Design 2.2](GAMEPLAY-DESIGN-2.2.md) актуализирует onboarding, рост силы и миграцию. D-027 исторически отклонён, не возвращать смену героя в UI.

## 2026-11-19 — First boss companion unlock decision
| ID | Решение | Статус |
|---|---|---|
| D-040 | **Разблокировать пятого спутника после первой победы над первым сюжетным боссом, не до него** | **CONFIRMED / OWNER** |
| D-041 | Привязать открытие к semantic `first_story_boss_first_clear`, а не к provisional stage 10 или G2 technical boss stage 2; награда идемпотентна | DERIVED IMPLEMENTATION CONTRACT / NOT_IMPLEMENTED |
| D-042 | Босс проходим за каждого из четырёх постоянных героев без пятого спутника | DESIGN CONSEQUENCE / NOT_TESTED |

Пятое открытие уже не предмет выбора, обсуждаются только условия первых четырёх и расположение первого сюжетного босса.

## 2026-11-19 — стартовая тройка
| ID | Decision | Status |
|---|---|---|
| D-043 | Новый профиль: Ард/sentinel, Мира/ember, Элира/healer изначально открыты, все трое активны после подтверждения постоянного героя | OWNER_CONFIRMED |
| D-044 | Кайр и пятый закрыты для новых профилей; открытие Кайра после этапа 3 ещё не утверждено | DERIVED / OPEN_FOURTH_MILESTONE |
| D-045 | Мигрированный G2 сохраняет прежний доступ к Кайру | MIGRATION_REQUIRED / NOT_IMPLEMENTED |
