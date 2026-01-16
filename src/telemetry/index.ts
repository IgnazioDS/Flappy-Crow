import type { TelemetryProvider } from './Telemetry'
import { TelemetryClient } from './TelemetryClient'
import { createConsoleProvider } from './providers/console'
import { createPlausibleProvider } from './providers/plausible'
import { createPosthogProvider } from './providers/posthog'

type TelemetryConsent = 'granted' | 'denied'

const CONSENT_KEY = 'flappy-analytics-consent'
const LEGACY_OPTOUT_KEY = 'flappy-analytics-optout'

const readStoredBool = (key: string): boolean | null => {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) {
      return null
    }
    return raw === 'true'
  } catch {
    return null
  }
}

const readStoredString = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const readConsent = (): TelemetryConsent | null => {
  const raw = readStoredString(CONSENT_KEY)
  if (raw === 'granted' || raw === 'denied') {
    return raw
  }
  const legacyOptOut = readStoredBool(LEGACY_OPTOUT_KEY)
  if (legacyOptOut === null) {
    return null
  }
  return legacyOptOut ? 'denied' : 'granted'
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

const telemetryEnabled = readConsent() === 'granted'
const providers = buildProviders()

export const telemetry = new TelemetryClient({
  providers,
  enabled: telemetryEnabled,
})

export const telemetryHasProviders = providers.length > 0

export const getTelemetryConsent = (): TelemetryConsent | null => readConsent()

export const setTelemetryConsent = (consent: TelemetryConsent): void => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(CONSENT_KEY, consent)
    window.localStorage.setItem(LEGACY_OPTOUT_KEY, String(consent !== 'granted'))
  } catch {
    // Ignore storage errors.
  }
  telemetry.setEnabled(consent === 'granted')
}
