# Норкавель / Norkavel

2D Auto Battler + Clicker + Idle RPG для Яндекс Игр. Один выбираемый главный герой и команда из трёх спутников; PvP только асинхронный. Сражения — вид сбоку.

> **Статус:** G2 — браузерный технический прототип с автоматическими боями и боссом. Тестовый маршрут работает в headless Chromium, но **графика временная, Art Production / G3 заблокирован**. Асинхронное PvP, Яндекс SDK и публикация не реализованы.

## Запуск локального G2

Нужны Git, Node.js 22+, современный браузер.

```bash
git clone --recurse-submodules https://github.com/m-amirov/Norkavel.git
cd Norkavel
npm run check
npm run preview
```

Откройте `http://127.0.0.1:4173`. Игра запускается без аккаунта и сервера PvP (только локальный PvE срез).
Управление: кликайте по врагам, нажимайте кнопки навыков или клавиши `1` и `2`, меняйте состав до боя. На смартфонах используйте только альбомную ориентацию.

Для браузерной диагностики (требуется Chromium/Chrome):

```bash
npm run test:browser
```

Скриншоты браузерного smoke сохраняются в `artifacts/g2-browser/` и в артефакте CI; это **не финальное игровое искусство**.

## Документация

- [GDD 1.0](docs/GDD-1.0.md) — полный проектный дизайн.
- [GDD index](GDD.md) — короткая карта утверждённых систем.
- [Статус и проверки](docs/PROJECT_STATUS.md).
- [G2 визуальный аудит](docs/qa/G2-visual-audit-2026-11-18.md).
- [Art Production 0.1 — реальные исходники, статус и ограничения](docs/ART_PRODUCTION-0.1.md).
- [Технический bootstrap](docs/TECHNICAL_BOOTSTRAP.md).
- [Пайплайн и критерии приёмки](docs/ACCEPTANCE.md).

## Репозитории-источники

- [Ludory](https://github.com/m-amirov/ludory) — lifecycle, Core и платформенные адаптеры после отдельной интеграции.
- [Workflow for Agents](https://github.com/m-amirov/workflow-for-agents) — G0–G7, gameplay, QA и правила разработки.

Внешние источники будут закреплены по commit SHA; проект не копирует и не меняет их глобальные установки. Подробнее в `docs/TECHNICAL_BOOTSTRAP.md`.
