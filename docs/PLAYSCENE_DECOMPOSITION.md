# PlayScene Decomposition Plan

## Current state (v6.0.2)

`src/game/scenes/PlayScene.ts` is **3,780 lines** with **163 private methods**
and approximately **145 private fields**.  It acts as:

- Scene lifecycle coordinator (create, update, destroy)
- Game state machine host (READY → PLAYING → GAME\_OVER)
- UI builder for every overlay (ready, game-over, settings, shop, IAP, daily reward, debug)
- Visual coordinator (bird, pipes, parallax, fog, particles, vignette, flash, camera punch)
- Persistence façade (scores, cosmetics, save-state, streak)
- Analytics dispatcher
- Seed / difficulty / game-mode resolver
- Replay record/playback coordinator
- E2E test instrumentation surface

---

## Guiding principles

1. **No gameplay changes.** Physics constants, scoring rules, collision math, and
   state transitions stay in their existing pure modules.
2. **Extract by responsibility.** Each extracted module should be testable
   independently with no Phaser dependency if possible.
3. **Phaser-coupled code stays in Phaser-aware managers.**  If a class must call
   `this.add.*` / `this.tweens.*` it extends or receives `Phaser.Scene`.
4. **Incremental, never big-bang.** Each PR should be a single responsibility
   slice that leaves CI green.

---

## Proposed module map

```
src/game/scenes/
  PlayScene.ts          ← coordinator only; owns Phaser lifecycle
  ui/
    SettingsPanel.ts    ← already exists (SettingsPanelHandle)
    ReadyOverlay.ts     ← new
    GameOverOverlay.ts  ← new
    ShopOverlay.ts      ← new
    DailyRewardOverlay.ts ← new
    TelemetryConsentOverlay.ts ← new
    DebugMenu.ts        ← new
    ScoreHUD.ts         ← new (score frame + score text + pulse tween)
    ToastManager.ts     ← new
  managers/
    BirdVisualManager.ts   ← new (sprite, glow, bob, visual state)
    PipeVisualManager.ts   ← new (sprite pool, sway, variant application)
    EnvironmentManager.ts  ← new (parallax, fog, particles, environment key)
    LayoutManager.ts       ← new (safe-area, overlay positions, handedness)
    ReplayManager.ts       ← new (recorder + ghost player)
    IapManager.ts          ← new (purchase flow, restore flow)
  persistence/
    BestScoreStore.ts      ← new (per-mode best score read/write)
```

---

## Extraction order (safest → riskiest)

### Slice 1 — `BestScoreStore` (≈30 lines, zero Phaser)

Extract `readBestScore`, `storeBestScore`, `getBestScoreKey` and the
`bestScore`, `lastScore` fields.  Zero Phaser, pure localStorage.
Add unit tests alongside the module.

**Risk: very low** — no visual state, no game loop interaction.

---

### Slice 2 — `ToastManager` (≈60 lines)

Extract `createToastOverlay`, `showToast`, `updateToastLayout`, and
related fields.  Constructor receives `scene: Phaser.Scene` and
`ui: ThemeUI`.

**Risk: low** — isolated, no cross-cutting state.

---

### Slice 3 — `ScoreHUD` (≈80 lines)

Extract `createScoreFrame`, `scoreText`, `scoreFrame`, `pulseScore`,
`scorePulseTween`, and the score-display update calls.

**Risk: low** — read-only to score; emit an event for pulses.

---

### Slice 4 — `EnvironmentManager` (≈300 lines)

Extract:
- `createParallaxLayers` / `updateParallax`
- `createFogLayer` / `updateFog`
- `createParticles` / `createEmitterFromEnv` / `clearParticles`
- `applyEnvironment` / `resolveEnvironmentKey` / `toggleEnvironment`
- `createVignette`
- `backgroundSystem` field (already a class; just move ownership)

Constructor receives `scene: Phaser.Scene` and `theme: ThemeDefinition`.

**Risk: medium** — particle managers are stored in `PlayScene`; needs a
careful field migration.

---

### Slice 5 — `BirdVisualManager` (≈150 lines)

