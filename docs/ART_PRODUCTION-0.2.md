# Norkavel — Art Production 0.2 / Companion Family

**Date:** 2026-11-19. **Gate:** CONCEPT_SHEET_PRODUCED / NOT_IN_REPOSITORY / G3_BLOCKED.

## Continuity
- Preserve G0: strictly landscape across mobile, 2D side-view, 1 main hero + 3 companions, async-only PvP.
- Existing production 0.1 source assets in `assets/art/` are runtime-integrated; their SHA and decoding were CI-verified.
- New companion concept is a distinct **transparent 1926×816 RGBA sheet** produced in the Norkavel conversation on 2026-11-19, not scraped from a third party.
- A downloadable **Norkavel-Art-Production-0.2.zip** was delivered in conversation with the original and three approximate cuts. **It has NOT been committed to GitHub or connected to the renderer.** Do not make release/art claims based on this document.

## Character identities / art bible

| Runtime ID | Name/role | Recognizable silhouette and palette | Gameplay feedback | Animation requirements |
|---|---|---|---|---|
| `sentinel` | Ард / защитник | Tall, broad, plated graphite armor; large tree-emblem shield; moss cloak | Tank interception and barrier readable from 640×360 | idle, guard, melee, hit, death, victory |
| `ember` | Мира / flame DPS | Slender red-haired figure, burgundy robes, glowing ember staff; orange fire | Fire projectile, burning status distinguishable from healing | idle, cast, projectile, hit, death, victory |
| `healer` | Элира / support | Ivory/sage cloak, silver hair, mint crystal staff | Green-white heal pulse, health gain and aura clear | idle, heal, hit, death, victory |
| `ash` | Кайр / alternate hunter | TO PRODUCE: dark ashen hunter, low crossbow, orange cinders; **not** a mage recolor | Ash synergy on burning targets | idle, shot, hit, death, victory |

The first three characters are **concepts only**. The current composite's overlaps and source angle make naive crops unsafe as final runtime sprites.

## Conversation deliverable (not source-controlled)

| Candidate | Size (px) | SHA-256 | Status |
|---|---|---|---|
| companions-lineup-concept-02.png | 1926×816 | `5c7e13584fc4568e2d0a7cc5cbf9f539ef963f868a2840393d8643a0fbb0733d` | transparent original, concept |
| sentinel-concept-02.png | 660×811 | `01b9e0f429af8747cddc49b917bbc3cbb9bdc4255d636fee3584930641244886` | approximate crop |
| ember-concept-02.png | 660×811 | `5b22070b3c68c1f422bf3b6577d668c4e9ec8021729a1d21263045253e87fa29` | approximate crop; flame may be clipped |
| healer-concept-02.png | 594×802 | `87c1e3fc4c7b11717b4e72724fb0d5aa53fe8e346b8804c1323c03a99d88bcea` | approximate crop |

These hashes document the conversation artifact, **not repository contents**; CI cannot verify absent assets.

## Production decision and next implementation
1. Generate **individual, unobstructed, consistent side-facing masters** (not cuts) for all 4 companion IDs, 3 enemies and 1 boss. Keep transparent backgrounds, coherent height / eye lines / ground contact, no baked HUD or labels.
2. Produce actual attack/hit/death pose sheets (or validated rig), not CSS transform over static art. Add art hash, dimension, copyright/source evidence and real use-site in `assets/art/manifest.json`.
3. Cleanly separate a 3-depth-layer arena rather than claiming a painted flat background is parallax.
4. Wire images through explicit static asset allowlist and visible load diagnostics. Validate no opaque rectangles, silhouettes at 640×360 and 844×390, tap-target/telegraph occlusion, decode performance, and browser screenshots.
5. Artistic and rights gates require independent review and owner acceptance. G3 remains BLOCKED until the whole slice, animation and QA are complete.

## Exclusions
Do not import or modify assets from other games, claim the conversation artifact is checked into `main`, treat metadata as licensing proof, or enable release/production flags.
