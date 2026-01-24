# Flappy Crow v5 Theme Quality Issues

## Classic

### [Classic] Refresh background SVG set

Goal: Higher-fidelity sky layers with clearer horizon depth.
Files/assets: `public/assets/bg_far.svg`, `public/assets/bg_mid.svg`, `public/assets/bg_near.svg`, `src/game/theme/themes/classic.ts`
Acceptance criteria: Parallax depth reads at 360x640 and 2x scale without visual noise.
Effort: M

### [Classic] Rework pipe silhouette

Goal: Improve pipe contrast and edge readability.
Files/assets: `public/assets/pipe.svg`, `src/game/theme/themes/classic.ts`
Acceptance criteria: Pipe edges remain clear against bright sky at 1x scale.
Effort: M

### [Classic] UI panel polish

Goal: Refine panel sizing, spacing, and badge clarity.
Files/assets: `src/game/theme/themes/classic.ts`, `src/game/ui/settingsPanel.ts`
Acceptance criteria: Settings panel is legible at 100% and 115% text scale.
Effort: S

### [Classic] Classic-tinted impact burst

Goal: Match impact FX tint to Classic palette.
Files/assets: `src/game/theme/themes/classic.ts`, `src/game/effects/ImpactBurst.ts`
Acceptance criteria: Burst tint matches Classic palette; reduced motion disables.
Effort: S

### [Classic] Icon style pass

Goal: Add consistent Classic icon shapes for mute/motion/restart.
Files/assets: `src/game/ui/uiFactory.ts`, `src/game/theme/themes/classic.ts`
Acceptance criteria: Icons read at 1x scale in HUD and settings panel.
Effort: M

### [Classic] SFX hooks

Goal: Add flap/score/hit SFX with mute respect.
Files/assets: `src/game/scenes/PlayScene.ts`, `src/game/audio/*` (new), `public/assets/audio/*`
Acceptance criteria: Mute disables all SFX; no audio if muted on load.
Effort: M

## Evil Forest

### [Evil Forest] Crow animation cleanup

Goal: Sharper flap frames and glow balance.
Files/assets: `public/assets/theme/atlas.svg`, `src/game/theme/assets.ts`
Acceptance criteria: Crow silhouette reads at 1x and 0.75x scale.
Effort: L

### [Evil Forest] Gate readability pass

Goal: Improve obstacle outline/contrast.
Files/assets: `public/assets/theme/atlas.svg`, `src/game/theme/assets.ts`
Acceptance criteria: Moving/pulsing gates remain readable under motion.
Effort: M

### [Evil Forest] Environment intensity tuning

Goal: Rebalance fog/biolume so crow + gates dominate.
Files/assets: `src/game/theme/env/evilForestV2.ts`
Acceptance criteria: Background effects remain subtle on low-end.
Effort: S

### [Evil Forest] Low-power environment profile

Goal: Reduce layers/particles when low-power mode is active.
Files/assets: `src/game/systems/BackgroundSystem.ts`, `src/game/scenes/PlayScene.ts`
Acceptance criteria: Low-power stays above 48 FPS on low-end devices.
Effort: M

### [Evil Forest] UI icon contrast

Goal: Improve mute/motion/restart icon contrast in atlas.
Files/assets: `public/assets/theme/atlas.svg`
Acceptance criteria: Icons are readable against dark UI panels.
Effort: M

### [Evil Forest] Theme ambience

Goal: Add low-volume ambience loop with mute support.
Files/assets: `public/assets/audio/*`, `src/game/audio/*` (new)
Acceptance criteria: Ambience respects mute and reduced-motion.
Effort: M

## Emerald Lake

### [Emerald Lake] Distinct background set

Goal: Create lake-specific far/mid/near background layers.
Files/assets: `public/assets/*` (emerald variants), `src/game/theme/themes/emeraldLake.ts`
Acceptance criteria: Theme reads distinct from Classic at a glance.
Effort: L

### [Emerald Lake] Swan silhouette polish

Goal: Refine swan SVG for clarity.
Files/assets: `public/assets/swan.svg`
Acceptance criteria: Swan is clear at 1x scale.
Effort: M

### [Emerald Lake] Emerald pipe variant

Goal: Add a water-themed pipe with higher contrast.
Files/assets: `public/assets/pipe.svg` or new asset, `src/game/theme/themes/emeraldLake.ts`
Acceptance criteria: Pipes readable across dark water regions.
Effort: M

### [Emerald Lake] UI tone pass

Goal: Adjust panel fills and strokes to match lake palette.
Files/assets: `src/game/theme/themes/emeraldLake.ts`, `src/game/ui/settingsPanel.ts`
Acceptance criteria: UI legible at all text scales.
Effort: S

### [Emerald Lake] FX tint pass

Goal: Aqua-tinted impact burst and flash.
Files/assets: `src/game/theme/themes/emeraldLake.ts`, `src/game/effects/ScreenFlash.ts`
Acceptance criteria: FX tint aligns with palette; reduced motion disables.
Effort: S

### [Emerald Lake] Lake ambience SFX

Goal: Add subtle water/air ambience.
Files/assets: `public/assets/audio/*`, `src/game/audio/*` (new)
Acceptance criteria: Mute disables ambience; no autoplay if muted.
Effort: M
