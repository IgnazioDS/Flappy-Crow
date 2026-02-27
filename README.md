# Flappy Crow

Production-ready Flappy Bird-inspired clone built with TypeScript, Vite, and Phaser 3.
All gameplay rules live in deterministic systems so the logic is easy to test.

## Highlights

- Deterministic seeded modes (daily + custom) with repeatable obstacle spawns
- Ghost replay playback + best-run recording (local)
- Practice mode with checkpoints and invulnerability window
- Casual / Hardcore presets for comfort vs mastery
- Moving + pulsing obstacle variants tuned for readability
- Shareable run card with seed link export (local)
- Meta-progression with coins, run summary, and daily reward streaks
- Cosmetic shop + inventory (skins, trails/frames) with App Store-ready IAPs
- Accessibility: one-handed layout, text scaling, high contrast, reduced motion
- Multiple themes (Classic Sky, Evil Forest Crow, Emerald Lake Swan)

## Quickstart

```bash
npm install
npm run dev
```

Open the URL printed by Vite.

## Commands

- `npm run dev` - start the local dev server
- `npm run build` - build the static bundle
- `npm run preview` - preview the production build
- `npm run lint` - run ESLint
- `npm run format` - format with Prettier
- `npm run test` - run unit tests
- `npm run test:e2e` - run Playwright smoke tests (requires `npx playwright install chromium`)

Playwright runs the dev server with `VITE_TEST_SEED` and `VITE_E2E` to make runs deterministic.

## Controls

- Tap / click: flap
- Spacebar: flap
- Settings button opens toggles for mute, reduced motion, handedness, text scale, contrast,
  analytics opt-out, seed mode, difficulty, practice, ghost, and theme
- Settings panel shortcuts for Shop and Daily Reward
- H: toggle art QA hitbox overlay
- M: toggle mute icon
- R: toggle reduced motion
- E: cycle V2 ↔ V1 environment (Evil Forest theme, DEV only)
- Esc: close settings panel
- Share button (Game Over): export run card + seed link

### Art QA controls (DEV or `VITE_ART_QA=true`)

These controls are only available when running with `npm run dev` or when the
`VITE_ART_QA=true` environment variable is set.

| Key | Action |
|---|---|
| `D` | Toggle environment debug overlay (parallax speeds, fog/biolume knobs, FX budget, RGBA samples) |
| `1`–`9` | Toggle visibility of QA slots (parallax, fog A/B, rays, biolume, reflection, shimmer, grade, grain) |
| `Shift`+`1`–`9` | **Solo** a single slot — hides all other sprites for artifact isolation |
| `Shift`+same digit | Exit solo mode, restore all layers |
| `B` | Toggle sprite-bounds overlay — draws a coloured rectangle around every overlay sprite |

The debug overlay sections:
- **QA FORENSICS**: current solo status + bounds on/off
- **RGBA SAMPLES**: corners + mid-edge samples for ADD/SCREEN/overlay textures — `✓` means clean, `✗` means artifact risk
- **QA SLOTS**: ●/○ per slot with `◀SOLO` marker on the active solo
- **FX BUDGET**: live sparkle count + all visible-layer alphas snapshot

## Query params

- `?daily=1` enables the daily seed mode (deterministic pipes).
- `?seed=your-seed` forces a custom seed for deterministic runs.

## Theme: Evil Forest (Crow)

Dark, mystical reskin featuring an occult-styled crow, deadwood gate obstacles,
layered parallax forest silhouettes with fog and ember ambience, and gothic UI.

### Environment V2 — Painterly (default)

The default `v2` environment upgrades the background to a cinematic painterly
style. Ten SVG source layers are rendered at 1024×640 (or 512×512 for tileable
textures) via `scripts/render-v2-assets.mjs` and served as WebP with PNG
fallback:

