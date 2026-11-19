# Norkavel — G3 Art Production 0.4: corrected character scope

**Date:** 2026-11-19. **Source of truth:** [GDD 1.1](GDD-1.1.md) and owner-confirmed roster rules.  
**Gate:** PLAN_CORRECTED / ASSETS_INCOMPLETE / G2-R_REQUIRED / G3_BLOCKED.

## A. Exact character coverage

| Production family | Total distinct characters | Existing candidate art | Still need new masters | Active at once |
|---|---:|---|---:|---:|
| Main heroes (player selects one of four) | **4** | **1** warrior `warrior-concept-01.png` (not formally approved) | **3** | **1** |
| Companions (gradually unlocked collection) | **5** | **4** external G3 0.3 PNG/WebP (Ard/Mira/Elira/Kair, candidates only) | **1** | **3** |
| Standard enemy types, current slice | 3 | 0 production-ready | 3 | up to 3 |
| First boss | 1 | 0 production-ready | 1 | 1 |

**Required library: 9 allied character masters and 4 enemy/boss masters = 13 unique character designs**, not 13 participants in one encounter. In each battle, 1 selectable hero + 3 active companions face the enemy team.

The preceding 0.2/0.3 art packages were **four companions**, NOT the four selectable main heroes. Do not rename `sentinel`, `ember`, `healer`, `ash` source files or game IDs into four main heroes; their art is candidate companion art. The old warrior master is just **one** candidate main hero.

## B. Production sequence

1. **G2-R roster spec and runtime:** gameplay model with exactly 4 leader choices and exactly 5 companions; three active slots, progressive unlock eligibility, party snapshot contract and save migration. Do not invent milestones or impose permanent hero lock without an owner decision.
2. **Hero family (4):** use existing warrior only as visual quality reference/candidate. Prepare 3 entirely new hero designs, each with own silhouette, role, palette and interaction card. Main heroes should read as the controllable lead in the side-view fight.
3. **Companion family (5):** preserve 4 candidate masters from external pack, produce the 5th as an original **ice-controller** character (ROLE_CONFIRMED; identity/name/design still OPEN). Ensure the four existing files are not mistaken for all five. No duplicate/reskin substitutes.
4. **Enemy family (3+1):** three combat enemy designs and Rift Guardian with readable windup/impact/recovery poses. Do not use composite presentation boards containing HUD/text as runtime assets.
5. **Actual motion:** `idle/attack/hit/death` for **all** selected heroes and companions, plus unique casts/skills, windup and victory where applicable. One static illustration translated/rotated by Canvas is NOT a compliant animation sheet.
6. **Battlefield and interface:** real parallax layers, VFX, HP bars and status indicators; hero selection UI 4 cards, companion collection 5 cards (locked/unlocked states), exactly 3 slot assignments, full landscape-only gameplay.

## C. Acceptance

- Full art manifest contains provenance, SHA-256, dimensions, legal review status, actual usage paths and frame counts for all 13 unique designs. Static candidates ≠ animated production art.
- Rendered scene: exactly 4 allies including 1 selected hero; no extra leaders/companions, duplicates or locked characters. All four hero choices must visibly change the leader art, not just a label.
- Mobile browser screenshots: 640×360, 667×375, 844×390, 915×412; portrait screens must show only turn-device screen; no obstructed hero/skill/boss telegraph.
- Real gameplay reachability: choose each hero, select three unlocked companions from five across gradual unlock milestones; save/reload/retry preserves choice and unlocked collection; seed replay/rewards remain consistent.
- Independent human artistic review, asset rights and byte-budget/decoding evidence needed before G3 PASS.
- No fake full-content PASS based on the four currently prepared companion candidate images. `releaseReady=false`, `publicationAllowed=false`.

## D. Explicitly open content decisions

Names/classes/skills of four selectable main heroes, fifth companion **name/identity and detailed skill design** remain **OPEN**, but ice-controller role is OWNER_CONFIRMED; starter trio Ard/Mira/Elira is CONFIRMED, Kair unlocks after stage-3 first clear, fifth after first story-boss first clear, and main hero selection is permanent (no hero swap). Exact first story-boss stage index remains OPEN. No production art identity assignment or irreversible migration should assume answers.

**Art brief update (19.11.2026):** fifth companion's owner-confirmed ice-control role must produce its own readable side-view silhouette and cold-magic VFX distinct from four companion candidates; name/appearance and frame animations still require actual art and review. [Mechanics brief](FIFTH-COMPANION-ICE-CONTROL-0.1.md).
