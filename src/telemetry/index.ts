import type { TelemetryProvider } from './Telemetry'
import { TelemetryClient } from './TelemetryClient'
import { createConsoleProvider } from './providers/console'
import { createPlausibleProvider } from './providers/plausible'
import { createPosthogProvider } from './providers/posthog'

const readStoredBool = (key: string, fallback: boolean): boolean => {
  if (typeof window === 'undefined') {
    return fallback
  }
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) {
      return fallback
    }
    return raw === 'true'
  } catch {
    return fallback
  }
}

const buildProviders = (): TelemetryProvider[] => {
  const providers: TelemetryProvider[] = []
  const consoleEnabled =
    import.meta.env.DEV || String(import.meta.env.VITE_TELEMETRY_CONSOLE).toLowerCase() === 'true'

  if (consoleEnabled) {
    providers.push(createConsoleProvider())
  }

  const plausible = createPlausibleProvider({
    domain: import.meta.env.VITE_PLAUSIBLE_DOMAIN,
    apiHost: import.meta.env.VITE_PLAUSIBLE_API_HOST,
  })
  if (plausible) {
    providers.push(plausible)
  }

  const posthog = createPosthogProvider({
    apiKey: import.meta.env.VITE_POSTHOG_KEY,
    host: import.meta.env.VITE_POSTHOG_HOST,
  })
  if (posthog) {
    providers.push(posthog)
  }

  return providers
}

const telemetryEnabled = !readStoredBool('flappy-analytics-optout', false)

export const telemetry = new TelemetryClient({
  providers: buildProviders(),
  enabled: telemetryEnabled,
})

export const setTelemetryOptOut = (optOut: boolean): void => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem('flappy-analytics-optout', String(optOut))
  telemetry.setEnabled(!optOut)
}
