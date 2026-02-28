# iOS (Capacitor)

The repository includes an `ios/` project for Capacitor packaging.
Web remains the source of truth; iOS wraps the built web app.

## Prerequisites

- Xcode installed
- CocoaPods installed
- Node version aligned with project (`.nvmrc`)

## Workflow

```bash
npm run build:ios
npm run cap:sync:ios
npm run cap:open:ios
```

Or run combined smoke prep:

```bash
npm run ios:smoke
```

## Build Behavior

- `build:ios` sets Vite base to `./` for Capacitor file URLs.
- `cap:sync:ios` copies web assets and plugin metadata into `ios/`.

## Release Notes

- Keep telemetry consent behavior intact for App Store submissions.
- Ensure privacy policy URL is configured (`VITE_PRIVACY_POLICY_URL`).
- Validate safe areas and touch targets on small and large iPhones.

## Not In Scope Here

- This document does not replace Apple legal/compliance requirements.
- ATT/privacy-manifest details must be validated against active SDK usage at submission time.
