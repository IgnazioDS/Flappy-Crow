import type { TelemetryProvider } from '../Telemetry'

type PosthogOptions = {
  apiKey?: string
  host?: string
}

const defaultHost = 'https://app.posthog.com'
const sessionKey = 'flappy-session-id'

const getSessionId = (): string => {
  if (typeof window === 'undefined') {
    return 'server'
  }
  const existing = window.sessionStorage.getItem(sessionKey)
  if (existing) {
    return existing
  }
  const id = `session_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`
  window.sessionStorage.setItem(sessionKey, id)
  return id
}

export const createPosthogProvider = (options: PosthogOptions): TelemetryProvider | null => {
  if (!options.apiKey || typeof window === 'undefined') {
    return null
  }

  const endpoint = `${(options.host ?? defaultHost).replace(/\/$/, '')}/capture`
  const sessionId = getSessionId()

  return {
    name: 'posthog',
    send: async (events) => {
      if (typeof fetch !== 'function') {
        return
      }
      for (const event of events) {
        const payload = {
          api_key: options.apiKey,
          event: event.name,
          properties: {
            distinct_id: sessionId,
            schemaVersion: event.schemaVersion,
            ...event.props,
          },
          timestamp: new Date(event.timestamp).toISOString(),
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
