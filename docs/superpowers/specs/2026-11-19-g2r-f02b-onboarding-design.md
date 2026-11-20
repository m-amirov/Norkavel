# G2R-F02b Onboarding Design

## Intent

Provide a real, landscape-only hero-selection onboarding for new and valid legacy profiles. The player previews four confirmed archetypes, selects one, sees an explicit irreversible-choice warning, and commits exactly once through Save v2 IndexedDB CAS.

## Boundaries

- Add a standalone `/onboarding.html`; keep `/`, `web/main.mjs`, `src/combat.mjs`, and the legacy v1 save unchanged.
- Use stable `hero_slot_1..4`, confirmed roles/kits, and explicitly provisional working names. No production art or numeric balance claims.
- A card click or preview never writes. Only confirmation calls `selectPermanentHero` and `compareAndSet`.
- First run starts from `createProfileV2`; a valid legacy v1 candidate is prepared read-only. Corrupt/unavailable/incompatible legacy storage and corrupt/unsupported Save v2 are visible fail-closed states.
- Concurrent commits use the loaded revision. A stale loser reloads the committed profile and reports the conflict; it never overwrites or silently changes hero.
- Portrait covers the full page and disables actionable onboarding. Landscape restores the same preview without committing.
- After a successful choice the shell reports the locked hero and explicitly stops before combat; no G2-R runtime launch is offered.

## Approach

Use a small pure onboarding state/controller module for deterministic initialization, preview, confirmation intent, and commit result handling. A browser adapter owns IndexedDB/localStorage and renders semantic HTML cards/dialog/status. This preserves testability and keeps storage/UI failures separate from legacy gameplay.

Rejected approaches: `localStorage` persistence lacks CAS; embedding selection into legacy `main.mjs` would risk starting the fixed-warrior battle under a new permanent identity; auto-selecting a hero from the legacy warrior violates the owner decision.

## Acceptance

Unit tests cover new/legacy initialization, preview-without-write, explicit confirmation, immutable committed state, stale conflict, and failure states. Chromium covers 640×360 and 844×390 landscape, 390×844 and 1024×1366 portrait, mouse/touch/keyboard, reload, two-page CAS, corrupt/future records, legacy-byte preservation, geometry/overflow, console errors, screenshots and SHA-256 receipts.
