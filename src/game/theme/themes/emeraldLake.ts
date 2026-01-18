import type { ThemeDefinition } from '../types'

const EMERALD_PALETTE = {
  background: '#0d2a24',
  textPrimary: '#e6fffb',
  textMuted: '#9fe7da',
  panel: '#10362f',
  panelStroke: '#2b7a65',
} as const

const EMERALD_PALETTE_NUM = {
  panel: 0x10362f,
  panelStroke: 0x2b7a65,
  shadow: 0x031310,
} as const

const EMERALD_ACCESSIBILITY = {
  contrast: {
    high: {
      palette: {
        textPrimary: '#ffffff',
        textMuted: '#d1fae5',
        panel: '#0b241f',
        panelStroke: '#5eead4',
      },
    },
  },
} as const

const EMERALD_UI = {
  fonts: {
    title: '"Cinzel Decorative", "Cinzel", serif',
    body: '"Cinzel", serif',
    numbers: '"Space Mono", monospace',
  },
  score: {
    x: 180,
    y: 44,
  },
  scoreTextStyle: {
    fontFamily: '"Space Mono", monospace',
    fontSize: '34px',
    color: EMERALD_PALETTE.textPrimary,
    stroke: '#0b1f1b',
    strokeThickness: 6,
  },
  overlayTitleStyle: {
    fontFamily: '"Cinzel Decorative", "Cinzel", serif',
    fontSize: '24px',
    color: EMERALD_PALETTE.textPrimary,
    stroke: '#0b1f1b',
    strokeThickness: 5,
    align: 'center',
  },
  overlayBodyStyle: {
    fontFamily: '"Cinzel", serif',
    fontSize: '16px',
    color: EMERALD_PALETTE.textMuted,
    stroke: '#0b1f1b',
    strokeThickness: 4,
    align: 'center',
  },
  statLabelStyle: {
    fontFamily: '"Cinzel", serif',
    fontSize: '14px',
    color: EMERALD_PALETTE.textMuted,
    stroke: '#0b1f1b',
    strokeThickness: 3,
  },
  statValueStyle: {
    fontFamily: '"Space Mono", monospace',
    fontSize: '18px',
    color: EMERALD_PALETTE.textPrimary,
    stroke: '#0b1f1b',
    strokeThickness: 4,
  },
  panel: {
    fill: EMERALD_PALETTE_NUM.panel,
    stroke: EMERALD_PALETTE_NUM.panelStroke,
    strokeThickness: 2,
    alpha: 0.95,
  },
  panelSize: {
    small: { width: 260, height: 110 },
    large: { width: 310, height: 170 },
  },
  layout: {
    ready: {
      x: 180,
      y: 220,
    },
    gameOver: {
      x: 180,
      y: 300,
    },
  },
  button: {
    width: 170,
    height: 48,
    textStyle: {
      fontFamily: '"Cinzel Decorative", "Cinzel", serif',
      fontSize: '16px',
      color: EMERALD_PALETTE.textPrimary,
      stroke: '#0b1f1b',
      strokeThickness: 4,
    },
  },
  scoreFrameSize: {
    width: 140,
    height: 50,
  },
  icon: {
    size: 24,
    padding: 10,
  },
} as const

const EMERALD_FX = {
  parallax: {
    far: 0.05,
    mid: 0.14,
    near: 0.26,
  },
  fog: {
    speedX: 0,
    alpha: 0,
  },
  obstacleSway: {
    amplitude: 0.018,
    speed: 0.0021,
  },
  embers: {
    enabled: false,
    frequency: 0,
    count: 0,
    speedMin: 0,
    speedMax: 0,
    driftMin: 0,
    driftMax: 0,
    scaleMin: 0,
    scaleMax: 0,
    alphaMin: 0,
    alphaMax: 0,
    lifespanMin: 0,
    lifespanMax: 0,
  },
  dust: {
    enabled: false,
    frequency: 0,
    count: 0,
    speedMin: 0,
    speedMax: 0,
    driftMin: 0,
    driftMax: 0,
    scaleMin: 0,
    scaleMax: 0,
    alphaMin: 0,
    alphaMax: 0,
    lifespanMin: 0,
    lifespanMax: 0,
  },
  leaf: {
    enabled: false,
    frequency: 0,
    count: 0,
    speedMin: 0,
    speedMax: 0,
    driftMin: 0,
    driftMax: 0,
    scaleMin: 0,
    scaleMax: 0,
    alphaMin: 0,
    alphaMax: 0,
    lifespanMin: 0,
    lifespanMax: 0,
  },
  scorePulse: {
    scale: 1.08,
    duration: 120,
  },
  screenShake: {
    duration: 120,
    intensity: 0.0015,
  },
  cameraPunch: {
    enabled: true,
    amount: 0.016,
    durationMs: 110,
  },
  sceneFade: {
    enabled: true,
    durationMs: 200,
  },
  overlayBounce: {
    enabled: true,
    startScale: 0.97,
    durationMs: 230,
  },
  screenFlash: {
    enabled: true,
    color: 0xffffff,
    alpha: 0.14,
    durationMs: 120,
  },
  impactBurst: {
    enabled: true,
    count: 12,
    speedMin: 70,
    speedMax: 150,
    scaleMin: 0.3,
    scaleMax: 0.6,
    alphaStart: 0.8,
    alphaEnd: 0,
    lifespanMin: 280,
    lifespanMax: 420,
    tint: 0x99f6e4,
  },
  vignette: {
    alpha: 0.35,
  },
  readyBob: {
    amplitude: 5,
    speed: 2.2,
  },
} as const

const IMAGE_KEYS = {
  bgFar: 'emerald-bg-far',
  bgMid: 'emerald-bg-mid',
  bgNear: 'emerald-bg-near',
  ground: 'emerald-ground',
  swan: 'emerald-swan',
  pipe: 'emerald-pipe',
  vignette: 'emerald-vignette',
} as const

const IMAGE_PATHS = {
  [IMAGE_KEYS.bgFar]: 'assets/bg_far.svg',
  [IMAGE_KEYS.bgMid]: 'assets/bg_mid.svg',
  [IMAGE_KEYS.bgNear]: 'assets/bg_near.svg',
  [IMAGE_KEYS.ground]: 'assets/ground.svg',
  [IMAGE_KEYS.swan]: 'assets/swan.svg',
  [IMAGE_KEYS.pipe]: 'assets/pipe.svg',
  [IMAGE_KEYS.vignette]: 'assets/vignette.svg',
} as const

export const emeraldLakeTheme: ThemeDefinition = {
  id: 'emerald-lake',
  name: 'Emerald Lake Swan',
  palette: EMERALD_PALETTE,
  paletteNum: EMERALD_PALETTE_NUM,
  accessibility: EMERALD_ACCESSIBILITY,
  assets: {
    images: IMAGE_PATHS,
  },
  images: {
    bgFar: IMAGE_KEYS.bgFar,
    bgMid: IMAGE_KEYS.bgMid,
    bgNear: IMAGE_KEYS.bgNear,
    ground: IMAGE_KEYS.ground,
    vignette: IMAGE_KEYS.vignette,
  },
  visuals: {
    bird: {
      type: 'image',
      key: IMAGE_KEYS.swan,
    },
    obstacles: {
      type: 'image',
      key: IMAGE_KEYS.pipe,
      topKey: IMAGE_KEYS.pipe,
      bottomKey: IMAGE_KEYS.pipe,
      flipTop: true,
    },
    ui: {
      kind: 'shape',
    },
  },
  ui: EMERALD_UI,
  fx: EMERALD_FX,
  audio: {},
}
