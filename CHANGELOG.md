# Changelog

<!-- markdownlint-disable MD024 -->

All notable changes to this project will be documented in this file.
This project follows [Semantic Versioning](https://semver.org/).

## [6.1.12] - 2026-02-28

### Fixed

- **Removed sticker-like lower orbs at source** — identified via QA solo mode as
  slot `[5] Biolume (ADD)` (`v2-biolume` / `biolume_glow_splotches`), then
  removed from source art by replacing
  `assets/theme/evil_forest_v2/src/biolume_glow_splotches.svg` with a fully
  transparent texture and setting V2 biolume `patches: []` so no orb sprites are
  instantiated at runtime.
- **Bottom band composition blend** — rebuilt swamp-to-ground transition in
  `bg_swamp_near.svg` (organic transition shapes + softer near-ground haze) and
  repainted `assets/theme/ground.svg` to a matching blue-violet swamp palette
  with transparent top fade to remove the separate-strip seam.
- **Fog export threshold lock** — set `fog_tile_soft` export sanitization
  threshold to `32` in `scripts/render-v2-assets.mjs` to match runtime
  sanitization and keep seam-plate prevention deterministic.

### Verified

- `v2-fog-soft` sanitization threshold remains `32`.
- biolume sparkle emitters remain disabled (`sparkleMax=0`).
- Evil Forest V2 ambient `fireflies` + `embers` remain disabled.
- `assets/theme/ground.svg` contains no magenta decorative dots.

## [6.1.11] - 2026-02-27

### Added

- ART_QA forensics: slot-based solo/toggle (1–9), bounds overlay for all V2 overlays,
  RGBA sampling at corners + mid-edges, and pre/post-sanitize sampling stored for QA.
- QA snapshot hook (`window.__captureSnapshot`) to capture renderer output in headless QA runs.

### Fixed

- **Fog tile seam plates** — raised `v2-fog-soft` sanitization threshold to 32 to
  zero low-alpha edge RGB (alpha 18–28) that was showing as rectangular plates
  when fog layered with other overlays.
- **Random bottom dots** — disabled biolume sparkle emitters (`sparkleMax=0`),
  removing the random purple specks in the lower playfield while keeping the
  glow patches.
- **Ambient V2 specks** — disabled Evil Forest V2 `fireflies` + `embers`
  emitters to eliminate remaining randomly positioned bottom particles in play.
- **Ground specks** — removed magenta decorative dots from
  `assets/theme/ground.svg` (evil forest ground strip) to eliminate the last
  bottom-edge specks that looked random while scrolling.

## [6.1.10] - 2026-02-26

### Fixed

- **Biolume rectangular plate (source assets re-exported — definitive asset fix)**
  — v6.1.9 corrected the runtime thresholds and the SVG source, but the
  `biolume_glow_splotches.png/.webp` and `light_rays.png/.webp` files on disk had
  been exported *before* those fixes and still contained non-black RGB in
  near-transparent pixels.  Re-running `scripts/render-v2-assets.mjs` with the
  v6.1.9 SVG fix and updated thresholds produces truly clean source assets:

  | Asset | Pixels zeroed | Before | After |
  |---|---|---|---|
  | `biolume_glow_splotches.webp` | 60,630 (threshold=32) | 64 KB | 46 KB |
  | `light_rays.webp` | 485,538 (threshold=20) | 63 KB | 39 KB |

  The size reduction is direct evidence that the old files carried dirty pixel
  data.  The runtime `sanitizeAdditiveTexture()` (BootScene, threshold=32) remains
  as defence-in-depth for any future asset exports.

## [6.1.9] - 2026-02-26

### Fixed

- **Biolume rectangular plate (root cause found and eliminated)** — v6.1.8 raised
  the sanitization threshold to 24 but the `ambient` radialGradient in
  `biolume_glow_splotches.svg` has a peak `stop-opacity="0.12"` → **alpha = 31**.
  Any pixel with alpha 25–31 (which exists across a ~138 px diameter region in
  the centre of the sprite) survived the threshold=24 check and was ADD-blended
  each frame as a faint violet rectangle the size of the full sprite bounding box.
  Fixes:
  - **Runtime threshold raised**: `V2_SANITIZE_MANIFEST` biolume threshold
    `24 → 32` — now catches the entire ambient layer (peak alpha 31 < 32). All
    intentional glow data is preserved (glow cores and mid-stops are alpha ≥ 35).
  - **light_rays threshold raised**: `16 → 20` — `source_glow` radialGradient
    80%-offset stop has `stop-opacity="0.08"` → alpha = 20; old threshold 16
    missed it.
  - **SVG source fixed**: `biolume_glow_splotches.svg` ambient gradient peak
    lowered `stop-opacity="0.12" → "0.08"` (alpha 31 → 20) so future re-exports
    are sanitizable at the standard threshold=24, and the export pipeline's
    threshold=32 acts as defence-in-depth.
  - `scripts/render-v2-assets.mjs` sanitize thresholds updated to match
    (`biolume 24 → 32`, `light_rays 16 → 20`).

## [6.1.8] - 2026-02-26

### Fixed

- **RGB+alpha sanitization (definitive rectangular-plate fix)** — v6.1.7's
  `sanitizeAlphaTexture()` only zeroed the **alpha channel** (`i=3; i+=4`).
  ADD and SCREEN blend modes read **source RGB independently of source alpha**:
  a pixel with `RGB=(200,200,200), alpha=0` still contributes a white offset to
  every destination pixel it overlaps, producing a solid rectangular plate.
  v6.1.8 zeros **all four channels** (r=g=b=a=0) for every pixel whose alpha ≤
  threshold — the only correct fix for additive-blend artifacts.
  Thresholds raised to cover the real SVG gradient fringe depth:
  - `v2-biolume` 16 → **24** (ADD — SVG radial gradients reach alpha 20–28 at edges)
  - `v2-light-rays` 10 → **16** (SCREEN — diagonal streaks leave alpha up to 14)
  - `v2-fog-soft` 12 → **12** (unchanged; normal blend, sanitized for hygiene)
  - `v2-water-mask` 6 → **6** (unchanged; BitmapMask, near-binary already)
- **Export pipeline hardened** — `scripts/render-v2-assets.mjs` now runs an
  in-browser pixel-sanitize pass (via `page.evaluate()` + Canvas 2D API) before
  writing each ADD/SCREEN texture PNG.  Prevents shipping dirty textures and
  reduces the work left for runtime sanitization.  No new Node dependencies.

### Added

- **`src/game/graphics/TextureSanitizer.ts`** — new module:
  - `sanitizeAdditiveTexture(scene, srcKey, dstKey, threshold)`:
    O(W×H) pixel walk; zeros r=g=b=a for alpha ≤ threshold.  Pass
    `dstKey === srcKey` for in-place replacement (no downstream key changes).
  - `sampleTextureRGBA(scene, key)`: samples 5 strategic points (TL, TR, BL,
    BR, ML) and returns `{r,g,b,a}` per point for ART_QA boot logging.
  - `V2_SANITIZE_MANIFEST`: single source of truth for V2 texture keys,
    labels, and thresholds — imported by both `BootScene` and
    `BackgroundSystemV2` so thresholds can never drift between sanitization and
    QA display.
- **ART_QA boot logging** — when `VITE_ART_QA=true`, `BootScene` logs
  corner RGBA before _and_ after sanitization with artifact-risk flags
  (`⚠ RGB>0 in transparent` / `✓ clean`).  Provides direct proof in the PR.
- **Corner-α overlay upgraded to full RGBA** — `BackgroundSystemV2.getDebugLines()`
  now uses `textures.getPixel()` instead of `textures.getPixelAlpha()` to show
  `(r,g,b,a)` at each corner.  ✗ flag now triggers on `alpha≤28 AND RGB>0`
  (the actual artifact condition) rather than `alpha>0` alone.

### Changed

- `BootScene` refactored: old private `sanitizeAlphaTexture()` removed; now
  delegates entirely to `TextureSanitizer.sanitizeAdditiveTexture()` via the
  shared `V2_SANITIZE_MANIFEST`.
- `BackgroundSystemV2` local `SANITIZE_TARGETS` const removed; replaced by
  `import { V2_SANITIZE_MANIFEST }` from `TextureSanitizer`.

## [6.1.7] - 2026-02-26

### Fixed

- **Rectangular glow-plate artifacts (definitive fix)** — v6.1.6 changed
  Playwright's `omitBackground: false → true`, which converted exports from RGB
  to RGBA.  However SVG ambient gradients still leave alpha 1–5 at sprite edges;
  with ADD (`biolume`) and SCREEN (`light_rays`) blend modes even alpha=1 on a
  near-white pixel produces a visible halo rectangle.  Fixed by
  `BootScene.sanitizeAlphaTexture(key, threshold)`:
  - Called once at boot for `v2-fog-soft` (12), `v2-light-rays` (10),
    `v2-biolume` (16), `v2-water-mask` (6).
  - Reads pixel data via `getImageData()`, clamps every alpha ≤ threshold to 0,
    replaces the Phaser texture in-place (same key — no downstream changes).
  - Runs in O(W×H) ≈ 0.3 ms per 512×512 texture; executed once before PlayScene.
- **Bottom composition** — replaced the v6.1.6 dark-teal-black bottom scrim with
  a cool violet-blue fog gradient that matches the V2 palette (grade overlay +
  fog A/B tints).  Gradient: transparent → faint violet haze → cool purple shadow
  → near-opaque cool edge.  No longer reads as a "flat band".
- **Waterline seam** — new `v2CreateBankHaze()`: a 360×90 px transparent-peak-
  transparent violet-blue stripe centred at `reflection.waterlineY` (380 px),
  depth 0.685.  Blends `bg_swamp_near` into the ground sprite with atmospheric
  mist rather than a hard edge.

### Added

- **Solo mode (`Shift`+`1`–`8`)** — in DEV / `VITE_ART_QA=true`, pressing
  `Shift`+digit solos a single background layer (hides all other sprites
  including V2-exclusive vignette, grade, grain, scrim, haze, shimmer, sparkles,
  biolume).  Press the same combination to exit solo.  Enables instant artifact
  attribution without reloading.
  - `BackgroundSystemV2.toggleSoloLayer(index)` + `applyV2SoloVisibility()`.
  - `PlayScene.setupInput()`: single `keydown` listener using `event.code`
    (keyboard-layout independent) and `event.shiftKey`.
- **Sprite-bounds overlay (`B` key)** — in QA mode, pressing `B` draws
  colour-coded bounding rectangles around every visible overlay sprite
  (red=layers, orange=light-rays, yellow=biolume, cyan=shimmer, green=grade,
  magenta=grain, white=scrim/haze).  If a rectangle aligns with a visible
  artifact, that sprite is the culprit.
  - `BackgroundSystemV2.toggleBounds()` + `v2UpdateBoundsGraphics()` (redraws
    every frame, zero allocations).
- **Corner-α overlay in env debug** — new `CORNER α` section shows TL/TR/BL/BR
  alpha for each ADD/SCREEN-blend suspect texture with ✓ (clean) / ✗ (risk).
  `SANITIZE_TARGETS` constant in `BackgroundSystemV2` keeps thresholds in sync
  with `BootScene`.
- **QA FORENSICS section** in debug overlay: current solo index + bounds status.
- New `BackgroundSystem` public methods: `setLayerVisible`, `setAllLayersVisible`,
  `setBiolumeVisible`, `setLightRaysVisible`, `setReflectionVisible`,
  `toggleSoloLayer` (no-op base), `toggleBounds` (no-op base).
- **README QA controls table** — documents all art-QA keyboard shortcuts
  including the new solo/bounds additions.

## [6.1.6] - 2026-02-26

### Fixed

- **V2 rectangular artifact bug (root cause)** — `scripts/render-v2-assets.mjs`
  used `omitBackground: false`, causing Playwright to bake a white background
  into every exported PNG.  When Phaser loaded these textures and applied
  `ADD` / `SCREEN` blend modes (biolume, fog, light-rays, water shimmer), the
  white rectangular bounds of each sprite became visible as translucent
  rectangles with glowing centres — the "purple square" artifacts.  Fixed by
  setting `omitBackground: true`; all 10 V2 assets regenerated as proper RGBA
  PNGs (corner-pixel alpha ≤ 3 vs. the prior 255).
- **`bg_swamp_near.svg` fog-band seam** — the near-ground fog was a hard-edged
  `<rect x="0" y="548" width="1024" height="92">` causing a visible horizontal
  seam at y = 548.  Replaced with a full-canvas rect (`width="1024"
  height="640"`) backed by an updated `fog_near` linear-gradient whose
  non-zero stops begin at 76% (~486 px) so the transition is seamless:
  `76% op=0 → 88% op=0.06 → 100% op=0.22`.

### Added

- **QA layer-visibility toggles (keys 1–8)** — when `VITE_ART_QA=true` or in
  DEV mode, keys 1–8 toggle the visibility of individual V2 background layers
  (order: bg layers → fog layers → foreground layers).  Enables rapid artifact
  isolation without reloading.  The env debug overlay (`D` key) shows a
  `VISIBLE_LAYERS (1–8 toggle):` section with ●/○ indicators per layer.
  - `BackgroundSystem`: new `toggleLayerByIndex(index)`, `getLayerNames()`,
    `getLayerVisibility()` public methods.
  - `BackgroundSystemV2.getDebugLines()`: added `VISIBLE_LAYERS:` section.
  - `PlayScene.setupInput()`: registers `keydown-1` through `keydown-8` when
    `debugToggleAllowed`.
- **Bottom fog scrim** — a programmatic 360×115 px dark-to-transparent gradient
  at depth 0.91 (above background layers max 0.84, below vignette 0.92).
  Teal-black at the bottom edge, fully transparent at the top, it grounds the
  swamp scene and hides any seam between `bg_swamp_near` and the ground sprite.
  Implemented as `v2CreateBottomScrim()` in `BackgroundSystemV2` using the
  existing canvas-texture pattern; texture key `v2-bottom-scrim` created once
  per session.  Reported in `getDebugLines()` FX budget section.

## [6.1.5] - 2026-02-26

### Added

- **Water shimmer overlay** — tileable 128×64 specular-streak `TileSprite` (programmatic
  canvas: 6 diagonal white-blue streaks on transparent background) at depth 0.70, SCREEN
  blend, alpha 0.08.  Scrolls at 18 px/s horizontal + 6 px/s vertical with a slow sin
  alpha pulse (±30 %, 0.22 Hz).  Masked to water channels via a `BitmapMask` reusing the
  existing `water_reflection_mask` texture — no new asset file.  Disabled in
  reducedMotion and lowPower mode.  Knobs: `env.waterShimmer.{enabled,alpha,scrollX,
  scrollY,pulseAmp,pulseHz,depth}`.
- **Biolume sparkle clusters** — one `ParticleEmitter` per biolume patch (4 total for
  Evil Forest V2), emitting tiny ADD-blend blue-white dots (`v2-sparkle-dot`, a 16×16
  radial-gradient canvas) that drift slowly upward within a 22 px radius of each patch
  centre.  Hard cap: `sparkleMax=14` shared across all emitters (≤ 3 per patch), spawn
  rate 850 ms — localized and budget-safe.  Pre-allocates `Phaser.Geom.Circle` and
  `Phaser.Geom.Point` per emitter so the hot path has zero per-frame GC pressure.  Knobs:
  `env.biolume.{sparkleMax,sparkleSpawnRate}`.
- **FX budget QA section** in `BackgroundSystemV2.getDebugLines()` — live snapshot of all
  visible layer alphas (fog / rays / grade / grain / shimmer / outline) and live sparkle
  particle count, visible when `VITE_ART_QA=true` or `?qa=1`.
- **`WaterShimmerConfig`** type added to `types.ts`.
- **`BiolumeConfig.sparkleMax?` and `BiolumeConfig.sparkleSpawnRate?`** optional fields.
- **`EnvironmentConfig.waterShimmer?`** optional field.

### Changed

- `BackgroundSystemV2.create()` — calls new `v2CreateWaterShimmer()` and
  `v2CreateBiolumeSparklees()` after existing layer creation.
- `BackgroundSystemV2.destroy()` — cleans up shimmer sprite, shimmer mask sprite, and all
  sparkle `ParticleEmitter` instances.
- `BackgroundSystemV2.update()` — guards shimmer scroll + pulse animation behind
  `!v2ReducedMotion`.
- `BackgroundSystemV2.setReducedMotion()` — overrides parent; hides sparkle emitters
  when reducedMotion is enabled.
- `BackgroundSystemV2.setLowPowerMode()` — overrides parent; calls
  `applyV2LowPowerVisibility()` to hide shimmer and sparkles in low-power mode.

## [6.1.4] - 2026-02-26

### Added

- **Grade overlay** — full-screen programmatic canvas texture (cool blue-purple
  tint + radial edge-darkening contrast curve) rendered at depth 3.50 — above
  all gameplay elements, below the HUD scrim.  Alpha controlled per-env via
  `EnvironmentConfig.grade.alpha` (default 0.14 for Evil Forest V2).  Generated
  once using the existing canvas-texture pattern; no extra asset file needed.
- **Film grain** — tileable 256×256 noise `TileSprite` at depth 3.51, scrolled
  horizontally each frame at `grain.scrollSpeed` (default 55 px/s) for a
  subliminal texture layer.  Alpha default 0.04 — keeps the grain below
  conscious perception while adding tactile depth.
- **Foreground outline (rim separation)** — semi-transparent, tinted
  behind-sprites for crow and gates (Option 1 approach):
  - *Bird outline* at depth 1.99, scale `birdScale × outline.scale` (1.08×),
    tint `0x4a8494` (dark teal), alpha 0.42.  Position and rotation tracked
    in `updateBirdVisual()` alongside the glow sprite.
  - *Gate outlines* at depth 0.99, expanded ~6 % on all sides using the same
    fixed-overhang pattern as the existing screen-blend glow sprites.  Frame
    and texture are synced in `applyObstacleVariant()` for atlas themes.
  - Gated by `environmentConfig?.outline` — Classic and Emerald Lake themes
    are unaffected.  Outline sprites are pooled inside `PipeSprites`.
- **Three new `EnvironmentConfig` knobs** in `types.ts`:
  `grade?: GradeConfig`, `grain?: GrainConfig`, `outline?: OutlineConfig`.
- **QA debug overlay** (`getDebugLines()`) now includes a `GRADE/GRAIN/OUTLINE`
  section showing alpha, depth, scroll speed, tint, and scale values.

### Changed

- `BackgroundSystemV2.update()` override added to advance grain tile offset.
- `BackgroundSystemV2.destroy()` now cleans up grade and grain sprites.

## [6.1.3] - 2026-02-26

### Added

- **`createHudCapsule(scene, w, h)`** in `uiFactory.ts` — reusable glass/obsidian
  backdrop for small HUD widgets (same material as `createPanelBackdrop` but
  tuned for compact items: r=6, shadow offset +3/+4, stroke alpha 0.70).
- **Score capsule backdrop** (`scoreCapsuleBackdrop`) — `createHudCapsule` placed
  at depth 3.98 behind the score frame; repositioned by `updateSafeAreaLayout()`
  so it tracks safe-area offsets correctly.  Active for themes that define
  `ThemeUI.hud` (currently Evil Forest).
- **Settings button capsule** — `createSettingsButton()` now uses `createHudCapsule`
  (52×30 px) in place of the atlas button backing when `ui.hud` is defined,
  giving the SET button the same material as panels and the score capsule.
- **Icon cluster backdrop** (`iconClusterBackdrop`) — a shared `createHudCapsule`
  capsule (78×40 px, depth 4.15) behind the mute + motion icon pair; position
  is updated by `applyHandednessLayout()` in all three hand-mode configurations
  (top-normal, bottom-left, bottom-right).

### Changed

- **`animateOverlay(container, 'ready')`** — READY panel enter animation gains an
  upward Y-drift (+8 px → target Y) that layers with the existing bounce/scale,
  giving the overlay a natural "descend into place" feel.  Reduced-motion toggle
  suppresses all animation as before.
- **`showReadyOverlay(true)`** — calls `updateOverlayLayout()` before starting the
  animation to snap the container to its correct Y, preventing drift accumulation
  across repeated enter/exit cycles.
- **`applyHandednessLayout()`** — removed early `return` for the normal-mode branch;
  refactored to an if/else so the icon cluster backdrop position can be updated
  after all icon positions are set, regardless of hand mode.
- **`overlayBodyStyle.fontSize`** `18px` → `19px` (+1 px per spec; more visual
  presence for the "Tap or Space to Flap" hint line).
- **`overlayBodyStyle.strokeThickness`** `5` → `4` (reduces cartoon-heavy outline;
  matches title at proportional stroke weight for the slightly smaller font size).

## [6.1.2] - 2026-02-26

### Added

- **HUD top-gradient scrim** (`createHudTopScrim()` in `uiFactory.ts`) — a
  programmatic canvas texture that fades from semi-opaque dark purple-black at
  y=0 to transparent at `hud.topScrimHeight` (72 px default).  Placed at depth
  3.95 (above all background layers, below score/icon UI at 4+).  Ensures the
  score capsule and top icons are always readable over bright or painterly
  backgrounds (V2 sky, V1 daylight sky, etc.).
- **Panel backdrop** (`createPanelBackdrop()` in `uiFactory.ts`) — Phaser
  `Graphics` layer rendered behind every overlay panel, providing a layered
  glass/obsidian look: drop shadow → dark fill → 2 px teal accent stroke with
  8 px corner radius.  Used in READY and GAME OVER containers.
- **`ThemeUI.hud`** — optional config block (`topScrimHeight`, `topScrimAlpha`,
  `safeTop`) on every theme UI; the Evil Forest theme sets concrete defaults
  (`72 px / 0.62 alpha / 8 px safeTop`).
- **`ThemeUI.spacing`** — 8-pt spacing scale (`xs=8`, `sm=12`, `md=16`,
  `lg=24`) added to the type and to the Evil Forest `UI` object.

### Changed

- **`overlayBodyStyle.color`** upgraded from `PALETTE.textMuted` (#9fb2c1) to
  `PALETTE.textPrimary` (#d7f5ff) — the "Tap or Space to Flap" hint in the
  READY panel now matches heading brightness instead of appearing washed-out
  over painterly backgrounds.
- **`overlayBodyStyle.strokeThickness`** bumped from 4 → 5 for parity with
  `overlayTitleStyle` and consistent halo width at all contrast levels.

## [6.1.1] - 2026-02-25

### Added

- **`EnvironmentFogLayer.tint`** — hex colour tint applied to fog TileSprites
  (e.g. `0xb4c4d8` for cool blue-gray); handled in `BackgroundSystem.createFogLayer()`.
- **`EnvironmentFogLayer.driftSpeed`** — vertical tile drift speed as a fraction
  of world scroll; fog now slowly drifts up/down for organic parallax depth.
- **Background vignette** in `BackgroundSystemV2` — programmatic radial-gradient
  canvas texture at depth 0.92 (above bg, below gameplay at 1.0+); transparent
  centre holds playfield readability, dark purple-black edges frame the scene.
- **Rich QA debug overlay** (`BackgroundSystemV2.getDebugLines()`): env key + label,
  all layer parallax speeds, fog α/spd/tint/drift, biolume patch count, configured
  particle maxes, and per-asset loaded texture dimensions.

### Changed

- **Parallax speeds** corrected to match reference depth bands:
  `0.08 / 0.12 / 0.18 / 0.28 / 0.40` × world scroll (was `0.02–0.14`).
- **Fog A**: speed `0.05`, α `0.22`, blue-gray tint `#b4c4d8`, drift `0.008`.
- **Fog B**: speed `0.12`, α `0.11`, violet-gray tint `#c0b8d4`, drift `0.015`.
- **Light rays**: α `0.07`, SCREEN blend, pulse `0.35` — more subtle.
- **Reflection layer speeds** synced to main parallax speeds (`0.28 / 0.40`)
  so reflected tiles scroll in sync with the source layers.
- **Biolume patches** repositioned within 360 px game width (x: 58–332, was
  160–720 — two patches were entirely off-screen).
- **Particle cap** enforced: dust `maxParticles` 18→10; total
  embers(6) + dust(10) + fireflies(14) = **30 max, all pooled**.
- **Firefly areas** constrained to 360 px game width with narrower spawn zones.
- **`bg_swamp_near`** alpha `0.82` (was 1.0) — obstacle/pipe readability safeguard.
- **`fg_branches`** alpha `0.42` (was `0.38`) — denser edge framing.

### Assets (re-rendered via `scripts/render-v2-assets.mjs`)

- **`water_reflection_mask`** — sharp 3-stop gradient (57 → 64% transition)
  with sinusoidal ellipse bumps at waterline for natural undulation; soft
  bottom fade so reflection dissolves rather than hard-cuts.
- **`bg_swamp_near`** — water channels raised from cy≈600 → cy≈510–522 (visible
  above ground line); 3 distinct high-contrast channels with specular sheen strips.
- **`bg_trees_mid`** — 9 full tree clusters with expanded canopy spreads, root
  tangles, hanging moss, and biolume root glows; strong dark silhouettes for
  clear BitmapMask reflection when flipped.
- **`biolume_glow_splotches`** — rebuilt with higher-opacity cores (0.90–0.95),
  steeper falloff, and white sparkle points at each pool centre.
- **`light_rays`** — 5 overlapping diagonal shaft polygons with per-shaft opacity
  stagger (0.60–0.95) and a warm source halo at upper-centre.

## [6.1.0] - 2026-02-25

### Added

- **Environment V2 — Evil Forest (Painterly)**: full upgrade of the V2 background
  system with 10 hand-crafted SVG source layers rendered to PNG/WebP:
  - `bg_sky_far` — twilight sky with star field, cliff silhouettes, and atmospheric gradients
  - `bg_mountains` — three mountain ranges with depth-haze and fog bands
  - `bg_trees_far` — 24 cypress silhouettes with atmospheric depth fade
  - `bg_trees_mid` — heavy trees with gnarled roots, hanging moss, and biolume glow
  - `bg_swamp_near` — water channels, marsh banks, reeds, and violet/teal biolume accents
  - `fg_branches` — foreground branch framing with edge darkness
  - `fog_tile_soft` — tileable organic fog (512×512, violet/teal tints)
  - `light_rays` — subtle diagonal volumetric light rays
  - `water_reflection_mask` — B/W gradient mask driving the BitmapMask water reflection
  - `biolume_glow_splotches` — violet + teal radial glow patches (512×512)
- `scripts/render-v2-assets.mjs` — Playwright + cwebp pipeline that renders
  SVG source art to final PNG/WebP; re-run after editing SVGs to refresh assets.
- `src/game/background/BackgroundSystemV2.ts` — thin subclass of BackgroundSystem
  that adds texture-size reporting in the QA debug overlay (`getDebugLines()`).
- PlayScene now instantiates `BackgroundSystemV2` for the `v2` environment key,
  wiring the QA overlay with per-asset texture dimensions.

### Changed

- Default environment is `v2` (Evil Forest V2 — Painterly); V1 still reachable
  via `?env=v1` query param.

## [6.0.2] - 2026-02-25

### Added

- `.nvmrc` pinning Node 20 for local and CI consistency (P1-1).
- `docs/AUDIO.md` documenting intentional SFX deferral and Path A migration
  guide for when audio assets are ready (P1-2).
- Dedicated `envRng` (seeded `RandomSource`) for firefly area selection, fixing
  visual non-determinism in daily/custom-seed modes (P2-2).
- Google Fonts preconnect hints in `index.html` to reduce font-swap latency
  on first load (P2-5).
- `art-qa` CI job: builds with `VITE_ART_QA=true` so theme contract validation
  runs in CI, not just local dev (P2-6).
- `docs/PLAYSCENE_DECOMPOSITION.md` — 10-slice plan for incrementally
  extracting the PlayScene god-class into focused managers (P2-1).

### Changed

- Vite `manualChunks` splits Phaser into a stable vendor chunk; app chunk
  drops from 1,336 KB to 127 KB, improving browser cache utilisation (P1-5).
- `validateThemeDefinition` now also activates when `VITE_ART_QA=true`, making
  it reachable in production builds without touching the dev-only guard (P2-6).

### Fixed

- `birdBobTime` now wraps with `% (Math.PI * 2)` to prevent unbounded
  float growth during long idle sessions (P2-3).

### Removed

- `public/assets/theme/atlas.svg` (13 KB vector source; runtime uses
  PNG/WebP only) (P1-3).
- 9 legacy unused SVGs from `public/assets/`: `background.svg`,
  `crow_idle/dead/flap_0-2.svg`, `ember.svg`, `obstacle_top/bottom.svg` (P1-4).
- `ios/App/App/config 2.xml` — stray Finder-duplicate Cordova stub (P2-4).

## [6.0.1] - 2026-01-25

### Added

- iOS privacy manifest template (`PrivacyInfo.xcprivacy`) for App Store compliance.

### Fixed

- Adopted UIScene lifecycle to avoid future iOS asserts.
- Patched Cordova Purchase headers for SPM builds.

## [6.0.0] - 2026-01-24

### Added

- Versioned SaveState v2 with single-file persistence, migrations, and dev reset menu.
- Meta-progression: coins, run summary screen, and lifetime stats tracking.
- Cosmetic shop + inventory persistence (skins, frames/trails) with Supporter Pack bundle.
- Daily reward streak system with claim UI and edge-case handling.
- App Store IAP plumbing for Remove Ads + Supporter Pack, plus restore flow.
- Local analytics logger and expanded gameplay/IAP event hooks.
- App Store readiness docs for assets, listing URLs, and submission checks.

### Changed

- Performance hardening: no per-frame allocations in tuning, safer pause/resume input clearing.
- Sound playback routed through a guarded SoundSystem to avoid duplicate instances.
- Settings panel expanded with shop/daily reward shortcuts.

### Fixed

- Sound cleanup now avoids destroyed audio handles during scene teardown.

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
