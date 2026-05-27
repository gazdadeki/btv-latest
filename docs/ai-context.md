# AI Context — BTV (Turborepo Monorepo)

This document records verified, repo-based facts to avoid repeated discovery in future sessions.

## Project overview

- Event scheduling and reservation system with three separate applications: an admin dashboard, a player-facing PWA, and a shared backend API.
- Key feature areas: auth, scheduling, reservations, subscriptions, Stripe payments, WebSocket real-time updates, Firebase push notifications, audit logging, admin APIs, messaging, tutorials.

## Tech stack

- Runtime: Node.js 22+
- Monorepo: Turborepo (`turbo` v2), npm workspaces
- Backend: NestJS 11, TypeScript, TypeORM (MySQL), JWT auth, Socket.IO, Stripe, Firebase Admin, Nodemailer
- Web (admin): Next.js 15 (App Router), React 19, Tailwind CSS v4, shadcn/ui patterns, TanStack Table, Socket.IO client, Sonner (toasts)
- Mobile (PWA): Next.js 15 (App Router), React 19, Tailwind CSS v4, `@ducanh2912/next-pwa` v10, TanStack Query v5, Stripe JS, Socket.IO client
- Shared packages: `@btv/types` (shared TypeScript interfaces/enums), `@btv/tsconfig` (shared TS configs)

## Repository layout

```text
btv/
├── apps/
│   ├── backend/                  # NestJS API server (port 3000)
│   │   ├── src/                  # NestJS feature modules (see Backend modules section)
│   │   ├── public/               # Static assets (.well-known, etc.)
│   │   ├── docs/                 # Backend-specific docs and ADRs
│   │   └── .env                  # Backend environment variables
│   ├── web/                      # Next.js admin dashboard (port 3001)
│   │   ├── src/app/
│   │   │   ├── admin/            # Admin dashboard (authenticated)
│   │   │   ├── downloads/        # Public downloads page
│   │   │   └── reset-password/   # Public password reset
│   │   ├── src/lib/              # API client, auth, websocket, utils
│   │   ├── src/components/       # Shared UI components
│   │   └── .env.local            # Web environment variables
│   └── mobile/                   # Next.js 15 PWA — player-facing app (port 3002)
│       ├── src/app/
│       │   ├── (app)/            # Authenticated player routes
│       │   │   ├── home/
│       │   │   ├── games/
│       │   │   ├── messages/
│       │   │   ├── settings/
│       │   │   ├── shop/
│       │   │   └── tutorials/
│       │   ├── (auth)/           # Public auth routes
│       │   │   ├── login/
│       │   │   ├── register/
│       │   │   ├── verification/
│       │   │   ├── forgot-password/
│       │   │   └── reset-password/
│       │   ├── install/          # Public PWA install / landing page (ungated)
│       │   └── offline/          # Offline fallback document (ungated)
│       ├── src/lib/              # API client, auth utils, auth context
│       ├── src/middleware.ts     # Route protection (reads `user` cookie)
│       ├── public/icons/         # PWA icons (192, 512 + maskable) — gen via scripts/generate-icons.mjs
│       ├── scripts/              # generate-icons.mjs (placeholder PWA icon generator)
│       └── .env.local            # Mobile environment variables
├── packages/
│   ├── tsconfig/                 # Shared TypeScript configurations (base, nestjs, nextjs)
│   └── types/                    # Shared TypeScript types and enums (@btv/types)
├── docs/                         # Project-level documentation and AI memory files
├── deploy/                       # Production deployment configs (nginx example)
├── turbo.json                    # Turborepo task configuration
└── package.json                  # Root workspace config
```

## Dev workflow

- `npm run dev` — starts all three apps (backend + web + mobile) via Turbo
- `npm run dev:backend` — backend only
- `npm run dev:web` — admin web frontend only
- `npm run dev:mobile` — mobile PWA only
- `npm run build` — builds all apps
- Migration scripts are in `apps/backend/package.json`

## Backend modules (apps/backend/src/)

All modules registered in `app.module.ts`:

