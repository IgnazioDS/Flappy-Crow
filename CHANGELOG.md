# Changelog

All notable changes to this project will be documented in this file.
This project follows [Semantic Versioning](https://semver.org/).


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
