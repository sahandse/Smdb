# SMDB

SMDB is a single-page IMDb helper deployed with GitHub Pages.

## Source of truth

- `index.html` — the application UI and core browser logic.
- `public/runtime-fixes.js` — defensive runtime fixes for image conversion, URL validation and browser edge cases.
- `scripts/smoke-check.mjs` — validates the generated Pages output before deployment.
- `vite.config.ts` — GitHub Pages build configuration.

The old duplicate `src/` TypeScript application was removed because it was not used by the deployed UI and could fail CI independently of the real application.

## Local development

```bash
npm ci
npm run dev
```

## Production verification

```bash
npm ci
npm run build
# Runtime fixes are injected by the Pages workflow.
npm test
```

## Deployment

Pushes to the default development branch or `main` trigger `.github/workflows/deploy.yml`. The workflow builds the site, injects `runtime-fixes.js`, runs smoke checks, and only then uploads the GitHub Pages artifact.

## Maintenance rule

Do not create a second application implementation beside `index.html`. New UI/feature work should modify the deployed source of truth and extend the smoke test when a new critical DOM section is added.
