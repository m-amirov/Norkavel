# G2R-INT-04a — Combat Persistence & Recovery

Status: AWAITING_CI. Full G2R-INT, authoritative settlement and production rewards remain blocked.

## Root cause and correction

G2R-INT-03 kept `combat` only in the browser module variable. IndexedDB contained the Profile v2 campaign attempt and later accepted a client-supplied `complete(outcome)`, but no tick, HP, status, cooldown, RNG or terminal combat state. Reload therefore retained an attempt while silently losing its battle.

Sandbox schema v2 stores one atomic record containing Profile v2, attempt identity, combat checkpoint, pending result and settlement metadata. `begin` creates the G2-R initial state before starting the Profile v2 attempt, then commits both in one CAS transaction. Casts and groups of 1–20 ticks are applied by the existing G2-R engine and committed under the same revision. A terminal engine transition atomically creates `pendingResult`; arbitrary `complete`, HP, tick or outcome input is rejected.

## Checkpoint contract

`combat` binds `attemptSequence`, `attemptId`, numeric campaign stage, canonical stage ID, encounter ID, policy ID, selected hero, hero level, skill ranks, party, seed/RNG, tick, units/HP/statuses, cooldowns, boss telegraph, events and terminal outcome. It contains the immutable initial state plus a bounded operation log. Restore replays that log through `castG2RHeroSkill` and `stepG2RCombat` and requires byte-equivalent structured state, so schema-valid HP/tick/outcome drift fails closed.

This is local integrity only. A player controlling the client can replace code/storage; metadata remains `source=local-untrusted`, `competitiveEligible=false`, `releaseEligible=false`.

## Compatibility and recovery

Store format 1 migrates transactionally to format 2 and increments its revision. A v1 record without an active attempt becomes a clean v2 record. An active v1 attempt cannot be resumed because no combat existed; it enters `legacy_missing_combat` recovery instead of inventing victory or erasing the attempt. The user must explicitly confirm an idempotent defeat receipt with 0 XP and 0 gold. Corrupt, future, attempt-only and combat-only records remain blocked.

## Verification scope

Regression tests cover atomic start, attempt/combat mismatch, stale replay log, forged terminal outcome, tick/HP/hero/party/rank changes, duplicate complete/settlement, v1 recovery and zero-reward forfeit. Chromium covers 844×390 and 640×360, portrait blocking, reload at start/after cast/during stage-10 telegraph/pending result, exact checkpoint comparison, simultaneous tabs, closing a tab during a write, aborted transaction, defeat/retry/replay, persisted skill/companion upgrades, v1 migration, corrupt restore and unchanged production Profile v2.

Remaining: companion levels still do not affect combat stats; no server authority, production rewards, async PvP, 50 production encounters, G3 art or release readiness is claimed. Independent WFA reviewer is unavailable; executable evidence is self-review only.
