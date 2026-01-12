import { BIRD_CONFIG } from '../config'

export class Bird {
  readonly x: number
  y: number
  velocity: number

  constructor(startY: number) {
    this.x = BIRD_CONFIG.x
    this.y = startY
    this.velocity = 0
  }

  flap(): void {
    this.velocity = BIRD_CONFIG.flapVelocity
  }

  update(dt: number, groundY: number): boolean {
    this.velocity += BIRD_CONFIG.gravity * dt
    this.velocity = Math.min(this.velocity, BIRD_CONFIG.maxFallSpeed)
    this.velocity = Math.max(this.velocity, BIRD_CONFIG.maxRiseSpeed)
    this.y += this.velocity * dt

    if (this.y - BIRD_CONFIG.radius < 0) {
      this.y = BIRD_CONFIG.radius
      this.velocity = 0
    }

    if (this.y + BIRD_CONFIG.radius >= groundY) {
      this.y = groundY - BIRD_CONFIG.radius
      this.velocity = 0
      return true
    }

    return false
  }

  reset(startY: number): void {
    this.y = startY
    this.velocity = 0
  }
}
