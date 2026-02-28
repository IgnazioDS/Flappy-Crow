# Performance

Target runtime: 60 FPS on typical desktop/mobile browsers.

## Rules

- No gameplay logic allocations in hot update paths.
- Background V2 overlays are created once and reused.
- Particle counts are capped and deterministic.

## Current Budgets

- Gameplay dimensions: `360x640`
- V2 texture sizes:
  - layered backgrounds: `1024x640`
  - fog/biolume tiles: `512x512`
- V2 particles:
  - embers: disabled
  - fireflies: disabled
  - dust: max `10`
  - biolume sparkles: disabled (`sparkleMax=0`)

## Manual Check

1. Run `npm run dev`.
2. Play multiple restart cycles.
3. Confirm FPS is stable and no progressive memory growth.
4. Toggle QA overlay (`D`) and ensure no layer causes repeated allocation spikes.

## CI Gate

Always pass before release:

```bash
npm run test
npm run lint
npm run build
```
