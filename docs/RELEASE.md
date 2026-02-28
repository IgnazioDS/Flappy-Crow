# Release Process

This repository uses `main` as canonical baseline.

## Branch Strategy

- `main`: release baseline branch
- `branch/*`: feature/fix branches

## Tag Strategy

For each release `X.Y.Z`:

- `vX.Y.Z`
- `vX.Y.Z-mainline`

Both tags must point to the same commit at the tip of `main`.

## Release Checklist

1. Ensure branch is up to date and clean.
2. Run verification:

```bash
npm ci
npm run test
npm run lint
npm run build
npm run preview
```

3. Update version + changelog:

```bash
npm version X.Y.Z --no-git-tag-version
```

Edit `CHANGELOG.md` with dated notes.

4. Commit release metadata:

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "docs: changelog + version bump"
```

5. Merge branch to `main`.
6. Create/update release tags at `main` tip:

```bash
git tag -f vX.Y.Z
git tag -f vX.Y.Z-mainline
```

7. Push branch and tags:

```bash
git push origin main
git push origin vX.Y.Z vX.Y.Z-mainline
```

Use `--force-with-lease` for tags only if correcting an already-pushed wrong tag target.

## Post-Release Verification

- Confirm GitHub Actions CI on `main` is green.
- Confirm Pages deploy succeeded.
- Confirm version and changelog match release tag.
