# G2-R settlement proposal 0.1

Status: **PROPOSAL / NOT IMPLEMENTED**. G2R-INT-01 deliberately records no persistent rewards.

## Current trust boundary

The browser produces a deterministic local combat state and a `local-untrusted` result. The integration store may advance only its isolated QA route ledger; it does not call `settleVerifiedCampaignResult`, and Profile v2 gold, XP, unlocks, achievements and first-clear ledgers remain byte-for-byte unchanged.

## Proposed next contract

1. An authority creates a signed/opaque attempt grant bound to profile revision, permanent hero, exact 1+3 party, `stageId`, `encounterId`, policy hashes, seed and expiry.
2. The client submits the command/event transcript plus final deterministic state hash. A local `victory` is evidence, not authority.
3. The authority replays or validates the transcript, rejects altered policy/identity, stale grants, impossible command cadence and duplicate attempt IDs, then emits one immutable settlement receipt.
4. One Save v2 transaction checks the receipt namespace and profile revision, applies campaign transition plus approved policy rewards, and records the receipt exactly once. Duplicate or conflicting receipts are no-ops/fail closed.
5. Offline/local-only builds keep `profileSettlement: none`; no fallback may mint production rewards.

Open dependencies: authoritative service/identity, approved XP/gold policy, policy-version migration, retry/recovery UX, clock/expiry rules and server-side replay limits.
