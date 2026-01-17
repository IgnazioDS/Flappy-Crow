import type { ThemeDefinition } from '../theme/types'
import type { ReplaySeedMode } from '../replay/types'

const CARD_WIDTH = 1080
const CARD_HEIGHT = 1920
const CARD_MARGIN = 90
const FRAME_TOP = 190
const FRAME_HEIGHT = 980
const FRAME_RADIUS = 36

export type ShareCardOptions = {
  sourceCanvas: HTMLCanvasElement
  theme: ThemeDefinition
  score: number
  bestScore: number
  seedLabel: string
  seedMode: ReplaySeedMode
  gameModeLabel: string
  practiceEnabled: boolean
  shareUrl: string
}

export const createShareCardCanvas = (options: ShareCardOptions): HTMLCanvasElement | null => {
  if (typeof document === 'undefined') {
    return null
  }
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return null
  }

  drawBackground(ctx, options.theme)
  drawTitle(ctx, options)
  drawScreenshot(ctx, options)
  drawStats(ctx, options)
  drawFooter(ctx, options)

  return canvas
}

export const downloadShareCard = (canvas: HTMLCanvasElement, fileName: string): void => {
  if (typeof document === 'undefined') {
    return
  }
  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = fileName
  link.click()
}

export const copyShareUrl = async (url: string): Promise<boolean> => {
  if (typeof navigator === 'undefined') {
    return false
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return true
    }
  } catch {
    // Fall back to execCommand.
  }

  if (typeof document === 'undefined') {
    return false
  }
  try {
    const input = document.createElement('textarea')
    input.value = url
    input.setAttribute('readonly', 'true')
    input.style.position = 'absolute'
    input.style.left = '-9999px'
    document.body.appendChild(input)
    input.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(input)
    return ok
  } catch {
    return false
  }
}

export const buildShareUrl = (
  currentUrl: string,
  seedMode: ReplaySeedMode,
  seedLabel: string,
): string => {
  try {
    const url = new URL(currentUrl)
    if (seedMode === 'daily') {
      url.searchParams.set('daily', '1')
      url.searchParams.delete('seed')
    } else if (seedMode === 'custom') {
      url.searchParams.set('seed', seedLabel)
      url.searchParams.delete('daily')
    } else {
      url.searchParams.delete('seed')
      url.searchParams.delete('daily')
    }
    return url.toString()
  } catch {
    return currentUrl
  }
}

const drawBackground = (ctx: CanvasRenderingContext2D, theme: ThemeDefinition): void => {
  ctx.fillStyle = theme.palette.background
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  ctx.save()
  ctx.globalAlpha = 0.08
  ctx.fillStyle = theme.palette.textPrimary
  ctx.fillRect(0, 0, CARD_WIDTH, 220)
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = 0.12
  ctx.fillStyle = theme.palette.textMuted
  ctx.fillRect(0, CARD_HEIGHT - 260, CARD_WIDTH, 260)
  ctx.restore()
}

const drawTitle = (ctx: CanvasRenderingContext2D, options: ShareCardOptions): void => {
  const { theme } = options
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = theme.palette.textPrimary
  ctx.font = `700 62px ${theme.ui.fonts.title}`
  ctx.fillText('FLAPPY BIRD EX', CARD_WIDTH / 2, 110)

  ctx.fillStyle = theme.palette.textMuted
  ctx.font = `600 24px ${theme.ui.fonts.body}`
  ctx.fillText(theme.name.toUpperCase(), CARD_WIDTH / 2, 154)
  ctx.restore()
}

