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
- Lifecycle: `PENDING` → `LIVE` → `ENDED`
- Stream has `title` (auto-generated as "Let's GO - dd.mm.yyyy" on creation, editable when starting) and `url` (required when starting)
- Scheduler auto-creates a stream with default title when generating games; auto-ends stale streams and auto-cancels their CREATED/OPEN games (with refunds)
- **Primary**: `PUT /admin/streams/:id/start` — sets title + URL and activates (PENDING → LIVE) in one step via `StartStreamDto`. This is what the admin UI uses.
- **Legacy** (kept for API compat): `PUT /admin/streams/:id/activate` (activate without title/URL), `PUT /admin/streams/:id/url` (set URL only)
- Other endpoints: `GET /admin/streams` (list recent), `GET /admin/streams/active`, `PUT /admin/streams/:id/end`
- Admin UI: persistent stream controls in header bar + dashboard widget
- Mobile app shows active stream's games instead of "today's games"

## Schedules

- Multiple active schedules allowed if date ranges don't overlap
- Overlap validation on create/update; `forceDeactivateOverlapping` flag to auto-deactivate conflicting schedules
- Cannot delete a schedule while its stream is active (PENDING or LIVE)
- Start/end date validation: start date cannot be after end date
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

- `CREATED` → `OPEN` → `IN_PROGRESS` → `FINISHED` (or `CANCELLED` from CREATED/OPEN/IN_PROGRESS)
- Both `CREATED` and `OPEN` games can be started by admin (transition to `IN_PROGRESS`)
- `IN_PROGRESS` games can be **remade** back to `OPEN` via `PUT /admin/games/:id/remake` (preserves all reservations)
- Games without `reservationOpenTime` are created directly as `OPEN`
- Games endpoint accepts `streamId` query param for filtering
- `allowMultipleReservations` flag (default false) bypasses per-stream reservation limits for a game

## Reservation Limits (Stream-Scoped)

- Reservation limits are scoped **per stream**, not global — each new stream resets the allowance
- Free users: max 1 active reservation per stream
- Gold users: max 2 active reservations per stream, must be **at least 2 games apart** (by gameIndex)
- Games with `allowMultipleReservations=true` bypass all limits

## Calendar

- Past days only show `FINISHED` games; CREATED/OPEN/CANCELLED are hidden
- Manually created games use the stream's creation date as `scheduledStartTime` (midnight-safe)

## Admin Auto-Assignment

- Admin (schedule creator) is always pre-assigned to slot 1 of every game for free (no coin cost)
- Applies to both cron-generated and manually created games
- Pre-assignment creates a confirmed reservation with 0 cost
- `username` is required on all users (used for display in slot reservations)