| Layer | Size | Description |
|---|---|---|
| `bg_sky_far` | 1024×640 | Twilight sky — star field, cliff silhouettes, atmospheric gradients |
| `bg_mountains` | 1024×640 | Three mountain ranges with depth-haze and fog bands |
| `bg_trees_far` | 1024×640 | 24 cypress silhouettes with atmospheric depth fade |
| `bg_trees_mid` | 1024×640 | Heavy trees with roots, hanging moss, biolume glow |
| `bg_swamp_near` | 1024×640 | Water channels, reeds, violet/teal biolume accents |
| `fg_branches` | 1024×640 | Foreground branch framing with edge darkness |
| `fog_tile_soft` | 512×512 | Tileable organic fog (violet/teal tints) |
| `light_rays` | 1024×640 | Subtle diagonal volumetric light rays |
| `water_reflection_mask` | 1024×640 | B/W gradient mask for BitmapMask water reflection |
| `biolume_glow_splotches` | 512×512 | Violet + teal radial glow patches |

SVG source files live in `public/assets/theme/evil_forest_v2/src/`. To
regenerate assets after editing SVGs:

```bash
node scripts/render-v2-assets.mjs
```

Switch to V1 (classic flat look) via `?env=v1`. V2 QA overlay (`?qa=1`)
shows per-layer texture dimensions alongside FPS and env label.

#### HUD / UI polish knobs (v6.1.2+)

| Feature | Location | Default |
|---|---|---|
| Top-scrim height | `ui.hud.topScrimHeight` | 72 px |
| Top-scrim peak opacity | `ui.hud.topScrimAlpha` | 0.62 |
| HUD safe-top gap | `ui.hud.safeTop` | 8 px |
| Spacing scale | `ui.spacing.xs/sm/md/lg` | 8 / 12 / 16 / 24 |
| Body text colour | `ui.overlayBodyStyle.color` | `textPrimary` |
| Body stroke thickness | `ui.overlayBodyStyle.strokeThickness` | 5 |
| Panel backdrop corner radius | hardcoded in `createPanelBackdrop` | 8 px |

#### V2 water shimmer + biolume sparkle knobs (v6.1.5+)

| Feature | Config field | Default |
|---|---|---|
| Water shimmer enabled | `waterShimmer.enabled` | `true` |
| Shimmer alpha | `waterShimmer.alpha` | 0.08 |
| Shimmer render depth | `waterShimmer.depth` | 0.70 |
| Shimmer horizontal scroll | `waterShimmer.scrollX` | 18 px/s |
| Shimmer vertical scroll | `waterShimmer.scrollY` | 6 px/s |
| Shimmer pulse amplitude | `waterShimmer.pulseAmp` | 0.30 (±30 %) |
| Shimmer pulse frequency | `waterShimmer.pulseHz` | 0.22 Hz |
| Biolume sparkle cap | `biolume.sparkleMax` | 14 (total) |
| Biolume sparkle rate | `biolume.sparkleSpawnRate` | 850 ms/patch |

#### V2 grade / grain / outline knobs (v6.1.4+)

| Feature | Config field | Default |
|---|---|---|
| Grade overlay alpha | `grade.alpha` | 0.14 |
| Grade render depth | `grade.depth` | 3.50 |
| Grain TileSprite alpha | `grain.alpha` | 0.04 |
| Grain scroll speed | `grain.scrollSpeed` | 55 px/s |
| Grain render depth | `grain.depth` | 3.51 |
| Outline alpha (crow + gates) | `outline.alpha` | 0.42 |
| Outline scale multiplier | `outline.scale` | 1.08× |
| Outline tint | `outline.tint` | `0x4a8494` (dark teal) |

#### V2 composition knobs (v6.1.1+)

| Feature | Config field | Default |
|---|---|---|
| Parallax speed (per layer) | `layers[n].speed` | 0.08 → 0.40 |
| Fog tint | `fogLayers[n].tint` | `0xb4c4d8` / `0xc0b8d4` |
| Fog vertical drift | `fogLayers[n].driftSpeed` | 0.008 / 0.015 |
| Background vignette depth | `VIGNETTE_DEPTH` in BackgroundSystemV2 | 0.92 |
| Water reflection ripple | `reflection.rippleAmplitude` | 2.5 px |
| Biolume pulse | `biolume.patches[n].pulseSpeed` | 0.70–0.90 |
| Particle hard cap | `particles.*.maxParticles` | 30 total |

