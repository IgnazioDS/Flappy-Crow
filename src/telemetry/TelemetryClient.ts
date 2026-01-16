import type {
  Telemetry,
  TelemetryEvent,
  TelemetryEventName,
  TelemetryEventProps,
  TelemetryProvider,
} from './Telemetry'

type TelemetryClientOptions = {
  providers: TelemetryProvider[]
  enabled: boolean
  flushIntervalMs?: number
  maxBatchSize?: number
}

const DEFAULT_FLUSH_INTERVAL_MS = 4000
const DEFAULT_MAX_BATCH_SIZE = 12
const TELEMETRY_SCHEMA_VERSION = 1

export class TelemetryClient implements Telemetry {
  private providers: TelemetryProvider[]
  private queue: TelemetryEvent[] = []
  private enabled: boolean
  private flushIntervalMs: number
  private maxBatchSize: number
  private started = false
  private flushTimerId: number | null = null
  private readonly handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      this.flush()
    }
  }
  private readonly handlePageHide = () => {
    this.flush()
  }

  constructor(options: TelemetryClientOptions) {
    this.providers = options.providers
    this.enabled = options.enabled
    this.flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS
    this.maxBatchSize = options.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE
  }

  start(): void {
    if (this.started || typeof window === 'undefined') {
      return
    }
    this.started = true
    this.flushTimerId = window.setInterval(() => this.flush(), this.flushIntervalMs)
    window.addEventListener('visibilitychange', this.handleVisibilityChange)
    window.addEventListener('pagehide', this.handlePageHide)
  }

  stop(): void {
    if (!this.started || typeof window === 'undefined') {
      return
    }
    this.started = false
    if (this.flushTimerId !== null) {
      window.clearInterval(this.flushTimerId)
      this.flushTimerId = null
    }
    window.removeEventListener('visibilitychange', this.handleVisibilityChange)
    window.removeEventListener('pagehide', this.handlePageHide)
  }

  track<Name extends TelemetryEventName>(name: Name, props?: TelemetryEventProps[Name]): void {
    if (!this.enabled || this.providers.length === 0) {
      return
    }
    this.queue.push({
      name,
      timestamp: Date.now(),
      schemaVersion: TELEMETRY_SCHEMA_VERSION,
      props,
    })
    if (this.queue.length >= this.maxBatchSize) {
      this.flush()
    }
  }

  flush(): void {
    if (!this.enabled || this.queue.length === 0 || this.providers.length === 0) {
      return
    }
    const batch = this.queue.splice(0, this.queue.length)
    for (const provider of this.providers) {
      try {
        const result = provider.send(batch)
        if (result && typeof (result as Promise<void>).catch === 'function') {
          ;(result as Promise<void>).catch(() => {})
        }
      } catch {
        // Ignore provider errors to avoid impacting gameplay.
      }
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.queue.length = 0
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }
}