| Module          | Responsibility                                                                      |
| --------------- | ----------------------------------------------------------------------------------- |
| `activity`      | Activity tracking                                                                   |
| `admin`         | Admin-only APIs and services                                                        |
| `audit`         | Audit log recording and retrieval                                                   |
| `auth`          | JWT authentication, login, register, refresh, logout                                |
| `cache`         | In-memory caching layer                                                             |
| `common`        | Shared utilities (date utils, profanity filter, etc.)                               |
| `config`        | Environment variable loading and validation                                         |
| `database`      | TypeORM DataSource, migrations                                                      |
| `downloads`     | Download management                                                                 |
| `email`         | Email delivery (Mailtrap / console), templates                                      |
| `firebase`      | Firebase Admin SDK, push notifications (stream start only), device token management |
| `games`         | Game entity management, bulk creation, cancellation                                 |
| `messages`      | In-app messaging system                                                             |
| `players`       | Player-specific APIs                                                                |
| `reservations`  | Reservation creation and management                                                 |
| `scheduler`     | Cron jobs: game generation (idempotent), reservation opening, confirmation checking |
| `schedules`     | Schedule entity management                                                          |
| `statistics`    | Analytics and stats endpoints                                                       |
| `streams`       | Stream lifecycle (PENDING/LIVE/ENDED), groups games by session, admin endpoints     |
| `stripe`        | Stripe payments, webhooks                                                           |
| `subscriptions` | Subscription tiers and management                                                   |
| `tutorials`     | Tutorial content management                                                         |
| `users`         | User CRUD, profile management                                                       |
| `verification`  | Email verification codes                                                            |
| `wallet`        | Wallet / credit management                                                          |
| `websocket`     | Socket.IO gateway, real-time game status broadcasts                                 |

## Backend runtime behavior (apps/backend/src/main.ts)

- `.env` loaded explicitly at startup; process exits on failure.
- Required env vars validated via `EnvValidationService`.
- Global prefix: `api` with URI versioning (`/api/v1/...`).
- CORS: configurable via `CORS_ORIGINS` env var (comma-separated), defaults to reflect-origin.
- WebSocket CORS: same `CORS_ORIGINS` env var, defaults to `*`.
- Static assets served from `public/` (for `.well-known` deep linking files).
- Stripe webhook: raw body handling at `/api/v1/stripe/webhook`.
- Swagger: available at `/api` in non-production.
- All `DATETIME` columns treated as UTC (`timezone: 'Z'` in TypeORM config).

## Web frontend architecture (apps/web/)

- Next.js App Router serving the admin dashboard only.
- Routes:
  - `/admin/*` — admin dashboard (protected by middleware, requires `access_token` + `user` cookies)
  - `/downloads` — public downloads page
  - `/reset-password` — public password reset
  - `/` — redirects to `/admin`
- API calls proxied via Next.js rewrites (`/api/*` → backend)
- Cookie-based auth: middleware reads `access_token` (HTTP-only, set by backend) and `user` (client-readable, set after login); admin role enforced at login by the `api.login()` wrapper
- WebSocket connection via Socket.IO client (direct to backend)
- Admin pages: Dashboard, Calendar, Users, Schedules, Games, Subscriptions, Tutorials, Stripe Products, Messages, Audit Log

## Mobile frontend architecture (apps/mobile/)

- Next.js 15 App Router PWA — player-facing application.
- PWA: `@ducanh2912/next-pwa` — **disabled in development** (avoids stale service worker cache), enabled in production builds.
- Route groups:
  - `(app)/` — authenticated player routes, protected by middleware
  - `(auth)/` — public auth routes (login, register, verification, forgot/reset-password)
- Middleware (`src/middleware.ts`) reads the `user` client-side cookie:
  - Unauthenticated on protected route → redirect `/login`
  - Authenticated but `isVerified: false` → redirect `/verification`
  - Authenticated + verified on public auth route → redirect `/home`
  - `/install` and `/offline` → **fully ungated** (early-return), render for every auth state
- Installability: manifest with split `any`/`maskable` icons (generated by `scripts/generate-icons.mjs`); public `/install` landing page (Android `beforeinstallprompt` button captured app-wide via `lib/pwa-install.ts`; iOS Safari Add-to-Home-Screen instructions); offline fallback at `/offline`. iOS status bar uses `"black"` (not `black-translucent`, which would overlap content — no `safe-area-inset-top` padding exists).
- API calls proxied via Next.js rewrites (`/api/*` → backend)
- Auth state managed by `AuthProvider` / `useAuth()` (React context)
- Shares types via `@btv/types`

## Auth cookie strategy

Both apps share a single cookie namespace (no `admin_*` / `player_*` prefixes). Session isolation in production comes from separate domains; in localhost dev the apps share cookies across ports (a known dev-only limitation).

|                                  | Cookie name     | Set by   | Notes                                                  |
| -------------------------------- | --------------- | -------- | ------------------------------------------------------ |
| Access token (HTTP-only)         | `access_token`  | Backend  | ~15 min, JWT-signed, sent on every request             |
| Refresh token (HTTP-only)        | `refresh_token` | Backend  | 7 days, DB-backed (revocable via `refresh_tokens` row) |
| User indicator (client-readable) | `user`          | Frontend | JSON of `{id, email, username, role, isVerified, ...}` |

