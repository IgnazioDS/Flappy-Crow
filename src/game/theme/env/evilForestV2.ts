import type { EnvironmentConfig } from './types'

const V2_KEYS = {
  skyFar: 'v2-bg-sky-far',
  mountains: 'v2-bg-mountains',
  treesFar: 'v2-bg-trees-far',
  treesMid: 'v2-bg-trees-mid',
  swampNear: 'v2-bg-swamp-near',
  fgBranches: 'v2-fg-branches',
  fogSoft: 'v2-fog-soft',
  lightRays: 'v2-light-rays',
  waterMask: 'v2-water-mask',
  biolume: 'v2-biolume',
} as const

export const EVIL_FOREST_V2: EnvironmentConfig = {
  key: 'v2',
  label: 'Evil Forest V2',
  assets: [
    {
      key: V2_KEYS.skyFar,
      path: 'assets/theme/evil_forest_v2/bg_sky_far.png',
      pathWebp: 'assets/theme/evil_forest_v2/bg_sky_far.webp',
    },
    {
      key: V2_KEYS.mountains,
      path: 'assets/theme/evil_forest_v2/bg_mountains.png',
      pathWebp: 'assets/theme/evil_forest_v2/bg_mountains.webp',
    },
    {
      key: V2_KEYS.treesFar,
      path: 'assets/theme/evil_forest_v2/bg_trees_far.png',
      pathWebp: 'assets/theme/evil_forest_v2/bg_trees_far.webp',
    },
    {
      key: V2_KEYS.treesMid,
      path: 'assets/theme/evil_forest_v2/bg_trees_mid.png',
      pathWebp: 'assets/theme/evil_forest_v2/bg_trees_mid.webp',
    },
    {
      key: V2_KEYS.swampNear,
      path: 'assets/theme/evil_forest_v2/bg_swamp_near.png',
      pathWebp: 'assets/theme/evil_forest_v2/bg_swamp_near.webp',
    },
    {
      key: V2_KEYS.fgBranches,
      path: 'assets/theme/evil_forest_v2/fg_branches.png',
      pathWebp: 'assets/theme/evil_forest_v2/fg_branches.webp',
    },
    {
      key: V2_KEYS.fogSoft,
      path: 'assets/theme/evil_forest_v2/fog_tile_soft.png',
      pathWebp: 'assets/theme/evil_forest_v2/fog_tile_soft.webp',
    },
    {
      key: V2_KEYS.lightRays,
      path: 'assets/theme/evil_forest_v2/light_rays.png',
      pathWebp: 'assets/theme/evil_forest_v2/light_rays.webp',
    },
    {
      key: V2_KEYS.waterMask,
      path: 'assets/theme/evil_forest_v2/water_reflection_mask.png',
      pathWebp: 'assets/theme/evil_forest_v2/water_reflection_mask.webp',
    },
    {
      key: V2_KEYS.biolume,
      path: 'assets/theme/evil_forest_v2/biolume_glow_splotches.png',
      pathWebp: 'assets/theme/evil_forest_v2/biolume_glow_splotches.webp',
    },
  ],

  // ─── Parallax layers ───────────────────────────────────────────────────────
  // Speeds are multipliers against world scroll (pipe speed).
  // Far→near: 0.08x → 0.12x → 0.18x → 0.28x → 0.40x for clear depth bands.
  layers: [
    { key: V2_KEYS.skyFar,    name: 'Sky Far',    speed: 0.08, depth: 0 },
    { key: V2_KEYS.mountains, name: 'Mountains',  speed: 0.12, depth: 0.12 },
    { key: V2_KEYS.treesFar,  name: 'Trees Far',  speed: 0.18, depth: 0.24 },
    { key: V2_KEYS.treesMid,  name: 'Trees Mid',  speed: 0.28, depth: 0.42 },
    { key: V2_KEYS.swampNear, name: 'Swamp Near', speed: 0.40, depth: 0.66 },
  ],

  // ─── Fog bands ─────────────────────────────────────────────────────────────
  // Fog A: far/low — very low contrast, blue-gray tint, slow vertical drift.
  // Fog B: closer — slightly violet-gray, faster drift for parallax separation.
  fogLayers: [
    {
      key: V2_KEYS.fogSoft,
      name: 'Fog A',
      speed: 0.05,
      depth: 0.31,
      alpha: 0.22,
      scale: 1.1,
      blendMode: 'normal',
      tint: 0xb4c4d8,   // cool blue-gray
      driftSpeed: 0.008,
    },
    {
      key: V2_KEYS.fogSoft,
      name: 'Fog B',
      speed: 0.12,
      depth: 0.61,
      alpha: 0.11,
      scale: 1.2,
      blendMode: 'normal',
      tint: 0xc0b8d4,   // subtle violet-gray
      driftSpeed: 0.015,
    },
  ],

  // ─── Foreground framing ────────────────────────────────────────────────────
  foregroundLayers: [
    {
      key: V2_KEYS.fgBranches,
      name: 'Branches',
      speed: 0.55,
      depth: 0.84,
      alpha: 0.38,
    },
  ],

  // ─── Light rays ────────────────────────────────────────────────────────────
  // Very subtle SCREEN blend; slow alpha pulse. Must not blur the playfield.
  lightRays: {
    key: V2_KEYS.lightRays,
    depth: 0.52,
    alpha: 0.07,
    pulseSpeed: 0.35,
    scale: 1,
    blendMode: 'screen',
  },

  // ─── Water reflection ──────────────────────────────────────────────────────
  // BitmapMask via water_reflection_mask keeps reflection below waterlineY.
  // Speeds match main layer speeds so the reflection tiles in sync.
  reflection: {
    maskKey: V2_KEYS.waterMask,
    depth: 0.58,
    waterlineY: 380,
    height: 210,
    rippleSpeed: 0.5,
    rippleAmplitude: 2.5,
    layers: [
      { key: V2_KEYS.treesMid,  speed: 0.28, alpha: 0.12 },
      { key: V2_KEYS.swampNear, speed: 0.40, alpha: 0.16 },
    ],
  },

  // ─── Biolume glow patches ──────────────────────────────────────────────────
  // ADD blend, slow breathing pulse. Positioned within game width (360px).
  // biolume_glow_splotches is 512×512; at scale 0.38–0.44 → ~195–225 px sprite.
  biolume: {
    key: V2_KEYS.biolume,
    depth: 0.72,
    blendMode: 'add',
    patches: [
      { x:  58, y: 490, scale: 0.38, alpha: 0.40, pulseSpeed: 0.90 },
      { x: 155, y: 510, scale: 0.42, alpha: 0.44, pulseSpeed: 0.70 },
      { x: 255, y: 480, scale: 0.40, alpha: 0.38, pulseSpeed: 0.80 },
      { x: 332, y: 505, scale: 0.36, alpha: 0.36, pulseSpeed: 0.75 },
    ],
  },

  // ─── Low-power mode ────────────────────────────────────────────────────────
  lowPower: {
    disableFog: true,
    disableForeground: true,
    disableLightRays: true,
    disableReflection: true,
    disableBiolume: true,
    disableLayers: ['Trees Mid', 'Swamp Near'],
  },

  // ─── Particles ─────────────────────────────────────────────────────────────
  // Total hard cap: embers(6) + dust(10) + fireflies(14) = 30. Pooled.
  // Firefly areas kept within game width (360px).
  particles: {
    embers: {
      enabled: true,
      frequency: 2400,
      maxParticles: 6,
      speedMin: 6,
      speedMax: 12,
      driftMin: -4,
      driftMax: 4,
      scaleMin: 0.18,
      scaleMax: 0.35,
      alphaMin: 0.08,
      alphaMax: 0.22,
      lifespanMin: 1800,
      lifespanMax: 3200,
      tint: 0xffa46a,
      blendMode: 'add',
    },
    dust: {
      enabled: true,
      frequency: 1600,
      maxParticles: 10,   // reduced from 18 → total = 30
      speedMin: 2,
      speedMax: 8,
      driftMin: -3,
      driftMax: 3,
      scaleMin: 0.2,
      scaleMax: 0.4,
      alphaMin: 0.06,
      alphaMax: 0.18,
      lifespanMin: 2200,
      lifespanMax: 5200,
      blendMode: 'normal',
    },
    leaf: {
      enabled: false,
      frequency: 2400,
      maxParticles: 6,
      speedMin: 6,
      speedMax: 12,
      driftMin: -6,
      driftMax: 6,
      scaleMin: 0.2,
      scaleMax: 0.35,
      alphaMin: 0.1,
      alphaMax: 0.2,
      lifespanMin: 2400,
      lifespanMax: 4800,
      blendMode: 'normal',
    },
    fireflies: {
      enabled: true,
      frequency: 900,
      maxParticles: 14,
      speedMin: 4,
      speedMax: 10,
      driftMin: -4,
      driftMax: 4,
      scaleMin: 0.18,
      scaleMax: 0.35,
      alphaMin: 0.2,
      alphaMax: 0.6,
      lifespanMin: 1800,
      lifespanMax: 3200,
      tint: 0xb56bff,
      blendMode: 'add',
      // Areas kept within 360px game width, clustered near biolume patches
      areas: [
        { x:  20, y: 420, width: 140, height: 120 },
        { x: 100, y: 450, width: 140, height: 100 },
        { x: 200, y: 430, width: 130, height: 110 },
        { x: 270, y: 455, width: 100, height: 100 },
      ],
    },
  },
}
