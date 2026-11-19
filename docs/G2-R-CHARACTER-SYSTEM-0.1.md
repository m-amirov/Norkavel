# Norkavel — G2-R Character System: implementation contract 0.1

Дата: 19.11.2026. Статус: DESIGN_SPEC / OWNER_REVIEW_REQUIRED / CODE_NOT_CHANGED.
References: GDD 1.1 (confirmed roster) and Gameplay Design 2.0 (proposed progression and balance).
Не начинать изменение текущих схем сохранения/баланса как будто проектные варианты уже подтверждены.

## 1. Текущий source audit на main

Source: src/combat.mjs (G2 schema=1, 50ms tick).
- ROSTER: только sentinel, ember, healer, ash; всего 4 companion IDs.
- initialState(): фиксированная партия [sentinel, ember, healer], нет heroId, unlockedCompanions и hero-selection phase.
- chooseCompanion(): может заменить исключительно party[2], не три произвольных слота.
- startFight(): создаёт одного бойца с постоянным id=hero и фиксированной статистикой, выбранный вариант героя не участвует.
- useSkill(): всегда shield-bash и barrier от героя вне зависимости от визуала/роли.
- nextStage(): максимальный stage=2, никакого реального каталога unlock.
- validateState(): жестко ожидает sentinel, ember в первых двух слотах и только healer/ash в третьем.
- browser: кнопки выбора только healer/ash; hero art один warrior-concept-01.png.
- save key: norkavel.g2.save.v1; наличие в пользовательском браузере реальных v1 данных вероятно, их нельзя уничтожать молча.
- legacy CI browser и seeded balance PASS не подтверждают новую систему. Текущий G3 0.3 pack — четыре КАНДИДАТНЫХ СПУТНИКА и отсутствует в исходниках.

## 2. Целевые сущности (4 героя + 5 спутников)

Постоянный immutable catalog:
- selectableHeroDefinitions[4]: уникальный heroId, displayName, role, maxHp/atk/def/interval, навыки A/B, passive, artId.
- companionDefinitions[5]: companionId, role, autoSkill, passive, synergy tags, artId, unlockRuleId.
- Входные идентификаторы из фиксированных каталогов; неизвестные/null/дубли — fail closed.
- Имена/итоговая прокачка/условия unlock хранятся в конфиге отдельно от engine logic и должны получить owner approval.

Player:
    schema = 2
    phase = hero_selection | setup | fight | victory | defeat
    selectedHeroId = null before selection, otherwise exactly one of 4 catalog IDs
    unlockedCompanionIds = unique subset of exactly 5 canonical IDs
    party = array of 3 unique unlocked companion IDs, when ready for battle
    lineup = 1 hero + those 3 companions, immutable during fight
    progress = completedStageIds + firstClearClaimIds + character progression
    gold, seed, rng, etc. preserved and migrated from legacy where applicable

State invariants:
- phase=fight requires selectedHeroId != null, exactly 3 distinct unlocked party IDs and exactly 4 allied units.
- On onboarding phase=hero_selection the game cannot start a battle until a hero is selected. Party may already be a prepared three-companion selection.
- OWNER CONFIRMED variant B: after initial explicit confirmation selectedHeroId is immutable in **all phases**, including setup; no player hero-switching or premium switch is supported. Invalid attempts are rejected at domain API and do not mutate progress.
- Invalid companion choice, swap during fight, duplicate characters and unearned unlock have no state mutation or reward.
- Hero card selection must update selectedHeroId; the first allied combat unit can retain technical id=hero while its definition/properties/art are chosen by selectedHeroId. Future PvP snapshots must carry selectedHeroId explicitly.
- New fifth companion cannot remain a nameless placeholder in release. During technical integration it can use provisional id and geometry only as G2 test content; G3 needs a real master.

## 3. Domain API / pure functions