**Backend behavior:**

- `POST /api/v1/auth/login` and `POST /api/v1/auth/register` → set `access_token` + `refresh_token` cookies, return user JSON
- `POST /api/v1/auth/refresh` → rotates access token (and refresh token if near expiry), sets new cookies
- `POST /api/v1/auth/logout` → revokes the refresh token in DB, clears `access_token` / `refresh_token` / `user`, and defensively clears legacy `admin_*` / `player_*` cookies from older deploys
- `GET /api/v1/auth/websocket-token` → returns the `access_token` cookie value as JSON (used by Socket.IO handshake)
- JWT strategy (`jwt.strategy.ts`) → reads `access_token` from cookies, falls back to `Authorization: Bearer` header

**Role separation** is enforced client-side at login, not via cookie naming:

- `apps/web/src/lib/api.ts` `login()` wrapper rejects non-admin roles: calls `/auth/logout`, clears local cookies, throws "Admin access required"
- `apps/mobile/src/lib/api.ts` does NOT currently check role at login (documented gap — admins can log in to the player app as a player). Low impact; backend `RolesGuard` blocks admin actions either way.

## Account state: bans, voiding, usernames

- **Bans are not gated by a global guard.** `NotBannedGuard` was removed from the messages/players/stripe/subscriptions/tutorials controllers and the WebSocket gateway; a banned user can log in and use non-reservation features. The one enforced consequence is **cannot reserve**, checked in `ReservationsService.create` (temp-ban-aware via `bannedUntil`). Admin ban auto-releases the user's active-stream reservations; a daily cron clears elapsed temp bans. Do not assume an endpoint blocks banned users — only the reserve path does.
- **Voided users** (`voidedAt` set) are rejected at login / refresh / JWT validation / password reset, and voiding revokes their refresh tokens.
- **`username` is NOT globally unique.** Uniqueness is "one active account per username," enforced by a STORED generated column `usernameActive` + unique index `UQ_users_username_active` (MySQL lacks partial unique indexes); voiding frees the name. Players self-change via `PUT /auth/me/username` (verified + not-banned). See `apps/backend/CLAUDE.md` → Accounts for details.

## Date & Time Convention

This convention applies to every future change across the entire codebase. Deviations are bugs.

### Storage — backend

- All `DATETIME` columns are stored and read as UTC. TypeORM is configured with `timezone: 'Z'`.
- `DATETIME` entity columns (e.g. `scheduledStartTime`, `reservedAt`, `bannedUntil`) use JavaScript `Date` objects — always UTC.
- Schedule `time` columns (`firstGameStartTime`, `gameCreationTime`, `reservationOpenTime`) are `HH:MM` strings and are treated as **UTC times** by all backend logic.
- Schedule `date` columns (`scheduleStartDate`, `scheduleEndDate`) are `YYYY-MM-DD` strings and are treated as **UTC midnight** by all backend logic. The backend parses them by appending `T00:00:00Z`.

### Backend code rules

- Always use UTC JS methods: `setUTCHours()`, `setUTCMinutes()`, `setUTCDate()`, `setUTCMonth()`, `setUTCFullYear()`, `getUTCDate()`, `getUTCDay()`, `getUTCMonth()`, `getUTCFullYear()`.
- Never use local-timezone equivalents (`setHours()`, `setMinutes()`, `setDate()`, `getDate()`, `getDay()`, `getMonth()`) for date normalization or comparison.
- For date-only strings (e.g., ONCE recurrence `onceDate`), parse with string split (`"2026-03-29".split("-")`), not `new Date()` which applies local-timezone interpretation.
- Prefer the shared utilities in `apps/backend/src/common/date.utils.ts`:
  - `utcStartOfDay(date)` — returns a `Date` at UTC midnight for the given date
  - `utcEndOfDay(date)` — returns a `Date` at UTC 23:59:59.999 for the given date
  - `toUtcDateString(date)` — returns a `YYYY-MM-DD` string using UTC components

### Frontend — displaying dates

- Always convert ISO strings to the user's local timezone for display. Never render raw ISO strings.
- Use the existing utility functions in each app:
  - `apps/web/src/lib/utils.ts`: `formatDate()`, `formatDateOnly()`
  - `apps/mobile/src/lib/utils.ts`: `formatDateTime()`, `formatDate()`, `formatTime()`, `formatTimeAgo()`
- These internally use `toLocaleString()` / `toLocaleDateString()` / `toLocaleTimeString()`.

### Frontend — sending dates to the backend

All dates must be in UTC ISO 8601 format when sent to the backend.

