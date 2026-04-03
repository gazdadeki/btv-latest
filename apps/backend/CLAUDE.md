# Backend (NestJS API)

## Module Structure

All modules in `src/` registered in `app.module.ts`. Key modules:
auth, games, reservations, schedules, streams, subscriptions, stripe, websocket, users, wallet, firebase, email, admin, audit, activity, cache, common, config, database, downloads, messages, players, scheduler, statistics, tutorials, verification

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

## Streams

- A **Stream** groups games from a single session, decoupling them from calendar dates (solves timezone issues)
- Only one active (non-ENDED) stream at a time
- Lifecycle: `PENDING` → `LIVE` → `ENDED` (admin activates/ends manually)
- Scheduler auto-creates a stream when generating games; auto-ends stale streams
- Admin endpoints: `GET /admin/streams/active`, `PUT /admin/streams/:id/activate`, `PUT /admin/streams/:id/end`, `PUT /admin/streams/:id/url`
- Stream URL (moved from schedule) used in notifications
- Mobile app shows active stream's games instead of "today's games"

## Schedules

- Multiple active schedules allowed if date ranges don't overlap
- Overlap validation on create/update; `forceDeactivateOverlapping` flag to auto-deactivate conflicting schedules
- `requiresConfirmation` (default false): when off, reservations auto-confirm on creation
- Confirmation-related fields (`confirmationWindowMinutes`, `instantReservationCost`, `reminderMinutesBefore`) only apply when `requiresConfirmation` is true
- Team names always default to Sentinel (A) / Scourge (B) via `TEAM_NAMES` constant
- `slotsPerGame` hardcoded to 10; `firstGameStartTime` is informational ("estimated stream start")
- Removed: `spacingAfterFinishMinutes`, `autoStartNextAfterMinutes`, `url` (moved to streams)

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
