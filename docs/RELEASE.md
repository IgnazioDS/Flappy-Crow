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

5) Commit the release:

```bash
git add package.json package-lock.json CHANGELOG.md

git commit -m "I release vX.Y.Z"
```

6) Tag the release and push commits + tags:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin main --tags
```

7) Create a GitHub Release using the `vX.Y.Z` tag and paste the notes from `CHANGELOG.md`.
8) Verify the GitHub Pages deploy and run a quick smoke test in the live build.

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
