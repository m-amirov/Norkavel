# G2R-INT-04a.1 — Combat Checkpoint Integrity Hardening

Status: AWAITING_CI. Implementation `8065ba01d23c1fda7251b8bdac046cd2022b129b` passed 126/126 Node tests, Ludory and all eight Chromium smoke commands locally. `DONE_VERIFIED` requires exact-final-SHA CI SUCCESS.

## Reproduced root causes

INT-04a replayed operations from the persisted `initialState`, but only checked that this state matched the combat JSON schema. A coordinated change to initial HP, max HP, shield, statuses or seed/RNG could therefore produce a different yet internally replay-consistent current/terminal state. The failing pre-fix regression accepted a checkpoint whose initial hero HP and current HP were both reduced.

The IndexedDB command path validated the committed record and CAS revision, then called the domain transition and immediately passed its output to `put`. It did not run the full sandbox validator on the next state. A transition producing an oversized operation journal could therefore reach the write boundary.

## Correction

Checkpoint v2 independently binds `seed`. Restore removes only `campaignAttempt` from a cloned, otherwise unchanged Profile v2, resolves the canonical stage/encounter and recreates genesis through the real `createG2RCombat` with the persisted profile revision, permanent hero, unlocked companions, party, hero level/ranks, seed and versioned candidate combat policy. The complete generated state must equal `initialState` before operation replay begins.

The store now uses one pre-commit gate: inspect current committed record, compare revision, apply the domain command, validate the complete next sandbox state, and only then issue IndexedDB `put`. Invalid output returns `INVALID_NEXT_STATE`; revision and committed bytes remain unchanged. Attempt, combat and terminal `pendingResult` remain one record and one transaction.

Existing INT-04a checkpoint v1 records migrate transactionally to checkpoint v2 by binding their original seed and incrementing the CAS revision. The migrated state must pass canonical genesis plus full replay before commit. Older sandbox v1 attempt-without-combat recovery remains the explicit zero-reward forfeit path.

## Bounded journal and measured cost

The hard limit remains 2000 operations. Under combat policy v1, a fight has at most 1200 ticks. With one tick per command and every selected-hero skill cast immediately whenever its cooldown permits, the highest four-hero bound is 1303 operations. Therefore a legal fight cannot reach the hard limit and compaction is unnecessary in this slice.

A local Node 22 measurement on a real terminal checkpoint with 554 one-tick operations ran ten complete validations in 1845.195 ms, mean 184.520 ms. Replay is linear in the bounded journal; this is acceptable for the isolated DEV/QA sandbox but is not a production persistence/performance claim.

## Regression and browser evidence

Unit regressions reject changed initial HP/maxHp/shield/status, seed/RNG, stage/encounter, profile revision, hero, party and ranks, including a coordinated forged genesis plus terminal state. Empty journals and migrated valid checkpoint v1 remain accepted. The pre-commit test injects an otherwise command-shaped 2001-operation next state and receives `INVALID_NEXT_STATE` while revision 9 and the old zero-operation record remain unchanged; stale revision remains rejected.

The real Chromium recovery smoke covers 844×390 and 640×360, portrait blocking, start/casts/multiple checkpoints/reload, stage-010 telegraph, terminal settlement, canonical forged-checkpoint rejection, journal-limit rejection before write, old-record preservation after reload, checkpoint v1 migration, two-tab stale CAS, aborted transaction, duplicate settlement and unchanged production Profile v2.

This remains `source=local-untrusted`, `competitiveEligible=false`, `releaseEligible=false`. It is client-side integrity, not authoritative settlement or protection from a player controlling code/storage. Independent WFA reviewer was unavailable; review status is `NOT_RUN`, with executable self-review evidence only.
