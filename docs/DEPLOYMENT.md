# Deployment

Flappy Crow is a static Vite build. Deploy `dist/`.

## Local Production Smoke

```bash
npm run build
npm run preview
```

## GitHub Pages (Primary)

Workflow: `.github/workflows/deploy.yml`

- Trigger: push to `main`
- Build command: `npm run build`
- Publish artifact: `dist/`
- Base path uses `VITE_BASE=/<repo>/`

Set GitHub Pages source to **GitHub Actions**.

## Other Hosts

- Netlify: build `npm run build`, publish `dist/`
- Vercel: build `npm run build`, output `dist/`
- Any static host: upload `dist/`

## Environment Variables

- `VITE_BASE` for non-root subpath deployments
- `VITE_PRIVACY_POLICY_URL` for in-app privacy link

If deploying at root domain, leave `VITE_BASE` unset.

## Cache Guidance

- Cache hashed assets aggressively
- Keep `index.html` short-cache or no-cache
