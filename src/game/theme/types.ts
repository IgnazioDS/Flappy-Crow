export type ThemeId = 'classic' | 'evil-forest'

export type ThemeTextStyle = {
  fontFamily: string
  fontSize: string
  color: string
  stroke?: string
  strokeThickness?: number
  align?: string
}

export type ThemeUI = {
  fonts: {
    title: string
    body: string
    numbers: string
  }
  score: {
    x: number
    y: number
  }
  scoreTextStyle: ThemeTextStyle
  overlayTitleStyle: ThemeTextStyle
  overlayBodyStyle: ThemeTextStyle
  statLabelStyle: ThemeTextStyle
  statValueStyle: ThemeTextStyle
  panel: {
    fill: number
    stroke: number
    strokeThickness: number
    alpha: number
  }
  panelSize: {
    small: { width: number; height: number }
    large: { width: number; height: number }
  }
  layout: {
    ready: { x: number; y: number }
    gameOver: { x: number; y: number }
  }
  button: {
    width: number
    height: number
    textStyle: ThemeTextStyle
  }
  scoreFrameSize: {
    width: number
    height: number
  }
  icon: {
    size: number
    padding: number
  }
}

export type ThemeFx = {
  parallax: {
    far: number
    mid: number
    near: number
  }
  fog: {
    speedX: number
    alpha: number
  }
  obstacleSway: {
    amplitude: number
    speed: number
  }
  embers: {
    enabled: boolean
    frequency: number
    count: number
    speedMin: number
    speedMax: number
    driftMin: number
    driftMax: number
    scaleMin: number
    scaleMax: number
    alphaMin: number
    alphaMax: number
    lifespanMin: number
    lifespanMax: number
  }
  dust: {
    enabled: boolean
    frequency: number
    count: number
    speedMin: number
    speedMax: number
    driftMin: number
    driftMax: number
    scaleMin: number
    scaleMax: number
    alphaMin: number
    alphaMax: number
    lifespanMin: number
    lifespanMax: number
  }
  leaf: {
    enabled: boolean
    frequency: number
    count: number
    speedMin: number
    speedMax: number
    driftMin: number
    driftMax: number
    scaleMin: number
    scaleMax: number
    alphaMin: number
    alphaMax: number
    lifespanMin: number
    lifespanMax: number
  }
  scorePulse: {
    scale: number
    duration: number
  }
  screenShake: {
    duration: number
    intensity: number
  }
  cameraPunch: {
    enabled: boolean
    amount: number
    durationMs: number
  }
  sceneFade: {
    enabled: boolean
    durationMs: number
  }
  overlayBounce: {
    enabled: boolean
    startScale: number
    durationMs: number
  }
  screenFlash: {
    enabled: boolean
    color: number
    alpha: number
    durationMs: number
  }
  impactBurst: {
    enabled: boolean
    count: number
    speedMin: number
    speedMax: number
    scaleMin: number
    scaleMax: number
    alphaStart: number
    alphaEnd: number
    lifespanMin: number
    lifespanMax: number
    tint?: number
  }
  vignette: {
    alpha: number
  }
  readyBob: {
    amplitude: number
    speed: number
  }
}

export type ThemeAssets = {
  atlas?: {
    key: string
    imagePng: string
    imageWebp?: string
    data: string
  }
  images: Record<string, string>
}

export type ThemeImages = {
  bgFar?: string
  bgMid?: string
  bgNear?: string
  fog?: string
  ground: string
  vignette?: string
}

export type ThemeBirdVisual = {
  type: 'atlas' | 'image'
  key: string
  idleFrame?: string
  flapFrames?: readonly string[]
  deadFrame?: string
  glowFrame?: string
}

export type ThemeObstacleVisual = {
  type: 'atlas' | 'image'
  key: string
  topFrames?: readonly string[]
  bottomFrames?: readonly string[]
  topKey?: string
  bottomKey?: string
  flipTop?: boolean
}

export type ThemeUiAssets = {
  kind: 'atlas' | 'shape'
  atlasKey?: string
  frames?: {
    panelSmall?: string
    panelLarge?: string
    button?: string
    scoreFrame?: string
    iconRestart?: string
    iconMuteOn?: string
    iconMuteOff?: string
    iconMotionOn?: string
    iconMotionOff?: string
    medalBronze?: string
    medalSilver?: string
    medalGold?: string
    medalVoid?: string
  }
}

export type ThemeParticles = {
  ember?: string
  dust?: string
  leaf?: string
}

export type ThemePalette = {
  background: string
  textPrimary: string
  textMuted: string
  panel: string
  panelStroke: string
}

export type ThemePaletteNum = {
  panel: number
  panelStroke: number
  shadow: number
}

export type ThemeDefinition = {
  id: ThemeId
  name: string
  palette: ThemePalette
  paletteNum: ThemePaletteNum
  assets: ThemeAssets
  images: ThemeImages
  visuals: {
    bird: ThemeBirdVisual
    obstacles: ThemeObstacleVisual
    ui: ThemeUiAssets
    particles?: ThemeParticles
  }
  ui: ThemeUI
  fx: ThemeFx
}
