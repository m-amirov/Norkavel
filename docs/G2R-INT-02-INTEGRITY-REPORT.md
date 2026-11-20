# G2R-INT-02 — Campaign State Integrity & Recovery

Status: DONE_VERIFIED. Implementation `11feffd`, evidence `c062b76`, [CI 44722998680](https://github.com/m-amirov/Norkavel/actions/runs/44722998680): 112/112 Node tests, Ludory and all required Chromium gates PASS. This slice does not unblock full G2R-INT.

## Confirmed by executable checks

- Save v2 integration CAS validates every new session against the previously committed session, not only against the snapshot schema and revision.
- Allowed transitions are map → travelling → preview, explicit preview cancel, preview → fight, reproducible combat command/ticks → result, and result → map.
- QA-clear IDs are a contiguous append-only integration ledger. They are never passed to Profile v2 settlement and cannot award XP, gold, unlocks or achievements.
- A sequential test completes stage-001 through stage-010 through the real G2-R step engine. It does not write the QA ledger directly; each entry is appended only after a real victory and result → map transition. Stage-010 resolves to `first-story-boss-v1`.
- Prepared legacy profiles require an explicit activation action in the campaign shell. The immutable v1 checkpoint, imported gold and progression ledgers are preserved.
- Portrait blocks travel completion, preview start/cancel, combat commands/ticks, result return, keyboard navigation and user-confirmed persistence actions.

## Candidate progression calculation

`economy-balance-0.1-CANDIDATE` gives 243 cumulative XP for first clears of stages 1–9. Its versioned threshold table maps 243 XP to hero level 5 exactly. This proves arithmetic reachability only under that candidate policy.

The reward-free QA route grants and persists **zero XP**. Tests use a detached combat/profile fixture where needed; no candidate XP or artificial level is written to the player's Profile v2. Production XP values, settlement authority and progression pacing remain unapproved.

## Trust boundary

Client-side transition validation detects accidental corruption, stale tabs and invalid local state changes. It does not make the client authoritative against a player who controls the browser. Production settlement still requires the separate authority/receipt design in `G2R-SETTLEMENT-PROPOSAL-0.1.md`.
