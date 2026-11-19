# G2 — visual review on actual Chromium screenshots

**Review type:** source/screenshot audit, **not human playtest**, not asset-rights clearance.  
**Verified run:** [GitHub Actions 44373983332](https://github.com/m-amirov/Norkavel/actions/runs/44373983332). Code SHA `12ca3b9d15057038fe61f7fb5bae48f87c0f49f4`. Screenshot artifact `norkavel-g2-browser`: `01-setup.png`, `02-battle.png`, `03-portrait.png`, `04-landscape.png`, `05-boss.png`.

## Observed
- G2 geometry matches side-view: allied party left, opposing party right, landscape canvas, distinct HUD and action buttons.
- Desktop and 844×390 landscape fit the playable viewport with no gross overflow; portrait overlay covers the game entirely.
- Boss windup has prominent visual circle/overlay and visible notice. Skills and rewards are present in active UI.
- Battlefield has procedural gradient sky, parallax mountains, silhouettes/stone props, and temporary vector-drawn characters. These do not represent production-grade character art.
- Screenshot inspection detected overlapping labels and inconsistent HP bar offsets on the earlier run [44373033685](https://github.com/m-amirov/Norkavel/actions/runs/44373033685). Actor nameplates/HP bars were corrected in commit `95d3f85952feea8d420904d80cf9112bcf3e384a`; follow-up browser CI succeeded.

## Findings
| Severity | Area | Observation | Action |
|---|---|---|---|
| G3 BLOCKER | Characters | Flat polygon silhouettes, limited identity/pose differences; not attractive enough for release | Produce a canonical illustrated hero, 3 illustrated companions, 3 enemies, 1 boss; sprite rigs/sheets with animation review |
| G3 BLOCKER | Environment | Procedural mountains/rift too schematic for intended art direction | Painted multilayer scenery with controlled palette, texture, parallax and foreground |
| G3 BLOCKER | Combat feel | Little anticipation, impact, animation and spell individuality | Design cast, hit, stagger, death, boss telegraph/impact and FX per skill; use real browser QA |
| G2 PARTIAL | HUD | Labels on early capture overlapped/stacked and boss health had inconsistent vertical scaling | Fixed short nameplates and coordinate scaling; recheck viewport variants |
| G2 PARTIAL | Mobile | 844×390 and portrait 390×844 checked; landscape 640×360, 667×375, 915×412 and true devices not checked | Extend automated browser viewport coverage + manual touch |
| G3 BLOCKER | Rights | No approved asset ledger/originals/provenance for a full production art set | Asset manifest, license/rights review and independent pixel QA |

## Gate conclusion
- **G2 usable mechanical slice** is evidenced by actual browser controls and screenshot/capture results.
- **G3 art gate is BLOCKED.** Generated geometry in the G2 rendering code is a temporary diagnostic; never claim it is accepted visual direction or final production graphics.
- No release, VK/Yandex acceptance, real server PvP, monetization or human enjoyment claims.

## Production art packet — next
1. Owner-approved character style and detailed art bible (main hero and three primary companions).
2. Canonical hero illustrations (front/side silhouette), idle/attack/cast/hit/death sequences, 1 boss.
3. One premium painted combat environment (background/midground/foreground) and skills VFX.
4. Independent screenshot comparisons at mobile landscape + desktop, original-source provenance and rights ledger.

## Addendum — Art Production 0.1 (2026-11-19)
- Source art now includes a real 1536×1024 transparent warrior and 1672×941 painted arena background. See [the production register](../ART_PRODUCTION-0.1.md).
- Browser pixel evidence: [CI 44455353856](https://github.com/m-amirov/Norkavel/actions/runs/44455353856), PNG screenshot artifact including 640×360, 667×375 and 915×412 landscape viewports.
- Observed: no structural action bar overflow; hero/arena visual quality improved, yet remaining units and boss are still flat procedural stand-ins. Small labels at 640×360 degrade legibility.
- G3 visual consistency remains **BLOCKED_ART**; no independent approval has been performed.