const drawScreenshot = (ctx: CanvasRenderingContext2D, options: ShareCardOptions): void => {
  const { sourceCanvas, theme } = options
  const frameWidth = CARD_WIDTH - CARD_MARGIN * 2
  const frameHeight = FRAME_HEIGHT
  const frameLeft = CARD_MARGIN
  const frameTop = FRAME_TOP

  ctx.save()
  roundedRectPath(ctx, frameLeft, frameTop, frameWidth, frameHeight, FRAME_RADIUS)
  ctx.clip()

  const scale = frameWidth / sourceCanvas.width
  const cropHeight = Math.round(frameHeight / scale)
  const cropY = Math.max(0, Math.floor((sourceCanvas.height - cropHeight) / 2))

  ctx.drawImage(
    sourceCanvas,
    0,
    cropY,
    sourceCanvas.width,
    cropHeight,
    frameLeft,
    frameTop,
    frameWidth,
    frameHeight,
  )
  ctx.restore()

  ctx.save()
  ctx.lineWidth = 6
  ctx.strokeStyle = theme.palette.panelStroke
  roundedRectPath(ctx, frameLeft, frameTop, frameWidth, frameHeight, FRAME_RADIUS)
  ctx.stroke()
  ctx.restore()
}

const drawStats = (ctx: CanvasRenderingContext2D, options: ShareCardOptions): void => {
  const { theme } = options
  const statsTop = FRAME_TOP + FRAME_HEIGHT + 70

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = theme.palette.textMuted
  ctx.font = `600 28px ${theme.ui.fonts.body}`
  ctx.fillText('SCORE', CARD_WIDTH / 2, statsTop)

  ctx.fillStyle = theme.palette.textPrimary
  ctx.font = `700 120px ${theme.ui.fonts.numbers}`
  ctx.fillText(String(options.score), CARD_WIDTH / 2, statsTop + 100)
  ctx.restore()

  const rowTop = statsTop + 190
  const columnWidth = (CARD_WIDTH - CARD_MARGIN * 2) / 3
  const columns = [
    {
      label: 'BEST',
      value: String(options.bestScore),
    },
    {
      label: 'MODE',
      value: options.practiceEnabled
        ? `PRACTICE ${options.gameModeLabel}`
        : options.gameModeLabel,
    },
    {
      label: 'SEED',
      value: formatSeedLabel(options.seedMode, options.seedLabel),
    },
  ]

  ctx.save()
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  for (let i = 0; i < columns.length; i += 1) {
    const x = CARD_MARGIN + i * columnWidth
    const labelY = rowTop
    const valueY = rowTop + 36
    ctx.fillStyle = theme.palette.textMuted
    ctx.font = `600 22px ${theme.ui.fonts.body}`
    ctx.fillText(columns[i].label, x, labelY)

    ctx.fillStyle = theme.palette.textPrimary
    ctx.font = `600 26px ${theme.ui.fonts.body}`
    const value = trimToWidth(ctx, columns[i].value, columnWidth - 10)
    ctx.fillText(value, x, valueY)
  }
  ctx.restore()
}

const drawFooter = (ctx: CanvasRenderingContext2D, options: ShareCardOptions): void => {
  const theme = options.theme
  const shortUrl = shortenUrl(options.shareUrl)
  const footerY = CARD_HEIGHT - 140

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = theme.palette.textMuted
  ctx.font = `600 22px ${theme.ui.fonts.body}`
  ctx.fillText('SEED LINK', CARD_WIDTH / 2, footerY)

  ctx.fillStyle = theme.palette.textPrimary
  ctx.font = `500 22px ${theme.ui.fonts.body}`
  const link = trimToWidth(ctx, shortUrl, CARD_WIDTH - CARD_MARGIN * 2)
  ctx.fillText(link, CARD_WIDTH / 2, footerY + 34)
  ctx.restore()
}

const formatSeedLabel = (mode: ReplaySeedMode, label: string): string => {
  if (mode === 'daily') {
    return `DAILY ${label}`
  }
  if (mode === 'custom') {
    return label
  }
  return 'NORMAL'
}

const shortenUrl = (value: string): string => {
  try {
    const url = new URL(value)
    const host = url.host
    const path = url.pathname.replace(/\/$/, '')
    const query = url.search
    return `${host}${path}${query}`
  } catch {
    return value
  }
}

const roundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void => {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

const trimToWidth = (
  ctx: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
): string => {
  if (ctx.measureText(value).width <= maxWidth) {
    return value
  }
  let trimmed = value
  while (trimmed.length > 3 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1)
  }
  return trimmed.length <= 3 ? value : `${trimmed}...`
}