Extract `createBirdSprite`, `createCrowAnimation`, `setBirdVisual`,
`updateBirdVisual`, `birdBobTime`, `birdGlow`, `birdSprite`,
`birdVisualState`.

Constructor receives `scene: Phaser.Scene`, `theme: ThemeDefinition`,
and an accessor for the `Bird` entity.

**Risk: medium** — tightly coupled to Bird entity position; keep a
read-only accessor pattern.

---

### Slice 6 — `PipeVisualManager` (≈150 lines)

Extract `createPipeSprites`, `spawnPipePair`, `updatePipeSprites`,
`applyObstacleVariant`, sprite pools.

Constructor receives `scene: Phaser.Scene` and `theme: ThemeDefinition`.

**Risk: medium** — pool logic touches PlayScene's `pipes` array; define
a shared pipe-list type.

---

### Slice 7 — `ReplayManager` (≈100 lines)

Extract `startReplayRecording`, `finishReplayRecording`,
`startGhostPlayback`, `isReplayCompatible`, `ghostPlayer`,
`replayRecorder`, `bestReplay`.

**Risk: medium** — interacts with ScoreHUD for "NEW BEST" callout; use
an event/callback.

---

### Slice 8 — Overlay classes (≈800 lines combined)

Each overlay becomes a class with `show()` / `hide()` / `update()`:

| Class | Key methods extracted |
|---|---|
| `ReadyOverlay` | `createReadyOverlay`, `showReadyOverlay`, `animateOverlay` |
| `GameOverOverlay` | `createGameOverOverlay`, `showGameOverOverlay`, `updateMedal` |
| `ShopOverlay` | `createShopOverlay`, `toggleShop`, `updateShopUI`, `updateIapUI` |
| `DailyRewardOverlay` | `createDailyRewardOverlay`, `toggleDailyReward`, `updateDailyRewardUI` |
| `TelemetryConsentOverlay` | `createTelemetryConsentOverlay`, `showTelemetryConsentOverlay` |
| `DebugMenu` | `createDebugMenu`, `toggleDebugMenu`, `createDebugOverlay` |

**Risk: medium-high** — each overlay has callbacks into PlayScene for
state mutation; replace with a typed `PlaySceneActions` interface passed
at construction.

---

### Slice 9 — `IapManager` (≈200 lines)

Extract `handleIapPurchase`, `handleIapRestore`, `getIapRestoreToastMessage`,
`isIapOwned`, `setPurchaseOwned`, `getPurchasesState`, IAP state fields.

**Risk: medium-high** — async flows touch save state; coordinate through
a `PurchaseCallback` interface.

---

### Slice 10 — `LayoutManager` (≈80 lines)

Extract `updateSafeAreaLayout`, `readSafeAreaInsets`, `updateOverlayLayout`,
`applyHandednessLayout`, `safeArea`.

Depends on references to overlay instances from Slices 8+9 so must come
last.

**Risk: low in isolation, medium in sequencing** — order after overlays.

---

## What remains in `PlayScene` after all slices

```
PlayScene (~600 lines estimated)
  create()              — wires all managers, calls Phaser load hooks
  update()              — delegates to managers and systems
  destroy()             — tears down managers in reverse order
  State transition hooks (enterReady, startPlaying, triggerGameOver, restart)
  Input handler (setupInput, handleSpawn, handleDespawn)
  Seed / difficulty / game-mode resolution helpers
  E2E instrumentation (maybeAutoFlap, setE2EState, getUpcomingGapY)
```

---

## Preconditions before starting

- All P1/P2 audit fixes merged (done in v6.0.2).
- Each slice must pass `npm run test && npm run lint && npm run build` before
  its PR is merged.
- Slices should be reviewed individually; avoid batching multiple slices into
  one PR.

---

## Test strategy per slice

- Pure-logic extracts (BestScoreStore): add Vitest unit tests directly.
- Phaser-coupled managers: rely on existing Playwright E2E smoke tests for
  regression coverage; unit tests where constructor can receive a mock scene.
- Overlays: verify via E2E "ready → play → die" flow.

---

*Created: 2026-02-25 as part of v6.0.2 audit remediation (audit item P2-1).*
