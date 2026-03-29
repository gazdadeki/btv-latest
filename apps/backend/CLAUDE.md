# Backend (NestJS API)

## Module Structure

All modules in `src/` registered in `app.module.ts`. Key modules:
auth, games, reservations, schedules, subscriptions, stripe, websocket, users, wallet, firebase, email, admin, audit, activity, cache, common, config, database, downloads, messages, players, scheduler, statistics, tutorials, verification

## Architecture

- Controllers: HTTP handling only
- Services: business logic and data access
- DTOs with class-validator decorators for all incoming data
- Guards and interceptors for auth/security
- Constructor injection for DI

## Runtime (main.ts)

- Global prefix: `api` with URI versioning (`/api/v1/...`)
- CORS: configurable via `CORS_ORIGINS` env var (comma-separated), defaults to reflect-origin
- Stripe webhook raw body handling at `/api/v1/stripe/webhook`
- Swagger at `/api` in non-production
- `.env` loaded explicitly at startup; process exits on failure
- Required env vars validated via `EnvValidationService`

## WebSocket

- Socket.IO gateway for real-time game status broadcasts
- WebSocket CORS uses same `CORS_ORIGINS` env var, defaults to `*`

## Database

- TypeORM DataSource with MySQL
- `synchronize` controlled by `TYPEORM_SYNCHRONIZE` env var (false in production)
- All datetimes stored as UTC (`timezone: 'Z'`)
- Migrations in `src/database/migrations/`

## Scheduler & Game Generation

- Cron runs every minute (`scheduler.service.ts`)
- Game generation is **idempotent**: cron checks for existing games before creation, skips if present
- Only admin force-regenerate (calendar "Generate" button) cancels existing CREATED games and recreates
- Schedule `gameCreationTime` is stored as UTC — cron compares current UTC time against it
- Default schedule recurrence: all 7 days `[0,1,2,3,4,5,6]` (Sun-Sat)

## Game Statuses

- `CREATED` → `OPEN` → `IN_PROGRESS` → `FINISHED` (or `CANCELLED` at any point)
- Games without `reservationOpenTime` are created directly as `OPEN`
- Mobile and admin filters include all statuses; `CANCELLED` excluded by default
