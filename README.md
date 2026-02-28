# Flappy Crow

Flappy Crow is a production-oriented Flappy Bird-style game built with Phaser 3, TypeScript, and Vite.
Core gameplay logic (spawn, score, collisions, state machine) is deterministic and unit-tested.

## Features

- Deterministic play with seeded runs (daily and custom)
- Replay recording and ghost playback
- Multiple themes: Classic, Evil Forest, Emerald Lake
- Accessibility options: reduced motion, text scale, high contrast, handedness
- iOS shell support via Capacitor

## Quickstart

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Commands

- `npm run dev` - local development server
- `npm run build` - production build (`dist/`)
- `npm run preview` - preview production build locally
- `npm run test` - unit tests (Vitest)
- `npm run lint` - ESLint
- `npm run test:e2e` - Playwright E2E

## Themes And Environments

Theme is selected in the in-game Settings panel.

Environment V1/V2 is used in Evil Forest:
- `?env=v1` - classic environment
- `?env=v2` - painterly environment (default)

Environment selection is persisted in local storage (`flappy-env`).

## Art QA Mode

Enable QA overlay in either of these ways:

```bash
VITE_ART_QA=true npm run dev
```

Or append `?qa=1` to the URL.

Keybinds in QA mode:

- `D` toggle environment debug overlay
- `1` to `9` toggle V2 visual slots
- `Shift+1` to `Shift+9` solo one slot
- `B` toggle slot bounds overlay
- `H` toggle gameplay hitboxes

## Evil Forest V2 Asset Pipeline

V2 painterly runtime assets are generated from SVG source files in:

- `public/assets/theme/evil_forest_v2/src/`

Regenerate PNG/WebP outputs with:

```bash
node scripts/render-v2-assets.mjs
```

Important constraints kept in current baseline:

- `fog_tile_soft` sanitize threshold is `32`
- Biolume sparkles disabled (`sparkleMax=0`)
- Ambient `embers` and `fireflies` disabled in V2
- Ground magenta dot decorations removed

## Architecture (High Level)

- `src/game/config.ts` - gameplay tuning constants
- `src/game/systems/*` - deterministic gameplay systems
- `src/game/state/*` - game state machine
- `src/game/scenes/PlayScene.ts` - scene orchestration and UI
- `src/game/background/BackgroundSystemV2.ts` - Evil Forest V2 composition layers

## Telemetry

Telemetry support exists and is consent-gated.
If no providers are configured, telemetry providers are disabled.
See [docs/TELEMETRY.md](docs/TELEMETRY.md).

## Deployment

The app is static and deploys from `dist/`.
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Versioning And Release Tags

Releases follow semantic versioning.

Tag convention:
- `vX.Y.Z` - release tag
- `vX.Y.Z-mainline` - release tag explicitly marking the mainline baseline commit

Branch strategy:
- `main` is canonical baseline
- feature/release work happens on `branch/*` and is merged to `main`

See [docs/RELEASE.md](docs/RELEASE.md).

## License And Attribution

Code license: MIT ([LICENSE](LICENSE)).

Font attribution:
- Cinzel / Cinzel Decorative (SIL Open Font License)
- Space Mono (SIL Open Font License)

Theme art in this repository is project-authored source SVG/derived PNG+WebP assets under `public/assets/`.
