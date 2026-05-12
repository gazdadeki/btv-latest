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
- CORS: `CORS_ORIGINS` env var (comma-separated) — required at boot, validated in `EnvValidationService`
- `app.set('trust proxy', 1)` — trusts exactly one proxy hop (nginx in prod, Next.js dev server in dev). Bump the value if you add a load balancer in front
- Stripe webhook raw body handling at `/api/v1/stripe/webhook`
- Swagger at `/api` in non-production
- `.env` loaded explicitly at startup; process exits on failure
- Required env vars validated via `EnvValidationService`

## WebSocket

- Socket.IO gateway for real-time game status broadcasts
- WebSocket CORS uses the same `CORS_ORIGINS` env var (required at boot — same allowlist gates HTTP API and Socket.IO)

## Database

- TypeORM DataSource with MySQL
- `synchronize` controlled by `TYPEORM_SYNCHRONIZE` env var (false in production)
- All datetimes stored as UTC (`timezone: 'Z'`)
- Migrations in `src/database/migrations/`

## Pagination

- List endpoints expected to grow use backend pagination. Base DTOs in `src/common/dto/pagination.dto.ts`: `PaginationDto` (page, limit; max limit 100) and `SearchPaginationDto extends PaginationDto` (adds optional `search`). Global `ValidationPipe` has `forbidNonWhitelisted: true`, so controllers must accept **one** merged DTO per endpoint that extends the pagination base and declares every query param (see `ListUsersQueryDto`, `ListGamesQueryDto`). Passing `@Query() pagination: PaginationDto` plus separate `@Query('x')` params will 400 on unknown fields.
- Response shape is the shared `Paginated<T>` from `@btv/types`: `{ data: T[]; total: number; page: number; limit: number }`. Service builds a `QueryBuilder` + `skip/take/getManyAndCount()`.
- Currently paginated: `GET /admin/users` (with server-side LIKE search on email/username/id), `GET /admin/games`, `GET /admin/streams` (with LIKE search on title), plus pre-existing audit, wallet, stripe payments. Messages module retains its legacy `{ messages, total, ... }` shape.

## Streams

- A **Stream** groups games from a single streaming session. It is the **source of truth for game ownership** — every game belongs to exactly one stream, and the stream belongs to the schedule whose cron run spawned it.
- Lineage: `game → stream → schedule`. `games` table no longer carries a `scheduleId` column; navigate via `game.stream.schedule` (or join `INNER JOIN streams ON game.streamId = streams.id` and filter on `streams.scheduleId`).
- A session can cross midnight: a manual game added at 02:00 while last night's stream is still LIVE belongs to **that** stream (its `scheduledStartTime` is set to the active stream's `createdAt`, so it groups with the rest of the session on the calendar). Schedule remains tied to a UTC calendar day; stream is not.
- Only one active (non-ENDED) stream at a time
- Lifecycle: `PENDING` → `LIVE` → `ENDED`
- Stream has `title` (auto-generated as "Let's GO - dd.mm.yyyy" on creation, editable when starting) and `url` (required when starting)
- Scheduler auto-creates a stream with default title when generating games; auto-ends stale streams and auto-cancels their CREATED/OPEN games (with refunds)
- **Primary**: `PUT /admin/streams/:id/start` — sets title + URL and activates (PENDING → LIVE) in one step via `StartStreamDto`. This is what the admin UI uses.
- **Legacy** (kept for API compat): `PUT /admin/streams/:id/activate` (activate without title/URL), `PUT /admin/streams/:id/url` (set URL only)
- Other endpoints: `GET /admin/streams` (list recent), `GET /admin/streams/active`, `PUT /admin/streams/:id/end`
- Admin UI: persistent stream controls in header bar + dashboard widget
- Mobile app shows active stream's games instead of "today's games"

## Manual game creation

