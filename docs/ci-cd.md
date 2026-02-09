# CI/CD (GitHub Actions)

This project uses GitHub Actions for CI and release automation.

## Workflows

- `CI` (`.github/workflows/ci.yml`): runs on PRs targeting `test` or `main`.
  - Lint (`npm run lint:check`)
  - Unit tests (`npm test`)
  - E2E tests against MySQL service (`npm run test:e2e`)
  - Frontend builds (admin + public UIs)
- `Release` (`.github/workflows/release.yml`): runs on pushes to `main`.
  - Uses release-please for SemVer + changelog.
  - Builds backend + UIs when a release is created.
  - Uploads a zip artifact to the GitHub Release.
- `Auto-merge release PRs` (`.github/workflows/auto-merge-release-pr.yml`):
  - Enables GitHub auto-merge for release-please PRs.

## Required repository settings

- Branch protection for `main` and `test`:
  - Require the `CI` workflow checks to pass.
  - Require PRs (no direct pushes).
- Enable **Allow auto-merge** (Settings → General → Pull Requests).
- If using GitHub Actions to enable auto-merge, allow Actions to create and approve PRs
  (Settings → Actions → General → Workflow permissions).
- Enforce Conventional Commit PR titles (recommended for release-please).

## Required secrets

- `RELEASE_PLEASE_TOKEN`: PAT or GitHub App token with:
  - `contents: write`
  - `pull_requests: write`

## Optional CI secrets

The CI workflow accepts these repository secrets and falls back to safe defaults
when they are not set:

- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_DATABASE`
- `MYSQL_ROOT_PASSWORD`
- `JWT_SECRET`
- `JWT_ACCESS_TOKEN_EXPIRY`
- `JWT_REFRESH_TOKEN_EXPIRY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Release artifact contents

The zip attached to a GitHub Release includes:

- `dist/` (Nest build output)
- `public/` (built admin/public UIs)
- `package.json`, `package-lock.json`
- `env.example`
- `README.md`
