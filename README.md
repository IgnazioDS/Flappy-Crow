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
- Esc: close settings panel
- Share button (Game Over): export run card + seed link

## Query params

- `?daily=1` enables the daily seed mode (deterministic pipes).
- `?seed=your-seed` forces a custom seed for deterministic runs.

## Theme: Evil Forest (Crow)

Dark, mystical reskin featuring an occult-styled crow, deadwood gate obstacles,
layered parallax forest silhouettes with fog and ember ambience, and gothic UI.

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
