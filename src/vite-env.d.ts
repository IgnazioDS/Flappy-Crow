/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TEST_SEED?: string
  readonly VITE_E2E?: string
  readonly VITE_THEME?: string
  readonly VITE_ART_QA?: string
  readonly VITE_PRIVACY_POLICY_URL?: string
  readonly VITE_TELEMETRY_CONSOLE?: string
  readonly VITE_PLAUSIBLE_DOMAIN?: string
  readonly VITE_PLAUSIBLE_API_HOST?: string
  readonly VITE_POSTHOG_KEY?: string
  readonly VITE_POSTHOG_HOST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
