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

## UI Tokens (Phase 1)

All UI tokens live in **`src/game/ui/designTokens.ts`** (Phase 1 canonical file):

| Token group | Exports | Key values |
|-------------|---------|-----------|
| Spacing | `DT_SPACE` | xs=8, sm=12, md=16, lg=24, xl=32 (8-pt grid) |
| Radii | `DT_RADIUS` | capsule=10, panel=12, overlay=16 |
| Strokes | `DT_STROKE` | thin=1, normal=2 |
| Shadows | `DT_SHADOW` | `panelShadow`, `capsuleShadow`, `rimAlpha`, `innerHighlight` |
| Typography | `DT_TYPOGRAPHY` | `title` / `body` / `caption` / `number` roles |
| Colors | `DT_COLOR` | `panelFill` 0x07090f, `panelStroke` 0x48c8d8, `textPrimary`, `textMuted` |

### UIContext

Factory functions in `uiFactory.ts` accept an optional `UIContext` object
(built by `makeUIContext`) that bundles tokens + themeUi + safeArea + reducedMotion
into a single typed dependency:

```typescript
import { makeUIContext } from './ui/designTokens'

// In scene create():
this.uiCtx = makeUIContext(this.ui, this.safeArea, this.reducedMotion)

// Then pass to any factory:
createPanel(scene, ui, theme, 'large', w, h, this.uiCtx)
```

### Helpers

| Helper | Signature | Returns |
|--------|-----------|---------|
| `getTextStyle` | `(role: TypographyRole, themeUi?)` | Phaser text style object |
| `getPanelStyle` | `(kind: 'panel'\|'capsule', themeUi?)` | Drawing descriptor for Graphics |

### Token Overrides

Themes can override a subset of tokens via `ThemeUI.tokenOverrides`:

```typescript
// In a theme definition:
ui: { ...UI, tokenOverrides: { accentTealNum: 0x8b5cf6, accentTeal: '#8b5cf6' } }
```

Available override keys: `accentTealNum`, `accentTeal`, `textPrimary`, `textMuted`, `panelFillAlpha`.

### Legacy tokens (v2)

`src/game/ui/designSystem.ts` remains for backward compatibility and contains
the full v2 token set (`COLOR`, `COLOR_NUM`, `SPACE`, `RADIUS`, `STROKE`, `SHADOW`,
`FONT`, `MOTION`, `LAYOUT`, `createTextStyle`).  New code should import from
`designTokens.ts`.

UI assets (original SVG) are in `public/assets/ui/v2/`:

- `panel_9slice.svg`, `capsule_9slice.svg` — 9-slice panel and capsule frames
- Icon set: settings, mute on/off, motion on/off, restart, close
- Medal set: bronze, silver, gold, platinum
- `divider.svg` — decorative teal gradient separator

## Art QA Mode

Enable QA overlays in either of these ways:

```bash
VITE_ART_QA=true npm run dev
```

Or append `?qa=1` to the URL.

Keybinds in QA mode:

| Key | Action |
|-----|--------|
| `D` | Toggle environment debug overlay |
| `U` | Toggle UI QA guides (safe area, touch targets, baseline, 8-pt grid) |
| `H` | Toggle gameplay hitboxes |
| `1`–`9` | Toggle V2 visual layer slots |
| `Shift+1`–`9` | Solo one V2 layer slot |
| `B` | Toggle sprite-bounds overlay |

UI QA guides show:
- Cyan safe-area boundary (with inset fills for notch areas)
- Amber touch-target boxes (44×44 min) for interactive HUD elements
- Magenta baseline guide at HUD content row
- Faint 8-pt grid for spacing verification

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