- Single-game admin path (`POST /admin/games`, `createManually`) requires an **active stream**. If none, returns 400. The new game is attached to that stream; no `scheduleId` is accepted or needed from the client.
- `scheduledStartTime` mirrors the active stream's `createdAt` — i.e., a manual game created at 02:00 next day still carries last night's stream date, so it groups with that stream's other games in admin views.

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
- **Scheduler locks**: DB-based locks prevent duplicate cron execution across instances. On startup, stale locks from dead processes are auto-cleared. Lock TTL is 120s (configurable via `SCHEDULER_LOCK_TTL_SECONDS`)

## Game Statuses

- `CREATED` → `OPEN` → `IN_PROGRESS` → `FINISHED` (or `CANCELLED` from CREATED/OPEN/IN_PROGRESS)
- Both `CREATED` and `OPEN` games can be started by admin (transition to `IN_PROGRESS`)
- `IN_PROGRESS` games can be **remade** back to `OPEN` via `PUT /admin/games/:id/remake` (preserves all reservations)
- Games without `reservationOpenTime` are created directly as `OPEN`
- Games endpoint accepts `streamId` query param for filtering
- `allowMultipleReservations` flag (default false) bypasses per-stream reservation limits AND gold-only slot restrictions for a game. Toggling this on clears `isGoldOnly` on all slots.

## Reservation Limits (Stream-Scoped)

- **One slot per game per player** — always enforced, no exceptions (checked via both reservations table and slots table)
- Reservation limits are scoped **per stream**, not global — each new stream resets the allowance
- Free users: max 1 active reservation per stream
- Gold users: max 2 active reservations per stream, must be **at least 2 games apart** (by gameIndex)
- Games with `allowMultipleReservations=true` bypass stream-level limits and gold-only slot restrictions (but NOT one-slot-per-game)

## Calendar

- A real game is visible in its day's calendar slot when either (a) its status is `FINISHED`, or (b) its owning stream is still PENDING/LIVE. Once the stream ends, `cancelGamesForEndedStreams` flips any leftover CREATED/OPEN games to CANCELLED, so the only thing remaining on past days is FINISHED.
- The stream-active exception is what makes the **cross-midnight** case work: a manual game added at 01:00 next day inherits `scheduledStartTime` from the active stream's `createdAt` (the previous calendar day), so it groups visually with the rest of that stream's games, and stays visible because its stream hasn't ended yet.
- Manually created games use `utcStartOfDay(activeStream.createdAt) + schedule.firstGameStartTime` as `scheduledStartTime` — matches the time the cron uses for bulk-generated games on that stream's day. This keeps a manual game sorted alongside its sibling cron games (stable sort by time + insertion order puts it last in the bucket) rather than at the top by the stream's earlier `createdAt`. Calendar bucketing still keys by the stream's day, so a 02:00 manual add still lands on the previous day's calendar slot.
- Future days never show real games (cron hasn't generated them yet) — only pseudo-games derived from schedule recurrence patterns.

## Admin Auto-Assignment

- Admin (schedule creator) is always pre-assigned to slot 1 of every game for free (no coin cost)
- Applies to both cron-generated and manually created games
- Pre-assignment creates a confirmed reservation with 0 cost (both cron and manual game creation)
- Admin pre-assign cannot place free users into gold-only slots (unless game is unrestricted)
- Kicking a user or player leaving also clears pre-assignment fields
- `username` is required on all users (used for display in slot reservations)

## Push Notifications (Firebase)

- Only **one push notification**: stream start (when admin starts a stream → LIVE)
- Sent via `FirebaseService.sendBroadcastNotification()` to all registered device tokens
- Fire-and-forget: notification failure does not block stream start
- `NotificationType` enum has a single value: `STREAM_START`
- Device token registration: `POST /api/v1/players/devices/register` (JWT-protected)
- `FIREBASE_SERVICE_ACCOUNT_PATH` env var required for backend to send notifications
- Game start/finish events use WebSocket broadcasts only (no push notifications)
