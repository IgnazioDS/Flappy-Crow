import type { TelemetryProvider } from '../Telemetry'

type PlausibleOptions = {
  domain?: string
  apiHost?: string
}

const defaultApiHost = 'https://plausible.io'

export const createPlausibleProvider = (options: PlausibleOptions): TelemetryProvider | null => {
  if (!options.domain || typeof window === 'undefined') {
    return null
  }

  const apiHost = options.apiHost ?? defaultApiHost
  const endpoint = `${apiHost.replace(/\/$/, '')}/api/event`

  return {
    name: 'plausible',
    send: async (events) => {
      if (typeof fetch !== 'function') {
        return
      }
      const url = window.location.href
      for (const event of events) {
        const payload = {
          name: event.name,
          url,
          domain: options.domain,
          props: {
            schemaVersion: event.schemaVersion,
            ...(event.props ?? {}),
          },
        }
        try {
          await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
          })
        } catch {
          // Ignore network errors.
        }
      }
    },
  }
}
