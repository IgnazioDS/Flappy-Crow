# Release Process

This project follows semantic versioning (MAJOR.MINOR.PATCH).

## Checklist

1) Create a release branch or work on `main` with a clean working tree.
2) Update `package.json` and `package-lock.json` to the new version.
3) Update `CHANGELOG.md` with the new release notes and date.
4) Run the full verification suite:

```bash
npm ci
npm run test
npm run lint
npm run build
npm run preview
```

4b) iOS shell smoke test (if preparing App Store build):

```bash
npm run build:ios
npm run cap:sync:ios
npm run cap:open:ios
```

Run on a simulator: verify touch input, pause/resume, and Privacy Policy link.

5) Run the App Store readiness pass (V6):

- Review `docs/V6_APP_STORE_READINESS.md`.
- Ensure release builds do not set `VITE_ART_QA`, `VITE_E2E`, or `VITE_TELEMETRY_CONSOLE`.

1) Commit the release:

```bash
git add package.json package-lock.json CHANGELOG.md

git commit -m "I release vX.Y.Z"
```

1) Tag the release and push commits + tags:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin main --tags
```

1) Create a GitHub Release using the `vX.Y.Z` tag and paste the notes from `CHANGELOG.md`.
2) Verify the GitHub Pages deploy and run a quick smoke test in the live build.

## Release Notes Template

```markdown
## vX.Y.Z

### Added
- ...

### Changed
- ...

### Fixed
- ...
```
