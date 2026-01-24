# V6 App Store Readiness Checklist

Use this checklist before submitting a V6 build to the App Store.

## App Store Assets

- [ ] App icon set updated (see `docs/APP_STORE_ASSETS.md`).
- [ ] Launch screen storyboard and splash images updated (see `docs/APP_STORE_ASSETS.md`).
- [ ] Store screenshots captured for all required device sizes (see `docs/app-store/screenshots/README.md`).
- [ ] App preview video recorded (optional but recommended).

## App Store Listing

- [ ] App name, subtitle, keywords, and category set.
- [ ] Support URL and marketing URL updated (see `docs/APP_STORE_LISTING.md`).
- [ ] Privacy Policy URL set and reachable over HTTPS (see `docs/APP_STORE_LISTING.md`).
- [ ] Age rating questionnaire completed.

## Privacy + Compliance

- [ ] Telemetry remains opt-in; no events before consent.
- [ ] ATT prompt added if telemetry qualifies as tracking.
- [ ] Privacy manifest included and matches SDK usage.
- [ ] Data collection disclosures match in-app behavior.

## Monetization

- [ ] IAP product IDs match App Store Connect:
  - [ ] `com.flappycrow.remove_ads`
  - [ ] `com.flappycrow.supporter_pack`
- [ ] Remove Ads and Supporter Pack tested via sandbox.
- [ ] Restore purchases flow confirmed (when provider is wired).
- [ ] No pay-to-win mechanics or gameplay impact.

## Build Hardening

- [ ] `VITE_ART_QA`, `VITE_E2E`, `VITE_TELEMETRY_CONSOLE` are **not** set in release builds.
- [ ] Debug overlays and dev menus are absent in production.
- [ ] Determinism tests pass (`npm run test:e2e`).
- [ ] Full release suite passes (`npm run test`, `npm run lint`, `npm run build`).

## In-App QA

- [ ] Safe area and UI layout verified on small + large devices.
- [ ] Pause/resume works when backgrounding the app.
- [ ] Daily reward claim logic works across days.
- [ ] Shop purchases persist and cosmetics apply correctly.
