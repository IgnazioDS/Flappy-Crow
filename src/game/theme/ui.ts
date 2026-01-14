import { PALETTE, PALETTE_NUM } from './palette'

export const UI = {
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
    color: PALETTE.textPrimary,
    stroke: PALETTE.night,
    strokeThickness: 6,
  },
  overlayTitleStyle: {
    fontFamily: '"Cinzel Decorative", "Cinzel", serif',
    fontSize: '26px',
    color: PALETTE.textPrimary,
    stroke: PALETTE.night,
    strokeThickness: 5,
    align: 'center',
  },
  overlayBodyStyle: {
    fontFamily: '"Cinzel", serif',
    fontSize: '18px',
    color: PALETTE.textMuted,
    stroke: PALETTE.night,
    strokeThickness: 4,
    align: 'center',
  },
  statLabelStyle: {
    fontFamily: '"Cinzel", serif',
    fontSize: '16px',
    color: PALETTE.textMuted,
    stroke: PALETTE.night,
    strokeThickness: 3,
  },
  statValueStyle: {
    fontFamily: '"Space Mono", monospace',
    fontSize: '20px',
    color: PALETTE.textPrimary,
    stroke: PALETTE.night,
    strokeThickness: 4,
  },
  panel: {
    fill: PALETTE_NUM.panel,
    stroke: PALETTE_NUM.panelStroke,
    strokeThickness: 2,
    alpha: 0.9,
  },
  panelSize: {
    small: { width: 280, height: 120 },
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
    width: 180,
    height: 52,
    textStyle: {
      fontFamily: '"Cinzel Decorative", "Cinzel", serif',
      fontSize: '18px',
      color: PALETTE.textPrimary,
      stroke: PALETTE.night,
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
