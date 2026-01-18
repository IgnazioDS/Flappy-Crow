# iOS App Shell (Capacitor) Plan

This project remains static-first. The iOS shell wraps the existing `dist/` build
without changing web deployment.

## Packaging workflow (Capacitor)

1) Build the web bundle:

```bash
npm run build
```

2) Initialize Capacitor (one-time):

```bash
npx cap init flappy-crow com.yourorg.flappycrow --web-dir=dist
```

3) Add the iOS platform (one-time):

```bash
npx cap add ios
```

4) Sync web assets into the native project:

```bash
npx cap sync ios
```

5) Open in Xcode and run:

```bash
npx cap open ios
```

## Capacitor config template

Create `capacitor.config.ts` at the repo root:

```ts
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.yourorg.flappycrow',
  appName: 'Flappy Crow',
  webDir: 'dist',
  bundledWebRuntime: false,
}

export default config
```

## iOS UX checklist

- Safe areas: ensure score, settings, and overlays respect notches.
- Touch targets: settings rows and buttons remain easy to tap on small screens.
- Aspect ratios: validate from iPhone SE through Pro Max.
- Haptics: optional only; respect reduced-motion and user toggles.
- Background/foreground: pause/resume behavior is correct.

## App Store compliance checklist

- Telemetry must be opt-in and disabled without consent.
- If any telemetry qualifies as tracking, require ATT before enabling.
- Privacy policy must be accessible in-app.
- Add a privacy manifest if any third-party SDKs are included in the iOS build.

## In-app privacy policy access plan

Goal: Make the privacy policy reachable in 2 taps without leaving the app shell.

Plan:
- Add a "Privacy Policy" row to the Settings panel that opens an in-app web view.
- Provide a fallback: open the policy in the system browser if web view fails.
- Keep the URL in a single config constant to avoid drift between web/iOS builds.

Placement:
- Settings panel, below Analytics and above Theme.
- Use existing button styling and tap targets.

Requirements:
- Policy URL must be HTTPS and hosted on a stable domain.
- Policy is readable on mobile (no tiny fonts or hidden sections).
- No tracking occurs before consent, regardless of policy view.

## No-backend best practices

- Offline-first: local storage only; no required network calls.
- Replay storage should be bounded to prevent large local data growth.
