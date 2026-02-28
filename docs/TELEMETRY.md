# Telemetry

Telemetry is consent-gated and optional.

## Consent Model

- Consent values: `granted`, `denied`, or `null` (unset)
- Telemetry providers are active only when consent is `granted`
- If no providers are configured, network telemetry is effectively disabled

Storage keys:
- `flappy-analytics-consent` (current)
- `flappy-analytics-optout` (legacy compatibility)

## Provider Configuration

- Console: `VITE_TELEMETRY_CONSOLE=true`
- Plausible: `VITE_PLAUSIBLE_DOMAIN`, optional `VITE_PLAUSIBLE_API_HOST`
- PostHog: `VITE_POSTHOG_KEY`, optional `VITE_POSTHOG_HOST`

## Event Coverage (Gameplay)

Examples:
- `game_ready_shown`
- `game_start`
- `score_increment`
- `game_over`
- `restart`
- `mute_toggle`

## Privacy Requirements

- No provider should emit before consent is granted.
- iOS App Store builds must keep consent-gated behavior.
- If any configured provider qualifies as tracking, ATT handling is required in the native shell.