Proposed API; exact naming may vary after repository investigation:
- createInitialState / initialStateV2: explicit hero-selection state.
- selectMainHero(state, heroId): **one-time irreversible confirmation** in hero_selection state, with mandatory explicit warning; after commitment any different heroId returns unchanged state even in setup/retry, and duplicate confirmation of the same id is idempotent.
- unlockedCompanions(state): read-only canonical ordered subset.
- assignCompanion(state, slotIndex 0..2, companionId): only unlocked, no duplicates; swaps existing assigned unit atomically rather than dropping it.
- unlockCompanionFromProgress(state, milestoneEvent): no direct user unlock action; first-clear milestone + idempotent reward claim. **Fifth companion only** on canonical `first_story_boss_first_clear`, **after** boss result and reward validation (not merely reached stage). The G2 stage-2 sample boss does not count as story boss without an explicit approved campaign mapping.
- createLineup(state): exactly 1 hero + 3 companions; reject invalid setup.
- startFight(state, seed): immutable snapshot of definitions and formation, phase fight.
- migrateSaveV1ToV2(snapshot): explicit schema migration with progress preserved; never silently call initialState for valid old snapshots.
- validateStateV2: enforce ID catalog, schema, party/phase, bounds, unlock provenance and snapshot consistency.
- getAvailableActions: derived UI affordances to prevent a card from appearing selectable when engine rejects it.

Use no DOM, timers or Math.random in pure domain; deterministic serializable state. Runtime/adapters (Ludory Core, Canvas) stay separate.

## 4. Legacy migration contract (critical)

Previous schema=1 save has no selectedHeroId; do NOT silently bind user forever to a warrior. For valid legacy save:
1. Read/validate the full v1 payload using v1 validator before migrating. A legacy G2 generic warrior is **not** an approved permanent selection; send user to explicit confirmation of one of four hero identities.
2. Preserve gold, level, claimed stage rewards, progress, seed and the exact old selected party if valid. Preserve save meta and gameplay completion; do not re-grant first-clear awards.
3. Set selectedHeroId=null and require **one-time explicitly irreversible** selection in an onboarding/migration UI. During that flow the old battle snapshot should be quiescent (no hidden simulation); if user was mid-fight, safely resume or store a restorable legacy checkpoint. Do not claim battle win/lose from migration.
4. Legacy users had access to sentinel, ember, healer and ash. To avoid retroactively confiscating previously available characters, mark those four unlocked for migrated accounts, with a LEGACY_ACCESS provenance marker. The new fifth companion remains milestone-locked.
5. Translate prior stage identifiers to a versioned prologue or leave legacy completion as a separately keyed history record; the old stage 2 boss was prototype-only and must not accidentally grant a new campaign chapter/boss first-clear.
6. Atomic save: write validated schema=2 to a NEW key only once fully prepared, mark migration complete after verification, keep old key as recovery evidence until next safe release/migration policy.
7. Idempotency: double migration returns same effective snapshot; no duplication of gold/unlocks/rewards.
8. Malformed, tampered or unrecoverable save: fail closed with explicit user-facing recovery path and diagnostics. Do not pretend it is valid or silently award currency.

If there are no legacy users in practice the migrator still requires unit fixtures, negative tests and browser restore checks; hard-coded happy paths are insufficient.

## 5. Unlock policy: configurable not hard-coded prematurely

Design proposal from Gameplay 2.0:
- OWNER_CONFIRMED: new profile unlocks `[sentinel, ember, healer]` only, and those three fill active companion slots after permanent main-hero confirmation;
- OWNER_CONFIRMED: unlock `ash` only on first successful campaign stage-3 clear;
- **OWNER CONFIRMED:** unlock fifth companion only on `first_story_boss_first_clear` event, after first confirmed victory over first *story* boss. Do not use old technical G2 boss stage=2, and do not hardcode a provisional campaign stage=10; fifth's role as ice controller is OWNER_CONFIRMED; name, art and exact skill parameters remain OPEN.
- grant on first verified clear, not every replay.
The initial starter party and fifth **unlock event** are owner CONFIRMED; actual first story boss stage ID and fifth's identity/name and exact mechanics remain open; ICE_CONTROLLER_ROLE is OWNER_CONFIRMED. A dev-only configuration can support synthetic milestones for testing but may not be described as final game content.

Unlock must not be purchasable-only. When unlocking, validate new companion definition, update collection atomically, notify UI once, never auto-remove a current member. The default auto-team may suggest a switch; never rewrite player lineup without consent after initial setup.

## 6. UI contract