| Input type                                  | How to convert before sending                                              |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `datetime-local` input (`YYYY-MM-DDTHH:MM`) | `new Date(inputValue).toISOString()`                                       |
| Date-only picker (`YYYY-MM-DD` string)      | `new Date(dateString + 'T00:00:00Z').toISOString()`                        |
| HH:MM time string (schedule times)          | Use `localTimeToUtc(hhmm)` from `apps/web/src/lib/utils.ts` before sending |

### Frontend — loading stored dates into inputs

| Input type                         | How to populate from backend value                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `datetime-local` input             | Subtract timezone offset: `new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)` |
| HH:MM time string (schedule times) | Use `utcTimeToLocal(hhmm)` from `apps/web/src/lib/utils.ts`                                                  |

## Game Generation & Scheduling

### Game lineage

`game → stream → schedule`. A game belongs to exactly one stream (NOT NULL `streamId` FK), and that stream belongs to exactly one schedule. `games.scheduleId` was removed in migration `1781000000000-DecoupleGamesFromSchedule`; queries that filter by schedule join through `stream.scheduleId`. Schedule is the recurring template (tied to a UTC calendar day); stream is the actual streaming session (can cross midnight).

### Game status lifecycle

`CREATED` → `OPEN` → `IN_PROGRESS` → `FINISHED` (or `CANCELLED` at any stage)

- Games without `reservationOpenTime` are created directly as `OPEN`
- Games with `reservationOpenTime` start as `CREATED`, transition to `OPEN` when that UTC time passes

### Cron-based generation (`scheduler.service.ts`)

- Runs every minute
- **Idempotent**: checks for existing non-cancelled games before creation — if games already exist for a schedule+date, skips
- Compares current UTC time against schedule's `gameCreationTime` (stored as UTC HH:MM)
- Only generates for dates matching the schedule's recurrence pattern (`shouldCreateGameOnDate`)
- Each cron run creates a new `Stream` first, then the games for that stream

### Manual game creation (admin "Add Game" page)

- Requires an active stream (PENDING/LIVE); rejects with 400 otherwise — no scheduleId is accepted from the client
- New game attaches to the active stream; `scheduledStartTime` = `utcStartOfDay(stream.createdAt) + schedule.firstGameStartTime` so it sorts alongside the stream's cron-generated games
- Cross-midnight: a manual game added at 02:00 while last night's stream is still LIVE inherits last night's stream date — appears on the previous day's calendar slot

### Admin force-regenerate (calendar "Generate" button)

- Cancels existing `CREATED` games for the schedule+date, then creates new ones
- Will NOT cancel `OPEN`/`IN_PROGRESS` games — if those exist, regeneration is skipped to prevent duplicates

### Default schedule recurrence

- New schedules default to all 7 days `[0,1,2,3,4,5,6]` (Sun–Sat)
- Admin can uncheck days in the recurrence form (Step 2)

### Calendar visibility rules

- A real game is visible in its day's calendar slot when either its status is `FINISHED` or its owning stream is still PENDING/LIVE
- Pseudo-games (recurrence projections) render only for today + future days where no real game exists; they swap out for real games once the cron generates them
- Once a stream ends, `cancelGamesForEndedStreams` flips leftover CREATED/OPEN games to CANCELLED, so past days settle into "FINISHED only"

### Mobile API response shape

- `GET /api/v1/players/schedules/today` returns `Array<{ schedule, games }>`
- Mobile `api.ts` flattens this to `ScheduleSection[]` (top-level `id`, `name`, `games`)
- Mobile `GameStatusFilter` includes `includeOpen` (defaults to true)

## Production deployment

- Three standalone processes: backend (:3000), web admin (:3001), mobile PWA (:3002)
- In production the mobile PWA will be served on a **separate domain** from the admin app (eliminating the cookie collision issue entirely)
- Nginx reverse proxy routes by path prefix (see `deploy/nginx.conf.example`)
  - `/api/*`, `/socket.io/*`, `/.well-known/*` → backend (:3000)
  - Admin domain → web (:3001)
  - Player domain → mobile (:3002)

## Data access

- TypeORM `DataSource` with MySQL, entities and migrations from `src/`
- `synchronize` controlled by `TYPEORM_SYNCHRONIZE` env var (defaults to false in production)
- All datetimes stored as UTC; frontend displays in user's local timezone

## Known constraints

- Legacy `frontend/admin-ui/` directory contains reference source files from the old Vite+React+jQuery admin UI (kept for reference, not built or deployed)
- PWA service worker is intentionally disabled in `NODE_ENV=development` to prevent stale cache issues during development
- On `localhost` in development, both apps share the same cookie domain across ports — sessions may bleed between admin and player apps. This is a dev-only limitation; in production separate domains provide full isolation.
