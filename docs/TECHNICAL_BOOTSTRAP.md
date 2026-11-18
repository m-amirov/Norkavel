# Norkavel — Technical Bootstrap 0.1

Status: **CI-VERIFIED CORE + PROJECT-SCOPED WFA INSTALL / NOT G2** (2026-11-18).

## Integration topology

- Game: github.com/m-amirov/Norkavel; primary release platform Yandex Games.
- Ludory: vendor/ludory, pinned source commit 933c73b195eaf3bfffd12a31ab1cbadb27989eea.
- WFA: vendor/workflow-for-agents, initially pinned commit 6c8d80d15155cd8ccfbd245fce9450f61b5133f3.
- Runtime contract: Ludory Core defines identity, lifecycle and state. Norkavel must implement deterministic autobattle rules and renderer as game-owned modules. Phaser is a **planned** rendering backend, not demonstrated as running.
- Server authority for asynchronous PvP: design required, not implemented. Do not use client-reported wins, global ranks or direct client-side premium grants as authoritative.
- Target Yandex only; VK is not in the first scope. Platform adapter, advertising, payments, cloud saves and release ZIP are not initialized or verified.

## Why this isn't a Studio-generated game

The repo was initialized through GitHub while Ludory Studio's trust-bound create workflow requires an existing **empty local game directory**, an independent origin/trust handshake and an explicit apply operation. Manually placing ludory.project.json does not create that state or authorize native Studio AI/release workflows. The source-backed Core integration is real when vendor/ludory is checked out, but the Studio origin gate is **NOT RUN**. Before implementing G2, run an authorized new-game Studio spike separately and decide whether to adopt its components with evidence or retain Core + game renderer. Do not invent Studio receipts.

## Fresh clone & validation

From Norkavel checkout (Node.js 22+, Git):
1. git submodule update --init --recursive
2. npm test
3. npm run smoke:ludory
4. npm run check

On Windows PowerShell, run scripts/bootstrap.ps1 (dry-run of WFA Skills + smoke) or scripts/bootstrap.ps1 -ApplySkills (explicit project install after dry-run). No global Codex configuration changes. WFA Skills are **not installed by adding a submodule**. Project-scoped installation was verified on an ephemeral CI checkout [run 44368140239](https://github.com/m-amirov/Norkavel/actions/runs/44368140239); the user's local install and actual Codex activation remain unverified. The game-specific AGENTS.md provides persistent instructions.

## WFA skill selection

task-planning, game-docs, gameplay-design, gameplay-playtesting, game-content-qa, character-design, character-consistency-qa, production-art, visual-qa, browser-qa and git-workflow. Pinning a source repo is not evidence of actual activation; do not preload all WFA Skills. Ludory native workflows and legal asset provenance take precedence where supported.

## Hard constraints

- No fake gameplay, screenshots, art, animation or PvP.
- No product release until rights evidence, real platform SDK checks, exact-SHA package checks and owner authorization.
- A successful Core smoke is not proof that Phaser, Yandex Connect or runtime scenes work.
- All future source/skill upgrades must be intentional SHA updates with regression and compatibility review.
