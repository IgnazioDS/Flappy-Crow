# PlayScene Decomposition

## Current Snapshot (2026-02-28)

`src/game/scenes/PlayScene.ts` remains a large coordinator:

- ~4,089 lines
- 144 private methods
- 66 private fields

It currently combines:
- scene lifecycle
- input handling
- overlay/UI construction
- gameplay orchestration hooks
- telemetry hooks
- environment switching and debug helpers

## Goal

Reduce maintenance risk by extracting responsibilities into focused managers without changing gameplay logic.

## Safe Extraction Order

1. `BestScoreStore` and local persistence helpers
2. Toast/HUD UI managers
3. Environment visual manager bindings
4. Replay manager extraction
5. Shop/daily/debug/settings overlay adapters
6. Layout/safe-area coordinator

## Guardrails

- No changes to physics, collision, spawn, score, state machine.
- Keep deterministic behavior and existing tests green.
- Keep feature parity for QA shortcuts and telemetry consent UI.

## Validation Per Slice

- `npm run test`
- `npm run lint`
- `npm run build`
- quick manual smoke in `npm run dev`

## Status

This remains a technical-debt roadmap document, not a committed refactor plan for the current release.
