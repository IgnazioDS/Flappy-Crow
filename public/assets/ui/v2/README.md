# UI Kit v2 — Obsidian Glass + Teal Rim

All assets are **original SVG** artwork created for Flappy Crow.
License: MIT / proprietary to the project.  No copyrighted third-party assets.

## Files

| File | Purpose | 9-slice? |
|------|---------|----------|
| `panel_9slice.svg` | Overlay panel frame (128×128, corners=16) | Yes |
| `capsule_9slice.svg` | HUD widget capsule (96×40, corners=20) | Yes |
| `icon_settings.svg` | Settings gear icon (24×24) | No |
| `icon_mute_on.svg` | Speaker active (24×24) | No |
| `icon_mute_off.svg` | Speaker muted (24×24) | No |
| `icon_motion_on.svg` | Motion enabled (24×24) | No |
| `icon_motion_off.svg` | Motion reduced (24×24) | No |
| `icon_restart.svg` | Replay / restart (24×24) | No |
| `icon_close.svg` | Close / dismiss (24×24) | No |
| `medal_bronze.svg` | Bronze medal (48×56) | No |
| `medal_silver.svg` | Silver medal (48×56) | No |
| `medal_gold.svg` | Gold medal (48×56) | No |
| `medal_platinum.svg` | Platinum / void medal (48×56) | No |
| `divider.svg` | Decorative divider line (280×8) | No |

## Raster exports (`raster/`)

WebP + PNG exports generated via `scripts/export-ui-assets.mjs` (Node + sharp).
Use `@2x` for HiDPI (device pixel ratio ≥ 2).

## Design system

Material: **Obsidian Glass + Teal Rim**
- Panel fill: `#07090f` at 93% opacity
- Rim stroke: `#48c8d8` at 80% opacity (capsules: 70%)
- Corner radius: 12 px panels, 10 px capsules
- Icon tint: `#9ef1ff` (bright teal)
- Text primary: `#d7f5ff`

See `src/game/ui/designSystem.ts` for all tokens.
