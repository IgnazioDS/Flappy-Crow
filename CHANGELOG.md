# Changelog

<!-- markdownlint-disable MD024 -->

All notable changes to this project will be documented in this file.
This project follows [Semantic Versioning](https://semver.org/).

## [6.1.2] - 2026-02-26

### Added

- **HUD top-gradient scrim** (`createHudTopScrim()` in `uiFactory.ts`) — a
  programmatic canvas texture that fades from semi-opaque dark purple-black at
  y=0 to transparent at `hud.topScrimHeight` (72 px default).  Placed at depth
  3.95 (above all background layers, below score/icon UI at 4+).  Ensures the
  score capsule and top icons are always readable over bright or painterly
  backgrounds (V2 sky, V1 daylight sky, etc.).
- **Panel backdrop** (`createPanelBackdrop()` in `uiFactory.ts`) — Phaser
  `Graphics` layer rendered behind every overlay panel, providing a layered
  glass/obsidian look: drop shadow → dark fill → 2 px teal accent stroke with
  8 px corner radius.  Used in READY and GAME OVER containers.
- **`ThemeUI.hud`** — optional config block (`topScrimHeight`, `topScrimAlpha`,
  `safeTop`) on every theme UI; the Evil Forest theme sets concrete defaults
  (`72 px / 0.62 alpha / 8 px safeTop`).
- **`ThemeUI.spacing`** — 8-pt spacing scale (`xs=8`, `sm=12`, `md=16`,
  `lg=24`) added to the type and to the Evil Forest `UI` object.

### Changed

- **`overlayBodyStyle.color`** upgraded from `PALETTE.textMuted` (#9fb2c1) to
  `PALETTE.textPrimary` (#d7f5ff) — the "Tap or Space to Flap" hint in the
  READY panel now matches heading brightness instead of appearing washed-out
  over painterly backgrounds.
- **`overlayBodyStyle.strokeThickness`** bumped from 4 → 5 for parity with
  `overlayTitleStyle` and consistent halo width at all contrast levels.

## [6.1.1] - 2026-02-25

### Added

- **`EnvironmentFogLayer.tint`** — hex colour tint applied to fog TileSprites
  (e.g. `0xb4c4d8` for cool blue-gray); handled in `BackgroundSystem.createFogLayer()`.
- **`EnvironmentFogLayer.driftSpeed`** — vertical tile drift speed as a fraction
  of world scroll; fog now slowly drifts up/down for organic parallax depth.
- **Background vignette** in `BackgroundSystemV2` — programmatic radial-gradient
  canvas texture at depth 0.92 (above bg, below gameplay at 1.0+); transparent
  centre holds playfield readability, dark purple-black edges frame the scene.
- **Rich QA debug overlay** (`BackgroundSystemV2.getDebugLines()`): env key + label,
  all layer parallax speeds, fog α/spd/tint/drift, biolume patch count, configured
  particle maxes, and per-asset loaded texture dimensions.

### Changed

- **Parallax speeds** corrected to match reference depth bands:
  `0.08 / 0.12 / 0.18 / 0.28 / 0.40` × world scroll (was `0.02–0.14`).
- **Fog A**: speed `0.05`, α `0.22`, blue-gray tint `#b4c4d8`, drift `0.008`.
- **Fog B**: speed `0.12`, α `0.11`, violet-gray tint `#c0b8d4`, drift `0.015`.
- **Light rays**: α `0.07`, SCREEN blend, pulse `0.35` — more subtle.
- **Reflection layer speeds** synced to main parallax speeds (`0.28 / 0.40`)
  so reflected tiles scroll in sync with the source layers.
- **Biolume patches** repositioned within 360 px game width (x: 58–332, was
  160–720 — two patches were entirely off-screen).
- **Particle cap** enforced: dust `maxParticles` 18→10; total
  embers(6) + dust(10) + fireflies(14) = **30 max, all pooled**.
- **Firefly areas** constrained to 360 px game width with narrower spawn zones.
- **`bg_swamp_near`** alpha `0.82` (was 1.0) — obstacle/pipe readability safeguard.
- **`fg_branches`** alpha `0.42` (was `0.38`) — denser edge framing.

### Assets (re-rendered via `scripts/render-v2-assets.mjs`)

- **`water_reflection_mask`** — sharp 3-stop gradient (57 → 64% transition)
  with sinusoidal ellipse bumps at waterline for natural undulation; soft
  bottom fade so reflection dissolves rather than hard-cuts.
- **`bg_swamp_near`** — water channels raised from cy≈600 → cy≈510–522 (visible
  above ground line); 3 distinct high-contrast channels with specular sheen strips.
- **`bg_trees_mid`** — 9 full tree clusters with expanded canopy spreads, root
  tangles, hanging moss, and biolume root glows; strong dark silhouettes for
  clear BitmapMask reflection when flipped.
- **`biolume_glow_splotches`** — rebuilt with higher-opacity cores (0.90–0.95),
  steeper falloff, and white sparkle points at each pool centre.
- **`light_rays`** — 5 overlapping diagonal shaft polygons with per-shaft opacity
  stagger (0.60–0.95) and a warm source halo at upper-centre.

## [6.1.0] - 2026-02-25

### Added

- **Environment V2 — Evil Forest (Painterly)**: full upgrade of the V2 background
  system with 10 hand-crafted SVG source layers rendered to PNG/WebP:
  - `bg_sky_far` — twilight sky with star field, cliff silhouettes, and atmospheric gradients
  - `bg_mountains` — three mountain ranges with depth-haze and fog bands
  - `bg_trees_far` — 24 cypress silhouettes with atmospheric depth fade
  - `bg_trees_mid` — heavy trees with gnarled roots, hanging moss, and biolume glow
  - `bg_swamp_near` — water channels, marsh banks, reeds, and violet/teal biolume accents
  - `fg_branches` — foreground branch framing with edge darkness
  - `fog_tile_soft` — tileable organic fog (512×512, violet/teal tints)
  - `light_rays` — subtle diagonal volumetric light rays
  - `water_reflection_mask` — B/W gradient mask driving the BitmapMask water reflection
  - `biolume_glow_splotches` — violet + teal radial glow patches (512×512)
- `scripts/render-v2-assets.mjs` — Playwright + cwebp pipeline that renders
  SVG source art to final PNG/WebP; re-run after editing SVGs to refresh assets.
- `src/game/background/BackgroundSystemV2.ts` — thin subclass of BackgroundSystem
  that adds texture-size reporting in the QA debug overlay (`getDebugLines()`).
- PlayScene now instantiates `BackgroundSystemV2` for the `v2` environment key,
  wiring the QA overlay with per-asset texture dimensions.

### Changed

- Default environment is `v2` (Evil Forest V2 — Painterly); V1 still reachable
  via `?env=v1` query param.

## [6.0.2] - 2026-02-25

### Added

- `.nvmrc` pinning Node 20 for local and CI consistency (P1-1).
- `docs/AUDIO.md` documenting intentional SFX deferral and Path A migration
  guide for when audio assets are ready (P1-2).
- Dedicated `envRng` (seeded `RandomSource`) for firefly area selection, fixing
  visual non-determinism in daily/custom-seed modes (P2-2).
- Google Fonts preconnect hints in `index.html` to reduce font-swap latency
  on first load (P2-5).
- `art-qa` CI job: builds with `VITE_ART_QA=true` so theme contract validation
  runs in CI, not just local dev (P2-6).
- `docs/PLAYSCENE_DECOMPOSITION.md` — 10-slice plan for incrementally
  extracting the PlayScene god-class into focused managers (P2-1).

### Changed

- Vite `manualChunks` splits Phaser into a stable vendor chunk; app chunk
  drops from 1,336 KB to 127 KB, improving browser cache utilisation (P1-5).
- `validateThemeDefinition` now also activates when `VITE_ART_QA=true`, making
  it reachable in production builds without touching the dev-only guard (P2-6).

### Fixed

- `birdBobTime` now wraps with `% (Math.PI * 2)` to prevent unbounded
  float growth during long idle sessions (P2-3).

### Removed

- `public/assets/theme/atlas.svg` (13 KB vector source; runtime uses
  PNG/WebP only) (P1-3).
- 9 legacy unused SVGs from `public/assets/`: `background.svg`,
  `crow_idle/dead/flap_0-2.svg`, `ember.svg`, `obstacle_top/bottom.svg` (P1-4).
- `ios/App/App/config 2.xml` — stray Finder-duplicate Cordova stub (P2-4).

## [6.0.1] - 2026-01-25

### Added

- iOS privacy manifest template (`PrivacyInfo.xcprivacy`) for App Store compliance.

### Fixed

- Adopted UIScene lifecycle to avoid future iOS asserts.
- Patched Cordova Purchase headers for SPM builds.

## [6.0.0] - 2026-01-24

### Added

- Versioned SaveState v2 with single-file persistence, migrations, and dev reset menu.
- Meta-progression: coins, run summary screen, and lifetime stats tracking.
- Cosmetic shop + inventory persistence (skins, frames/trails) with Supporter Pack bundle.
- Daily reward streak system with claim UI and edge-case handling.
- App Store IAP plumbing for Remove Ads + Supporter Pack, plus restore flow.
- Local analytics logger and expanded gameplay/IAP event hooks.
- App Store readiness docs for assets, listing URLs, and submission checks.

### Changed

- Performance hardening: no per-frame allocations in tuning, safer pause/resume input clearing.
- Sound playback routed through a guarded SoundSystem to avoid duplicate instances.
- Settings panel expanded with shop/daily reward shortcuts.

### Fixed

- Sound cleanup now avoids destroyed audio handles during scene teardown.

## [5.0.0] - 2026-01-22

### Added

- Capacitor iOS app-shell scaffolding (config, iOS project, scripts, and docs).
- Privacy policy settings row with `VITE_PRIVACY_POLICY_URL` wiring.
- Privacy manifest template for iOS builds.
- Theme contract validation for required assets/frames in dev builds.
- Visual QA specs for safe-area and Emerald UI checks.
- Theme QA checklist for v5 visual review.

### Changed

- Classic, Emerald Lake, and Evil Forest art passes (backgrounds, pipes, birds, ground).
- Evil Forest environment tuning with calmer fog/biolume and low-power profile.
- UI contrast and sizing polish across themes (Classic sizing, Emerald stats, Evil Forest glow).
- Safe-area offsets for overlays plus minimum touch target sizing.
- Reduced-motion/low-power now suppresses motion FX (camera punch/scene fades).
- Release checklist includes an iOS simulator smoke step.

### Fixed

- Settings button hit area reliability.
- Emerald pipe contrast in motion.

## [4.0.0] - 2026-01-18

### Added

- Replay recording and ghost playback for best runs.
- Practice mode with checkpoints and brief invulnerability.
- Casual and Hardcore difficulty presets.
- Moving and pulsing obstacle variants with cooldown spacing.
- Shareable run card export with seed links.
- Accessibility upgrades (one-handed layout, text scaling, high contrast).
- Emerald Lake Swan theme.

### Changed

- Added juice passes (camera punch, screen flash, impact bursts, overlay bounce).
- Settings panel polish with value badges and backdrop dismissal.
- Adaptive low-power visuals for smoother play on low-end devices.

### Fixed

- Particle tinting uses emitter config to satisfy Phaser typings.

## [3.0.0] - 2026-01-17

### Added

- Telemetry schema versioning for event payloads.
- "NEW BEST" callout in the game over panel when a run beats the high score.

## [2.0.0] - 2026-01-16

### Added

- Evil Forest v2 environment scaffolding with scene debug support.
- Difficulty ramping plus daily/custom seed modes for deterministic runs.
- Telemetry consent prompt and opt-in toggle in settings.

### Changed

- Reduced-motion behavior now disables non-essential animation.
- Gameplay pauses on tab hidden and resumes on focus.
- PlayScene UI and persistence refactored into shared modules.

## [1.1.0] - 2026-01-14

### Added

- GitHub Pages deployment workflow with Vite base-path handling.
- Telemetry interface with console, Plausible, and PostHog providers plus batching and opt-out.
- Settings panel toggles for mute, reduced motion, analytics opt-out, and hitbox overlay.
- Persistent best score and theme selection.
- Playwright smoke tests with deterministic seed support.
- Theme system with Classic Sky and Evil Forest Crow themes.
- Manual performance checklist for memory-growth sanity checks.

### Changed

- Scenes load assets and UI layout from the active theme registry.
- UI styling and fonts updated to support theming.

## [1.0.0] - 2026-01-12

### Added

- Initial v1 release with deterministic gameplay systems and Phaser rendering.
