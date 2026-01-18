# Telemetry

Telemetry is privacy-first and optional. It tracks only gameplay events and avoids
PII. Players can opt out from the Settings panel (stored in localStorage).

## App Store / ATT note

Telemetry must remain opt-in. If any provider qualifies as tracking under Apple's
definitions, App Tracking Transparency (ATT) permission is required before enabling
that provider in the iOS shell.

## Events

- `game_ready_shown`
- `game_start`
- `flap`
- `score_increment` (score)
- `game_over` (score, bestScore, sessionDurationMs)
- `restart`
- `mute_toggle` (muted)

Events are batched and flushed every 4 seconds or after 12 events, and are flushed
when the page is hidden.

## Providers

Configure providers via environment variables:

- Console (dev or opt-in): `VITE_TELEMETRY_CONSOLE=true`
- Plausible: `VITE_PLAUSIBLE_DOMAIN=yourdomain.com`, `VITE_PLAUSIBLE_API_HOST=https://plausible.yourhost.com`
- PostHog: `VITE_POSTHOG_KEY=phc_...`, `VITE_POSTHOG_HOST=https://app.posthog.com`

If no providers are configured, telemetry is disabled.

## Opt-out

The opt-out flag is stored in localStorage under `flappy-analytics-optout`.
