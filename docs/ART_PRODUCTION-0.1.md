# Norkavel — Art Production 0.1

**Date:** 2026-11-19. **Status:** CANDIDATE_IMAGES_INTEGRATED, independent acceptance pending.

## Provenance
The two real original images were generated in the Norkavel conversation on 2026-11-18, after reviewing GDD 1.0, Art Direction and the G2 browser screenshot audit. They are not retrieved game art or third-party assets. Source project HEAD used as context: `4d1dd9b2382b1d0ff9db4760d825e083d8ababb6`.

- `assets/art/warrior-concept-01.png`: 1536×1024 RGBA; source SHA-256 `18a5a559dd4f0b122f7872e4f4ce1a05bea9ac4732cfdb443228754ca5e69f84`. Main warrior image faces right, dark graphite armor and green cloak; standalone illustration, **not** a multi-frame animated sprite sheet.
- `assets/art/arena-ruins-01.png`: 1672×941 RGB; source SHA-256 `c026c91182f8614b39ba9ca49e77ed48f4fbd786a77f36aba670562b6132f2f4`. Painterly autumn ruined-arch arena with castle/rift in distance; no baked interactive controls.
- Full paths, expected dimensions, use-sites and status: `assets/art/manifest.json`.

The separate battle screenshot concept generated earlier is only a creative reference: **it bakes text, portraits and gameplay HUD into pixels** and must not be used as a playable battlefield or as evidence of functioning UI.

## Actual runtime
The two source images are served from an explicit allowlist with correct `image/png` media types. `web/main.mjs` loads them via native `Image()`, checks decoded dimensions and draws them on the G2 canvas. If either fails, the original diagnostic rendering remains; missing assets do **not** become fake PASS. The boss telegraph, clicks and real HUD are still computed and rendered interactively.

## Production limitations
- ImageGen hero is a good high-detail **character concept**, but 3/4 perspective and horizontally extended weapon are not yet canonical animation-friendly side-view. Art turnaround and distinct pose/attack/hit/death sheets are NOT_READY.
- The painted battlefield currently has one flat depth layer. Real parallax requires separated background/midground/foreground, not scrolling a flattened PNG and calling it multilayer.
- Other active companions, 3 enemies and boss continue as geometric placeholders until separately illustrated.
- Artistic consistency, owner approval, animation timing, optimized responsive render quality and rights documentation are **not proven by files/hash or browser CI**.
- G3 remains BLOCKED until a complete art family, distinct animations, independent pixel QA and rights register are accepted.

## Next production gate
1. Review character master identity and target screen-readability at desktop 1280×720 and mobile 844×390.
2. Produce companion masters and boss, plus actual coherent pose sheets; avoid cloning the warrior.
3. Separate arena depth into independently renderable layers and introduce attack/hit/cast motion.
4. Compare real browser screenshots before/after with owner-approved direction; measure asset budget and load times.

## Executed evidence (not just a plan)
- Source image hash + dimensions regression: [Node CI 44455017226](https://github.com/m-amirov/Norkavel/actions/runs/44455017226) — mechanical PASS.
- Actual browser PNG decoding and rendered screenshots: [Chromium CI 44455353856](https://github.com/m-amirov/Norkavel/actions/runs/44455353856) — runtime PASS for the tested viewports and two registered images only.
- Captured at 1280×720 and mobile landscape 640×360, 667×375, 844×390, 915×412. The 640px screen has particularly small status text; fixing typography and replacing primitive units is a visual QA action.
- Artistic review/rights/animation/owner signoff: NOT_RUN / BLOCKED. No promotion to G3 or production-ready.
