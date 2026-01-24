import type Phaser from 'phaser'

export type SoundSystemOptions = {
  muted?: boolean
  minIntervalMs?: number
}

export class SoundSystem {
  private scene: Phaser.Scene
  private muted: boolean
  private minIntervalMs: number
  private active = new Map<string, Phaser.Sound.BaseSound>()
  private lastPlayed = new Map<string, number>()

  constructor(scene: Phaser.Scene, options: SoundSystemOptions = {}) {
    this.scene = scene
    this.muted = options.muted ?? false
    this.minIntervalMs = options.minIntervalMs ?? 60
    this.scene.sound.mute = this.muted
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.scene.sound.mute = muted
  }

  play(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (this.muted) {
      return
    }
    if (!key) {
      return
    }
    if (!this.scene.cache.audio.exists(key)) {
      return
    }
    const existing = this.active.get(key)
    if (existing && existing.isPlaying) {
      return
    }

    const now = this.scene.time.now
    const last = this.lastPlayed.get(key) ?? 0
    if (now - last < this.minIntervalMs) {
      return
    }
    this.lastPlayed.set(key, now)

    const sound = this.scene.sound.add(key)
    this.active.set(key, sound)
    sound.once('complete', () => this.cleanup(key, sound))
    sound.once('stop', () => this.cleanup(key, sound))
    sound.once('destroy', () => this.cleanup(key, sound))

    const ok = sound.play(config)
    if (!ok) {
      this.cleanup(key, sound)
    }
  }

  private cleanup(key: string, sound: Phaser.Sound.BaseSound): void {
    if (this.active.get(key) === sound) {
      this.active.delete(key)
    }
    try {
      sound.destroy()
    } catch {
      // Ignore destroy errors; sound may already be cleaned up.
    }
  }
}
