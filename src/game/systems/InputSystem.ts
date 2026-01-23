export class InputSystem {
  private flapQueued = false

  requestFlap(): void {
    this.flapQueued = true
  }

  consumeFlap(): boolean {
    const shouldFlap = this.flapQueued
    this.flapQueued = false
    return shouldFlap
  }

  clear(): void {
    this.flapQueued = false
  }
}
