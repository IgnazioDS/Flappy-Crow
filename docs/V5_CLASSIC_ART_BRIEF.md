# Classic Theme Art Brief (v5)

## Scope

- Replace Classic visuals only:
  - `public/assets/bg_far.svg`
  - `public/assets/bg_mid.svg`
  - `public/assets/bg_near.svg`
  - `public/assets/pipe.svg`
  - `public/assets/bird.svg`
- Keep filenames and viewBox sizes to avoid code changes.

## Art Direction

- Feel: bright, clean, friendly.
- Readability first: strong silhouettes, minimal fine detail.
- Avoid high-frequency textures that shimmer when scrolling.

## Technical Specs

### Backgrounds (all)

- Artboard: `360x640`, viewBox `0 0 360 640`
- Seamless horizontal tiling (left/right edges match).
- Keep top 120px low-contrast for score readability.
- Consistent horizon band at ~55–60% height.

### `bg_far.svg`

- Sky gradient + soft clouds.
- Lowest contrast of the three layers.
- No sharp edges.

### `bg_mid.svg`

- Mid-distance cloud/hill shapes.
- Moderate contrast.
- Avoid strong vertical forms in the center flight corridor (x ≈ 80–280).

### `bg_near.svg`

- Near silhouettes with higher contrast.
- Detail concentrated in bottom ~25% of frame.
- Keep center corridor clean for pipes.

### `pipe.svg`

- Artboard: `60x400`, viewBox `0 0 60 400`
- Must stretch vertically without distortion artifacts.
- Symmetric enough to look correct when flipped vertically.
- Readability: 1–2px outline + subtle inner highlight.
- Cap height 12–16px with simple shape.

### `bird.svg`

- Artboard: `34x24`, viewBox `0 0 34 24`
- Must read at ~24px height (in-game scaling).
- Max 3–4 flat color blocks + 1–2px outline.
- Eye and beak remain distinct at 1x scale.

## Acceptance Criteria

- Parallax tiles with no seams.
- Pipes readable against all three layers in motion.
- Bird silhouette clear during rotation.
- No noticeable FPS or memory regression on low-end.
