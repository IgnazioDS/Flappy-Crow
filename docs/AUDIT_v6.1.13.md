# AUDIT v6.1.13

Date: 2026-02-28
Branch audited: `main`
Head commit at audit time: `d35eeb33ea87582fc7bd077f9ac398b1e622ed5a`

## Executive Summary

Status: **YELLOW**

- Core build/test/lint/build pipeline is healthy.
- Gameplay-critical files (config/collision/score/spawn/state machine) are unchanged by the v6.1.12/v6.1.13 baseline work.
- Visual constraints requested for Evil Forest V2 are preserved (fog threshold 32, sparkleMax 0, embers/fireflies disabled, no magenta ground dots).
- Main residual issue: Node/runtime version coherence is inconsistent (`.nvmrc` and CI use Node 20 while Capacitor CLI advertises Node >=22).

## Verification Table

| Criterion | Status | Evidence |
|---|---|---|
| `npm ci` passes | PASS | Local run on 2026-02-28 (`npm ci` completed, no vulnerabilities) |
| `npm test` passes | PASS | `src/game/*` tests pass (26/26) |
| `npm lint` passes | PASS | `eslint . --max-warnings 0` exits 0 |
| `npm build` passes | PASS | `tsc && vite build` exits 0 |
| `npm preview` smoke launch works | PASS | Local preview launched on `127.0.0.1:4173` |
| Node pinning coherent with dependencies | FAIL | `.nvmrc` is `20`; CI uses Node 20; `@capacitor/cli` warns `node >=22` |
| CI workflows aligned with scripts | PASS | `.github/workflows/ci.yml` runs `npm ci`, `npm run lint`, `npm run test`, `npm run build` |
| Gameplay tuning constants unchanged | PASS | No diff in `src/game/config.ts` vs `ca0ce39..HEAD` |
| Collision logic unchanged | PASS | No diff in `src/game/systems/CollisionSystem.ts` vs `ca0ce39..HEAD` |
| Score increments once per passed pipe pair | PASS | `ScoreSystem.update` uses `!pipe.scored` gate before increment |
| Spawn timing and RNG bounds unchanged | PASS | `SpawnSystem` unchanged in diff; `gapCenterBounds` still used |
| State machine transitions unchanged | PASS | `GameStateMachine` unchanged in diff; BOOT->READY->PLAYING->GAME_OVER->READY path intact |
| No per-frame allocations introduced in background updates | PASS | Allocation-heavy setup paths are in create/init methods; update paths reuse created objects |
| Particle caps enforced | PASS | `evilForestV2.particles` max values present; `sparkleMax=0` keeps biolume sparkles off |
| Texture dimensions sane for target | PASS | V2 asset dimensions remain 1024x640 / 512x512 as configured |
| Evil Forest V2 orb source removed | PASS | `biolume_glow_splotches.svg` is transparent; env `biolume.patches=[]` |
| Bottom blend cohesion implemented | PASS | `bg_swamp_near.svg`, `ground.svg`, and V2 bottom scrim adjustments applied |
| Fog seam sanitization threshold fixed at 32 | PASS | `TextureSanitizer` manifest + render script both use 32 |
| No random bottom dots/specks from disabled emitters | PASS | `sparkleMax=0`; `embers=false`; `fireflies=false` |
| Ground magenta dots removed | PASS | `ground.svg` contains no magenta dot circles |
| No copyrighted assets risk | UNKNOWN | Repo claims project-authored assets; no provenance manifest per asset to independently verify source rights |
| Repo hygiene for generated artifacts | PASS | `.gitignore` now ignores `output` and `progress.md` |
| Release process docs current | PASS | `docs/RELEASE.md` updated to mainline/tag workflow |

## Repository Inventory (Key Modules)

- `src/game/config.ts`: gameplay constants and difficulty/performance tuning.
- `src/game/systems/CollisionSystem.ts`: deterministic collision checks.
- `src/game/systems/ScoreSystem.ts`: scoring rules (`pipe.scored` guard).
- `src/game/systems/SpawnSystem.ts`: spawn interval and RNG-driven gap center generation.
- `src/game/state/GameStateMachine.ts`: legal transitions and transition application.
- `src/game/scenes/PlayScene.ts`: orchestration scene (input/UI/system integration).
- `src/game/systems/BackgroundSystem.ts`: baseline environment layer management.
- `src/game/background/BackgroundSystemV2.ts`: Evil Forest V2 composition (fog/rays/reflection/shimmer/scrim/debug).
- `src/game/theme/env/evilForestV2.ts`: V2 environment configuration and feature caps.
- `src/game/graphics/TextureSanitizer.ts`: runtime texture sanitization manifest/logic.
- `scripts/render-v2-assets.mjs`: SVG->PNG/WebP render pipeline and sanitize thresholds.

## Findings

### P0

- None.

### P1

- **Node runtime coherence mismatch**
  - Impact: Tooling warnings on install; increased risk of CI/dev drift.
  - Evidence: `.nvmrc` and CI are Node 20 while Capacitor CLI emits `node >=22` engine warnings.
  - Recommended fix: move `.nvmrc` and CI Node version to 22, validate full pipeline, and document minimum Node in README.

### P2

- **Asset licensing traceability is not machine-verifiable**
  - Impact: Legal provenance cannot be independently audited from structured metadata.
  - Evidence: repository documents attribution text, but no per-asset provenance manifest.
  - Recommended fix: add `docs/ASSET_PROVENANCE.md` mapping key assets to source/licensing status.

- **PlayScene remains large and high-coupling**
  - Impact: maintenance cost and regression risk for future feature work.
  - Evidence: `PlayScene.ts` remains ~4k lines.
  - Recommended fix: continue decomposition plan in `docs/PLAYSCENE_DECOMPOSITION.md` with slice-based refactors.

## Audit Commands Used

```bash
git diff --name-only ca0ce39..HEAD
git diff --name-only ca0ce39..HEAD -- src/game/config.ts src/game/systems/CollisionSystem.ts src/game/systems/ScoreSystem.ts src/game/systems/SpawnSystem.ts src/game/state/GameStateMachine.ts
npm ci
npm run test
npm run lint
npm run build
npm run preview
```
