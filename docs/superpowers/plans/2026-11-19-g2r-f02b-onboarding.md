# G2R-F02b Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify irreversible four-hero onboarding backed by Save v2 CAS without switching legacy G2 combat.

**Architecture:** A pure controller defines onboarding transitions and a standalone browser entrypoint binds it to the existing IndexedDB store. The legacy game remains a separate route and module graph.

**Tech Stack:** Node 22 ESM, browser DOM/CSS, IndexedDB, existing CDP smoke harness.

**Spec:** `docs/superpowers/specs/2026-11-19-g2r-f02b-onboarding-design.md`

## Global Constraints

- Stable IDs and permanent choice are immutable.
- No production balance, art, combat, reward, or publishing changes.
- Portrait has no actionable hidden onboarding; legacy v1 bytes stay unchanged.
- Save v2 corruption/future versions fail closed; concurrent writes use CAS.

## Review Focus

- Card preview must never persist or mutate source profile.
- Double confirmation and two tabs must yield one commit and one stale result.
- Corrupt/future Save v2 must remain untouched and visible to the player.
- Legacy candidate must preserve gold/party/Kair/checkpoint without choosing a hero.
- Orientation changes must preserve selection state while portrait blocks all actions.

---

### Task 1: Pure onboarding controller

**Files:** Create `src/hero-onboarding-v1.mjs`; create `tests/hero-onboarding-v1.test.mjs`.

**Interfaces:** Produce `createHeroOnboardingState`, `previewHero`, `requestHeroConfirmation`, `cancelHeroConfirmation`, `commitHeroSelection`, and `resolveStaleHeroSelection`.

- [x] Write failing tests for exact state transitions, explicit confirmation, source immutability, locked hero, stale winner, and invalid inputs.
- [x] Run `node --test tests/hero-onboarding-v1.test.mjs` and record RED.
- [x] Implement the minimal pure controller using Profile v2 and hero-kit catalog contracts.
- [x] Run the focused test and record GREEN.

### Task 2: Standalone accessible UI

**Files:** Create `web/onboarding.html`, `web/onboarding.mjs`, `web/onboarding.css`; modify `scripts/serve.mjs`, `tests/web.test.mjs`, `package.json`.

**Interfaces:** Consume the pure controller and `openSaveV2Store`; expose `window.__norkavelOnboardingDebug` only for deterministic QA state inspection.

- [x] Add failing static/server tests for routes, four cards, confirmation dialog, orientation gate, and absence of onboarding imports from legacy `main.mjs`.
- [x] Implement initialization priority: valid Save v2, valid legacy candidate, then new profile; fail closed on storage/restore errors.
- [x] Implement semantic keyboard/touch/mouse cards, explicit confirmation, stale reload, locked completion screen, and full portrait overlay.
- [x] Run focused Node tests and `npm run check`.

### Task 3: Real Chromium acceptance and evidence

**Files:** Create `scripts/onboarding-browser-smoke.mjs`; modify `package.json` and CI workflow if required; create runtime evidence under `artifacts/qa/g2r-f02b/`.

**Interfaces:** Produce deterministic screenshots, manifest hashes, geometry and behavior assertions.

- [x] Write the smoke path before relying on implementation PASS: first-run mouse cancel/confirm, touch selection, keyboard confirmation, reload, two-page race, legacy preservation, corrupt/future failures, portrait block and landscape recovery.
- [x] Capture 640×360, 844×390, 390×844 and 1024×1366 screenshots; assert no overflow/clipping and no console/page errors.
- [x] Run onboarding smoke, legacy G2 smoke, Save v2 smoke and full check.

### Task 4: Review, documentation and main integration

**Files:** Modify `docs/ACCEPTANCE.md`, `docs/PROJECT_STATUS.md`, `docs/TASK_QUEUE.md`.

- [x] Perform code/security/concurrency and visual self-review; label independent review unavailable rather than inventing it.
- [x] Update local evidence and remaining F02c/F02d boundaries; exact SHA/CI follows integration.
- [x] Commit and push verified changes to `main`, wait for exact-HEAD CI, then record implementation SHA `48720875319d56750cdb7b870550e67fe14cdc3e` / CI `44672516614`.
