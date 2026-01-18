import type { ThemeDefinition } from '../types'

const CLASSIC_PALETTE = {
  background: '#cfeeff',
  textPrimary: '#1f2933',
  textMuted: '#52606d',
  panel: '#ffffff',
  panelStroke: '#cbd2d9',
} as const

const CLASSIC_PALETTE_NUM = {
  panel: 0xffffff,
  panelStroke: 0xcbd2d9,
  shadow: 0x0b1a26,
} as const

const CLASSIC_ACCESSIBILITY = {
  contrast: {
    high: {
      palette: {
        textPrimary: '#0b1a26',
        textMuted: '#1f2933',
        panelStroke: '#0b1a26',
      },
    },
  },
} as const

const CLASSIC_UI = {
  fonts: {
    title: '"Bungee", "Trebuchet MS", sans-serif',
    body: '"Trebuchet MS", sans-serif',
    numbers: '"Bungee", "Trebuchet MS", sans-serif',
  },
  score: {
    x: 180,
    y: 44,
  },
  scoreTextStyle: {
    fontFamily: '"Bungee", "Trebuchet MS", sans-serif',
    fontSize: '34px',
    color: CLASSIC_PALETTE.textPrimary,
    stroke: '#ffffff',
    strokeThickness: 6,
  },
  overlayTitleStyle: {
    fontFamily: '"Bungee", "Trebuchet MS", sans-serif',
    fontSize: '24px',
    color: CLASSIC_PALETTE.textPrimary,
    stroke: '#ffffff',
    strokeThickness: 5,
    align: 'center',
  },
  overlayBodyStyle: {
    fontFamily: '"Trebuchet MS", sans-serif',
    fontSize: '16px',
    color: CLASSIC_PALETTE.textMuted,
    stroke: '#ffffff',
    strokeThickness: 4,
    align: 'center',
  },
  statLabelStyle: {
    fontFamily: '"Trebuchet MS", sans-serif',
    fontSize: '14px',
    color: CLASSIC_PALETTE.textMuted,
    stroke: '#ffffff',
    strokeThickness: 3,
  },
  statValueStyle: {
    fontFamily: '"Bungee", "Trebuchet MS", sans-serif',
    fontSize: '18px',
    color: CLASSIC_PALETTE.textPrimary,
    stroke: '#ffffff',
    strokeThickness: 4,
  },
  panel: {
    fill: CLASSIC_PALETTE_NUM.panel,
    stroke: CLASSIC_PALETTE_NUM.panelStroke,
    strokeThickness: 2,
    alpha: 0.95,
  },
  panelSize: {
    small: { width: 260, height: 120 },
    large: { width: 320, height: 180 },
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
    width: 176,
    height: 50,
    textStyle: {
      fontFamily: '"Bungee", "Trebuchet MS", sans-serif',
      fontSize: '17px',
      color: CLASSIC_PALETTE.textPrimary,
      stroke: '#ffffff',
      strokeThickness: 4,
    },
  },
  scoreFrameSize: {
    width: 150,
    height: 54,
  },
  icon: {
    size: 26,
    padding: 10,
  },
} as const

const CLASSIC_FX = {
  parallax: {
    far: 0.04,
    mid: 0.12,
    near: 0.22,
  },
  fog: {
    speedX: 0,
    alpha: 0,
  },
  obstacleSway: {
    amplitude: 0.02,
    speed: 0.0022,
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
    alpha: 0.12,
    durationMs: 120,
  },
  impactBurst: {
    enabled: true,
    count: 10,
    speedMin: 70,
    speedMax: 150,
    scaleMin: 0.3,
    scaleMax: 0.6,
    alphaStart: 0.8,
    alphaEnd: 0,
    lifespanMin: 280,
    lifespanMax: 420,
    tint: 0xfef3c7,
  },
  vignette: {
    alpha: 0.2,
  },
  readyBob: {
    amplitude: 4,
    speed: 2.2,
  },
} as const

const IMAGE_KEYS = {
  bgFar: 'classic-bg-far',
  bgMid: 'classic-bg-mid',
  bgNear: 'classic-bg-near',
  ground: 'classic-ground',
  bird: 'classic-bird',
  pipe: 'classic-pipe',
  vignette: 'classic-vignette',
} as const

const IMAGE_PATHS = {
  [IMAGE_KEYS.bgFar]: 'assets/bg_far.svg',
  [IMAGE_KEYS.bgMid]: 'assets/bg_mid.svg',
  [IMAGE_KEYS.bgNear]: 'assets/bg_near.svg',
  [IMAGE_KEYS.ground]: 'assets/ground.svg',
  [IMAGE_KEYS.bird]: 'assets/bird.svg',
  [IMAGE_KEYS.pipe]: 'assets/pipe.svg',
  [IMAGE_KEYS.vignette]: 'assets/vignette.svg',
} as const

export const classicTheme: ThemeDefinition = {
  id: 'classic',
  name: 'Classic Sky',
  palette: CLASSIC_PALETTE,
  paletteNum: CLASSIC_PALETTE_NUM,
  accessibility: CLASSIC_ACCESSIBILITY,
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
      key: IMAGE_KEYS.bird,
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
  ui: CLASSIC_UI,
  fx: CLASSIC_FX,
  audio: {},
}