States:
- hero_selection: four unique hero cards; pre-confirm preview must not persist heroId, final explicit warning + confirm persists immutable selectedHeroId; portrait orientation is blocked. Optional trial fight before confirm has no rewards/progression.
- squad/collection: prominent selected hero card (read-only in battle), three active companion slots, exactly five collectible cards (locked/unlocked), formation and synergy preview.
- fight: 1 selected lead + 3 companions, 2 hero-specific action buttons, HP/status, boss windup, no companion selection while ongoing.
- result: current stage, correct gold reward, new companion unlock when milestone, retry/next.
- upgrade/metadata: hero and companions retain progression when excluded from party.

Mobile 640×360 / 844×390 must display all 4 alliance actors and bosses with no clipped status indicators; pixel QA and real art are G3, not domain test substitutes.

## 7. Balance preservation and rebuild

Do not preserve previous first boss 780 HP / 66 ATK as a globally balanced value for all 4 new hero classes; old 1800-seed sample applies only to fixed warrior. New retuning must cover:
- all 4 selected heroes,
- 10 combinations C(5,3) when unlocked, plus positions (if implemented),
- legacy starting triple vs boss and tutorial,
- 100+ deterministic seeds per hero+party+scenario/tactic,
- autoCast, legal taps, deliberate skill timing, no skill use, failure/retry.
Require consistent reward contracts, seed replay and non-dominant clicker; measure performance at small landscape viewports.

## 8. Acceptance tests (must actually execute)

| ID | Test | Required evidence |
|---|---|---|
| G2R-01 | Four distinct hero definitions, exactly one selected at a time | catalog/unit + UI |
| G2R-02 | Hero choice changes combat skills/stats and active hero picture/placeholder identity; reload restores it | unit + browser |
| G2R-03 | Exactly five distinct companions; exactly three distinct active unlocked members | unit + browser |
| G2R-04 | Cannot select locked, duplicate, unknown or fifth active companion | negative unit tests |
| G2R-05 | Swap any of three slots outside combat, never during combat | 3-slot regression + CDP |
| G2R-06 | Milestone unlock is idempotent and never re-locks after retry/save | repeat and corrupt save tests |
| G2R-07 | Valid v1 save retains gold, level, prior awards, party/availability, with explicit hero choice | migration fixtures + browser |
| G2R-08 | Invalid/tampered save cannot mint gold/units and does not crash startup | negative fixtures + browser |
| G2R-09 | Fixed seed+inputs+hero+party yields identical replay; changed party changes measured outcome | deterministic seeded tests |
| G2R-10 | Boss telegraph/interruption/defeat/retry works for new classes or their valid counters | browser + seeded matrix |
| G2R-11 | Snapshot never contains 2 main heroes, 4 active companions, duplicate IDs or locked units | invariant test across ticks |
| G2R-12 | All mobile UI states only landscape, portrait no hidden actions or combat progress | CDP screenshots/touch |
| G2R-13 | Ludory lifecycle/Core save/restore compatibility, exact Git SHA all checks PASS | CI |
| G2R-14 | No fake G3 art integration, no releaseReady/publicationAllowed claims | art manifest + docs |
| G2R-15 | After explicit choice heroId is immutable through setup/fight/victory/retry/reload; legacy v1 hero choice remains pending until confirmation | negative domain + atomic save + Chromium |
| G2R-16 | Four fixed-hero profiles remain playable without swapping class; boss counters reachable with unlocked companions | 4 profiles × selected team seeds |
| G2R-17 | Trial fight, if owner approves, does not persist hero choice, spend/gain currency or first-clear a mission | isolated fixture + browser |
| G2R-18 | Fifth companion unlocks only after first story-boss victory, not on boss entry, failed battle, stage 7, test-only G2 boss or repeat clear | seeded boss event + save/replay tests |
| G2R-19 | All four fixed heroes can beat first story boss with only first four accessible companions | 4 hero profiles + seeded composition samples |

New screenshot evidence must include four hero cards, early 3/5 unlocked state, post-milestone 4/5 and 5/5, all active 4 combat sprites and both victory/defeat. Browser screenshot alone is not human visual signoff.

## 9. Scope / release gate

