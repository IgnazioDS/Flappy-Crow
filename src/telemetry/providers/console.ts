import type { TelemetryProvider } from '../Telemetry'

export const createConsoleProvider = (): TelemetryProvider => {
  return {
    name: 'console',
    send: (events) => {
      if (events.length === 1) {
        console.info('[telemetry]', events[0])
      } else {
        console.info(`[telemetry] ${events.length} events`, events)
      }
    },
  }
}
