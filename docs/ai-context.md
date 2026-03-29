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

```
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
│       │   └── (auth)/           # Public auth routes
│       │       ├── login/
│       │       ├── register/
│       │       ├── verification/
│       │       ├── forgot-password/
│       │       └── reset-password/
│       ├── src/lib/              # API client, auth utils, auth context
│       ├── src/middleware.ts     # Route protection (player_user cookie)
│       ├── public/icons/         # PWA icons (192x192, 512x512)
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
| `firebase`      | Firebase Admin SDK, push notifications                                              |
| `games`         | Game entity management, bulk creation, cancellation                                 |
| `messages`      | In-app messaging system                                                             |
| `players`       | Player-specific APIs                                                                |
| `reservations`  | Reservation creation and management                                                 |
| `scheduler`     | Cron jobs: game generation (idempotent), reservation opening, confirmation checking |
| `schedules`     | Schedule entity management                                                          |
| `statistics`    | Analytics and stats endpoints                                                       |
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
  - `/admin/*` — admin dashboard (protected by middleware, requires `admin_user` cookie)
  - `/downloads` — public downloads page
  - `/reset-password` — public password reset
  - `/` — redirects to `/admin`
- API calls proxied via Next.js rewrites (`/api/*` → backend)
- Cookie-based auth: reads `admin_access_token` and `admin_user` cookies
- WebSocket connection via Socket.IO client (direct to backend)
- Admin pages: Dashboard, Calendar, Users, Schedules, Games, Subscriptions, Tutorials, Stripe Products, Messages, Audit Log

## Mobile frontend architecture (apps/mobile/)

- Next.js 15 App Router PWA — player-facing application.
- PWA: `@ducanh2912/next-pwa` — **disabled in development** (avoids stale service worker cache), enabled in production builds.
- Route groups:
  - `(app)/` — authenticated player routes, protected by middleware
  - `(auth)/` — public auth routes (login, register, verification, forgot/reset-password)
- Middleware (`src/middleware.ts`) reads the `player_user` client-side cookie:
  - Unauthenticated on protected route → redirect `/login`
  - Authenticated but `isVerified: false` → redirect `/verification`
  - Authenticated + verified on public auth route → redirect `/home`
- API calls proxied via Next.js rewrites (`/api/*` → backend)
- Auth state managed by `AuthProvider` / `useAuth()` (React context)
- Shares types via `@btv/types`

## Auth cookie strategy

Two separate cookie namespaces prevent session collision between the admin and player apps (critical when both run on `localhost` in development; fully isolated by domain in production).

|                                  | Admin app (`apps/web`) | Player app (`apps/mobile`) |
| -------------------------------- | ---------------------- | -------------------------- |
| Access token (HTTP-only)         | `admin_access_token`   | `player_access_token`      |
| Refresh token (HTTP-only)        | `admin_refresh_token`  | `player_refresh_token`     |
| User indicator (client-readable) | `admin_user`           | `player_user`              |

**Backend behavior:**

- `POST /api/v1/auth/login` and `POST /api/v1/auth/register` → set `player_*` cookies
- `POST /api/v1/auth/admin/login` → set `admin_*` cookies
- `POST /api/v1/auth/refresh` → auto-detects session type by which cookie is present, responds with matching prefix
- `POST /api/v1/auth/logout` → clears all four HTTP-only cookies plus both user cookies
- `GET /api/v1/auth/websocket-token` → returns `player_access_token` if present, falls back to `admin_access_token`
- JWT strategy (`jwt.strategy.ts`) → checks `player_access_token` first, then `admin_access_token`, then `Authorization` header

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

### Game status lifecycle

`CREATED` → `OPEN` → `IN_PROGRESS` → `FINISHED` (or `CANCELLED` at any stage)

- Games without `reservationOpenTime` are created directly as `OPEN`
- Games with `reservationOpenTime` start as `CREATED`, transition to `OPEN` when that UTC time passes

### Cron-based generation (`scheduler.service.ts`)

- Runs every 10 minutes
- **Idempotent**: checks for existing non-cancelled games before creation — if games already exist for a schedule+date, skips
- Compares current UTC time against schedule's `gameCreationTime` (stored as UTC HH:MM)
- Only generates for dates matching the schedule's recurrence pattern (`shouldCreateGameOnDate`)

### Admin force-regenerate (calendar "Generate" button)

- Cancels existing `CREATED` games for the schedule+date, then creates new ones
- Will NOT cancel `OPEN`/`IN_PROGRESS` games — if those exist, regeneration is skipped to prevent duplicates

### Default schedule recurrence

- New schedules default to all 7 days `[0,1,2,3,4,5,6]` (Sun–Sat)
- Admin can uncheck days in the recurrence form (Step 2)

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
