/**
 * uiMotion.ts — Lightweight motion system for the Flappy Crow UI.
 *
 * Design principles:
 *   - No per-frame allocations: all tweens are event-driven (scene-enter or
 *     pointer events), never in update().
 *   - Reduced-motion: skip all translation/scale tweens; only allow
 *     instant alpha changes so content is still visible.
 *   - Every tween target must be a Phaser.GameObjects.* with setAlpha /
 *     setScale methods.
 */
import Phaser from 'phaser'
import { MOTION } from './designSystem'
import { DT_MOTION, DT_V3 } from './designTokens'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MotionTarget =
  | Phaser.GameObjects.Container
  | Phaser.GameObjects.Image
  | Phaser.GameObjects.Text
  | Phaser.GameObjects.Graphics
  | Phaser.GameObjects.Rectangle

// ─── Overlay enter / exit ─────────────────────────────────────────────────────

/**
 * Fade + slide an overlay container into view.
 * If reducedMotion, the container is made visible instantly (no animation).
 *
 * @param scene         Owning scene.
 * @param target        Container (or any game object) to animate.
 * @param reducedMotion When true, skip all motion; only set visible + alpha.
 * @param slideY        Vertical offset to slide from (default 14 px up).
 */
export const overlayIn = (
  scene: Phaser.Scene,
  target: MotionTarget,
  reducedMotion: boolean,
  slideY = DT_MOTION.overlaySlideY,
): Phaser.Tweens.Tween | null => {
  target.setVisible(true)
  target.setAlpha(0)

  if (reducedMotion) {
    target.setAlpha(1)
    return null
  }

  const startY = target.y + slideY
  const endY   = target.y

  // Temporarily offset so the tween slides back to original position
  target.setY(startY)

  return scene.tweens.add({
    targets:  target,
    alpha:    1,
    y:        endY,
    duration: MOTION.overlayIn,
    ease:     'Quad.easeOut',
    onComplete: () => {
      target.setY(endY)
    },
  })
}

/**
 * Fade an overlay container out, then hide it.
 * Respects reducedMotion.
 */
export const overlayOut = (
  scene: Phaser.Scene,
  target: MotionTarget,
  reducedMotion: boolean,
  onComplete?: () => void,
): Phaser.Tweens.Tween | null => {
  if (reducedMotion) {
    target.setVisible(false)
    target.setAlpha(0)
    onComplete?.()
    return null
  }

  return scene.tweens.add({
    targets:  target,
    alpha:    0,
    duration: MOTION.overlayOut,
    ease:     'Quad.easeIn',
    onComplete: () => {
      target.setVisible(false)
      onComplete?.()
    },
  })
}

// ─── Score pop ────────────────────────────────────────────────────────────────

/**
 * Micro-scale "pop" to confirm score increment.
 * Skipped entirely when reducedMotion is true.
 */
export const scorePop = (
  scene: Phaser.Scene,
  target: MotionTarget,
  reducedMotion: boolean,
): Phaser.Tweens.Tween | null => {
  if (reducedMotion) return null

  // Stop any existing pop tween first
  scene.tweens.killTweensOf(target)

  const base = target.scaleX

  return scene.tweens.add({
    targets:  target,
    scaleX:   base * DT_MOTION.scorePopScale,
    scaleY:   base * DT_MOTION.scorePopScale,
    duration: MOTION.scorePop,
    ease:     'Back.easeOut',
    yoyo:     true,
    onComplete: () => {
      target.setScale(base)
    },
  })
}

// ─── Tap-prompt pulse ─────────────────────────────────────────────────────────

/**
 * Continuously pulses a game object's alpha (e.g. "tap to play" hint).
 * Returns the looping tween so the caller can stop it.
 * If reducedMotion, just sets alpha to 1 and returns null.
 */
export const tapPulse = (
  scene: Phaser.Scene,
  target: MotionTarget,
  reducedMotion: boolean,
): Phaser.Tweens.Tween | null => {
  if (reducedMotion) {
    target.setAlpha(1)
    return null
  }

  return scene.tweens.add({
    targets:  target,
    alpha:    { from: DT_MOTION.tapPulseAlphaMin, to: 1 },
    duration: MOTION.tapPulse / 2,
    ease:     'Sine.easeInOut',
    yoyo:     true,
    repeat:   -1,
  })
}

// ─── Badge bounce-in ─────────────────────────────────────────────────────────

/**
 * One-shot scale-bounce for "New Best" badge or medal reveal.
 * Skipped when reducedMotion is true.
 */
export const badgeBounceIn = (
  scene: Phaser.Scene,
  target: MotionTarget,
  reducedMotion: boolean,
): Phaser.Tweens.Tween | null => {
  if (reducedMotion) {
    target.setScale(1)
    return null
  }

  target.setScale(0)

  return scene.tweens.add({
    targets:  target,
    scaleX:   1,
    scaleY:   1,
    duration: MOTION.badgeBounce,
    ease:     'Back.easeOut',
    delay:    120,
  })
}

// ─── Modal enter / exit (v3) ──────────────────────────────────────────────────

/**
 * Fade + slide + scale a modal overlay into view (v3 premium motion).
 * Uses DT_V3.motion timings: 200 ms, Quad.easeOut, slide 8 px up, scale 0.97 → 1.
 * If reducedMotion, shows instantly with no animation.
 */
export const modalIn = (
  scene: Phaser.Scene,
  target: MotionTarget,
  reducedMotion: boolean,
): Phaser.Tweens.Tween | null => {
  const scaleFrom = DT_V3.motion.modalScaleFrom
  const slideY    = DT_V3.motion.modalSlideY

  target.setVisible(true).setAlpha(0).setScale(scaleFrom)

  if (reducedMotion) {
    target.setAlpha(1).setScale(1)
    return null
  }

  const startY = target.y + slideY
  const endY   = target.y
  target.setY(startY)

  return scene.tweens.add({
    targets:  target,
    alpha:    1,
    y:        endY,
    scaleX:   1,
    scaleY:   1,
    duration: DT_V3.motion.modalInMs,
    ease:     'Quad.easeOut',
    onComplete: () => {
      target.setY(endY)
    },
  })
}

/**
 * Fade + scale a modal overlay out, then hide it.
 * Uses DT_V3.motion timings: 140 ms, Quad.easeIn, scale 1 → 0.98.
 * If reducedMotion, hides instantly.
 */
export const modalOut = (
  scene: Phaser.Scene,
  target: MotionTarget,
  reducedMotion: boolean,
  onComplete?: () => void,
): Phaser.Tweens.Tween | null => {
  if (reducedMotion) {
    target.setVisible(false).setAlpha(0).setScale(1)
    onComplete?.()
    return null
  }

  return scene.tweens.add({
    targets:  target,
    alpha:    0,
    scaleX:   0.98,
    scaleY:   0.98,
    duration: DT_V3.motion.modalOutMs,
    ease:     'Quad.easeIn',
    onComplete: () => {
      target.setVisible(false).setScale(1)
      onComplete?.()
    },
  })
}