Phase A: owner-reviewed gameplay contract + character identities/unlocks; DESIGN_ONLY.
Phase B: Save v2 + migration and pure catalog/invariants; CODE.
Phase C: hero-selection and companion collection UI, 3 slots and unlock milestones; CODE + BROWSER.
Phase D: hero-specific combat skills/passives and 40-team balance coverage; CODE + SIMULATION.
Phase E: art pipeline for four heroes + five companions + enemies/boss; G3.
Phase F: server-backed async PvP, monetization, live SDK; later G4–G7.

Do not declare G2-R complete when only data structures or mock buttons exist. A green legacy G2 browser test does not pass new roster contract. Never publish game or enable IAP during this work.

## Permanent main hero: owner confirmation (19.11.2026)
- Variant B is confirmed. An earlier conditional-switch description is superseded: **no hero switch ever after first confirmation**. This is a profile invariant, not merely a hidden UI button.
- Persisted v2 player profile requires an immutable committed heroId, confirmedOnce marker/provenance, and a recovery-safe legacy migration that never silently binds a generic v1 warrior to permanent identity. Cloud synchronization/async PvP later require server-authoritative profile identity; client validation alone is not security.
- All class-specific encounter design must be beatable for each of the four **fixed** heroes, without relying on switching to a different main hero.
- [Gameplay Design 2.2](GAMEPLAY-DESIGN-2.2.md) contains owner confirmed permanent rule and proposed companion unlock milestone alternatives.

## 2026-11-19 owner unlock decision
- Fifth-companion unlock is owner-confirmed **AFTER first successful clear of first story boss**. Persist a semantic first-clear milestone; stage number is unapproved. The tutorial/testing G2 stage-2 boss is not automatically that story boss.
- Unlock event must be atomic with first-clear reward idempotency, never from repeat/stale/corrupt/failed events. Legacy G2 boss claim must not retroactively mint fifth companion without an explicit stage mapping.
- Initial 3 companions are owner CONFIRMED; pending design: the fifth's identity/name, exact ice control skills and first boss campaign stage.

## Starter trio — owner approval 2026-11-19
- New v2 profile: exactly `sentinel`, `ember`, `healer` unlocked, and all three in active `party`; `ash` and fifth are locked. Starting any of four permanent hero profiles must be possible without softlock.
- Migrated v1 profile: preserve existing `ash` access and party, no retroactive relocking. Fifth unlock remains tied to first *story* boss first clear, never legacy test stage 2.
- G2R-20: unit and Chromium checks of new profile unlock subset, battle with four hero IDs, locked Kair rejection, legacy Kair preservation, persistence/retry. NOT_IMPLEMENTED.

## 2026-11-19 — Kair stage-3 first-clear requirement
- For new profiles, the first successful clear of campaign stage 3 must unlock `ash` (fourth companion). No unlock on stage entry, defeat, retry or duplicate event. Persist milestone and unlock atomically; never auto-replace the active party.
- Migrated valid G2 profiles retain prior `ash` entitlement independently of new campaign stage 3; preserve progression without duplicate rewards. Fifth remains first-story-boss-first-clear only.
- G2R-21 (NOT IMPLEMENTED): test 3/5 → 4/5 after first stage-3 clear → 5/5 after first story-boss clear, idempotence, reload, defeat, all four permanent hero profiles and legacy migration.

## Fifth companion role approval — 2026-11-19
- **OWNER_CONFIRMED:** companion #5 is an ICE CONTROLLER providing enemy slowdown and dangerous-attack mitigation. ID `control` is provisional until canonical naming; make skills configurable/versioned and ensure no dependence on this companion to beat the first story boss.
- New-account unlock only after idempotent `first_story_boss_first_clear`; no stage entry, loss, repeat, technical G2-stage-2 first-clear or legacy migration grants.
- Domain should separate `slow` attack cadence effect from `weaken`/damage mitigation or telegraph suppression; exact behavior and caps are PROPOSED and require balance signoff. Never implement permanent boss freeze/stunlock from a vague description. No hidden forced best-in-slot when already fielding healer/tank.
- G2R-22: companion catalog has exactly five distinct units with fifth `role=ice_controller`; deterministic slow/weaken contribution observable in event log, caps prevent infinite lock, initial first story boss remains beatable for all fixed hero profiles WITHOUT #5; unlock grants once and party stays 1+3. **SPEC_CONFIRMED / TESTS_NOT_RUN**.
- [Design details](FIFTH-COMPANION-ICE-CONTROL-0.1.md).
