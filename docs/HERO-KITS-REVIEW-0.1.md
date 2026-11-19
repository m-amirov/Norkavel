# Norkavel — Hero Kits 0.1: owner decision pack

**Date:** 2026-11-19. **Status:** `OWNER_CONFIRMED_KITS / NAMES_PROVISIONAL / NUMERICAL_BALANCE_OPEN`.  
**Purpose:** unblock `G2R-F02` without inventing hero identity or rewriting confirmed Norkavel design.

## Confirmed constraints (not a proposal)

- Four **distinct main heroes**. The player makes one explicit **permanent** choice on a playthrough. No free switching afterward.
- Each chosen hero gets **three different normal skills**, each with **4 upgrade steps**, plus a unique ultimate with **3 upgrade steps**; ultimate unlocked at hero level **5**. Exactly **15 manual skill choices** from hero levels 2–16, no automatic upgrade.
- Start party: Ard (sentinel), Mira (ember), Elira (healer); Kair (ash) after first stage-3 win, the ice-controller (control, provisional) after first **story** boss win at stage 10. 1 hero + 3 companions actively fight; 2D side view, landscape only; PvP async only.
- Stable persisted slot IDs `hero_slot_1..4` already exist in Save v2. **Do not rename persisted identifiers without a proven migration.**
- The two-skill proposals in [Gameplay Design 2.1](GAMEPLAY-DESIGN-2.1.md) are superseded by the confirmed **3 skills + ultimate** progression requirement.

## Owner-approved archetypes and unique hero kits — names provisional

OWNER CONFIRMED 2026-11-19: the four fixed archetypes, role mapping and described mechanical kits (three normal skills plus one unique ultimate each) are approved for implementation. **Ровен / Астера / Сайрен / Валис are provisional working names**; silhouettes remain art-direction proposals, not approved production assets. Exact cooldowns, damage, duration, energy, resistance and skill rank coefficients remain OPEN.

| Stable ID | Candidate name | Archetype | Strategic advantage | Weakness | Art identity |
|---|---|---|---|---|---|
| `hero_slot_1` | **Ровен** | Страж Разлома / защитник | shields, mitigation, boss windup counter | low single-target DPS | wide armored silhouette, heavy asymmetrical shield, long cloak |
| `hero_slot_2` | **Астера** | Стихийная чародейка | AoE, burn/status combo | vulnerable without frontline | tall robed silhouette, distinct flame and binding VFX |
| `hero_slot_3` | **Сайрен** | Теневой дуэлянт | single-target burst, short dodge window | large enemy waves | narrow silhouette, dual short blades, rapid lateral dash |
| `hero_slot_4` | **Валис** | Следопыт | mark and priority target pressure | pressure at close range | bow silhouette, layered short cloak, precise projectile trails |

### `hero_slot_1` — Ровен (defender)

| Slot | Name | Function |
|---|---|---|
| Normal 1 (rank 0..4) | **Разлом щита** | Melee impact and **conditional** interrupt only during valid telegraph window; obey boss resistance and interrupt cooldown |
| Normal 2 (rank 0..4) | **Купол бастиона** | Temporary absorb shield for hero and three allies; never infinite |
| Normal 3 (rank 0..4) | **Знамя стойкости** | Limited-duration group damage mitigation; distinct from shield capacity |
| Ultimate (rank 0..3) | **Последний рубеж** | Large time-limited defensive window with retaliation; only after hero level 5 |

**Stage-10 boss counterplay:** timed interrupt **or** pre-emptive shield + Elira healing; neither relies on the locked ice controller. Rank bonuses tune damage, mitigation, duration/coverage under bounded caps; **numeric values OPEN**.

### `hero_slot_2` — Астера (elemental mage)

| Slot | Name | Function |
|---|---|---|
| Normal 1 | **Огненный круг** | AoE fire with finite burn stacks and logged status source |
| Normal 2 | **Сковывание** | Short slow and weaken of a dangerous next attack; boss reduction, never freeze-lock |
| Normal 3 | **Цепь искр** | Chain AoE that benefits from existing burn/binding status within explicit caps |
| Ultimate | **Стихийный разлом** | Burst AoE with conditional status combo, available after level 5 |

