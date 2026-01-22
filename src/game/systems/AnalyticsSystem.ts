export type AnalyticsEvent = {
  name: string
  timestamp: number
  props?: Record<string, unknown>
}

export type AnalyticsSystemOptions = {
  maxEvents?: number
  logToConsole?: boolean
}

export class AnalyticsSystem {
  private events: AnalyticsEvent[] = []
  private maxEvents: number
  private logToConsole: boolean

  constructor(options: AnalyticsSystemOptions = {}) {
    this.maxEvents = options.maxEvents ?? 200
    this.logToConsole = options.logToConsole ?? false
  }

  track(name: string, props?: Record<string, unknown>): void {
    const event: AnalyticsEvent = {
      name,
      timestamp: Date.now(),
      props,
    }
    this.events.push(event)
    if (this.events.length > this.maxEvents) {
      this.events.shift()
    }
    if (this.logToConsole) {
      try {
        console.info('[analytics]', name, props ?? {})
      } catch {
        // Ignore logging errors.
      }
    }
  }

  getEvents(): readonly AnalyticsEvent[] {
    return this.events
  }

  clear(): void {
    this.events.length = 0
  }
}
