# G2R-INT-03 — PvE Progression & Economy Sandbox

Status: AWAITING_CI. Implementation `7dee19c` passed 120/120 Node tests, Ludory, all browser gates and candidate balance checks locally. Full G2R-INT and trusted settlement remain blocked.

## Runtime boundary

- Entry point: `/g2r-progression-sandbox.html` in the local QA server. It is not linked from the game shell and is not part of an approved release package.
- Storage: separate IndexedDB database `norkavel.g2r.progression-sandbox.v1`; production Save v2 and legacy v1 are never settlement targets.
- Every state is fixed to `source=local-untrusted`, `policy=economy-balance-0.1-CANDIDATE`, `competitiveEligible=false`, `releaseEligible=false`.
- The production profile supplies only its revision and immutable selected hero binding. Legacy gold, clears, rewards and checkpoint are not imported.
- Commands commit under atomic CAS. The client outcome is still forgeable by a player controlling the browser and is not production authority.

The sandbox reuses Profile v2 `beginCampaignAttempt`, `settleVerifiedCampaignResult`, `upgradeHeroSkill`, `upgradeCompanion` and `assignCompanionSlot`. Economy Balance 0.1 and the browser sandbox share `src/economy-candidate-v1.mjs`; there is no second reward/cost formula.

## Chapter-01 candidate result

For each of the four permanent heroes, ten first-clear victories produce level 5, 310 lifetime XP, 840 gold and four pending manual skill choices. Kair unlocks after stage 3 and the provisional ice controller after stage 10. A stage-10 replay adds 17 XP and 56 gold without repeating either milestone.

The minimum replay requirement to reach level 5 before stage 10 is **zero** under this candidate policy: the first nine clears yield exactly 243 XP. The maximum required replay count is also zero for arithmetic reachability; defeats grant no XP/gold and therefore cannot replace a win. This is not a production pacing or grind threshold.

The existing realistic stage-10 tactics produce one deterministic candidate victory per hero without the fifth companion:

| Hero | Strategy | Ticks | Team HP |
|---|---|---:|---:|
| hero_slot_1 | defender_interrupt | 456 | 480 |
| hero_slot_2 | mage_weaken | 176 | 373 |
| hero_slot_3 | duelist_evade | 392 | 50 |
| hero_slot_4 | ranger_trap | 251 | 249 |

Companion purchases debit candidate gold and persist levels, but G2-R combat currently does not scale companion combat stats from `companionProgress.level`. Purchase effects on stage-10 outcome are therefore **NOT_IMPLEMENTED**, not a balance PASS.

## Remaining boundaries

- Production XP/gold policy and trusted settlement authority are not approved or implemented.
- No sandbox data is eligible for PvP, leaderboards, production migration or release.
- Only chapter-01 engineering fixtures and the existing stage-010 candidate exist; 50 production encounters do not.
- Independent WFA reviewer is unavailable; self-review and executable gates do not substitute for an independent receipt.
