# Stage-010 Balance 0.1 — engineering candidate

**Статус:** воспроизводимый F02d engineering-кандидат; production balance не утверждён.

## Метод

- Реальный `src/g2r-combat-v1.mjs`, без функции-подмены победителя.
- 32 фиксированных seed: `1001 + 97*n`, `n=0..31`. Несколько десятков прогонов покрывают вариативность детерминированного выбора целей, оставаясь быстрым regression-набором; это не статистическая оценка живых игроков.
- Герой уровня 8, ранги `2/2/2/1`, состав строго `1+3`; доступны только Ard/Mira/Elira/Kair. Ice controller отсутствует.
- Baseline не применяет способности. Каждая тактика применяет отдельный детерминированный приоритет команд.
- Команда: `npm run balance:stage-010`; машинный отчёт: `artifacts/stage-010/balance-matrix.json`.

## Матрица 32 seed

| Герой | Тактика | Спутники | W/L | Тики min–max | HP команды min–max | Наблюдаемая реакция |
|---|---|---|---:|---:|---:|---|
| Ровен | interrupt | Ard/Mira/Elira | 32/0 | 432–450 | 480–480 | 222 interruptions; 0 dangerous hits |
| Ровен | survival | Ard/Elira/Kair | 32/0 | 528–540 | 480–480 | 896 shielded/mitigated dangerous hits; 0 interruptions |
| Астера | weaken | Ard/Mira/Elira | 32/0 | 136–151 | 377–399 | weaken/slow; 256 dangerous hits survived |
| Астера | controlled damage | Ard/Elira/Kair | 32/0 | 102–120 | 406–420 | fire/chain/rift plus guard/heal |
| Сайрен | evade | Ard/Mira/Elira | 32/0 | 341–384 | 12–178 | 58 real evades with bounded counter readiness |
| Сайрен | focus | Ard/Elira/Kair | 32/0 | 205–258 | 290–378 | mark/dash/four separate ultimate hits |
| Валис | trap | Ard/Mira/Elira | 32/0 | 200–205 | 280–304 | bounded slow/weaken; no freeze/stun lock |
| Валис | marked range | Ard/Elira/Kair | 32/0 | 168–186 | 296–328 | aimed-shot mark drives star-barrage priority |

Все четыре baseline-строки: `0/32` побед, `32/32` поражений, 384–550 тиков. Одинаковый seed и набор команд дают идентичный итоговый объект.

## Интерпретация и открытый баланс

Техническая viability доказана для данного кандидата: у каждого героя две различающиеся победные стратегии без пятого спутника, а без осмысленных команд те же профили проигрывают. Это не утверждает желаемый production win rate, сложность для человека или окончательные HP/damage/cooldown числа.

Кандидат для отдельного owner-review: сохранить структуру телеграфа, ограниченное boss resistance и роли спутников, но отдельно исследовать запас Сайрена в evade-маршруте (минимум 12 HP) и чрезмерно полный HP Ровена. До такого review числа остаются `engineering-candidate`.
