# Flappy Bird EX

Production-ready Flappy Bird-inspired clone built with TypeScript, Vite, and Phaser 3.
All gameplay rules live in deterministic systems so the logic is easy to test.

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

## Controls

- Tap / click: flap
- Spacebar: flap
- H: toggle art QA hitbox overlay
- M: toggle mute icon
- R: toggle reduced motion

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

## Physics note

Rendering uses Phaser 3, while physics and collisions are implemented in deterministic
systems for testability and to keep gameplay logic framework-agnostic.

## Deployment

The build output is a static site in `dist/`. Deploy with any static host:

- Vercel: `npm run build`, then deploy the `dist/` folder
- Netlify: set build command to `npm run build` and publish `dist/`
- GitHub Pages: upload `dist/` to your Pages branch or use a Pages action

## Assets

All sprites are original SVGs created for this project and are safe to use.
Theme assets live under `public/assets/theme/` with a shared atlas for sprites/UI
exported as SVG source plus PNG/WebP runtime variants.

## Attribution

- Cinzel + Cinzel Decorative by Natanael Gama (Google Fonts, SIL Open Font License):
  https://fonts.google.com/specimen/Cinzel
  https://fonts.google.com/specimen/Cinzel+Decorative
  https://scripts.sil.org/cms/scripts/page.php?site_id=nrsi&id=OFL
- Space Mono by Colophon Foundry (Google Fonts, SIL Open Font License):
  https://fonts.google.com/specimen/Space+Mono
  https://scripts.sil.org/cms/scripts/page.php?site_id=nrsi&id=OFL
