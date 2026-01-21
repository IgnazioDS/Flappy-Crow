import type { ThemeDefinition, ThemeUiAssets } from './types'

type ThemeContractIssue = {
  field: string
  message: string
}

const REQUIRED_ATLAS_FRAMES: Array<keyof NonNullable<ThemeUiAssets['frames']>> = [
  'panelSmall',
  'panelLarge',
  'button',
  'scoreFrame',
  'iconRestart',
  'iconMuteOn',
  'iconMuteOff',
  'iconMotionOn',
  'iconMotionOff',
]

const formatIssues = (issues: ThemeContractIssue[]): string =>
  issues.map((issue) => `${issue.field}: ${issue.message}`).join('; ')

export const validateThemeDefinition = (theme: ThemeDefinition): ThemeDefinition => {
  if (!import.meta.env.DEV) {
    return theme
  }

  const issues: ThemeContractIssue[] = []

  if (!theme.images.bgFar) {
    issues.push({ field: 'images.bgFar', message: 'missing background far layer' })
  }
  if (!theme.images.bgMid) {
    issues.push({ field: 'images.bgMid', message: 'missing background mid layer' })
  }
  if (!theme.images.bgNear) {
    issues.push({ field: 'images.bgNear', message: 'missing background near layer' })
  }
  if (!theme.images.ground) {
    issues.push({ field: 'images.ground', message: 'missing ground image' })
  }
  if (theme.fx.fog.alpha > 0 && !theme.images.fog) {
    issues.push({ field: 'images.fog', message: 'fog enabled but no fog image provided' })
  }
  if (theme.fx.vignette.alpha > 0 && !theme.images.vignette) {
    issues.push({
      field: 'images.vignette',
      message: 'vignette enabled but no vignette image provided',
    })
  }

  if (theme.visuals.bird.type === 'atlas' && !theme.visuals.bird.idleFrame) {
    issues.push({ field: 'visuals.bird.idleFrame', message: 'atlas bird missing idle frame' })
  }

  if (theme.visuals.obstacles.type === 'atlas') {
    if (!theme.visuals.obstacles.topFrames?.length) {
      issues.push({
        field: 'visuals.obstacles.topFrames',
        message: 'atlas obstacles missing top frames',
      })
    }
    if (!theme.visuals.obstacles.bottomFrames?.length) {
      issues.push({
        field: 'visuals.obstacles.bottomFrames',
        message: 'atlas obstacles missing bottom frames',
      })
    }
  } else {
    if (!theme.visuals.obstacles.topKey) {
      issues.push({
        field: 'visuals.obstacles.topKey',
        message: 'image obstacles missing top key',
      })
    }
    if (!theme.visuals.obstacles.bottomKey) {
      issues.push({
        field: 'visuals.obstacles.bottomKey',
        message: 'image obstacles missing bottom key',
      })
    }
  }

  if (theme.visuals.ui.kind === 'atlas') {
    const frames = theme.visuals.ui.frames
    if (!frames) {
      issues.push({ field: 'visuals.ui.frames', message: 'atlas UI missing frames map' })
    } else {
      REQUIRED_ATLAS_FRAMES.forEach((frameKey) => {
        if (!frames[frameKey]) {
          issues.push({
            field: `visuals.ui.frames.${frameKey}`,
            message: 'required UI frame missing',
          })
        }
      })
    }
  }

  if (issues.length) {
    console.warn(`[theme-contract] ${theme.id}: ${formatIssues(issues)}`)
  }

  return theme
}