## Tuning parameters

All gameplay constants live in `src/game/config.ts`. Key values:

- `GAME_DIMENSIONS` - logical game size (portrait)
- `BIRD_CONFIG` - gravity, flap velocity, rotation, bird size, start position
- `PIPE_CONFIG` - speed, gap size, spawn interval, margins
- `GROUND_HEIGHT` - ground collision height

## Architecture

- `src/game/entities` - deterministic state for bird, pipes, and ground
- `src/game/systems` - input, spawning, scoring, collisions, despawning
- `src/game/state` - state machine for READY/PLAYING/GAME_OVER transitions
- `src/game/scenes` - Phaser scenes for preload and gameplay rendering

## Telemetry (optional)

Telemetry is opt-in via environment configuration and consent, and can be disabled by players
through the analytics opt-out flag (stored in localStorage).

## Performance sanity checks

See `docs/PERFORMANCE.md` for the manual memory-growth checklist.

## Docs

- `docs/RELEASE.md` - release checklist and tagging
- `docs/DEPLOYMENT.md` - deployment workflow and base path notes
- `docs/TELEMETRY.md` - tracked events and privacy details
- `docs/IOS.md` - iOS app shell workflow and App Store checklist
- `docs/V6_APP_STORE_READINESS.md` - App Store readiness checklist
- `docs/APP_STORE_ASSETS.md` - icon/splash asset prep guide
- `docs/APP_STORE_LISTING.md` - Support/Marketing/Privacy URL placeholders

## Themes

Three themes are available: Classic Sky, Evil Forest Crow, and Emerald Lake Swan. Use the Settings panel to switch themes,
or set `VITE_THEME=classic` / `VITE_THEME=evil-forest` / `VITE_THEME=emerald-lake` in your environment.

Optional environment variables (see `.env.example`):

- `VITE_TELEMETRY_CONSOLE=true` to log events locally
- `VITE_PLAUSIBLE_DOMAIN=yourdomain.com`
- `VITE_PLAUSIBLE_API_HOST=https://plausible.yourhost.com` (optional)
- `VITE_POSTHOG_KEY=phc_...`
- `VITE_POSTHOG_HOST=https://app.posthog.com` (optional)

## Physics note

Rendering uses Phaser 3, while physics and collisions are implemented in deterministic
systems for testability and to keep gameplay logic framework-agnostic.

## Deployment

The build output is a static site in `dist/`.

### GitHub Pages (recommended)

This repo includes an automated Pages workflow in `.github/workflows/deploy.yml`.

1. Push to `main`.
2. In GitHub, go to Settings → Pages and set the source to **GitHub Actions**.
3. The workflow will publish to `https://<org>.github.io/<repo>/`.

The workflow sets `VITE_BASE` to the repository name so asset paths resolve under the Pages base path.
Hashed asset filenames provide safe long-term caching, while `index.html` remains fresh on deploy.

### Other hosts

- Vercel: `npm run build`, then deploy the `dist/` folder
- Netlify: set build command to `npm run build` and publish `dist/`

## Assets

All sprites are original SVGs created for this project and are safe to use.
Theme assets live under `public/assets/theme/` with a shared atlas for sprites/UI
exported as SVG source plus PNG/WebP runtime variants.

## Attribution

- Cinzel + Cinzel Decorative by Natanael Gama (Google Fonts, SIL Open Font License):
  <https://fonts.google.com/specimen/Cinzel>
  <https://fonts.google.com/specimen/Cinzel+Decorative>
  <https://scripts.sil.org/cms/scripts/page.php?site_id=nrsi&id=OFL>

- Space Mono by Colophon Foundry (Google Fonts, SIL Open Font License):
  <https://fonts.google.com/specimen/Space+Mono>
  <https://scripts.sil.org/cms/scripts/page.php?site_id=nrsi&id=OFL>
