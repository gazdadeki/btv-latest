# AI Context — BTV

This document records verified, repo-based facts to avoid repeated discovery in future sessions.

## Project overview
- Event scheduling and reservation system built with NestJS and TypeScript.
- Key feature areas include auth, scheduling, reservations, subscriptions, Stripe payments, WebSocket updates, Firebase notifications, audit logging, and admin APIs. (See `README.md`.)

## Tech stack (from `package.json` / `README.md`)
- Runtime: Node.js 22+
- Framework: NestJS 11
- Language: TypeScript
- ORM/DB: TypeORM with MySQL (`mysql2`)
- Cache: node-cache (in-memory)
- Auth: JWT (`@nestjs/jwt`, `passport-jwt`)
- Realtime: Socket.IO (`@nestjs/platform-socket.io`, `socket.io`)
- Payments: Stripe
- Notifications: Firebase Admin
- Docs: Swagger (`@nestjs/swagger`)
- Validation: `class-validator`, `class-transformer`
- Email: Nodemailer

## Repository layout
- `src/` — NestJS application (feature modules per domain).
- `public/` — static assets, including admin UI pages under `public/admin/`.
- `frontend/admin-ui/` — Vite-powered admin SPA that builds into `public/admin/`.
- `test/` — Jest e2e config.
- `client/` — present but ignored by `.gitignore` and currently empty in this workspace.

## Admin UI (build/runtime notes)
- Admin UI assets are built from `frontend/admin-ui` into `public/admin/`.
- Legacy dependencies (jQuery, Bootstrap, AdminLTE, DataTables) are bundled locally to avoid CDN/runtime-order issues.

## Runtime entrypoint & HTTP behavior (from `src/main.ts`)
- `.env` is loaded explicitly at startup; process exits if it fails.
- Required env vars are validated on boot via `EnvValidationService`.
- Global request validation uses `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`.
- Global prefix is `api` with URI versioning enabled (`/api/v1/...` by default).
- CORS is enabled with credentials and permissive origin.
- Static assets served from `public/`.
- Special routes (registered before the global prefix):
  - `GET /downloads`
  - `GET /reset-password`
  - `GET /.well-known/assetlinks.json`
  - `GET /.well-known/apple-app-site-association`
- Stripe webhook uses raw body handling at `/api/v1/stripe/webhook`.
- Swagger is available at `/api` in non-production environments.
- Graceful shutdown handlers are registered for SIGINT/SIGTERM and unhandled errors.

## Configuration
- Environment variables are defined in `env.example`.
- Required vars validated at startup (from `EnvValidationService`):
  - `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
  - `JWT_SECRET`, `JWT_ACCESS_TOKEN_EXPIRY`, `JWT_REFRESH_TOKEN_EXPIRY`
  - `PORT`, `NODE_ENV`
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Optional config includes Stripe publishable key, Firebase service account path, and email provider settings.

## Environments
- The app expects a remote/shared MySQL or Percona instance for dev/test/prod.
- Test runs require a dedicated database and truncate tables between tests.

## Data access (from `src/database/data-source.ts`)
- TypeORM `DataSource` uses MySQL and loads entities/migrations from `src/`.
- `synchronize` is controlled by `TYPEORM_SYNCHRONIZE` (defaults to false); logging is enabled in development.

## Common scripts
- `npm run start:dev` — dev server
- `npm run migration:run` / `migration:revert` / `migration:generate` — database migrations
- `npm run migration:reset` — dev-only database reset (requires confirmation flag)
- `npm run test:e2e` — end-to-end tests

## Known doc gaps
- `README.md` references `INSTALLATION.md`, `setup-dev.ps1`, and `setup-dev.sh`, but these files are not present in the workspace.
