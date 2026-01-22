# v5 Theme QA Checklist

## Preflight

- Ensure `VITE_THEME=classic|evil-forest|emerald-lake` works in dev.
- Clear localStorage (or use incognito) to verify defaults.
- Verify reduced-motion + high-contrast toggles applied to each theme.

## Per-Theme Visual Pass

- READY screen: score frame readability and title contrast.
- PLAYING: pipe readability against far/mid/near layers.
- GAME OVER: panel contrast + medal visibility.
- Parallax scroll seams: no visible tile edges.
- Vignette strength: does not obscure pipes or bird.

## Accessibility Pass (each theme)

- Reduced motion: no parallax drift, no FX shake/flash, no particles.
- High contrast: text legibility on panels and overlays.
- Text scale: 100% / 115% / 130% remain readable without overlap.
- One-handed: HUD and settings buttons remain reachable.

## Performance Pass (each theme)

- 10 short runs; check for stable FPS and no stutter.
- Low-power mode kicks in on forced throttling (if available).
- Particle count remains bounded; no memory growth trend.

## Determinism Guard

- Run with `?daily=1` and reload; seed label remains stable.
- Run with `?seed=classic-test` and reload; pipe sequence matches.

## Media Capture

- Capture 1 screenshot per theme for READY, PLAYING, GAME OVER.
- Capture 5–10 seconds of gameplay for each theme.
