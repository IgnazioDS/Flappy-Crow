# Changelog

All notable changes to this project will be documented in this file.
This project follows [Semantic Versioning](https://semver.org/).

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
