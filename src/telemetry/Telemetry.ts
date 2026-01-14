/**
 * Telemetry contracts for privacy-first gameplay analytics.
 * Only gameplay metrics, no PII.
 */
export type TelemetryEventProps = {
  game_ready_shown: Record<string, never>
  game_start: Record<string, never>
  flap: Record<string, never>
  score_increment: { score: number }
  game_over: { score: number; bestScore: number; sessionDurationMs: number }
  restart: Record<string, never>
  mute_toggle: { muted: boolean }
}

export type TelemetryEventName = keyof TelemetryEventProps

export type TelemetryEvent<Name extends TelemetryEventName = TelemetryEventName> = {
  name: Name
  timestamp: number
  props?: TelemetryEventProps[Name]
}

export interface TelemetryProvider {
  name: string
  send: (events: TelemetryEvent[]) => void | Promise<void>
}

export interface Telemetry {
  track<Name extends TelemetryEventName>(name: Name, props?: TelemetryEventProps[Name]): void
  flush(): void
  setEnabled(enabled: boolean): void
  isEnabled(): boolean
}
