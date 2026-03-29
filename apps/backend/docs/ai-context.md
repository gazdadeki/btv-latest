# AI Context — BTV Backend (NestJS API)

This document records verified, backend-specific facts. For the full monorepo context, see the root `docs/ai-context.md`.

## Project overview

- NestJS 11 API server, part of the BTV Turborepo monorepo.
- Serves both the admin dashboard (`apps/web`) and the player PWA (`apps/mobile`) via a shared REST API and WebSocket gateway.

## Tech stack (from `package.json`)

- Runtime: Node.js 22+
- Framework: NestJS 11, TypeScript
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

- `src/` — NestJS application (feature modules per domain, all registered in `app.module.ts`).
- `public/` — static assets (`.well-known` deep-linking files).
- `docs/` — backend-specific documentation and ADRs.
- `test/` — Jest e2e config.

## Runtime entrypoint & HTTP behavior (from `src/main.ts`)

- `.env` is loaded explicitly at startup; process exits if it fails.
- Required env vars are validated on boot via `EnvValidationService`.
- Global request validation uses `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`.
- Global prefix is `api` with URI versioning enabled (`/api/v1/...` by default).
- CORS: configurable via `CORS_ORIGINS` env var (comma-separated), defaults to reflect-origin.
- WebSocket CORS: same `CORS_ORIGINS` env var, defaults to `*`.
- Static assets served from `public/` (for `.well-known` deep-linking files).
- Stripe webhook uses raw body handling at `/api/v1/stripe/webhook`.
- Swagger is available at `/api` in non-production environments.
- All `DATETIME` columns treated as UTC (`timezone: 'Z'` in TypeORM config).
- Graceful shutdown handlers are registered for SIGINT/SIGTERM and unhandled errors.

## Configuration

- Environment variables are defined in `env.example`.
- Required vars validated at startup (from `EnvValidationService`):
  - `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
  - `JWT_SECRET`, `JWT_ACCESS_TOKEN_EXPIRY`, `JWT_REFRESH_TOKEN_EXPIRY`
  - `PORT`, `NODE_ENV`
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Optional config includes Stripe publishable key, Firebase service account path, and email provider settings.

## Data access (from `src/database/data-source.ts`)

- TypeORM `DataSource` uses MySQL and loads entities/migrations from `src/`.
- `synchronize` is controlled by `TYPEORM_SYNCHRONIZE` (defaults to false); logging is enabled in development.

## Common scripts

- `npm run start:dev` — dev server
- `npm run migration:run` / `migration:revert` / `migration:generate` — database migrations
- `npm run migration:reset` — dev-only database reset (requires confirmation flag)
- `npm run test:e2e` — end-to-end tests