**Stage-10 boss counterplay:** weaken a warned attack **or** use Ard protection and Elira healing while applying controlled DPS. The mage's slow should remain complementary, not make companion 5 obsolete.

### `hero_slot_3` — Сайрен (shadow duelist)

| Slot | Name | Function |
|---|---|---|
| Normal 1 | **Теневой рывок** | Rapid burst on selected priority or weakened enemy |
| Normal 2 | **Исчезновение** | Brief timed evade and counterattack, not permanent invulnerability |
| Normal 3 | **Роковая метка** | Single-target mark and conditional focused strike synergy |
| Ultimate | **Ночь клинков** | Several bounded high-impact strikes against one marked target, available after level 5 |

**Stage-10 boss counterplay:** time the evade **or** rely on Ard/Elira and focused offensive pressure. Wave enemies must remain beatable without required access to another main hero.

### `hero_slot_4` — Валис (ranger)

| Slot | Name | Function |
|---|---|---|
| Normal 1 | **Прицельный выстрел** | Precise high-damage shot, mark of dangerous target |
| Normal 2 | **Капкан** | Short attack disruption/accuracy reduction on vulnerable enemies; boss resistance respected |
| Normal 3 | **Град стрел** | Multi-target volley with bounded damage falloff, to avoid wave softlock |
| Ultimate | **Звёздный залп** | Multi-hit ranged barrage prioritizing marked enemy, available after level 5 |

**Stage-10 boss counterplay:** limited trap mitigation **or** tank/heal composition while maintaining marked-target damage. Does not require defender's interrupt.

## Implementation and balancing gates (mechanics confirmed, numbers OPEN)

1. Each regular skill has four **selected improvements**, not four additional active buttons. The ultimate has three selected improvements and is locked before level 5. All ranks persist in the same immutable hero profile and Save v2 CAS.
2. Exact cooldowns, damage, duration, energy, status resistance and rank increments remain `NUMERICAL_BALANCE_OPEN`. WFA testing must measure real combat logs on fixed seeds, not assert balancing by specification.
3. **All four** main heroes must have a viable level-10 boss route with companions available **before** the ice-controller unlock. At least two observable response tactics per hero; test losses as well as wins.
4. Hero buttons, VFX and silhouette must be different, not a reskin of the old generic G2 warrior or images of companions. Production assets and rights require G3 visual gate.
5. The confirmation UX must describe the permanent choice and show each archetype's strengths/weaknesses. A trial fight, if later approved, must never commit permanent choice, award gold/XP, unlock or mutate saves.
6. Numerical XP, gold and upgrade costs from Economy Balance 0.1 remain **candidate values**. No unapproved IAP, PvP results or balance coefficients.
7. Approved fixed role mapping: `hero_slot_1` defender, `hero_slot_2` mage, `hero_slot_3` duelist, `hero_slot_4` ranger. Preserve persisted slots; changing mappings later requires a separately approved migration.

## Owner decision — APPROVED 2026-11-19

Owner approved the four archetypes and all four 3-normal-skill + ultimate kits. The hero names are temporary, production art and character biographies are not yet approved, and exact numeric balance remains open. This unblocks implementation of `G2R-F02` but does not prove it complete.

Codex shall implement F02 in testable slices: versioned four-kit domain, explicit immutable hero selection and Save v2 CAS onboarding, side-view battle integration, real Chromium QA, then separate G3 art gate. Do not silently migrate the old save or introduce a production balance policy without approval.

Sources: [GDD 1.1](GDD-1.1.md), [Decisions](DECISIONS.md), [Gameplay 2.1](GAMEPLAY-DESIGN-2.1.md), [Gameplay 2.2](GAMEPLAY-DESIGN-2.2.md), [Progression 2.4](CHARACTER-PROGRESSION-2.4.md).
